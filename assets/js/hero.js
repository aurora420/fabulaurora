// The hero diorama: a four-tier "cake" of Jeah's workplaces, loaded from assets/models/diorama.glb.
//
// The whole cake sits on a slow turntable. Four labels on the right point at the floors with leader lines;
// a label, its ring on the model, or the floor itself glides the camera in until that one floor fills the
// stage, and closing glides back out. The page owns the labels, rings and the card — this file only moves
// the camera, pins the rings and lines to the model and reports what was clicked.
//
// Names it looks for in the .glb (see /3d). All optional, but a floor without its tier cannot be zoomed into:
//   Room_art · Room_bio · Room_med · Room_xr   parents of each floor's props (hover + click)
//   Tier_Art · Tier_Bio · Tier_Med · Tier_XR   the four platforms (they frame each floor's close-up)
//   Anchor_*   empties the rings are pinned to
//   Glow_*     empties with custom properties color / power / reach, turned into soft point lights
// Any animation saved in the .glb plays on a loop.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const DRACO = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const rad = THREE.MathUtils.degToRad;

/** The four floors, top to bottom: the nodes each is made of, and the angle it reads best from.
 *  `rise` is the floor's height above its platform; `pad` widens the framed box left/right (the art
 *  floor keeps its balloons); `pin` moves the ring off its anchor, in model metres. */
export const FLOORS = [
  { id: 'anatomy', room: 'Room_art', tier: 'Tier_Art', anchor: 'Anchor_art', az: 22, el: 9, rise: 3.2, pad: [0.4, 1.2] },
  { id: 'biology', room: 'Room_bio', tier: 'Tier_Bio', anchor: 'Anchor_bio', az: 16, el: 8, rise: 3.0, pad: [0.3, 0.3] },
  { id: 'medical', room: 'Room_med', tier: 'Tier_Med', anchor: 'Anchor_med', az: 20, el: 8, rise: 3.0, pad: [0.4, 0.3] },
  { id: 'xr', room: 'Room_xr', tier: 'Tier_XR', anchor: 'Anchor_xr', az: 30, el: 10, rise: 3.1, pad: [1.0, 0.3] },
];
const ROOM_IDS = Object.fromEntries(FLOORS.map((f) => [f.room, f.id]));

const VIEW = {
  az: 28,            // resting angle: a little from the right, so the wall scenes show
  el: 14,
  fov: 21,
  sway: 9,           // degrees either side while idle
  swayPeriod: 20,    // seconds
  azMin: -46, azMax: 82,
  elMin: 4, elMax: 30,
};

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/**
 * @param callouts  the layer holding the <svg> for leader lines, one `.marker[data-floor]` ring and one
 *                  `.callout[data-floor]` label per floor
 * @param framing   (mode, W, H) → { cx, cy, w, h, labelX? }: where on the canvas (fractions) the whole cake
 *                  ('overview') or the open floor ('floor') should sit, and for the overview the x of the
 *                  label column. The page knows where its copy and card are.
 */
