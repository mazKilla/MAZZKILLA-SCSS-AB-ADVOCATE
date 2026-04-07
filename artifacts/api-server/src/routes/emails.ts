import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import archiver from "archiver";
import { db } from "@workspace/db";
import { conversionJobsTable, convertedEmailsTable, emailAttachmentsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { parseEml, parseMbox } from "../lib/emailParser.js";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith(".eml") || ext.endsWith(".mbox")) {
      cb(null, true);
    } else {
      cb(new Error("Only .eml and .mbox files are accepted"));
    }
  },
});

function safeZipPath(generatedFilename: string): string {
  return generatedFilename.replace(/[:\\]/g, "_").replace(/\//g, "_");
}

async function processJob(jobId: number, buffer: Buffer, fileType: "eml" | "mbox") {
  try {
    await db.update(conversionJobsTable)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(conversionJobsTable.id, jobId));

    const emails = fileType === "eml"
      ? await parseEml(buffer)
      : await parseMbox(buffer);

    await db.update(conversionJobsTable)
      .set({ totalEmails: emails.length, updatedAt: new Date() })
      .where(eq(conversionJobsTable.id, jobId));

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      const [savedEmail] = await db.insert(convertedEmailsTable).values({
        jobId,
        generatedFilename: email.generatedFilename,
        subject: email.subject,
        sender: email.sender,
        recipients: email.recipients,
        emailDate: email.emailDate,
        bodyText: email.bodyText,
        hasAttachments: email.hasAttachments,
        attachmentCount: email.attachmentCount,
        attachmentNames: email.attachmentNames,
      }).returning();

      // Save actual attachment binary data as base64
      if (email.attachments.length > 0) {
        for (const att of email.attachments) {
          await db.insert(emailAttachmentsTable).values({
            emailId: savedEmail.id,
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            dataBase64: att.data.toString("base64"),
          });
        }
      }

      await db.update(conversionJobsTable)
        .set({ processedEmails: i + 1, updatedAt: new Date() })
        .where(eq(conversionJobsTable.id, jobId));
    }

    await db.update(conversionJobsTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(conversionJobsTable.id, jobId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await db.update(conversionJobsTable)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(conversionJobsTable.id, jobId));
  }
}

router.post("/upload", (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const filename = req.file.originalname.toLowerCase();
    const fileType = filename.endsWith(".eml") ? "eml" : "mbox";

    try {
      const [job] = await db.insert(conversionJobsTable).values({
        originalFilename: req.file.originalname,
        fileType,
        status: "pending",
        totalEmails: 0,
        processedEmails: 0,
      }).returning();

      processJob(job.id, req.file.buffer, fileType).catch(() => {});

      res.json({
        id: job.id,
        originalFilename: job.originalFilename,
        fileType: job.fileType,
        status: job.status,
        totalEmails: job.totalEmails,
        processedEmails: job.processedEmails,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        errorMessage: job.errorMessage ?? null,
      });
    } catch (err) {
      next(err);
    }
  });
});

router.get("/jobs", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const [jobs, [{ value: total }]] = await Promise.all([
      db.select().from(conversionJobsTable)
        .orderBy(desc(conversionJobsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(conversionJobsTable),
    ]);

    res.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        originalFilename: j.originalFilename,
        fileType: j.fileType,
        status: j.status,
        totalEmails: j.totalEmails,
        processedEmails: j.processedEmails,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
        errorMessage: j.errorMessage ?? null,
      })),
      total: Number(total),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/jobs/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [job] = await db.select().from(conversionJobsTable).where(eq(conversionJobsTable.id, id));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const emails = await db.select().from(convertedEmailsTable)
      .where(eq(convertedEmailsTable.jobId, id))
      .orderBy(convertedEmailsTable.emailDate);

    res.json({
      job: {
        id: job.id,
        originalFilename: job.originalFilename,
        fileType: job.fileType,
        status: job.status,
        totalEmails: job.totalEmails,
        processedEmails: job.processedEmails,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        errorMessage: job.errorMessage ?? null,
      },
      emails: emails.map((e) => ({
        id: e.id,
        jobId: e.jobId,
        generatedFilename: e.generatedFilename,
        subject: e.subject,
        sender: e.sender,
        recipients: e.recipients,
        emailDate: e.emailDate?.toISOString() ?? null,
        bodyText: e.bodyText,
        hasAttachments: e.hasAttachments,
        attachmentCount: e.attachmentCount,
        attachmentNames: e.attachmentNames ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/jobs/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    await db.delete(conversionJobsTable).where(eq(conversionJobsTable.id, id));
    res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/download", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [email] = await db.select().from(convertedEmailsTable).where(eq(convertedEmailsTable.id, id));
    if (!email) {
      res.status(404).json({ error: "Email not found" });
      return;
    }

    // If email has attachments, return a zip with email + attachments folder
    const attachments = await db.select().from(emailAttachmentsTable)
      .where(eq(emailAttachmentsTable.emailId, id));

    if (attachments.length > 0) {
      const folderName = safeZipPath(email.generatedFilename);
      const zipFilename = `${folderName}.zip`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);

      // Email text at root of folder
      archive.append(email.bodyText, { name: `${folderName}/email.txt` });

      // Attachments in subfolder
      for (const att of attachments) {
        const data = Buffer.from(att.dataBase64, "base64");
        archive.append(data, { name: `${folderName}/attachments/${att.filename}` });
      }

      await archive.finalize();
    } else {
      // No attachments — just send the plain text file
      const safeFilename = safeZipPath(email.generatedFilename) + ".txt";
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      res.send(email.bodyText);
    }
  } catch (err) {
    next(err);
  }
});

router.get("/export/:jobId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const [job] = await db.select().from(conversionJobsTable).where(eq(conversionJobsTable.id, jobId));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const emails = await db.select().from(convertedEmailsTable)
      .where(eq(convertedEmailsTable.jobId, jobId))
      .orderBy(convertedEmailsTable.emailDate);

    const zipFilename = `${job.originalFilename.replace(/\.[^.]+$/, "")}_converted.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (const email of emails) {
      const folderName = safeZipPath(email.generatedFilename);

      // Email text file inside its own subfolder
      archive.append(email.bodyText, { name: `${folderName}/email.txt` });

      // Fetch and add attachments into the subfolder's attachments/ directory
      if (email.hasAttachments) {
        const attachments = await db.select().from(emailAttachmentsTable)
          .where(eq(emailAttachmentsTable.emailId, email.id));

        for (const att of attachments) {
          const data = Buffer.from(att.dataBase64, "base64");
          archive.append(data, { name: `${folderName}/attachments/${att.filename}` });
        }
      }
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

export default router;
