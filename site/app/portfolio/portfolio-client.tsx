"use client";

import { useState } from "react";
import Link from "next/link";
import data from "../../data/portfolio.json";

const platformNames = ["B站", "小红书", "抖音", "视频号", "公众号"] as const;
type PlatformName = (typeof platformNames)[number];

export default function PortfolioClient() {
  const [platform, setPlatform] = useState<PlatformName>("B站");

  return (
    <main className="portfolio-page" id="top">
      <header className="portfolio-nav">
        <a className="portfolio-brand" href="#top"><span>QZ</span><strong>CONTENT OPS CASE</strong></a>
        <nav aria-label="作品集导航">
          <a href="#topics">选题</a><a href="#sample">样稿</a><a href="#calendar">排期</a><a href="#feedback">反馈</a><a href="#review">复盘</a>
        </nav>
      </header>

      <section className="portfolio-hero">
        <div className="portfolio-hero-copy">
          <span className="portfolio-eyebrow">RECRUITING PORTFOLIO · {data.meta.queryDate}</span>
          <h1>一套能落到<br /><em>发布与复盘</em>的<br />内容运营案例</h1>
          <p>{data.summary.background}</p>
          <div className="portfolio-actions">
            <a className="portfolio-button primary" href="/qiuzhi-ai-content-ops-portfolio.pdf" download>下载 PDF 作品集</a>
            <Link className="portfolio-button" href="/">查看公开研究页</Link>
          </div>
        </div>
        <aside className="portfolio-brief" aria-label="项目摘要">
          <span>3 MINUTE BRIEF</span>
          <dl>
            <div><dt>项目</dt><dd>{data.meta.projectName}</dd></div>
            <div><dt>角色</dt><dd>{data.summary.role}</dd></div>
            <div><dt>结果</dt><dd>{data.summary.result}</dd></div>
            <div><dt>编号</dt><dd><code>{data.meta.contentId}</code></dd></div>
          </dl>
          <p>{data.meta.disclaimer}</p>
        </aside>
      </section>

      <div className="portfolio-strip" aria-label="交付成果">
        {data.summary.deliverables.map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}
      </div>

      <section className="portfolio-section" id="account">
        <SectionHead number="01" label="ACCOUNT OBSERVATION" title="账号观察：先看懂受众，再决定做什么" description={data.account.analysisBasis} />
        <div className="account-grid">
          <article className="audience-card"><span>核心受众</span><h3>{data.account.audience}</h3><small>内容分析 · 非官方画像</small></article>
          <div className="fact-card"><span>公开事实</span><ul>{data.account.publicFacts.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
        <div className="trait-grid">
          {data.account.contentTraits.map((item, index) => <article key={item.title}><b>0{index + 1}</b><h3>{item.title}</h3><p>{item.detail}</p></article>)}
        </div>
        <div className="opportunity-list">
          <strong>三个内容机会点</strong>
          {data.account.opportunities.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.detail}</p></article>)}
        </div>
      </section>

      <section className="portfolio-section yellow-section" id="topics">
        <SectionHead number="02" label="TOPIC PIPELINE" title="三个马上能制作的选题" description="按用户痛点、结果价值、账号匹配、演示可行、差异化与风险六维判断；23分以上进入制作池。" />
        <div className="topic-list">
          {data.topics.map((topic) => <article className={topic.id === "A" ? "topic-card selected" : "topic-card"} key={topic.id}>
            <div className="topic-score"><span>{topic.id}</span><strong>{topic.score}</strong><small>/ 30</small></div>
            <div><div className="topic-status">{topic.status}</div><h3>{topic.title}</h3><p><b>用户：</b>{topic.audience}</p><p><b>痛点：</b>{topic.pain}</p><p><b>结果：</b>{topic.promise}</p><details><summary>查看演示、风险与选择理由</summary><p><b>演示：</b>{topic.demo}</p><p><b>风险：</b>{topic.risk}</p><p><b>判断：</b>{topic.reason}</p></details></div>
          </article>)}
        </div>
      </section>

      <section className="portfolio-section" id="sample">
        <SectionHead number="03" label="FULL CONTENT SAMPLE" title="同一个事实底座，做成五种平台内容" description={`主案例：${data.topics[0].title}。以下均为待制作样稿，不代表已发布。`} />
        <div className="platform-tabs" role="tablist" aria-label="平台内容切换">
          {platformNames.map((name) => <button key={name} role="tab" aria-selected={platform === name} className={platform === name ? "active" : ""} onClick={() => setPlatform(name)}>{name}</button>)}
        </div>
        <div className="platform-content">
          {platform === "B站" && <Bilibili />}
          {platform === "小红书" && <Xiaohongshu />}
          {platform === "抖音" && <ShortVideo title={data.douyin.title} beats={data.douyin.beats} />}
          {platform === "视频号" && <WeChatChannels />}
          {platform === "公众号" && <WeChatArticle />}
        </div>
      </section>

      <section className="portfolio-section dark-section" id="calendar">
        <SectionHead number="04" label="7-DAY RELEASE PLAN" title="七天传播排期：每个节点都有依赖和风险" description={`统一内容编号 ${data.meta.contentId}，状态均为模拟计划，不是实际发布记录。`} />
        <div className="timeline">
          {data.calendar.map((item) => <article key={`${item.day}-${item.platform}`}>
            <div className="timeline-day">{item.day}</div>
            <div className="timeline-main"><span>{item.phase} · {item.platform}</span><h3>{item.deliverable}</h3><p>依赖：{item.dependency}</p></div>
            <div className="timeline-meta"><span>{item.owner}</span><strong>{item.status}</strong><small>{item.risk}</small></div>
          </article>)}
        </div>
      </section>

      <section className="portfolio-section" id="feedback">
        <SectionHead number="05" label="MOCK FEEDBACK LEDGER" title="14条模拟反馈：去重、分级，再决定下一步" description="所有文本均为匿名模拟样本，只展示方法。AI 可给分类建议，但必须由人工确认后保存；P0/P1 优先。" />
        <div className="feedback-summary"><span><strong>14</strong>原始记录</span><span><strong>9</strong>去重需求组</span><span><strong>1</strong>P0 安全问题</span><span><strong>100%</strong>模拟标记</span></div>
        <div className="feedback-table-wrap">
          <table className="feedback-table"><thead><tr><th>记录 / 去重组</th><th>平台与匿名反馈</th><th>标签</th><th>优先级</th><th>回复</th><th>下一步动作</th></tr></thead><tbody>
            {data.feedback.map((item) => <tr key={item.id}><td data-label="记录 / 去重组"><strong>{item.id}</strong><small>{item.group} · {item.duplicates}条同类</small></td><td data-label="平台与反馈"><span>{item.platform} · {item.sentiment}</span><p>{item.text}</p></td><td data-label="需求标签">{item.tag}</td><td data-label="优先级"><b className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</b></td><td data-label="是否回复">{item.replyNeeded}<small>{item.status}</small></td><td data-label="下一步动作">{item.nextAction}</td></tr>)}
          </tbody></table>
        </div>
      </section>

      <section className="portfolio-section mint-section" id="review">
        <SectionHead number="06" label="REVIEW BEFORE RESULTS" title="不编造成绩：发布前先写清怎么判断有效" description={data.review.goal} />
        <div className="metric-cards">
          {data.review.metrics.map((metric) => <article key={metric.name}><span>{metric.name}</span><p><b>观察：</b>{metric.watch}</p><p><b>有效：</b>{metric.success}</p><p><b>异常：</b>{metric.warning}</p></article>)}
        </div>
        <div className="decision-grid">
          <article><span>KEEP / 保留</span><ul>{data.review.keep.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><span>STOP / 停止</span><ul>{data.review.stop.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><span>TRY / 尝试</span><ul>{data.review.try.map((item) => <li key={item}>{item}</li>)}</ul></article>
        </div>
        <article className="experiment"><span>SINGLE-VARIABLE EXPERIMENT</span><h3>{data.review.experiment.a} <i>VS</i> {data.review.experiment.b}</h3><p>只改变：{data.review.experiment.variable}　·　主指标：{data.review.experiment.primary}　·　护栏：{data.review.experiment.guardrail}</p><strong>{data.review.experiment.decision}</strong></article>
      </section>

      <section className="portfolio-section sources-section">
        <SectionHead number="07" label="SOURCES & BOUNDARIES" title="来源可查，判断可追，边界写在前面" description="动态数字、产品界面与平台规则均需在正式录制和发布前再次核验。" />
        <div className="source-list">{data.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><strong>{source.label} ↗</strong><span>{source.note}</span></a>)}</div>
        <div className="boundary-note"><strong>不会做的事</strong><p>不冒充官方合作，不把模拟数据写成真实结果，不自动发布、评论、点赞或私信，不处理未经授权的公司或用户信息。</p></div>
      </section>

      <footer className="portfolio-footer"><div><span>QZ</span><strong>让内容从选题走到证据。</strong></div><p>{data.meta.disclaimer}</p><a href="#top">回到顶部 ↑</a></footer>
    </main>
  );
}

