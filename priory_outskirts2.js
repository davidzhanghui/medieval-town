/**
 * priory_outskirts2.js —— 修道院再向外的一圈（第二圈）
 *
 * 第一圈是修道院赖以为生的东西（水、粮、施舍、石料、隐修），
 * 这一圈是它养出来的地界：埋人的墓地、磨面的磨坊、剪毛的羊圈、
 * 供蜡的蜂场，以及更远处一座已经没人做礼拜的小教堂。
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

const GRASS = new THREE.MeshStandardMaterial({ color: 0x7f9a58, roughness: 1 });
const CLOTH = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide });

/** 一段不高的干砌石墙（顶上一块压顶石），沿 X 方向长 len */
function dryWall(len, mat, capMat, h = 1.0) {
  const g = new THREE.Group();
  const body = box(len, h, 0.62, mat);
  body.position.y = h / 2;
  g.add(body);
  const cap = box(len + 0.14, 0.14, 0.76, capMat);
  cap.position.y = h + 0.07;
  g.add(cap);
  return g;
}

/* ============================================================
 *  1. 朝圣者墓地：死在路上的人，埋在院墙外面
 * ========================================================== */
export function makePilgrimGraveyard(M) {
  const g = new THREE.Group();
  const W = 26, D = 18;

  /* ---- 地面：一片没怎么被打理的草，比周围的草地暗一点 ---- */
  {
    const plot = box(W, 0.06, D, GRASS, false);
    plot.position.y = 0.03;
    plot.receiveShadow = true;
    g.add(plot);

    // 中间的土径：从南门直通北面的小龛
    const path = box(2.2, 0.04, D - 2, solid(0xa89a7c, { roughness: 1 }), false);
    path.position.set(0, 0.07, 0);
    g.add(path);
  }

  /* ---- 围墙：南面留门，其余三面闭合 ---- */
  {
    const H = 1.15;
    const segs = [
      [W, 0, -D / 2, 0],
      [W, 0, D / 2, 0],
      [D, -W / 2, 0, Math.PI / 2],
      [D, W / 2, 0, Math.PI / 2],
    ];
    for (const [len, x, z, ry] of segs) {
      // 南墙分两段，中间留 3 米门洞
      if (z === D / 2) {
        const half = (W - 3) / 2;
        for (const sx of [-1, 1]) {
          const w = dryWall(half, M.stone, M.stoneLight, H);
          w.position.set(sx * (3 / 2 + half / 2), 0, z);
          g.add(w);
        }
        // 门柱
        for (const sx of [-1, 1]) {
          const post = box(0.7, 1.9, 0.7, M.stoneStrong);
          post.position.set(sx * 1.5, 0.95, z);
          g.add(post);
        }
        continue;
      }
      const w = dryWall(len, M.stone, M.stoneLight, H);
      w.position.set(x, 0, z);
      w.rotation.y = ry;
      g.add(w);
    }
  }

  /* ---- 北端的石龛：墓地做弥撒的地方 ---- */
  {
    const NZ = -D / 2 + 2.6;
    const wallB = box(3.4, 2.9, 0.5, M.stone);
    wallB.position.set(0, 1.45, NZ);
    g.add(wallB);

    const niche = box(1.4, 2.0, 0.2, solid(0x1b1712, { roughness: 1 }), false);
    niche.position.set(0, 1.4, NZ + 0.3);
    g.add(niche);

    // 龛里的圣母像
    const body = cyl(0.2, 0.34, 1.1, 9, M.linen);
    body.position.set(0, 1.32, NZ + 0.34);
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), solid(0xd9c0a0));
    head.position.set(0, 1.98, NZ + 0.34);
    g.add(head);

    // 龛口上方一道半圆券
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.13, 4, 14, Math.PI), M.stoneLight);
    arch.position.set(0, 2.4, NZ + 0.26);
    arch.castShadow = true;
    g.add(arch);

    // 两盏小灯
    for (const sx of [-1, 1]) {
      const c = cyl(0.1, 0.12, 0.3, 6, M.bronze, false);
      c.position.set(sx * 1.1, 2.05, NZ + 0.34);
      g.add(c);
    }
  }

  /* ---- 墓碑：一片高低不一的石碑，多数已经歪了 ---- */
  {
    const STONE = [0xa9a294, 0x9b9484, 0xb2ab9a, 0x8f8878];
    const ROWS = 5, COLS = 7;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // 让路两侧各留一列空
        const x = -W / 2 + 3.4 + c * (W - 6.8) / (COLS - 1);
        if (Math.abs(x) < 1.6) continue;
        const z = -D / 2 + 5.2 + r * 2.4;
        if (Math.random() < 0.16) continue;   // 空穴

        const mat = solid(STONE[(r * 3 + c) % STONE.length], { roughness: 1 });
        const kind = Math.random();
        const h = 0.7 + Math.random() * 0.55;
        const tilt = (Math.random() - 0.5) * 0.22;

        if (kind < 0.55) {
          // 圆顶碑
          const slab = box(0.46, h, 0.16, mat);
          slab.position.set(x, h / 2, z);
          slab.rotation.z = tilt;
          g.add(slab);
          const top = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.16, 10, 1, false, 0, Math.PI), mat);
          top.rotation.x = -Math.PI / 2;
          top.rotation.z = tilt;
          top.position.set(x - Math.sin(tilt) * h * 0.5, h + 0.02, z);
          top.castShadow = true;
          g.add(top);
        } else if (kind < 0.8) {
          // 尖顶碑
          const slab = box(0.42, h, 0.15, mat);
          slab.position.set(x, h / 2, z);
          slab.rotation.z = tilt;
          g.add(slab);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.34, 4), mat);
          cap.rotation.y = Math.PI / 4;
          cap.position.set(x, h + 0.14, z);
          cap.castShadow = true;
          g.add(cap);
        } else {
          // 十字架
          const post = box(0.17, h + 0.5, 0.14, mat);
          post.position.set(x, (h + 0.5) / 2, z);
          post.rotation.z = tilt;
          g.add(post);
          const arm = box(0.62, 0.15, 0.13, mat);
          arm.position.set(x, h + 0.18, z);
          arm.rotation.z = tilt;
          g.add(arm);
        }

        // 碑前的土堆
        if (Math.random() < 0.5) {
          const mound = box(1.0, 0.14, 1.6, solid(0x6b6046, { roughness: 1 }), false);
          mound.position.set(x, 0.1, z + 0.9);
          mound.receiveShadow = true;
          g.add(mound);
        }
      }
    }
  }

  /* ---- 一棵紫杉：墓地里几乎总有一棵 ---- */
  {
    const TX = -W / 2 + 2.4, TZ = -D / 2 + 2.2;
    const trunk = cyl(0.32, 0.46, 3.2, 7, solid(0x3b2a1c, { roughness: 1 }));
    trunk.position.set(TX, 1.6, TZ);
    g.add(trunk);
    const CROWN = [[0, 4.6, 2.6], [0.9, 5.6, 2.0], [-0.7, 5.4, 1.8], [0.2, 6.6, 1.3]];
    for (const [dx, y, r] of CROWN) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), M.yewGreen);
      c.position.set(TX + dx, y, TZ);
      c.scale.y = 1.25;
      c.castShadow = true;
      g.add(c);
    }
  }

  /* ---- 门口的两只木桶与一把靠着的铁锹 ---- */
  {
    for (const sx of [-1, 1]) {
      const barrel = cyl(0.34, 0.30, 0.86, 10, M.wood);
      barrel.position.set(sx * 2.6, 0.43, D / 2 + 0.9);
      g.add(barrel);
    }
    const spade = cyl(0.035, 0.04, 1.5, 5, M.wood, false);
    spade.position.set(2.0, 0.75, D / 2 + 1.4);
    spade.rotation.z = 0.22;
    g.add(spade);
    const blade = box(0.26, 0.34, 0.04, M.iron, false);
    blade.position.set(2.16, 0.14, D / 2 + 1.4);
    g.add(blade);
  }

  return g;
}

