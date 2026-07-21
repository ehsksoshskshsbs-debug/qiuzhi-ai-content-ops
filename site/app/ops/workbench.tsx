"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  memberRoles,
  needTags,
  platforms,
  priorities,
  sentiments,
  sourceTypes,
  statuses,
  type FeedbackInput,
  type MemberRole,
} from "../../lib/ops-domain";

type FeedbackRecord = {
  id: string;
  trace_code: string;
  platform: string;
  source_type: string;
  external_id: string | null;
  content_id: string | null;
  author_alias: string | null;
  source_text: string | null;
  summary: string;
  sentiment: string;
  need_tag: string;
  priority: string;
  status: string;
  assignee_email: string | null;
  next_action: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
  version: number;
  ai_summary: string | null;
  ai_sentiment: string | null;
  ai_need_tag: string | null;
  ai_priority: string | null;
  ai_reason: string | null;
  ai_confidence: number | null;
  ai_review_status: string | null;
  ai_model: string | null;
  ai_classified_at: string | null;
  ai_reviewed_at: string | null;
  ai_reviewed_by: string | null;
};

type FeedbackEvent = { id: string; actor_email: string; action: string; changes_json: string; created_at: string };
type FeedbackDetail = { record: FeedbackRecord; events: FeedbackEvent[] };
type Connection = { platform: string; status: string; account_label: string | null; last_synced_at: string | null };
type Metric = { id: string; platform: string; content_id: string; metric_date: string; metric_name: string; metric_value: number };
type TeamMember = { email: string; display_name: string | null; role: MemberRole; status: string; created_at: string; updated_at: string };
type Stats = { total?: number; this_week?: number; open_count?: number; urgent_count?: number; avg_resolution_hours?: number | null };
type Tab = "反馈台账" | "运营数据" | "团队";

const emptyForm: FeedbackInput = {
  platform: "B站",
  sourceType: "评论",
  sourceText: "",
  summary: "",
  sentiment: "中性",
  needTag: "教程需求",
  priority: "P2",
  status: "待处理",
  occurredAt: new Date().toISOString().slice(0, 16),
};

