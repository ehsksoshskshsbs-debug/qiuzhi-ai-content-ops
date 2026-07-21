import { ensureSchema } from "../../../../../../db";
import { getOpsAccess, opsAccessResponse } from "../../../../../ops-auth";
import { supportedPlatforms } from "../../../../../../db/schema";

type RouteContext = { params: Promise<{ platform: string }> };

export async function POST(_: Request, context: RouteContext) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const { platform: encodedPlatform } = await context.params;
  const platform = decodeURIComponent(encodedPlatform);
  if (!supportedPlatforms.includes(platform as (typeof supportedPlatforms)[number])) {
    return Response.json({ error: "不支持的平台。" }, { status: 400 });
  }

  const db = await ensureSchema();
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO sync_runs
      (id, workspace_id, platform, status, error_summary, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(), access.workspaceId, platform, "等待授权",
    "尚未配置官方开发者权限与平台授权，未发起任何外部请求。", now, now,
  ).run();
  return Response.json({
    error: `${platform}尚未配置官方授权。提供开发者权限和安全凭据后才能启用真实同步。`,
  }, { status: 409 });
}
