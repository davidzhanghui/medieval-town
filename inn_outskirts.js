/**
 * inn_outskirts.js —— 客栈外围的五处
 *
 * 一条驿道会把人留在路边：渡口、路边的神龛、篝火营地、
 * 拴着货车的货栈，以及一处曾经有村子的荒村。
 * 构件用主场景传入的材质 M（townMaterials），与 inn.js 同一套约定。
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

// 同色同参数共用一份材质，compactGroup 才能把散落的碎石合并成一次绘制
const _solidCache = new Map();
function solid(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  let m = _solidCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 1, ...opts });
    _solidCache.set(key, m);
  }
  return m;
}

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

function ridgeRoof(len, depth, h, mat) {
  const m = gable(depth, len, h, mat);
  m.rotation.y = Math.PI / 2;
  return m;
}

const CLOTH = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide });
const GRASS = new THREE.MeshStandardMaterial({ color: 0x7f9a58, roughness: 1 });

/** 沿折线生成一条带状水面（与 industry.js 的 ribbon 同思路，简化版） */
function ribbon(pts, width, y, mat) {
  const verts = [];
  const uvs = [];
  const idx = [];
  const half = width / 2;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;

    verts.push(p[0] + nx * half, y, p[1] + nz * half);
    verts.push(p[0] - nx * half, y, p[1] - nz * half);
    uvs.push(0, i * 0.5, 1, i * 0.5);

    if (i < pts.length - 1) {
      // 逆时针绕向，法线朝 +Y，否则水面会被背面剔除
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

/* ============================================================
 *  1. 渡口：一座木栈桥、一条渡船、一间渡口小屋
 * ========================================================== */
export function makeFerryCrossing(M) {
  const g = new THREE.Group();

  // 河面：一条自北向南的宽河
  const RIVER = [
    [-4, -26], [-3.2, -18], [-2.4, -9], [-1.8, 0], [-1.0, 9], [0.4, 18], [2.2, 26],
  ];
  {
    const bed = ribbon(RIVER, 13.0, 0.02, M.soilBorder);
    bed.position.y = 0.02;
    g.add(bed);

    const water = ribbon(RIVER, 11.0, 0.09, M.water);
    water.position.y = 0.09;
    g.add(water);
  }

  /* ---- 木栈桥：从西岸伸进河里 ---- */
  {
    const Y = 1.15;
    const DECK_W = 3.0;
    const LEN = 9.0;

    // 桥面：一根根横铺的板
    for (let i = 0; i < 12; i++) {
      const plank = box(0.62, 0.12, DECK_W, M.wood);
      plank.position.set(-8.6 + i * 0.72, Y, 1.2);
      plank.rotation.z = 0;
      g.add(plank);
    }

    // 两侧纵梁
    for (const sz of [-1, 1]) {
      const beam = box(LEN, 0.2, 0.22, M.woodDark);
      beam.position.set(-8.6 + (11 * 0.72) / 2, Y - 0.16, 1.2 + sz * (DECK_W / 2 - 0.15));
      g.add(beam);
    }

    // 桥桩：每隔三块板打一对入水的桩
    for (let i = 0; i < 4; i++) {
      const x = -8.2 + i * 2.9;
      for (const sz of [-1, 1]) {
        const pile = cyl(0.14, 0.17, 3.4, 6, M.woodDark);
        pile.position.set(x, Y - 1.9, 1.2 + sz * (DECK_W / 2 - 0.1));
        g.add(pile);
      }
      // 斜撑
      for (const sz of [-1, 1]) {
        const brace = box(0.12, 0.12, 1.3, M.wood, false);
        brace.position.set(x, Y - 0.7, 1.2 + sz * (DECK_W / 2 + 0.4));
        brace.rotation.x = sz * 0.7;
        g.add(brace);
      }
    }

    // 桥头的两根系船柱
    for (const sz of [-1, 1]) {
      const bollard = cyl(0.13, 0.16, 1.1, 8, M.woodDark);
      bollard.position.set(-3.0, Y + 0.3, 1.2 + sz * (DECK_W / 2 + 0.2));
      g.add(bollard);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), M.woodDark);
      cap.position.set(-3.0, Y + 0.88, 1.2 + sz * (DECK_W / 2 + 0.2));
      g.add(cap);
    }

    // 桥面尽头的木阶：从岸上下来
    for (let i = 0; i < 3; i++) {
      const st = box(2.6, 0.22, 0.5, M.wood);
      st.position.set(-9.6 - i * 0.5, 0.9 - i * 0.3, 1.2);
      g.add(st);
    }
  }

  /* ---- 渡船：平底船 + 一根撑篙 + 船尾的舵桨 ---- */
  {
    const boat = new THREE.Group();

    // 船底与船舷
    const hull = box(4.6, 0.5, 1.9, M.wood);
    hull.position.y = 0.25;
    boat.add(hull);

    for (const sz of [-1, 1]) {
      const side = box(4.6, 0.45, 0.12, M.woodDark);
      side.position.set(0, 0.6, sz * 0.95);
      boat.add(side);
    }
    for (const sx of [-1, 1]) {
      // 船头船尾收窄
      const end = box(0.12, 0.45, 1.9, M.woodDark);
      end.position.set(sx * 2.3, 0.6, 0);
      boat.add(end);
    }

    // 两条横座板
    for (const x of [-1.0, 1.0]) {
      const seat = box(0.34, 0.1, 1.7, M.wood);
      seat.position.set(x, 0.82, 0);
      boat.add(seat);
    }

    // 船尾的舵桨
    const oar = cyl(0.06, 0.06, 3.4, 6, M.wood);
    oar.position.set(-2.0, 1.4, 0.5);
    oar.rotation.z = 0.35;
    boat.add(oar);
    const blade = box(0.1, 0.8, 0.5, M.wood);
    blade.position.set(-2.6, 0.05, 0.5);
    boat.add(blade);

    // 船头的灯杆
    const lampPost = cyl(0.04, 0.05, 1.4, 5, M.iron);
    lampPost.position.set(1.9, 1.4, 0);
    boat.add(lampPost);
    const lantern = box(0.2, 0.26, 0.2, M.lanternGlass, false);
    lantern.position.set(1.9, 2.05, 0);
    lantern.userData.keepSeparate = true;
    boat.add(lantern);

    boat.position.set(-5.4, 0.1, 2.2);
    boat.rotation.y = 0.06;
    g.add(boat);
    g.userData.boat = boat;

    // 船头灯笼的光晕：main.js 会把它接到 lampHaloes 里
    g.userData.lanternPos = new THREE.Vector3(-3.6, 2.15, 2.2);
    g.userData.lanternAt = new THREE.Vector3(-3.6, 2.15, 2.2);
  }

  /* ---- 渡口小屋：一间石屋 + 檐下的长凳 ---- */
  {
    const W = 5.0, D = 4.2, H = 3.0, BX = -15.0, BZ = -2.0;

    const plinth = box(W + 0.4, 0.3, D + 0.4, M.stone);
    plinth.position.set(BX, 0.15, BZ);
    g.add(plinth);

    const wall = box(W, H, D, M.stoneStrong);
    wall.position.set(BX, 0.3 + H / 2, BZ);
    g.add(wall);

    const roof = ridgeRoof(W + 0.8, D + 0.8, 1.9, M.thatch);
    roof.position.set(BX, 0.3 + H, BZ);
    g.add(roof);

    // 门与窗
    const door = box(1.0, 2.1, 0.14, M.wood);
    door.position.set(BX, 0.3 + 1.05, BZ + D / 2 + 0.03);
    g.add(door);

    const win = box(0.7, 0.7, 0.12, M.window, false);
    win.position.set(BX + 1.6, 0.3 + 1.9, BZ + D / 2 + 0.03);
    g.add(win);

    // 檐下的长凳
    const bench = box(2.6, 0.14, 0.45, M.wood);
    bench.position.set(BX + 0.2, 0.52, BZ + D / 2 + 0.6);
    g.add(bench);
    for (const sx of [-1.0, 1.0]) {
      const leg = box(0.14, 0.46, 0.36, M.woodDark);
      leg.position.set(BX + 0.2 + sx, 0.23, BZ + D / 2 + 0.6);
      g.add(leg);
    }

    // 檐下挂的救生圈（一圈草绳）
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 5, 14), M.rope);
    ring.position.set(BX - 1.6, 2.0, BZ + D / 2 + 0.1);
    g.add(ring);

    // 门口堆的绳子与木桶
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 4, 12), M.rope);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(BX + 1.8, 0.14, BZ + D / 2 + 1.2);
    g.add(coil);

    const barrel = cyl(0.3, 0.27, 0.7, 10, M.woodDark);
    barrel.position.set(BX - 1.9, 0.35, BZ + D / 2 + 1.0);
    g.add(barrel);
  }

  /* ---- 河岸：石阶、木桩、一丛芦苇 ---- */
  {
    for (const sz of [-1, 1]) {
      const bankWall = box(13, 0.7, 0.8, M.stone);
      bankWall.position.set(-1.0, 0.3, 1.2 + sz * 6.8);
      g.add(bankWall);
    }

    // 芦苇
    for (let i = 0; i < 26; i++) {
      const t = Math.random();
      const x = -3 + t * 8;
      const sz = Math.random() > 0.5 ? 1 : -1;
      const z = 1.2 + sz * (5.2 + Math.random() * 1.0);

      const stem = cyl(0.015, 0.025, 1.2 + Math.random() * 0.5, 4, M.reed, false);
      stem.position.set(x, 0.6, z);
      stem.rotation.z = (Math.random() - 0.5) * 0.3;
      g.add(stem);
    }
  }

  /* ---- 对岸的系船桩与一条小径 ---- */
  {
    for (const sz of [-0.6, 1.6]) {
      const post = cyl(0.11, 0.13, 1.2, 6, M.woodDark);
      post.position.set(5.6, 0.5, sz);
      g.add(post);
    }

    const path = box(3.0, 0.07, 10, solid(0xd0bf9c, { roughness: 1 }), false);
    path.position.set(6.4, 0.04, 12.0);
    path.rotation.y = -0.2;
    g.add(path);
  }

  return g;
}

