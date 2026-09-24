# Research: what would make Brick by Brick more interesting

Research lane, 2026-09-24. Input for the design team; it changes nothing on its own. Every idea points at a system we already have (mortar timer, two-end levelling, streaks, lead courses → robot hand-over, the 5-item shop, the foreman's clipboard) or a milestone row in [ROADMAP.md](ROADMAP.md).

Sources are linked inline. Player complaints come from Steam discussions, Steam reviews and published reviews. Reddit could not be fetched, so a Reddit thread is only cited when a search snippet showed its content.

---

## (a) The 10 most valuable ideas for us

| # | Idea | Source | Pillar | Impact / Effort | Milestone |
|---|---|---|---|---|---|
| 1 | **Your lead sets the robot's accuracy.** The robot copies the line your two lead courses set. Each Perfect lead brick tightens its tolerance, and a Rough lead makes it drift ±1–2 mm per course, which shows on the gauge and in pay. Hand-laying stays the skill; the robot scales it up. | Factorio (automation copies your hand-built solution), SAM robot (lays to a laser line set up like a string line, [PSU](https://sites.psu.edu/constructionrobotics/semi-automated-mason-sam/)), PENS competence | 1, 3 | 5 / 2 | now: feel (rules only) |
| 2 | **Give the player work while the robot runs.** Plumb-check the robot's courses with the spirit level (already in the backlog), set out the next wall (corner profile, pins, string line), strike off the joints behind it. No more standing and watching with ×4 on. | Supermarket Simulator and Satisfactory complaints; Construction Simulator ("watching your buddy") | 1, 3 | 5 / 3 | 0.10 (plumb check), 0.11 (set-out) |
| 3 | **Polier Gü: a foreman with a voice, plus clients.** Short texts on the clipboard and phone, one per job start, course milestone and job end. Clients state the job and thank you afterwards. No cutscenes. | PowerWash Simulator (story told only through client texts, [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/PowerWashSimulator)), Unpacking | 2, 5 | 4 / 1 | 0.9 |
| 4 | **Your house is where the money goes.** Every house element (plinth, walls, lintels, roof, garden wall) has a material cost. Paying for it drops it onto the plot, shown as a bundle board. Money finally has somewhere to go after the €135 shop. | Stardew Valley Community Center bundles ([wiki](https://stardewvalleywiki.com/Bundles)), Schreiber/Romero sinks and faucets, Builder Simulator complaint that money has no purpose | 2, 5 | 5 / 3 | 0.9 |
| 5 | **Juice the tap.** Mortar squeezes out of the bed and head joints in proportion to each knock, with a 40 ms hit-stop and a string-line twang on Perfect. Taps get a pitch step, knocks a dull thud with 1–2 px of shake, and a little brick dust. | Jonasson & Purho, *Juice it or lose it*; Swink, *Game Feel* | 2 | 4 / 2 | now: feel |
| 6 | **Finish every wall with a jointing pass.** Before the admire shot, run the jointer along the joints: one sweep per course, and the wall shifts from raw to finished. It's a 20-second pass with no failure state. | PowerWash Simulator (the reveal is the reward); real practice (tooling joints once the mortar is thumb-print hard) | 1, 2 | 4 / 2 | now: feel |
| 7 | **One new twist per job, and optional stars.** Each job adds exactly one new element: a cracked brick to reject, rain (cover the fresh work), a hot day, DF or 2DF bricks, a pier. Stars are optional: ★ finished, ★★ at least 80% Perfect, ★★★ under target time. There's never a fail state. | Diner Dash (one new customer type per level), Overcooked (star targets), Koster (fun is learning a new pattern) | 1, 4 | 4 / 2 | 0.9–0.10 |
| 8 | **Quote contracts, so handing over becomes a real choice.** A job pays a fixed quote plus a bonus for finishing early. The per-brick premium for your own Perfects stays, which gives a real trade: lay it yourself for quality pay, or hand over for the time bonus. | Sid Meier's interesting decisions (trade-offs that depend on the situation); Schell's Lens of Triangularity | 3, 4 | 4 / 2 | 0.11 |
| 9 | **Courses unlock verbs, not +10%.** Each course teaches a new technique and adds a new action: racking back, cutting with a bolster, Flemish bond (header taps), soldier course over a lintel, a brick arch. Stamina and protein come later and stay light. | House Flipper perks; PENS competence; Koster | 1, 3 | 4 / 3 | 0.10 |
| 10 | **Choose how your own house looks.** On your plot you pick the brick (red, yellow clinker, blue-brown), the bond (stretcher or Flemish), the colour of the joints and a soldier-course detail. The house responds to your choices: a window box appears, and ivy grows over walls finished on earlier days. | Tiny Glade and Townscaper (the world reacts to what you place), Unpacking (self-expression without a score), PENS autonomy | 2, 5 | 3 / 2 | 0.9 |

Honourable mentions, each impact 3 with low effort: name the robot and give it small idle animations (relatedness); a photo mode showing the plot before and after; make the daily seeded wall the place for the Competition motivation.

---

## (b) Game-by-game notes

Each entry covers the loop, the hooks, the satisfying moment, the complaints, and the lesson for us.

### Bricklaying and masonry games (our direct competition)

**Builder Simulator** (PlayWay, [Steam](https://store.steampowered.com/app/1120320/Builder_Simulator/)). You build a house brick by brick: mix mortar, lay bricks, plaster, then do the roof.
- **Hooks:** you build a whole house from the ground up.
- **Complaints** ([top-rated reviews](https://steamcommunity.com/app/1120320/reviews/?browsefilter=toprated)): laying bricks turns monotonous; mixing mortar is repetitive and oversimplified; money piles up with nothing to spend it on; the game gives too little guidance; building shapes are restricted.
- **Lesson:** this is the closest warning we have. Hand-laying, mortar and a house don't make a game by themselves. They need variation inside the verb (ideas 7 and 9), a money sink (idea 4) and good onboarding, which the clipboard already gives us.

**House Flipper 2** adds a bricklaying tool. Reviewers found it fiddly in 3D: it builds long sections you didn't mean to, and walls can poke through roofs ([Kat Clay review](https://www.katclay.com/house-flipper-2-review-is-it-better-than-the-original/)).
- **Lesson:** our slot-by-slot ghost placement is the right call. Never let a drag gesture lay many bricks by accident.

**Mason: Building Bricks** ([Steam](https://store.steampowered.com/app/1441400/Mason_Building_Bricks/)) is a virtual LEGO set, not masonry.
- **Lesson:** as far as we found, no game teaches real bricklaying (formats, bonds, lintels). That's our niche, and pillar 1 is our moat.

**Real machines.** SAM lays about 2,000–3,000 bricks a day. It works best on long straight walls and follows a laser line set up like a string line ([PSU Construction Robotics](https://sites.psu.edu/constructionrobotics/semi-automated-mason-sam/)). FBR's Hadrian builds a house's structural walls in as little as a day ([FBR](https://www.fbr.com.au/view/hadrian)). Human masons still do the corners, openings and quality checks.
- **Lesson:** our leads → robot → lintel call-back already matches reality. Ideas 1 and 2 push further along the same truth.

### PowerWash Simulator 1/2 (FuturLab)
- **Loop:** pick a job, clean surfaces part by part, and each part completes with a chime. Buy better nozzles and washers.
- **Hooks:** tougher layers of dirt that need upgrades, a career of stranger and stranger jobs, and a story told only through client texts.
- **Satisfying:** the designers set out to recreate the pleasure of watching cleaning videos rather than to simulate the job. They left out anything that gets in the way of cleaning, and players enjoy predicting when a part is about to finish ([80 Level](https://80.lv/articles/level-design-of-powerwash-simulator), [Epic interview](https://store.epicgames.com/news/powerwash-simulator-2-futurlab-interview-nick-mccarthy-sequel-add-leave-out?lang=en-US)).
- **Complaints:** some levels feel very long; hunting down the last 0.1% is annoying ([Steam thread](https://steamcommunity.com/app/1290000/discussions/0/3767860527653793504/)); new players feel slow.
- **Lessons:**
  - We already copy "per-part completion": give each course the same chime-and-flash beat as a PowerWash part.
  - Never make players hunt for the last slot; our glowing slot already solves this.
  - Cut friction that isn't technique. For example, loading mortar after 0.10 could become a one-tap refill when you stand at the tub, because the learning happens in spreading and tapping, not in walking.

### House Flipper 1/2
- **Loop:** take a job with a to-do list (clean, paint, tile, build), get paid, buy perks, flip houses.
- **Hooks:** perks that change how tools behave, houses you own, and every client house has a small story.
- **Satisfying:** clear task lists, and painting with a roller where you can see the missed spots.
- **Complaints:** HF2 lost the quirky buyers of HF1; it's unclear what raises the sale price; placing floor panels one by one is tedious (Kat Clay, above).
- **Lesson:** the value of a job should be readable. Show the quote and the bonus rules before the job starts (idea 8).

### Construction Simulator (astragon)
- **Loop:** contracts, machines (90+ licensed ones) and a company that grows ([review](https://moviesgamesandtech.com/2022/09/29/review-construction-simulator/)).
- **Complaints** ([Steam](https://steamcommunity.com/app/1273400/discussions/0/4415298705118033431/)):
  - parts snap into place, so it feels like the developer built it and not you;
  - contracts repeat;
  - money comes too easily;
  - the driving between tasks drags.
- **Lesson:** keep our physical skill (the tap). The robot must never make the player's own bricks feel pointless (idea 1), and travel between walls must stay a short camera walk.

### Supermarket Simulator (Nokta)
- **Loop:** stock shelves, set prices, work the till, expand, hire cashiers and restockers.
- **Hooks:** moving from doing the work to managing it.
- **Satisfying:** a full, tidy shop.
- **Complaints** ([Steam](https://steamcommunity.com/app/2670630/discussions/0/598520335012249459/)):
  - hiring is locked behind store levels even when you can afford it;
  - hired staff are slow;
  - you still have to do chores yourself after hiring, and it feels like padding.
- **Lesson for 0.11:** gate crew by money and job unlocks, never by grinding levels. Every hire must clearly save the player a task they know well (the labourer takes over mortar runs, the apprentice takes the walling).

### Tiny Glade (Pounce Light)
- **Loop:** there is no loop in the usual sense: you draw walls, paths and towers, and the world fills in the detail.
- **Satisfying:** the developers say it's pleasant to watch something being built in front of you. When the game responds to what you do, it feels like it's paying attention to you ([80 Level](https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games)).
- **Complaints:** little to do once you've explored the tools.
- **Lesson:** for *your plot* (0.9), let finished work respond. Ivy grows on older walls, a window box appears, and the path to the door fills in once the door opening is built.

### Townscaper (Oskar Stålberg)
- **Loop:** click to add a block; the town rearranges its details around it.
- **Satisfying:** every placement makes the whole structure re-solve its rules, so one click changes things in several places ([Game Developer](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)). There are no goals, no timer and no failure.
- **Complaints:** it's a toy, so sessions end when your curiosity does.
- **Lesson:** the "toy" layer belongs on the plot, not in contracts. Keep contracts goal-driven and the plot free.

### Unpacking (Witch Beam)
- **Loop:** take items out of boxes and put them away, one room per life stage.
- **Story:** the whole story lives in the objects. The team dropped scores and meters because rating the player felt intrusive in a personal space ([Game Developer](https://www.gamedeveloper.com/design/telling-story-someones-belongings-unpacking)).
- **Lesson:** tell our story through things on the site. Examples: Gü's old trowel with a worn handle, a photo in the site hut of the 1920s brick stand at the town ground, chalk marks on the footing. Keep scoring for contracts and leave it out of your own house.

### Hardspace: Shipbreaker (Blackbird)
- **Loop:** timed shifts cutting a ship apart into the right bins, to pay off a huge debt to the company.
- **Hooks:** the debt, better tools, and a union storyline carried by voices on the radio ([Uppercut](https://uppercutcrit.com/hardspace-shipbreaker-seizing-the-means/)).
- **Satisfying:** a clean cut that drops a big panel into the right bin.
- **Complaints:** the campaign feels short and tacked onto the loop, and the loop repeats if you don't sink into it ([Steam](https://steamcommunity.com/app/1161580/discussions/0/3377159394052518902/)).
- **Lessons:**
  - Radio chatter during work is a cheap, strong way to carry story (our foreman).
  - The story beats must be tied to the jobs, not sit beside them.

### Stardew Valley
- **Loop:** daily chores → sell → upgrade, over seasons.
- **Hooks:**
  - Grandpa's letter gives a reason to be there and an evaluation later ([wiki](https://stardewvalleywiki.com/Grandpa));
  - the Community Center bundles turn your goods into visible repairs to the town (wiki, above).
- **Lesson:** our owner's "protein, degree, computer" plus "house → coop → courtyard → stadium" fits this shape. Give the player a named reason to build (section d), and turn money into visible things on the plot (idea 4).

### Factorio / Satisfactory
- **Loop:** hand-craft → automate → scale up. Having to craft by hand is what pushes you to automate.
- **Complaints:** early on, automation feels slower than doing it yourself, so it seems pointless ([Satisfactory Steam thread](https://steamcommunity.com/app/526870/discussions/0/3830914462348878760/)).
- **Lessons:**
  - The moment of delegating must be felt as a win. Our robot (1.6 s per brick) is several times faster than a human-pace player (about 10 s per brick, from the 0.6 balance run), but it pays half, and time is worth nothing in-game. So the pay screen currently tells the player that delegating was a mistake (risk 1).
  - Automation should scale up *the player's* solution (idea 1).

### Overcooked / Diner Dash
- **Loop:** juggle several short tasks under a clock, with star targets.
- **Hooks:**
  - each level adds one new element or layout change;
  - Diner Dash 2 added a choice of decor and functional upgrades ([designer portfolio](https://www.michellewoodsdesign.com/dinerdash2));
  - *Hometown Hero* framed the whole game as helping your hometown ([GDC Vault postmortem](https://gdcvault.com/play/266/DINER-DASH-HOMETOWN-HERO-Postmortem)).
- **Overcooked:** the level layouts force players to split the work ([Superjump](https://www.superjumpmagazine.com/overcooked-how-design-creates-teamwork/)).
- **Lesson:** our Yard walls (lead → hand over → walk on, with the lintel call-back) is already a light form of juggling. With a crew (0.11) it becomes real: the lintel call, the labourer's mortar run and the apprentice waiting for a brick are the "orders". Keep the stars optional, as in idea 7, because pillar 4 is short and calm, not frantic.

### Job Simulator (Owlchemy)
- **Loop:** comic VR jobs where every object is physical and reacts.
- **Hooks:** play with the toys, not the goals ([GDC Vault](https://gdcvault.com/play/1025757/Lessons-Learned-from-Job-Simulator)).
- **Lesson:** add small non-goal interactions that respond:
  - tap the tub and the mortar wobbles;
  - knock a brick off the pallet edge and it thuds;
  - the robot's beacon blinks when you look at it.
  Each costs a few lines of code and makes the site feel alive (Schell's Lens of the Toy).

---

## (c) Frameworks, applied to Brick by Brick

### Schell, *The Art of Game Design* ([Deck of Lenses](https://deck.artofgamedesign.com/))

- **Lens of the Essential Experience:** "I built that, and I built it properly" (GDD).
  - The moments that deliver it: the Perfect lock, a course completing, the admire shot.
  - The moment that works against it: robot-laid courses you merely watch. Idea 1 makes those courses yours as well.
- **Lens of Triangularity** (a safe low-reward option against a risky high-reward one):
  - The knock-or-tap choice already does this inside each brick: knock fast and risk sinking it, or tap slowly and risk the mortar going off.
  - Missing: triangularity at the job level. Idea 8 adds it, as a "take the hot-day contract (20 s open time) for +30% quote" option.
- **Lens of Endogenous Value:** money is worth only what it buys. At the moment it buys 5 items (€135 in total) and then nothing. Idea 4.
- **Lens of Moments:** we have three strong ones: the first Perfect ding, the lintel landing across the gap, and the admire shot. The next would be the first time you step back and see the robot finishing a wall you led.
  - Make that moment a camera beat: the first hand-over cuts to a 3-second shot of the robot's boom lowering its first brick onto your line.
- **Lens of Visible Progress / Pillar 2:** a job-progress bar exists; the plot in 0.9 is the big one.
- **Lens of the Hero's Journey:** see section d.

### Koster, *A Theory of Fun* ([theoryoffun.com](https://theoryoffun.com/))

Fun is learning a pattern, and boredom sets in once it's mastered.
- **Our core pattern:** tilt, then knock high, then tap near the line, under a timer. A player masters it in about 2 jobs (roughly 100 bricks).
- **New patterns that don't break pillar 1:**
  - **Brick formats** (real German Achtelmeter formats): DF 240 × 115 × 52 mm with a 62.5 mm course (16 per metre), and 2DF 240 × 115 × 113 mm with a 125 mm course (8 per metre). A heavier 2DF lands further proud and needs more knocks; a thin DF sinks easily. It's the same verb with a new pattern, and it teaches real facts. (Needs sources in REFERENCES.md before shipping.)
  - **Plumb** as a second axis (backlog).
  - **Bolster cuts:** score and split a brick where the bond needs a three-quarter bat.
  - **Header taps** in Flemish bond, where the short face has a different tilt.
- **Skill atoms:** each new element should get one "first time" fact, as the `facts` table already does.

### MDA (Hunicke, LeBlanc, Zubek, [paper](https://users.cs.northwestern.edu/~hunicke/MDA.pdf))

Target aesthetics, in order:
1. **Challenge** in contracts.
2. **Expression** on your plot.
3. **Discovery** of real facts.
4. **Submission** (the calm rhythm).

| Mechanic | Dynamic it creates | Aesthetic | Gap |
|---|---|---|---|
| Mortar open time | spread → lay → level becomes a rhythm under light pressure | Challenge, Submission | good |
| Two-end tilt + analogue knock | reading the gauge and choosing knock or tap | Challenge | good |
| Streak multiplier | a run of Perfects builds tension; losing it stings | Challenge | good |
| Lead + hand-over | walking between walls while the robot works | "Power" fantasy | player goes passive; pay penalty. Ideas 1, 2, 8 |
| Shop (5 items) | buy everything in 3–4 jobs, then save for nothing | none after job 4 | idea 4 |
| Facts and end card | read, then forget | Discovery | tie each fact to a new element (idea 7) |
| (missing) | choosing what to build | Expression | idea 10 |

### Flow (Csikszentmihalyi; applied to games in [Jenova Chen, *Flow in Games*](https://www.jenovachen.com/flowingames/Flow_in_games_final.pdf))

- **Our main difficulty dial is mortar open time:** 30 s garden, 25 s yard, 20 s corner.
- **The tolerances (±1 mm Perfect) should stay fixed:** they are the "true" standard, and the player's feel for them is the skill.
- **Chen argues for player-chosen difficulty** over hidden adjustment. For us that means offering a choice between a cool morning and a hot afternoon (quote +30%, open time −30%) at the job board. The retarder upgrade then becomes a strategic buy for hot contracts, not a flat bonus.
- **Flow breaks we have today:**
  - facts that pop up while the mortar is setting split the player's attention (see Hodent);
  - the "watch" state with nothing to do (idea 2).

### Self-Determination Theory / PENS (Rigby & Ryan, [SDT Center](https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/))

- **Competence: strong.** Clear feedback, a mm gauge, grades. The weak spot is robot bricks, which say nothing about your skill (idea 1).
- **Autonomy: weak.** Jobs unlock in a fixed line; there's one way to build each wall and no choice of look. Fixes:
  - a job board with 2 offers at a time (0.9);
  - choosing the order you build your own house in (the bundle board);
  - look choices (idea 10);
  - the choice between hot and cool contracts.
- **Relatedness: nearly absent.** "The foreman" is a clipboard, and the apprentice and robot have no presence. Fixes:
  - Polier Gü with a voice in text (idea 3);
  - the robot gets a name and a nod: its beacon blinks twice when it takes over from you;
  - the apprentice says one line when hired;
  - clients thank you.

### Swink, *Game Feel* ([game-feel.com](http://www.game-feel.com/)) and *Juice it or lose it* ([talk](https://www.youtube.com/watch?v=Fy0aCDmgnxg))

Swink breaks game feel into input, response, context, polish and metaphor. Jonasson & Purho show how tweening, particles, sound and small shakes turn the same mechanics from flat into alive.

**Response:** the knock charge and the analogue strike are good. Add a 30–40 ms hit-stop at the moment of a Perfect lock so the ding lands on a still frame.

**Polish on the brick** (ordered by bang for buck):
1. Mortar squeezes out of the joints, scaled by each knock's mm. It's real, too: squeezed-out mortar is the visual cue for over-knocking.
2. The string line twangs (a small sine wobble) when a brick touches it at Perfect.
3. The brick settles with squash-and-settle easing, not a linear drop.
4. The pitch rises through each run of taps; the rising streak chime already exists.
5. The trowel does a quick strike-off flick after each course (a real step: cutting off the squeezed-out mortar).
6. A thin puff of dust on hard knocks.

**Metaphor:** an NF brick weighs about 3 kg, so the view could dip slightly (1–2°) when you pick one up, and 2DF (about 5 kg) dips further. Weight you can feel, at no cost to gameplay.

**Context:** the string line is our best spatial reference. Keep it bright, and show its shadow on the brick.

### Sid Meier: interesting decisions ([GDC 2012 write-up](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions), [talk](https://www.gdcvault.com/play/1015756/interesting))

Meier's test: a good decision has a trade-off, depends on the situation, and lets the player know the stakes.

**Our decisions today:**

| Decision | Meier's test | Verdict |
|---|---|---|
| Knock or tap | trade-off yes, situational yes (height and mortar left) | **good** |
| Buy trowel, retarder or tongs | somewhat situational (L14 showed the trowel hurts on the corner) | OK, and could say so in the shop text |
| Hand over or keep laying | handing over always pays less, and time has no in-game value | **not interesting yet**; idea 8 fixes it |
| Which job next | there is only one new job at a time | **no decision**; a job board with 2 offers fixes it |

- **Feedback after a decision:** the game should acknowledge it straight away. On hand-over, have the robot beep, show its beacon and give one line from Gü.

### Hodent, *The Gamer's Brain* ([onboarding talk notes](https://celiahodent.com/gamers-brain-ux-onboarding/))

Hodent's onboarding advice rests on limited attention, learning by doing, and clear signs of what can be used.
- **What we already do well:** the clipboard names the next action, the target slot glows, and the tool belt highlights the button you need next.
- **Attention conflict:** don't show a text fact while the mortar timer is running. Queue facts to calm moments: course end, hand-over, or while the robot works. Or pause the mortar clock while a first-time fact is on screen.
- **Spread the learning:** one new rule per job (idea 7), with the fact shown on its first use and a one-line reminder the next time it comes up.
- **Motivation:** show the goal before the grind. The job board and the house bundle board make the long goal visible from job 1.

### Schreiber & Romero, *Game Balance* ([Game Balance Concepts](https://gamebalanceconcepts.wordpress.com/), [book](https://www.taylorfrancis.com/books/mono/10.1201/9781003199519))

The concepts we need are faucets and sinks, cost curves, and making sure no option is strictly best.

- **Faucets:**
  - Perfect €0.60, Good €0.40, Rough €0.20, times the streak;
  - robot bricks €0.30;
  - about €30–60 per job.
- **Sinks today:** five items, €135 in total. Once they're bought, the money curve has no destination.
- **Proposed sinks:**
  - **House materials (0.9):** for example a plinth at €40, each wall at €60–90 and the lintels at €25. They grow with income, and every one of them is visible.
  - **Wages (0.11):** a labourer at €x per job and an apprentice at a cut per brick. That turns money into speed, which is the owner's own "faster and faster" idea.
  - **Degree (1.0):** a big saving goal, like the 2D prototype's €3,000.
- **No dominant strategy:** keep checking the balance table in CI against a "never hand over" bot and an "always hand over" bot. If one of them wins on both pay *and* time, the hand-over decision is dead.

### Player motivation: Bartle and Quantic Foundry ([Bartle](https://mud.co.uk/richard/hcds.htm), [Quantic Foundry model](https://quanticfoundry.com/gamer-motivation-model/))

- **Bartle** was built for MUDs. For us: Achievers want stars and Perfect %, Explorers want facts and secrets, Socialisers want photos to share, and Killers are out of scope.
- **Quantic Foundry is more useful.** Its 12 motivations are grouped in clusters; ours are:
  - **Completion** (finish every wall and every star) and **Challenge** (the tap). These are the core; keep them.
  - **Design** (your own house). This is the 0.9 opportunity (idea 10).
  - **Power** (a growing robot fleet). This is the 1.0 fantasy; it must feel earned (idea 1).
  - **Fantasy and Story** (being the builder of the town stand). Section d.
  - **Low:** Destruction and Competition. Don't chase them, apart from the seeded daily wall with a best score for the few who want it.

---

## (d) Proposed story frame

It's told through clipboard lines, phone texts, objects on the site and the plot, and never through cutscenes. It is light enough that a player who ignores it loses nothing.

**The place.** A small Saxony-Anhalt brick town, working name *Ziegelau*, with a clay pit, a closed brickworks and a football club (*SV Ziegelau 1921*). The club's 1920s brick grandstand was condemned years ago. It sits on the edge of every job's skyline as a fenced ruin, visible from job 1.

**You.** You arrive with nothing but a caravan on a bare plot your grandmother left you. The plot is the 0.9 site. Her note is pinned inside the caravan door, and it reads like Stardew's Grandpa letter: "Build something that stays." It's the one line of text you meet before job 1.

**The foreman: Polier Günter "Gü" Brandt**, 61, three years from retirement.
- His father laid the bricks of that grandstand.
- He's gruff and speaks in short site sentences. He's always right about technique and never explains twice. When it matters, he explains once.
- **Where he talks:** the clipboard text is his handwriting. A course-end line, such as "Twelve courses, one metre. Remember that", comes from him, and the facts are his voice.
- **Objects that carry him:** his worn trowel (a model variant), a photo of the old stand in the site hut, and his thermos on the pallet.
- **Arc:** at first he doesn't trust the robot ("A machine doesn't read a string line"), so he makes you lay the leads. At the end he signs off the robot fleet's work on the stadium, because you taught it his line (idea 1 makes that true in the mechanics).

**Why you build.**
- **Short term:** pay, and Gü's respect. His texts get warmer as your Perfect % rises.
- **Mid term:** your house on the plot. Every contract funds a visible piece, and the house bundle board is the goal board.
- **Long term:** the town wants the stand rebuilt, and nobody else in town can do brick at that scale any more.

**What the stadium means.** It's the whole arc in one building:
- hand skill (the leads and the corners of the new stand);
- a crew (0.11);
- machines (the robot fleet on the laptop, the "computer" idea);
- and the town.

The last brick is laid by hand, with Gü's trowel, on the pier by the players' tunnel. The game ends on the admire shot of the full stand, then cuts to a new labourer arriving at the gate on day one, and the clipboard is now in *your* handwriting.

**Beat map** (Save the Cat, [beat sheet](https://savethecat.com/beat-sheets), in Hero's-Journey terms; one line per milestone):

| Beat | Game moment | Milestone |
|---|---|---|
| Opening image | A bare footing, a trowel, the ruined stand on the skyline | 0.1 (exists) |
| Catalyst / call | Gü: "Garden wall. Keep it on the line." | 0.1 (reword the brief) |
| Mentor | Gü's facts and course-end lines | 0.2–0.8, re-voiced |
| Crossing the threshold | The robot arrives (Gü doubts it) | 0.6 (exists; add the line) |
| Fun and games | Corners, the yard, openings, your house | 0.8–0.9 |
| Midpoint (false victory) | Your house's roof goes on. Gü comes by with a housewarming beer | 0.9 end |
| Bad guys close in | Bigger contracts, crew wages and deadlines. A robot wall built on sloppy leads fails inspection and has to be taken down: a one-time, scripted lesson (idea 1) | 0.11 |
| All is lost (mild) | Gü's retirement is announced; the stand contract goes to tender | 0.12 end |
| Break into three | Degree plus laptop: you can run a fleet | 1.0 start |
| Finale | Stadium: survey → piling → precast terraces → brick piers; you lead, the fleet fills | 1.0 |
| Final image | A new labourer at the gate, with your clipboard | 1.0 |

**Constraints for the writers:**
- no text longer than 2 lines on screen while the mortar is running;
- every beat is attached to a job event;
- the house is never scored.

---

## (e) The three biggest risks to fun, and how to fix them

### Risk 1: automation removes the fun and cuts the pay, so the player stands and waits

**Evidence:**
- After hand-over the player's only action is to watch, with a ×4 button (the clipboard even says "watch").
- Robot bricks pay €0.30 against €0.60 × streak for your own Perfects, and time has no value in the game.
- So the delegating choice is a pay cut. Anyone who reads the end card learns to *not* hand over, and anyone who does hand over just waits.
- Satisfactory players call early automation pointless when their own hands seem as good; Supermarket Simulator players resent hired help that doesn't free them.

**Fix:**
1. **Idea 1:** lead quality sets the robot's tolerance. The robot is now *your* work at scale, and the Perfect % on the end card counts it.
2. **Idea 8:** quote contracts with an early-finish bonus, so hand-over has a real, situational payoff. Target: in CI, "hand over at the lead" earns more *per minute* and "all by hand" earns more *per job*.
3. **Idea 2:** supervisor work in parallel. Plumb-check the robot's courses (it drifts slightly on long walls; that's a game rule, not a claim about real machines), and set out the next wall. Keep ×4 for when you're truly done.

**Check:** the CI balance table gains €/min and €/job for both bots. Neither may dominate on both.

### Risk 2: sameness. The same tap about 50–100 times per job, with nothing new after job 2

**Evidence:**
- Every job repeats one verb with the same NF brick; only the layout changes.
- Koster's point is exactly this: once the pattern is learned, fun drains out.
- Builder Simulator's reviews call hand-laid bricks monotonous, and PowerWash players complain about long jobs.

**Fix:**
1. **Idea 7:** one new element per job, drawn from real technique: a cracked brick to reject, rain covers, a hot day, DF/2DF formats with different weight and tap physics, bolster cuts, header taps in Flemish bond, a pier, a soldier course.
2. **Keep jobs within pillar 4:** 5–10 minutes. Use shorter walls with a twist rather than longer walls.
3. **Idea 5 (juice):** small, varied feedback makes repetition feel good. PowerWash repeats one verb for hours on the strength of feedback and part completion.
4. **Idea 6:** the jointing pass gives each wall a second, calmer rhythm before the payoff shot.

**Check:** the playtest question after job 4 is "What was new in this job?" Each job needs a one-word answer.

### Risk 3: no reason to care. Money with no destination and anonymous jobs

**Evidence:**
- The shop runs dry after about €135, around job 3–4.
- Jobs are "Garden wall" and "Yard walls" with no client, no place and no person.
- Builder Simulator and Construction Simulator players both call money meaningless once it piles up.
- Stardew and Diner Dash: Hometown Hero show how much a *named* place and person add.

**Fix:**
1. **Idea 4 (0.9):** the plot's bundle board turns money into house parts you can see.
2. **Idea 3 (0.9):** Polier Gü and client texts, 1–3 lines per job, plus the ruined stand on the skyline as the long promise (section d).
3. **A job board with 2 offers** (autonomy), and a visible "next big thing" price: house roof, then labourer wages, then the degree. The player always knows what the next €50 is for.

**Check:** a playtester can say at any point what they're saving for, and name the foreman.
