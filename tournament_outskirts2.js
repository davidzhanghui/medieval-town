/**
 * tournament_outskirts2.js —— 比武场再向外的一圈（第二圈）
 *
 * 第一圈围着赛道转（练兵、换马、卖货、修甲、救人），
 * 这一圈是赛会背后真正的家底：牧马的草场、练箭的靶场、
 * 搭看台用的木料、缝马具的皮匠，以及一位退役老骑士的宅子。
 * 构件用主场景传入的材质 M（townMaterials），与 tournament.js 同一套约定。
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

function railBetween(g, x1, z1, x2, z2, y, len, mat) {
  const ang = Math.atan2(-(z2 - z1), x2 - x1);
  for (const yy of Array.isArray(y) ? y : [y]) {
    const r = box(len, 0.1, 0.09, mat, false);
    r.position.set((x1 + x2) / 2, yy, (z1 + z2) / 2);
    r.rotation.y = ang;
    g.add(r);
  }
}

/* ============================================================
 *  1. 牧马场：围起来的草场，几匹马在吃草
 * ========================================================== */
export function makeHorsePasture(M) {
  const g = new THREE.Group();
  const W = 42, D = 30;

  /* ---- 场地：一片略深的草 ---- */
  {
    const pad = box(W, 0.04, D, new THREE.MeshStandardMaterial({ color: 0x74904f, roughness: 1 }), false);
    pad.position.y = 0.02;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 围栏：木桩 + 两道横杆，南面留一个栅门 ---- */
  {
    const SEG = 3.0;
    const lines = [
      [[-W / 2, -D / 2], [W / 2, -D / 2]],
      [[W / 2, -D / 2], [W / 2, D / 2]],
      [[-W / 2, -D / 2], [-W / 2, D / 2]],
      [[-W / 2, D / 2], [-3.0, D / 2]],
      [[3.0, D / 2], [W / 2, D / 2]],
    ];
    for (const [[x1, z1], [x2, z2]] of lines) {
      const n = Math.max(1, Math.round(Math.hypot(x2 - x1, z2 - z1) / SEG));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = cyl(0.09, 0.12, 1.4, 6, M.wood);
        p.position.set(x1 + (x2 - x1) * t, 0.7, z1 + (z2 - z1) * t);
        g.add(p);
      }
      railBetween(g, x1, z1, x2, z2, [0.5, 1.05], Math.hypot(x2 - x1, z2 - z1), M.woodDark);
    }
    // 门柱加粗
    for (const sx of [-1, 1]) {
      const p = box(0.36, 1.9, 0.36, M.wood);
      p.position.set(sx * 3.0, 0.95, D / 2);
      g.add(p);
    }
  }

  /* ---- 水槽与草料棚 ---- */
  {
    const trough = box(4.2, 0.55, 1.0, M.woodDark);
    trough.position.set(-W / 2 + 5.0, 0.28, -D / 2 + 3.0);
    g.add(trough);
    const inner = box(3.7, 0.1, 0.62, M.waterDark, false);
    inner.position.set(-W / 2 + 5.0, 0.48, -D / 2 + 3.0);
    g.add(inner);

    // 草料棚：两根柱子撑一片顶
    for (const dx of [-1.7, 1.7]) {
      for (const dz of [-1.2, 1.2]) {
        const p = cyl(0.13, 0.16, 3.0, 6, M.wood);
        p.position.set(W / 2 - 6.0 + dx, 1.5, -D / 2 + 4.5 + dz);
        g.add(p);
      }
    }
    const roof = box(4.4, 0.16, 3.6, M.thatch);
    roof.position.set(W / 2 - 6.0, 3.05, -D / 2 + 4.5);
    roof.castShadow = true;
    g.add(roof);

    // 草垛
    for (const [x, z, r] of [[W / 2 - 6.4, -D / 2 + 4.2, 1.15], [W / 2 - 8.0, -D / 2 + 5.4, 0.9]]) {
      const hay = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.3, 12), M.straw);
      hay.rotation.z = Math.PI / 2;
      hay.position.set(x, r, z);
      hay.castShadow = true;
      g.add(hay);
    }
  }

  /* ---- 马：低模，低头吃草 ---- */
  {
    const COATS = [0x5a3a22, 0x7a5232, 0x2e2620, 0xa88a62, 0x6b5540];
    const HORSES = [
      [-9.0, 4.0, 0.6], [-4.0, -6.0, 2.1], [6.0, 7.0, 4.0],
      [12.0, -3.0, 1.0], [-12.0, -8.0, 3.2],
    ];
    for (let i = 0; i < HORSES.length; i++) {
      const [x, z, ry] = HORSES[i];
      const coat = solid(COATS[i % COATS.length], { roughness: 0.92 });
      const h = new THREE.Group();
      h.position.set(x, 0, z);
      h.rotation.y = ry;

      const body = box(1.9, 0.85, 0.72, coat);
      body.position.y = 1.12;
      h.add(body);

      // 脖子与头
      const neck = box(0.55, 0.95, 0.5, coat);
      neck.position.set(0.92, 1.5, 0);
      neck.rotation.z = -0.42;
      h.add(neck);
      const head = box(0.72, 0.34, 0.38, coat);
      head.position.set(1.38, 1.72, 0);
      head.rotation.z = -0.72;
      h.add(head);
      // 鬃毛
      const mane = box(0.14, 0.5, 0.1, solid(0x241a12, { roughness: 1 }), false);
      mane.position.set(0.96, 1.9, 0);
      mane.rotation.z = -0.42;
      h.add(mane);

      // 四条腿
      for (const dx of [-0.62, 0.62]) {
        for (const dz of [-0.26, 0.26]) {
          const leg = box(0.16, 0.78, 0.16, coat);
          leg.position.set(dx, 0.39, dz);
          h.add(leg);
        }
      }
      // 尾巴
      const tail = box(0.1, 0.7, 0.12, solid(0x241a12, { roughness: 1 }), false);
      tail.position.set(-0.98, 1.1, 0);
      tail.rotation.z = 0.28;
      h.add(tail);

      g.add(h);
    }
  }

  /* ---- 一棵孤树：草场里唯一的荫凉 ---- */
  {
    const trunk = cyl(0.4, 0.55, 4.0, 7, solid(0x4a3524, { roughness: 1 }));
    trunk.position.set(2.0, 2.0, -6.0);
    g.add(trunk);
    for (const [dx, y, r] of [[0, 5.0, 2.6], [1.3, 5.8, 1.8], [-1.2, 5.6, 1.7], [0.2, 6.6, 1.3]]) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), solid(0x4a6b34, { roughness: 1, flatShading: true }));
      c.position.set(2.0 + dx, y, -6.0);
      c.scale.y = 0.9;
      c.castShadow = true;
      g.add(c);
    }
  }

  return g;
}

