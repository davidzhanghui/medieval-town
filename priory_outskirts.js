/**
 * priory_outskirts.js —— 修道院外围的五处
 *
 * 一座修道院不会孤零零地立着：它靠圣泉招来朝圣者，靠什一税谷仓收租，
 * 靠济贫院履行施粥的教规，靠石匠场把自己一点点砌起来，
 * 也容得下一个住在林子里的隐士。
 * 构件用主场景传入的材质 M（townMaterials），与 priory.js 同一套约定。
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

const GRASS = new THREE.MeshStandardMaterial({ color: 0x7f9a58, roughness: 1 });
const SOIL = new THREE.MeshStandardMaterial({ color: 0x59452f, roughness: 1 });
const LEAF = [
  new THREE.MeshStandardMaterial({ color: 0x7fa64e, roughness: 1, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0x93b05a, roughness: 1, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0x5f8a52, roughness: 1, flatShading: true }),
];
const CLOTH = new THREE.MeshStandardMaterial({ color: 0xc9bda2, roughness: 1, side: THREE.DoubleSide });

/* ============================================================
 *  1. 圣泉：一眼泉、一座石亭、一条挂满还愿物的栏杆
 * ========================================================== */
export function makeHolyWell(M) {
  const g = new THREE.Group();
  const R = 2.5;          // 泉池外径
  const POOL_Y = 0.92;    // 水面高度

  /* ---- 泉池：石砌圆池 + 池水 ---- */
  {
    const wall = cyl(R, R + 0.16, 0.9, 20, M.stoneStrong);
    wall.position.y = 0.45;
    g.add(wall);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.16, 6, 22), M.stoneLight);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.92;
    rim.castShadow = true;
    g.add(rim);

    const water = new THREE.Mesh(new THREE.CircleGeometry(R - 0.2, 24), M.water);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.78;
    g.add(water);

    // 池底的卵石：一圈深色小石
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3;
      const pebble = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.16, 0),
        solid(0x5c5a4e, { roughness: 1, flatShading: true })
      );
      pebble.position.set(Math.cos(a) * (R - 0.7), 0.2, Math.sin(a) * (R - 0.7));
      pebble.scale.y = 0.6;
      g.add(pebble);
    }

    // 南侧三级下到水边的台阶
    for (let i = 0; i < 3; i++) {
      const st = box(1.5, 0.3, 0.55, M.stoneLight);
      st.position.set(0, 0.76 - i * 0.3, R + 0.05 - i * 0.52 + 0.6);
      g.add(st);
    }
  }

  /* ---- 石亭：四根方墩撑起四坡顶 ---- */
  {
    const PY = 3.9;         // 墩高
    const SPAN = 3.6;       // 墩到中心的距离
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pier = box(0.46, PY, 0.46, M.stoneStrong);
        pier.position.set(sx * SPAN, PY / 2, sz * SPAN);
        g.add(pier);

        const base = box(0.66, 0.3, 0.66, M.stone);
        base.position.set(sx * SPAN, 0.15, sz * SPAN);
        g.add(base);

        // 墩顶的小托块
        const cap = box(0.62, 0.18, 0.62, M.stoneLight);
        cap.position.set(sx * SPAN, PY + 0.09, sz * SPAN);
        g.add(cap);
      }
    }

    // 四道横梁
    for (const sx of [-1, 1]) {
      const beam = box(SPAN * 2 + 0.46, 0.3, 0.36, M.stoneLight);
      beam.position.set(0, PY + 0.33, sx * SPAN);
      g.add(beam);
    }
    for (const sz of [-1, 1]) {
      const beam = box(0.36, 0.3, SPAN * 2 + 0.46, M.stoneLight);
      beam.position.set(sz * SPAN, PY + 0.33, 0);
      g.add(beam);
    }

    // 四坡顶：四棱锥
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(SPAN * 1.52, 2.2, 4),
      M.slate
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = PY + 1.6;
    roof.castShadow = true;
    g.add(roof);

    // 顶尖的小十字
    const finial = cyl(0.05, 0.05, 0.9, 5, M.iron, false);
    finial.position.y = PY + 3.1;
    g.add(finial);
    const cross = box(0.5, 0.07, 0.07, M.iron, false);
    cross.position.y = PY + 3.28;
    g.add(cross);
  }

  /* ---- 北侧的壁龛与圣人像 ---- */
  {
    const wall = box(2.2, 2.6, 0.42, M.stone);
    wall.position.set(0, 1.3, -3.3);
    g.add(wall);

    // 龛洞：深色方块，前面压一道半圆券
    const niche = box(1.0, 1.5, 0.16, solid(0x1b1712, { roughness: 1 }), false);
    niche.position.set(0, 1.32, -3.06);
    g.add(niche);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.11, 4, 12, Math.PI), M.stoneLight);
    arch.position.set(0, 2.06, -3.0);
    arch.castShadow = true;
    g.add(arch);

    // 圣人像：一件袍子 + 头 + 光环
    const body = cyl(0.16, 0.26, 0.92, 9, M.linen);
    body.position.set(0, 1.26, -3.02);
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), solid(0xd9c0a0));
    head.position.set(0, 1.84, -3.02);
    g.add(head);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 4, 12), M.bronze);
    halo.position.set(0, 1.9, -3.09);
    g.add(halo);
  }

  /* ---- 还愿栏杆：挂在东侧，上面是布条、拐杖和一只木手 ---- */
  {
    const X = 4.4;
    for (const sz of [-1.4, 1.4]) {
      const p = cyl(0.07, 0.09, 1.9, 6, M.wood);
      p.position.set(X, 0.95, sz);
      g.add(p);
    }
    const rail = box(0.09, 0.09, 3.1, M.wood);
    rail.position.set(X, 1.82, 0);
    g.add(rail);

    // 布条：一排窄长的布片
    const RAGS = [0xd9cdb6, 0xb5452f, 0x4a6c8c, 0xc9a24a, 0x8a7a55];
    for (let i = 0; i < 9; i++) {
      const w = 0.13 + (i % 3) * 0.05;
      const h = 0.5 + (i % 4) * 0.12;
      const rag = new THREE.Mesh(new THREE.PlaneGeometry(w, h), solid(RAGS[i % RAGS.length], { side: THREE.DoubleSide }));
      rag.position.set(X, 1.78 - h / 2, -1.3 + i * 0.32);
      rag.rotation.y = Math.PI / 2 - 0.12;
      rag.castShadow = true;
      g.add(rag);
    }

    // 挂在栏杆上的拐杖：还愿的人把病愈后不再需要的拐杖留下
    const crutch = cyl(0.035, 0.045, 1.5, 5, M.wood, false);
    crutch.position.set(X, 1.15, 1.1);
    crutch.rotation.x = 0.16;
    g.add(crutch);
    const pad = box(0.3, 0.1, 0.1, M.wood, false);
    pad.position.set(X, 1.9, 1.0);
    g.add(pad);
  }

  /* ---- 朝圣小径：从南面过来，两侧立着五座小十字 ---- */
  {
    const path = box(2.6, 0.06, 15, solid(0xd0bf9c, { roughness: 1 }), false);
    path.position.set(0, 0.04, 9.5);
    g.add(path);

    for (let i = 0; i < 5; i++) {
      const z = 3.6 + i * 3.0;
      for (const sx of [-1, 1]) {
        const post = box(0.15, 1.05, 0.15, M.stoneLight);
        post.position.set(sx * 1.85, 0.52, z);
        g.add(post);
        const arm = box(0.62, 0.14, 0.13, M.stoneLight);
        arm.position.set(sx * 1.85, 0.86, z);
        g.add(arm);
      }
    }
  }

  /* ---- 两条石凳 ---- */
  for (const sx of [-1, 1]) {
    const seat = box(1.7, 0.16, 0.5, M.stoneLight);
    seat.position.set(sx * 2.0, 0.46, 4.4);
    g.add(seat);
    for (const t of [-0.6, 0.6]) {
      const leg = box(0.22, 0.42, 0.44, M.stone);
      leg.position.set(sx * 2.0 + t, 0.21, 4.4);
      g.add(leg);
    }
  }

  return g;
}

