import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const DOMAINS = [
  "work",
  "university",
  "aws",
  "student-community-day",
  "quantum",
  "personal",
  "projects",
] as const;

export const STATUSES = ["open", "in-progress", "done"] as const;
export const SOURCES = ["web", "cli", "telegram", "agent"] as const;

export const captures = sqliteTable("captures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("open"),
  due: text("due"),
  source: text("source").notNull().default("web"),
  createdBy: text("created_by"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  synced: integer("synced", { mode: "boolean" }).notNull().default(false),
  markdownPath: text("markdown_path"),
});

export type Capture = typeof captures.$inferSelect;
export type NewCapture = typeof captures.$inferInsert;
