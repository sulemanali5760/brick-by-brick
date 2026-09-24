// Game rules. No Three.js, no DOM: this file ports to Godot as-is in logic.
// Lengths in metres, brick heights ("offset") in millimetres above the string line, time in seconds.

// A job is one or more walls ("sections"). A slot is one brick position: section, course, centre (x, z),
// bottom height y above the footing, rot 0 = runs along x, rot 1 = runs along z,
// joint = a head joint sits on its start side, last = last brick of its course in its section.
export function buildSlots(w, job) {
  const [L, D, H] = w.brick, j = w.headJoint;
  const slots = [];
  job.sections.forEach((sec, si) => {
    const n = sec.bricks, [ox, oz] = sec.o;
    for (let c = 0; c < sec.courses; c++) {
      const y = w.bedJoint + c * (H + w.bedJoint), first = slots.length;
      const add = (kind, leg, along, joint, len = kind === 'half' ? w.half : L) => {
        const mid = along + len / 2;
        slots.push(leg === 'x'
          ? { section: si, course: c, kind, len, rot: 0, x: ox + mid, z: oz, y, joint }
          : { section: si, course: c, kind, len, rot: 1, x: ox + (sec.layout === 'corner' ? D / 2 : 0), z: oz + (sec.layout === 'corner' ? -D / 2 : 0) + mid, y, joint });
        return along + len + j;
      };
      if (sec.layout === 'corner') {
        // courses alternate which wall runs through the corner: that keeps the half-brick lap on both walls
        const through = c % 2 ? 'z' : 'x', butt = c % 2 ? 'x' : 'z';
        let a = 0;
        for (let k = 0; k < n; k++) a = add('full', through, a, k > 0);
        a = D + j;
        for (let k = 0; k < n; k++) a = add(k === n - 1 ? 'half' : 'full', butt, a, true);
      } else {
        const kinds = c % 2 ? ['half', ...Array(n - 1).fill('full'), 'half'] : Array(n).fill('full');
        const leg = sec.rot ? 'z' : 'x', P = L + j;
        // an opening leaves bricks from … from+bricks-1 of even courses out on courses sill … head-1;
        // odd courses close the reveal with a half brick, and course head gets a lintel bearing one brick each side
        const op = sec.openings?.find(o => c >= o.sill && c <= o.head);
        let a = 0;
        for (let k = 0; k < kinds.length; k++) {
          if (op && c === op.head && k === op.from - 1) {
            const len = (op.bricks + 2) * P - j;
            add('lintel', leg, a, k > 0, len);
            slots.at(-1).bearing = (len - (op.bricks * P + j)) / 2;
            for (let q = 0; q < op.bricks + 2; q++) a = a + L + j; // step as the plain wall does: the bricks after it land exactly where they would
            k += op.bricks + 1;
          } else if (op && c < op.head) {
            const e = op.from - 1 + c % 2, st = op.from + op.bricks; // last piece before the jamb, first after it
            if (k > e && k < st) continue;
            a = add(k === e || k === st ? (c % 2 ? 'half' : kinds[k]) : kinds[k], leg, a, k > 0 && k !== st);
            if (k === e) { slots.at(-1).reveal = 'end'; a += op.bricks * P; }
            if (k === st) slots.at(-1).reveal = 'start';
          } else a = add(kinds[k], leg, a, k > 0);
        }
      }
      slots.at(-1).last = true;
      for (let k = first; k < slots.length; k++) slots[k].i = k - first;
    }
  });
  return slots;
}

export const multiplier = (content, streak) => content.streak.filter(([n]) => streak >= n).at(-1)[1];

