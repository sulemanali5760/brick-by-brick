# Build 0.9: "First resident"

Status: in progress (studio build, see [STUDIO.md](../STUDIO.md)) · base: 0.8.0 · roadmap row 0.9

## 1. Goal

The game gets its heart (pillar 6, "someone to build for"). **Bruno**, a stray dog who sleeps under the site's pallet stack, gets a **brick kennel**:
- a closed box with **four corners**;
- a **door opening with a lintel** (reusing 0.8);
- a **raised timber floor** and a **roof**.

At the end Bruno walks in and lies down. That's the new payoff shot. Residents, XP with a level, and the village list arrive in the save.

Tone rule (ROADMAP): residents have dignity. XP and pay come from the work; the resident gives thanks.

Out of scope: the village scene (0.11), other residents, juice and robot accuracy (0.10), people residents (0.12).

## 2. Data contract (all lanes code against this; only the director changes it)

**Kennel geometry** (NF brick, 12 courses = 1 m)

| Item | Value | Who fixes the details |
|---|---|---|
| Outer size | **5 × 4 bricks**: 1.24 m (front/back, along x) × 0.99 m (sides, along z), wall 0.115 thick | fixed |
| Inside | ≈ 1.01 × 0.76 m | follows |
| Height | **8 or 9 courses**; Lane R picks the minimum brickwork over the lintel from a cited source | R |
| Corners | all four in real corner bond: courses alternate which wall runs through the corner | R |
| Door | in the front wall, **clear width ≥ 0.30 m** and bond-aligned (e.g. 1½ bricks = 0.385 m), **height 5 courses**, sill at course 1 | R picks the exact width and position |
| Lintel | the 0.99 m clay lintel from 0.8 with ≥ 115 mm bearing, or a shorter real lintel if one is sourced; same `kind: 'lintel'` slot | R |

**`data/content.json`**
- `jobs[4]`: `{ id: "kennel", name: "Bruno's kennel", resident: "bruno", lead: 2, …usual keys, lintels, sections: [{ layout: "box", o: [x, z], size: [5, 4], courses, openings: [{ kind: "door", face: "front", … }] }] }`. `o` is the outer front-left corner; the front face is at −z, facing the camera start.
- `content.residents: [{ id: "bruno", kind: "dog", name: "Bruno", job: "kennel", intro: [2–3 short lines], request: "…", thanks: "…", xp: 50 }]`. Write it in plain, warm, short sentences, the foreman telling you about Bruno. No pity, no cutesy baby talk.
- `content.levels: [0, 100, 250, 450, 700]`: XP needed for levels 1–5.
- New `facts` (kennel: raised floor keeps damp and cold off, a door offset from the wind, corner bond on four corners) and `learned.kennel`, with sources in REFERENCES.md.

**`buildSlots` output for `layout: "box"`**
- Every slot is as today (`section`, `course`, `kind`, `len`, `rot`, `x`, `z`, `y`, `joint`, `i`, `last`, `reveal`), laid **course by course around the box**, starting at the front-left corner and going front → right → back → left.
- The slot's `rot` is 0 on the front and back and 1 on the sides; `x` and `z` are the centre as usual.
- A door opening works as in 0.8: no slots in the gap, `reveal` beside it, and one `lintel` slot at the head course.
- Existing layouts produce **identical** slots, and the 0.8 snapshot test must stay green.

**`createGame` and campaign API**
- Unchanged for play: a box is one section with lead 2, hand-over and `lintelCall` as in 0.8.
- `newSave()` gains `xp: 0` and `village: []`. **Old saves** must load: missing keys default.
- `finishJob(save, content, job, summary)` also returns `{ xp, level, levelUp, resident }`. XP = 1 per brick you laid + the resident's `xp` when the job has a resident. It pushes `{ resident, job }` to `save.village` (once per resident).
- `levelFor(content, xp)` returns `{ level, into, next }` for the HUD bar.

**Assets** (`assets/models/`, embedded glTF, our own procedural models, origin at the bottom centre unless stated otherwise)

