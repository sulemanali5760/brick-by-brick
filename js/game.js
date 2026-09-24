import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// The release version lives once, in index.html's <script src="js/game.js?v=…">. Every other file is
// fetched with the same ?v= so a new release never mixes with files a browser cached from the last one.
const V = new URL(import.meta.url).searchParams.get('v') || 'dev';
const { createGame, multiplier, newSave, buyUpgrade, finishJob } = await import(`./rules.js?v=${V}`);

const $ = id => document.getElementById(id);
const content = await fetch(`data/content.json?v=${V}`).then(r => r.json());
$('ver').textContent = `Version ${V}`;
const W = content.wall;
const [, BD, BH] = W.brick;
const FOOT_TOP = 0.25, REACH = 2.8;
const nowS = () => performance.now() / 1000;

/* ---------- save (money, upgrades, unlocked jobs) ---------- */
const SAVE_KEY = 'brick-by-brick-save-v1';
function loadSave() { try { return { ...newSave(), ...JSON.parse(localStorage.getItem(SAVE_KEY)) }; } catch (e) { return newSave(); } }
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode: progress lasts this visit */ } }
let save = loadSave();

/* ---------- renderer, camera ---------- */
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd3e0);
const camera = new THREE.PerspectiveCamera(70, 1, 0.02, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);
const view = { yaw: 0, pitch: -0.72 };
let armSpread = 1; // arms move inward on narrow (portrait) screens so both hands stay in view
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return; // a 0-size layout pass would make the projection NaN
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 1 ? 82 : 70;
  camera.updateProjectionMatrix();
  armSpread = Math.max(0.55, Math.min(1, camera.aspect * 0.8));
}
new ResizeObserver(resize).observe(canvas);

/* ---------- loading ---------- */
const MODELS = ['brick_nf', 'brick_half', 'trowel', 'fp_arms', 'mortar_tub', 'pallet_euro', 'line_pin', 'spirit_level', 'bauzaun', 'cement_bag', 'measuring_tape_01'];
let loaded = 0;
const progress = () => { $('loading').textContent = `Loading site… ${loaded} / ${MODELS.length + 1}`; };
progress();
const gltf = new GLTFLoader();
// The .gltf files embed their buffer as a data: URI. Some hosts' CSP blocks fetch() of data: URIs,
// so decode it here and hand three.js an in-memory GLB instead.
async function loadGltf(url) {
  const json = await fetch(url).then(r => r.json());
  const bin = Uint8Array.from(atob(json.buffers[0].uri.split(',')[1]), c => c.charCodeAt(0));
  delete json.buffers[0].uri;
  const txt = new TextEncoder().encode(JSON.stringify(json));
  const jl = Math.ceil(txt.length / 4) * 4, bl = Math.ceil(bin.length / 4) * 4;
  const glb = new ArrayBuffer(28 + jl + bl), dv = new DataView(glb), u8 = new Uint8Array(glb);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, glb.byteLength, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4e4f534a, true); u8.fill(0x20, 20, 20 + jl); u8.set(txt, 20);
  dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004e4942, true); u8.set(bin, 28 + jl);
  return gltf.parseAsync(glb, '');
}
const M = Object.fromEntries(await Promise.all(MODELS.map(async n => {
  let root;
  try {
    root = (await loadGltf(`assets/models/${n}.gltf?v=${V}`)).scene;
  } catch (e) {
    console.warn('Model failed, using a placeholder:', n, e);
    root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xff00ff })));
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  loaded++; progress();
  return [n, root];
})));
new THREE.TextureLoader().load('assets/hdri/kloofendal_48d_partly_cloudy_puresky_1k.jpg', t => {
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t; scene.environment = t;
  loaded++; progress();
}, undefined, () => { loaded++; progress(); });
scene.environmentIntensity = 0.85;