/* ============================================================
 *  2. 箭术场：一排草靶 + 挡箭土墙
 * ========================================================== */
export function makeArcheryRange(M) {
  const g = new THREE.Group();
  const W = 34, D = 20;

  /* ---- 场地：一条踩实的射道 ---- */
  {
    const lane = box(W, 0.05, 6.0, solid(0xb0a184, { roughness: 1 }), false);
    lane.position.set(0, 0.03, 0);
    lane.receiveShadow = true;
    g.add(lane);

    // 起射线：一道白灰
    const line = box(0.22, 0.04, 6.0, solid(0xe0d8bc, { roughness: 1 }), false);
    line.position.set(-W / 2 + 3.0, 0.07, 0);
    g.add(line);
  }

  /* ---- 挡箭土墙：靶后面的一道长土垄 ---- */
  {
    const berm = box(2.6, 2.4, D, solid(0x8a7c5c, { roughness: 1 }));
    berm.position.set(W / 2 - 1.6, 1.2, 0);
    g.add(berm);
    // 坡面
    const slope = box(3.2, 0.3, D, solid(0x7d7052, { roughness: 1 }));
    slope.position.set(W / 2 - 3.4, 0.9, 0);
    slope.rotation.z = 0.55;
    g.add(slope);
  }

  /* ---- 靶：五个草靶，立在土墙前 ---- */
  {
    for (let i = 0; i < 5; i++) {
      const z = -6.4 + i * 3.2;
      const X = W / 2 - 4.6;

      // 三脚支架
      for (const a of [-0.5, 0.5, Math.PI]) {
        const leg = cyl(0.06, 0.08, 2.3, 5, M.wood);
        leg.position.set(X + Math.sin(a) * 0.4, 1.1, z + Math.cos(a) * 0.4);
        leg.rotation.x = Math.cos(a) * 0.22;
        leg.rotation.z = -Math.sin(a) * 0.22;
        g.add(leg);
      }

      // 靶身：草编的圆盘
      const butt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 0.55, 16),
        solid(0xc2ab72, { roughness: 1, flatShading: true })
      );
      butt.rotation.z = Math.PI / 2;
      butt.position.set(X, 1.55, z);
      butt.castShadow = true;
      g.add(butt);

      // 靶心：三道同心圆
      const rings = [[0.72, 0xd8d0b4], [0.46, 0xa8452f], [0.2, 0xd8d0b4]];
      for (const [r, col] of rings) {
        const ring = new THREE.Mesh(
          new THREE.CircleGeometry(r, 14),
          solid(col, { roughness: 1, side: THREE.DoubleSide })
        );
        ring.rotation.y = Math.PI / 2;
        ring.position.set(X - 0.29, 1.55, z);
        g.add(ring);
      }
    }
  }

  /* ---- 箭：插在靶上和地上 ---- */
  {
    const SHAFT = solid(0xd8c9a4, { roughness: 1 });
    const FLETCH = solid(0xb04a34, { roughness: 1 });
    const spots = [
      [-4.5, 1.9, -5.2, 0.3], [-4.6, 1.4, -4.4, -0.2], [-4.3, 1.7, -1.6, 0.1],
      [-4.6, 1.5, 2.4, -0.1], [-4.4, 1.8, 5.0, 0.2],
      [-2.0, 0.2, -3.0, 0.9], [-1.0, 0.2, 2.6, 0.7], [-2.6, 0.2, 4.2, 1.0],
    ];
    for (const [x, y, z, tilt] of spots) {
      const shaft = cyl(0.025, 0.025, 0.9, 4, SHAFT, false);
      shaft.position.set(x, y, z);
      shaft.rotation.z = Math.PI / 2 + tilt;
      g.add(shaft);
      const fl = box(0.16, 0.1, 0.02, FLETCH, false);
      fl.position.set(x - 0.35, y + 0.12, z);
      g.add(fl);
    }
  }

  /* ---- 兵器架：几张弓和一筒箭 ---- */
  {
    const RACK_X = -W / 2 + 5.0;
    for (const dz of [-1.6, 1.6]) {
      const post = box(0.16, 1.7, 0.16, M.wood);
      post.position.set(RACK_X, 0.85, dz);
      g.add(post);
    }
    const bar = box(0.16, 0.14, 3.4, M.wood);
    bar.position.set(RACK_X, 1.62, 0);
    g.add(bar);

    // 三张弓
    for (let i = 0; i < 3; i++) {
      const bow = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.035, 4, 14, Math.PI * 1.15),
        solid(0x6b4a2c, { roughness: 0.9 })
      );
      bow.position.set(RACK_X, 1.05, -1.0 + i * 1.0);
      bow.rotation.y = Math.PI / 2;
      bow.rotation.z = Math.PI * 0.42;
      g.add(bow);
      const string = box(0.012, 1.32, 0.012, solid(0xd8d0bc, { roughness: 1 }), false);
      string.position.set(RACK_X, 1.05, -1.0 + i * 1.0);
      g.add(string);
    }

    // 箭筒
    const quiver = cyl(0.2, 0.16, 0.85, 8, M.wood);
    quiver.position.set(RACK_X + 0.7, 0.43, 2.0);
    g.add(quiver);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const s = cyl(0.018, 0.018, 0.9, 4, solid(0xd8c9a4, { roughness: 1 }), false);
      s.position.set(RACK_X + 0.7 + Math.cos(a) * 0.11, 1.05, 2.0 + Math.sin(a) * 0.11);
      g.add(s);
    }
  }

  return g;
}

