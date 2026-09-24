# Build 0.5 — "Feel pass"

Status: planned · base: 0.4.2 (live)

## 1. Play-test findings (QA, 0.4.2 on GitHub Pages, 640×400 and a scripted full run)

| # | Finding | Owner |
|---|---|---|
| F1 | The first-person arms read as **two yellow blocks at the bottom edge**. Sleeves are off-screen, the trowel blade is barely visible, and the mortar lump can't be seen. The "I'm a bricklayer" feeling is missing. | Art, Eng |
| F2 | The work area is small on screen: the camera stands 1.05 m back and the wall fills about a third of the width. | Level |
| F3 | The HUD covers the work: the level gauge sits on top of the wall, and the foreman toast covers the lower third, hands included. | UX |
| F4 | At job end the result card instantly covers the finished wall. There's no moment to admire it, even though the finished wall is the reward (see screenshot notes). | Design, UX |
| F5 | Economy: a scripted run earns €115 on job 1, while the whole shop costs €87, so everything is bought after one job. Streak ×3 at 10 in a row is too generous. | Design |
| F6 | The CI bot acts every 1.5 s with instant knocks. That's faster than a human, so its Perfect rate says little about human difficulty. | QA, Eng |
| F7 | Phone layout and tap-to-act haven't been verified yet. | QA |
| F8 | The bricks in the finished wall look too uniform; real walls vary in tone. | Art |

## 2. Goals

1. The hands and tools look and feel like **your** hands on site (F1).
2. The work, not the HUD, fills the screen (F2, F3).
3. Finishing a job feels like a payoff (F4).
4. Money forces a choice between upgrades (F5), backed by a human-speed balance report on every build (F6).

## 3. Team tasks

**Art (Blender, `make_assets.py`)**
- New `fp_arms` v2: rounded forearms in hi-vis sleeves with a reflective band, knit cuffs, and gloves with shaped fingers (subdivided, then applied).
  - `ArmR`: a fist whose grip axis points forward, so the trowel handle sits *in* the hand.
  - `ArmL`: hand over the top of a brick, fingers curled down the far side, thumb on the near side.
  - Two-tone glove: grey knit back, yellow nitrile palm and fingers. Budget under 6k triangles per arm.
- Brick tone variation: done in the game with per-instance colour jitter (±10% lightness, small hue shift). No new model needed.

**Level design**
- Garden wall: camera starts at z = 0.85, pitch −0.82. Corner: nudged in to match. Pallet and tub stay one head-turn away.
- A per-job "admire" viewpoint used by the finish sequence.

**Engineering**
- Re-seat the right arm, left arm and trowel for the new model: hands visible in the lower third at 16:10 and on phones.
- Finish sequence: freeze input, ease the camera to the admire viewpoint over 2.5 s, then show the result card as a **side panel** (desktop) or bottom sheet (phone), so the wall stays visible.
- CI balance report: add a *human-profile* bot (2.4 s per action; knocks take their hold time) and write a table of Perfect %, pay and time per job and upgrade set to the GitHub job summary.

**UX**
- Level gauge moves to the right of the screen centre, level with the crosshair, so it doesn't cover the wall.
- Foreman toast moves under the clipboard (top left), same width, max 3 lines. On phones it sits at the top.
- End card: side panel on desktop, bottom sheet on phones.

**Game design / economy**
- Pay: Perfect €0.60, Good €0.40, Rough €0.20.
- Streak tiers: 4 in a row ×1.25, 8 ×1.5, 12 ×2.
- Prices: bigger trowel €20, retarder €15, tongs €25, apprentice €45 (total €105).
- Target: a good human earns €30–50 per job, enough for one or two tools.

**QA**
- Run the acceptance list below on the live build at 640×400 (screenshot frame, see LESSONS L6) and at 375×812 (phone).

## 4. Acceptance checks

| # | Check | How |
|---|---|---|
| A1 | Both gloves, at least one sleeve, and the trowel blade are visible in the idle pose; a held brick is visible in the left hand. | screenshots, desktop and phone |
| A2 | The gauge box doesn't overlap the projected rectangle of the brick being levelled. | JS: `getBoundingClientRect` vs projected slot corners |
| A3 | The toast doesn't cover the middle 60% × lower 50% of the screen. | JS rects |
| A4 | Finishing a job shows the whole wall for ≥ 2 s before the card, and the card leaves the wall's screen centre uncovered on desktop. | scripted run plus screenshot |
| A5 | CI balance table: the human-profile bot earns €25–60 on each job with no upgrades; tables appear in the Actions summary. | CI |
| A6 | Phone 375×812: the HUD doesn't overlap itself; tapping the tub, the pallet and the slot works via real pointer events. | browser pane, mobile preset |
| A7 | The rules tests stay green. | CI |

## 5. QA results (live 0.5.0)

| # | Result | Notes |
|---|---|---|
| A1 | ✅ pass | Both gloves, the trowel with a mortar lump, and the brick in the left hand all visible (640×400). |
| A2 | ❌ fail | The gauge sits at a fixed spot right of the crosshair and covers 18 of the 52 slots from the default view. |
| A3 | ⚠️ partial | At 640×400 the toast (16–396 px) touches the gauge (from 390 px). Fine at 1280×800. |
| A4 | ⚠️ partial | The admire pull-back works. The "beside" card covers the wall below about 1000 px width (it's 540 px wide). |
| A5 | ✅ pass | Human-pace, no tools: garden €57.60, corner €27.10; the report appears in the Actions summary. |
| A6 | ⚠️ partial | Real touch events spread, lay and tap correctly on 375×812. **New bug:** a tap's position along the brick comes from the padded hitbox surface, so on angled views an end-tap registers at the wrong end. |
| A7 | ✅ pass | rules + assets workflows green; all 11 models pass the Khronos validator. |

Also found: the stat "Re-laid" now counts bricks that set proud, so rename it to "Rough". The mortar clock runs while the tab is hidden. The tub's mortar texture reads almost white in sunlight.

## 6. 0.5.1 — fixes for the failed checks (same build, no new features)
1. **Gauge follows the brick:** each frame while levelling, project the brick and put the gauge on the side with more room, clamped to the screen (A2, A3).
2. **Tap position in screen space:** u = where the tap falls along the brick's on-screen axis, not the hitbox hit point (A6).
3. **Result card:** beside the wall only from 1000 px wide; below that, a bottom sheet capped at 60% height (A4).
4. Rename "Re-laid" to "Rough"; the toast stack is capped at `50% − 40px` width.
5. **Pause while the tab is hidden:** shift the mortar and job clocks by the hidden time.
6. Art: darken the tub mortar texture.
Re-run A2, A3, A4 and A6 on the live build after the fix.
