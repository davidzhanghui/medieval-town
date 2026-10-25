/**
 * inn_outskirts2.js —— 客栈再向外的一圈（第二圈）
 *
 * 第一圈是驿道上的日常（渡口、神龛、营地、货栈、荒村），
 * 这一圈是驿道尽头的东西：收过路钱的关卡、望得见来路的瞭望塔、
 * 招待朝圣者的病舍、一家人在路边开的磨坊，以及赶路人最后的落脚处——绞架。
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

/** 同上，但屋脊沿 Z 方向：span 是跨在 X 上的宽，len 是沿 Z 的脊长 */
function ridgeRoofZ(span, len, h, mat) {
  return gable(span, len, h, mat);
}

const CLOTH = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide });
const GRASS = new THREE.MeshStandardMaterial({ color: 0x7f9a58, roughness: 1 });

/** 沿折线生成一条带状水面 */
function ribbon(pts, width, y, mat) {
  const verts = [], uvs = [], idx = [];
  const half = width / 2;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0], dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len, nz = dx / len;
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
 *  1. 收税关卡：路被一道横杆拦住
 * ========================================================== */
export function makeTollGate(M) {
  const g = new THREE.Group();

  /* ---- 路面：穿过关卡的一段夯土路 ---- */
  {
    const road = box(7.0, 0.06, 34, solid(0xc0ac86, { roughness: 1 }), false);
    road.position.y = 0.03;
    road.receiveShadow = true;
    g.add(road);
    // 两道车辙
    for (const x of [-1.1, 1.1]) {
      const rut = box(0.42, 0.03, 34, solid(0xa08c66, { roughness: 1 }), false);
      rut.position.set(x, 0.07, 0);
      g.add(rut);
    }
  }

  /* ---- 岗亭：路西侧一间小石屋 ---- */
  {
    const W = 3.4, D = 3.2, H = 2.8;
    const wx = -5.2;
    const wall = box(W, H, D, M.stone);
    wall.position.set(wx, H / 2, 0);
    g.add(wall);
    const roof = ridgeRoof(W + 0.8, D + 0.9, 1.3, M.slateDark);
    roof.position.set(wx, H, 0);
    g.add(roof);

    // 朝路的一面开窗，装一块能推开的木板
    const win = box(0.16, 0.9, 1.1, M.window, false);
    win.position.set(wx + W / 2 + 0.02, 1.7, 0);
    win.userData.keepSeparate = true;
    g.add(win);
    const shutter = box(0.08, 1.0, 1.2, M.woodDark, false);
    shutter.position.set(wx + W / 2 + 0.18, 1.72, 0.72);
    shutter.rotation.y = 0.5;
    g.add(shutter);

    // 门在南侧
    const door = box(1.0, 2.0, 0.14, M.woodDark);
    door.position.set(wx, 1.0, D / 2 + 0.02);
    g.add(door);

    // 屋顶探出的小烟囱
    const chim = box(0.6, 1.6, 0.6, M.stoneLight);
    chim.position.set(wx - 0.8, H + 1.1, -0.8);
    g.add(chim);
  }

  /* ---- 横杆：一根可以抬起的木杆，配重块在短的一端 ---- */
  {
    const PZ = 0;
    // 立轴
    const pivot = cyl(0.18, 0.22, 2.0, 8, M.woodDark);
    pivot.position.set(-2.6, 1.0, PZ);
    g.add(pivot);

    const bar = new THREE.Group();
    bar.position.set(-2.6, 1.85, PZ);
    bar.userData.isTollBar = true;

    const arm = box(9.4, 0.2, 0.2, M.woodDark);
    arm.position.set(4.7, 0, 0);   // 从轴往东伸出
    bar.add(arm);
    // 红白相间的漆：几段包布
    for (let i = 0; i < 5; i++) {
      const band = box(0.9, 0.24, 0.24, solid(i % 2 ? 0xe0d8c4 : 0xa8452f, { roughness: 1 }), false);
      band.position.set(1.4 + i * 1.8, 0, 0);
      bar.add(band);
    }
    // 配重
    const weight = box(0.7, 0.9, 0.7, M.stoneStrong);
    weight.position.set(-0.7, -0.5, 0);
    bar.add(weight);

    g.add(bar);
  }

  /* ---- 路东侧的矮石墩：横杆落下来时搭在上面 ---- */
  {
    const rest = box(0.7, 1.9, 0.7, M.stoneStrong);
    rest.position.set(6.5, 0.95, 0);
    g.add(rest);
    const cap = box(0.9, 0.16, 0.9, M.stoneLight);
    cap.position.set(6.5, 1.98, 0);
    g.add(cap);
    // 杆子落下时贴着的凹槽
    const notch = box(0.24, 0.14, 0.5, solid(0x3a342a, { roughness: 1 }), false);
    notch.position.set(6.5, 1.88, 0);
    g.add(notch);
  }

  /* ---- 收费牌：钉在杆子上的木板，写明价目 ---- */
  {
    const board = box(0.9, 1.3, 0.08, M.woodDark);
    board.position.set(-4.9, 3.4, 0.3);
    board.rotation.y = Math.PI / 2;
    g.add(board);
    // 牌上的字：几道横线代替
    for (let i = 0; i < 4; i++) {
      const line = box(0.02, 0.06, 0.6, solid(0xe0d8c4, { roughness: 1 }), false);
      line.position.set(-4.86, 3.72 - i * 0.24, 0.3);
      g.add(line);
    }
    // 牌子挂在两根立柱之间
    for (const z of [-0.6, 0.6]) {
      const post = cyl(0.08, 0.1, 4.0, 6, M.wood);
      post.position.set(-4.9, 2.0, z + 0.3);
      g.add(post);
    }
  }

  /* ---- 路边的小堆：等着过关的货包 ---- */
  {
    for (const [x, z] of [[4.2, 3.4], [4.8, 4.1], [4.4, 3.8]]) {
      const sack = box(0.7, 0.42, 0.52, CLOTH(0xcbbd9c));
      sack.position.set(x, 0.21 + (x === 4.4 ? 0.42 : 0), z);
      sack.rotation.y = Math.random() * 0.4;
      g.add(sack);
    }
  }

  return g;
}

