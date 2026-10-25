import * as THREE from 'three';

/* ============================================================
 *  工匠区：风车、水磨坊与小溪、石桥、采石场、伐木场、手工作坊
 *  与 village.js / town.js 同一套约定——构件用主场景传入的材质 M
 * ========================================================== */

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

/** 三角截面、沿 Z 拉伸的坡屋顶 */
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

/* ============================================================
 *  小溪：沿折线的水带 + 两岸泥土 + 卵石芦苇
 * ========================================================== */

/** 与 makeRoad 同构，但贴的是水面材质，且略低于两岸 */
function ribbon(pts, width, y, mat) {
  const n = pts.length;
  const left = [];
  const right = [];
  const lens = [0];
  let total = 0;

  for (let i = 0; i < n; i++) {
    const cur = new THREE.Vector2(pts[i][0], pts[i][1]);
    const prev = new THREE.Vector2(pts[Math.max(0, i - 1)][0], pts[Math.max(0, i - 1)][1]);
    const next = new THREE.Vector2(pts[Math.min(n - 1, i + 1)][0], pts[Math.min(n - 1, i + 1)][1]);
    const dir = next.clone().sub(prev);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1);
    dir.normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x);
    left.push(cur.clone().addScaledVector(nrm, width / 2));
    right.push(cur.clone().addScaledVector(nrm, -width / 2));
    if (i > 0) {
      total += cur.distanceTo(new THREE.Vector2(pts[i - 1][0], pts[i - 1][1]));
      lens.push(total);
    }
  }

  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i < n; i++) {
    for (const [arr, u] of [[left, 0], [right, 1]]) {
      pos.push(arr[i].x, 0, arr[i].y);
      uv.push(u, lens[i] / 4);
    }
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

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * 小溪：一条泥土岸带 + 一条水面 + 沿岸的卵石与芦苇
 * pts 是折线（世界 XZ），调用者自己决定走向
 */
export function makeStream(M, pts, width = 3.0) {
  const g = new THREE.Group();

  const bank = ribbon(pts, width + 2.6, 0.02, M.soilBorder);
  g.add(bank);
  const water = ribbon(pts, width, 0.07, M.water);
  g.add(water);

  // 岸边散落的卵石与芦苇
  const rockGeo = new THREE.DodecahedronGeometry(0.22, 0);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = new THREE.Vector2(pts[i][0], pts[i][1]);
    const b = new THREE.Vector2(pts[i + 1][0], pts[i + 1][1]);
    const dir = b.clone().sub(a).normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x);

    for (let k = 0; k < 5; k++) {
      const t = k / 5;
      const p = a.clone().lerp(b, t);
      for (const s of [-1, 1]) {
        // 石头压在岸边
        if (Math.random() > 0.45) {
          const rock = new THREE.Mesh(rockGeo, M.stone);
          const off = width / 2 + 0.7 + Math.random() * 0.7;
          rock.position.set(
            p.x + nrm.x * s * off,
            0.04 + Math.random() * 0.08,
            p.y + nrm.y * s * off
          );
          const sc = 0.5 + Math.random() * 0.9;
          rock.scale.set(sc, sc * 0.6, sc);
          rock.rotation.set(Math.random(), Math.random(), Math.random());
          rock.castShadow = true;
          g.add(rock);
        }
        // 芦苇
        if (Math.random() > 0.55) {
          const off = width / 2 + 0.35 + Math.random() * 0.5;
          const rx = p.x + nrm.x * s * off;
          const rz = p.y + nrm.y * s * off;
          for (let r = 0; r < 3; r++) {
            const reed = box(0.035, 0.75 + Math.random() * 0.5, 0.035, M.reed, false);
            reed.position.set(rx + (Math.random() - 0.5) * 0.28, 0.42, rz + (Math.random() - 0.5) * 0.28);
            reed.rotation.z = (Math.random() - 0.5) * 0.35;
            reed.rotation.x = (Math.random() - 0.5) * 0.35;
            g.add(reed);
          }
        }
      }
    }
  }

  return g;
}

/* ============================================================
 *  石拱桥：一跨拱券 + 桥面 + 栏板
 * ========================================================== */
/**
 * 低矮的弓形石桥：Span 是桥洞净宽，Rise 是拱矢高，
 * 桥面高出地面约 1 米，两端各配三级台阶（中世纪驮马桥的标准做法）
 */
