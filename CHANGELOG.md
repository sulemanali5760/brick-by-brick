# Changelog

## 0.4 — Mortar sets under the brick too
- **Balance fix:** the 0.3 bot still scored 100% Perfect, because patient light taps cost nothing. The mortar now keeps setting while you level a brick. If it goes off first, the brick **sets proud** where it is and pays Rough. That makes a real choice between fast knocks and careful taps.
- The mortar bar stays visible while you're levelling.

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