const texLoader = new THREE.TextureLoader();
function tex(file, rx, ry, color = true) {
  const t = texLoader.load(`assets/textures/${file}`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const place = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; scene.add(obj); return obj; };
const meshOf = root => root.getObjectByProperty('isMesh', true);

/* ---------- the site that never moves ---------- */
const sun = new THREE.DirectionalLight(0xfff0dc, 2.4);
sun.position.set(3.5, 6, 4);
sun.target.position.set(0.75, 0.3, 0.3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({
  map: tex('brown_mud_dry_diffuse.jpg', 14, 14), normalMap: tex('brown_mud_dry_nor_gl.jpg', 14, 14, false), roughness: 1,
}));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const concrete = new THREE.MeshStandardMaterial({ map: tex('concrete_floor_02_diffuse.jpg', 2, 0.4), normalMap: tex('concrete_floor_02_nor_gl.jpg', 2, 0.4, false), roughness: 0.95 });
const mortarMap = tex('concrete_floor_02_diffuse.jpg', 0.3, 0.1);
const WET = new THREE.Color(0x8e887d), DRY = new THREE.Color(0xdcd6c9);
const mortarMat = new THREE.MeshStandardMaterial({ color: 0xc9c2b5, map: mortarMap, roughness: 1 });

place(M.spirit_level, 2.15, 0, 1.0, 0.5);
place(M.measuring_tape_01, 2.35, 0, 1.25, 1.2);
place(M.cement_bag, 2.45, 0, -0.75, 0.1);
place(M.cement_bag.clone(), 2.5, 0.18, -0.7, -0.25);
place(M.cement_bag.clone(), 2.95, 0, -0.55, 1.4);
for (const [x, z, r] of [[-1, -2.2, 0], [2.5, -2.2, 0], [-2.75, -0.45, Math.PI / 2], [-2.75, 3.05, Math.PI / 2], [4.25, -0.45, Math.PI / 2], [4.25, 3.05, Math.PI / 2], [-1, 4.8, 0], [2.5, 4.8, 0]])
  place(M.bauzaun.clone(), x, 0, z, r);

/* ---------- things each job moves around ---------- */
const hidden = new THREE.MeshBasicMaterial({ visible: false });
function hitbox(act, size, pos, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), hidden);
  m.position.set(...pos); m.userData.act = act; parent.add(m);
  return m;
}
function stack(mesh, spots, parent) {
  const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, spots.length);
  spots.forEach((m4, i) => im.setMatrixAt(i, m4));
  im.castShadow = im.receiveShadow = true;
  parent.add(im);
  return im;
}
// pallet: bricks lie across it (length along the pallet's short side), two layers, taken from the top
const pallet = place(M.pallet_euro, 0, 0, 0);
const fullSpots = [];
for (let layer = 0; layer < 2; layer++)
  for (let k = 0; k < 27; k++)
    fullSpots.push(new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(-0.5 + Math.floor(k / 3) * 0.125, 0.144 + layer * (BH + 0.002), ((k % 3) - 1) * 0.25));
const fullStack = stack(meshOf(M.brick_nf), fullSpots, pallet);
const halves = place(new THREE.Group(), 0, 0, 0);
const halfSpots = [];
for (let layer = 0; layer < 2; layer++)
  for (let k = 0; k < 4; k++) halfSpots.push(new THREE.Matrix4().setPosition((k % 2) * 0.125, layer * (BH + 0.002), Math.floor(k / 2) * 0.125));
const halfStack = stack(meshOf(M.brick_half), halfSpots, halves);
const tub = place(M.mortar_tub, 0, 0, 0);
const slotHit = hitbox('slot', [1, 1, 1], [0, 0, 0]);
const brickHit = hitbox('brick', [1, 1, 1], [0, 0, 0]);
const hits = [
  hitbox('tub', [0.55, 0.4, 0.55], [0, 0.2, 0], tub),
  hitbox('pallet', [1.25, 0.35, 0.85], [0, 0.18, 0], pallet),
  hitbox('halves', [0.32, 0.2, 0.32], [0.06, 0.08, 0.06], halves),
  slotHit, brickHit,
];
const footing = new THREE.Group(); scene.add(footing);
const wall = new THREE.Group(); scene.add(wall);
const lines = new THREE.Group(); scene.add(lines);
const beds = new Map(), bricks = new Map();

const ghost = new THREE.Group();
const ghostFill = new THREE.MeshBasicMaterial({ color: 0xf5b400, transparent: true, opacity: 0.25, depthWrite: false });
const ghostEdge = new THREE.LineBasicMaterial({ color: 0xf5b400 });
ghost.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostFill));
ghost.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), ghostEdge));
scene.add(ghost);

let jobIndex = 0, job = content.jobs[0], game = createGame(content, job, save.upgrades);
const slotY = sl => FOOT_TOP + sl.y;
// box dimensions for something lying along a slot: rot 1 runs along z
const dims = (sl, along, h, across) => (sl.rot ? [across, h, along] : [along, h, across]);

function bedFor(i, extraMM, freshAt) {
  const sl = game.slots[i];
  let b = beds.get(i);
  if (!b) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: WET.clone(), map: mortarMap, roughness: 1 }));
    mesh.receiveShadow = mesh.castShadow = true;
    b = { mesh, at: nowS() };
    beds.set(i, b); wall.add(mesh);
  }
  if (freshAt !== undefined) b.at = freshAt;
  const h = Math.max(0.004, W.bedJoint + extraMM / 1000);
  b.mesh.scale.set(...dims(sl, sl.len + 0.006, h, BD - 0.012));
  b.mesh.position.set(sl.x, slotY(sl) - W.bedJoint + h / 2, sl.z);
}
// a, b = height of the start and far end above the line (mm); the tilt is drawn 3x so you can see it
function setBrickHeight(i, a, b) {
  const sl = game.slots[i], brick = bricks.get(i), mid = (a + b) / 2;
  brick.position.set(sl.x, slotY(sl) + mid / 1000, sl.z);
  const tilt = Math.atan((b - a) / 1000 * 3 / sl.len);
  if (sl.rot) brick.rotation.set(-tilt, Math.PI / 2, 0); else brick.rotation.set(0, 0, tilt);
  bedFor(i, mid);
}
function headJoint(i) {
  const sl = game.slots[i];
  if (!sl.joint) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(...dims(sl, W.headJoint, BH, BD - 0.012)), mortarMat);
  const back = sl.len / 2 + W.headJoint / 2;
  m.position.set(sl.x - (sl.rot ? 0 : back), slotY(sl) + BH / 2, sl.z - (sl.rot ? back : 0));
  wall.add(m);
}