export function makeStoneBridge(M, { span = 4.0, wide = 3.2, rise = 1.0, TH = 0.3 } = {}) {
  const g = new THREE.Group();

  // 由净宽和矢高反推圆弧半径
  const R = (span * span / 4 + rise * rise) / (2 * rise);
  const th = Math.asin(span / 2 / R);          // 半张角
  const Y0 = rise - R;                          // 圆心高度（在地面以下）
  const ySpring = Y0 + R * Math.cos(th);        // 起拱线，略低于地面
  const crownOut = rise + TH;                   // 拱背顶
  const DECK_Y = crownOut + 0.18;

  const wallT = 0.34;                           // 拱肩墙厚
  const over = 0.55;                            // 两端伸出桥台的长度
  const halfLen = span / 2 + rise * 1.25 + over;
  const W = halfLen * 2;

  // ---- 两侧拱肩墙：矩形挖掉券洞后挤出（洞底落到水下，桥台扎进河岸） ----
  const yBottom = ySpring - 1.6;
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, yBottom);
  shape.lineTo(W / 2, yBottom);
  shape.lineTo(W / 2, DECK_Y);
  shape.lineTo(-W / 2, DECK_Y);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-span / 2, yBottom);
  hole.lineTo(-span / 2, ySpring);
  hole.absarc(0, Y0, R, Math.PI / 2 + th, Math.PI / 2 - th, true);
  hole.lineTo(span / 2, yBottom);
  hole.closePath();
  shape.holes.push(hole);

  for (const sz of [-1, 1]) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: wallT, bevelEnabled: false, curveSegments: 28,
    });
    geo.translate(0, 0, -wallT / 2);
    const wall = new THREE.Mesh(geo, M.stoneStrong);
    wall.position.z = sz * (wide / 2 - wallT / 2);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
  }

  // ---- 两面拱券石圈（略凸出墙面） ----
  for (const sz of [-1, 1]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(R, R + TH, 28, 1, Math.PI / 2 - th, th * 2),
      M.stoneLight
    );
    ring.position.set(0, Y0, sz * (wide / 2 + 0.015));
    if (sz < 0) ring.rotation.y = Math.PI;
    ring.castShadow = true;
    ring.receiveShadow = true;
    g.add(ring);
  }

  // ---- 拱腔上方的填芯，别让桥面看着是空心的 ----
  {
    const core = box(W * 0.96, DECK_Y - crownOut, wide - wallT * 2, M.stoneStrong);
    core.position.y = crownOut + core.geometry.parameters.height / 2;
    g.add(core);
  }

  // ---- 桥面板：比桥身略窄、薄薄一层 ----
  const deck = box(W + 0.1, 0.18, wide + 0.08, M.stoneLight);
  deck.position.y = DECK_Y + 0.09;
  g.add(deck);

  // ---- 两端的三级石阶 ----
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const h = DECK_Y * (1 - (i + 1) / 3.6);
      const step = box(0.5, h + 0.05, wide + 0.16, M.stoneLight);
      step.position.set(sx * (W / 2 + 0.25 + i * 0.5), (h + 0.05) / 2, 0);
      g.add(step);
    }
  }

  // ---- 栏板 + 望柱 ----
  for (const sz of [-1, 1]) {
    const rail = box(W, 0.26, 0.14, M.stoneLight);
    rail.position.set(0, DECK_Y + 0.31, sz * (wide / 2 - 0.05));
    g.add(rail);
    for (let i = -2; i <= 2; i++) {
      const post = box(0.22, 0.5, 0.24, M.stoneStrong);
      post.position.set(i * (W / 5), DECK_Y + 0.35, sz * (wide / 2 - 0.05));
      g.add(post);
    }
  }

  g.userData.deckY = DECK_Y;
  g.userData.span = span;
  return g;
}

/* ============================================================
 *  风车：锥台石塔 + 木顶盖 + 四片格栅帆
 * ========================================================== */
