// Renders brand assets with headless Chromium: favicons, apple touch icon, manifest icons,
// the social share image (assets/og.jpg) and the CV PDF. Run:  npm run assets
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import opentype from "opentype.js";
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

// Icons
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
await page.goto(`${base}/tools/templates/icon.html`);
await page.evaluate(() => document.fonts.ready);
const tile = page.locator(".tile");
await tile.screenshot({ path: join(root, "assets/icon-512.png"), omitBackground: true });
await page.evaluate(() => document.querySelector(".tile").classList.add("full"));
await tile.screenshot({ path: join(root, "assets/icon-maskable-512.png") });
await page.close();
execFileSync("convert", [join(root, "assets/icon-512.png"), "-resize", "192x192", join(root, "assets/icon-192.png")]);
execFileSync("convert", [join(root, "assets/icon-maskable-512.png"), "-resize", "180x180", join(root, "apple-touch-icon.png")]);
execFileSync("convert", [join(root, "assets/icon-512.png"), "-define", "icon:auto-resize=48,32,16", join(root, "favicon.ico")]);

// SVG favicon with real glyph outlines, so it looks the same without the web font.
const font = opentype.parse((await readFile(join(root, "node_modules/@fontsource/geist-mono/files/geist-mono-latin-700-normal.woff"))).buffer);
const size = 230, text = "PN";
const glyphs = font.getPath(text, 0, 0, size, { letterSpacing: -0.06 });
const box = glyphs.getBoundingBox();
const dx = 256 - (box.x1 + box.x2) / 2 - 6, dy = 256 - (box.y1 + box.y2) / 2;
const d = font.getPath(text, dx, dy, size, { letterSpacing: -0.06 }).toPathData(1);
await writeFile(join(root, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0f1215"/><path fill="#eceef1" d="${d}"/><circle cx="398" cy="378" r="22" fill="#3fdc9a"/></svg>\n`);

// Social share image
const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "dark" });
await og.goto(`${base}/tools/templates/og.html`, { waitUntil: "networkidle" });
await og.waitForTimeout(3600);
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
