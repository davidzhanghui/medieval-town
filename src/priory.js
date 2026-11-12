/**
 * priory.js —— 城堡北面的修道院
 *
 * 一座小规模的隐修院：四面包围的回廊，东侧接礼拜堂，庭院里是药草园，
 * 院墙内还有一方鱼塘和一片果园。修士在这里抄经、种药、养鱼。
 * 构件用主场景传入的材质 M（townMaterials），与 town.js / industry.js 同一套约定。
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

/** 屋脊沿 X 的双坡顶：把 gable 的宽度与进深对调后转 90° */
function ridgeRoof(len, depth, h, mat) {
  const m = gable(depth, len, h, mat);
  m.rotation.y = Math.PI / 2;
  return m;
}

/** 借用一套现成材质，只换颜色 */
function tint(src, color) {
  const m = src.clone();
  m.color.set(color);
  return m;
}

/* ============================================================
 *  回廊：四面房屋围出一个方形庭院，内侧一圈拱廊
 * ========================================================== */
const GARTH = 6;        // 庭院半宽
const WALK = 3;         // 走道宽
const RANGE = 3.8;      // 房屋进深
const RH = 6.4;         // 两层高
const INNER = GARTH + WALK;
const OUTER = INNER + RANGE;
const SPAN = OUTER * 2;