/* ============================================================
 *  2. 路边神龛：一座小石龛 + 祈祷台阶 + 还愿物
 * ========================================================== */
export function makeRoadsideShrine(M) {
  const g = new THREE.Group();

  /* ---- 台基与三级台阶 ---- */
  {
    const base = box(5.2, 0.4, 4.4, M.stone);
    base.position.y = 0.2;
    g.add(base);

    for (let i = 0; i < 3; i++) {
      const st = box(3.8, 0.26, 0.5, M.stoneLight);
      st.position.set(0, 0.13 + i * 0.26, 2.2 + (2 - i) * 0.5);
      g.add(st);
    }
  }

  /* ---- 龛身：一间开着券门的小石屋 ---- */
  {
    const W = 3.2, H = 2.6, D = 2.0;

    for (const sx of [-1, 1]) {
      const side = box(0.5, H, D, M.stoneStrong);
      side.position.set(sx * (W / 2 - 0.25), 0.4 + H / 2, 0);
      g.add(side);
    }

    const back = box(W, H, 0.45, M.stoneStrong);
    back.position.set(0, 0.4 + H / 2, -D / 2 + 0.22);
    g.add(back);

    // 前脸：两侧墙垛 + 上方的券
    for (const sx of [-1, 1]) {
      const pier = box(0.62, H, 0.45, M.stoneStrong);
      pier.position.set(sx * (W / 2 - 0.31), 0.4 + H / 2, D / 2 - 0.22);
      g.add(pier);
    }
    const head = box(W, 0.9, 0.45, M.stoneStrong);
    head.position.set(0, 0.4 + H - 0.45, D / 2 - 0.22);
    g.add(head);

    // 券：半圆
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.14, 5, 16, Math.PI), M.stoneLight);
    arch.position.set(0, 0.4 + H - 0.9, D / 2 - 0.2);
    arch.castShadow = true;
    g.add(arch);

    // 龛内的暗处与烛台
    const dark = box(W - 1.0, H - 0.2, 0.2, solid(0x1b1712, { roughness: 1 }), false);
    dark.position.set(0, 0.4 + (H - 0.2) / 2, -D / 2 + 0.45);
    g.add(dark);

    // 龛内的像：一件披风的轮廓 + 头
    const figure = cyl(0.24, 0.4, 1.2, 9, M.linen);
    figure.position.set(0, 0.4 + 0.6, -D / 2 + 0.5);
    g.add(figure);
    const figureHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 9, 7), solid(0xd9c0a0));
    figureHead.position.set(0, 0.4 + 1.4, -D / 2 + 0.5);
    g.add(figureHead);

    // 像前的两只小烛台
    for (const sx of [-0.55, 0.55]) {
      const candlePost = cyl(0.05, 0.07, 0.4, 6, M.iron, false);
      candlePost.position.set(sx, 0.4 + 0.2, -D / 2 + 0.75);
      g.add(candlePost);
      const candle = cyl(0.05, 0.05, 0.24, 6, solid(0xe4dcc8), false);
      candle.position.set(sx, 0.4 + 0.52, -D / 2 + 0.75);
      g.add(candle);
    }

    /* ---- 屋顶：小山墙顶 + 十字 ---- */
    const roof = gable(W + 0.5, D + 0.4, 1.2, M.slate);
    roof.position.y = 0.4 + H;
    roof.rotation.y = Math.PI / 2;
    g.add(roof);

    // 山墙封檐
    for (const sz of [-1, 1]) {
      const barge = box(W + 0.6, 0.14, 0.16, M.stoneLight);
      barge.position.set(0, 0.4 + H + 0.6, sz * (D + 0.4) / 2);
      g.add(barge);
    }

    const c1 = box(0.08, 0.7, 0.08, M.iron, false);
    c1.position.set(0, 0.4 + H + 1.55, 0);
    g.add(c1);
    const c2 = box(0.42, 0.08, 0.08, M.iron, false);
    c2.position.set(0, 0.4 + H + 1.72, 0);
    g.add(c2);
  }

  /* ---- 两侧的石栏与还愿牌 ---- */
  {
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const post = box(0.16, 0.9, 0.16, M.stoneLight);
        post.position.set(sx * 2.3, 0.45, -1.4 + i * 1.4);
        g.add(post);
      }
      const rail = box(0.1, 0.1, 3.2, M.stoneLight);
      rail.position.set(sx * 2.3, 0.86, -0.4);
      g.add(rail);
    }

    // 挂在栏杆上的小木牌
    for (let i = 0; i < 5; i++) {
      const sx = i % 2 ? 1 : -1;
      const plate = box(0.26, 0.34, 0.05, M.wood, false);
      plate.position.set(sx * 2.26, 0.62, -1.0 + i * 0.55);
      g.add(plate);
    }
  }

  /* ---- 一棵围着石圈的树 + 地上的蜡烛头 ---- */
  {
    const TX = 4.6, TZ = -1.6;

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.18, 0),
        solid(0x8a8274, { roughness: 1, flatShading: true })
      );
      st.position.set(TX + Math.cos(a) * 1.4, 0.12, TZ + Math.sin(a) * 1.4);
      g.add(st);
    }

    const trunk = cyl(0.24, 0.34, 3.4, 7, solid(0x4a3423, { roughness: 1 }));
    trunk.position.set(TX, 1.7, TZ);
    g.add(trunk);

    // 树冠：三团叠叶
    for (const [ox, oy, oz, r] of [[0, 4.4, 0, 1.9], [0.9, 3.9, 0.4, 1.3], [-0.8, 4.0, -0.5, 1.2]]) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(r, 9, 7),
        new THREE.MeshStandardMaterial({ color: 0x4a6b38, roughness: 1, flatShading: true })
      );
      leaf.position.set(TX + ox, oy, TZ + oz);
      leaf.castShadow = true;
      g.add(leaf);
    }

    // 树枝上挂的布条
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      const rag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.5 + (i % 3) * 0.15),
        CLOTH([0xd9cdb6, 0xb5452f, 0x4a6c8c][i % 3])
      );
      rag.position.set(TX + Math.cos(a) * 1.1, 3.4 + (i % 3) * 0.16, TZ + Math.sin(a) * 1.1);
      rag.rotation.y = a;
      g.add(rag);
    }

    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.8 + Math.random() * 2.0;
      const candle = cyl(0.045, 0.05, 0.16 + Math.random() * 0.14, 6, solid(0xe4dcc8), false);
      candle.position.set(Math.cos(a) * r, 0.14, Math.sin(a) * r);
      candle.rotation.z = (Math.random() - 0.5) * 0.4;
      g.add(candle);
    }
  }

  /* ---- 路边的一段矮石墙，把神龛和驿道隔开 ---- */
  {
    for (let i = 0; i < 4; i++) {
      const seg = box(3.4, 0.75, 0.6, M.stone);
      seg.position.set(-9.5 + i * 3.5, 0.36, 4.4);
      seg.rotation.y = 0.06 * i;
      g.add(seg);
    }
  }

  /* ---- 龛前的跪凳 ---- */
  {
    const step = box(1.8, 0.24, 0.6, M.stoneLight);
    step.position.set(0, 0.55, 2.0);
    g.add(step);

    for (const sx of [-0.7, 0.7]) {
      const leg = box(0.2, 0.44, 0.5, M.stone);
      leg.position.set(sx, 0.22, 2.0);
      g.add(leg);
    }
  }

  return g;
}

