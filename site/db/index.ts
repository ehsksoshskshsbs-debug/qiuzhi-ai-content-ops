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
  const bootstrapEmails = parseEmails(getRuntimeEnv().OPS_ALLOWED_EMAILS);
  if (bootstrapEmails.length > 0) {
    await db.batch(
      bootstrapEmails.map((email, index) =>
        db.prepare(
          `INSERT OR IGNORE INTO workspace_members
            (id, workspace_id, email, role, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, '启用', ?, ?)`,
        ).bind(crypto.randomUUID(), "qiuzhi-ops", email, index === 0 ? "管理员" : "成员", now, now),
      ),
    );
  }
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
  await db.prepare(
    "UPDATE feedback_records SET source_text = summary WHERE source_text IS NULL OR source_text = ''",
  ).run();
  await db.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS feedback_workspace_content_hash_idx ON feedback_records (workspace_id, content_hash)",
  ).run();
}

function parseEmails(value?: string): string[] {
  return [...new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )];
}
