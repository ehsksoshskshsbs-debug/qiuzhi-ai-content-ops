import { listFeedback } from "../../../../lib/feedback-repository";
import { getOpsAccess, opsAccessResponse } from "../../../ops-auth";

const columns = [
  "追踪编号", "平台", "来源类型", "平台记录编号", "内容编号", "用户代号", "匿名反馈内容", "确认摘要",
  "情绪", "需求标签", "优先级", "状态", "负责人", "下一步", "发生时间", "更新时间",
] as const;

export async function GET(request: Request) {
  const access = await getOpsAccess();
  if (!access.ok) return opsAccessResponse(access);
  const url = new URL(request.url);
  const { records } = await listFeedback(access.workspaceId, {
    search: url.searchParams.get("search") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    sourceType: url.searchParams.get("sourceType") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  const rows = records.map((record) => [
    record.trace_code, record.platform, record.source_type, record.external_id, record.content_id,
    record.author_alias, record.source_text ?? record.summary, record.summary, record.sentiment, record.need_tag, record.priority,
    record.status, record.assignee_email, record.next_action, record.occurred_at, record.updated_at,
  ]);
  const csv = `\uFEFF${[columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="feedback-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
