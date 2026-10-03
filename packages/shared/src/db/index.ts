import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { config, repoRoot } from "../env";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const g = globalThis as unknown as { __inviteDb?: { db: DB; sqlite: Database.Database; file: string } };

export function openDb(file = config.databasePath): { db: DB; sqlite: Database.Database } {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  // WAL lets the web app and the worker use the file at the same time.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(repoRoot(), "packages", "shared", "drizzle") });
  return { db, sqlite };
}

/** Process-wide connection (survives Next.js hot reloads). */
export function getDb(): DB {
  const file = config.databasePath;
  if (!g.__inviteDb || g.__inviteDb.file !== file) {
    const { db, sqlite } = openDb(file);
    g.__inviteDb = { db, sqlite, file };
  }
  return g.__inviteDb.db;
}

export function closeDb(): void {
  g.__inviteDb?.sqlite.close();
  g.__inviteDb = undefined;
}

export { schema };
export * from "./schema";
export * from "./repo";
