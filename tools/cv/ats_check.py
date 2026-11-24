"""Reads every CV back the way an applicant tracking system would, and fails loudly.

    python3 tools/cv/ats_check.py                 # every PDF and DOCX in cv-out/
    python3 tools/cv/ats_check.py path/to/cv.pdf  # one file

There is no single "ATS score": each vendor parses differently and the score some tools show
is their own keyword match. So this reports the parts separately, the ones that decide
whether a parser gets the CV right:

  1. Text layer: three independent PDF extractors (poppler's pdftotext, pdfminer, pypdf), or
     two Word readers, must all get the same words back, with no ligatures, no (cid:N)
     garbage and no private use glyphs.
  2. Contact: name, email, phone, LinkedIn and website found whole by every engine, near the top.
  3. Sections: the standard headings, each on its own line, in order.
  4. Dates: every role has a start and an end a parser can read.
  5. Layout: page count, body text size and how full the last page is.
  6. Writing: bullets that open with a verb and bullets that carry a number.
  7. Keywords: match against role profiles built from real job ads (keywords.json), with the
     missing terms split into ones to ask about and ones that are simply not true yet.

Needs poppler-utils, pdfminer.six, pypdf, pdfplumber and python-docx.
Exit code 1 when a hard check fails.
"""
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KEYWORDS = json.loads((Path(__file__).parent / "keywords.json").read_text())
HEADINGS = ["Professional Summary", "Skills", "Work Experience", "Certifications", "Achievements", "Projects", "Education"]
MONTH = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}"
RANGE = re.compile(rf"(?:{MONTH}|\d{{4}}) to (?:Present|{MONTH})")
BAD = re.compile(r"\(cid:\d+\)|[ﬀ-ﬆ-�]")
DASHES = re.compile(r"[–—]")

failures = 0


def report(ok, name, detail=""):
    global failures
    if not ok:
        failures += 1
    print(f"  {'pass' if ok else 'FAIL'}  {name}{'' if ok or not detail else f'  ({detail})'}")


def note(name, detail):
    print(f"  info  {name}: {detail}")


# ---------- extraction ----------
def pdf_engines(path):
    from pdfminer.high_level import extract_text
    from pypdf import PdfReader

    out = {"pdftotext": subprocess.run(["pdftotext", "-enc", "UTF-8", str(path), "-"], capture_output=True, text=True, check=True).stdout}
    out["pdfminer"] = extract_text(str(path))
    out["pypdf"] = "\n".join(p.extract_text() or "" for p in PdfReader(str(path)).pages)
    return out


def docx_engines(path):
    from docx import Document

    doc = Document(str(path))
    paragraphs = "\n".join(p.text for p in doc.paragraphs)
    # A second, independent read: the raw text runs straight from the XML, the way the
    # simplest parsers do it, including hyperlink text that python-docx's paragraph.text skips
    # in older versions.
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf8")
    xml = re.sub(r"</w:p>", "\n", xml)
    xml = re.sub(r"<w:tab/>", "\t", xml)
    xml = re.sub(r"<w:br/>", "\n", xml)
    raw = re.sub(r"<[^>]+>", "", xml)
    raw = raw.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")
    return {"python-docx": paragraphs, "raw xml": raw}


def words(text):
    return re.findall(r"[a-z0-9][a-z0-9+#./@:-]*", text.lower())


# ---------- checks ----------
def check_text(engines):
    print("text layer")
    for name, t in engines.items():
        report(len(t) > 1500, f"{name} returns the full text", f"{len(t)} characters")
        bad = BAD.findall(t)
        report(not bad, f"{name} finds no ligatures or unreadable glyphs", ", ".join(sorted(set(map(repr, bad)))))
    names = list(engines)
    base = set(words(engines[names[0]]))
    for other in names[1:]:
        o = set(words(engines[other]))
        jac = len(base & o) / max(1, len(base | o))
        report(jac >= 0.97, f"{names[0]} and {other} agree on the words", f"{jac:.3f} overlap, only in {other}: {sorted(o - base)[:8]}")
    for name, t in engines.items():
        split = re.findall(r"\S+-\n\S*", t)
        report(not split, f"{name}: no word split across lines at a hyphen", ", ".join(x.replace(chr(10), "") for x in split[:5]))
    dashes = DASHES.findall(engines[names[0]])
    report(not dashes, "no long dashes (house style)", f"{len(dashes)} found")


