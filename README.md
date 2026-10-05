# Parth Narula, security researcher

Portfolio of Parth Narula (ScriptJacker). One site that combines the old personal portfolio and the bug bounty proof archive.

- **Home** (`index.html`): the record with links to check every number, what I test (web, API, Android, LLM, cloud), case files, the Halls of Fame where I was the first researcher, a WebGL globe built from the real data, proof, background, writing and contact.
- **Proof archive** (`gallery.html`): Hall of Fame screenshots, letters, certificates and swag photos with filters, search and a lightbox that links to the live page where one exists.
- **Organizations** (`recognition.html`): the most recognizable names and every publicly listed organization, first researcher programs first, with links to public Halls of Fame.
- **AI security talk** (`talks/ai-security/`): the 57 slide deck I wrote and delivered, hosted as it was presented.
- **CV** (`Parth-Narula-CV.pdf`): one page, text based, readable by applicant tracking systems.

It is a plain static site. No framework, no server code and no build step is needed to host it.

## Hosting

Upload the repository contents (everything except `node_modules/`) to any static host.

**Hostinger (current host)**

1. Run `./tools/package-site.sh` to build `site.zip` with only the files the server needs.
2. hPanel, Websites, Manage, File Manager, open `public_html` of parthnarula.scriptjacker.in, upload `site.zip` and extract it there. `.htaccess` must be included: it sets the security headers, caching, compression and the 404 page.
3. For bugbounty.scriptjacker.in, replace its `.htaccess` with `tools/hosting/bugbounty-redirect.htaccess`. Every old link (including `/gallery.html` and `/assets/hof/...`) then forwards to the same path on the main domain with a permanent redirect.
4. Optional: connect this GitHub repository under Advanced, Git, so every push to the chosen branch deploys automatically.

**Other hosts** (GitHub Pages, Netlify, Cloudflare Pages, Vercel): point them at the repository root with no build command. `.htaccess` only applies to Apache or LiteSpeed; copy the headers from it into the host's own header settings for the same protection.

To preview locally: `npm run serve` (or any static file server) and open http://localhost:4173. Opening the HTML file directly from disk will not work because the pages load JSON and ES modules.

## Editing content

| What | Where |
| --- | --- |
| Text on the homepage | `index.html` |
| Case files and their replays | `data/cases.json` |
| Organizations, sectors, countries, Top 50 | `data/orgs.json` |
| Proof archive items | `data/gallery.json` (`src`, `title`, `domain`, `category`: `hof`, `letter`, `cert`, `swag`, `award` for competition results, `credential` for my certifications or `talk` for talks and workshops; optional `verify` link) |
| CV content | `tools/templates/cv.html` |
| Colors, type, spacing | `assets/css/site.css` (tokens at the top) |

### Adding an organization

Add one line to the `orgs` list in `data/orgs.json`:

```json
{"domain":"example.com","name":"Example","sector":"company","country":"NL","first":false,"top":false,"recognition":["hof","swag"],"url":"https://example.com/security/hall-of-fame"}
```

- `sector`: one of the keys in `sectors` (company, enterprise, government, education, finance, media, nonprofit, independent, sports, healthcare)
- `country`: a code from `countries`. For a new country add `{"code":"XY","name":"...","lat":..,"lon":..,"count":0}` there first. `XX` means not specified.
- `recognition`: any of `hof`, `swag`, `cert`, `letter`, `cve`, `ack`, `gift`
- `first`: `true` if you were the first researcher in that Hall of Fame
- `url` (optional): the public Hall of Fame page. It shows as a "Public page" link in the directory and on the matching screenshots.
- `bug` (optional): what the organization itself published next to my name. Only use their wording, taken from their own page, because it is shown in the "In their words" section.
- `note` (optional): a short line shown under the name, for example `"Sent a Steam gift card"`

Then run `npm run data && npm run globe && npm run prerender && npm run stamp`. Every count on the site updates by itself.

After changing data or images, run the matching script. `npm install` once first.

