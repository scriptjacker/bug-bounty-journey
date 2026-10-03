// One-time migration: reads the legacy index.html / gallery.html and writes
// data/orgs.json and data/gallery.json. Kept in the repo so the migration is auditable.
// The legacy pages live in git history. To re-run:
//   mkdir -p legacy && git show 395dab8:index.html > legacy/index.html && git show 395dab8:gallery.html > legacy/gallery.html
//   node tools/extract-legacy.mjs && npm run images
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const legacy = (f) => readFileSync(root + "legacy/" + f, "utf8");

// Long dashes are banned site wide, so they are stripped at the source.
const decode = (s) =>
  s.replace(/\s*[\u2014\u2013]\s*/g, ": ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

/* ---------- Orgs ---------- */
const html = legacy("index.html");

const TYPE = { gov: "government", muni: "government", uni: "education", corp: "enterprise", fin: "finance", media: "media", tech: "company", nonprofit: "nonprofit", ind: "independent", health: "healthcare", sports: "sports", other: "other" };

const rows = [...html.matchAll(/<tr data-type="([^"]*)" data-country="([^"]*)" data-first="(\d)" data-top="(\d)" data-recog="([^"]*)">([\s\S]*?)<\/tr>/g)];
const typesSeen = new Set();
const orgs = rows.map(([, type, cc, first, top, recog, body]) => {
  typesSeen.add(type);
  const domain = decode(body.match(/row-domain">([^<]*)</)[1]);
  const name = decode(body.match(/row-name">([^<]*)</)[1]);
  const typeLabel = decode(body.match(/row-type[^"]*">([^<]*)</)[1]);
  const country = decode(body.match(/<td>([^<]*)<\/td>\s*<td><span class="row-badge/)?.[1] ?? "");
  const badges = [...body.matchAll(/row-badge[^"]*">([^<]*)</g)].map((m) => decode(m[1]));
  return {
    domain, name,
    sector: TYPE[type] ?? type, sectorLabel: typeLabel,
    country: cc, countryLabel: country.replace(/^\S+\s/, ""),
    first: first === "1", top: top === "1",
    recognition: recog.split(/[\s,]+/).filter(Boolean),
    badges,
  };
});

// Prestige ranking (Top 50) keeps its editorial order.
const prestige = [...html.matchAll(/prestige-rank">#(\d+)<\/div><div class="prestige-name">([^<]*)<\/div><div class="prestige-domain">([^<]*)<\/div><div class="prestige-meta">([^<]*)<\/div><span class="tag [^"]*">([^<]*)</g)]
  .map(([, rank, name, domain, meta, tag]) => ({ rank: +rank, name: decode(name), domain: decode(domain), country: decode(meta).replace(/^\S+\s/, ""), tag: decode(tag) }));

const firsts = [...html.matchAll(/hof-name">([^<]*)<\/div><div class="hof-meta">([^<]*) · ([^<]*)<\/div>/g)]
  .map(([, name, domain, meta]) => ({ name: decode(name), domain: decode(domain), country: decode(meta).replace(/^\S+\s/, "") }));

writeFileSync(root + "data/orgs.json", JSON.stringify({ orgs, prestige, firsts }, null, 1));
console.log("orgs", orgs.length, "prestige", prestige.length, "firsts", firsts.length, "types", [...typesSeen]);

/* ---------- Gallery ---------- */
const g = legacy("gallery.html");
const src = g.slice(g.indexOf("const GALLERY_ITEMS = ["), g.indexOf("];", g.indexOf("const GALLERY_ITEMS = [")) + 2);
const ctx = {};
vm.runInNewContext(src.replace("const GALLERY_ITEMS", "this.items"), ctx);
const missing = [];
const items = ctx.items.map((it) => {
  if (!existsSync(root + it.image)) missing.push(it.image);
  return { src: it.image, title: decode(it.title), domain: it.domain, category: it.category, ...(it.hofUrl ? { url: it.hofUrl } : {}) };
});
writeFileSync(root + "data/gallery.json", JSON.stringify(items, null, 1));
console.log("gallery", items.length, "missing files:", missing);

/* ---------- Normalisation (fixes inconsistencies found in the legacy markup) ---------- */
const COUNTRY = {
  NL: ["Netherlands", 52.37, 4.9], DE: ["Germany", 52.52, 13.4], US: ["United States", 38.9, -77.04],
  AU: ["Australia", -35.28, 149.13], GB: ["United Kingdom", 51.51, -0.13], IN: ["India", 28.61, 77.21],
  SE: ["Sweden", 59.33, 18.07], BE: ["Belgium", 50.85, 4.35], NO: ["Norway", 59.91, 10.75],
  FR: ["France", 48.86, 2.35], CH: ["Switzerland", 46.95, 7.45], CZ: ["Czech Republic", 50.08, 14.44],
  IT: ["Italy", 41.9, 12.5], ID: ["Indonesia", -6.21, 106.85], ES: ["Spain", 40.42, -3.7],
  NZ: ["New Zealand", -41.29, 174.78], JP: ["Japan", 35.68, 139.69], BR: ["Brazil", -15.79, -47.88],
  TW: ["Taiwan", 25.03, 121.57], DK: ["Denmark", 55.68, 12.57], SG: ["Singapore", 1.35, 103.82],
  IS: ["Iceland", 64.15, -21.94], PL: ["Poland", 52.23, 21.01], CA: ["Canada", 45.42, -75.7],
  EE: ["Estonia", 59.44, 24.75], ZA: ["South Africa", -25.75, 28.19], SK: ["Slovakia", 48.15, 17.11],
  LT: ["Lithuania", 54.69, 25.28], BH: ["Bahrain", 26.23, 50.59], RU: ["Russia", 55.76, 37.62],
  TH: ["Thailand", 13.76, 100.5], SI: ["Slovenia", 46.06, 14.51],
  EU: ["Europe (multi country)", null, null], INT: ["International", null, null],
};
const SECTOR = {
  company: "Company", enterprise: "Enterprise", government: "Government", education: "Education",
  finance: "Finance", media: "Media", nonprofit: "Nonprofit and civic", independent: "Independent",
  sports: "Sports", healthcare: "Healthcare",
};
const SECTOR_FROM = { personal: "independent", ngo: "nonprofit", pol: "nonprofit" };

const firstSet = new Set([...firsts.map((f) => f.domain), ...orgs.filter((o) => o.first || o.badges.includes("1st HoF")).map((o) => o.domain)]);
const topSet = new Set(prestige.map((p) => p.domain));

const clean = orgs.map((o) => {
  let country = o.country;
  if (o.domain === "informatiebeveiligingsdienst.nl") country = "NL"; // legacy row said CH, label said NL
  const sector = SECTOR_FROM[o.sector] ?? o.sector;
  const rec = new Set(o.recognition);
  if (o.badges.some((b) => /swag/i.test(b))) rec.add("swag");
  return {
    domain: o.domain, name: o.name, sector, country,
    first: firstSet.has(o.domain), top: topSet.has(o.domain),
    recognition: [...rec],
  };
});
for (const o of clean) if (!COUNTRY[o.country]) throw new Error("Unknown country " + o.country);
for (const o of clean) if (!SECTOR[o.sector]) throw new Error("Unknown sector " + o.sector);

const countries = Object.entries(COUNTRY).map(([code, [name, lat, lon]]) => ({
  code, name, lat, lon, count: clean.filter((o) => o.country === code).length,
})).filter((c) => c.count).sort((a, b) => b.count - a.count);

writeFileSync(root + "data/orgs.json", JSON.stringify({
  sectors: SECTOR, countries,
  prestige: prestige.map(({ rank, name, domain, tag }) => ({ rank, name, domain, tag })),
  orgs: clean,
}));

/* Gallery fixes: wrong extension on one letter, one screenshot that was on disk but never listed. */
const fixed = items.map((it) => (it.src === "assets/letters/wortell.jpg" ? { ...it, src: "assets/letters/wortell.jpeg" } : it));
fixed.push({ src: "assets/hof/simpleinout.jpeg", title: "Simple In/Out", domain: "simpleinout.com", category: "hof" });
for (const it of fixed) if (!existsSync(root + it.src)) throw new Error("Missing " + it.src);
writeFileSync(root + "data/gallery.json", JSON.stringify(fixed, null, 1));

console.log("normalised:", clean.length, "orgs,", clean.filter((o) => o.first).length, "first-ever,",
  clean.filter((o) => o.top).length, "top,", countries.filter((c) => c.lat !== null).length, "mapped countries,", fixed.length, "gallery items");