/* ============================================================
 *  2. 瞭望塔：木构方塔，从顶上能看见来路
 * ========================================================== */
export function makeWatchtower(M) {
  const g = new THREE.Group();
  const BASE = 3.4, TOP = 3.0, H = 9.5;

  /* ---- 塔基：一圈石台 ---- */
  {
    const plinth = box(BASE * 2 + 1.6, 0.7, BASE * 2 + 1.6, M.stone);
    plinth.position.y = 0.35;
    g.add(plinth);
    const step = box(BASE * 2 + 3.0, 0.3, BASE * 2 + 3.0, M.stoneLight);
    step.position.y = 0.15;
    g.add(step);
  }

  /* ---- 四根主柱：下粗上细，略微向内收 ---- */
  {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = cyl(0.2, 0.3, H, 8, M.wood);
        post.position.set(sx * BASE * 0.72, H / 2 + 0.7, sz * BASE * 0.72);
        g.add(post);
      }
    }
    // 交叉斜撑：每一面两道
    for (const sz of [-1, 1]) {
      for (const y of [2.6, 5.4]) {
        for (const dir of [-1, 1]) {
          const brace = box(0.16, 3.6, 0.16, M.woodDark, false);
          brace.position.set(0, y, sz * BASE * 0.72);
          brace.rotation.z = dir * 0.72;
          g.add(brace);
        }
      }
    }
    for (const sx of [-1, 1]) {
      for (const y of [2.6, 5.4]) {
        for (const dir of [-1, 1]) {
          const brace = box(0.16, 3.6, 0.16, M.woodDark, false);
          brace.position.set(sx * BASE * 0.72, y, 0);
          brace.rotation.x = dir * 0.72;
          g.add(brace);
        }
      }
    }
    // 水平箍
    for (const y of [1.4, 3.6, 6.2, H + 0.5]) {
      for (const sz of [-1, 1]) {
        const ring = box(BASE * 1.5, 0.18, 0.18, M.woodDark, false);
        ring.position.set(0, y, sz * BASE * 0.72);
        g.add(ring);
      }
      for (const sx of [-1, 1]) {
        const ring = box(0.18, 0.18, BASE * 1.5, M.woodDark, false);
        ring.position.set(sx * BASE * 0.72, y, 0);
        g.add(ring);
      }
    }
  }

  /* ---- 塔顶平台 + 栏杆 + 四坡顶 ---- */
  {
    const deck = box(TOP * 2 + 1.2, 0.28, TOP * 2 + 1.2, M.woodDark);
    deck.position.y = H + 0.8;
    deck.castShadow = true;
    g.add(deck);

    // 栏杆
    const railY = H + 1.55;
    for (const sz of [-1, 1]) {
      const r = box(TOP * 2 + 1.2, 0.12, 0.12, M.wood);
      r.position.set(0, railY, sz * (TOP + 0.5));
      g.add(r);
      for (let i = -3; i <= 3; i++) {
        const p = box(0.1, 0.6, 0.1, M.wood, false);
        p.position.set(i * 0.95, railY - 0.36, sz * (TOP + 0.5));
        g.add(p);
      }
    }
    for (const sx of [-1, 1]) {
      const r = box(0.12, 0.12, TOP * 2 + 1.2, M.wood);
      r.position.set(sx * (TOP + 0.5), railY, 0);
      g.add(r);
      for (let i = -3; i <= 3; i++) {
        const p = box(0.1, 0.6, 0.1, M.wood, false);
        p.position.set(sx * (TOP + 0.5), railY - 0.36, i * 0.95);
        g.add(p);
      }
    }

    // 四坡顶：用四棱锥
    const roof = new THREE.Mesh(new THREE.ConeGeometry(TOP * 1.55, 2.4, 4), M.thatch);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = H + 3.5;
    roof.castShadow = true;
    g.add(roof);
    // 顶尖
    const finial = cyl(0.05, 0.05, 1.0, 5, M.iron, false);
    finial.position.y = H + 5.1;
    g.add(finial);

    // 屋檐下的斜撑（托住四角）
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const b = box(0.14, 1.1, 0.14, M.wood);
        b.position.set(sx * (TOP + 0.1), H + 2.4, sz * (TOP + 0.1));
        b.rotation.z = sx * 0.42;
        b.rotation.x = -sz * 0.42;
        g.add(b);
      }
    }
  }

  /* ---- 梯子：从地面斜靠在塔身南侧，顶端搭到平台边 ---- */
  {
    // 倾角约 11°：底端站在 z = 4.4 的地面上，顶端爬到平台面（y ≈ 10.3）
    const LEN = 10.6, TILT = 0.19;
    const LAD = new THREE.Group();
    LAD.position.set(0, 0, 4.4);
    LAD.rotation.x = -TILT;

    for (const dx of [-0.36, 0.36]) {
      const rail = box(0.1, LEN, 0.1, M.wood);
      rail.position.set(dx, LEN / 2, 0);
      LAD.add(rail);
    }
    for (let i = 0; i < 16; i++) {
      const rung = box(0.8, 0.07, 0.07, M.woodDark, false);
      rung.position.set(0, 0.55 + i * 0.64, 0);
      LAD.add(rung);
    }
    g.add(LAD);

    // 底端压的两块石头
    for (const dx of [-0.5, 0.5]) {
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), M.stoneStrong);
      st.position.set(dx, 0.16, 4.55);
      st.castShadow = true;
      g.add(st);
    }
  }

  /* ---- 塔顶的信号火盆 ---- */
  {
    const brazier = cyl(0.5, 0.34, 0.5, 10, M.iron);
    brazier.position.set(TOP - 0.6, H + 1.4, TOP - 0.6);
    g.add(brazier);
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
      const leg = box(0.07, 0.5, 0.07, M.iron, false);
      leg.position.set(TOP - 0.6 + dx, H + 1.0, TOP - 0.6 + dz);
      g.add(leg);
    }
    const coals = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 8, 6),
      M.ember
    );
    coals.scale.y = 0.5;
    coals.position.set(TOP - 0.6, H + 1.66, TOP - 0.6);
    g.add(coals);
  }

  /* ---- 塔下的小堆：柴垛与一只水桶 ---- */
  {
    for (let i = 0; i < 6; i++) {
      const log = cyl(0.14, 0.14, 1.5, 6, M.wood);
      log.rotation.z = Math.PI / 2;
      log.position.set(-4.6 + (i % 3) * 0.34, 0.16 + Math.floor(i / 3) * 0.3, 2.4);
      g.add(log);
    }
    const bucket = cyl(0.26, 0.22, 0.56, 10, M.wood);
    bucket.position.set(3.2, 0.28, 2.6);
    g.add(bucket);
  }

  return g;
}