/* ============================================================
 *  2. 修道院磨坊：上射水轮 + 磨坊塘 + 磨坊主的小屋
 * ========================================================== */
export function makeAbbeyMill(M) {
  const g = new THREE.Group();
  const POND_R = 7.6;

  /* ---- 磨坊塘：塘底 + 水面 + 一圈抬起的石岸 ---- */
  {
    // 塘底：只做一层薄盘，不能做成实心柱——否则水面会被柱顶盖住
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(POND_R + 0.6, POND_R + 0.6, 0.18, 26), M.stone);
    bed.position.set(-6.5, 0.09, 0);
    bed.receiveShadow = true;
    g.add(bed);

    const water = new THREE.Mesh(new THREE.CircleGeometry(POND_R, 26), M.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-6.5, 0.3, 0);
    g.add(water);

    // 石岸：一圈比水面高半米的块石，围住塘口。
    // 东侧（正对水轮那一角）留个缺口，水要从那里流出去推轮子。
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      if (Math.abs(a) < 0.34) continue;
      const st = box(2.3, 0.62, 0.9, M.stoneLight);
      st.position.set(-6.5 + Math.cos(a) * (POND_R + 0.45), 0.31, Math.sin(a) * (POND_R + 0.45));
      st.rotation.y = -a;
      g.add(st);
    }
  }

  /* ---- 引水木槽：从塘里把水引到轮子上方 ---- */
  {
    const flume = box(0.9, 0.34, 5.4, M.woodDark);
    flume.position.set(-1.2, 4.1, 0);
    flume.rotation.y = Math.PI / 2;
    g.add(flume);
    // 支撑
    for (const z of [-1.9, 1.9]) {
      const post = cyl(0.13, 0.16, 4.0, 6, M.wood);
      post.position.set(-1.2, 2.0, z);
      g.add(post);
    }
  }

  /* ---- 磨坊主屋：石砌一层 + 木构山墙 ---- */
  {
    const W = 7.6, D = 8.6, H = 4.4;
    const wall = box(W, H, D, M.stone);
    wall.position.set(4.6, H / 2, 0);
    g.add(wall);

    // 山墙朝西（对着水轮）
    const gableEnd = gable(D, 0.5, 2.6, M.stoneLight);
    gableEnd.rotation.y = Math.PI / 2;
    gableEnd.position.set(0.85, H, 0);
    g.add(gableEnd);
    const gableEnd2 = gable(D, 0.5, 2.6, M.stoneLight);
    gableEnd2.rotation.y = -Math.PI / 2;
    gableEnd2.position.set(8.35, H, 0);
    g.add(gableEnd2);

    const roof = ridgeRoof(W + 0.8, D + 1.0, 2.6, M.slate);
    roof.position.set(4.6, H, 0);
    g.add(roof);

    // 门与小窗
    const door = box(1.2, 2.1, 0.18, M.woodDark);
    door.position.set(4.6, 1.05, D / 2 + 0.06);
    g.add(door);
    for (const z of [-2.2, 2.2]) {
      const win = box(0.7, 0.7, 0.16, M.window, false);
      win.position.set(4.6, 3.0, z + D / 2 * 0);
      win.position.z = D / 2 + 0.06;
      win.userData.keepSeparate = true;
      g.add(win);
    }

    // 烟囱
    const chim = box(0.8, 2.2, 0.8, M.stoneLight);
    chim.position.set(2.6, H + 2.4, -2.6);
    g.add(chim);
  }

  /* ---- 水轮：上射式，十二片桨叶 ---- */
  {
    const R = 2.5;
    const CX = 0.15, CY = 3.3;
    const wheel = new THREE.Group();
    wheel.position.set(CX, CY, 0);

    // 两圈轮辐撑住的轮缘
    for (const z of [-0.55, 0.55]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.11, 5, 22), M.woodDark);
      rim.position.z = z;
      rim.castShadow = true;
      wheel.add(rim);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spoke = box(0.1, R * 2 - 0.2, 0.1, M.woodDark);
        spoke.position.z = z;
        spoke.rotation.z = a;
        wheel.add(spoke);
      }
    }
    // 轴
    const axle = cyl(0.16, 0.16, 1.6, 8, M.woodDark);
    axle.rotation.x = Math.PI / 2;
    wheel.add(axle);
    // 桨叶
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const paddle = box(0.08, 0.62, 1.3, M.wood);
      paddle.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      paddle.rotation.z = a;
      wheel.add(paddle);
    }
    wheel.userData.isMillWheel = true;
    g.add(wheel);
  }

  /* ---- 磨盘：门口立着两块备用石盘 ---- */
  {
    for (const [x, z, r] of [[8.6, 3.4, 0.9], [9.4, 4.6, 0.62]]) {
      const disc = cyl(r, r, 0.22, 18, M.stoneStrong);
      disc.position.set(x, 0.11, z);
      disc.rotation.z = 0.06;
      g.add(disc);
    }
    // 靠墙的一摞空麻袋
    for (let i = 0; i < 4; i++) {
      const sack = box(0.62, 0.32, 0.4, CLOTH(0xcbbd9c));
      sack.position.set(8.2, 0.16 + i * 0.31, -3.4);
      sack.rotation.y = (i % 2) * 0.2 - 0.1;
      g.add(sack);
    }
  }

  /* ---- 鸭：磨坊塘上总会有几只 ---- */
  {
    for (const [x, z] of [[-8.2, 2.2], [-5.0, -3.4], [-9.6, -1.6]]) {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), solid(0xded6c4));
      body.scale.set(1.5, 0.9, 0.9);
      body.position.set(x, 0.58, z);
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), solid(0x2e4034));
      head.position.set(x + 0.32, 0.74, z);
      g.add(head);
    }
  }

  return g;
}

