import * as THREE from 'three';

/* ============================================================
 *  琥珀王国（Solmira）共用的建筑零件与调色板
 *
 *  风格：地中海 + 摩尔 + 拜占庭——象牙色砂岩与白灰泥、平屋顶、洋葱穹顶、
 *  细高宣礼塔式角塔、半圆拱廊、青绿琉璃与金顶；柏树、橄榄、枣椰；骆驼与山羊。
 *  与北方王国（灰石墙、红瓦、木筋、松树、绵羊）在轮廓、色相、植被上全部拉开。
 * ========================================================== */

export function solKit(P, K) {
  const { box, cyl, cone, sphere } = K;

  const M = {
    sand: P.tint('stone', 0xe8d6a6),
    sandD: P.tint('stone', 0xcdb27c),
    sandL: P.tint('stone', 0xf3e8c8),
    white: P.wash(0xf6f0e0),
    cream: P.wash(0xefdfb8),
    ochre: P.wash(0xdcb676),
    rose: P.wash(0xe6b99c),
    sky: P.wash(0xb9d8dc),
    teal: P.flat(0x1e8c92, 0.4, { metalness: 0.25 }),
    tealD: P.flat(0x14656b, 0.45, { metalness: 0.2 }),
    gold: P.flat(0xe0ac2e, 0.32, { metalness: 0.7 }),
    terra: P.terracotta,
    wood: P.woodDark,
    door: P.flat(0x3b7f8a, 0.8),
    dark: P.dark,
    win: P.window,
    water: P.flat(0x3aa6b8, 0.12, { metalness: 0.35 }),
    leafCyp: 0x2c4a2a,
    leafOlive: 0x8fa070,
    leafPalm: 0x4f8a3a,
    dirt: P.flat(0xcdb98a, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    paving: P.flat(0xb9a574, 0.95, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    awning: [0xc8452f, 0x1f8c92, 0xe0ac2e, 0x7a3a8a, 0x3a8a4a, 0xe9e0c8],
    cloth: [0xc8452f, 0x1f8c92, 0xe0ac2e, 0x7a3a8a, 0x2f6aa8, 0xd9d0b4],
  };
  // 琥珀王国的服色：青、金、赭、白
  const ROBES = [0x1f8c92, 0xe0ac2e, 0xc8452f, 0xf0e8d0, 0x2f6aa8, 0x8a5a2a, 0x7a3a8a];

  /** 洋葱穹顶：车削体。r 底半径，h 高 */
  function onion(r, h, mat, seg = 14) {
    const pts = [
      [r * 0.0, 0], [r * 0.82, 0], [r * 1.0, h * 0.14], [r * 1.02, h * 0.3], [r * 0.82, h * 0.5],
      [r * 0.46, h * 0.7], [r * 0.16, h * 0.88], [0, h],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg), mat);
    m.castShadow = true;
    return m;
  }

  /** 带孔的拱墙：长 len、高 h、厚 th，开 n 个半圆拱洞（洞宽 aw、洞口总高 ah），洞后是深色背板 */
  function archedWall(len, h, th, n, mat, { aw = 1.6, ah = 2.8, y0 = 0.0, back = M.dark } = {}) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h); s.lineTo(-len / 2, h); s.closePath();
    for (let i = 0; i < n; i++) {
      const cx = -len / 2 + (len * (i + 0.5)) / n;
      const hole = new THREE.Path();
      const r = aw / 2;
      hole.moveTo(cx - r, y0);
      hole.lineTo(cx + r, y0);
      hole.lineTo(cx + r, y0 + ah - r);
      hole.absarc(cx, y0 + ah - r, r, 0, Math.PI, false);
      hole.lineTo(cx - r, y0);
      s.holes.push(hole);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false, curveSegments: 8 });
    geo.translate(0, 0, -th / 2);
    const wall = new THREE.Mesh(geo, mat);
    wall.castShadow = true; wall.receiveShadow = true;
    g.add(wall);
    if (back) {
      const b = box(len - 0.1, ah, 0.12, back, false);
      b.position.set(0, ah / 2 + y0, -th / 2 + 0.2);
      g.add(b);
    }
    return g;
  }

  /** 锯齿垛口（四棱锥小尖）：沿 X 方向 len 米 */
  function crenels(len, mat, { step = 1.6, h = 0.9 } = {}) {
    const items = [];
    for (let x = -len / 2 + step / 2; x <= len / 2; x += step) items.push({ x, y: h / 2, z: 0, ry: Math.PI / 4 });
    return K.scatter(new THREE.ConeGeometry(0.62, h, 4), mat, items);
  }

  /** 宣礼塔式细高塔：塔身、一圈阳台、上段细身、洋葱顶、金尖 */
  function minaret(h = 30, r = 1.5, { cap = M.teal, body = M.white } = {}) {
    const g = new THREE.Group();
    const shaft = cyl(r * 0.82, r * 1.15, h * 0.74, 10, body);
    shaft.position.y = h * 0.37;
    g.add(shaft);
    const bal = cyl(r * 1.55, r * 1.35, 0.5, 10, M.sandL);
    bal.position.y = h * 0.74;
    g.add(bal);
    const rail = cyl(r * 1.5, r * 1.5, 0.55, 10, M.sand, true);
    rail.position.y = h * 0.74 + 0.5;
    rail.scale.set(1, 1, 1);
    g.add(rail);
    const rail2 = cyl(r * 1.32, r * 1.32, 0.6, 10, M.dark, false);
    rail2.position.y = h * 0.74 + 0.5;
    g.add(rail2);
    const up = cyl(r * 0.62, r * 0.78, h * 0.18, 10, body);
    up.position.y = h * 0.74 + h * 0.09 + 0.3;
    g.add(up);
    const cp = onion(r * 1.05, h * 0.14, cap);
    cp.position.y = h * 0.92 + 0.3;
    g.add(cp);
    const fin = cyl(0.04, 0.06, h * 0.08, 5, M.gold, false);
    fin.position.y = h + 0.7;
    g.add(fin);
    const ball = sphere(0.22, M.gold, 8, 6, false);
    ball.position.y = h + 0.3;
    g.add(ball);
    // 竖向小窗缝
    for (let i = 0; i < 3; i++) {
      const sl = box(0.18, 0.9, 0.12, M.dark, false);
      sl.position.set(0, h * (0.2 + i * 0.17), r * 0.9);
      g.add(sl);
    }
    return g;
  }

  /** 大圆顶：鼓座 + 半球（可选洋葱）+ 金尖 */
  function bigDome(r, { cap = M.gold, drum = M.white, drumH = 3.6, onionTop = false } = {}) {
    const g = new THREE.Group();
    const dr = cyl(r * 1.02, r * 1.08, drumH, 20, drum);
    dr.position.y = drumH / 2;
    g.add(dr);
    // 鼓座上一圈拱窗
    const wins = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      wins.push({ x: Math.sin(a) * r * 1.03, y: drumH * 0.55, z: Math.cos(a) * r * 1.03, ry: a, sx: 0.7, sy: 1.5, sz: 0.2 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.win, wins));
    if (onionTop) {
      const o = onion(r * 1.0, r * 1.5, cap, 18);
      o.position.y = drumH;
      g.add(o);
    } else {
      const d = K.dome(r * 1.06, cap, { squash: 0.9 });
      d.position.y = drumH;
      g.add(d);
    }
    const spire = cyl(0.06, 0.1, r * 0.9, 6, M.gold, false);
    spire.position.y = drumH + r * (onionTop ? 1.5 : 0.9) + r * 0.3;
    g.add(spire);
    const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 6, 14, Math.PI * 1.5), M.gold);
    crescent.position.y = spire.position.y + r * 0.45 + 0.3;
    crescent.rotation.z = Math.PI * 0.75;
    g.add(crescent);
    return g;
  }

  /** 白房子：立方体 + 平屋顶（偶尔小圆顶 / 屋顶棚 / 水箱），青色木门窗 */
  function whiteHouse(T, rand, x, z, ry, o = {}) {
    const floors = o.floors ?? (rand() < 0.35 ? 2 : 1);
    const w = o.w ?? (5 + rand() * 4);
    const d = o.d ?? (4.5 + rand() * 3.5);
    const wall = o.wall ?? [M.white, M.white, M.cream, M.ochre, M.rose, M.sky][(rand() * 6) | 0];
    const roof = o.roof ?? (rand() < 0.14 ? 'dome' : 'flat');
    const h = T.house({
      w, d, floors, floorH: 2.7, wall, base: null, roof, roofMat: o.roofMat ?? (rand() < 0.5 ? M.teal : M.terra),
      chimney: false, windows: 2 + (rand() * 2 | 0), door: M.door, shutter: rand() < 0.7 ? 0x1e8c92 : 0xb5502f,
    }, x, z, ry);
    const top = h.userData.size.h;
    // 屋顶陈设
    if (roof === 'flat') {
      const k = rand();
      if (k < 0.3) {          // 屋顶遮阳棚
        const aw = box(w * 0.5, 0.1, d * 0.45, P.flat(M.awning[(rand() * 6) | 0], 0.9), false);
        aw.position.set(w * 0.12, top + 1.55, 0);
        h.add(aw);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const p = cyl(0.05, 0.05, 1.5, 4, M.wood, false);
          p.position.set(w * 0.12 + sx * w * 0.24, top + 0.8, sz * d * 0.2);
          h.add(p);
        }
      } else if (k < 0.5) {   // 水箱
        const t = cyl(0.55, 0.55, 0.9, 8, M.sandD);
        t.position.set(-w * 0.28, top + 0.45, -d * 0.2);
        h.add(t);
      } else if (k < 0.62) {  // 晾晒的布
        for (let i = 0; i < 3; i++) {
          const c = box(0.7, 0.9, 0.04, P.flat(M.cloth[(rand() * 6) | 0], 1), false);
          c.position.set(-w * 0.3 + i * 0.9, top + 0.9, d * 0.38);
          h.add(c);
        }
      }
    }
    // 门上方的小拱檐
    const lint = box(1.3, 0.14, 0.34, M.sandL, false);
    lint.position.set(0, 2.2, d / 2 + 0.2);
    h.add(lint);
    return h;
  }

  /** 喷泉：八角水池 + 立柱 + 碗；返回 Group，水面在 userData.water */
  function fountain(r = 3.2) {
    const g = new THREE.Group();
    const rim = cyl(r, r * 1.05, 0.7, 8, M.sandL);
    rim.position.y = 0.35;
    g.add(rim);
    const wat = cyl(r * 0.88, r * 0.88, 0.1, 8, M.water, false);
    wat.position.y = 0.66;
    g.add(wat);
    const ped = cyl(0.32, 0.5, 1.9, 8, M.sandL);
    ped.position.y = 1.5;
    g.add(ped);
    const bowl = K.dome(1.1, M.sandL, { squash: 0.45 });
    bowl.rotation.x = Math.PI;
    bowl.position.y = 2.65;
    g.add(bowl);
    const bowl2 = cyl(1.12, 1.12, 0.1, 12, M.water, false);
    bowl2.position.y = 2.62;
    g.add(bowl2);
    const tip = sphere(0.18, M.gold, 8, 6, false);
    tip.position.y = 3.2;
    g.add(tip);
    g.userData.top = new THREE.Vector3(0, 3.0, 0);
    return g;
  }

  /** 集市摊位：四根杆、斜条纹遮阳篷、柜台、货品 */
  function stall(T, rand, goodsColor) {
    const g = new THREE.Group();
    const c1 = M.awning[(rand() * 6) | 0];
    const c2 = 0xf2ead2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = cyl(0.06, 0.07, 2.6, 5, M.wood);
      p.position.set(sx * 1.4, 1.3, sz * 0.9);
      g.add(p);
    }
    for (let i = 0; i < 8; i++) {
      const s = box(0.4, 0.07, 2.3, P.flat(i % 2 ? c1 : c2, 0.95), false);
      s.position.set(-1.4 + 0.2 + i * 0.4, 2.62 - 0.0, 0);
      s.rotation.x = 0.12;
      g.add(s);
    }
    const counter = box(2.9, 0.9, 0.8, M.wood);
    counter.position.set(0, 0.45, 0.45);
    g.add(counter);
    const cloth = box(3.0, 0.06, 0.9, P.flat(c1, 1), false);
    cloth.position.set(0, 0.93, 0.45);
    g.add(cloth);
    const goods = [];
    for (let i = 0; i < 7; i++) goods.push({ x: -1.2 + i * 0.4, y: 1.08, z: 0.45 + (rand() - 0.5) * 0.3, s: 0.22 + rand() * 0.12 });
    g.add(K.scatter(new THREE.SphereGeometry(1, 6, 5), P.flat(goodsColor ?? M.awning[(rand() * 6) | 0], 0.8), goods));
    return g;
  }

  /** 骆驼：驼峰、长颈、四条长腿；head 和 body 可单独摆动 */
  function camel(scale = 1, tone = 0xc9a066) {
    const g = new THREE.Group();
    const m = P.flat(tone, 1);
    const dark = P.flat(0x6a4a2a, 1);
    const body = box(0.9, 0.85, 2.1, m);
    body.position.set(0, 1.55, 0);
    g.add(body);
    const hump = sphere(0.55, m, 8, 6);
    hump.scale.set(0.9, 1.1, 1);
    hump.position.set(0, 2.15, -0.1);
    g.add(hump);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = box(0.16, 1.35, 0.18, m);
      leg.position.set(sx * 0.3, 0.68, sz * 0.78);
      g.add(leg);
      const knee = box(0.2, 0.18, 0.22, dark, false);
      knee.position.set(sx * 0.3, 0.5, sz * 0.78);
      g.add(knee);
    }
    const neck = new THREE.Group();
    neck.position.set(0, 1.85, 1.0);
    const nk = cyl(0.17, 0.26, 1.35, 6, m);
    nk.position.set(0, 0.55, 0.35);
    nk.rotation.x = 0.55;
    neck.add(nk);
    const head = box(0.28, 0.3, 0.6, m);
    head.position.set(0, 1.25, 0.95);
    head.rotation.x = 0.25;
    neck.add(head);
    const nose = box(0.22, 0.2, 0.2, dark, false);
    nose.position.set(0, 1.18, 1.28);
    neck.add(nose);
    neck.userData.keepSeparate = true;
    g.add(neck);
    const tail = box(0.08, 0.7, 0.08, dark, false);
    tail.position.set(0, 1.4, -1.1);
    g.add(tail);
    // 鞍毯
    const rug = box(1.0, 0.1, 0.9, P.flat(M.awning[1], 1), false);
    rug.position.set(0, 1.99, 0.2);
    g.add(rug);
    g.userData.neck = neck;
    g.scale.setScalar(scale);
    return g;
  }

  /** 山羊（用轻量羊模型换成棕色，头小一点） */
  function goat(scale = 1) {
    const s = K.makeSheepLite(P, { tone: [0x8a6a4a, 0xb59a74, 0x3a2f28, 0xd8ccb0][(Math.random() * 4) | 0], scale: scale * 0.82 });
    return s;
  }

  /** 树群：柏树（瘦高锥）、橄榄（低矮灰绿）、枣椰（K.grove palm） */
  function cypresses(pts, rand, { scale = [0.9, 1.5] } = {}) {
    const trunk = new THREE.CylinderGeometry(0.12, 0.2, 1.2, 5); trunk.translate(0, 0.6, 0);
    const crown = new THREE.ConeGeometry(0.95, 6.4, 7); crown.translate(0, 4.0, 0);
    const items = pts.map(([x, z]) => ({ x, z, ry: rand() * 6.28, s: scale[0] + rand() * (scale[1] - scale[0]) }));
    const g = new THREE.Group();
    g.add(K.scatter(trunk, P.flat(0x4a3423, 1), items));
    g.add(K.scatter(crown, P.flat(M.leafCyp, 1, { flatShading: true }), items));
    return g;
  }
  function olives(pts, rand) {
    return K.grove(P, 'oak', pts, { leaf: M.leafOlive, trunk: 0x6a5a48, scale: [0.5, 0.8], rand });
  }
  function palms(pts, rand, scale = [0.9, 1.4]) {
    return K.grove(P, 'palm', pts, { leaf: M.leafPalm, trunk: 0x8a6a42, scale, rand });
  }

  /** 陶罐 / 花盆：一堆赤陶小圆柱，沿给定点摆 */
  function pots(pts, rand) {
    const geo = new THREE.CylinderGeometry(0.28, 0.2, 0.55, 8); geo.translate(0, 0.28, 0);
    const items = pts.map(([x, z]) => ({ x, z, s: 0.8 + rand() * 0.7 }));
    const g = new THREE.Group();
    g.add(K.scatter(geo, M.terra, items));
    const plant = new THREE.SphereGeometry(0.3, 6, 5); plant.translate(0, 0.72, 0);
    g.add(K.scatter(plant, P.flat(0x4f8a3a, 1), items));
    return g;
  }

  /** 低矮的院墙 / 围墙段：沿折线，带锯齿压顶 */
  function lowWall(pts, { h = 1.6, th = 0.5, mat = M.sandD } = {}) {
    return K.wallAlong(pts, { h, thick: th, mat });
  }

  /** 地面铺装圆盘 / 矩形 */
  function paveDisc(r, mat = M.paving) {
    return K.groundPatch(r, mat, { segs: 40, soft: false });
  }

  return { M, ROBES, onion, archedWall, crenels, minaret, bigDome, whiteHouse, fountain, stall, camel, goat, cypresses, olives, palms, pots, lowWall, paveDisc };
}