export async function mountHero({ hero, stage, callouts, stageColor = '#221f2e', onPick, framing }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => stage.clientWidth < 760;
  const frameFor = (mode) => framing?.(mode, W, H) || (mode === 'floor' ? { cx: 0.62, cy: 0.5, w: 0.5, h: 0.72 } : { cx: 0.5, cy: 0.5, w: 0.9, h: 0.84 });

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  stage.append(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(stageColor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const camera = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.5, 200);
  const turntable = new THREE.Group();
  scene.add(turntable);

  // studio lights: fixed to the room, the model turns beneath them
  scene.add(new THREE.HemisphereLight(0xe8e4ff, 0x40385c, 0.62));
  const key = new THREE.DirectionalLight(0xfff1df, 2.15);
  key.position.set(7, 13, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbfd0ff, 0.5);
  fill.position.set(-10, 6, 6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd3ea, 0.45);
  rim.position.set(3, 8, -10);
  scene.add(rim);

  // load
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO);
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(hero.dataset.model || 'assets/models/diorama.glb');
  const model = gltf.scene;

  // If the file was exported with Blender's own lights, camera or the preview floor, leave them out:
  // the page brings its own lighting.
  const extras = [];
  model.traverse((o) => { if (o.isLight || o.isCamera || /^Stage_Floor/.test(o.name)) extras.push(o); });
  extras.forEach((o) => o.removeFromParent());

  const pickable = [];
  model.traverse((o) => {
    if (o.name.startsWith('Glow_')) {
      const u = o.userData || {};
      const light = new THREE.PointLight(new THREE.Color(u.color || '#ffffff'), (u.power ?? 2) * 1.5, u.reach ?? 4, 2);
      o.add(light);
    }
    if (o.isMesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const glassy = mats.some((m) => m.transparent || m.opacity < 1);
      const glowing = mats.some((m) => m.emissiveIntensity > 1 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.3);
      o.castShadow = !glassy && !glowing;
      o.receiveShadow = !glassy;
      mats.forEach((m) => { if (m.transparent) m.depthWrite = false; });
      pickable.push(o);
    }
  });
  turntable.add(model);
  model.updateMatrixWorld(true);

  // Everything below is measured while the model still sits at the origin, so the numbers are model-local
  // and stay valid once it is shifted onto the turntable axis.
  const box = new THREE.Box3().setFromObject(model);
  const cornersAll = [];                                     // every mesh's own box: a much tighter outline than one big box
  pickable.forEach((m) => {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) cornersAll.push(new THREE.Vector3(x, y, z).applyMatrix4(m.matrixWorld));
  });
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const pivot = new THREE.Vector3(centre.x * 0.7, 0, centre.z * 0.7);   // between the tower's axis and the middle of everything
  const axisTarget = new THREE.Vector3(pivot.x, centre.y, pivot.z);     // on the turntable axis, so the overview never drifts sideways

  const floors = FLOORS.map((f) => {
    const tier = model.getObjectByName(f.tier);
    if (!tier) return null;
    const b = new THREE.Box3().setFromObject(tier);
    const [pl, pr] = f.pad || [0.3, 0.3];
    const fb = new THREE.Box3(
      new THREE.Vector3(b.min.x - pl, b.min.y - 0.1, b.min.z - 0.2),
      new THREE.Vector3(b.max.x + pr, b.max.y + f.rise, b.max.z + 0.3),
    );
    const corners = [];
    for (const x of [fb.min.x, fb.max.x]) for (const y of [fb.min.y, fb.max.y]) for (const z of [fb.min.z, fb.max.z]) corners.push(new THREE.Vector3(x, y, z));
    const anchor = model.getObjectByName(f.anchor);
    const pin = anchor ? anchor.getWorldPosition(new THREE.Vector3()) : fb.getCenter(new THREE.Vector3());
    if (f.pin) pin.add(new THREE.Vector3(...f.pin));
    return { ...f, pin, corners, centre: fb.getCenter(new THREE.Vector3()), x: 0, y: 0, behind: false };
  }).filter(Boolean);

  model.position.set(-pivot.x, -box.min.y, -pivot.z);
  model.updateMatrixWorld(true);

  // floor: a pool of light and the key light's shadow
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(15, 64),
    new THREE.MeshBasicMaterial({ map: radial('rgba(126,116,170,0.26)', 'rgba(126,116,170,0)'), transparent: true, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.002;
  scene.add(pool);
  const catcher = new THREE.Mesh(new THREE.CircleGeometry(15, 48), new THREE.ShadowMaterial({ opacity: 0.38 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.004;
  catcher.receiveShadow = true;
  scene.add(catcher);

  const sc = key.shadow.camera;
  const reach = Math.max(size.x, size.y, size.z) * 0.85;
  sc.left = -reach; sc.right = reach; sc.top = reach; sc.bottom = -reach; sc.near = 1; sc.far = 50;
  key.target.position.set(0, size.y * 0.47, 0);
  sc.updateProjectionMatrix();

  // animation saved in the file
  const mixer = new THREE.AnimationMixer(model);
  gltf.animations.forEach((clip) => mixer.clipAction(clip).play());

  // post: a little bloom on anything that emits light (skipped on small or modest devices)
  let composer = null;
  const wantBloom = !small() && (navigator.hardwareConcurrency || 4) > 4;
  if (wantBloom) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.5, 1.0));
    composer.addPass(new OutputPass());
  } else {
    // without the post pass the backdrop is not tone-mapped, so set the colour that pass would have produced
    scene.background.set('#0b0420');
  }

  /* ── camera ──
     The camera always stands on the +z side; turning is done by the turntable. A view is
     { az, el, dist, target (model-local), ox, oy (a sideways shift of the picture, in pixels) }. */
  const state = { az: VIEW.az, el: VIEW.el, dist: 30, target: axisTarget.clone(), ox: 0, oy: 0, vAz: 0, dragging: false, lastTouch: -1e9, t0: performance.now() };
  let W = 1, H = 1;
  let home = null;        // the resting view of the current mode
  let floor = null;       // the open floor, or null for the whole cake
  let tween = null;
  let labelX = 0;         // the label column, from the page's framing
  const tmp = new THREE.Vector3();
  const tw = new THREE.Vector3();

  function placeCamera(p = state) {
    turntable.rotation.y = -rad(p.az);
    turntable.updateMatrixWorld(true);
    model.localToWorld(tw.copy(p.target));
    const e = rad(p.el);
    camera.position.set(tw.x, tw.y + Math.sin(e) * p.dist, tw.z + Math.cos(e) * p.dist);
    camera.lookAt(tw);
    camera.updateMatrixWorld(true);
    if (p.ox || p.oy) camera.setViewOffset(W, H, p.ox, p.oy, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function extent(corners) {                             // projected bounds of some model-local points, as fractions of the canvas
    let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
    for (const c of corners) {
      tmp.copy(c);
      model.localToWorld(tmp);
      tmp.project(camera);
      x0 = Math.min(x0, tmp.x); x1 = Math.max(x1, tmp.x); y0 = Math.min(y0, tmp.y); y1 = Math.max(y1, tmp.y);
    }
    return { w: (x1 - x0) / 2, h: (y1 - y0) / 2, cx: (x0 + x1) / 4 + 0.5, cy: 0.5 - (y0 + y1) / 4 };
  }

  // The distance at which `corners` just fill `frame` when seen from az/el, and the shift that puts them there.
  function fit(corners, target, az, el, frame) {
    const p = { az, el, dist: 30, target, ox: 0, oy: 0 };
    let lo = 2, hi = 180;
    for (let i = 0; i < 24; i++) {
      p.dist = (lo + hi) / 2;
      placeCamera(p);
      const ex = extent(corners);
      if (ex.w > frame.w || ex.h > frame.h) lo = p.dist; else hi = p.dist;
    }
    p.dist = hi;
    placeCamera(p);
    const ex = extent(corners);
    p.ox = (ex.cx - frame.cx) * W;
    p.oy = (ex.cy - frame.cy) * H;
    return p;
  }
  function overview() {
    const frame = frameFor('overview');
    labelX = frame.labelX ?? 0;
    return fit(cornersAll, axisTarget, VIEW.az, VIEW.el, frame);
  }
  const floorView = (f) => fit(f.corners, f.centre, f.az, f.el, frameFor('floor'));

  const snap = () => ({ az: state.az, el: state.el, dist: state.dist, target: state.target.clone(), ox: state.ox, oy: state.oy });
  function applyView(p) { state.az = p.az; state.el = p.el; state.dist = p.dist; state.target.copy(p.target); state.ox = p.ox; state.oy = p.oy; }
  function glide(to, dur) {
    state.vAz = 0;
    if (reduce || dur <= 0) { applyView(to); tween = null; }
    else tween = { from: snap(), to, t0: performance.now(), dur };
    state.lastTouch = performance.now();
    dirty = true;
  }

  function layout(still) {                                // `still` = { w, h } renders a centred frame of that size (poster)
    W = still?.w ?? stage.clientWidth; H = still?.h ?? stage.clientHeight;
    if (!W || !H) return;
    const area = W * H;
    const dpr = still ? 1 : Math.min(devicePixelRatio || 1, small() ? 1.75 : 2, Math.sqrt(3.4e6 / area));
    renderer.setPixelRatio(Math.max(1, dpr));
    renderer.setSize(W, H, false);
    composer?.setPixelRatio(Math.max(1, dpr));
    composer?.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (still) { applyView(fit(cornersAll, axisTarget, VIEW.az, VIEW.el, { cx: 0.5, cy: 0.5, w: 0.92, h: 0.92 })); return; }
    const rest = overview();                              // the labels always sit beside the resting view, whatever is open
    placeCamera(rest);
    placeLabels();
    home = floor ? floorView(floor) : rest;
    if (tween) tween.to = home;
    else { state.dist = home.dist; state.ox = home.ox; state.oy = home.oy; state.target.copy(home.target); }
    dirty = true;
  }

  /* ── rings, labels and the lines between them ── */
  const rings = new Map();
  const labels = new Map();
  callouts?.querySelectorAll('.marker[data-floor]').forEach((el) => rings.set(el.dataset.floor, el));
  callouts?.querySelectorAll('.callout[data-floor]').forEach((el) => labels.set(el.dataset.floor, { el, y: 0, line: null }));
  const svg = callouts?.querySelector('svg');
  if (svg) {
    labels.forEach((l) => {
      l.line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      svg.append(l.line);
    });
  }
  const labelsShown = () => {
    const first = labels.values().next().value;
    return !!first && !!labelX && getComputedStyle(first.el).display !== 'none';
  };

  function projectPin(f) {                                // where a floor's ring falls on the canvas, for the camera as placed now
    model.localToWorld(tmp.copy(f.pin)).project(camera);
    f.x = (tmp.x * 0.5 + 0.5) * W;
    f.y = (-tmp.y * 0.5 + 0.5) * H;
    f.behind = tmp.z > 1;
  }

  function placeLabels() {                                // the label column: one label per floor, in floor order, never overlapping
    if (!labelsShown()) return;
    const list = floors.filter((f) => labels.has(f.id)).map((f) => { projectPin(f); return { id: f.id, y: f.y }; }).sort((a, b) => a.y - b.y);
    const gap = 78, top = 110, bottom = H - 96;
    list.forEach((l, i) => { l.y = Math.max(top + i * gap, Math.min(l.y, bottom - (list.length - 1 - i) * gap)); });
    for (let i = 1; i < list.length; i++) if (list[i].y - list[i - 1].y < gap) list[i].y = list[i - 1].y + gap;
    for (let i = list.length - 2; i >= 0; i--) if (list[i + 1].y - list[i].y < gap) list[i].y = list[i + 1].y - gap;
    list.forEach((l) => {
      const lab = labels.get(l.id);
      lab.y = l.y;
      lab.el.style.left = `${labelX}px`;
      lab.el.style.top = `${l.y}px`;
    });
  }

  function drawPins() {
    const lines = labelsShown() && !floor;
    floors.forEach((f) => {
      projectPin(f);
      const ring = rings.get(f.id);
      if (ring) {
        const off = f.behind || f.x < 16 || f.x > W - 16 || f.y < 88 || f.y > H - 16;   // off the canvas, or under the header
        ring.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px)`;
        ring.classList.toggle('is-off', off);
      }
      const lab = labels.get(f.id);
      if (lab?.line && lines) lab.line.setAttribute('points', `${labelX - 8},${lab.y} ${labelX - 30},${lab.y} ${f.x.toFixed(1)},${f.y.toFixed(1)}`);
    });
  }

  /* ── turning it by hand ── */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null, hot = null, moved = 0;

  function roomAt(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickable, false)[0];
    for (let o = hit?.object; o; o = o.parent) if (ROOM_IDS[o.name]) return ROOM_IDS[o.name];
    return null;
  }
  function setHot(id) {
    if (id === hot) return;
    hot = id;
    canvas.classList.toggle('is-hot', !!id);
    rings.forEach((el, k) => el.classList.toggle('is-hot', k === id));
    labels.forEach((l, k) => l.el.classList.toggle('is-hot', k === id));
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (tween) return;                                      // let a glide finish
    down = { x: e.clientX, y: e.clientY, az: state.az, el: state.el, id: e.pointerId, type: e.pointerType };
    moved = 0;
    state.vAz = 0;
    state.lastTouch = performance.now();
  });
  addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    if (!state.dragging && Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) {
      state.dragging = true;
      canvas.classList.add('is-dragging');
      try { canvas.setPointerCapture(down.id); } catch (err) { /* fine */ }
    }
    if (state.dragging) {
      const gain = floor ? 0.18 : 0.28;                     // a close-up turns more gently
      const next = THREE.MathUtils.clamp(down.az - dx * gain, VIEW.azMin, VIEW.azMax);
      state.vAz = next - state.az;
      state.az = next;
      if (down.type === 'mouse') state.el = THREE.MathUtils.clamp(down.el + dy * 0.1, VIEW.elMin, VIEW.elMax);
      state.lastTouch = performance.now();
      dirty = true;
    }
  }, { passive: true });
  const release = (e) => {
    if (!down || (e.pointerId !== undefined && e.pointerId !== down.id)) return;
    const wasDrag = state.dragging;
    down = null;
    state.dragging = false;
    canvas.classList.remove('is-dragging');
    state.lastTouch = performance.now();
    if (!wasDrag && moved < 6 && e.type === 'pointerup') {
      const id = roomAt(e);
      if (id) onPick?.(id);
    }
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  canvas.addEventListener('pointermove', (e) => {
    if (down || e.pointerType !== 'mouse') return;
    setHot(roomAt(e));
  });
  canvas.addEventListener('pointerleave', () => setHot(null));
  const hoverable = [...rings.entries(), ...[...labels.entries()].map(([id, l]) => [id, l.el])];
  hoverable.forEach(([id, el]) => {
    el.addEventListener('pointerenter', () => setHot(id));
    el.addEventListener('pointerleave', () => setHot(null));
    el.addEventListener('focus', () => setHot(id));
    el.addEventListener('blur', () => setHot(null));
  });

  /* ── loop ── */
  let visible = true, dirty = true, last = performance.now();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.02 }).observe(hero);
  new ResizeObserver(() => { layout(); }).observe(stage);

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    if (tween) {
      const k = ease(Math.min(1, (now - tween.t0) / tween.dur));
      const a = tween.from, b = tween.to;
      const daz = ((b.az - a.az + 540) % 360) - 180;        // the short way round
      state.az = a.az + daz * k;
      state.el = a.el + (b.el - a.el) * k;
      state.dist = a.dist + (b.dist - a.dist) * k;
      state.ox = a.ox + (b.ox - a.ox) * k;
      state.oy = a.oy + (b.oy - a.oy) * k;
      state.target.lerpVectors(a.target, b.target, k);
      if (k >= 1) tween = null;
      dirty = true;
    } else if (!state.dragging && home) {
      const idle = now - state.lastTouch;
      if (Math.abs(state.vAz) > 0.01) {                         // coast after a flick
        state.az = THREE.MathUtils.clamp(state.az + state.vAz, VIEW.azMin, VIEW.azMax);
        state.vAz *= 0.92;
        dirty = true;
      } else if (!reduce && idle > (floor ? 4000 : 2600)) {    // drift home, then (in the overview) sway
        const sway = floor ? 0 : Math.sin(((now - state.t0) / 1000) * (Math.PI * 2 / VIEW.swayPeriod)) * VIEW.sway;
        const k = 1 - Math.exp(-dt * 1.4);
        state.az += (home.az + sway - state.az) * k;
        state.el += (home.el - state.el) * k;
        dirty = true;
      }
    }
    if (!reduce) { mixer.update(dt); dirty = true; }
    if (!dirty) return;
    dirty = false;
    placeCamera();
    if (composer) composer.render(dt); else renderer.render(scene, camera);
    drawPins();
  }

  // Tone mapping shifts the dark backdrop a little, so read the colour the canvas really shows
  // and hand it to the page: the section behind the canvas then matches it exactly.
  function matchBackdrop() {
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    gl.readPixels(2, gl.drawingBufferHeight - 3, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    if (px[3]) hero.style.setProperty('--case', `rgb(${px[0]}, ${px[1]}, ${px[2]})`);
  }

  function draw() {
    placeCamera();
    if (composer) composer.render(); else renderer.render(scene, camera);
    drawPins();
  }

  layout();
  applyView(home);
  renderer.compile(scene, camera);
  draw();
  matchBackdrop();
  renderer.setAnimationLoop(tick);
  hero.classList.add('is-ready');

  return {
    canvas,
    floors: floors.map((f) => f.id),
    current: () => floor?.id ?? null,
    relayout: () => layout(),
    /** Glide in until one floor fills the stage. Returns false if the model has no such floor. */
    open(id, { instant = false } = {}) {
      const f = floors.find((x) => x.id === id);
      if (!f) return false;
      floor = f;
      home = floorView(f);
      glide(home, instant ? 0 : 1250);
      return true;
    },
    /** Glide back out to the whole cake. */
    close({ instant = false } = {}) {
      if (!floor) return;
      floor = null;
      home = overview();
      glide(home, instant ? 0 : 950);
    },
    setAngle: (az, el = VIEW.el) => { state.az = az; state.el = el; state.lastTouch = performance.now(); dirty = true; },
    frame: () => {                                          // draw one frame now, with any glide finished (also works in a background tab)
      if (tween) { applyView(tween.to); tween = null; }
      draw();
      return canvas.toDataURL('image/jpeg', 0.92);
    },
    snapshot: (w = 1200, h = 1400, type = 'image/png', quality) => {   // a centred still of the resting view, used to make the poster image
      const keep = snap();
      const keepFloor = floor;
      floor = null;
      layout({ w, h });
      draw();
      const url = canvas.toDataURL(type, quality);
      floor = keepFloor;
      layout();
      applyView(keep);
      dirty = true;
      return url;
    },
    stats: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, bloom: !!composer, floor: floor?.id ?? null, view: snap() }),
  };
}

function radial(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.55, inner.replace(/[\d.]+\)$/, '0.12)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
