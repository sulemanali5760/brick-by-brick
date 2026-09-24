# Build 0.8: "Openings"

Status: closed · 0.8.0 live (studio build, see [STUDIO.md](../STUDIO.md)) · base: 0.7.0 · roadmap row 0.8

## 1. Goal

A new job, the **Window wall**. You build the piers either side of a window opening, closing the reveals with half bricks on every other course. You set a **precast lintel** over the gap, then brick over it. When it's finished, a window frame goes in.

Pillars: 1 (a real technique that nobody learns from a straight wall) and 2 (a visible payoff).

Out of scope: doors, several openings per wall, cutting bricks, and the cracked-brick idea (moved to the backlog).

## 2. Data contract (all lanes code against this; only the director changes it)

**Geometry.** NF brick 240 mm, head joint 10 mm, 12 courses = 1 m.

| Item | Value |
|---|---|
| Wall | 1 straight section, **8 bricks × 12 courses** (1.99 m × 1.0 m) |
| Opening | Replaces bricks **3 and 4** of even courses (plus their joints), so the gap is 0.74 → 1.25 m along the wall = **0.51 m** clear |
| Gap courses | **2 to 7** (sill = course 2, 6 courses ≈ 0.50 m high) |
| Lintel course | **8**; courses 9–11 are brickwork over the lintel |
| Reveals | Even courses end at the jamb with a full brick. Odd courses end with a **half brick**, which lands exactly on the jamb (see the odd-course arithmetic in section 5). That's how the bond is kept at a reveal. |
| Lintel | Clay-shell precast lintel ("Flachsturz"), **0.99 m long** (1.00 m nominal in the 12.5 cm octametre grid, DIN 4172) × 0.115 × 0.071 m. That's exactly one course high, and it replaces bricks 2–5 of course 8. Bearing each side = (0.99 − 0.51) / 2 = **0.24 m**. |

The design lane verifies the minimum-bearing figure: the roadmap says 150 mm and manufacturers say 115 mm. Whichever it is gets cited in REFERENCES.md, and the test checks bearing ≥ that minimum.

**`data/content.json`**
- `jobs[3]`: `{ id: "window", name: "Window wall", lead: 2, …usual job keys, lintels: [x, z, rot] }`. `lintels` is where the lintel stack stands, like `pallet` and `halves`.
- `sections[0].openings: [{ kind: "window", from: 3, bricks: 2, sill: 2, head: 8 }]`: brick-grid units on even courses.
- `content.lintel: { length: 0.99, minBearing: <cited value> }`.
- `clipboard['grab-lintel']`, a `lintelCall` text, new `facts` (reveals, lintel bearing, brickwork over the lintel), and `learned` for the job.

**`buildSlots` output**
- No slots inside the gap on courses `sill … head-1`.
- Slots next to the gap get `reveal: 'start' | 'end'`, meaning the jamb is on that slot's start or end side.
- Course `head` holds one slot `{ kind: 'lintel', len: 0.99, bearing: 0.24, section, course, x, z, y, rot, joint, i }`, placed exactly where bricks 2–5 would be. The other slots of that course are unchanged.
- Existing jobs produce **identical** slots, and a test checks that.

