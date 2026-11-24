# CV build

| File | What it does |
| --- | --- |
| `content.mjs` | All CV wording, for both versions |
| `render-html.mjs` | Data to HTML, printed to PDF by Chromium |
| `render_docx.py` | Data to Word (python-docx) |
| `build.mjs` | `npm run cv`, builds everything |
| `ats_check.py` | `npm run cv:check`, reads every file back like a parser |
| `keywords.json` | Role profiles from real job ads, used by the check |

## The private file

The client version is built only when `private/cv-clients.json` exists at the repository root.
Never commit it: the repository is public, and the file names clients and their contacts.

```json
{
 "engagements": [
  { "client": "Client name", "country": "Netherlands", "when": "May 2025 to Nov 2026",
    "text": "One sentence on scope and result. Starts with a verb." }
 ],
 "otherClients": "Other clients include ...",
 "references": [
  { "name": "Full name", "role": "Their title", "org": "Company, Country", "email": "name@company.com" }
 ]
}
```

Only list someone under `references` after they have agreed to be contacted.
