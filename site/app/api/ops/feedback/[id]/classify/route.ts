import { ClassificationError, classifyFeedbackSummary } from "../../../../../../lib/ai-feedback-classifier";
import {
  beginAiClassification,
  getFeedback,
  markAiClassificationFailed,
  saveAiSuggestion,
} from "../../../../../../lib/feedback-repository";
import { getOpsAccess, opsAccessResponse, opsRoleResponse } from "../../../../../ops-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: RouteContext) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const denied = opsRoleResponse(access, ["管理员", "成员"]);
  if (denied) return denied;
  const { id } = await context.params;

  const started = await beginAiClassification(access.workspaceId, id);
  if ("error" in started) return Response.json({ error: started.error }, { status: started.status });

  try {
    const current = await getFeedback(access.workspaceId, id);
    if (!current) return Response.json({ error: "记录不存在。" }, { status: 404 });
    const suggestion = await classifyFeedbackSummary(current.record.source_text ?? current.record.summary);
    const result = await saveAiSuggestion(access.workspaceId, id, suggestion);
    return Response.json(result);
  } catch (error) {
    await markAiClassificationFailed(access.workspaceId, id);
    if (error instanceof ClassificationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "AI 分类失败，请改为人工填写。" }, { status: 502 });
  }
}
