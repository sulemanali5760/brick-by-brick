// Automated acceptance run (GitHub Actions): plays the build in headless Chrome at three screen
// sizes, measures the acceptance checks and saves screenshots to qa/out/.
//   node qa/acceptance.mjs http://localhost:8080/
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:8080/';
const OUT = 'qa/out';
mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
  { name: 'small', viewport: { width: 640, height: 400 } },
  { name: 'phone', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
const results = [];
const check = (view, id, ok, note) => results.push({ view, id, ok, note });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const v of VIEWS) {
  const ctx = await browser.newContext({ viewport: v.viewport, isMobile: v.isMobile, hasTouch: v.hasTouch, deviceScaleFactor: v.deviceScaleFactor || 1 });
  const page = await ctx.newPage();
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
  const a2 = await page.evaluate(async () => {
    const g = __bbb.game, over = [];
    const rectOf = el => el.getBoundingClientRect();
    for (let n = 0; !g.state.done && n < 4000; n++) {
      const a = g.nextAction(performance.now() / 1000), st = g.state;
      if (a === 'hit') {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const gr = rectOf(document.getElementById('gauge')), br = __bbb.qa.brickRect();
        if (!(gr.right < br.x0 || gr.left > br.x1 || gr.bottom < br.y0 || gr.top > br.y1)) over.push(st.cur);
        const s = st.setting;
        __bbb.act('brick', Math.max(s.a, s.b) > 3 ? 0.4 : 0, Math.abs(s.a - s.b) > 0.6 ? (s.a > s.b ? 0 : 1) : 0.5);
      } else if (a === 'load') __bbb.act('tub');
      else if (a === 'spread' || a === 'scrape' || a === 'place') __bbb.act('slot');
      else if (a === 'grab-full') __bbb.act('pallet');
      else if (a === 'grab-half' || a === 'swap') __bbb.act(g.slots[st.cur].kind === 'half' ? 'halves' : 'pallet');
    }
    return { done: g.state.done, over: [...new Set(over)] };
  });
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
  check(v.name, 'no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close();

const table = ['| view | check | result | notes |', '|---|---|---|---|', ...results.map(r => `| ${r.view} | ${r.id} | ${r.ok ? '✅' : '❌'} | ${r.note.replace(/\|/g, '/')} |`)].join('\n');
console.log(table);
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Acceptance run\n\n${table}\n\nScreenshots: the qa-screenshots artifact.\n`);
process.exit(results.every(r => r.ok) ? 0 : 1);
