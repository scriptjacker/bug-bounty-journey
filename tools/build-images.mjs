// Builds web-sized WebP versions of every proof image listed in data/gallery.json.
// Originals stay untouched in assets/{hof,letters,certs,swag}. Output goes to assets/img/.
// Re-run after adding new images:  npm run images
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const file = root + "data/gallery.json";
const items = JSON.parse(readFileSync(file, "utf8"));
const SIZES = [{ w: 480, q: 70 }, { w: 1400, q: 80 }];

export const variant = (src, w) => src.replace(/^assets\/([^/]+)\/(.+)\.[a-z]+$/i, `assets/img/$1/$2-${w}.webp`);

let built = 0, skipped = 0;
async function run(item) {
  const input = root + item.src;
  const meta = await sharp(input).rotate().metadata();
  const portrait = (meta.orientation ?? 1) >= 5;
  item.w = portrait ? meta.height : meta.width;
  item.h = portrait ? meta.width : meta.height;
  for (const { w, q } of SIZES) {
    const out = root + variant(item.src, w);
    if (existsSync(out) && statSync(out).mtimeMs > statSync(input).mtimeMs) { skipped++; continue; }
    mkdirSync(dirname(out), { recursive: true });
    await sharp(input).rotate().resize({ width: Math.min(w, item.w), withoutEnlargement: true })
      .webp({ quality: q, effort: 5, smartSubsample: true }).toFile(out);
    built++;
  }
}

const queue = [...items];
await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await run(queue.shift()); }));
writeFileSync(file, JSON.stringify(items, null, 1));
console.log(`images: ${built} built, ${skipped} up to date, ${items.length} items`);