// string line: one pink line per wall, pins at both ends, moved up a course at a time
const stringMat = new THREE.MeshStandardMaterial({ color: 0xff3d8b, emissive: 0x551028 });
const line = { y: 0, target: 0 };
function buildLines() {
  lines.clear();
  const f = BD / 2 + 0.004;
  const segs = job.layout === 'corner' ? [[0, f, 1.03, f], [BD + 0.004, f, BD + 0.004, 1.03]] : [[-0.04, f, 1.53, f]];
  for (const [x1, z1, x2, z2] of segs) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, len, 6), stringMat);
    s.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    if (x2 !== x1) s.rotation.z = Math.PI / 2; else s.rotation.x = Math.PI / 2;
    lines.add(s);
    for (const [x, z] of [[x1, z1], [x2, z2]]) { const p = M.line_pin.clone(); p.position.set(x, -0.125, z); lines.add(p); }
  }
}
const lineTargetFor = course => { const sl = game.slots.find(s => s.course === course); return slotY(sl) + BH; };

function buildFooting() {
  footing.clear();
  const parts = job.layout === 'corner'
    ? [[1.22, 0.36, 0.49, 0], [0.36, 0.92, BD / 2, 0.64]]
    : [[1.9, 0.36, 0.745, 0]];
  for (const [sx, sz, x, z] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, FOOT_TOP, sz), concrete);
    m.position.set(x, FOOT_TOP / 2, z);
    m.castShadow = m.receiveShadow = true;
    footing.add(m);
  }
}

function setupJob(i) {
  jobIndex = i; job = content.jobs[i];
  game = createGame(content, job, save.upgrades);
  wall.clear(); beds.clear(); bricks.clear();
  buildFooting(); buildLines();
  pallet.position.set(job.pallet[0], 0, job.pallet[1]); pallet.rotation.y = job.pallet[2];
  halves.position.set(job.halves[0], 0, job.halves[1]);
  tub.position.set(job.tub[0], 0, job.tub[1]);
  const [cx, cz, yaw, pitch] = job.camera;
  camera.position.set(cx, 1.62, cz); view.yaw = yaw; view.pitch = pitch;
  line.y = line.target = lineTargetFor(0);
  lastAction = null;
  updateHUD();
}

/* ---------- first-person rig ---------- */
const armR = M.fp_arms.getObjectByName('ArmR') || new THREE.Group(), armL = M.fp_arms.getObjectByName('ArmL') || new THREE.Group();
const rig = new THREE.Group(); camera.add(rig);
// elbows sit low and forward; forearms point up into the view so hands and tools read clearly
const BASE = { R: { p: new THREE.Vector3(0.17, -0.34, -0.1), r: new THREE.Euler(0.46, 0.16, 0) }, L: { p: new THREE.Vector3(-0.17, -0.34, -0.1), r: new THREE.Euler(0.46, -0.16, 0) } };
for (const a of [armR, armL]) { a.traverse(o => { o.castShadow = false; }); rig.add(a); }
const trowel = M.trowel;
trowel.rotation.set(0, Math.PI / 2, -0.2); // handle runs through the fist (grip axis at 0.29 m), blade forward
trowel.position.set(0, 0, -0.29);
trowel.traverse(o => { o.castShadow = false; });
armR.add(trowel);
const lump = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mortarMat);
lump.scale.set(0.07, 0.022, 0.05);
lump.position.set(0.24, -0.035, 0);
trowel.add(lump);
const handBricks = { full: [], half: [] };
for (const kind of ['full', 'half']) for (let k = 0; k < 2; k++) {
  const b = (kind === 'full' ? M.brick_nf : M.brick_half).clone();
  b.rotation.y = Math.PI / 2;
  b.position.set(-k * 0.125, -0.012 - BH, -0.3); // hangs under the palm; a second brick (tongs) sits beside it
  b.traverse(o => { o.castShadow = false; });
  armL.add(b); handBricks[kind].push(b);
}

