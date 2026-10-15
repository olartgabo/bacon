import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/**
 * SQLite is the source of truth (olympus decision 0005); the Markdown in
 * olympus is an export. Opens the file, applies pending migrations, and
 * returns a Drizzle handle. Tests pass ":memory:".
 */
export function openDb(file: string): Db {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  // Agents on four devices write concurrently; wait for the lock instead of
  // failing with SQLITE_BUSY.
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

let shared: Db | undefined;

/** Opened on first use, not at import, so `next build` never touches the
 * production database file. */
export function getDb(): Db {
  shared ??= openDb(process.env.DATABASE_PATH ?? "./bacon.sqlite");
  return shared;
}
