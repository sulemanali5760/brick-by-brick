// node js/rules.test.mjs — wall geometry for every job, deterministic mechanic tests, and a balance report.
import assert from 'node:assert/strict';
import { readFileSync, appendFileSync } from 'node:fs';
import { buildSlots, createGame, newSave, buyUpgrade, finishJob } from './rules.js';

const content = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url)));
const W = content.wall, D = W.brick[1];
const box = s => s.rot ? [s.x - D / 2, s.x + D / 2, s.z - s.len / 2, s.z + s.len / 2]
                       : [s.x - s.len / 2, s.x + s.len / 2, s.z - D / 2, s.z + D / 2];

/* ---------- geometry ---------- */
for (const job of content.jobs) {
  const slots = buildSlots(W, job);
  job.sections.forEach((sec, si) => {
    const mine = slots.filter(s => s.section === si);
    assert.equal(new Set(mine.map(s => s.course)).size, sec.courses, `${job.id} wall ${si} courses`);
    for (let c = 0; c < sec.courses; c++) {
      const row = mine.filter(s => s.course === c);
      // no two bricks in a course overlap
      const b = row.map(box);
      for (let p = 0; p < b.length; p++) for (let q = p + 1; q < b.length; q++)
        assert.ok(b[p][1] <= b[q][0] + 1e-9 || b[q][1] <= b[p][0] + 1e-9 || b[p][3] <= b[q][2] + 1e-9 || b[q][3] <= b[p][2] + 1e-9, `${job.id} wall ${si} course ${c} overlap`);
      // every course ends flush: 1.49 m for a straight wall, 0.99 m per leg of a corner
      const [ox, oz] = sec.o;
      const far = s => sec.layout === 'corner' ? (s.rot ? s.z + D / 2 : s.x) + s.len / 2 : (s.rot ? s.z - oz : s.x - ox) + s.len / 2;
      const reach = sec.layout === 'corner' ? 0.99 : 1.49;
      for (const rot of sec.layout === 'corner' ? [0, 1] : [sec.rot])
        assert.ok(Math.abs(Math.max(...row.filter(s => s.rot === rot).map(far)) - reach) < 1e-9, `${job.id} wall ${si} course ${c} length`);
      // bond: no vertical joint sits directly on the one below (≥ 0.1 m apart)
      if (c > 0) for (const rot of [0, 1]) {
        const joints = cc => mine.filter(s => s.course === cc && s.rot === rot && s.joint).map(s => rot ? s.z - s.len / 2 : s.x - s.len / 2);
        for (const jt of joints(c)) assert.ok(joints(c - 1).every(k => Math.abs(jt - k) > 0.1), `${job.id} wall ${si} course ${c} joint ${jt.toFixed(3)}`);
      }
    }
  });
}

/* ---------- deterministic mechanic tests ---------- */
const half = () => 0.5;
// lay one brick of the current slot perfectly (forced landing), returns the set event
function layPerfect(g, now = 0) {
  if (!g.state.trowel && g.nextAction(now) === 'load') g.load(now);
  if (g.nextAction(now) === 'spread') g.spread(now);
  const kind = g.slots[g.state.cur].kind;
  if (g.state.hand !== kind) g.grab(kind, now);
  g.place(now);
  g.state.setting.a = g.state.setting.b = 0.5;
  return g.hit(0, 0.5, now);
}

// streak multiplier kicks in at 4 perfect in a row
{
  const g = createGame(content, content.jobs[0], {}, half);
  const mults = [1, 2, 3, 4].map(() => layPerfect(g).mult);
  assert.deepEqual(mults, [1, 1, 1, 1.25]);
}
// mortar goes off after its open time and has to be scraped
{
  const g = createGame(content, content.jobs[1], {}, half);
  g.load(0); g.spread(0);
  assert.equal(g.nextAction(g.open - 1), 'grab-full');
  assert.equal(g.nextAction(g.open + 1), 'scrape');
  assert.ok(g.scrape(g.open + 1).ok);
  assert.equal(g.nextAction(g.open + 1), 'load');
}
// a brick left proud when the mortar goes off sets where it is, as Rough
{
  const g = createGame(content, content.jobs[0], {}, half);
  g.load(0); g.spread(0); g.grab('full', 0); g.place(1);
  assert.deepEqual(g.tick(g.open - 1), []);
  const [r] = g.tick(g.open + 1);
  assert.equal(r.event, 'set'); assert.equal(r.grade, 'rough'); assert.equal(r.proud, true);
  assert.equal(g.nextAction(g.open + 1), 'scrape', 'the second bed went off too');
}
// pausing (tab hidden) doesn't age the mortar
{
  const g = createGame(content, content.jobs[1], {}, half);
  g.load(0); g.spread(0); g.shift(100);
  assert.equal(g.nextAction(g.open + 50), 'grab-full', 'still workable after a 100 s pause');
}
// striking one end sinks that end more than the other
{
  const g = createGame(content, content.jobs[0], {}, half);
  g.load(0); g.spread(0); g.grab('full', 0); g.place(0);
  g.state.setting.a = g.state.setting.b = 5;
  const r = g.hit(0, 0, 0);
  assert.ok(r.a < r.b, 'left end went down more');
}
// robot: hand-over needs the lead courses, moves you to the next wall, and the robot finishes the wall
{
  const yard = content.jobs.find(j => j.id === 'yard');
  const noRobot = createGame(content, yard, {}, half);
  assert.equal(noRobot.handOver(0).ok, false, 'no robot, no hand-over');
  const g = createGame(content, yard, {}, half, { robot: true });
  assert.equal(g.handOver(0).ok, false, 'lead not laid yet');
  const leadBricks = g.slots.filter(s => s.section === 0 && s.course < g.lead).length;
  for (let i = 0; i < leadBricks; i++) layPerfect(g);
  assert.equal(g.canHandOver(), true);
  const ev = g.handOver(10);
  assert.ok(ev.ok); assert.equal(ev.section, 0); assert.equal(ev.moveTo, 1);
  assert.equal(g.slots[g.state.cur].section, 1, 'you are on wall 2 now');
  let t = 10, laid = 0;
  while (!g.state.secs[0].done && t < 1000) { t += 0.5; laid += g.tick(t).filter(e => e.event === 'robotLaid').length; }
  assert.equal(laid, g.state.secs[0].to - g.state.secs[0].from - leadBricks, 'the robot laid the rest of wall 1');
  const perWall = g.state.secs[1].to - g.state.secs[1].from;
  assert.equal(g.state.stock.full + g.state.stock.half + g.state.handN, 2 * perWall, 'pallet holds exactly walls 2 and 3');
}

