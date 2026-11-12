/**
 * tournament_outskirts.js —— 比武场外围的五处
 *
 * 一场比武养活的不只是骑士：校场边上有人练枪，马市上有人挑马，
 * 场外摆开集市，甲胄匠在营里敲铁，受了伤的则抬进伤兵帐。
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

/* ============================================================
 *  1. 校场：练枪的跑道、木桩靶、箭靶
 * ========================================================== */
export function makeTrainingYard(M) {
  const g = new THREE.Group();

  /* ---- 场地：被踩秃的一大片土 ---- */
  {
    const ground = box(30, 0.1, 24, solid(0xb0a184, { roughness: 1 }), false);
    ground.position.y = 0.05;
    ground.receiveShadow = true;
    g.add(ground);

    // 跑马圈：一道用白灰画出的椭圆
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(9.0, 9.5, 40),
      solid(0xd8cfae, { roughness: 1 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-4.5, 0.11, 0);
    g.add(ring);
  }

  /* ---- 木桩靶（pell）：一根粗桩，中间缠着草绳 ---- */
  {
    const PX = -11.0, PZ = -6.0;

    const post = cyl(0.26, 0.34, 2.4, 10, M.woodDark);
    post.position.set(PX, 1.2, PZ);
    g.add(post);

    // 交叉的两根横臂，模拟人的肩膀
    const arm = box(2.2, 0.2, 0.2, M.wood);
    arm.position.set(PX, 1.95, PZ);
    g.add(arm);
    const arm2 = box(0.2, 0.2, 2.0, M.wood);
    arm2.position.set(PX, 1.55, PZ);
    g.add(arm2);

    // 缠在桩上的草绳
    for (let i = 0; i < 5; i++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 4, 12), M.straw);
      band.rotation.x = Math.PI / 2;
      band.position.set(PX, 0.55 + i * 0.42, PZ);
      g.add(band);
    }

    // 底座的石圈
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.18, 0),
        solid(0x8a8274, { roughness: 1, flatShading: true })
      );
      st.position.set(PX + Math.cos(a) * 0.72, 0.12, PZ + Math.sin(a) * 0.72);
      g.add(st);
    }
  }

  /* ---- 箭靶：三道草垛靶墙，前面插着射偏的箭 ---- */
  {
    for (let i = 0; i < 3; i++) {
      const bz = -10.5 + i * 2.6;

      // 靶墙：捆起来的稻草
      const butt = cyl(0.95, 1.0, 2.0, 12, M.straw);
      butt.rotation.z = Math.PI / 2;
      butt.position.set(3.5, 1.1, bz);
      g.add(butt);

      // 靶面：白底红心的圆盘
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.62, 18), CLOTH(0xe6dcc0));
      face.position.set(2.55, 1.3, bz);
      face.rotation.y = -Math.PI / 2;
      g.add(face);
      const bull = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), CLOTH(0x9e2f2c));
      bull.position.set(2.53, 1.3, bz);
      bull.rotation.y = -Math.PI / 2;
      g.add(bull);

      // 三脚支架
      for (const t of [-0.9, 0, 0.9]) {
        const leg = box(0.12, 1.0, 0.12, M.wood);
        leg.position.set(4.3, 0.5, bz + t);
        leg.rotation.x = t * 0.2;
        g.add(leg);
      }

      // 地上散落的箭
      for (let k = 0; k < 4; k++) {
        const arrow = cyl(0.015, 0.02, 0.9, 4, M.wood, false);
        arrow.position.set(1.2 + Math.random() * 1.2, 0.14, bz - 0.6 + Math.random() * 1.2);
        arrow.rotation.z = Math.PI / 2;
        arrow.rotation.y = Math.random() * Math.PI;
        g.add(arrow);
      }
    }

    // 射箭线：一排木桩拉一根绳
    for (let i = 0; i <= 5; i++) {
      const p = box(0.14, 1.1, 0.14, M.woodDark);
      p.position.set(-3.0, 0.55, -12.0 + i * 1.8);
      g.add(p);
    }
    const line = box(0.03, 0.03, 9.4, M.rope, false);
    line.position.set(-3.0, 1.0, -7.5);
    g.add(line);
  }

  /* ---- 兵器架与草人 ---- */
  {
    // 兵器架
    const RX = 8.5, RZ = 6.0;
    for (const sx of [-1.4, 1.4]) {
      const p = box(0.14, 1.9, 0.14, M.wood);
      p.position.set(RX + sx, 0.95, RZ);
      g.add(p);
    }
    for (const y of [0.8, 1.7]) {
      const r = box(3.0, 0.1, 0.1, M.wood);
      r.position.set(RX, y, RZ);
      g.add(r);
    }
    for (let i = 0; i < 5; i++) {
      const shaft = cyl(0.025, 0.03, 2.4, 4, M.wood, false);
      shaft.position.set(RX - 1.1 + i * 0.55, 1.35, RZ + 0.12);
      shaft.rotation.x = -0.1;
      g.add(shaft);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 5), M.iron);
      tip.position.set(RX - 1.1 + i * 0.55, 2.62, RZ + 0.24);
      g.add(tip);
    }

    // 草人：一根杆子套一件旧罩袍
    for (const [x, z] of [[10.5, -3.0], [11.6, -5.2]]) {
      const pole = cyl(0.06, 0.07, 2.0, 5, M.woodDark);
      pole.position.set(x, 1.0, z);
      g.add(pole);

      const body = cyl(0.24, 0.34, 1.1, 8, CLOTH(0x8a7350));
      body.position.set(x, 1.35, z);
      g.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), M.straw);
      head.position.set(x, 2.1, z);
      g.add(head);

      const arms = box(1.4, 0.14, 0.14, M.wood);
      arms.position.set(x, 1.75, z);
      g.add(arms);
    }
  }

  /* ---- 场地边的一排木栅与旗 ---- */
  for (const sz of [-1, 1]) {
    const fz = sz * 12;
    for (let i = 0; i <= 8; i++) {
      const p = box(0.14, 1.4, 0.14, M.woodDark);
      p.position.set(-15 + i * 3.75, 0.7, fz);
      g.add(p);
    }
    for (const y of [0.55, 1.15]) {
      const r = box(30, 0.1, 0.1, M.wood);
      r.position.set(0, y, fz);
      g.add(r);
    }
  }

  // 角落的一根旗杆
  {
    const pole = cyl(0.07, 0.1, 5.0, 6, M.woodDark);
    pole.position.set(-13.5, 2.5, 10.0);
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), CLOTH(0x9e2f2c));
    flag.position.set(-12.6, 4.5, 10.0);
    flag.castShadow = true;
    g.add(flag);
  }

  /* ---- 兵器维护的棚子 ---- */
  {
    const SX = -12.0, SZ = 6.5, W = 5.4, D = 3.6, H = 2.5;

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const p = box(0.16, H, 0.16, M.woodDark);
        p.position.set(SX + sx * W / 2, H / 2, SZ + sz * D / 2);
        g.add(p);
      }
    }
    const back = box(W, H, 0.16, M.wood);
    back.position.set(SX, H / 2, SZ - D / 2);
    g.add(back);

    const roof = box(W + 0.9, 0.16, D + 1.0, M.thatch);
    roof.position.set(SX, H + 0.3, SZ + 0.1);
    roof.rotation.x = -0.14;
    g.add(roof);

    // 棚里：一条长凳，上面放着磨刀石与油壶
    const bench = box(3.4, 0.14, 0.7, M.wood);
    bench.position.set(SX, 0.86, SZ);
    g.add(bench);
    for (const sx of [-1.4, 1.4]) {
      const leg = box(0.14, 0.8, 0.6, M.woodDark);
      leg.position.set(SX + sx, 0.4, SZ);
      g.add(leg);
    }
    const stone = box(0.5, 0.14, 0.5, solid(0x6b665c, { roughness: 0.9 }));
    stone.position.set(SX - 0.8, 1.0, SZ);
    g.add(stone);

    const oil = cyl(0.1, 0.12, 0.22, 8, M.woodDark, false);
    oil.position.set(SX + 0.9, 1.05, SZ);
    g.add(oil);
  }

  return g;
}

