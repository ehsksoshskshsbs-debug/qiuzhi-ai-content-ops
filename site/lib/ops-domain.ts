export const platforms = ["B站", "抖音", "小红书", "视频号", "公众号", "其他"] as const;
export const sourceTypes = ["评论", "私信", "主动反馈", "客服转交"] as const;
export const sentiments = ["正向", "中性", "负向"] as const;
export const needTags = ["教程需求", "报错", "商务", "隐私", "招聘", "活动", "其他"] as const;
export const priorities = ["P0", "P1", "P2", "P3"] as const;
export const statuses = ["待处理", "处理中", "等待外部", "已解决", "已归档"] as const;

export type FeedbackInput = {
  platform?: string;
  sourceType?: string;
  externalId?: string;
  contentId?: string;
  authorAlias?: string;
  summary?: string;
  sentiment?: string;
  needTag?: string;
  priority?: string;
  status?: string;
  assigneeEmail?: string;
  nextAction?: string;
  occurredAt?: string;
};

export type ValidFeedbackInput = Required<Pick<FeedbackInput,
  "platform" | "sourceType" | "summary" | "sentiment" | "needTag" | "priority" | "status" | "occurredAt"
>> & Omit<FeedbackInput, "platform" | "sourceType" | "summary" | "sentiment" | "needTag" | "priority" | "status" | "occurredAt">;

export function validateFeedbackInput(input: FeedbackInput): { value?: ValidFeedbackInput; error?: string } {
  const summary = maskSensitiveText(input.summary?.trim() ?? "");
  if (!summary) return { error: "匿名摘要不能为空。" };
  if (summary.length > 800) return { error: "匿名摘要不能超过 800 字。" };

  const occurredAt = input.occurredAt || new Date().toISOString();
  if (Number.isNaN(Date.parse(occurredAt))) return { error: "反馈时间格式无效。" };

  const value: ValidFeedbackInput = {
    platform: enumValue(input.platform, platforms, "其他"),
    sourceType: enumValue(input.sourceType, sourceTypes, "主动反馈"),
    summary,
    sentiment: enumValue(input.sentiment, sentiments, "中性"),
    needTag: enumValue(input.needTag, needTags, "其他"),
    priority: enumValue(input.priority, priorities, "P2"),
    status: enumValue(input.status, statuses, "待处理"),
    occurredAt: new Date(occurredAt).toISOString(),
    externalId: cleanOptional(input.externalId, 160),
    contentId: cleanOptional(input.contentId, 160),
    authorAlias: cleanOptional(maskSensitiveText(input.authorAlias ?? ""), 120),
    assigneeEmail: cleanOptional(input.assigneeEmail?.toLowerCase(), 254),
    nextAction: cleanOptional(maskSensitiveText(input.nextAction ?? ""), 500),
  };
  return { value };
}

export function maskSensitiveText(value: string): string {
  return value
    .replace(/\b1[3-9]\d{9}\b/g, "[手机号已隐藏]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[邮箱已隐藏]")
    .replace(/(?:微信|wx|wechat)[:：\s]*[a-zA-Z][-_a-zA-Z0-9]{5,19}/gi, "[微信号已隐藏]");
}

export function makeTraceCode(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `FB-${date}-${suffix}`;
}

function cleanOptional(value: string | undefined, max: number): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

function enumValue<T extends readonly string[]>(value: string | undefined, options: T, fallback: T[number]): T[number] {
  return options.includes(value as T[number]) ? (value as T[number]) : fallback;
}