// opts.robot: the bricklaying robot is available on this job (unlocked after the first job)
export function createGame(content, job, upgrades = {}, rand = Math.random, opts = {}) {
  const mm = content.mm, R = content.robot;
  const slots = buildSlots(content.wall, job);
  const between = ([a, b]) => a + (b - a) * rand();
  const open = job.mortarOpen * (upgrades.retarder ? 1.5 : 1);
  const perLoad = upgrades.trowel ? 3 : 2;
  const carry = upgrades.tongs ? 2 : 1;
  const secs = [];
  slots.forEach((sl, i) => { secs[sl.section] ??= { from: i, to: i, cur: i, handed: false, done: false }; secs[sl.section].to = i + 1; });
  const s = {
    slots, secs, sec: 0, cur: 0, bedUntil: 0, bedAt: 0, trowel: false, hand: null, handN: 0, setting: null, relaid: false,
    streak: 0, bestStreak: 0,
    stock: Object.fromEntries(['full', 'half', 'lintel'].map(k => [k, slots.filter(x => x.kind === k).length])),
    robot: { on: !!opts.robot, queue: [], at: null, nextAt: 0, interval: upgrades.robotArm ? R.fastInterval : R.interval },
    results: [], t0: null, t1: null, done: false,
  };
  const fail = msg => ({ ok: false, msg });
  const start = now => { if (s.t0 === null) s.t0 = now; };
  const courseEnd = i => { while (!slots[i].last) i++; return i; };
  const bedded = () => s.cur !== null && s.cur < s.bedUntil;
  const stiff = now => bedded() && now - s.bedAt > open;
  const returnHand = () => { if (s.hand) s.stock[s.hand] += s.handN; s.hand = null; s.handN = 0; };
  const take = (kind, n) => { const k = Math.min(n, s.stock[kind]); s.stock[kind] -= k; s.hand = kind; s.handN = k; };
  const lead = job.lead ?? 2;

  function nextAction(now) {
    if (s.done) return 'done';
    if (s.cur === null) return 'watch';
    if (s.setting) return 'hit';
    if (!bedded()) return s.trowel ? 'spread' : 'load';
    if (stiff(now)) return 'scrape';
    const sl = slots[s.cur];
    if (!s.hand) return `grab-${sl.kind}`;
    return s.hand === sl.kind ? 'place' : 'swap';
  }

  // seconds of working time left on the bed under the current slot, or null
  const mortarLeft = now => (bedded() ? Math.max(0, open - (now - s.bedAt)) : null);

  function load(now) {
    if (s.done) return fail('The job is finished.');
    if (s.trowel) return fail('Your trowel is already loaded.');
    start(now); s.trowel = true;
    return { ok: true, event: 'loaded' };
  }

  function spread(now) {
    if (s.cur === null) return fail('All your walls are handed over.');
    if (s.setting) return fail('Finish the brick you are setting first.');
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
    returnHand(); take(kind, kind === 'lintel' ? 1 : carry); // a lintel is carried one at a time, tongs or not
    return { ok: true, event: 'grabbed', kind, returned };
  }

  function place(now) {
    if (s.cur === null) return fail('All your walls are handed over.');
    if (s.setting) return fail('Finish the brick you are setting first.');
    const sl = slots[s.cur];
    if (!bedded()) return fail('Spread a mortar bed first.');
    if (stiff(now)) return fail('The mortar has gone off. Scrape it away first.');
    if (!s.hand) return fail('Take a brick first.');
    if (s.hand !== sl.kind) return fail(sl.kind === 'lintel' ? 'This spot needs the lintel.' : `This spot needs a ${sl.kind} brick.`);
    if (--s.handN === 0) s.hand = null;
    // the brick lands proud of the line and tilted: one end higher than the other
    const base = between(mm.placeOffset), tilt = between(mm.tilt) * (rand() < 0.5 ? -1 : 1);
    s.setting = { slot: s.cur, a: base - tilt / 2, b: base + tilt / 2 };
    const ev = { ok: true, event: 'placed', slot: s.cur, a: s.setting.a, b: s.setting.b };
    const next = s.cur + 1 < secs[s.sec].to ? slots[s.cur + 1] : null;
    if (upgrades.apprentice && !s.hand && next && next.kind !== 'lintel' && s.stock[next.kind] > 0) { take(next.kind, 1); ev.apprentice = next.kind; }
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
    return settle(now, s.relaid ? 'rough' : worst <= mm.perfect ? 'perfect' : 'good', base);
  }

  // course summary when slot i completed its course (counts your bricks and the robot's)
  function courseInfo(i) {
    const sl = slots[i];
    if (!sl.last) return undefined;
    const course = s.results.filter(x => slots[x.slot].section === sl.section && slots[x.slot].course === sl.course);
    return { section: sl.section, index: sl.course, avg: course.reduce((acc, x) => acc + x.worst, 0) / course.length };
  }
  function checkDone(now, ev) {
    if (secs.every(x => x.done) && !s.done) { s.done = true; s.t1 = now; ev.done = true; }
  }
  // the player moves on to the next wall that is theirs (not handed over, not finished), or has none left
  function moveOn(ev) {
    const order = secs.map((_, k) => (s.sec + 1 + k) % secs.length);
    const next = order.find(k => !secs[k].handed && !secs[k].done);
    s.bedUntil = 0;
    if (next === undefined) { s.cur = null; return; }
    s.sec = next; s.cur = secs[next].cur; s.bedUntil = s.cur;
    ev.moveTo = next;
  }

  function settle(now, grade, base) {
    const st = s.setting, slot = s.cur;
    const worst = Math.max(Math.abs(st.a), Math.abs(st.b));
    s.streak = grade === 'perfect' ? s.streak + 1 : 0;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    const mult = grade === 'perfect' ? multiplier(content, s.streak) : 1;
    const r = { slot, a: st.a, b: st.b, worst, grade, mult, streak: s.streak, pay: Math.round(content.pay[grade] * mult * 100) / 100 };
    s.results.push(r);
    s.setting = null; s.relaid = false;
    const sec = secs[s.sec];
    s.cur++; sec.cur = s.cur;
    const ev = { ...base, event: 'set', ...r, course: courseInfo(slot) };
    if (s.cur >= sec.to) { sec.done = true; ev.sectionDone = s.sec; moveOn(ev); }
    checkDone(now, ev);
    return ev;
  }

  // Hand the rest of the current wall to the robot once its lead courses are laid; you move on.
  function canHandOver() {
    if (!s.robot.on || s.cur === null || s.setting || s.done) return false;
    return slots[s.cur].course >= lead && slots[s.cur].kind !== 'lintel'; // the robot never lays a lintel
  }
  function handOver(now) {
    if (!s.robot.on) return fail('No robot on this job yet.');
    if (!canHandOver()) return fail(`Lay the first ${lead} courses yourself first: they set the line and the bond.`);
    start(now);
    const k = s.sec, sec = secs[k];
    sec.handed = true; sec.cur = s.cur;
    returnHand(); // your bricks go back on the pallet; the robot brings its own
    for (let i = sec.cur; i < sec.to && slots[i].kind !== 'lintel'; i++) s.stock[slots[i].kind]--; // up to the lintel
    const ev = { ok: true, event: 'handover', section: k, from: sec.cur };
    if (!s.robot.queue.length) { s.robot.at = k; s.robot.nextAt = now + R.drive; ev.robotDrive = k; }
    s.robot.queue.push(k);
    moveOn(ev);
    return ev;
  }

  // called every frame; returns the events that happened since the last call
  function tick(now) {
    const events = [];
    if (s.setting && stiff(now)) {
      const st = s.setting; // the mortar went off under a brick that is still proud: it sets where it is
      events.push(settle(now, 'rough', { ok: true, knock: false, a: st.a, b: st.b, slot: s.cur, proud: true }));
    }
    const rb = s.robot;
    for (let guard = 0; rb.queue.length && now >= rb.nextAt && guard < 50; guard++) {
      const k = rb.queue[0], sec = secs[k], slot = sec.cur;
      if (slots[slot].kind === 'lintel') {
        // the robot stops at a lintel and hands the wall back; you come over now if you're free, else when you are
        sec.handed = false; rb.queue.shift();
        const ev = { ok: true, event: 'lintelCall', section: k, slot };
        if (s.cur === null) { s.sec = k; s.cur = slot; s.bedUntil = slot; ev.moveTo = k; }
        if (rb.queue.length) { rb.at = rb.queue[0]; rb.nextAt = now + R.drive; ev.robotDrive = rb.at; }
        events.push(ev);
        continue;
      }
      s.results.push({ slot, a: 0, b: 0, worst: 0, grade: 'robot', mult: 1, streak: 0, pay: content.pay.robot, by: 'robot' });
      sec.cur++;
      const ev = { ok: true, event: 'robotLaid', slot, section: k, course: courseInfo(slot) };
      rb.nextAt += rb.interval;
      if (sec.cur >= sec.to) {
        sec.done = true; ev.sectionDone = k;
        rb.queue.shift();
        if (rb.queue.length) { rb.at = rb.queue[0]; rb.nextAt = now + R.drive; ev.robotDrive = rb.at; }
      }
      checkDone(now, ev);
      events.push(ev);
    }
    return events;
  }

  function summary(now) {
    const mine = s.results.filter(r => r.by !== 'robot'), n = g => mine.filter(r => r.grade === g).length;
    return {
      bricks: s.results.length, total: slots.length, mine: mine.length, robot: s.results.length - mine.length,
      perfect: n('perfect'), good: n('good'), rough: n('rough'), bestStreak: s.bestStreak,
      pay: Math.round(s.results.reduce((a, r) => a + r.pay, 0) * 100) / 100,
      seconds: s.t0 === null ? 0 : (s.t1 ?? now) - s.t0,
    };
  }

  // the game was paused (tab hidden) for dt seconds: mortar, robot and job clock don't age meanwhile
  function shift(dt) {
    s.bedAt += dt; s.robot.nextAt += dt;
    if (s.t0 !== null && !s.done) s.t0 += dt;
  }

  return { state: s, slots, open, lead, nextAction, mortarLeft, load, spread, scrape, grab, place, hit, tick, canHandOver, handOver, shift, summary };
}

