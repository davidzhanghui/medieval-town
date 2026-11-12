/**
 * inn.js —— 城堡西面的朝圣客栈
 *
 * 一座带车马院的客栈：临街两层主楼，后面围出可以赶车进来的院子，
 * 院里是马厩、草料棚、水井和猪圈。朝圣者和商队在这里打尖过夜。
 * 构件用主场景传入的材质 M，与 town.js 同一套约定。
 */

import * as THREE from 'three';

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

function solid(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 1, ...opts });
}

/** 三角截面、沿 Z 拉伸的坡屋顶（屋脊沿 Z） */
function gable(w, d, h, mat) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 屋脊沿 X 的双坡顶 */
function ridgeRoof(len, depth, h, mat) {
  const m = gable(depth, len, h, mat);
  m.rotation.y = Math.PI / 2;
  return m;
}

/* ============================================================
 *  主楼：石基 + 木筋墙 + 二层出挑 + 红瓦顶
 * ========================================================== */
function buildMainHouse(M) {
  const g = new THREE.Group();
  const W = 15, D = 8.4, H1 = 3.2, H2 = 2.9;
  const BASE = 0.55;

  // 石砌一层
  const ground = box(W, H1, D, M.stoneStrong);
  ground.position.y = BASE + H1 / 2;
  g.add(ground);

  // 墙基
  const plinth = box(W + 0.4, BASE, D + 0.4, M.stone);
  plinth.position.y = BASE / 2;
  g.add(plinth);

  // 二层：灰泥 + 木筋，向外挑出 0.4
  const UPPER = { w: W + 0.8, d: D + 0.8 };
  const upper = box(UPPER.w, H2, UPPER.d, M.stucco);
  upper.position.y = BASE + H1 + H2 / 2;
  g.add(upper);

  // 二层的木骨架（正面与侧面）
  const timber = M.timber;
  const uy0 = BASE + H1;
  for (const sz of [-1, 1]) {
    // 上下横梁
    for (const yy of [uy0 + 0.16, uy0 + H2 - 0.14]) {
      const rail = box(UPPER.w + 0.06, 0.18, 0.09, timber);
      rail.position.set(0, yy, sz * (UPPER.d / 2 + 0.03));
      g.add(rail);
    }
    // 立柱
    for (let i = -3; i <= 3; i++) {
      const post = box(0.16, H2, 0.09, timber);
      post.position.set(i * (UPPER.w / 7), uy0 + H2 / 2, sz * (UPPER.d / 2 + 0.03));
      g.add(post);
    }
    // 斜撑
    for (let i = -2; i <= 2; i += 2) {
      const brace = box(0.14, H2 * 0.9, 0.07, timber, false);
      brace.position.set(i * (UPPER.w / 7) + UPPER.w / 14, uy0 + H2 / 2, sz * (UPPER.d / 2 + 0.04));
      brace.rotation.z = i < 0 ? 0.5 : -0.5;
      g.add(brace);
    }
  }
  for (const sx of [-1, 1]) {
    for (const yy of [uy0 + 0.16, uy0 + H2 - 0.14]) {
      const rail = box(0.09, 0.18, UPPER.d + 0.06, timber);
      rail.position.set(sx * (UPPER.w / 2 + 0.03), yy, 0);
      g.add(rail);
    }
  }

  // 挑出部分的托梁
  for (let i = -3; i <= 3; i++) {
    const joist = box(0.2, 0.2, 0.9, M.beam);
    joist.position.set(i * (W / 7), uy0 - 0.08, D / 2 + 0.3);
    g.add(joist);
  }

  // 屋顶
  const roof = ridgeRoof(W + 2.0, D + 1.8, 3.0, M.tile);
  roof.position.y = uy0 + H2;
  g.add(roof);

  // 檐口
  const eave = box(W + 2.2, 0.16, D + 2.0, M.timber, false);
  eave.position.y = uy0 + H2 + 0.06;
  g.add(eave);

  // 山墙封檐板
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const len = Math.hypot((D + 1.8) / 2, 3.0);
      const barge = box(0.14, 0.16, len, M.beam);
      barge.position.set(sx * (W + 2.0) / 2, uy0 + H2 + 1.5, sz * (D + 1.8) / 4);
      barge.rotation.x = sz * Math.atan2(3.0, (D + 1.8) / 2);
      g.add(barge);
    }
  }

  // 烟囱
  const chim = box(0.8, 5.4, 0.8, M.stone);
  chim.position.set(-W * 0.3, uy0 + H2 + 1.4, -D * 0.22);
  g.add(chim);
  const chimCap = box(0.98, 0.16, 0.98, M.stoneLight);
  chimCap.position.set(-W * 0.3, uy0 + H2 + 4.1, -D * 0.22);
  g.add(chimCap);

  /* ---- 一层：拱形大门 + 两扇窗 ---- */
  const doorW = 1.9, doorH = 2.3;
  const door = box(doorW, doorH, 0.16, M.wood);
  door.position.set(0, BASE + doorH / 2, D / 2 + 0.04);
  g.add(door);

  // 门洞两侧的石券
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(doorW / 2 + 0.1, 0.16, 5, 14, Math.PI),
    M.stoneLight
  );
  arch.position.set(0, BASE + doorH, D / 2 + 0.03);
  arch.castShadow = true;
  g.add(arch);

  for (const sx of [-1, 1]) {
    const jamb = box(0.24, doorH, 0.24, M.stoneLight);
    jamb.position.set(sx * (doorW / 2 + 0.12), BASE + doorH / 2, D / 2 + 0.04);
    g.add(jamb);

    // 门环
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 4, 10), M.iron, false);
    ring.position.set(sx * 0.32, BASE + 1.1, D / 2 + 0.14);
    g.add(ring);
  }

  // 一层窗
  for (const sx of [-1, 1]) {
    const win = box(0.9, 1.0, 0.12, M.window, false);
    win.position.set(sx * 4.4, BASE + 1.85, D / 2 + 0.03);
    g.add(win);

    const bars = box(1.05, 0.09, 0.2, M.stoneLight, false);
    bars.position.set(sx * 4.4, BASE + 2.42, D / 2 + 0.06);
    g.add(bars);
  }

  // 二层窗：五扇
  for (let i = -2; i <= 2; i++) {
    const win = box(0.8, 1.0, 0.12, M.window, false);
    win.position.set(i * 2.7, uy0 + H2 * 0.55, UPPER.d / 2 + 0.03);
    g.add(win);

    // 窗框
    const fTop = box(0.96, 0.1, 0.16, M.beam, false);
    fTop.position.set(i * 2.7, uy0 + H2 * 0.55 + 0.56, UPPER.d / 2 + 0.05);
    g.add(fTop);

    const fBot = box(0.96, 0.1, 0.2, M.beam, false);
    fBot.position.set(i * 2.7, uy0 + H2 * 0.55 - 0.56, UPPER.d / 2 + 0.05);
    g.add(fBot);
  }

  /* ---- 招牌：铁艺弯臂挑出的酒杯 ---- */
  const signArm = new THREE.Group();
  signArm.position.set(W / 2 - 1.2, BASE + H1 + 0.7, D / 2 + 0.1);
  {
    const bar = box(1.8, 0.09, 0.09, M.iron);
    bar.position.set(0.9, 0.9, 0);
    signArm.add(bar);

    const brace = box(0.07, 1.3, 0.07, M.iron, false);
    brace.position.set(0.3, 0.42, 0);
    brace.rotation.z = 0.75;
    signArm.add(brace);

    const hook = box(0.06, 0.55, 0.06, M.iron, false);
    hook.position.set(1.7, 0.62, 0);
    signArm.add(hook);

    // 挂着的木牌
    const board = box(1.1, 0.78, 0.07, M.woodDark);
    board.position.set(1.7, 0.05, 0);
    signArm.add(board);

    // 牌面上的杯子图案
    const cup = cyl(0.16, 0.12, 0.3, 8, M.bronze, false);
    cup.position.set(1.7, 0.06, 0.07);
    signArm.add(cup);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 4, 10, Math.PI), M.bronze);
    handle.position.set(1.9, 0.1, 0.07);
    handle.rotation.z = -Math.PI / 2;
    signArm.add(handle);
  }
  g.add(signArm);

  return g;
}