const anims = [];
const play = (arm, kind, dur) => anims.push({ arm, kind, t0: performance.now(), dur });
function armPose(name, arm, now) {
  const p = BASE[name].p.clone(), r = BASE[name].r.clone();
  p.x *= armSpread;
  for (const a of anims) {
    if (a.arm !== name) continue;
    const t = (now - a.t0) / a.dur;
    if (t < 0 || t > 1) continue;
    const s = Math.sin(Math.PI * t), jab = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    if (a.kind === 'scoop') { p.y -= 0.07 * s; p.z -= 0.1 * s; r.x -= 0.5 * s; }
    if (a.kind === 'spread') { p.x -= 0.1 * Math.sin(2 * Math.PI * t); p.z -= 0.08 * s; r.z += 0.35 * s; }
    if (a.kind === 'tap') { p.y -= 0.04 * jab; r.x -= 0.35 * jab; }
    if (a.kind === 'knock') { p.y -= 0.08 * jab; r.x -= 0.7 * jab; }
    if (a.kind === 'reach') { p.z -= 0.14 * s; p.y -= 0.06 * s; }
  }
  arm.position.copy(p); arm.rotation.copy(r);
}

/* ---------- sound (synthesised, starts on the Start click) ---------- */
let ac = null, master = null, muted = false, noiseBuf = null;
function audioInit() {
  if (ac) return;
  try {
    ac = new AudioContext();
    master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ac = null; }
}
function tone(f0, f1, dur, type, gain, delay = 0) {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function hiss(dur, type, f0, f1, gain) {
  const t = ac.currentTime, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur);
}
const SFX = {
  squish: () => { hiss(0.22, 'lowpass', 700, 250, 0.5); tone(180, 90, 0.15, 'sine', 0.2); },
  scrape: () => hiss(0.3, 'bandpass', 2400, 1100, 0.3),
  clack: () => { hiss(0.05, 'highpass', 1500, 1500, 0.3); tone(520, 400, 0.05, 'square', 0.05); },
  thock: () => { tone(125, 60, 0.15, 'sine', 0.6); hiss(0.06, 'lowpass', 1400, 400, 0.4); },
  tap: () => { tone(1100, 700, 0.05, 'triangle', 0.25); hiss(0.03, 'highpass', 3000, 3000, 0.2); },
  knock: () => { tone(420, 190, 0.1, 'triangle', 0.5); hiss(0.07, 'lowpass', 2000, 500, 0.45); },
  ding: streak => { const f = 1318 * 2 ** (Math.min(streak, 12) / 12); tone(f, f, 0.5, 'sine', 0.22); tone(f * 1.5, f * 1.5, 0.4, 'sine', 0.1); },
  ok: () => tone(880, 880, 0.18, 'sine', 0.14),
  sunk: () => tone(300, 90, 0.35, 'sine', 0.4),
  course: () => [523, 659, 784].forEach((f, i) => tone(f, f, 0.25, 'sine', 0.16, i * 0.09)),
};
const sfx = (k, arg) => { if (ac && !muted) SFX[k](arg); };

