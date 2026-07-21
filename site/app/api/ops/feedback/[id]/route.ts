import { getFeedback, updateFeedback } from "../../../../../lib/feedback-repository";
import { getOpsAccess, opsAccessResponse } from "../../../../ops-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const { id } = await context.params;
  const result = await getFeedback(access.workspaceId, id);
  return result
    ? Response.json(result)
    : Response.json({ error: "记录不存在。" }, { status: 404 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const { id } = await context.params;
  const result = await updateFeedback(access.workspaceId, access.user.email, id, await request.json());
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.record, { status: result.status });
}