/* ============================================================
 *  车马院：围墙 + 大门 + 院子地面
 * ========================================================== */
function buildYard(M, { hx = 15, hz = 13, h = 2.6 } = {}) {
  const g = new THREE.Group();

  // 夯实的院子地面
  const floor = box(hx * 2, 0.16, hz * 2, solid(0x8d7a5c, { roughness: 1 }), false);
  floor.position.y = 0.08;
  floor.receiveShadow = true;
  g.add(floor);

  // 车辙：两道压在院子地上的深色带
  for (const sx of [-1.5, 1.5]) {
    const rut = box(hx * 2 - 1, 0.03, 0.5, solid(0x6d5c42, { roughness: 1 }), false);
    rut.position.set(0, 0.17, sx + hz * 0.2);
    g.add(rut);
  }

  // 三面围墙（临街那面留大门）
  const segs = [
    [-hx, 0, 0.55, hz * 2],            // 西
    [hx, 0, 0.55, hz * 2],             // 东
    [0, -hz, hx * 2, 0.55],            // 北
  ];
  for (const [cx, cz, w, d] of segs) {
    const wall = box(w, h, d, M.stone);
    wall.position.set(cx, h / 2, cz);
    g.add(wall);

    const cap = box(w + 0.12, 0.16, d + 0.12, M.stoneLight, false);
    cap.position.set(cx, h + 0.05, cz);
    g.add(cap);
  }

  // 南墙：中间留 5 米的车门
  const gap = 2.8;
  for (const sx of [-1, 1]) {
    const segW = hx - gap;
    const wall = box(segW, h, 0.55, M.stone);
    wall.position.set(sx * (gap + segW / 2), h / 2, hz);
    g.add(wall);

    const cap = box(segW + 0.12, 0.16, 0.67, M.stoneLight, false);
    cap.position.set(sx * (gap + segW / 2), h + 0.05, hz);
    g.add(cap);
  }

  // 门柱
  for (const sx of [-1, 1]) {
    const pier = box(0.9, 3.4, 0.9, M.stoneStrong);
    pier.position.set(sx * (gap + 0.45), 1.7, hz);
    g.add(pier);

    const pcap = box(1.1, 0.2, 1.1, M.stoneLight, false);
    pcap.position.set(sx * (gap + 0.45), 3.45, hz);
    g.add(pcap);
  }

  // 敞开的院门：两扇大木门向外张开
  for (const sx of [-1, 1]) {
    const leaf = box(2.5, 3.0, 0.16, M.wood);
    leaf.position.set(sx * (gap + 1.3), 1.5, hz + 0.7);
    leaf.rotation.y = sx * 1.0;
    g.add(leaf);

    for (const by of [0.65, 2.45]) {
      const band = box(2.3, 0.12, 0.06, M.iron, false);
      band.position.set(sx * (gap + 1.3), by, hz + 0.78);
      band.rotation.y = sx * 1.0;
      g.add(band);
    }
  }

  // 门口挂的灯笼（夜里点亮，由 main.js 处理）
  return g;
}