/* ---------- HUD ---------- */
let toastTimer;
function toast(text, who = 'Foreman') {
  $('toast').innerHTML = `<b>${who}</b>${text}`;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 7000);
}
const told = new Set();
const fact = key => { if (!told.has(key)) { told.add(key); toast(content.facts[key]); } };
function flyText(text, cls) {
  const el = document.createElement('div');
  el.className = 'fly ' + cls; el.textContent = text;
  $('hud').appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
const euro = n => '€' + n.toFixed(2);
let lastAction = null;
function updateHUD() {
  const s = game.state, now = nowS(), a = game.nextAction(now), sl = game.slots[s.cur];
  lastAction = a;
  $('task').textContent = content.clipboard[a];
  const perCourse = sl ? game.slots.filter(x => x.course === sl.course).length : 0;
  $('where').textContent = sl ? `${job.name} · course ${sl.course + 1} of ${job.courses} · brick ${sl.i + 1} of ${perCourse}` : `${job.name} · all courses laid`;
  const sum = game.summary(now), mult = multiplier(content, s.streak);
  $('pay').textContent = euro(sum.pay);
  $('count').textContent = `${sum.bricks} / ${sum.total} bricks`;
  $('streak').textContent = `Streak ${s.streak}${mult > 1 ? ` · ×${mult}` : ''}`;
  $('streak').classList.toggle('hot', mult > 1);
  $('gauge').hidden = !s.setting;
  if (s.setting) drawGauge();
  // ghost and hit boxes follow the current slot
  const show = sl && !s.setting;
  ghost.visible = !!show;
  if (sl) {
    ghost.scale.set(...dims(sl, sl.len + 0.004, BH + 0.004, BD + 0.004));
    ghost.position.set(sl.x, slotY(sl) + BH / 2, sl.z);
    slotHit.scale.set(...dims(sl, sl.len + 0.06, BH + 0.06, BD + 0.1));
    slotHit.position.copy(ghost.position);
    brickHit.scale.copy(slotHit.scale);
    brickHit.position.copy(ghost.position);
  }
  const col = a === 'scrape' ? 0xff7a59 : 0xf5b400;
  ghostFill.color.setHex(col); ghostEdge.color.setHex(col);
  slotHit.visible = !!show;
  brickHit.visible = !!s.setting;
  fullStack.count = s.stock.full; halfStack.count = s.stock.half;
  for (const k of ['full', 'half']) handBricks[k].forEach((b, n) => { b.visible = s.hand === k && n < s.handN; });
  lump.visible = s.trowel;
  if (a === 'scrape') fact('mortarOff');
}
function updateMortar(now) {
  const left = game.mortarLeft(now);
  $('mortar').hidden = left === null;
  if (left === null) return;
  $('mortarFill').style.width = (left / game.open * 100) + '%';
  $('mortarSec').textContent = left > 0 ? `${Math.ceil(left)} s` : 'gone off';
  $('mortar').classList.toggle('low', left < 6);
}

/* ---------- actions ---------- */
function labelFor(act) {
  const s = game.state, now = nowS(), sl = game.slots[s.cur], a = game.nextAction(now);
  if (act === 'tub') return s.trowel ? ['Trowel is loaded', false] : ['Load mortar', true];
  if (act === 'pallet') return s.hand === 'full' ? ['Hand is full', false] : [s.hand ? 'Swap for a full brick' : 'Take a brick', true];
  if (act === 'halves') return s.hand === 'half' ? ['Hand is full', false] : [s.hand ? 'Swap for a half brick' : 'Take a half brick', true];
  if (act === 'slot') {
    if (!sl) return ['', false];
    if (a === 'load') return ['Needs mortar first', false];
    if (a === 'spread') return ['Spread mortar bed', true];
    if (a === 'scrape') return ['Scrape off stiff mortar', true];
    if (!s.hand) return ['Take a brick first', false];
    return s.hand === sl.kind ? ['Lay brick', true] : [`Needs a ${sl.kind} brick`, false];
  }
  if (act === 'brick') return ['Click: tap · Hold: knock', true];
  return ['', false];
}

function act(target, hold, u = 0.5) {
  if (!target || !playing) return;
  const now = nowS();
  let r;
  if (target === 'tub') r = game.load(now);
  else if (target === 'pallet') r = game.grab('full', now);
  else if (target === 'halves') r = game.grab('half', now);
  else if (target === 'slot') {
    const a = game.nextAction(now);
    r = a === 'spread' || a === 'load' ? game.spread(now) : a === 'scrape' ? game.scrape(now) : game.place(now);
  } else if (target === 'brick') r = game.hit(hold, u, now);
  if (!r.ok) { flyText(r.msg, 'bad'); return; }
  handle(r, now);
}

// turn a rules event into visuals, sound and HUD
function handle(r, now) {

  if (r.event === 'loaded') { play('R', 'scoop', 420); sfx('squish'); fact('firstLoad'); }
  if (r.event === 'spread') { play('R', 'spread', 480); sfx('scrape'); r.slots.forEach(i => bedFor(i, 6, now)); }
  if (r.event === 'scraped') {
    play('R', 'spread', 480); sfx('scrape');
    r.slots.forEach(i => { const b = beds.get(i); if (b) { wall.remove(b.mesh); beds.delete(i); } });
  }
  if (r.event === 'grabbed') { play('L', 'reach', 380); sfx('clack'); }
  if (r.event === 'placed') {
    const sl = game.slots[r.slot];
    const b = (sl.kind === 'half' ? M.brick_half : M.brick_nf).clone();
    b.rotation.y = sl.rot ? Math.PI / 2 : 0;
    b.traverse(o => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      const k = 0.82 + Math.random() * 0.28; // real walls vary: some bricks fired darker, some paler
      o.material.color.setRGB(k, k * (0.9 + Math.random() * 0.12), k * (0.88 + Math.random() * 0.12));
    });
    bricks.set(r.slot, b); wall.add(b);
    setBrickHeight(r.slot, r.a, r.b);
    play('L', 'reach', 380); sfx('thock'); fact('firstPlace');
    if (r.apprentice) {
      setTimeout(() => sfx('clack'), 450);
      if (!told.has('apprentice')) { told.add('apprentice'); toast('Here you go, next one.', 'Apprentice'); }
    }
  }
  if (r.event === 'hit' || r.event === 'sunk' || (r.event === 'set' && !r.proud)) {
    play('R', r.knock ? 'knock' : 'tap', r.knock ? 260 : 180); sfx(r.knock ? 'knock' : 'tap'); shake = r.knock ? 0.006 : 0.002;
  }
  if (r.event === 'hit') setBrickHeight(r.slot, r.a, r.b);
  if (r.event === 'sunk') {
    wall.remove(bricks.get(r.slot)); bricks.delete(r.slot);
    bedFor(r.slot, 6, now);
    setTimeout(() => sfx('sunk'), 90);
    flyText('Too low. Re-lay it', 'bad'); fact('firstSunk');
  }
  if (r.event === 'set') {
    setBrickHeight(r.slot, r.a, r.b);
    headJoint(r.slot);
    setTimeout(() => (r.grade === 'perfect' ? sfx('ding', r.streak) : r.proud ? sfx('sunk') : sfx('ok')), 80);
    if (r.proud) { flyText(`Set proud: mortar went off +${euro(r.pay)}`, 'rough'); fact('proud'); }
    else { flyText(`${r.grade[0].toUpperCase() + r.grade.slice(1)} +${euro(r.pay)}${r.mult > 1 ? ` ×${r.mult}` : ''}`, r.grade); fact('firstSet'); }
    if (r.streak === 4) fact('streak');
    if (r.course) {
      setTimeout(() => sfx('course'), 350);
      const c = r.course.index, note = job.afterCourse[String(c)];
      toast(note ?? `Course ${c + 1} done. Average ${r.course.avg.toFixed(1)} mm off the line.`);
      if (!r.done) line.target = lineTargetFor(c + 1);
    }
    if (r.done) finish();
  }
  updateHUD();
}

