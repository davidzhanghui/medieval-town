/**
 * tournament.js —— 城堡东北的比武场
 *
 * 骑士比武（tournament）是中世纪最烧钱的娱乐：一圈木栅围出跑道，
 * 两侧立着看台与彩绘帐幕，场边有骑士营帐、马厩、兵器架与五柱靶。
 * 构件用主场景传入的材质 M，与 town.js / industry.js 同一套约定。
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

/* ============================================================
 *  跑道：两条平行木栅夹出的长条场地 + 中间的隔栏（tilt）
 * ========================================================== */
function buildLists(M, { len = 54, wide = 13 } = {}) {
  const g = new THREE.Group();
  const halfLen = len / 2;
  const halfWide = wide / 2;

  // 夯实的沙土地面：比草地浅一层，只比围栏宽一点点
  const SAND = 0xbca880;
  const ground = box(len + 2, 0.16, wide + 3.2, solid(SAND, { roughness: 1 }));
  ground.position.y = 0.08;
  ground.receiveShadow = true;
  g.add(ground);

  // 两端的半圆收头：跟场地同宽，别让整条跑道看着像个体育场
  for (const sx of [-1, 1]) {
    const cap = new THREE.Mesh(
      new THREE.CircleGeometry(halfWide + 1.6, 22, 0, Math.PI),
      solid(SAND, { roughness: 1 })
    );
    cap.rotation.x = -Math.PI / 2;
    cap.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    cap.position.set(sx * (halfLen + 1), 0.16, 0);
    cap.receiveShadow = true;
    g.add(cap);
  }

  // 两侧木栅
  const post = M.woodDark;
  const rail = M.wood;

  for (const sz of [-1, 1]) {
    const fz = sz * halfWide;

    // 上下两道横杆
    for (const ry of [0.55, 1.15]) {
      const r = box(len, 0.12, 0.12, rail);
      r.position.set(0, ry, fz);
      g.add(r);
    }

    // 立柱
    const n = Math.round(len / 2.6);
    for (let i = 0; i <= n; i++) {
      const x = -halfLen + (i / n) * len;
      const p = box(0.16, 1.5, 0.16, post);
      p.position.set(x, 0.75, fz);
      g.add(p);
    }

    // 端头挡板
    const endBoard = box(0.14, 1.35, wide, M.wood);
    endBoard.position.set(sz * halfLen, 0.7, 0);
    g.add(endBoard);
  }

  /* ---- 中间隔栏 tilt：一道及腰的矮栅，把两条跑道分开 ---- */
  for (const ry of [0.62, 1.02]) {
    const r = box(len - 6, 0.1, 0.1, rail);
    r.position.set(0, ry, 0);
    g.add(r);
  }
  {
    const n = Math.round((len - 6) / 3.0);
    for (let i = 0; i <= n; i++) {
      const x = -(len - 6) / 2 + (i / n) * (len - 6);
      const p = box(0.13, 1.12, 0.13, post);
      p.position.set(x, 0.56, 0);
      g.add(p);
    }

    // 隔栏顶上的布幔：交替两种颜色，比武时会拉开
    const clothA = solid(0x9e2f2c, { side: THREE.DoubleSide });
    const clothB = solid(0xd9c9a3, { side: THREE.DoubleSide });
    const segs = Math.round((len - 6) / 2.2);
    for (let i = 0; i < segs; i++) {
      const x = -(len - 6) / 2 + (i + 0.5) * ((len - 6) / segs);
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry((len - 6) / segs - 0.05, 0.62),
        i % 2 ? clothB : clothA
      );
      cloth.position.set(x, 1.42, 0);
      cloth.castShadow = true;
      g.add(cloth);
    }
  }

  /* ---- 跑道两端各立一面入场旗 ---- */
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pole = cyl(0.06, 0.08, 4.2, 6, post);
      pole.position.set(sx * (halfLen + 3), 2.1, sz * (halfWide + 2.6));
      g.add(pole);

      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.95),
        solid(sx * sz > 0 ? 0x9e2f2c : 0x2c4f86, { side: THREE.DoubleSide })
      );
      flag.position.set(sx * (halfLen + 3), 3.55, sz * (halfWide + 2.6));
      flag.rotation.y = Math.PI / 2;
      flag.castShadow = true;
      g.add(flag);
    }
  }

  return { group: g, len, wide, halfLen, halfWide };
}

/* ============================================================
 *  看台：阶梯座 + 顶棚 + 后排挡墙
 * ========================================================== */