/* ============================================================
 *  马厩：敞开的长棚 + 隔栏 + 草料槽
 * ========================================================== */
function buildStable(M) {
  const g = new THREE.Group();
  const W = 10.5, D = 5.0, H = 3.1;

  // 后墙
  const back = box(W, H, 0.35, M.wood);
  back.position.set(0, H / 2, -D / 2);
  g.add(back);

  // 侧墙
  for (const sx of [-1, 1]) {
    const side = box(0.35, H, D, M.wood);
    side.position.set(sx * W / 2, H / 2, 0);
    g.add(side);
  }

  // 前排的柱子
  for (let i = 0; i <= 4; i++) {
    const p = box(0.24, H, 0.24, M.woodDark);
    p.position.set(-W / 2 + (i / 4) * W, H / 2, D / 2);
    g.add(p);
  }

  // 单坡顶
  const roof = box(W + 1.0, 0.16, D + 1.4, M.thatch);
  roof.position.set(0, H + 0.5, 0.1);
  roof.rotation.x = -0.14;
  g.add(roof);

  // 屋脊横梁
  const beam = box(W + 0.6, 0.18, 0.18, M.woodDark);
  beam.position.set(0, H + 0.02, D / 2);
  g.add(beam);

  // 隔栏：四个栏位
  for (let i = 0; i <= 4; i++) {
    const div = box(0.16, 1.5, D - 0.4, M.wood);
    div.position.set(-W / 2 + (i / 4) * W, 0.75, 0);
    g.add(div);
  }

  // 每个栏位里的草料槽
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + (i + 0.5) * (W / 4);
    const trough = box(1.0, 0.42, 0.7, M.woodDark);
    trough.position.set(x, 0.21, -D / 2 + 0.9);
    g.add(trough);

    const hay = box(0.9, 0.2, 0.6, solid(0xb59a54, { roughness: 1, flatShading: true }), false);
    hay.position.set(x, 0.46, -D / 2 + 0.9);
    g.add(hay);
  }

  // 挂着的挽具
  const harness = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 4, 12), M.leather ?? M.woodDark);
  harness.position.set(-W / 2 + 1.2, 1.9, -D / 2 + 0.25);
  g.add(harness);

  return g;
}