/* ============================================================
 *  3. 羊圈与剪毛棚：修道院的羊毛
 * ========================================================== */
export function makeSheepfold(M) {
  const g = new THREE.Group();
  const W = 30, D = 24;

  /* ---- 地面：被羊啃秃、踩实的土 ---- */
  {
    const pad = box(W, 0.06, D, solid(0x9a8f6e, { roughness: 1 }), false);
    pad.position.y = 0.03;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 围栏：木桩 + 两道横杆，留一面开口 ---- */
  {
    const post = (x, z) => {
      const p = cyl(0.1, 0.13, 1.5, 6, M.wood);
      p.position.set(x, 0.75, z);
      g.add(p);
    };
    const railBetween = (x1, z1, x2, z2) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const ang = Math.atan2(-(z2 - z1), x2 - x1);
      for (const y of [0.55, 1.12]) {
        const r = box(len, 0.1, 0.09, M.woodDark, false);
        r.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
        r.rotation.y = ang;
        g.add(r);
      }
    };

    const SEG = 3.0;
    // 北、东、西三面全封；南面中间留 4 米门
    const lines = [
      [[-W / 2, -D / 2], [W / 2, -D / 2]],
      [[W / 2, -D / 2], [W / 2, D / 2]],
      [[-W / 2, -D / 2], [-W / 2, D / 2]],
      [[-W / 2, D / 2], [-2.0, D / 2]],
      [[2.0, D / 2], [W / 2, D / 2]],
    ];
    for (const [[x1, z1], [x2, z2]] of lines) {
      const n = Math.max(1, Math.round(Math.hypot(x2 - x1, z2 - z1) / SEG));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        post(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t);
      }
      railBetween(x1, z1, x2, z2);
    }
  }

  /* ---- 剪毛棚：敞开的单坡顶，里面一张剪毛台 ---- */
  {
    const SX = -W / 2 + 4.2, SZ = -D / 2 + 4.0;
    // 四根柱子
    for (const dx of [-2.6, 2.6]) {
      for (const dz of [-2.0, 2.0]) {
        const p = cyl(0.14, 0.18, 3.0 + (dz > 0 ? 0.5 : 0), 6, M.wood);
        p.position.set(SX + dx, (3.0 + (dz > 0 ? 0.5 : 0)) / 2, SZ + dz);
        g.add(p);
      }
    }
    // 单坡顶：后高前低
    const roof = box(6.4, 0.16, 5.2, M.thatch);
    roof.position.set(SX, 3.32, SZ + 0.2);
    roof.rotation.x = -0.11;
    roof.castShadow = true;
    g.add(roof);

    // 剪毛台
    const table = box(3.0, 0.14, 1.4, M.woodDark);
    table.position.set(SX, 0.88, SZ + 0.6);
    g.add(table);
    for (const dx of [-1.3, 1.3]) {
      for (const dz of [-0.5, 0.5]) {
        const leg = box(0.14, 0.86, 0.14, M.wood);
        leg.position.set(SX + dx, 0.43, SZ + 0.6 + dz);
        g.add(leg);
      }
    }
    // 台上的剪子与羊毛
    const shears = box(0.42, 0.05, 0.1, M.iron, false);
    shears.position.set(SX + 0.8, 0.96, SZ + 0.6);
    g.add(shears);
    const fleece = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), solid(0xe6dcc4, { flatShading: true }));
    fleece.scale.set(1.2, 0.62, 1.0);
    fleece.position.set(SX - 0.7, 1.06, SZ + 0.6);
    fleece.castShadow = true;
    g.add(fleece);
  }

  /* ---- 打包好的羊毛捆：堆在棚外 ---- */
  {
    const BALE = solid(0xd8cdb0, { roughness: 1 });
    const POS = [[-8.4, 6.6], [-6.9, 7.4], [-7.7, 6.9], [-1.2, 8.4], [-0.4, 9.1]];
    let i = 0;
    for (const [x, z] of POS) {
      const y = i === 2 ? 0.86 : 0.42;
      const bale = box(1.15, 0.8, 0.85, BALE);
      bale.position.set(x, y, z);
      bale.rotation.y = (i % 3) * 0.18;
      g.add(bale);
      // 捆绳
      for (const t of [-0.3, 0.3]) {
        const rope = box(0.06, 0.86, 0.9, M.rope, false);
        rope.position.set(x + t, y, z);
        rope.rotation.y = bale.rotation.y;
        g.add(rope);
      }
      i++;
    }
  }

  /* ---- 水槽与草料架 ---- */
  {
    const trough = box(3.4, 0.5, 0.9, M.wood);
    trough.position.set(W / 2 - 3.2, 0.25, D / 2 - 3.0);
    g.add(trough);
    const inner = box(2.9, 0.1, 0.5, M.waterDark, false);
    inner.position.set(W / 2 - 3.2, 0.44, D / 2 - 3.0);
    g.add(inner);

    // 草料架：两边斜撑的三角架
    for (const sx of [-1, 1]) {
      const legA = box(0.1, 1.9, 0.1, M.wood);
      legA.position.set(W / 2 - 8.0 + sx * 1.4, 0.95, -D / 2 + 3.2);
      legA.rotation.z = sx * 0.42;
      g.add(legA);
      const legB = box(0.1, 1.9, 0.1, M.wood);
      legB.position.set(W / 2 - 8.0 + sx * 1.4, 0.95, -D / 2 + 5.2);
      legB.rotation.z = sx * 0.42;
      g.add(legB);
    }
    const hay = box(3.0, 0.8, 2.2, M.straw);
    hay.position.set(W / 2 - 8.0, 1.5, -D / 2 + 4.2);
    g.add(hay);
  }

  /* ---- 羊：低模，低头啃草或站着发愣 ---- */
  {
    const WOOL = solid(0xe6dfcd, { roughness: 1 });
    const FACE = solid(0x3a332a, { roughness: 0.95 });
    const legGeo = new THREE.BoxGeometry(0.09, 0.44, 0.09);

    const sheep = (x, z, yaw, graze) => {
      const s = new THREE.Group();
      s.position.set(x, 0, z);
      s.rotation.y = yaw;

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 9, 7), WOOL);
      body.scale.set(1, 0.88, 1.5);
      body.position.y = 0.8;
      body.castShadow = true;
      body.receiveShadow = true;
      s.add(body);
      // 背上的毛团，破一下球体的规整感
      for (let i = 0; i < 3; i++) {
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 5), WOOL);
        tuft.position.set((i - 1) * 0.28, 0.98, (i - 1) * 0.34);
        tuft.castShadow = true;
        s.add(tuft);
      }

      // 头：啃草时压到贴地
      const head = new THREE.Group();
      head.position.set(0, graze ? 0.52 : 0.94, 0.62);
      head.rotation.x = graze ? 0.9 : 0.1;
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 6), FACE);
      skull.scale.set(1, 1.05, 1.2);
      skull.castShadow = true;
      head.add(skull);
      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.08), FACE);
        ear.position.set(sx * 0.18, 0.05, -0.02);
        ear.rotation.z = sx * 0.5;
        head.add(ear);
      }
      s.add(head);

      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const leg = new THREE.Mesh(legGeo, FACE);
          leg.position.set(sx * 0.22, 0.22, sz * 0.38);
          leg.castShadow = true;
          s.add(leg);
        }
      }
      return s;
    };

    // 散在场地里，避开剪毛棚（西北）、草料架（北）和水槽（东南）
    const FLOCK = [
      [-2.5, 1.8, 0.6, true],
      [0.8, 3.4, -1.2, true],
      [3.6, 0.4, 2.3, false],
      [-1.0, -3.2, 1.4, true],
      [6.2, 4.2, -0.5, true],
      [9.0, -1.6, 2.9, false],
      [-4.8, 3.9, 0.2, true],
      [2.2, 7.4, -2.0, false],
      [8.4, 7.8, 1.1, true],
    ];
    for (const [x, z, yaw, graze] of FLOCK) g.add(sheep(x, z, yaw, graze));
  }

  return g;
}

