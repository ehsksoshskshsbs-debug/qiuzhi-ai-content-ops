import { createFeedback, listFeedback } from "../../../../lib/feedback-repository";
import { getOpsAccess, opsAccessResponse, opsRoleResponse } from "../../../ops-auth";

export async function GET(request: Request) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const url = new URL(request.url);
  const result = await listFeedback(access.workspaceId, {
    search: url.searchParams.get("search") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    sourceType: url.searchParams.get("sourceType") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    assignee: url.searchParams.get("assignee") ?? undefined,
  });
  return Response.json(result);
}

export async function POST(request: Request) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const denied = opsRoleResponse(access, ["管理员", "成员"]);
  if (denied) return denied;
  const result = await createFeedback(access.workspaceId, access.user.email, await request.json());
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.record, { status: result.status });
}