/* ============================================================
 *  3. 木料场：给看台、栅栏和门楼备料的地方
 * ========================================================== */
export function makeTimberYard(M) {
  const g = new THREE.Group();

  /* ---- 地面：锯末与泥 ---- */
  {
    const pad = box(26, 0.06, 20, solid(0x8a7a5a, { roughness: 1 }), false);
    pad.position.y = 0.03;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 锯架：两根交叉的高凳，圆木架在上面 ---- */
  {
    for (const x of [-4.0, 4.0]) {
      for (const dz of [-0.6, 0.6]) {
        const leg = box(0.2, 2.4, 0.2, M.wood);
        leg.position.set(x, 1.2, dz);
        leg.rotation.x = dz > 0 ? 0.24 : -0.24;
        g.add(leg);
      }
    }
    // 架着的原木
    const log = cyl(0.42, 0.42, 11.0, 10, M.wood);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 2.3, 0);
    g.add(log);
    // 锯口
    const kerf = box(0.05, 0.86, 0.06, solid(0x2a2018, { roughness: 1 }), false);
    kerf.position.set(1.2, 2.3, 0);
    g.add(kerf);
    // 大锯：一片带柄的长锯条
    const saw = box(0.06, 1.1, 2.6, M.iron, false);
    saw.position.set(1.2, 2.9, 0);
    saw.rotation.z = 0.06;
    g.add(saw);
    const handle = box(0.1, 0.32, 0.16, M.wood, false);
    handle.position.set(1.2, 3.5, 0);
    g.add(handle);
  }

  /* ---- 原木堆：成排码放的圆木，端面朝外 ---- */
  {
    const ROWS = [
      [-9.0, 5.0, 6, 0.44],
      [-9.0, 6.6, 5, 0.44],
      [-9.0, 8.0, 4, 0.44],
    ];
    for (const [x0, z, n, r] of ROWS) {
      for (let i = 0; i < n; i++) {
        const log = cyl(r, r, 5.4, 10, M.wood);
        log.rotation.x = Math.PI / 2;
        log.position.set(x0 + i * (r * 2 + 0.06), r, z);
        g.add(log);
        // 端面：浅色的年轮
        const end = new THREE.Mesh(
          new THREE.CircleGeometry(r * 0.94, 10),
          solid(0xc2a878, { roughness: 1 })
        );
        end.position.set(x0 + i * (r * 2 + 0.06), r, z + 2.71);
        g.add(end);
      }
    }
  }

  /* ---- 木料架：切好的方木斜靠着晾 ---- */
  {
    const BEAM = M.woodDark;
    for (let i = 0; i < 7; i++) {
      const beam = box(0.3, 0.3, 8.0, BEAM);
      beam.position.set(4.0 + i * 0.34, 0.6, 4.0);
      beam.rotation.x = 0.18;
      g.add(beam);
    }
    // 支撑的横枕
    const skid = box(3.0, 0.22, 0.22, M.wood);
    skid.position.set(5.0, 0.12, 4.0);
    g.add(skid);
  }

  /* ---- 工棚：一侧敞开，地上是刨花 ---- */
  {
    const SH = 7.0, SD = 5.0, HH = 3.2;
    for (const dx of [-3.2, 3.2]) {
      for (const dz of [-2.2, 2.2]) {
        const p = cyl(0.16, 0.2, HH, 6, M.wood);
        p.position.set(4.0 + dx, HH / 2, -5.0 + dz);
        g.add(p);
      }
    }
    const roof = box(SH + 0.8, 0.18, SD + 0.8, M.thatch);
    roof.position.set(4.0, HH, -5.0);
    roof.castShadow = true;
    g.add(roof);

    // 工作台与工具
    const bench = box(3.6, 0.14, 1.1, M.woodDark);
    bench.position.set(4.0, 0.9, -5.4);
    g.add(bench);
    for (const dx of [-1.5, 1.5]) {
      const leg = box(0.14, 0.9, 1.0, M.wood);
      leg.position.set(4.0 + dx, 0.45, -5.4);
      g.add(leg);
    }
    // 斧子
    const axe = box(0.06, 0.9, 0.06, M.wood, false);
    axe.position.set(5.2, 1.4, -5.4);
    axe.rotation.z = 0.3;
    g.add(axe);
    const head = box(0.34, 0.22, 0.06, M.iron, false);
    head.position.set(5.36, 1.84, -5.4);
    g.add(head);

    // 刨花堆
    for (let i = 0; i < 14; i++) {
      const curl = new THREE.Mesh(
        new THREE.TorusGeometry(0.11 + Math.random() * 0.1, 0.035, 3, 7),
        solid(0xd8c49a, { roughness: 1 })
      );
      curl.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      curl.position.set(2.0 + Math.random() * 4.0, 0.06 + Math.random() * 0.14, -6.2 + Math.random() * 2.4);
      g.add(curl);
    }
  }

  /* ---- 一辆运木料的板车 ---- */
  {
    const CAR = new THREE.Group();
    CAR.position.set(-3.0, 0, -6.0);
    CAR.rotation.y = 0.4;

    const bed = box(5.2, 0.2, 2.2, M.woodDark);
    bed.position.y = 0.95;
    CAR.add(bed);
    // 车上的圆木
    for (let i = 0; i < 3; i++) {
      const l = cyl(0.3, 0.3, 4.6, 9, M.wood);
      l.rotation.z = Math.PI / 2;
      l.position.set(0, 1.26 + (i === 2 ? 0.5 : 0), -0.6 + (i % 2) * 1.2);
      CAR.add(l);
    }
    // 车轮
    for (const dz of [-1.15, 1.15]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 5, 14), M.woodDark);
      w.position.set(-0.4, 0.62, dz);
      w.rotation.y = Math.PI / 2;
      w.castShadow = true;
      CAR.add(w);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sp = box(0.08, 1.16, 0.08, M.wood, false);
        sp.position.set(-0.4, 0.62, dz);
        sp.rotation.x = a;
        CAR.add(sp);
      }
    }
    // 辕
    for (const dz of [-0.8, 0.8]) {
      const shaft = box(3.0, 0.12, 0.12, M.wood);
      shaft.position.set(3.8, 0.85, dz);
      CAR.add(shaft);
    }
    g.add(CAR);
  }

  return g;
}