/* ---------- full jobs: invariants for every setup, plus the balance report ---------- */
// "bot": fast, instant knocks, now and then idles 60 s (to exercise mortar going off).
// "human": human pace, knocks cost their hold time, aim and judgement a bit off.
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const profiles = { bot: { step: 1.5, idle: 60, aim: 0, judge: 0 }, human: { step: 2.4, idle: 0, aim: 0.3, judge: 0.8 } };
const setups = [
  { name: 'no tools', up: {} },
  { name: 'all tools', up: { trowel: 1, tongs: 1, apprentice: 1, retarder: 1, robotArm: 1 } },
];
const rows = [];
for (const job of content.jobs) for (const [who, pr] of Object.entries(profiles)) for (const setup of setups)
  for (const robotOn of job.id === content.robot.unlockAfter ? [false] : [false, true]) {
    const g = createGame(content, job, setup.up, rand, { robot: robotOn });
    let now = 0;
    for (let guard = 0; !g.state.done && guard < 30000; guard++) {
      now += pr.idle && guard % 97 === 0 ? pr.idle : pr.step;
      g.tick(now);
      if (robotOn && g.canHandOver()) { assert.ok(g.handOver(now).ok); continue; }
      const a = g.nextAction(now);
      if (a === 'load') g.load(now);
      else if (a === 'spread') g.spread(now);
      else if (a === 'scrape') assert.ok(g.scrape(now).ok);
      else if (a === 'grab-full') g.grab('full', now);
      else if (a === 'grab-half' || a === 'swap') g.grab(g.slots[g.state.cur].kind, now);
      else if (a === 'place') assert.ok(g.place(now).ok, 'place');
      else if (a === 'hit') {
        const { a: ea, b: eb } = g.state.setting;
        const seen = x => x + (rand() - 0.5) * pr.judge;          // misreading the gauge
        const hold = Math.max(seen(ea), seen(eb)) > 3 ? 0.4 : 0.05;
        const aim = Math.abs(seen(ea) - seen(eb)) > 0.6 ? (ea > eb ? 0 : 1) : 0.5;
        now += hold - (who === 'human' ? pr.step * 0.6 : 0);       // a tap is quicker than a walk to the pallet
        g.hit(hold, aim + (rand() - 0.5) * pr.aim, now);
      }
      // 'watch': nothing to do, the robot is working
    }
    const sum = g.summary(now);
    assert.equal(g.state.done, true, `${job.id} finished`);
    assert.equal(sum.bricks, g.slots.length);
    assert.equal(sum.perfect + sum.good + sum.rough + sum.robot, sum.bricks);
    assert.equal(g.state.stock.full + g.state.stock.half + g.state.handN, 0, `${job.id} no bricks left over`);
    rows.push([job.id, who, setup.name, robotOn ? 'yes' : 'no', `${sum.mine ? Math.round(sum.perfect / sum.mine * 100) : 0}%`, `${sum.robot}`, `€${sum.pay.toFixed(2)}`, `${(sum.seconds / 60).toFixed(1)} min`]);
  }
const table = ['| job | player | tools | robot | perfect | by robot | pay | time |', '|---|---|---|---|---|---|---|---|', ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Balance report\n\nShop total: €${content.upgrades.reduce((t, u) => t + u.price, 0)}\n\n${table}\n`);

/* ---------- shop and save ---------- */
const save = newSave();
assert.equal(buyUpgrade(save, content, 'trowel').ok, false);
finishJob(save, content, 0, { pay: 30, perfect: 26, mine: 52, total: 52 });
assert.equal(save.unlocked, 2);
assert.equal(save.robot, true, 'finishing the garden wall unlocks the robot');
assert.equal(buyUpgrade(save, content, 'trowel').ok, true);
assert.equal(save.money, 10);
const s2 = newSave(); s2.money = 100;
assert.equal(buyUpgrade(s2, content, 'robotArm').ok, false, 'no robot arm without the robot');
console.log('rules ok');