function buildStand(M, { len = 26, rows = 4 } = {}) {
  const g = new THREE.Group();
  const stepD = 1.5;
  const stepH = 0.62;
  const seat = solid(0x8a7350, { roughness: 1 });
  const riser = M.wood;

  for (let r = 0; r < rows; r++) {
    // 踏步（观众踩的地方）
    const st = box(len, stepH, stepD, riser);
    st.position.set(0, stepH / 2 + r * stepH, -r * stepD);
    g.add(st);

    // 长条座板
    const board = box(len, 0.12, 0.42, seat);
    board.position.set(0, (r + 1) * stepH + 0.12, -r * stepD - 0.38);
    g.add(board);
  }

  // 后排挡墙
  const backD = -(rows - 1) * stepD - stepD;
  const back = box(len, rows * stepH + 1.5, 0.3, M.wood);
  back.position.set(0, (rows * stepH + 1.5) / 2, backD);
  g.add(back);

  // 顶棚：前低后高的单坡
  const roofLen = len + 1.2;
  const depth = rows * stepD + 1.2;
  const roof = box(roofLen, 0.16, depth, M.tile);
  roof.position.set(0, rows * stepH + 3.0, backD / 2 - 0.4);
  roof.rotation.x = -0.18;
  g.add(roof);

  // 顶棚支柱：前排两根高柱，后排直接落在挡墙上
  for (const sx of [-1, 1]) {
    const h = rows * stepH + 3.1;
    const p = cyl(0.12, 0.15, h, 7, M.wood, true);
    p.position.set(sx * (len / 2 - 0.4), h / 2, 0.1);
    g.add(p);

    // 斜撑
    const brace = box(0.1, 1.6, 0.1, M.wood, false);
    brace.position.set(sx * (len / 2 - 0.9), h - 0.7, 0.55);
    brace.rotation.x = 0.7;
    g.add(brace);
  }

  // 顶棚前檐的彩旗边
  const valance = new THREE.Mesh(
    new THREE.PlaneGeometry(roofLen, 0.55, 1, 1),
    solid(0x9e2f2c, { side: THREE.DoubleSide })
  );
  valance.position.set(0, rows * stepH + 2.75, 0.62);
  valance.castShadow = true;
  g.add(valance);

  // 支起顶棚的横梁
  const beam = box(roofLen, 0.14, 0.14, M.wood, false);
  beam.position.set(0, rows * stepH + 3.0, 0.1);
  g.add(beam);

  return g;
}

/* ============================================================
 *  贵族彩绘帐幕：圆锥顶 + 竖条纹布墙 + 顶旗
 * ========================================================== */
function buildPavilion(M, { r = 2.4, h = 2.6, hue = 0x9e2f2c } = {}) {
  const g = new THREE.Group();

  // 布墙：12 段交替两色
  const n = 12;
  const A = solid(hue, { side: THREE.DoubleSide });
  const B = solid(0xe4d8bd, { side: THREE.DoubleSide });

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const seg = new THREE.Mesh(
      new THREE.PlaneGeometry((2 * Math.PI * r) / n * 1.02, h),
      i % 2 ? B : A
    );
    seg.position.set(Math.sin(a) * r, h / 2, Math.cos(a) * r);
    seg.rotation.y = a;
    seg.castShadow = true;
    g.add(seg);
  }

  // 顶：圆锥
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 1.16, 2.2, 12), A);
  cone.position.y = h + 1.1;
  cone.castShadow = true;
  g.add(cone);

  // 檐口一圈
  const eave = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.06, 4, 20), B);
  eave.rotation.x = Math.PI / 2;
  eave.position.y = h;
  g.add(eave);

  // 顶尖的旗
  const pole = cyl(0.03, 0.04, 1.0, 5, M.wood, false);
  pole.position.y = h + 2.6;
  g.add(pole);

  const pennant = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.4),
    solid(0xc9a45e, { side: THREE.DoubleSide })
  );
  pennant.position.set(0.36, h + 2.86, 0);
  g.add(pennant);

  // 帐前的两杆长矛
  for (const sx of [-1, 1]) {
    const spear = cyl(0.03, 0.035, 2.6, 5, M.wood, false);
    spear.position.set(sx * (r + 0.9), 1.3, r * 0.55);
    g.add(spear);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 5), M.iron);
    tip.position.set(sx * (r + 0.9), 2.72, r * 0.55);
    g.add(tip);
  }

  return g;
}

