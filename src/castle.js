import * as THREE from 'three';
import * as POP from './population.js';

/* 网格小工具，以及城堡组（要早于天空和地面放进场景，保持原来的绘制顺序）。 */
export function buildGeom({ scene }) {
/* ============================================================
 *  工具函数
 * ========================================================== */
const CASTLE = new THREE.Group();
scene.add(CASTLE);

function box(w, h, d, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, seg, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

/** 三角形截面的坡屋顶，沿 Z 方向拉伸 */
function gableRoof(w, d, h, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 圆塔顶部的城垛环 */
function ringMerlons(parent, radius, y, count, mat, size = 1.05, h = 1.5) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const m = box(size, h, size, mat);
    m.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    m.rotation.y = -a + Math.PI / 2;
    parent.add(m);
  }
}

/** 一段直墙上的城垛 */
function lineMerlons(parent, { x0, x1, z, y, depth = 0.9, step = 2.4, w = 1.3, h = 1.5, mat }) {
  const len = Math.abs(x1 - x0);
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const m = box(w, h, depth, mat);
    m.position.set(x, y, z);
    parent.add(m);
  }
}

  return { CASTLE, box, cyl, gableRoof, ringMerlons, lineMerlons };
}

/* 城墙、角塔、主楼、城门楼、庭院、守军和护城河小船。 */
export function buildCastle({ keepWindows, stoneTx, bannerRed, bannerBlue, glowTx, scaled, stoneMaterial, stoneMaterialRound, woodMaterial, shapeStoneMaterial, shapeWoodMaterial, spireMaterial, shapeRoofMaterial, ironMat, CASTLE, box, cyl, gableRoof, ringMerlons, lineMerlons, registerInteractive }) {
/* ============================================================
 *  城墙
 * ========================================================== */
const WALL_H = 11;
const WALL_T = 2.8;
const HALF = 26;

/* 墙体沿本地 X 轴延伸，终点用 position / rotationY 摆放 */
function buildWallSegment(x0, x1, z, alongX = true) {
  const len = Math.abs(x1 - x0);
  const wall = box(len, WALL_H, WALL_T, stoneMaterial(len, WALL_H, WALL_T));

  const walk = box(len, 0.55, WALL_T + 1.4, stoneMaterial(len, 0.5, WALL_T + 1.4));
  walk.position.set(0, WALL_H / 2 + 0.27, 0);

  const merlonMat = stoneMaterial(1.3, 1.5, 0.9, 0xded8c9);
  const merlons = new THREE.Group();
  lineMerlons(merlons, { x0: -len / 2, x1: len / 2, z: (WALL_T + 1.4) / 2 - 0.45, y: WALL_H / 2 + 0.8, mat: merlonMat });
  const merlons2 = new THREE.Group();
  lineMerlons(merlons2, { x0: -len / 2, x1: len / 2, z: -(WALL_T + 1.4) / 2 + 0.45, y: WALL_H / 2 + 0.8, mat: merlonMat });

  wall.add(walk, merlons, merlons2);

  const g = new THREE.Group();
  g.add(wall);
  const mid = (x0 + x1) / 2;
  if (alongX) {
    g.position.set(mid, 0, z);
  } else {
    g.rotation.y = Math.PI / 2;
    g.position.set(z, 0, mid);
  }
  return g;
}

// 四面墙（南面留城门）
CASTLE.add(buildWallSegment(-HALF, -8.8, 26, true));
CASTLE.add(buildWallSegment(8.8, HALF, 26, true));
CASTLE.add(buildWallSegment(-HALF, HALF, -26, true));
CASTLE.add(buildWallSegment(-HALF, HALF, -HALF, false));
CASTLE.add(buildWallSegment(-HALF, HALF, HALF, false));

/* ============================================================
 *  圆塔
 * ========================================================== */
function roundTower({ x, z, r = 5.2, h = 21, roof = true, flagTex = bannerRed, name }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const bodyMat = stoneMaterialRound(r, h);
  const body = cyl(r, r * 1.08, h, 28, bodyMat);
  body.position.y = h / 2;
  g.add(body);

  // 束带层
  for (let i = 1; i <= 2; i++) {
    const belt = cyl(r * 1.03, r * 1.03, 0.35, 28, stoneMaterialRound(r, 0.5, 0xbdb4a2));
    belt.position.y = (h / 3) * i;
    g.add(belt);
  }

  // 挑檐 + 城垛
  const corbel = cyl(r * 1.16, r * 1.02, 1.0, 28, stoneMaterialRound(r, 1, 0xd0c8b8));
  corbel.position.y = h + 0.5;
  g.add(corbel);

  // 塔顶平台（石板），避免看到圆柱默认顶盖的木纹
  const deck = new THREE.Mesh(
    new THREE.CircleGeometry(r * 1.03, 28),
    new THREE.MeshStandardMaterial({
      map: scaled(stoneTx.map, 3, 3),
      bumpMap: scaled(stoneTx.bump, 3, 3),
      bumpScale: 0.2,
      roughness: 0.98,
      color: 0xa9a292,
    })
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = h + 0.02;
  deck.receiveShadow = true;
  g.add(deck);

  ringMerlons(g, r * 1.06, h + 1.65, 12, stoneMaterial(1.1, 1.5, 1.1, 0xe2dccc), 1.1, 1.6);

  // 箭窗：外框 + 内部暗槽，远看不会成为纯黑洞
  const slitFrameMat = new THREE.MeshStandardMaterial({ color: 0xb9b1a0, roughness: 1 });
  const slitMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const frame = box(0.72, 2.4, 0.22, slitFrameMat, false);
    frame.position.set(Math.cos(a) * (r - 0.02), h * 0.62, Math.sin(a) * (r - 0.02));
    frame.rotation.y = -a;
    const slit = box(0.4, 2.0, 0.26, slitMat, false);
    slit.position.set(Math.cos(a) * (r - 0.06), h * 0.62, Math.sin(a) * (r - 0.06));
    slit.rotation.y = -a;
    g.add(frame, slit);
  }

  if (roof) {
    const cone = cyl(0.15, r * 0.98, r * 1.55, 28, spireMaterial(r * 1.55));
    cone.position.y = h + 1.6 + r * 0.78;
    g.add(cone);

    // 旗杆 + 旗帜
    const pole = cyl(0.09, 0.09, 6.5, 8, ironMat);
    pole.position.y = h + 1.6 + r * 1.55 + 2.2;
    g.add(pole);

    const flag = makeFlag(3.4, 2.0, flagTex);
    flag.position.set(1.7, h + 1.6 + r * 1.55 + 3.6, 0);
    g.add(flag);
  }

  g.userData.towerName = name;
  return g;
}

function makeFlag(w, h, tex) {
  const geo = new THREE.PlaneGeometry(w, h, 12, 8);
  geo.translate(w / 2, 0, 0);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0,
    alphaTest: 0.5,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.userData.base = Float32Array.from(geo.attributes.position.array);
  mesh.userData.width = w;
  flags.push(mesh);
  return mesh;
}
const flags = [];

/* ============================================================
 *  主楼（Keep）
 * ========================================================== */
function buildKeep() {
  const g = new THREE.Group();
  g.position.set(0, 0, -8);

  const W = 17;
  const D = 15;
  const H = 23;

  const base = box(W, H, D, stoneMaterial(W, H, D, 0xd2cbbb));
  base.position.y = H / 2;
  g.add(base);

  // 基座斜台
  const plinth = box(W + 1.6, 3, D + 1.6, stoneMaterial(W, 3, D, 0xa89f8e));
  plinth.position.y = 1.5;
  g.add(plinth);

  // 顶部挑檐 + 城垛
  const corbel = box(W + 1.4, 1.1, D + 1.4, stoneMaterial(W, 1, D, 0xded7c6));
  corbel.position.y = H + 0.55;
  g.add(corbel);

  const merlonMat = stoneMaterial(1.2, 1.6, 1.0, 0xe4ded0);
  const mg = new THREE.Group();
  lineMerlons(mg, { x0: -W / 2, x1: W / 2, z: (D + 1.4) / 2 - 0.5, y: H + 1.6, mat: merlonMat });
  lineMerlons(mg, { x0: -W / 2, x1: W / 2, z: -(D + 1.4) / 2 + 0.5, y: H + 1.6, mat: merlonMat });
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 5; i++) {
      const m = box(1.0, 1.6, 1.2, merlonMat);
      m.position.set((sx * (W + 1.4)) / 2 - sx * 0.5, H + 1.6, -D / 2 + (D / 5) * i);
      mg.add(m);
    }
  }
  g.add(mg);

  // 屋顶
  const roof = gableRoof(W + 1.2, D + 1.2, 7.5, shapeRoofMaterial(4.5));
  roof.position.y = H + 1.05;
  g.add(roof);

  // 四角小塔
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const t = cyl(1.9, 1.9, H + 6, 18, stoneMaterialRound(1.9, H + 6, 0xd8d1c1));
      t.position.set((sx * W) / 2, (H + 6) / 2, (sz * D) / 2);
      g.add(t);

      const c = cyl(0.05, 2.3, 3.4, 18, spireMaterial(3.4));
      c.position.set((sx * W) / 2, H + 6 + 1.7, (sz * D) / 2);
      g.add(c);

      const sp = cyl(0.07, 0.07, 4.5, 6, ironMat);
      sp.position.set((sx * W) / 2, H + 6 + 5.2, (sz * D) / 2);
      g.add(sp);
    }
  }

  // 塔身旗帜
  const pole = cyl(0.11, 0.11, 9, 8, ironMat);
  pole.position.set(0, H + 11, 0);
  g.add(pole);
  const flag = makeFlag(4.2, 2.4, bannerBlue);
  flag.position.set(2.1, H + 13.6, 0);
  g.add(flag);

  // 拱门
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-2.2, 0);
  doorShape.lineTo(2.2, 0);
  doorShape.lineTo(2.2, 5);
  doorShape.absarc(0, 5, 2.2, 0, Math.PI, false);
  doorShape.lineTo(-2.2, 0);
  const doorGeo = new THREE.ShapeGeometry(doorShape, 16);
  const door = new THREE.Mesh(doorGeo, shapeWoodMaterial(2.4));
  door.position.set(0, 0.05, D / 2 + 0.02);
  g.add(door);

  const frameMat = stoneMaterial(7, 9, 1, 0xe6dfd0);
  const frameL = box(1.0, 7.6, 0.8, frameMat);
  frameL.position.set(-2.7, 3.8, D / 2 + 0.3);
  const frameR = frameL.clone();
  frameR.position.x = 2.7;
  g.add(frameL, frameR);

  // 窗（夜间发光）
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x4a3a24,
    emissive: 0xffb85c,
    emissiveIntensity: 0,
    roughness: 0.55,
    metalness: 0.25,
  });
  winMat.userData.windowGlow = true;
  keepWindows.push(winMat);
  for (let row = 0; row < 3; row++) {
    for (let col = -2; col <= 2; col++) {
      if (row === 0 && Math.abs(col) < 2) continue;
      const win = box(1.1, 2.0, 0.3, winMat, false);
      win.position.set(col * 3.1, 8 + row * 5.4, D / 2 + 0.08);
      g.add(win);
      const winB = win.clone();
      winB.position.z = -D / 2 - 0.08;
      g.add(winB);
    }
  }

  // 侧翼山墙
  const wing = box(6, 13, 9, stoneMaterial(6, 13, 9, 0xcbc4b4));
  wing.position.set(-12.5, 6.5, -7);
  g.add(wing);
  const wingRoof = gableRoof(7.2, 10.2, 3.6, shapeRoofMaterial(4.5));
  wingRoof.position.set(-12.5, 13, -7);
  g.add(wingRoof);

  return g;
}


