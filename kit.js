import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  村镇建造工具箱
 *
 *  十个新镇共用的小零件：确定性随机、调色板、参数化房屋、
 *  屋顶、栅栏、栈桥、实例化散布……
 *  所有函数都只返回 Group / Mesh，位置与朝向由调用方决定。
 *  所有网格尽量共用 palette 里的材质，compactGroup 才合并得动。
 * ========================================================== */

/** 带种子的随机数（mulberry32）：同一个镇每次打开长得一样 */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.sign = () => (f() < 0.5 ? -1 : 1);
  return f;
}

/* ---------------- 基础网格 ---------------- */

export function box(w, h, d, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, seg, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

export function cone(r, h, seg, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

export function sphere(r, mat, ws = 10, hs = 7, cast = true) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

export function at(mesh, x, y, z, ry = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  return mesh;
}

/* ---------------- 调色板：在 TM 的基础上换色，不换贴图 ---------------- */

/**
 * 从镇子共用材质 TM 派生出一套调色板。
 * tint(base, hex) 会复制材质并改色；相同 (base, hex) 只复制一次，
 * 所以十个镇里同色的墙面共用一份材质。
 */
export function makePalette(TM) {
  const cache = new Map();
  const std = (key, params) => {
    if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial(params));
    return cache.get(key);
  };
  const tint = (name, hex) => {
    const key = `${name}:${hex}`;
    if (!cache.has(key)) {
      const m = TM[name].clone();
      m.color.setHex(hex);
      cache.set(key, m);
    }
    return cache.get(key);
  };
  const flat = (hex, rough = 0.95, extra = {}) => std(`flat:${hex}:${rough}:${JSON.stringify(extra)}`, { color: hex, roughness: rough, ...extra });

  return {
    TM, tint, flat, std,

    // 墙：灰泥可调色（用 stucco 的纹理），石墙、木墙沿用
    wash: (hex) => tint('stucco', hex),
    stone: TM.stone,
    stoneLight: TM.stoneLight,
    timber: TM.timber,
    beam: TM.beam,
    wood: TM.wood,
    woodDark: TM.woodDark,
    plaster: TM.plaster,
    cobble: TM.cobble,

    // 屋顶
    tile: TM.tile,
    slate: TM.slate,
    thatch: TM.thatch,
    shingle: tint('woodDark', 0x8a6a4a),
    turf: flat(0x5d7a3a, 1, { flatShading: true }),
    terracotta: tint('tile', 0xc87a52),
    copper: flat(0x4f9a86, 0.5, { metalness: 0.5 }),
    snowRoof: flat(0xf2f6fa, 0.9),

    // 其他
    iron: TM.iron,
    rope: TM.rope,
    dark: TM.dark,
    window: TM.window,
    lanternGlass: TM.lanternGlass,
    water: TM.water,
    road: TM.road,
    linen: TM.linen,
  };
}

/* ---------------- 屋顶 ---------------- */

/**
 * 两坡屋顶：两块倾斜板 + 两面山墙三角。
 * w 沿 X（屋檐方向的跨度），d 沿 Z（屋脊方向），脊在 X=0。
 */
export function gableRoof(w, d, h, roofMat, wallMat, { over = 0.35, thick = 0.14, gables = true } = {}) {
  const g = new THREE.Group();
  const half = w / 2 + over;
  const slope = Math.hypot(half, h);
  const ang = Math.atan2(h, half);
  for (const s of [-1, 1]) {
    const slab = box(slope, thick, d + over * 2, roofMat);
    slab.position.set((s * half) / 2, h / 2, 0);
    slab.rotation.z = -s * ang;
    g.add(slab);
  }
  if (gables && wallMat) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, h - 0.02);
    shape.closePath();
    for (const s of [-1, 1]) {
      const tri = new THREE.Mesh(new THREE.ShapeGeometry(shape), wallMat);
      tri.position.z = (s * d) / 2;
      tri.rotation.y = s > 0 ? 0 : Math.PI;
      tri.castShadow = true;
      tri.receiveShadow = true;
      g.add(tri);
    }
  }
  return g;
}