export function makeWindmill(M, { h = 9.5, r = 3.1 } = {}) {
  const g = new THREE.Group();

  // 基座
  const plinth = cyl(r + 0.45, r + 0.6, 0.7, 14, M.stoneStrong);
  plinth.position.y = 0.35;
  g.add(plinth);

  // 塔身（上细下粗）
  const tower = cyl(r * 0.72, r, h, 14, M.stoneLight);
  tower.position.y = 0.7 + h / 2;
  g.add(tower);

  // 一圈束带
  for (const k of [0.35, 0.68]) {
    const band = cyl(r * (1 - k * 0.28) + 0.09, r * (1 - k * 0.28) + 0.09, 0.22, 14, M.stoneStrong, false);
    band.position.y = 0.7 + h * k;
    g.add(band);
  }

  // 门与两扇小窗
  const door = box(1.1, 1.9, 0.2, M.wood);
  door.position.set(0, 0.7 + 0.95, r - 0.08);
  g.add(door);
  for (const [y, s] of [[0.7 + h * 0.52, 0.6], [0.7 + h * 0.78, 0.5]]) {
    const win = box(s, s * 1.15, 0.18, M.window, false);
    win.position.set(0, y, r * (1 - (y - 0.7) / h * 0.28) - 0.02);
    g.add(win);
  }

  // 木顶盖（"帽"）
  const capR = r * 0.78;
  const cap = cyl(capR * 0.72, capR + 0.16, 1.15, 14, M.timber);
  cap.position.y = 0.7 + h + 0.5;
  g.add(cap);
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(capR * 0.74, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), M.slate);
  capTop.position.y = 0.7 + h + 1.05;
  capTop.castShadow = true;
  g.add(capTop);

  // 帽后的转向尾杆（磨坊主靠它把帆转向风）
  const tail = box(0.16, 0.16, 3.6, M.timber);
  tail.position.set(0, 0.7 + h + 0.25, -capR - 1.5);
  tail.rotation.x = 0.22;
  g.add(tail);

  // 帆轴
  const shaftY = 0.7 + h + 0.55;
  const shaft = cyl(0.24, 0.28, 1.6, 8, M.wood);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0, shaftY, capR + 0.55);
  g.add(shaft);

  /* ---- 四片帆：整组绕 Z 轴旋转 ---- */
  const sails = new THREE.Group();
  sails.position.set(0, shaftY, capR + 1.15);

  const ARM = 5.2;
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i / 4) * Math.PI * 2;

    // 主梁
    const spar = box(0.16, ARM, 0.16, M.wood);
    spar.position.y = ARM / 2 + 0.5;
    arm.add(spar);

    // 格栅：横档 + 两根纵档
    const bladeW = 1.5;
    for (let k = 0; k < 9; k++) {
      const y = 0.95 + k * ((ARM - 0.6) / 8);
      const bar = box(bladeW, 0.075, 0.075, M.wood, false);
      bar.position.set(bladeW / 2 + 0.12, y, 0);
      arm.add(bar);
    }
    const outer = box(0.08, ARM - 0.6, 0.08, M.wood, false);
    outer.position.set(bladeW + 0.12, ARM / 2 + 0.6, 0);
    arm.add(outer);

    // 蒙在格栅上的一段帆布（只在靠近根部的一半）
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(bladeW - 0.1, ARM * 0.52), M.sailCloth);
    cloth.position.set(bladeW / 2 + 0.12, 0.95 + ARM * 0.28, 0.045);
    cloth.castShadow = true;
    arm.add(cloth);

    sails.add(arm);
  }

  // 轴心轮毂
  const hub = cyl(0.36, 0.36, 0.5, 10, M.wood);
  hub.rotation.x = Math.PI / 2;
  sails.add(hub);

  g.add(sails);
  g.userData.sails = sails;
  g.userData.spinAxis = 'z';
  g.userData.spinSpeed = 0.34;

  return g;
}

/* ============================================================
 *  水磨坊：石砌磨房 + 木水轮 + 引水槽
 * ========================================================== */