export default function OpsWorkbench({
  currentUser,
  role,
  signOutPath,
}: {
  currentUser: string;
  role: MemberRole;
  signOutPath: string;
}) {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filters, setFilters] = useState({ search: "", platform: "", sourceType: "", priority: "", status: "" });
  const [selected, setSelected] = useState<FeedbackDetail | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("反馈台账");
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const writable = role !== "只读";

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
    const [connectionResponse, metricResponse, teamResponse] = await Promise.all([
      fetch("/api/ops/connections", { cache: "no-store" }),
      fetch("/api/ops/metrics", { cache: "no-store" }),
      fetch("/api/ops/team", { cache: "no-store" }),
    ]);
    if (connectionResponse.ok) setConnections((await connectionResponse.json()).connections);
    if (metricResponse.ok) setMetrics((await metricResponse.json()).metrics);
    if (teamResponse.ok) setMembers((await teamResponse.json()).members);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecords(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadSecondary(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSecondary]);

  async function createRecord(input: FeedbackInput) {
    setBusy(true);
    try {
      const response = await fetch("/api/ops/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "新增失败");
      setShowCreate(false);
      setSelected(data);
      setNotice(`已创建 ${data.record.trace_code}`);
      await loadRecords();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "新增失败");
    } finally {
      setBusy(false);
    }
  }

  async function openRecord(record: FeedbackRecord) {
    const response = await fetch(`/api/ops/feedback/${record.id}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setSelected(data);
    else setNotice(data.error || "读取详情失败");
  }

  async function updateRecord(input: FeedbackInput) {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ops/feedback/${selected.record.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, version: selected.record.version }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "更新失败");
      setSelected(data);
      setNotice("记录和变更历史已更新");
      await loadRecords();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "更新失败");
    } finally {
      setBusy(false);
    }
  }

  async function classifyRecord() {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ops/feedback/${selected.record.id}/classify`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI 分析失败");
      setSelected(data);
      setNotice("AI 建议已生成，请人工核对四项结果");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI 分析失败");
    } finally {
      setBusy(false);
    }
  }

  async function reviewClassification(input: { summary: string; sentiment: string; needTag: string; priority: string }) {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ops/feedback/${selected.record.id}/classification-review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI 建议确认失败");
      setSelected(data);
      setNotice("人工确认已保存，正式字段和审计记录已更新");
      await loadRecords();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI 建议确认失败");
    } finally {
      setBusy(false);
    }
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
      const response = await fetch("/api/ops/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: mapped }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "导入失败");
      setNotice(`导入完成：新增 ${data.inserted}，重复 ${data.duplicates}，失败 ${data.errors.length}`);
      await loadRecords();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导入失败");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const header = "平台,来源类型,平台记录编号,内容编号,用户代号,匿名反馈内容,确认摘要,情绪,需求标签,优先级,状态,负责人,下一步,发生时间\r\n";
    const sample = "B站,评论,,BV示例,用户-001,请先脱敏后再填写反馈内容,,中性,教程需求,P2,待处理,,补充FAQ,2026-07-21T10:00:00+08:00";
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
        <nav className="ops-tabs" aria-label="工作区导航">
          {(["反馈台账", "运营数据", "团队"] as Tab[]).map((tab) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </nav>
        <div className="ops-user"><span>{currentUser} · {role}</span><a href={signOutPath}>退出</a></div>
      </header>

      <section className="ops-hero compact">
        <div><span className="ops-badge">QZ OPS / TEAM LEDGER</span><h1>每条反馈，<br />都有下一步。</h1><p>团队共享云端台账；AI 只给摘要、分类和优先级建议，最终由成员确认。</p></div>
        {activeTab === "反馈台账" && <div className="ops-hero-actions">
          <button className="ops-button primary" disabled={!writable} onClick={() => setShowCreate(true)}>＋ 新增记录</button>
          <label className={`ops-button file-button ${!writable ? "disabled" : ""}`}>导入 CSV<input disabled={!writable} type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && void importCsv(event.target.files[0])} /></label>
          <a className="ops-button" href={`/api/ops/export?${query}`}>导出 CSV</a>
          <button className="ops-text-button" onClick={downloadTemplate}>下载模板</button>
        </div>}
      </section>

      {!writable && <div className="ops-permission-note">当前为只读角色：可以查看、筛选和导出，但不能修改团队数据。</div>}
      {notice && <div className="ops-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="关闭提示">×</button></div>}

      {activeTab === "反馈台账" && <>
        <section className="ops-stats" aria-label="反馈统计">
          <Stat label="本周新增" value={stats.this_week ?? 0} note="近 7 天" />
          <Stat label="待推进" value={stats.open_count ?? 0} note="含等待外部" />
          <Stat label="P0 / P1" value={stats.urgent_count ?? 0} note="未解决高优先级" accent />
          <Stat label="平均处理" value={stats.avg_resolution_hours == null ? "—" : `${Math.round(stats.avg_resolution_hours)}h`} note={`共 ${stats.total ?? 0} 条`} />
        </section>

        <section className="ops-workspace-grid">
          <div className="ops-list-pane">
            <div className="ops-panel-head"><div><span>01 / FEEDBACK</span><h2>反馈台账</h2></div><button className="ops-text-button" onClick={() => void loadRecords()}>刷新</button></div>
            <div className="ops-filters">
              <input placeholder="搜索编号、内容或摘要" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
              <Filter value={filters.platform} options={platforms} label="全部平台" onChange={(platform) => setFilters({ ...filters, platform })} />
              <Filter value={filters.sourceType} options={sourceTypes} label="全部类型" onChange={(sourceType) => setFilters({ ...filters, sourceType })} />
              <Filter value={filters.priority} options={priorities} label="全部优先级" onChange={(priority) => setFilters({ ...filters, priority })} />
              <Filter value={filters.status} options={statuses} label="全部状态" onChange={(status) => setFilters({ ...filters, status })} />
            </div>
            <div className="feedback-list" role="list">
              {records.map((record) => <button
                key={record.id}
                className={selected?.record.id === record.id ? "selected" : ""}
                onClick={() => void openRecord(record)}
              >
                <span className={`priority priority-${record.priority.toLowerCase()}`}>{record.priority}</span>
                <span className="feedback-list-main"><strong>{record.summary}</strong><small>{record.trace_code} · {record.platform} · {record.source_type}</small></span>
                <span className="feedback-list-meta"><strong>{record.status}</strong><small>{record.assignee_email || "待指派"}</small></span>
              </button>)}
              {!loading && records.length === 0 && <div className="ops-empty"><strong>当前筛选下没有记录</strong><span>可以新增一条，或导入已经脱敏的 CSV。</span></div>}
              {loading && <div className="ops-empty">正在读取云端台账…</div>}
            </div>
          </div>

          <aside className={`ops-detail-pane ${selected ? "has-detail" : ""}`}>
            {selected ? <FeedbackEditor
              key={`${selected.record.id}-${selected.record.version}`}
              inline
              writable={writable}
              title={selected.record.trace_code}
              initial={recordToInput(selected.record)}
              record={selected.record}
              events={selected.events}
              busy={busy}
              onCancel={() => setSelected(null)}
              onSave={updateRecord}
              onClassify={classifyRecord}
              onReviewClassification={reviewClassification}
            /> : <div className="detail-placeholder"><span>DETAIL / AI REVIEW</span><strong>选择一条反馈</strong><p>在这里查看匿名内容、AI 建议、负责人、下一步和完整时间线。</p></div>}
          </aside>
        </section>
      </>}

      {activeTab === "运营数据" && <section className="ops-two-column ops-tab-section">
        <MetricPanel writable={writable} metrics={metrics} onSaved={async (message) => { setNotice(message); await loadSecondary(); }} />
        <div className="ops-panel"><div className="ops-panel-head"><div><span>CONNECTIONS</span><h2>平台连接</h2></div></div><div className="connection-list">{connections.map((connection) => <article key={connection.platform}><div><strong>{connection.platform}</strong><small>{connection.last_synced_at ? `上次同步 ${formatDate(connection.last_synced_at)}` : "尚未获取任何平台数据"}</small></div><span>{connection.status}</span>{role === "管理员" ? <button onClick={() => void requestSync(connection.platform)}>检查授权</button> : <small>仅管理员可检查</small>}</article>)}</div><p className="ops-safety-note">只有取得官方开发者权限和账号授权后才会拉取数据。当前按钮不会抓取、发布或回复任何内容。</p></div>
      </section>}

      {activeTab === "团队" && <TeamPanel
        currentUser={currentUser}
        role={role}
        members={members}
        onChanged={async (message) => { setNotice(message); await loadSecondary(); }}
      />}

      <footer className="ops-footer"><span>QZ OPS · 云端可追踪记录</span><p>真实运营数据不进入公开作品集 · 默认匿名化 · 不自动对外写入</p></footer>

      {showCreate && <FeedbackEditor title="新增反馈记录" initial={emptyForm} writable={writable} busy={busy} onCancel={() => setShowCreate(false)} onSave={createRecord} />}
    </main>
  );
}

function Stat({ label, value, note, accent = false }: { label: string; value: string | number; note: string; accent?: boolean }) {
  return <article className={accent ? "accent" : ""}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Filter({ value, options, label, onChange }: { value: string; options: readonly string[]; label: string; onChange: (value: string) => void }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}><option value="">{label}</option>{options.map((option) => <option key={option}>{option}</option>)}</select>;
}

function FeedbackEditor({
  title,
  initial,
  record,
  events,
  busy,
  writable,
  inline = false,
  onCancel,
  onSave,
  onClassify,
  onReviewClassification,
}: {
  title: string;
  initial: FeedbackInput;
  record?: FeedbackRecord;
  events?: FeedbackEvent[];
  busy: boolean;
  writable: boolean;
  inline?: boolean;
  onCancel: () => void;
  onSave: (input: FeedbackInput) => Promise<void>;
  onClassify?: () => Promise<void>;
  onReviewClassification?: (input: { summary: string; sentiment: string; needTag: string; priority: string }) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [reviewSummary, setReviewSummary] = useState(record?.ai_summary ?? "");
  const [reviewSentiment, setReviewSentiment] = useState(record?.ai_sentiment ?? "");
  const [reviewNeedTag, setReviewNeedTag] = useState(record?.ai_need_tag ?? "");
  const [reviewPriority, setReviewPriority] = useState(record?.ai_priority ?? "");
  const set = (key: keyof FeedbackInput, value: string) => setForm({ ...form, [key]: value });
  const awaitingReview = record?.ai_review_status === "待审核";
  const lowConfidence = (record?.ai_confidence ?? 1) < 0.65;
  const editor = <section className={inline ? "ops-detail-editor" : "ops-modal"} role="dialog" aria-modal={inline ? undefined : true} aria-label={title}>
    <header><div><span>TRACEABLE RECORD</span><h2>{title}</h2>{record && <small>版本 {record.version} · 更新于 {formatDate(record.updated_at)}</small>}</div><button onClick={onCancel} aria-label={inline ? "收起详情" : "关闭"}>{inline ? "收起" : "×"}</button></header>
    <form onSubmit={(event) => { event.preventDefault(); void onSave(form); }}>
      <fieldset disabled={!writable || busy}>
        <div className="form-grid">
          <Field label="平台"><Filter value={form.platform ?? ""} options={platforms} label="选择平台" onChange={(value) => set("platform", value)} /></Field>
          <Field label="来源类型"><Filter value={form.sourceType ?? ""} options={sourceTypes} label="选择类型" onChange={(value) => set("sourceType", value)} /></Field>
          <Field label="平台记录编号"><input value={form.externalId ?? ""} onChange={(event) => set("externalId", event.target.value)} /></Field>
          <Field label="内容编号"><input value={form.contentId ?? ""} onChange={(event) => set("contentId", event.target.value)} /></Field>
          <Field label="用户代号"><input value={form.authorAlias ?? ""} onChange={(event) => set("authorAlias", event.target.value)} placeholder="请使用匿名代号" /></Field>
          <Field label="发生时间"><input type="datetime-local" value={(form.occurredAt ?? "").slice(0, 16)} onChange={(event) => set("occurredAt", event.target.value)} /></Field>
          <Field label="情绪"><Filter value={form.sentiment ?? ""} options={sentiments} label="选择情绪" onChange={(value) => set("sentiment", value)} /></Field>
          <Field label="需求标签"><Filter value={form.needTag ?? ""} options={needTags} label="选择标签" onChange={(value) => set("needTag", value)} /></Field>
          <Field label="优先级"><Filter value={form.priority ?? ""} options={priorities} label="选择优先级" onChange={(value) => set("priority", value)} /></Field>
          <Field label="状态"><Filter value={form.status ?? ""} options={statuses} label="选择状态" onChange={(value) => set("status", value)} /></Field>
          <Field label="负责人邮箱"><input type="email" value={form.assigneeEmail ?? ""} onChange={(event) => set("assigneeEmail", event.target.value)} /></Field>
          <Field label="下一步"><input value={form.nextAction ?? ""} onChange={(event) => set("nextAction", event.target.value)} /></Field>
          <Field label="匿名反馈内容" wide><textarea required rows={5} value={form.sourceText ?? ""} onChange={(event) => set("sourceText", event.target.value)} placeholder="录入前请先去除手机号、微信号、邮箱和客户信息。" /></Field>
          <Field label="确认摘要" wide><textarea rows={3} value={form.summary ?? ""} onChange={(event) => set("summary", event.target.value)} placeholder="可留空；AI 分析后再确认。" /></Field>
        </div>
        {writable && <div className="modal-actions"><button className="ops-button primary" disabled={busy}>{busy ? "保存中…" : "保存并留痕"}</button></div>}
      </fieldset>
    </form>
    {record && <section className="ai-review-card">
      <div className="ai-review-head"><div><span>AI ASSISTED / HUMAN APPROVED</span><h3>AI 整理建议</h3></div>{writable && <button type="button" className="ops-button" disabled={busy} onClick={() => void onClassify?.()}>{busy ? "处理中…" : record.ai_classified_at ? "重新生成" : "获取 AI 建议"}</button>}</div>
      <p className="ai-privacy-note">只发送服务端再次脱敏后的反馈内容。AI 结果不会自动覆盖正式字段。</p>
      {record.ai_review_status && <span className={`ai-status ${awaitingReview ? "pending" : ""}`}>{record.ai_review_status}</span>}
      {record.ai_reason && <div className="ai-reason"><strong>判断理由</strong><p>{record.ai_reason}</p><small>置信度 {Math.round((record.ai_confidence ?? 0) * 100)}% · {record.ai_model}</small></div>}
      {awaitingReview && <div className="ai-review-form">
        <Field label="确认后的摘要" wide><textarea rows={3} value={reviewSummary} onChange={(event) => setReviewSummary(event.target.value)} /></Field>
        <Field label="确认后的情绪"><Filter value={reviewSentiment} options={sentiments} label="选择情绪" onChange={setReviewSentiment} /></Field>
        <Field label="确认后的需求标签"><Filter value={reviewNeedTag} options={needTags} label="选择标签" onChange={setReviewNeedTag} /></Field>
        <Field label="确认后的优先级"><Filter value={reviewPriority} options={priorities} label="选择优先级" onChange={setReviewPriority} /></Field>
        {(reviewPriority === "P0" || lowConfidence) && <p className="ai-warning">{reviewPriority === "P0" ? "P0 属于立即处理级别，请再次核对。" : "置信度较低，建议重点人工核对。"}</p>}
        {writable && <button type="button" className="ops-button primary" disabled={busy || !reviewSummary || !reviewSentiment || !reviewNeedTag || !reviewPriority} onClick={() => void onReviewClassification?.({ summary: reviewSummary, sentiment: reviewSentiment, needTag: reviewNeedTag, priority: reviewPriority })}>人工确认并保存</button>}
      </div>}
    </section>}
    {events && <div className="event-list"><h3>处理时间线</h3>{events.map((event) => <article key={event.id}><span>{formatDate(event.created_at)}</span><strong>{event.action}</strong><small>{event.actor_email}</small><code>{humanChanges(event.changes_json)}</code></article>)}</div>}
  </section>;
  return inline ? editor : <div className="ops-modal-backdrop" role="presentation">{editor}</div>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "field-wide" : ""}><span>{label}</span>{children}</label>;
}

function MetricPanel({ metrics, writable, onSaved }: { metrics: Metric[]; writable: boolean; onSaved: (message: string) => Promise<void> }) {
  const [form, setForm] = useState({ platform: "B站", contentId: "", metricDate: new Date().toISOString().slice(0, 10), metricName: "播放量", metricValue: "" });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/ops/metrics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, metricValue: Number(form.metricValue) }) });
    const data = await response.json();
    await onSaved(response.ok ? "运营指标已保存" : data.error || "指标保存失败");
  }
  return <div className="ops-panel"><div className="ops-panel-head"><div><span>METRICS</span><h2>运营数据</h2></div></div>{writable && <form className="metric-form" onSubmit={submit}><Filter value={form.platform} options={platforms} label="平台" onChange={(platform) => setForm({ ...form, platform })} /><input required placeholder="内容编号" value={form.contentId} onChange={(event) => setForm({ ...form, contentId: event.target.value })} /><input type="date" required value={form.metricDate} onChange={(event) => setForm({ ...form, metricDate: event.target.value })} /><input required placeholder="指标名，例如播放量" value={form.metricName} onChange={(event) => setForm({ ...form, metricName: event.target.value })} /><input type="number" step="any" required placeholder="数值" value={form.metricValue} onChange={(event) => setForm({ ...form, metricValue: event.target.value })} /><button className="ops-button primary">保存快照</button></form>}<div className="metric-list">{metrics.slice(0, 20).map((metric) => <div key={metric.id}><span>{metric.metric_date} · {metric.platform} · {metric.content_id}</span><strong>{metric.metric_name}：{metric.metric_value.toLocaleString()}</strong></div>)}{metrics.length === 0 && <p>还没有运营指标快照。</p>}</div></div>;
}