/** 四坡屋顶（棱锥） */
export function hipRoof(w, d, h, mat, over = 0.3) {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, h, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(w + over * 2, 1, d + over * 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 半球穹顶 */
export function dome(r, mat, { squash = 1 } = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  m.scale.y = squash;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ---------------- 参数化房屋 ---------------- */

/**
 * 通用房屋。
 *  w,d      平面尺寸（w 沿 X，门开在 +Z 面）
 *  floors   层数
 *  floorH   层高
 *  wall     墙体材质
 *  base     墙基材质（石砌墙基，null 则没有）
 *  roof     'gable' | 'hip' | 'flat' | 'dome' | 'shed' | 'cone'
 *  roofMat  屋顶材质
 *  timber   墙面是否加木筋（立柱 + 横梁）
 *  jetty    二层是否外挑
 *  chimney  是否带烟囱（返回 userData.chimney）
 *  stilts   >0：立在高脚桩上（水乡）
 *  windows  每层正面窗数
 *  door     门板材质
 *  shutter  百叶颜色（hex）
 *  porch    门前小雨棚
 */
export function makeHouse(P, o = {}) {
  const {
    w = 6, d = 5, floors = 1, floorH = 2.6,
    wall = P.plaster, base = P.stone, baseH = 0.5,
    roof = 'gable', roofMat = P.thatch, pitch = 0.62,
    timber = false, jetty = false, chimney = true,
    stilts = 0, windows = 2, door = P.wood, shutter = null,
    porch = false, chimneyMat = P.stone, over = 0.35,
  } = o;

  const g = new THREE.Group();
  const y0 = stilts;
  const H = floors * floorH;

  // 高脚桩
  if (stilts > 0) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = cyl(0.16, 0.2, stilts + 0.6, 6, P.wood);
      p.position.set(sx * (w / 2 - 0.3), (stilts - 0.6) / 2 + 0.0, sz * (d / 2 - 0.3));
      g.add(p);
    }
    const mid = cyl(0.14, 0.18, stilts + 0.6, 6, P.wood);
    mid.position.set(0, (stilts - 0.6) / 2, 0);
    g.add(mid);
    const deck = box(w + 0.6, 0.18, d + 0.6, P.woodDark);
    deck.position.y = y0 - 0.09;
    g.add(deck);
  }

  // 墙基
  if (base) {
    const b = box(w + 0.16, baseH, d + 0.16, base);
    b.position.y = y0 + baseH / 2;
    g.add(b);
  }

  // 墙身（每层一块；二层外挑）
  for (let f = 0; f < floors; f++) {
    const ow = f > 0 && jetty ? 0.4 : 0;
    const wb = box(w + ow, floorH, d + ow, wall);
    wb.position.y = y0 + (base ? baseH * 0.6 : 0) + f * floorH + floorH / 2;
    g.add(wb);

    if (timber) {
      const yy = wb.position.y;
      const ww = w + ow + 0.06;
      const dd = d + ow + 0.06;
      // 四角柱
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const c = box(0.16, floorH, 0.16, P.timber, false);
        c.position.set((sx * ww) / 2, yy, (sz * dd) / 2);
        g.add(c);
      }
      // 上下横梁（正背面）
      for (const sz of [-1, 1]) {
        for (const ty of [-floorH / 2 + 0.07, floorH / 2 - 0.07]) {
          const bm = box(ww, 0.14, 0.14, P.timber, false);
          bm.position.set(0, yy + ty, (sz * dd) / 2);
          g.add(bm);
        }
        // 中柱
        const n = Math.max(1, Math.round(w / 1.8));
        for (let i = 1; i < n; i++) {
          const post = box(0.1, floorH - 0.2, 0.1, P.timber, false);
          post.position.set(-ww / 2 + (ww * i) / n, yy, (sz * dd) / 2);
          g.add(post);
        }
      }
    }
  }

  const topY = y0 + (base ? baseH * 0.6 : 0) + H;

  // 门与窗（正面 +Z）
  const frontZ = d / 2 + (jetty && floors > 1 ? 0 : 0);
  const doorM = box(0.95, 1.85, 0.14, door);
  doorM.position.set(0, y0 + (base ? baseH * 0.6 : 0) + 0.93, frontZ + 0.04);
  g.add(doorM);
  const lintel = box(1.2, 0.16, 0.2, P.timber, false);
  lintel.position.set(0, doorM.position.y + 1.0, frontZ + 0.05);
  g.add(lintel);

  const shutterMat = shutter != null ? P.flat(shutter) : null;
  for (let f = 0; f < floors; f++) {
    const ow = f > 0 && jetty ? 0.4 : 0;
    const zf = frontZ + ow / 2 + 0.03;
    const wy = y0 + (base ? baseH * 0.6 : 0) + f * floorH + floorH * 0.58;
    const slots = windows;
    for (let i = 0; i < slots; i++) {
      const wx = ((i + 0.5) / slots - 0.5) * (w - 0.6);
      if (f === 0 && Math.abs(wx) < 0.9) continue; // 躲开门
      const win = box(0.5, 0.62, 0.1, P.window, false);
      win.position.set(wx, wy, zf);
      g.add(win);
      if (shutterMat) {
        for (const s of [-1, 1]) {
          const sh = box(0.2, 0.66, 0.06, shutterMat, false);
          sh.position.set(wx + s * 0.37, wy, zf + 0.02);
          g.add(sh);
        }
      }
    }
  }

  // 屋顶
  let roofTop = topY;
  if (roof === 'gable') {
    const h = (w / 2) * pitch;
    const r = gableRoof(w + (jetty && floors > 1 ? 0.4 : 0), d + (jetty && floors > 1 ? 0.4 : 0), h, roofMat, wall, { over });
    r.position.y = topY;
    g.add(r);
    roofTop = topY + h;
  } else if (roof === 'hip') {
    const h = (Math.min(w, d) / 2) * pitch;
    const r = hipRoof(w, d, h, roofMat, over);
    r.position.y = topY;
    g.add(r);
    roofTop = topY + h;
  } else if (roof === 'shed') {
    const slab = box(w + over * 2, 0.16, d + over * 2, roofMat);
    slab.position.y = topY + 0.35;
    slab.rotation.x = -0.12;
    g.add(slab);
    roofTop = topY + 0.5;
  } else if (roof === 'flat') {
    const slab = box(w + 0.3, 0.3, d + 0.3, wall);
    slab.position.y = topY + 0.15;
    g.add(slab);
    // 女儿墙
    for (const [sx, sz, ww, dd] of [[0, 1, w + 0.3, 0.2], [0, -1, w + 0.3, 0.2], [1, 0, 0.2, d + 0.3], [-1, 0, 0.2, d + 0.3]]) {
      const pr = box(ww, 0.42, dd, wall);
      pr.position.set((sx * (w + 0.1)) / 2, topY + 0.5, (sz * (d + 0.1)) / 2);
      g.add(pr);
    }
    roofTop = topY + 0.7;
  } else if (roof === 'dome') {
    const slab = box(w + 0.3, 0.3, d + 0.3, wall);
    slab.position.y = topY + 0.15;
    g.add(slab);
    const dm = dome(Math.min(w, d) * 0.42, roofMat);
    dm.position.y = topY + 0.3;
    g.add(dm);
    roofTop = topY + 0.3 + Math.min(w, d) * 0.42;
  } else if (roof === 'cone') {
    const r = cone(Math.max(w, d) * 0.72, Math.max(w, d) * 0.6, 8, roofMat);
    r.position.y = topY + Math.max(w, d) * 0.3;
    g.add(r);
    roofTop = topY + Math.max(w, d) * 0.6;
  }

  // 门前雨棚
  if (porch) {
    const pr = gableRoof(1.8, 1.2, 0.5, roofMat, null, { over: 0.1, gables: false });
    pr.position.set(0, y0 + (base ? baseH * 0.6 : 0) + 2.3, frontZ + 0.7);
    g.add(pr);
    for (const s of [-1, 1]) {
      const post = box(0.1, 2.3, 0.1, P.timber, false);
      post.position.set(s * 0.8, y0 + (base ? baseH * 0.6 : 0) + 1.15, frontZ + 1.2);
      g.add(post);
    }
  }

  // 烟囱
  if (chimney && roof !== 'flat' && roof !== 'dome') {
    const cx = w * 0.28;
    const ch = box(0.6, 1.5, 0.6, chimneyMat);
    ch.position.set(cx, roofTop - 0.1, -d * 0.18);
    g.add(ch);
    const cap = box(0.78, 0.12, 0.78, chimneyMat);
    cap.position.set(cx, roofTop + 0.68, -d * 0.18);
    g.add(cap);
    g.userData.chimney = new THREE.Vector3(cx, roofTop + 0.8, -d * 0.18);
  }
  g.userData.size = { w, d, h: roofTop };
  return g;
}