**`createGame` API**
- `state.stock.lintel` holds the count. `state.hand` can be `'lintel'`, and a lintel is always carried one at a time (tongs don't apply).
- `nextAction` can return `'grab-lintel'` when the current slot is a lintel and your hand is empty. `'swap'` works as today.
- `grab('lintel', now)`, then `place` and `hit` work unchanged on a lintel slot: the ends `a` and `b` get levelled like a brick.
- **The robot never lays a lintel.** When a handed-over section reaches a lintel slot:
  - the robot stops, the section goes back to you (`handed = false`) and `tick` emits `{ event: 'lintelCall', section, slot }`;
  - if you're free (`cur === null`), `s.sec` and `s.cur` move to that slot; if you're busy on another wall, the call waits until you are;
  - after the lintel is set you can hand the section over again (`canHandOver` as today).
- `summary` is unchanged. A lintel counts as one "brick" in the results.

**Game act names:** `'lintels'` (the stack hitbox, and a belt button labelled **Lintel** that shows only when the job has lintels).

**Assets** (glTF, embedded, as in ASSETS.md):
- `assets/models/lintel.gltf`: 0.99 × 0.115 × 0.071 m. The long axis is +x, with the origin at the bottom centre, the same convention as the brick.
- `assets/models/lintel_stack.gltf`: 3 lintels on two timber bearers.
- `assets/models/window_frame.gltf`: timber frame with glass, outer size 0.50 × 0.49 m, depth 0.07 m, origin at the bottom centre, facing +z.

## 3. Lanes

### Lane R: rules and design, branch `feat/0.8-rules`
**Owns:** `js/rules.js`, `js/rules.test.mjs`, `data/content.json`, `docs/REFERENCES.md`, `docs/GDD.md`.
- Implement the contract in `buildSlots` and `createGame`.
- Add the `window` job. Unlock it after the yard job; the design lane decides how `finishJob` handles that.
- Tests:
  - no slot overlaps the gap
  - odd-course reveal slots are halves
  - lintel bearing is at least `minBearing` each side
  - the other jobs' slots are unchanged (compare against a snapshot)
  - `lintelCall` fires, and the section returns to the player
  - the lintel can't be placed with a brick in hand
- Balance: the human-pace bot with the robot finishes the Window wall in **≤ 10 min**, reported in the CI balance table.
- Write the texts: clipboard, facts and learned. Every fact gets a source in REFERENCES.md.

### Lane A: art, branch `feat/0.8-art`
**Owns:** `blender/make_assets.py`, `assets/`, `docs/ASSETS.md`, `docs/asset_lineup.png`, `docs/asset_report.json`.
- Build the three assets from the contract, **our own models with procedural textures only** (no downloads opened locally, L21):
  - the lintel: a clay U-shell with a visible concrete core at the ends
  - the stack: on two timber bearers
  - the window frame: a timber profile with glass
- Run Blender headless (L17). Check the lineup render yourself: rest on the lowest point (L15), with origins as specified.
- CI `assets` must pass. Keep each asset small (triangle budget in ASSETS.md; the lintel matters most, because up to a few can be on screen at once).

### Lane G: game and QA, branch `feat/0.8-game`
**Owns:** `js/game.js`, `index.html`, `qa/acceptance.mjs`, `.github/workflows/qa.yml`.
- Load the lintel stack at `job.lintels`, with a `'lintels'` hitbox, a belt button and a HUD hint.
- Render a laid lintel from `lintel.gltf` (placeholder box until Lane A's branch is merged in) at the slot, including levelling and the string line.
- On `lintelCall`: walk the camera to that section and show the call text. At job end, put `window_frame.gltf` into the opening before the admire shot.
- The QA bot handles `grab-lintel` with `act('lintels')` and passes the game clock (L24).
- Add **A11** on desktop: the Window wall with hand-over completes; the lintel was laid by the player; no brick mesh centre lies inside the gap; `lintelCall` fired at least once.
- Investigate: in the QA performance table the desktop frame time goes from **47 ms after the garden wall to 297 ms after the yard walls** (geometries 138 → 278). Find the root cause, whether it's a leak or simply the bigger scene, and fix it if it's a leak.
- Merge `origin/feat/0.8-rules` into your branch as soon as it's pushed (your CI needs its rules). Merge `origin/feat/0.8-art` for the models when it's ready.

## 4. Acceptance (the director checks these on `main` before release)

| # | Check |
|---|---|
| A11 | The Window wall completes in QA with a hand-over; the player lays the lintel; the gap stays empty; the frame is in. |
| R-balance | Human-pace bot with robot: Window wall ≤ 10 min. |
| Assets | `assets` CI passes; the lineup shows the lintel, stack and frame resting correctly. |
| A2/A4/A6/A8/A10 | No regressions (QA is green again since L24). |

## 5. Odd-course arithmetic (for Lane R's test)

Odd courses start with a half: 0.115 + joint, then full bricks at 0.125 + k × 0.25. The left jamb is at 3 × 0.25 − 0.01 = 0.74; the odd-course brick from 0.375 to 0.615, then a joint, then a half from 0.625 to **0.740** ✓. The right jamb is at 1.25: a half from 1.25 to 1.365, then a joint, then a full brick from 1.375 = 0.125 + 5 × 0.25 ✓.

## 6. Meeting minutes

**Meeting 1 (2026-09-24, all three lanes reported, first push green in every lane)**

| Lane | Result | Cost |
|---|---|---|
| R rules | Contract done. Other jobs' slots are identical to 0.7 (verbatim-copy test). Window wall with robot, human-pace bot: **5.7 min** (3.9 min with all tools); by hand 18.4 min. | ~163k tokens, 1 CI cycle |
| A art | lintel 40 tris / 145 KB, stack 144 / 290 KB, window frame 492 / 48 KB; glTF validator shows 0 errors and 0 warnings. | ~122k tokens, 1 CI cycle |
| G game + QA | Whole QA table green including **A11**: the player lays the lintel, the gap stays empty, `lintelCall` fires, the frame is in. The geometry leak is fixed: 138 → 332 became 44 → 57 → 60. | ~203k tokens, 1 CI cycle |

**Decisions**
- **Lintel minimum bearing = 115 mm** (Wienerberger and Schlagmann tables, cited in REFERENCES). The roadmap's 150 mm was UK practice, so ROADMAP is corrected.
- **Contract additions**, taken as they were built:
  - `lintelCall` also carries `moveTo` (when the player is free) and `robotDrive` (when other walls are queued).
  - `canHandOver()` is false while a lintel is the next slot.
  - The apprentice never fetches lintels.
  - `stock.lintel` always exists.
  - The far-jamb reveal slot has `joint: false`.
- **Model paths** are `assets/models/…` (the contract text is fixed).
- **CI frame times are software-GL noise**, not game cost. The game's JS is 2–6 ms per frame. QA now reports the median of 10 frames plus the JS time.
- **The QA run is about 42 min** since A11, so the job timeout is raised to 70 min.

**Carried to the backlog:** A11 on the phone and small views; a triangle budget in ASSETS.md (none exists yet); window-job camera and prop positions still need tuning in play.

**Process notes (for STUDIO.md next build)**
- The Agent tool's automatic worktree failed on this repo ("Failed to resolve HEAD"), so the director makes lane worktrees with `git worktree add ../bbb-lanes/<lane> -b feat/<v>-<lane>`.
- Lane A ran one local `python` read of a glTF file, which breaks the rule; it's flagged in its note. Rule restated: Blender only.
- Every lane was green on its first push, and there were no merge conflicts thanks to strict file ownership.
- Total ~488k tokens for a feature with rules, art, game and QA.