/* ============================================================
 *  2. 什一税谷仓：修道院收租的地方
 * ========================================================== */
export function makeTitheBarn(M) {
  const g = new THREE.Group();
  const W = 22, D = 9.2, H = 5.4, BASE = 0.7;

  /* ---- 石砌墙基 ---- */
  const plinth = box(W + 1.0, BASE, D + 1.0, M.stone);
  plinth.position.y = BASE / 2;
  g.add(plinth);

  /* ---- 木构墙身 ---- */
  const wallMat = M.wood;
  const wall = box(W, H, D, wallMat);
  wall.position.y = BASE + H / 2;
  g.add(wall);

  // 竖向板缝：两侧各一排细木条，让整面墙不像一块整板
  for (const sz of [-1, 1]) {
    for (let i = -10; i <= 10; i++) {
      const strip = box(0.08, H - 0.5, 0.05, M.woodDark, false);
      strip.position.set(i * (W / 21), BASE + H / 2, sz * (D / 2 + 0.03));
      g.add(strip);
    }
  }

  // 转角立柱与上下横梁
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(0.42, H + 0.3, 0.42, M.beam);
      post.position.set(sx * (W / 2 - 0.1), BASE + H / 2, sz * (D / 2 - 0.1));
      g.add(post);
    }
  }
  for (const sz of [-1, 1]) {
    for (const y of [BASE + 0.3, BASE + H - 0.25]) {
      const rail = box(W + 0.3, 0.26, 0.18, M.beam);
      rail.position.set(0, y, sz * (D / 2 + 0.06));
      g.add(rail);
    }
  }

  /* ---- 扶壁：长边各五道，向外斜撑 ---- */
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = -W / 2 + 2.4 + i * ((W - 4.8) / 4);
      const butt = box(0.6, H * 0.92, 0.95, M.stone);
      butt.position.set(x, (H * 0.92) / 2, sz * (D / 2 + 0.45));
      g.add(butt);

      // 顶上的斜面
      const slope = box(0.6, 0.5, 0.95, M.stone);
      slope.position.set(x, H * 0.92 + 0.1, sz * (D / 2 + 0.45));
      slope.rotation.x = -sz * 0.42;
      g.add(slope);
    }
  }

  /* ---- 屋顶：大坡度的茅草顶 ---- */
  const roof = ridgeRoof(W + 2.2, D + 2.2, 4.4, M.thatch);
  roof.position.y = BASE + H;
  g.add(roof);

  // 屋脊压条
  const ridge = box(W + 2.4, 0.3, 0.42, M.woodDark);
  ridge.position.y = BASE + H + 4.3;
  g.add(ridge);

  /* ---- 正面的大车门：门框、门扇、门楣上的通风缝 ---- */
  {
    const doorW = 3.6, doorH = 4.0;
    const door = box(doorW, doorH, 0.2, M.woodDark);
    door.position.set(-2.0, BASE + doorH / 2, D / 2 + 0.06);
    g.add(door);

    for (const sx of [-1, 1]) {
      // 门框
      const jamb = box(0.3, doorH + 0.3, 0.3, M.beam);
      jamb.position.set(-2.0 + sx * (doorW / 2 + 0.15), BASE + doorH / 2, D / 2 + 0.1);
      g.add(jamb);

      // 门上的铁箍
      for (const by of [0.9, 2.6]) {
        const band = box(doorW - 0.2, 0.12, 0.06, M.iron, false);
        band.position.set(-2.0, by + BASE, D / 2 + 0.18);
        g.add(band);
      }
    }
    const lintel = box(doorW + 0.9, 0.34, 0.34, M.beam);
    lintel.position.set(-2.0, BASE + doorH + 0.17, D / 2 + 0.1);
    g.add(lintel);

    // 门楣下的通风缝：谷仓要透风，不然粮食会霉
    for (let i = 0; i < 7; i++) {
      const slit = box(0.16, 0.7, 0.05, solid(0x120f0b), false);
      slit.position.set(4.6 + i * 0.9, BASE + H - 1.0, D / 2 + 0.06);
      g.add(slit);
    }
  }

  /* ---- 两侧山墙各开一扇小门 ---- */
  for (const sx of [-1, 1]) {
    const sd = box(0.18, 2.2, 1.5, M.woodDark);
    sd.position.set(sx * (W / 2 + 0.06), BASE + 1.1, 1.4);
    g.add(sd);

    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 4, 12, Math.PI), M.beam);
    frame.position.set(sx * (W / 2 + 0.1), BASE + 2.2, 1.4);
    frame.rotation.y = Math.PI / 2;
    g.add(frame);
  }

  /* ---- 门里的脱粒场：一块平整的木地板 ---- */
  {
    const floor = box(8, 0.08, 6, solid(0x9a8055, { roughness: 1 }), false);
    floor.position.set(-2.0, BASE + 0.05, 0);
    g.add(floor);

    // 靠墙码着的粮袋
    for (let i = 0; i < 7; i++) {
      const sack = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 7, 5),
        solid(i % 2 ? 0xb9a578 : 0xa89462, { roughness: 1, flatShading: true })
      );
      sack.scale.set(1, 1.35, 0.85);
      sack.position.set(-9.0 + (i % 4) * 0.95, BASE + 0.6, -3.0 + Math.floor(i / 4) * 0.9);
      sack.castShadow = true;
      g.add(sack);
    }
  }

  /* ---- 门外：板车、木桶、散落的谷粒 ---- */
  {
    const cart = new THREE.Group();
    const bed = box(3.2, 0.16, 1.6, M.wood);
    bed.position.y = 0.85;
    cart.add(bed);
    for (const sx of [-1, 1]) {
      const sideBoard = box(3.2, 0.5, 0.1, M.woodDark);
      sideBoard.position.set(0, 1.15, sx * 0.78);
      cart.add(sideBoard);
    }
    for (const sx of [-1.1, 1.1]) {
      for (const sz of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.08, 5, 14), M.timber);
        wheel.position.set(sx, 0.55, sz * 0.82);
        wheel.castShadow = true;
        cart.add(wheel);

        const spoke = box(0.06, 1.0, 0.06, M.timber, false);
        spoke.position.set(sx, 0.55, sz * 0.82);
        cart.add(spoke);
        const spoke2 = box(1.0, 0.06, 0.06, M.timber, false);
        spoke2.position.set(sx, 0.55, sz * 0.82);
        cart.add(spoke2);
      }
    }
    cart.position.set(5.5, 0, 7.0);
    cart.rotation.y = 0.4;
    g.add(cart);

    for (const [x, z] of [[2.4, 6.6], [3.1, 7.4], [1.6, 7.8]]) {
      const barrel = cyl(0.34, 0.3, 0.8, 10, M.woodDark);
      barrel.position.set(x, 0.4, z);
      g.add(barrel);
    }

    // 地上洒的谷粒
    const spill = new THREE.Mesh(new THREE.CircleGeometry(1.1, 14), solid(0xc2a45e, { roughness: 1 }));
    spill.rotation.x = -Math.PI / 2;
    spill.position.set(3.4, 0.06, 6.2);
    spill.scale.set(1.4, 1, 1);
    g.add(spill);
  }

  return g;
}