export function makeWaterMill(M, { w = 6.4, d = 5.6, h = 4.4, wheelR = 2.5 } = {}) {
  const g = new THREE.Group();
  const W2 = w / 2;
  const D2 = d / 2;
  const BASE = 0.55;

  // 石基
  const plinth = box(w + 0.5, BASE, d + 0.5, M.stoneStrong);
  plinth.position.y = BASE / 2;
  g.add(plinth);

  // 墙体
  const walls = box(w, h, d, M.plaster);
  walls.position.y = BASE + h / 2;
  g.add(walls);

  // 木骨架
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(0.28, h, 0.28, M.beam);
      post.position.set(sx * W2, BASE + h / 2, sz * D2);
      g.add(post);
    }
  }
  for (const y of [BASE + 0.24, BASE + h - 0.18, BASE + h * 0.55]) {
    for (const sz of [-1, 1]) {
      const r = box(w + 0.06, 0.16, 0.09, M.beam);
      r.position.set(0, y, sz * (D2 + 0.03));
      g.add(r);
    }
  }
  for (const sx of [-1, 1]) {
    for (let sz of [-1, 1]) {
      const brace = box(0.14, h * 0.42, 0.07, M.beam);
      brace.position.set(sx * w * 0.28, BASE + h * 0.3, sz * (D2 + 0.04));
      brace.rotation.z = sx * Math.atan2(w * 0.28, h * 0.42);
      g.add(brace);
    }
  }

  // 门 / 窗
  const door = box(1.15, 2.0, 0.14, M.wood);
  door.position.set(-w * 0.2, BASE + 1.0, D2 + 0.07);
  g.add(door);
  const win = box(0.72, 0.64, 0.1, M.window, false);
  win.position.set(w * 0.2, BASE + h * 0.62, D2 + 0.06);
  g.add(win);
  const win2 = box(0.1, 0.6, 0.68, M.window, false);
  win2.position.set(W2 + 0.04, BASE + h * 0.6, -d * 0.1);
  g.add(win2);

  // 屋顶
  const roof = gable(w + 1.4, d + 1.1, 2.3, M.tile);
  roof.position.y = BASE + h;
  g.add(roof);
  const ridge = box(0.3, 0.22, d + 1.2, M.beam);
  ridge.position.y = BASE + h + 2.28;
  g.add(ridge);
  // 山墙封檐板
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const len = Math.hypot((w + 1.4) / 2, 2.3);
      const barge = box(len, 0.14, 0.12, M.beam);
      barge.position.set((sx * (w + 1.4)) / 4, BASE + h + 2.3 / 2, (sz * (d + 1.1)) / 2);
      barge.rotation.z = -sx * Math.atan2(2.3, (w + 1.4) / 2);
      g.add(barge);
    }
  }
  // 烟囱
  const chim = box(0.62, 2.6, 0.62, M.stone);
  chim.position.set(w * 0.3, BASE + h + 1.0, -d * 0.18);
  g.add(chim);

  /* ---- 水轮：立在磨房西侧（-X），绕 X 轴转 ---- */
  const wx = -W2 - 0.45;
  const wy = BASE + wheelR * 0.82;
  const wheel = new THREE.Group();
  wheel.position.set(wx, wy, 0);

  // 两只轮圈
  for (const sz of [-0.42, 0.42]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.11, 6, 22), M.timber);
    rim.position.z = sz;
    rim.castShadow = true;
    wheel.add(rim);
  }
  // 辐条
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spoke = box(0.07, wheelR * 2, 0.07, M.timber, false);
    spoke.rotation.z = a;
    wheel.add(spoke);
  }
  // 桨板
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const paddle = box(0.06, 0.72, 0.9, M.wood);
    paddle.position.set(Math.cos(a + Math.PI / 2) * wheelR, Math.sin(a + Math.PI / 2) * wheelR, 0);
    paddle.rotation.z = a;
    wheel.add(paddle);
  }
  // 中心轴
  const axle = cyl(0.16, 0.16, 1.5, 8, M.iron);
  axle.rotation.x = Math.PI / 2;
  wheel.add(axle);

  g.add(wheel);
  g.userData.wheel = wheel;
  g.userData.spinAxis = 'x';
  g.userData.spinSpeed = -0.55;
  g.userData.wheelY = wy;

  /* ---- 引水槽：从水轮上方斜插过来 ---- */
  const flume = box(0.85, 0.16, 4.2, M.wood);
  flume.position.set(wx - 0.7, wy + wheelR * 0.72, -1.4);
  flume.rotation.x = -0.12;
  g.add(flume);
  for (const sx of [-1, 1]) {
    const side = box(0.08, 0.36, 4.2, M.wood, false);
    side.position.set(wx - 0.7 + sx * 0.42, wy + wheelR * 0.72 + 0.18, -1.4);
    side.rotation.x = -0.12;
    g.add(side);
  }
  // 槽的两根支柱
  for (const sz of [-2.6, 0.4]) {
    const leg = box(0.16, wy + 1.2, 0.16, M.timber);
    leg.position.set(wx - 1.15, (wy + 1.2) / 2, sz);
    g.add(leg);
  }

  return g;
}

/* ============================================================
 *  采石场：阶梯石壁 + 半成品石块 + 木吊架
 * ========================================================== */
