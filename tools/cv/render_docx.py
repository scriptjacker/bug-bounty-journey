"""Writes the Word version of the CV from the same data the PDF uses.

    python3 tools/cv/render_docx.py cv-out/Parth-Narula-CV.json cv-out/Parth-Narula-CV.docx

Some application portals (older Taleo and iCIMS setups in particular) read Word files more
reliably than PDF, so every CV ships in both formats. The rules are the PDF's rules:
one column, no tables, no text boxes, nothing in the page header or footer, real Word
heading and list styles so a parser can see the structure, and Calibri, which every
recruiter's machine has.
"""
import json
import sys

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, RGBColor

FONT = "Calibri"
BODY = Pt(10)
INK = RGBColor(0x15, 0x18, 0x1C)
SOFT = RGBColor(0x2B, 0x31, 0x38)
RED = RGBColor(0xA3, 0x12, 0x1A)


def set_font(run_or_style, size=None, bold=None, color=None):
    f = run_or_style.font
    f.name = FONT
    rpr = run_or_style.element.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.append(fonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        fonts.set(qn(attr), FONT)
    if size is not None:
        f.size = size
    if bold is not None:
        f.bold = bold
    if color is not None:
        f.color.rgb = color


def spacing(p, before=0, after=0, line=1.08):
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line


def bottom_border(p, size=6, color="15181C"):
    ppr = p._p.get_or_add_pPr()
    bdr = OxmlElement("w:pBdr")
    b = OxmlElement("w:bottom")
    b.set(qn("w:val"), "single")
    b.set(qn("w:sz"), str(size))
    b.set(qn("w:space"), "1")
    b.set(qn("w:color"), color)
    bdr.append(b)
    ppr.append(bdr)


def keep_with_next(p):
    p.paragraph_format.keep_with_next = True


def run(p, text, bold=False, color=INK, size=None):
    r = p.add_run(text)
    set_font(r, size=size or BODY, bold=bold, color=color)
    return r


def link(p, text, url, bold=False, size=None):
    """A real hyperlink whose visible text is the address itself, so it still reads on paper."""
    rel = p.part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    h = OxmlElement("w:hyperlink")
    h.set(qn("r:id"), rel)
    r = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    fonts = OxmlElement("w:rFonts")
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        fonts.set(qn(attr), FONT)
    rpr.append(fonts)
    if bold:
        rpr.append(OxmlElement("w:b"))
    col = OxmlElement("w:color")
    col.set(qn("w:val"), "15181C" if bold else "2B3138")
    rpr.append(col)
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), str(int((size or BODY).pt * 2)))
    rpr.append(sz)
    r.append(rpr)
    t = OxmlElement("w:t")
    t.text = text
    t.set(qn("xml:space"), "preserve")
    r.append(t)
    h.append(r)
    p._p.append(h)


