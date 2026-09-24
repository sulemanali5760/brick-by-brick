# Lessons log

Read before every build. Add an entry whenever something goes wrong. Each entry records what happened, why, and the rule we follow now.

## Hosting and delivery

| # | What went wrong | Root cause | Rule now |
|---|---|---|---|
| L1 | Claude artifacts refused `.glb` and `.hdr` | the artifact host serves only standard web types | Models ship as self-contained `.gltf`; the sky ships as a tone-mapped `.jpg` (Blender converts it). |
| L2 | Risk that `.gltf` buffers stored as `data:` URIs get blocked | strict CSP can block `fetch()` of `data:` URIs | `loadGltf()` decodes the buffer itself and parses an in-memory GLB. Keep it. |
| L3 | The page worked in the artifact wrapper but not on its own | artifacts inject `<!doctype>`, `[hidden]{display:none!important}` and a body reset | `index.html` is a full document with those rules in its own CSS. |
| L4 | After a release, the browser mixed a cached old `game.js` with the new page | GitHub Pages sends `max-age=600` | Every URL carries `?v=` from the single version in `index.html`. Bump it on every release. |
| L5 | Claude can't open artifacts in its own browser (sign-in wall) | artifacts are private to the owner's account | Test on GitHub Pages, which is public. |

## Testing and tooling

| # | What went wrong | Root cause | Rule now |
|---|---|---|---|
| L6 | Screenshots showed only the top-left part of the page, so the HUD and arms looked "missing" | the pane captures device pixels at DPR 1.25, cropped to 800×500 | Emulate **640×400** before screenshots (640 × 1.25 = 800). Confirm layout with `getBoundingClientRect`, not by eye. |
| L7 | `elementFromPoint` said the HUD wasn't there | the HUD has `pointer-events:none`, which `elementFromPoint` skips | Use bounding rects. |
| L8 | A CI assertion ("the mortar went off at least once") failed at random | it depended on a timing accident in a random simulation | Test each mechanic with its own deterministic case; simulations only check invariants. |
| L9 | A bash heredoc holding Python with backticks and quotes broke | shell quoting | Write patch scripts to a file in the scratchpad, then run them. |
| L9b | **Relapse (0.7 QA):** inline heredoc Python wrote `'\\n'` into JS as a real line break, a syntax error that cost a CI cycle | L9 ignored "for a small change" | No inline heredoc edits of JS at all: use the Edit tool or a patch file, even for one line. |
| L10 | Local `node` runs aren't allowed on his PC | his security rule | Rules tests run in GitHub Actions (`rules` workflow). Blender scripts are allowed. |
| L11 | Waiting for CI with `sleep` was blocked | harness rule | Use `until …; do sleep 5; done` loops on real conditions. |
| L19 | The 3D view went flat grey after the test viewport was resized | one layout pass reported a 0-px height, so the aspect became 0/0 = NaN and the projection stayed NaN | `resize()` ignores 0-size passes (0.4.2). Guard any divide by a layout size. |
| L20 | A screenshot straight after a JS action showed the old HUD | the pane's capture lags a frame or two | Wait ≥ 1 s after an action before a screenshot; trust JS state over pixels. |
| L21 | Downloaded Poly Haven files were opened in local Blender (the texture for the tub and pallet, the conversion of the cement bag and tape measure) | not a bug, but it goes against his security rule: web downloads must not be opened on his laptop | Local Blender builds only our own models with procedural textures. Downloads are fetched, converted (`blender/convert_polyhaven.py`) and validated (`tools/validate_assets.mjs`) in GitHub Actions and viewed on Pages. |
| L22 | Projection maths returned NaN in tests on the phone viewport | the browser pane was **hidden**, so `requestAnimationFrame` never ran and the camera matrices were never updated | Check `document.visibilityState` first; in test scripts call `camera.updateMatrixWorld()` before projecting. |
| L23 | An end-tap registered at the wrong end on angled views | the tap position came from the padded hitbox surface, where the ray enters the box nearest the camera | Measure player intent in **screen space** (along the projected brick axis), not on padded hitboxes. |

## Design

| # | What went wrong | Root cause | Rule now |
|---|---|---|---|
| L12 | A bot scored 52/52 Perfect by blind tapping (0.2) | the brick auto-locked at the line, so a tap could never overshoot | Every mechanic gets a **bot balance run in CI**. If the bot aces it, it isn't a skill yet. |
| L13 | After the tilt was added (0.3) the bot still scored 100% | unlimited light taps cost nothing | Every choice needs a cost. Here time: the mortar sets under the brick (0.4). |
| L14 | The bigger trowel plus the short corner open time made the bot worse (34/48) | upgrades interact with job parameters | This is fine as a trade-off, but read the balance table every build. |

## Assets

| # | What went wrong | Root cause | Rule now |
|---|---|---|---|
| L15 | The trowel blade rendered under the ground in the lineup | the model origin is at the grip, by design | The lineup rests every item on its lowest point; keep origins as documented in ASSETS.md. |
| L16 | Poly Haven's `trowel_01` is a garden trowel | the asset name doesn't say which kind | Check the thumbnail before using any downloaded asset. |
| L17 | The Blender MCP CLI couldn't find Blender | no `BLENDER_PATH` for the MCP server | Call `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe --background --factory-startup --python …` directly. |

## Process

| # | What went wrong | Root cause | Rule now |
|---|---|---|---|
| L18 | 0.4 → 0.4.1 → 0.4.2 shipped within minutes (patch chain) | fixing symptoms as they appeared, without a plan | Every build has a plan in `docs/builds/`; investigate to the root cause first; bundle fixes. |