/* ---------------- 栅栏 / 栈桥 / 小品 ---------------- */

/** 沿折线的栅栏：每隔 gap 一根桩，两道横杆（用 mergeGeometries 合成 3 个网格以内） */
export function fenceLine(P, pts, { gap = 2.2, h = 1.0, mat = null } = {}) {
  const g = new THREE.Group();
  const m = mat || P.wood;
  const posts = [];
  const rails = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(L / gap));
    const ang = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      posts.push([ax + (bx - ax) * t, az + (bz - az) * t]);
    }
    for (const ry of [h * 0.35, h * 0.75]) {
      const r = new THREE.BoxGeometry(0.07, 0.07, L);
      r.rotateY(ang);
      r.translate((ax + bx) / 2, ry, (az + bz) / 2);
      rails.push(r);
    }
  }
  const pg = posts.map(([x, z]) => {
    const b = new THREE.BoxGeometry(0.1, h, 0.1);
    b.translate(x, h / 2, z);
    return b;
  });
  const merged = mergeGeometries([...pg, ...rails], false);
  const mesh = new THREE.Mesh(merged, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}

/** 木栈桥 / 步道：从 (0,0) 沿 +Z 铺 len 米，宽 w，板条 + 两侧桩 */
export function boardwalk(P, len, w = 1.6, { y = 0, piles = true, rail = false } = {}) {
  const g = new THREE.Group();
  const deck = box(w, 0.12, len, P.woodDark);
  deck.position.set(0, y, len / 2);
  g.add(deck);
  // 板缝：几条深色横线，肉眼看着像一块块木板
  const gaps = [];
  for (let z = 0.6; z < len; z += 0.6) {
    const b = new THREE.BoxGeometry(w + 0.02, 0.02, 0.04);
    b.translate(0, y + 0.065, z);
    gaps.push(b);
  }
  if (gaps.length) {
    const gm = new THREE.Mesh(mergeGeometries(gaps, false), P.dark);
    gm.receiveShadow = true;
    g.add(gm);
  }
  if (piles) {
    const pg = [];
    for (let z = 1; z < len; z += 3) {
      for (const sx of [-1, 1]) {
        // 桩：从地下 1.4 米打到甲板之上 0.3 米（露一截桩头）
        const p = new THREE.CylinderGeometry(0.12, 0.14, y + 1.7, 6);
        p.translate((sx * w) / 2, (y - 1.1) / 2, z);
        pg.push(p);
      }
    }
    if (pg.length) {
      const pm = new THREE.Mesh(mergeGeometries(pg, false), P.wood);
      pm.castShadow = true;
      g.add(pm);
    }
  }
  if (rail) {
    const rg = [];
    for (const sx of [-1, 1]) {
      const r = new THREE.BoxGeometry(0.06, 0.06, len);
      r.translate((sx * w) / 2, y + 0.9, len / 2);
      rg.push(r);
      for (let z = 0; z <= len; z += 2.4) {
        const p = new THREE.BoxGeometry(0.08, 0.95, 0.08);
        p.translate((sx * w) / 2, y + 0.47, z);
        rg.push(p);
      }
    }
    const rm = new THREE.Mesh(mergeGeometries(rg, false), P.wood);
    rm.castShadow = true;
    g.add(rm);
  }
  return g;
}

