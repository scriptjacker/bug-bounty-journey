// Search palette: sections, actions and every listed organization. Opens with Ctrl/Cmd K or "/".
import { copy, toggleTheme } from "./main.js?v=ef862c19";

const EMAIL = "parth.narula@scriptjacker.in";
const BASE = new URL("../../", import.meta.url).pathname; // site root, works from any page depth
const onHome = !!document.querySelector("[data-globe]");
const home = (hash) => (onHome ? hash : `${BASE}${hash}`);
const icon = (name) => `<svg class="ic" aria-hidden="true"><use href="${BASE}assets/icons.svg?v=ef862c19#i-${name}"/></svg>`;
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const ACTIONS = [
  { group: "Actions", label: "Download CV", icon: "download-simple", href: `${BASE}Parth-Narula-CV.pdf?v=ef862c19`, keys: "resume pdf hire" },
  { group: "Actions", label: "Copy email address", icon: "copy", run: () => copy(EMAIL, "Email copied to clipboard"), hint: EMAIL, keys: "mail contact" },
  { group: "Actions", label: "Book a 30 minute call", icon: "calendar-dots", href: "https://calendly.com/scriptjacker/30min", ext: true, keys: "calendly meeting hire contact" },
  { group: "Actions", label: "Switch light or dark theme", icon: "sun", run: toggleTheme, keys: "theme dark light mode" },
  { group: "Pages", label: "All listed organizations", icon: "globe-hemisphere-west", href: `${BASE}recognition.html`, keys: "directory list hall of fame verify public" },
  { group: "Pages", label: "Proof archive", icon: "files", href: `${BASE}gallery.html`, keys: "screenshots hall of fame swag letters certificates gallery" },
  { group: "Pages", label: "First researcher programs", icon: "flag", href: home("#first"), keys: "first hall of fame" },
  { group: "Pages", label: "Record and numbers", icon: "medal", href: home("#record"), keys: "stats 450 250 cve" },
  { group: "Pages", label: "What I test", icon: "shield-check", href: home("#scope"), keys: "skills scope web api android llm cloud idor" },
  { group: "Pages", label: "Case files", icon: "file-text", href: home("#cases"), keys: "writeups findings nokia idor cve" },
  { group: "Pages", label: "Background", icon: "briefcase", href: home("#background"), keys: "experience work education certifications ewptx ejpt ceh ctf hackwithindia" },
  { group: "Pages", label: "Writing", icon: "article", href: home("#writing"), keys: "blog medium writeups unihackers" },
  { group: "Pages", label: "Contact", icon: "envelope-simple", href: home("#contact") },
  { group: "Links", label: "LinkedIn", icon: "linkedin-logo", href: "https://www.linkedin.com/in/parth-narula-86283821a/", ext: true },
  { group: "Links", label: "GitHub", icon: "github-logo", href: "https://github.com/scriptjacker", ext: true },
  { group: "Links", label: "Medium", icon: "medium-logo", href: "https://scriptjacker.medium.com/", ext: true },
  { group: "Links", label: "Unihackers articles", icon: "graduation-cap", href: "https://unihackers.com/authors/parth-narula", ext: true },
  { group: "Links", label: "ScriptJacker blog", icon: "pen-nib", href: "https://blogs.scriptjacker.in/", ext: true },
];

const TERMINAL = {
  "sudo hire-me": `<span class="a">[sudo]</span> password for recruiter: ********\nAccess granted.\n\nParth Narula, security researcher and pentester.\nPress Enter to copy my email: <span class="a">${EMAIL}</span>`,
  "whoami": `parth <span class="a">// ScriptJacker</span>\nI break things so the people who built them can fix them first.`,
  "help": `Try typing an organization (boeing, berlin, nokia), a section (case files)\nor one of these: <span class="a">whoami</span>, <span class="a">sudo hire-me</span>`,
};

let el, input, list, items = [], active = 0, orgs = null, lastFocus = null;

