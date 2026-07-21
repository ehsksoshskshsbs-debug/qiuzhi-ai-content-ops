"use client";

import { useMemo, useState } from "react";
import { videoCategories, videos, viewingRoutes, type VideoDifficulty } from "../data/videos";

const navItems = [
  ["账号洞察", "#insight"],
  ["视频速览", "#videos"],
  ["Agent", "#agent"],
  ["知识库", "#knowledge"],
  ["模拟案例", "#case"],
  ["运营看板", "#dashboard"],
].concat([["云端台账", "/ops"]]);

const capabilities = [
  ["01", "分析选题", "用六维评分判断是否值得做，并把风险和待核验项先暴露出来。"],
  ["02", "多平台内容包", "围绕同一事实底座，分别生成 B站、抖音、视频号、小红书与公众号版本。"],
  ["03", "发布排期", "把预热、首发、二次分发、评论维护和复盘绑定到同一内容编号。"],
  ["04", "用户反馈", "匿名化评论与私信，完成去重、情绪、标签和优先级判断。"],
  ["05", "运营复盘", "分开事实、假设与建议，让下一轮优化变成可验证实验。"],
  ["06", "节点检查", "识别活动、社群与招聘传播中的遗漏、临期和依赖风险。"],
];

const knowledgeItems = [
  ["账号画像", "定位、受众、内容 DNA、表达规则与证据分级"],
  ["五平台打法", "每个平台的目标、结构、必备交付和发布检查"],
  ["内容生产 SOP", "趋势、评分、核验、制作、排期、反馈与复盘"],
  ["反馈运营", "匿名化、标签、P0—P3 优先级与后续动作"],
  ["活动节点", "Brief、素材、审核、执行、收尾与招聘传播检查"],
];

const platformOutputs: Record<string, { format: string; headline: string; detail: string }> = {
  B站: { format: "8—12 分钟完整教程", headline: "每天记3行，让桌面Agent 5分钟整理一周工作", detail: "结果预览 → 三行模板 → Agent 指令 → 事实核对 → 隐私避坑" },
  抖音: { format: "60 秒结果演示", headline: "别让 AI 直接编周报，它没有事实", detail: "三秒痛点 → 五天记录 → 草稿成型 → 待补充标记" },
  视频号: { format: "职场场景短视频", headline: "周报难写，真正缺的是一周的事实", detail: "困扰 → 极简记录 → AI 整理 → 人工核对 → 转发同事" },
  小红书: { format: "八页步骤卡片", headline: "周五不再憋周报｜每天只记3行", detail: "结果、适合谁、准备、三步流程、避坑与总结清单" },
  公众号: { format: "深度教程", headline: "别让 AI 替你编周报", detail: "原理、文件夹搭建、完整指令、FAQ、隐私边界与下周计划" },
};

