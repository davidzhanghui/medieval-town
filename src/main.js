import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TEX from './textures.js';
import * as POP from './population.js';
import * as VIL from './village.js';
import * as NATURE from './nature.js';
import { REALM_NAMES } from './realms_data.js';
import { WORLD_R, SEA, ROADS, smoothPath, seaDepth } from './world.js';
import { createMinimap } from './minimap.js';
import * as EXP from './expansion.js';
import * as KIT from './kit.js';
import { createAmbience } from './ambience.js';
import { buildMaterials } from './materials.js';
import { buildLighting } from './lighting.js';
import { buildGround } from './terrain.js';
import { buildGeom, buildCastle } from './castle.js';
import { buildSettlements } from './settlements.js';
import { buildEastbank } from './eastbank.js';
import { buildDressing } from './dressing.js';
import { createPicking } from './picking.js';
import { batchStatic } from './batching.js';
import { buildEnrichment } from './enrich.js';

/* ============================================================
 *  基础环境
 * ========================================================== */
const __marks = [];
const mark = (n) => __marks.push([n, Math.round(performance.now())]);
mark('main开始(模块已加载)');
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const IS_SMALL = window.innerWidth < 780;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// 阴影图不再每帧重画：场景绝大多数物体是静止的，只在日夜过渡 / 每隔几帧
// （让走动的人和船的影子跟上）时置 needsUpdate，省下约 3/4 的阴影 pass。
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
let shadowFrame = 0;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc4d6e6, 560, 2800);

// 世界扩到 r≈2500 以后，远平面要跟着推；近平面抬到 1.0，免得 24 位深度在千米外把贴地的路面和草地打架
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1.0, 7600);

/* 竖屏 / 窄屏时按宽高比把相机整体推远，保证城堡完整入画
 * 注意：面板折叠 / 标签页隐藏时 innerHeight 可能是 0，直接除会得到 NaN，
 * 相机会被写到 NaN 上，整个场景就渲染不出来。这里必须兜底。 */
function homeFrame() {
  const w = window.innerWidth || 0;
  const h = window.innerHeight || 0;
  const aspect = h > 0 ? w / h : 0;
  const k = !isFinite(aspect) || aspect <= 0
    ? 1
    : (aspect >= 1.3 ? 1 : Math.min(1.95, Math.pow(1.3 / aspect, 0.85)));
  return {
    pos: [78 * k, 58 * k, 92 * k],
    target: [0, 10, 0],
  };
}
const HOME = homeFrame();
camera.position.set(...HOME.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 18;
controls.maxDistance = 3600;
controls.maxPolarAngle = Math.PI * 0.495;
controls.autoRotateSpeed = 0.45;
controls.update();

/* 场景装配。顺序和拆分前一致：材质、城堡组、天空、地面，然后才是建筑。 */
const keepWindows = [];
const { pickables, interactiveRoots, registerInteractive, setHighlight } = createPicking({ keepWindows });

const mats = buildMaterials({ renderer, scene });
mark('材质');
const geom = buildGeom({ scene });
mark('几何');
const lighting = buildLighting({ renderer, IS_SMALL, scene, camera, controls, ...mats });
mark('光照');
const ground = buildGround({ scene, ...mats });
mark('地面');
const castle = buildCastle({ scene, registerInteractive, keepWindows, ...mats, ...geom });
mark('城堡');
const settled = buildSettlements({ scene, registerInteractive, keepWindows, ...mats, ...geom, ...castle });
mark('聚落');
const east = buildEastbank({ scene, registerInteractive, ...mats, ...geom, ...ground, ...castle, ...settled });
mark('东岸');
const dressing = buildDressing({ scene, registerInteractive, ...mats, ...geom, ...castle, ...settled });
mark('装饰');

const {
  waterTx,
  glowTx,
  cloudTx,
  envDay,
  envNight,
  TM,
  NM,
  box,
  skyUniforms,
  sky,
  hemi,
  sun,
  sunDir,
  updateShadowRig,
  fill,
  nightAmbient,
  stars,
  moon,
  MOON_OFFSET,
  moonDisc,
  RIVER_PTS,
  clouds,
  flags,
  keep,
  gateGroup,
  portcullis,
  gateDoors,
  well,
  huts,
  torchFlames,
  torchLights,
  flameBodies,
  windmills,
  waterWheels,
  stalls,
  bellRopes,
  BELL_POS,
  BELFREY_GLOW,
  ANVIL_POS,
  lampHaloes,
  people,
  addPerson,
  boats,
  village,
  GRASS_Y,
  farmsteads,
  chimneys,
  sheep,
  chickens,
  fortress,
  tat,
  townPlaza,
  craftSpot,
  priory,
  tourney,
  inn,
  OUTSKIRTS,
  riverBoats,
  FALLS,
  WILDLIFE,
  town2,
  town2Plaza,
  town2Houses,
  bridgeW,
  bridgeE,
  festival,
  festivalPad,
  FEST,
  forgeSparks,
} = { ...mats, ...geom, ...lighting, ...ground, ...castle, ...settled, ...east, ...dressing };

/* ============================================================
 *  外环十镇：灯塔港、铁砧矿镇、酒乡、古橡镇、羊毛染坊镇、
 *  云顶修道院、沼泽水乡、雪岭长屋、学者镇、商队集市
 *  装配、剔除与动画都在 expansion.js，这里只负责把需要的东西递进去。
 * ========================================================== */
const _bootT0 = performance.now();
const EXPANSION = EXP.buildExpansion({
  scene, camera, controls, TM, GRASS_Y, registerInteractive, addPerson,
  lampHaloes, torchLights, glowTx, VIL, POP, nature: NATURE, NM,
  tex: { waterTx, cloudTx },
});

mark('外环十镇');
console.info(`[boot] 外环十镇装配耗时 ${(performance.now() - _bootT0).toFixed(0)} ms`);

/* ---- 老王国的热闹化：更多民居、小物件、树木、牲畜与行人（见 enrich.js） ---- */
buildEnrichment({
  scene, TM, GRASS_Y, addPerson, sheep, chickens, chimneys,
  exclude: [EXPANSION.world, sky, stars, moon, moonDisc, ...clouds, ...people.map((p) => p.root)],
});
mark('热闹化');

/* ---- 屋顶炊烟 ---- */
const smokePuffs = [];
{
  const smokeMat = new THREE.SpriteMaterial({
    map: glowTx, color: 0xdad2c2, transparent: true, opacity: 0.16,
    depthWrite: false, blending: THREE.NormalBlending, toneMapped: false,
  });
  const smokeTex = TEX.cloudTexture();
  smokeMat.map = smokeTex;

  for (const ch of chimneys) {
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(smokeMat.clone());
      sp.position.set(ch.x, ch.y, ch.z);
      const sc = 1.4 + Math.random() * 1.2;
      sp.scale.setScalar(sc);
      sp.userData.baseScale = sc;
      sp.userData.offset = i / 5;
      sp.userData.chimney = ch;
      village.add(sp);
      smokePuffs.push(sp);
    }
  }
}

/* ---- 环境生命、旧区的鸟群、水轮的水花 ---- */
const AMBIENCE = createAmbience({ scene, camera, controls, isWater: (x, z) => seaDepth(x, z) > -10 });
const OLD_FX = [];     // 旧区的粒子：{ e, x, z }，镜头离得远就不更新
{
  scene.updateMatrixWorld(true);
  const bx = new THREE.Box3();
  const sz = new THREE.Vector3();
  const ct = new THREE.Vector3();
  for (const w of waterWheels) {
    bx.setFromObject(w.wheel);
    bx.getSize(sz);
    bx.getCenter(ct);
    const e = KIT.createEmitter(camera, {
      x: ct.x, y: bx.min.y + 0.35, z: ct.z, count: 22, life: 0.9, size: 0.16, color: 0xdfeef7, opacity: 0.85,
      spread: [Math.max(0.5, sz.x * 0.3), 0.05, Math.max(0.5, sz.z * 0.3)], vel: [0, 1.5, 0], jitter: [0.5, 0.6, 0.5], gravity: 6, fadeIn: 0.04,
    });
    scene.add(e.pts);
    OLD_FX.push({ e, x: ct.x, z: ct.z });
  }
  const flock = (opt) => { const f = NATURE.makeBirdFlock(NM, opt); scene.add(f.group); WILDLIFE.push(f); };
  flock({ count: 9, center: [0, -8], radius: 26, height: 38, color: 0xe8e4da, scale: 0.8 });       // 主楼上空的鸽子
  flock({ count: 8, center: [-118, 132], radius: 32, height: 30, color: 0xf0ece2, scale: 0.8 });   // 镇中心教堂
  flock({ count: 8, center: [-88, -52], radius: 28, height: 26, color: 0xf2eee6, scale: 0.75 });   // 修道院
  flock({ count: 6, center: [-176, 258], radius: 14, height: 12, color: 0x1a1a1e, scale: 1.3 });   // 绞架上的乌鸦
  flock({ count: 5, center: [34, 178], radius: 30, height: 26, color: 0x202024, scale: 1.2 });     // 要塞上空的乌鸦
  flock({ count: 7, center: [34, 456], radius: 38, height: 22, color: 0xf0ece2, scale: 1.2 });     // 渡口镇的河鸥
}