/* ============================================================
 *  2. 马市：围栏、拍卖台、拴马桩、蹄铁匠
 * ========================================================== */
export function makeHorseFair(M) {
  const g = new THREE.Group();

  /* ---- 场地：踩实的土地 ---- */
  {
    const pad = box(26, 0.09, 22, solid(0xa99978, { roughness: 1 }), false);
    pad.position.y = 0.05;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 围栏：一圈横杆，中间留一道门 ---- */
  {
    const HX = 12.0, HZ = 9.0;
    const sides = [
      [0, -HZ, HX * 2, 0],
      [-HX, 0, HZ * 2, Math.PI / 2],
      [HX, 0, HZ * 2, Math.PI / 2],
    ];
    for (const [cx, cz, len, rot] of sides) {
      for (const y of [0.6, 1.2]) {
        const r = box(len, 0.13, 0.13, M.wood);
        r.position.set(cx, y, cz);
        r.rotation.y = rot;
        g.add(r);
      }
      const n = Math.round(len / 2.6);
      for (let i = 0; i <= n; i++) {
        const t = -0.5 + i / n;
        const p = box(0.16, 1.5, 0.16, M.woodDark);
        p.position.set(cx + (rot ? 0 : t * len), 0.75, cz + (rot ? t * len : 0));
        g.add(p);
      }
    }
    // 南面留门
    for (const sx of [-1, 1]) {
      const seg = box(HX - 2.2, 0.13, 0.13, M.wood);
      seg.position.set(sx * (HX + 2.2) / 2, 1.2, HZ);
      g.add(seg);
    }
  }

  /* ---- 拍卖台：一座抬高的木台，台后挂一面布幔 ---- */
  {
    const PX = -6.0, PZ = -4.0;

    const deck = box(5.0, 0.3, 3.6, M.wood);
    deck.position.set(PX, 1.15, PZ);
    g.add(deck);

    // 台前三级台阶
    for (let i = 0; i < 3; i++) {
      const st = box(2.2, 0.3, 0.55, M.wood);
      st.position.set(PX, 0.15 + i * 0.3, PZ + 2.2 - i * 0.5);
      g.add(st);
    }

    // 台腿
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = box(0.22, 1.0, 0.22, M.woodDark);
        leg.position.set(PX + sx * 2.3, 0.5, PZ + sz * 1.6);
        g.add(leg);
      }
    }

    // 栏杆
    for (const sz of [-1, 1]) {
      const rail = box(5.0, 0.1, 0.1, M.woodDark);
      rail.position.set(PX, 1.75, PZ + sz * 1.8);
      g.add(rail);
    }

    // 台后的布幔与两根旗杆
    for (const sx of [-1, 1]) {
      const pole = cyl(0.08, 0.1, 4.4, 6, M.woodDark);
      pole.position.set(PX + sx * 2.8, 2.2, PZ - 2.0);
      g.add(pole);
    }
    const drape = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.4), CLOTH(0x2c4f86));
    drape.position.set(PX, 2.9, PZ - 1.95);
    drape.castShadow = true;
    g.add(drape);

    // 台上的一张小桌与木槌
    const table = box(1.4, 0.1, 0.7, M.wood);
    table.position.set(PX, 1.55, PZ - 0.7);
    g.add(table);
    for (const sx of [-0.55, 0.55]) {
      const leg = box(0.1, 0.28, 0.1, M.woodDark);
      leg.position.set(PX + sx, 1.4, PZ - 0.7);
      g.add(leg);
    }
    const gavel = box(0.1, 0.08, 0.26, M.woodDark);
    gavel.position.set(PX + 0.4, 1.65, PZ - 0.7);
    g.add(gavel);
  }

  /* ---- 拴马桩：两排，中间是通道 ---- */
  {
    for (let i = 0; i < 2; i++) {
      const z = -1.0 + i * 6.2;
      for (const sx of [-1, 1]) {
        const p = cyl(0.1, 0.12, 1.6, 6, M.woodDark);
        p.position.set(sx * 5.2, 0.8, z);
        g.add(p);
      }
      const rail = box(10.4, 0.15, 0.15, M.wood);
      rail.position.set(0, 1.52, z);
      g.add(rail);

      // 拴着的缰绳
      for (let k = 0; k < 4; k++) {
        const rope = cyl(0.02, 0.02, 0.85, 4, M.rope, false);
        rope.position.set(-3.9 + k * 2.6, 1.08, z + 0.06);
        g.add(rope);
      }
    }
  }

  /* ---- 马：三匹，深浅毛色不同 ---- */
  {
    const COATS = [0x5a3e2b, 0x8a6a45, 0x3a2c22];
    const SPOTS = [[-3.2, 5.0, 0.3], [2.4, 5.2, -0.2], [-1.0, -1.2, 0.9]];

    SPOTS.forEach(([x, z, rot], i) => {
      const coat = solid(COATS[i % COATS.length], { roughness: 1, flatShading: true });
      const h = new THREE.Group();

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), coat);
      body.scale.set(1.45, 0.92, 0.8);
      body.position.y = 1.28;
      body.castShadow = true;
      h.add(body);

      const neck = box(0.26, 0.9, 0.3, coat);
      neck.position.set(0.72, 1.72, 0);
      neck.rotation.z = -0.42;
      h.add(neck);

      const head = box(0.3, 0.36, 0.24, coat);
      head.position.set(1.0, 2.14, 0);
      head.rotation.z = -0.55;
      h.add(head);

      // 鬃毛与尾巴
      const mane = box(0.1, 0.8, 0.14, solid(0x241a12, { roughness: 1, flatShading: true }));
      mane.position.set(0.62, 1.9, 0);
      mane.rotation.z = -0.42;
      h.add(mane);
      const tail = box(0.12, 0.75, 0.14, solid(0x241a12, { roughness: 1, flatShading: true }));
      tail.position.set(-0.88, 1.32, 0);
      tail.rotation.z = 0.25;
      h.add(tail);

      for (const [lx, lz] of [[-0.5, -0.26], [0.5, -0.26], [-0.5, 0.26], [0.5, 0.26]]) {
        const leg = cyl(0.09, 0.07, 1.05, 5, coat);
        leg.position.set(lx, 0.52, lz);
        h.add(leg);
      }

      h.position.set(x, 0, z);
      h.rotation.y = rot;
      g.add(h);
    });
  }

  /* ---- 蹄铁匠：一顶小帐 + 炉子 + 铁砧 ---- */
  {
    const FX = 9.0, FZ = -6.0;

    // 帐：四根斜柱撑一块帆布
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pole = cyl(0.06, 0.08, 2.4, 5, M.wood);
      pole.position.set(FX + sx * 1.8, 1.2, FZ + sz * 1.6);
      g.add(pole);
    }
    const canopy = box(4.4, 0.1, 4.0, CLOTH(0xd8cdb2));
    canopy.position.set(FX, 2.45, FZ);
    canopy.rotation.z = 0.06;
    g.add(canopy);

    // 炉子：一圈石头 + 炭火
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.22, 0),
        solid(0x6e6a5e, { roughness: 1, flatShading: true })
      );
      st.position.set(FX - 1.0 + Math.cos(a) * 0.7, 0.14, FZ - 0.9 + Math.sin(a) * 0.7);
      g.add(st);
    }
    const ember = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), M.ember);
    ember.rotation.x = -Math.PI / 2;
    ember.position.set(FX - 1.0, 0.16, FZ - 0.9);
    g.add(ember);

    // 铁砧：一段立起来的木头墩 + 上面的铁砧
    const stump = cyl(0.38, 0.44, 0.7, 10, M.woodDark);
    stump.position.set(FX + 0.8, 0.35, FZ + 0.7);
    g.add(stump);
    const anvil = box(0.9, 0.28, 0.36, M.iron);
    anvil.position.set(FX + 0.8, 0.84, FZ + 0.7);
    g.add(anvil);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 6), M.iron);
    horn.position.set(FX + 1.4, 0.84, FZ + 0.7);
    horn.rotation.z = -Math.PI / 2;
    g.add(horn);

    // 挂着的蹄铁
    for (let i = 0; i < 4; i++) {
      const shoe = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 4, 10, Math.PI), M.iron);
      shoe.position.set(FX - 1.9, 1.6 - i * 0.3, FZ + 1.5);
      shoe.rotation.y = Math.PI / 2;
      g.add(shoe);
    }
  }

  return g;
}

