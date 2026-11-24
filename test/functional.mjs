// Functional checks for the portfolio, run in a real browser:  npm run test:functional
// Every expected count is derived from data/ rather than written in here, so adding an
// organization, a photo or a case file never means editing a test.
//
// page.evaluate() and $$eval() below are Playwright calls that run the fixed functions written
// in this file inside the test browser. They are not JavaScript's eval(): no string is ever
// executed, and nothing from the page or the data is turned into code.
import { serve, launch, data, check, group, run, PAGES } from "./lib.mjs";

const orgs = data.orgs.orgs;
const prestige = data.orgs.prestige;
const gallery = data.gallery;
const cases = data.cases.cases;

// Independent of the site's own filter code on purpose: importing that would make the test
// agree with the code it is meant to check, bugs included.
const expectOrgs = (k) =>
  k === "all" ? orgs.length
  : k === "first" ? orgs.filter((o) => o.first).length
  : k === "public" ? orgs.filter((o) => o.url).length
  : k === "swag" ? orgs.filter((o) => o.recognition.includes("swag")).length
  : orgs.filter((o) => o.sector === k).length;

// The letters chip also shows certificates, so it counts both.
const expectShots = (k) =>
  k === "all" ? gallery.length
  : k === "letter" ? gallery.filter((i) => i.category === "letter" || i.category === "cert").length
  : gallery.filter((i) => i.category === k).length;

