// Writes the organizations directory straight into recognition.html between marker comments,
// so the page works without JavaScript, search engines see every name and nothing shifts on load.
// Run after editing data/orgs.json:  npm run prerender
import { readFileSync, writeFileSync } from "node:fs";
import { prepare, filtersHTML, rowHTML, top50HTML, resultText } from "../assets/js/directory-render.js";

const root = new URL("..", import.meta.url).pathname;
const d = prepare(JSON.parse(readFileSync(root + "data/orgs.json", "utf8")), JSON.parse(readFileSync(root + "data/gallery.json", "utf8")));
let html = readFileSync(root + "recognition.html", "utf8");
const put = (name, content) => {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(html)) throw new Error(`Marker ${name} missing in recognition.html`);
  html = html.replace(re, `$1${content}$2`);
};
put("top50", top50HTML(d));
put("filters", filtersHTML(d, "all"));
put("result", resultText(d.orgs.length, d.orgs.length));
put("rows", d.orgs.map((o) => rowHTML(o, d)).join("\n"));
writeFileSync(root + "recognition.html", html);
console.log("prerendered:", d.prestige.length, "top names,", d.orgs.length, "rows");
