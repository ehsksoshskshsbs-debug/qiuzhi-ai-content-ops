import { ensureSchema } from "../db";
import { getChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";
import { memberRoles, type MemberRole } from "../lib/ops-domain";

export const OPS_WORKSPACE_ID = "qiuzhi-ops";

export type OpsAccess =
  | { ok: true; user: ChatGPTUser; workspaceId: string; role: MemberRole; displayName: string | null }
  | { ok: false; status: 401 | 403 | 503; error: string; user?: ChatGPTUser };

export async function getOpsAccess(): Promise<OpsAccess> {
  const user = await getChatGPTUser();
  if (!user) return { ok: false, status: 401, error: "请先登录 ChatGPT。" };

  try {
    const db = await ensureSchema();
    const member = await db.prepare(
      `SELECT role, display_name FROM workspace_members
       WHERE workspace_id = ? AND email = ? AND status = '启用'`,
    ).bind(OPS_WORKSPACE_ID, user.email.toLowerCase()).first<{ role: string; display_name: string | null }>();
    if (!member || !memberRoles.includes(member.role as MemberRole)) {
      return { ok: false, status: 403, error: "当前账号不是已启用的运营团队成员。", user };
    }
    return {
      ok: true,
      user,
      workspaceId: OPS_WORKSPACE_ID,
      role: member.role as MemberRole,
      displayName: member.display_name,
    };
  } catch {
    return {
      ok: false,
      status: 503,
      error: "运营成员与权限服务暂时不可用。",
      user,
    };
  }
}

export function opsAccessResponse(access: Exclude<OpsAccess, { ok: true }>): Response {
  return Response.json({ error: access.error }, { status: access.status });
}

export function opsRoleResponse(
  access: Extract<OpsAccess, { ok: true }>,
  allowed: readonly MemberRole[],
): Response | null {
  return allowed.includes(access.role)
    ? null
    : Response.json({ error: "当前角色没有执行此操作的权限。" }, { status: 403 });
}