const keep = buildKeep();
CASTLE.add(keep);
registerInteractive(keep, {
  name: '主楼 · Keep',
  tag: '城堡核心',
  desc: '主楼是中世纪城堡里最后一道防线，也是领主的居所。厚重的石墙、狭小的箭窗、独立的蓄水与粮仓，让它在城墙失守后仍能坚守数月。',
  detail: '注意它抬高的入口、四角的瞭望塔，以及屋顶的旗帜 —— 那是领主的家族纹章。',
  view: { pos: [50, 54, 48], target: [0, 16, -8] },
});

/* ============================================================
 *  城门楼
 * ========================================================== */
const gateGroup = new THREE.Group();
gateGroup.position.set(0, 0, 0);
CASTLE.add(gateGroup);

let portcullis;
let gateDoors = [];

function buildGatehouse() {
  const g = gateGroup;

  // 拱形墙体（带门洞）
  const outer = new THREE.Shape();
  outer.moveTo(-8.8, 0);
  outer.lineTo(8.8, 0);
  outer.lineTo(8.8, 13.5);
  outer.lineTo(-8.8, 13.5);
  outer.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-2.8, 0);
  hole.lineTo(-2.8, 5.4);
  hole.absarc(0, 5.4, 2.8, Math.PI, 0, true);
  hole.lineTo(2.8, 0);
  hole.closePath();
  outer.holes.push(hole);

  const wallGeo = new THREE.ExtrudeGeometry(outer, { depth: WALL_T + 1.2, bevelEnabled: false });
  wallGeo.translate(0, 0, -(WALL_T + 1.2) / 2);

  const gateway = new THREE.Mesh(wallGeo, shapeStoneMaterial(5.5));
  gateway.position.set(0, 0, 26);
  gateway.castShadow = true;
  gateway.receiveShadow = true;
  g.add(gateway);

  // 城门顶部走道与城垛
  const deck = box(17.6, 0.6, WALL_T + 2.6, stoneMaterial(17.6, 0.6, WALL_T));
  deck.position.set(0, 13.8, 26);
  g.add(deck);

  const mg = new THREE.Group();
  lineMerlons(mg, { x0: -8.4, x1: 8.4, z: 26 + (WALL_T + 2.6) / 2 - 0.5, y: 15.1, mat: stoneMaterial(1.3, 1.6, 0.9, 0xe4ded0) });
  lineMerlons(mg, { x0: -8.4, x1: 8.4, z: 26 - (WALL_T + 2.6) / 2 + 0.5, y: 15.1, mat: stoneMaterial(1.3, 1.6, 0.9, 0xe4ded0) });
  g.add(mg);

  // 两侧塔楼
  for (const sx of [-1, 1]) {
    const t = cyl(4.0, 4.3, 18.5, 24, stoneMaterialRound(4, 18.5, 0xd8d1c1));
    t.position.set(sx * 8.8, 9.25, 26);
    g.add(t);

    const corbel = cyl(4.65, 4.05, 1.0, 24, stoneMaterialRound(4, 1, 0xe0d9c9));
    corbel.position.set(sx * 8.8, 19.0, 26);
    g.add(corbel);

    ringMerlons(g, 4.3, 20.2, 10, stoneMaterial(1.1, 1.5, 1.1, 0xe8e2d3), 1.1, 1.6);

    // 圆锥顶
    const cone = cyl(0.12, 4.25, 6.6, 24, spireMaterial(6.6));
    cone.position.set(sx * 8.8, 22.5, 26);
    g.add(cone);

    const pole = cyl(0.08, 0.08, 5, 6, ironMat);
    pole.position.set(sx * 8.8, 27.5, 26);
    g.add(pole);

    const flag = makeFlag(2.6, 1.6, sx < 0 ? bannerRed : bannerBlue);
    flag.position.set(sx * 8.8 + 1.3, 29.2, 26);
    g.add(flag);
  }

  // 闸门（可升降）
  portcullis = new THREE.Group();
  const barMat = ironMat;
  for (let i = -3; i <= 3; i++) {
    const bar = box(0.22, 8.2, 0.22, barMat);
    bar.position.set(i * 0.85, 4.1, 26);
    portcullis.add(bar);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 4), barMat);
    tip.rotation.x = Math.PI;
    tip.position.set(i * 0.85, -0.2, 26);
    portcullis.add(tip);
  }
  for (let j = 0; j < 5; j++) {
    const h = box(6.2, 0.2, 0.2, barMat);
    h.position.set(0, 1 + j * 1.7, 26);
    portcullis.add(h);
  }
  g.add(portcullis);

  // 木门（敞开靠在内墙）
  for (const sx of [-1, 1]) {
    const door = box(2.7, 6.2, 0.28, woodMaterial(2));
    const pivot = new THREE.Group();
    pivot.position.set(sx * 2.75, 0, 24.3);
    door.position.set(sx * -1.35, 3.1, 0);
    pivot.add(door);

    // 铁钉
    for (let r = 0; r < 4; r++) {
      const stud = box(2.4, 0.16, 0.1, ironMat, false);
      stud.position.set(sx * -1.35, 1.0 + r * 1.5, 0.2);
      pivot.add(stud);
    }
    pivot.userData.base = sx * 1.35;
    pivot.rotation.y = pivot.userData.base;
    g.add(pivot);
    gateDoors.push(pivot);
  }

  // 桥头石阶 + 通往对岸的木桥
  const road = box(9.2, 0.5, 12, stoneMaterial(9.2, 0.5, 12, 0x9c9384));
  road.position.set(0, -0.2, 33);
  road.receiveShadow = true;
  g.add(road);

  const bridge = new THREE.Group();
  const bMat = woodMaterial(4);
  const PLANK = 1.15;
  const N = 30; // 一直铺到护城河外岸（z ≈ 59.8）
  for (let i = 0; i < N; i++) {
    const plank = box(8.4, 0.28, PLANK * 0.86, bMat);
    plank.position.set(0, 0, i * PLANK);
    bridge.add(plank);
  }
  for (const sx of [-1, 1]) {
    const beam = box(0.42, 0.44, N * PLANK, bMat);
    beam.position.set(sx * 4.1, 0.06, (N * PLANK) / 2 - PLANK / 2);
    bridge.add(beam);

    for (let i = 0; i < N; i += 3) {
      const post = box(0.22, 1.5, 0.22, bMat);
      post.position.set(sx * 4.0, 0.9, i * PLANK);
      bridge.add(post);
    }
    const rail = box(0.18, 0.18, N * PLANK, bMat);
    rail.position.set(sx * 4.0, 1.6, (N * PLANK) / 2 - PLANK / 2);
    bridge.add(rail);

    // 吊桥铁链
    for (let k = 0; k <= 7; k++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 10), ironMat);
      link.position.set(sx * 4.6, 4.4 - k * 0.42, 1.2 + k * 1.05);
      link.rotation.x = Math.PI / 2 + 0.35;
      bridge.add(link);
    }
  }

  // 桥墩
  for (let i = 2; i < N; i += 7) {
    const zz = i * PLANK;
    for (const sx of [-1, 1]) {
      const pier = cyl(0.55, 0.75, 4.2, 8, stoneMaterialRound(0.7, 4.2, 0x8d8577));
      pier.position.set(sx * 3.4, -2.2, zz);
      bridge.add(pier);
    }
  }

  bridge.position.set(0, -0.1, 26.4);
  g.add(bridge);

  return g;
}
buildGatehouse();