/** 一把散布的小东西：把同一个几何体按位置/缩放/旋转摆成一个 InstancedMesh */
export function scatter(geo, mat, items, { cast = true, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  items.forEach((it, i) => {
    e.set(it.rx || 0, it.ry || 0, it.rz || 0);
    q.setFromEuler(e);
    p.set(it.x, it.y || 0, it.z);
    const sc = it.s ?? 1;
    s.set(it.sx ?? sc, it.sy ?? sc, it.sz ?? sc);
    m.compose(p, q, s);
    im.setMatrixAt(i, m);
    if (it.color != null) im.setColorAt(i, new THREE.Color(it.color));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = cast;
  im.receiveShadow = receive;
  im.computeBoundingSphere();
  return im;
}

/** 低多边形树：锥形针叶 / 球冠阔叶 / 棕榈。返回 {trunk, crown} 两个几何体供 scatter 用 */
export function treeGeos(kind = 'pine') {
  if (kind === 'pine') {
    const trunk = new THREE.CylinderGeometry(0.28, 0.45, 2.6, 6);
    trunk.translate(0, 1.3, 0);
    const crown = mergeGeometries([
      (() => { const c = new THREE.ConeGeometry(2.2, 3.6, 7); c.translate(0, 4.2, 0); return c; })(),
      (() => { const c = new THREE.ConeGeometry(1.7, 3.2, 7); c.translate(0, 6.0, 0); return c; })(),
      (() => { const c = new THREE.ConeGeometry(1.15, 2.8, 7); c.translate(0, 7.7, 0); return c; })(),
    ], false);
    return { trunk, crown };
  }
  if (kind === 'oak') {
    const trunk = new THREE.CylinderGeometry(0.4, 0.62, 3.2, 7);
    trunk.translate(0, 1.6, 0);
    const crown = mergeGeometries([
      (() => { const c = new THREE.IcosahedronGeometry(2.6, 0); c.translate(0, 5.0, 0); return c; })(),
      (() => { const c = new THREE.IcosahedronGeometry(1.8, 0); c.translate(1.6, 4.2, 0.6); return c; })(),
      (() => { const c = new THREE.IcosahedronGeometry(1.7, 0); c.translate(-1.4, 4.4, -0.8); return c; })(),
    ], false);
    return { trunk, crown };
  }
  if (kind === 'palm') {
    const trunk = new THREE.CylinderGeometry(0.22, 0.34, 6.2, 6);
    trunk.translate(0, 3.1, 0);
    const leaves = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const lf = new THREE.BoxGeometry(0.5, 0.06, 3.4);
      lf.translate(0, 0, 1.7);
      lf.rotateX(0.55);
      lf.rotateY(a);
      lf.translate(0, 6.2, 0);
      leaves.push(lf);
    }
    return { trunk, crown: mergeGeometries(leaves, false) };
  }
  if (kind === 'bare') {
    const trunk = new THREE.CylinderGeometry(0.2, 0.4, 4.2, 6);
    trunk.translate(0, 2.1, 0);
    const br = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.CylinderGeometry(0.06, 0.14, 2.2, 4);
      b.translate(0, 1.1, 0);
      b.rotateZ(0.7);
      b.rotateY((i / 5) * Math.PI * 2);
      b.translate(0, 3.6, 0);
      br.push(b);
    }
    return { trunk, crown: mergeGeometries(br, false) };
  }
  throw new Error('unknown tree ' + kind);
}

const GROVE_WIND = new Map();

/** 插一片同种树：返回 Group（含 2 个 InstancedMesh） */
export function grove(P, kind, pts, { leaf = 0x35502a, trunk = 0x4a3423, jitter = 0.3, scale = [0.8, 1.4], rand } = {}) {
  const r = rand || rng(7);
  const { trunk: tg, crown: cg } = treeGeos(kind);
  const items = pts.map(([x, z]) => ({ x, z, ry: r() * 6.28, s: r.range(scale[0], scale[1]) }));
  const g = new THREE.Group();
  g.add(scatter(tg, P.flat(trunk, 1), items));
  // 树冠随风轻摇：每种（树种, 叶色）共用一份带风补丁的材质，不增加着色器程序
  const swayKey = `${kind}:${leaf}`;
  let cm = GROVE_WIND.get(swayKey);
  if (!cm) {
    cm = P.flat(leaf, 1, { flatShading: true }).clone();
    const opt = kind === 'pine' ? { amp: 0.16, speed: 1.3, y0: 2.4, h: 6.7 }
      : kind === 'oak' ? { amp: 0.14, speed: 1.1, y0: 2.8, h: 4.8 }
        : kind === 'palm' ? { amp: 0.32, speed: 1.7, h: 3.4, radial: true } : null;
    if (opt) windSway(cm, opt);
    GROVE_WIND.set(swayKey, cm);
  }
  const crowns = scatter(cg, cm, items.map((it) => ({ ...it, color: undefined })));
  g.add(crowns);
  return g;
}

/** 环形随机点：围绕 (cx,cz)，半径 r0~r1，避开 keep(x,z) 返回 true 的地方 */
export function ringPoints(rand, cx, cz, r0, r1, n, keep = null) {
  const out = [];
  let guard = 0;
  while (out.length < n && guard < n * 30) {
    guard++;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(r0 * r0 + rand() * (r1 * r1 - r0 * r0));
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    if (keep && keep(x, z)) continue;
    out.push([x, z]);
  }
  return out;
}

/** 软边地块的材质：夜里要压暗，不然比四周的草地亮一大截（expansion.update 里按夜色程度调） */
export const NIGHT_PATCHES = [];

/** 圆形地块（群落地面）：贴在草地上的薄盘，polygonOffset 防闪烁 */
export function groundPatch(radius, mat, { y = -2.2, segs = 48, squashZ = 1, soft = radius >= 40 } = {}) {
  let geo;
  if (soft) {
    // 软边：内盘不透明，外圈 28% 的顶点 alpha 渐变到 0，让地块融进四周的草地而不是一个硬边圆盘
    const inner = new THREE.CircleGeometry(radius * 0.72, segs);
    const ring = new THREE.RingGeometry(radius * 0.72, radius, segs, 1);
    const paint = (g, fn) => {
      const p = g.attributes.position;
      const c = new Float32Array(p.count * 4);
      for (let i = 0; i < p.count; i++) {
        const a = fn(Math.hypot(p.getX(i), p.getY(i)) / radius);
        c.set([1, 1, 1, a], i * 4);
      }
      g.setAttribute('color', new THREE.BufferAttribute(c, 4));
    };
    paint(inner, () => 1);
    paint(ring, (r) => (r > 0.99 ? 0 : 1));
    inner.deleteAttribute('normal'); ring.deleteAttribute('normal');
    geo = mergeGeometries([inner, ring].map((g) => g.toNonIndexed ? g.toNonIndexed() : g));
    geo.computeVertexNormals();
    mat = mat.clone();
    mat.vertexColors = true;
    mat.transparent = true;
    mat.depthWrite = false;
    NIGHT_PATCHES.push({ mat, base: mat.color.clone() });
  } else {
    geo = new THREE.CircleGeometry(radius, segs);
  }
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.scale.y = squashZ;
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

/** 沿弧线/折线的带状地面（河滩、小径）：给折线加宽成带 */
export function ribbon(pts, width, mat, y = 0) {
  const n = pts.length;
  const pos = [];
  const uv = [];
  const idx = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0];
    let dz = b[1] - a[1];
    const L = Math.hypot(dx, dz) || 1;
    dx /= L; dz /= L;
    const nx = -dz;
    const nz = dx;
    if (i > 0) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    pos.push(pts[i][0] + nx * width / 2, y, pts[i][1] + nz * width / 2);
    pos.push(pts[i][0] - nx * width / 2, y, pts[i][1] - nz * width / 2);
    uv.push(0, acc / 6, 1, acc / 6);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

/* ---------------- 常见道具 ---------------- */

export function barrelStack(P, { rows = 2, cols = 3, r = 0.34, h = 0.85 } = {}) {
  const g = new THREE.Group();
  const geos = [];
  const hoops = [];
  for (let row = 0; row < rows; row++) {
    const n = cols - row;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * r * 2.05;
      const y = h / 2 + row * h * 0.88;
      const b = new THREE.CylinderGeometry(r * 0.92, r * 0.92, h, 10);
      b.translate(x, y, 0);
      geos.push(b);
      for (const dy of [-0.28, 0.28]) {
        const hp = new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.05, 10);
        hp.translate(x, y + dy * h, 0);
        hoops.push(hp);
      }
    }
  }
  const body = new THREE.Mesh(mergeGeometries(geos, false), P.woodDark);
  body.castShadow = true;
  g.add(body);
  g.add(new THREE.Mesh(mergeGeometries(hoops, false), P.iron));
  return g;
}