/* ---------- start card, end card, shop ---------- */
let selected = Math.min(save.unlocked, content.jobs.length) - 1;
function renderStart() {
  $('jobs').innerHTML = content.jobs.map((j, i) => {
    const open = i < save.unlocked, best = save.best[j.id];
    return `<li><button class="job" data-job="${i}" aria-pressed="${i === selected}" ${open ? '' : 'disabled'}>
      <span>${i + 1}. ${j.name}</span><em>${!open ? 'Locked' : best !== undefined ? `Best ${best}% perfect` : 'New'}</em></button></li>`;
  }).join('') + content.comingNext.map((n, k) => `<li><div class="job soon"><span>${content.jobs.length + k + 1}. ${n}</span><em>Coming soon</em></div></li>`).join('');
  const owned = content.upgrades.filter(u => save.upgrades[u.id]).map(u => u.name);
  $('wallet').textContent = `Wallet ${euro(save.money)}${owned.length ? ` · Tools: ${owned.join(', ')}` : ''}`;
  $('startBtn').textContent = `Start: ${content.jobs[selected].name}`;
}
$('jobs').addEventListener('click', e => {
  const b = e.target.closest('[data-job]');
  if (!b || b.disabled) return;
  selected = +b.dataset.job; setupJob(selected); renderStart();
});
function renderShop() {
  $('endWallet').textContent = euro(save.money);
  $('shop').innerHTML = content.upgrades.map(u => {
    const own = !!save.upgrades[u.id];
    return `<div class="item"><div><b>${u.name}</b><span>${u.desc}</span></div>
      <button class="buy" data-buy="${u.id}" ${own || save.money < u.price ? 'disabled' : ''}>${own ? 'Owned' : euro(u.price)}</button></div>`;
  }).join('');
}
$('shop').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]');
  if (!b || b.disabled) return;
  if (buyUpgrade(save, content, b.dataset.buy).ok) { storeSave(); renderShop(); }
});

