import * as THREE from 'three';

/* ============================================================
 *  镇中心：市集广场、木筋楼房、酒馆、铁匠铺、教堂钟楼
 *  与 village.js 同一套约定——所有构件用主场景传入的材质 M
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

/** 拱窗：矩形 + 半圆顶（默认朝 +Z，贴在墙面上） */
function archWindow(w, h, mat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  body.position.y = h / 2;
  g.add(body);
  const arch = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 14, 0, Math.PI), mat);
  arch.position.y = h;
  g.add(arch);
  return g;
}

/* ============================================================
 *  市集广场：鹅卵石铺地 + 石砌镶边
 * ========================================================== */
export function makeMarketSquare(M, { w = 26, d = 20 } = {}) {
  const g = new THREE.Group();

  const pave = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.cobble);
  pave.rotation.x = -Math.PI / 2;
  pave.position.y = 0.02;
  pave.receiveShadow = true;
  g.add(pave);

  // 边缘压一圈条石，让广场和草地之间有个"坎"
  const edge = 0.7;
  for (const sz of [-1, 1]) {
    const b = box(w + edge * 2, 0.16, edge, M.stoneLight, false);
    b.position.set(0, 0.08, (sz * d) / 2);
    g.add(b);
  }
  for (const sx of [-1, 1]) {
    const b = box(edge, 0.16, d, M.stoneLight, false);
    b.position.set((sx * w) / 2, 0.08, 0);
    g.add(b);
  }

  // 四角的排水石
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const s = cyl(0.34, 0.34, 0.08, 8, M.stoneStrong, false);
      s.position.set((sx * w) / 2 - sx * 1.1, 0.04, (sz * d) / 2 - sz * 1.1);
      g.add(s);
    }
  }

  return g;
}

/* ============================================================
 *  市场石十字：三级台阶 + 八角柱 + 十字架
 * ========================================================== */
export function makeMarketCross(M) {
  const g = new THREE.Group();

  let y = 0;
  for (const [r, h] of [[1.5, 0.24], [1.05, 0.22], [0.72, 0.2]]) {
    const step = cyl(r, r + 0.04, h, 8, M.stoneLight);
    step.position.y = y + h / 2;
    g.add(step);
    y += h;
  }

  const shaft = cyl(0.19, 0.25, 3.2, 8, M.stone);
  shaft.position.y = y + 1.6;
  g.add(shaft);

  const cap = cyl(0.3, 0.34, 0.18, 8, M.stoneLight);
  cap.position.y = y + 3.28;
  g.add(cap);

  const bar = box(0.17, 1.05, 0.17, M.stone, false);
  bar.position.y = y + 3.9;
  g.add(bar);
  const arm = box(0.72, 0.16, 0.16, M.stone, false);
  arm.position.y = y + 4.08;
  g.add(arm);

  return g;
}

/* ============================================================
 *  市集摊位：四柱 + 柜台 + 布篷 + 货品
 * ========================================================== */
export function makeStall(M, { awning = null, kind = 'bread' } = {}) {
  const g = new THREE.Group();
  const W = 3.0;
  const D = 1.8;
  const H = 2.35;

  // 四根立柱（后两根高）
  for (const sx of [-1, 1]) {
    const back = box(0.12, H + 0.35, 0.12, M.timber);
    back.position.set(sx * (W / 2 - 0.12), (H + 0.35) / 2, -D / 2 + 0.1);
    g.add(back);

    const front = box(0.12, H - 0.25, 0.12, M.timber);
    front.position.set(sx * (W / 2 - 0.12), (H - 0.25) / 2, D / 2 - 0.1);
    g.add(front);
  }

  // 柜台
  const counter = box(W, 0.14, D * 0.62, M.wood);
  counter.position.set(0, 0.92, D * 0.14);
  g.add(counter);
  for (const sx of [-1, 1]) {
    const leg = box(0.1, 0.92, 0.1, M.timber);
    leg.position.set(sx * (W / 2 - 0.3), 0.46, D * 0.42);
    g.add(leg);
  }
  const skirt = box(W - 0.1, 0.72, 0.08, M.wood);
  skirt.position.set(0, 0.44, D * 0.44);
  g.add(skirt);

  // 布篷：挂在后梁的转轴上，收摊时整片往上卷起来
  if (awning) {
    const pivot = new THREE.Group();
    pivot.position.set(0, H + 0.34, -D / 2 + 0.12);

    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.5, D + 0.6), awning);
    cloth.rotation.x = -Math.PI / 2 + 0.3;
    cloth.position.set(0, -0.18, D / 2 - 0.1);
    cloth.castShadow = true;
    // 要单独留着做卷篷动画，别被 compactGroup 合并掉
    cloth.userData.keepSeparate = true;
    cloth.userData.basePos = cloth.position.clone();
    cloth.userData.baseScaleY = 1;
    pivot.add(cloth);

    const flap = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.5, 0.3), awning);
    flap.position.set(0, -0.36, D + 0.2);
    flap.userData.keepSeparate = true;
    pivot.add(flap);

    g.add(pivot);
    g.userData.awning = pivot;
    g.userData.awningCloth = cloth;
    g.userData.awningFlap = flap;
  }

  // 货品：收摊时要整组藏起来，所以单独挂一个组，并且不许被 compactGroup 合并
  const goods = new THREE.Group();
  goods.userData.keepSeparate = true;
  g.add(goods);

  if (kind === 'bread') {
    for (let i = 0; i < 7; i++) {
      const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), M.straw);
      loaf.scale.set(1.4, 0.7, 0.9);
      loaf.position.set(-1.05 + i * 0.34, 1.04, 0.14 + (i % 2) * 0.22);
      loaf.castShadow = true;
      goods.add(loaf);
    }
  } else if (kind === 'fish') {
    for (let i = 0; i < 6; i++) {
      const fish = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), M.stoneLight);
      fish.scale.set(1.9, 0.5, 0.7);
      fish.position.set(-0.9 + i * 0.36, 1.02, 0.2);
      fish.rotation.y = (i % 3) * 0.4 - 0.4;
      fish.castShadow = true;
      goods.add(fish);
    }
  } else if (kind === 'pottery') {
    for (let i = 0; i < 5; i++) {
      const pot = cyl(0.13, 0.17, 0.3, 8, M.soilBorder);
      pot.position.set(-0.85 + i * 0.42, 1.14, 0.25);
      goods.add(pot);
    }
  } else if (kind === 'cloth') {
    for (let i = 0; i < 3; i++) {
      const roll = cyl(0.16, 0.16, 0.9, 8, i === 1 ? M.straw : M.wood);
      roll.rotation.z = Math.PI / 2;
      roll.position.set(0, 1.08 + i * 0.02, 0.15 - i * 0.32);
      goods.add(roll);
    }
  } else if (kind === 'apple') {
    for (let i = 0; i < 9; i++) {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), M.fruitRed);
      a.position.set(-0.9 + (i % 3) * 0.36, 1.03, 0.1 + Math.floor(i / 3) * 0.26);
      goods.add(a);
    }
  }
  g.userData.goods = goods;

  // 收摊后盖在柜台上的粗麻苫布（默认缩成 0，看不见）
  {
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 0.12, D * 0.92),
      M.linen.clone()
    );
    cloth.material = cloth.material.clone();
    cloth.material.color.setHex(0x8a7d63);
    cloth.material.side = THREE.DoubleSide;
    cloth.rotation.x = -Math.PI / 2;
    cloth.position.set(0, 1.0, D * 0.14);
    cloth.scale.set(1, 0, 1);
    cloth.userData.keepSeparate = true;
    g.add(cloth);
    g.userData.cover = cloth;
  }

  // 摊主的小凳
  const stool = box(0.4, 0.44, 0.4, M.wood);
  stool.position.set(0.9, 0.22, -0.5);
  g.add(stool);

  return g;
}

