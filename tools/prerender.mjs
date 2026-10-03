// Writes data driven HTML into the pages so they work without JavaScript, search engines see
// every name and nothing shifts on load. Run after editing data/*.json:  npm run prerender
//   recognition.html  the top names, filters and the full directory table
//   index.html        every count, the sector tiles, top countries and the "First in" cards
//   gallery.html      the filter counts
import { readFileSync, writeFileSync } from "node:fs";
import { prepare, filtersHTML, rowHTML, top50HTML, resultText, siteStats, sectorTilesHTML, topCountriesHTML, firstsHTML, sortOrgs } from "../assets/js/directory-render.js";

const root = new URL("..", import.meta.url).pathname;
const gallery = JSON.parse(readFileSync(root + "data/gallery.json", "utf8"));
const d = prepare(JSON.parse(readFileSync(root + "data/orgs.json", "utf8")), gallery);
const s = siteStats(d, gallery);

function page(name, fn) {
  let html = readFileSync(root + name, "utf8");
  const api = {
    block(marker, content) {
      const re = new RegExp(`(<!-- ${marker}:start -->)[\\s\\S]*?(<!-- ${marker}:end -->)`);
      if (!re.test(html)) throw new Error(`${name}: marker ${marker} missing`);
      html = html.replace(re, `$1${content}$2`);
    },
    // <tag ... data-stat="key">value</tag>, plus data-count="value" on the same tag when present
    stat(key, value) {
      const re = new RegExp(`(<[^>]*data-stat="${key}"[^>]*>)[^<]*(<)`, "g");
      if (!re.test(html)) throw new Error(`${name}: data-stat="${key}" missing`);
      html = html.replace(re, (m, open, close) => open.replace(/data-count="\d+"/, `data-count="${value}"`) + value.toLocaleString("en-US") + close);
    },
    count(key, value) {
      const re = new RegExp(`(data-count-for="${key}">)[^<]*(<)`);
      html = html.replace(re, `$1${value}$2`);
    },
  };
  fn(api);
  writeFileSync(root + name, html);
}

page("recognition.html", (p) => {
  p.block("top50", top50HTML(d));
  p.block("filters", filtersHTML(d, "all"));
  p.block("result", resultText(d.orgs.length, d.orgs.length));
  p.block("rows", sortOrgs(d.orgs, "first").map((o) => rowHTML(o, d)).join("\n"));
  for (const key of ["listed", "public", "proofed", "first"]) p.stat(key, s[key]);
});

page("index.html", (p) => {
  for (const key of ["listed", "countries", "first", "public", "proofed", "swag", "galleryHof", "galleryLetters", "gallerySwag"]) p.stat(key, s[key]);
  p.block("sectors", sectorTilesHTML(s));
  p.block("countries", topCountriesHTML(s));
  p.block("firsts", firstsHTML(d));
});

page("gallery.html", (p) => {
  p.count("all", s.galleryAll);
  p.count("hof", s.galleryHof);
  p.count("letter", s.galleryLetters);
  p.count("swag", s.gallerySwag);
});

console.log(`prerendered: ${s.listed} organizations, ${s.countries} countries, ${d.prestige.length} top names, ${s.galleryAll} gallery items`);
