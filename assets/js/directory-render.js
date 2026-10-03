// Pure render helpers for the organizations directory and the data driven parts of the homepage.
// Shared by the browser (recognition.js) and by tools/prerender.mjs, so the prerendered HTML and
// the live HTML are identical.
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const REC = { hof: "Hall of Fame", swag: "Swag", cert: "Certificate", letter: "Letter of appreciation", cve: "CVEs", ack: "Acknowledged", gift: "Gift card" };
const showCountry = (code) => code !== "EU" && code !== "INT";
const ARROW = `<svg class="ic" aria-hidden="true"><use href="assets/icons.svg#i-arrow-up-right"/></svg>`;

export function prepare(data, gallery = []) {
  const countryName = Object.fromEntries(data.countries.map((c) => [c.code, c.name]));
  const orgs = [...data.orgs].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  return { ...data, orgs, countryName, proof: new Set(gallery.map((g) => g.domain)) };
}

// "first" puts the programs where Parth was the first researcher on top, then everything else A to Z.
export const SORTS = { first: "First researcher first", az: "A to Z" };
export function sortOrgs(list, mode = "first") {
  const az = (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  // Inside each group, the best known names and the ones with a public page lead.
  const strength = (o) => (o.top ? 2 : 0) + (o.url ? 1 : 0);
  return [...list].sort(mode === "az" ? az : (a, b) => (b.first - a.first) || (a.first && strength(b) - strength(a)) || az(a, b));
}

export function filterList(d) {
  const count = (fn) => d.orgs.filter(fn).length;
  return [
    ["all", "All", d.orgs.length],
    ["first", "First researcher", count((o) => o.first)],
    ["public", "Public page", count((o) => o.url)],
    ...Object.entries(d.sectors).map(([k, label]) => [k, label, count((o) => o.sector === k)]).filter(([, , n]) => n > 2).sort((a, b) => b[2] - a[2]),
    ["swag", "Sent swag", count((o) => o.recognition.includes("swag"))],
  ];
}

export function matchFilter(o, filter) {
  if (filter === "all") return true;
  if (filter === "first") return o.first;
  if (filter === "public") return !!o.url;
  if (filter === "swag") return o.recognition.includes("swag");
  return o.sector === filter;
}

export const filtersHTML = (d, active) =>
  filterList(d).map(([k, label, n]) => `<button class="chip" type="button" data-filter="${k}" aria-pressed="${k === active}">${esc(label)} <span class="count">${n}</span></button>`).join("");

export function rowHTML(o, d) {
  const badges = [
    o.first ? `<span class="badge badge--first">First researcher</span>` : "",
    ...o.recognition.map((r) => `<span class="badge">${REC[r] || esc(r)}</span>`),
  ].join("");
  const links = [
    o.url ? `<a class="verify" href="${esc(o.url)}" target="_blank" rel="noopener" aria-label="Public page for ${esc(o.name)}">Public page${ARROW}</a>` : "",
    d.proof.has(o.domain) ? `<a class="verify verify--soft" href="gallery.html?q=${encodeURIComponent(o.domain)}" aria-label="Screenshots for ${esc(o.name)}">Screenshot</a>` : "",
  ].join("");
  const note = o.note ? `<em>${esc(o.note)}</em>` : "";
  return `<tr${o.first ? ` class="is-first"` : ""}><td class="org"><b>${esc(o.name)}</b><span>${esc(o.domain)}</span>${note}</td><td class="sec">${esc(d.sectors[o.sector])}</td><td class="ctry">${esc(d.countryName[o.country] || o.country)}</td><td class="badges-cell"><div class="badges">${badges}</div></td><td class="proof-cell"><div class="proofs">${links}</div></td></tr>`;
}

export function top50HTML(d) {
  const byDomain = new Map(d.orgs.map((o) => [o.domain, o]));
  return d.prestige.map((p) => {
    const o = byDomain.get(p.domain);
    const where = o && showCountry(o.country) ? `, ${esc(d.countryName[o.country])}` : "";
    const flag = o?.first ? `<span class="top50__first">First researcher</span>` : "";
    const name = o?.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(p.name)}${ARROW}</a>` : esc(p.name);
    return `<li${o?.first ? ` class="is-first"` : ""}><span class="rank">${String(p.rank).padStart(2, "0")}</span><b>${name}</b><span>${esc(p.domain)}${where}</span>${flag}</li>`;
  }).join("");
}

export const resultText = (shown, total) => (shown === total ? `Showing all ${total} organizations` : `Showing ${shown} of ${total} organizations`);

// Numbers shown on the pages, derived from the data so they never drift.
export function siteStats(d, gallery = []) {
  const count = (fn) => d.orgs.filter(fn).length;
  const mapped = d.countries.filter((c) => c.lat !== null && c.count > 0);
  return {
    listed: d.orgs.length,
    countries: mapped.length,
    first: count((o) => o.first),
    public: count((o) => o.url),
    proofed: count((o) => o.url || d.proof.has(o.domain)),
    swag: count((o) => o.recognition.includes("swag")),
    letters: count((o) => o.recognition.includes("letter") || o.recognition.includes("cert")),
    galleryAll: gallery.length,
    galleryHof: gallery.filter((g) => g.category === "hof").length,
    galleryLetters: gallery.filter((g) => g.category === "letter" || g.category === "cert").length,
    gallerySwag: gallery.filter((g) => g.category === "swag").length,
    sector: Object.fromEntries(Object.keys(d.sectors).map((k) => [k, count((o) => o.sector === k)])),
    topCountries: mapped.slice().sort((a, b) => b.count - a.count).slice(0, 7),
  };
}

const SECTOR_TILES = [
  ["company", "Companies, from startups to SaaS platforms"], ["government", "Government bodies"], ["education", "Universities and research"],
  ["enterprise", "Global enterprises"], ["finance", "Banks and finance"], ["nonprofit", "Nonprofit and civic"], ["media", "Media"],
];
export const sectorTilesHTML = (s) => SECTOR_TILES.map(([k, label], i) =>
  `<a class="sector${i === 0 ? " sector--lead" : ""}" href="recognition.html?filter=${k}"><b>${s.sector[k]}</b><span>${label}</span></a>`).join("") +
  `<a class="sector sector--all" href="recognition.html"><span>${s.listed} in total</span><b>See them all${ARROW}</b></a>`;
export const topCountriesHTML = (s) => s.topCountries.map((c) =>
  `<li><span class="cc">${c.code}</span>${esc(c.name)}<span class="n">${c.count}</span></li>`).join("");

// Homepage "First in" wall: one mini Hall of Fame card per program where Parth was the first researcher.
// Two rows that drift in opposite directions; the second copy of each row only exists to loop seamlessly.
export function firstsHTML(d) {
  const rank = (o) => (o.top ? 0 : 2) + (o.url ? 0 : 1);
  const list = d.orgs.filter((o) => o.first).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  const card = (o, hidden) => {
    const href = o.url || (d.proof.has(o.domain) ? `gallery.html?q=${encodeURIComponent(o.domain)}` : `recognition.html?q=${encodeURIComponent(o.domain)}`);
    const go = o.url ? "Open the public page" : d.proof.has(o.domain) ? "See the screenshot" : "In the directory";
    const ext = o.url ? ` target="_blank" rel="noopener"` : "";
    const where = showCountry(o.country) ? o.country : "EU";
    return `<li><a class="hof" href="${esc(href)}"${ext}${hidden ? ` tabindex="-1"` : ""} aria-label="${esc(o.name)}, first researcher. ${go}">` +
      `<span class="hof__bar"><span>${esc(o.domain)}</span><span>${where}</span></span>` +
      `<span class="hof__org">${esc(o.name)}</span>` +
      `<span class="hof__label">Hall of Fame</span>` +
      `<span class="hof__entry hof__entry--me"><i>01</i>Parth Narula</span>` +
      `<span class="hof__entry"><i>02</i><s></s></span><span class="hof__entry"><i>03</i><s></s></span>` +
      `<span class="hof__go">${go}${o.url ? ARROW : ""}</span></a></li>`;
  };
  const rows = [list.filter((_, i) => i % 2 === 0), list.filter((_, i) => i % 2 === 1)];
  return rows.map((row, r) =>
    `<div class="firsts__row${r ? " firsts__row--rev" : ""}"><div class="firsts__track">` +
    `<ul class="firsts__set">${row.map((o) => card(o, false)).join("")}</ul>` +
    `<ul class="firsts__set" aria-hidden="true">${row.map((o) => card(o, true)).join("")}</ul>` +
    `</div></div>`).join("");
}