export function crateStack(P, { n = 4, s = 0.7, rand = rng(3) } = {}) {
  const g = new THREE.Group();
  const geos = [];
  const placed = [];
  for (let i = 0; i < n; i++) {
    const layer = i < n - 1 ? 0 : 1;
    const x = layer ? placed[0].x + 0.1 : (i % 2) * s * 1.05 + rand() * 0.1;
    const z = layer ? placed[0].z : Math.floor(i / 2) * s * 1.05 + rand() * 0.1;
    const y = layer ? s : 0;
    placed.push({ x, z });
    const b = new THREE.BoxGeometry(s, s, s);
    b.rotateY(rand() * 0.3 - 0.15);
    b.translate(x, y + s / 2, z);
    geos.push(b);
  }
  const m = new THREE.Mesh(mergeGeometries(geos, false), P.wood);
  m.castShadow = true;
  g.add(m);
  return g;
}

export function sackPile(P, { n = 6, color = 0xcdbf9a, rand = rng(5) } = {}) {
  const g = new THREE.Group();
  const geos = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.SphereGeometry(0.34, 8, 6);
    b.scale(1, 0.7, 0.8);
    b.rotateY(rand() * 3);
    b.translate((i % 3) * 0.55 + rand() * 0.1, 0.24 + Math.floor(i / 3) * 0.3, rand() * 0.2 + (i % 2) * 0.12);
    geos.push(b);
  }
  const m = new THREE.Mesh(mergeGeometries(geos, false), P.flat(color, 1));
  m.castShadow = true;
  g.add(m);
  return g;
}