/* ============================================================
 *  院子里的附属：水井、草料棚、猪圈、拴马桩
 * ========================================================== */
function buildWell(M) {
  const g = new THREE.Group();

  const wall = cyl(0.95, 1.05, 0.9, 12, M.stoneStrong);
  wall.position.y = 0.45;
  g.add(wall);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 5, 14), M.stoneLight);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.9;
  g.add(rim);

  // 井架
  for (const sx of [-1, 1]) {
    const post = box(0.16, 2.0, 0.16, M.wood);
    post.position.set(sx * 0.85, 1.0, 0);
    g.add(post);
  }
  const axle = cyl(0.07, 0.07, 1.9, 6, M.woodDark);
  axle.rotation.z = Math.PI / 2;
  axle.position.y = 1.95;
  g.add(axle);

  // 摇柄
  const crank = box(0.06, 0.06, 0.5, M.iron, false);
  crank.position.set(1.0, 1.95, 0.25);
  g.add(crank);

  // 吊桶
  const rope = cyl(0.018, 0.018, 0.9, 4, solid(0x8a7a55), false);
  rope.position.y = 1.45;
  g.add(rope);

  const bucket = cyl(0.16, 0.13, 0.26, 8, M.woodDark);
  bucket.position.y = 0.95;
  g.add(bucket);

  // 茅草顶
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.0, 8), M.thatch);
  roof.position.y = 2.6;
  roof.castShadow = true;
  g.add(roof);

  return g;
}

function buildHayShed(M) {
  const g = new THREE.Group();
  const W = 5.6, D = 3.8, H = 2.8;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = box(0.22, H, 0.22, M.woodDark);
      p.position.set(sx * W / 2, H / 2, sz * D / 2);
      g.add(p);
    }
  }

  // 后墙与侧墙
  const back = box(W, H, 0.2, M.wood);
  back.position.set(0, H / 2, -D / 2);
  g.add(back);

  // 顶
  const roof = box(W + 1.0, 0.16, D + 1.0, M.thatch);
  roof.position.y = H + 0.25;
  roof.rotation.x = -0.12;
  g.add(roof);

  // 草垛
  for (const [x, z, s] of [[-1.8, 0.3, 1.0], [1.4, -0.5, 0.85], [0.3, 0.9, 0.7]]) {
    const hay = cyl(0.85 * s, 1.0 * s, 0.9 * s, 8, solid(0xb59a54, { roughness: 1, flatShading: true }));
    hay.position.set(x, 0.45 * s, z);
    hay.castShadow = true;
    g.add(hay);
  }

  return g;
}