/* ============================================================
 *  4. 蜂场：一排草编蜂箱
 * ========================================================== */
export function makeApiary(M) {
  const g = new THREE.Group();

  /* ---- 场地：一方围起来的草圃 ---- */
  {
    const W = 16, D = 12;
    const plot = box(W, 0.05, D, GRASS, false);
    plot.position.y = 0.02;
    plot.receiveShadow = true;
    g.add(plot);

    // 低矮的编条篱笆，西面留口
    const SEG = 2.4;
    const lines = [
      [[-W / 2, -D / 2], [W / 2, -D / 2]],
      [[W / 2, -D / 2], [W / 2, D / 2]],
      [[W / 2, D / 2], [-W / 2, D / 2]],
      [[-W / 2, D / 2], [-W / 2, -D / 2]],
    ];
    for (const [[x1, z1], [x2, z2]] of lines) {
      const n = Math.max(1, Math.round(Math.hypot(x2 - x1, z2 - z1) / SEG));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = cyl(0.06, 0.08, 0.9, 5, M.wood, false);
        p.position.set(x1 + (x2 - x1) * t, 0.45, z1 + (z2 - z1) * t);
        g.add(p);
      }
      // 两道编条
      for (const y of [0.34, 0.66]) {
        const len = Math.hypot(x2 - x1, z2 - z1);
        const ang = Math.atan2(-(z2 - z1), x2 - x1);
        const r = box(len, 0.05, 0.05, M.rope, false);
        r.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
        r.rotation.y = ang;
        g.add(r);
      }
    }
  }

  /* ---- 蜂箱台：两排木板台，箱口朝东 ---- */
  {
    const HONEY = solid(0xbfa25e, { roughness: 1 });
    const DARK = solid(0x8a6f38, { roughness: 1 });

    for (let row = 0; row < 2; row++) {
      const z = -3.0 + row * 6.0;
      // 台板
      const bench = box(11.0, 0.16, 1.5, M.woodDark);
      bench.position.set(0, 0.72, z);
      g.add(bench);
      for (const x of [-4.6, 0, 4.6]) {
        const leg = box(0.16, 0.72, 1.3, M.wood);
        leg.position.set(x, 0.36, z);
        g.add(leg);
      }

      // 六个草编蜂箱（skep）：半球顶的草罩
      for (let i = 0; i < 6; i++) {
        const x = -4.4 + i * 1.76;
        const skep = new THREE.Mesh(
          new THREE.SphereGeometry(0.56, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.56),
          HONEY
        );
        skep.position.set(x, 0.8, z);
        skep.scale.y = 0.95;
        skep.castShadow = true;
        g.add(skep);

        // 箱底的木托
        const board = box(1.1, 0.08, 1.1, DARK, false);
        board.position.set(x, 0.84, z);
        g.add(board);

        // 巢门：朝东的小黑口
        const hole = box(0.06, 0.1, 0.34, solid(0x241c10, { roughness: 1 }), false);
        hole.position.set(x + 0.5, 0.96, z);
        g.add(hole);
      }
    }
  }

  /* ---- 蜂场小屋：放蜂具、摇蜜桶 ---- */
  {
    const W = 4.6, D = 4.0, H = 2.6;
    const wall = box(W, H, D, M.plaster);
    wall.position.set(-10.4, H / 2, 0);
    g.add(wall);
    const roof = ridgeRoof(W + 0.6, D + 0.7, 1.5, M.thatch);
    roof.position.set(-10.4, H, 0);
    g.add(roof);

    const door = box(1.0, 1.9, 0.14, M.woodDark);
    door.position.set(-8.16, 0.95, 0);
    door.rotation.y = Math.PI / 2;
    g.add(door);

    // 门口一只摇蜜桶
    const bucket = cyl(0.42, 0.38, 1.0, 12, M.wood);
    bucket.position.set(-7.4, 0.5, 2.2);
    g.add(bucket);
    const crank = box(0.5, 0.06, 0.06, M.iron, false);
    crank.position.set(-7.4, 1.06, 2.2);
    g.add(crank);
  }

  /* ---- 蜂：一小群绕着箱口飞的点 ---- */
  {
    const beeMat = new THREE.MeshStandardMaterial({
      color: 0x2a2418, roughness: 0.7, emissive: 0x3a2e10, emissiveIntensity: 0.2,
    });
    const beeGeo = new THREE.SphereGeometry(0.045, 5, 4);
    for (let i = 0; i < 26; i++) {
      const bee = new THREE.Mesh(beeGeo, beeMat);
      const row = i % 2;
      bee.position.set(
        -4.4 + (i % 12) * 0.8 + Math.random() * 0.6,
        1.0 + Math.random() * 1.3,
        -3.0 + row * 6.0 + (Math.random() - 0.5) * 2.2
      );
      bee.userData.beePhase = Math.random() * Math.PI * 2;
      g.add(bee);
    }
  }

  /* ---- 花畦：蜂场边上总要有点花 ---- */
  {
    const PETALS = [0xd8c86a, 0xc98aa8, 0xe0e0d0, 0xb9a2d0];
    for (let i = 0; i < 60; i++) {
      const x = -4 + Math.random() * 14;
      const z = 4.0 + Math.random() * 2.0;
      const stem = cyl(0.012, 0.012, 0.3, 4, solid(0x5d7a3a, { roughness: 1 }), false);
      stem.position.set(x, 0.15, z);
      g.add(stem);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 5, 4),
        solid(PETALS[i % PETALS.length], { roughness: 1, flatShading: true })
      );
      head.position.set(x, 0.32, z);
      g.add(head);
    }
  }

  return g;
}

