import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * Per decision 0004 (olympus repo): this DB is a write buffer and read
 * index, not the source of truth — it can be dropped and rebuilt at any
 * time. DATABASE_PATH defaults to a repo-local file for dev; the host
 * deploy should point it somewhere outside the git working tree.
 */
function dbPath(): string {
  return process.env.DATABASE_PATH ?? "./dashboard.sqlite";
}

const sqlite = new Database(dbPath());
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS captures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    due TEXT,
    source TEXT NOT NULL DEFAULT 'web',
    created_by TEXT,
    created_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    markdown_path TEXT
  );
`);

export const db = drizzle(sqlite, { schema });