function buildPigPen(M) {
  const g = new THREE.Group();
  const W = 6, D = 4;

  // 矮石墙
  for (const [cx, cz, w, d] of [
    [0, -D / 2, W, 0.4], [0, D / 2, W, 0.4],
    [-W / 2, 0, 0.4, D], [W / 2, 0, 0.4, D],
  ]) {
    const wall = box(w, 0.85, d, M.stone);
    wall.position.set(cx, 0.42, cz);
    g.add(wall);
  }

  // 泥地
  const mud = box(W - 0.4, 0.1, D - 0.4, solid(0x4a3c2a, { roughness: 1 }), false);
  mud.position.y = 0.2;
  g.add(mud);

  // 木槽
  const trough = box(1.6, 0.3, 0.45, M.woodDark);
  trough.position.set(-W / 2 + 1.2, 0.3, D / 2 - 0.7);
  g.add(trough);

  // 小猪：三团粉褐色的椭圆
  const pigMat = solid(0xd6a08a, { roughness: 1, flatShading: true });
  for (const [x, z, s] of [[0.6, -0.5, 1.0], [1.9, 0.6, 0.8], [-1.2, 0.2, 0.9]]) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 7, 5), pigMat);
    body.scale.set(1.3, 0.85, 0.85);
    body.position.set(x, 0.5, z);
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 6, 5), pigMat);
    head.position.set(x + 0.5 * s, 0.46, z);
    head.castShadow = true;
    g.add(head);

    for (const [lx, lz] of [[-0.25, -0.2], [0.28, -0.2], [-0.25, 0.2], [0.28, 0.2]]) {
      const leg = cyl(0.06, 0.06, 0.3, 5, pigMat, false);
      leg.position.set(x + lx, 0.22, z + lz);
      g.add(leg);
    }
  }

  return g;
}

function buildHitchRail(M) {
  const g = new THREE.Group();

  for (const sx of [-1, 1]) {
    const p = cyl(0.09, 0.11, 1.5, 6, M.wood);
    p.position.set(sx * 2.6, 0.75, 0);
    g.add(p);
  }
  const rail = box(5.6, 0.13, 0.13, M.wood);
  rail.position.y = 1.42;
  g.add(rail);

  // 拴着的两匹马（简化：身+头+四腿）
  const horseMat = solid(0x6b4a33, { roughness: 1, flatShading: true });
  for (const [hx, s] of [[-1.5, 1.0], [1.4, 0.9]]) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 7, 5), horseMat);
    body.scale.set(1.5, 0.9, 0.8);
    body.position.set(hx, 1.15, 0.5);
    body.castShadow = true;
    g.add(body);

    const neck = box(0.22, 0.8, 0.24, horseMat);
    neck.position.set(hx + 0.75 * s, 1.55, 0.5);
    neck.rotation.z = -0.4 * s;
    g.add(neck);

    const head = box(0.28, 0.34, 0.22, horseMat);
    head.position.set(hx + 1.02 * s, 1.95, 0.5);
    head.rotation.z = -0.5 * s;
    g.add(head);

    for (const [lx, lz] of [[-0.5, -0.24], [0.5, -0.24], [-0.5, 0.24], [0.5, 0.24]]) {
      const leg = cyl(0.075, 0.06, 1.0, 5, horseMat, false);
      leg.position.set(hx + lx, 0.5, 0.5 + lz);
      g.add(leg);
    }
  }

  return g;
}

/* ============================================================
 *  客栈内的旅人：柜台、桌凳与酒桶
 * ========================================================== */