function buildCloister(M) {
  const g = new THREE.Group();

  // 铺地 + 庭院草坪
  const pave = box(SPAN, 0.2, SPAN, M.stoneLight);
  pave.position.y = 0.1;
  g.add(pave);

  const lawn = box(
    GARTH * 2, 0.14, GARTH * 2,
    new THREE.MeshStandardMaterial({ color: 0x86a05e, roughness: 1 })
  );
  lawn.position.y = 0.25;
  g.add(lawn);

  /* ---- 四侧房屋 ---- */
  const sides = [
    { px: 0, pz: -(INNER + RANGE / 2), horiz: true },
    { px: 0, pz: INNER + RANGE / 2, horiz: true },
    { px: -(INNER + RANGE / 2), pz: 0, horiz: false },
    { px: INNER + RANGE / 2, pz: 0, horiz: false },
  ];

  for (const s of sides) {
    const w = s.horiz ? SPAN : RANGE;
    const d = s.horiz ? RANGE : SPAN;

    const wall = box(w, RH, d, M.stoneStrong);
    wall.position.set(s.px, RH / 2, s.pz);
    g.add(wall);

    // 墙基压条
    const base = box(w + 0.18, 0.42, d + 0.18, M.stone);
    base.position.set(s.px, 0.21, s.pz);
    g.add(base);

    // 屋顶
    const roof = s.horiz ? ridgeRoof(SPAN, RANGE, 2.4, M.slate) : gable(RANGE, SPAN, 2.4, M.slate);
    roof.position.set(s.px, RH, s.pz);
    g.add(roof);

    // 檐口木条
    const eave = s.horiz
      ? box(SPAN + 0.5, 0.16, RANGE + 0.5, M.timber, false)
      : box(RANGE + 0.5, 0.16, SPAN + 0.5, M.timber, false);
    eave.position.set(s.px, RH + 0.06, s.pz);
    g.add(eave);

    // 外立面的窗：上下两排
    const outX = s.horiz ? 0 : s.px;
    const outZ = s.horiz ? s.pz : 0;
    const faceX = s.horiz ? 0 : Math.sign(s.px) * (RANGE / 2 + 0.05);
    const faceZ = s.horiz ? Math.sign(s.pz) * (RANGE / 2 + 0.05) : 0;
    const count = s.horiz ? 5 : 3;
    const stepLen = s.horiz ? SPAN / count : SPAN / count;

    for (let i = 0; i < count; i++) {
      const t = -SPAN / 2 + (i + 0.5) * stepLen;
      for (const wy of [2.3, 5.0]) {
        const win = s.horiz
          ? box(0.8, 0.95, 0.14, M.window, false)
          : box(0.14, 0.95, 0.8, M.window, false);
        win.position.set(
          outX + faceX + (s.horiz ? t : 0),
          wy,
          outZ + faceZ + (s.horiz ? 0 : t)
        );
        g.add(win);

        // 窗台上的小拱
        const hood = s.horiz
          ? box(1.0, 0.12, 0.2, M.stone, false)
          : box(0.2, 0.12, 1.0, M.stone, false);
        hood.position.copy(win.position);
        hood.position.y = wy + 0.56;
        g.add(hood);
      }
    }
  }

  /* ---- 内侧拱廊：柱 + 半圆券 ---- */
  const COL_H = 2.8;
  const COL_R = 0.17;
  const N = 6;                       // 每边 6 个开间
  const unit = (GARTH * 2) / N;      // 2.0

  const sidesXZ = [
    { axis: 'x', fixed: -GARTH, ry: 0 },
    { axis: 'x', fixed: GARTH, ry: 0 },
    { axis: 'z', fixed: -GARTH, ry: Math.PI / 2 },
    { axis: 'z', fixed: GARTH, ry: Math.PI / 2 },
  ];

  for (const s of sidesXZ) {
    const put = (t, obj, y) => {
      if (s.axis === 'x') obj.position.set(t, y, s.fixed);
      else obj.position.set(s.fixed, y, t);
      return obj;
    };

    // 柱
    for (let i = 0; i <= N; i++) {
      const t = -GARTH + i * unit;
      const col = cyl(COL_R * 1.2, COL_R, COL_H, 8, M.stoneLight);
      put(t, col, COL_H / 2 + 0.2);
      g.add(col);

      const base = box(0.46, 0.16, 0.46, M.stoneStrong);
      put(t, base, 0.28);
      g.add(base);

      const cap = box(0.46, 0.16, 0.46, M.stoneLight, false);
      put(t, cap, COL_H + 0.2);
      g.add(cap);
    }

    // 半圆券
    for (let i = 0; i < N; i++) {
      const t = -GARTH + (i + 0.5) * unit;
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(unit / 2, 0.125, 5, 12, Math.PI),
        M.stoneLight
      );
      arch.castShadow = true;
      arch.rotation.y = s.ry;
      put(t, arch, COL_H + 0.2);
      g.add(arch);
    }

    // 走道上方的楼板 + 庭院侧的矮栏
    const slabW = s.axis === 'x' ? SPAN - RANGE * 2 : WALK;
    const slabD = s.axis === 'x' ? WALK : SPAN - RANGE * 2;
    const mid = (GARTH + INNER) / 2;

    const slab = box(slabW, 0.24, slabD, M.stoneLight);
    if (s.axis === 'x') slab.position.set(0, 4.24, Math.sign(s.fixed) * mid);
    else slab.position.set(Math.sign(s.fixed) * mid, 4.24, 0);
    g.add(slab);

    // 栏板
    const parW = s.axis === 'x' ? slabW : 0.3;
    const parD = s.axis === 'x' ? 0.3 : slabD;
    const par = box(parW, 0.92, parD, M.stoneStrong);
    if (s.axis === 'x') par.position.set(0, 4.82, s.fixed);
    else par.position.set(s.fixed, 4.82, 0);
    g.add(par);

    // 栏板压顶
    const capW = s.axis === 'x' ? slabW : 0.42;
    const capD = s.axis === 'x' ? 0.42 : slabD;
    const cap2 = box(capW, 0.12, capD, M.stoneLight, false);
    if (s.axis === 'x') cap2.position.set(0, 5.34, s.fixed);
    else cap2.position.set(s.fixed, 5.34, 0);
    g.add(cap2);
  }

  /* ---- 庭院里的药草园 ---- */
  g.add(buildHerbGarden(M));

  return g;
}

/* ============================================================
 *  药草园：十字小径 + 四块苗床 + 中央日晷
 * ========================================================== */
