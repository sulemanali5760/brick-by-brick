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
// One game clock drives rules, mortar, robot and animations. It only advances inside the frame loop
// while you play, so a hidden tab pauses the game and fast-forward is just a speed factor.
const gameClock = { t: 0, speed: 1 };
const nowS = () => gameClock.t;
let fastForward = false;

/* ---------- save (money, upgrades, unlocked jobs) ---------- */
const SAVE_KEY = 'brick-by-brick-save-v1';
function loadSave() { try { return { ...newSave(), ...JSON.parse(localStorage.getItem(SAVE_KEY)) }; } catch (e) { return newSave(); } }
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode: progress lasts this visit */ } }
let save = loadSave();

/* ---------- renderer, camera ---------- */
const canvas = $('view');
// ?q=low: for weak GPUs (and the software-GL QA runner): no shadows, no antialiasing, 1x pixels
const LOW = new URLSearchParams(location.search).get('q') === 'low';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW });
renderer.setPixelRatio(LOW ? 1 : Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = !LOW;
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
const MODELS = ['brick_nf', 'brick_half', 'trowel', 'fp_arms', 'mortar_tub', 'pallet_euro', 'line_pin', 'spirit_level', 'bauzaun', 'cement_bag', 'measuring_tape_01', 'robot'];
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

let jobIndex = 0, job = content.jobs[0], game = createGame(content, job, save.upgrades, Math.random, { robot: save.robot });
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

// string lines: one pink line per wall on the side you work from, pins at both ends. Each wall's line
// climbs a course at a time as that wall's courses are finished, by you or by the robot.
const stringMat = new THREE.MeshStandardMaterial({ color: 0xff3d8b, emissive: 0x551028 });
let lineSets = [];
const lineTargetFor = (section, course) => {
  const sl = game.slots.find(x => x.section === section && x.course === course);
  return sl ? slotY(sl) + BH : null;
};
function raiseLine(section, finished) { const y = lineTargetFor(section, finished + 1); if (y !== null) lineSets[section].target = y; }
function buildLines() {
  lines.clear(); lineSets = [];
  const f = BD / 2 + 0.004;
  job.sections.forEach((sec, k) => {
    const [ox, oz] = sec.o, fc = (sec.face ?? 1) * f, grp = new THREE.Group();
    const segs = sec.layout === 'corner' ? [[ox, oz + f, ox + 1.03, oz + f], [ox + BD + 0.004, oz + f, ox + BD + 0.004, oz + 1.03]]
      : sec.rot ? [[ox + fc, oz - 0.04, ox + fc, oz + 1.53]] : [[ox - 0.04, oz + fc, ox + 1.53, oz + fc]];
    for (const [x1, z1, x2, z2] of segs) {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, len, 6), stringMat);
      str.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      if (x2 !== x1) str.rotation.z = Math.PI / 2; else str.rotation.x = Math.PI / 2;
      grp.add(str);
      for (const [x, z] of [[x1, z1], [x2, z2]]) { const p = M.line_pin.clone(); p.position.set(x, -0.125, z); grp.add(p); }
    }
    lines.add(grp);
    const y = lineTargetFor(k, 0);
    lineSets.push({ group: grp, y, target: y });
  });
}

function buildFooting() {
  footing.clear();
  const parts = [];
  for (const sec of job.sections) {
    const [ox, oz] = sec.o;
    if (sec.layout === 'corner') parts.push([1.22, 0.36, ox + 0.49, oz], [0.36, 0.92, ox + BD / 2, oz + 0.64]);
    else if (sec.rot) parts.push([0.36, 1.9, ox, oz + 0.745]);
    else parts.push([1.9, 0.36, ox + 0.745, oz]);
  }
  for (const [sx, sz, x, z] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, FOOT_TOP, sz), concrete);
    m.position.set(x, FOOT_TOP / 2, z);
    m.castShadow = m.receiveShadow = true;
    footing.add(m);
  }
}