/* ============================================================
 *  3. 朝圣者病舍：给走不动的人躺一晚的地方
 * ========================================================== */
export function makePilgrimHospital(M) {
  const g = new THREE.Group();
  const W = 7.4, D = 15.0, H = 4.2;

  /* ---- 石台基 ---- */
  {
    const base = box(W + 1.4, 0.5, D + 1.4, M.stoneLight);
    base.position.y = 0.25;
    g.add(base);
  }

  /* ---- 大厅：石墙 + 木构山墙 + 高坡顶 ---- */
  {
    const wall = box(W, H, D, M.stone);
    wall.position.y = 0.5 + H / 2;
    g.add(wall);

    // 两端山墙
    for (const sz of [-1, 1]) {
      const end = gable(W, 0.5, 2.4, M.stoneLight);
      end.position.set(0, 0.5 + H, sz * D / 2);
      g.add(end);
    }

    // 大厅长轴在 Z 上，屋脊也跟着走 Z（两端山墙正对着它）
    const roof = ridgeRoofZ(W + 1.0, D + 1.2, 2.4, M.thatch);
    roof.position.set(0, 0.5 + H, 0);
    g.add(roof);

    // 檐下的木托
    for (let i = 0; i < 7; i++) {
      const z = -D / 2 + 1.2 + i * (D - 2.4) / 6;
      for (const sx of [-1, 1]) {
        const b = box(0.72, 0.14, 0.14, M.timber, false);
        b.position.set(sx * (W / 2 + 0.3), 0.5 + H - 0.1, z);
        g.add(b);
      }
    }

    // 正面（西侧）的门与两扇窗
    const door = box(0.16, 2.3, 1.5, M.woodDark);
    door.position.set(-W / 2 - 0.04, 0.5 + 1.15, 0);
    g.add(door);
    for (const z of [-4.4, 4.4]) {
      const win = box(0.14, 1.2, 0.7, M.window, false);
      win.position.set(-W / 2 - 0.04, 0.5 + 2.1, z);
      win.userData.keepSeparate = true;
      g.add(win);
      // 尖券的石框
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.12, 4, 12, Math.PI), M.stoneLight);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(-W / 2 - 0.06, 0.5 + 2.7, z);
      g.add(arch);
    }

    // 门上方的十字
    const crossV = box(0.12, 0.8, 0.12, M.stoneStrong, false);
    crossV.position.set(-W / 2 - 0.06, 0.5 + 3.2, 0);
    g.add(crossV);
    const crossH = box(0.5, 0.12, 0.12, M.stoneStrong, false);
    crossH.position.set(-W / 2 - 0.06, 0.5 + 3.34, 0);
    g.add(crossH);
  }

  /* ---- 屋内：一排草铺 + 隔帘 ---- */
  {
    for (let i = 0; i < 6; i++) {
      const z = -D / 2 + 2.2 + i * 2.2;
      for (const sx of [-1, 1]) {
        // 草垫
        const mat = box(1.5, 0.24, 1.6, M.straw, false);
        mat.position.set(sx * 1.6, 0.62, z);
        g.add(mat);
        // 木床架
        const frame = box(1.7, 0.14, 1.8, M.wood, false);
        frame.position.set(sx * 1.6, 0.52, z);
        g.add(frame);
      }
      // 两排之间的帘子：从顶上垂下的布
      if (i % 2 === 0) {
        const curtain = box(3.2, 2.0, 0.04, CLOTH(0xb8ae96), false);
        curtain.position.set(0, 2.0, z + 1.1);
        g.add(curtain);
      }
    }
  }

  /* ---- 门口的一张长凳与两副拐杖 ---- */
  {
    const bench = box(0.6, 0.14, 3.4, M.woodDark);
    bench.position.set(-W / 2 - 1.2, 0.48, 0);
    g.add(bench);
    for (const z of [-1.4, 1.4]) {
      const leg = box(0.5, 0.44, 0.5, M.wood);
      leg.position.set(-W / 2 - 1.2, 0.22, z);
      g.add(leg);
    }
    // 拐杖：靠在墙上
    for (const z of [-0.5, 0.4]) {
      const crutch = cyl(0.04, 0.05, 2.0, 5, M.wood, false);
      crutch.position.set(-W / 2 - 0.4, 1.0, z);
      crutch.rotation.z = -0.14;
      g.add(crutch);
      const pad = box(0.3, 0.1, 0.12, M.wood, false);
      pad.position.set(-W / 2 - 0.55, 1.98, z);
      g.add(pad);
    }
  }

  /* ---- 屋后的药草畦 ---- */
  {
    for (let r = 0; r < 3; r++) {
      const bed = box(2.0, 0.18, 8.0, M.soilBorder);
      bed.position.set(W / 2 + 2.0, 0.09, 0);
      bed.position.x = W / 2 + 1.6 + r * 2.4;
      g.add(bed);
      for (let i = 0; i < 22; i++) {
        const herb = new THREE.Mesh(
          new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 5, 4),
          solid(Math.random() < 0.5 ? 0x5f8a52 : 0x7fa64e, { roughness: 1, flatShading: true })
        );
        herb.position.set(W / 2 + 1.6 + r * 2.4 + (Math.random() - 0.5) * 1.4, 0.28,
          -3.6 + Math.random() * 7.2);
        herb.castShadow = true;
        g.add(herb);
      }
    }
  }

  /* ---- 一口小井 ---- */
  {
    const WX = -W / 2 - 3.2, WZ = D / 2 - 1.4;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.9, 14, 1, true), M.stone);
    ring.position.set(WX, 0.45, WZ);
    ring.castShadow = true;
    g.add(ring);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 4, 14), M.stoneLight);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(WX, 0.9, WZ);
    g.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.72, 14), M.waterDark);
    water.rotation.x = -Math.PI / 2;
    water.position.set(WX, 0.5, WZ);
    g.add(water);
    // 两根立柱与一根横梁，挂着绳子
    for (const dz of [-0.8, 0.8]) {
      const p = box(0.14, 2.0, 0.14, M.wood);
      p.position.set(WX, 1.0, WZ + dz);
      g.add(p);
    }
    const beam = box(0.14, 0.14, 1.8, M.wood);
    beam.position.set(WX, 2.0, WZ);
    g.add(beam);
    const rope = box(0.05, 0.9, 0.05, M.rope, false);
    rope.position.set(WX, 1.5, WZ);
    g.add(rope);
    const bucket = cyl(0.2, 0.17, 0.36, 8, M.wood, false);
    bucket.position.set(WX, 1.0, WZ);
    g.add(bucket);
  }

  return g;
}

