// One way to start Chromium for every script. A pinned Playwright can expect a different
// browser build than the one installed, as in some cloud containers, so fall back to an
// installed Chromium (CHROMIUM_PATH, or /opt/pw-browsers/chromium) rather than download one.
import { existsSync } from "node:fs";
import { chromium } from "playwright";

export async function launch(options = {}) {
  try {
    return await chromium.launch(options);
  } catch (err) {
    for (const p of [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"]) {
      if (p && existsSync(p)) return chromium.launch({ ...options, executablePath: p });
    }
    throw err;
  }
}