/* ============================================================
 *  3. 场外集市：一排货摊、旗绳、斗鸡圈
 * ========================================================== */
export function makeTournamentFair(M) {
  const g = new THREE.Group();

  /* ---- 踩平的场地 ---- */
  {
    const pad = box(34, 0.08, 16, solid(0xb3a486, { roughness: 1 }), false);
    pad.position.y = 0.04;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 六座货摊，沿一条街排开 ---- */
  {
    const HUES = [0x9e2f2c, 0x2c4f86, 0x3f6b3a, 0x8a6a2a, 0x6b3f7a, 0xa8503a];
    const GOODS = [
      [0xc9a24a, 0xb59a54],   // 麦与草料
      [0x8a6a3c, 0x6b4a2c],   // 皮革
      [0xc2c8cc, 0x8a8f94],   // 铁器
      [0xd9cdb6, 0xb8a882],   // 布匹
      [0x8a2f2f, 0x5a1f1f],   // 酒
      [0xc9a45e, 0x9a7a3c],   // 铜器
    ];

    for (let i = 0; i < 6; i++) {
      const x = -13.0 + i * 5.2;
      const hue = HUES[i];

      // 柜台
      const counter = box(3.2, 0.9, 1.5, M.wood);
      counter.position.set(x, 0.45, 0);
      g.add(counter);

      const topBoard = box(3.4, 0.1, 1.7, M.woodDark);
      topBoard.position.set(x, 0.95, 0);
      g.add(topBoard);

      // 四根柱子
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const p = cyl(0.05, 0.06, 2.4, 5, M.wood, false);
          p.position.set(x + sx * 1.55, 1.2, sz * 0.8);
          g.add(p);
        }
      }

      // 条纹布篷：前低后高
      const awning = box(3.6, 0.08, 2.1, CLOTH(hue));
      awning.position.set(x, 2.45, 0);
      awning.rotation.x = -0.12;
      awning.castShadow = true;
      g.add(awning);

      // 布篷下的阴影板
      const valance = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.36), CLOTH(hue));
      valance.position.set(x, 2.16, 1.0);
      g.add(valance);

      // 柜台上的货
      for (let k = 0; k < 4; k++) {
        const gx = x - 1.1 + k * 0.72;
        if (i === 0 || i === 5) {
          // 堆成小山的麦子 / 铜器
          const heap = new THREE.Mesh(
            new THREE.ConeGeometry(0.24, 0.3, 8),
            solid(GOODS[i][k % 2], { roughness: 1, flatShading: true })
          );
          heap.position.set(gx, 1.14, 0);
          g.add(heap);
        } else if (i === 3) {
          // 布匹：卷起来
          const roll = cyl(0.12, 0.12, 0.6, 8, solid(GOODS[i][k % 2]));
          roll.rotation.z = Math.PI / 2;
          roll.position.set(gx, 1.06, 0.2 * (k - 1.5));
          g.add(roll);
        } else {
          const item = box(0.34, 0.22, 0.34, solid(GOODS[i][k % 2], { roughness: 0.95 }));
          item.position.set(gx, 1.1, 0.1 * (k % 2));
          g.add(item);
        }
      }

      // 摊主的小凳
      const stool = cyl(0.22, 0.24, 0.5, 8, M.woodDark);
      stool.position.set(x + 0.9, 0.25, -1.3);
      g.add(stool);
    }
  }

  /* ---- 横跨街道的旗绳 ---- */
  {
    for (const x of [-10.4, -2.6, 5.2]) {
      for (const sz of [-1, 1]) {
        const pole = cyl(0.07, 0.09, 5.2, 6, M.woodDark);
        pole.position.set(x, 2.6, sz * 6.4);
        g.add(pole);
      }
      // 绳子按抛物线垂下去：用几段短柱拼
      const SEG = 10;
      for (let i = 0; i < SEG; i++) {
        const t = (i + 0.5) / SEG;
        const z = -6.4 + t * 12.8;
        const sag = Math.sin(t * Math.PI) * 0.9;
        const seg = box(0.04, 0.04, 1.3, M.rope, false);
        seg.position.set(x, 5.1 - sag, z);
        seg.rotation.x = -Math.cos(t * Math.PI) * 0.4;
        g.add(seg);
      }
      // 挂着的三角旗
      for (let i = 0; i < 9; i++) {
        const t = (i + 0.5) / 9;
        const z = -6.4 + t * 12.8;
        const sag = Math.sin(t * Math.PI) * 0.9;
        const tri = new THREE.Shape();
        tri.moveTo(-0.16, 0); tri.lineTo(0.16, 0); tri.lineTo(0, -0.34); tri.closePath();
        const flag = new THREE.Mesh(
          new THREE.ShapeGeometry(tri),
          CLOTH([0x9e2f2c, 0xc9a24a, 0x2c4f86, 0xe4d8bd][i % 4])
        );
        flag.position.set(x, 5.06 - sag, z);
        flag.rotation.y = Math.PI / 2;
        g.add(flag);
      }
    }
  }

  /* ---- 斗鸡圈：一圈矮栅围着一块空地 ---- */
  {
    const CX = 12.0, CZ = -1.0, R = 2.6;

    const dirt = new THREE.Mesh(new THREE.CircleGeometry(R, 20), solid(0x9a8562, { roughness: 1 }));
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.set(CX, 0.07, CZ);
    g.add(dirt);

    // 栅栏：立柱 + 两道横杆，围成圆（用 14 段近似）
    const N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const p = box(0.1, 0.85, 0.1, M.woodDark);
      p.position.set(CX + Math.cos(a) * R, 0.43, CZ + Math.sin(a) * R);
      g.add(p);
    }
    for (const hy of [0.35, 0.68]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.045, 4, N * 2), M.wood);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(CX, hy, CZ);
      g.add(ring);
    }

    // 两只鸡
    const HEN = [0x8a4a2c, 0xc9b48a];
    for (let i = 0; i < 2; i++) {
      const ck = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), solid(HEN[i], { roughness: 1, flatShading: true }));
      body.scale.set(1.3, 0.9, 0.9);
      body.position.y = 0.3;
      ck.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), solid(HEN[i], { roughness: 1, flatShading: true }));
      head.position.set(0.24, 0.46, 0);
      ck.add(head);

      const comb = box(0.08, 0.1, 0.04, solid(0x9e2f2c, { flatShading: true }), false);
      comb.position.set(0.24, 0.55, 0);
      ck.add(comb);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 4), solid(0xd8a03c));
      beak.position.set(0.34, 0.46, 0);
      beak.rotation.z = -Math.PI / 2;
      ck.add(beak);

      ck.position.set(CX + (i ? 0.6 : -0.6), 0, CZ + (i ? 0.4 : -0.3));
      ck.rotation.y = i ? 2.6 : 0.5;
      g.add(ck);
    }
  }

  /* ---- 小吃摊：一口吊锅、几张长凳 ---- */
  {
    const FX = -15.5, FZ = 5.0;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = cyl(0.05, 0.06, 1.8, 5, M.iron);
      leg.position.set(FX + Math.cos(a) * 0.5, 0.9, FZ + Math.sin(a) * 0.5);
      leg.rotation.z = -Math.cos(a) * 0.2;
      g.add(leg);
    }
    const pot = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 7, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
      M.iron
    );
    pot.position.set(FX, 1.35, FZ);
    g.add(pot);

    const fire = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), M.ember);
    fire.rotation.x = -Math.PI / 2;
    fire.position.set(FX, 0.1, FZ);
    g.add(fire);

    for (const [x, z, r] of [[FX + 2.2, FZ, 0.1], [FX + 3.6, FZ + 1.4, 1.4]]) {
      const bench = box(2.0, 0.12, 0.4, M.wood);
      bench.position.set(x, 0.45, z);
      bench.rotation.y = r;
      g.add(bench);
      for (const t of [-0.75, 0.75]) {
        const leg = box(0.12, 0.4, 0.34, M.woodDark);
        leg.position.set(x + Math.cos(r) * t, 0.2, z - Math.sin(r) * t);
        g.add(leg);
      }
    }
  }

  return g;
}