/* ============================================================
 *  5. 废弃小教堂：塌了顶，只剩三面墙
 * ========================================================== */
export function makeRuinedChapel(M) {
  const g = new THREE.Group();
  const W = 9.0, D = 15.0, H = 5.4;

  /* ---- 地面：铺地的条石只剩零星几块 ---- */
  {
    const pad = box(W + 2.0, 0.06, D + 2.0, solid(0x8f8a72, { roughness: 1 }), false);
    pad.position.y = 0.03;
    pad.receiveShadow = true;
    g.add(pad);

    for (let i = 0; i < 22; i++) {
      const x = (Math.random() - 0.5) * W;
      const z = (Math.random() - 0.5) * D;
      const flag = box(0.9 + Math.random() * 0.6, 0.05, 0.7 + Math.random() * 0.5,
        solid(Math.random() < 0.5 ? 0xa8a291 : 0x9a9482, { roughness: 1 }), false);
      flag.position.set(x, 0.07, z);
      flag.rotation.y = Math.random() * 0.4;
      g.add(flag);
    }
    // 杂草：几撮高一点的草叶
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * (W + 1);
      const z = (Math.random() - 0.5) * (D + 1);
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 4), solid(0x6d8347, { roughness: 1, flatShading: true }));
      tuft.position.set(x, 0.25, z);
      tuft.rotation.z = (Math.random() - 0.5) * 0.3;
      g.add(tuft);
    }
  }

  /* ---- 三面墙：西墙最完整，北墙塌了一半，东墙只剩墙根 ---- */
  {
    // 西墙（完整，高处还留着两扇尖券窗）
    const west = box(0.7, H, D, M.stone);
    west.position.set(-W / 2, H / 2, 0);
    g.add(west);

    for (const z of [-4.2, 0.2, 4.4]) {
      // 窗洞：深色板贴在墙上，外面加券石环
      const win = box(0.12, 1.6, 0.75, solid(0x161310, { roughness: 1 }), false);
      win.position.set(-W / 2 + 0.36, 3.0, z);
      g.add(win);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.09, 4, 12, Math.PI), M.stoneLight);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(-W / 2 + 0.38, 3.8, z);
      arch.castShadow = true;
      g.add(arch);
    }

    // 西墙顶：残破的轮廓——用几块高低不齐的石块拼出来
    for (let i = 0; i < 9; i++) {
      const z = -D / 2 + 0.8 + i * (D - 1.6) / 8;
      const h = 0.2 + Math.random() * 0.9;
      const chunk = box(0.7, h, (D - 1.6) / 8 * 0.9, M.stone);
      chunk.position.set(-W / 2, H + h / 2, z);
      g.add(chunk);
    }

    // 北墙（塌了一半，只剩东侧一截）
    const northL = box(3.2, H - 1.2, 0.7, M.stone);
    northL.position.set(-W / 2 + 1.6, (H - 1.2) / 2, -D / 2);
    g.add(northL);
    // 塌下来的石堆
    for (let i = 0; i < 14; i++) {
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.5, 0),
        solid(0xa39c8a, { roughness: 1, flatShading: true })
      );
      st.position.set(-W / 2 + 4.0 + Math.random() * 4.0, 0.3 + Math.random() * 0.4, -D / 2 + Math.random() * 1.6);
      st.rotation.set(Math.random(), Math.random(), Math.random());
      st.castShadow = true;
      st.receiveShadow = true;
      g.add(st);
    }

    // 东墙：只剩 0.6 米高的墙根
    const east = box(0.7, 0.6, D, M.stone);
    east.position.set(W / 2, 0.3, 0);
    g.add(east);
    for (let i = 0; i < 7; i++) {
      const stub = box(0.7, 0.2 + Math.random() * 0.5, 1.2, M.stone);
      stub.position.set(W / 2, 0.6 + (0.2 + Math.random() * 0.5) / 2 - 0.1, -D / 2 + 1.2 + i * 2.1);
      g.add(stub);
    }

    // 南面的门框：两根门柱还立着，券石掉了一半
    for (const sx of [-1, 1]) {
      const post = box(0.8, 4.2, 0.9, M.stoneStrong);
      post.position.set(sx * 1.7, 2.1, D / 2);
      g.add(post);
    }
    const lintel = box(4.2, 0.55, 0.9, M.stoneStrong);
    lintel.position.set(0, 4.35, D / 2);
    lintel.rotation.z = -0.05;
    g.add(lintel);
  }

  /* ---- 东端的小后殿：半圆墙，顶已经没了 ---- */
  {
    // 半圆柱壳：缺口朝西（对着中殿），东半边伸到墙外，跟主体用同一套石墙材质
    const apseMat = M.stone.clone();
    apseMat.side = THREE.DoubleSide;
    const apse = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 3.0, 16, 1, true, -Math.PI / 2, Math.PI),
      apseMat
    );
    apse.position.set(W / 2, 1.5, 0);
    apse.rotation.y = Math.PI / 2;
    apse.castShadow = true;
    apse.receiveShadow = true;
    g.add(apse);

    // 后殿顶部也塌得不齐：沿半圆弧压一圈高矮不同的石块。
    // 柱壳转过 π/2 后，弧上的点 (r·sinθ, r·cosθ) 落到 (r·cosθ, -r·sinθ)，这里照搬同一个变换
    for (let i = 0; i < 13; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI;
      const h = 0.16 + Math.random() * 0.7;
      const chunk = box(0.46, h, 0.7, M.stone);
      chunk.position.set(W / 2 + Math.cos(a) * 2.24, 2.95 + h / 2, -Math.sin(a) * 2.24);
      chunk.rotation.y = a;   // 块的长边顺着弧的切线
      g.add(chunk);
    }
  }

  /* ---- 倒下的屋架：几根焦黑的梁斜插在地上 ---- */
  {
    const BURN = solid(0x3a2c1e, { roughness: 1 });
    const BEAMS = [
      [-1.2, 0.9, 2.4, 0.5, 1.1],
      [1.8, 0.7, -1.4, -0.7, 0.9],
      [-2.6, 0.55, -4.2, 0.9, 0.7],
      [2.4, 0.42, 4.8, 0.3, 0.6],
    ];
    for (const [x, y, z, rz, len] of BEAMS) {
      const beam = box(0.24, len, 0.24, BURN);
      beam.position.set(x, y, z);
      beam.rotation.z = rz;
      beam.rotation.x = (Math.random() - 0.5) * 0.4;
      g.add(beam);
    }
  }

  /* ---- 祭坛：还在，但已经没人用了 ---- */
  {
    const altar = box(2.4, 1.0, 1.1, M.stoneStrong);
    altar.position.set(W / 2 - 2.6, 0.5, 0);
    g.add(altar);
    const top = box(2.7, 0.14, 1.3, M.stoneLight);
    top.position.set(W / 2 - 2.6, 1.07, 0);
    g.add(top);
    // 台上倒着的一截蜡烛
    const candle = cyl(0.05, 0.05, 0.4, 5, solid(0xe2d9c2, { roughness: 1 }), false);
    candle.position.set(W / 2 - 3.1, 1.34, 0.18);
    candle.rotation.z = Math.PI / 2 - 0.2;
    g.add(candle);
  }

  /* ---- 一棵从墙里长出来的小树 ---- */
  {
    const trunk = cyl(0.1, 0.15, 2.2, 5, solid(0x4a3524, { roughness: 1 }));
    trunk.position.set(-W / 2 + 1.2, 1.1, -D / 2 + 1.6);
    trunk.rotation.z = 0.08;
    g.add(trunk);
    for (const [dx, y, r] of [[0, 2.5, 0.95], [0.4, 3.1, 0.7], [-0.35, 2.9, 0.62]]) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), solid(0x587a3e, { roughness: 1, flatShading: true }));
      c.position.set(-W / 2 + 1.2 + dx, y, -D / 2 + 1.6);
      c.castShadow = true;
      g.add(c);
    }
  }

  return g;
}