function buildHerbGarden(M) {
  const g = new THREE.Group();
  const Y = 0.32;

  const soil = new THREE.MeshStandardMaterial({ color: 0x59452f, roughness: 1 });
  // plateauTop 带草纹贴图，颜色相乘后容易发暗，这里直接给不受贴图影响的纯色
  const leaves = [
    new THREE.MeshStandardMaterial({ color: 0x7fa64e, roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x93b05a, roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x5f8a52, roughness: 1, flatShading: true }),
  ];
  const bloom = tint(M.fruitRed, 0x8e6aa0);
  const bloom2 = tint(M.fruitRed, 0xc9a24a);

  // 十字小径
  for (const rot of [0, Math.PI / 2]) {
    const path = box(GARTH * 2 - 0.2, 0.06, 1.15, tint(M.road, 0xbfae8e), false);
    path.rotation.y = rot;
    path.position.set(0, Y, 0);
    g.add(path);
  }

  // 四块苗床
  const beds = [
    [-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9],
  ];
  const BED = 3.5;      // 苗床边长
  beds.forEach(([bx, bz], bi) => {
    const bed = box(BED, 0.22, BED, soil, false);
    bed.position.set(bx, Y, bz);
    g.add(bed);

    // 石砌镶边
    const E = BED / 2 + 0.1;
    for (const [ex, ez, ew, ed] of [
      [0, -E, BED + 0.4, 0.18], [0, E, BED + 0.4, 0.18],
      [-E, 0, 0.18, BED + 0.4], [E, 0, 0.18, BED + 0.4],
    ]) {
      const edge = box(ew, 0.26, ed, M.stoneLight, false);
      edge.position.set(bx + ex, Y + 0.06, bz + ez);
      g.add(edge);
    }

    // 苗床里的植株：五行五列，挤一点才像有人种的
    const N2 = 5;
    const gap = (BED - 0.7) / (N2 - 1);
    for (let r = 0; r < N2; r++) {
      for (let c = 0; c < N2; c++) {
        const px = bx - (BED - 0.7) / 2 + c * gap;
        const pz = bz - (BED - 0.7) / 2 + r * gap;
        const leaf = leaves[(bi + r + c) % leaves.length];

        if ((r * 2 + c + bi) % 6 === 0) {
          // 开花的：细茎 + 穗
          const stem = cyl(0.02, 0.035, 0.46, 4, leaf, false);
          stem.position.set(px, Y + 0.25, pz);
          g.add(stem);
          const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 5, 4),
            bi % 2 ? bloom : bloom2
          );
          head.position.set(px, Y + 0.52, pz);
          head.castShadow = true;
          g.add(head);

          // 下面再垫一丛叶
          const base2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 5, 4), leaf);
          base2.position.set(px, Y + 0.16, pz);
          base2.scale.y = 0.55;
          base2.castShadow = true;
          g.add(base2);
        } else {
          // 矮丛：两团叶叠出蓬松感
          const bush = new THREE.Mesh(new THREE.SphereGeometry(0.19, 5, 4), leaf);
          bush.position.set(px, Y + 0.18, pz);
          bush.scale.set(1, 0.75, 1);
          bush.castShadow = true;
          g.add(bush);

          const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 5, 4), leaf);
          top.position.set(px + 0.05, Y + 0.3, pz - 0.04);
          top.scale.set(1, 0.8, 1);
          g.add(top);
        }
      }
    }
  });

  // 中央日晷
  const ped = cyl(0.22, 0.32, 1.0, 8, M.stoneLight);
  ped.position.set(0, 1.0, 0);
  g.add(ped);
  const plate = cyl(0.62, 0.62, 0.1, 14, M.stoneLight);
  plate.position.set(0, 1.55, 0);
  g.add(plate);
  const gnomon = box(0.06, 0.5, 0.5, M.bronze);
  gnomon.position.set(0, 1.82, 0.06);
  gnomon.rotation.x = -0.72;
  g.add(gnomon);

  return g;
}

/* ============================================================
 *  礼拜堂：中殿 + 半圆后殿 + 西端钟塔
 * ========================================================== */