/* ============================================================
 *  木筋楼（半木结构，二层出挑）
 * ========================================================== */
export function makeTudorHouse(M, opt = {}) {
  const {
    w = 6.5, d = 5.2,
    h1 = 2.6, h2 = 2.3,
    roofH = 2.6,
    jetty = 0.32,       // 二层向外挑出多少
    stories = 2,
    doorX = 0,
  } = opt;

  const g = new THREE.Group();
  const BASE = 0.42;
  const W2 = w / 2;
  const D2 = d / 2;

  // 石砌墙基
  const plinth = box(w + 0.3, BASE, d + 0.3, M.stone);
  plinth.position.y = BASE / 2;
  g.add(plinth);

  /* ---- 一层 ---- */
  const g1 = box(w, h1, d, M.stucco);
  g1.position.y = BASE + h1 / 2;
  g.add(g1);

  // 一层的木框：四角柱 + 上下横梁 + 中柱
  const frameG = new THREE.Group();
  frameG.position.y = BASE;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(0.2, h1, 0.2, M.timber);
      post.position.set(sx * W2, h1 / 2, sz * D2);
      frameG.add(post);
    }
  }
  for (const y of [0.09, h1 - 0.09]) {
    for (const sz of [-1, 1]) {
      const r = box(w + 0.06, 0.17, 0.09, M.timber);
      r.position.set(0, y, sz * (D2 + 0.03));
      frameG.add(r);
    }
    for (const sx of [-1, 1]) {
      const r = box(0.09, 0.17, d + 0.06, M.timber);
      r.position.set(sx * (W2 + 0.03), y, 0);
      frameG.add(r);
    }
  }
  // 正面中柱
  const midPost = box(0.15, h1 - 0.2, 0.1, M.timber);
  midPost.position.set(0, h1 / 2, D2 + 0.03);
  frameG.add(midPost);

  // 正面两道斜撑
  for (const sx of [-1, 1]) {
    const len = Math.hypot(w * 0.3, h1 * 0.58);
    const brace = box(0.13, len, 0.08, M.timber);
    brace.position.set(sx * w * 0.26, h1 * 0.44, D2 + 0.05);
    brace.rotation.z = sx * Math.atan2(w * 0.3, h1 * 0.58);
    frameG.add(brace);
  }

  // 背面对称再来一套——从广场外面看过去也是木筋楼，不是光墙
  for (const sx of [-1, 1]) {
    const len = Math.hypot(w * 0.3, h1 * 0.58);
    const brace = box(0.13, len, 0.08, M.timber);
    brace.position.set(sx * w * 0.26, h1 * 0.44, -D2 - 0.05);
    brace.rotation.z = -sx * Math.atan2(w * 0.3, h1 * 0.58);
    frameG.add(brace);

    const post = box(0.15, h1 - 0.2, 0.1, M.timber);
    post.position.set(sx * w * 0.12, h1 / 2, -D2 - 0.03);
    frameG.add(post);
  }
  // 侧面的竖柱
  for (const sx of [-1, 1]) {
    const post = box(0.1, h1 - 0.2, 0.15, M.timber);
    post.position.set(sx * (W2 + 0.03), h1 / 2, 0);
    frameG.add(post);
  }
  g.add(frameG);

  /* ---- 二层（出挑） ---- */
  const topBase = BASE + h1;
  const hasUp = stories > 1;
  const upW = hasUp ? w + jetty * 2 : w;
  const upD = hasUp ? d + jetty * 2 : d;

  if (hasUp) {
    // 出挑的托梁，把"悬空"说得通
    for (let i = 0; i < 5; i++) {
      const joist = box(0.14, 0.18, jetty + 0.35, M.timber);
      joist.position.set(-W2 + 0.5 + i * ((w - 1) / 4), topBase - 0.09, D2 + jetty / 2 - 0.05);
      g.add(joist);
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const joist = box(jetty + 0.35, 0.18, 0.14, M.timber);
        joist.position.set(sx * (W2 + jetty / 2 - 0.05), topBase - 0.09, sz * (D2 - 0.5));
        g.add(joist);
      }
    }

    const g2 = box(upW, h2, upD, M.stucco);
    g2.position.y = topBase + h2 / 2;
    g.add(g2);

    const upW2 = upW / 2;
    const upD2 = upD / 2;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = box(0.2, h2, 0.2, M.timber);
        post.position.set(sx * upW2, topBase + h2 / 2, sz * upD2);
        g.add(post);
      }
    }
    for (const y of [topBase + 0.09, topBase + h2 - 0.09]) {
      for (const sz of [-1, 1]) {
        const r = box(upW + 0.06, 0.17, 0.09, M.timber);
        r.position.set(0, y, sz * (upD2 + 0.03));
        g.add(r);
      }
      for (const sx of [-1, 1]) {
        const r = box(0.09, 0.17, upD + 0.06, M.timber);
        r.position.set(sx * (upW2 + 0.03), y, 0);
        g.add(r);
      }
    }
    // 二层竖向短柱 + 斜撑（木筋楼最标志性的花样）
    for (const sx of [-1, 1]) {
      const v = box(0.13, h2 - 0.24, 0.09, M.timber);
      v.position.set(sx * upW * 0.22, topBase + h2 / 2, upD2 + 0.04);
      g.add(v);

      const len = Math.hypot(upW * 0.26, h2 * 0.6);
      const brace = box(0.12, len, 0.08, M.timber);
      brace.position.set(sx * upW * 0.35, topBase + h2 * 0.42, upD2 + 0.06);
      brace.rotation.z = sx * Math.atan2(upW * 0.26, h2 * 0.6);
      g.add(brace);
    }

    // 二层的窗（夜里亮）
    for (const sx of [-1, 1]) {
      const win = box(0.8, 0.85, 0.1, M.window, false);
      win.position.set(sx * upW * 0.24, topBase + h2 * 0.6, upD2 + 0.05);
      g.add(win);
      const sill = box(1.0, 0.09, 0.2, M.timber, false);
      sill.position.set(sx * upW * 0.24, topBase + h2 * 0.6 - 0.47, upD2 + 0.08);
      g.add(sill);

      // 背面同样两扇，夜里从村外看过去整条街都亮着
      const winB = box(0.8, 0.85, 0.1, M.window, false);
      winB.position.set(sx * upW * 0.24, topBase + h2 * 0.6, -upD2 - 0.05);
      g.add(winB);
      const sillB = box(1.0, 0.09, 0.2, M.timber, false);
      sillB.position.set(sx * upW * 0.24, topBase + h2 * 0.6 - 0.47, -upD2 - 0.08);
      g.add(sillB);
    }
    // 二层背面的短柱与斜撑
    for (const sx of [-1, 1]) {
      const v = box(0.13, h2 - 0.24, 0.09, M.timber);
      v.position.set(sx * upW * 0.22, topBase + h2 / 2, -upD2 - 0.04);
      g.add(v);

      const len = Math.hypot(upW * 0.26, h2 * 0.6);
      const brace = box(0.12, len, 0.08, M.timber);
      brace.position.set(sx * upW * 0.35, topBase + h2 * 0.42, -upD2 - 0.06);
      brace.rotation.z = -sx * Math.atan2(upW * 0.26, h2 * 0.6);
      g.add(brace);
    }
  }

  /* ---- 屋顶 ---- */
  const roofBaseY = BASE + h1 + (hasUp ? h2 : 0);
  const roofW = upW + 1.0;
  const roofD = upD + 0.9;

  const roof = gable(roofW, roofD, roofH, M.tile);
  roof.position.y = roofBaseY;
  g.add(roof);

  const ridge = box(0.3, 0.22, roofD + 0.1, M.timber);
  ridge.position.y = roofBaseY + roofH - 0.02;
  g.add(ridge);

  // 山墙封檐板：沿两条斜边各贴一条，别让它戳出屋面
  {
    const edges = [
      { mx: -roofW / 4, dx: roofW / 2, dy: roofH },
      { mx: roofW / 4, dx: roofW / 2, dy: -roofH },
    ];
    for (const sz of [-1, 1]) {
      for (const e of edges) {
        const len = Math.hypot(e.dx, e.dy);
        const barge = box(len, 0.14, 0.12, M.timber);
        barge.position.set(e.mx, roofBaseY + roofH / 2, (sz * roofD) / 2);
        barge.rotation.z = Math.atan2(e.dy, e.dx);
        g.add(barge);
      }
    }
  }

  /* ---- 门 ---- */
  const door = box(1.05, 2.05, 0.13, M.wood);
  door.position.set(doorX, BASE + 1.02, D2 + 0.06);
  g.add(door);
  for (const sx of [-1, 1]) {
    const jamb = box(0.13, 2.12, 0.14, M.timber, false);
    jamb.position.set(doorX + sx * 0.59, BASE + 1.06, D2 + 0.07);
    g.add(jamb);
  }
  const lintel = box(1.35, 0.14, 0.16, M.timber, false);
  lintel.position.set(doorX, BASE + 2.14, D2 + 0.07);
  g.add(lintel);

  // 门旁的小窗
  const sideWin = box(0.66, 0.7, 0.1, M.window, false);
  sideWin.position.set(doorX < 0 ? w * 0.24 : -w * 0.24, BASE + h1 * 0.6, D2 + 0.05);
  g.add(sideWin);

  // 背面一层也来一扇
  const backWin = box(0.66, 0.7, 0.1, M.window, false);
  backWin.position.set(0, BASE + h1 * 0.6, -D2 - 0.05);
  g.add(backWin);

  /* ---- 烟囱 ---- */
  const chimH = roofH + 0.75;
  const chim = box(0.62, chimH, 0.62, M.stone);
  chim.position.set(w * 0.28, roofBaseY + chimH / 2 - 0.5, -d * 0.22);
  g.add(chim);
  const chimCap = box(0.78, 0.12, 0.78, M.stoneLight, false);
  chimCap.position.set(w * 0.28, roofBaseY + chimH - 0.5, -d * 0.22);
  g.add(chimCap);

  g.userData.chimney = new THREE.Vector3(w * 0.28, roofBaseY + chimH - 0.3, -d * 0.22);
  return g;
}

