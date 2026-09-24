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
      // every course ends flush: n × 0.25 − 0.01 m for a straight wall (1.49 m for 6 bricks), 0.99 m per leg of a corner
      const [ox, oz] = sec.o;
      const far = s => sec.layout === 'corner' ? (s.rot ? s.z + D / 2 : s.x) + s.len / 2 : (s.rot ? s.z - oz : s.x - ox) + s.len / 2;
      const reach = sec.layout === 'corner' ? 0.99 : sec.bricks * (W.brick[0] + W.headJoint) - W.headJoint;
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

/* ---------- openings (0.8) ---------- */
// snapshot: buildSlots exactly as it was in 0.7.0; every job without an opening must still match it
function buildSlots07(w, job) {
  const [L, D, H] = w.brick, j = w.headJoint;
  const slots = [];
  job.sections.forEach((sec, si) => {
    const n = sec.bricks, [ox, oz] = sec.o;
    for (let c = 0; c < sec.courses; c++) {
      const y = w.bedJoint + c * (H + w.bedJoint), first = slots.length;
      const add = (kind, leg, along, joint) => {
        const len = kind === 'half' ? w.half : L, mid = along + len / 2;
        slots.push(leg === 'x'
          ? { section: si, course: c, kind, len, rot: 0, x: ox + mid, z: oz, y, joint }
          : { section: si, course: c, kind, len, rot: 1, x: ox + (sec.layout === 'corner' ? D / 2 : 0), z: oz + (sec.layout === 'corner' ? -D / 2 : 0) + mid, y, joint });
        return along + len + j;
      };
      if (sec.layout === 'corner') {
        const through = c % 2 ? 'z' : 'x', butt = c % 2 ? 'x' : 'z';
        let a = 0;
        for (let k = 0; k < n; k++) a = add('full', through, a, k > 0);
        a = D + j;
        for (let k = 0; k < n; k++) a = add(k === n - 1 ? 'half' : 'full', butt, a, true);
      } else {
        const kinds = c % 2 ? ['half', ...Array(n - 1).fill('full'), 'half'] : Array(n).fill('full');
        const leg = sec.rot ? 'z' : 'x';
        let a = 0;
        kinds.forEach((kind, k) => { a = add(kind, leg, a, k > 0); });
      }
      slots.at(-1).last = true;
      for (let k = first; k < slots.length; k++) slots[k].i = k - first;
    }
  });
  return slots;
}
const plainJobs = content.jobs.filter(jb => !jb.sections.some(sec => sec.openings));
assert.ok(plainJobs.length >= 3);
for (const job of plainJobs) assert.deepStrictEqual(buildSlots(W, job), buildSlots07(W, job), `${job.id} slots unchanged`);

