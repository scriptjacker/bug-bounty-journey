// Renders brand assets: favicons, apple touch icon, manifest icons (from tools/templates/icon.svg.mjs),
// the social share image (assets/og.jpg) and the CV PDF. Run:  npm run assets
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { iconSVG } from "./templates/icon.svg.mjs";
import sharp from "sharp";

const root = new URL("..", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".json": "application/json", ".webp": "image/webp", ".png": "image/png" };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

// Icons, all from one SVG drawing so the favicon, app icons and touch icon always match.
const plain = Buffer.from(iconSVG());
const full = Buffer.from(iconSVG({ full: true }));
await writeFile(join(root, "favicon.svg"), iconSVG());
await sharp(plain, { density: 300 }).resize(512).png().toFile(join(root, "assets/icon-512.png"));
await sharp(plain, { density: 300 }).resize(192).png().toFile(join(root, "assets/icon-192.png"));
await sharp(full, { density: 300 }).resize(512).png().toFile(join(root, "assets/icon-maskable-512.png"));
await sharp(full, { density: 300 }).resize(180).png().toFile(join(root, "apple-touch-icon.png"));
execFileSync("convert", [join(root, "assets/icon-512.png"), "-define", "icon:auto-resize=48,32,16", join(root, "favicon.ico")]);

// Social share image
const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "dark" });
await og.goto(`${base}/tools/templates/og.html`, { waitUntil: "networkidle" });
await og.evaluate(() => document.fonts.ready);
await og.waitForTimeout(1500);
await sharp(await og.screenshot()).jpeg({ quality: 86, mozjpeg: true }).toFile(join(root, "assets/og.jpg"));
await og.close();

// Static globe for devices without a usable GPU (WebGL refuses software rendering there).
for (const theme of ["dark", "light"]) {
  const g = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });
  await g.goto(`${base}/tools/templates/globe.html?${theme}`, { waitUntil: "networkidle" });
  await g.waitForTimeout(3600);
  const png = await g.screenshot({ omitBackground: true });
  await sharp(png).resize(820).webp({ quality: 82, alphaQuality: 90 }).toFile(join(root, `assets/img/globe-${theme}.webp`));
  await g.close();
}

// CV
const cv = await browser.newPage();
await cv.goto(`${base}/tools/templates/cv.html`, { waitUntil: "networkidle" });
await cv.evaluate(() => document.fonts.ready);
await cv.pdf({ path: join(root, "Parth-Narula-CV.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true, tagged: true, outline: false });
await cv.close();

await browser.close();
server.close();
console.log("assets: icons, favicon.svg, og.jpg and CV built");
