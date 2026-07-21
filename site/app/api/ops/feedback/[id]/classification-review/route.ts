import { reviewAiSuggestion } from "../../../../../../lib/feedback-repository";
import { getOpsAccess, opsAccessResponse, opsRoleResponse } from "../../../../../ops-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const denied = opsRoleResponse(access, ["管理员", "成员"]);
  if (denied) return denied;
  const { id } = await context.params;
  const result = await reviewAiSuggestion(
    access.workspaceId,
    access.user.email,
    id,
    await request.json(),
  );
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.record, { status: result.status });
}
