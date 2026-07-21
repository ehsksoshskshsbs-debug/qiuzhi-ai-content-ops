from __future__ import annotations

import json
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "site" / "data" / "portfolio.json"
OUTPUT_PATH = ROOT / "output" / "pdf" / "qiuzhi-ai-content-ops-portfolio.pdf"
PUBLIC_PATH = ROOT / "site" / "public" / "qiuzhi-ai-content-ops-portfolio.pdf"

INK = colors.HexColor("#171715")
PAPER = colors.HexColor("#F4F1E9")
CARD = colors.HexColor("#FFFDF7")
YELLOW = colors.HexColor("#FFD739")
MINT = colors.HexColor("#DCEBE3")
MUTED = colors.HexColor("#66635D")
LINE = colors.HexColor("#C8C3B7")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("CN", r"C:\Windows\Fonts\msyh.ttc"))
    pdfmetrics.registerFont(TTFont("CN-Bold", r"C:\Windows\Fonts\msyhbd.ttc"))


def styles() -> dict[str, ParagraphStyle]:
    return {
        "eyebrow": ParagraphStyle("eyebrow", fontName="CN-Bold", fontSize=7.5, leading=10, textColor=MUTED, spaceAfter=5),
        "title": ParagraphStyle("title", fontName="CN-Bold", fontSize=28, leading=32, textColor=INK, spaceAfter=10),
        "cover_title": ParagraphStyle("cover_title", fontName="CN-Bold", fontSize=38, leading=44, textColor=INK, spaceAfter=15),
        "h2": ParagraphStyle("h2", fontName="CN-Bold", fontSize=19, leading=24, textColor=INK, spaceAfter=8),
        "h3": ParagraphStyle("h3", fontName="CN-Bold", fontSize=11, leading=15, textColor=INK, spaceAfter=4),
        "body": ParagraphStyle("body", fontName="CN", fontSize=8.2, leading=13.2, textColor=INK),
        "small": ParagraphStyle("small", fontName="CN", fontSize=6.8, leading=10.2, textColor=MUTED),
        "tiny": ParagraphStyle("tiny", fontName="CN", fontSize=5.8, leading=8.2, textColor=INK),
        "white": ParagraphStyle("white", fontName="CN", fontSize=7.5, leading=11.5, textColor=colors.white),
        "white_h": ParagraphStyle("white_h", fontName="CN-Bold", fontSize=18, leading=23, textColor=colors.white),
        "center": ParagraphStyle("center", fontName="CN-Bold", fontSize=10, leading=14, alignment=TA_CENTER),
        "quote": ParagraphStyle("quote", fontName="CN", fontSize=8.2, leading=13.2, leftIndent=8, borderColor=YELLOW, borderWidth=3, borderPadding=7),
    }


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(str(text)).replace("\n", "<br/>"), style)


def rich(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def section_label(number: str, english: str, title: str, st: dict[str, ParagraphStyle]):
    return [p(f"{number} / {english}", st["eyebrow"]), p(title, st["h2"]), Spacer(1, 4 * mm)]


def bullet_list(items: list[str], st: dict[str, ParagraphStyle], style_name: str = "body"):
    return [rich(f"• {escape(item)}", st[style_name]) for item in items]


def card(content, background=CARD, padding=8):
    table = Table([[content]], colWidths=[None])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.8, INK),
        ("LEFTPADDING", (0, 0), (-1, -1), padding),
        ("RIGHTPADDING", (0, 0), (-1, -1), padding),
        ("TOPPADDING", (0, 0), (-1, -1), padding),
        ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
    ]))
    return table


