import { ensureSchema } from "../db";
import { needTags, priorities, makeTraceCode, validateFeedbackInput, type FeedbackInput, type NeedTag, type Priority, type ValidFeedbackInput } from "./ops-domain";

export type FeedbackRow = {
  id: string;
  trace_code: string;
  workspace_id: string;
  platform: string;
  source_type: string;
  external_id: string | null;
  content_id: string | null;
  author_alias: string | null;
  summary: string;
  sentiment: string;
  need_tag: string;
  priority: string;
  status: string;
  assignee_email: string | null;
  next_action: string | null;
  ai_need_tag: string | null;
  ai_priority: string | null;
  ai_reason: string | null;
  ai_confidence: number | null;
  ai_review_status: string | null;
  ai_model: string | null;
  ai_classified_at: string | null;
  ai_reviewed_at: string | null;
  ai_reviewed_by: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type EventRow = {
  id: string;
  record_id: string;
  actor_email: string;
  action: string;
  changes_json: string;
  created_at: string;
};

export type FeedbackFilters = {
  search?: string;
  platform?: string;
  sourceType?: string;
  priority?: string;
  status?: string;
  assignee?: string;
};

export async function listFeedback(workspaceId: string, filters: FeedbackFilters) {
  const db = await ensureSchema();
  const conditions = ["workspace_id = ?", "archived_at IS NULL"];
  const bindings: unknown[] = [workspaceId];

  addEquals(conditions, bindings, "platform", filters.platform);
  addEquals(conditions, bindings, "source_type", filters.sourceType);
  addEquals(conditions, bindings, "priority", filters.priority);
  addEquals(conditions, bindings, "status", filters.status);
  addEquals(conditions, bindings, "assignee_email", filters.assignee);

  if (filters.search?.trim()) {
    conditions.push("(trace_code LIKE ? OR summary LIKE ? OR content_id LIKE ?)");
    const search = `%${filters.search.trim().slice(0, 100)}%`;
    bindings.push(search, search, search);
  }

  const query = `SELECT * FROM feedback_records
    WHERE ${conditions.join(" AND ")}
    ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
      updated_at DESC
    LIMIT 250`;
  const result = await db.prepare(query).bind(...bindings).all<FeedbackRow>();
  const stats = await db.prepare(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS this_week,
      SUM(CASE WHEN status IN ('待处理', '处理中', '等待外部') THEN 1 ELSE 0 END) AS open_count,
      SUM(CASE WHEN priority IN ('P0', 'P1') AND status != '已解决' THEN 1 ELSE 0 END) AS urgent_count,
      AVG(CASE WHEN status = '已解决' THEN (julianday(updated_at) - julianday(created_at)) * 24 END) AS avg_resolution_hours
     FROM feedback_records WHERE workspace_id = ? AND archived_at IS NULL`,
  ).bind(workspaceId).first<Record<string, number | null>>();

  return { records: result.results, stats: stats ?? {} };
}

export async function getFeedback(workspaceId: string, id: string) {
  const db = await ensureSchema();
  const record = await db.prepare(
    "SELECT * FROM feedback_records WHERE id = ? AND workspace_id = ?",
  ).bind(id, workspaceId).first<FeedbackRow>();
  if (!record) return null;
  const events = await db.prepare(
    "SELECT id, record_id, actor_email, action, changes_json, created_at FROM record_events WHERE record_id = ? AND workspace_id = ? ORDER BY created_at DESC",
  ).bind(id, workspaceId).all<EventRow>();
  return { record, events: events.results };
}

export async function createFeedback(workspaceId: string, actorEmail: string, input: FeedbackInput) {
  const validation = validateFeedbackInput(input);
  if (!validation.value) return { error: validation.error ?? "记录格式无效。", status: 400 as const };

  const db = await ensureSchema();
  const value = validation.value;
  const id = crypto.randomUUID();
  const traceCode = makeTraceCode();
  const now = new Date().toISOString();
  try {
    await db.batch([
      db.prepare(
        `INSERT INTO feedback_records
          (id, trace_code, workspace_id, platform, source_type, external_id, content_id,
           author_alias, summary, sentiment, need_tag, priority, status, assignee_email,
           next_action, occurred_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id, traceCode, workspaceId, value.platform, value.sourceType,
        value.externalId ?? null, value.contentId ?? null, value.authorAlias ?? null,
        value.summary, value.sentiment, value.needTag, value.priority, value.status,
        value.assigneeEmail ?? null, value.nextAction ?? null, value.occurredAt, now, now,
      ),
      db.prepare(
        `INSERT INTO record_events
          (id, record_id, workspace_id, actor_email, action, changes_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(), id, workspaceId, actorEmail, "创建记录",
        JSON.stringify({ status: value.status, priority: value.priority, source: value.sourceType }), now,
      ),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      return { error: "该平台记录已存在，已阻止重复导入。", status: 409 as const };
    }
    throw error;
  }
  return { record: await getFeedback(workspaceId, id), status: 201 as const };
}

export async function updateFeedback(
  workspaceId: string,
  actorEmail: string,
  id: string,
  patch: FeedbackInput,
) {
  const current = await getFeedback(workspaceId, id);
  if (!current) return { error: "记录不存在。", status: 404 as const };

  const merged: FeedbackInput = {
    platform: patch.platform ?? current.record.platform,
    sourceType: patch.sourceType ?? current.record.source_type,
    externalId: patch.externalId ?? current.record.external_id ?? undefined,
    contentId: patch.contentId ?? current.record.content_id ?? undefined,
    authorAlias: patch.authorAlias ?? current.record.author_alias ?? undefined,
    summary: patch.summary ?? current.record.summary,
    sentiment: patch.sentiment ?? current.record.sentiment,
    needTag: patch.needTag ?? current.record.need_tag,
    priority: patch.priority ?? current.record.priority,
    status: patch.status ?? current.record.status,
    assigneeEmail: patch.assigneeEmail ?? current.record.assignee_email ?? undefined,
    nextAction: patch.nextAction ?? current.record.next_action ?? undefined,
    occurredAt: patch.occurredAt ?? current.record.occurred_at,
  };
  const validation = validateFeedbackInput(merged);
  if (!validation.value) return { error: validation.error ?? "记录格式无效。", status: 400 as const };

  const value = validation.value;
  const changes = diffRecord(current.record, value);
  if (Object.keys(changes).length === 0) return { record: current, status: 200 as const };

  const db = await ensureSchema();
  const now = new Date().toISOString();
  const archivedAt = value.status === "已归档" ? now : null;
  await db.batch([
    db.prepare(
      `UPDATE feedback_records SET
        platform = ?, source_type = ?, external_id = ?, content_id = ?, author_alias = ?,
        summary = ?, sentiment = ?, need_tag = ?, priority = ?, status = ?, assignee_email = ?,
        next_action = ?, occurred_at = ?, updated_at = ?, archived_at = ?
       WHERE id = ? AND workspace_id = ?`,
    ).bind(
      value.platform, value.sourceType, value.externalId ?? null, value.contentId ?? null,
      value.authorAlias ?? null, value.summary, value.sentiment, value.needTag, value.priority,
      value.status, value.assigneeEmail ?? null, value.nextAction ?? null, value.occurredAt,
      now, archivedAt, id, workspaceId,
    ),
    db.prepare(
      `INSERT INTO record_events
        (id, record_id, workspace_id, actor_email, action, changes_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), id, workspaceId, actorEmail, "更新记录", JSON.stringify(changes), now),
  ]);
  return { record: await getFeedback(workspaceId, id), status: 200 as const };
}