registerInteractive(gateGroup, {
  name: '城门楼 · Gatehouse',
  tag: '咽喉要地',
  desc: '城门是城堡最脆弱的地方，因此被建得格外坚固：双塔夹峙、拱形门洞、可升降的铁闸门，以及跨过护城河的吊桥。',
  detail: '点击下方按钮，可以升起铁闸门 —— 现实中它靠绞盘与铁链驱动，需要数名士兵合力操作。',
  view: { pos: [2, 22, 80], target: [0, 10, 24] },
});

/* ============================================================
 *  角塔
 * ========================================================== */
const towerData = [
  { x: -HALF, z: -HALF, name: '西北角塔', roof: true, flagTex: bannerRed },
  { x: HALF, z: -HALF, name: '东北角塔', roof: false, flagTex: bannerBlue },
  { x: -HALF, z: HALF, name: '西南角塔', roof: false, flagTex: bannerBlue },
  { x: HALF, z: HALF, name: '东南角塔', roof: true, flagTex: bannerRed },
];

towerData.forEach((t, i) => {
  const tower = roundTower({ ...t, r: 5.4, h: 22 });
  tower.position.y = 0;
  CASTLE.add(tower);

  if (i === 0) {
    registerInteractive(tower, {
      name: '角塔 · Corner Tower',
      tag: '瞭望与射击',
      desc: '圆形的角塔没有射击死角，塔顶的城垛为弓箭手提供掩护，塔内的螺旋楼梯只容一人通行，易守难攻。',
      detail: '塔顶旗帜的方向，就是风向。',
      view: { pos: [-58, 30, -58], target: [-26, 16, -26] },
    });
  }
});