function TeamPanel({ currentUser, role, members, onChanged }: { currentUser: string; role: MemberRole; members: TeamMember[]; onChanged: (message: string) => Promise<void> }) {
  const [form, setForm] = useState({ email: "", displayName: "", role: "成员" });
  const admin = role === "管理员";
  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/ops/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    if (response.ok) setForm({ email: "", displayName: "", role: "成员" });
    await onChanged(response.ok ? "团队成员已保存" : data.error || "成员保存失败");
  }
  async function updateMember(email: string, patch: { role?: string; status?: string }) {
    const response = await fetch("/api/ops/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, ...patch }) });
    const data = await response.json();
    await onChanged(response.ok ? "成员权限已更新" : data.error || "成员更新失败");
  }
  return <section className="ops-panel ops-tab-section team-panel"><div className="ops-panel-head"><div><span>TEAM / ACCESS</span><h2>团队成员</h2></div><small>当前：{currentUser} · {role}</small></div>{admin && <form className="team-form" onSubmit={addMember}><input type="email" required placeholder="成员邮箱" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><input placeholder="显示名称（可选）" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /><Filter value={form.role} options={memberRoles} label="成员角色" onChange={(nextRole) => setForm({ ...form, role: nextRole })} /><button className="ops-button primary">添加或重新启用</button></form>}<div className="team-list">{members.map((member) => <article key={member.email}><div><strong>{member.display_name || member.email}</strong><small>{member.display_name ? member.email : `加入于 ${formatDate(member.created_at)}`}</small></div><span className={`member-status ${member.status === "启用" ? "active" : ""}`}>{member.status}</span>{admin ? <><Filter value={member.role} options={memberRoles} label="角色" onChange={(nextRole) => void updateMember(member.email, { role: nextRole })} /><button className="ops-text-button" onClick={() => void updateMember(member.email, { status: member.status === "启用" ? "停用" : "启用" })}>{member.status === "启用" ? "停用" : "启用"}</button></> : <strong>{member.role}</strong>}</article>)}</div></section>;
}

