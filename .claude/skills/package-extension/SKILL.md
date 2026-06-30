---
name: package-extension
description: Package the Meowdo extension into a Chrome Web Store zip (dist/<name>-v<version>.zip). Use when the user wants to build, package, or zip the extension for upload to the Web Store or for a release. Not for cutting a full GitHub release (use cut-release for that).
---

# Package the extension

Builds a clean, upload-ready zip containing only the runtime files, with `manifest.json` at the
zip root.

## Run it

```bash
./build.sh
```

- Requires `node` on PATH (reads `name` + `version` from `manifest.json`).
- Output: `dist/<name>-v<version>.zip`, where `<name>` is the slugified manifest `name`
  (e.g. `dist/meowdo-v1.0.0.zip`).
- The script **whitelists** the shipping files — `manifest.json`, `background.js`, `store.js`,
  `popup.*`, `offscreen.*`, `alert.*`, `icons/icon*.png`. Dev/build files (`build.sh`,
  `icons/gen_icons.py`, `README.md`, the `docs/` folder, etc.) are excluded.
- It fails loudly if any required whitelisted file is missing.

## After building

It prints the zip size and `unzip -l` listing — sanity-check that:
- `manifest.json` is at the **root** (not nested under a folder),
- no dev files leaked in,
- all four icon sizes and every runtime file are present.

## Notes

- To release a **new** version, bump `version` in `manifest.json` first (the output filename and
  the manifest must match). For the full release flow, use the `cut-release` skill.
- `dist/` and `*.zip` are gitignored — the zip is uploaded to the Web Store / attached to a
  GitHub release, not committed.
- If you added a new runtime file (another page, script, or asset), add it to the `FILES`
  whitelist in `build.sh` or it won't ship.
