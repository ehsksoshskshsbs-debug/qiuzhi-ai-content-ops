import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const port = 8800 + (process.pid % 100);
const origin = `http://127.0.0.1:${port}`;
let server;

test.before(async () => {
  server = spawn(process.execPath, [
    fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
    "dev", "--config", fileURLToPath(new URL("../dist/server/wrangler.json", import.meta.url)),
    "--port", String(port), "--local", "--var", "OPS_ALLOWED_EMAILS:test@example.com",
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

test.after(() => { server?.kill(); });

async function render(path = "/", headers = { accept: "text/html" }) {
  return fetch(`${origin}${path}`, { headers, redirect: "manual" });
}

test("server-renders the finished portfolio", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /秋芝 AI 内容运营/);
  assert.match(html, /30 条视频/);
  assert.match(html, /模拟案例/);
  assert.match(html, /不代表秋芝2046官方/);
  assert.match(html, /href="\/ops"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
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

test("starter preview has been removed", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