function recordToInput(record: FeedbackRecord): FeedbackInput {
  return {
    platform: record.platform,
    sourceType: record.source_type,
    externalId: record.external_id ?? "",
    contentId: record.content_id ?? "",
    authorAlias: record.author_alias ?? "",
    sourceText: record.source_text ?? record.summary,
    summary: record.summary,
    sentiment: record.sentiment,
    needTag: record.need_tag,
    priority: record.priority,
    status: record.status,
    assigneeEmail: record.assignee_email ?? "",
    nextAction: record.next_action ?? "",
    occurredAt: record.occurred_at,
    version: record.version,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function humanChanges(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.keys(parsed).join("、") || "已记录";
  } catch {
    return "已记录";
  }
}

function downloadBlob(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index += 1; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  return rows;
}

function mapCsvRow(headers: string[], row: string[]): FeedbackInput {
  const map = Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""]));
  const sourceText = map["匿名反馈内容"] || map["匿名摘要"];
  return {
    platform: map["平台"],
    sourceType: map["来源类型"],
    externalId: map["平台记录编号"],
    contentId: map["内容编号"],
    authorAlias: map["用户代号"],
    sourceText,
    summary: map["确认摘要"] || map["匿名摘要"] || sourceText,
    sentiment: map["情绪"],
    needTag: map["需求标签"],
    priority: map["优先级"],
    status: map["状态"],
    assigneeEmail: map["负责人"],
    nextAction: map["下一步"],
    occurredAt: map["发生时间"],
  };
}