/* ============================================================
 *  交互：拾取 / 相机飞行 / 状态
 * ========================================================== */
const raycaster = new THREE.Raycaster();
function isShown(o) {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}
const pointer = new THREE.Vector2();
let hovered = null;
let selected = null;

const tooltip = document.getElementById('tooltip');
const panel = document.getElementById('panel');
const panelTitle = document.getElementById('panel-title');
const panelTag = document.getElementById('panel-tag');
const panelDesc = document.getElementById('panel-desc');
const panelDetail = document.getElementById('panel-detail');

const camTween = {
  active: false,
  t: 0,
  dur: 1.5,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromTarget: new THREE.Vector3(),
  toTarget: new THREE.Vector3(),
};

function flyTo(pos, target, dur = null) {
  // 飞行时间随距离拉长：近处 1.5 秒，横跨整个世界约 5 秒
  const d = Math.hypot(pos[0] - camera.position.x, pos[2] - camera.position.z);
  camTween.active = true;
  camTween.t = 0;
  camTween.dur = dur ?? THREE.MathUtils.clamp(1.2 + d / 600, 1.5, 5.5);
  camTween.fromPos.copy(camera.position);
  camTween.toPos.set(...pos);
  camTween.fromTarget.copy(controls.target);
  camTween.toTarget.set(...target);
  controls.enabled = false;
}

function openPanel(info) {
  panelTitle.textContent = info.name;
  panelTag.textContent = info.tag;
  panelDesc.textContent = info.desc;
  panelDetail.textContent = info.detail || '';
  panel.classList.add('show');
}

function closePanel() {
  panel.classList.remove('show');
  if (selected) {
    setHighlight(selected, false);
    selected = null;
  }
}

function onPointerMove(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  // Raycaster 不看 visible：被距离剔除的远处建筑也会被射中，要自己滤掉
  const hit = hits.find((h) => isShown(h.object));
  const root = hit ? hit.object.userData.root : null;

  if (root !== hovered) {
    if (hovered && hovered !== selected) setHighlight(hovered, false);
    hovered = root;
    if (hovered) {
      setHighlight(hovered, true);
      tooltip.textContent = hovered.userData.info.name;
      tooltip.classList.add('show');
    } else {
      tooltip.classList.remove('show');
    }
    renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
  }

  if (hovered) {
    tooltip.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
  }
}

function onClick(e) {
  if (!hovered) {
    closePanel();
    return;
  }
  if (selected && selected !== hovered) setHighlight(selected, false);
  selected = hovered;
  setHighlight(selected, true);
  openPanel(selected.userData.info);
  const v = selected.userData.info.view;
  if (v) flyTo(v.pos, v.target);
}

renderer.domElement.addEventListener('pointermove', onPointerMove);

// 记录按下位置，避免拖拽旋转视角时误触发点击
let dragStart = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragStart = { x: e.clientX, y: e.clientY, time: performance.now() };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dragStart) return;
  const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
  const dt = performance.now() - dragStart.time;
  dragStart = null;
  if (moved < 6 && dt < 700) {
    onPointerMove(e); // 用抬起位置重新拾取，避免与移动事件错帧
    onClick(e);
  }
});

/* ============================================================
 *  UI 控件
 * ========================================================== */
const state = {
  night: false,
  dayFactor: 0, // 0 = 白天, 1 = 夜晚
  targetNight: 0,
  gatesOpen: false,
  gateAmount: 0,
  autoRotate: false,
  festival: true,  // 集日：摊位开张、彩旗挂起
  bellT: 0,        // 钟声的余韵计时
  chimeT: 0,       // 距离下次整点钟声
};

const btnNight = document.getElementById('btn-night');
const btnRotate = document.getElementById('btn-rotate');
const btnGate = document.getElementById('btn-gate');
const btnReset = document.getElementById('btn-reset');

btnNight.addEventListener('click', () => {
  state.night = !state.night;
  state.targetNight = state.night ? 1 : 0;
  btnNight.classList.toggle('active', state.night);
  btnNight.querySelector('span').textContent = state.night ? '白昼' : '夜晚';
});

btnRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  controls.autoRotate = state.autoRotate;
  btnRotate.classList.toggle('active', state.autoRotate);
});

btnGate.addEventListener('click', () => {
  state.gatesOpen = !state.gatesOpen;
  btnGate.classList.toggle('active', state.gatesOpen);
  btnGate.querySelector('span').textContent = state.gatesOpen ? '落下闸门' : '升起闸门';
});

btnReset.addEventListener('click', () => {
  closePanel();
  const h = homeFrame();
  flyTo(h.pos, h.target, 1.6);
});

/* ---- 集日开关 ---- */
const btnFest = document.getElementById('btn-festival');
if (btnFest) {
  btnFest.addEventListener('click', () => {
    state.festival = !state.festival;
    btnFest.classList.toggle('active', state.festival);
    btnFest.querySelector('span').textContent = state.festival ? '收起集市' : '开办集市';
    ringBell(3);
  });
  btnFest.querySelector('span').textContent = state.festival ? '收起集市' : '开办集市';
  btnFest.classList.toggle('active', state.festival);
}

// 窗口尺寸变化时，只有在近似初始视角时才重新构图
window.addEventListener('resize', () => {
  if (camera.position.distanceTo(new THREE.Vector3(...HOME.pos)) < 6) {
    const next = homeFrame();
    HOME.pos = next.pos;
    camera.position.set(...next.pos);
    controls.target.set(...next.target);
  }
});

document.getElementById('panel-close').addEventListener('click', closePanel);

// 点击面板内部不触发场景拾取
['pointerdown', 'pointerup', 'pointermove'].forEach((ev) =>
  panel.addEventListener(ev, (e) => e.stopPropagation())
);
document.getElementById('go-there').addEventListener('click', () => {
  if (selected && selected.userData.info.view) {
    const v = selected.userData.info.view;
    flyTo(v.pos, v.target);
  }
});

// 底部地标快捷导航
const SPOTS = {
  keep: keep,
  gate: gateGroup,
  tower: interactiveRoots.find((r) => r.userData.towerName === '西北角塔'),
  well: well,
  hut: huts,
  village: farmsteads,
  town: townPlaza,
  festival: festivalPad,
  craft: craftSpot,
  tourney: tourney,
  priory: priory,
  inn: inn,
  fort: fortress,

  // 十五处外围场景
  ...OUTSKIRTS,

  // 外环十镇：每镇一个总览入口 + 若干地标
  ...EXPANSION.spots,

  // 河东：渡口镇、两座桥、山水
  town2: town2Plaza,
  town2houses: town2Houses,
  bridgeW: bridgeW,
  bridgeE: bridgeE,
};

function gotoSpot(root) {
  if (!root) return;
  if (selected && selected !== root) setHighlight(selected, false);
  hovered = root;
  selected = root;
  setHighlight(root, true);
  openPanel(root.userData.info);
  const v = root.userData.info.view;
  if (v) flyTo(v.pos, v.target);
}

/* ---- 底部导航按王国组织 ----
 * 第一行是王国。老王国展开后是城堡一带的地标，外围与远方十镇再套一层。
 * 其余王国展开后是十处村镇，点进某一处再换成它的地标。
 */