export type AiSuggestion = {
  needTag: NeedTag;
  priority: Priority;
  reason: string;
  confidence: number;
  model: string;
};

export async function beginAiClassification(workspaceId: string, id: string) {
  const db = await ensureSchema();
  const result = await db.prepare(
    `UPDATE feedback_records
     SET ai_review_status = '分类中'
     WHERE id = ? AND workspace_id = ?
       AND COALESCE(ai_review_status, '') != '分类中'
       AND (ai_classified_at IS NULL OR datetime(ai_classified_at) < datetime('now', '-10 seconds'))`,
  ).bind(id, workspaceId).run();
  if ((result.meta?.changes ?? 0) === 0) {
    const record = await db.prepare(
      "SELECT id FROM feedback_records WHERE id = ? AND workspace_id = ?",
    ).bind(id, workspaceId).first<{ id: string }>();
    return record ? { error: "分类请求过于频繁，请稍后再试。", status: 429 as const } : { error: "记录不存在。", status: 404 as const };
  }
  return { ok: true as const };
}

export async function saveAiSuggestion(workspaceId: string, id: string, suggestion: AiSuggestion) {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE feedback_records SET
      ai_need_tag = ?, ai_priority = ?, ai_reason = ?, ai_confidence = ?,
      ai_review_status = '待审核', ai_model = ?, ai_classified_at = ?,
      ai_reviewed_at = NULL, ai_reviewed_by = NULL
     WHERE id = ? AND workspace_id = ?`,
  ).bind(
    suggestion.needTag, suggestion.priority, suggestion.reason.slice(0, 240), suggestion.confidence,
    suggestion.model, now, id, workspaceId,
  ).run();
  return getFeedback(workspaceId, id);
}

export async function markAiClassificationFailed(workspaceId: string, id: string) {
  const db = await ensureSchema();
  await db.prepare(
    `UPDATE feedback_records SET ai_review_status = '分类失败', ai_classified_at = ?
     WHERE id = ? AND workspace_id = ?`,
  ).bind(new Date().toISOString(), id, workspaceId).run();
}

export async function reviewAiSuggestion(
  workspaceId: string,
  actorEmail: string,
  id: string,
  input: { needTag?: string; priority?: string },
) {
  const current = await getFeedback(workspaceId, id);
  if (!current) return { error: "记录不存在。", status: 404 as const };
  if (current.record.ai_review_status !== "待审核" || !current.record.ai_need_tag || !current.record.ai_priority) {
    return { error: "当前没有等待确认的 AI 建议。", status: 409 as const };
  }
  if (!needTags.includes(input.needTag as NeedTag) || !priorities.includes(input.priority as Priority)) {
    return { error: "需求标签或优先级无效。", status: 400 as const };
  }

  const needTag = input.needTag as NeedTag;
  const priority = input.priority as Priority;
  const accepted = needTag === current.record.ai_need_tag && priority === current.record.ai_priority;
  const now = new Date().toISOString();
  const db = await ensureSchema();
  await db.batch([
    db.prepare(
      `UPDATE feedback_records SET need_tag = ?, priority = ?, ai_review_status = ?,
        ai_reviewed_at = ?, ai_reviewed_by = ?, updated_at = ?
       WHERE id = ? AND workspace_id = ? AND ai_review_status = '待审核'`,
    ).bind(needTag, priority, accepted ? "已接受" : "已修改", now, actorEmail, now, id, workspaceId),
    db.prepare(
      `INSERT INTO record_events
        (id, record_id, workspace_id, actor_email, action, changes_json, created_at)
       SELECT ?, id, workspace_id, ?, ?, ?, ? FROM feedback_records
       WHERE id = ? AND workspace_id = ? AND ai_reviewed_at = ? AND ai_reviewed_by = ?`,
    ).bind(
      crypto.randomUUID(), actorEmail,
      accepted ? "接受 AI 分类" : "修改 AI 分类",
      JSON.stringify({
        ai_suggestion: { need_tag: current.record.ai_need_tag, priority: current.record.ai_priority },
        final: { need_tag: needTag, priority },
      }),
      now, id, workspaceId, now, actorEmail,
    ),
  ]);
  return { record: await getFeedback(workspaceId, id), status: 200 as const };
}

function addEquals(conditions: string[], bindings: unknown[], column: string, value?: string) {
  if (value?.trim()) {
    conditions.push(`${column} = ?`);
    bindings.push(value.trim());
  }
}

function diffRecord(current: FeedbackRow, next: ValidFeedbackInput) {
  const pairs: Array<[string, unknown, unknown]> = [
    ["platform", current.platform, next.platform], ["source_type", current.source_type, next.sourceType],
    ["summary", current.summary, next.summary], ["sentiment", current.sentiment, next.sentiment],
    ["need_tag", current.need_tag, next.needTag], ["priority", current.priority, next.priority],
    ["status", current.status, next.status], ["assignee_email", current.assignee_email, next.assigneeEmail ?? null],
    ["next_action", current.next_action, next.nextAction ?? null],
  ];
  return Object.fromEntries(
    pairs.filter(([, before, after]) => before !== after).map(([key, before, after]) => [key, { before, after }]),
  );
}