/* ============================================================
 *  3. 露营篝火：三顶小帐、一堆篝火、一圈石头凳
 * ========================================================== */
export function makeCampfireCircle(M) {
  const g = new THREE.Group();

  /* ---- 空地 ---- */
  {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(8.5, 20), solid(0x8d8258, { roughness: 1 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.03;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 篝火：石圈、柴堆、火焰 ---- */
  {
    // 石圈
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.24 + Math.random() * 0.06, 0),
        solid(0x6e6a5e, { roughness: 1, flatShading: true })
      );
      st.position.set(Math.cos(a) * 1.05, 0.13, Math.sin(a) * 1.05);
      st.rotation.set(Math.random(), Math.random(), Math.random());
      st.castShadow = true;
      g.add(st);
    }

    // 灰烬
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14), solid(0x3a352c, { roughness: 1 }));
    ash.rotation.x = -Math.PI / 2;
    ash.position.y = 0.06;
    g.add(ash);

    // 柴：几根交叠的圆木
    const LOGS = [
      [0, 0.16, 0.2, 0.5], [0.18, 0.15, -0.12, -0.9],
      [-0.15, 0.14, 0.1, 1.6], [0.05, 0.26, 0.05, 0.1],
    ];
    for (const [x, y, z, r] of LOGS) {
      const log = cyl(0.09, 0.1, 1.5, 6, M.woodDark);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = r;
      log.position.set(x, y, z);
      g.add(log);
    }

    // 炭火
    const ember = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), M.ember);
    ember.rotation.x = -Math.PI / 2;
    ember.position.y = 0.1;
    g.add(ember);

    // 火焰：两片交错的锥
    for (const r of [0, Math.PI / 2]) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 1.1, 6),
        new THREE.MeshBasicMaterial({
          color: 0xff8a2c, transparent: true, opacity: 0.72,
          blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        })
      );
      flame.position.y = 0.6;
      flame.rotation.y = r;
      g.add(flame);
    }
  }

  /* ---- 一圈坐人的石块 ---- */
  {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.25;
      const seat = box(0.9, 0.42, 0.55, M.stone);
      seat.position.set(Math.cos(a) * 2.4, 0.21, Math.sin(a) * 2.4);
      seat.rotation.y = -a + Math.PI / 2;
      g.add(seat);
    }
  }

  /* ---- 三顶小帐：每顶两根斜杆撑一块帆布 ---- */
  {
    const SPOTS = [[-6.0, 2.6, 0.5, 0xd2c6ab], [-5.2, -3.4, -1.6, 0xb8a882], [3.6, -6.0, 2.6, 0xc2b394]];

    for (const [x, z, r, col] of SPOTS) {
      const tent = new THREE.Group();

      // 两根交叉的撑杆
      for (const sx of [-1, 1]) {
        const pole = cyl(0.04, 0.05, 2.4, 5, M.wood);
        pole.position.set(sx * 0.5, 1.1, 0);
        pole.rotation.z = -sx * 0.32;
        tent.add(pole);
      }
      const ridge = cyl(0.04, 0.04, 2.3, 5, M.wood, false);
      ridge.rotation.x = Math.PI / 2;
      ridge.position.y = 2.26;
      tent.add(ridge);

      // 帆布：两片斜面
      for (const sx of [-1, 1]) {
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.9), CLOTH(col));
        sheet.position.set(sx * 0.62, 1.12, 0);
        sheet.rotation.y = Math.PI / 2;
        sheet.rotation.z = sx * 0.55;
        sheet.castShadow = true;
        tent.add(sheet);
      }

      // 帐里的草垫
      const bed = box(1.5, 0.14, 1.0, M.straw, false);
      bed.position.y = 0.08;
      tent.add(bed);

      tent.position.set(x, 0, z);
      tent.rotation.y = r;
      g.add(tent);
    }
  }

  /* ---- 拴马桩 + 一辆小推车 + 柴堆 ---- */
  {
    for (const sz of [-1, 1]) {
      const p = cyl(0.08, 0.1, 1.4, 6, M.woodDark);
      p.position.set(7.0, 0.7, sz * 1.8);
      g.add(p);
    }
    const rail = box(0.12, 0.12, 3.8, M.wood);
    rail.position.set(7.0, 1.32, 0);
    g.add(rail);

    // 柴堆
    for (let i = 0; i < 9; i++) {
      const log = cyl(0.09, 0.1, 1.2, 5, M.woodDark);
      log.rotation.z = Math.PI / 2;
      log.position.set(-7.4, 0.12 + Math.floor(i / 3) * 0.2, -6.0 + (i % 3) * 0.22);
      g.add(log);
    }
  }

  return g;
}

