// Game rules. No Three.js, no DOM: this file ports to Godot as-is in logic.
// Lengths in metres, brick heights ("offset") in millimetres above the string line, time in seconds.

// A slot is one brick position: centre (x, z), bottom height y above the footing,
// rot 0 = runs along x, rot 1 = runs along z. joint = a head joint sits on its start side.
export function buildSlots(w, job) {
  const [L, D, H] = w.brick, j = w.headJoint, n = job.bricks;
  const slots = [];
  for (let c = 0; c < job.courses; c++) {
    const y = w.bedJoint + c * (H + w.bedJoint);
    const add = (kind, leg, along, joint) => {
      const len = kind === 'half' ? w.half : L, mid = along + len / 2;
      slots.push(leg === 'x'
        ? { course: c, kind, len, rot: 0, x: mid, z: 0, y, joint }
        : { course: c, kind, len, rot: 1, x: D / 2, z: -D / 2 + mid, y, joint });
      return along + len + j;
    };
    if (job.layout === 'corner') {
      // courses alternate which wall runs through the corner: that keeps the half-brick lap on both walls
      const through = c % 2 ? 'z' : 'x', butt = c % 2 ? 'x' : 'z';
      let a = 0;
      for (let k = 0; k < n; k++) a = add('full', through, a, k > 0);
      a = D + j;
      for (let k = 0; k < n; k++) a = add(k === n - 1 ? 'half' : 'full', butt, a, true);
    } else {
      const kinds = c % 2 ? ['half', ...Array(n - 1).fill('full'), 'half'] : Array(n).fill('full');
      let a = 0;
      kinds.forEach((kind, k) => { a = add(kind, 'x', a, k > 0); });
    }
    slots.at(-1).last = true;
  }
  slots.forEach((s, i) => { s.i = i - slots.findIndex(t => t.course === s.course); });
  return slots;
}

export const multiplier = (content, streak) => content.streak.filter(([n]) => streak >= n).at(-1)[1];