function buildChapel(M) {
  const g = new THREE.Group();
  const LEN = 16, WID = 8.8, H = 6.2;

  // 台基
  const plinth = box(LEN + 1.0, 0.45, WID + 1.0, M.stone);
  plinth.position.y = 0.22;
  g.add(plinth);

  // 中殿
  const nave = box(LEN, H, WID, M.stoneStrong);
  nave.position.y = 0.45 + H / 2;
  g.add(nave);

  // 屋顶
  const roof = ridgeRoof(LEN + 0.8, WID + 0.8, 3.2, M.slate);
  roof.position.y = 0.45 + H;
  g.add(roof);

  // 檐口
  const eave = box(LEN + 1.0, 0.16, WID + 1.0, M.timber, false);
  eave.position.y = 0.45 + H + 0.06;
  g.add(eave);

  // 后殿（东端半圆）
  const apseR = 3.4;
  const apse = new THREE.Mesh(
    new THREE.CylinderGeometry(apseR, apseR, H, 14, 1, false, -Math.PI / 2, Math.PI),
    M.stoneStrong
  );
  apse.position.set(LEN / 2 + 0.3, 0.45 + H / 2, 0);
  apse.castShadow = true;
  apse.receiveShadow = true;
  g.add(apse);

  const apseRoof = new THREE.Mesh(
    new THREE.ConeGeometry(apseR + 0.5, 3.0, 14, 1, false, -Math.PI / 2, Math.PI),
    M.slate
  );
  apseRoof.position.set(LEN / 2 + 0.3, 0.45 + H + 1.5, 0);
  apseRoof.castShadow = true;
  g.add(apseRoof);

  // 尖券窗（两侧各三扇）
  for (let i = 0; i < 3; i++) {
    const x = -LEN / 2 + 3.6 + i * 4.2;
    for (const sz of [-1, 1]) {
      const wz = sz * (WID / 2 + 0.02);

      // 直段玻璃
      const win = box(0.86, 1.9, 0.14, M.stainedGlass, false);
      win.position.set(x, 0.45 + H * 0.5, wz);
      g.add(win);

      // 上端的尖券玻璃：旋转 45° 的方块，只露出下半截
      const tip = box(1.0, 1.0, 0.14, M.stainedGlass, false);
      tip.rotation.z = Math.PI / 4;
      tip.position.set(x, 0.45 + H * 0.5 + 1.34, wz);
      g.add(tip);

      // 券石环：沿窗洞外缘的半圆
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.1, 4, 14, Math.PI),
        M.stoneLight
      );
      ring.position.set(x, 0.45 + H * 0.5 + 0.98, wz + sz * 0.035);
      ring.rotation.y = sz > 0 ? 0 : Math.PI;
      ring.castShadow = true;
      g.add(ring);

      // 窗台
      const sill = box(1.12, 0.12, 0.3, M.stoneLight, false);
      sill.position.set(x, 0.45 + H * 0.5 - 1.02, wz + sz * 0.06);
      g.add(sill);
    }
  }

  // 西端大门：拱形门洞 + 券石
  const doorH = 2.5, doorW = 1.5;
  const door = box(doorW, doorH, 0.18, M.wood);
  door.position.set(-LEN / 2 - 0.04, 0.45 + doorH / 2, 0);
  door.rotation.y = Math.PI / 2;
  g.add(door);

  const doorArch = new THREE.Mesh(
    new THREE.TorusGeometry(doorW / 2, 0.17, 5, 12, Math.PI),
    M.stoneLight
  );
  doorArch.position.set(-LEN / 2 - 0.02, 0.45 + doorH, 0);
  doorArch.rotation.y = Math.PI / 2;
  doorArch.castShadow = true;
  g.add(doorArch);

  for (const sz of [-1, 1]) {
    const jamb = box(0.2, doorH, 0.3, M.stoneLight);
    jamb.position.set(-LEN / 2 - 0.04, 0.45 + doorH / 2, sz * (doorW / 2 + 0.1));
    g.add(jamb);
  }

  // 西山墙的圆窗
  const rose = cyl(0.78, 0.78, 0.16, 16, M.stainedGlass, false);
  rose.rotation.z = Math.PI / 2;
  rose.position.set(-LEN / 2 - 0.04, 0.45 + H * 0.78, 0);
  g.add(rose);
  const roseRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.09, 5, 18), M.stoneLight);
  roseRing.rotation.y = Math.PI / 2;
  roseRing.position.copy(rose.position);
  g.add(roseRing);

  // 钟塔（西端、贴在中殿侧面）
  const tw = 4.2, th = 11.5;
  const tower = box(tw, th, tw, M.stoneStrong);
  tower.position.set(-LEN / 2 - 1.6, th / 2, 0);
  g.add(tower);

  // 塔身束带
  for (const ty of [3.4, 6.6]) {
    const band = box(tw + 0.24, 0.26, tw + 0.24, M.stone);
    band.position.set(-LEN / 2 - 1.6, ty, 0);
    g.add(band);
  }

  // 塔顶雉堞平台
  const deckTop = box(tw + 0.6, 0.4, tw + 0.6, M.stoneLight);
  deckTop.position.set(-LEN / 2 - 1.6, th, 0);
  g.add(deckTop);

  // 钟室四面开口 + 铜钟
  const bells = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const opening = box(1.2, 2.2, 0.3, M.dark, false);
    opening.position.set(
      -LEN / 2 - 1.6 + Math.sin(a) * (tw / 2),
      th - 1.6,
      Math.cos(a) * (tw / 2)
    );
    opening.rotation.y = a;
    g.add(opening);
  }

  const bellPivot = new THREE.Group();
  bellPivot.position.set(-LEN / 2 - 1.6, th - 0.55, 0);
  bellPivot.userData.keepSeparate = true;
  g.add(bellPivot);

  const bell = cyl(0.32, 0.48, 0.66, 10, M.bronze, true);
  bell.position.y = -0.5;
  bell.userData.keepSeparate = true;
  bellPivot.add(bell);

  const yoke = box(0.8, 0.14, 0.14, M.timber);
  yoke.userData.keepSeparate = true;
  bellPivot.add(yoke);
  bells.push(bellPivot);

  // 四棱尖顶
  const spire = new THREE.Mesh(new THREE.ConeGeometry(tw * 0.72, 4.2, 4), M.slate);
  spire.position.set(-LEN / 2 - 1.6, th + 2.3, 0);
  spire.rotation.y = Math.PI / 4;
  spire.castShadow = true;
  g.add(spire);

  const crossV = box(0.1, 0.7, 0.1, M.bronze, false);
  crossV.position.set(-LEN / 2 - 1.6, th + 4.8, 0);
  g.add(crossV);
  const crossH = box(0.42, 0.1, 0.1, M.bronze, false);
  crossH.position.set(-LEN / 2 - 1.6, th + 4.9, 0);
  g.add(crossH);

  g.userData.bells = bells;
  g.userData.bellPos = new THREE.Vector3(-LEN / 2 - 1.6, th - 1.4, 0);
  return g;
}