/* ============================================================
 *  3. 济贫院：一间小堂 + 一排通铺 + 门口施粥的大锅
 * ========================================================== */
export function makeAlmshouse(M) {
  const g = new THREE.Group();

  /* ---- 小堂：山墙钟架 + 券门 ---- */
  {
    const W = 7.6, D = 5.0, H = 4.4;
    const plinth = box(W + 0.6, 0.4, D + 0.6, M.stone);
    plinth.position.y = 0.2;
    g.add(plinth);

    const nave = box(W, H, D, M.stoneStrong);
    nave.position.y = 0.4 + H / 2;
    g.add(nave);

    const roof = ridgeRoof(W + 0.8, D + 0.8, 2.4, M.slate);
    roof.position.y = 0.4 + H;
    g.add(roof);

    const eave = box(W + 1.0, 0.14, D + 1.0, M.timber, false);
    eave.position.y = 0.4 + H + 0.05;
    g.add(eave);

    // 南山墙的钟架：一道小券，里面挂一口小钟
    const bg = box(1.5, 1.6, 0.4, M.stoneStrong);
    bg.position.set(0, 0.4 + H + 1.4, 0);
    g.add(bg);
    const bgHole = box(0.7, 0.9, 0.2, solid(0x14110d), false);
    bgHole.position.set(0, 0.4 + H + 1.35, 0.16);
    g.add(bgHole);
    const bgArch = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 4, 12, Math.PI), M.stoneLight);
    bgArch.position.set(0, 0.4 + H + 1.8, 0.2);
    g.add(bgArch);

    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 10), M.bronze);
    bell.position.set(0, 0.4 + H + 1.5, 0.02);
    bell.rotation.x = Math.PI;
    g.add(bell);

    // 顶上的小十字
    const fc = box(0.06, 0.6, 0.06, M.iron, false);
    fc.position.set(0, 0.4 + H + 2.5, 0);
    g.add(fc);
    const fa = box(0.34, 0.06, 0.06, M.iron, false);
    fa.position.set(0, 0.4 + H + 2.6, 0);
    g.add(fa);

    // 正门：半圆券门
    const door = box(1.2, 2.1, 0.16, M.wood);
    door.position.set(0, 0.4 + 1.05, D / 2 + 0.04);
    g.add(door);
    const da = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 4, 12, Math.PI), M.stoneLight);
    da.position.set(0, 0.4 + 2.1, D / 2 + 0.03);
    g.add(da);

    // 两扇窄窗
    for (const sx of [-1, 1]) {
      const win = box(0.5, 0.9, 0.12, M.window, false);
      win.position.set(sx * 2.4, 0.4 + 2.2, D / 2 + 0.03);
      g.add(win);
    }
  }

  /* ---- 通铺：一排敞开的棚，里面六张草垫 ---- */
  {
    const X0 = 11.0, W = 13, D = 4.6, H = 3.0;
    const floor = box(W, 0.16, D, solid(0x8d7a5c, { roughness: 1 }), false);
    floor.position.set(X0, 0.08, 0);
    floor.receiveShadow = true;
    g.add(floor);

    // 后墙与两端
    const back = box(W, H, 0.3, M.plaster);
    back.position.set(X0, H / 2, -D / 2);
    g.add(back);
    for (const sx of [-1, 1]) {
      const side = box(0.3, H, D, M.plaster);
      side.position.set(X0 + sx * W / 2, H / 2, 0);
      g.add(side);
    }

    // 前檐柱
    for (let i = 0; i <= 4; i++) {
      const p = box(0.22, H, 0.22, M.beam);
      p.position.set(X0 - W / 2 + (i / 4) * W, H / 2, D / 2);
      g.add(p);
    }

    // 前梁与单坡茅草顶
    const beam = box(W + 0.5, 0.2, 0.2, M.beam);
    beam.position.set(X0, H, D / 2);
    g.add(beam);
    const roof = box(W + 1.2, 0.18, D + 1.6, M.thatch);
    roof.position.set(X0, H + 0.45, 0.1);
    roof.rotation.x = -0.16;
    g.add(roof);

    // 六张草垫：垫子 + 卷起来的毯子 + 一个小包袱
    for (let i = 0; i < 6; i++) {
      const px = X0 - W / 2 + 1.3 + i * ((W - 2.6) / 5);

      const pallet = box(1.15, 0.22, 2.0, solid(0xb59a54, { roughness: 1, flatShading: true }), false);
      pallet.position.set(px, 0.27, 0.2);
      g.add(pallet);

      const blanket = box(1.2, 0.14, 1.2, solid(i % 2 ? 0x6a4a52 : 0x40566e, { roughness: 1 }), false);
      blanket.position.set(px, 0.44, 0.55);
      g.add(blanket);

      const bundle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), CLOTH);
      bundle.position.set(px + 0.3, 0.4, -0.55);
      bundle.scale.set(1, 0.8, 1);
      g.add(bundle);
    }
  }

  /* ---- 门口施粥：三脚铁架吊着一口大锅，下面烧着火 ---- */
  {
    const HX = 3.6, HZ = 6.2;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = cyl(0.045, 0.06, 2.1, 5, M.iron);
      leg.position.set(HX + Math.cos(a) * 0.55, 1.05, HZ + Math.sin(a) * 0.55);
      leg.rotation.z = -Math.cos(a) * 0.22;
      leg.rotation.x = Math.sin(a) * 0.22;
      g.add(leg);
    }
    const chain = cyl(0.025, 0.025, 0.5, 4, M.iron, false);
    chain.position.set(HX, 1.85, HZ);
    g.add(chain);

    const pot = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58),
      M.iron
    );
    pot.position.set(HX, 1.55, HZ);
    pot.castShadow = true;
    g.add(pot);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 4, 14), M.iron);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(HX, 1.55, HZ);
    g.add(rim);

    // 火堆：几块石头 + 炭
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2, 0),
        solid(0x6e6a5e, { roughness: 1, flatShading: true })
      );
      st.position.set(HX + Math.cos(a) * 0.85, 0.1, HZ + Math.sin(a) * 0.85);
      g.add(st);
    }
    const embers = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), M.ember);
    embers.rotation.x = -Math.PI / 2;
    embers.position.set(HX, 0.09, HZ);
    g.add(embers);
  }

  /* ---- 院子：草药圃 + 长凳 + 晒着的布 ---- */
  {
    const bed = box(3.2, 0.2, 2.4, SOIL, false);
    bed.position.set(-6.2, 0.12, 4.4);
    g.add(bed);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.16, 5, 4), LEAF[(r + c) % 3]);
        bush.position.set(-7.4 + c * 0.6, 0.3, 3.7 + r * 0.5);
        bush.scale.y = 0.75;
        bush.castShadow = true;
        g.add(bush);
      }
    }

    const bench = box(2.4, 0.14, 0.45, M.wood);
    bench.position.set(-4.2, 0.5, 7.6);
    g.add(bench);
    for (const sx of [-0.9, 0.9]) {
      const leg = box(0.16, 0.44, 0.4, M.woodDark);
      leg.position.set(-4.2 + sx, 0.22, 7.6);
      g.add(leg);
    }

    // 晾着的绷带与粗布
    const line = box(0.03, 0.03, 5.0, M.rope, false);
    line.position.set(-9.5, 2.0, 2.0);
    line.rotation.y = Math.PI / 2;
    g.add(line);
    for (const [lz, w, h] of [[0.2, 0.9, 1.4], [1.9, 1.1, 1.1], [3.4, 0.7, 1.5]]) {
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, h), CLOTH);
      cloth.position.set(-9.5, 2.0 - h / 2, lz - 0.9);
      cloth.rotation.y = Math.PI / 2;
      cloth.castShadow = true;
      g.add(cloth);
    }
  }

  return g;
}