export function makeQuarry(M, { w = 18, d = 14, steps = 3 } = {}) {
  const g = new THREE.Group();

  // 场地：一层碎石地面
  const floor = box(w, 0.12, d, M.soilBorder, false);
  floor.position.y = 0.04;
  g.add(floor);

  for (let i = 0; i < 70; i++) {
    const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), M.stoneLight);
    chip.position.set((Math.random() - 0.5) * w * 0.94, 0.16, (Math.random() - 0.5) * d * 0.94);
    const sc = 0.5 + Math.random() * 1.1;
    chip.scale.set(sc, sc * 0.55, sc);
    chip.rotation.set(Math.random(), Math.random(), Math.random());
    chip.receiveShadow = true;
    g.add(chip);
  }

  // 阶梯状石壁（贴着北侧往上退）
  const STEP_H = 2.3;
  for (let i = 0; i < steps; i++) {
    const sw = w - i * 2.6;
    const sd = 1.9;
    const sz = -d / 2 + 1.2 + i * (sd - 0.5);
    const wall = box(sw, STEP_H * (i + 1), sd, M.stoneStrong);
    wall.position.set(0, (STEP_H * (i + 1)) / 2, sz + sd / 2);
    g.add(wall);

    // 台阶顶面的草皮
    const cap = box(sw + 0.2, 0.14, sd + 0.2, M.plateauTop, false);
    cap.position.set(0, STEP_H * (i + 1) + 0.07, sz + sd / 2);
    g.add(cap);
  }

  // 崖壁上凿出的痕迹：几道深色凹槽
  for (let i = 0; i < 6; i++) {
    const cut = box(0.5, STEP_H * 0.6, 0.16, M.dark, false);
    cut.position.set(-w / 2 + 2 + i * 2.6, STEP_H * 0.5, -d / 2 + 1.2 + 0.98);
    g.add(cut);
  }

  // 场地上堆放的石料
  const BLOCKS = [
    [-5.5, 3.2, 1.5, 0.9, 1.1, 0.2],
    [-3.6, 4.2, 1.3, 0.8, 1.0, -0.35],
    [-4.6, 4.0, 1.2, 0.75, 0.9, 0.5],
    [4.8, 2.4, 1.6, 1.0, 1.2, -0.2],
    [6.2, 3.4, 1.2, 0.8, 1.0, 0.45],
  ];
  for (const [x, z, bw, bh, bd, r] of BLOCKS) {
    const b = box(bw, bh, bd, M.stoneLight);
    b.position.set(x, bh / 2 + 0.1, z);
    b.rotation.y = r;
    g.add(b);
  }
  // 一块还在凿、半嵌在石堆里的料
  {
    const half = box(2.2, 0.9, 1.4, M.stoneLight);
    half.position.set(-1.2, 0.5, 3.6);
    half.rotation.y = 0.24;
    g.add(half);
  }

  // 木吊架（两脚 + 斜撑 + 悬臂 + 吊索）
  {
    const cr = new THREE.Group();
    cr.position.set(6.5, 0, -1.5);
    cr.rotation.y = -0.4;

    for (const sx of [-1, 1]) {
      const leg = box(0.28, 5.2, 0.28, M.timber);
      leg.position.set(sx * 1.1, 2.6, 0);
      leg.rotation.z = sx * 0.12;
      cr.add(leg);
    }
    const cross = box(2.4, 0.22, 0.22, M.timber);
    cross.position.y = 3.4;
    cr.add(cross);

    // 悬臂
    const boom = box(0.24, 0.24, 4.0, M.timber);
    boom.position.set(0, 5.0, 1.3);
    boom.rotation.x = -0.18;
    cr.add(boom);
    const stay = box(0.16, 0.16, 3.4, M.timber, false);
    stay.position.set(0, 4.0, 0.4);
    stay.rotation.x = 0.9;
    cr.add(stay);

    // 吊索 + 吊着的石块
    const rope = box(0.05, 2.6, 0.05, M.rope, false);
    rope.position.set(0, 3.6, 3.1);
    cr.add(rope);
    const load = box(0.9, 0.7, 0.9, M.stoneLight);
    load.position.set(0, 2.1, 3.1);
    cr.add(load);

    g.add(cr);
  }

  // 几辆在场地里的小推车（板 + 轮）
  for (const [x, z, r] of [[2.0, 5.2, 0.6], [-6.6, 1.2, -1.1]]) {
    const cart = new THREE.Group();
    cart.position.set(x, 0, z);
    cart.rotation.y = r;
    const bed = box(1.3, 0.12, 0.8, M.wood);
    bed.position.y = 0.5;
    cart.add(bed);
    for (const sx of [-1, 1]) {
      const wheel = cyl(0.32, 0.32, 0.09, 10, M.wood, false);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * 0.5, 0.32, 0.3);
      cart.add(wheel);
    }
    g.add(cart);
  }

  return g;
}

/* ============================================================
 *  伐木场：树桩、原木堆、锯架、劈柴台
 * ========================================================== */