/* ============================================================
 *  4. 马具匠铺：皮子、鞍架、缝马鞍的案子
 * ========================================================== */
export function makeSaddlery(M) {
  const g = new THREE.Group();
  const LEATHER = solid(0x6b4526, { roughness: 0.86 });
  const LEATHER_L = solid(0x9a7448, { roughness: 0.9 });

  /* ---- 工坊：石基 + 木骨 + 敞开的前脸 ---- */
  {
    const W = 9.0, D = 7.0, H = 3.4;
    const base = box(W + 0.6, 0.5, D + 0.6, M.stoneLight);
    base.position.y = 0.25;
    g.add(base);

    // 后墙与两侧
    const back = box(W, H, 0.4, M.plaster);
    back.position.set(0, 0.5 + H / 2, -D / 2);
    g.add(back);
    for (const sx of [-1, 1]) {
      const side = box(0.4, H, D, M.plaster);
      side.position.set(sx * W / 2, 0.5 + H / 2, 0);
      g.add(side);
    }

    // 前脸的木骨架：立柱 + 横梁 + 斜撑
    for (const sx of [-1, 0, 1]) {
      const post = box(0.26, H, 0.26, M.timber);
      post.position.set(sx * W / 2, 0.5 + H / 2, D / 2);
      g.add(post);
    }
    const beamTop = box(W + 0.3, 0.26, 0.28, M.timber);
    beamTop.position.set(0, 0.5 + H - 0.13, D / 2);
    g.add(beamTop);
    for (const sx of [-1, 1]) {
      const brace = box(0.2, 1.5, 0.2, M.timber);
      brace.position.set(sx * W / 4, 0.5 + H - 0.7, D / 2);
      brace.rotation.z = sx * 0.72;
      g.add(brace);
    }

    // 屋顶
    const roof = ridgeRoof(W + 1.0, D + 1.4, 1.9, M.tile);
    roof.position.set(0, 0.5 + H, 0);
    g.add(roof);

    // 门楣上的招牌：一块钉着马鞍图形的木板
    const sign = box(2.4, 0.8, 0.1, M.woodDark);
    sign.position.set(0, 0.5 + H + 0.2, D / 2 + 0.6);
    g.add(sign);
    const signArt = box(1.2, 0.34, 0.04, LEATHER_L, false);
    signArt.position.set(0, 0.5 + H + 0.24, D / 2 + 0.66);
    g.add(signArt);

    // 弯臂铁架
    const bracket = box(0.08, 0.08, 0.7, M.iron, false);
    bracket.position.set(0, 0.5 + H + 0.62, D / 2 + 0.3);
    g.add(bracket);
  }

  /* ---- 鞍架：三个木马形的架子，上面搭着半成品的鞍 ---- */
  {
    for (let i = 0; i < 3; i++) {
      const x = -2.6 + i * 2.6;
      const z = 4.4;

      // 底座与立柱
      const stand = box(1.0, 0.16, 0.7, M.woodDark);
      stand.position.set(x, 0.58, z);
      g.add(stand);
      const col = box(0.2, 1.1, 0.2, M.wood);
      col.position.set(x, 0.55, z);
      g.add(col);
      // 马背形的横木
      const back = box(1.5, 0.22, 0.34, M.wood);
      back.position.set(x, 1.16, z);
      back.rotation.z = 0.02 * (i - 1);
      g.add(back);

      // 鞍：座 + 前后桥
      const seat = box(1.0, 0.18, 0.72, LEATHER);
      seat.position.set(x, 1.34, z);
      g.add(seat);
      const pommel = box(0.22, 0.3, 0.5, LEATHER);
      pommel.position.set(x + 0.42, 1.5, z);
      g.add(pommel);
      const cantle = box(0.18, 0.36, 0.56, LEATHER);
      cantle.position.set(x - 0.42, 1.52, z);
      g.add(cantle);
      // 马镫：两条皮带挂下来，末端一个铁环
      for (const dz of [-0.42, 0.42]) {
        const strap = box(0.06, 0.68, 0.05, LEATHER, false);
        strap.position.set(x, 1.0, z + dz);
        g.add(strap);
        const stirrup = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 4, 12), M.iron);
        stirrup.position.set(x, 0.64, z + dz);
        stirrup.castShadow = true;
        g.add(stirrup);
      }
    }
  }

  /* ---- 工作台：皮子、锥子、一轴线 ---- */
  {
    const bench = box(4.6, 0.16, 1.5, M.woodDark);
    bench.position.set(-2.0, 1.0, 1.4);
    g.add(bench);
    for (const dx of [-2.0, 2.0]) {
      for (const dz of [-0.55, 0.55]) {
        const leg = box(0.16, 1.0, 0.16, M.wood);
        leg.position.set(-2.0 + dx, 0.5, 1.4 + dz);
        g.add(leg);
      }
    }

    // 摊开的一张皮
    const hide = box(2.0, 0.03, 1.1, LEATHER_L, false);
    hide.position.set(-2.4, 1.1, 1.4);
    hide.rotation.y = 0.08;
    g.add(hide);

    // 锥子、锤子与线轴
    const awl = box(0.05, 0.26, 0.05, M.wood, false);
    awl.position.set(-0.8, 1.21, 1.2);
    g.add(awl);
    const awlTip = cyl(0.012, 0.012, 0.16, 4, M.iron, false);
    awlTip.position.set(-0.8, 1.42, 1.2);
    g.add(awlTip);
    const spool = cyl(0.11, 0.11, 0.24, 8, solid(0xb8a888, { roughness: 1 }));
    spool.position.set(0.2, 1.2, 1.7);
    g.add(spool);
  }

  /* ---- 墙上挂的皮带与缰绳 ---- */
  {
    // 后墙内皮面在 z = -3.5 + 0.2，再往里一点挂
    for (let i = 0; i < 5; i++) {
      const belt = box(0.1, 1.5 + Math.random() * 0.6, 0.04, LEATHER, false);
      belt.position.set(-3.4 + i * 1.7, 2.1, -3.26);
      g.add(belt);
    }
  }

  /* ---- 门口一张晾着的生皮 ---- */
  {
    const frame = new THREE.Group();
    frame.position.set(4.6, 0, 4.6);
    frame.rotation.y = -0.5;
    for (const dx of [-0.9, 0.9]) {
      const post = box(0.12, 2.2, 0.12, M.wood);
      post.position.set(dx, 1.1, 0);
      frame.add(post);
    }
    const bar = box(2.0, 0.12, 0.12, M.wood);
    bar.position.y = 2.15;
    frame.add(bar);
    const pelt = box(1.7, 1.6, 0.03, solid(0x8a6a44, { roughness: 1, side: THREE.DoubleSide }), false);
    pelt.position.set(0, 1.35, 0.02);
    frame.add(pelt);
    g.add(frame);
  }

  return g;
}

