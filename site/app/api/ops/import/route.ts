import { createFeedback } from "../../../../lib/feedback-repository";
import { getOpsAccess, opsAccessResponse, opsRoleResponse } from "../../../ops-auth";
import type { FeedbackInput } from "../../../../lib/ops-domain";

export async function POST(request: Request) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const denied = opsRoleResponse(access, ["管理员", "成员"]);
  if (denied) return denied;
  const payload = await request.json() as { rows?: FeedbackInput[] };
  if (!Array.isArray(payload.rows) || payload.rows.length === 0) {
    return Response.json({ error: "没有可导入的记录。" }, { status: 400 });
  }
  if (payload.rows.length > 500) {
    return Response.json({ error: "单次最多导入 500 条记录。" }, { status: 400 });
  }

  let inserted = 0;
  let duplicates = 0;
  const errors: Array<{ row: number; error: string }> = [];
  for (const [index, row] of payload.rows.entries()) {
    const result = await createFeedback(access.workspaceId, access.user.email, row);
    if ("error" in result) {
      if (result.status === 409) duplicates += 1;
      else errors.push({ row: index + 2, error: result.error ?? "记录格式无效。" });
    } else {
      inserted += 1;
    }
  }
  return Response.json({ inserted, duplicates, errors });
}