export function makeLumberYard(M) {
  const g = new THREE.Group();

  // 锯架：两根交叉的 X 形支腿 + 一根横木，原木架在上面
  {
    const saw = new THREE.Group();
    saw.position.set(0, 0, 0);
    for (const sz of [-2.2, 2.2]) {
      for (const sx of [-1, 1]) {
        const leg = box(0.16, 1.7, 0.16, M.timber);
        leg.position.set(sx * 0.5, 0.8, sz);
        leg.rotation.z = sx * 0.28;
        saw.add(leg);
      }
    }
    // 架上的原木
    for (let i = 0; i < 3; i++) {
      const log = cyl(0.34, 0.38, 5.0, 9, M.wood);
      log.rotation.x = Math.PI / 2;
      log.position.set(-0.3 + i * 0.62, 1.5 + i * 0.12, 0);
      saw.add(log);
      const end = cyl(0.33, 0.33, 0.06, 9, M.straw, false);
      end.rotation.x = Math.PI / 2;
      end.position.set(-0.3 + i * 0.62, 1.5 + i * 0.12, -2.52);
      saw.add(end);
    }
    g.add(saw);
  }

  // 待锯的原木堆（三角堆）
  for (let row = 0; row < 3; row++) {
    const n = 3 - row;
    for (let i = 0; i < n; i++) {
      const log = cyl(0.32, 0.32, 3.6, 9, M.wood);
      log.rotation.x = Math.PI / 2;
      log.position.set(4.6 + i * 0.66 + row * 0.33, 0.34 + row * 0.58, -0.5);
      g.add(log);
    }
  }

  // 树桩
  for (const [x, z, r] of [[-4.2, 2.6, 0.3], [-5.4, 1.1, 0.7], [-3.4, -2.0, -0.4], [-6.0, -1.4, 1.2]]) {
    const stump = cyl(0.42, 0.52, 0.75, 9, M.wood);
    stump.position.set(x, 0.37, z);
    stump.rotation.y = r;
    g.add(stump);
    const face = cyl(0.42, 0.42, 0.05, 9, M.straw, false);
    face.position.set(x, 0.76, z);
    g.add(face);
  }

  // 劈柴台：一段粗木 + 插着的斧头
  {
    const block = cyl(0.6, 0.66, 0.9, 10, M.wood);
    block.position.set(2.2, 0.45, 3.4);
    g.add(block);
    const axeHandle = box(0.07, 1.1, 0.07, M.wood, false);
    axeHandle.position.set(2.2, 1.2, 3.4);
    axeHandle.rotation.z = 0.32;
    g.add(axeHandle);
    const axeHead = box(0.1, 0.34, 0.42, M.iron, false);
    axeHead.position.set(2.16, 0.98, 3.4);
    axeHead.rotation.z = 0.32;
    g.add(axeHead);
  }

  // 散落的木屑
  for (let i = 0; i < 40; i++) {
    const chip = box(0.14, 0.03, 0.06, M.straw, false);
    chip.position.set((Math.random() - 0.5) * 9, 0.08, (Math.random() - 0.5) * 7);
    chip.rotation.y = Math.random() * Math.PI;
    g.add(chip);
  }

  return g;
}

/* ============================================================
 *  敞棚作坊：正面开敞的木棚 + 工作台 + 行当用具
 *  kind: 'potter' | 'cooper' | 'weaver' | 'tinker'
 * ========================================================== */
