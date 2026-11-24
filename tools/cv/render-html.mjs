// Turns the CV data into one HTML page for Chromium to print. Layout rules that matter for
// applicant tracking systems, each learned from reading the PDF back with three extractors:
//   - One column everywhere. Two columns read fine on screen but an extractor walks across the
//     page and interleaves them.
//   - The contact block is ordinary body text on one flowing line, never a header or footer,
//     which many parsers skip.
//   - Headings are plain words a parser already knows (Skills, Work Experience, Education).
//   - Static font files, so the PDF embeds real TrueType fonts with a Unicode map and no
//     ligatures that would turn "fi" into one unreadable glyph.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const font = (pkg, file) => `data:font/woff2;base64,${readFileSync(join(root, "node_modules/@fontsource", pkg, "files", file)).toString("base64")}`;

const CSS = `
  @font-face { font-family: "Geist"; src: url(${font("geist", "geist-latin-400-normal.woff2")}) format("woff2"); font-weight: 400; }
  @font-face { font-family: "Geist"; src: url(${font("geist", "geist-latin-600-normal.woff2")}) format("woff2"); font-weight: 600; }
  @font-face { font-family: "Geist"; src: url(${font("geist", "geist-latin-700-normal.woff2")}) format("woff2"); font-weight: 700; }
  @page { size: A4; margin: 11mm 13mm 10mm; }
  * { box-sizing: border-box; }
  html { font-variant-ligatures: none; font-feature-settings: "liga" 0, "clig" 0; }
  body { margin: 0; font-family: "Geist", Arial, sans-serif; font-size: 9.8pt; line-height: 1.36; color: #15181c; }
  a { color: inherit; text-decoration: none; }
  h1 { font-size: 22pt; margin: 0; font-weight: 700; line-height: 1.05; letter-spacing: -0.2px; }
  .headline { font-size: 11pt; color: #2b3138; margin: 3px 0 4px; font-weight: 600; }
  .contact { font-size: 9.4pt; line-height: 1.45; color: #2b3138; margin: 0; padding-bottom: 6px; border-bottom: 1.3px solid #15181c; }
  .contact b { font-weight: 600; color: #15181c; }
  h2 { font-size: 10.6pt; color: #a3121a; margin: 9px 0 3px; font-weight: 700; padding-bottom: 2px; border-bottom: 0.6px solid #c9ced4; text-transform: uppercase; letter-spacing: 0.5px; break-after: avoid; page-break-after: avoid; }
  p { margin: 0; }
  .kv { margin: 2px 0; }
  .kv b, .line b, .top b, .top-inline b, .eng b { font-weight: 600; }
  .top-inline { break-after: avoid; page-break-after: avoid; }
  .job { margin: 0 0 5px; }
  .top { display: flex; justify-content: space-between; gap: 14px; align-items: baseline; break-after: avoid; page-break-after: avoid; }
  .org { color: #2b3138; }
  .when { font-size: 9.2pt; color: #4a525c; white-space: nowrap; font-weight: 600; }
  .line { margin: 1.5px 0; break-inside: avoid; }
  .sep { color: #9aa1a9; }
  ul { margin: 2px 0 0; padding-left: 14px; }
  li { margin: 1.5px 0; padding-left: 1px; break-inside: avoid; }
  li::marker { color: #6b737d; }
  .sub { margin: 4px 0 0; font-weight: 600; font-size: 9.6pt; color: #2b3138; break-after: avoid; page-break-after: avoid; }
  .job > p.text { margin-top: 1px; }
`;

function block(b) {
  switch (b.type) {
    case "para":
      return `<p>${esc(b.text)}</p>`;
    case "kv":
      return `<p class="kv"><b>${esc(b.label)}:</b> ${esc(b.text)}</p>`;
    case "line":
      // The date stays in the same run of text. A stack of right aligned dates is read by
      // some extractors as a separate column and paired with the wrong entry.
      return `<p class="line"><b>${esc(b.strong)}</b>${b.rest ? `, <span class="org">${esc(b.rest)}</span>` : ""}${b.when ? ` <span class="sep">|</span> <span class="when">${esc(b.when)}</span>` : ""}${b.note ? ` <span class="sep">|</span> ${esc(b.note)}` : ""}</p>`;
    case "bullets":
      return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    case "job": {
      let h = b.inlineDate
        ? `<div class="job"><p class="top-inline"><b>${esc(b.title)}</b>, <span class="org">${esc(b.org)}</span> <span class="sep">|</span> <span class="when">${esc(b.when)}</span></p>`
        : `<div class="job"><div class="top"><p><b>${esc(b.title)}</b>, <span class="org">${esc(b.org)}</span></p><span class="when">${esc(b.when)}</span></div>`;
      if (b.text) h += `<p class="text">${esc(b.text)}</p>`;
      if (b.bullets?.length) h += `<ul>${b.bullets.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
      if (b.engagements?.length) {
        h += `<p class="sub">${esc(b.subhead)}</p><ul>`;
        h += b.engagements.map((e) => `<li class="eng"><b>${esc(e.client)}</b> (${esc(e.country)}), ${esc(e.when)}: ${esc(e.text)}</li>`).join("");
        if (b.otherClients) h += `<li>${esc(b.otherClients)}</li>`;
        h += "</ul>";
      }
      return h + "</div>";
    }
    default:
      throw new Error(`unknown block type ${b.type}`);
  }
}

export function renderHtml(cv) {
  // Two deliberate lines (how to reach me, where my work is) so no address ever wraps in
  // the middle, which would hand a parser half a LinkedIn URL.
  const item = (c) => {
    const t = c.strong ? `<b>${esc(c.text)}</b>` : esc(c.text);
    return c.href ? `<a href="${esc(c.href)}">${t}</a>` : t;
  };
  const cut = cv.contact.findIndex((c) => c.lineEnd) + 1;
  const contact = [cv.contact.slice(0, cut), cv.contact.slice(cut)].map((g) => g.map(item).join(" | ")).join("<br>");
  const body = cv.sections.map((s) => `<h2>${esc(s.heading)}</h2>\n${s.blocks.map(block).join("\n")}`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(cv.meta.title)}</title>
<meta name="author" content="${esc(cv.meta.author)}">
<style>${CSS}</style>
</head>
<body>
<h1>${esc(cv.name)}</h1>
<p class="headline">${esc(cv.headline)}</p>
<p class="contact">${contact}</p>
${body}
</body>
</html>`;
}