/* ============================================================
 *  鱼塘：石砌岸 + 水面 + 木栈道 + 芦苇
 * ========================================================== */
function buildPond(M, w = 14, d = 8) {
  const g = new THREE.Group();

  const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.12;
  water.receiveShadow = true;
  g.add(water);

  // 塘底压深一点，边缘用石条围住
  const rim = tint(M.stoneLight, 0xa8a08e);
  for (const [px, pz, rw, rd] of [
    [0, -d / 2, w + 0.9, 0.55], [0, d / 2, w + 0.9, 0.55],
    [-w / 2, 0, 0.55, d + 0.9], [w / 2, 0, 0.55, d + 0.9],
  ]) {
    const r = box(rw, 0.34, rd, rim);
    r.position.set(px, 0.17, pz);
    g.add(r);
  }

  // 北岸的木栈道
  const jetty = box(2.0, 0.16, 4.0, M.wood);
  jetty.position.set(-w * 0.22, 0.55, -d / 2 + 1.2);
  g.add(jetty);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 0]) {
      const post = cyl(0.09, 0.11, 1.0, 6, M.woodDark);
      post.position.set(-w * 0.22 + sx * 0.85, 0.2, -d / 2 + 1.2 + sz * 1.5);
      g.add(post);
    }
  }

  // 芦苇
  for (let i = 0; i < 22; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rx = Math.cos(ang) * (w / 2 + 0.3);
    const rz = Math.sin(ang) * (d / 2 + 0.3);
    const h = 0.7 + Math.random() * 0.8;
    const reed = cyl(0.02, 0.04, h, 4, M.reed, false);
    reed.position.set(rx, 0.1 + h / 2, rz);
    reed.rotation.z = (Math.random() - 0.5) * 0.2;
    g.add(reed);
  }

  return g;
}

