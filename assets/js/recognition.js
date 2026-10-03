// Organizations directory. The page ships prerendered (tools/prerender.mjs); this adds filtering, sorting and search.
import { prepare, filtersHTML, rowHTML, top50HTML, resultText, matchFilter, sortOrgs, SORTS } from "./directory-render.js?v=bf1747b4";

const $ = (s, r = document) => r.querySelector(s);
const rows = $("[data-rows]");
const result = $("[data-result]");
const search = $("[data-search]");
const sortEl = $("[data-sort]");
const filtersEl = $("[data-filters]");
const empty = $("[data-empty]");
const params = new URLSearchParams(location.search);
let filter = params.get("filter") || "all";
let query = params.get("q") || "";
let sort = params.get("sort") in SORTS ? params.get("sort") : "first";
let d;

// Keep the sticky table header right under the sticky toolbar, whatever height the chips wrap to.
const toolbar = $(".toolbar");
new ResizeObserver(() => document.documentElement.style.setProperty("--toolbar-h", `${toolbar.offsetHeight}px`)).observe(toolbar);

function match(o) {
  if (!matchFilter(o, filter)) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return o.name.toLowerCase().includes(q) || o.domain.toLowerCase().includes(q) || (d.countryName[o.country] || "").toLowerCase().includes(q);
}

function render() {
  filtersEl.querySelectorAll("[data-filter]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === filter)));
  const list = sortOrgs(d.orgs.filter(match), sort);
  result.textContent = resultText(list.length, d.orgs.length);
  empty.hidden = list.length > 0;
  rows.innerHTML = list.map((o) => rowHTML(o, d)).join("");
}

function syncUrl() {
  const p = new URLSearchParams();
  if (filter !== "all") p.set("filter", filter);
  if (query) p.set("q", query);
  if (sort !== "first") p.set("sort", sort);
  history.replaceState(null, "", (p.toString() ? `?${p}` : location.pathname) + (location.hash || ""));
}

filtersEl.addEventListener("click", (e) => { const b = e.target.closest("[data-filter]"); if (b) { filter = b.dataset.filter; syncUrl(); render(); } });
let t;
search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { query = search.value.trim(); syncUrl(); render(); }, 100); });
sortEl.value = sort;
sortEl.addEventListener("change", () => { sort = sortEl.value; syncUrl(); render(); });
$("[data-reset]").addEventListener("click", () => { filter = "all"; query = ""; search.value = ""; syncUrl(); render(); search.focus(); });

Promise.all([fetch("data/orgs.json").then((r) => r.json()), fetch("data/gallery.json").then((r) => r.json()).catch(() => [])])
  .then(([orgs, gallery]) => {
    d = prepare(orgs, gallery);
    $("[data-top50]").innerHTML = top50HTML(d);
    filtersEl.innerHTML = filtersHTML(d, filter);
    if (!filtersEl.querySelector(`[data-filter="${CSS.escape(filter)}"]`)) filter = "all";
    search.value = query;
    render();
    if (params.has("filter") || params.has("q")) document.getElementById("directory").scrollIntoView();
  })
  .catch(() => { if (!rows.children.length) result.textContent = "The directory could not load right now. Please refresh the page."; });