/* ============================================================
 *  4. 甲胄匠工坊：修补盔甲的帐篷，外面架着半成品
 * ========================================================== */
export function makeArmorerCamp(M) {
  const g = new THREE.Group();

  /* ---- 场地 ---- */
  {
    const pad = box(18, 0.08, 14, solid(0xa89877, { roughness: 1 }), false);
    pad.position.y = 0.04;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 帐篷：方顶大帐，前面敞开 ---- */
  {
    const W = 9.0, D = 6.4, H = 2.6;

    const floor = box(W, 0.1, D, solid(0x8d7a5c, { roughness: 1 }), false);
    floor.position.y = 0.05;
    g.add(floor);

    // 后墙与两侧：帆布
    const back = box(W, H, 0.12, CLOTH(0xd8cdb2));
    back.position.set(0, H / 2, -D / 2);
    g.add(back);

    for (const sx of [-1, 1]) {
      const side = box(0.12, H, D, CLOTH(0xd8cdb2));
      side.position.set(sx * W / 2, H / 2, 0);
      g.add(side);
    }

    // 顶：一整片三角截面的坡顶，省得两片板对不齐
    const roof = ridgeRoof(W + 0.8, D + 0.8, 1.5, CLOTH(0xd8cdb2));
    roof.position.y = H;
    roof.castShadow = true;
    g.add(roof);
    const ridge = cyl(0.08, 0.08, W + 0.6, 5, M.woodDark, false);
    ridge.rotation.z = Math.PI / 2;
    ridge.position.set(0, H + 1.48, 0);
    g.add(ridge);

    // 前檐的支柱
    for (const sx of [-1, 1]) {
      const p = cyl(0.09, 0.1, H + 1.0, 6, M.wood);
      p.position.set(sx * W / 2, (H + 1.0) / 2, D / 2);
      g.add(p);
    }

    // 门前挂的招牌：一块铁片
    const sign = box(1.4, 0.6, 0.08, M.iron);
    sign.position.set(-W / 2 + 0.9, H * 0.75, D / 2 + 0.2);
    sign.rotation.y = -0.2;
    g.add(sign);

    /* ---- 帐内：工作台、炉子、挂着的甲片 ---- */
    const bench = box(5.0, 0.16, 1.3, M.wood);
    bench.position.set(-1.0, 0.85, -1.6);
    g.add(bench);
    for (const sx of [-2.2, 2.2]) {
      const leg = box(0.2, 0.78, 1.1, M.woodDark);
      leg.position.set(-1.0 + sx, 0.4, -1.6);
      g.add(leg);
    }

    // 台上的半成品护胸
    const breast = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      M.iron
    );
    breast.rotation.x = Math.PI;
    breast.position.set(-2.0, 1.16, -1.6);
    breast.scale.set(1, 1, 0.6);
    g.add(breast);

    // 台面上的锤子与钳子
    for (const [x, r] of [[0.4, 0.3], [1.0, -0.5]]) {
      const hammer = box(0.1, 0.1, 0.36, M.iron, false);
      hammer.position.set(x, 0.97, -1.6);
      hammer.rotation.y = r;
      g.add(hammer);
      const handle = cyl(0.03, 0.03, 0.4, 4, M.wood, false);
      handle.position.set(x - 0.24, 0.97, -1.6);
      handle.rotation.z = Math.PI / 2;
      handle.rotation.y = r;
      g.add(handle);
    }

    // 挂甲架：一根横杆，上面挂着三件甲片
    const hangBar = box(3.6, 0.1, 0.1, M.iron);
    hangBar.position.set(2.4, 2.1, -2.4);
    g.add(hangBar);
    for (let i = 0; i < 3; i++) {
      const piece = box(0.6, 0.8, 0.1, M.iron);
      piece.position.set(1.4 + i * 1.0, 1.68, -2.4);
      piece.rotation.x = 0.06;
      g.add(piece);
    }

    // 炉子（帐外，靠西侧）
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2, 0),
        solid(0x6e6a5e, { roughness: 1, flatShading: true })
      );
      st.position.set(-W / 2 - 1.4 + Math.cos(a) * 0.7, 0.13, 1.6 + Math.sin(a) * 0.7);
      g.add(st);
    }
    const ember = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), M.ember);
    ember.rotation.x = -Math.PI / 2;
    ember.position.set(-W / 2 - 1.4, 0.15, 1.6);
    g.add(ember);

    // 风箱
    const bellow = box(1.0, 0.5, 0.5, M.wood);
    bellow.position.set(-W / 2 - 2.4, 0.3, 2.6);
    g.add(bellow);
    const pipe = cyl(0.09, 0.09, 0.9, 6, M.iron, false);
    pipe.position.set(-W / 2 - 1.7, 0.45, 2.2);
    pipe.rotation.z = 0.5;
    g.add(pipe);
  }

  /* ---- 帐外：三个穿戴着的甲人像（用于试合身） ---- */
  {
    const SPOTS = [[6.4, 2.4, -0.4], [6.8, -0.6, 0.3], [5.2, 5.0, -0.9]];
    for (const [x, z, r] of SPOTS) {
      const frame = new THREE.Group();

      // 木架
      const pole = cyl(0.07, 0.09, 1.9, 5, M.woodDark);
      pole.position.y = 0.95;
      frame.add(pole);
      const foot = box(1.0, 0.1, 0.1, M.woodDark);
      foot.position.y = 0.06;
      frame.add(foot);
      const foot2 = box(0.1, 0.1, 1.0, M.woodDark);
      foot2.position.y = 0.06;
      frame.add(foot2);

      // 甲胄：胸甲、肩甲、头盔
      const chest = box(0.6, 0.75, 0.36, M.iron);
      chest.position.y = 1.42;
      frame.add(chest);

      for (const sx of [-1, 1]) {
        const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), M.iron);
        pauldron.scale.set(1, 0.72, 0.9);
        pauldron.position.set(sx * 0.42, 1.78, 0);
        frame.add(pauldron);
      }

      const helm = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
        M.iron
      );
      helm.position.y = 2.06;
      frame.add(helm);

      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 4, 12), M.iron);
      brim.rotation.x = Math.PI / 2;
      brim.position.y = 1.92;
      frame.add(brim);

      // 挂在架上的围裙
      const apron = box(0.5, 0.7, 0.06, solid(0x7a5f42, { roughness: 1 }));
      apron.position.y = 0.9;
      frame.add(apron);

      frame.position.set(x, 0, z);
      frame.rotation.y = r;
      g.add(frame);
    }
  }

  /* ---- 晾着的锁子甲与甲片 ---- */
  {
    const line = box(5.0, 0.05, 0.05, M.rope, false);
    line.position.set(-6.2, 2.2, 4.4);
    g.add(line);

    for (let i = 0; i < 3; i++) {
      // 锁子甲：一整片暗色的网，用密集的小环堆出来太贵，这里用薄板压暗
      const mesh = box(1.1, 1.3, 0.08, solid(0x4a4a4e, { roughness: 0.65, metalness: 0.55 }));
      mesh.position.set(-8.0 + i * 1.8, 1.55, 4.4);
      mesh.rotation.x = 0.04;
      g.add(mesh);
    }

    for (const x of [-8.4, -4.0]) {
      const p = cyl(0.05, 0.06, 2.3, 5, M.wood);
      p.position.set(x, 1.15, 4.4);
      g.add(p);
    }
  }

  return g;
}

