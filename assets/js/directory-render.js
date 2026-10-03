// Pure render helpers for the organizations directory. Shared by the browser (recognition.js)
// and by tools/prerender.mjs, so the prerendered HTML and the live HTML are identical.
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const REC = { hof: "Hall of Fame", swag: "Swag", cert: "Certificate", letter: "Letter of appreciation", cve: "CVEs", ack: "Acknowledged" };
const showCountry = (code) => code !== "EU" && code !== "INT";

export function prepare(data, gallery = []) {
  const countryName = Object.fromEntries(data.countries.map((c) => [c.code, c.name]));
  const orgs = [...data.orgs].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  return { ...data, orgs, countryName, proof: new Set(gallery.map((g) => g.domain)) };
}

export function filterList(d) {
  const count = (fn) => d.orgs.filter(fn).length;
  return [
    ["all", "All", d.orgs.length],
    ["first", "First researcher", count((o) => o.first)],
    ...Object.entries(d.sectors).map(([k, label]) => [k, label, count((o) => o.sector === k)]).filter(([, , n]) => n > 2).sort((a, b) => b[2] - a[2]),
    ["swag", "Sent swag", count((o) => o.recognition.includes("swag"))],
  ];
}

export const filtersHTML = (d, active) =>
  filterList(d).map(([k, label, n]) => `<button class="chip" type="button" data-filter="${k}" aria-pressed="${k === active}">${esc(label)} <span class="count">${n}</span></button>`).join("");

export function rowHTML(o, d) {
  const badges = [
    o.first ? `<span class="badge badge--first">First researcher</span>` : "",
    ...o.recognition.map((r) => `<span class="badge">${REC[r] || esc(r)}</span>`),
    d.proof.has(o.domain) ? `<a class="badge" href="gallery.html?q=${encodeURIComponent(o.domain)}">See proof</a>` : "",
  ].join("");
  return `<tr><td class="org"><b>${esc(o.name)}</b><span>${esc(o.domain)}</span></td><td class="sec">${esc(d.sectors[o.sector])}</td><td class="ctry">${esc(d.countryName[o.country] || o.country)}</td><td class="badges-cell"><div class="badges">${badges}</div></td></tr>`;
}

export function top50HTML(d) {
  const byDomain = new Map(d.orgs.map((o) => [o.domain, o]));
  return d.prestige.map((p) => {
    const o = byDomain.get(p.domain);
    const where = o && showCountry(o.country) ? `, ${esc(d.countryName[o.country])}` : "";
    return `<li><span class="rank">${String(p.rank).padStart(2, "0")}</span><b>${esc(p.name)}</b><span>${esc(p.domain)}${where}</span></li>`;
  }).join("");
}

export const resultText = (shown, total) => (shown === total ? `Showing all ${total} organizations` : `Showing ${shown} of ${total} organizations`);

// Numbers shown on the homepage, derived from the data so they never drift.
export function siteStats(d, gallery = []) {
  const count = (fn) => d.orgs.filter(fn).length;
  const mapped = d.countries.filter((c) => c.lat !== null && c.count > 0);
  return {
    listed: d.orgs.length,
    countries: mapped.length,
    first: count((o) => o.first),
    firstMore: count((o) => o.first) - 8, // eight names are printed on the homepage tile
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
  `<a class="sector${i === 0 ? " sector--lead" : ""}" href="recognition.html?filter=${k}"><b>${s.sector[k]}</b><span>${label}</span></a>`).join("");
export const topCountriesHTML = (s) => s.topCountries.map((c) =>
  `<li><span class="cc">${c.code}</span>${esc(c.name)}<span class="n">${c.count}</span></li>`).join("");
