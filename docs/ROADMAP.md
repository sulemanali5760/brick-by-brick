# Roadmap — from labourer to master builder

Owned by the design team; reviewed after every build. Builds live in `docs/builds/`, lessons in `docs/LESSONS.md`.

## Vision

**You build homes for people and animals who have none, and your grandmother's empty plot grows into a village.** You start with a trowel and a stray dog's kennel. You end up running a crew and robots, rebuilding the town's old grandstand. Every home teaches something true about building, every resident has a name and a story, and every step makes you visibly faster.

*Owner's idea, 2026-09-24:* help homeless people and animals with every kind of home (tent, van, timber, brick, kennel, cat shelter, chicken coop). Residents move in at the end of a job and thank you with XP, gifts and word of mouth that brings the next resident. **Tone rule:** residents are people and animals with dignity, never reward dispensers. XP and pay come from the work; thanks come from them.

## Pillars (every feature must serve at least one)

1. **Real technique:** real sizes, real bonds, real order of work. A player should be able to explain a stretcher bond afterwards.
2. **Visible progress:** you always see the wall, the house, the site grow. Nothing important happens off-screen.
3. **Faster and faster:** skill, tools, crew and robots each speed you up in a way you can feel. (Owner's original idea.)
4. **Short sessions:** one job in 5–10 minutes, with a clear payoff shot at the end.
5. **Your place grows:** every finished home stands in your village with its resident living in it.
6. **Someone to build for:** every job has a resident with a name, a need and a move-in moment (added 2026-09-24).

## What we learned so far (from builds 0.1–0.6)

- Hand-laying one brick is a good *skill* toy but a slow *progress* loop. The robot hand-over (0.6) fixed the pace: 57% faster on the corner.
- Every mechanic needs a cost, or a bot aces it (LESSONS L12, L13). Time pressure (mortar) is our main cost, and money versus speed (robot) is the second.
- Phone play needs its own controls; turning a camera to reach tools doesn't work on a touchscreen.

## Milestones

| Milestone | Theme | Contents | Pillars |
|---|---|---|---|
| **0.7** ✓ | Phone and flow | Tool belt on touch screens; camera keeps the current brick in view; fast-forward while the robot works; one game clock (pause and speed become trivial) | 2, 4 |
| **0.8** ✓ | Openings | Wall with a **door and window opening**: leave the gap, set a **precast lintel** (≥ 115 mm bearing each side, manufacturer tables, see REFERENCES), close the reveals. New Blender assets: lintel, door and window frames | 1, 2 |
| **0.9** | First resident | **Bruno, a stray dog, gets a brick kennel.** It's a closed box with four corners, a door opening with a lintel (0.8), a raised timber floor and a roof. Bruno moves in at the end. Adds residents (name, story, request, thanks), XP with a level, and the village list in the save. | 1, 2, 6 |
| **0.10** | Feel and reasons | Research risks 1 and 2 ([RESEARCH.md](RESEARCH.md)). **Your lead courses set the robot's accuracy.** **Juice the tap** (mortar squeeze-out, a short freeze on Perfect, a string-line twang, dust on hard knocks). A **jointing pass** finishes each wall. The foreman Gü gets a voice. A CI check that neither "always hand over" nor "never hand over" wins on both money and time. | 1, 3, 4 |
| **0.11** | Your village | Your grandmother's plot: every finished home stands there with its resident. **Material money goes into the village** (paths, fences, a well; you choose how it looks). New residents: a **cat colony** (insulated shelter, straw not blankets) and **rescued hens** (coop: perches, nest boxes, fox-proof mesh). | 2, 5, 6 |
| **0.12** | First people | A **tent** for someone sleeping rough (pitching, guy lines, ditching for rain; a new mechanic) and a **timber tiny house** (stud frame, sheathing, roof). Courses unlock new techniques, not +10%. Protein becomes a short speed boost. | 1, 3, 6 |
| **0.13** | Crew and contracts | A **van conversion** (insulation, ventilation, bed). A crew board plus contracts with a fixed quote and an early-finish bonus. Jobs to do while the robot works. | 3, 6 |
| **1.0** | Big contract | **The town's 1920s grandstand**, a fenced ruin on every job's skyline from job 1. Gü's father built it. The whole village comes to the opening. Survey, piling, precast terraces, a robot fleet run from a laptop, and **the last brick laid by hand**. | all |

**Standing rule from the research:** every new job adds **one real-technique twist** (cracked brick, rain, DF/2DF bricks, cuts) with optional stars and no fail state. Keep jobs to 5–10 min.

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