/* ============================================================
 *  酒馆：木筋楼 + 悬挂铁架招牌 + 门口长凳
 * ========================================================== */
export function makeTavern(M, opt = {}) {
  const W = 8.4;
  const D = 6.0;
  const JETTY = opt.jetty ?? 0.32;
  const g = makeTudorHouse(M, { w: W, d: D, h1: 2.9, h2: 2.4, roofH: 2.9, doorX: -1.6, ...opt });
  const D2 = D / 2;
  // 招牌要贴在**二层挑出后的**外墙面上，否则会被挑檐的墙吞进去
  const faceZ = D2 + JETTY + 0.05;

  // 招牌铁架：从挑出的外墙面**垂直伸向街面**，木板垂直于墙面悬挂，
  // 这样从街上一路走过来都能看见（平贴在墙上等于没有）
  const SIGN_OUT = 1.5; // 伸出长度
  const bracket = new THREE.Group();
  bracket.position.set(1.55, 4.35, faceZ);

  // 横臂：沿 +Z 伸出
  const arm = box(0.09, 0.09, SIGN_OUT, M.iron, false);
  arm.position.set(0, 0, SIGN_OUT / 2);
  bracket.add(arm);
  // 斜撑：从墙面下方斜上去托住横臂
  const diagLen = Math.hypot(0.72, 1.0);
  const diag = box(0.07, 0.07, diagLen, M.iron, false);
  diag.position.set(0, -0.36, 0.5);
  diag.rotation.x = -Math.atan2(0.72, 1.0);
  bracket.add(diag);
  // 墙上的固定铁片
  const plate = box(0.12, 0.72, 0.1, M.iron, false);
  plate.position.set(0, -0.34, 0.03);
  bracket.add(plate);

  // 木板：薄在 X、宽在 Z —— 面朝街道两侧
  const boardZ = SIGN_OUT - 0.18;
  const board = box(0.08, 0.78, 1.02, M.wood);
  board.position.set(0, -0.62, boardZ);
  bracket.add(board);
  for (const sx of [-1, 1]) {
    const rim = box(0.04, 0.9, 1.14, M.iron, false);
    rim.position.set(sx * 0.055, -0.62, boardZ);
    bracket.add(rim);
  }
  // 板上一个简单的酒杯纹样（正反两面各一个）
  for (const sx of [-1, 1]) {
    const cup = cyl(0.15, 0.11, 0.28, 8, M.goldMark, false);
    cup.rotation.x = Math.PI / 2; // 圆柱轴转成 X 向，正好贴合板面
    cup.position.set(sx * 0.06, -0.62, boardZ);
    bracket.add(cup);
  }
  // 吊环
  for (const sz of [-0.38, 0.38]) {
    const hook = box(0.04, 0.22, 0.04, M.iron, false);
    hook.position.set(0, -0.13, boardZ + sz);
    bracket.add(hook);
  }
  g.add(bracket);

  // 门口长凳
  for (const sx of [-1, 1]) {
    const bench = new THREE.Group();
    bench.position.set(sx * 2.6, 0, D2 + 0.9);
    const seat = box(2.0, 0.1, 0.42, M.wood);
    seat.position.y = 0.46;
    bench.add(seat);
    for (const bx of [-0.8, 0.8]) {
      const leg = box(0.1, 0.46, 0.34, M.timber);
      leg.position.set(bx, 0.23, 0);
      bench.add(leg);
    }
    g.add(bench);
  }

  // 门口当桌子用的木桶
  const barrel = cyl(0.4, 0.42, 0.85, 10, M.wood);
  barrel.position.set(0.2, 0.43, D2 + 1.4);
  g.add(barrel);
  const lid = cyl(0.36, 0.36, 0.06, 10, M.timber, false);
  lid.position.set(0.2, 0.88, D2 + 1.4);
  g.add(lid);

  return g;
}

