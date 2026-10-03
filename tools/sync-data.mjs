// Validates data/orgs.json, recomputes the country counts and rewrites the file in a stable,
// easy to edit layout (one organization per line). Run after adding or editing organizations:
//   npm run data
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const file = root + "data/orgs.json";
const d = JSON.parse(readFileSync(file, "utf8"));
const RECOGNITION = ["hof", "swag", "cert", "letter", "cve", "ack"];
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
  if (/[–—]/.test(o.name)) errors.push(`${where}: contains a long dash`);
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
${d.orgs.map(({ domain, name, sector, country, first, top, recognition }) => line({ domain, name, sector, country, first, top, recognition })).join(",\n")}
]
}
`;
writeFileSync(file, out);
const mapped = d.countries.filter((c) => c.lat !== null && c.count).length;
console.log(`data: ${d.orgs.length} organizations, ${mapped} countries on the map, ${d.orgs.filter((o) => o.first).length} first researcher, ${d.prestige.length} top names`);
