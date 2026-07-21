"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { needTags, platforms, priorities, sentiments, sourceTypes, statuses, type FeedbackInput } from "../../lib/ops-domain";

type FeedbackRecord = {
  id: string; trace_code: string; platform: string; source_type: string; external_id: string | null;
  content_id: string | null; author_alias: string | null; summary: string; sentiment: string;
  need_tag: string; priority: string; status: string; assignee_email: string | null;
  next_action: string | null; occurred_at: string; created_at: string; updated_at: string;
  ai_need_tag: string | null; ai_priority: string | null; ai_reason: string | null;
  ai_confidence: number | null; ai_review_status: string | null; ai_model: string | null;
  ai_classified_at: string | null; ai_reviewed_at: string | null; ai_reviewed_by: string | null;
};
type FeedbackEvent = { id: string; actor_email: string; action: string; changes_json: string; created_at: string };
type Connection = { platform: string; status: string; account_label: string | null; last_synced_at: string | null };
type Metric = { id: string; platform: string; content_id: string; metric_date: string; metric_name: string; metric_value: number };
type Stats = { total?: number; this_week?: number; open_count?: number; urgent_count?: number; avg_resolution_hours?: number | null };

const emptyForm: FeedbackInput = {
  platform: "B站", sourceType: "评论", summary: "", sentiment: "中性", needTag: "教程需求",
  priority: "P2", status: "待处理", occurredAt: new Date().toISOString().slice(0, 16),
};

