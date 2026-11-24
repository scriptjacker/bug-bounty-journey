// Accessibility checks with axe-core on every page, in both themes:  npm run test:a11y
// page.evaluate() runs axe's own published script inside the test browser. It is Playwright's
// call, not JavaScript's eval(), and no string from the page is ever executed.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { serve, launch, check, group, run, PAGES } from "./lib.mjs";

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

await run(async () => {
  const { base, close } = await serve();
  const browser = await launch();
  for (const theme of ["dark", "light"]) {
    await group(`${theme} theme`, async () => {
      for (const path of PAGES) {
        // Reduced motion here so every section has finished revealing before axe reads
        // contrast. Text caught mid fade would be judged at partial opacity.
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(base + path, { waitUntil: "networkidle" });
        await page.waitForTimeout(600);
        await page.addScriptTag({ content: axeSource });
        const found = await page.evaluate(async () =>
          (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => `${v.id} x${v.nodes.length}`));
        check(found.length === 0, `no violations on ${path}`, found.join(", "));
        await page.close();
      }
    });
  }
  await browser.close();
  close();
});