/* ============================================================
 *  铁匠铺：半开敞石棚 + 炉膛 + 铁砧 + 淬火桶
 * ========================================================== */
export function makeSmithy(M, opt = {}) {
  const { w = 6.2, d = 5.0, h = 3.0 } = opt;
  const g = new THREE.Group();
  const W2 = w / 2;
  const D2 = d / 2;

  // 石砌地台
  const floor = box(w + 0.4, 0.24, d + 0.4, M.stone);
  floor.position.y = 0.12;
  g.add(floor);

  // 后墙 + 两侧墙（正面敞开）
  const back = box(w, h, 0.28, M.stucco);
  back.position.set(0, h / 2 + 0.24, -D2);
  g.add(back);
  for (const sx of [-1, 1]) {
    const side = box(0.28, h, d * 0.72, M.stucco);
    side.position.set(sx * W2, h / 2 + 0.24, -D2 + d * 0.36);
    g.add(side);
  }

  // 木构架
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(0.22, h + 0.4, 0.22, M.timber);
      post.position.set(sx * W2, (h + 0.4) / 2 + 0.24, sz * (D2 - 0.15));
      g.add(post);
    }
  }
  const frontBeam = box(w + 0.3, 0.22, 0.2, M.timber);
  frontBeam.position.set(0, h + 0.35, D2 - 0.15);
  g.add(frontBeam);
  const backBeam = box(w + 0.3, 0.2, 0.2, M.timber);
  backBeam.position.set(0, h + 0.3, -D2 + 0.15);
  g.add(backBeam);

  // 双坡屋顶：屋脊沿 X，出檐明显，从外面看是正经的房子而不是木箱
  {
    const ROOF_H = 1.55;
    const roofW = w + 1.2;
    const roofD = d + 1.0;
    const baseY = h + 0.52;
    const roof = gable(roofD, roofW, ROOF_H, M.tile);
    // gable 的坡向沿 Z 拉伸；这里要沿 X，转 90°
    roof.rotation.y = Math.PI / 2;
    roof.position.y = baseY;
    g.add(roof);

    const ridge = box(roofW + 0.1, 0.2, 0.28, M.timber);
    ridge.position.y = baseY + ROOF_H - 0.02;
    g.add(ridge);

    // 山墙三角补白（两端口），否则能透过屋顶看见里面
    for (const sx of [-1, 1]) {
      const tri = new THREE.Shape();
      tri.moveTo(-roofD / 2, 0);
      tri.lineTo(roofD / 2, 0);
      tri.lineTo(0, ROOF_H - 0.06);
      tri.closePath();
      const geo = new THREE.ExtrudeGeometry(tri, { depth: 0.16, bevelEnabled: false });
      geo.translate(0, 0, -0.08);
      const gableWall = new THREE.Mesh(geo, M.stucco);
      gableWall.rotation.y = Math.PI / 2;
      gableWall.position.set(sx * (w / 2), baseY, 0);
      gableWall.castShadow = true;
      g.add(gableWall);
    }

    // 后墙与侧墙补木筋（楼上是敞棚，楼下三面实墙，得有框架才像铁匠铺）
    for (const y of [h * 0.4, h * 0.82]) {
      for (const sx of [-1, 1]) {
        const band = box(0.1, 0.16, d * 0.76, M.timber);
        band.position.set(sx * (W2 + 0.06), y, -D2 + d * 0.36);
        g.add(band);
      }
      const backBand = box(w + 0.12, 0.16, 0.1, M.timber);
      backBand.position.set(0, y, -D2 - 0.06);
      g.add(backBand);
    }
    // 后墙的竖柱与斜撑
    for (let i = -1; i <= 1; i += 2) {
      const post = box(0.13, h - 0.16, 0.1, M.timber);
      post.position.set(i * w * 0.21, h / 2 + 0.24, -D2 - 0.06);
      g.add(post);

      const len = Math.hypot(w * 0.18, h * 0.34);
      const brace = box(0.11, len, 0.09, M.timber);
      brace.position.set(i * w * 0.34, h * 0.62, -D2 - 0.07);
      brace.rotation.z = i * Math.atan2(w * 0.18, h * 0.34);
      g.add(brace);
    }
    // 后墙的小窗（夜里亮）
    const backWin = box(0.5, 0.55, 0.1, M.window, false);
    backWin.position.set(0, h * 0.56, -D2 - 0.04);
    g.add(backWin);

    // 炉膛的砖烟囱从后坡穿出去
    const stack = box(0.7, 1.5, 0.7, M.stoneStrong);
    stack.position.set(-1.5, baseY + 0.9, -D2 + 1.0);
    g.add(stack);
    const stackCap = box(0.86, 0.12, 0.86, M.stoneLight, false);
    stackCap.position.set(-1.5, baseY + 1.66, -D2 + 1.0);
    g.add(stackCap);
  }

  /* ---- 炉膛（靠后墙） ---- */
  const hearth = new THREE.Group();
  hearth.position.set(-1.5, 0.24, -D2 + 1.0);

  for (const sx of [-1, 1]) {
    const pier = box(0.5, 1.5, 0.9, M.stoneStrong);
    pier.position.set(sx * 1.15, 0.75, 0);
    hearth.add(pier);
  }
  const hood = new THREE.Mesh(
    (() => {
      const s = new THREE.Shape();
      s.moveTo(-1.35, 0);
      s.lineTo(1.35, 0);
      s.lineTo(1.0, 1.15);
      s.lineTo(-1.0, 1.15);
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.95, bevelEnabled: false });
      geo.translate(0, 0, -0.475);
      return geo;
    })(),
    M.stoneStrong
  );
  hood.position.y = 1.5;
  hood.castShadow = true;
  hearth.add(hood);

  // 炉膛底部的煤，带自发光
  const coals = box(1.8, 0.16, 0.7, M.ember, false);
  coals.position.set(0, 0.34, 0.05);
  hearth.add(coals);

  const fire = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.5, 0.5),
    new THREE.MeshBasicMaterial({
      color: 0xff8a2a, transparent: true, opacity: 0.5, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  fire.position.set(0, 0.62, 0.05);
  fire.userData.keepSeparate = true;
  hearth.add(fire);

  g.add(hearth);

  /* ---- 铁砧 ---- */
  {
    const stump = cyl(0.36, 0.4, 0.62, 8, M.wood);
    stump.position.set(0.75, 0.24 + 0.31, 0.3);
    g.add(stump);

    const body = box(0.28, 0.26, 0.62, M.iron);
    body.position.set(0.75, 0.24 + 0.62 + 0.13, 0.3);
    g.add(body);
    const horn = box(0.42, 0.12, 0.16, M.iron);
    horn.position.set(0.75, 0.24 + 0.62 + 0.16, 0.58);
    g.add(horn);
    const foot = box(0.42, 0.1, 0.34, M.iron);
    foot.position.set(0.75, 0.24 + 0.62 + 0.03, 0.3);
    g.add(foot);
  }

  /* ---- 淬火桶 ---- */
  const quench = cyl(0.44, 0.4, 0.75, 12, M.wood);
  quench.position.set(1.9, 0.24 + 0.375, -1.0);
  g.add(quench);
  const water = cyl(0.36, 0.36, 0.04, 12, M.waterDark, false);
  water.position.set(1.9, 0.24 + 0.7, -1.0);
  g.add(water);

  /* ---- 墙上的工具 ---- */
  for (let i = 0; i < 4; i++) {
    const tool = box(0.06, 0.85 + (i % 2) * 0.2, 0.06, M.iron, false);
    tool.position.set(-0.9 + i * 0.42, 1.55, -D2 + 0.2);
    tool.rotation.z = 0.12 - i * 0.08;
    g.add(tool);
  }

  /* ---- 铁料 ---- */
  for (let i = 0; i < 5; i++) {
    const bar = box(0.75, 0.07, 0.11, M.iron, false);
    bar.position.set(2.35, 0.28 + i * 0.08, 0.9);
    bar.rotation.y = (i % 2) * 0.3 - 0.15;
    g.add(bar);
  }

  g.userData.forge = new THREE.Vector3(-1.5, 0.88, -D2 + 1.0);
  g.userData.anvil = new THREE.Vector3(0.75, 1.0, 0.3);
  return g;
}

/* ============================================================
 *  教堂 + 钟楼
 * ========================================================== */
export function makeChurch(M, opt = {}) {
  const {
    naveW = 8.0, naveD = 15.0, naveH = 5.4,
    towerS = 5.6, towerH = 14.5, spireH = 7.5,
  } = opt;

  const g = new THREE.Group();
  const BASE = 0.4;
  const W2 = naveW / 2;
  const D2 = naveD / 2;

  /* ---- 基座 ---- */
  const plinth = box(naveW + 0.5, BASE, naveD + 0.5, M.stoneStrong);
  plinth.position.set(0, BASE / 2, 0);
  g.add(plinth);

  const WT = 0.42;            // 墙厚
  const IN_W = W2 - WT;       // 堂内半宽
  const IN_D = D2 - WT;       // 堂内半深
  const DOOR_W = 2.2;
  const DOOR_H = 3.2;

  /* ---- 中殿：四面薄墙围出能看见的堂内空间（不再是实心盒子） ---- */
  for (const sx of [-1, 1]) {
    const wall = box(WT, naveH, naveD, M.stoneLight);
    wall.position.set(sx * (W2 - WT / 2), BASE + naveH / 2, 0);
    g.add(wall);
  }
  // 后墙（东端，紧邻钟楼）
  const backWall = box(naveW - WT * 2, naveH, WT, M.stoneLight);
  backWall.position.set(0, BASE + naveH / 2, -(D2 - WT / 2));
  g.add(backWall);
  // 前墙：两侧门垛 + 中间一段带半圆券口的门楣
  for (const sx of [-1, 1]) {
    const jambW = W2 - WT - DOOR_W / 2;
    const jamb = box(jambW, naveH, WT, M.stoneLight);
    jamb.position.set(sx * (DOOR_W / 2 + jambW / 2), BASE + naveH / 2, D2 - WT / 2);
    g.add(jamb);
  }
  {
    // 门楣：矩形挖掉一个半圆，做出真正的券洞
    const hdrY = DOOR_H;                   // 券脚高度（相对中殿底面）
    const hdrH = naveH - DOOR_H;
    const hs = new THREE.Shape();
    hs.moveTo(-DOOR_W / 2, 0);
    hs.lineTo(DOOR_W / 2, 0);
    hs.lineTo(DOOR_W / 2, hdrH);
    hs.lineTo(-DOOR_W / 2, hdrH);
    hs.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-DOOR_W / 2, 0);
    hole.absarc(0, 0, DOOR_W / 2, Math.PI, 0, true);
    hole.lineTo(-DOOR_W / 2, 0);
    hs.holes.push(hole);

    const hgeo = new THREE.ExtrudeGeometry(hs, { depth: WT, bevelEnabled: false });
    hgeo.translate(0, 0, -WT / 2);
    const header = new THREE.Mesh(hgeo, M.stoneLight);
    header.castShadow = true;
    header.receiveShadow = true;
    header.position.set(0, BASE + hdrY, D2 - WT / 2);
    g.add(header);
  }

  // 扶壁
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = -D2 + 1.8 + i * ((naveD - 3.6) / 3);
      const b = box(0.55, naveH * 0.82, 0.85, M.stoneStrong);
      b.position.set(sx * (W2 + 0.16), BASE + naveH * 0.41, z);
      g.add(b);
      const cap = box(0.7, 0.3, 1.0, M.stoneLight, false);
      cap.position.set(sx * (W2 + 0.16), BASE + naveH * 0.82, z);
      g.add(cap);
    }
  }

  // 中殿坡屋顶
  const naveRoof = gable(naveW + 0.9, naveD + 0.6, 3.3, M.slate);
  naveRoof.position.y = BASE + naveH;
  g.add(naveRoof);
  const naveRidge = box(0.34, 0.24, naveD + 0.7, M.slateDark, false);
  naveRidge.position.y = BASE + naveH + 3.28;
  g.add(naveRidge);

  /* ---- 侧墙上的高窗（彩窗，夜里透光） ---- */
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = -D2 + 3.4 + i * ((naveD - 6.8) / 2);
      // 窗套先放，窗片贴在更外面
      const surround = box(1.16, 2.9, 0.12, M.stoneStrong, false);
      surround.position.set(sx * (W2 + 0.04), BASE + naveH * 0.36 + 1.25, z);
      surround.rotation.y = sx * Math.PI / 2;
      g.add(surround);

      const win = archWindow(0.72, 2.0, M.stainedGlass);
      win.position.set(sx * (W2 + 0.12), BASE + naveH * 0.36, z);
      win.rotation.y = sx * Math.PI / 2;
      g.add(win);
    }
  }

  /* ---- 西端大门：门洞是透空的，只镶一圈石拱券 ---- */
  {
    // 券面石：贴着门楣外侧的半圆环，只做凸出 4 厘米的装饰
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(DOOR_W / 2 + 0.02, DOOR_W / 2 + 0.26, 22, 1, 0, Math.PI),
      M.stoneStrong
    );
    ring.position.set(0, BASE + DOOR_H, D2 + 0.045);
    ring.receiveShadow = true;
    g.add(ring);
    // 券脚的两块枕石
    for (const sx of [-1, 1]) {
      const imp = box(0.32, 0.24, 0.24, M.stoneStrong, false);
      imp.position.set(sx * (DOOR_W / 2 + 0.2), BASE + DOOR_H - 0.06, D2 + 0.06);
      g.add(imp);
    }
  }

  // 门扇做成向外半开的一扇，堂内才看得见光
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-DOOR_W / 2 + 0.05, BASE, D2 + 0.06);
  doorPivot.rotation.y = 1.15;   // 向内推开约 66°
  const doorLeaf = box(DOOR_W - 0.1, DOOR_H - 0.2, 0.1, M.wood);
  doorLeaf.position.set((DOOR_W - 0.1) / 2, (DOOR_H - 0.2) / 2, 0);
  doorPivot.add(doorLeaf);
  for (const y of [0.9, 2.3]) {
    const strap = box(DOOR_W - 0.3, 0.09, 0.05, M.iron, false);
    strap.position.set((DOOR_W - 0.1) / 2, y, 0.08);
    doorPivot.add(strap);
  }
  g.add(doorPivot);

  // 门楣上的铁铰链
  for (const y of [0.9, 2.3]) {
    const hinge = box(0.24, 0.12, 0.12, M.iron, false);
    hinge.position.set(-DOOR_W / 2 + 0.12, BASE + y, D2 + 0.12);
    g.add(hinge);
  }

  // 门前石阶
  for (let i = 0; i < 3; i++) {
    const step = box(3.4 - i * 0.3, 0.2, 0.5, M.stoneLight, false);
    step.position.set(0, 0.1 + i * 0.2, D2 + 1.0 - i * 0.45);
    g.add(step);
  }

  /* ---- 堂内 ---- */
  {
    const FLOOR_Y = BASE + 0.06;

    // 地面石板
    const floor = box(IN_W * 2, 0.12, IN_D * 2, M.stoneLight, false);
    floor.position.set(0, BASE + 0.0, 0);
    g.add(floor);

    // 两列石柱
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = IN_D - 3.0 - i * 3.9;
        const col = cyl(0.26, 0.3, naveH - 0.4, 8, M.stone);
        col.position.set(sx * (IN_W - 0.85), BASE + (naveH - 0.4) / 2, z);
        g.add(col);
        const cap = box(0.62, 0.16, 0.62, M.stoneLight, false);
        cap.position.set(sx * (IN_W - 0.85), BASE + naveH - 0.28, z);
        g.add(cap);
        const foot = box(0.66, 0.16, 0.66, M.stoneLight, false);
        foot.position.set(sx * (IN_W - 0.85), BASE + 0.06, z);
        g.add(foot);
      }
    }

    // 柱顶的拱肋（沿两侧连成一道）
    for (const sx of [-1, 1]) {
      const rib = box(0.16, 0.2, IN_D * 1.7, M.stoneLight, false);
      rib.position.set(sx * (IN_W - 0.85), BASE + naveH - 0.2, -D2 + 3.4);
      g.add(rib);
    }

    // 东端祭坛：三级台阶 + 石台 + 十字 + 两支蜡烛
    let ay = FLOOR_Y;
    for (const [w, h] of [[3.2, 0.2], [2.6, 0.2]]) {
      const st = box(w, h, 1.0, M.stoneLight, false);
      st.position.set(0, ay + h / 2, -IN_D + 1.35);
      g.add(st);
      ay += h;
    }
    const altar = box(2.2, 0.95, 0.82, M.stoneLight);
    altar.position.set(0, ay + 0.48, -IN_D + 1.35);
    g.add(altar);
    const altarTop = box(2.4, 0.12, 0.95, M.stoneLight, false);
    altarTop.position.set(0, ay + 1.0, -IN_D + 1.35);
    g.add(altarTop);
    const altarCloth = box(2.3, 0.4, 0.06, M.linen, false);
    altarCloth.position.set(0, ay + 0.72, -IN_D + 1.76);
    g.add(altarCloth);

    const crossV = box(0.1, 0.7, 0.08, M.goldMark, false);
    crossV.position.set(0, ay + 1.42, -IN_D + 1.35);
    g.add(crossV);
    const crossH = box(0.42, 0.09, 0.08, M.goldMark, false);
    crossH.position.set(0, ay + 1.52, -IN_D + 1.35);
    g.add(crossH);
    for (const sx of [-1, 1]) {
      const candle = cyl(0.05, 0.05, 0.34, 6, M.linen, false);
      candle.position.set(sx * 0.85, ay + 1.23, -IN_D + 1.35);
      g.add(candle);
    }

    // 长椅：两列，坐面 + 靠背 + 两端侧腿
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const z = IN_D - 4.6 - i * 2.0;
        const seat = box(2.1, 0.1, 0.46, M.wood);
        seat.position.set(sx * 1.72, FLOOR_Y + 0.44, z);
        g.add(seat);
        // 靠背在 +Z 侧——人面朝东端的祭坛坐
        const back = box(2.1, 0.5, 0.08, M.wood);
        back.position.set(sx * 1.72, FLOOR_Y + 0.72, z + 0.24);
        g.add(back);
        for (const ex of [-1, 1]) {
          const leg = box(0.1, 0.44, 0.42, M.timber);
          leg.position.set(sx * 1.72 + ex * 0.95, FLOOR_Y + 0.22, z);
          g.add(leg);
        }
      }
    }

    // 吊灯：两支从梁上垂下来的铁环烛台（夜里是堂内唯一光源）
    for (const z of [IN_D - 5.2, -IN_D + 4.4]) {
      const chain = cyl(0.015, 0.015, 1.5, 4, M.iron, false);
      chain.position.set(0, BASE + naveH - 0.75, z);
      g.add(chain);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.44, 0.045, 6, 12), M.iron
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, BASE + naveH - 1.5, z);
      ring.castShadow = true;
      g.add(ring);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const candle = cyl(0.045, 0.045, 0.24, 6, M.linen, false);
        candle.position.set(Math.cos(a) * 0.44, BASE + naveH - 1.38, z + Math.sin(a) * 0.44);
        g.add(candle);
      }
      const glow = box(0.22, 0.05, 0.22, M.lanternGlass, false);
      glow.position.set(0, BASE + naveH - 1.44, z);
      glow.userData.keepSeparate = true;   // 留给灯光点，别被合并掉
      g.add(glow);
      (g.userData.interiorLamps ??= []).push(new THREE.Vector3(0, BASE + naveH - 1.42, z));
    }
  }

  /* ---- 钟楼（东端） ---- */
  const tz = -D2 - towerS / 2 + 0.6;
  const tower = new THREE.Group();
  tower.position.set(0, 0, tz);

  const tBase = box(towerS + 0.5, BASE, towerS + 0.5, M.stoneStrong);
  tBase.position.y = BASE / 2;
  tower.add(tBase);

  const body = box(towerS, towerH, towerS, M.stoneLight);
  body.position.y = BASE + towerH / 2;
  tower.add(body);

  // 束带层
  for (const y of [towerH * 0.33, towerH * 0.66]) {
    const band = box(towerS + 0.3, 0.28, towerS + 0.3, M.stoneStrong, false);
    band.position.y = BASE + y;
    tower.add(band);
  }

  // 钟室：四面的大开口
  const belfryY = BASE + towerH * 0.8;
  for (const [fx, fz, ry] of [[0, 1, 0], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, -1, Math.PI]]) {
    const opening = box(1.9, 2.5, 0.22, M.dark, false);
    opening.position.set(fx * (towerS / 2), belfryY, fz * (towerS / 2));
    opening.rotation.y = ry;
    tower.add(opening);

    const lintelStone = box(2.4, 0.3, 0.34, M.stoneStrong, false);
    lintelStone.position.set(fx * (towerS / 2), belfryY + 1.4, fz * (towerS / 2));
    lintelStone.rotation.y = ry;
    tower.add(lintelStone);

    const sillStone = box(2.4, 0.26, 0.4, M.stoneStrong, false);
    sillStone.position.set(fx * (towerS / 2), belfryY - 1.35, fz * (towerS / 2));
    sillStone.rotation.y = ry;
    tower.add(sillStone);
  }

  // 钟：整点报时会绕横轭轻轻摆动
  const bellPivot = new THREE.Group();
  bellPivot.position.set(0, belfryY + 0.62, 0);
  tower.add(bellPivot);

  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.62, 0.85, 10, 1, true),
    M.bronze
  );
  bell.position.set(0, -0.58, 0);
  bell.userData.keepSeparate = true;   // 要跟着钟声摆动，别被合并掉
  bellPivot.add(bell);

  const bellYoke = box(0.95, 0.16, 0.16, M.timber, false);
  bellYoke.position.set(0, 0, 0);
  bellYoke.userData.keepSeparate = true;
  bellPivot.add(bellYoke);

  (g.userData.bells ??= []).push(bellPivot);
  // 四面钟室开口的外侧位置：报时的时候往这儿各放一团暖光
  g.userData.belfryGlow = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([fx, fz]) =>
    new THREE.Vector3(fx * (towerS / 2 + 0.15), belfryY, fz * (towerS / 2 + 0.15) + tz)
  );

  // 钟楼顶部的雉堞
  const deck = box(towerS + 0.9, 0.34, towerS + 0.9, M.stoneStrong);
  deck.position.y = BASE + towerH + 0.17;
  tower.add(deck);

  const half = (towerS + 0.9) / 2 - 0.5;
  for (const sz of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const m = box(1.0, 1.0, 0.6, M.stoneLight);
      m.position.set(i * half, BASE + towerH + 0.84, sz * half);
      tower.add(m);
    }
  }
  for (const sx of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const m = box(0.6, 1.0, 1.0, M.stoneLight);
      m.position.set(sx * half, BASE + towerH + 0.84, i * half);
      tower.add(m);
    }
  }

  // 尖顶（四棱锥）
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(towerS * 0.62, spireH, 4),
    M.slate
  );
  spire.position.y = BASE + towerH + 1.3 + spireH / 2;
  spire.rotation.y = Math.PI / 4;
  spire.castShadow = true;
  tower.add(spire);

  // 塔尖的十字
  const finialPole = cyl(0.05, 0.05, 1.6, 5, M.iron, false);
  finialPole.position.y = BASE + towerH + 1.3 + spireH + 0.6;
  tower.add(finialPole);
  const finialBar = box(0.5, 0.08, 0.08, M.iron, false);
  finialBar.position.y = BASE + towerH + 1.3 + spireH + 0.95;
  tower.add(finialBar);

  g.add(tower);

  /* ---- 墓园：矮石墙围出的一片坟地，开一道小门 ---- */
  const YARD_X0 = -W2 - 9.2;   // 墓园贴在中殿北侧（本地 -X）
  const YARD_X1 = -W2 - 0.6;
  const YARD_Z0 = -D2 - 1.0;
  const YARD_Z1 = D2 + 2.4;
  const YARD_CX = (YARD_X0 + YARD_X1) / 2;
  const YARD_CZ = (YARD_Z0 + YARD_Z1) / 2;

  const graves = new THREE.Group();

  // 地面：比草地略深的土色，草皮被踩秃了
  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(YARD_X1 - YARD_X0, YARD_Z1 - YARD_Z0),
    M.soilBorder
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(YARD_CX, 0.03, YARD_CZ);
  yard.receiveShadow = true;
  graves.add(yard);

  // 矮石墙（东、西、北三面；南面留门）
  const WALL_H2 = 0.72;
  for (const sx of [-1, 1]) {
    const w = box(0.34, WALL_H2, YARD_Z1 - YARD_Z0, M.stoneStrong);
    w.position.set(sx < 0 ? YARD_X0 : YARD_X1, WALL_H2 / 2, YARD_CZ);
    graves.add(w);
    const cap = box(0.46, 0.12, YARD_Z1 - YARD_Z0, M.stoneLight, false);
    cap.position.set(sx < 0 ? YARD_X0 : YARD_X1, WALL_H2 + 0.06, YARD_CZ);
    graves.add(cap);
  }
  // 北墙分两段，中间留 1.8 米宽的门
  const GW = 1.8;
  const segW = (YARD_X1 - YARD_X0 - GW) / 2;
  for (const sx of [-1, 1]) {
    const cx = sx < 0
      ? YARD_X1 - GW / 2 - segW / 2
      : YARD_X0 + GW / 2 + segW / 2;
    const w = box(segW, WALL_H2, 0.34, M.stoneStrong);
    w.position.set(cx, WALL_H2 / 2, YARD_Z1);
    graves.add(w);
    const cap = box(segW, 0.12, 0.46, M.stoneLight, false);
    cap.position.set(cx, WALL_H2 + 0.06, YARD_Z1);
    graves.add(cap);
    // 门柱
    const postX = YARD_CX + sx * (GW / 2 + 0.2);
    const post = box(0.4, 1.25, 0.4, M.stoneStrong);
    post.position.set(postX, 0.62, YARD_Z1);
    graves.add(post);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6), M.stoneLight);
    ball.position.set(postX, 1.34, YARD_Z1);
    ball.castShadow = true;
    graves.add(ball);
  }
  // 半开的铁门扇
  for (const sx of [-1, 1]) {
    const leaf = box(GW / 2 - 0.06, 0.86, 0.06, M.iron);
    leaf.position.set(YARD_CX + sx * (GW / 4), 0.62, YARD_Z1 + 0.14);
    leaf.rotation.y = sx * 0.45;
    graves.add(leaf);
  }

  // 墓碑：直立碑 + 卧碑 + 一处小十字，行列松散地排
  const GRAVE_ROWS = [
    [-3, 6], [-2, 7], [-1, 6],
    [0, 5], [1, 6], [2, 4],
  ];
  let gi = 0;
  for (let r = 0; r < GRAVE_ROWS.length; r++) {
    const [colStart, n] = GRAVE_ROWS[r];
    for (let c = 0; c < n; c++) {
      const gx = YARD_CX + (colStart + c) * 1.25 + (Math.random() - 0.5) * 0.3;
      const gz = YARD_Z0 + 1.6 + r * 2.35 + (Math.random() - 0.5) * 0.35;
      if (gz > YARD_Z1 - 1.2) continue;

      const kind = gi % 5;
      if (kind === 3) {
        // 卧碑
        const slab = box(0.78, 0.16, 1.35, M.stone, false);
        slab.position.set(gx, 0.09, gz);
        slab.rotation.y = (Math.random() - 0.5) * 0.18;
        graves.add(slab);
      } else {
        const h = 0.78 + (gi % 4) * 0.14;
        const slab = box(0.62, h, 0.13, M.stone, false);
        slab.position.set(gx, h / 2, gz);
        slab.rotation.z = ((gi % 5) - 2) * 0.055;
        slab.rotation.y = ((gi % 4) - 1.5) * 0.13;
        graves.add(slab);
        // 碑顶的小圆头（圆柱轴转到 X 向，正好横贴在碑顶）
        const top = cyl(0.31, 0.31, 0.13, 8, M.stone, false);
        top.rotation.z = Math.PI / 2;
        top.position.set(gx, h, gz);
        graves.add(top);
        // 碑前的一小片碎石
        const dirt = box(0.8, 0.05, 0.5, M.soilBorder, false);
        dirt.position.set(gx, 0.05, gz + 0.5);
        graves.add(dirt);
      }
      gi++;
    }
  }

  // 角落里一座小十字碑
  {
    const base = box(0.6, 0.22, 0.6, M.stoneStrong, false);
    base.position.set(YARD_X1 - 1.1, 0.11, YARD_Z0 + 1.4);
    graves.add(base);
    const p = box(0.14, 1.65, 0.14, M.stone, false);
    p.position.set(YARD_X1 - 1.1, 1.05, YARD_Z0 + 1.4);
    graves.add(p);
    const bar = box(0.72, 0.14, 0.14, M.stone, false);
    bar.position.set(YARD_X1 - 1.1, 1.48, YARD_Z0 + 1.4);
    graves.add(bar);
  }

  // 一棵紫杉（英国墓园标配，常青＝永生）
  {
    const yx = YARD_X0 + 1.15, yz = YARD_Z0 + 6.2;
    const tr = cyl(0.22, 0.32, 2.2, 7, M.timber);
    tr.position.set(yx, 1.1, yz);
    graves.add(tr);
    for (let i = 0; i < 3; i++) {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(1.55 - i * 0.36, 1.9, 7),
        M.yewGreen ?? M.stone
      );
      crown.position.set(yx, 2.5 + i * 1.15, yz);
      crown.castShadow = true;
      graves.add(crown);
    }
  }

  g.add(graves);

  g.userData.spireTop = BASE + towerH + 1.3 + spireH;
  g.userData.yard = { x: YARD_CX, z: YARD_CZ, x0: YARD_X0, x1: YARD_X1, z0: YARD_Z0, z1: YARD_Z1 };
  return g;
}