function finish() {
  const s = game.summary(nowS());
  finishJob(save, content, jobIndex, s); storeSave();
  const mins = Math.floor(s.seconds / 60), secs = Math.round(s.seconds % 60);
  $('endTitle').textContent = `${job.name} finished`;
  $('endStats').innerHTML = [
    ['Bricks laid', `${s.bricks}`], ['Perfect', `${Math.round(s.perfect / s.bricks * 100)}%`], ['Best streak', `${s.bestStreak}`],
    ['Re-laid', `${s.rough}`], ['Time', `${mins}:${String(secs).padStart(2, '0')}`], ['Earned', euro(s.pay)],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('learned').innerHTML = content.learned[job.id].map(x => `<li>${x}</li>`).join('');
  const next = content.jobs[jobIndex + 1];
  $('nextBtn').hidden = !next;
  if (next) $('nextBtn').textContent = `Next job: ${next.name}`;
  $('moreSoon').hidden = !!next;
  $('moreSoon').textContent = `More jobs are on the way: ${content.comingNext.join(', ')}.`;
  renderShop();
  // admire: hands down, camera eases back to show the whole job, then the card slides in beside it
  playing = false; down = null;
  if (document.pointerLockElement) document.exitPointerLock();
  $('gauge').hidden = true; $('cross').hidden = true; $('label').textContent = '';
  const [x, y, z, yaw, pitch] = job.admire;
  admire = { t0: performance.now() + 700, from: { pos: camera.position.clone(), yaw: view.yaw, pitch: view.pitch }, to: { pos: new THREE.Vector3(x, y, z), yaw, pitch } };
  setTimeout(() => { $('end').hidden = false; }, 3400);
}
let admire = null;
function stepAdmire(now) {
  const k = Math.max(0, Math.min(1, (now - admire.t0) / 2500)), e = k * k * (3 - 2 * k);
  camera.position.lerpVectors(admire.from.pos, admire.to.pos, e);
  view.yaw = admire.from.yaw + (admire.to.yaw - admire.from.yaw) * e;
  view.pitch = admire.from.pitch + (admire.to.pitch - admire.from.pitch) * e;
  rig.position.y = -0.4 * e; // lower the hands out of view
}
function begin(i) {
  audioInit();
  admire = null; rig.position.y = 0;
  selected = i; setupJob(i);
  $('start').hidden = true; $('end').hidden = true;
  playing = true;
  if (!matchMedia('(pointer: coarse)').matches) {
    const p = canvas.requestPointerLock?.();
    if (p && p.catch) p.catch(() => { lockFailed = true; });
  }
  $('lockHint').hidden = true;
  toast(job.brief);
}
$('startBtn').onclick = () => begin(selected);
$('nextBtn').onclick = () => begin(jobIndex + 1);
$('againBtn').onclick = () => begin(jobIndex);
$('menuBtn').onclick = () => { $('end').hidden = true; selected = jobIndex; renderStart(); $('start').hidden = false; };
let resetArmed = false;
$('resetBtn').onclick = () => {
  if (!resetArmed) { resetArmed = true; $('resetBtn').textContent = 'Click again to wipe money, tools and jobs'; return; }
  save = newSave(); storeSave(); resetArmed = false; $('resetBtn').textContent = 'Reset progress';
  selected = 0; setupJob(0); renderStart();
};

/* ---------- input ---------- */
const ray = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
let playing = false, locked = false, lockFailed = false, shake = 0;
let down = null;  // {t, x, y, target, dragged}
const keys = new Set();

function targetAt(ndc) {
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(hits.filter(h => h.visible), false).find(h => h.distance < REACH);
  return hit ? { act: hit.object.userData.act, point: hit.point } : null;
}
// where along the current brick a point lies: 0 = start end, 1 = far end
function alongBrick(point) {
  const sl = game.slots[game.state.cur];
  if (!sl || !point) return 0.5;
  const t = sl.rot ? (point.z - (sl.z - sl.len / 2)) / sl.len : (point.x - (sl.x - sl.len / 2)) / sl.len;
  return Math.max(0, Math.min(1, t));
}
// is the start end of the current slot on the left of the screen?
function startIsLeft() {
  const sl = game.slots[game.state.cur];
  if (!sl) return true;
  const h = sl.len / 2, y = slotY(sl);
  const p0 = new THREE.Vector3(sl.x - (sl.rot ? 0 : h), y, sl.z - (sl.rot ? h : 0)).project(camera);
  const p1 = new THREE.Vector3(sl.x + (sl.rot ? 0 : h), y, sl.z + (sl.rot ? h : 0)).project(camera);
  return p0.x <= p1.x;
}
function endName(u) {
  const lo = u < 0.35, hi = u > 0.65, left = startIsLeft();
  return (left ? lo : hi) ? 'left end' : (left ? hi : lo) ? 'right end' : 'middle';
}
// side view of the brick against the string line: left and right as you see them
function drawGauge() {
  const st = game.state.setting;
  const [l, r] = startIsLeft() ? [st.a, st.b] : [st.b, st.a];
  const px = mm => Math.max(-30, Math.min(30, mm * 5));
  const tilt = Math.atan2(px(r) - px(l), 120);
  $('gBrick').style.transform = `translateY(${-(px(l) + px(r)) / 2}px) rotate(${-tilt}rad)`;
  const f = mm => `${mm >= 0 ? '+' : '−'}${Math.abs(mm).toFixed(1)}`;
  $('gaugeVal').textContent = `left ${f(l)} · right ${f(r)} mm`;
}
const ndcOf = e => { const r = canvas.getBoundingClientRect(); return new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };

canvas.addEventListener('pointerdown', e => {
  if (!playing) return;
  if (e.pointerType === 'mouse' && !locked && !lockFailed) {
    const p = canvas.requestPointerLock?.();
    if (p && p.catch) p.catch(() => { lockFailed = true; });
    return;
  }
  if (!locked) try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
  down = { t: performance.now(), x: e.clientX, y: e.clientY, target: locked ? targetAt(center) : targetAt(ndcOf(e)), dragged: false };
  if (down.target) { down.u = alongBrick(down.target.point); down.target = down.target.act; }
});
canvas.addEventListener('pointermove', e => {
  if (!playing) return;
  if (locked) { look(e.movementX * 0.0022, e.movementY * 0.0022); return; }
  if (down && (down.dragged || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8)) {
    if (!down.dragged) { down.dragged = true; down.lx = e.clientX; down.ly = e.clientY; }
    look((e.clientX - down.lx) * 0.005, (e.clientY - down.ly) * 0.005);
    down.lx = e.clientX; down.ly = e.clientY;
  }
});
canvas.addEventListener('pointerup', () => {
  if (!down) return;
  const d = down; down = null;
  if (!d.dragged) act(d.target, (performance.now() - d.t) / 1000, d.u);
});
canvas.addEventListener('pointercancel', () => { down = null; });
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  $('lockHint').hidden = locked || !playing || lockFailed || matchMedia('(pointer: coarse)').matches;
});
document.addEventListener('pointerlockerror', () => { lockFailed = true; $('lockHint').hidden = true; });
function look(dx, dy) {
  view.yaw -= dx;
  view.pitch = Math.max(-1.35, Math.min(0.9, view.pitch - dy));
}
addEventListener('keydown', e => {
  if (e.target.closest?.('button')) return;
  keys.add(e.code);
  if (e.code === 'KeyM') { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
$('mute').onclick = () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; };

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), side = new THREE.Vector3();
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), now = performance.now(), t = now / 1000;
  if (playing) {
    let mx = 0, mz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
    if (mx || mz) {
      fwd.set(-Math.sin(view.yaw), 0, -Math.cos(view.yaw));
      side.set(Math.cos(view.yaw), 0, -Math.sin(view.yaw));
      camera.position.addScaledVector(fwd, mz * 1.6 * dt).addScaledVector(side, mx * 1.6 * dt);
      const [x0, x1, z0, z1] = job.bounds;
      camera.position.x = Math.max(x0, Math.min(x1, camera.position.x));
      camera.position.z = Math.max(z0, Math.min(z1, camera.position.z));
    }
    const bob = (mx || mz) ? Math.sin(now / 140) * 0.012 : Math.sin(now / 900) * 0.003;
    camera.position.y = 1.62 + bob;
    const froze = game.tick(t);
    if (froze) handle(froze, t);
    if (game.nextAction(t) !== lastAction) updateHUD();
    updateMortar(t);
  }
  if (admire) stepAdmire(now);
  shake *= 0.85;
  camera.rotation.set(view.pitch + (Math.random() - 0.5) * shake, view.yaw + (Math.random() - 0.5) * shake, 0);
  armPose('R', armR, now); armPose('L', armL, now);
  for (let i = anims.length - 1; i >= 0; i--) if (now - anims[i].t0 > anims[i].dur) anims.splice(i, 1);

  // fresh mortar is dark and wet; it pales as it stiffens
  for (const b of beds.values()) {
    const k = Math.min(1, (t - b.at) / game.open);
    if (b.k !== k) { b.k = k; b.mesh.material.color.copy(WET).lerp(DRY, k); }
  }
  line.y += (line.target - line.y) * Math.min(1, dt * 5);
  lines.position.y = line.y;
  ghostFill.opacity = 0.18 + 0.12 * Math.sin(now / 300);

  if (playing) {
    const hit = locked ? targetAt(center) : null, tgt = hit && hit.act;
    let [label, ok] = tgt ? labelFor(tgt) : ['', false];
    if (tgt === 'brick') label = `Tap the ${endName(alongBrick(hit.point))} · hold to knock`;
    if (down && down.target === 'brick' && !down.dragged) {
      const held = (now - down.t) / 1000, mm = content.mm;
      label = held < content.holdForKnock ? 'Light tap' : `Knock ~${Math.min(mm.knock[1], mm.knock[0] + (held - content.holdForKnock) * mm.knockPerSec).toFixed(1)} mm`;
    }
    $('cross').hidden = !locked;
    $('label').textContent = label;
    $('cross').classList.toggle('on', !!tgt && ok);
    const charging = down && down.target === 'brick' && !down.dragged;
    const full = content.holdForKnock + (content.mm.knock[1] - content.mm.knock[0]) / content.mm.knockPerSec;
    $('cross').style.setProperty('--charge', charging ? Math.min(1, (now - down.t) / 1000 / full) : 0);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

setupJob(selected);
renderStart();
resize();
$('startBtn').disabled = false;
requestAnimationFrame(frame);
// console hook for play-testing: __bbb.act('tub'), __bbb.game.state …
window.__bbb = {
  act, get game() { return game; }, setupJob, begin, get save() { return save; }, camera, scene, view, renderer,
  look: (yaw, pitch) => { view.yaw = yaw; view.pitch = pitch; },
  // freeze the current 3D frame into an <img>: screenshot tools can miss a live WebGL canvas
  shot() {
    renderer.render(scene, camera);
    let img = $('dbgShot');
    if (!img) { img = document.createElement('img'); img.id = 'dbgShot'; img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; $('app').insertBefore(img, $('hud')); }
    img.src = canvas.toDataURL('image/jpeg', 0.85);
  },
  unshot() { $('dbgShot')?.remove(); },
};