function SectionHead({ number, label, title, description }: { number: string; label: string; title: string; description: string }) {
  return <div className="portfolio-section-head"><span>{number} / {label}</span><div><h2>{title}</h2><p>{description}</p></div></div>;
}

function Bilibili() {
  return <div className="content-grid">
    <div><span className="content-label">标题与封面</span><ol className="title-options">{data.bilibili.titles.map((title) => <li key={title}>{title}</li>)}</ol><div className="cover-copy"><span>COVER</span><strong>{data.bilibili.cover}</strong></div></div>
    <div><span className="content-label">视频结构</span><ol className="chapter-list">{data.bilibili.structure.map((item) => <li key={item}>{item}</li>)}</ol></div>
    <details className="long-draft" open><summary>展开完整 10 分钟口播稿</summary>{data.bilibili.voiceover.map((part) => <article key={part.time}><div><strong>{part.time}</strong><span>{part.cue}</span></div><p>{part.script}</p></article>)}</details>
    <details className="long-draft"><summary>查看演示指令与置顶评论</summary><div className="prompt-box">{data.bilibili.prompt}</div><p><b>置顶评论：</b>{data.bilibili.pinnedComment}</p></details>
  </div>;
}

function Xiaohongshu() {
  return <div><div className="content-intro"><span>标题</span><h3>{data.xiaohongshu.title}</h3></div><div className="redbook-grid">{data.xiaohongshu.pages.map((page) => <article key={page.page}><span>0{page.page}</span><h3>{page.headline}</h3><p>{page.copy}</p></article>)}</div><details className="long-draft"><summary>展开配套正文</summary><p className="preline">{data.xiaohongshu.caption}</p></details></div>;
}

function ShortVideo({ title, beats }: { title: string; beats: Array<{ time: string; visual: string; script: string }> }) {
  return <div><div className="content-intro"><span>60秒脚本</span><h3>{title}</h3></div><div className="beat-list">{beats.map((beat) => <article key={beat.time}><strong>{beat.time}</strong><span>{beat.visual}</span><p>{beat.script}</p></article>)}</div></div>;
}

function WeChatChannels() {
  return <div className="content-grid"><div className="content-intro"><span>60秒口播</span><h3>{data.wechatChannels.title}</h3><p>{data.wechatChannels.script}</p></div><div className="share-box"><strong>转发场景设计</strong><p>{data.wechatChannels.shareDesign}</p></div></div>;
}

function WeChatArticle() {
  return <div><div className="content-intro"><span>标题与摘要</span><h3>{data.wechatArticle.title}</h3><p>{data.wechatArticle.abstract}</p></div><div className="article-outline">{data.wechatArticle.outline.map((section) => <article key={section.section}><h3>{section.section}</h3><ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul></article>)}</div></div>;
}
