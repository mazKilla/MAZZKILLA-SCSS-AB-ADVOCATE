import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversionJobsTable = pgTable("conversion_jobs", {
  id: serial("id").primaryKey(),
  originalFilename: text("original_filename").notNull(),
  fileType: text("file_type").notNull(),
  status: text("status").notNull().default("pending"),
  totalEmails: integer("total_emails").notNull().default(0),
  processedEmails: integer("processed_emails").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const convertedEmailsTable = pgTable("converted_emails", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => conversionJobsTable.id, { onDelete: "cascade" }),
  generatedFilename: text("generated_filename").notNull(),
  subject: text("subject").notNull(),
  sender: text("sender").notNull(),
  recipients: text("recipients").notNull(),
  emailDate: timestamp("email_date"),
  bodyText: text("body_text").notNull(),
  hasAttachments: boolean("has_attachments").notNull().default(false),
  attachmentCount: integer("attachment_count").notNull().default(0),
  attachmentNames: text("attachment_names"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailAttachmentsTable = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").notNull().references(() => convertedEmailsTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull().default(0),
  dataBase64: text("data_base64").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversionJobSchema = createInsertSchema(conversionJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConvertedEmailSchema = createInsertSchema(convertedEmailsTable).omit({ id: true, createdAt: true });
export const insertEmailAttachmentSchema = createInsertSchema(emailAttachmentsTable).omit({ id: true, createdAt: true });

export type InsertConversionJob = z.infer<typeof insertConversionJobSchema>;
export type ConversionJob = typeof conversionJobsTable.$inferSelect;
export type InsertConvertedEmail = z.infer<typeof insertConvertedEmailSchema>;
export type ConvertedEmail = typeof convertedEmailsTable.$inferSelect;
export type InsertEmailAttachment = z.infer<typeof insertEmailAttachmentSchema>;
export type EmailAttachment = typeof emailAttachmentsTable.$inferSelect;
