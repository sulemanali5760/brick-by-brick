// node js/rules.test.mjs — checks both wall layouts and plays every job with a fixed random seed.
import assert from 'node:assert/strict';
import { readFileSync, appendFileSync } from 'node:fs';
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

// play each job start to finish: invariants for every upgrade set, plus a balance report.
// "bot" is fast with instant knocks and now and then idles 60 s (to exercise mortar going off);
// "human" works at human pace, knocks cost their hold time, and aim and judgement are a bit off.
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const profiles = {
  bot: { step: 1.5, idle: 60, aim: 0, judge: 0 },
  human: { step: 2.4, idle: 0, aim: 0.3, judge: 0.8 },
};
const rows = [];
for (const job of content.jobs) for (const [who, pr] of Object.entries(profiles))
  for (const up of [{}, { trowel: 1, tongs: 1, apprentice: 1 }, { retarder: 1 }]) {
    const g = createGame(content, job, up, rand);
    let now = 0;
    for (let guard = 0; !g.state.done && guard < 20000; guard++) {
      now += pr.idle && guard % 97 === 0 ? pr.idle : pr.step;
      g.tick(now);
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
    }
    const sum = g.summary(now);
    assert.equal(g.state.done, true, `${job.id} finished`);
    assert.equal(sum.bricks, g.slots.length);
    assert.equal(sum.perfect + sum.good + sum.rough, sum.bricks);
    assert.equal(g.state.stock.full + g.state.stock.half + g.state.handN, 0, `${job.id} no bricks left over`);
    const tools = Object.keys(up).join(' + ') || 'none';
    rows.push([job.id, who, tools, `${Math.round(sum.perfect / sum.bricks * 100)}%`, `${sum.rough}`, `€${sum.pay.toFixed(2)}`, `${Math.round(sum.seconds / 60)} min`]);
  }
const table = ['| job | player | tools | perfect | rough | pay | time |', '|---|---|---|---|---|---|---|', ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Balance report\n\nShop total: €${content.upgrades.reduce((t, u) => t + u.price, 0)}\n\n${table}\n`);

// streak multiplier kicks in at 4 perfect in a row
{
  const g = createGame(content, content.jobs[0], {}, () => 0.5);
  const mults = [];
  for (let i = 0; i < 4; i++) {
    g.load(0); if (g.nextAction(0) === 'spread') g.spread(0);
    g.grab('full', 0); g.place(0);
    g.state.setting.a = g.state.setting.b = 0.5; // force a perfect landing on the next light tap in the middle
    mults.push(g.hit(0, 0.5, 0).mult);
    g.state.trowel = false;
  }
  assert.deepEqual(mults, [1, 1, 1, 1.25]);
}

// mortar goes off after its open time and has to be scraped
{
  const g = createGame(content, content.jobs[1], {}, () => 0.5);
  g.load(0); g.spread(0);
  assert.equal(g.nextAction(g.open - 1), 'grab-full');
  assert.equal(g.nextAction(g.open + 1), 'scrape');
  assert.ok(g.scrape(g.open + 1).ok);
  assert.equal(g.nextAction(g.open + 1), 'load');
}

// a brick left proud when the mortar goes off sets where it is, as Rough
{
  const g = createGame(content, content.jobs[0], {}, () => 0.5);
  g.load(0); g.spread(0); g.grab('full', 0); g.place(1);
  assert.equal(g.tick(g.open - 1), null);
  const r = g.tick(g.open + 1);
  assert.equal(r.event, 'set'); assert.equal(r.grade, 'rough'); assert.equal(r.proud, true);
  assert.equal(g.nextAction(g.open + 1), 'scrape', 'the second bed went off too');
}

// striking one end sinks that end more than the other
{
  const g = createGame(content, content.jobs[0], {}, () => 0.5);
  g.load(0); g.spread(0); g.grab('full', 0); g.place(0);
  g.state.setting.a = g.state.setting.b = 5;
  const r = g.hit(0, 0, 0);
  assert.ok(r.a < r.b, 'left end went down more');
}

// shop and save
const save = newSave();
assert.equal(buyUpgrade(save, content, 'trowel').ok, false);
finishJob(save, content, 0, { pay: 30, perfect: 26, total: 52 });
assert.equal(save.unlocked, 2);
assert.equal(buyUpgrade(save, content, 'trowel').ok, true);
assert.equal(save.money, 10);
console.log('rules ok');