def check_contact(engines):
    print("contact")
    for name, t in engines.items():
        head = re.sub(r"\s+", " ", t[:700])
        report(head.lstrip().startswith("Parth Narula"), f"{name}: name comes first", head[:40])
        report(bool(re.search(r"parth\.narula@scriptjacker\.in", head)), f"{name}: email found whole")
        report(bool(re.search(r"\+91 74970 54662", head)), f"{name}: phone found whole")
        report("linkedin.com/in/parth-narula-86283821a" in head, f"{name}: LinkedIn URL found whole")
        report("parthnarula.scriptjacker.in" in head, f"{name}: portfolio URL found whole")


def check_sections(engines, expected):
    print("sections")
    for name, t in engines.items():
        lines = [re.sub(r"\s+", " ", l).strip().lower() for l in t.splitlines()]
        pos = []
        for h in expected:
            idx = next((i for i, l in enumerate(lines) if l == h.lower()), -1)
            pos.append(idx)
        missing = [h for h, i in zip(expected, pos) if i < 0]
        report(not missing, f"{name}: every heading on its own line", ", ".join(missing))
        found = [i for i in pos if i >= 0]
        report(found == sorted(found), f"{name}: headings in order")


def check_date_pairing(engines, cv):
    """A date is only useful if a parser can tell whose it is. Right aligned dates look tidy,
    but some extractors lift a stack of them out as a separate column, which pairs a
    certificate with the wrong year. Each date must sit on its entry's line or the next one."""
    print("date pairing")
    entries = [(b.get("title") or b.get("strong"), b["when"]) for s in cv["sections"] for b in s["blocks"] if b.get("when")]
    for name, t in engines.items():
        lines = [re.sub(r"\s+", " ", l).strip() for l in t.splitlines() if l.strip()]
        lost = []
        for title, when in entries:
            # "Title," with the comma: the entry's own line, not the same words in the headline.
            i = next((k for k, l in enumerate(lines) if title + "," in l), None)
            if i is None or not any(when in l for l in lines[i : i + 2]):
                lost.append(f"{title[:28]} / {when}")
        report(not lost, f"{name}: every date stays with its entry", "; ".join(lost[:4]) + (" ..." if len(lost) > 4 else ""))


def check_dates(cv):
    print("dates")
    for s in cv["sections"]:
        if s["heading"] not in ("Work Experience",):
            continue
        for b in s["blocks"]:
            report(bool(RANGE.fullmatch(b["when"])), f"{b['title']} has a readable date range", b["when"])


def check_layout(path, cv):
    print("layout")
    import pdfplumber

    with pdfplumber.open(str(path)) as pdf:
        pages = len(pdf.pages)
        report(pages <= 2, "two pages or fewer", f"{pages} pages")
        sizes = [round(c["size"], 1) for p in pdf.pages for c in p.chars if c["text"].strip()]
        body = sum(1 for s in sizes if s >= 9.5) / max(1, len(sizes))
        report(body >= 0.9, "body text at 9.5pt or larger", f"{body:.0%} of characters")
        note("most used size", f"{max(set(sizes), key=sizes.count)}pt")
        last = pdf.pages[-1]
        bottom = max((c["bottom"] for c in last.chars), default=0)
        fill = bottom / last.height
        report(pages == 1 or fill >= 0.5, "last page at least half full", f"{fill:.0%}")
        note("last page filled to", f"{fill:.0%}")
        # Cosmetic: a paragraph whose last line holds one or two words wastes a line and looks
        # unfinished. Reported, not failed.
        orphans = []
        for page in pdf.pages:
            rows = []  # words on one baseline, allowing for bold and regular sitting a hair apart
            for w in sorted(page.extract_words(use_text_flow=True), key=lambda w: (w["top"], w["x0"])):
                if rows and abs(rows[-1][0] - w["top"]) < 2.5:
                    rows[-1][1].append(w)
                else:
                    rows.append((w["top"], [w]))
            rows = [r for r in rows if not r[1][0]["text"].isupper()]  # section headings
            full = page.width - 2 * min(w["x0"] for _, ws in rows for w in ws)
            for (_, prev), (_, cur) in zip(rows, rows[1:]):
                pw = max(w["x1"] for w in prev) - min(w["x0"] for w in prev)
                if len(cur) <= 2 and pw > 0.85 * full and cur[0]["x0"] > min(w["x0"] for w in prev) - 1:
                    orphans.append(" ".join(w["text"] for w in cur))
        note("one or two word last lines", ", ".join(orphans) or "none")
    fonts = subprocess.run(["pdffonts", str(path)], capture_output=True, text=True).stdout.splitlines()[2:]
    report(all(" yes " in l for l in fonts), "every font embedded", "; ".join(fonts))
    info = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True).stdout
    report("Tagged:          yes" in info, "tagged PDF (structure for screen readers and parsers)")
    report("Title:           Parth Narula" in info, "document title set")


