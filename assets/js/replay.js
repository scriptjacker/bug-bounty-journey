// Case replay: walks through a finding one step at a time, with the request or response that
// belongs to each step. The same steps are already in the page inside <details> elements, so this
// is an upgrade on top of working content, never a replacement for it.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

let box, data, cases, current = 0, step = 0, opener = null;

function build() {
  box = document.createElement("div");
  box.className = "replay";
  box.hidden = true;
  box.innerHTML = `
    <div class="replay__dialog" role="dialog" aria-modal="true" aria-labelledby="replay-title">
      <header class="replay__head">
        <div>
          <p class="replay__case" data-r-class></p>
          <h2 class="replay__title" id="replay-title" data-r-title></h2>
        </div>
        <button class="icon-btn" type="button" data-r-close aria-label="Close the replay"><svg class="ic" aria-hidden="true"><use href="assets/icons.svg?v=601d5892#i-x"/></svg></button>
      </header>
      <div class="replay__track" data-r-track aria-hidden="true"></div>
      <div class="replay__body">
        <ol class="replay__steps" data-r-steps></ol>
      </div>
      <footer class="replay__foot">
        <span class="replay__count" data-r-count></span>
        <div class="replay__nav">
          <button class="btn btn--ghost btn--sm" type="button" data-r-step="-1">Back</button>
          <button class="btn btn--red btn--sm" type="button" data-r-step="1">Next step</button>
        </div>
        <a class="replay__link" data-r-link target="_blank" rel="noopener">Full writeup<svg class="ic" aria-hidden="true"><use href="assets/icons.svg?v=601d5892#i-arrow-up-right"/></svg></a>
      </footer>
    </div>`;
  document.body.appendChild(box);
  box.addEventListener("click", (e) => {
    if (e.target === box || e.target.closest("[data-r-close]")) return close();
    const s = e.target.closest("[data-r-step]");
    if (s) go(step + +s.dataset.rStep);
    const t = e.target.closest("[data-r-go]");
    if (t) go(+t.dataset.rGo);
  });
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(step + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(step - 1); }
    else if (e.key === "Tab") {
      const f = $$("button, a[href]", box).filter((n) => n.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function render() {
  const c = cases[current];
  $("[data-r-class]", box).textContent = c.class;
  $("[data-r-title]", box).textContent = c.title;
  $("[data-r-link]", box).href = c.link;
  $("[data-r-track]", box).innerHTML = c.steps.map((_, i) => `<button type="button" data-r-go="${i}" tabindex="-1"></button>`).join("");
  $("[data-r-steps]", box).innerHTML = c.steps.map((s, i) => `<li data-i="${i}">
      <p class="replay__label"><i>${String(i + 1).padStart(2, "0")}</i>${esc(s.label)}</p>
      <p class="replay__body-text">${esc(s.body)}</p>
      ${s.code ? `<pre class="replay__code"${s.lang ? ` data-lang="${esc(s.lang)}"` : ""}><code>${esc(s.code)}</code></pre>` : ""}
    </li>`).join("");
}

function go(i) {
  const c = cases[current];
  step = Math.max(0, Math.min(c.steps.length - 1, i));
  $$("[data-r-steps] li", box).forEach((li, k) => {
    li.classList.toggle("is-on", k === step);
    li.classList.toggle("is-past", k < step);
  });
  $$("[data-r-track] button", box).forEach((b, k) => b.classList.toggle("is-on", k <= step));
  $("[data-r-count]", box).textContent = `Step ${step + 1} of ${c.steps.length}`;
  $('[data-r-step="-1"]', box).disabled = step === 0;
  const next = $('[data-r-step="1"]', box);
  next.disabled = step === c.steps.length - 1;
  next.textContent = step === c.steps.length - 1 ? "That is the whole chain" : "Next step";
  const on = $("[data-r-steps] li.is-on", box);
  if (on) on.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" });
}

export async function open(id, from) {
  if (!data) {
    const base = new URL("../../", import.meta.url).pathname;
    data = await fetch(`${base}data/cases.json`).then((r) => r.json());
    cases = data.cases.filter((c) => c.steps.length);
  }
  const i = cases.findIndex((c) => c.id === id);
  if (i < 0) return;
  if (!box) build();
  opener = from || null;
  current = i;
  box.hidden = false;
  requestAnimationFrame(() => box.classList.add("is-open"));
  document.body.style.overflow = "hidden";
  render();
  go(0);
  $("[data-r-close]", box).focus();
}

function close() {
  box.classList.remove("is-open");
  document.body.style.overflow = "";
  setTimeout(() => { box.hidden = true; }, 220);
  opener?.focus?.();
}
