// Builds the self-hosted fonts and the SVG icon sprite from Phosphor Icons (MIT).
// Run after changing the icon list or the fonts:  npm run vendor
// Fonts are cut down to the characters the site uses when pyftsubset is installed
// (pip install fonttools brotli). Without it the full files are copied, which also works.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const nm = root + "node_modules/";
mkdirSync(root + "assets/fonts", { recursive: true });

// Basic Latin, Latin-1, Latin Extended-A, curly quotes, bullet, ellipsis, arrows and a few symbols.
// Long dashes are left out on purpose.
const UNICODES = "U+0020-007E,U+00A0-017F,U+2018-201E,U+2022,U+2026,U+2032-2033,U+2190-2199,U+2212,U+2715,U+2713";
const FONTS = [
  ["@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2", "archivo.woff2"],
  ["@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", "jetbrains-mono.woff2"],
  ["@fontsource/big-shoulders-stencil-display/files/big-shoulders-stencil-display-latin-800-normal.woff2", "stencil.woff2"],
];
for (const [src, name] of FONTS) {
  const out = root + "assets/fonts/" + name;
  try {
    execFileSync("pyftsubset", [nm + src, `--unicodes=${UNICODES}`, "--flavor=woff2", "--layout-features=kern,liga,calt,tnum,case,ss01", `--output-file=${out}`], { stdio: "ignore" });
  } catch {
    copyFileSync(nm + src, out);
  }
}

const ICONS = [
  "arrow-up-right", "arrow-right", "arrow-left", "arrow-up", "download-simple", "calendar-dots", "envelope-simple",
  "copy", "check", "linkedin-logo", "github-logo", "x-logo", "medium-logo", "sun", "moon", "magnifying-glass",
  "command", "list", "x", "shield-check", "bug", "key", "lock-key-open", "puzzle-piece", "plugs-connected",
  "device-mobile", "robot", "network", "trophy", "certificate", "medal", "gift", "seal-check", "graduation-cap",
  "briefcase", "quotes", "caret-left", "caret-right", "arrows-out", "user-switch", "fingerprint", "article",
  "flag", "terminal-window", "globe-hemisphere-west", "files", "identification-card", "pen-nib",
  "stamp", "eye", "eye-slash", "cloud", "android-logo", "brackets-curly", "detective", "crosshair", "hand-grabbing",
  "file-text", "link", "arrow-square-out", "warning", "browser", "flag-banner", "target", "hash", "push-pin", "lock-key",
];
const symbols = ICONS.map((name) => {
  const svg = readFileSync(`${nm}@phosphor-icons/core/assets/regular/${name}.svg`, "utf8");
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<rect width="256" height="256" fill="none"\/>/, "");
  return `<symbol id="i-${name}" viewBox="0 0 256 256">${inner}</symbol>`;
});
writeFileSync(root + "assets/icons.svg",
  `<svg xmlns="http://www.w3.org/2000/svg"><!-- Phosphor Icons (MIT) https://phosphoricons.com -->${symbols.join("")}</svg>\n`);
console.log("fonts built, sprite icons:", ICONS.length);
