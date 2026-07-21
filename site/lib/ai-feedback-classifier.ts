import { getRuntimeEnv } from "../db";
import { maskSensitiveText, needTags, priorities, type NeedTag, type Priority } from "./ops-domain";

const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_RESPONSES_URL = "https://api.openai.com/v1/responses";
const PRIVACY_INCIDENT = /(隐私泄露|数据泄露|个人信息(?:被)?曝光|账号被盗|未经授权.{0,8}(?:公开|分享|使用))/;

export type ClassificationSuggestion = {
  needTag: NeedTag;
  priority: Priority;
  reason: string;
  confidence: number;
  model: string;
};

type OpenAIResponse = {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
};

export async function classifyFeedbackSummary(summary: string): Promise<ClassificationSuggestion> {
  const runtime = getRuntimeEnv();
  const apiKey = runtime.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new ClassificationError("AI 分类服务尚未配置。", 503);

  const safeSummary = maskSensitiveText(summary.trim()).slice(0, 800);
  if (!safeSummary) throw new ClassificationError("匿名摘要不能为空。", 400);

  const model = runtime.OPENAI_CLASSIFICATION_MODEL?.trim() || DEFAULT_MODEL;
  const configuredTimeout = Number(runtime.OPENAI_CLASSIFICATION_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 100
    ? Math.min(configuredTimeout, 30_000)
    : 20_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(runtime.OPENAI_RESPONSES_URL?.trim() || DEFAULT_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 220,
        input: [
          {
            role: "system",
            content: `你是秋芝2046内容运营团队的反馈分类助手。只分析匿名摘要，只建议需求标签与优先级，不执行任何外部操作。
需求标签只能是：${needTags.join("、")}。
优先级规则：P0=隐私或安全事故、重大错误且需立即处理；P1=明显影响用户完成任务或高价值机会；P2=常规需求与一般问题；P3=低影响建议或信息不足。
理由不超过60个汉字。置信度用0到1的小数。信息不足时降低置信度，不要臆测。`,
          },
          { role: "user", content: safeSummary },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "feedback_classification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                needTag: { type: "string", enum: [...needTags] },
                priority: { type: "string", enum: [...priorities] },
                reason: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
              required: ["needTag", "priority", "reason", "confidence"],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new ClassificationError(`AI 分类服务暂时不可用（${response.status}）。`, 502);
    const payload = await response.json() as OpenAIResponse;
    const suggestion = parseClassificationResponse(payload, model);
    if (PRIVACY_INCIDENT.test(safeSummary)) {
      return {
        ...suggestion,
        needTag: "隐私",
        priority: "P0",
        reason: `检测到明确隐私或账号安全风险；${suggestion.reason}`.slice(0, 120),
        confidence: Math.max(suggestion.confidence, 0.9),
      };
    }
    return suggestion;
  } catch (error) {
    if (error instanceof ClassificationError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ClassificationError("AI 分类超时，请稍后重试或改为人工填写。", 504);
    }
    throw new ClassificationError("AI 分类失败，请稍后重试或改为人工填写。", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export function parseClassificationResponse(payload: OpenAIResponse, model: string): ClassificationSuggestion {
  if (payload.status === "incomplete") {
    throw new ClassificationError(`AI 返回不完整（${payload.incomplete_details?.reason || "unknown"}）。`, 502);
  }
  const message = payload.output?.find((item) => item.type === "message");
  const content = message?.content?.[0];
  if (content?.type === "refusal") throw new ClassificationError("AI 无法处理该摘要，请人工分类。", 422);
  if (content?.type !== "output_text" || !content.text) {
    throw new ClassificationError("AI 未返回可用建议，请人工分类。", 502);
  }

  let value: unknown;
  try {
    value = JSON.parse(content.text);
  } catch {
    throw new ClassificationError("AI 返回格式无效，请人工分类。", 502);
  }
  if (!isClassification(value)) throw new ClassificationError("AI 返回字段无效，请人工分类。", 502);
  return { ...value, reason: value.reason.trim().slice(0, 120), model };
}

function isClassification(value: unknown): value is Omit<ClassificationSuggestion, "model"> {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return needTags.includes(item.needTag as NeedTag)
    && priorities.includes(item.priority as Priority)
    && typeof item.reason === "string"
    && item.reason.trim().length > 0
    && typeof item.confidence === "number"
    && Number.isFinite(item.confidence)
    && item.confidence >= 0
    && item.confidence <= 1;
}

export class ClassificationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ClassificationError";
  }
}