export default function OpsWorkbench({ currentUser, signOutPath }: { currentUser: string; signOutPath: string }) {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [filters, setFilters] = useState({ search: "", platform: "", sourceType: "", priority: "", status: "" });
  const [selected, setSelected] = useState<{ record: FeedbackRecord; events: FeedbackEvent[] } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ops/feedback?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取台账失败");
      setRecords(data.records);
      setStats(data.stats);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "读取台账失败");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadSecondary = useCallback(async () => {
    const [connectionResponse, metricResponse] = await Promise.all([
      fetch("/api/ops/connections", { cache: "no-store" }),
      fetch("/api/ops/metrics", { cache: "no-store" }),
    ]);
    if (connectionResponse.ok) setConnections((await connectionResponse.json()).connections);
    if (metricResponse.ok) setMetrics((await metricResponse.json()).metrics);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadRecords(), 0); return () => window.clearTimeout(timer); }, [loadRecords]);
  useEffect(() => { const timer = window.setTimeout(() => void loadSecondary(), 0); return () => window.clearTimeout(timer); }, [loadSecondary]);

  async function createRecord(input: FeedbackInput) {
    setBusy(true);
    try {
      const response = await fetch("/api/ops/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "新增失败");
      setShowCreate(false);
      setNotice(`已创建 ${data.record.trace_code}`);
      await loadRecords();
    } catch (error) { setNotice(error instanceof Error ? error.message : "新增失败"); }
    finally { setBusy(false); }
  }

  async function openRecord(record: FeedbackRecord) {
    const response = await fetch(`/api/ops/feedback/${record.id}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setSelected(data); else setNotice(data.error || "读取详情失败");
  }

  async function updateRecord(input: FeedbackInput) {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ops/feedback/${selected.record.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "更新失败");
      setSelected(data);
      setNotice("记录和变更历史已更新");
      await loadRecords();
    } catch (error) { setNotice(error instanceof Error ? error.message : "更新失败"); }
    finally { setBusy(false); }
  }

  async function classifyRecord() {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ops/feedback/${selected.record.id}/classify`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI 分类失败");
      setSelected(data);
      setNotice("AI 建议已生成，请人工确认后保存");
    } catch (error) { setNotice(error instanceof Error ? error.message : "AI 分类失败"); }
    finally { setBusy(false); }
  }

  async function reviewClassification(needTag: string, priority: string) {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ops/feedback/${selected.record.id}/classification-review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ needTag, priority }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI 建议确认失败");
      setSelected(data);
      setNotice("人工确认已保存，正式字段和审计记录已更新");
      await loadRecords();
    } catch (error) { setNotice(error instanceof Error ? error.message : "AI 建议确认失败"); }
    finally { setBusy(false); }
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) return setNotice("CSV 没有可导入的数据行");
    const [headers, ...rows] = parsed;
    const mapped = rows.filter((row) => row.some(Boolean)).map((row) => mapCsvRow(headers, row));
    if (!window.confirm(`已预检 ${mapped.length} 条。确认上传到云端台账？`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/ops/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: mapped }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "导入失败");
      setNotice(`导入完成：新增 ${data.inserted}，重复 ${data.duplicates}，失败 ${data.errors.length}`);
      await loadRecords();
    } catch (error) { setNotice(error instanceof Error ? error.message : "导入失败"); }
    finally { setBusy(false); }
  }

  function downloadTemplate() {
    const header = "平台,来源类型,平台记录编号,内容编号,用户代号,匿名摘要,情绪,需求标签,优先级,状态,负责人,下一步,发生时间\r\n";
    const sample = "B站,评论,,BV示例,用户-001,请先完成脱敏再填写摘要,中性,教程需求,P2,待处理,,补充FAQ,2026-07-21T10:00:00+08:00";
    downloadBlob(`\uFEFF${header}${sample}`, "反馈导入模板.csv", "text/csv;charset=utf-8");
  }

  async function requestSync(platform: string) {
    const response = await fetch(`/api/ops/connections/${encodeURIComponent(platform)}/sync`, { method: "POST" });
    const data = await response.json();
    setNotice(data.error || "同步请求已记录");
    await loadSecondary();
  }

  return (
    <main className="ops-shell">
      <header className="ops-topbar">
        <Link href="/" className="ops-brand"><span>QZ</span><strong>反馈追踪工作台<small>真实台账 · 非公开数据</small></strong></Link>
        <div className="ops-user"><span>{currentUser}</span><a href={signOutPath}>退出</a></div>
      </header>

      <section className="ops-hero">
        <div><span className="ops-badge">QZ OPS / CLOUD LEDGER</span><h1>每条反馈，<br />都有下一步。</h1><p>评论、私信、主动反馈和运营指标统一留痕。默认匿名化，不自动回复或发布。</p></div>
        <div className="ops-hero-actions"><button className="ops-button primary" onClick={() => setShowCreate(true)}>＋ 新增记录</button><label className="ops-button file-button">导入 CSV<input type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && void importCsv(event.target.files[0])} /></label><a className="ops-button" href={`/api/ops/export?${query}`}>导出 CSV</a><button className="ops-text-button" onClick={downloadTemplate}>下载模板</button></div>
      </section>

      {notice && <div className="ops-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="关闭提示">×</button></div>}

      <section className="ops-stats" aria-label="反馈统计">
        <Stat label="本周新增" value={stats.this_week ?? 0} note="近 7 天" />
        <Stat label="待推进" value={stats.open_count ?? 0} note="含等待外部" />
        <Stat label="P0 / P1" value={stats.urgent_count ?? 0} note="未解决高优先级" accent />
        <Stat label="平均处理" value={stats.avg_resolution_hours == null ? "—" : `${Math.round(stats.avg_resolution_hours)}h`} note={`共 ${stats.total ?? 0} 条`} />
      </section>

      <section className="ops-panel">
        <div className="ops-panel-head"><div><span>01 / FEEDBACK</span><h2>反馈台账</h2></div><button className="ops-text-button" onClick={() => void loadRecords()}>刷新</button></div>
        <div className="ops-filters">
          <input placeholder="搜索编号、摘要或内容编号" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <Filter value={filters.platform} options={platforms} label="全部平台" onChange={(platform) => setFilters({ ...filters, platform })} />
          <Filter value={filters.sourceType} options={sourceTypes} label="全部类型" onChange={(sourceType) => setFilters({ ...filters, sourceType })} />
          <Filter value={filters.priority} options={priorities} label="全部优先级" onChange={(priority) => setFilters({ ...filters, priority })} />
          <Filter value={filters.status} options={statuses} label="全部状态" onChange={(status) => setFilters({ ...filters, status })} />
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table"><thead><tr><th>追踪编号</th><th>平台 / 类型</th><th>匿名摘要</th><th>优先级</th><th>状态</th><th>负责人</th><th>更新时间</th></tr></thead>
            <tbody>{records.map((record) => <tr key={record.id} onClick={() => void openRecord(record)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && void openRecord(record)}><td><strong>{record.trace_code}</strong><small>{record.content_id || "未关联内容"}</small></td><td>{record.platform}<small>{record.source_type}</small></td><td className="summary-cell">{record.summary}</td><td><span className={`priority priority-${record.priority.toLowerCase()}`}>{record.priority}</span></td><td>{record.status}</td><td>{record.assignee_email || "待指派"}</td><td>{formatDate(record.updated_at)}</td></tr>)}</tbody>
          </table>
          {!loading && records.length === 0 && <div className="ops-empty"><strong>当前筛选下没有记录</strong><span>可以新增一条，或导入已经脱敏的 CSV。</span></div>}
          {loading && <div className="ops-empty">正在读取云端台账…</div>}
        </div>
      </section>

      <section className="ops-two-column">
        <div className="ops-panel"><div className="ops-panel-head"><div><span>02 / CONNECTIONS</span><h2>平台连接</h2></div></div><div className="connection-list">{connections.map((connection) => <article key={connection.platform}><div><strong>{connection.platform}</strong><small>{connection.last_synced_at ? `上次同步 ${formatDate(connection.last_synced_at)}` : "尚未获取任何平台数据"}</small></div><span>{connection.status}</span><button onClick={() => void requestSync(connection.platform)}>检查授权</button></article>)}</div><p className="ops-safety-note">只有取得官方开发者权限和账号授权后才会拉取数据。当前按钮不会抓取、发布或回复任何内容。</p></div>
        <MetricPanel metrics={metrics} onSaved={async (message) => { setNotice(message); await loadSecondary(); }} />
      </section>

      <footer className="ops-footer"><span>QZ OPS · 云端可追踪记录</span><p>真实运营数据不进入公开作品集 · 默认匿名化 · 不自动对外写入</p></footer>

      {showCreate && <FeedbackEditor title="新增反馈记录" initial={emptyForm} busy={busy} onCancel={() => setShowCreate(false)} onSave={createRecord} />}
      {selected && <FeedbackEditor key={`${selected.record.id}-${selected.record.updated_at}-${selected.record.ai_classified_at ?? "none"}`} title={selected.record.trace_code} initial={recordToInput(selected.record)} record={selected.record} events={selected.events} busy={busy} onCancel={() => setSelected(null)} onSave={updateRecord} onClassify={classifyRecord} onReviewClassification={reviewClassification} />}
    </main>
  );
}

