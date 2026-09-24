// node js/rules.test.mjs — checks both wall layouts and plays every job with a fixed random seed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSlots, createGame, newSave, buyUpgrade, finishJob } from './rules.js';

const content = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url)));
const W = content.wall;
const box = s => s.rot ? [s.x - W.brick[1] / 2, s.x + W.brick[1] / 2, s.z - s.len / 2, s.z + s.len / 2]
                       : [s.x - s.len / 2, s.x + s.len / 2, s.z - W.brick[1] / 2, s.z + W.brick[1] / 2];

for (const job of content.jobs) {
  const slots = buildSlots(W, job);
  // no two bricks in a course overlap
  for (let c = 0; c < job.courses; c++) {
    const row = slots.filter(s => s.course === c).map(box);
    for (let a = 0; a < row.length; a++) for (let b = a + 1; b < row.length; b++) {
      const [p, q] = [row[a], row[b]];
      assert.ok(p[1] <= q[0] + 1e-9 || q[1] <= p[0] + 1e-9 || p[3] <= q[2] + 1e-9 || q[3] <= p[2] + 1e-9, `${job.id} course ${c} overlap`);
    }
  }
  // bond: no vertical joint of a leg sits directly on the one below (≥ 0.1 m apart)
  const joints = (c, rot) => slots.filter(s => s.course === c && s.rot === rot && s.joint).map(s => rot ? s.z - s.len / 2 : s.x - s.len / 2);
  for (let c = 1; c < job.courses; c++) for (const rot of [0, 1])
    for (const jt of joints(c, rot)) assert.ok(joints(c - 1, rot).every(k => Math.abs(jt - k) > 0.1), `${job.id} course ${c} joint ${jt.toFixed(3)}`);
  // every course ends flush at 1.49 m (straight) or 0.99 m per leg (corner)
  const far = s => (s.rot ? s.z + W.brick[1] / 2 : s.x) + s.len / 2;
  const reach = job.layout === 'corner' ? 0.99 : 1.49;
  for (let c = 0; c < job.courses; c++) {
    const row = slots.filter(s => s.course === c);
    for (const rot of job.layout === 'corner' ? [0, 1] : [0])
      assert.ok(Math.abs(Math.max(...row.filter(s => s.rot === rot).map(far)) - reach) < 1e-9, `${job.id} course ${c} rot ${rot} length`);
  }
}

// play each job start to finish with every upgrade combination that matters
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (const job of content.jobs) for (const up of [{}, { trowel: 1, tongs: 1, apprentice: 1 }, { retarder: 1 }]) {
  const g = createGame(content, job, up, rand);
  let now = 0, scrapes = 0;
  for (let guard = 0; !g.state.done && guard < 20000; guard++) {
    now += guard % 97 === 0 ? 60 : 1.5; // now and then dawdle long enough for the mortar to go off
    const a = g.nextAction(now);
    if (a === 'load') g.load(now);
    else if (a === 'spread') g.spread(now);
    else if (a === 'scrape') { assert.ok(g.scrape(now).ok); scrapes++; }
    else if (a === 'grab-full') g.grab('full', now);
    else if (a === 'grab-half' || a === 'swap') g.grab(g.slots[g.state.cur].kind, now);
    else if (a === 'place') assert.ok(g.place(now).ok, 'place');
    else if (a === 'hit') g.hit(g.state.setting.offset > 3 ? 1 : 0, now);
  }
  const sum = g.summary(now);
  assert.equal(g.state.done, true, `${job.id} finished`);
  assert.equal(sum.bricks, g.slots.length);
  assert.equal(sum.perfect + sum.good + sum.rough, sum.bricks);
  assert.equal(g.state.stock.full + g.state.stock.half + g.state.handN, 0, `${job.id} no bricks left over`);
  assert.ok(scrapes > 0, 'mortar went off at least once');
  console.log(job.id, JSON.stringify(up), sum, 'scrapes', scrapes);
}

// streak multiplier kicks in at 3 perfect in a row
{
  const g = createGame(content, content.jobs[0], {}, () => 0.5);
  const mults = [];
  for (let i = 0; i < 4; i++) {
    g.load(0); if (g.nextAction(0) === 'spread') g.spread(0);
    g.grab('full', 0); g.place(0);
    g.state.setting.offset = 0.5; // force a perfect landing on the next light tap
    mults.push(g.hit(0, 0).mult);
    g.state.trowel = false;
  }
  assert.deepEqual(mults, [1, 1, 1.5, 1.5]);
}

// shop and save
const save = newSave();
assert.equal(buyUpgrade(save, content, 'trowel').ok, false);
finishJob(save, content, 0, { pay: 30, perfect: 26, total: 52 });
assert.equal(save.unlocked, 2);
assert.equal(buyUpgrade(save, content, 'trowel').ok, true);
assert.equal(save.money, 15);
console.log('rules ok');