| File | Size (m) | Notes |
|---|---|---|
| `kennel_roof.gltf` | 1.40 × 1.15, mono-pitch ~10°, falls to the back | timber boards plus dark roofing felt; the origin is at the bottom centre of the **roof's underside**, sitting on the wall top |
| `kennel_floor.gltf` | 0.98 × 0.73 × 0.06 | boards on two battens; goes inside |
| `dog_stand.gltf`, `dog_lie.gltf` | about 0.55 long, 0.40 at the shoulder | Bruno: a low-poly mixed-breed stray, brown with a white chest, facing +z; two separate poses, no rig |
| `dog_bowl.gltf` | Ø 0.18 | steel bowl |
| `name_board.gltf` | 0.30 × 0.08 | small timber board; the game can put a text texture on the face named `name_face` |

Budget: the dog ≤ 1,500 triangles per pose; everything else ≤ 500.

## 3. Lanes

### Lane R: rules and design, branch `feat/0.9-rules`
**Owns:** `js/rules.js`, `js/rules.test.mjs`, `data/content.json`, `docs/REFERENCES.md`, `docs/GDD.md`.
- Implement the `box` layout with the door and lintel.
- Implement the residents, XP and village save as specified in the contract.
- Tests:
  - no two slots overlap
  - all four corners alternate the through-wall by course
  - nothing sits in the door gap
  - the lintel bearing is at least `minBearing`
  - old layouts are unchanged (snapshot)
  - old saves load
  - `finishJob` returns the right XP and level-up, and pushes to `village` exactly once
- Balance: the kennel takes ≤ 8 min with the robot for the human-pace bot.
- Put the final door width and position, the height and the lintel choice **in your meeting note**. Lane G reads them from your slots, so it doesn't need them written down anywhere else.
- Push early, once `buildSlots` and its tests are in, because Lane G merges your branch.

### Lane A: art, branch `feat/0.9-art`
**Owns:** `blender/make_assets.py`, `blender/assets.blend`, `assets/models/`, `docs/ASSETS.md`, `docs/asset_lineup.png`, `docs/asset_report.json`.
- Build the six assets in the table. Bruno should read as a lovable, slightly scruffy stray from 3 m away: a simple silhouette, one ear up and one flopped.
- Our own models with procedural textures only; Blender headless (L17). Blender is the **only** local execution; no local `python` or `node` (0.8 note).
- Keep existing assets unchanged (restore them from git if the script regenerates them, as in 0.8).
- Add a **triangle budget table** to ASSETS.md (a 0.8 carry-over).

### Lane G: game and QA, branch `feat/0.9-game`
**Owns:** `js/game.js`, `index.html`, `qa/acceptance.mjs`, `.github/workflows/qa.yml`.
- **Box layout in the scene:** a footing under the whole rectangle, string lines on all four faces, and the camera start facing the front.
- **Resident intro:** the start card shows the resident's name, intro and request for jobs with a `resident`. Bruno (`dog_lie`) lies by the pallet at the start.
- **Move-in:**
  1. After the last brick, the floor and roof go on (a short drop-in animation).
  2. Bruno stands, walks to the door and goes in to lie on the floor. It's a simple tween, with no rig.
  3. The bowl and name board appear.
  4. Then the admire shot and the end card: "**Bruno moved in**", the thanks line, **+XP and the level bar**, and a level-up flash.
- The HUD shows the level and XP bar somewhere unobtrusive.
- **QA A12 (desktop):**
  - the kennel completes with hand-over, and the lintel was laid by you;
  - the dog ends inside the box footprint;
  - `save.village` contains `bruno`;
  - XP went up.
- A2, A4, A6, A8, A10 and A11 must stay green.
- Merge `origin/feat/0.9-rules` as soon as it's pushed, and `origin/feat/0.9-art` when it's ready. Use placeholders until then (as in 0.8).

## 4. Acceptance (the director checks these on `main` before release)

| # | Check |
|---|---|
| A12 | The kennel completes in QA with a hand-over; Bruno moves in (inside the footprint); the village and XP are saved. |
| R-balance | Kennel ≤ 8 min, human-pace bot with robot. |
| Assets | `assets` CI passes; the budget table exists; the lineup shows all six assets correctly. |
| Tone | The director reads every resident line: dignified, warm, short. |
| Regressions | A2/A4/A6/A8/A10/A11 stay green. |

## 5. Meeting minutes

_(director fills this in when all lanes have reported)_
