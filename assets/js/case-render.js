// Pure render helpers for the case files and the publicly named findings.
// Shared by tools/prerender.mjs (so the page works without JavaScript) and by replay.js.
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ARROW = `<svg class="ic" aria-hidden="true"><use href="assets/icons.svg?v=2a2b831c#i-arrow-up-right"/></svg>`;

// A case can carry further records of the same finding, like the NVD entry beside the CVE one.
const more = (c) => (c.more || []).map(([label, url]) =>
  `<a class="case__link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}${ARROW}</a>`).join("");

export function caseHTML(c, i) {
  const meta = c.meta.map(([k, v]) =>
    `<div><dt>${esc(k)}</dt><dd>${v === "redacted" ? `<span class="redact redact--inline" aria-hidden="true"></span><span class="sr-only">Not disclosed</span>` : esc(v)}</dd></div>`).join("");
  const replay = c.steps.length
    ? `<button class="case__replay" type="button" data-replay="${esc(c.id)}"><svg class="ic" aria-hidden="true"><use href="assets/icons.svg?v=2a2b831c#i-terminal-window"/></svg>Replay the ${c.steps.length} steps</button>`
    : "";
  return `<li class="case${c.id === "cve" ? " case--cve" : ""}" data-reveal id="case-${esc(c.id)}">
      <div class="case__top"><span class="case__no">Case ${String(i + 1).padStart(2, "0")}</span><span class="case__class">${esc(c.class)}</span></div>
      <h3 class="case__title">${esc(c.title)}</h3>
      <dl class="case__meta">${meta}</dl>
      <p class="case__story">${esc(c.story)}</p>
      <div class="case__actions">${replay}<a class="case__link" href="${esc(c.link)}" target="_blank" rel="noopener">${c.id === "cve" ? "View the CVE record" : "Read the writeup"}${ARROW}</a>${more(c)}<span class="stamp" aria-hidden="true">${esc(c.stamp)}</span></div>
    </li>`;
}

export const casesHTML = (data) => data.cases.map(caseHTML).join("\n");

// The steps, rendered inside a <noscript> friendly details element so every word is in the page
// even before replay.js loads, and so search engines and printing see the whole thing.
export function caseStepsHTML(data) {
  return data.cases.filter((c) => c.steps.length).map((c) => `<details class="steps" id="steps-${esc(c.id)}">
      <summary><span class="steps__case">${esc(c.title)}</span><span class="steps__n">${c.steps.length} steps</span></summary>
      <ol class="steps__list">${c.steps.map((s, i) => `<li>
        <p class="steps__label"><i>${String(i + 1).padStart(2, "0")}</i>${esc(s.label)}</p>
        <p>${esc(s.body)}</p>${s.code ? `
        <pre class="steps__code"${s.lang ? ` data-lang="${esc(s.lang)}"` : ""}><code>${esc(s.code)}</code></pre>` : ""}
      </li>`).join("")}</ol>
    </details>`).join("\n");
}

// "In their words": the organizations whose own public page names what was found.
export function namedHTML(d) {
  const list = d.orgs.filter((o) => o.bug).sort((a, b) => (b.top - a.top) || a.name.localeCompare(b.name));
  return list.map((o) => {
    const inner = `<b>${esc(o.name)}</b><span>${esc(o.bug)}</span>`;
    return o.url
      ? `<li><a href="${esc(o.url)}" target="_blank" rel="noopener">${inner}<em>Read it on their page${ARROW}</em></a></li>`
      : `<li><a href="gallery.html?q=${encodeURIComponent(o.domain)}">${inner}<em>See the screenshot</em></a></li>`;
  }).join("");
}