class PortfolioDoc(BaseDocTemplate):
    def __init__(self, filename: str, **kwargs):
        super().__init__(filename, **kwargs)
        frame = Frame(17 * mm, 15 * mm, A4[0] - 34 * mm, A4[1] - 30 * mm, id="main", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates(PageTemplate(id="page", frames=[frame], onPage=self.draw_page))

    def draw_page(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.setStrokeColor(INK)
        canvas.setLineWidth(0.7)
        canvas.line(17 * mm, 11 * mm, A4[0] - 17 * mm, 11 * mm)
        canvas.setFont("CN-Bold", 6.5)
        canvas.setFillColor(INK)
        canvas.drawString(17 * mm, 7 * mm, "AI CONTENT OPERATIONS · PERSONAL PORTFOLIO")
        canvas.drawRightString(A4[0] - 17 * mm, 7 * mm, f"{doc.page:02d} / 07")
        canvas.restoreState()


def build_pdf() -> None:
    register_fonts()
    st = styles()
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_PATH.parent.mkdir(parents=True, exist_ok=True)

    story = []

    # 1 — Cover and three-minute brief
    story += [Spacer(1, 15 * mm), p("RECRUITING PORTFOLIO · 2026", st["eyebrow"]), rich("一套能落到发布与复盘的<br/>AI 内容运营案例", st["cover_title"])]
    story.append(card([
        p(data["meta"]["subtitle"], st["h3"]),
        Spacer(1, 2 * mm),
        p(data["summary"]["background"], st["body"]),
        Spacer(1, 3 * mm),
        rich(f"<b>内容编号：</b>{escape(data['meta']['contentId'])}", st["body"]),
    ], YELLOW, 12))
    story += [Spacer(1, 10 * mm), p("3 MINUTE BRIEF", st["eyebrow"])]
    brief = [
        [p("我的角色", st["h3"]), p(data["summary"]["role"], st["body"])],
        [p("完整交付", st["h3"]), p(data["summary"]["result"], st["body"])],
        [p("招聘方先看", st["h3"]), p("选题是否能拍、五端是否真改编、反馈是否可追踪、复盘是否先写判断标准。", st["body"])],
    ]
    table = Table(brief, colWidths=[35 * mm, 132 * mm])
    table.setStyle(TableStyle([("BOX", (0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("BACKGROUND",(0,0),(0,-1),CARD),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),9)]))
    story.append(table)
    story += [Spacer(1, 8 * mm), card(p(data["meta"]["disclaimer"], st["small"]), MINT, 10), PageBreak()]

    # 2 — Account and topics
    story += section_label("01", "ACCOUNT & TOPICS", "账号观察与三个可制作选题", st)
    account_left = [p("核心受众", st["eyebrow"]), p(data["account"]["audience"], st["h3"]), Spacer(1, 3*mm), p("内容分析 · 非官方画像", st["small"])]
    account_right = [p("公开事实快照", st["eyebrow"])] + bullet_list(data["account"]["publicFacts"], st, "small")
    acc = Table([[account_left, account_right]], colWidths=[78 * mm, 89 * mm])
    acc.setStyle(TableStyle([("BACKGROUND",(0,0),(0,0),YELLOW),("BACKGROUND",(1,0),(1,0),CARD),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.8,INK),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10)]))
    story += [acc, Spacer(1, 6 * mm)]
    topic_rows = [[p("分数", st["eyebrow"]), p("选题与判断", st["eyebrow"]), p("风险边界", st["eyebrow"])]]
    for topic in data["topics"]:
        topic_rows.append([
            p(f"{topic['score']} / 30", st["h3"]),
            [p(f"{topic['id']} · {topic['title']}", st["h3"]), p(topic["reason"], st["small"])],
            p(topic["risk"], st["small"]),
        ])
    topics = Table(topic_rows, colWidths=[25 * mm, 82 * mm, 60 * mm], repeatRows=1)
    topics.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),INK),("TEXTCOLOR",(0,0),(-1,0),colors.white),("BACKGROUND",(0,1),(-1,1),YELLOW),("BACKGROUND",(0,2),(-1,-1),CARD),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)]))
    story += [topics, Spacer(1, 6 * mm), card(p(data["account"]["analysisBasis"], st["small"]), MINT, 8), PageBreak()]

    # 3 — Bilibili full sample
    story += section_label("02", "BILIBILI SAMPLE", "B站：标题、结构、完整口播逻辑", st)
    title_cells = [[p(f"0{i+1}", st["eyebrow"]), p(title, st["body"])] for i, title in enumerate(data["bilibili"]["titles"])]
    title_table = Table(title_cells, colWidths=[13 * mm, 154 * mm])
    title_table.setStyle(TableStyle([("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("BACKGROUND",(0,0),(0,-1),YELLOW),("BACKGROUND",(1,0),(1,-1),CARD),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    story += [title_table, Spacer(1, 5*mm), card(p(f"封面：{data['bilibili']['cover']}", st["center"]), YELLOW, 8), Spacer(1, 5*mm)]
    chapter_paras = [p(item, st["tiny"]) for item in data["bilibili"]["structure"]]
    chapter_table = Table([[chapter_paras[:4], chapter_paras[4:]]], colWidths=[83.5 * mm, 83.5 * mm])
    chapter_table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),CARD),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    story += [chapter_table, Spacer(1, 5*mm), p("完整口播节选（网页含10个时间段全文）", st["eyebrow"])]
    chosen = [data["bilibili"]["voiceover"][0], data["bilibili"]["voiceover"][1], data["bilibili"]["voiceover"][6], data["bilibili"]["voiceover"][8]]
    voice_rows = []
    for part in chosen:
        voice_rows.append([[p(part["time"], st["h3"]), p(part["cue"], st["small"])], p(part["script"], st["small"])])
    voice = Table(voice_rows, colWidths=[34 * mm, 133 * mm])
    voice.setStyle(TableStyle([("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("BACKGROUND",(0,0),(0,-1),YELLOW),("BACKGROUND",(1,0),(1,-1),CARD),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    story += [voice, Spacer(1, 5*mm), card([p("演示指令核心", st["eyebrow"]), p(data["bilibili"]["prompt"], st["small"])], MINT, 8), PageBreak()]

    # 4 — Platform adaptation
    story += section_label("03", "MULTI-PLATFORM", "小红书、抖音、视频号与公众号改编", st)
    story += [p("小红书 8 页卡片", st["h3"])]
    cards = []
    for index in range(0, 8, 4):
        row = []
        for item in data["xiaohongshu"]["pages"][index:index+4]:
            row.append([p(f"0{item['page']}", st["eyebrow"]), p(item["headline"], st["h3"]), p(item["copy"], st["tiny"])])
        cards.append(row)
    xhs = Table(cards, colWidths=[41.75 * mm] * 4)
    xhs.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),CARD),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    story += [xhs, Spacer(1, 5*mm)]
    dy = data["douyin"]["beats"]
    dy_text = [p(f"{b['time']}｜{b['script']}", st["tiny"]) for b in dy]
    channel_text = [p(data["wechatChannels"]["script"], st["small"]), Spacer(1, 2*mm), p(data["wechatChannels"]["shareDesign"], st["tiny"])]
    shorts = Table([[[p("抖音｜60秒强结果版", st["h3"])] + dy_text, [p("视频号｜60秒熟人转发版", st["h3"])] + channel_text]], colWidths=[83.5 * mm, 83.5 * mm])
    shorts.setStyle(TableStyle([("BACKGROUND",(0,0),(0,0),YELLOW),("BACKGROUND",(1,0),(1,0),MINT),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.8,INK),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)]))
    story += [shorts, Spacer(1, 5*mm), p("公众号｜文章提纲", st["h3"])]
    outline_cells = []
    for sec in data["wechatArticle"]["outline"]:
        outline_cells.append([p(sec["section"], st["h3"]), p("；".join(sec["points"]), st["tiny"])])
    outline = Table(outline_cells, colWidths=[58 * mm, 109 * mm])
    outline.setStyle(TableStyle([("BACKGROUND",(0,0),(0,-1),CARD),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    story += [outline, PageBreak()]

    # 5 — Calendar
    story += section_label("04", "7-DAY RELEASE PLAN", "从预热、首发到评论维护和复盘", st)
    cal_rows = [[p("节点", st["eyebrow"]), p("平台 / 交付物", st["eyebrow"]), p("依赖", st["eyebrow"]), p("状态 / 风险", st["eyebrow"])]]
    for item in data["calendar"]:
        cal_rows.append([
            [p(item["day"], st["h3"]), p(item["phase"], st["tiny"])],
            [p(item["platform"], st["h3"]), p(item["deliverable"], st["small"])],
            p(item["dependency"], st["small"]),
            [p(item["status"], st["tiny"]), p(item["risk"], st["tiny"])],
        ])
    cal = Table(cal_rows, colWidths=[25 * mm, 66 * mm, 40 * mm, 36 * mm], repeatRows=1)
    cal.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),INK),("TEXTCOLOR",(0,0),(-1,0),colors.white),("BACKGROUND",(0,1),(0,-1),YELLOW),("BACKGROUND",(1,1),(-1,-1),CARD),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    story += [cal, Spacer(1, 6 * mm), card(p("统一内容编号贯穿全部节点；状态均为模拟计划。任何正式发布前，需重新核验产品界面、平台规则、素材授权与隐私边界。", st["small"]), MINT, 9), PageBreak()]

    # 6 — Feedback
    story += section_label("05", "MOCK FEEDBACK LEDGER", "14条模拟反馈：去重、分级、留下一步", st)
    summary = Table([[p("14\n原始记录", st["center"]), p("9\n去重需求组", st["center"]), p("1\nP0安全问题", st["center"]), p("100%\n模拟标记", st["center"])]], colWidths=[41.75 * mm] * 4)
    summary.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),YELLOW),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.8,INK),("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)]))
    story += [summary, Spacer(1, 4*mm)]
    fb_rows = [[p("ID / 组", st["eyebrow"]), p("平台与反馈", st["eyebrow"]), p("标签 / 级别 / 回复", st["eyebrow"]), p("下一步动作", st["eyebrow"])]]
    for item in data["feedback"]:
        fb_rows.append([
            p(f"{item['id']}\n{item['group']} · {item['duplicates']}条", st["tiny"]),
            [p(f"{item['platform']} · {item['sentiment']}", st["tiny"]), p(item["text"], st["small"])],
            p(f"{item['tag']}\n{item['priority']} · 回复{item['replyNeeded']}", st["tiny"]),
            p(item["nextAction"], st["tiny"]),
        ])
    fb = Table(fb_rows, colWidths=[25 * mm, 62 * mm, 34 * mm, 46 * mm], repeatRows=1)
    fb.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),INK),("TEXTCOLOR",(0,0),(-1,0),colors.white),("BACKGROUND",(0,1),(-1,-1),CARD),("BACKGROUND",(0,8),(-1,8),colors.HexColor("#FFE0DA")),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.35,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    story += [fb, PageBreak()]

    # 7 — Review and sources
    story += section_label("06", "REVIEW BEFORE RESULTS", "先定义有效，再看发布结果", st)
    story += [card(p(data["review"]["goal"], st["body"]), YELLOW, 9), Spacer(1, 5*mm)]
    metric_rows = []
    for metric in data["review"]["metrics"]:
        metric_rows.append([
            p(metric["name"], st["h3"]),
            rich(
                f"观察：{escape(metric['watch'])}<br/>有效：{escape(metric['success'])}<br/>异常：{escape(metric['warning'])}",
                st["tiny"],
            ),
        ])
    metric_table = Table(metric_rows, colWidths=[32 * mm, 135 * mm])
    metric_table.setStyle(TableStyle([("BACKGROUND",(0,0),(0,-1),MINT),("BACKGROUND",(1,0),(1,-1),CARD),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    story += [metric_table, Spacer(1, 5*mm)]
    decisions = []
    for label, key in [("KEEP / 保留","keep"),("STOP / 停止","stop"),("TRY / 尝试","try")]:
        decisions.append([p(label, st["h3"])] + bullet_list(data["review"][key], st, "tiny"))
    dec = Table([decisions], colWidths=[55.67 * mm] * 3)
    dec.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),CARD),("BOX",(0,0),(-1,-1),.8,INK),("INNERGRID",(0,0),(-1,-1),.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    story += [dec, Spacer(1, 5*mm)]
    exp = data["review"]["experiment"]
    story.append(card([p("单变量实验", st["eyebrow"]), p(f"{exp['a']}  VS  {exp['b']}", st["h2"]), p(f"主指标：{exp['primary']}　护栏：{exp['guardrail']}。{exp['decision']}", st["small"])], YELLOW, 9))
    story += [Spacer(1, 5*mm), p("来源与边界", st["h3"])]
    for source in data["sources"]:
        story.append(rich(f"<b>{escape(source['label'])}</b>　{escape(source['note'])}<br/><link href=\"{escape(source['url'])}\">{escape(source['url'])}</link>", st["tiny"]))
    story += [Spacer(1, 3*mm), p(data["meta"]["disclaimer"], st["small"])]

    doc = PortfolioDoc(str(OUTPUT_PATH), pagesize=A4, title=data["meta"]["projectName"], author="Personal recruiting portfolio", subject=data["meta"]["subtitle"])
    doc.build(story)
    PUBLIC_PATH.write_bytes(OUTPUT_PATH.read_bytes())
    print(f"Generated: {OUTPUT_PATH}")
    print(f"Copied: {PUBLIC_PATH}")


if __name__ == "__main__":
    build_pdf()