export function createGame(content, job, upgrades = {}, rand = Math.random) {
  const mm = content.mm;
  const slots = buildSlots(content.wall, job);
  const between = ([a, b]) => a + (b - a) * rand();
  const open = job.mortarOpen * (upgrades.retarder ? 1.5 : 1);
  const perLoad = upgrades.trowel ? 3 : 2;
  const carry = upgrades.tongs ? 2 : 1;
  const s = {
    slots, cur: 0, bedUntil: 0, bedAt: 0, trowel: false, hand: null, handN: 0, setting: null, relaid: false,
    streak: 0, bestStreak: 0,
    stock: { full: slots.filter(x => x.kind === 'full').length, half: slots.filter(x => x.kind === 'half').length },
    results: [], t0: null, t1: null, done: false,
  };
  const fail = msg => ({ ok: false, msg });
  const start = now => { if (s.t0 === null) s.t0 = now; };
  const courseEnd = i => { while (!slots[i].last) i++; return i; };
  const bedded = () => s.cur < s.bedUntil;
  const stiff = now => bedded() && !s.setting && now - s.bedAt > open;
  const returnHand = () => { if (s.hand) s.stock[s.hand] += s.handN; s.hand = null; s.handN = 0; };
  const take = (kind, n) => { const k = Math.min(n, s.stock[kind]); s.stock[kind] -= k; s.hand = kind; s.handN = k; };

  function nextAction(now) {
    if (s.done) return 'done';
    if (s.setting) return 'hit';
    if (!bedded()) return s.trowel ? 'spread' : 'load';
    if (stiff(now)) return 'scrape';
    const sl = slots[s.cur];
    if (!s.hand) return sl.kind === 'half' ? 'grab-half' : 'grab-full';
    return s.hand === sl.kind ? 'place' : 'swap';
  }

  // seconds of working time left on the bed under the current slot, or null
  const mortarLeft = now => (bedded() && !s.setting ? Math.max(0, open - (now - s.bedAt)) : null);

  function load(now) {
    if (s.done) return fail('The job is finished.');
    if (s.trowel) return fail('Your trowel is already loaded.');
    start(now); s.trowel = true;
    return { ok: true, event: 'loaded' };
  }

  function spread(now) {
    if (s.done || s.setting) return fail('Finish the brick you are setting first.');
    if (bedded()) return fail('There is already mortar here.');
    if (!s.trowel) return fail('Load mortar from the tub first.');
    const from = s.cur;
    s.bedUntil = Math.min(s.cur + perLoad, courseEnd(s.cur) + 1);
    s.bedAt = now; s.trowel = false;
    return { ok: true, event: 'spread', slots: slots.slice(from, s.bedUntil).map((_, k) => from + k) };
  }

  function scrape(now) {
    if (!stiff(now)) return fail('The mortar is still workable.');
    const removed = slots.slice(s.cur, s.bedUntil).map((_, k) => s.cur + k);
    s.bedUntil = s.cur;
    return { ok: true, event: 'scraped', slots: removed };
  }

  function grab(kind, now) {
    if (s.done) return fail('The job is finished.');
    if (s.hand === kind) return fail('Your hand is full.');
    if (s.stock[kind] <= 0) return fail('None left in that stack.');
    start(now);
    const returned = s.hand;
    returnHand(); take(kind, carry);
    return { ok: true, event: 'grabbed', kind, returned };
  }

  function place(now) {
    if (s.done || s.setting) return fail('Finish the brick you are setting first.');
    const sl = slots[s.cur];
    if (!bedded()) return fail('Spread a mortar bed first.');
    if (stiff(now)) return fail('The mortar has gone off. Scrape it away first.');
    if (!s.hand) return fail('Take a brick first.');
    if (s.hand !== sl.kind) return fail(`This spot needs a ${sl.kind} brick.`);
    if (--s.handN === 0) s.hand = null;
    // the brick lands proud of the line and tilted: one end higher than the other
    const base = between(mm.placeOffset), tilt = between(mm.tilt) * (rand() < 0.5 ? -1 : 1);
    s.setting = { slot: s.cur, a: base - tilt / 2, b: base + tilt / 2 };
    const ev = { ok: true, event: 'placed', slot: s.cur, a: s.setting.a, b: s.setting.b };
    const next = slots[s.cur + 1];
    if (upgrades.apprentice && !s.hand && next && s.stock[next.kind] > 0) { take(next.kind, 1); ev.apprentice = next.kind; }
    return ev;
  }

  // hold = seconds the button was held (a long press is a firm knock, harder the longer you hold);
  // u = where along the brick you strike it, 0 = start end (a), 1 = far end (b). The struck end sinks most.
  function hit(hold, u, now) {
    if (!s.setting) return fail('Nothing to tap.');
    const knock = hold >= content.holdForKnock;
    const d = knock
      ? Math.min(mm.knock[1], mm.knock[0] + (hold - content.holdForKnock) * mm.knockPerSec) * between([0.9, 1.1])
      : between(mm.tap);
    u = Math.max(0, Math.min(1, u));
    const st = s.setting, slot = s.cur, sl = slots[slot];
    st.a -= d * (0.25 + 0.75 * (1 - u));
    st.b -= d * (0.25 + 0.75 * u);
    const worst = Math.max(Math.abs(st.a), Math.abs(st.b)), base = { ok: true, knock, a: st.a, b: st.b, slot };
    if (Math.min(st.a, st.b) < mm.sunk) {
      s.setting = null; s.relaid = true; s.streak = 0;
      if (s.hand === sl.kind) s.handN++; else { returnHand(); s.hand = sl.kind; s.handN = 1; }
      s.bedAt = now; // lifting the brick re-works the mortar
      return { ...base, event: 'sunk' };
    }
    if (Math.max(st.a, st.b) > mm.lockAt) return { ...base, event: 'hit' };
    const grade = s.relaid ? 'rough' : worst <= mm.perfect ? 'perfect' : 'good';
    s.streak = grade === 'perfect' ? s.streak + 1 : 0;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    const mult = grade === 'perfect' ? multiplier(content, s.streak) : 1;
    const r = { slot, a: st.a, b: st.b, worst, grade, mult, streak: s.streak, pay: Math.round(content.pay[grade] * mult * 100) / 100 };
    s.results.push(r);
    s.setting = null; s.relaid = false; s.cur++;
    const ev = { ...base, event: 'set', ...r };
    if (sl.last) {
      const course = s.results.filter(x => slots[x.slot].course === sl.course);
      ev.course = { index: sl.course, avg: course.reduce((acc, x) => acc + x.worst, 0) / course.length };
    }
    if (s.cur >= slots.length) { s.done = true; s.t1 = now; ev.done = true; }
    return ev;
  }

  function summary(now) {
    const n = g => s.results.filter(r => r.grade === g).length;
    return {
      bricks: s.results.length, total: slots.length,
      perfect: n('perfect'), good: n('good'), rough: n('rough'), bestStreak: s.bestStreak,
      pay: Math.round(s.results.reduce((a, r) => a + r.pay, 0) * 100) / 100,
      seconds: s.t0 === null ? 0 : (s.t1 ?? now) - s.t0,
    };
  }

  return { state: s, slots, open, nextAction, mortarLeft, load, spread, scrape, grab, place, hit, summary };
}

/* ---------- campaign save: money, upgrades, unlocked jobs ---------- */
export const newSave = () => ({ money: 0, upgrades: {}, unlocked: 1, best: {} });

export function buyUpgrade(save, content, id) {
  const u = content.upgrades.find(x => x.id === id);
  if (!u) return { ok: false, msg: 'Unknown upgrade.' };
  if (save.upgrades[id]) return { ok: false, msg: 'Already owned.' };
  if (save.money < u.price) return { ok: false, msg: 'Not enough money yet.' };
  save.money = Math.round((save.money - u.price) * 100) / 100;
  save.upgrades[id] = true;
  return { ok: true };
}

export function finishJob(save, content, jobIndex, sum) {
  const job = content.jobs[jobIndex];
  save.money = Math.round((save.money + sum.pay) * 100) / 100;
  save.unlocked = Math.min(content.jobs.length, Math.max(save.unlocked, jobIndex + 2));
  const pct = Math.round(sum.perfect / sum.total * 100);
  save.best[job.id] = Math.max(save.best[job.id] ?? 0, pct);
  return save;
}
