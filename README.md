# Brick by Brick

First-person bricklaying game with real techniques and real NF brick dimensions.

**Play:** https://sulemanali5760.github.io/brick-by-brick/

Lay walls on a string line, beat the setting mortar, chain perfect bricks for bonus pay, and spend your wages on better tools. See [CHANGELOG](CHANGELOG.md).

| Path | What |
|---|---|
| `index.html`, `js/game.js` | Three.js scene, first-person rig, input, sound, HUD |
| `js/rules.js` | Game rules, engine-free (ports to Godot) · self-check: `node js/rules.test.mjs` |
| `data/content.json` | Wall layout, tolerances, pay, foreman texts and facts |
| `assets/` | `.gltf` models, Poly Haven textures, sky |
| `blender/make_assets.py` | Rebuilds every model headless with Blender 5.2 |
| `tools/fetch_polyhaven.py` | Re-downloads the CC0 Poly Haven assets |
| `docs/` | [GDD](docs/GDD.md) · [assets](docs/ASSETS.md) · [references](docs/REFERENCES.md) |
| `prototype-2d.html` | The earlier 2D concept with the long-term design (shop, house, coop, stadium) |

The game needs to be served over HTTP (ES modules and `fetch`); opening `index.html` from disk won't work. GitHub Pages serves `main` as-is; the `rules` workflow runs the rules self-check on every push.
