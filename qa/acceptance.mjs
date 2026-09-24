// Automated acceptance run (GitHub Actions): plays the build in headless Chrome at three screen
// sizes, measures the acceptance checks and saves screenshots to qa/out/.
//   node qa/acceptance.mjs http://localhost:8080/
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';

const BASE = (process.argv[2] || 'http://localhost:8080/') + '?q=low';
const OUT = 'qa/out';
mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
  { name: 'small', viewport: { width: 640, height: 400 } },
  { name: 'phone', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
const results = [];

// In-page bot: plays the current job the way the CI balance bot does, hands walls to the robot when
// it can, waits while the robot works, and (optionally) checks the gauge never covers the brick.
function installBot() {
  window.qaPlay = async ({ checkGauge = false, handOver = false, onHandOver } = {}) => {
    const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const over = [];
    let checked = -1;
    for (let n = 0; !__bbb.game.state.done && n < 20000; n++) {
      const g = __bbb.game, st = g.state;
      if (handOver && g.canHandOver()) { __bbb.handOver(); if (onHandOver) await window[onHandOver](); await frame(); continue; }
      const a = g.nextAction(performance.now() / 1000);
      if (a === 'hit') {
        if (checkGauge && checked !== st.cur) {
          checked = st.cur;
          await frame();
          const gr = document.getElementById('gauge').getBoundingClientRect(), br = __bbb.qa.brickRect();
          if (!(gr.right < br.x0 || gr.left > br.x1 || gr.bottom < br.y0 || gr.top > br.y1)) over.push(st.cur);
        }
        const s = st.setting;
        if (!s) continue; // the mortar went off while we waited for a frame: the brick set itself
        __bbb.act('brick', Math.max(s.a, s.b) > 3 ? 0.4 : 0, Math.abs(s.a - s.b) > 0.6 ? (s.a > s.b ? 0 : 1) : 0.5);
      } else if (a === 'load') __bbb.act('tub');
      else if (a === 'spread' || a === 'scrape' || a === 'place') __bbb.act('slot');
      else if (a === 'grab-full') __bbb.act('pallet');
      else if (a === 'grab-half' || a === 'swap') __bbb.act(g.slots[st.cur].kind === 'half' ? 'halves' : 'pallet');
      else await frame(); // 'watch' (robot working) or a camera move in progress
      if (a !== 'watch' && __bbb.camMoving()) await frame();
    }
    return { done: __bbb.game.state.done, over: [...new Set(over)] };
  };
}

const check = (view, id, ok, note) => results.push({ view, id, ok, note });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const v of VIEWS) {
  const ctx = await browser.newContext({ viewport: v.viewport, isMobile: v.isMobile, hasTouch: v.hasTouch, deviceScaleFactor: v.deviceScaleFactor || 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE);
  await page.waitForFunction(() => window.__bbb && !document.getElementById('startBtn').disabled, null, { timeout: 60000 });
  await page.evaluate(() => { localStorage.clear(); __bbb.begin(0); document.getElementById('toast').hidden = true; });
  await page.waitForTimeout(800);
  await page.evaluate(() => { __bbb.act('tub'); __bbb.act('pallet'); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${v.name}-1-hands.png` });

  // A6 (touch views): spread and lay the first brick with real taps on the projected slot
  if (v.hasTouch) {
    const tapSlot = async () => { const p = await page.evaluate(() => __bbb.qa.slotCenter()); await page.touchscreen.tap(p[0], p[1]); await page.waitForTimeout(150); };
    await tapSlot();
    const bedded = await page.evaluate(() => __bbb.game.state.bedUntil);
    await tapSlot();
    const placed = await page.evaluate(() => !!__bbb.game.state.setting);
    check(v.name, 'A6 touch spread + lay', bedded > 0 && placed, `bedUntil=${bedded}, setting=${placed}`);
  } else {
    await page.evaluate(() => { __bbb.act('slot'); __bbb.act('slot'); });
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${v.name}-2-levelling.png` });

  // A2: play the whole wall; whenever a brick is being levelled, the gauge must not cover it
  await page.evaluate(installBot);
  const a2 = await page.evaluate(() => window.qaPlay({ checkGauge: true }));
  check(v.name, 'A2 gauge never covers the brick', a2.done && a2.over.length === 0, `done=${a2.done}, overlapping slots=${JSON.stringify(a2.over)}`);

  // A4: admire view, then the card must leave the wall's centre visible
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${v.name}-3-admire.png` });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/${v.name}-4-card.png` });
  const a4 = await page.evaluate(() => {
    const c = document.querySelector('#end .card').getBoundingClientRect(), w = __bbb.qa.wallCenter();
    return { shown: !document.getElementById('end').hidden, covered: w[0] > c.left && w[0] < c.right && w[1] > c.top && w[1] < c.bottom, w: w.map(Math.round), card: [c.left, c.top, c.right, c.bottom].map(Math.round) };
  });
  check(v.name, 'A4 card leaves the wall visible', a4.shown && !a4.covered, `wall centre ${a4.w}, card ${a4.card}`);

  // A8 (desktop): Yard walls with the robot: hand over after the lead, walk on, robot finishes, job done
  if (v.name === 'desktop') {
    await page.evaluate(() => { __bbb.save.robot = true; __bbb.save.unlocked = 3; __bbb.save.upgrades.robotArm = true; document.getElementById('end').hidden = true; __bbb.begin(2); document.getElementById('toast').hidden = true; });
    await page.waitForTimeout(600);
    await page.evaluate(installBot);
    const a8 = await page.evaluate(async () => {
      const log = [];
      window.qaAfterHand = async () => {
        await new Promise(r => setTimeout(r, 2300)); // camera walks to the next wall
        const g = __bbb.game;
        log.push({ wall: g.state.cur === null ? null : g.slots[g.state.cur].section, yaw: +__bbb.view.yaw.toFixed(2), robotQueue: [...g.state.robot.queue] });
      };
      const r = await window.qaPlay({ handOver: true, onHandOver: 'qaAfterHand' });
      const sum = __bbb.game.summary(performance.now() / 1000);
      return { ...r, log, robot: sum.robot, mine: sum.mine };
    });
    const moved = a8.log.length >= 2 && a8.log[0].wall === 1 && Math.abs(a8.log[0].yaw - 1.57) < 0.1;
    check(v.name, 'A8 hand over, walk on, robot finishes', a8.done && moved && a8.robot > 0, `done=${a8.done}, handovers=${JSON.stringify(a8.log)}, by you ${a8.mine}, by robot ${a8.robot}`);
    await page.waitForTimeout(4200);
    await page.screenshot({ path: `${OUT}/${v.name}-5-yard.png` });
  }
  check(v.name, 'no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close();

const table = ['| view | check | result | notes |', '|---|---|---|---|', ...results.map(r => `| ${r.view} | ${r.id} | ${r.ok ? '✅' : '❌'} | ${r.note.replace(/\|/g, '/')} |`)].join('\n');
console.log(table);
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Acceptance run\n\n${table}\n\nScreenshots: the qa-screenshots artifact.\n`);
process.exit(results.every(r => r.ok) ? 0 : 1);