def main(src, out):
    cv = json.load(open(src, encoding="utf-8"))
    doc = Document()

    sec = doc.sections[0]
    sec.page_width, sec.page_height = Mm(210), Mm(297)
    sec.left_margin = sec.right_margin = Mm(13)
    sec.top_margin, sec.bottom_margin = Mm(12), Mm(12)
    text_width = sec.page_width - sec.left_margin - sec.right_margin

    normal = doc.styles["Normal"]
    set_font(normal, size=BODY, color=INK)
    spacing_normal = normal.paragraph_format
    spacing_normal.space_after = Pt(0)
    spacing_normal.line_spacing = 1.08

    h1 = doc.styles["Heading 1"]
    set_font(h1, size=Pt(11.5), bold=True, color=RED)
    h1.font.all_caps = True
    h1.paragraph_format.space_before = Pt(8)
    h1.paragraph_format.space_after = Pt(2)
    h1.paragraph_format.keep_with_next = True

    bullet = doc.styles["List Bullet"]
    set_font(bullet, size=BODY, color=INK)
    bullet.paragraph_format.space_after = Pt(1)
    bullet.paragraph_format.line_spacing = 1.05

    props = doc.core_properties
    props.title = cv["meta"]["title"]
    props.author = cv["meta"]["author"]
    props.subject = cv["meta"]["subject"]
    props.keywords = cv["meta"]["keywords"]
    props.comments = ""
    props.last_modified_by = cv["meta"]["author"]

    p = doc.add_paragraph()
    spacing(p, after=1, line=1.0)
    run(p, cv["name"], bold=True, size=Pt(22))

    p = doc.add_paragraph()
    spacing(p, after=2)
    run(p, cv["headline"], bold=True, color=SOFT, size=Pt(11.5))

    p = doc.add_paragraph()
    spacing(p, after=4)
    first = True
    for c in cv["contact"]:
        if not first:
            run(p, " | ", color=SOFT, size=Pt(10))
        first = False
        if c.get("href"):
            link(p, c["text"], c["href"], bold=c.get("strong", False), size=Pt(10))
        else:
            run(p, c["text"], color=SOFT, size=Pt(10))
        if c.get("lineEnd"):
            # A real line break, not a wrap, so no address is split across two lines.
            p.add_run().add_break()
            first = True
    bottom_border(p, size=10)

    def dated(strong, rest, when):
        p = doc.add_paragraph()
        spacing(p, before=2, after=1)
        p.paragraph_format.tab_stops.add_tab_stop(text_width, WD_TAB_ALIGNMENT.RIGHT)
        run(p, strong, bold=True)
        if rest:
            run(p, ", " + rest, color=SOFT)
        if when:
            run(p, "\t" + when, bold=True, color=SOFT, size=Pt(10))
        return p

    def bullets(items):
        for item in items:
            b = doc.add_paragraph(style="List Bullet")
            if isinstance(item, dict):
                run(b, item["lead"], bold=True)
                run(b, item["text"])
            else:
                run(b, item)

    for s in cv["sections"]:
        h = doc.add_paragraph(s["heading"], style="Heading 1")
        bottom_border(h, size=4, color="C9CED4")
        for b in s["blocks"]:
            t = b["type"]
            if t == "para":
                p = doc.add_paragraph()
                spacing(p, after=1, line=1.1)
                run(p, b["text"])
            elif t == "kv":
                p = doc.add_paragraph()
                spacing(p, after=2, line=1.08)
                run(p, b["label"] + ": ", bold=True)
                run(p, b["text"])
            elif t == "line":
                # Inline date, as in the PDF, so it can never drift away from its entry.
                p = doc.add_paragraph()
                spacing(p, before=1, after=1)
                run(p, b["strong"], bold=True)
                if b.get("rest"):
                    run(p, ", " + b["rest"], color=SOFT)
                if b.get("when"):
                    run(p, " | ", color=SOFT)
                    run(p, b["when"], bold=True, color=SOFT)
                if b.get("note"):
                    run(p, " | " + b["note"], color=SOFT)
            elif t == "bullets":
                bullets(b["items"])
            elif t == "job":
                if b.get("inlineDate"):
                    p = doc.add_paragraph()
                    spacing(p, before=2, after=1)
                    run(p, b["title"], bold=True)
                    run(p, ", " + b["org"], color=SOFT)
                    run(p, " | ", color=SOFT)
                    run(p, b["when"], bold=True, color=SOFT)
                else:
                    p = dated(b["title"], b["org"], b["when"])
                keep_with_next(p)
                if b.get("text"):
                    q = doc.add_paragraph()
                    spacing(q, after=2)
                    run(q, b["text"])
                bullets(b.get("bullets", []))
                if b.get("engagements"):
                    q = doc.add_paragraph()
                    spacing(q, before=3, after=1)
                    keep_with_next(q)
                    run(q, b["subhead"], bold=True, color=SOFT)
                    items = [{"lead": f'{e["client"]} ({e["country"]}), {e["when"]}: ', "text": e["text"]} for e in b["engagements"]]
                    if b.get("otherClients"):
                        items.append(b["otherClients"])
                    bullets(items)
            else:
                raise SystemExit(f"unknown block type {t}")

    doc.save(out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