function setupJob(i) {
  jobIndex = i; job = content.jobs[i];
  game = createGame(content, job, save.upgrades, Math.random, { robot: save.robot });
  wall.clear(); beds.clear(); bricks.clear(); drops.length = 0;
  buildFooting(); buildLines();
  pallet.position.set(job.pallet[0], 0, job.pallet[1]); pallet.rotation.y = job.pallet[2];
  halves.position.set(job.halves[0], 0, job.halves[1]);
  tub.position.set(job.tub[0], 0, job.tub[1]);
  const [cx, cz, yaw, pitch] = job.sections[0].camera;
  camera.position.set(cx, 1.62, cz); view.yaw = yaw; view.pitch = pitch; camTween = null;
  robot.group.visible = game.state.robot.on;
  parkRobot(0);
  lastAction = null;
  updateHUD();
}

// a new brick mesh for a slot; real walls vary in tone, some bricks fired darker, some paler
function newBrick(sl) {
  const b = (sl.kind === 'half' ? M.brick_half : M.brick_nf).clone();
  b.rotation.y = sl.rot ? Math.PI / 2 : 0;
  b.traverse(o => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    const k = 0.82 + Math.random() * 0.28;
    o.material.color.setRGB(k, k * (0.9 + Math.random() * 0.12), k * (0.88 + Math.random() * 0.12));
  });
  return b;
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

/* ---------- the bricklaying robot ---------- */
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const robot = {
  group: new THREE.Group(), drive: null, armYaw: 0, dipT: -9,
  base: M.robot.getObjectByName('RobotBase') || new THREE.Group(),
  arm: M.robot.getObjectByName('RobotArm') || new THREE.Group(),
};
robot.group.add(robot.base, robot.arm);
scene.add(robot.group);
function parkRobot(k) {
  const [x, z, yaw] = job.sections[k].robot;
  robot.group.position.set(x, 0, z); robot.group.rotation.y = yaw; robot.drive = null; robot.armYaw = 0; robot.arm.rotation.y = 0;
}
function driveRobot(k, t) {
  const [x, z, yaw] = job.sections[k].robot;
  robot.drive = { t0: t, dur: content.robot.drive, from: robot.group.position.clone(), fromYaw: robot.group.rotation.y, to: new THREE.Vector3(x, 0, z), toYaw: yaw };
  robot.armYaw = 0;
}
const drops = []; // bricks the robot is lowering into place
function robotLay(i, t) {
  const sl = game.slots[i], p = robot.group.position;
  robot.armYaw = angleDiff(Math.atan2(-(sl.x - p.x), -(sl.z - p.z)), robot.group.rotation.y); // boom towards the brick
  robot.dipT = t;
  const b = newBrick(sl);
  b.position.set(sl.x, slotY(sl) + 0.3, sl.z);
  wall.add(b); bricks.set(i, b);
  bedFor(i, 0, t); headJoint(i);
  drops.push({ b, y: slotY(sl), t0: t });
  sfx('servo');
}
function stepRobot(t) {
  const d = robot.drive;
  if (d) {
    const k = Math.min(1, (t - d.t0) / d.dur), e = k * k * (3 - 2 * k);
    robot.group.position.lerpVectors(d.from, d.to, e);
    robot.group.rotation.y = d.fromYaw + angleDiff(d.toYaw, d.fromYaw) * e;
    if (k >= 1) robot.drive = null;
  }
  robot.arm.rotation.y += angleDiff(robot.armYaw, robot.arm.rotation.y) * 0.25;
  robot.arm.position.y = -0.1 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - robot.dipT) / 0.35)));
  for (let i = drops.length - 1; i >= 0; i--) {
    const q = drops[i], k = Math.min(1, (t - q.t0) / 0.3);
    q.b.position.y = q.y + 0.3 * (1 - k * k);
    if (k >= 1) drops.splice(i, 1);
  }
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
  servo: () => { tone(420, 690, 0.14, 'square', 0.035); hiss(0.05, 'lowpass', 900, 300, 0.12); },
  whoosh: () => hiss(0.5, 'bandpass', 400, 2400, 0.3),
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
  const s = game.state, now = nowS(), a = game.nextAction(now), sl = s.cur === null ? undefined : game.slots[s.cur];
  lastAction = a;
  $('task').textContent = content.clipboard[a];
  const many = job.sections.length > 1;
  if (sl) {
    const perCourse = game.slots.filter(x => x.section === sl.section && x.course === sl.course).length;
    $('where').textContent = `${job.name}${many ? ` · wall ${sl.section + 1} of ${job.sections.length}` : ''} · course ${sl.course + 1} of ${job.sections[sl.section].courses} · brick ${sl.i + 1} of ${perCourse}`;
  } else $('where').textContent = `${job.name} · ${s.done ? 'finished' : 'the robot is on it'}`;
  $('belt').hidden = !touchMode;
  for (const b of $('belt').querySelectorAll('[data-act]')) {
    const k = b.dataset.act;
    b.classList.toggle('on', (k === 'tub' && s.trowel) || (k === 'pallet' && s.hand === 'full') || (k === 'halves' && s.hand === 'half'));
    b.classList.toggle('want', (k === 'tub' && a === 'load') || (k === 'pallet' && a === 'grab-full') || (k === 'halves' && (a === 'grab-half' || (a === 'swap' && sl && sl.kind === 'half'))));
  }
  $('ffBtn').hidden = a !== 'watch';
  $('ffBtn').textContent = fastForward ? 'Speed ×4 · on' : 'Speed ×4';
  const canHand = game.canHandOver();
  $('hint').hidden = !canHand;
  $('hint').textContent = content.clipboard.handover;
  $('handBtn').hidden = !canHand;
  const rb = s.robot;
  $('robotLine').hidden = !rb.on;
  if (rb.on) {
    const k = rb.queue[0], left = k === undefined ? 0 : s.secs[k].to - s.secs[k].cur;
    $('robotLine').textContent = k === undefined ? 'Robot: idle' : robot.drive ? `Robot: driving to wall ${k + 1}` : `Robot: wall ${k + 1} · ${left} left${rb.queue.length > 1 ? ` · ${rb.queue.length - 1} queued` : ''}`;
  }
  const sum = game.summary(now), mult = multiplier(content, s.streak);
  $('pay').textContent = euro(sum.pay);
  $('count').textContent = `${sum.bricks} / ${sum.total} bricks`;
  $('progFill').style.width = `${sum.bricks / sum.total * 100}%`;
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