/* ============================================================
 *  果园：成排的果树
 * ========================================================== */
function buildOrchard(M, { rows = 4, cols = 4, gap = 3.4 } = {}) {
  const g = new THREE.Group();

  const canopy = [
    new THREE.MeshStandardMaterial({ color: 0x5e8a42, roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x6f9a4a, roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x4e7a3a, roughness: 1, flatShading: true }),
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * gap;
      const z = (r - (rows - 1) / 2) * gap;

      const trunk = cyl(0.13, 0.19, 1.5, 6, M.woodDark);
      trunk.position.set(x, 0.75, z);
      g.add(trunk);

      const sc = 0.85 + ((r * 7 + c * 3) % 5) * 0.07;
      const leaf = canopy[(r + c) % canopy.length];
      for (let k = 0; k < 3; k++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(0.78 * sc, 6, 5), leaf);
        blob.position.set(
          x + Math.cos(k * 2.1) * 0.42 * sc,
          1.85 + Math.sin(k * 1.7) * 0.3,
          z + Math.sin(k * 2.1) * 0.42 * sc
        );
        blob.scale.y = 0.85;
        blob.castShadow = true;
        blob.receiveShadow = true;
        g.add(blob);
      }

      // 套在树上的几颗果子
      if ((r + c) % 3 === 0) {
        for (let k = 0; k < 3; k++) {
          const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), M.fruitRed);
          fruit.position.set(
            x + Math.cos(k * 2.4) * 0.7,
            1.7 + Math.cos(k * 1.9) * 0.5,
            z + Math.sin(k * 2.4) * 0.7
          );
          g.add(fruit);
        }
      }
    }
  }

  return g;
}

/* ============================================================
 *  院墙与门楼
 * ========================================================== */