/* ============================================================
 *  庭院
 * ========================================================== */
function buildWell(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const ring = cyl(2.1, 2.3, 1.5, 20, stoneMaterialRound(2.2, 1.5, 0xa9a294));
  ring.position.y = 0.75;
  g.add(ring);

  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20), new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 1 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 1.45;
  g.add(hole);

  for (const sx of [-1, 1]) {
    const post = box(0.28, 3.4, 0.28, woodMaterial(1));
    post.position.set(sx * 1.75, 1.7, 0);
    g.add(post);
  }
  const beam = box(4.0, 0.28, 0.3, woodMaterial(1));
  beam.position.y = 3.4;
  g.add(beam);

  const roof = gableRoof(3.6, 1.5, 1.1, shapeRoofMaterial(4.5));
  roof.position.set(0, 3.55, 0);
  g.add(roof);

  const rope = cyl(0.05, 0.05, 2.0, 6, new THREE.MeshStandardMaterial({ color: 0x8a7a55, roughness: 1 }));
  rope.position.set(0, 2.4, 0);
  g.add(rope);

  const bucket = cyl(0.34, 0.28, 0.5, 10, woodMaterial(1));
  bucket.position.set(0, 1.4, 0);
  g.add(bucket);

  return g;
}
const well = buildWell(9, 9);
CASTLE.add(well);
registerInteractive(well, {
  name: '水井 · The Well',
  tag: '围城生死线',
  desc: '围城战中，水源比粮食更致命。城堡内必须有自己的水井或蓄水池，否则敌人只需围而不攻就能取胜。',
  detail: '水井通常深达数十米，井壁用石块砌成，井口加盖防止投毒。',
  view: { pos: [22, 11, 24], target: [9, 2, 9] },
});

