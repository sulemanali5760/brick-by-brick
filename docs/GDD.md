# Brick by Brick — Slice 1: "First Wall"

Game design document. One feature, locked. Everything else waits.

## The studio table

Each role answered one question before anything was built.

| Role | Question | Decision |
|---|---|---|
| **Producer** | What is the smallest thing worth shipping? | One garden wall, first person, ~6 minutes of play. No shop, no house, no crew in this slice. |
| **Creative director** | What should the player *feel*? | "I built that, and I built it properly." Slow, tactile, satisfying — PowerWash Simulator's single verb, applied to bricks. |
| **Game designer** | What is the verb and why is it fun? | *Lay a brick*: load mortar → spread the bed → place the brick → tap it to the line. Tapping is the skill: too few taps and it sits proud, too many and it sinks. |
| **Construction consultant** | What must be true to real bricklaying? | Real NF brick (240 × 115 × 71 mm), 10 mm head joints, 12 mm bed joints, 83.3 mm per course so 12 courses = 1 m, stretcher bond with half-brick overlap, half bricks at the ends of every second course, string line moved up each course, trowel in the right hand and brick in the left. |
| **Level designer** | Where does it happen? | A small fenced plot. Concrete footing in front of you, brick pallet on your left, mortar tub on your right, cement bags and tools as set dressing. Everything within two steps. |
| **3D / tech artist** | What do we need, and from where? | See [ASSETS.md](ASSETS.md). Game-specific objects made in Blender at real scale; set dressing and textures from Poly Haven (CC0). Low poly, few materials each, self-contained `.gltf`. |
| **Engineer** | How do we keep it portable to Godot later? | Rules in `js/rules.js` with no Three.js imports. Content (tolerances, facts, wall layout) in `data/content.json`. Only `js/game.js` touches Three.js. |
| **Audio** | What makes a tap feel good? | Short synthesized sounds (Web Audio, no files): a wet *squish* for mortar, a dull *thock* for the brick landing, a crisp *tock* per tap, a bright *ding* when it's on the line. |
| **UX** | How does a first-timer learn it in 30 s? | A foreman's clipboard names the next action. A crosshair highlights what you can act on. The level gauge sits beside the crosshair only while you're tapping. |
| **QA** | How do we know the slice is done? | The acceptance list at the bottom. |

## Player fantasy

You are the new labourer. The foreman hands you a trowel and says: *"Garden wall. Six bricks long, eight courses high. Keep it on the line."*

## Core loop (per brick)

```
LOAD mortar ──► SPREAD bed ──► GRAB brick ──► PLACE brick ──► TAP to the line
 (tub, right)    (next slot)    (pallet, left)   (ghost slot)     (gauge: ±1 mm)
      ▲                                                                 │
      └────────── one load of mortar covers two bricks ◄────────────────┘
```

- **Load:** look at the mortar tub and click. The trowel carries a lump.
- **Spread:** look at the next slot and click. A mortar bed appears for that brick and the next.
- **Grab:** look at the pallet and click. The left hand holds a brick (or a half brick at the course ends).
- **Place:** look at the glowing slot and click. The brick lands a few mm proud of the line.
- **Tap:** a quick click is a light tap (0.6–1.0 mm), holding for 0.22 s or longer is a firm knock (2.4–3.8 mm). The brick is set the moment it reaches +1 mm or lower. Within ±1 mm is Perfect, down to −2 mm is Good, and below −2 mm it has to be lifted and re-laid. The skill is knocking while it sits high and switching to light taps near the line.

After each course the string line moves up by one course height (83.3 mm) and the foreman reads out how level it was.

## Scoring

| Final error | Grade | Pay |
|---|---|---|
| within ±1 mm | Perfect | €0.80 |
| −1 to −2 mm | Good | €0.50 |
| re-laid at least once | Rough | €0.30 |

The end card shows bricks laid, % perfect, time, pay, and four facts learned.

## Wall layout (stretcher bond)

- Courses 1, 3, 5, 7: 6 full bricks = 6 × 240 + 5 × 10 = **1490 mm**
- Courses 2, 4, 6, 8: ½ + 5 full + ½ = 115 + 5 × 240 + 115 + 6 × 10 = **1490 mm**
- 52 bricks total, 8 × 83.3 mm = **667 mm** high on the footing

## Controls

| | PC | Phone |
|---|---|---|
| Look | Mouse (pointer lock) | Drag |
| Move | WASD (small area) | not needed; everything is in reach |
| Act | Left click | Tap the target |

## Explicitly cut from slice 1

Money shop, protein/strength, skills and courses, other projects (house, coop, courtyard, stadium), crew, day/night, music, a visible character, cloud saves. The 2D prototype (`prototype-2d.html`) keeps them as the long-term design.

## Acceptance (QA)

1. The page loads with no console errors, and all models and textures load (a fallback box replaces any model that fails).
2. A first-time player lays the first brick without help, guided only by the clipboard.
3. 52 bricks can be laid to finish the wall; the end card appears.
4. The tap gauge responds visibly and audibly to every tap; over-tapping forces a re-lay.
5. The bond is correct: no head joint lines up with the one directly below.
6. Runs at 60 fps on an RTX 4060 laptop and stays playable on a mid-range phone.