const REALM_KEYS = new Set(Object.keys(REALM_NAMES));
const NESTED_UNDER_HOME = new Set(['towns', 'priory', 'tourney', 'inn']);
const HOME_SPOTS = [
  ['keep', '主楼'], ['gate', '城门楼'], ['tower', '角塔'], ['well', '水井'], ['hut', '庭院'],
  ['village', '村落'], ['town', '镇中心'], ['festival', '集日'], ['craft', '工匠区'],
  ['tourney', '比武场'], ['priory', '修道院'], ['inn', '客栈'], ['fort', '前哨'],
  ['town2', '渡口镇'], ['bridgeW', '西桥'], ['bridgeE', '东桥'],
];
const HOME_GROUPS = [
  ['towns', '远方十镇'],
  ['priory', '修道院周边'],
  ['tourney', '比武场周边'],
  ['inn', '客栈周边'],
];
// 每组十项：前五项是第一圈，后五项是第二圈
const SUB_GROUPS = {
  priory: [
    ['holywell', '圣泉'], ['tithebarn', '谷仓'], ['almshouse', '济贫院'],
    ['masons', '石匠场'], ['hermitage', '隐士居'],
    ['graveyard2', '墓地'], ['abbeymill', '磨坊'], ['sheepfold', '羊圈'],
    ['apiary', '蜂场'], ['ruinchapel', '废教堂'],
  ],
  tourney: [
    ['training', '校场'], ['horsefair', '马市'], ['tourneyfair', '场外集市'],
    ['armorer', '甲胄匠'], ['surgeon', '伤兵帐'],
    ['pasture', '牧马场'], ['archery', '箭术场'], ['timberyard', '木料场'],
    ['saddlery', '马具匠'], ['manor', '骑士宅'],
  ],
  inn: [
    ['ferry', '渡口'], ['shrine', '神龛'], ['campfire', '营地'],
    ['waystation', '货栈'], ['hamlet', '荒村'],
    ['toll', '关卡'], ['watchtower', '瞭望塔'], ['hospital', '病舍'],
    ['millercottage', '水磨人家'], ['gallow', '绞架'],
  ],
};
SUB_GROUPS.towns = EXPANSION.towns.filter((t) => !t.kingdom).map((t) => [`town:${t.key}`, t.name]);

function kingdomLabel(k) {
  if (k === 'home') return '老王国';
  if (k === 'sol') return '琥珀王国';
  return `${REALM_NAMES[k]}国`;
}

const spotsMain = document.getElementById('spots-main');
const spotsSub = document.getElementById('spots-sub');
let openGroup = null;

const KINGDOM_BUTTONS = [
  ['home', '老王国'],
  ...Object.keys(REALM_NAMES).map((k) => [k, kingdomLabel(k)]),
];
for (const [key, label] of KINGDOM_BUTTONS) {
  const b = document.createElement('button');
  b.className = 'spot spot-group';
  b.dataset.group = key;
  b.textContent = `${label} ▾`;
  b.addEventListener('click', () => showGroup(openGroup === key ? null : key));
  spotsMain.appendChild(b);
}

function makeChip(label, handler, className = 'spot') {
  const b = document.createElement('button');
  b.className = className;
  b.textContent = label;
  b.addEventListener('click', handler);
  spotsSub.appendChild(b);
  return b;
}

function paintKingdom() {
  const active = openGroup === 'home' || NESTED_UNDER_HOME.has(openGroup) ? 'home'
    : (REALM_KEYS.has(openGroup) ? openGroup : null);
  for (const b of spotsMain.querySelectorAll('.spot-group')) {
    b.classList.toggle('on', b.dataset.group === active);
  }
}

/** 点进某个镇之后：左边返回王国（或十镇），接着是镇名与它的地标 */
function showTown(townKey) {
  const t = EXPANSION.towns.find((x) => x.key === townKey);
  if (!t) return;
  openGroup = t.kingdom || 'towns';
  paintKingdom();
  spotsSub.innerHTML = '';
  if (t.kingdom) makeChip(`‹ ${kingdomLabel(t.kingdom)}`, () => showGroup(t.kingdom));
  else makeChip('‹ 十镇', () => showGroup('towns'));
  makeChip(t.name, () => gotoSpot(SPOTS[`town:${t.key}`]), 'spot on');
  for (const lm of t.landmarks) makeChip(lm.name, () => gotoSpot(SPOTS[lm.key]));
  spotsSub.hidden = false;
}

function showGroup(key) {
  if (!key) {
    spotsSub.hidden = true;
    spotsSub.innerHTML = '';
    openGroup = null;
    paintKingdom();
    return;
  }
  openGroup = key;
  paintKingdom();
  spotsSub.innerHTML = '';
  if (key === 'home') {
    for (const [id, label] of HOME_SPOTS) makeChip(label, () => gotoSpot(SPOTS[id]));
    const sep = document.createElement('span');
    sep.className = 'spot-sep';
    spotsSub.appendChild(sep);
    for (const [id, label] of HOME_GROUPS) makeChip(`${label} ▾`, () => showGroup(id), 'spot spot-nest');
  } else if (REALM_KEYS.has(key)) {
    for (const t of EXPANSION.towns.filter((x) => x.kingdom === key)) {
      makeChip(t.name, () => { gotoSpot(SPOTS[`town:${t.key}`]); showTown(t.key); });
    }
  } else {
    makeChip('‹ 老王国', () => showGroup('home'));
    for (const [id, label] of SUB_GROUPS[key]) {
      makeChip(label, () => {
        gotoSpot(SPOTS[id]);
        if (key === 'towns') showTown(id.slice(5));
      });
    }
  }
  spotsSub.hidden = false;
}

showGroup('home');

/* ============================================================
 *  小地图：点地标飞过去，点空地飞到那一带的高空
 * ========================================================== */
const MINIMAP = createMinimap({
  canvas: document.getElementById('minimap-canvas'),
  tipEl: document.getElementById('mm-tip'),
  worldR: WORLD_R,
  sea: SEA,
  river: RIVER_PTS,
  roads: ROADS,
  smoothPath,
  towns: EXPANSION.towns,
  places: [
    { key: 'keep', name: '城堡', x: 0, z: 0 }, { key: 'village', name: '村落', x: -22, z: 100 },
    { key: 'town', name: '镇中心', x: -118, z: 130 }, { key: 'craft', name: '工匠区', x: 96, z: 22 },
    { key: 'tourney', name: '比武场', x: 28, z: -112 }, { key: 'priory', name: '修道院', x: -88, z: -52 },
    { key: 'inn', name: '客栈', x: -132, z: 18 }, { key: 'fort', name: '前哨', x: 34, z: 178 },
    { key: 'town2', name: '渡口镇', x: 34, z: 476 },
  ],
  camera,
  controls,
  onPick(pick) {
    if (pick.type === 'town') {
      gotoSpot(SPOTS[`town:${pick.key}`]);
      showTown(pick.key);
    } else if (pick.type === 'place') {
      gotoSpot(SPOTS[pick.key]);
      showGroup('home');
    } else {
      flyTo([pick.x + 120, 170, pick.z + 170], [pick.x, 0, pick.z]);
    }
  },
});
{
  const btn = document.getElementById('btn-map');
  const box = document.getElementById('minimap');
  btn.addEventListener('click', () => {
    box.classList.toggle('hidden');
    btn.classList.toggle('active', !box.classList.contains('hidden'));
  });
}

/* ============================================================
 *  昼夜参数
 * ========================================================== */
const DAY = {
  skyTop: new THREE.Color(0x2c66ad),
  skyBottom: new THREE.Color(0xa9c9e6),
  fog: new THREE.Color(0xc4d6e6),
  hemiSky: new THREE.Color(0xbfd8ef),
  hemiGround: new THREE.Color(0x4a5038),
  hemiIntensity: 1.15,
  sunColor: new THREE.Color(0xfff0d0),
  sunIntensity: 2.6,
  sunPos: new THREE.Vector3(70, 100, 55),
  fillIntensity: 0.35,
  exposure: 1.0,
};
const NIGHT = {
  skyTop: new THREE.Color(0x050a1c),
  skyBottom: new THREE.Color(0x1b2a45),
  fog: new THREE.Color(0x0e1729),
  hemiSky: new THREE.Color(0x5c77ad),
  hemiGround: new THREE.Color(0x1a2133),
  hemiIntensity: 2.6,
  sunColor: new THREE.Color(0xb9ccff),
  sunIntensity: 3.2,
  sunPos: new THREE.Vector3(-70, 85, -45),
  fillIntensity: 0.55,
  exposure: 1.22,
};

