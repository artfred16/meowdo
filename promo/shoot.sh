#!/usr/bin/env bash
#
# Render the Chrome Web Store assets from promo/*.html to dist/promo/*.png at their exact
# required sizes. Each page is shot at 2× for crisp text, then downscaled with sips. Output is
# gitignored (dist/) — it's an upload artifact, not source.
#
#   screenshots ....... 1280×800   (1–5)
#   small promo tile ..  440×280
#   marquee tile ...... 1400×560
#
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "ERROR: Chrome not found at $CHROME" >&2; exit 1; }

OUT="dist/promo"
mkdir -p "$OUT"

shoot() {  # <html> <width> <height> <out-name>
  local f="$1" w="$2" h="$3" out="$OUT/$4"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 --window-size="$w,$h" \
    --screenshot="$out" "$PWD/$f" >/dev/null 2>&1
  sips -z "$h" "$w" "$out" >/dev/null    # downscale 2× → exact W×H
  echo "wrote $out ($(sips -g pixelWidth -g pixelHeight "$out" | awk '/pixel/{printf $2" "}'))"
}

# Screenshots
shoot promo/01-overview.html  1280 800 screenshot-01.png
shoot promo/02-reminders.html 1280 800 screenshot-02.png
shoot promo/03-organize.html  1280 800 screenshot-03.png

# Promo tiles
shoot promo/tile-small.html    440 280 tile-small-440x280.png
shoot promo/tile-marquee.html 1400 560 tile-marquee-1400x560.png

echo "Done. Upload screenshots + tiles from $OUT to the Chrome Web Store listing."