const prompt = "Use $qiuzhi-content-ops to 分析选题：给AI小白做一期‘用桌面Agent整理会议资料’的教程。先输出选题评分卡，不要直接写发布稿；把需要核验的产品能力单独列出。";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState("B站");
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

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

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
          <p className="hero-lead">为秋芝2046内容运营岗位设计：一个可调用的 Agent、一套知识库、一个完整模拟案例，以及快速看懂 30 条代表视频的分类入口。</p>
          <div className="hero-actions">
            <a className="button primary" href="#videos">先看视频地图 <span>↘</span></a>
            <a className="button secondary" href="#agent">查看 Agent 能力</a>
          </div>
          <div className="hero-stats" aria-label="项目概览">
            <div><strong>30</strong><span>代表视频</span></div>
            <div><strong>5</strong><span>内容平台</span></div>
            <div><strong>6</strong><span>Agent 能力</span></div>
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

      <section className="section agent-section" id="agent">
        <div className="section-kicker light">03 / CODEX AGENT</div>
        <div className="section-heading split-heading light-heading">
          <h2>不是一条万能提示词，<br />而是一套运营判断。</h2>
          <p>Agent 按任务读取对应知识，不一次塞入全部资料；每次交付都附依据、待确认项和发布前检查。</p>
        </div>
        <div className="capability-grid">
          {capabilities.map(([num, title, text]) => <article key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
        <div className="prompt-panel">
          <div><span className="prompt-label">现场演示指令</span><code>{prompt}</code></div>
          <button onClick={copyPrompt} aria-label="复制现场演示指令">{copied ? "已复制 ✓" : "复制指令"}</button>
        </div>
      </section>

      <section className="section knowledge" id="knowledge">
        <div className="section-kicker">04 / KNOWLEDGE BASE</div>
        <div className="knowledge-layout">
          <div className="knowledge-intro"><h2>让运营方法<br />可以被复用</h2><p>Agent 负责执行，知识库负责判断标准。详细资料按需读取，避免输出只靠临场发挥。</p><span>5 MODULES / 4 LEDGERS</span></div>
          <div className="knowledge-list">
            {knowledgeItems.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div><strong>↗</strong></article>)}
          </div>
        </div>
      </section>

      <section className="section case-section" id="case">
        <div className="section-kicker">05 / CASE STUDY · MOCK</div>
        <div className="case-hero">
          <div><span className="mock-badge">模拟案例</span><h2>每天记 3 行，让桌面 Agent<br />5 分钟生成日报和周报</h2><p>不是让 AI 监控电脑，也不是替用户编成绩。先留下事实，再让 Agent 整理，人负责核对。</p></div>
          <div className="score-ring"><strong>27</strong><span>/ 30</span><small>建议进入制作</small></div>
        </div>
        <div className="score-grid">
          {[['用户痛点','5'],['结果价值','5'],['账号匹配','5'],['演示可行','5'],['差异化','4'],['时效风险','3']].map(([name, score]) => <div key={name}><span>{name}</span><strong>{score}</strong></div>)}
        </div>
        <div className="platform-demo">
          <div className="platform-tabs" role="tablist" aria-label="平台内容示例">
            {Object.keys(platformOutputs).map((item) => <button key={item} className={platform === item ? "active" : ""} onClick={() => setPlatform(item)} aria-pressed={platform === item}>{item}</button>)}
          </div>
          <div className="platform-output">
            <span>{platformOutputs[platform].format}</span><h3>{platformOutputs[platform].headline}</h3><p>{platformOutputs[platform].detail}</p><div className="output-rule"><strong>统一底线</strong> 只使用记录中的事实；缺失信息标为【待补充】。</div>
          </div>
        </div>
      </section>

      <section className="section dashboard" id="dashboard">
        <div className="section-kicker">06 / OPERATIONS DASHBOARD · MOCK</div>
        <div className="section-heading split-heading"><h2>发布之后，<br />反馈要能回到下一题</h2><p>以下全部为作品集模拟数据，用于展示如何从指标和用户声音形成下一轮动作。</p></div>
        <div className="metric-grid">
          <article><span>模拟播放</span><strong>18.6万</strong><small>7 日观察窗</small></article>
          <article><span>模拟收藏</span><strong>17,420</strong><small>模板价值信号</small></article>
          <article><span>模拟评论</span><strong>1,268</strong><small>10 条样本已分类</small></article>
          <article className="accent-metric"><span>高意向反馈</span><strong>286</strong><small>进入 FAQ / 选题库</small></article>
        </div>
        <div className="dashboard-grid">
          <div className="feedback-panel">
            <div className="panel-title"><h3>反馈优先级</h3><span>模拟样本</span></div>
            {[['P0 隐私与事实风险',12],['P1 高频阻塞',38],['P2 建议与资料',72],['P3 留档',24]].map(([label, value]) => <div className="bar-row" key={label}><span>{label}</span><div><i style={{width: `${value}%`}} /></div><strong>{value}</strong></div>)}
            <p>最高优先动作：在视频、简介和置顶评论同时增加公司信息与客户隐私提醒。</p>
          </div>
          <div className="calendar-panel">
            <div className="panel-title"><h3>七日发布节点</h3><span>QZ-WEEKLY-01</span></div>
            {[['D-2','小红书','痛点投票','完成'],['D0','B站','长视频首发','待审'],['D+1','抖音 / 视频号','60秒结果版','排期'],['D+2','小红书','八页步骤卡','排期'],['D+7','内部','运营复盘','未开始']].map(([day, channel, task, status]) => <div className="calendar-row" key={`${day}-${channel}`}><strong>{day}</strong><span>{channel}<small>{task}</small></span><em>{status}</em></div>)}
          </div>
        </div>
      </section>

      <section className="section boundary">
        <div><span className="section-kicker">07 / TRUST BOUNDARY</span><h2>能提效，<br />也要知道哪里该停。</h2></div>
        <ul>
          <li><strong>不冒充</strong><span>本项目不代表秋芝2046官方或真实团队。</span></li>
          <li><strong>不编造</strong><span>公开事实附来源；模拟数据始终显示模拟标记。</span></li>
          <li><strong>不越权</strong><span>Agent 不自动发布、回复、点赞或发送私信。</span></li>
          <li><strong>不泄露</strong><span>评论与私信先匿名化，公司与客户信息不进入案例。</span></li>
        </ul>
      </section>

      <footer className="footer">
        <div><span className="brand-mark">QZ</span><strong>让每条内容都能被追溯。</strong></div>
        <p>秋芝 AI 内容运营 Agent · 求职作品集 · 2026<br />公开视频资料查询日期：2026-07-21</p>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
