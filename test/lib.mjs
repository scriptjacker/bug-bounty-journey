// Shared pieces for the test suite: a static server for the site, a browser that survives
// a pinned Playwright, the site's own data, and a scorekeeper that fails loudly.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { launch } from "../tools/launch-browser.mjs";

export { launch };

export const root = new URL("..", import.meta.url).pathname;
export const PAGES = ["/", "/gallery.html", "/recognition.html", "/404.html"];

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png",
  ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2", ".pdf": "application/pdf",
  ".webmanifest": "application/manifest+json", ".txt": "text/plain",
};

// Serves the repository root the way the host does, including / to index.html, which the
// 404 page relies on because every link on it is root absolute.
export function serve() {
  const server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    if (path.endsWith("/")) path += "index.html";
    try {
      const body = await readFile(join(root, path));
      res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () =>
    ok({ base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
}

const json = (f) => JSON.parse(readFileSync(join(root, f), "utf8"));
export const data = { orgs: json("data/orgs.json"), gallery: json("data/gallery.json"), cases: json("data/cases.json") };

let passed = 0;
let failed = 0;

export function check(ok, name, detail = "") {
  if (ok) {
    passed++;
    console.log(`  pass  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail === "" ? "" : `  (got ${detail})`}`);
  }
}

// A group that throws, say on a selector that no longer exists, counts as one failure and the
// rest of the suite still runs, so one broken page cannot hide the state of the others.
export async function group(title, fn) {
  console.log(`\n${title}`);
  try {
    await fn();
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${title} stopped: ${String(err.message).split("\n")[0]}`);
  }
}

// Exit non zero on any failure and on a crash. A suite that dies quietly must never be
// mistaken for a suite that passed.
export async function run(main) {
  try {
    await main();
  } catch (err) {
    console.error(`\nCRASHED: ${err.stack || err}`);
    process.exit(2);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
