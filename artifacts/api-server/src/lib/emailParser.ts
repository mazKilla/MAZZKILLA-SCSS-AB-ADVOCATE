import { simpleParser, ParsedMail } from "mailparser";

export interface AttachmentData {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}

export interface ParsedEmail {
  subject: string;
  sender: string;
  recipients: string;
  emailDate: Date | null;
  bodyText: string;
  hasAttachments: boolean;
  attachmentCount: number;
  attachmentNames: string | null;
  generatedFilename: string;
  attachments: AttachmentData[];
}

function sanitizeForFilename(str: string): string {
  return str
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80)
    .trim();
}

function generateFilename(date: Date | null, sender: string, subject: string): string {
  let datePart: string;
  if (date) {
    const year = date.getFullYear();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    datePart = `${year}/${day}/${month}:${hours}:${minutes}`;
  } else {
    datePart = "unknown/date";
  }

  const senderClean = sanitizeForFilename(sender || "unknown");
  const subjectClean = sanitizeForFilename(subject || "no_subject");
  return `${datePart} - ${senderClean}_${subjectClean}`;
}

function extractBodyText(mail: ParsedMail, attachmentPaths: string[]): string {
  const parts: string[] = [];

  if (mail.subject) parts.push(`Subject: ${mail.subject}`);
  if (mail.from?.text) parts.push(`From: ${mail.from.text}`);
  if (mail.to?.text) parts.push(`To: ${mail.to.text}`);
  if (mail.cc?.text) parts.push(`CC: ${mail.cc.text}`);
  if (mail.date) parts.push(`Date: ${mail.date.toISOString()}`);

  parts.push("---");

  if (mail.text) {
    parts.push(mail.text);
  } else if (mail.html) {
    const stripped = mail.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    parts.push(stripped);
  } else {
    parts.push("[No text body]");
  }

  if (attachmentPaths.length > 0) {
    parts.push("\n--- ATTACHMENTS ---");
    for (const path of attachmentPaths) {
      parts.push(`ATTACHMENT: ./attachments/${path}`);
    }
  }

  return parts.join("\n");
}

export async function parseEml(buffer: Buffer): Promise<ParsedEmail[]> {
  const mail = await simpleParser(buffer);
  return [transformParsedMail(mail)];
}

export async function parseMbox(buffer: Buffer): Promise<ParsedEmail[]> {
  const content = buffer.toString("utf-8");
  const emails: ParsedEmail[] = [];

  const messageBlocks = content.split(/^From /m).filter((block) => block.trim());

  for (const block of messageBlocks) {
    try {
      const rawEmail = "From " + block;
      const mailBuffer = Buffer.from(rawEmail, "utf-8");
      const mail = await simpleParser(mailBuffer);
      emails.push(transformParsedMail(mail));
    } catch {
      try {
        const mailBuffer = Buffer.from(block, "utf-8");
        const mail = await simpleParser(mailBuffer);
        emails.push(transformParsedMail(mail));
      } catch {
        // skip unparseable blocks
      }
    }
  }

  return emails;
}

function transformParsedMail(mail: ParsedMail): ParsedEmail {
  const subject = mail.subject || "No Subject";
  const sender = mail.from?.text || "Unknown Sender";
  const senderShort = mail.from?.value?.[0]?.address || sender;
  const recipients = [
    mail.to?.text,
    mail.cc?.text,
    mail.bcc?.text,
  ].filter(Boolean).join("; ") || "Unknown";
  const emailDate = mail.date || null;

  const rawAttachments = mail.attachments || [];
  const attachments: AttachmentData[] = rawAttachments
    .filter((a) => a.content && a.content.length > 0)
    .map((a, i) => {
      const rawName = a.filename || `attachment_${i + 1}`;
      const safeFilename = sanitizeForFilename(rawName) || `attachment_${i + 1}`;
      return {
        filename: safeFilename,
        contentType: a.contentType || "application/octet-stream",
        size: a.size || a.content.length,
        data: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
      };
    });

  const attachmentPaths = attachments.map((a) => a.filename);
  const bodyText = extractBodyText(mail, attachmentPaths);

  const hasAttachments = attachments.length > 0;
  const attachmentCount = attachments.length;
  const attachmentNames = hasAttachments
    ? attachments.map((a) => a.filename).join(", ")
    : null;
  const generatedFilename = generateFilename(emailDate, senderShort, subject);

  return {
    subject,
    sender,
    recipients,
    emailDate,
    bodyText,
    hasAttachments,
    attachmentCount,
    attachmentNames,
    generatedFilename,
    attachments,
  };
}
