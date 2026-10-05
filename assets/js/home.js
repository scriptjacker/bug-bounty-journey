// Homepage only: the lit wall of Hall of Fame screenshots, the scope panels, the sideways case files,
// the drifting name lists and the desk of swag you can pick up. Everything here is progressive:
// without JavaScript the page still reads top to bottom.
import { WALL } from "./wall-data.js?v=601d5892";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const wide = matchMedia("(min-width: 1024px)");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const idle = (f) => ("requestIdleCallback" in window ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 300));

/* ---------- Hero: wall of screenshots ---------- */
// Each column is one canvas with its screenshots painted top to bottom, twice, so the drift loops without
// a seam. A canvas is cheaper to move than dozens of images, and as decoration it never competes with the
// real content for the browser's attention.
const hero = $("[data-hero]");
const plane = $("[data-wall]");
if (hero && plane) {
  const GAP = 20, W = 240;
  const fill = () => {
    const visible = matchMedia("(max-width: 899px)").matches ? 4 : 6;
    const perCol = visible === 4 ? 4 : 6;
    const copies = reduceMotion.matches ? 1 : 2;
    $$(".hero__col", plane).slice(0, visible).forEach((col, c) => {
      const set = WALL.filter((_, i) => i % visible === c).slice(0, perCol);
      const setH = set.reduce((sum, [, h]) => sum + h + GAP, 0);
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = setH * copies;
      const ctx = canvas.getContext("2d");
      col.appendChild(canvas);
      let y = 0, pending = set.length;
      set.forEach(([name, h]) => {
        const top = y;
        y += h + GAP;
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          for (let k = 0; k < copies; k++) {
            ctx.save();
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(0, top + k * setH, W, h, 4);
            else ctx.rect(0, top + k * setH, W, h);
            ctx.clip();
            ctx.drawImage(img, 0, top + k * setH, W, h);
            ctx.restore();
          }
          if (--pending === 0) canvas.classList.add("is-loaded");
        };
        img.onerror = () => { if (--pending === 0) canvas.classList.add("is-loaded"); };
        img.src = `assets/img/wall/${name}.webp`;
      });
    });
  };
  // The wall is decoration, so it waits until the page has loaded and the browser is idle.
  if (document.readyState === "complete") idle(fill);
  else addEventListener("load", () => idle(fill), { once: true });

  // Spotlight. Follows a fine pointer; otherwise it wanders slowly on its own.
  const light = $("[data-light]");
  let x = innerWidth * 0.72, y = hero.offsetHeight * 0.48, tx = x, ty = y, lastMove = -1e9, raf = 0, visible = true;
  const place = () => { light.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; };
  const tick = (now) => {
    raf = 0;
    if (!visible || reduceMotion.matches) return;
    if (now - lastMove > 2600) {
      const w = hero.offsetWidth, h = hero.offsetHeight, t = now / 1000;
      const mobile = w < 900;
      tx = w * (mobile ? 0.5 + 0.32 * Math.sin(t * 0.33) : 0.7 + 0.2 * Math.sin(t * 0.21));
      ty = h * (mobile ? 0.42 + 0.3 * Math.sin(t * 0.27 + 1.3) : 0.48 + 0.3 * Math.sin(t * 0.29 + 1.1));
    }
    x += (tx - x) * 0.085;
    y += (ty - y) * 0.085;
    place();
    raf = requestAnimationFrame(tick);
  };
  const run = () => { if (!raf) raf = requestAnimationFrame(tick); };
  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = hero.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    lastMove = performance.now();
    run();
  });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    hero.classList.toggle("is-paused", !visible);
    if (visible) run();
  }).observe(hero);
  place();
  run();
}

/* ---------- Scope: five panels, one open at a time ---------- */
const scope = $("[data-scope]");
if (scope) {
  const items = $$(".scope__item", scope);
  const open = (item, focus = false) => {
    items.forEach((it) => {
      const on = it === item;
      it.classList.toggle("is-open", on);
      const btn = $(".scope__btn", it);
      btn.setAttribute("aria-expanded", String(on));
      $(".scope__body", it).hidden = !on;
      if (on && focus) btn.focus();
    });
  };
  items.forEach((item) => {
    const btn = $(".scope__btn", item);
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      // On small screens a second tap closes the panel; on wide screens one panel always stays open.
      if (isOpen && !wide.matches) {
        item.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        $(".scope__body", item).hidden = true;
      } else open(item);
    });
    let timer;
    item.addEventListener("mouseenter", () => {
      if (!wide.matches || !finePointer.matches) return;
      timer = setTimeout(() => open(item), 140);
    });
    item.addEventListener("mouseleave", () => clearTimeout(timer));
  });
}