/* ============================================================
 *  5. 伤兵帐：一位外科医生、一张手术台、几排草垫
 * ========================================================== */
export function makeSurgeonTent(M) {
  const g = new THREE.Group();

  /* ---- 场地 ---- */
  {
    const pad = box(16, 0.07, 14, solid(0xa89472, { roughness: 1 }), false);
    pad.position.y = 0.035;
    pad.receiveShadow = true;
    g.add(pad);
  }

  /* ---- 主帐：四角撑起的圆锥顶帐篷 ---- */
  {
    const R = 4.6, H = 5.2;

    // 地面
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R - 0.3, 18), solid(0x8d7a5c, { roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.06;
    g.add(floor);

    // 帐布：圆锥
    const canvas = new THREE.Mesh(
      new THREE.ConeGeometry(R, H, 14, 1, true),
      CLOTH(0xd2c6ab)
    );
    canvas.position.y = H / 2;
    canvas.castShadow = true;
    canvas.receiveShadow = true;
    g.add(canvas);

    // 顶部烟口：一圈深色
    const vent = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 10), solid(0x2a241c));
    vent.position.y = H - 0.2;
    g.add(vent);

    // 中央旗杆
    const pole = cyl(0.07, 0.08, H + 1.6, 6, M.woodDark);
    pole.position.y = (H + 1.6) / 2;
    g.add(pole);

    // 杆顶的红十字旗——伤兵帐的标志
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), CLOTH(0xe4d8bd));
    flag.position.set(0.72, H + 1.2, 0);
    flag.castShadow = true;
    g.add(flag);
    const crossV = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.62), CLOTH(0x9e2f2c));
    crossV.position.set(0.72, H + 1.2, 0.012);
    g.add(crossV);
    const crossH = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.24), CLOTH(0x9e2f2c));
    crossH.position.set(0.72, H + 1.2, 0.012);
    g.add(crossH);

    // 帐口：掀开的门帘
    for (const sx of [-1, 1]) {
      const flap = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.4), CLOTH(0xd8cdb2));
      flap.position.set(sx * 0.85, 1.2, R * 0.78);
      flap.rotation.y = sx * 0.75;
      g.add(flap);
    }

    /* ---- 帐内：手术台 ---- */
    const table = box(2.4, 0.16, 0.9, M.wood);
    table.position.set(0.4, 1.05, -0.6);
    g.add(table);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = box(0.14, 1.0, 0.14, M.woodDark);
      leg.position.set(0.4 + sx * 1.0, 0.5, -0.6 + sz * 0.32);
      g.add(leg);
    }

    // 台上铺的布与器械
    const sheet = box(2.2, 0.06, 0.8, solid(0xd9cdb6, { roughness: 1 }), false);
    sheet.position.set(0.4, 1.16, -0.6);
    g.add(sheet);

    for (let i = 0; i < 3; i++) {
      const tool = cyl(0.02, 0.025, 0.34, 4, M.iron, false);
      tool.position.set(-0.2 + i * 0.28, 1.21, -0.75);
      tool.rotation.z = Math.PI / 2;
      g.add(tool);
    }

    // 药罐与绷带卷
    const jar = cyl(0.1, 0.12, 0.24, 8, M.woodDark, false);
    jar.position.set(1.3, 1.29, -0.5);
    g.add(jar);
    const bandage = cyl(0.09, 0.09, 0.2, 8, solid(0xd9cdb6), false);
    bandage.rotation.z = Math.PI / 2;
    bandage.position.set(1.1, 1.27, -0.85);
    g.add(bandage);

    // 帐内两盏吊灯（由 main.js 点亮）
    g.userData.lampSpots = [
      new THREE.Vector3(-1.2, 2.4, 0.8),
      new THREE.Vector3(1.6, 2.2, -0.2),
    ];
  }

  /* ---- 帐外的草垫：四个躺着伤员的铺位 ---- */
  {
    const SLOTS = [[-6.4, 3.2, 0.2], [-4.0, 5.4, 1.3], [5.6, 4.6, -0.6], [6.8, 1.8, 1.8]];

    for (const [x, z, r] of SLOTS) {
      const pad = box(2.1, 0.18, 1.0, M.straw, false);
      pad.position.set(x, 0.09, z);
      pad.rotation.y = r;
      g.add(pad);

      // 毯子
      const blanket = box(1.4, 0.12, 0.95, solid(0x5f6b72, { roughness: 1 }), false);
      blanket.position.set(x, 0.2, z);
      blanket.rotation.y = r;
      g.add(blanket);

      // 枕着的小包袱
      const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), solid(0xd9cdb6));
      pillow.scale.set(1.2, 0.7, 1);
      pillow.position.set(x - Math.cos(r) * 0.85, 0.24, z + Math.sin(r) * 0.85);
      g.add(pillow);
    }
  }

  /* ---- 一个烧水的小火塘与晾着的绷带 ---- */
  {
    const FX = -3.4, FZ = -4.6;

    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.19, 0),
        solid(0x6e6a5e, { roughness: 1, flatShading: true })
      );
      st.position.set(FX + Math.cos(a) * 0.75, 0.12, FZ + Math.sin(a) * 0.75);
      g.add(st);
    }
    const ember = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), M.ember);
    ember.rotation.x = -Math.PI / 2;
    ember.position.set(FX, 0.13, FZ);
    g.add(ember);

    // 支架上的水壶
    for (const sx of [-1, 1]) {
      const leg = cyl(0.04, 0.05, 1.3, 5, M.iron);
      leg.position.set(FX + sx * 0.55, 0.65, FZ);
      leg.rotation.z = -sx * 0.18;
      g.add(leg);
    }
    const bar = box(1.4, 0.06, 0.06, M.iron, false);
    bar.position.set(FX, 1.3, FZ);
    g.add(bar);

    const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.28, 9, 7), M.iron);
    kettle.scale.set(1, 0.85, 1);
    kettle.position.set(FX, 1.0, FZ);
    g.add(kettle);
    const spout = cyl(0.04, 0.06, 0.3, 6, M.iron, false);
    spout.position.set(FX + 0.3, 1.06, FZ);
    spout.rotation.z = -0.9;
    g.add(spout);

    // 绷带晾绳
    for (const x of [2.6, 7.2]) {
      const p = cyl(0.05, 0.06, 2.2, 5, M.wood);
      p.position.set(x, 1.1, 7.0);
      g.add(p);
    }
    const rope = box(4.8, 0.03, 0.03, M.rope, false);
    rope.position.set(4.9, 2.1, 7.0);
    g.add(rope);

    for (let i = 0; i < 6; i++) {
      const band = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.9), solid(0xe4dcd0, { side: THREE.DoubleSide }));
      band.position.set(3.1 + i * 0.72, 1.66, 7.0);
      band.rotation.y = 0.06;
      g.add(band);
    }
  }

  /* ---- 帐外的两辆担架车 ---- */
  {
    for (const [x, z, r] of [[-7.2, -2.4, 0.6], [-8.6, -4.6, 0.2]]) {
      const cart = new THREE.Group();

      const bed = box(2.4, 0.1, 0.8, M.wood);
      bed.position.y = 0.6;
      cart.add(bed);

      for (const sx of [-1, 1]) {
        const rail = box(2.4, 0.28, 0.07, M.woodDark);
        rail.position.set(0, 0.76, sx * 0.4);
        cart.add(rail);
      }

      for (const sx of [-0.85, 0.85]) {
        for (const sz of [-1, 1]) {
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 4, 12), M.timber);
          wheel.position.set(sx, 0.34, sz * 0.46);
          cart.add(wheel);
        }
      }

      // 车辕
      const shaft = cyl(0.05, 0.06, 1.4, 5, M.woodDark);
      shaft.position.set(1.8, 0.5, 0);
      shaft.rotation.z = Math.PI / 2 - 0.1;
      cart.add(shaft);

      cart.position.set(x, 0, z);
      cart.rotation.y = r;
      g.add(cart);
    }
  }

  return g;
}