```bash
npm run images     # new or changed archive images -> web sized WebP in assets/img (and the hero wall thumbnails)
npm run globe      # data/orgs.json changed -> globe land dots and country markers
npm run prerender  # data/orgs.json changed -> rewrites the directory inside recognition.html
npm run assets     # favicon and app icons, social share image, static globe images and the CV PDF
npm run vendor     # fonts and the icon sprite (cuts fonts down when pyftsubset is installed)
npm run stamp      # run last: stamps CSS, JS, icon and CV links with a content version (?v=...)
npm run data       # validate data/orgs.json and recount countries
npm run build      # all of the above
```

Adding a new proof image: put the file in `assets/hof/` (or `letters`, `certs`, `swag`, `awards`, `credentials`), add an entry to `data/gallery.json`, run `npm run images`. If you skip the script the archive still works and shows the original file.

Why `npm run stamp` matters: browsers and Hostinger's cache keep old copies of CSS and JS. The stamp gives every changed file a new address, so nobody ever sees new pages with an old stylesheet.

## Case files and replays

`data/cases.json` holds every case. Each one has the meta rows, the story, a link to the published writeup, an optional `more` list of `[label, url]` pairs for further records of the same finding, and `steps`: an ordered list of `{label, body, code, lang}`. The steps are rendered twice: into the page as `<details>` so they work without JavaScript, and into the replay overlay that steps through them one at a time.

Rules for a new case: it must be fixed and already written up publicly, the target stays `redacted` unless the program allows naming it, and nothing in `code` may contain a live token, a real customer address or anything not already in the public writeup.

Run `npm run prerender && npm run stamp` after editing.

## Verify mode

The homepage has a verify mode (the "Verify my work" button, the floating button, or a link to `/?verify`). It highlights every claim and tags it with its source. To add or change a claim, put these attributes on the element in `index.html`:

```html
<li data-claim="1st at Root Breach CTF" data-src="gallery.html?q=root%20breach" data-src-label="Certificate">...</li>
```

- `data-claim`: a short name for the claim, read out in the verify bar
- `data-src`: where to check it (a page on this site or a public link). Leave it out for something real but private: the tag then offers the proof by email.
- `data-src-label`: what the source is, shown on the tag

## How it is built

- **Identity**: the red box. On every Hall of Fame screenshot the name is boxed in red, so the site uses the language of a disclosure report: redaction bars for what can't be published yet, case files, stamps.
- **Type**: Archivo (variable width and weight), JetBrains Mono and Big Shoulders Stencil, self hosted in `assets/fonts` and cut down to the characters the site uses.
- **Icons**: Phosphor Icons (MIT) compiled into one sprite, `assets/icons.svg`.
- **Globe**: hand written WebGL (`assets/js/globe.js`), about 25 KB of land data from Natural Earth via `world-atlas`. It refuses software rendering, so devices without a real GPU get a pre rendered image instead, and it lowers its own resolution or stops idle spinning if the frame rate drops.
- **Motion**: CSS animations, IntersectionObserver and one scroll listener for the sideways case files. The hero wall and drifting rows pause when off screen. Everything respects `prefers-reduced-motion`.
- **Themes**: dark and light, following the system setting with a manual toggle.
- **Search**: press Ctrl K or Cmd K (or `/`) anywhere to search sections, actions and every listed organization.
- **Security**: strict Content Security Policy with no inline scripts or styles, HSTS, frame denial and a `/.well-known/security.txt`. The slide deck under `talks/` carries its own `.htaccess` that loosens `style-src` alone, because the deck positions things through the style attribute; scripts there still have to come from this origin.
- **Checked with**: Lighthouse (100 for accessibility, best practices and SEO on every page), axe-core (no violations in either theme), html-validate (no errors).

## Disclosure and privacy

Only public, approved or safe to share material is published here. Private vulnerability details, internal URLs, credentials, customer data and undisclosed reports are never included. Some recognitions are not listed because of non disclosure agreements or program policy.

## Contact

- Email: parth.narula@scriptjacker.in
- Book a call: https://calendly.com/scriptjacker/30min
- LinkedIn: https://www.linkedin.com/in/parth-narula-86283821a/
- Medium: https://scriptjacker.medium.com
