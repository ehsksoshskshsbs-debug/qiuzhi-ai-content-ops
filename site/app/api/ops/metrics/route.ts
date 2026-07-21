import { ensureSchema } from "../../../../db";
import { getOpsAccess, opsAccessResponse, opsRoleResponse } from "../../../ops-auth";
import { platforms } from "../../../../lib/ops-domain";

export async function GET() {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const db = await ensureSchema();
  const rows = await db.prepare(
    `SELECT id, platform, content_id, metric_date, metric_name, metric_value, updated_at
     FROM metric_snapshots WHERE workspace_id = ?
     ORDER BY metric_date DESC, updated_at DESC LIMIT 100`,
  ).bind(access.workspaceId).all();
  return Response.json({ metrics: rows.results });
}

export async function POST(request: Request) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const denied = opsRoleResponse(access, ["管理员", "成员"]);
  if (denied) return denied;
  const body = await request.json() as Record<string, unknown>;
  const platform = String(body.platform ?? "");
  const contentId = String(body.contentId ?? "").trim().slice(0, 160);
  const metricDate = String(body.metricDate ?? "");
  const metricName = String(body.metricName ?? "").trim().slice(0, 80);
  const metricValue = Number(body.metricValue);
  if (!platforms.includes(platform as (typeof platforms)[number]) || !contentId || !metricName || !/^\d{4}-\d{2}-\d{2}$/.test(metricDate) || !Number.isFinite(metricValue)) {
    return Response.json({ error: "运营指标字段不完整或格式无效。" }, { status: 400 });
  }
  const db = await ensureSchema();
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO metric_snapshots
      (id, workspace_id, platform, content_id, metric_date, metric_name, metric_value, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, platform, content_id, metric_date, metric_name)
     DO UPDATE SET metric_value = excluded.metric_value, updated_at = excluded.updated_at`,
  ).bind(crypto.randomUUID(), access.workspaceId, platform, contentId, metricDate, metricName, metricValue, now, now).run();
  return Response.json({ ok: true }, { status: 201 });
}
