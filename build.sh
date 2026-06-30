#!/usr/bin/env bash
#
# Package the extension for the Chrome Web Store.
# Produces dist/<name>-v<version>.zip (name/version read from manifest.json) containing only
# the runtime files (manifest at the zip root, no dev/build files).
#
set -euo pipefail
cd "$(dirname "$0")"

VERSION="$(node -p "require('./manifest.json').version")"
NAME="$(node -p "require('./manifest.json').name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+\$/g,'')")"
OUT="dist/${NAME}-v${VERSION}.zip"

# Whitelist of files that ship in the extension (everything else is excluded).
FILES=(
  manifest.json
  background.js
  store.js
  popup.html popup.css popup.js
  offscreen.html offscreen.js
  alert.html alert.css alert.js
  icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png
)

for f in "${FILES[@]}"; do
  [ -f "$f" ] || { echo "ERROR: missing $f" >&2; exit 1; }
done

mkdir -p dist
rm -f "$OUT"
# -X strips macOS extension attributes for a clean, reproducible archive.
zip -q -X "$OUT" "${FILES[@]}"

echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
echo
unzip -l "$OUT"
