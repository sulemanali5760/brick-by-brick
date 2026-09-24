# Roadmap — from labourer to master builder

Owned by the design team; reviewed after every build. Builds live in `docs/builds/`, lessons in `docs/LESSONS.md`.

## Vision

**You start on site with a trowel and end up running your own crew and robots on a stadium.** Every step teaches something true about building, and every step makes you visibly faster.

## Pillars (every feature must serve at least one)

1. **Real technique:** real sizes, real bonds, real order of work. A player should be able to explain a stretcher bond afterwards.
2. **Visible progress:** you always see the wall, the house, the site grow. Nothing important happens off-screen.
3. **Faster and faster:** skill, tools, crew and robots each speed you up in a way you can feel. (Owner's original idea.)
4. **Short sessions:** one job in 5–10 minutes, with a clear payoff shot at the end.
5. **Your place grows:** the jobs build up your own plot over time. (Agreed: starts once there are 3–4 jobs.)

## What we learned so far (from builds 0.1–0.6)

- Hand-laying one brick is a good *skill* toy but a slow *progress* loop. The robot hand-over (0.6) fixed the pace: 57% faster on the corner.
- Every mechanic needs a cost, or a bot aces it (LESSONS L12, L13). Time pressure (mortar) is our main cost, and money versus speed (robot) is the second.
- Phone play needs its own controls; turning a camera to reach tools doesn't work on a touchscreen.

## Milestones

| Milestone | Theme | Contents | Pillars |
|---|---|---|---|
| **0.7** | Phone and flow | Tool belt on touch screens; camera keeps the current brick in view; fast-forward while the robot works; one game clock (pause and speed become trivial) | 2, 4 |
| **0.8** | Openings | Wall with a **door and window opening**: leave the gap, set a **precast lintel** (≥ 115 mm bearing each side, manufacturer tables, see REFERENCES), close the reveals. New Blender assets: lintel, door and window frames | 1, 2 |
| **0.9** | Your plot | A persistent plot: finished jobs stay there and assemble into **your house** (plinth → walls with openings → gable) | 2, 5 |
| **0.10** | Body and skills | From the 2D concept: stamina (protein refills it, rest restores it), short courses that unlock techniques (corners, openings, paving), and an engineering degree for running robot fleets | 3 |
| **0.11** | Crew board | Several helpers: labourer (brings bricks and mortar), apprentice (lays walling at Good quality), robots (fast, Perfect, costly); assign them to walls; wages versus speed | 3 |
| **0.12** | Beyond brick | Side jobs from the 2D concept: **chicken coop** (timber frame, welded mesh), **courtyard** (sub-base, 1:60 fall, herringbone pavers) | 1, 5 |
| **1.0** | Big contract | **Stadium**: survey, piling, precast terraces, and a whole robot fleet managed from a laptop (the "computer" idea). Contracts board with deadlines and reputation | all |

## Idea backlog (scored: impact 1–5 / effort 1–5)

| Idea | Impact | Effort | Note |
|---|---|---|---|
| Fast-forward while the robot works | 4 | 1 | → 0.7 |
| Phone tool belt plus follow-camera | 5 | 2 | → 0.7 |
| Door and window openings with a lintel | 5 | 3 | → 0.8, big teaching value |
| Plot that becomes your house | 5 | 4 | → 0.9 |
| Weather: rain covers fresh work, heat shortens open time | 3 | 2 | fits the mortar mechanic |
| A cracked brick on the pallet to reject | 3 | 1 | inspection skill, cheap surprise |
| Spirit-level plumb check per course (vertical) | 3 | 3 | second axis of skill |
| Photo mode for finished jobs | 3 | 1 | share progress, pillar 2 |
| Daily challenge wall (seeded) with a local best | 2 | 2 | replayability |
| Godot port | 3 | 5 | after 1.0; `rules.js` is ready for it |

## Risks

- **Scope creep:** a milestone ships only its table row. New ideas go into the backlog.
- **Phone performance:** keep a triangle budget per scene; `?q=low` exists; measure frame time in the QA run.
- **Teaching accuracy:** every fact goes into REFERENCES.md with a source before it ships.