/* ============================================================
 *  5. 老骑士的宅子：退役之后守着赛会过日子
 * ========================================================== */
export function makeKnightManor(M) {
  const g = new THREE.Group();
  const W = 13.0, D = 10.0, H = 5.2;

  /* ---- 宅子本体：石砌一层 + 木构二层 ---- */
  {
    const base = box(W, H * 0.52, D, M.stone);
    base.position.y = H * 0.26;
    g.add(base);

    // 二层微微出挑
    const upper = box(W + 0.7, H * 0.48, D + 0.7, M.plaster);
    upper.position.y = H * 0.52 + H * 0.24;
    g.add(upper);

    // 木骨架
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = box(0.26, H * 0.48, 0.26, M.timber);
        post.position.set(sx * (W / 2 + 0.3), H * 0.52 + H * 0.24, sz * (D / 2 + 0.3));
        g.add(post);
      }
    }
    const band = box(W + 0.9, 0.24, D + 0.9, M.timber);
    band.position.y = H * 0.52;
    g.add(band);
    const topBand = box(W + 0.9, 0.26, D + 0.9, M.timber);
    topBand.position.y = H * 0.98;
    g.add(topBand);
    // 斜撑
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const brace = box(0.22, 1.7, 0.22, M.timber);
        brace.position.set(sx * (W / 2 - 1.4), H * 0.78, sz * (D / 2 + 0.34));
        brace.rotation.z = sx * 0.66;
        g.add(brace);
      }
    }

    // 屋顶
    const roof = ridgeRoof(W + 1.6, D + 2.0, 2.8, M.slate);
    roof.position.set(0, H, 0);
    g.add(roof);

    // 两端山墙
    for (const sx of [-1, 1]) {
      const end = gable(D + 0.7, 0.4, 2.5, M.stoneLight);
      end.rotation.y = Math.PI / 2;
      end.position.set(sx * (W / 2 + 0.35), H, 0);
      g.add(end);
    }

    // 石烟囱
    const chim = box(1.0, 3.4, 1.0, M.stoneStrong);
    chim.position.set(-3.4, H + 2.4, -2.4);
    g.add(chim);

    // 门：厚木板 + 铁件 + 门前的石阶
    const door = box(1.7, 2.5, 0.16, M.woodDark);
    door.position.set(0, 1.25, D / 2 + 0.06);
    g.add(door);
    for (const dy of [0.7, 1.9]) {
      const strap = box(1.5, 0.12, 0.06, M.iron, false);
      strap.position.set(0, dy, D / 2 + 0.14);
      g.add(strap);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 4, 10), M.iron);
    ring.position.set(0.5, 1.2, D / 2 + 0.16);
    g.add(ring);
    for (let i = 0; i < 2; i++) {
      const st = box(2.6, 0.2, 0.5, M.stoneLight);
      st.position.set(0, 0.1 + i * 0.2, D / 2 + 0.5 + (1 - i) * 0.42);
      g.add(st);
    }

    // 窗：一层两扇、二层四扇
    const winsLower = [[-3.6, D / 2 + 0.06], [3.6, D / 2 + 0.06]];
    for (const [x, z] of winsLower) {
      const w = box(0.85, 1.0, 0.14, M.window, false);
      w.position.set(x, 1.9, z);
      w.userData.keepSeparate = true;
      g.add(w);
      const lintel = box(1.1, 0.14, 0.2, M.stoneLight, false);
      lintel.position.set(x, 2.48, z);
      g.add(lintel);
    }
    for (const x of [-4.2, -1.5, 1.5, 4.2]) {
      const w = box(0.75, 0.9, 0.14, M.window, false);
      w.position.set(x, H * 0.74, D / 2 + 0.42);
      w.userData.keepSeparate = true;
      g.add(w);
      // 百叶
      for (const sx of [-1, 1]) {
        const shutter = box(0.34, 0.9, 0.05, M.woodDark, false);
        shutter.position.set(x + sx * 0.55, H * 0.74, D / 2 + 0.45);
        g.add(shutter);
      }
    }
  }

  /* ---- 院墙与院门 ---- */
  {
    const YARD_W = 22, YARD_D = 16;
    const wallH = 1.5;
    // 北、东、西三面；南面留门
    const segs = [
      [YARD_W, 0, -YARD_D / 2, 0],
      [YARD_D, -YARD_W / 2, 0, Math.PI / 2],
      [YARD_D, YARD_W / 2, 0, Math.PI / 2],
    ];
    for (const [len, x, z, ry] of segs) {
      const w = box(len, wallH, 0.6, M.stone);
      w.position.set(x, wallH / 2, z);
      w.rotation.y = ry;
      g.add(w);
      const cap = box(len + 0.2, 0.16, 0.8, M.stoneLight);
      cap.position.set(x, wallH + 0.08, z);
      cap.rotation.y = ry;
      g.add(cap);
    }
    // 南墙两段
    for (const sx of [-1, 1]) {
      const half = (YARD_W - 4.5) / 2;
      const w = box(half, wallH, 0.6, M.stone);
      w.position.set(sx * (4.5 / 2 + half / 2), wallH / 2, YARD_D / 2);
      g.add(w);
      const cap = box(half + 0.2, 0.16, 0.8, M.stoneLight);
      cap.position.set(sx * (4.5 / 2 + half / 2), wallH + 0.08, YARD_D / 2);
      g.add(cap);
    }
    // 门墩
    for (const sx of [-1, 1]) {
      const post = box(0.9, 2.4, 0.9, M.stoneStrong);
      post.position.set(sx * 2.25, 1.2, YARD_D / 2);
      g.add(post);
      const cap = box(1.1, 0.2, 1.1, M.stoneLight);
      cap.position.set(sx * 2.25, 2.5, YARD_D / 2);
      g.add(cap);
    }
  }

  /* ---- 院子里的东西：马桩、水槽、兵器架 ---- */
  {
    const CZ = 6.0;
    // 拴马桩
    for (const x of [-5.0, -3.2]) {
      const p = box(0.22, 1.6, 0.22, M.wood);
      p.position.set(x, 0.8, CZ);
      g.add(p);
    }
    const rail = box(2.6, 0.14, 0.14, M.wood);
    rail.position.set(-4.1, 1.5, CZ);
    g.add(rail);

    // 水槽
    const trough = box(3.0, 0.5, 0.9, M.woodDark);
    trough.position.set(2.0, 0.25, CZ + 1.0);
    g.add(trough);
    const water = box(2.6, 0.08, 0.6, M.waterDark, false);
    water.position.set(2.0, 0.44, CZ + 1.0);
    g.add(water);

    // 兵器架：两杆旧枪、一面盾
    const rackX = 5.4;
    for (const dz of [-0.9, 0.9]) {
      const p = box(0.16, 1.9, 0.16, M.wood);
      p.position.set(rackX, 0.95, CZ + dz);
      g.add(p);
    }
    const bar = box(0.16, 0.14, 2.1, M.wood);
    bar.position.set(rackX, 1.8, CZ);
    g.add(bar);
    for (const dz of [-0.55, 0.55]) {
      const shaft = cyl(0.04, 0.04, 2.6, 5, M.wood, false);
      shaft.position.set(rackX, 1.3, CZ + dz);
      g.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 4), M.iron);
      tip.position.set(rackX, 2.72, CZ + dz);
      g.add(tip);
    }
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 14), M.woodDark);
    shield.rotation.z = Math.PI / 2;
    shield.position.set(rackX + 0.3, 1.3, CZ + 1.4);
    shield.rotation.y = Math.PI / 2;
    g.add(shield);
  }

  /* ---- 门前的一面小旗：老骑士的家徽 ---- */
  {
    const pole = cyl(0.07, 0.09, 5.0, 6, M.wood);
    pole.position.set(-4.4, 2.5, D / 2 + 2.2);
    g.add(pole);
    const flag = box(1.8, 1.1, 0.04, CLOTH(0x7a2f34), false);
    flag.position.set(-3.5, 4.2, D / 2 + 2.2);
    g.add(flag);
    const emblem = box(0.4, 0.4, 0.02, solid(0xd8b25e, { roughness: 0.5, metalness: 0.6 }), false);
    emblem.position.set(-3.5, 4.2, D / 2 + 2.23);
    emblem.rotation.z = Math.PI / 4;
    g.add(emblem);
  }

  return g;
}
