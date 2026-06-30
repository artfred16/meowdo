---
name: regenerate-icons
description: Regenerate the Meowdo extension icons (16/32/48/128 px cat-checklist on a blue gradient). Use when the icon design changed, the icons are missing, or after editing icons/gen_icons.py.
---

# Regenerate the Meowdo icons

The icons are drawn **procedurally** (no image editor, no dependencies) by a small Python script
using only the standard library.

## Run it

```bash
python3 icons/gen_icons.py
```

- No third-party dependencies (pure `struct`/`zlib`).
- Writes `icons/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` — the exact sizes
  referenced by `manifest.json` (`action.default_icon` and `icons`).

## Changing the design

Everything is in `icons/gen_icons.py`:
- **Colors** — the constants at the top (`BLUE`/`BLUE_DK` background gradient, `WHITE` for the
  ears/tail/checklist, `FAINT` for the inner ear and the unchecked task line).
- **Shape** — `icon_pixel(nx, ny, tiny)` returns the color for normalized coords (0–1): two cat
  ears (`in_tri`), a curling tail (`polyline`), and a two-row checklist (boxes + `tick`). The
  `tiny` branch (16px) collapses to a bold checkmark wearing little ears.
- `make(n)` rasterizes at size `n` with supersampling onto the rounded-square gradient; `png()`
  encodes.

After editing, re-run the command and reload the unpacked extension to see the new icons. Keep
the 128px icon recognizable when scaled to 16px (the toolbar size) — that's why the small size
drops to just the checkmark + ears.