/* ---------- campaign save: money, upgrades, unlocked jobs, robot ---------- */
export const newSave = () => ({ money: 0, upgrades: {}, unlocked: 1, best: {}, robot: false });

export function buyUpgrade(save, content, id) {
  const u = content.upgrades.find(x => x.id === id);
  if (!u) return { ok: false, msg: 'Unknown upgrade.' };
  if (save.upgrades[id]) return { ok: false, msg: 'Already owned.' };
  if (u.needsRobot && !save.robot) return { ok: false, msg: 'Finish your first job to get the robot.' };
  if (save.money < u.price) return { ok: false, msg: 'Not enough money yet.' };
  save.money = Math.round((save.money - u.price) * 100) / 100;
  save.upgrades[id] = true;
  return { ok: true };
}

export function finishJob(save, content, jobIndex, sum) {
  const job = content.jobs[jobIndex];
  save.money = Math.round((save.money + sum.pay) * 100) / 100;
  save.unlocked = Math.min(content.jobs.length, Math.max(save.unlocked, jobIndex + 2));
  if (job.id === content.robot.unlockAfter) save.robot = true;
  const pct = sum.mine ? Math.round(sum.perfect / sum.mine * 100) : 0;
  save.best[job.id] = Math.max(save.best[job.id] ?? 0, pct);
  return save;
}
