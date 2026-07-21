import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";

const port = 8800 + (process.pid % 100);
const origin = `http://127.0.0.1:${port}`;
let server;
let mockOpenAI;
const mockPort = 9800 + (process.pid % 100);
const mockRequests = [];

test.before(async () => {
  mockOpenAI = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    mockRequests.push(body);
    if (body.includes("模拟超时")) {
      setTimeout(() => {
        if (!response.writableEnded) response.end(JSON.stringify({ status: "completed", output: [] }));
      }, 300);
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    if (body.includes("模拟拒答")) {
      response.end(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "mock refusal" }] }] }));
      return;
    }
    if (body.includes("模拟非法格式")) {
      response.end(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "{}" }] }] }));
      return;
    }
    response.end(JSON.stringify({
      status: "completed",
      output: [{ type: "message", content: [{
        type: "output_text",
        text: JSON.stringify({ needTag: "报错", priority: "P1", reason: "影响用户完成教程步骤", confidence: 0.86 }),
      }] }],
    }));
  });
  await new Promise((resolve, reject) => {
    mockOpenAI.once("error", reject);
    mockOpenAI.listen(mockPort, "127.0.0.1", resolve);
  });
  server = spawn(process.execPath, [
    fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
    "dev", "--config", fileURLToPath(new URL("../dist/server/wrangler.json", import.meta.url)),
    "--port", String(port), "--local",
    "--var", "OPS_ALLOWED_EMAILS:test@example.com",
    "--var", "OPENAI_API_KEY:test-key",
    "--var", `OPENAI_RESPONSES_URL:http://127.0.0.1:${mockPort}/v1/responses`,
    "--var", "OPENAI_CLASSIFICATION_MODEL:gpt-5.6-luna",
    "--var", "OPENAI_CLASSIFICATION_TIMEOUT_MS:100",
  ], { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "ignore" });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${origin}/`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Local Worker did not become ready in time.");
});

test.after(() => { server?.kill(); mockOpenAI?.close(); });

async function render(path = "/", headers = { accept: "text/html" }) {
  return fetch(`${origin}${path}`, { headers, redirect: "manual" });
}

test("server-renders the simplified public video guide", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /快速了解秋芝2046/);
  assert.match(html, /30 条视频/);
  assert.match(html, /不代表秋芝2046官方/);
  assert.match(html, /href="#insight"/);
  assert.match(html, /href="#videos"/);
  assert.doesNotMatch(html, /href="#agent"|href="#knowledge"|href="#case"|href="#dashboard"|href="\/ops"/);
  assert.doesNotMatch(html, /CODEX AGENT|KNOWLEDGE BASE|CASE STUDY|OPERATIONS DASHBOARD/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("renders the recruiting portfolio and serves its PDF", async () => {
  const response = await render("/portfolio");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /一套能落到/);
  assert.match(html, /三个马上能制作的选题/);
  assert.match(html, /14条模拟反馈/);
  assert.match(html, /不编造成绩/);
  assert.match(html, /个人求职作品/);
  assert.match(html, /href="\/qiuzhi-ai-content-ops-portfolio\.pdf"/);
  assert.doesNotMatch(html, /href="\/ops"/);

  const pdfResponse = await render("/qiuzhi-ai-content-ops-portfolio.pdf", { accept: "application/pdf" });
  assert.equal(pdfResponse.status, 200);
  assert.match(pdfResponse.headers.get("content-type") ?? "", /application\/pdf/);
  assert.ok(Number(pdfResponse.headers.get("content-length") ?? 0) > 100_000);
});

test("protects the cloud operations surface before touching D1", async () => {
  const apiResponse = await render("/api/ops/feedback", { accept: "application/json" });
  assert.equal(apiResponse.status, 401);
  assert.deepEqual(await apiResponse.json(), { error: "请先登录 ChatGPT。" });

  const pageResponse = await render("/ops");
  assert.ok([302, 303, 307, 308].includes(pageResponse.status));
  assert.match(pageResponse.headers.get("location") ?? "", /\/signin-with-chatgpt\?return_to=/);
});

test("creates, masks and audits an authorized feedback record in D1", async () => {
  const authenticated = {
    accept: "application/json",
    "content-type": "application/json",
    "oai-authenticated-user-email": "test@example.com",
  };
  const externalId = `test-${process.pid}-${Date.now()}`;
  const createResponse = await fetch(`${origin}/api/ops/feedback`, {
    method: "POST",
    headers: authenticated,
    body: JSON.stringify({
      platform: "B站",
      sourceType: "私信",
      externalId,
      summary: "用户手机号 13812345678，邮箱 user@example.com，希望补充教程。",
      priority: "P1",
    }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.match(created.record.trace_code, /^FB-/);
  assert.match(created.record.summary, /\[手机号已隐藏\]/);
  assert.match(created.record.summary, /\[邮箱已隐藏\]/);
  assert.doesNotMatch(created.record.summary, /13812345678|user@example\.com/);
  assert.equal(created.events[0].action, "创建记录");

  const updateResponse = await fetch(`${origin}/api/ops/feedback/${created.record.id}`, {
    method: "PATCH",
    headers: authenticated,
    body: JSON.stringify({ status: "处理中", nextAction: "整理成 FAQ" }),
  });
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json();
  assert.equal(updated.record.status, "处理中");
  assert.equal(updated.events.length, 2);
});

test("keeps AI suggestions separate until a human confirms them", async () => {
  const authenticated = {
    accept: "application/json",
    "content-type": "application/json",
    "oai-authenticated-user-email": "test@example.com",
  };
  const createResponse = await fetch(`${origin}/api/ops/feedback`, {
    method: "POST",
    headers: authenticated,
    body: JSON.stringify({
      platform: "B站",
      sourceType: "评论",
      externalId: `ai-${process.pid}-${Date.now()}`,
      summary: "用户邮箱 demo@example.com，教程第三步报错，无法继续完成。",
      needTag: "教程需求",
      priority: "P2",
    }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();

  const classifyResponse = await fetch(`${origin}/api/ops/feedback/${created.record.id}/classify`, {
    method: "POST",
    headers: authenticated,
  });
  assert.equal(classifyResponse.status, 200);
  const classified = await classifyResponse.json();
  assert.equal(classified.record.need_tag, "教程需求");
  assert.equal(classified.record.priority, "P2");
  assert.equal(classified.record.ai_need_tag, "报错");
  assert.equal(classified.record.ai_priority, "P1");
  assert.equal(classified.record.ai_review_status, "待审核");
  assert.doesNotMatch(mockRequests.at(-1) ?? "", /demo@example\.com/);

  const reviewResponse = await fetch(`${origin}/api/ops/feedback/${created.record.id}/classification-review`, {
    method: "POST",
    headers: authenticated,
    body: JSON.stringify({ needTag: "报错", priority: "P1" }),
  });
  assert.equal(reviewResponse.status, 200);
  const reviewed = await reviewResponse.json();
  assert.equal(reviewed.record.need_tag, "报错");
  assert.equal(reviewed.record.priority, "P1");
  assert.equal(reviewed.record.ai_review_status, "已接受");
  assert.equal(reviewed.events[0].action, "接受 AI 分类");
});

test("falls back safely on refusals, invalid output and timeouts", async () => {
  const authenticated = {
    accept: "application/json",
    "content-type": "application/json",
    "oai-authenticated-user-email": "test@example.com",
  };
  for (const [marker, expectedStatus] of [["模拟拒答", 422], ["模拟非法格式", 502], ["模拟超时", 504]]) {
    const createResponse = await fetch(`${origin}/api/ops/feedback`, {
      method: "POST",
      headers: authenticated,
      body: JSON.stringify({
        platform: "B站",
        sourceType: "评论",
        externalId: `edge-${marker}-${process.pid}-${Date.now()}`,
        summary: `${marker}，仍应允许人工处理。`,
        needTag: "其他",
        priority: "P3",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    const classifyResponse = await fetch(`${origin}/api/ops/feedback/${created.record.id}/classify`, {
      method: "POST",
      headers: authenticated,
    });
    assert.equal(classifyResponse.status, expectedStatus);

    const detailResponse = await fetch(`${origin}/api/ops/feedback/${created.record.id}`, { headers: authenticated });
    const detail = await detailResponse.json();
    assert.equal(detail.record.need_tag, "其他");
    assert.equal(detail.record.priority, "P3");
    assert.equal(detail.record.ai_review_status, "分类失败");
  }
});

test("starter preview has been removed", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