/* ============================================================
 *  4. 货栈：驿道边的一间大仓 + 装卸的月台
 * ========================================================== */
export function makeWaystation(M) {
  const g = new THREE.Group();

  /* ---- 石台基与卸货月台 ---- */
  {
    const base = box(17, 0.5, 11, M.stone);
    base.position.y = 0.25;
    g.add(base);

    // 月台：南侧向前伸出的卸货平台
    const dock = box(13, 0.5, 3.2, M.stoneLight);
    dock.position.set(0, 0.25, 7.0);
    g.add(dock);

    // 上下的两级石阶
    for (let i = 0; i < 2; i++) {
      const st = box(4.0, 0.22, 0.55, M.stoneLight);
      st.position.set(-6.5, 0.11 + i * 0.22, 8.6 + (1 - i) * 0.5);
      g.add(st);
    }
  }

  /* ---- 仓房：木构大屋 ---- */
  {
    const W = 15, D = 8.0, H = 5.0, Y0 = 0.5;

    const wall = box(W, H, D, M.wood);
    wall.position.set(0, Y0 + H / 2, 0);
    g.add(wall);

    // 竖向板缝
    for (const sz of [-1, 1]) {
      for (let i = -9; i <= 9; i++) {
        const strip = box(0.07, H - 0.4, 0.04, M.woodDark, false);
        strip.position.set(i * (W / 19), Y0 + H / 2, sz * (D / 2 + 0.03));
        g.add(strip);
      }
    }

    // 转角柱与上下梁
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = box(0.4, H + 0.3, 0.4, M.beam);
        post.position.set(sx * (W / 2 - 0.1), Y0 + H / 2, sz * (D / 2 - 0.1));
        g.add(post);
      }
    }
    for (const sz of [-1, 1]) {
      const rail = box(W + 0.3, 0.24, 0.16, M.beam);
      rail.position.set(0, Y0 + H - 0.2, sz * (D / 2 + 0.05));
      g.add(rail);
    }

    // 屋顶：大坡度的瓦顶
    const roof = ridgeRoof(W + 2.0, D + 2.0, 3.6, M.tile);
    roof.position.y = Y0 + H;
    g.add(roof);

    const ridge = box(W + 2.2, 0.26, 0.34, M.woodDark);
    ridge.position.y = Y0 + H + 3.55;
    g.add(ridge);

    // 正面三扇大门（便于装卸）
    for (const sx of [-4.6, 0, 4.6]) {
      const door = box(3.4, 4.0, 0.16, M.woodDark);
      door.position.set(sx, Y0 + 2.0, D / 2 + 0.06);
      g.add(door);

      for (const t of [-1, 1]) {
        const jamb = box(0.22, 4.2, 0.24, M.beam);
        jamb.position.set(sx + t * 1.8, Y0 + 2.0, D / 2 + 0.1);
        g.add(jamb);
      }
      const lintel = box(3.8, 0.3, 0.28, M.beam);
      lintel.position.set(sx, Y0 + 4.15, D / 2 + 0.1);
      g.add(lintel);
    }

    // 挂在外墙上的招牌
    const sign = box(2.4, 0.8, 0.1, M.woodDark);
    sign.position.set(-6.2, Y0 + H - 0.5, D / 2 + 0.12);
    g.add(sign);

    const arm = box(0.1, 0.1, 1.2, M.iron, false);
    arm.position.set(-6.2, Y0 + H + 0.1, D / 2 + 0.6);
    g.add(arm);
  }

  /* ---- 月台上的货：木桶、箱、麻袋、一吊咸鱼 ---- */
  {
    const Y = 0.5;

    // 木桶
    for (const [x, z, s] of [[-5.4, 7.0, 1.0], [-4.4, 7.8, 0.85], [-5.9, 8.1, 0.7]]) {
      const barrel = cyl(0.36 * s, 0.32 * s, 0.86 * s, 10, M.woodDark);
      barrel.position.set(x, Y + 0.43 * s, z);
      g.add(barrel);

      for (const by of [0.24, 0.62]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.35 * s, 0.03, 4, 12), M.iron);
        band.rotation.x = Math.PI / 2;
        band.position.set(x, Y + by * s, z);
        g.add(band);
      }
    }

    // 板条箱
    for (const [x, z, r] of [[-1.6, 7.2, 0.3], [-0.6, 8.0, -0.5], [2.4, 7.4, 0.8]]) {
      const crate = box(0.9, 0.8, 0.9, M.wood);
      crate.position.set(x, Y + 0.4, z);
      crate.rotation.y = r;
      g.add(crate);
    }

    // 麻袋
    for (let i = 0; i < 5; i++) {
      const sack = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 7, 5),
        solid(i % 2 ? 0xb9a578 : 0xa89462, { roughness: 1, flatShading: true })
      );
      sack.scale.set(1, 1.3, 0.8);
      sack.position.set(4.2 + (i % 3) * 0.8, Y + 0.5, 7.4 + Math.floor(i / 3) * 0.7);
      sack.castShadow = true;
      g.add(sack);
    }

    // 吊着的一挂咸鱼
    const rope = cyl(0.02, 0.02, 0.7, 4, M.rope, false);
    rope.position.set(6.4, Y + 4.0, 6.6);
    g.add(rope);
    for (let i = 0; i < 4; i++) {
      const fish = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 6, 5),
        solid(0x8a8f94, { roughness: 0.6, metalness: 0.2, flatShading: true })
      );
      fish.scale.set(2.0, 0.55, 0.8);
      fish.position.set(6.4, Y + 3.6 - i * 0.24, 6.6);
      g.add(fish);
    }
  }

  /* ---- 停在月台前的货车（两辆） ---- */
  {
    for (const [x, z, r] of [[-6.4, 11.0, 0.12], [3.8, 11.6, -0.18]]) {
      const cart = new THREE.Group();

      const bed = box(4.0, 0.16, 1.9, M.wood);
      bed.position.y = 0.95;
      cart.add(bed);

      for (const sz of [-1, 1]) {
        const side = box(4.0, 0.6, 0.1, M.woodDark);
        side.position.set(0, 1.33, sz * 0.9);
        cart.add(side);
      }

      // 车轮
      for (const sx of [-1.3, 1.3]) {
        for (const sz of [-1, 1]) {
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.09, 5, 16), M.timber);
          wheel.position.set(sx, 0.75, sz * 0.95);
          wheel.castShadow = true;
          cart.add(wheel);

          for (let k = 0; k < 3; k++) {
            const spoke = box(1.4, 0.06, 0.06, M.timber, false);
            spoke.position.set(sx, 0.75, sz * 0.95);
            spoke.rotation.z = (k / 3) * Math.PI;
            cart.add(spoke);
          }
        }
      }

      // 车辕
      for (const sz of [-1, 1]) {
        const shaft = cyl(0.07, 0.08, 2.4, 6, M.woodDark);
        shaft.position.set(3.0, 0.85, sz * 0.6);
        shaft.rotation.z = Math.PI / 2 - 0.08;
        cart.add(shaft);
      }

      // 车上的货
      const load = box(3.0, 0.9, 1.5, solid(0xb9a578, { roughness: 1, flatShading: true }));
      load.position.set(-0.3, 1.5, 0);
      cart.add(load);

      cart.position.set(x, 0, z);
      cart.rotation.y = r;
      g.add(cart);
    }
  }

  /* ---- 门口的拴马环与一盏铁灯 ---- */
  {
    for (const sx of [-7.6, 7.6]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 4, 10), M.iron);
      ring.position.set(sx, 1.7, 4.2);
      g.add(ring);
    }

    const post = cyl(0.06, 0.08, 2.8, 6, M.iron);
    post.position.set(7.9, 1.4, 5.6);
    g.add(post);

    const arm = box(0.7, 0.07, 0.07, M.iron, false);
    arm.position.set(7.55, 2.7, 5.6);
    g.add(arm);

    const glass = box(0.2, 0.28, 0.2, M.lanternGlass, false);
    glass.position.set(7.25, 2.52, 5.6);
    glass.userData.keepSeparate = true;
    g.add(glass);

    g.userData.lampSpots = [new THREE.Vector3(7.25, 2.52, 5.6)];
  }

  return g;
}

