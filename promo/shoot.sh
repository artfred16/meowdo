#!/usr/bin/env bash
#
# Render the Chrome Web Store screenshots from promo/*.html to dist/promo/*.png at exactly
# 1280×800 (the store spec). Each page is shot at 2× for crisp text, then downscaled with sips.
# Output is gitignored (dist/) — it's an upload artifact, not source.
#
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "ERROR: Chrome not found at $CHROME" >&2; exit 1; }

OUT="dist/promo"
mkdir -p "$OUT"

i=1
for f in promo/01-overview.html promo/02-reminders.html promo/03-organize.html; do
  n=$(printf "%02d" "$i")
  png="$OUT/screenshot-$n.png"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 --window-size=1280,800 \
    --screenshot="$png" "$PWD/$f" >/dev/null 2>&1
  sips -z 800 1280 "$png" >/dev/null    # downscale 2560×1600 → 1280×800
  echo "wrote $png ($(sips -g pixelWidth -g pixelHeight "$png" | awk '/pixel/{printf $2" "}'))"
  i=$((i + 1))
done
echo "Done. Upload these to the Chrome Web Store listing."
