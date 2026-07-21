import { ensureSchema } from "../../../../db";
import { memberRoles, memberStatuses, type MemberRole } from "../../../../lib/ops-domain";
import { getOpsAccess, opsAccessResponse, opsRoleResponse } from "../../../ops-auth";

type MemberInput = { email?: string; displayName?: string; role?: string; status?: string };

export async function GET() {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  return Response.json({ members: await listMembers(access.workspaceId), role: access.role });
}

export async function POST(request: Request) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const denied = opsRoleResponse(access, ["管理员"]);
  if (denied) return denied;

  const body = await request.json() as MemberInput;
  const validation = validateMember(body);
  if ("error" in validation) return Response.json({ error: validation.error }, { status: 400 });

  const db = await ensureSchema();
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(
      `INSERT INTO workspace_members
        (id, workspace_id, email, display_name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '启用', ?, ?)
       ON CONFLICT(workspace_id, email) DO UPDATE SET
         display_name = excluded.display_name,
         role = excluded.role,
         status = '启用',
         updated_at = excluded.updated_at`,
    ).bind(crypto.randomUUID(), access.workspaceId, validation.email, validation.displayName, validation.role, now, now),
    workspaceEvent(db, access.workspaceId, access.user.email, "添加团队成员", validation.email, {
      role: validation.role,
      display_name: validation.displayName,
    }, now),
  ]);
  return Response.json({ members: await listMembers(access.workspaceId) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const denied = opsRoleResponse(access, ["管理员"]);
  if (denied) return denied;

  const body = await request.json() as MemberInput;
  const email = normalizeEmail(body.email);
  const role = memberRoles.includes(body.role as MemberRole) ? body.role as MemberRole : undefined;
  const status = memberStatuses.includes(body.status as (typeof memberStatuses)[number]) ? body.status : undefined;
  const displayName = cleanName(body.displayName);
  if (!email || (!role && !status && body.displayName === undefined)) {
    return Response.json({ error: "成员邮箱和至少一个变更字段必填。" }, { status: 400 });
  }

  const db = await ensureSchema();
  const current = await db.prepare(
    "SELECT role, status, display_name FROM workspace_members WHERE workspace_id = ? AND email = ?",
  ).bind(access.workspaceId, email).first<{ role: string; status: string; display_name: string | null }>();
  if (!current) return Response.json({ error: "团队成员不存在。" }, { status: 404 });

  const nextRole = role ?? current.role;
  const nextStatus = status ?? current.status;
  if (current.role === "管理员" && current.status === "启用" && (nextRole !== "管理员" || nextStatus !== "启用")) {
    const count = await db.prepare(
      "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND role = '管理员' AND status = '启用'",
    ).bind(access.workspaceId).first<{ count: number }>();
    if ((count?.count ?? 0) <= 1) {
      return Response.json({ error: "工作区必须保留至少一名启用的管理员。" }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  await db.batch([
    db.prepare(
      `UPDATE workspace_members SET display_name = ?, role = ?, status = ?, updated_at = ?
       WHERE workspace_id = ? AND email = ?`,
    ).bind(displayName ?? current.display_name, nextRole, nextStatus, now, access.workspaceId, email),
    workspaceEvent(db, access.workspaceId, access.user.email, "更新团队成员", email, {
      before: current,
      after: { role: nextRole, status: nextStatus, display_name: displayName ?? current.display_name },
    }, now),
  ]);
  return Response.json({ members: await listMembers(access.workspaceId) });
}

async function listMembers(workspaceId: string) {
  const db = await ensureSchema();
  const result = await db.prepare(
    `SELECT email, display_name, role, status, created_at, updated_at
     FROM workspace_members WHERE workspace_id = ?
     ORDER BY CASE role WHEN '管理员' THEN 0 WHEN '成员' THEN 1 ELSE 2 END, email`,
  ).bind(workspaceId).all();
  return result.results;
}

function validateMember(input: MemberInput): { email: string; displayName: string | null; role: MemberRole } | { error: string } {
  const email = normalizeEmail(input.email);
  if (!email) return { error: "请输入有效的成员邮箱。" };
  if (!memberRoles.includes(input.role as MemberRole)) return { error: "成员角色无效。" };
  return { email, displayName: cleanName(input.displayName), role: input.role as MemberRole };
}

function normalizeEmail(value?: string): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.slice(0, 254) : null;
}

function cleanName(value?: string): string | null {
  const name = value?.trim();
  return name ? name.slice(0, 80) : null;
}

function workspaceEvent(
  db: D1Database,
  workspaceId: string,
  actorEmail: string,
  action: string,
  subjectEmail: string,
  changes: unknown,
  now: string,
) {
  return db.prepare(
    `INSERT INTO workspace_events
      (id, workspace_id, actor_email, action, subject_email, changes_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), workspaceId, actorEmail, action, subjectEmail, JSON.stringify(changes), now);
}