export function makeCraftShed(M, { kind = 'potter', w = 5.4, d = 4.4, h = 3.0 } = {}) {
  const g = new THREE.Group();
  const W2 = w / 2;
  const D2 = d / 2;
  const BASE = 0.35;

  // 石基
  const plinth = box(w + 0.3, BASE, d + 0.3, M.stoneStrong);
  plinth.position.y = BASE / 2;
  g.add(plinth);

  // 后墙 + 两侧矮墙（正面开敞）
  const back = box(w, h, 0.26, M.plaster);
  back.position.set(0, BASE + h / 2, -D2 + 0.13);
  g.add(back);
  for (const sx of [-1, 1]) {
    const side = box(0.26, h * 0.72, d, M.plaster);
    side.position.set(sx * (W2 - 0.13), BASE + h * 0.36, 0);
    g.add(side);
  }

  // 木骨架：四角柱 + 前檐横梁
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(0.24, h, 0.24, M.beam);
      post.position.set(sx * W2, BASE + h / 2, sz * D2);
      g.add(post);
    }
  }
  const lintel = box(w + 0.2, 0.22, 0.2, M.beam);
  lintel.position.set(0, BASE + h - 0.1, D2);
  g.add(lintel);
  const railBack = box(w, 0.18, 0.16, M.beam);
  railBack.position.set(0, BASE + h * 0.6, -D2 + 0.04);
  g.add(railBack);

  // 斜撑
  for (const sx of [-1, 1]) {
    const len = Math.hypot(w * 0.3, h * 0.4);
    const brace = box(0.13, len, 0.08, M.beam);
    brace.position.set(sx * w * 0.3, BASE + h * 0.8, -D2 + 0.2);
    brace.rotation.z = sx * Math.atan2(w * 0.3, h * 0.4);
    g.add(brace);
  }

  // 坡顶
  const roof = gable(w + 1.0, d + 0.9, 1.6, M.tile);
  roof.position.y = BASE + h;
  g.add(roof);
  const ridge = box(0.24, 0.18, d + 1.0, M.beam);
  ridge.position.y = BASE + h + 1.58;
  g.add(ridge);

  // 工作台
  const bench = box(w - 0.9, 0.12, 0.8, M.wood);
  bench.position.set(0, BASE + 0.92, -D2 + 1.0);
  g.add(bench);
  for (const sx of [-1, 1]) {
    const leg = box(0.12, 0.92, 0.7, M.timber);
    leg.position.set(sx * (w / 2 - 0.8), BASE + 0.46, -D2 + 1.0);
    g.add(leg);
  }

  /* ---- 行当用具 ---- */
  if (kind === 'potter') {
    // 陶轮
    const wheelBase = cyl(0.3, 0.36, 0.7, 10, M.timber);
    wheelBase.position.set(-1.1, BASE + 0.35, 0.6);
    g.add(wheelBase);
    const wheelTop = cyl(0.52, 0.52, 0.1, 12, M.wood);
    wheelTop.position.set(-1.1, BASE + 0.74, 0.6);
    g.add(wheelTop);
    // 架上的陶坯
    for (let i = 0; i < 4; i++) {
      const pot = cyl(0.16, 0.2, 0.34 + (i % 2) * 0.12, 9, M.soilBorder);
      pot.position.set(-1.0 + i * 0.72, BASE + 1.14, -D2 + 1.0);
      g.add(pot);
    }
    // 地上的一摞待烧陶罐
    for (let i = 0; i < 5; i++) {
      const pot = cyl(0.19, 0.24, 0.42, 9, M.soilBorder);
      pot.position.set(1.4 + (i % 2) * 0.55, BASE + 0.22, 1.2 - Math.floor(i / 2) * 0.55);
      g.add(pot);
    }
  } else if (kind === 'cooper') {
    // 箍桶：一堆桶板 + 铁箍 + 半成品
    for (let i = 0; i < 4; i++) {
      const barrel = cyl(0.34, 0.34, 0.8, 10, M.wood);
      barrel.position.set(-1.3 + i * 0.55, BASE + 0.42, 1.1);
      g.add(barrel);
      const hoop = cyl(0.355, 0.355, 0.06, 10, M.iron, false);
      hoop.position.set(-1.3 + i * 0.55, BASE + 0.68, 1.1);
      g.add(hoop);
    }
    // 桶板
    for (let i = 0; i < 8; i++) {
      const stave = box(0.09, 0.85, 0.12, M.wood, false);
      stave.position.set(1.0 + i * 0.13, BASE + 1.05, -D2 + 1.0);
      stave.rotation.x = -0.16;
      g.add(stave);
    }
    // 铁箍挂在墙上
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 5, 14), M.iron);
      ring.position.set(1.1 + i * 0.02, BASE + 1.8 - i * 0.55, -D2 + 0.28);
      g.add(ring);
    }
  } else if (kind === 'weaver') {
    // 织机：两片立框 + 经线 + 卷布轴
    const frame = new THREE.Group();
    frame.position.set(0, BASE, 0.4);
    for (const sx of [-1, 1]) {
      const up = box(0.12, 2.1, 0.12, M.timber);
      up.position.set(sx * 0.9, 1.05, 0);
      frame.add(up);
    }
    const topBar = box(1.95, 0.12, 0.12, M.timber);
    topBar.position.y = 2.05;
    frame.add(topBar);
    const botBar = box(1.95, 0.12, 0.12, M.timber);
    botBar.position.y = 0.35;
    frame.add(botBar);
    for (let i = 0; i < 11; i++) {
      const warp = box(0.02, 1.6, 0.02, M.linen, false);
      warp.position.set(-0.8 + i * 0.16, 1.2, 0);
      frame.add(warp);
    }
    // 织了一半的布
    const cloth = box(1.6, 0.5, 0.05, M.linen, false);
    cloth.position.set(0, 0.72, 0.02);
    frame.add(cloth);
    const beam = cyl(0.1, 0.1, 1.9, 8, M.wood);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 0.42;
    frame.add(beam);
    g.add(frame);

    // 墙上的线团
    for (let i = 0; i < 5; i++) {
      const skein = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.07, 6, 10), M.linen);
      skein.position.set(-1.6 + i * 0.5, BASE + 1.85, -D2 + 0.24);
      g.add(skein);
    }
  } else {
    // tinker：补锅匠 / 小五金
    for (let i = 0; i < 4; i++) {
      const pot = cyl(0.26, 0.2, 0.26, 10, M.iron);
      pot.position.set(-1.2 + i * 0.5, BASE + 1.1, -D2 + 1.0);
      g.add(pot);
    }
    // 墙上挂的锅铲与铁片
    for (let i = 0; i < 6; i++) {
      const tool = box(0.06, 0.5, 0.03, M.iron, false);
      tool.position.set(-1.3 + i * 0.28, BASE + 1.75, -D2 + 0.26);
      tool.rotation.z = (i % 2 ? 1 : -1) * 0.12;
      g.add(tool);
    }
    // 小火盆
    const brazier = cyl(0.32, 0.26, 0.34, 10, M.iron);
    brazier.position.set(1.4, BASE + 0.17, 1.1);
    g.add(brazier);
    const coals = cyl(0.27, 0.27, 0.08, 10, M.ember, false);
    coals.position.set(1.4, BASE + 0.32, 1.1);
    g.add(coals);
  }

  return g;
}

