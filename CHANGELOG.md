# Changelog

## 0.8: Openings ([plan](docs/builds/08-openings.md), first studio build)
- **New job, the Window wall** (unlocked after the Yard walls). An 8-brick wall with a 0.51 m window opening:
  - build the piers on either side, closing the reveals with **half bricks on every other course** to keep the bond;
  - set a **precast clay lintel** (0.99 m, 24 cm bearing each side), then brick over it;
  - a window frame goes in at the end.
- **The robot calls you back for the lintel:** it lays the bricks but never a lintel, so it stops and hands the wall back to you.
- New models: lintel, lintel stack, window frame.
- New facts: reveals, lintel bearing (at least 115 mm), brickwork over a lintel.
- Performance: beds and head joints share one geometry, and a cleared job frees its geometries and materials (the geometry count no longer grows from job to job).
- QA is green again: the bot uses the game clock (L24), fast-forward is measured per frame (L25), and the new check A11 plays the Window wall.

## 0.7 — Phone and flow ([plan](docs/builds/07-phone-flow.md))
- **Tool belt on touch screens:** Mortar · Brick · Half · Sound buttons along the bottom. No more turning round to the tub and the pallet. The button you need next is highlighted.
- **Follow camera on touch screens:** the view turns to keep the brick you're working on in sight (it waits 2 s after you drag).
- **Fast-forward:** while the robot finishes walls you've handed over, **Speed ×4** (or F) runs the job clock four times faster.
- **One game clock** drives mortar, robot and animations; a hidden tab simply pauses the game.

## 0.6 — Crew: hand over and move on ([plan](docs/builds/06-momentum.md))
- **Bricklaying robot:** unlocked by finishing the garden wall. Lay a wall's first two courses yourself (the lead sets the line and the bond), then **hand it over (H or the button)**. The robot finishes the wall while you move on. It turns its boom to each brick and lowers it into place.
- **New job 3, Yard walls:** three walls around a yard. Lead each one, hand it over, and the camera walks you to the next wall. The robot drives from wall to wall through its queue.
- The corner can also be handed over after its lead courses.
- **Shop:** Robot: faster arm (€30) halves the time per brick.
- **HUD:** job progress bar, robot status line, a hand-over button once the lead is done, and a string line per wall that climbs with that wall.
- Robot bricks pay €0.30 each; your own Perfects still pay more.
- **QA:** the rules tests cover sections, the lead gate, robot completion and stock conservation; the acceptance run plays Yard walls with hand-overs (A8).

## 0.5 — Feel pass ([plan](docs/builds/05-feel.md))
- **New first-person hands** (Blender): tapered hi-vis sleeves, knit cuffs, a right fist gripping the trowel handle, a left hand gripping the brick from above. They now sit in view, and move inward on portrait phones.
- **Closer framing:** the wall fills more of the screen.
- **HUD off the work area:** the level gauge sits beside the crosshair, and foreman messages stack under the clipboard.
- **Admire moment:** when a job is done the hands drop, the camera eases back to show the whole wall, and the result card slides in beside it.
- **Economy:** Perfect €0.60 / Good €0.40 / Rough €0.20; streak ×1.25 at 4, ×1.5 at 8, ×2 at 12; tools €20/€15/€25/€45. One job now buys one or two tools, not the whole shop.
- Stronger brick-to-brick tone variation, as in real walls.
- **Pipeline:** downloaded assets are fetched, converted and validated only on GitHub (new `polyhaven` and `assets` workflows). Local Blender builds our models with procedural textures.
- **QA:** every build now posts a balance report (fast bot vs human-pace player) to the Actions summary.
- **0.5.4:** the HUD hides during the finish sequence; on screens under 1000 px the admire shot frames the wall above the result sheet.
- **0.5.3:** low-graphics mode via `?q=low` (no shadows or antialiasing, 1× pixels) for weak devices, also used by the automated QA run.
- **0.5.1 (QA fixes, see the plan's §5–6):** the level gauge follows the brick you're levelling and never covers it; taps on a brick end are measured on screen, so they're right from any angle; the result card is a bottom sheet below 1000 px wide; the game pauses its clocks while the tab is hidden; "Re-laid" is now "Rough"; the tub mortar is less white.

## 0.4 — Mortar sets under the brick too
- **Balance fix:** the 0.3 bot still scored 100% Perfect, because patient light taps cost nothing. The mortar now keeps setting while you level a brick. If it goes off first, the brick **sets proud** where it is and pays Rough. That makes a real choice between fast knocks and careful taps.
- The mortar bar stays visible while you're levelling.
- **0.4.1 hotfix:** browsers mixed cached 0.3 scripts with the 0.4 page. Every file URL now carries the release version.

## 0.3 — Level both ends
- **Design fix:** play-testing showed a bot could score 52/52 Perfect by tapping blindly. Bricks now land **tilted**. You tap where you aim (left end, middle or right end), and **both ends** must finish within 1 mm of the line.
- The knock is now analogue: the longer you hold, the harder it strikes (2–5 mm). The crosshair shows the charge and the expected knock.
- New side-view level gauge: the brick against the pink string line, with the green ±1 mm band.
- The brick visibly tilts in 3D (exaggerated 3×).
- Fixed the uneven job-list rows (box-sizing).
- The rules test is now deterministic: the mortar-going-off check has its own test instead of relying on timing.

## 0.2 — Mortar, streaks, corners, tools
- **Setting mortar:** a bed stays workable for a limited time (30 s garden wall, 20 s corner on a hot afternoon). It darkens when fresh and pales as it stiffens; stiff mortar has to be scraped off and re-spread.
- **Streaks:** 3 perfect bricks in a row pay ×1.5, 6 pay ×2, 10 pay ×3. The chime rises with the streak.
- **Job 2, Corner:** two walls meeting at 90°, courses alternating through the corner so the bond holds without cut bricks.
- **Tool shop** between jobs: bigger trowel (3 beds per load), mortar retarder (+50% working time), brick tongs (carry 2), apprentice (hands you the next brick).
- Job list with best scores; money, tools and unlocked jobs are saved in the browser.

## 0.1 — First wall
- First-person garden wall in stretcher bond: load mortar, spread, grab, lay, tap to the string line.
- Blender-built models at real scale; Poly Haven textures and sky.