def check_docx_pages(path):
    """Word lays the file out on the reader's machine, so render it with LibreOffice (Carlito
    stands in for Calibri with the same metrics) and count the pages."""
    import shutil
    import tempfile

    print("layout")
    soffice = shutil.which("soffice")
    if not soffice:
        note("page count", "skipped, LibreOffice not installed")
        return
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", tmp, str(path)], capture_output=True, check=True)
        import pdfplumber

        with pdfplumber.open(str(Path(tmp) / (path.stem + ".pdf"))) as pdf:
            pages = len(pdf.pages)
            last = pdf.pages[-1]
            fill = max((c["bottom"] for c in last.chars), default=0) / last.height
    report(pages <= 2, "Word version fits on two pages", f"{pages} pages")
    note("Word last page filled to", f"{fill:.0%}")


def bullets_of(cv):
    out = []
    for s in cv["sections"]:
        for b in s["blocks"]:
            out += b.get("bullets", []) + b.get("items", [])
            out += [e["text"] for e in b.get("engagements", [])]
    return out


# Stock phrases recruiters skim past and words that make a CV read as generated.
STOCK = re.compile(r"\b(I|my|me|leverag\w*|robust|seamless\w*|passionate|proven track|results driven|detail oriented|dynamic(?! testing| application)|spearhead\w*|utiliz\w*|hands on|cutting edge|synerg\w*|go getter|team player|hard working|responsible for|various|etc|among others|delve|tapestry|showcas\w*|furthermore|moreover|in today's|ever evolving|landscape|meticulous\w*|navigat\w*|elevat\w*|empower\w*)\b", re.I)


def check_writing(cv):
    print("writing")
    text = json.dumps(cv["sections"])
    found = sorted(set(m.group(0) for m in STOCK.finditer(text)))
    report(not found, "no stock phrases or generated sounding words", ", ".join(found))
    verbs = set(KEYWORDS["actionVerbs"])
    items = bullets_of(cv)
    led = [b for b in items if b.split()[0].lower().strip(":,") in verbs or re.match(r"(AIR|Team lead|Letters|Other clients)", b)]
    report(len(led) == len(items), "every bullet opens with a verb or a result", "; ".join(b[:50] for b in items if b not in led))
    numbered = [b for b in items if re.search(r"\d", b)]
    note("bullets with a number", f"{len(numbered)} of {len(items)}")
    lengths = [len(b.split()) for b in items]
    report(max(lengths) <= 45, "no bullet runs past 45 words", f"longest {max(lengths)}")


def check_keywords(text):
    print("keywords")
    low = " " + re.sub(r"\s+", " ", text.lower()) + " "
    for profile, terms in KEYWORDS["profiles"].items():
        got = total = 0
        missing_ask, missing_false, missing_fix = [], [], []
        for t in terms:
            w = t.get("weight", 1)
            claim = t.get("claimable", True)
            spellings = [t["term"]] + t.get("aliases", [])
            hit = any(re.search(r"(?<![a-z0-9])" + re.escape(s.lower()) + r"(?![a-z0-9])", low) for s in spellings)
            if claim is False and not hit:
                missing_false.append(t["term"])
                continue  # not counted: a term that is not true is not a gap to close
            total += w
            if hit:
                got += w
            elif claim == "ask":
                missing_ask.append(t["term"])
            else:
                missing_fix.append(t["term"])
        pct = got / max(1, total)
        report(pct >= 0.75 and not missing_fix, f"{profile}: {pct:.0%} weighted match", "missing: " + ", ".join(missing_fix))
        if missing_ask:
            note("  would add if true", ", ".join(missing_ask))
        if missing_false:
            note("  not held, left out", ", ".join(missing_false))


def check(path):
    path = Path(path)
    sidecar = path.with_suffix(".json")
    cv = json.loads(sidecar.read_text()) if sidecar.exists() else None
    print(f"\n=== {path.name}")
    engines = pdf_engines(path) if path.suffix == ".pdf" else docx_engines(path)
    check_text(engines)
    check_contact(engines)
    expected = [s["heading"] for s in cv["sections"]] if cv else HEADINGS
    check_sections(engines, expected)
    if cv:
        check_date_pairing(engines, cv)
        check_dates(cv)
        check_writing(cv)
    if path.suffix == ".pdf":
        check_layout(path, cv)
    else:
        check_docx_pages(path)
    check_keywords(next(iter(engines.values())))


def main():
    files = sys.argv[1:] or sorted(str(p) for p in (ROOT / "cv-out").glob("*") if p.suffix in (".pdf", ".docx"))
    if not files:
        sys.exit("nothing to check: run npm run cv first")
    for f in files:
        check(f)
    print(f"\n{'all checks passed' if not failures else f'{failures} checks failed'}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
