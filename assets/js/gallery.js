// Proof archive: filters, search, masonry grid and a keyboard friendly lightbox with zoom and
// a link to the live page the screenshot came from.
const $ = (s, r = document) => r.querySelector(s);
const LABEL = { hof: "Hall of Fame", letter: "Letter", cert: "Certificate", swag: "Swag", award: "Competition", credential: "Certification", talk: "Talk" };
const variant = (src, w) => src.replace(/^assets\/([^/]+)\/(.+)\.[a-z]+$/i, `assets/img/$1/$2-${w}.webp`);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const grid = $("[data-grid]");
const result = $("[data-result]");
const search = $("[data-search]");
const chips = [...document.querySelectorAll("[data-filter]")];
const params = new URLSearchParams(location.search);
let filter = ["hof", "letter", "swag", "award", "credential", "talk"].includes(params.get("category")) ? params.get("category") : "all";
let query = params.get("q") || "";
let items = [], view = [];

const matches = (it) => {
  if (filter === "letter" && !(it.category === "letter" || it.category === "cert")) return false;
  if (filter !== "all" && filter !== "letter" && it.category !== filter) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return it.title.toLowerCase().includes(q) || it.domain.toLowerCase().includes(q);
};

function syncUrl() {
  const p = new URLSearchParams();
  if (filter !== "all") p.set("category", filter);
  if (query) p.set("q", query);
  history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
}

function render() {
  view = items.filter(matches);
  chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === filter)));
  result.textContent = view.length === items.length ? `Showing all ${items.length} items` : `Showing ${view.length} of ${items.length} items`;
  grid.removeAttribute("aria-busy");
  if (!view.length) {
    grid.innerHTML = `<div class="empty"><svg class="ic" aria-hidden="true"><use href="assets/icons.svg?v=601d5892#i-magnifying-glass"/></svg><p>Nothing matches “${esc(query)}”.<br>Not every organization has a screenshot here. Try the <a class="link" href="recognition.html?q=${encodeURIComponent(query)}">organizations list</a>.</p><button class="btn btn--ghost btn--sm" type="button" data-reset>Clear search</button></div>`;
    grid.style.columns = "auto";
    return;
  }
  grid.style.removeProperty("columns");
  grid.innerHTML = view.map((it, i) => {
    const sized = it.w && it.h;
    const src = sized ? variant(it.src, 480) : it.src;
    const h = sized ? Math.round((480 * it.h) / it.w) : 640;
    return `<button class="shot" type="button" data-open="${i}" aria-label="Open ${esc(it.title)} ${LABEL[it.category]} image">
      <img src="${src}" width="480" height="${h}" alt="${esc(LABEL[it.category])} for ${esc(it.title)}" loading="${i < 8 ? "eager" : "lazy"}" decoding="async">
      <span class="shot__cap"><b>${esc(it.title)}<span class="shot__domain">${esc(it.domain)}</span></b><span>${LABEL[it.category]}</span></span>
    </button>`;
  }).join("");
}

chips.forEach((c) => c.addEventListener("click", () => { filter = c.dataset.filter; syncUrl(); render(); }));
let t;
search.value = query;
search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { query = search.value.trim(); syncUrl(); render(); }, 120); });
grid.addEventListener("click", (e) => {
  if (e.target.closest("[data-reset]")) { query = ""; search.value = ""; filter = "all"; syncUrl(); render(); search.focus(); return; }
  const b = e.target.closest("[data-open]");
  if (b) openBox(+b.dataset.open, b);
});

/* ---------- Lightbox ---------- */
const box = $("[data-lightbox]");
const img = $("[data-lb-img]", box);
const stage = $("[data-lb-stage]", box);
const zoomBtn = $("[data-lb-zoom]", box);
const verify = $("[data-lb-verify]", box);
let index = 0, opener = null;

// Zoom shows the image at full width and lets you scroll it, which helps with tall screenshots.
function setZoom(on) {
  box.classList.toggle("is-zoomed", on);
  zoomBtn.setAttribute("aria-pressed", String(on));
  zoomBtn.setAttribute("aria-label", on ? "Fit to screen" : "Zoom to full width");
  stage.scrollTop = 0;
}
zoomBtn.addEventListener("click", () => setZoom(!box.classList.contains("is-zoomed")));
img.addEventListener("click", () => setZoom(!box.classList.contains("is-zoomed")));

function show(i) {
  index = (i + view.length) % view.length;
  const it = view[index];
  const full = it.w ? variant(it.src, 1400) : it.src;
  img.classList.add("is-loading");
  img.onload = () => img.classList.remove("is-loading");
  img.src = full;
  img.alt = `${LABEL[it.category]} for ${it.title}`;
  $("[data-lb-title]", box).textContent = it.title;
  $("[data-lb-domain]", box).textContent = it.domain;
  $("[data-lb-count]", box).textContent = `${index + 1} / ${view.length}`;
  $("[data-lb-original]", box).href = it.src;
  const live = it.url || it.verify;
  verify.hidden = !live;
  if (live) {
    verify.href = live;
    verify.firstChild.textContent = it.verify && it.category !== "award" ? "Verify the certificate" : "Open the live page";
  }
  setZoom(false);
  // Warm up the neighbours so arrowing through feels instant.
  for (const d of [1, -1]) { const n = view[(index + d + view.length) % view.length]; if (n?.w) new Image().src = variant(n.src, 1400); }
}

function openBox(i, from) {
  opener = from;
  box.hidden = false;
  requestAnimationFrame(() => box.classList.add("is-open"));
  document.body.style.overflow = "hidden";
  show(i);
  $("[data-lb-close]", box).focus();
}
function closeBox() {
  setZoom(false);
  box.classList.remove("is-open");
  document.body.style.overflow = "";
  setTimeout(() => { box.hidden = true; img.removeAttribute("src"); }, 200);
  opener?.focus();
}

box.addEventListener("click", (e) => {
  if (e.target.closest("[data-lb-close]") || e.target === box || (e.target === stage && !box.classList.contains("is-zoomed"))) closeBox();
  const s = e.target.closest("[data-lb-step]");
  if (s) show(index + +s.dataset.lbStep);
});
document.addEventListener("keydown", (e) => {
  if (box.hidden) return;
  if (e.key === "Escape") closeBox();
  else if (e.key === "ArrowRight" && !box.classList.contains("is-zoomed")) show(index + 1);
  else if (e.key === "ArrowLeft" && !box.classList.contains("is-zoomed")) show(index - 1);
  else if (e.key === "Tab") {
    const f = [...box.querySelectorAll("button, a[href]")];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
let x0 = null;
box.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" && !box.classList.contains("is-zoomed")) x0 = e.clientX; });
box.addEventListener("pointerup", (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1)); });

/* ---------- Load ---------- */
fetch("data/gallery.json")
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((data) => {
    // Hall of Fame first, then letters, competitions, certifications and swag.
    const order = { hof: 0, letter: 1, cert: 1, award: 2, talk: 3, credential: 4, swag: 5 };
    items = data.sort((a, b) => order[a.category] - order[b.category] || a.title.localeCompare(b.title));
    const count = (f) => items.filter((it) => f === "all" || it.category === f || (f === "letter" && it.category === "cert")).length;
    document.querySelectorAll("[data-count-for]").forEach((el) => (el.textContent = count(el.dataset.countFor)));
    render();
  })
  .catch(() => {
    grid.removeAttribute("aria-busy");
    grid.innerHTML = `<div class="empty"><p>The gallery could not load right now. Please refresh the page.</p></div>`;
    result.textContent = "";
  });