/* ---------- Case files: sideways scroll pinned to the page on wide screens ---------- */
const cases = $("[data-cases]");
if (cases) {
  const pin = $(".cases__pin", cases);
  const viewport = $(".cases__viewport", cases);
  const track = $("[data-cases-track]", cases);
  const cards = $$(".case", track);
  const count = $("[data-cases-count]", cases);
  const bar = $("[data-cases-bar]", cases);
  const mq = matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
  let distance = 0, raf = 0, active = false;
  const pad = (n) => String(n).padStart(2, "0");

  const update = () => {
    raf = 0;
    if (!active) return;
    const top = cases.getBoundingClientRect().top;
    const p = distance ? clamp(-top / distance, 0, 1) : 0;
    const shift = p * distance;
    track.style.transform = `translate3d(${(-shift).toFixed(1)}px, 0, 0)`;
    bar.style.transform = `scaleX(${p.toFixed(3)})`;
    // Count how many cards are fully on screen, not a share of the scroll: several are visible at
    // once on a wide screen, so a share of the scroll names a card that is nowhere near the viewport.
    const base = cards[0].offsetLeft;
    const seen = cards.filter((c) => c.offsetLeft - base + c.offsetWidth <= shift + viewport.clientWidth + 8).length;
    count.textContent = `${pad(Math.max(1, seen))} / ${pad(cards.length)}`;
  };
  const measure = () => {
    if (!active) return;
    track.style.transform = "";
    distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    cases.style.height = `${pin.offsetHeight + distance}px`;
    update();
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  const setMode = () => {
    active = mq.matches;
    cases.classList.toggle("is-pinned", active);
    if (active) { measure(); addEventListener("scroll", onScroll, { passive: true }); }
    else {
      removeEventListener("scroll", onScroll);
      cases.style.removeProperty("height");
      track.style.removeProperty("transform");
    }
  };
  mq.addEventListener("change", setMode);
  addEventListener("resize", () => { if (active) measure(); });
  document.fonts?.ready.then(() => active && measure());
  // Keyboard users: when a link inside a card gets focus, scroll the page to that card instead of
  // letting the browser scroll the clipped container sideways.
  track.addEventListener("focusin", (e) => {
    if (!active) return;
    pin.scrollLeft = 0;
    viewport.scrollLeft = 0;
    const i = cards.indexOf(e.target.closest(".case"));
    if (i < 0) return;
    const start = cases.getBoundingClientRect().top + scrollY;
    const cardLeft = cards[i].offsetLeft - cards[0].offsetLeft;
    scrollTo({ top: start + clamp(cardLeft, 0, distance), behavior: "instant" });
  });
  setMode();
}

/* ---------- First in: pause the drifting rows while they are off screen ---------- */
const first = $("#first");
if (first) new IntersectionObserver(([e]) => first.classList.toggle("is-paused", !e.isIntersecting)).observe(first);

/* ---------- Names: one long line that loops ---------- */
const names = $("[data-names]");
if (names && !reduceMotion.matches) {
  const clone = names.firstElementChild.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  names.appendChild(clone);
  names.classList.add("is-looping");
}

/* ---------- Proof desk: pick up the polaroids and move them around ---------- */
const desk = $("[data-desk]");
if (desk) {
  const deskMode = matchMedia("(min-width: 900px)");
  let z = 10;
  $$(".polaroid", desk).forEach((card) => {
    let startX = 0, startY = 0, baseX = 0, baseY = 0, moved = false, id = null;
    card.addEventListener("pointerdown", (e) => {
      if (!deskMode.matches || e.button !== 0) return;
      id = e.pointerId;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      baseX = parseFloat(card.style.getPropertyValue("--dx")) || 0;
      baseY = parseFloat(card.style.getPropertyValue("--dy")) || 0;
      card.style.zIndex = ++z;
    });
    card.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) { moved = true; card.setPointerCapture(id); card.classList.add("is-dragging"); }
      // Keep at least part of the photo on the desk.
      const d = desk.getBoundingClientRect(), c = card.offsetLeft, t = card.offsetTop;
      const nx = clamp(baseX + dx, -c - card.offsetWidth * 0.5, d.width - c - card.offsetWidth * 0.5);
      const ny = clamp(baseY + dy, -t - card.offsetHeight * 0.4, d.height - t - card.offsetHeight * 0.4);
      card.style.setProperty("--dx", `${nx}px`);
      card.style.setProperty("--dy", `${ny}px`);
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      card.classList.remove("is-dragging");
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
    // A drag is not a click: only open the archive when the photo was not moved.
    card.addEventListener("click", (e) => { if (moved) { e.preventDefault(); moved = false; } });
    card.addEventListener("dragstart", (e) => e.preventDefault());
  });
}

/* ---------- Verify mode: the source behind every claim (verify.js loads on first use) ---------- */
let verifyMod;
const loadVerify = async () => (verifyMod ??= await import("./verify.js?v=601d5892"));
const toggles = $$("[data-verify-toggle]");
toggles.forEach((t) => {
  if (t.tagName === "A") t.setAttribute("role", "button");
  t.setAttribute("aria-pressed", "false");
  t.addEventListener("click", async (e) => { e.preventDefault(); (await loadVerify()).toggleVerify(); });
});
const fab = $(".verify-fab");
if (fab && hero) {
  fab.hidden = false;
  new IntersectionObserver(([e]) => fab.classList.toggle("is-shown", !e.isIntersecting)).observe(hero);
}
let verifyAtStart = new URLSearchParams(location.search).has("verify");
try { verifyAtStart ||= sessionStorage.getItem("verify") === "1"; } catch {}
if (verifyAtStart) loadVerify().then((m) => m.setVerify(true));

/* ---------- Case replay (replay.js loads on first use) ---------- */
let replayMod;
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-replay]");
  if (!b) return;
  replayMod ??= await import("./replay.js?v=601d5892");
  replayMod.open(b.dataset.replay, b);
});