let envIsNight = false;
const tmpColor = new THREE.Color();
const tmpVec = new THREE.Vector3();

/* ============================================================
 *  钟声：整点敲三下，钟体摆动，钟楼顶端泛起一圈暖光
 *  （没有音频，用视觉表达"整点报时"）
 * ========================================================== */
const bellGlows = [];
for (let i = 0; i < 4; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx, color: 0xffcf88, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  s.scale.setScalar(6);
  s.visible = false;
  scene.add(s);
  bellGlows.push(s);
}

let bellHaloT = 0;

function ringBell(times = 3) {
  state.bellT = Math.max(state.bellT, times * 1.15);
  for (const b of bellRopes) b.amt = 1;
  bellHaloT = Math.max(bellHaloT, times * 1.15);
  if (BELL_POS.lengthSq() > 0) {
    for (let i = 0; i < bellGlows.length; i++) {
      if (BELFREY_GLOW[i]) bellGlows[i].position.copy(BELFREY_GLOW[i]);
      else bellGlows[i].position.copy(BELL_POS);
    }
  }
  const clock = document.getElementById('clock');
  if (clock) {
    clock.classList.add('ringing');
    clearTimeout(ringBell._t);
    ringBell._t = setTimeout(() => clock.classList.remove('ringing'), 1400);
  }
}

function applyTimeOfDay(f) {
  skyUniforms.uTop.value.copy(DAY.skyTop).lerp(NIGHT.skyTop, f);
  skyUniforms.uBottom.value.copy(DAY.skyBottom).lerp(NIGHT.skyBottom, f);
  scene.fog.color.copy(DAY.fog).lerp(NIGHT.fog, f);
  // 雾只作用于陆地远景，不让它吞掉天空
  // 雾的远近跟着翻倍的场地一起推：白天 380→1250，夜里收得更近一些好看
  scene.fog.near = THREE.MathUtils.lerp(560, 280, f);
  scene.fog.far = THREE.MathUtils.lerp(2800, 1500, f);
  renderer.setClearColor(scene.fog.color);

  hemi.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, f);
  hemi.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, f);
  hemi.intensity = THREE.MathUtils.lerp(DAY.hemiIntensity, NIGHT.hemiIntensity, f);

  sun.color.copy(DAY.sunColor).lerp(NIGHT.sunColor, f);
  sun.intensity = THREE.MathUtils.lerp(DAY.sunIntensity, NIGHT.sunIntensity, f);
  // 光的方向随昼夜变；阴影盒跟着相机走，位置由 updateShadowRig 统一摆
  sunDir.copy(DAY.sunPos).lerp(NIGHT.sunPos, f).normalize();
  updateShadowRig(true);
  fill.intensity = THREE.MathUtils.lerp(DAY.fillIntensity, NIGHT.fillIntensity, f);

  renderer.toneMappingExposure = THREE.MathUtils.lerp(DAY.exposure, NIGHT.exposure, f);

  const useNightEnv = f > 0.55;
  if (useNightEnv !== envIsNight) {
    envIsNight = useNightEnv;
    scene.environment = useNightEnv ? envNight : envDay;
  }
  scene.environmentIntensity = THREE.MathUtils.lerp(0.65, 0.28, f);

  stars.material.opacity = f;
  nightAmbient.intensity = f * 0.9;
  moon.material.opacity = f * 0.9;
  moonDisc.material.opacity = f;
  for (const c of clouds) {
    c.material.color.setRGB(1, 1, 1).lerp(new THREE.Color(0x33415e), f);
    c.material.opacity = THREE.MathUtils.lerp(c.userData.baseOpacity ?? 0.6, 0.16, f);
  }
  keepWindows.forEach((m) => (m.emissiveIntensity = f * 2.6));
  lampHaloes.forEach((s) => (s.material.opacity = f * 0.55));

  // userData.gain 用来给个别灯（比如广场路灯）压低亮度，默认 1
  torchLights.forEach((l) => {
    const gain = l.userData.gain ?? 1;
    l.userData.baseIntensity = THREE.MathUtils.lerp(0.0, 60, f) * gain;
    l.distance = THREE.MathUtils.lerp(16, 42, f) * (l.userData.rangeGain ?? 1);
  });
}

/* ============================================================
 *  昼夜作息：镇上的居民到点收摊回家，天亮再回来
 * ========================================================== */
const ROUTINE = {
  homeAt: 0.62,   // dayFactor 超过这个值就收摊往家走
  outAt: 0.32,    // 低于这个值就出门
  walkSpeed: 0.72,
};

function updateRoutine(dt) {
  const f = state.dayFactor;
  const homeT = ROUTINE.homeAt;
  const outT = ROUTINE.outAt;

  for (const p of people) {
    if (!p.home) continue;

    // 懒汉：酒客要等到更晚才走
    const leaveAt = p.lateNight ? homeT + 0.14 : homeT;

    if (p.sched === 'out' && f > leaveAt) p.sched = 'toHome';
    else if (p.sched === 'in' && f < outT) p.sched = 'toWork';
    else if (p.sched === 'toHome' && f < outT) p.sched = 'toWork';

    let tx = null;
    let tz = null;
    let face = 0;

    if (p.sched === 'toHome') {
      tx = p.home.x; tz = p.home.z; face = p.home.face;
    } else if (p.sched === 'toWork') {
      tx = p.work.x; tz = p.work.z; face = p.work.face;
    }

    if (tx === null) {
      // 停在原地：在家就淡出，在外就正常
      p.presence = p.sched === 'in' ? Math.max(0, p.presence - dt * 2.2) : 1;
      if (p.sched === 'in' && p.presence <= 0) p.root.visible = false;
      else p.root.visible = !p.far;
      continue;
    }

    const dx = tx - p.root.position.x;
    const dz = tz - p.root.position.z;
    const d = Math.hypot(dx, dz);

    if (d < 0.35) {
      p.root.position.x = tx;
      p.root.position.z = tz;
      p.facingY = face;
      if (p.sched === 'toHome') {
        p.sched = 'in';
        // 到家就不再绕圈；出门时再还原
        if (p.activity && p.activity.walk) p.activity.walk = null;
      } else {
        p.sched = 'out';
        if (p.activity0) p.activity = p.activity0;
      }
      continue;
    }

    const step = Math.min(d, ROUTINE.walkSpeed * dt);
    p.root.position.x += (dx / d) * step;
    p.root.position.z += (dz / d) * step;
    const want = Math.atan2(dx, dz);
    let diff = want - p.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.root.rotation.y += diff * Math.min(1, dt * 5);

    // 赶路时腿要动起来
    const swing = Math.sin(elapsed * 8 + p.phase) * 0.52;
    p.legL.rotation.x = swing;
    p.legR.rotation.x = -swing;
    p.armL.rotation.x = -swing * 0.5;
    p.body.position.y = Math.abs(Math.sin(elapsed * 8 + p.phase)) * 0.05;
  }
}

/* ============================================================
 *  集市：摊位昼夜开合 + 节庆道具淡入
 * ========================================================== */
