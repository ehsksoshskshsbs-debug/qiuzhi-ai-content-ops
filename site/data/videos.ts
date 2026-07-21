export type VideoCategory =
  | "AI入门"
  | "Agent"
  | "AI编程"
  | "办公效率"
  | "内容创作"
  | "行业观察";

export type VideoDifficulty = "入门" | "进阶";

export type VideoItem = {
  bvid: string;
  title: string;
  date: string;
  duration: string;
  category: VideoCategory;
  difficulty: VideoDifficulty;
  audience: string;
  takeaway: string;
};

export const videos: VideoItem[] = [
  { bvid: "BV1CC41137su", title: "我花2万块测试100多个AI工具，真正好用的只有这些！", date: "2024-04-20", duration: "5:53", category: "AI入门", difficulty: "入门", audience: "不知道先用什么工具的人", takeaway: "用真实需求筛掉工具噪音" },
  { bvid: "BV1ib421E7Sy", title: "我用了3年的AI提示词万能公式，5分钟解决70%提示词问题~", date: "2024-07-05", duration: "5:14", category: "AI入门", difficulty: "入门", audience: "刚开始写提示词的人", takeaway: "掌握一套可复用的提示词结构" },
  { bvid: "BV1HS421R7oL", title: "如何给大模型喂数据？让AI更懂你～【小白科普】", date: "2024-07-15", duration: "7:02", category: "AI入门", difficulty: "入门", audience: "分不清长文本、RAG与微调的人", takeaway: "理解给模型补充知识的三种路径" },
  { bvid: "BV1Mr4MewEY5", title: "Huggingface小白AI入门，你必须了解的免费开源模型大超市", date: "2024-10-02", duration: "5:49", category: "AI入门", difficulty: "入门", audience: "想认识开源模型的人", takeaway: "建立开源模型与社区的基础概念" },
  { bvid: "BV1EnZNB4E4V", title: "教父母学会用豆包，建议转发给全家人～", date: "2026-02-16", duration: "7:45", category: "AI入门", difficulty: "入门", audience: "想帮家人跨过AI门槛的人", takeaway: "用生活任务完成家庭AI启蒙" },

  { bvid: "BV17fX5Y5Ecv", title: "【万字揭秘】2025年最大风口：Agent 智能体到底是什么？", date: "2025-03-18", duration: "32:28", category: "Agent", difficulty: "入门", audience: "第一次系统了解Agent的人", takeaway: "从原理、实测到部署建立全景认识" },
  { bvid: "BV1KSKwzJEEV", title: "从0开始“做”一个Agent！【n8n草履虫教程】", date: "2025-06-20", duration: "33:41", category: "Agent", difficulty: "入门", audience: "想亲手搭第一个Agent的人", takeaway: "用n8n搭建新闻与日程工作流" },
  { bvid: "BV1Rz4iz1Exz", title: "Agent Infra到底是什么？【AI基建】", date: "2025-10-15", duration: "23:03", category: "Agent", difficulty: "进阶", audience: "想理解Agent产业结构的人", takeaway: "用基础设施框架重新理解Agent" },
  { bvid: "BV1G3FNznEiS", title: "手把手彻底学会 Agent Skills！【小白教程】", date: "2026-02-02", duration: "19:19", category: "Agent", difficulty: "入门", audience: "想制作专属Skill的人", takeaway: "理解Skill原理并完成一次创建" },
  { bvid: "BV1mYPSzmEkV", title: "爆肝10亿token，我给OpenClaw做了个龙虾管家！【一键安装龙虾】", date: "2026-03-10", duration: "17:44", category: "Agent", difficulty: "进阶", audience: "关注Agent产品化与Vibe Coding的人", takeaway: "看一次从需求取舍到产品落地的实践" },
  { bvid: "BV1j9MP6wEV9", title: "从零开始，学会让桌面Agent帮你干活！【小白教程】", date: "2026-07-05", duration: "13:13", category: "Agent", difficulty: "入门", audience: "想把Agent用于桌面任务的人", takeaway: "跑通八个可感知的桌面任务" },
  { bvid: "BV1mhKv68EPQ", title: "豆包真能干活了！【豆包Agent入门教程】", date: "2026-07-19", duration: "8:11", category: "Agent", difficulty: "入门", audience: "偏好国产工具的小白", takeaway: "快速认识豆包Agent的入门用法" },

  { bvid: "BV1e3t4etExj", title: "手摸手的AI编程cursor实战【小白教程】", date: "2024-09-17", duration: "8:14", category: "AI编程", difficulty: "入门", audience: "零代码基础但想动手的人", takeaway: "完成一次Cursor实战" },
  { bvid: "BV1rRCVYREFm", title: "【AI编程神器Cursor】不止写代码，5种玩法让你全面提效，小白宝藏！", date: "2024-12-23", duration: "6:23", category: "AI编程", difficulty: "入门", audience: "想扩展Cursor用法的人", takeaway: "把AI编程工具用于写作、数据和工作流" },
  { bvid: "BV1YpRsYiENZ", title: "5分钟理解编程，并开发你第一个AI应用！【小白入门】", date: "2025-03-09", duration: "8:38", category: "AI编程", difficulty: "入门", audience: "第一次开发AI应用的人", takeaway: "用一个小应用理解编程过程" },
  { bvid: "BV18PXCYyEbt", title: "用AI做一切网页！AI编程太爽了～【小白教程】", date: "2025-03-22", duration: "12:08", category: "AI编程", difficulty: "入门", audience: "想把想法快速做成页面的人", takeaway: "把网页当成快速可视化工具" },
  { bvid: "BV1ZqmmBJEmP", title: "轻松学会！高手都在用的AI编程大法！", date: "2025-12-12", duration: "7:21", category: "AI编程", difficulty: "进阶", audience: "想从Vibe Coding继续进阶的人", takeaway: "理解Spec Coding的工作方式" },
  { bvid: "BV1zqeMzfEiQ", title: "用神器Claude Code！打造贴身AI秘书团【小白教程】", date: "2025-08-20", duration: "20:58", category: "AI编程", difficulty: "进阶", audience: "想用代码Agent处理生活任务的人", takeaway: "把Claude Code组织成个人秘书工作流" },
  { bvid: "BV1NvRyBzEhq", title: "全网最全！60分钟全面掌握Claude Code～【附完整文档】", date: "2026-05-05", duration: "56:09", category: "AI编程", difficulty: "进阶", audience: "需要系统学习Claude Code的人", takeaway: "从安装到高级用法完整走通" },
  { bvid: "BV1Nd596vEyU", title: "全网最全！40分钟全面掌握Codex～【附完整文档】", date: "2026-05-16", duration: "40:51", category: "AI编程", difficulty: "进阶", audience: "想系统掌握Codex的人", takeaway: "用十个实战场景建立完整能力" },

  { bvid: "BV1HatvzxELB", title: "1天节省3小时，用AI给“信息降噪”！", date: "2025-08-07", duration: "7:23", category: "办公效率", difficulty: "入门", audience: "每天被信息流淹没的人", takeaway: "用AI建立信息筛选与摘要流程" },
  { bvid: "BV1oTPvefEHQ", title: "手机用DeepSeekR1的6大绝佳秘籍【建议收藏】", date: "2025-02-25", duration: "5:57", category: "办公效率", difficulty: "入门", audience: "需要移动办公的人", takeaway: "在手机上处理文件、PPT和会议纪要" },
  { bvid: "BV1vzw5e8EgF", title: "我摊牌了，我的文案都是拿AI这样写的...【NotebookLM完整攻略】", date: "2025-01-16", duration: "9:10", category: "办公效率", difficulty: "入门", audience: "需要读资料与写内容的人", takeaway: "把资料转成播客、简报与FAQ" },
  { bvid: "BV1MXoNBrEdm", title: "用AI的方式，重新打开飞书！【建议收藏】", date: "2026-04-20", duration: "17:35", category: "办公效率", difficulty: "进阶", audience: "需要团队协作和办公Agent的人", takeaway: "观察Agent如何进入协作平台" },

  { bvid: "BV1HN1yY7EKD", title: "AI视频技巧集合！一口气全了解【小白速成】", date: "2024-10-07", duration: "6:36", category: "内容创作", difficulty: "入门", audience: "刚接触AI视频的人", takeaway: "快速建立AI视频工具与技巧地图" },
  { bvid: "BV1CHaGzBEMc", title: "掌管P图的神！Nano Banana究极玩法全公开！建议收藏～", date: "2025-08-31", duration: "8:17", category: "内容创作", difficulty: "入门", audience: "需要AI修图和创意玩法的人", takeaway: "用案例理解图像编辑能力" },
  { bvid: "BV16cx4zoErH", title: "太真了！现在的AI视频已经卷成这样了？！", date: "2025-10-04", duration: "12:10", category: "内容创作", difficulty: "入门", audience: "想了解AI视频现状的人", takeaway: "一次看懂当时主流AI视频工具" },
  { bvid: "BV1MiZvBZENQ", title: "人人免费出大片！豆包Seedance 2.0实测对比+解析！", date: "2026-02-19", duration: "10:18", category: "内容创作", difficulty: "入门", audience: "想做AI视频的小白", takeaway: "通过实测对比理解视频模型表现" },
  { bvid: "BV1chRLBSEY1", title: "GPT image 2 实用玩法合集分享～【秋芝的AI开箱】", date: "2026-05-02", duration: "12:56", category: "内容创作", difficulty: "入门", audience: "想把生图用于实际任务的人", takeaway: "用玩法合集快速判断工具价值" },

  { bvid: "BV1gKiEBZEHq", title: "中国AI产业冰山图！全面盘点～【万字解析】", date: "2026-01-11", duration: "47:19", category: "行业观察", difficulty: "进阶", audience: "需要产业全景框架的人", takeaway: "从水面与水下理解中国AI产业" },
];

export const viewingRoutes = [
  { name: "第一次认识秋芝", description: "从方法、概念到完整工具教程", bvids: ["BV1ib421E7Sy", "BV1HS421R7oL", "BV17fX5Y5Ecv", "BV18PXCYyEbt", "BV1Nd596vEyU"] },
  { name: "想学 Agent", description: "概念 → 搭建 → Skill → 桌面实战", bvids: ["BV17fX5Y5Ecv", "BV1KSKwzJEEV", "BV1G3FNznEiS", "BV1j9MP6wEV9", "BV1mhKv68EPQ"] },
  { name: "提升办公效率", description: "信息、资料、协作与桌面工作流", bvids: ["BV1HatvzxELB", "BV1vzw5e8EgF", "BV1MXoNBrEdm", "BV1zqeMzfEiQ", "BV1Nd596vEyU"] },
];

export const videoCategories: Array<"全部" | VideoCategory> = ["全部", "AI入门", "Agent", "AI编程", "办公效率", "内容创作", "行业观察"];