/* ============================================================
 *  街边小品
 * ========================================================== */

/** 靠墙的板条箱和木桶 */
export function makeTownClutter(M) {
  const g = new THREE.Group();

  for (const [x, z, s] of [[0, 0, 0.66], [0.8, 0.35, 0.5], [-0.75, 0.4, 0.44]]) {
    const crate = box(s, s, s, M.wood);
    crate.position.set(x, s / 2, z);
    crate.rotation.y = ((x + z) * 3) % 0.7;
    g.add(crate);
  }
  for (const [x, z] of [[1.7, -0.3], [2.3, 0.5]]) {
    const barrel = cyl(0.34, 0.36, 0.84, 10, M.wood);
    barrel.position.set(x, 0.42, z);
    g.add(barrel);
    const hoop = cyl(0.365, 0.365, 0.06, 10, M.iron, false);
    hoop.position.set(x, 0.62, z);
    g.add(hoop);
  }
  return g;
}

/** 路灯柱：铁艺弯臂 + 灯笼（夜里点亮） */
export function makeLantern(M) {
  const g = new THREE.Group();

  const base = cyl(0.24, 0.3, 0.22, 8, M.stoneLight);
  base.position.y = 0.11;
  g.add(base);

  const post = cyl(0.09, 0.12, 3.4, 8, M.iron);
  post.position.y = 1.8;
  g.add(post);

  const arm = box(0.72, 0.08, 0.08, M.iron, false);
  arm.position.set(0.34, 3.46, 0);
  g.add(arm);

  // 灯笼：四根立柱 + 上下框，玻璃在中间才看得见
  const cx = 0.66;
  const cy = 3.16;
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      const bar = box(0.05, 0.52, 0.05, M.iron, false);
      bar.position.set(cx + dx * 0.16, cy, dz * 0.16);
      g.add(bar);
    }
  }

  const glass = box(0.28, 0.44, 0.28, M.lanternGlass, false);
  glass.position.set(cx, cy, 0);
  g.add(glass);

  const cap = box(0.46, 0.1, 0.46, M.iron, false);
  cap.position.set(cx, cy + 0.3, 0);
  g.add(cap);
  const foot = box(0.4, 0.08, 0.4, M.iron, false);
  foot.position.set(cx, cy - 0.3, 0);
  g.add(foot);

  g.userData.lantern = new THREE.Vector3(cx, cy, 0);
  return g;
}

/** 广场边的矮石凳 */
export function makeBench(M, len = 2.2) {
  const g = new THREE.Group();

  const seat = box(len, 0.16, 0.44, M.stoneLight);
  seat.position.y = 0.46;
  g.add(seat);
  for (const sx of [-1, 1]) {
    const leg = box(0.26, 0.46, 0.36, M.stone);
    leg.position.set(sx * (len / 2 - 0.3), 0.23, 0);
    g.add(leg);
  }
  return g;
}

/** 晾衣绳（两柱之间挂着几块布） */
export function makeWashLine(M, len = 4.0) {
  const g = new THREE.Group();

  for (const sx of [-1, 1]) {
    const post = cyl(0.07, 0.09, 2.2, 6, M.wood);
    post.position.set(sx * len / 2, 1.1, 0);
    g.add(post);
  }
  const line = cyl(0.02, 0.02, len, 4, M.rope, false);
  line.rotation.z = Math.PI / 2;
  line.position.y = 2.08;
  g.add(line);

  const cloths = [];
  for (let i = 0; i < 4; i++) {
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.95), M.linen);
    cloth.position.set(-len / 2 + 0.9 + i * 1.05, 1.58, 0);
    g.add(cloth);
    cloths.push(cloth);
  }

  return g;
}