function updateFestival(dt) {
  const f = state.dayFactor;

  // 集日：摊位天亮开张、天黑收摊；但彩旗、五月柱、火盆这些节庆陈设
  // 一直留到节庆结束——傍晚点起火盆才是集市最好看的时候
  const wantOpen = state.festival && f < 0.55 ? 1 : 0;
  const festWant = state.festival ? 1 : 0;

  FEST.amount += Math.sign(festWant - FEST.amount) * Math.min(Math.abs(festWant - FEST.amount), dt * 0.7);
  const A = FEST.amount;
  festival.visible = A > 0.004;

  // 所有淡入的材质跟着 A 走；透明材质一定要 invisible 才能真的"消失"，
  // 只把 opacity 归零的话，depthWrite 还会在夜里留下一道暗痕
  const wantTransparent = A < 0.995;
  for (const m of FEST.fadeMats) {
    m.opacity = A;
    m.depthWrite = A > 0.5;
    // transparent 一变就要重编着色器，所以只在真的翻转时打 needsUpdate
    if (m.transparent !== wantTransparent) {
      m.transparent = wantTransparent;
      m.needsUpdate = true;
    }
  }

  // 摊位：布篷卷起 / 放下，货品与苫布交接
  for (const s of stalls) {
    const k = THREE.MathUtils.clamp(wantOpen > s.open ? s.open + dt * 0.9 : s.open - dt * 0.55, 0, 1);
    s.open = k;

    if (s.pivot) {
      // 收摊时布篷卷到后梁上；收到差不多的程度就整片收掉，
      // 免得剩一条几乎侧对镜头的窄布，在阴影里成了一道黑杠
      s.pivot.rotation.x = -(1 - k) * 1.15;
      const show = k > 0.72;
      if (s.cloth) {
        s.cloth.visible = show;
        s.cloth.scale.y = 0.35 + k * 0.65;
      }
      if (s.flap) s.flap.visible = show;
    }
    if (s.goods) s.goods.visible = k > 0.42;
    if (s.cover) {
      const c = 1 - k;
      s.cover.scale.set(1, c, 1);
      s.cover.visible = c > 0.02;
    }
  }

  // 五月柱的彩带慢慢转
  if (FEST.ribbons && A > 0.01) FEST.ribbons.rotation.y = elapsed * 0.22;

  // 火盆：集日期间一直点着，天黑以后烧得更旺；收市才熄
  const brazierFire = A * (0.35 + 0.65 * f);
  for (const b of FEST.braziers) {
    b.fire.material.opacity = brazierFire * 0.95;
    b.fire.visible = brazierFire > 0.02;
    b.light.intensity = brazierFire * 34;
  }

  // 驴车：沿大路从村口赶到广场南侧，然后停稳卸货
  const cart = FEST.cart;
  if (cart) {
    // 从东口的花环拱门底下进来，卸在广场东南角
    const CART_PATH = [
      tat(26, 2.4), tat(20, 2.0), tat(16, 1.6), tat(13.6, 1.2),
    ];
    FEST.cartT = THREE.MathUtils.clamp(FEST.cartT + dt * (state.festival ? 0.022 : -0.05), 0, 1);
    const t = THREE.MathUtils.clamp(FEST.cartT, 0, 1);

    // 分段插值
    const segs = CART_PATH.length - 1;
    const g = Math.min(segs - 1, Math.floor(t * segs));
    const lt = t * segs - g;
    const a = CART_PATH[g];
    const b = CART_PATH[g + 1];
    const x = THREE.MathUtils.lerp(a.x, b.x, lt);
    const z = THREE.MathUtils.lerp(a.z, b.z, lt);
    cart.position.set(x, GRASS_Y, z);

    const moving = t < 0.995;
    // 车头朝 +X，所以模型朝向比路线方向少转 90°
    const heading = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
    cart.rotation.y = heading;

    // 车轮与驴腿
    const spin = moving ? elapsed * 3.4 : 0;
    for (const w of cart.userData.wheels) w.rotation.x = spin;
    const legs = cart.userData.legs;
    for (let i = 0; i < legs.length; i++) {
      legs[i].rotation.x = moving ? Math.sin(elapsed * 6 + i * Math.PI * 0.5) * 0.42 : 0;
    }
    if (cart.userData.donkey) {
      cart.userData.donkey.position.y = moving
        ? Math.abs(Math.sin(elapsed * 6)) * 0.045
        : Math.sin(elapsed * 1.2) * 0.008;
    }
  }
}

/* ============================================================
 *  钟声：整点报时
 * ========================================================== */
const clockEl = document.getElementById('clock');
const handHour = clockEl ? clockEl.querySelector('.hand-hour') : null;
const handMin = clockEl ? clockEl.querySelector('.hand-min') : null;
let clockHour = 7;   // 从早上 7 点开始

function updateBell(dt) {
  state.chimeT += dt;
  // 场景里的"一小时"压缩成 40 秒
  if (state.chimeT > 40) {
    state.chimeT = 0;
    clockHour = (clockHour + 1) % 12;
    ringBell(state.festival ? 4 : 3);
  }

  // 挂钟的两根针
  if (handHour && handMin) {
    const minutes = clockHour * 60 + (state.chimeT / 40) * 60;
    handMin.style.transform = `rotate(${(minutes % 60) * 6}deg)`;
    handHour.style.transform = `rotate(${(minutes / 60 % 12) * 30}deg)`;
  }

  if (state.bellT > 0) state.bellT = Math.max(0, state.bellT - dt);

  // 钟体摆动：三下，每下 1.15 秒
  const swingPhase = (3 * 1.15 - state.bellT) * 2.6;
  const decay = state.bellT > 0 ? Math.min(1, state.bellT / 0.6) : 0;
  for (const b of bellRopes) {
    b.pivot.rotation.x = Math.sin(swingPhase) * 0.26 * decay;
  }

  // 钟室四面的暖光
  if (bellHaloT > 0) {
    bellHaloT = Math.max(0, bellHaloT - dt);
    const k = Math.min(1, bellHaloT / 1.2);
    for (const g of bellGlows) {
      g.material.opacity = k * 0.62;
      g.visible = k > 0.01;
      g.scale.setScalar(6 + (1 - k) * 3);
    }
  } else {
    for (const g of bellGlows) g.visible = false;
  }
}

/* ============================================================
 *  打铁火星
 * ========================================================== */
function updateForgeSparks(dt) {
  // 铁匠天黑就回家了，火星只在白天蹦
  const active = state.dayFactor < 0.5;
  FEST.sparkTimer -= dt;
  if (active && FEST.sparkTimer <= 0 && ANVIL_POS.lengthSq() > 0) {
    FEST.sparkTimer = 0.55 + Math.random() * 0.5;
    const n = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const s = forgeSparks[(FEST.sparkCursor = (FEST.sparkCursor + 1) % forgeSparks.length)];
      s.life = 0.5 + Math.random() * 0.4;
      s.maxLife = s.life;
      s.sprite.position.copy(ANVIL_POS);
      s.sprite.position.y += 0.06;
      s.sprite.material.opacity = 1;
      s.sprite.visible = true;
      s.vel.set(
        (Math.random() - 0.5) * 2.4,
        1.4 + Math.random() * 1.9,
        (Math.random() - 0.5) * 2.4
      );
    }
  }

  for (const s of forgeSparks) {
    if (s.life <= 0) continue;
    s.life -= dt;
    if (s.life <= 0) {
      s.sprite.visible = false;
      s.sprite.material.opacity = 0;
      continue;
    }
    s.vel.y -= 7.5 * dt;
    s.sprite.position.addScaledVector(s.vel, dt);
    const k = s.life / s.maxLife;
    s.sprite.material.opacity = k * k;
    s.sprite.material.color.setHex(k > 0.55 ? 0xffd27a : 0xff7a2e);
  }
}

/* ============================================================
 *  点光源池
 *
 *  全场有六十多盏火把、街灯与火盆。每盏都要进所有材质的逐像素光照
 *  循环，全开着帧率直接掉到个位数。这里改成"只留离镜头最近的一批"：
 *  被隐藏的灯不进光照列表，远处的灯本来就照不到跟前，看不出来。
 *  可见数量固定，材质不会因为灯数变化而重新编译。
 * ========================================================== */
const LIGHT_POOL = IS_SMALL ? 14 : 24;
const _lw = new THREE.Vector3();
let lightPoolTimer = 0;

function updateLightPool() {
  if (!torchLights.length) return;
  const cam = camera.position;
  const scored = [];
  for (const l of torchLights) {
    l.getWorldPosition(_lw);
    scored.push([_lw.distanceToSquared(cam), l]);
  }
  scored.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < scored.length; i++) scored[i][1].visible = i < LIGHT_POOL;
}

/* ============================================================
 *  渲染循环
 * ========================================================== */
