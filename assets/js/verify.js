// Verify mode: every claim on the homepage gets a red box and a tag that links to its source.
// Claims are marked in the HTML with data-claim="short name" and, when a public source exists,
// data-src="url" plus data-src-label="what the source is". A claim without data-src is real but
// private, and its tag offers to send the proof by email instead.
const EMAIL = "parth.narula@scriptjacker.in";
const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ARROW = (base) => `<svg class="ic" aria-hidden="true"><use href="${base}#i-arrow-up-right"/></svg>`;

let bar, claims = [], current = -1, on = false;
const sprite = document.querySelector('use[href*="icons.svg"]')?.getAttribute("href").split("#")[0] || "assets/icons.svg";

function tagFor(el) {
  const name = el.dataset.claim;
  const src = el.dataset.src;
  const a = document.createElement("a");
  a.className = "claim-tag";
  if (src) {
    a.href = src;
    if (/^https?:/.test(src)) { a.target = "_blank"; a.rel = "noopener"; }
    a.innerHTML = `${esc(el.dataset.srcLabel || "Source")}${ARROW(sprite)}`;
    a.setAttribute("aria-label", `Source for ${name}: ${el.dataset.srcLabel || "source"}`);
  } else {
    el.classList.add("claim--private");
    a.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`Proof request: ${name}`)}`;
    a.textContent = "Proof on request";
    a.setAttribute("aria-label", `Ask for the proof of ${name} by email`);
  }
  return a;
}

function visible(el) {
  return !el.closest("[hidden]") && el.offsetParent !== null;
}

function buildBar() {
  bar = document.createElement("div");
  bar.className = "verify-bar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Verify mode");
  bar.innerHTML = `
    <span class="verify-bar__mode"><span class="verify-bar__box" aria-hidden="true"></span>Verify mode</span>
    <p class="verify-bar__text" aria-live="polite" data-vtext></p>
    <div class="verify-bar__nav">
      <button class="icon-btn" type="button" data-vstep="-1" aria-label="Previous claim"><svg class="ic" aria-hidden="true"><use href="${sprite}#i-arrow-left"/></svg></button>
      <button class="icon-btn" type="button" data-vstep="1" aria-label="Next claim"><svg class="ic" aria-hidden="true"><use href="${sprite}#i-arrow-right"/></svg></button>
      <button class="icon-btn" type="button" data-vclose aria-label="Turn off verify mode"><svg class="ic" aria-hidden="true"><use href="${sprite}#i-x"/></svg></button>
    </div>`;
  bar.addEventListener("click", (e) => {
    const step = e.target.closest("[data-vstep]");
    if (step) go(current + +step.dataset.vstep);
    if (e.target.closest("[data-vclose]")) setVerify(false);
  });
  document.body.appendChild(bar);
}

function summary() {
  const sourced = claims.filter((c) => c.dataset.src).length;
  return `${claims.length} claims on this page. ${sourced} link to a source you can open, ${claims.length - sourced} are private and available on request. Use the arrows to walk through them.`;
}

function go(i) {
  const list = claims.filter(visible);
  if (!list.length) return;
  current = (i + list.length) % list.length;
  claims.forEach((c) => c.classList.remove("claim--current"));
  const el = list[current];
  el.classList.add("claim--current");
  el.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "auto" : "smooth" });
  const src = el.dataset.src ? el.dataset.srcLabel || "Source" : "Proof on request";
  bar.querySelector("[data-vtext]").textContent = `${current + 1} of ${list.length}: ${el.dataset.claim}. ${src}.`;
}

export function setVerify(state) {
  on = state;
  root.classList.toggle("verify-on", on);
  document.querySelectorAll("[data-verify-toggle]").forEach((b) => b.setAttribute("aria-pressed", String(on)));
  try { sessionStorage.setItem("verify", on ? "1" : "0"); } catch {}
  if (on) {
    claims = [...document.querySelectorAll("[data-claim]")];
    claims.forEach((el) => {
      if (el.querySelector(".claim-tag")) return;
      // In two column rows (competitions, certifications, education) the tag goes into the text column.
      const host = el.matches(".wins li, .certs li") ? el.querySelector(":scope > span")
        : el.matches(".edu") ? el.querySelector(":scope > small")
        : el.matches(".ledger__cell") ? el.querySelector(":scope > .ledger__src") // a <dl> row may only hold <dt> and <dd>
        : el;
      host.appendChild(tagFor(el));
    });
    if (!bar) buildBar();
    bar.hidden = false;
    current = -1;
    bar.querySelector("[data-vtext]").textContent = summary();
  } else {
    document.querySelectorAll(".claim-tag").forEach((t) => t.remove());
    claims.forEach((c) => c.classList.remove("claim--current", "claim--private"));
    if (bar) bar.hidden = true;
  }
}

export const toggleVerify = () => setVerify(!on);

document.addEventListener("keydown", (e) => { if (on && e.key === "Escape" && !document.querySelector(".palette.is-open, .mobile-menu.is-open")) setVerify(false); });