/** 灯杆：返回 Group，userData.lampPos = 灯罩的局部位置（调用方据此挂光晕 / 点光源） */
export function lampPost(P, h = 3.2) {
  const g = new THREE.Group();
  const post = cyl(0.07, 0.1, h, 6, P.wood);
  post.position.y = h / 2;
  g.add(post);
  const arm = box(0.7, 0.07, 0.07, P.iron, false);
  arm.position.set(0.33, h - 0.05, 0);
  g.add(arm);
  const glass = box(0.22, 0.3, 0.22, P.lanternGlass, false);
  glass.position.set(0.64, h - 0.27, 0);
  glass.userData.keepSeparate = true;
  g.add(glass);
  const cap = box(0.3, 0.06, 0.3, P.iron, false);
  cap.position.set(0.64, h - 0.1, 0);
  g.add(cap);
  g.userData.lampPos = new THREE.Vector3(0.64, h - 0.27, 0);
  return g;
}

/** 旗：竹竿 + 一块三角旗 / 长条旗（静态） */
export function banner(P, color, { h = 5, w = 1.1, len = 2.2 } = {}) {
  const g = new THREE.Group();
  const pole = cyl(0.04, 0.05, h, 5, P.wood);
  pole.position.y = h / 2;
  g.add(pole);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, -w * 0.5);
  shape.lineTo(0, -w);
  shape.closePath();
  const f = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }));
  f.position.set(0.04, h - 0.05, 0);
  f.castShadow = true;
  g.add(f);
  return g;
}

/** 辅助：生成"相机视角"，让 flyTo 从建筑正面斜上方看过去 */
export function viewFor(x, z, rot, dist = 40, height = 22, targetY = 4) {
  return {
    pos: [x + Math.sin(rot) * dist, height, z + Math.cos(rot) * dist],
    target: [x, targetY, z],
  };
}

/** 局部 → 世界（与 group.rotation.y = rot 同一套变换） */
export function toWorld(cx, cz, rot) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return (lx, lz) => ({ x: cx + lx * c + lz * s, z: cz - lx * s + lz * c });
}

/* ---------------- 补充零件 ---------------- */

/**
 * 阶梯山墙（佛兰德 / 汉萨风格）：贴在房子正面屋脊处的一叠逐级收窄的石块。
 * w = 房宽；steps 级；返回 Group，原点在山墙底边中点，向 +Z 一侧突出 0.35。
 */
export function stepGable(w, mat, { steps = 5, stepH = 0.6, thick = 0.4 } = {}) {
  const g = new THREE.Group();
  const geos = [];
  for (let i = 0; i < steps; i++) {
    const ww = w - i * (w * 0.78 / steps);
    const b = new THREE.BoxGeometry(ww, stepH, thick);
    b.translate(0, stepH / 2 + i * stepH, 0);
    geos.push(b);
  }
  const top = new THREE.BoxGeometry(0.3, 0.5, thick);
  top.translate(0, steps * stepH + 0.25, 0);
  geos.push(top);
  const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return g;
}

/** 渔网 / 栅网贴图（白色网格，其余透明），用 alphaTest 裁掉空洞，不需要 transparent */
let _netMat = null;
export function netMaterial(color = 0xd8cfae) {
  if (_netMat) return _netMat;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 64, 64);
  x.strokeStyle = '#ffffff';
  x.lineWidth = 3;
  x.beginPath();
  for (let i = -64; i < 128; i += 16) {
    x.moveTo(i, 0); x.lineTo(i + 64, 64);
    x.moveTo(i + 64, 0); x.lineTo(i, 64);
  }
  x.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  _netMat = new THREE.MeshStandardMaterial({
    color, map: tex, alphaTest: 0.5, roughness: 1, side: THREE.DoubleSide,
  });
  return _netMat;
}

/** 一张垂在两根杆之间的网：宽 w 高 h，微微下垂 */
export function hangingNet(w, h, { sag = 0.25 } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, 8, 3);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2);
    p.setZ(i, (1 - x * x) * sag * (0.4 + (0.5 - p.getY(i) / h)));
  }
  geo.computeVertexNormals();
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 1.2, uv.getY(i) * h / 1.2);
  const m = new THREE.Mesh(geo, netMaterial());
  m.castShadow = true;
  return m;
}