const clock = new THREE.Clock();
let elapsed = 0;
let flagTick = 0;
let cullTick = 0;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ---- 动态分辨率：持续掉帧就降一档像素比（1.5 → 1.25 → 1.0），一分钟后再试着升回去 ----
 * 屏幕大（4K / 视网膜）时填充率是瓶颈，场景里 CPU 才 5 毫秒，GPU 却要二十多毫秒；
 * 降像素比比削特效划算得多。 */
const ADAPT = {
  cap: Math.min(window.devicePixelRatio, 1.5), floor: 1.0, cur: Math.min(window.devicePixelRatio, 1.5),
  ema: 16.7, last: performance.now(), slow: 0, raiseAt: 0, warm: performance.now() + 8000,   // 开场八秒在编译着色器、铺场景，掉帧不算数
};
function adaptResolution(now) {
  const d = now - ADAPT.last;
  ADAPT.last = now;
  if (now < ADAPT.warm || d > 250 || document.hidden) { ADAPT.slow = 0; return; }       // 开场 / 切标签页 / 卡顿一下不算
  ADAPT.ema = ADAPT.ema * 0.93 + d * 0.07;
  ADAPT.slow = ADAPT.ema > 19 ? ADAPT.slow + d : 0;
  if (ADAPT.slow > 1800 && ADAPT.cur > ADAPT.floor) {
    ADAPT.cur = Math.max(ADAPT.floor, ADAPT.cur - 0.25);
    renderer.setPixelRatio(ADAPT.cur);
    ADAPT.ema = 16.7; ADAPT.slow = 0;
    ADAPT.raiseAt = now + 60000;
  } else if (now > ADAPT.raiseAt && ADAPT.cur < ADAPT.cap && ADAPT.ema < 18) {
    ADAPT.cur = Math.min(ADAPT.cap, ADAPT.cur + 0.25);
    renderer.setPixelRatio(ADAPT.cur);
    ADAPT.ema = 16.7; ADAPT.raiseAt = now + 60000;
  }
}

function animate() {
  requestAnimationFrame(animate);
  adaptResolution(performance.now());
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  step(dt);
  if (++shadowFrame % 6 === 0) renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
}

