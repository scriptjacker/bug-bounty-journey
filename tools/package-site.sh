#!/usr/bin/env bash
# Builds site.zip with only the files a web server needs (no tools, node_modules or package files).
# Upload it to public_html and extract it there, or hand it to any static host.
set -euo pipefail
cd "$(dirname "$0")/.."
out="${1:-site.zip}"
rm -f "$out"
zip -qr -X "$out" \
  index.html gallery.html recognition.html 404.html \
  .htaccess robots.txt sitemap.xml site.webmanifest .well-known \
  favicon.svg favicon.ico apple-touch-icon.png Parth-Narula-CV.pdf \
  assets data \
  -x "*.md" "*/.DS_Store" "assets/*/test.md"
echo "built $out ($(du -h "$out" | cut -f1))"
