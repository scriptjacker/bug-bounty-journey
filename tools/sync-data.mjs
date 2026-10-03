// Validates data/orgs.json, recomputes the country counts and rewrites the file in a stable,
// easy to edit layout (one organization per line). Run after adding or editing organizations:
//   npm run data
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const file = root + "data/orgs.json";
const d = JSON.parse(readFileSync(file, "utf8"));
const RECOGNITION = ["hof", "swag", "cert", "letter", "cve", "ack", "gift"];
const errors = [];

const seen = new Set();
for (const o of d.orgs) {
  const where = `${o.name} (${o.domain})`;
  if (!o.domain || !o.name) errors.push(`missing name or domain: ${JSON.stringify(o)}`);
  if (seen.has(o.domain)) errors.push(`duplicate domain: ${o.domain}`);
  seen.add(o.domain);
  if (!d.sectors[o.sector]) errors.push(`${where}: unknown sector "${o.sector}" (use one of ${Object.keys(d.sectors).join(", ")})`);
  if (!d.countries.some((c) => c.code === o.country)) errors.push(`${where}: unknown country "${o.country}", add it to "countries" first`);
  for (const r of o.recognition) if (!RECOGNITION.includes(r)) errors.push(`${where}: unknown recognition "${r}" (use ${RECOGNITION.join(", ")})`);
  if (/[\u2013\u2014]/.test(o.name + (o.note || "") + (o.bug || ""))) errors.push(`${where}: contains a long dash`);
  if (o.url && !/^https:\/\//.test(o.url)) errors.push(`${where}: url must start with https://`);
  o.first = !!o.first;
  o.top = d.prestige.some((p) => p.domain === o.domain);
}
for (const p of d.prestige) if (!seen.has(p.domain)) errors.push(`prestige entry ${p.domain} is not in orgs`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

d.prestige.forEach((p, i) => (p.rank = i + 1));
for (const c of d.countries) c.count = d.orgs.filter((o) => o.country === c.code).length;
d.countries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
d.orgs.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

const line = (v) => JSON.stringify(v);
const out = `{
"sectors": ${line(d.sectors)},
"countries": [
${d.countries.map(line).join(",\n")}
],
"prestige": [
${d.prestige.map(line).join(",\n")}
],
"orgs": [
${d.orgs.map(({ domain, name, sector, country, first, top, recognition, url, note, bug }) => line({ domain, name, sector, country, first, top, recognition, url, note, bug })).join(",\n")}
]
}
`;
writeFileSync(file, out);

// Hall of Fame screenshots in the gallery inherit the public page link of their organization,
// so every screenshot can be checked against the live source.
const galleryFile = root + "data/gallery.json";
const gallery = JSON.parse(readFileSync(galleryFile, "utf8"));
const urlOf = new Map(d.orgs.filter((o) => o.url).map((o) => [o.domain, o.url]));
for (const g of gallery) {
  if (g.category === "hof" && urlOf.has(g.domain)) g.url = urlOf.get(g.domain);
  else delete g.url;
  const fromOrg = ["hof", "letter", "cert", "swag"].includes(g.category); // "award", "credential" and "talk" are my own records
  if (fromOrg && !d.orgs.some((o) => o.domain === g.domain)) console.warn(`gallery: ${g.src} points to ${g.domain}, which is not in orgs`);
}
writeFileSync(galleryFile, JSON.stringify(gallery, null, 1));
const mapped = d.countries.filter((c) => c.lat !== null && c.count).length;
console.log(`data: ${d.orgs.length} organizations, ${mapped} countries on the map, ${d.orgs.filter((o) => o.first).length} first researcher, ${d.prestige.length} top names, ${urlOf.size} public pages`);