/* ============================================================
 *  4. 修士的石匠场：修道院的石头都从这儿凿出来
 * ========================================================== */
export function makeMasonsLodge(M) {
  const g = new THREE.Group();

  /* ---- 三级下挖的石坑 ---- */
  const PIT = { w: 13, d: 9, step: 0.75 };
  {
    // 外圈地面：碎石。中间要留出坑口，所以做成四块围板
    const PW = PIT.w + 8, PD = PIT.d + 8;
    const sideX = (PW - PIT.w) / 2;
    const sideZ = (PD - PIT.d) / 2;
    const PADS = [
      [0, -(PIT.d / 2 + sideZ / 2), PW, sideZ],
      [0, PIT.d / 2 + sideZ / 2, PW, sideZ],
      [-(PIT.w / 2 + sideX / 2), 0, sideX, PIT.d],
      [PIT.w / 2 + sideX / 2, 0, sideX, PIT.d],
    ];
    for (const [px, pz, pw, pd] of PADS) {
      const pad = box(pw, 0.08, pd, solid(0x9c9382, { roughness: 1 }), false);
      pad.position.set(px, 0.04, pz);
      pad.receiveShadow = true;
      g.add(pad);
    }

    // 两级台地：每一级是一圈往下坐的实心石框，内壁就是坑壁
    const NX = PIT.w - 1.9, NZ = PIT.d - 1.6;      // 第二级的开口
    const MX = NX - 1.9, MZ = NZ - 1.6;            // 坑底
    const TERRA = [
      { ow: PIT.w, od: PIT.d, iw: NX, id: NZ, top: 0 },
      { ow: NX, od: NZ, iw: MX, id: MZ, top: -PIT.step },
    ];
    for (const t of TERRA) {
      const tx = (t.ow - t.iw) / 2;
      const tz = (t.od - t.id) / 2;
      const h = PIT.step + 0.1;
      const cy = t.top - h / 2;
      for (const sz of [-1, 1]) {
        const ring = box(t.ow, h, tz, M.plateau);
        ring.position.set(0, cy, sz * (t.id / 2 + tz / 2));
        g.add(ring);
      }
      for (const sx of [-1, 1]) {
        const ring = box(tx, h, t.id, M.plateau);
        ring.position.set(sx * (t.iw / 2 + tx / 2), cy, 0);
        g.add(ring);
      }
    }

    // 坑底
    const floor = box(MX, 0.1, MZ, solid(0xa89f8c, { roughness: 1 }), false);
    floor.position.y = -PIT.step * 2 + 0.05;
    floor.receiveShadow = true;
    g.add(floor);
  }

  /* ---- 半成品石块：坑里、坑外各一堆 ---- */
  {
    const blockMat = M.stoneLight;
    const PIT_Y = -PIT.step * 2;      // 坑底标高
    // 坑底：三块已经凿方的
    for (const [x, z, s, r] of [[-2.0, 0.6, 1.0, 0.1], [-0.6, -1.4, 0.85, -0.3], [-2.9, -1.0, 0.7, 0.5]]) {
      const b = box(1.2 * s, 0.8 * s, 1.0 * s, blockMat);
      b.position.set(x, PIT_Y + 0.4 * s, z);
      b.rotation.y = r;
      g.add(b);
    }
    // 坑外：码好待运的一垛
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const b = box(1.0, 0.55, 0.8, blockMat);
        b.position.set(9.5 + j * 1.1, 0.3 + i * 0.58, -2.0 + j * 0.1);
        b.rotation.y = (i - j) * 0.05;
        g.add(b);
      }
    }
    // 碎石堆
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 1.6;
      const rub = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.16, 0),
        solid(0x8f8778, { roughness: 1, flatShading: true })
      );
      rub.position.set(6.2 + Math.cos(a) * r, 0.14, 4.6 + Math.sin(a) * r * 0.7);
      rub.rotation.set(Math.random(), Math.random(), Math.random());
      rub.castShadow = true;
      g.add(rub);
    }
  }

  /* ---- 石匠的工作台（banker）：一张矮台，上面架着未完工的块石 ---- */
  {
    const BX = 7.4, BZ = 0.8;
    const top = box(3.2, 0.22, 1.1, M.wood);
    top.position.set(BX, 0.95, BZ);
    g.add(top);
    for (const sx of [-1.3, 1.3]) {
      for (const sz of [-0.4, 0.4]) {
        const leg = box(0.16, 0.9, 0.16, M.woodDark);
        leg.position.set(BX + sx, 0.45, BZ + sz);
        g.add(leg);
      }
    }

    // 台上的石块与凿子
    const work = box(1.3, 0.62, 0.8, M.stoneLight);
    work.position.set(BX - 0.5, 1.37, BZ);
    g.add(work);

    const chisel = cyl(0.03, 0.03, 0.5, 4, M.iron, false);
    chisel.position.set(BX + 1.1, 1.31, BZ + 0.22);
    chisel.rotation.z = 1.35;
    g.add(chisel);

    const mallet = box(0.16, 0.16, 0.4, M.woodDark);
    mallet.position.set(BX + 0.9, 1.14, BZ - 0.2);
    g.add(mallet);
    const handle = cyl(0.035, 0.035, 0.52, 5, M.wood, false);
    handle.position.set(BX + 1.05, 1.14, BZ - 0.2);
    handle.rotation.z = Math.PI / 2;
    g.add(handle);
  }

  /* ---- 吊石架：一根斜桅 + 拉绳 + 吊着的石块 ---- */
  {
    const CX = -8.6, CZ = -5.2;

    // 底座：交叉的木枕
    for (const r of [0, Math.PI / 2]) {
      const skid = box(3.2, 0.24, 0.28, M.beam);
      skid.position.set(CX, 0.12, CZ);
      skid.rotation.y = r;
      g.add(skid);
    }

    // 主桅：微微后倾
    const mast = box(0.32, 6.4, 0.32, M.beam);
    mast.position.set(CX, 3.2, CZ);
    mast.rotation.x = 0.1;
    g.add(mast);

    // 斜撑
    const brace = box(0.2, 4.2, 0.2, M.wood);
    brace.position.set(CX + 1.6, 2.0, CZ);
    brace.rotation.z = 1.05;
    g.add(brace);

    // 悬臂
    const jib = box(4.0, 0.24, 0.26, M.beam);
    jib.position.set(CX + 1.9, 6.1, CZ);
    jib.rotation.z = -0.26;
    g.add(jib);

    // 吊绳与石块
    const rope = cyl(0.03, 0.03, 3.6, 4, M.rope, false);
    rope.position.set(CX + 3.5, 4.3, CZ);
    g.add(rope);

    const slung = box(1.0, 0.7, 0.9, M.stoneLight);
    slung.position.set(CX + 3.5, 2.2, CZ);
    slung.rotation.y = 0.3;
    g.add(slung);

    // 配重
    const cw = box(0.8, 0.8, 0.7, M.stone);
    cw.position.set(CX - 1.5, 5.3, CZ);
    g.add(cw);
  }

  /* ---- 石匠住的木板棚 ---- */
  {
    const LX = 2.0, LZ = -10.5;
    const W = 6.0, D = 4.2, H = 2.7;

    const floor = box(W, 0.14, D, solid(0x8d7a5c, { roughness: 1 }), false);
    floor.position.set(LX, 0.07, LZ);
    g.add(floor);

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const p = box(0.2, H, 0.2, M.beam);
        p.position.set(LX + sx * W / 2, H / 2, LZ + sz * D / 2);
        g.add(p);
      }
    }

    // 后墙与两侧
    const back = box(W, H, 0.2, M.wood);
    back.position.set(LX, H / 2, LZ - D / 2);
    g.add(back);
    for (const sx of [-1, 1]) {
      const s = box(0.2, H, D, M.wood);
      s.position.set(LX + sx * W / 2, H / 2, LZ);
      g.add(s);
    }

    // 单坡顶
    const roof = box(W + 1.0, 0.16, D + 1.2, M.thatch);
    roof.position.set(LX, H + 0.35, LZ + 0.1);
    roof.rotation.x = -0.14;
    g.add(roof);

    // 屋里的通铺与工具
    const bunk = box(2.0, 0.3, 1.0, M.wood);
    bunk.position.set(LX - 1.4, 0.3, LZ - D / 2 + 0.9);
    g.add(bunk);
    const straw = box(1.9, 0.18, 0.95, M.straw, false);
    straw.position.set(LX - 1.4, 0.52, LZ - D / 2 + 0.9);
    g.add(straw);

    for (let i = 0; i < 4; i++) {
      const tool = cyl(0.03, 0.035, 0.8, 4, M.iron, false);
      tool.position.set(LX + W / 2 - 0.25, 1.5, LZ - 1.2 + i * 0.35);
      g.add(tool);
    }
  }

  return g;
}