/* ============================================================
 *  陶窑：圆顶窑室 + 窑口 + 烟囱 + 旁边待烧的陶坯
 * ========================================================== */
export function makeKiln(M, { r = 1.9, h = 2.4 } = {}) {
  const g = new THREE.Group();

  const base = cyl(r + 0.35, r + 0.45, 0.4, 14, M.stoneStrong);
  base.position.y = 0.2;
  g.add(base);

  // 窑室（砖红色的圆筒）
  const body = cyl(r, r + 0.1, h, 14, M.kilnBrick);
  body.position.y = 0.4 + h / 2;
  g.add(body);

  // 圆顶
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    M.kilnBrick
  );
  dome.position.y = 0.4 + h;
  dome.castShadow = true;
  g.add(dome);

  // 窑口
  const mouth = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 12, 0, Math.PI),
    M.dark
  );
  mouth.position.set(0, 0.4 + 0.72, r * 0.98);
  g.add(mouth);
  const mouthRect = box(0.84, 0.6, 0.1, M.dark, false);
  mouthRect.position.set(0, 0.4 + 0.42, r * 0.96);
  g.add(mouthRect);
  // 窑口冒出的余火
  const ember = box(0.5, 0.14, 0.12, M.ember, false);
  ember.position.set(0, 0.4 + 0.2, r * 0.94);
  g.add(ember);

  // 小烟囱
  const chim = cyl(0.28, 0.34, 1.3, 10, M.kilnBrick);
  chim.position.set(r * 0.55, 0.4 + h + 0.5, -r * 0.4);
  g.add(chim);

  // 旁边摆着待烧的陶坯
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rr = r + 0.9 + (i % 2) * 0.4;
    const pot = cyl(0.16, 0.21, 0.38, 9, M.soilBorder);
    pot.position.set(Math.cos(a) * rr, 0.19, Math.sin(a) * rr);
    g.add(pot);
  }

  g.userData.emberPos = new THREE.Vector3(0, 0.4 + 0.24, r * 0.98);
  return g;
}

/* ============================================================
 *  晒场：拉在两根柱子之间的长杆，上挂布匹 / 皮子 / 鱼干
 * ========================================================== */
export function makeDryingRack(M, { len = 6.5, kind = 'cloth' } = {}) {
  const g = new THREE.Group();

  for (const sx of [-1, 1]) {
    const post = cyl(0.08, 0.11, 2.6, 6, M.wood);
    post.position.set(sx * len / 2, 1.3, 0);
    g.add(post);
    // 斜撑
    const stay = box(0.07, 1.5, 0.07, M.wood, false);
    stay.position.set(sx * (len / 2 - 0.5), 0.7, 0);
    stay.rotation.z = sx * 0.62;
    g.add(stay);
  }

  const rod = cyl(0.04, 0.04, len, 5, M.wood, false);
  rod.rotation.z = Math.PI / 2;
  rod.position.y = 2.42;
  g.add(rod);

  const n = kind === 'cloth' ? 5 : 7;
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + 0.8 + i * ((len - 1.6) / (n - 1));
    if (kind === 'cloth') {
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.3), M.linen);
      cloth.position.set(x, 1.78, 0);
      cloth.rotation.y = (Math.random() - 0.5) * 0.12;
      g.add(cloth);
    } else {
      // 风干的皮子 / 鱼：薄片，微微外翻
      const hide = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), M.hideMat);
      hide.position.set(x, 2.0, 0.02);
      hide.rotation.y = (Math.random() - 0.5) * 0.2;
      g.add(hide);
    }
  }

  return g;
}