function buildHut(x, z, rot, w = 6, d = 5, h = 3.6) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;

  const body = box(w, h, d, new THREE.MeshStandardMaterial({
    map: scaled(stoneTx.map, w / 4, h / 4),
    bumpMap: scaled(stoneTx.bump, w / 4, h / 4),
    bumpScale: 0.15,
    roughness: 1,
    color: 0xb9b0a0,
  }));
  body.position.y = h / 2;
  g.add(body);

  // 木筋
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x4a3625, roughness: 0.9 });
  for (const sx of [-1, 1]) {
    const b = box(0.28, h, 0.28, beamMat);
    b.position.set((sx * w) / 2 - sx * 0.14, h / 2, d / 2 + 0.02);
    g.add(b);
  }
  const b2 = box(w, 0.26, 0.26, beamMat);
  b2.position.set(0, h - 0.2, d / 2 + 0.02);
  g.add(b2);

  const roof = gableRoof(w + 0.8, d + 1.0, 2.3, shapeRoofMaterial(4.5));
  roof.position.y = h;
  g.add(roof);

  // 门
  const door = box(1.3, 2.2, 0.12, woodMaterial(1));
  door.position.set(0, 1.1, d / 2 + 0.06);
  g.add(door);

  // 烟囱
  const chim = box(0.7, 1.8, 0.7, stoneMaterial(0.7, 1.8, 0.7, 0x8d8578));
  chim.position.set(w / 2 - 1.1, h + 1.9, -d / 2 + 1.2);
  g.add(chim);

  return g;
}

const huts = new THREE.Group();
huts.add(buildHut(-17, 12, 0.25, 6.5, 5.2, 3.8));
huts.add(buildHut(-16.5, 3.5, -0.1, 5.0, 4.4, 3.2));
huts.add(buildHut(18, -12, -1.9, 5.6, 4.6, 3.4));
CASTLE.add(huts);
registerInteractive(huts, {
  name: '庭院民居 · Courtyard',
  tag: '日常生活',
  desc: '城堡不只是军事要塞，也是一个小型城镇：铁匠铺、马厩、粮仓、面包房、礼拜堂一应俱全。',
  detail: '平时，庭院里挤满士兵、工匠、仆役与商贩；战时，周边村落的农民会带着牲畜躲进城墙。',
  view: { pos: [-2, 24, 40], target: [-14, 5, 6] },
});

// 登上城墙的石阶
function buildStairs(x, z, w, steps, h, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const mat = stoneMaterial(w, 1, 1.4, 0xbdb5a5);
  const stepH = h / steps;
  const stepD = 0.85;
  for (let i = 0; i < steps; i++) {
    const s = box(w, stepH, stepD, mat);
    s.position.set(0, stepH * i + stepH / 2, -i * stepD);
    g.add(s);
  }
  return g;
}
const stairs = buildStairs(-22.4, 5.6, 3.0, 23, WALL_H + 0.6, Math.PI);
CASTLE.add(stairs);