/** 一帧里所有"推进世界"的逻辑（不含渲染），静态批处理的探测也靠它把世界推到不同状态 */
function step(dt) {
  // 昼夜过渡
  if (Math.abs(state.dayFactor - state.targetNight) > 0.001) {
    state.dayFactor += Math.sign(state.targetNight - state.dayFactor) * dt * 0.8;
    state.dayFactor = THREE.MathUtils.clamp(state.dayFactor, 0, 1);
    applyTimeOfDay(state.dayFactor);
    renderer.shadowMap.needsUpdate = true;
  }

  // 相机飞行
  if (camTween.active) {
    camTween.t += dt / camTween.dur;
    const k = easeInOutCubic(Math.min(camTween.t, 1));
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, k);
    camera.lookAt(controls.target);
    if (camTween.t >= 1) {
      camTween.active = false;
      controls.enabled = true;
    }
  } else {
    controls.update();
  }

  // 阴影盒跟着注视点走（没动就什么都不做）
  updateShadowRig();

  // 天空、星空、月亮都跟着相机，世界再大也不会穿出天幕
  sky.position.copy(camera.position);
  stars.position.copy(camera.position);
  moon.position.copy(camera.position).add(MOON_OFFSET);
  moonDisc.position.copy(camera.position).addScaledVector(MOON_OFFSET, 0.94);

  // 点光源池：镜头移动后重新挑最近的十几盏，隔几帧算一次就够
  lightPoolTimer -= dt;
  if (lightPoolTimer <= 0) {
    lightPoolTimer = 0.25;
    updateLightPool();
  }

  // 闸门 / 吊桥
  const gateTarget = state.gatesOpen ? 1 : 0;
  if (Math.abs(state.gateAmount - gateTarget) > 0.001) {
    state.gateAmount += Math.sign(gateTarget - state.gateAmount) * dt * 0.7;
    state.gateAmount = THREE.MathUtils.clamp(state.gateAmount, 0, 1);
  }
  if (portcullis) portcullis.position.y = easeInOutCubic(state.gateAmount) * 7.6;
  gateDoors.forEach((p) => {
    p.rotation.y = THREE.MathUtils.lerp(p.userData.base, p.userData.base * 1.28, state.gateAmount);
  });

  // 旗帜（隔帧更新，减轻 CPU 负担）
  flagTick++;
  if (flagTick % 2 === 0)
  for (const f of flags) {
    const pos = f.geometry.attributes.position;
    const base = f.userData.base;
    const w = f.userData.width;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const k = Math.max(0, bx / w);
      const wave =
        Math.sin(elapsed * 4.2 - bx * 1.6 + by * 0.4) * 0.34 * k +
        Math.sin(elapsed * 2.1 - bx * 0.8) * 0.16 * k;
      pos.setZ(i, wave);
      pos.setY(i, by - k * k * 0.22);
    }
    pos.needsUpdate = true;
    f.geometry.computeVertexNormals();
  }

  // 火光闪烁
  for (const t of torchFlames) {
    const n = Math.sin(elapsed * 13 + t.seed) * 0.5 + Math.sin(elapsed * 23.7 + t.seed * 2) * 0.3;
    const s = 1 + n * 0.12;
    t.flame.scale.setScalar((t.flame.userData.baseScale || (t.flame.userData.baseScale = t.flame.scale.x)) * s);
    t.flame.material.opacity = 0.82 + n * 0.18;
    if (t.core) {
      t.core.scale.setScalar((t.core.userData.baseScale || (t.core.userData.baseScale = t.core.scale.x)) * (1 + n * 0.2));
    }
  }
  for (const b of flameBodies) {
    const n = Math.sin(elapsed * 9 + b.seed) * 0.5 + Math.sin(elapsed * 17.3 + b.seed * 3) * 0.5;
    b.mesh.scale.set(1 + n * 0.12, 1 + n * 0.22, 1 + n * 0.12);
    b.mesh.position.y = b.mesh.userData.baseY + n * 0.06;
    b.mesh.rotation.y = elapsed * 1.4 + b.seed;
  }

  for (const l of torchLights) {
    const base = l.userData.baseIntensity ?? 0;
    l.intensity = base * (0.86 + Math.sin(elapsed * 11 + l.id) * 0.09 + Math.sin(elapsed * 27 + l.id) * 0.07);
  }

  // 水面
  waterTx.map.offset.x = elapsed * 0.012;
  waterTx.map.offset.y = elapsed * 0.02;
  waterTx.bump.offset.x = -elapsed * 0.018;
  waterTx.bump.offset.y = elapsed * 0.008;

  // 风车帆 / 水轮
  for (const w of windmills) w.sails.rotation.z = elapsed * w.speed;
  for (const w of waterWheels) w.wheel.rotation.x = elapsed * w.speed;

  EXPANSION.update(dt, elapsed, state.dayFactor);
  AMBIENCE.update(dt, elapsed, state.dayFactor);
  for (const f of OLD_FX) {
    const dx = camera.position.x - f.x;
    const dz = camera.position.z - f.z;
    if (dx * dx + dz * dz < 450 * 450) f.e.update(dt, elapsed, state.dayFactor);
    else f.e.pts.visible = false;
  }
  MINIMAP.update(performance.now());
  if ((cullTick++ & 3) === 0) updateDistanceCull();

  updateRoutine(dt);
  updateFestival(dt);
  updateBell(dt);
  updateForgeSparks(dt);

  // 云
  for (const c of clouds) {
    c.position.x += dt * 0.7;
    // 场地半径翻倍后，云的回绕边界也要跟着推到草地外面
    if (c.position.x > 3400) c.position.x = -3400;
  }

  // 人物：站立呼吸 / 巡逻行走（远方村镇被剔除时 p.skip=true，不必更新）
  for (const p of people) {
    if (p.skip) continue;
    if (p.lod) {
      // 只让走动的人沿路径移动，肢体保持原姿势
      if (p.activity && p.activity.walk && !(p.pause > 0)) {
        const w = p.activity.walk;
        const dist = Math.max(0.001, Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1]));
        p.walkT = THREE.MathUtils.clamp(p.walkT + (dt * w.speed * p.dir) / dist, 0, 1);
        if (p.walkT >= 1) { p.dir = -1; p.pause = 1.8; } else if (p.walkT <= 0) { p.dir = 1; p.pause = 1.8; }
        p.root.position.x = THREE.MathUtils.lerp(w.from[0], w.to[0], p.walkT);
        p.root.position.z = THREE.MathUtils.lerp(w.from[1], w.to[1], p.walkT);
        p.root.rotation.y = Math.atan2(w.to[0] - w.from[0], w.to[1] - w.from[1]) + (p.dir < 0 ? Math.PI : 0);
      } else if (p.pause > 0) p.pause -= dt;
      continue;
    }
    if (p.activity && p.activity.walk) {
      const w = p.activity.walk;
      const dist = Math.max(0.001, Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1]));
      const step = (dt * w.speed) / dist;

      if (p.pause > 0) {
        p.pause -= dt;
      } else {
        p.walkT += step * p.dir;
        if (p.walkT >= 1) {
          p.walkT = 1;
          p.dir = -1;
          p.pause = 1.8;
        } else if (p.walkT <= 0) {
          p.walkT = 0;
          p.dir = 1;
          p.pause = 1.8;
        }
      }

      const k = THREE.MathUtils.clamp(p.walkT, 0, 1);
      const x = THREE.MathUtils.lerp(w.from[0], w.to[0], k);
      const z = THREE.MathUtils.lerp(w.from[1], w.to[1], k);
      p.root.position.x = x;
      p.root.position.z = z;

      const dirSign = p.dir >= 0 ? 1 : -1;
      const targetAngle = Math.atan2(w.to[0] - w.from[0], w.to[1] - w.from[1]) + (dirSign < 0 ? Math.PI : 0);
      let diff = targetAngle - p.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.root.rotation.y += diff * Math.min(1, dt * 6);

      if (p.pause <= 0) {
        const swing = Math.sin(elapsed * 7 + p.phase) * 0.5;
        p.legL.rotation.x = swing;
        p.legR.rotation.x = -swing;
        p.armL.rotation.x = -swing * 0.6;
        p.armR.rotation.x = (p.weapon ? -0.25 : 0) + swing * 0.5;
        p.body.position.y = Math.abs(Math.sin(elapsed * 7 + p.phase)) * 0.045;
      } else {
        p.legL.rotation.x *= 0.9;
        p.legR.rotation.x *= 0.9;
        p.body.position.y = Math.sin(elapsed * 1.9 + p.phase) * 0.012;
      }
    } else {
      // 站立：轻微呼吸 + 偶尔调整重心
      const br = Math.sin(elapsed * 1.7 + p.phase);
      p.body.position.y = br * 0.014;
      p.body.rotation.z = Math.sin(elapsed * 0.9 + p.phase) * 0.012;
      p.root.rotation.y = p.facingY + Math.sin(elapsed * 0.55 + p.phase) * 0.05;
      if (p.weapon) p.armR.rotation.x = -0.25 + br * 0.02;
    }
  }

  // 小船：绕护城河缓慢航行
  for (const b of boats) {
    b.angle += dt * b.speed;
    const x = Math.cos(b.angle) * b.radius;
    const z = Math.sin(b.angle) * b.radius;
    const bob = Math.sin(elapsed * 1.25 + b.phase) * 0.075;
    b.mesh.position.set(x, b.baseY + bob, z);
    b.mesh.rotation.y = -b.angle + (b.speed > 0 ? Math.PI : 0);
    b.mesh.rotation.z = Math.sin(elapsed * 0.95 + b.phase) * 0.03;
    b.mesh.rotation.x = Math.sin(elapsed * 0.8 + b.phase * 1.7) * 0.022;

    // 划桨
    const oars = b.mesh.userData.oars;
    if (oars && oars.length) {
      for (let i = 0; i < oars.length; i++) {
        const sx = i === 0 ? -1 : 1;
        oars[i].rotation.x = Math.sin(elapsed * 1.5 + b.phase) * 0.28 - 0.15;
        oars[i].rotation.y = sx * (0.25 + Math.sin(elapsed * 0.75 + b.phase) * 0.12);
      }
    }
    const rower = b.mesh.userData.rower;
    if (rower) {
      rower.body.rotation.x = Math.sin(elapsed * 1.5 + b.phase) * 0.09 + 0.06;
      rower.armL.rotation.x = -1.1 + Math.sin(elapsed * 1.5 + b.phase) * 0.25;
      rower.armR.rotation.x = -1.1 + Math.sin(elapsed * 1.5 + b.phase + Math.PI) * 0.25;
    }

    // 灯笼随夜色点亮
    const lamp = b.mesh.userData.lantern;
    if (lamp) lamp.material.emissiveIntensity = state.dayFactor * 1.15;
    const lampLight = b.mesh.userData.lanternLight;
    if (lampLight) lampLight.intensity = state.dayFactor * 4.5;
  }

  // 河里拴着的渡船：随水起伏、轻轻横摇
  for (const b of riverBoats) {
    b.mesh.position.y = b.baseY + Math.sin(elapsed * 0.9 + b.phase) * 0.09;
    b.mesh.rotation.z = Math.sin(elapsed * 0.72 + b.phase) * 0.045;
    b.mesh.rotation.x = Math.sin(elapsed * 0.61 + b.phase * 1.4) * 0.03;
  }

  // 水鸟、鱼、虫：各自的 update 只动自己那一群
  for (const w of WILDLIFE) w.update(dt, elapsed, state.dayFactor);

  // 瀑布水雾：缓缓起伏
  if (FALLS && FALLS.userData.mist) {
    for (const m of FALLS.userData.mist) {
      const k = Math.sin(elapsed * 0.6 + m.userData.seed) * 0.5 + 0.5;
      m.position.y = m.userData.base + k * 1.6;
      m.material.opacity = 0.16 + k * 0.2;
    }
    // 三层水帘滚速不同，叠起来才有"水在流"的感觉
    FALLS.userData.fallMats.forEach((fm, i) => {
      if (fm.alphaMap) fm.alphaMap.offset.y = -elapsed * (0.62 + i * 0.24);
    });
  }

  // 羊：低头吃草 / 偶尔抬头
  for (const s of sheep) {
    const k = Math.sin(elapsed * 0.42 + s.phase);
    s.head.rotation.x = 0.45 + k * 0.32;
    s.group.rotation.y = s.baseRot + Math.sin(elapsed * 0.18 + s.phase) * 0.35;
    s.group.position.y = GRASS_Y + Math.max(0, Math.sin(elapsed * 1.3 + s.phase)) * 0.012;
  }

  // 鸡：走走停停地啄食
  for (const c of chickens) {
    const t = elapsed * 0.6 + c.phase;
    c.mesh.position.x = c.home.x + Math.sin(t * 0.7) * 2.2;
    c.mesh.position.z = c.home.y + Math.cos(t * 0.52) * 2.0;
    const heading = Math.atan2(Math.cos(t * 0.7) * 0.7, -Math.sin(t * 0.52) * 0.52);
    c.mesh.rotation.y = heading;
    c.mesh.rotation.x = Math.sin(elapsed * 6 + c.phase) * 0.12;
    c.mesh.position.y = GRASS_Y + Math.abs(Math.sin(elapsed * 5 + c.phase)) * 0.035;
  }

  // 炊烟
  for (const sp of smokePuffs) {
    const ch = sp.userData.chimney;
    const t = (elapsed * 0.16 + sp.userData.offset) % 1;
    sp.position.set(
      ch.x + Math.sin(t * 5 + ch.seed) * (0.4 + t * 1.8) + (state.night ? 0 : 0),
      ch.y + t * 7.5,
      ch.z + Math.cos(t * 4 + ch.seed) * (0.35 + t * 1.6)
    );
    sp.scale.setScalar(sp.userData.baseScale * (0.7 + t * 2.4));
    sp.material.opacity = (1 - t) * (1 - t) * 0.16 * (1 - state.dayFactor * 0.55);
  }

  // 高亮呼吸
  if (hovered) {
    const k = 0.05 + Math.sin(elapsed * 4.5) * 0.022;
    hovered.traverse((o) => {
      if (o.isMesh && o.material && o.material.emissive && o.material.emissive.getHex() === 0xffa04a) {
        o.material.emissiveIntensity = k;
      }
    });
  }

}

