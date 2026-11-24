// Builds the CV:  npm run cv
//   - Parth-Narula-CV.pdf at the site root, the one the portfolio links to
//   - cv-out/: the same CV as Word, plus the client version (PDF and Word) when
//     private/cv-clients.json exists. cv-out/ and private/ are gitignored, so the client
//     version never reaches the public repository.
// Then run  python3 tools/cv/ats_check.py  to read every file back the way a parser would.
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { buildCv, loadPrivate } from "./content.mjs";
import { renderHtml } from "./render-html.mjs";
import { launch } from "../launch-browser.mjs";

const root = new URL("../..", import.meta.url).pathname;
const out = join(root, "cv-out");
mkdirSync(out, { recursive: true });

const priv = loadPrivate();
const versions = [buildCv({ variant: "public" })];
if (priv) versions.push(buildCv({ variant: "clients", priv }));
else console.log("private/cv-clients.json not found, building the public CV only");

export async function buildPdfs(browser) {
  for (const cv of versions) {
    const page = await browser.newPage();
    await page.setContent(renderHtml(cv), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = join(out, `${cv.file}.pdf`);
    await page.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true, tagged: true, outline: false });
    await page.close();
    writeFileSync(join(out, `${cv.file}.json`), JSON.stringify(cv, null, 1));
    execFileSync("python3", [join(root, "tools/cv/render_docx.py"), join(out, `${cv.file}.json`), join(out, `${cv.file}.docx`)], { stdio: "inherit" });
    if (cv.file === "Parth-Narula-CV") copyFileSync(pdf, join(root, "Parth-Narula-CV.pdf"));
    console.log(`built ${cv.file}.pdf and .docx`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const browser = await launch();
  await buildPdfs(browser);
  await browser.close();
}