// 火盆 / 火把
const fireGroup = new THREE.Group();
CASTLE.add(fireGroup);
const torchFlames = [];
const torchLights = [];
const flameBodies = [];
const windmills = [];   // 风车的帆（工匠区在下面才建）
const waterWheels = []; // 水磨坊的水轮
const stalls = [];      // 市集摊位（昼夜开合）
const bellRopes = [];   // 会跟着钟声摆动的钟舌
const BELL_POS = new THREE.Vector3();  // 钟楼钟口的世界坐标
const BELFREY_GLOW = [];               // 钟室四面开口外侧（世界坐标）
const ANVIL_POS = new THREE.Vector3(); // 铁砧的世界坐标（打铁火星从这里蹦）
const lampHaloes = [];                 // 街灯灯罩的光晕

function addTorch(x, y, z, withLight = true, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const bracket = box(0.16, 0.16, 0.9, ironMat);
  bracket.position.z = 0.4;
  g.add(bracket);

  const bowl = cyl(0.42, 0.22, 0.5, 10, ironMat);
  bowl.position.set(0, 0.3, 0.82);
  g.add(bowl);

  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx,
    color: 0xff9a33,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  flame.position.set(0, 1.45, 0.82);
  flame.scale.setScalar(3.0 * scale);
  flame.userData.baseScale = 3.0 * scale;
  g.add(flame);

  // 火苗本体（小锥体，随火焰跳动的更明确形状）
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.26 * scale, 0.9 * scale, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc45e, transparent: true, opacity: 0.95, toneMapped: false })
  );
  body.position.set(0, 1.15 * scale, 0.82);
  body.userData.baseY = body.position.y;
  g.add(body);
  flameBodies.push({ mesh: body, seed: Math.random() * 10, scale });

  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx,
    color: 0xfff0c0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  core.position.copy(flame.position);
  core.scale.setScalar(1.5 * scale);
  core.userData.baseScale = 1.5 * scale;
  g.add(core);

  torchFlames.push({ flame, core, seed: Math.random() * 10 });

  if (withLight) {
    const light = new THREE.PointLight(0xff9a3c, 0, 16, 2);
    light.position.set(0, 1.5, 0.82);
    g.add(light);
    torchLights.push(light);
  }

  fireGroup.add(g);
  return g;
}

// 城门两侧
addTorch(-5.6, 6.2, 27.2, true, 1.15);
addTorch(5.6, 6.2, 27.2, true, 1.15);
// 主楼门前
addTorch(-4.2, 4.2, -0.4, true, 1.0);
addTorch(4.2, 4.2, -0.4, true, 1.0);
// 庭院
addTorch(-17.8, 3.4, 14.6, true, 0.9);
addTorch(13.5, 3.4, 18.5, false, 0.9);

