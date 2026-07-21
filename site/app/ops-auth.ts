import { getRuntimeEnv } from "../db";
import { getChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";

export const OPS_WORKSPACE_ID = "qiuzhi-ops";

export type OpsAccess =
  | { ok: true; user: ChatGPTUser; workspaceId: string }
  | { ok: false; status: 401 | 403 | 503; error: string; user?: ChatGPTUser };

export async function getOpsAccess(): Promise<OpsAccess> {
  const user = await getChatGPTUser();
  if (!user) return { ok: false, status: 401, error: "请先登录 ChatGPT。" };

  const allowedEmails = parseAllowedEmails(getRuntimeEnv().OPS_ALLOWED_EMAILS);
  if (allowedEmails.size === 0) {
    return {
      ok: false,
      status: 503,
      error: "运营成员白名单尚未配置。请设置 OPS_ALLOWED_EMAILS。",
      user,
    };
  }

  if (!allowedEmails.has(user.email.toLowerCase())) {
    return { ok: false, status: 403, error: "当前账号不在运营成员白名单中。", user };
  }

  return { ok: true, user, workspaceId: OPS_WORKSPACE_ID };
}

export function opsAccessResponse(access: Exclude<OpsAccess, { ok: true }>): Response {
  return Response.json({ error: access.error }, { status: access.status });
}

function parseAllowedEmails(value?: string): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