/* ============================================================
 *  5. 隐士居：林子深处的一间石屋、一座小祈祷室、一块菜地
 * ========================================================== */
export function makeHermitage(M) {
  const g = new THREE.Group();

  /* ---- 场地：踩实的空地 ---- */
  {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(9.5, 20), solid(0x7d9460, { roughness: 1 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.03;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 石屋：一间屋、一扇门、一扇窗、一个烟囱角 ---- */
  {
    const W = 4.6, D = 4.0, H = 2.8;
    const BX = -1.6;

    const plinth = box(W + 0.4, 0.3, D + 0.4, M.stone);
    plinth.position.set(BX, 0.15, 0);
    g.add(plinth);

    const wall = box(W, H, D, M.stoneStrong);
    wall.position.set(BX, 0.3 + H / 2, 0);
    g.add(wall);

    // 茅草顶
    const roof = ridgeRoof(W + 0.7, D + 0.7, 1.9, M.thatch);
    roof.position.set(BX, 0.3 + H, 0);
    g.add(roof);
    const ridge = box(W + 0.8, 0.2, 0.24, M.woodDark);
    ridge.position.set(BX, 0.3 + H + 1.85, 0);
    g.add(ridge);

    // 门
    const door = box(1.0, 2.0, 0.14, M.woodDark);
    door.position.set(BX, 0.3 + 1.0, D / 2 + 0.03);
    g.add(door);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 4, 12, Math.PI), M.stoneLight);
    arch.position.set(BX, 0.3 + 2.0, D / 2 + 0.02);
    g.add(arch);

    // 窗：朝东，开得很小
    const win = box(0.1, 0.6, 0.55, M.window, false);
    win.position.set(BX + W / 2 + 0.03, 0.3 + 1.7, 0.4);
    g.add(win);

    // 烟囱：贴着北墙的一角
    const chim = box(0.55, 1.8, 0.55, M.stone);
    chim.position.set(BX - W / 2 + 0.5, 0.3 + H + 0.6, -D / 2 + 0.5);
    g.add(chim);
  }

  /* ---- 小祈祷室：只有三米见方，山墙上挂一口钟 ---- */
  {
    const W = 3.4, D = 3.0, H = 3.0;
    const BX = 5.2, BZ = -2.0;

    const wall = box(W, H, D, M.stoneStrong);
    wall.position.set(BX, H / 2, BZ);
    g.add(wall);

    const roof = ridgeRoof(W + 0.6, D + 0.6, 1.6, M.slate);
    roof.position.set(BX, H, BZ);
    g.add(roof);

    // 山墙钟架
    const bg = box(1.0, 1.1, 0.3, M.stoneStrong);
    bg.position.set(BX, H + 1.0, BZ - D / 2 + 0.1);
    g.add(bg);
    const hole = box(0.45, 0.6, 0.16, solid(0x14110d), false);
    hole.position.set(BX, H + 0.98, BZ - D / 2 - 0.06);
    g.add(hole);

    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 9), M.bronze);
    bell.position.set(BX, H + 0.92, BZ - D / 2 - 0.02);
    bell.rotation.x = Math.PI;
    g.add(bell);

    // 十字
    const c1 = box(0.05, 0.5, 0.05, M.iron, false);
    c1.position.set(BX, H + 1.85, BZ - D / 2 + 0.1);
    g.add(c1);
    const c2 = box(0.28, 0.05, 0.05, M.iron, false);
    c2.position.set(BX, H + 1.92, BZ - D / 2 + 0.1);
    g.add(c2);

    // 小门
    const door = box(0.9, 1.8, 0.14, M.wood);
    door.position.set(BX, 0.9, BZ + D / 2 + 0.03);
    g.add(door);
  }

  /* ---- 石十字：立在菜地边上，是这片空地唯一的"标志" ---- */
  {
    const CX = -6.4, CZ = 4.4;
    const base = box(1.2, 0.35, 1.2, M.stone);
    base.position.set(CX, 0.17, CZ);
    g.add(base);

    const shaft = box(0.34, 2.5, 0.34, M.stoneLight);
    shaft.position.set(CX, 1.6, CZ);
    g.add(shaft);

    const arm = box(1.5, 0.32, 0.3, M.stoneLight);
    arm.position.set(CX, 2.45, CZ);
    g.add(arm);
  }

  /* ---- 菜地：四垄，围一圈编条篱笆 ---- */
  {
    const GX = -3.2, GZ = 5.4, GW = 7.0, GD = 4.2;

    for (let i = 0; i < 4; i++) {
      const row = box(GW, 0.18, 0.7, SOIL, false);
      row.position.set(GX, 0.12, GZ - GD / 2 + 0.6 + i * 1.0);
      g.add(row);

      for (let k = 0; k < 7; k++) {
        const px = GX - GW / 2 + 0.5 + k * ((GW - 1.0) / 6);
        const pz = GZ - GD / 2 + 0.6 + i * 1.0;

        if ((i + k) % 3 === 0) {
          // 卷心菜：一团紧实的球
          const cab = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), LEAF[1]);
          cab.position.set(px, 0.3, pz);
          cab.scale.y = 0.85;
          cab.castShadow = true;
          g.add(cab);
        } else {
          // 豆子：细茎 + 几片叶
          const stem = cyl(0.02, 0.02, 0.5, 4, LEAF[2], false);
          stem.position.set(px, 0.45, pz);
          g.add(stem);
          for (let l = 0; l < 3; l++) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), LEAF[(i + l) % 3]);
            leaf.position.set(px + (l - 1) * 0.08, 0.4 + l * 0.12, pz);
            leaf.scale.set(1.3, 0.5, 1);
            g.add(leaf);
          }
        }
      }
    }

    // 编条篱笆：四面各两道横编条 + 立桩
    const FX = GX, FZ = GZ, HW = GW / 2 + 0.5, HD = GD / 2 + 0.5;
    const SIDES = [
      // [中心x, 中心z, 沿x的长度, 沿z的长度]
      [FX, FZ - HD, HW * 2, 0.1], [FX, FZ + HD, HW * 2, 0.1],
      [FX - HW, FZ, 0.1, HD * 2], [FX + HW, FZ, 0.1, HD * 2],
    ];
    for (const [cx, cz, w, d] of SIDES) {
      for (const hy of [0.35, 0.75]) {
        const wattle = box(w, 0.1, d, M.wood);
        wattle.position.set(cx, hy, cz);
        g.add(wattle);
      }
      const span = Math.max(w, d);
      const n = Math.max(2, Math.round(span / 1.1));
      for (let i = 0; i <= n; i++) {
        const t = -0.5 + i / n;
        const p = box(0.08, 0.95, 0.08, M.woodDark);
        p.position.set(cx + (w > d ? t * w : 0), 0.47, cz + (w > d ? 0 : t * d));
        g.add(p);
      }
    }
  }

  /* ---- 柴垛与水缸 ---- */
  {
    // 柴：横着码成一垛
    for (let i = 0; i < 8; i++) {
      const log = cyl(0.11, 0.12, 1.4, 6, M.woodDark);
      log.rotation.z = Math.PI / 2;
      log.position.set(-4.6, 0.14 + Math.floor(i / 4) * 0.24, -3.4 + (i % 4) * 0.24);
      g.add(log);
    }

    const vat = cyl(0.42, 0.38, 0.8, 12, M.woodDark);
    vat.position.set(2.6, 0.4, 3.4);
    g.add(vat);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.36, 12), M.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(2.6, 0.72, 3.4);
    g.add(water);

    const bench = box(1.6, 0.14, 0.42, M.wood);
    bench.position.set(-1.0, 0.48, 3.6);
    g.add(bench);
    for (const sx of [-0.55, 0.55]) {
      const leg = box(0.14, 0.42, 0.36, M.woodDark);
      leg.position.set(-1.0 + sx, 0.21, 3.6);
      g.add(leg);
    }
  }

  /* ---- 一圈疏疏落落的针叶树，把这处空地围起来 ---- */
  {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f4a28, roughness: 1, flatShading: true });

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.18;
      const r = 10.5 + Math.random() * 2.2;
      const s = 0.8 + Math.random() * 0.55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.36 * s, 2.6 * s, 6), trunkMat);
      trunk.position.set(x, 1.3 * s, z);
      trunk.castShadow = true;
      g.add(trunk);

      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.8 * s, 5.6 * s, 7), leafMat);
      leaf.position.set(x, 4.6 * s, z);
      leaf.castShadow = true;
      g.add(leaf);
    }
  }

  return g;
}