function buildPrecinct(M, { hx, hz, h = 3.4, t = 0.75 }) {
  const g = new THREE.Group();

  // 南墙留出门洞（x ∈ [-2.6, 2.6]）
  const gateGap = 2.6;

  const segs = [
    // [cx, cz, w, d]
    [-(hx + gateGap) / 2, hz, hx - gateGap, t],   // 南墙西段
    [(hx + gateGap) / 2, hz, hx - gateGap, t],    // 南墙东段
    [0, -hz, hx * 2, t],                          // 北墙
    [-hx, 0, t, hz * 2],                          // 西墙
    [hx, 0, t, hz * 2],                           // 东墙
  ];

  for (const [cx, cz, w, d] of segs) {
    const wall = box(w, h, d, M.stone);
    wall.position.set(cx, h / 2, cz);
    g.add(wall);

    // 压顶
    const cap = box(w + 0.12, 0.18, d + 0.12, M.stoneLight);
    cap.position.set(cx, h + 0.06, cz);
    g.add(cap);

    // 墙上的小箭孔（南墙两端各两个）
    if (Math.abs(cz) === hz || Math.abs(cx) === hx) {
      const horiz = w > d;
      const n = Math.max(2, Math.round((horiz ? w : d) / 6));
      for (let i = 0; i < n; i++) {
        const t0 = -0.5 + (i + 0.5) / n;
        const slit = box(horiz ? 0.14 : 0.1, 0.8, horiz ? 0.1 : 0.14, M.dark, false);
        slit.position.set(
          cx + (horiz ? t0 * w : 0),
          h * 0.62,
          cz + (horiz ? 0 : t0 * d)
        );
        g.add(slit);
      }
    }
  }

  // 门楼：两座方墩 + 拱
  for (const sx of [-1, 1]) {
    const pier = box(1.5, 5.2, 1.6, M.stoneStrong);
    pier.position.set(sx * (gateGap + 0.75), 2.6, hz);
    g.add(pier);

    const pcap = box(1.8, 0.24, 1.9, M.stoneLight);
    pcap.position.set(sx * (gateGap + 0.75), 5.28, hz);
    g.add(pcap);
  }

  const lintel = box(gateGap * 2 + 1.6, 0.7, 1.0, M.stoneStrong);
  lintel.position.set(0, 4.6, hz);
  g.add(lintel);

  const gateArch = new THREE.Mesh(
    new THREE.TorusGeometry(gateGap * 0.72, 0.22, 5, 16, Math.PI),
    M.stoneLight
  );
  gateArch.position.set(0, 3.55, hz + 0.52);
  gateArch.castShadow = true;
  g.add(gateArch);

  // 敞着的两扇木门
  for (const sx of [-1, 1]) {
    const leaf = box(2.5, 3.5, 0.16, M.wood);
    leaf.position.set(sx * (gateGap + 1.35), 1.75, hz - 0.6);
    leaf.rotation.y = sx * 0.95;
    g.add(leaf);

    for (const by of [0.7, 2.9]) {
      const band = box(2.3, 0.1, 0.06, M.iron, false);
      band.position.set(sx * (gateGap + 1.35), by, hz - 0.72);
      band.rotation.y = sx * 0.95;
      g.add(band);
    }
  }

  return g;
}

/* ============================================================
 *  组装：整座修道院
 *  本地坐标 +Z 朝南（面向城堡）
 * ========================================================== */
export function makePriory(M) {
  const g = new THREE.Group();
  const HX = 40;   // 院墙半宽
  const HZ = 32;   // 院墙半深

  const grounds = new THREE.Group();
  grounds.add(buildPrecinct(M, { hx: HX, hz: HZ }));
  g.add(grounds);

  const cloister = buildCloister(M);
  g.add(cloister);

  const chapel = buildChapel(M);
  chapel.position.set(25, 0, 0);
  g.add(chapel);

  // 鱼塘在西北角
  const pond = buildPond(M, 13, 7.5);
  pond.position.set(-22, 0, -20);
  g.add(pond);

  // 果园在西南角
  const orchard = buildOrchard(M, { rows: 4, cols: 4, gap: 3.3 });
  orchard.position.set(-20, 0.25, 13);
  g.add(orchard);

  // 菜畦：贴着南墙的一小片
  const veg = new THREE.Group();
  const soil = new THREE.MeshStandardMaterial({ color: 0x59452f, roughness: 1 });
  const brassica = new THREE.MeshStandardMaterial({ color: 0x6f9a4a, roughness: 1, flatShading: true });
  for (let i = 0; i < 5; i++) {
    const bed = box(1.5, 0.2, 6.4, soil, false);
    bed.position.set(-6 + i * 2.1, 0.12, 21.5);
    veg.add(bed);

    for (let j = 0; j < 6; j++) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4), brassica);
      bush.position.set(-6 + i * 2.1, 0.28, 19.2 + j * 1.0);
      bush.scale.y = 0.7;
      bush.castShadow = true;
      veg.add(bush);
    }
  }
  g.add(veg);

  g.userData.cloister = cloister;
  g.userData.chapel = chapel;
  g.userData.grounds = grounds;
  g.userData.pond = pond;
  g.userData.bells = chapel.userData.bells;
  return g;
}