/* ============================================================
 *  5. 荒村：被遗弃的一小片村舍
 * ========================================================== */
export function makeAbandonedHamlet(M) {
  const g = new THREE.Group();

  /* ---- 场地：不再铺一整块圆盘（会像贴了张色纸），
   *      只在每幢房子脚下留一小片被踩秃的土 ---- */
  {
    const PATCHES = [[-8.0, -2.0, 4.4], [4.5, 3.0, 3.8], [-2.0, -9.5, 4.0],
      [1.0, -3.0, 3.4], [-0.5, 5.5, 3.0]];
    // 土斑用和草地相近的暗绿褐：草皮被踩秃了，不是铺了一块土
    for (const [x, z, r] of PATCHES) {
      const halo = new THREE.Mesh(new THREE.CircleGeometry(r * 1.6, 16),
        solid(0x5d6b3e, { roughness: 1, transparent: true, opacity: 0.5 }));
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(x, 0.028, z);
      halo.receiveShadow = true;
      g.add(halo);

      const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 16),
        solid(0x59613a, { roughness: 1 }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.034, z);
      pad.receiveShadow = true;
      g.add(pad);
    }
  }

  /* ---- 三幢塌了半边的农舍 ---- */
  {
    const HOUSES = [
      { x: -8.0, z: -2.0, r: 0.28, w: 6.2, d: 4.8, h: 3.0, broken: 'roof' },
      { x: 4.5, z: 3.0, r: -0.5, w: 5.4, d: 4.4, h: 2.8, broken: 'wall' },
      { x: -2.0, z: -9.5, r: 1.1, w: 5.8, d: 4.6, h: 2.9, broken: 'ridge' },
    ];

    const RUIN_STONE = new THREE.MeshStandardMaterial({
      map: M.stoneStrong.map, bumpMap: M.stoneStrong.bumpMap, bumpScale: 0.3,
      color: 0x8a8578, roughness: 1,
    });
    const RUIN_PLASTER = new THREE.MeshStandardMaterial({
      map: M.plaster.map, color: 0x8e8a78, roughness: 1,
    });

    for (const hs of HOUSES) {
      const h = new THREE.Group();
      const { w, d, hh } = { w: hs.w, d: hs.d, hh: hs.h };

      // 石基
      const plinth = box(w + 0.4, 0.35, d + 0.4, RUIN_STONE);
      plinth.position.y = 0.18;
      h.add(plinth);

      if (hs.broken === 'wall') {
        // 缺一面墙：只留三面，前墙断成两截
        const back = box(w, hh, 0.4, RUIN_PLASTER);
        back.position.set(0, 0.35 + hh / 2, -d / 2);
        h.add(back);

        for (const sx of [-1, 1]) {
          const side = box(0.4, hh * (sx > 0 ? 1 : 0.62), d, RUIN_PLASTER);
          side.position.set(sx * w / 2, 0.35 + (hh * (sx > 0 ? 1 : 0.62)) / 2, 0);
          h.add(side);
        }

        // 前墙的残段
        const stub = box(w * 0.38, hh * 0.72, 0.4, RUIN_PLASTER);
        stub.position.set(-w * 0.3, 0.35 + hh * 0.36, d / 2);
        h.add(stub);
      } else {
        const wall = box(w, hh, d, RUIN_PLASTER);
        wall.position.y = 0.35 + hh / 2;
        h.add(wall);
      }

      // 墙顶塌落的碎石：在断口上撒一层
      for (let i = 0; i < 14; i++) {
        const rb = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.14 + Math.random() * 0.14, 0),
          RUIN_STONE
        );
        const edge = Math.random();
        let rx, rz;
        if (edge < 0.5) { rx = (Math.random() - 0.5) * w; rz = (Math.random() > 0.5 ? 1 : -1) * (d / 2 + 0.3); }
        else { rx = (Math.random() > 0.5 ? 1 : -1) * (w / 2 + 0.3); rz = (Math.random() - 0.5) * d; }
        rb.position.set(rx, 0.1 + Math.random() * 0.5, rz);
        rb.rotation.set(Math.random(), Math.random(), Math.random());
        rb.castShadow = true;
        h.add(rb);
      }

      // 屋顶
      if (hs.broken === 'roof') {
        // 只剩半边：一片坡瓦
        const half = box(w + 0.7, 0.16, d / 2 + 0.4, M.thatch);
        half.position.set(0, 0.35 + hh + 0.5, -d / 4 - 0.1);
        half.rotation.x = 0.5;
        h.add(half);

        // 支着半片屋顶的一根梁
        const beam = box(0.24, 2.0, 0.24, M.beam);
        beam.position.set(w * 0.2, 0.35 + hh + 0.4, d * 0.15);
        beam.rotation.z = 0.18;
        h.add(beam);
      } else if (hs.broken === 'ridge') {
        // 屋脊塌了中间：两片瓦各歪一边
        for (const sx of [-1, 1]) {
          const slope = box(w / 2 + 0.5, 0.16, d + 1.0, M.thatch);
          slope.position.set(sx * (w / 4), 0.35 + hh + 0.6, 0);
          slope.rotation.z = -sx * 0.42;
          slope.rotation.x = 0.06;
          h.add(slope);
        }
        // 塌下来的椽子
        for (let i = 0; i < 3; i++) {
          const rafter = box(0.14, 0.14, 4.0, M.woodDark);
          rafter.position.set(-1 + i * 1.0, 0.35 + hh - 0.2 + i * 0.1, 0.2);
          rafter.rotation.x = 0.9 + i * 0.1;
          h.add(rafter);
        }
      }

      // 门口的破门框
      if (hs.broken !== 'wall') {
        for (const sx of [-1, 1]) {
          const jamb = box(0.2, 2.0, 0.24, M.beam);
          jamb.position.set(sx * 0.62, 0.35 + 1.0, d / 2 + 0.06);
          h.add(jamb);
        }
        // 半扇歪倒的门板
        const leaf = box(1.1, 1.9, 0.1, M.wood);
        leaf.position.set(-1.4, 0.35 + 0.9, d / 2 + 0.5);
        leaf.rotation.y = 0.9;
        leaf.rotation.z = 0.14;
        h.add(leaf);
      }

      h.position.set(hs.x, 0, hs.z);
      h.rotation.y = hs.r;
      g.add(h);
    }
  }

  /* ---- 一口被木板封起来的井 ---- */
  {
    const IX = 8.0, IZ = -6.0;

    const wall = cyl(0.9, 1.0, 0.9, 12, M.stoneStrong);
    wall.position.set(IX, 0.45, IZ);
    g.add(wall);

    // 封井的木板：两块斜钉的板
    for (const r of [0.3, -0.5]) {
      const plank = box(2.3, 0.12, 0.6, M.woodDark);
      plank.position.set(IX, 0.95, IZ);
      plank.rotation.y = r;
      g.add(plank);
    }

    // 断掉的井架
    const post = box(0.16, 1.8, 0.16, M.wood);
    post.position.set(IX - 0.8, 1.0, IZ);
    post.rotation.z = 0.24;
    g.add(post);
  }

  /* ---- 倒塌的篱笆与杂草 ---- */
  {
    for (let i = 0; i < 22; i++) {
      // 篱笆桩：一部分歪倒
      if (i < 9) {
        const x = -13 + i * 1.5;
        const p = box(0.12, 0.9 + Math.random() * 0.3, 0.12, M.woodDark);
        p.position.set(x, 0.45, 8.5);
        p.rotation.z = (Math.random() - 0.5) * 0.7;
        p.rotation.x = (Math.random() - 0.5) * 0.5;
        g.add(p);
      } else {
        // 杂草：一小团深绿的球
        const a = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * 9;
        const weed = new THREE.Mesh(
          new THREE.SphereGeometry(0.22 + Math.random() * 0.16, 5, 4),
          new THREE.MeshStandardMaterial({
            color: [0x5a6b3a, 0x6e7f4a, 0x4a5a32][i % 3], roughness: 1, flatShading: true,
          })
        );
        weed.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
        weed.scale.y = 0.7;
        g.add(weed);
      }
    }
  }

  /* ---- 一辆被丢下的破车 ---- */
  {
    const cart = new THREE.Group();

    // 车板斜插在土里
    const bed = box(3.0, 0.14, 1.6, M.wood);
    bed.position.set(0, 0.6, 0);
    bed.rotation.z = 0.22;
    cart.add(bed);

    // 一只轮子还立着，一只倒在地上
    const w1 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 5, 14), M.timber);
    w1.position.set(-1.0, 0.62, 0.85);
    cart.add(w1);
    for (let k = 0; k < 3; k++) {
      const spoke = box(1.2, 0.05, 0.05, M.timber, false);
      spoke.position.set(-1.0, 0.62, 0.85);
      spoke.rotation.z = (k / 3) * Math.PI;
      cart.add(spoke);
    }

    const w2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 5, 14), M.timber);
    w2.rotation.x = Math.PI / 2 - 0.15;
    w2.position.set(1.6, 0.09, 0.4);
    cart.add(w2);

    cart.position.set(9.5, 0, 4.0);
    cart.rotation.y = -0.7;
    g.add(cart);
  }

  /* ---- 一株长在屋里的树：荒村最典型的景象 ---- */
  {
    const TX = 4.5, TZ = 3.0;

    const trunk = cyl(0.18, 0.26, 3.2, 6, solid(0x4a3423, { roughness: 1 }));
    trunk.position.set(TX, 1.6, TZ);
    g.add(trunk);

    for (const [ox, oy, oz, r] of [[0, 4.0, 0, 1.5], [0.7, 3.5, 0.3, 1.0], [-0.6, 3.6, -0.4, 0.9]]) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(r, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x3f5c30, roughness: 1, flatShading: true })
      );
      leaf.position.set(TX + ox, oy, TZ + oz);
      leaf.castShadow = true;
      g.add(leaf);
    }
  }

  /* ---- 立在村口的一块石碑：说明这里曾经有过一个村子 ---- */
  {
    const stone = box(0.9, 1.5, 0.3, M.stoneLight);
    stone.position.set(-11.0, 0.75, 10.5);
    stone.rotation.y = 0.3;
    g.add(stone);

    const base = box(1.3, 0.3, 0.6, M.stone);
    base.position.set(-11.0, 0.15, 10.5);
    base.rotation.y = 0.3;
    g.add(base);

    // 碑顶的十字
    const c1 = box(0.07, 0.4, 0.07, M.iron, false);
    c1.position.set(-11.0, 1.68, 10.5);
    g.add(c1);
    const c2 = box(0.24, 0.07, 0.07, M.iron, false);
    c2.position.set(-11.0, 1.76, 10.5);
    g.add(c2);
  }

  return g;
}