/** 船锚：中柱 + 横杆 + 两只锚爪 + 环 */
export function anchor(P, s = 1) {
  const g = new THREE.Group();
  const shaft = box(0.12 * s, 1.5 * s, 0.12 * s, P.iron);
  shaft.position.y = 0.75 * s;
  g.add(shaft);
  const stock = box(0.8 * s, 0.1 * s, 0.1 * s, P.iron);
  stock.position.y = 1.35 * s;
  g.add(stock);
  for (const sx of [-1, 1]) {
    const arm = box(0.55 * s, 0.1 * s, 0.1 * s, P.iron);
    arm.position.set(sx * 0.25 * s, 0.1 * s, 0);
    arm.rotation.z = -sx * 0.55;
    g.add(arm);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14 * s, 0.025 * s, 5, 10), P.iron);
  ring.position.y = 1.55 * s;
  g.add(ring);
  return g;
}

/** 沿折线的墙段（石墙 / 码头壁）：每段一个盒子，合成一个网格。pts=[[x,z],…] */
export function wallAlong(pts, { h = 1, thick = 0.5, y0 = 0, mat }) {
  const geos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az) + 0.02;
    const b = new THREE.BoxGeometry(thick, h, L);
    b.rotateY(Math.atan2(bx - ax, bz - az));
    b.translate((ax + bx) / 2, y0 + h / 2, (az + bz) / 2);
    geos.push(b);
  }
  const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 画布贴图小工具：条纹帆布、旗帜、招牌 */
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---------------- 轻量动物 ---------------- */

/** 给几何体写满同一种顶点色（线性空间由 THREE.Color 负责转换） */
export function colored(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/**
 * 轻量绵羊：身体 + 毛团 + 四条腿烘成一个顶点色网格，头单独一个网格（挂在枢轴上点头）。
 * 每只 2 次绘制；返回 { group, head }。
 */
export function makeSheepLite(P, { tone = 0xe4ddcc, scale = 1 } = {}) {
  const vc = P.std('sheep:vc', { vertexColors: true, roughness: 1 });
  const g = new THREE.Group();
  const parts = [];
  const body = new THREE.SphereGeometry(0.52, 8, 6);
  body.scale(1, 0.86, 1.5);
  body.translate(0, 0.78, 0);
  parts.push(colored(body, tone));
  const tuft = new THREE.SphereGeometry(0.3, 6, 5);
  tuft.translate(0.12, 1.05, 0.15);
  parts.push(colored(tuft, tone));
  const tuft2 = new THREE.SphereGeometry(0.28, 6, 5);
  tuft2.translate(-0.15, 1.02, -0.3);
  parts.push(colored(tuft2, tone));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.09, 0.42, 0.09);
    leg.translate(sx * 0.24, 0.21, sz * 0.4);
    parts.push(colored(leg, 0x3a332a));
  }
  const tail = new THREE.SphereGeometry(0.12, 5, 4);
  tail.translate(0, 0.8, -0.78);
  parts.push(colored(tail, tone));
  const bm = new THREE.Mesh(mergeGeometries(parts, false), vc);
  bm.castShadow = true;
  g.add(bm);

  const head = new THREE.Group();
  head.position.set(0, 0.82, 0.72);
  const hp = [];
  const skull = new THREE.SphereGeometry(0.19, 7, 5);
  skull.scale(1, 1.05, 1.15);
  hp.push(colored(skull, 0x3a332a));
  const snout = new THREE.BoxGeometry(0.16, 0.14, 0.2);
  snout.translate(0, -0.05, 0.16);
  hp.push(colored(snout, 0x3a332a));
  for (const sx of [-1, 1]) {
    const ear = new THREE.BoxGeometry(0.16, 0.05, 0.09);
    ear.rotateZ(sx * 0.45);
    ear.translate(sx * 0.19, 0.05, -0.02);
    hp.push(colored(ear, 0x3a332a));
  }
  const hm = new THREE.Mesh(mergeGeometries(hp, false), vc);
  hm.castShadow = true;
  head.add(hm);
  head.userData.keepSeparate = true;
  g.add(head);
  g.scale.setScalar(scale);
  return { group: g, head };
}

/* ---------------- 风：给植物材质打一个顶点摇摆补丁 ---------------- */

/** 共享的风时钟：expansion.update 每帧写入 */
export const WIND = { uTime: { value: 0 } };

/**
 * 让一块 InstancedMesh 的植物材质随风摇：顶端摆得多、根部不动，相位按实例的世界位置错开。
 * y0/h 是几何体在局部 y 方向的起点和高度（Cone/Cylinder 居中的话 y0 = -h/2）。
 * 纯顶点着色器，没有 CPU 开销；阴影用的是别的深度材质，不跟着摇（几十厘米，看不出）。
 */