function doHandOver() {
  if (!playing || camTween) return;
  const r = game.handOver(nowS());
  if (!r.ok) { flyText(r.msg, 'bad'); return; }
  handle(r, nowS());
}
function act(target, hold, u = 0.5) {
  if (!target || !playing || camTween) return;
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
    const b = newBrick(game.slots[r.slot]);
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
      const c = r.course.index, note = r.course.section === 0 ? job.afterCourse[String(c)] : undefined;
      toast(note ?? `Course ${c + 1} done. Average ${r.course.avg.toFixed(1)} mm off the line.`);
      raiseLine(r.course.section, c);
    }
    if (r.sectionDone !== undefined && job.sections.length > 1) toast(`Wall ${r.sectionDone + 1} finished.`);
    if (r.moveTo !== undefined) travelTo(r.moveTo);
    if (r.done) finish();
  }
  if (r.event === 'handover') {
    sfx('whoosh');
    toast(`Wall ${r.section + 1} handed to the robot.${r.moveTo !== undefined ? ` On to wall ${r.moveTo + 1}.` : ' Watch it finish.'}`);
    if (r.robotDrive !== undefined) driveRobot(r.robotDrive, now);
    if (r.moveTo !== undefined) travelTo(r.moveTo);
  }
  if (r.event === 'robotLaid') {
    robotLay(r.slot, now);
    if (r.course) raiseLine(r.course.section, r.course.index);
    if (r.sectionDone !== undefined) { setTimeout(() => sfx('course'), 250); toast(`Wall ${r.sectionDone + 1} finished.`, 'Robot'); }
    if (r.robotDrive !== undefined) driveRobot(r.robotDrive, now);
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
    const own = !!save.upgrades[u.id], locked = u.needsRobot && !save.robot;
    return `<div class="item"><div><b>${u.name}</b><span>${u.desc}</span></div>
      <button class="buy" data-buy="${u.id}" ${own || locked || save.money < u.price ? 'disabled' : ''}>${own ? 'Owned' : locked ? 'Needs robot' : euro(u.price)}</button></div>`;
  }).join('');
}
$('shop').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]');
  if (!b || b.disabled) return;
  if (buyUpgrade(save, content, b.dataset.buy).ok) { storeSave(); renderShop(); }
});