/* ============================================================
 *  4. 水磨人家：驿道边一家人的磨坊住处
 * ========================================================== */
export function makeMillerCottage(M) {
  const g = new THREE.Group();

  /* ---- 小溪：从北往南 ---- */
  {
    const CREEK = [[-3.0, -22], [-2.6, -14], [-2.2, -6], [-1.6, 2], [-0.8, 10], [0.4, 18], [1.8, 24]];
    const bed = ribbon(CREEK, 6.0, 0.02, M.soilBorder);
    bed.position.y = 0.02;
    g.add(bed);
    const water = ribbon(CREEK, 4.6, 0.08, M.water);
    water.position.y = 0.08;
    g.add(water);
    // 岸边几块石头
    for (let i = 0; i < 12; i++) {
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.24, 0),
        solid(0x7a7466, { roughness: 1, flatShading: true })
      );
      const t = Math.random();
      st.position.set(-3.4 + Math.sin(t * 6) * 0.4 + (Math.random() < 0.5 ? -3.2 : 3.2), 0.14, -20 + t * 42);
      st.castShadow = true;
      g.add(st);
    }
  }

  /* ---- 小木桥 ---- */
  {
    const BZ = 6.0;
    // 桥面：几块横板
    for (let i = 0; i < 9; i++) {
      const plank = box(7.4, 0.1, 0.42, i % 2 ? M.woodDark : M.wood);
      plank.position.set(-2.4, 0.62, BZ - 1.8 + i * 0.44);
      g.add(plank);
    }
    // 两侧护栏
    for (const dx of [-1.0, 1.0]) {
      for (const dz of [-1.9, 0, 1.9]) {
        const p = box(0.12, 0.9, 0.12, M.wood);
        p.position.set(-2.4 + dx * 3.2, 1.1, BZ + dz);
        g.add(p);
      }
      const rail = box(0.1, 0.1, 4.0, M.wood);
      rail.position.set(-2.4 + dx * 3.2, 1.5, BZ);
      g.add(rail);
    }
  }

  /* ---- 磨坊：石砌小方屋 + 下射水轮 ---- */
  {
    const W = 6.0, D = 6.4, H = 4.0;
    const MX = -7.4, MZ = 2.0;

    const wall = box(W, H, D, M.stone);
    wall.position.set(MX, H / 2, MZ);
    g.add(wall);

    const roof = ridgeRoof(W + 0.8, D + 1.0, 2.2, M.thatch);
    roof.position.set(MX, H, MZ);
    g.add(roof);

    // 门朝东（对着溪）
    const door = box(0.14, 2.0, 1.1, M.woodDark);
    door.position.set(MX + W / 2 + 0.02, 1.0, MZ);
    g.add(door);

    // 窗
    const win = box(0.12, 0.8, 0.8, M.window, false);
    win.position.set(MX + W / 2 + 0.02, 2.7, MZ + 2.0);
    win.userData.keepSeparate = true;
    g.add(win);

    // 水轮：装在屋子东侧，半沉在水里
    const R = 1.9;
    const wheel = new THREE.Group();
    wheel.position.set(MX + W / 2 + 1.0, 1.7, MZ);
    for (const dz of [-0.42, 0.42]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.09, 5, 18), M.woodDark);
      rim.rotation.y = Math.PI / 2;
      rim.position.z = dz;
      rim.castShadow = true;
      wheel.add(rim);
      for (let i = 0; i < 5; i++) {
        const sp = box(0.08, R * 2 - 0.2, 0.08, M.woodDark);
        sp.position.z = dz;
        sp.rotation.x = (i / 5) * Math.PI;
        wheel.add(sp);
      }
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const paddle = box(0.06, 0.5, 1.0, M.wood);
      paddle.position.set(0, Math.sin(a) * R, Math.cos(a) * R);
      paddle.rotation.x = a;
      wheel.add(paddle);
    }
    wheel.userData.isMillWheel = true;
    g.add(wheel);

    // 引水的小闸
    const sluice = box(1.4, 0.9, 1.6, M.woodDark);
    sluice.position.set(MX + W / 2 + 1.0, 3.6, MZ - 1.6);
    g.add(sluice);
  }

  /* ---- 住处：一幢小农舍，茅草顶 ---- */
  {
    const W = 8.0, D = 6.4, H = 3.2;
    const HX = -8.0, HZ = 15.0;

    const wall = box(W, H, D, M.plaster);
    wall.position.set(HX, H / 2, HZ);
    g.add(wall);

    const roof = ridgeRoof(W + 1.0, D + 1.4, 2.0, M.thatch);
    roof.position.set(HX, H, HZ);
    g.add(roof);

    const door = box(1.0, 2.0, 0.14, M.woodDark);
    door.position.set(HX + 1.6, 1.0, HZ + D / 2 + 0.03);
    g.add(door);

    for (const dx of [-2.4, 2.6]) {
      const win = box(0.7, 0.7, 0.12, M.window, false);
      win.position.set(HX + dx, 2.0, HZ + D / 2 + 0.03);
      win.userData.keepSeparate = true;
      g.add(win);
    }

    const chim = box(0.9, 2.0, 0.9, M.stoneLight);
    chim.position.set(HX - 2.4, H + 1.4, HZ - 1.6);
    g.add(chim);

    // 门前的小菜园
    for (let r = 0; r < 2; r++) {
      const bed = box(6.0, 0.16, 1.2, M.soilBorder);
      bed.position.set(HX, 0.08, HZ + D / 2 + 2.0 + r * 1.6);
      g.add(bed);
      for (let i = 0; i < 16; i++) {
        const veg = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 5, 4),
          solid(0x6d8a44, { roughness: 1, flatShading: true })
        );
        veg.position.set(HX - 2.8 + Math.random() * 5.6, 0.24, HZ + D / 2 + 2.0 + r * 1.6 + (Math.random() - 0.5) * 0.8);
        veg.castShadow = true;
        g.add(veg);
      }
    }
  }

  /* ---- 磨盘、麻袋、晾衣绳 ---- */
  {
    const disc = cyl(0.95, 0.95, 0.24, 18, M.stoneStrong);
    disc.position.set(-3.4, 0.12, 12.0);
    g.add(disc);
    const disc2 = cyl(0.62, 0.62, 0.2, 16, M.stoneStrong);
    disc2.position.set(-2.4, 0.1, 12.8);
    g.add(disc2);

    for (let i = 0; i < 4; i++) {
      const sack = box(0.6, 0.34, 0.44, CLOTH(0xcbbd9c));
      sack.position.set(-4.6, 0.17 + i * 0.33, 8.4);
      sack.rotation.y = (i % 2) * 0.16 - 0.08;
      g.add(sack);
    }

    // 晾衣绳
    for (const x of [-6.0, -1.6]) {
      const p = cyl(0.07, 0.09, 2.2, 5, M.wood);
      p.position.set(x, 1.1, 19.5);
      g.add(p);
    }
    const line = box(4.4, 0.03, 0.03, M.rope, false);
    line.position.set(-3.8, 2.1, 19.5);
    g.add(line);
    for (let i = 0; i < 5; i++) {
      const cloth = box(0.7, 0.9, 0.02, CLOTH([0xd8d0bc, 0xb8ae96, 0x9aa4b0][i % 3]), false);
      cloth.position.set(-5.6 + i * 0.9, 1.64, 19.5);
      g.add(cloth);
    }
  }

  return g;
}