function Stat({ label, value, note, accent = false }: { label: string; value: string | number; note: string; accent?: boolean }) { return <article className={accent ? "accent" : ""}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function Filter({ value, options, label, onChange }: { value: string; options: readonly string[]; label: string; onChange: (value: string) => void }) { return <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}><option value="">{label}</option>{options.map((option) => <option key={option}>{option}</option>)}</select>; }

function FeedbackEditor({ title, initial, record, events, busy, onCancel, onSave, onClassify, onReviewClassification }: { title: string; initial: FeedbackInput; record?: FeedbackRecord; events?: FeedbackEvent[]; busy: boolean; onCancel: () => void; onSave: (input: FeedbackInput) => Promise<void>; onClassify?: () => Promise<void>; onReviewClassification?: (needTag: string, priority: string) => Promise<void> }) {
  const [form, setForm] = useState(initial);
  const [reviewNeedTag, setReviewNeedTag] = useState(record?.ai_need_tag ?? "");
  const [reviewPriority, setReviewPriority] = useState(record?.ai_priority ?? "");
  const set = (key: keyof FeedbackInput, value: string) => setForm({ ...form, [key]: value });
  const awaitingReview = record?.ai_review_status === "待审核";
  const lowConfidence = (record?.ai_confidence ?? 1) < 0.65;
  return <div className="ops-modal-backdrop" role="presentation"><section className="ops-modal" role="dialog" aria-modal="true" aria-label={title}><header><div><span>TRACEABLE RECORD</span><h2>{title}</h2></div><button onClick={onCancel} aria-label="关闭">×</button></header><form onSubmit={(e) => { e.preventDefault(); void onSave(form); }}><div className="form-grid"><Field label="平台"><Filter value={form.platform ?? ""} options={platforms} label="选择平台" onChange={(value) => set("platform", value)} /></Field><Field label="来源类型"><Filter value={form.sourceType ?? ""} options={sourceTypes} label="选择类型" onChange={(value) => set("sourceType", value)} /></Field><Field label="平台记录编号"><input value={form.externalId ?? ""} onChange={(e) => set("externalId", e.target.value)} /></Field><Field label="内容编号"><input value={form.contentId ?? ""} onChange={(e) => set("contentId", e.target.value)} /></Field><Field label="用户代号"><input value={form.authorAlias ?? ""} onChange={(e) => set("authorAlias", e.target.value)} placeholder="请使用匿名代号" /></Field><Field label="发生时间"><input type="datetime-local" value={(form.occurredAt ?? "").slice(0, 16)} onChange={(e) => set("occurredAt", e.target.value)} /></Field><Field label="情绪"><Filter value={form.sentiment ?? ""} options={sentiments} label="选择情绪" onChange={(value) => set("sentiment", value)} /></Field><Field label="需求标签"><Filter value={form.needTag ?? ""} options={needTags} label="选择标签" onChange={(value) => set("needTag", value)} /></Field><Field label="优先级"><Filter value={form.priority ?? ""} options={priorities} label="选择优先级" onChange={(value) => set("priority", value)} /></Field><Field label="状态"><Filter value={form.status ?? ""} options={statuses} label="选择状态" onChange={(value) => set("status", value)} /></Field><Field label="负责人邮箱"><input type="email" value={form.assigneeEmail ?? ""} onChange={(e) => set("assigneeEmail", e.target.value)} /></Field><Field label="下一步"><input value={form.nextAction ?? ""} onChange={(e) => set("nextAction", e.target.value)} /></Field><Field label="匿名摘要" wide><textarea required rows={5} value={form.summary ?? ""} onChange={(e) => set("summary", e.target.value)} placeholder="不要粘贴私信原文；先去除手机号、微信号、邮箱和客户信息。" /></Field></div><div className="modal-actions"><button type="button" className="ops-button" onClick={onCancel}>取消</button><button className="ops-button primary" disabled={busy}>{busy ? "保存中…" : "保存并留痕"}</button></div></form>{record && <section className="ai-review-card"><div className="ai-review-head"><div><span>AI ASSISTED / HUMAN APPROVED</span><h3>AI 分类建议</h3></div><button type="button" className="ops-button" disabled={busy} onClick={() => void onClassify?.()}>{busy ? "处理中…" : record.ai_classified_at ? "重新生成" : "获取 AI 建议"}</button></div><p className="ai-privacy-note">只发送已脱敏的匿名摘要。AI 建议不会自动写入正式字段。</p>{record.ai_review_status && <span className={`ai-status ${awaitingReview ? "pending" : ""}`}>{record.ai_review_status}</span>}{record.ai_reason && <div className="ai-reason"><strong>判断理由</strong><p>{record.ai_reason}</p><small>置信度 {Math.round((record.ai_confidence ?? 0) * 100)}% · {record.ai_model}</small></div>}{awaitingReview && <div className="ai-review-form"><Field label="确认后的需求标签"><Filter value={reviewNeedTag} options={needTags} label="选择标签" onChange={setReviewNeedTag} /></Field><Field label="确认后的优先级"><Filter value={reviewPriority} options={priorities} label="选择优先级" onChange={setReviewPriority} /></Field>{(reviewPriority === "P0" || lowConfidence) && <p className="ai-warning">{reviewPriority === "P0" ? "P0 属于立即处理级别，请再次核对。" : "置信度较低，建议重点人工核对。"}</p>}<button type="button" className="ops-button primary" disabled={busy || !reviewNeedTag || !reviewPriority} onClick={() => void onReviewClassification?.(reviewNeedTag, reviewPriority)}>人工确认并保存</button></div>}</section>}{events && <div className="event-list"><h3>处理时间线</h3>{events.map((event) => <article key={event.id}><span>{formatDate(event.created_at)}</span><strong>{event.action}</strong><small>{event.actor_email}</small><code>{humanChanges(event.changes_json)}</code></article>)}</div>}</section></div>;
}
function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? "field-wide" : ""}><span>{label}</span>{children}</label>; }

