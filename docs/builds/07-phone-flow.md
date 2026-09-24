# Build 0.7 — "Phone and flow"

Status: planned · base: 0.6.0 (live) · roadmap row 0.7

## 1. Findings

| # | Finding | Source |
|---|---|---|
| F1 | Phone: the first slot, the tub and the pallet start off-screen in portrait; tapping needs constant dragging (A6 has failed since 0.5). | QA 0.5, 0.6 |
| F2 | Once every wall is handed over, the player just waits ("watch"). The owner's complaint was that it's too slow. | design review of 0.6 |
| F3 | Pausing works through `rules.shift()` plus a hand-shifted bed timer in `game.js`: two places that must agree, easy to break. | engineering review |

## 2. Goals

1. A phone player can play a whole job without dragging to find things (F1).
2. Waiting for the robot is optional: fast-forward (F2).
3. One game clock drives rules, visuals and pauses (F3).

## 3. Team tasks

**Engineering**
- **Game clock:** `gt` advances by frame time × speed (the frame step is already capped at 50 ms), so a hidden tab doesn't advance it. Rules, bed drying and robot animation all use `gt`. Remove `visibilitychange` shifting. `rules.shift` stays for the API but isn't needed by the game.
- **Fast-forward:** while you're watching (every wall handed over), a **Speed ×4** toggle (key F) runs the clock four times faster.
- **Follow camera (touch screens):** when the current brick is outside the middle 60% of the view and you haven't dragged in the last 2 s, the view eases towards it.

**UX**
- **Tool belt (touch screens):** bottom row of big buttons, **Mortar · Brick · Half**. They act without turning around. The wall itself is still tapped to spread, lay and level. The hand-over button sits above the belt.
- The fast-forward toggle appears in the stats panel during "watch".

**QA**
- A6 becomes: on the phone size, tap **Mortar** (belt), tap the slot, tap **Brick** (belt), tap the slot → a brick is being levelled. It must pass.
- A10: in watch mode, ×4 makes the robot lay at least 3× as many bricks in the same real time.

## 4. Acceptance

| # | Check |
|---|---|
| A6 | Phone: belt plus slot taps spread and lay the first brick with no dragging. |
| A10 | Fast-forward ×4 gives ≥ 3× robot bricks per real second in watch mode. |
| A2/A4/A8 | No regressions. |
| A7 | Rules green. |
