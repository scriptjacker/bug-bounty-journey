// Pure render helpers for the organizations directory. Shared by the browser (recognition.js)
// and by tools/prerender.mjs, so the prerendered HTML and the live HTML are identical.
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const REC = { hof: "Hall of Fame", swag: "Swag", cert: "Certificate", letter: "Letter", ack: "Acknowledged" };
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
