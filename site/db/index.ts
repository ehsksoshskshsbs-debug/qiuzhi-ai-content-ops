import { env } from "cloudflare:workers";
import { schemaStatements, supportedPlatforms } from "./schema";

type OpsRuntimeEnv = {
  DB?: D1Database;
  OPS_ALLOWED_EMAILS?: string;
};

let schemaReady: Promise<void> | null = null;

export function getRuntimeEnv(): OpsRuntimeEnv {
  return env as unknown as OpsRuntimeEnv;
}

export function getDb(): D1Database {
  const db = getRuntimeEnv().DB;
  if (!db) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return db;
}

export async function ensureSchema(): Promise<D1Database> {
  const db = getDb();
  schemaReady ??= initialize(db).catch((error) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
  return db;
}

async function initialize(db: D1Database): Promise<void> {
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));

  const now = new Date().toISOString();
  await db.batch(
    supportedPlatforms.map((platform) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO platform_connections
            (id, workspace_id, platform, status, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), "qiuzhi-ops", platform, "待接入", now),
    ),
  );
}
