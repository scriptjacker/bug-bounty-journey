// Shared behaviour for every page. Heavier pieces (globe, search palette) load on demand.
// Homepage only effects live in home.js.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/* ---------- Small helpers ---------- */
let toastTimer;
export function toast(message) {
  const el = $("[data-toast]");
  if (!el) return;
  el.textContent = message;
  el.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 2200);
}

export async function copy(text, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = Object.assign(document.createElement("textarea"), { value: text });
    t.setAttribute("readonly", "");
    t.className = "sr-only";
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  toast(label);
}

/* ---------- Theme ---------- */
export function setTheme(theme, persist = true) {
  root.setAttribute("data-theme", theme);
  if (persist) { try { localStorage.setItem("theme", theme); } catch {} }
  document.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}
export const toggleTheme = () => setTheme(root.dataset.theme === "light" ? "dark" : "light");
$$("[data-theme-toggle]").forEach((b) => b.addEventListener("click", toggleTheme));
matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  let stored = null;
  try { stored = localStorage.getItem("theme"); } catch {}
  if (!stored) setTheme(e.matches ? "light" : "dark", false);
});

/* ---------- Keyboard hint and year ---------- */
$$("[data-kbd]").forEach((k) => (k.textContent = isMac ? "⌘ K" : "Ctrl K"));
$$("[data-year]").forEach((y) => (y.textContent = new Date().getFullYear()));

/* ---------- Nav: border on scroll, mobile menu, active section ---------- */
const nav = $(".nav");
if (nav) {
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;height:8px;width:1px;pointer-events:none";
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);
}

const menu = $("#mobile-menu");
const menuBtn = $("[data-menu-toggle]");
if (menu && menuBtn) {
  menu.hidden = false;
  menu.inert = true;
  const setMenu = (open) => {
    menu.classList.toggle("is-open", open);
    nav?.classList.toggle("is-solid", open);
    menu.inert = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    const use = menuBtn.querySelector("use");
    use.setAttribute("href", use.getAttribute("href").replace(/#.*$/, `#i-${open ? "x" : "list"}`));
    document.body.style.overflow = open ? "hidden" : "";
  };
  menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); } });
  matchMedia("(min-width: 1024px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });
}

const navLinks = $$('.nav__links a[href^="#"]');
if (navLinks.length) {
  const map = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
  const seen = new Map();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
    let best = null, ratio = 0;
    for (const [id, r] of seen) if (r > ratio) { best = id; ratio = r; }
    navLinks.forEach((a) => a.removeAttribute("aria-current"));
    if (best && map.has(best)) map.get(best).setAttribute("aria-current", "true");
  }, { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.01, 0.2, 0.5] });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

/* ---------- Entrance and scroll reveals ---------- */
$$("[data-enter]").forEach((el) => el.style.setProperty("--d", el.dataset.d || 0));
const ready = () => requestAnimationFrame(() => root.classList.add("is-ready"));
Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 700))]).then(ready);

const revealables = $$("[data-reveal]");
if (reduceMotion.matches || !("IntersectionObserver" in window)) {
  revealables.forEach((el) => el.classList.add("is-in"));
} else {
  const groups = new Map();
  revealables.forEach((el) => {
    const list = groups.get(el.parentElement) || [];
    list.push(el);
    groups.set(el.parentElement, list);
  });
  groups.forEach((list) => list.forEach((el, i) => el.style.setProperty("--i", Math.min(i, 6))));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  revealables.forEach((el) => io.observe(el));
}

/* ---------- Counters ---------- */
const counters = $$("[data-count]");
if (counters.length && !reduceMotion.matches) {
  const fmt = new Intl.NumberFormat("en-US");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target, end = +el.dataset.count, start = performance.now(), dur = 1500;
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        el.textContent = fmt.format(Math.round(end * (1 - Math.pow(1 - p, 4))));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  counters.forEach((c) => io.observe(c));
}

/* ---------- Copy buttons ---------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-copy]");
  if (b) copy(b.dataset.copy, "Email copied to clipboard");
});

/* ---------- Globe (loads only when it gets close to the viewport) ---------- */
const globe = $("[data-globe]");
if (globe) {
  // Static image fallback, matched to the theme, for browsers that cannot run the WebGL globe well.
  const still = $(".globe__fallback img", globe);
  const darkSrc = still?.getAttribute("src");
  const syncStill = () => { if (still) still.src = root.dataset.theme === "light" ? still.dataset.lightSrc : darkSrc; };
  syncStill();
  document.addEventListener("themechange", syncStill);
  const start = () => import("./globe.js?v=601d5892").then((m) => m.mountGlobe(globe)).catch((err) => {
    console.warn("Globe unavailable:", err);
    globe.classList.add("no-webgl");
  });
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    ("requestIdleCallback" in window ? requestIdleCallback : (f) => setTimeout(f, 120))(start, { timeout: 800 });
  }, { rootMargin: "600px 0px" });
  io.observe(globe);
}

/* ---------- Command palette ---------- */
let palette;
const openPalette = async (query = "") => {
  palette ??= await import("./palette.js?v=601d5892");
  palette.open(query);
};
$$("[data-palette-open]").forEach((b) => b.addEventListener("click", () => openPalette()));
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
  else if (e.key === "/" && !e.target.closest("input, textarea, [contenteditable]")) { e.preventDefault(); openPalette(); }
});