// 篝火
const bonfire = new THREE.Group();
bonfire.position.set(6.5, 0, 14);
{
  const logs = new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const log = cyl(0.16, 0.16, 2.0, 6, logs);
    log.position.set(0, 0.2, 0);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 7) * Math.PI;
    log.rotation.x = 0.35;
    log.position.y = 0.26;
    bonfire.add(log);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.28, 8, 20), new THREE.MeshStandardMaterial({ color: 0x6b6355, roughness: 1 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.12;
  bonfire.add(ring);

  const fire = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx, color: 0xff8a2a, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  fire.position.y = 1.3;
  fire.scale.setScalar(5);
  fire.userData.baseScale = 5;
  bonfire.add(fire);
  torchFlames.push({ flame: fire, core: null, seed: 3.3 });

  const light = new THREE.PointLight(0xff8420, 0, 26, 2);
  light.position.y = 1.8;
  bonfire.add(light);
  torchLights.push(light);
}
CASTLE.add(bonfire);

/* ============================================================
 *  城墙上的旗帜
 * ========================================================== */
for (const [x, z, tex] of [[-17, 26, bannerRed], [17, 26, bannerRed], [0, -26, bannerBlue]]) {
  const pole = cyl(0.09, 0.09, 5.6, 6, ironMat);
  pole.position.set(x, WALL_H + 3.3, z);
  CASTLE.add(pole);
  const flag = makeFlag(3.0, 1.8, tex);
  flag.position.set(x + 1.5, WALL_H + 5.4, z);
  CASTLE.add(flag);
}

/* ============================================================
 *  人物：城墙守卫 / 城门哨兵 / 庭院平民
 * ========================================================== */
const people = [];
const TABARDS_RED = 0x7d1c22;
const TABARDS_BLUE = 0x1c3a63;
const WALK_TOP = WALL_H / 2 + 0.5; // 城墙走道地面高度 ≈ 6.0
const GATE_DECK = 14.1;            // 城门楼顶平台

/**
 * 给镇上的居民登记一份作息：白天在 work 点，天黑之后走回 home 点进屋。
 * 只对镇上的人调用；守卫、船夫这些当值的人不回家。
 */
function schedule(rec, hx, hz, hface) {
  rec.home = { x: hx, z: hz, face: hface };
  rec.work = { x: rec.root.position.x, z: rec.root.position.z, face: rec.facingY };
  rec.sched = 'out';    // out | toHome | in | toWork
  rec.presence = 1;
  return rec;
}

/**
 * activity: 'idle' | { walk: {from:[x,z], to:[x,z], speed} }
 */
function addPerson(model, x, y, z, facingY, activity = 'idle', parent = CASTLE) {
  model.root.position.set(x, y, z);
  model.root.rotation.y = facingY;
  parent.add(model.root);

  const rec = {
    ...model,
    activity,
    phase: Math.random() * Math.PI * 2,
    t: Math.random(),
    baseY: y,
    facingY,
  };

  if (activity && activity.walk) {
    rec.walkT = Math.random();
    rec.dir = 1;
    rec.activity0 = activity;   // 收工回家再出门时要把走动还原
  }
  people.push(rec);
  return rec;
}

/* ---------- 城墙上的守卫 ---------- */
const WALL_TROOPS = [
  // 南墙（面向城外 +z）
  { x: -20.5, z: 26, y: WALK_TOP, face: 0, helm: 'kettle', weapon: 'spear', shield: true },
  { x: -14.5, z: 26.2, y: WALK_TOP, face: 0.15, helm: 'great', weapon: 'halberd', shield: false },
  { x: -11.5, z: 25.8, y: WALK_TOP, face: -0.2, helm: 'kettle', weapon: 'spear', shield: false },
  { x: 12.0, z: 26.1, y: WALK_TOP, face: 0.1, helm: 'kettle', weapon: 'spear', shield: true },
  { x: 18.0, z: 25.9, y: WALK_TOP, face: -0.12, helm: 'great', weapon: 'spear', shield: false },
  { x: 22.5, z: 26.2, y: WALK_TOP, face: 0.2, helm: 'kettle', weapon: 'halberd', shield: false },
  // 北墙（面向 -z）
  { x: -17.0, z: -26, y: WALK_TOP, face: Math.PI, helm: 'kettle', weapon: 'spear', shield: true },
  { x: -4.0, z: -26.1, y: WALK_TOP, face: Math.PI + 0.2, helm: 'great', weapon: 'halberd', shield: false },
  { x: 9.0, z: -25.9, y: WALK_TOP, face: Math.PI - 0.15, helm: 'kettle', weapon: 'spear', shield: false },
  { x: 20.0, z: -26, y: WALK_TOP, face: Math.PI, helm: 'kettle', weapon: 'bow', shield: false },
  // 东墙（面向 +x）
  { x: 26, z: -12.0, y: WALK_TOP, face: Math.PI / 2, helm: 'kettle', weapon: 'spear', shield: true },
  { x: 26.1, z: 2.0, y: WALK_TOP, face: Math.PI / 2 - 0.1, helm: 'great', weapon: 'halberd', shield: false },
  // 西墙（面向 -x）
  { x: -26, z: 16.0, y: WALK_TOP, face: -Math.PI / 2, helm: 'kettle', weapon: 'spear', shield: false },
  { x: -26.1, z: -6.0, y: WALK_TOP, face: -Math.PI / 2 + 0.12, helm: 'kettle', weapon: 'bow', shield: false },
];

WALL_TROOPS.forEach((t, i) => {
  const model = POP.makePerson({
    tabard: i % 3 === 0 ? TABARDS_BLUE : TABARDS_RED,
    helmet: t.helm,
    weapon: t.weapon,
    shield: t.shield,
    cape: i % 4 === 1,
  });
  addPerson(model, t.x, t.y, t.z, t.face);
});

/* ---------- 城墙上巡逻的卫兵 ---------- */
addPerson(
  POP.makePerson({ tabard: TABARDS_RED, helmet: 'kettle', weapon: 'spear', shield: false }),
  -22, WALK_TOP, 25.2, 0,
  { walk: { from: [-22, 25.2], to: [-10.5, 25.2], speed: 1.05 } }
);
addPerson(
  POP.makePerson({ tabard: TABARDS_BLUE, helmet: 'kettle', weapon: 'spear', shield: true }),
  14, WALK_TOP, -25.2, Math.PI,
  { walk: { from: [14, -25.2], to: [24, -25.2], speed: 0.95 } }
);

/* ---------- 城门楼顶的旗手与哨兵 ---------- */
addPerson(
  POP.makePerson({ tabard: TABARDS_RED, helmet: 'great', weapon: 'halberd', shield: false, cape: true }),
  0, GATE_DECK, 24.6, 0
);
addPerson(
  POP.makePerson({ tabard: TABARDS_BLUE, helmet: 'kettle', weapon: 'spear', shield: true }),
  -6.0, GATE_DECK, 25.4, 0.3
);
addPerson(
  POP.makePerson({ tabard: TABARDS_BLUE, helmet: 'kettle', weapon: 'spear', shield: true }),
  6.0, GATE_DECK, 25.4, -0.3
);

/* ---------- 城门内侧的守卫 ---------- */
addPerson(
  POP.makePerson({ tabard: TABARDS_RED, helmet: 'great', weapon: 'spear', shield: false }),
  -4.6, 0, 21.4, 0.35
);
addPerson(
  POP.makePerson({ tabard: TABARDS_RED, helmet: 'great', weapon: 'spear', shield: false }),
  4.6, 0, 21.4, -0.35
);

/* ---------- 庭院里的平民 ---------- */
const VILLAGER_SPOTS = [
  { x: 11.6, z: 10.4, face: -0.9 },     // 水井旁打水
  { x: 8.2, z: 7.0, face: 1.4 },
  { x: -14.2, z: 10.2, face: 0.4 },     // 民居前
  { x: -19.0, z: 2.0, face: 2.2 },
  { x: 16.0, z: -9.0, face: -1.2 },
  { x: 4.4, z: 12.4, face: 2.6 },       // 篝火旁
  { x: 8.6, z: 15.6, face: -2.4 },
  { x: -8.0, z: 15.0, face: 0.9 },
];
VILLAGER_SPOTS.forEach((v) => {
  addPerson(POP.makeVillager(1), v.x, 0, v.z, v.face);
});

// 两个在庭院里走动的人
addPerson(
  POP.makeVillager(1.02),
  -2, 0, 16, 0,
  { walk: { from: [-4.5, 18.5], to: [12, 18.5], speed: 0.72 } }
);
addPerson(
  POP.makeVillager(0.98),
  20, 0, 6, Math.PI,
  { walk: { from: [21, 8], to: [21, -8], speed: 0.66 } }
);

/* ---------- 马车 / 草垛 / 木桶 ---------- */
const props = new THREE.Group();
CASTLE.add(props);

[[12.5, 17.5, 0.0], [13.4, 18.4, 0.4], [-13.0, 15.4, 0.2]].forEach(([x, z, r]) => {
  const barrel = POP.makeBarrel(0.34, 0.85);
  barrel.position.set(x, 0, z);
  barrel.rotation.y = r;
  props.add(barrel);
});
[[-11.4, 13.6, 0.5], [-10.8, 14.4, -0.2], [15.8, -14.4, 0.3]].forEach(([x, z, r]) => {
  const crate = POP.makeCrate(0.72);
  crate.position.set(x, 0, z);
  crate.rotation.y = r;
  props.add(crate);
});
[[-20.4, 17.6, 1.0], [17.4, 20.2, 0.85], [19.6, -18.4, 0.9]].forEach(([x, z, r]) => {
  const hay = POP.makeHaystack(r);
  hay.position.set(x, 0, z);
  hay.rotation.y = Math.random() * 3;
  props.add(hay);
});

/* ============================================================
 *  护城河里的小船
 * ========================================================== */
const boats = [];
const MOAT_R = 51.6;
const WATER_Y = -1.5;
const BOAT_DRAFT = 0.2; // 吃水深度（船内底 0.3 高于水线）

function addBoat({ angle, radius = MOAT_R, speed = 0.012, dir = 1, withRower = true }) {
  const boat = POP.makeBoat({ len: 4.6, wid: 1.55, wallH: 0.72, rower: withRower });
  const a = angle;
  boat.position.set(Math.cos(a) * radius, WATER_Y - BOAT_DRAFT, Math.sin(a) * radius);
  // 船首朝向切线方向
  boat.rotation.y = -a + (dir > 0 ? Math.PI : 0);
  CASTLE.add(boat);
  boats.push({
    mesh: boat,
    angle: a,
    radius,
    speed: speed * dir,
    phase: Math.random() * Math.PI * 2,
    baseY: WATER_Y - BOAT_DRAFT,
  });
  return boat;
}

addBoat({ angle: 0.55, speed: 0.013 });
addBoat({ angle: 2.35, speed: 0.011, dir: -1 });
addBoat({ angle: 4.05, speed: 0.009, rower: false });
addBoat({ angle: 5.35, radius: 54.5, speed: 0.008, dir: -1 });

/* 岸边的系船桩 */
for (const a of [0.62, 2.42, 4.12, 5.42]) {
  const post = new THREE.Group();
  const p = cyl(0.16, 0.19, 1.5, 8, woodMaterial(1));
  p.position.y = 0.35;
  post.add(p);
  const ringGeo = new THREE.TorusGeometry(0.14, 0.035, 4, 10);
  const ring = new THREE.Mesh(ringGeo, ironMat);
  ring.position.set(0, 0.75, 0.2);
  post.add(ring);
  post.position.set(Math.cos(a) * 44.6, -0.9, Math.sin(a) * 44.6);
  post.rotation.y = -a;
  CASTLE.add(post);
}

  return { flags, keep, gateGroup, portcullis, gateDoors, well, huts, torchFlames, torchLights, flameBodies, windmills, waterWheels, stalls, bellRopes, BELL_POS, BELFREY_GLOW, ANVIL_POS, lampHaloes, people, TABARDS_RED, TABARDS_BLUE, schedule, addPerson, boats };
}
