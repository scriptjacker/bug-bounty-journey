// Stamps every stylesheet, script, icon sprite and CV link with ?v=<hash of their contents>, so a
// browser or CDN that still holds an older copy can never mix it with new pages. Run it last, after
// any change to assets/css, assets/js, assets/icons.svg or the CV:  npm run stamp
// One shared version keeps module URLs identical everywhere (main.js is imported by palette.js
// and loaded by every page), so each module is only ever instantiated once.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("..", import.meta.url).pathname;
const PAGES = ["index.html", "gallery.html", "recognition.html", "404.html"];
const JS = readdirSync(root + "assets/js").filter((f) => f.endsWith(".js")).map((f) => `assets/js/${f}`);
const HASHED = ["assets/css/site.css", "assets/icons.svg", "Parth-Narula-CV.pdf", ...JS];

const strip = (s) => s.replace(/\?v=[0-9a-f]{8}/g, "");
const hash = createHash("sha256");
for (const f of HASHED.sort()) hash.update(f).update(f.endsWith(".pdf") ? readFileSync(root + f) : strip(readFileSync(root + f, "utf8")));
const v = hash.digest("hex").slice(0, 8);

const stamp = (s) => strip(s)
  .replace(/(assets\/css\/site\.css)/g, `$1?v=${v}`)
  .replace(/(assets\/js\/[\w-]+\.js)/g, `$1?v=${v}`)
  .replace(/(icons\.svg)(?=#)/g, `$1?v=${v}`)
  .replace(/(Parth-Narula-CV\.pdf)/g, `$1?v=${v}`)
  .replace(/((?:from |import\()\s*["']\.\/[\w-]+\.js)(["'])/g, `$1?v=${v}$2`);

let changed = 0;
for (const f of [...PAGES, ...JS]) {
  const before = readFileSync(root + f, "utf8");
  const after = stamp(before);
  if (after !== before) { writeFileSync(root + f, after); changed++; }
}
console.log(`version ${v}: ${changed} files updated`);
