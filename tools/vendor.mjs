// Copies self-hosted fonts and builds the SVG icon sprite from Phosphor Icons (MIT).
// Run after changing the icon list:  npm run vendor
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const nm = root + "node_modules/";
mkdirSync(root + "assets/fonts", { recursive: true });
copyFileSync(nm + "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2", root + "assets/fonts/geist.woff2");
copyFileSync(nm + "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2", root + "assets/fonts/geist-mono.woff2");

const ICONS = [
  "arrow-up-right", "arrow-right", "arrow-left", "arrow-up", "download-simple", "calendar-dots", "envelope-simple",
  "copy", "check", "linkedin-logo", "github-logo", "x-logo", "medium-logo", "sun", "moon", "magnifying-glass",
  "command", "list", "x", "shield-check", "bug", "key", "lock-key-open", "puzzle-piece", "plugs-connected",
  "device-mobile", "robot", "network", "trophy", "certificate", "medal", "gift", "seal-check", "graduation-cap",
  "briefcase", "quotes", "caret-left", "caret-right", "arrows-out", "user-switch", "fingerprint", "article",
  "flag", "terminal-window", "globe-hemisphere-west", "files", "identification-card", "phone", "pen-nib",
];
const symbols = ICONS.map((name) => {
  const svg = readFileSync(`${nm}@phosphor-icons/core/assets/regular/${name}.svg`, "utf8");
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<rect width="256" height="256" fill="none"\/>/, "");
  return `<symbol id="i-${name}" viewBox="0 0 256 256">${inner}</symbol>`;
});
writeFileSync(root + "assets/icons.svg",
  `<svg xmlns="http://www.w3.org/2000/svg"><!-- Phosphor Icons (MIT) https://phosphoricons.com -->${symbols.join("")}</svg>\n`);
console.log("fonts copied, sprite icons:", ICONS.length);