function build() {
  el = document.createElement("div");
  el.className = "palette";
  el.hidden = true;
  el.innerHTML = `
    <div class="palette__box" role="dialog" aria-modal="true" aria-label="Search this site">
      <div class="palette__search">
        ${icon("magnifying-glass")}
        <input type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list"
          placeholder="Search sections, actions or organizations" spellcheck="false" autocomplete="off">
        <kbd>Esc</kbd>
      </div>
      <div class="palette__list" id="palette-list" role="listbox" aria-label="Results"></div>
      <div class="palette__foot"><span><kbd>↑</kbd><kbd>↓</kbd>move</span><span><kbd>Enter</kbd>open</span><span><kbd>Esc</kbd>close</span></div>
    </div>`;
  document.body.appendChild(el);
  input = el.querySelector("input");
  list = el.querySelector(".palette__list");
  el.addEventListener("click", (e) => {
    if (e.target === el) close();
    const item = e.target.closest(".palette__item");
    if (item) choose(+item.dataset.index);
  });
  el.addEventListener("mousemove", (e) => {
    const item = e.target.closest(".palette__item");
    if (item && +item.dataset.index !== active) setActive(+item.dataset.index, false);
  });
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); const term = TERMINAL[input.value.trim().toLowerCase()]; if (term && input.value.trim().toLowerCase() === "sudo hire-me") copy(EMAIL, "Email copied. Talk soon."); else choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") { e.preventDefault(); }
  });
}

async function loadOrgs() {
  if (orgs) return;
  try {
    const res = await fetch(`${BASE}data/orgs.json`);
    const data = await res.json();
    const countries = Object.fromEntries(data.countries.map((c) => [c.code, c.name]));
    orgs = data.orgs.map((o) => ({
      group: "Organizations", label: o.name, icon: o.first ? "flag" : "medal",
      hint: `${o.domain}${countries[o.country] && o.country !== "EU" && o.country !== "INT" ? ", " + countries[o.country] : ""}`,
      href: `${BASE}recognition.html?q=${encodeURIComponent(o.domain)}`, keys: `${o.domain} ${countries[o.country] || ""}`,
    }));
    if (!el.hidden) render();
  } catch { orgs = []; }
}

function score(item, q) {
  const label = item.label.toLowerCase();
  const hay = `${label} ${(item.keys || "").toLowerCase()} ${(item.hint || "").toLowerCase()}`;
  if (label.startsWith(q)) return 3;
  if (label.includes(` ${q}`)) return 2;
  if (hay.includes(q)) return 1;
  return 0;
}

function render() {
  const q = input.value.trim().toLowerCase();
  const term = TERMINAL[q];
  if (term) {
    items = [];
    list.innerHTML = `<div class="palette__term">${term}</div>`;
    input.removeAttribute("aria-activedescendant");
    return;
  }
  let pool = ACTIONS;
  if (q) {
    pool = [...ACTIONS, ...(orgs || [])]
      .map((it) => [it, score(it, q)]).filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1]).slice(0, 40).map(([it]) => it);
  }
  items = pool;
  if (!items.length) {
    list.innerHTML = `<div class="palette__empty">Nothing matches “${esc(input.value)}”. Some organizations can't be named yet, so they are not listed here.</div>`;
    input.removeAttribute("aria-activedescendant");
    return;
  }
  let html = "", group = "";
  items.forEach((it, i) => {
    if (it.group !== group) { group = it.group; html += `<div class="palette__group" role="presentation">${group}</div>`; }
    html += `<div class="palette__item" role="option" id="pal-${i}" data-index="${i}" aria-selected="false">${icon(it.icon)}<span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : it.ext ? icon("arrow-up-right") : ""}</div>`;
  });
  list.innerHTML = html;
  setActive(0, false);
}

function setActive(i, scroll = true) {
  if (!items.length) return;
  active = (i + items.length) % items.length;
  list.querySelectorAll(".palette__item").forEach((n) => n.setAttribute("aria-selected", String(+n.dataset.index === active)));
  const node = list.querySelector(`#pal-${active}`);
  input.setAttribute("aria-activedescendant", `pal-${active}`);
  if (scroll && node) node.scrollIntoView({ block: "nearest" });
}

function choose(i) {
  const it = items[i];
  if (!it) return;
  close();
  if (it.run) return it.run();
  if (it.ext) window.open(it.href, "_blank", "noopener");
  else if (it.href.endsWith(".pdf")) Object.assign(document.createElement("a"), { href: it.href, download: "" }).click();
  else location.href = it.href;
}

export function open(query = "") {
  if (!el) build();
  lastFocus = document.activeElement;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("is-open"));
  document.body.style.overflow = "hidden";
  input.value = query;
  render();
  input.focus();
  loadOrgs();
}

function close() {
  el.classList.remove("is-open");
  document.body.style.overflow = "";
  setTimeout(() => { el.hidden = true; }, 180);
  lastFocus?.focus?.();
}