function finish() {
  const s = game.summary(nowS()), hadRobot = save.robot;
  finishJob(save, content, jobIndex, s); storeSave();
  const mins = Math.floor(s.seconds / 60), secs = Math.round(s.seconds % 60);
  $('endTitle').textContent = `${job.name} finished`;
  $('endStats').innerHTML = [
    ['Bricks by you', `${s.mine}`], ['Perfect', `${Math.round(s.perfect / Math.max(1, s.mine) * 100)}%`], ['Best streak', `${s.bestStreak}`],
    s.robot ? ['By the robot', `${s.robot}`] : ['Rough', `${s.rough}`], ['Time', `${mins}:${String(secs).padStart(2, '0')}`], ['Earned', euro(s.pay)],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('learned').innerHTML = (!hadRobot && save.robot ? ['<b>New: the bricklaying robot joins you from the next job.</b> Lay the first two courses, then hand the wall over.'] : [])
    .concat(content.learned[job.id]).map(x => `<li>${x}</li>`).join('');
  const next = content.jobs[jobIndex + 1];
  $('nextBtn').hidden = !next;
  if (next) $('nextBtn').textContent = `Next job: ${next.name}`;
  $('moreSoon').hidden = !!next;
  $('moreSoon').textContent = `More jobs are on the way: ${content.comingNext.join(', ')}.`;
  renderShop();
  // admire: hands down, camera eases back to show the whole job, then the card slides in beside it
  playing = false; down = null;
  if (document.pointerLockElement) document.exitPointerLock();
  $('hud').hidden = true; // cinematic: nothing but the wall
  const [x, y, z, yaw, pitch0] = job.admire;
  // when the card is a bottom sheet (< 1000 px wide), tilt down so the wall sits in the top 30% of the screen
  const sheet = canvas.clientWidth < 1000;
  const pitch = pitch0 - (sheet ? Math.atan(0.4 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) : 0);
  camTween = { admire: true, t0: performance.now() + 700, dur: 2500, from: { pos: camera.position.clone(), yaw: view.yaw, pitch: view.pitch }, to: { pos: new THREE.Vector3(x, y, z), yaw, pitch } };
  setTimeout(() => { $('end').hidden = false; }, 3400);
}
// camera moves: walking to the next wall, and the admire shot at the end of a job
let camTween = null;
function travelTo(k) {
  const [x, z, yaw, pitch] = job.sections[k].camera;
  camTween = { t0: performance.now() + 500, dur: 1400, from: { pos: camera.position.clone(), yaw: view.yaw, pitch: view.pitch }, to: { pos: new THREE.Vector3(x, 1.62, z), yaw, pitch } };
}
function stepTween(now) {
  const tw = camTween, k = Math.max(0, Math.min(1, (now - tw.t0) / tw.dur)), e = k * k * (3 - 2 * k);
  camera.position.lerpVectors(tw.from.pos, tw.to.pos, e);
  view.yaw = tw.from.yaw + angleDiff(tw.to.yaw, tw.from.yaw) * e;
  view.pitch = tw.from.pitch + (tw.to.pitch - tw.from.pitch) * e;
  if (tw.admire) rig.position.y = -0.4 * e; // lower the hands out of view
  else if (k >= 1) camTween = null;
}
function begin(i) {
  audioInit();
  camTween = null; rig.position.y = 0; $('hud').hidden = false; fastForward = false;
  selected = i; setupJob(i);
  $('start').hidden = true; $('end').hidden = true;
  playing = true;
  if (!matchMedia('(pointer: coarse)').matches) {
    const p = canvas.requestPointerLock?.();
    if (p && p.catch) p.catch(() => { lockFailed = true; });
  }
  $('lockHint').hidden = true;
  toast(job.brief);
  if (game.state.robot.on && !told.has('robot')) setTimeout(() => fact('robot'), 8000);
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
// where along the current brick a screen point (NDC) lies: 0 = start end, 1 = far end.
// Measured on screen along the brick's projected top edge, so it matches what the player aimed at
// from any angle (a padded hitbox surface would bias it towards the end nearest the camera, L23).
function alongBrick(ndc) {
  const sl = game.slots[game.state.cur];
  if (!sl) return 0.5;
  const h = sl.len / 2, y = slotY(sl) + BH;
  const p0 = new THREE.Vector3(sl.x - (sl.rot ? 0 : h), y, sl.z - (sl.rot ? h : 0)).project(camera);
  const p1 = new THREE.Vector3(sl.x + (sl.rot ? 0 : h), y, sl.z + (sl.rot ? h : 0)).project(camera);
  const a = camera.aspect, dx = (p1.x - p0.x) * a, dy = p1.y - p0.y, qx = (ndc.x - p0.x) * a, qy = ndc.y - p0.y;
  return Math.max(0, Math.min(1, (qx * dx + qy * dy) / (dx * dx + dy * dy || 1)));
}
// the brick being levelled as a screen rectangle (px)
function brickRect(sl) {
  const W = canvas.clientWidth, H = canvas.clientHeight, xs = [], ys = [];
  for (const u of [-1, 1]) for (const v of [0, 1]) for (const w of [-1, 1]) {
    const p = new THREE.Vector3(sl.x + (sl.rot ? w * BD / 2 : u * sl.len / 2), slotY(sl) + v * BH, sl.z + (sl.rot ? u * sl.len / 2 : w * BD / 2)).project(camera);
    xs.push((p.x + 1) / 2 * W); ys.push((1 - p.y) / 2 * H);
  }
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
// keep the level gauge beside the brick, never on it: right if there's room, else left, else below
function placeGauge() {
  const sl = game.slots[game.state.cur], g = $('gauge');
  if (!sl || g.hidden) return;
  const r = brickRect(sl), W = canvas.clientWidth, H = canvas.clientHeight, gw = g.offsetWidth, gh = g.offsetHeight, m = 18;
  let x = r.x1 + m, y = (r.y0 + r.y1) / 2 - gh / 2;
  if (x + gw > W - 8) x = r.x0 - m - gw;
  if (x < 8) {
    x = Math.min(W - gw - 8, Math.max(8, (r.x0 + r.x1) / 2 - gw / 2));
    y = r.y1 + m;
    if (y + gh > H - 8) y = r.y0 - m - gh;
  }
  g.style.left = `${Math.round(x)}px`;
  g.style.top = `${Math.round(Math.max(8, Math.min(H - gh - 8, y)))}px`;
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
  if (e.pointerType === 'touch' && !touchMode) { touchMode = true; updateHUD(); }
  if (!locked) try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
  const ndc = locked ? center : ndcOf(e), hit = targetAt(ndc);
  down = { t: performance.now(), x: e.clientX, y: e.clientY, target: hit && hit.act, u: alongBrick(ndc), dragged: false };
});
canvas.addEventListener('pointermove', e => {
  if (!playing) return;
  if (locked) { look(e.movementX * 0.0022, e.movementY * 0.0022); return; }
  if (down && (down.dragged || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8)) {
    if (!down.dragged) { down.dragged = true; down.lx = e.clientX; down.ly = e.clientY; }
    lastDrag = performance.now();
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
  if (e.code === 'KeyH') doHandOver();
  if (e.code === 'KeyF') toggleFast();
});
addEventListener('keyup', e => keys.delete(e.code));

addEventListener('blur', () => keys.clear());
$('mute').onclick = () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; };
$('handBtn').onclick = doHandOver;
function toggleFast() { fastForward = !fastForward; updateHUD(); }
$('ffBtn').onclick = toggleFast;
// touch screens: a tool belt instead of turning round to the tub and pallet, and a camera that keeps
// the brick you're working on in view (unless you dragged the view in the last 2 s)
let touchMode = matchMedia('(pointer: coarse)').matches, lastDrag = -1e9;
$('belt').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) { if (b.dataset.act === 'sound') { muted = !muted; b.textContent = muted ? 'Sound off' : 'Sound'; } else act(b.dataset.act, 0); } });
function followBrick(dt) {
  const s = game.state, sl = s.cur === null ? null : game.slots[s.cur];
  if (!sl || camTween || performance.now() - lastDrag < 2000) return;
  const p = new THREE.Vector3(sl.x, slotY(sl) + BH / 2, sl.z).project(camera);
  if (Math.abs(p.x) < 0.6 && p.z < 1) return;
  const want = Math.atan2(-(sl.x - camera.position.x), -(sl.z - camera.position.z));
  view.yaw += angleDiff(want, view.yaw) * Math.min(1, dt * 3);
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), side = new THREE.Vector3();
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), now = performance.now();
  if (playing) {
    gameClock.speed = fastForward && game.nextAction(gameClock.t) === 'watch' ? 4 : 1;
    gameClock.t += dt * gameClock.speed;
  }
  const t = gameClock.t;
  if (playing && touchMode) followBrick(dt);
  if (playing) {
    let mx = 0, mz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
    if ((mx || mz) && !camTween) {
      fwd.set(-Math.sin(view.yaw), 0, -Math.cos(view.yaw));
      side.set(Math.cos(view.yaw), 0, -Math.sin(view.yaw));
      camera.position.addScaledVector(fwd, mz * 1.6 * dt).addScaledVector(side, mx * 1.6 * dt);
      const [x0, x1, z0, z1] = job.bounds;
      camera.position.x = Math.max(x0, Math.min(x1, camera.position.x));
      camera.position.z = Math.max(z0, Math.min(z1, camera.position.z));
    }
    const bob = (mx || mz) ? Math.sin(now / 140) * 0.012 : Math.sin(now / 900) * 0.003;
    if (!camTween) camera.position.y = 1.62 + bob;
    for (const ev of game.tick(t)) handle(ev, t);
    if (game.nextAction(t) !== lastAction) updateHUD();
    updateMortar(t);
  }
  if (camTween) stepTween(now);
  stepRobot(t);
  shake *= 0.85;
  camera.rotation.set(view.pitch + (Math.random() - 0.5) * shake, view.yaw + (Math.random() - 0.5) * shake, 0);
  armPose('R', armR, now); armPose('L', armL, now);
  for (let i = anims.length - 1; i >= 0; i--) if (now - anims[i].t0 > anims[i].dur) anims.splice(i, 1);

  // fresh mortar is dark and wet; it pales as it stiffens
  for (const b of beds.values()) {
    const k = Math.min(1, (t - b.at) / game.open);
    if (b.k !== k) { b.k = k; b.mesh.material.color.copy(WET).lerp(DRY, k); }
  }
  for (const L of lineSets) { L.y += (L.target - L.y) * Math.min(1, dt * 5); L.group.position.y = L.y; }
  ghostFill.opacity = 0.18 + 0.12 * Math.sin(now / 300);

  if (playing) {
    const hit = locked ? targetAt(center) : null, tgt = hit && hit.act;
    let [label, ok] = tgt ? labelFor(tgt) : ['', false];
    if (tgt === 'brick') label = `Tap the ${endName(alongBrick(center))} · hold to knock`;
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
  if (game.state.setting) placeGauge(); // after render: camera matrices are current
  requestAnimationFrame(frame);
}