export function windSway(mat, { amp = 0.2, speed = 1.6, y0 = -1.4, h = 2.8, radial = false } = {}) {
  mat.userData.wind = true;     // dedupMaterials 看到 userData 非空就不会把它并进别的材质
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWindT = WIND.uTime;
    // radial：以局部 xz 平面里离原点的距离为权重（棕榈叶：叶尖摆得多），并且上下起伏而不是横向摇
    const weight = radial
      ? `float w = clamp(length(transformed.xz) / ${h.toFixed(3)}, 0.0, 1.0);`
      : `float w = clamp((transformed.y - (${y0.toFixed(3)})) / ${h.toFixed(3)}, 0.0, 1.0); w *= w;`;
    const move = radial
      ? `transformed.y += sin(uWindT * ${speed.toFixed(2)} + ph.x * 0.35 + ph.y * 0.2) * ${amp.toFixed(3)} * w;
          transformed.x += cos(uWindT * ${(speed * 0.7).toFixed(2)} + ph.y * 0.3) * ${(amp * 0.4).toFixed(3)} * w;`
      : `transformed.x += sin(uWindT * ${speed.toFixed(2)} + ph.x * 0.35 + ph.y * 0.2) * ${amp.toFixed(3)} * w;
          transformed.z += cos(uWindT * ${(speed * 0.8).toFixed(2)} + ph.y * 0.3 + ph.x * 0.1) * ${(amp * 0.6).toFixed(3)} * w;`;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          ${weight}
          vec2 ph = vec2(0.0);
          #ifdef USE_INSTANCING
            ph = instanceMatrix[3].xz;
          #endif
          ${move}
        }`);
  };
  mat.customProgramCacheKey = () => `wind:${amp}:${speed}:${y0}:${h}:${radial}`;
  mat.needsUpdate = true;
  return mat;
}

/* ---------------- 粒子发射器 ---------------- */

/**
 * 粒子发射器（火星、水雾、落叶、尘土、气泡、萤火……）：一个 Points + 一个小着色器。
 * 每个粒子从 spread 盒里出生，按 vel 飞、受 gravity / wind 影响，寿命到了就重生，透明度随年龄淡出。
 * 返回 { pts, update(dt, t, night) }：pts 自己摆到场景里，update 每帧调一次。
 * night（夜色程度 0..1 的含义见 expansion.update）：'only' 只在夜里出现，'day' 只在白天出现。
 * gate(t) 为假时，死掉的粒子不再重生；变真的那一刻它们一起冒出来（火星迸溅）。
 */
export function createEmitter(camera, {
  x = 0, y = 0, z = 0, count = 40, life = 2, size = 0.4, color = 0xffffff, opacity = 0.8,
  spread = [0.5, 0.2, 0.5], vel = [0, 1, 0], jitter = [0.3, 0.3, 0.3], gravity = 0, wind = [0, 0, 0],
  additive = false, grow = 0, fadeIn = 0.1, night = null, gate = null, rand = Math.random,
} = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const age = new Float32Array(count);
  const ageAttr = new Float32Array(count);
  const vels = new Float32Array(count * 3);
  const lifes = new Float32Array(count);
  const spawn = (i, first) => {
    pos[i * 3] = (rand() - 0.5) * spread[0] * 2;
    pos[i * 3 + 1] = (rand() - 0.5) * spread[1] * 2;
    pos[i * 3 + 2] = (rand() - 0.5) * spread[2] * 2;
    vels[i * 3] = vel[0] + (rand() - 0.5) * jitter[0] * 2;
    vels[i * 3 + 1] = vel[1] + (rand() - 0.5) * jitter[1] * 2;
    vels[i * 3 + 2] = vel[2] + (rand() - 0.5) * jitter[2] * 2;
    lifes[i] = life * (0.6 + rand() * 0.8);
    age[i] = first ? rand() * lifes[i] : 0;
  };
  for (let i = 0; i < count; i++) spawn(i, true);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAge', new THREE.BufferAttribute(ageAttr, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uScale: { value: 600 },
      uOpacity: { value: opacity }, uGrow: { value: grow }, uFadeIn: { value: fadeIn },
    },
    transparent: true, depthWrite: false, fog: false, toneMapped: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: /* glsl */ `
      attribute float aAge;
      uniform float uSize; uniform float uScale; uniform float uGrow;
      varying float vAge;
      void main() {
        vAge = aAge;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (1.0 + uGrow * aAge) * uScale / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; uniform float uFadeIn;
      varying float vAge;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c) * 2.0;
        if (d > 1.0) discard;
        float soft = 1.0 - d * d;
        float a = soft * uOpacity * (1.0 - vAge) * smoothstep(0.0, max(0.001, uFadeIn), vAge);
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.position.set(x, y, z);
  pts.frustumCulled = false;
  pts.userData.keepSeparate = true;
  const update = (dt, t, nightAmt) => {
    mat.uniforms.uScale.value = (window.innerHeight * Math.min(window.devicePixelRatio || 1, 1.5)) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    const vis = night === 'only' ? THREE.MathUtils.clamp((nightAmt - 0.2) / 0.6, 0, 1) : night === 'day' ? 1 - nightAmt : 1;
    mat.uniforms.uOpacity.value = opacity * vis;
    pts.visible = vis > 0.02;
    if (!pts.visible) return;
    const step = Math.min(dt, 0.05);
    const on = !gate || gate(t);
    for (let i = 0; i < count; i++) {
      age[i] += step;
      if (age[i] >= lifes[i]) {
        if (!on) { ageAttr[i] = 1; continue; }
        spawn(i, false);
      }
      vels[i * 3] += wind[0] * step;
      vels[i * 3 + 1] += (wind[1] - gravity) * step;
      vels[i * 3 + 2] += wind[2] * step;
      pos[i * 3] += vels[i * 3] * step;
      pos[i * 3 + 1] += vels[i * 3 + 1] * step;
      pos[i * 3 + 2] += vels[i * 3 + 2] * step;
      ageAttr[i] = age[i] / lifes[i];
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAge.needsUpdate = true;
  };
  return { pts, update };
}