await run(async () => {
  const { base, close } = await serve();
  const browser = await launch();
  const open = async (path, viewport = { width: 1280, height: 900 }) => {
    const page = await browser.newPage({ viewport });
    await page.goto(base + path, { waitUntil: "networkidle" });
    return page;
  };

  await group("Navigation is the same on every page", async () => {
    const desktop = {};
    const mobile = {};
    for (const path of PAGES) {
      const p = await open(path);
      desktop[path] = await p.$$eval(".nav__links a", (as) => as.map((a) => a.textContent.trim()));
      // The first mobile item is page specific (Record on the homepage, Home elsewhere) and the
      // CV button is not a section, so compare what sits between them.
      mobile[path] = (await p.$$eval("#mobile-menu a:not(.btn)", (as) => as.map((a) => a.textContent.trim())))
        .filter((t, i) => !(i === 0 && (t === "Home" || t === "Record")));
      await p.close();
    }
    const want = desktop["/"].join(" | ");
    for (const path of PAGES) check(desktop[path].join(" | ") === want, `desktop nav on ${path} matches the homepage`, desktop[path].join(" | "));
    for (const label of ["Organizations", "Proof archive", "Writing"]) check(desktop["/"].includes(label), `homepage nav has ${label}`);
    const wantMobile = mobile["/"].join(" | ");
    for (const path of PAGES) check(mobile[path].join(" | ") === wantMobile, `mobile menu on ${path} matches the homepage`, mobile[path].join(" | "));
  });

  await group("Navigation labels never wrap", async () => {
    for (const width of [1024, 1100, 1280]) {
      const p = await open("/", { width, height: 800 });
      // Counting the line boxes of each label's text catches a wrap that the link's own box
      // hides, which is exactly how "Case files" broke at 1024px without a test noticing.
      const wrapped = await p.$$eval(".nav__links a", (as) => as.filter((a) => {
        const r = document.createRange();
        r.selectNodeContents(a);
        return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1;
      }).map((a) => a.textContent.trim()));
      check(wrapped.length === 0, `no nav label wraps at ${width}px`, wrapped.join(", "));
      await p.close();
    }
  });

  await group("Header links reach their pages", async () => {
    for (const [label, path] of [["Organizations", "/recognition.html"], ["Proof archive", "/gallery.html"]]) {
      const p = await open("/");
      await Promise.all([p.waitForURL(`**${path}`), p.click(`.nav__links a:text-is("${label}")`)]);
      check(new URL(p.url()).pathname === path, `${label} opens ${path}`, new URL(p.url()).pathname);
      await p.close();
    }
    const p = await open("/gallery.html");
    await Promise.all([p.waitForURL("**/#writing"), p.click('.nav__links a:text-is("Writing")')]);
    check(new URL(p.url()).hash === "#writing", "Writing from the archive opens the homepage writing section", p.url());
    await p.close();
  });

  await group("Numbers on the pages match the data", async () => {
    const want = { listed: orgs.length, first: expectOrgs("first"), public: expectOrgs("public") };
    for (const path of ["/", "/recognition.html"]) {
      const p = await open(path);
      for (const [stat, n] of Object.entries(want)) {
        const shown = await p.$$eval(`[data-stat="${stat}"]`, (els) => els.map((e) => e.textContent.trim()));
        if (shown.length) check(shown.every((t) => t === String(n)), `${stat} reads ${n} on ${path}`, shown.join(", "));
      }
      await p.close();
    }
  });

  await group("Organizations directory", async () => {
    const p = await open("/recognition.html");
    const rows = () => p.locator("[data-rows] tr").count();
    check((await rows()) === orgs.length, `shows all ${orgs.length} organizations`, await rows());
    for (const k of await p.$$eval("[data-filter]", (cs) => cs.map((c) => c.dataset.filter))) {
      await p.click(`[data-filter="${k}"]`);
      check((await rows()) === expectOrgs(k), `${k} filter shows ${expectOrgs(k)}`, await rows());
    }
    await p.click('[data-filter="public"]');
    const targets = await p.$$eval("[data-rows] a.verify:not(.verify--soft)", (as) => as.map((a) => a.target));
    check(targets.length === expectOrgs("public") && targets.every((t) => t === "_blank"), "every public page link opens in a new tab", `${targets.length} links`);
    await p.click('[data-filter="all"]');
    await p.fill("[data-search]", "zzzz-no-such-organization");
    await p.waitForTimeout(300);
    check(await p.isVisible("[data-empty]"), "a search with no match shows the empty state");
    await p.click("[data-reset]");
    check((await rows()) === orgs.length, "reset brings every organization back", await rows());
    await p.close();

    const sample = orgs.find((o) => o.top) || orgs[0];
    const q = await open(`/recognition.html?q=${encodeURIComponent(sample.domain)}`);
    await q.waitForTimeout(300);
    check((await q.textContent("[data-rows]")).includes(sample.name), `a ?q= link filters to ${sample.name}`);
    await q.close();
  });

  await group("Top names", async () => {
    const p = await open("/recognition.html");
    const names = await p.$$eval("[data-top50] li b", (bs) => bs.map((b) => b.textContent.trim()));
    check(names.length === prestige.length, `lists all ${prestige.length} top names`, names.length);
    const broken = names.filter((n) => !n || n === "undefined" || n === "null");
    check(broken.length === 0, "every top name has a real name", `${broken.length} broken`);
    const want = prestige.map((x) => x.name);
    check(names.join("|") === want.join("|"), "top names render in the data's order");
    await p.close();
  });

  await group("Proof archive", async () => {
    const p = await open("/gallery.html");
    const shots = () => p.locator(".shot").count();
    check((await shots()) === gallery.length, `shows all ${gallery.length} items`, await shots());
    for (const k of await p.$$eval("[data-filter]", (cs) => cs.map((c) => c.dataset.filter))) {
      await p.click(`[data-filter="${k}"]`);
      check((await shots()) === expectShots(k), `${k} filter shows ${expectShots(k)}`, await shots());
    }
    await p.click('[data-filter="all"]');
    await p.fill("[data-search]", "berlin");
    await p.waitForTimeout(300);
    const found = await shots();
    check(found > 0 && found < gallery.length, "search narrows the archive", found);
    await p.close();

    const swag = await open("/gallery.html?category=swag");
    check((await swag.locator(".shot").count()) === expectShots("swag"), "a ?category= link opens on that category", await swag.locator(".shot").count());
    await swag.close();
  });

  await group("Lightbox", async () => {
    const p = await open("/gallery.html");
    await p.locator(".shot").nth(3).click();
    await p.waitForSelector(".lightbox.is-open");
    check((await p.textContent("[data-lb-count]")).trim() === `4 / ${gallery.length}`, "opens on the item clicked", await p.textContent("[data-lb-count]"));
    await p.keyboard.press("ArrowRight");
    check((await p.textContent("[data-lb-count]")).trim() === `5 / ${gallery.length}`, "the right arrow moves to the next item", await p.textContent("[data-lb-count]"));
    await p.keyboard.press("Escape");
    await p.waitForTimeout(400);
    check(await p.locator("[data-lightbox]").isHidden(), "Escape closes it");
    await p.close();
  });

  await group("Case files", async () => {
    // Normal motion on purpose: the sideways pinning only switches on without reduced motion.
    const p = await open("/", { width: 1440, height: 900 });
    const ids = await p.$$eval("li.case", (ls) => ls.map((l) => l.id.replace(/^case-/, "")));
    check(ids.length === cases.length, `all ${cases.length} case files render`, ids.length);
    check(ids.join(",") === cases.map((c) => c.id).join(","), "case files render in the data's order");

    await p.evaluate(() => document.getElementById("cases").scrollIntoView({ behavior: "instant" }));
    await p.waitForTimeout(500);
    const before = await p.evaluate(() => document.querySelector("[data-cases-track]").style.transform);
    await p.evaluate(() => window.scrollBy({ top: 900, behavior: "instant" }));
    await p.waitForTimeout(700);
    const after = await p.evaluate(() => document.querySelector("[data-cases-track]").style.transform);
    const pinned = await p.evaluate(() => document.getElementById("cases").classList.contains("is-pinned"));
    check(pinned && before !== after, "case files move sideways while scrolling", `${before} -> ${after}`);

    const withSteps = cases.find((c) => c.steps.length);
    if (withSteps) {
      const n = withSteps.steps.length;
      await p.evaluate((id) => document.querySelector(`[data-replay="${id}"]`).click(), withSteps.id);
      await p.waitForSelector(".replay.is-open");
      check((await p.textContent("[data-r-count]")).trim() === `Step 1 of ${n}`, `replay opens on step 1 of ${n}`, await p.textContent("[data-r-count]"));
      const fits = await p.evaluate(() => { const d = document.querySelector(".replay__dialog").getBoundingClientRect(); return d.top >= -1 && d.bottom <= innerHeight + 1; });
      check(fits, "replay dialog fits the viewport");
      await p.keyboard.press("ArrowRight");
      check((await p.textContent("[data-r-count]")).trim() === `Step 2 of ${n}`, "the right arrow advances a step", await p.textContent("[data-r-count]"));
      await p.keyboard.press("Escape");
      await p.waitForTimeout(400);
      check(await p.locator(".replay").isHidden(), "Escape closes the replay");
    }
    await p.close();
  });

  await group("Verify mode", async () => {
    const p = await open("/");
    const claims = await p.locator("[data-claim]").count();
    await p.evaluate(() => document.querySelector("[data-verify-toggle]").click());
    await p.waitForTimeout(300);
    check(await p.evaluate(() => document.documentElement.classList.contains("verify-on")), "the toggle turns verify mode on");
    const tags = await p.locator(".claim-tag").count();
    check(claims > 0 && tags === claims, `every claim gets a source tag (${claims})`, tags);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    check(!(await p.evaluate(() => document.documentElement.classList.contains("verify-on"))), "Escape turns it off");
    await p.close();

    const v = await open("/?verify");
    check(await v.evaluate(() => document.documentElement.classList.contains("verify-on")), "a ?verify link opens in verify mode");
    await v.close();
  });

  await group("Phone layout", async () => {
    const phone = { width: 390, height: 844 };
    const p = await open("/", phone);
    await p.click("[data-menu-toggle]");
    await p.waitForTimeout(400);
    check(await p.evaluate(() => document.getElementById("mobile-menu").classList.contains("is-open")), "the menu opens");
    await p.click('#mobile-menu a:text-is("Scope")');
    await p.waitForTimeout(500);
    check(!(await p.evaluate(() => document.getElementById("mobile-menu").classList.contains("is-open"))), "choosing a link closes it");
    await p.close();
    for (const path of PAGES) {
      const m = await open(path, phone);
      const wide = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      check(!wide, `no sideways scroll on ${path}`);
      await m.close();
    }
  });

  await group("Page health", async () => {
    for (const path of PAGES) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      check(errors.length === 0, `no console errors on ${path}`, errors.slice(0, 2).join(" / "));
      // A missing field renders as text a reader can see. This is the check that would have
      // caught every top name printing "undefined".
      const bad = await page.evaluate(() => (document.body.innerText.match(/\bundefined\b|\bNaN\b|\[object Object\]/g) || []));
      check(bad.length === 0, `no undefined, NaN or [object Object] on ${path}`, bad.slice(0, 3).join(", "));
      await page.close();
    }
  });

  await browser.close();
  close();
});