const win = content.jobs.find(jb => jb.id === 'window');
{
  const op = win.sections[0].openings[0], slots = buildSlots(W, win), P = W.brick[0] + W.headJoint;
  const jamb0 = op.from * P - W.headJoint, jamb1 = (op.from + op.bricks) * P;   // 0.74 and 1.25
  assert.ok(Math.abs(jamb0 - 0.74) < 1e-9 && Math.abs(jamb1 - 1.25) < 1e-9, 'gap 0.74 → 1.25 m');
  const lo = s => s.x - s.len / 2, hi = s => s.x + s.len / 2;
  for (let c = op.sill; c < op.head; c++) {
    const row = slots.filter(s => s.course === c);
    // no slot overlaps the gap
    for (const s of row) assert.ok(hi(s) <= jamb0 + 1e-9 || lo(s) >= jamb1 - 1e-9, `course ${c} slot ${s.i} in the gap`);
    // one reveal each side, halves on odd courses, full bricks on even ones
    const end = row.filter(s => s.reveal === 'end'), start = row.filter(s => s.reveal === 'start');
    assert.equal(end.length, 1); assert.equal(start.length, 1);
    assert.ok(Math.abs(hi(end[0]) - jamb0) < 1e-9 && Math.abs(lo(start[0]) - jamb1) < 1e-9, `course ${c} reveals on the jambs`);
    assert.equal(end[0].kind, c % 2 ? 'half' : 'full'); assert.equal(start[0].kind, c % 2 ? 'half' : 'full');
    assert.equal(start[0].joint, false, 'no head joint against the jamb');
  }
  assert.equal(slots.filter(s => s.reveal).length, 2 * (op.head - op.sill));
  // one lintel, on course head, where bricks 2–5 would be, bearing ≥ minBearing each side
  const lintels = slots.filter(s => s.kind === 'lintel');
  assert.equal(lintels.length, 1);
  const lt = lintels[0];
  assert.equal(lt.course, op.head);
  assert.ok(Math.abs(lt.len - content.lintel.length) < 1e-9, 'lintel length');
  assert.ok(Math.abs(lo(lt) - (op.from - 1) * P) < 1e-9, 'lintel starts where brick 2 would');
  assert.ok(Math.abs(lt.bearing - 0.24) < 1e-9, 'bearing 0.24 m');
  assert.ok(jamb0 - lo(lt) >= content.lintel.minBearing && hi(lt) - jamb1 >= content.lintel.minBearing, 'bearing ≥ minBearing both sides');
  // every other slot is where the wall without the opening would put it (course head: only the index shifts)
  const plain = buildSlots(W, { ...win, sections: [{ ...win.sections[0], openings: undefined }] });
  const strip = ({ i, ...s }) => s;
  for (const c of [0, 1, op.head + 1, op.head + 2, op.head + 3])
    assert.deepStrictEqual(slots.filter(s => s.course === c), plain.filter(s => s.course === c), `course ${c} as a plain wall`);
  assert.deepStrictEqual(slots.filter(s => s.course === op.head && s.kind !== 'lintel').map(strip),
    plain.filter(s => s.course === op.head && (s.i < op.from - 1 || s.i > op.from + op.bricks)).map(strip), 'lintel course unchanged around the lintel');
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

// lintel: the robot stops at it and calls you, you can't set it with a brick in hand, one lintel per trip, then hand over again
{
  const g = createGame(content, win, { tongs: 1 }, half, { robot: true });
  const li = g.slots.findIndex(s => s.kind === 'lintel');
  assert.equal(g.state.stock.lintel, 1);
  const leadBricks = g.slots.filter(s => s.course < g.lead).length;
  for (let i = 0; i < leadBricks; i++) layPerfect(g);
  assert.ok(g.handOver(10).ok);
  assert.equal(g.state.cur, null, 'one wall: nothing left for you while the robot works');
  let t = 10, call;
  while (!call && t < 1000) { t += 0.5; call = g.tick(t).find(e => e.event === 'lintelCall'); }
  assert.ok(call, 'lintelCall fired');
  assert.equal(call.section, 0); assert.equal(call.slot, li); assert.equal(call.moveTo, 0);
  assert.equal(g.state.secs[0].handed, false, 'the wall is yours again');
  assert.equal(g.state.cur, li, 'you are at the lintel');
  assert.equal(g.state.results.length, li, 'the robot laid everything up to the lintel');
  t += 10;
  assert.deepEqual(g.tick(t).filter(e => e.event === 'robotLaid'), [], 'the robot lays nothing while the lintel is open');
  assert.equal(g.canHandOver(), false, 'no hand-over at the lintel');
  g.load(t); g.spread(t);
  assert.equal(g.nextAction(t), 'grab-lintel');
  g.grab('full', t);
  assert.equal(g.nextAction(t), 'swap');
  assert.equal(g.place(t).ok, false, 'no lintel placed with a brick in hand');
  assert.ok(g.grab('lintel', t).ok);
  assert.equal(g.state.hand, 'lintel'); assert.equal(g.state.handN, 1, 'one lintel at a time, tongs or not');
  assert.equal(g.state.stock.full + g.state.stock.half, g.slots.length - li - 1, 'the pallet holds exactly the bricks over the lintel');
  assert.equal(g.nextAction(t), 'place');
  assert.ok(g.place(t).ok);
  g.state.setting.a = g.state.setting.b = 0.5;
  const set = g.hit(0, 0.5, t);
  assert.equal(set.event, 'set'); assert.equal(set.slot, li);
  assert.equal(g.canHandOver(), true, 'hand over again after the lintel');
  assert.ok(g.handOver(t).ok);
  while (!g.state.done && t < 2000) { t += 0.5; g.tick(t); }
  assert.equal(g.state.done, true, 'the robot finished over the lintel');
  const sum = g.summary(t);
  assert.equal(sum.bricks, g.slots.length); assert.equal(sum.mine, leadBricks + 1, 'the lintel counts as one of yours');
  assert.equal(g.state.stock.full + g.state.stock.half + g.state.stock.lintel, 0);
}
// busy on another wall: the call waits, and you come to the lintel when you move on
{
  const two = { ...win, sections: [win.sections[0], content.jobs.find(jb => jb.id === 'yard').sections[1]] };
  const g = createGame(content, two, {}, half, { robot: true });
  const li = g.slots.findIndex(s => s.kind === 'lintel');
  while (g.slots[g.state.cur].course < g.lead) layPerfect(g);
  assert.ok(g.handOver(0).ok);
  assert.equal(g.state.sec, 1);
  let t = 0, call;
  while (!call && t < 1000) { t += 0.5; call = g.tick(t).find(e => e.event === 'lintelCall'); }
  assert.ok(call); assert.equal(call.moveTo, undefined, 'you stay on your wall');
  assert.equal(g.state.sec, 1); assert.equal(g.state.secs[0].handed, false);
  while (g.slots[g.state.cur].course < g.lead) layPerfect(g, t);
  const ev = g.handOver(t);
  assert.equal(ev.moveTo, 0); assert.equal(g.state.cur, li, 'moving on takes you to the lintel');
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
const rows = [], windowTimes = [];
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
      else if (a === 'grab-half' || a === 'grab-lintel' || a === 'swap') g.grab(g.slots[g.state.cur].kind, now);
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
    assert.equal(g.state.stock.full + g.state.stock.half + g.state.stock.lintel + g.state.handN, 0, `${job.id} no bricks left over`);
    if (job.id === 'window' && who === 'human' && robotOn) windowTimes.push(sum.seconds);
    rows.push([job.id, who, setup.name, robotOn ? 'yes' : 'no', `${sum.mine ? Math.round(sum.perfect / sum.mine * 100) : 0}%`, `${sum.robot}`, `€${sum.pay.toFixed(2)}`, `${(sum.seconds / 60).toFixed(1)} min`]);
  }
const table = ['| job | player | tools | robot | perfect | by robot | pay | time |', '|---|---|---|---|---|---|---|---|', ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Balance report\n\nShop total: €${content.upgrades.reduce((t, u) => t + u.price, 0)}\n\n${table}\n`);
assert.equal(windowTimes.length, 2);
assert.ok(windowTimes.every(t => t <= 600), 'human pace with the robot finishes the window wall in ≤ 10 min');

/* ---------- shop and save ---------- */
const save = newSave();
assert.equal(buyUpgrade(save, content, 'trowel').ok, false);
finishJob(save, content, 0, { pay: 30, perfect: 26, mine: 52, total: 52 });
assert.equal(save.unlocked, 2);
assert.equal(save.robot, true, 'finishing the garden wall unlocks the robot');
assert.equal(buyUpgrade(save, content, 'trowel').ok, true);
assert.equal(save.money, 10);
finishJob(save, content, content.jobs.findIndex(jb => jb.id === 'yard'), { pay: 20, perfect: 10, mine: 20, total: 50 });
assert.equal(content.jobs[save.unlocked - 1].id, 'window', 'finishing the yard walls unlocks the window wall');
const s2 = newSave(); s2.money = 100;
assert.equal(buyUpgrade(s2, content, 'robotArm').ok, false, 'no robot arm without the robot');
console.log('rules ok');