function buildYardClutter(M) {
  const g = new THREE.Group();

  // 靠墙的桶与箱
  for (const [x, z, s] of [[-12.5, 8, 1.0], [-12.5, 6.8, 0.8], [-11.2, 8.1, 0.85]]) {
    const b = cyl(0.38 * s, 0.34 * s, 0.85 * s, 10, M.woodDark);
    b.position.set(x, 0.45 * s, z);
    g.add(b);

    for (const by of [0.25, 0.62]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.37 * s, 0.03, 4, 12), M.iron);
      band.rotation.x = Math.PI / 2;
      band.position.set(x, by * s, z);
      g.add(band);
    }
  }

  for (const [x, z, r] of [[-10.5, 9.2, 0.4], [-9.2, 8.4, -0.7]]) {
    const crate = box(0.85, 0.75, 0.85, M.wood);
    crate.position.set(x, 0.38, z);
    crate.rotation.y = r;
    g.add(crate);
  }

  // 院子里的晾衣绳：一件披风、两条麻布
  const line = box(0.035, 0.035, 8.5, solid(0x8a7a55), false);
  line.position.set(9.8, 2.3, -2);
  line.rotation.y = Math.PI / 2;
  g.add(line);

  for (const [lz, w, h, col] of [[-5, 1.2, 1.6, 0x7d1c22], [-1.5, 0.9, 1.3, 0xd9cdb6], [2.2, 1.0, 1.0, 0x8a7a55]]) {
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      solid(col, { side: THREE.DoubleSide })
    );
    cloth.position.set(9.8, 2.3 - h / 2, lz);
    cloth.rotation.y = Math.PI / 2;
    cloth.castShadow = true;
    g.add(cloth);
  }

  return g;
}

/* ============================================================
 *  组装：整座客栈
 *  本地坐标：主楼朝 +Z（临街），车马院在其后
 * ========================================================== */
export function makeInn(M) {
  const g = new THREE.Group();

  // 主楼
  const house = buildMainHouse(M);
  house.position.set(0, 0, 0);
  g.add(house);

  // 主楼屋顶与二层出挑到 z ≈ 5.4，院子紧贴其后，中间不留空当
  const HY = 5.2;
  const HZ = 9.6;
  const HX = 12.6;

  // 车马院
  const yard = buildYard(M, { hx: HX, hz: HZ });
  yard.position.set(0, 0, HY + HZ);
  g.add(yard);

  const YZ = HY + HZ;   // 院子中心的本地下 z

  // 马厩：院子西侧，开口朝东（进深 5.2，贴西墙）
  const stable = buildStable(M);
  stable.position.set(-HX + 3.0, 0, YZ - 1.0);
  stable.rotation.y = Math.PI / 2;
  g.add(stable);

  // 草料棚：院子北墙中间（棚顶外挑 0.7，留出院墙）
  const hay = buildHayShed(M);
  hay.position.set(-1.5, 0, YZ + HZ - 3.4);
  g.add(hay);

  // 水井：院子中部偏东
  const well = buildWell(M);
  well.position.set(4.6, 0, YZ - 0.4);
  g.add(well);

  // 猪圈：院子东北角
  const pen = buildPigPen(M);
  pen.position.set(8.2, 0, YZ + HZ - 3.2);
  g.add(pen);

  // 拴马桩：院子东侧
  const rail = buildHitchRail(M);
  rail.position.set(HX - 1.4, 0, YZ - 3.2);
  rail.rotation.y = -Math.PI / 2;
  g.add(rail);

  // 杂物
  const clutter = buildYardClutter(M);
  clutter.position.set(0, 0, YZ);
  g.add(clutter);

  // 主楼门口的两只木桶
  for (const sx of [-3.4, 3.4]) {
    const barrel = cyl(0.34, 0.3, 0.78, 10, M.woodDark);
    barrel.position.set(sx, 0.4, 5.4);
    g.add(barrel);
  }

  g.userData.house = house;
  g.userData.yard = yard;
  g.userData.stable = stable;
  // 主楼里的灯火位置（本地）
  g.userData.lampSpots = [
    new THREE.Vector3(-3.6, 2.6, 6.2),
    new THREE.Vector3(3.6, 2.6, 6.2),
    new THREE.Vector3(0, 2.4, HY + 3),
  ];
  return g;
}