/* ============================================================
 *  五柱靶（quintain）与练习木人
 * ========================================================== */
function buildQuintain(M) {
  const g = new THREE.Group();

  // 立柱 + 十字横臂
  const post = cyl(0.11, 0.14, 2.4, 8, M.wood);
  post.position.y = 1.2;
  g.add(post);

  const base = cyl(0.55, 0.7, 0.24, 10, M.stoneStrong);
  base.position.y = 0.12;
  g.add(base);

  const arm = box(2.2, 0.14, 0.14, M.wood);
  arm.position.y = 2.0;
  g.add(arm);

  // 一端是盾，一端是沙袋——打中盾，沙袋就转过来打你的后脑
  const shield = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), solid(0x9e2f2c, { side: THREE.DoubleSide }));
  shield.position.set(-0.95, 1.85, 0);
  shield.castShadow = true;
  g.add(shield);

  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), solid(0x7a6a4a));
  bag.position.set(0.95, 1.55, 0);
  bag.scale.y = 1.4;
  bag.castShadow = true;
  g.add(bag);

  return g;
}

/* ============================================================
 *  兵器架：插着长矛、挂着盾
 * ========================================================== */
function buildWeaponRack(M) {
  const g = new THREE.Group();

  for (const sx of [-1, 1]) {
    const post = cyl(0.08, 0.1, 2.0, 6, M.wood);
    post.position.set(sx * 1.3, 1.0, 0);
    g.add(post);
  }

  for (const ry of [0.7, 1.7]) {
    const rail = box(2.9, 0.1, 0.1, M.wood);
    rail.position.set(0, ry, 0);
    g.add(rail);
  }

  // 插着的长矛
  for (let i = 0; i < 5; i++) {
    const sx = -1.05 + i * 0.52;
    const shaft = cyl(0.025, 0.03, 2.9, 5, M.wood, false);
    shaft.position.set(sx, 1.55, 0.14);
    shaft.rotation.x = -0.13;
    g.add(shaft);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 5), M.iron);
    tip.position.set(sx, 3.05, 0.32);
    g.add(tip);
  }

  // 靠在前排的两面盾
  for (const sx of [-0.62, 0.62]) {
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), solid(sx < 0 ? 0x2c4f86 : 0x9e2f2c, { side: THREE.DoubleSide }));
    sh.position.set(sx, 1.15, 0.36);
    sh.rotation.x = -0.16;
    sh.castShadow = true;
    g.add(sh);
  }

  return g;
}

/* ============================================================
 *  骑士营帐区：帐幕 + 马桩 + 草料
 * ========================================================== */
function buildCamp(M) {
  const g = new THREE.Group();

  const HUES = [0x9e2f2c, 0x2c4f86, 0x3f6b3a, 0x6b3f7a];
  const spots = [
    [-9, -6, 0.3], [0, -8.5, -0.2], [9.5, -6.5, -0.4],
  ];
  spots.forEach(([x, z, rot], i) => {
    const pav = buildPavilion(M, { r: 2.2 + (i % 2) * 0.35, h: 2.4, hue: HUES[i % HUES.length] });
    pav.position.set(x, 0, z);
    pav.rotation.y = rot;
    g.add(pav);
  });

  // 马桩：一根横木，拴三匹马的位置
  {
    const x = 20, z = -7;
    for (const sx of [-2.4, 2.4]) {
      const p = cyl(0.09, 0.11, 1.5, 6, M.wood);
      p.position.set(x + sx, 0.75, z);
      g.add(p);
    }
    const rail = box(5.4, 0.13, 0.13, M.wood);
    rail.position.set(x, 1.45, z);
    g.add(rail);

    // 拴着的缰绳
    for (let i = 0; i < 3; i++) {
      const rope = cyl(0.02, 0.02, 0.9, 4, solid(0x8a7a55), false);
      rope.position.set(x - 1.6 + i * 1.6, 1.0, z + 0.08);
      g.add(rope);
    }
  }

  // 草料堆
  for (const [x, z, s] of [[16, -10, 1.0], [18.6, -11.2, 0.75]]) {
    const hay = cyl(0.9 * s, 1.05 * s, 0.85 * s, 9, solid(0xb59a54, { roughness: 1, flatShading: true }));
    hay.position.set(x, 0.42 * s, z);
    hay.castShadow = true;
    g.add(hay);
  }

  // 兵器架
  const rack = buildWeaponRack(M);
  rack.position.set(-16, 0, -5);
  rack.rotation.y = 0.35;
  g.add(rack);

  return g;
}

