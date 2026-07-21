"use client";

import { useMemo, useState } from "react";
import { videoCategories, videos, viewingRoutes, type VideoDifficulty } from "../data/videos";

const navItems = [
  ["账号洞察", "#insight"],
  ["视频速览", "#videos"],
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [difficulty, setDifficulty] = useState<"全部" | VideoDifficulty>("全部");
  const [route, setRoute] = useState("全部视频");

  const routeBvids = useMemo(() => {
    const selected = viewingRoutes.find((item) => item.name === route);
    return selected ? new Set(selected.bvids) : null;
  }, [route]);

  const filteredVideos = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return videos.filter((video) => {
      const matchesQuery = !normalized || `${video.title}${video.takeaway}${video.audience}`.toLowerCase().includes(normalized);
      const matchesCategory = category === "全部" || video.category === category;
      const matchesDifficulty = difficulty === "全部" || video.difficulty === difficulty;
      const matchesRoute = !routeBvids || routeBvids.has(video.bvid);
      return matchesQuery && matchesCategory && matchesDifficulty && matchesRoute;
    });
  }, [category, difficulty, query, routeBvids]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="回到顶部">
          <span className="brand-mark">QZ</span>
          <span>CONTENT OPS <small>求职作品集 · 非官方</small></span>
        </a>
        <nav aria-label="主要导航">
          {navItems.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        </nav>
      </header>

      <section className="hero section" id="top">
        <div className="hero-copy">
          <span className="eyebrow">AI CREATOR OPERATIONS · 2026</span>
          <h1>让内容运营<br />从“发出去”到<br /><em>留得下证据。</em></h1>
          <p className="hero-lead">从账号定位、内容表达和 30 条代表视频出发，快速看懂秋芝2046如何帮助 AI 小白真正把工具用起来。</p>
          <div className="hero-actions">
            <a className="button primary" href="#videos">先看视频地图 <span>↘</span></a>
            <a className="button secondary" href="#insight">查看账号洞察</a>
          </div>
          <div className="hero-stats" aria-label="项目概览">
            <div><strong>30</strong><span>代表视频</span></div>
            <div><strong>5</strong><span>内容平台</span></div>
          </div>
        </div>
        <div className="hero-board" aria-label="内容运营闭环">
          <div className="board-head"><span>QZ-OPS / WORKFLOW</span><span className="live-dot">PUBLIC</span></div>
          <div className="workflow-stack">
            {["公开研究", "选题判断", "五端生产", "节点执行", "反馈留痕", "下一轮实验"].map((item, index) => (
              <div className="workflow-row" key={item}>
                <span className="workflow-num">0{index + 1}</span>
                <strong>{item}</strong>
                <span>{index === 5 ? "↗" : "↓"}</span>
              </div>
            ))}
          </div>
          <div className="board-note"><span>原则</span><p>事实、推断、模拟数据分别标记；所有对外内容保留人工确认。</p></div>
        </div>
      </section>

      <div className="truth-strip">
        <span>公开事实附查询日期</span><span>模拟后台数据持续标记</span><span>不代表秋芝2046官方</span><span>不自动发布或私信</span>
      </div>

      <section className="section insight" id="insight">
        <div className="section-kicker">01 / ACCOUNT INSIGHT</div>
        <div className="section-heading split-heading">
          <h2>先理解她为什么<br />能让小白学会 AI</h2>
          <div className="source-note"><strong>公开研究基线</strong><p>B站公开签名“让更多人用好AI”；公开查询显示粉丝量超过 100 万。</p><a href="https://space.bilibili.com/385670211" target="_blank" rel="noreferrer">查看 B站空间 ↗</a><small>查询日期：2026-07-21</small></div>
        </div>
        <div className="dna-grid">
          <article><span>01</span><h3>从零开始</h3><p>主动解释安装门槛和专业概念，让第一次接触工具的人也能跟上。</p></article>
          <article><span>02</span><h3>真正干活</h3><p>不是罗列功能，而是用真实任务展示工具怎样完成一件事。</p></article>
          <article><span>03</span><h3>值得收藏</h3><p>完整步骤、文档、提示词与避坑清单，共同构成长期内容价值。</p></article>
        </div>
      </section>

      <section className="section video-section" id="videos">
        <div className="section-kicker">02 / VIDEO ATLAS</div>
        <div className="section-heading split-heading">
          <h2>30 条视频，快速看懂<br />秋芝2046的内容体系</h2>
          <p>原视频都跳转 B站。分类、难度与核心收获是本作品集的内容分析，不代表官方标签。</p>
        </div>

        <div className="route-grid" aria-label="推荐观看路线">
          <button className={route === "全部视频" ? "route-card active" : "route-card"} onClick={() => setRoute("全部视频")}>
            <span>00</span><strong>全部视频</strong><small>浏览 6 个内容分类</small>
          </button>
          {viewingRoutes.map((item, index) => (
            <button className={route === item.name ? "route-card active" : "route-card"} key={item.name} onClick={() => setRoute(item.name)}>
              <span>0{index + 1}</span><strong>{item.name}</strong><small>{item.description}</small>
            </button>
          ))}
        </div>

        <div className="video-toolbar">
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜标题、适合人群或核心收获" aria-label="搜索视频" /></label>
          <div className="select-wrap"><label htmlFor="category">分类</label><select id="category" value={category} onChange={(event) => setCategory(event.target.value)}>{videoCategories.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="select-wrap"><label htmlFor="difficulty">难度</label><select id="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as "全部" | VideoDifficulty)}><option>全部</option><option>入门</option><option>进阶</option></select></div>
          <div className="result-count"><strong>{filteredVideos.length}</strong><span>条结果</span></div>
        </div>

        <div className="video-grid">
          {filteredVideos.map((video, index) => (
            <article className="video-card" key={video.bvid}>
              <div className="video-card-top"><span className="video-index">{String(index + 1).padStart(2, "0")}</span><span className="duration">{video.duration}</span></div>
              <div className="video-tags"><span>{video.category}</span><span>{video.difficulty}</span></div>
              <h3>{video.title}</h3>
              <p>{video.takeaway}</p>
              <div className="video-audience">适合：{video.audience}</div>
              <footer><time>{video.date}</time><a href={`https://www.bilibili.com/video/${video.bvid}`} target="_blank" rel="noreferrer" aria-label={`在B站观看：${video.title}`}>B站观看 ↗</a></footer>
            </article>
          ))}
        </div>
        {filteredVideos.length === 0 && <div className="empty-state"><strong>没有匹配的视频</strong><span>试试清空搜索词或切换分类。</span></div>}
      </section>

      <section className="section boundary">
        <div><span className="section-kicker">03 / TRUST BOUNDARY</span><h2>快速了解，<br />也要分清事实与分析。</h2></div>
        <ul>
          <li><strong>不冒充</strong><span>本项目不代表秋芝2046官方或真实团队。</span></li>
          <li><strong>不编造</strong><span>公开事实附来源；模拟数据始终显示模拟标记。</span></li>
          <li><strong>不越权</strong><span>本页面只整理公开内容，不代表账号本人发布或回复。</span></li>
          <li><strong>不泄露</strong><span>评论与私信先匿名化，公司与客户信息不进入案例。</span></li>
        </ul>
      </section>

      <footer className="footer">
        <div><span className="brand-mark">QZ</span><strong>让每条内容都能被追溯。</strong></div>
        <p>秋芝2046账号洞察与代表视频速览 · 2026<br />公开视频资料查询日期：2026-07-21</p>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