/* ============================================================
 *  5. 绞架：驿道尽头，给路过的人看的
 * ========================================================== */
export function makeGallow(M) {
  const g = new THREE.Group();

  /* ---- 地面：一圈踩秃的土 ---- */
  {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(6.5, 20), solid(0x8a7f5f, { roughness: 1 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.03;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 石砌台：两级 ---- */
  {
    const lower = box(9.0, 0.35, 7.0, M.stone);
    lower.position.y = 0.17;
    g.add(lower);
    const upper = box(7.0, 0.35, 5.4, M.stoneLight);
    upper.position.y = 0.52;
    g.add(upper);
    // 上台阶的三级踏步（南侧）
    for (let i = 0; i < 3; i++) {
      const st = box(2.2, 0.24, 0.6, M.stoneLight);
      st.position.set(0, 0.12 + i * 0.24, 3.5 + (2 - i) * 0.62);
      g.add(st);
    }
  }

  /* ---- 绞架：两根立柱 + 横梁 + 斜撑 ---- */
  {
    const H = 5.6;
    for (const sx of [-1, 1]) {
      const post = box(0.44, H, 0.44, M.woodDark);
      post.position.set(sx * 2.2, 0.7 + H / 2, 0);
      g.add(post);
      // 柱脚的斜撑
      for (const sz of [-1, 1]) {
        const brace = box(0.2, 1.8, 0.2, M.woodDark);
        brace.position.set(sx * 2.2, 1.3, sz * 0.7);
        brace.rotation.x = sz * 0.62;
        g.add(brace);
      }
    }
    const beam = box(5.4, 0.4, 0.4, M.woodDark);
    beam.position.set(0, 0.7 + H + 0.2, 0);
    g.add(beam);
    // 横梁两端的支撑小三角
    for (const sx of [-1, 1]) {
      const knee = box(0.22, 1.1, 0.22, M.woodDark);
      knee.position.set(sx * 1.6, 0.7 + H - 0.3, 0);
      knee.rotation.z = sx * 0.72;
      g.add(knee);
    }
  }

  /* ---- 三根绳子：中间那根旁边挂着一只空笼子 ---- */
  {
    const ROPE = solid(0x9a8a62, { roughness: 1 });
    for (const [x, len] of [[-1.2, 2.4], [0.0, 2.0], [1.2, 2.6]]) {
      const rope = cyl(0.045, 0.045, len, 5, ROPE, false);
      rope.position.set(x, 0.7 + 5.6 + 0.2 - len / 2, 0);
      g.add(rope);
      // 绳结
      const knot = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 10), ROPE);
      knot.position.set(x, 0.7 + 5.6 + 0.2 - len, 0);
      knot.rotation.x = Math.PI / 2;
      g.add(knot);
    }

    // 笼子：铁条编的方笼
    const CX = 1.2, CY = 0.7 + 5.8 - 2.6 - 0.8;
    const frame = box(0.9, 1.4, 0.9, M.iron, false);
    frame.material = new THREE.MeshStandardMaterial({
      color: 0x2b2b30, roughness: 0.5, metalness: 0.8, wireframe: true,
    });
    frame.position.set(CX, CY, 0);
    g.add(frame);
    // 笼底的板
    const floor = box(0.9, 0.08, 0.9, M.woodDark, false);
    floor.position.set(CX, CY - 0.7, 0);
    g.add(floor);
  }

  /* ---- 旁边的木棚：看守人歇脚的地方 ---- */
  {
    const SX = -6.4, SZ = -1.0;
    for (const dx of [-1.5, 1.5]) {
      for (const dz of [-1.2, 1.2]) {
        const p = cyl(0.12, 0.15, 2.5, 6, M.wood);
        p.position.set(SX + dx, 1.25, SZ + dz);
        g.add(p);
      }
    }
    const roof = box(3.8, 0.16, 3.2, M.thatch);
    roof.position.set(SX, 2.55, SZ);
    roof.castShadow = true;
    g.add(roof);
    // 一张长凳与一捆绳子
    const bench = box(2.4, 0.12, 0.5, M.woodDark);
    bench.position.set(SX, 0.5, SZ + 0.8);
    g.add(bench);
    for (const dx of [-0.9, 0.9]) {
      const leg = box(0.12, 0.5, 0.44, M.wood);
      leg.position.set(SX + dx, 0.25, SZ + 0.8);
      g.add(leg);
    }
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 5, 12), M.rope);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(SX + 1.0, 0.1, SZ - 0.6);
    g.add(coil);
  }

  /* ---- 乌鸦：停在横梁上 ---- */
  {
    for (const [x, y] of [[-2.0, 6.5], [2.0, 6.5]]) {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), solid(0x1a1a20, { roughness: 0.9 }));
      body.scale.set(1.5, 1.0, 0.9);
      body.position.set(x, y, 0);
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), solid(0x1a1a20, { roughness: 0.9 }));
      head.position.set(x + 0.22, y + 0.1, 0);
      g.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 4), solid(0x3a2e18, { roughness: 1 }));
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(x + 0.34, y + 0.1, 0);
      g.add(beak);
    }
  }

  return g;
}
