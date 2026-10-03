# Parth Narula, security researcher

Portfolio of Parth Narula (ScriptJacker). One site that combines the old personal portfolio and the bug bounty proof archive.

- **Home** (`index.html`): who I am, what I test, highlights, experience, testimonials, writing, contact. Interactive WebGL globe built from the real recognition data.
- **Proof of work** (`gallery.html`): Hall of Fame screenshots, letters, certificates and swag photos with filters, search and a lightbox.
- **Organizations** (`recognition.html`): the most recognizable names and every publicly listed organization, filterable and searchable.
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
| Organizations, sectors, countries, Top 50 | `data/orgs.json` |
| Gallery items | `data/gallery.json` (`src`, `title`, `domain`, `category`: `hof`, `letter`, `cert` or `swag`) |
| CV content | `tools/templates/cv.html` |
| Colors, type, spacing | `assets/css/site.css` (tokens at the top) |

### Adding an organization

Add one line to the `orgs` list in `data/orgs.json`:

```json
{"domain":"example.com","name":"Example","sector":"company","country":"NL","first":false,"top":false,"recognition":["hof","swag"]}
```

- `sector`: one of the keys in `sectors` (company, enterprise, government, education, finance, media, nonprofit, independent, sports, healthcare)
- `country`: a code from `countries`. For a new country add `{"code":"XY","name":"...","lat":..,"lon":..,"count":0}` there first. `XX` means not specified.
- `recognition`: any of `hof`, `swag`, `cert`, `letter`, `cve`, `ack`
- `first`: `true` if you were the first researcher in that Hall of Fame

Then run `npm run data && npm run globe && npm run prerender`. Every count on the site updates by itself.

After changing data or images, run the matching script. `npm install` once first.

```bash
npm run images     # new or changed gallery images -> web sized WebP in assets/img
npm run globe      # data/orgs.json changed -> globe land dots and country markers
npm run prerender  # data/orgs.json changed -> rewrites the directory inside recognition.html
npm run assets     # favicon, social share image, static globe images and the CV PDF
npm run data       # validate data/orgs.json and recount countries
npm run build      # all of the above
```

Adding a new proof image: put the file in `assets/hof/` (or `letters`, `certs`, `swag`), add an entry to `data/gallery.json`, run `npm run images`. If you skip the script the gallery still works and shows the original file.

## How it is built

- **Type**: Geist and Geist Mono, self hosted (`assets/fonts`).
- **Icons**: Phosphor Icons (MIT) compiled into one sprite, `assets/icons.svg`.
- **Globe**: hand written WebGL (`assets/js/globe.js`), about 25 KB of land data from Natural Earth via `world-atlas`. It refuses software rendering, so devices without a real GPU get a pre rendered image instead, and it lowers its own resolution or stops idle spinning if the frame rate drops.
- **Motion**: CSS transitions and IntersectionObserver only. Everything respects `prefers-reduced-motion`.
- **Themes**: dark and light, following the system setting with a manual toggle.
- **Search**: press Ctrl K or Cmd K (or `/`) anywhere to search sections, actions and every listed organization.
- **Security**: strict Content Security Policy with no inline scripts or styles, HSTS, frame denial and a `/.well-known/security.txt`.
- **Checked with**: Lighthouse (100 for accessibility, best practices and SEO on every page), axe-core (no violations in either theme), html-validate (no errors).

## Disclosure and privacy

Only public, approved or safe to share material is published here. Private vulnerability details, internal URLs, credentials, customer data and undisclosed reports are never included. Some recognitions are not listed because of non disclosure agreements or program policy.

## Contact

- Email: parth.narula@scriptjacker.in
- Book a call: https://calendly.com/scriptjacker/30min
- LinkedIn: https://www.linkedin.com/in/parth-narula-86283821a/
- Medium: https://scriptjacker.medium.com
