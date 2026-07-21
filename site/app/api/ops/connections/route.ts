import { ensureSchema } from "../../../../db";
import { getOpsAccess, opsAccessResponse } from "../../../ops-auth";

export async function GET() {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const db = await ensureSchema();
  const connections = await db.prepare(
    `SELECT platform, status, account_label, scopes, last_synced_at, updated_at
     FROM platform_connections WHERE workspace_id = ? ORDER BY platform`,
  ).bind(access.workspaceId).all();
  const runs = await db.prepare(
    `SELECT platform, status, inserted_count, updated_count, skipped_count, error_summary, started_at, finished_at
     FROM sync_runs WHERE workspace_id = ? ORDER BY started_at DESC LIMIT 10`,
  ).bind(access.workspaceId).all();
  return Response.json({ connections: connections.results, runs: runs.results });
}
