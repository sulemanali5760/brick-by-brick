# Build 0.6 — "Crew: hand over and move on"

Status: planned · base: 0.5.4 (live)

## 1. Findings (owner feedback, 2026-09-24)

| # | Finding |
|---|---|
| F1 | "Too slow": 52 bricks by hand is 250+ actions, and progress on the wall is hard to see. |
| F2 | He wants a helper, "a robot or workers", that makes it fast. |
| F3 | He wants to finish a wall and **move on to another part**: bigger jobs made of several walls. |
| F4 | There's no job progress bar. |
| F5 | Phone controls (deferred from 0.5) are **not in this build**. |

A first draft (a streak-charged "boost" that auto-lays 3 bricks) was dropped in favour of F2 and F3, which match how real sites work.

## 2. Design

**The robot.** A tracked bricklaying robot (inspired by real machines like SAM, which lays about 3,000 bricks a day beside a mason). It's a machine, so the game stays first-person with no characters.
- **Unlock:** the garden wall (job 1) stays fully by hand, since it teaches the technique. Finishing it unlocks the robot for every later job.
- **Leads first:** on each wall you lay the first **2 courses** yourself. They set the line and the bond, as a lead bricklayer does. Then **Hand over (H or the button)**: the robot takes that wall, and you walk on to the next wall of the job.
- **The robot works in parallel:** about 1 brick per 1.6 s (faster with the upgrade), always on the line. It drives to the next wall in its queue when it's done. Its bricks pay you **€0.30** each (contract margin), less than your own Perfects (€0.60 × streak). Doing it yourself pays more; handing over is faster.
- **Keep laying yourself** whenever you like. You can also skip handing over entirely.
- The job is done when every wall is complete.

**New job 3, Yard walls:** three walls around a small yard (left, back, right), each 6 bricks × 6 courses. You lead each wall and hand it over, then move to the next. The camera walks you there.

**Job 2, Corner** can be handed over after its 2 lead courses too.

**Shop:** new **Robot: faster arm** (€30), 1 brick per 0.8 s.

## 3. Team tasks

**Rules (`js/rules.js`, engine-free):**
- Walls become *sections*. Slots carry a `section`; each section has its own cursor.
- `handOver(now)`, a robot queue, and `tick(now)` returning a list of events (robot laid, section done, job done, brick set proud).
- `nextAction` gets `'watch'` when all your walls are handed over.
- Stock: the robot brings its own bricks, so its slots leave your pallet count.
- Tests: section layout and bond, a lead gate before hand-over, the robot finishing a section, full jobs with and without the robot, stock conservation.

**Art (Blender):** `robot` model: a tracked base, yellow chassis with procedural hazard stripes, a mast, a boom and a gripper, and an orange beacon. Origin at the bottom centre, boom towards +Y.

**Engineering (`js/game.js`):**
- Multi-section footings and string lines.
- The camera walks to the next wall on hand-over.
- The robot drives between walls, tracks along its wall, dips its boom per brick, and bricks drop in.
- Save the robot unlock.

**UX:** a job progress bar (all bricks), a robot status line, a Hand-over button (H / tap) that shows once the lead is done, and a foreman line explaining leads and the robot.

**QA:** the CI bot hands over after the leads; the balance table adds "bricks by robot" and time; the acceptance run adds A8 (hand-over moves you to the next wall and the robot finishes the first).

## 4. Acceptance

| # | Check |
|---|---|
| A7 | The rules tests, including the new section and robot tests, are green; the assets validator passes the robot model. |
| A8 | Yard walls, desktop run: after 2 courses on wall 1, hand-over moves the camera to wall 2; the robot completes wall 1 by itself; the job finishes. |
| A9 | Balance (human-pace bot): the corner with a hand-over is at least 30% faster than 0.5.4, and yard walls finish in under 12 minutes. |
| A2/A4 | No regressions on all three sizes. |