/* ============================================================
 *  组装：整座比武场
 *  本地 +X 是跑道方向，+Z 是南侧看台
 * ========================================================== */
export function makeTournament(M) {
  const g = new THREE.Group();

  /* ---- 跑道 ---- */
  const lists = buildLists(M, { len: 58, wide: 20 });
  g.add(lists.group);

  /* ---- 南北两侧看台 ---- */
  const standN = buildStand(M, { len: 24, rows: 3 });
  standN.position.set(0, 0, -(lists.halfWide + 6.4));
  standN.rotation.y = Math.PI;     // 面向跑道
  g.add(standN);

  const standS = buildStand(M, { len: 24, rows: 3 });
  standS.position.set(0, 0, lists.halfWide + 6.4);
  g.add(standS);

  /* ---- 东端：入口门楼 + 两侧幡杆 ---- */
  {
    const gx = lists.halfLen + 2.4;

    // 两根门柱
    for (const sz of [-1, 1]) {
      const post = box(0.6, 6.0, 0.6, M.wood);
      post.position.set(gx, 3.0, sz * 5.4);
      g.add(post);

      // 柱础
      const base2 = box(0.9, 0.4, 0.9, M.stoneStrong);
      base2.position.set(gx, 0.2, sz * 5.4);
      g.add(base2);
    }

    // 门楣
    const lintel = box(0.7, 0.7, 11.4, M.wood);
    lintel.position.set(gx, 6.2, 0);
    g.add(lintel);

    // 门楣上的横匾
    const plaque = box(0.16, 1.0, 3.6, M.woodDark);
    plaque.position.set(gx - 0.42, 6.2, 0);
    g.add(plaque);

    // 门楼顶：平顶小檐 + 前后两片坡
    const deck = box(2.2, 0.22, 12.4, M.wood);
    deck.position.set(gx, 6.72, 0);
    g.add(deck);

    for (const sx of [-1, 1]) {
      const slope = box(1.5, 0.14, 12.6, M.tile);
      slope.position.set(gx + sx * 0.7, 7.05, 0);
      slope.rotation.z = -sx * 0.32;
      slope.castShadow = true;
      g.add(slope);
    }

    // 屋脊压条
    const ridge = box(0.28, 0.2, 12.7, M.woodDark, false);
    ridge.position.set(gx, 7.28, 0);
    g.add(ridge);

    // 门楼两侧挂的幡
    for (const sz of [-1, 1]) {
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 2.8),
        solid(sz < 0 ? 0x9e2f2c : 0x2c4f86, { side: THREE.DoubleSide })
      );
      banner.position.set(gx - 0.1, 4.3, sz * 5.4 + sz * 0.62);
      banner.rotation.y = Math.PI / 2;
      banner.castShadow = true;
      g.add(banner);
    }
  }

  /* ---- 北侧的营帐区 ---- */
  const camp = buildCamp(M);
  camp.position.set(-4, 0, -(lists.halfWide + 18));
  g.add(camp);

  /* ---- 五柱靶：摆在西端入口外侧 ---- */
  const q1 = buildQuintain(M);
  q1.position.set(-lists.halfLen - 10, 0, 4.2);
  g.add(q1);

  const q2 = buildQuintain(M);
  q2.position.set(-lists.halfLen - 13.5, 0, -1.0);
  g.add(q2);

  /* ---- 入场的木牌与拴马环 ---- */
  {
    const gatePost = box(0.28, 3.2, 0.28, M.wood);
    gatePost.position.set(-lists.halfLen + 0.5, 1.6, -(lists.halfWide + 1.2));
    g.add(gatePost);

    const sign = box(1.9, 0.9, 0.1, M.woodDark);
    sign.position.set(-lists.halfLen + 1.5, 2.55, -(lists.halfWide + 1.15));
    g.add(sign);

    const crossSword = box(1.3, 0.08, 0.06, M.iron, false);
    crossSword.position.set(-lists.halfLen + 1.5, 2.55, -(lists.halfWide + 1.08));
    g.add(crossSword);

    const crossSword2 = box(0.09, 1.1, 0.06, M.iron, false);
    crossSword2.position.set(-lists.halfLen + 1.5, 2.55, -(lists.halfWide + 1.08));
    g.add(crossSword2);
  }

  g.userData.lists = lists;
  g.userData.stands = [standN, standS];
  return g;
}