function MetricPanel({ metrics, onSaved }: { metrics: Metric[]; onSaved: (message: string) => Promise<void> }) {
  const [form, setForm] = useState({ platform: "B站", contentId: "", metricDate: new Date().toISOString().slice(0, 10), metricName: "播放量", metricValue: "" });
  async function submit(e: React.FormEvent) { e.preventDefault(); const response = await fetch("/api/ops/metrics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, metricValue: Number(form.metricValue) }) }); const data = await response.json(); await onSaved(response.ok ? "运营指标已保存" : data.error || "指标保存失败"); }
  return <div className="ops-panel"><div className="ops-panel-head"><div><span>03 / METRICS</span><h2>运营数据</h2></div></div><form className="metric-form" onSubmit={submit}><Filter value={form.platform} options={platforms} label="平台" onChange={(platform) => setForm({ ...form, platform })} /><input required placeholder="内容编号" value={form.contentId} onChange={(e) => setForm({ ...form, contentId: e.target.value })} /><input type="date" required value={form.metricDate} onChange={(e) => setForm({ ...form, metricDate: e.target.value })} /><input required placeholder="指标名，例如播放量" value={form.metricName} onChange={(e) => setForm({ ...form, metricName: e.target.value })} /><input type="number" step="any" required placeholder="数值" value={form.metricValue} onChange={(e) => setForm({ ...form, metricValue: e.target.value })} /><button className="ops-button primary">保存快照</button></form><div className="metric-list">{metrics.slice(0, 8).map((metric) => <div key={metric.id}><span>{metric.metric_date} · {metric.platform} · {metric.content_id}</span><strong>{metric.metric_name}：{metric.metric_value.toLocaleString()}</strong></div>)}{metrics.length === 0 && <p>还没有运营指标快照。</p>}</div></div>;
}

function recordToInput(record: FeedbackRecord): FeedbackInput { return { platform: record.platform, sourceType: record.source_type, externalId: record.external_id ?? "", contentId: record.content_id ?? "", authorAlias: record.author_alias ?? "", summary: record.summary, sentiment: record.sentiment, needTag: record.need_tag, priority: record.priority, status: record.status, assigneeEmail: record.assignee_email ?? "", nextAction: record.next_action ?? "", occurredAt: record.occurred_at } }
function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function humanChanges(value: string) { try { const parsed = JSON.parse(value) as Record<string, unknown>; return Object.keys(parsed).join("、") || "已记录"; } catch { return "已记录"; } }
function downloadBlob(content: string, filename: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }

function parseCsv(text: string): string[][] { const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false; for (let i = 0; i < text.length; i += 1) { const char = text[i]; if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i += 1; } else if (char === '"') quoted = !quoted; else if (char === "," && !quoted) { row.push(cell); cell = ""; } else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[i + 1] === "\n") i += 1; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += char; } if (cell || row.length) { row.push(cell); rows.push(row); } if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, ""); return rows; }
function mapCsvRow(headers: string[], row: string[]): FeedbackInput { const map = Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""])); return { platform: map["平台"], sourceType: map["来源类型"], externalId: map["平台记录编号"], contentId: map["内容编号"], authorAlias: map["用户代号"], summary: map["匿名摘要"], sentiment: map["情绪"], needTag: map["需求标签"], priority: map["优先级"], status: map["状态"], assigneeEmail: map["负责人"], nextAction: map["下一步"], occurredAt: map["发生时间"] }; }
