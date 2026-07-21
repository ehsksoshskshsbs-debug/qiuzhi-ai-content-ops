import { env } from "cloudflare:workers";
import { feedbackAiColumns, schemaStatements, supportedPlatforms } from "./schema";

export type OpsRuntimeEnv = {
  DB?: D1Database;
  OPS_ALLOWED_EMAILS?: string;
  OPENAI_API_KEY?: string;
  OPENAI_CLASSIFICATION_MODEL?: string;
  OPENAI_RESPONSES_URL?: string;
  OPENAI_CLASSIFICATION_TIMEOUT_MS?: string;
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
  await ensureFeedbackAiColumns(db);

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

async function ensureFeedbackAiColumns(db: D1Database): Promise<void> {
  const result = await db.prepare("PRAGMA table_info(feedback_records)").all<{ name: string }>();
  const existing = new Set(result.results.map((column) => column.name));
  const statements = Object.entries(feedbackAiColumns)
    .filter(([name]) => !existing.has(name))
    .map(([name, type]) => db.prepare(`ALTER TABLE feedback_records ADD COLUMN ${name} ${type}`));
  if (statements.length > 0) await db.batch(statements);
}