/* ============================================================
 *  自适应
 * ========================================================== */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // 面板收起 / 窗口最小化时 h 可能是 0，别把 aspect 写成 Infinity
  if (w > 0 && h > 0) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  renderer.setSize(w || 1, h || 1);
});

/* ============================================================
 *  材质去重
 *
 *  各个 make* 工厂函数各自 new 材质，同色同参数的材质在场景里有上千份。
 *  Three.js 按材质换渲染状态，材质越碎，每个 draw call 的 CPU 开销越大。
 *  这里在场景搭完后把"渲染参数完全相同"的材质并成一份。
 *  运行时会被改动的材质不能合并：透明的（淡入淡出）、带发光色的（窗户 / 灯笼 / 火焰）、
 *  已被拾取注册的（悬停高亮改的是 emissive，已在 registerInteractive 里按建筑共享过）。
 * ========================================================== */
function dedupMaterials() {
  const pickSet = new Set(pickables);
  // 集日的淡入淡出材质 / 发光材质运行时要逐个改 opacity，绝不能并进别的材质
  const skipMats = new Set([...FEST.fadeMats, ...FEST.glowMats]);
  const pool = new Map();
  const texId = (t) => (t ? t.uuid : '');
  let before = 0;
  scene.traverse((o) => {
    if (!o.isMesh || pickSet.has(o)) return;
    const m = o.material;
    if (!m || Array.isArray(m) || m.type !== 'MeshStandardMaterial' || skipMats.has(m)) return;
    if (m.transparent || m.emissive.getHex() !== 0 || m.emissiveMap) return;
    if (m.userData && Object.keys(m.userData).length) return;
    before++;
    const key = [
      m.color.getHex(), m.roughness, m.metalness, m.side, m.flatShading, m.vertexColors,
      m.alphaTest, m.depthWrite, m.envMapIntensity, m.bumpScale, m.normalScale.x, m.normalScale.y,
      texId(m.map), texId(m.normalMap), texId(m.bumpMap), texId(m.roughnessMap),
      texId(m.metalnessMap), texId(m.aoMap), texId(m.alphaMap),
    ].join('|');
    const hit = pool.get(key);
    if (hit) o.material = hit;
    else pool.set(key, m);
  });
  console.info(`[dedupMaterials] ${before} -> ${pool.size}`);
}

/* 启动 */
/* ============================================================
 *  距离剔除
 *
 *  世界扩到 r≈2000 以后，站在一头往另一头看，整个旧世界都在视锥里，
 *  几千次绘制画的是一千多米外只有几个像素的东西。
 *  这里把场景顶层节点（遇到半径 > 150 的大组就下钻一层）按"包围球 + 体量"登记，
 *  离相机太远就整枝关掉：体量越小，关得越早（小屋 600 米，大建筑 1500 米封顶）。
 *  地面、群山这类半径 > 150 的大块头永不剔除；人物自己有作息逻辑，单独处理。
 * ========================================================== */
const cullList = [];
function buildCullList() {
  const skip = new Set([sky, stars, moon, moonDisc, sun, sun.target, hemi, fill, nightAmbient, EXPANSION.world, ...clouds]);
  const box = new THREE.Box3();
  const sph = new THREE.Sphere();
  const peopleRoots = new Set(people.map((p) => p.root));
  const add = (o) => {
    if (skip.has(o) || peopleRoots.has(o) || o.userData.noCull) return;
    if (o.isLight || o.isSprite || o.isPoints || o.isInstancedMesh || o.isCamera) return;
    o.updateMatrixWorld(true);
    box.makeEmpty();
    box.setFromObject(o);
    if (box.isEmpty()) return;
    box.getBoundingSphere(sph);
    if (sph.radius > 150) {
      if (o.isGroup) for (const k of o.children) add(k);
      return;
    }
    cullList.push({
      obj: o, c: sph.center.clone(), r: sph.radius + 24,
      thr: Math.min(1150, 260 + sph.radius * 22),
    });
  };
  for (const o of scene.children) add(o);
}
festival.userData.noCull = true;   // 集日的整组开关由 updateFestival 管

const _cullV = new THREE.Vector3();

/* ---- 静态批处理：把确认不会动的碎网格按材质 + 空间格子烘合（见 batching.js） ---- */
function probeWorld(i) {
  if (i < 0) {
    // 复位：回到白天、集日开、闸门落下
    state.targetNight = 0; state.dayFactor = 0; state.night = false;
    state.festival = true; state.gatesOpen = false; state.gateAmount = 0;
    elapsed = 0;
    for (let k = 0; k < 40; k++) step(0.1);
    applyTimeOfDay(0);
    return;
  }
  const P = [
    { t: 37.3, night: 1, fest: false, gate: 1 },
    { t: 91.7, night: 0, fest: true, gate: 0 },
    { t: 163.1, night: 1, fest: true, gate: 1 },
  ][i];
  state.targetNight = P.night; state.dayFactor = P.night; state.night = !!P.night;
  state.festival = P.fest; state.gatesOpen = !!P.gate; state.gateAmount = P.gate;
  applyTimeOfDay(P.night);
  ringBell(2);
  for (let k = 0; k < 40; k++) { elapsed = P.t + k * 0.1; step(0.1); }
}
mark('探测准备');
dedupMaterials();   // 先并材质，批处理才能按材质成桶
mark('材质去重');
batchStatic(scene, {
  skip: new Set([sky, stars, moon, moonDisc, sun, sun.target, hemi, fill, nightAmbient, EXPANSION.world, festival, ...clouds, ...people.map((p) => p.root)]),
  pickSet: new Set(pickables),
  pickables,
  skipMats: new Set([...FEST.fadeMats, ...FEST.glowMats]),
  probes: 3,
  probe: probeWorld,
});
mark('静态批处理');
buildCullList();

function updateDistanceCull() {
  const cx = camera.position.x;
  const cz = camera.position.z;
  const allow = Math.max(0, camera.position.y - 60) * 0.9;   // 站得高，看得远
  for (const e of cullList) {
    // 站得高的时候，大建筑能看得更远，小零碎却依然看不见：额外的视距按体量折算
    const vis = Math.hypot(cx - e.c.x, cz - e.c.z) - e.r < e.thr + allow * Math.min(1, (e.r / 90) ** 2);
    if (e.obj.visible !== vis) e.obj.visible = vis;
  }
  // 人物：太远就不画（作息里自己会把"在屋里"的人藏起来，所以只管有 home 的以外的人）
  for (const p of people) {
    // 远方村镇的人用的是镇内局部坐标，必须换成世界坐标才能和相机比距离
    p.root.getWorldPosition(_cullV);
    const far = Math.hypot(cx - _cullV.x, cz - _cullV.z) > 380 + allow;
    p.far = far;
    if (!p.home && !p.skip) p.root.visible = !far;
    // 远处的人（>130 米，屏幕上不过十来个像素）：四肢节点冻结、不再摆动，省下骨架的矩阵更新
    const lod = Math.hypot(cx - _cullV.x, cz - _cullV.z) > (p.lod ? 110 : 130) + allow * 0.5;
    if (lod !== !!p.lod) {
      p.lod = lod;
      p.root.traverse((o) => { if (o !== p.root) { o.matrixAutoUpdate = !lod; if (!lod) o.matrixWorldNeedsUpdate = true; } });
    }
  }
}
updateDistanceCull();

mark('剔除表');
applyTimeOfDay(0);
animate();
mark('首帧');

// 方便调试 / 外部驱动相机
console.info(`[boot] 首帧前总耗时 ${performance.now().toFixed(0)} ms（自页面导航起）`);
console.info('[marks] ' + __marks.map(([n, t], i) => `${n}:${t - (i ? __marks[i - 1][1] : 0)}`).join(' | '));
window.__castle = { ADAPT, scene, camera, controls, state, flyTo, applyTimeOfDay, boats, people, THREE, renderer, EXPANSION, SPOTS, gotoSpot };

// 隐藏加载层（不依赖 rAF，后台标签页也能正常收起）
const loaderEl = document.getElementById('loader');
setTimeout(() => loaderEl.classList.add('hide'), 420);
window.addEventListener('pointerdown', () => loaderEl.classList.add('hide'), { once: true });