setupJob(selected);
renderStart();
resize();
$('startBtn').disabled = false;
requestAnimationFrame(frame);
// console hook for play-testing: __bbb.act('tub'), __bbb.game.state …
window.__bbb = {
  act, handOver: doHandOver, camMoving: () => !!camTween && !camTween.admire, toggleFast, clock: gameClock, get game() { return game; }, setupJob, begin, get save() { return save; }, camera, scene, view, renderer,
  look: (yaw, pitch) => { view.yaw = yaw; view.pitch = pitch; },
  // measurements for the automated acceptance run (qa/acceptance.mjs), in CSS px
  qa: {
    brickRect: () => brickRect(game.slots[game.state.cur]),
    slotCenter() { const r = brickRect(game.slots[game.state.cur]); return [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2]; },
    wallCenter() {
      const c = game.slots.reduce((a, s) => a.add(new THREE.Vector3(s.x, slotY(s) + BH / 2, s.z)), new THREE.Vector3()).divideScalar(game.slots.length).project(camera);
      return [(c.x + 1) / 2 * canvas.clientWidth, (1 - c.y) / 2 * canvas.clientHeight];
    },
  },
  // freeze the current 3D frame into an <img>: screenshot tools can miss a live WebGL canvas
  shot() {
    renderer.render(scene, camera);
    let img = $('dbgShot');
    if (!img) { img = document.createElement('img'); img.id = 'dbgShot'; img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; $('app').insertBefore(img, $('hud')); }
    img.src = canvas.toDataURL('image/jpeg', 0.85);
  },
  unshot() { $('dbgShot')?.remove(); },
};
