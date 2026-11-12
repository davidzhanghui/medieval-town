import * as THREE from 'three';

/* ============================================================
 *  云顶修道院 Skyhold
 *
 *  一根八十八米高的砂岩石柱，顶上是修道院：赤陶屋顶的小教堂、
 *  带拱窗的钟楼、一排修士的单人房，边缘一圈石栏。
 *  石柱脚下是朝圣者的村子；一条石阶沿着岩壁盘上去，
 *  另一条路是一只吊篮——悬在崖外的绳子上，每隔一会儿升降一次。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;

  const rockMat = P.std('sky:rock', { vertexColors: true, roughness: 1, flatShading: true });
  const terracotta = P.terracotta;
  const sand = P.tint('stone', 0xd8c090);
  const sandL = P.tint('stone', 0xe8d8b0);
  const wallH = P.wash(0xeadbb0);

  const dirt = P.flat(0xa08a64, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  T.add(K.groundPatch(120, dirt, { segs: 44 }), 0, 0, 0, 0.03);

  /* ---------- 石柱几何 ---------- */
  const H = 88;
  /** 石柱在高度比例 t（0=地面，1=顶）、方位角 a 处的半径 */
  function radiusAt(t, a, seed = 1, R = 1, taper = 1) {
    const base = (14 + 13 * Math.exp(-t * 9) + 2.2 * Math.sin(t * 9 + seed) + 5 * smooth(0.72, 0.96, t)) * R;
    // 多层不同频率的角向起伏 + 随高度变化的斜纹：让岩壁有棱有面，不像一块飘着的布
    // 岩层按高度分成十六段，每一段的角向相位都错开一点：断层、岩棚、台阶，而不是一整条垂直的褶
    const band = Math.floor(t * 16);
    const ledge = 1 + 0.07 * Math.sin(a * 6 + band * 1.9 + seed) + (band % 3 === 0 ? 0.05 : -0.025);
    const wob = (1 + 0.15 * Math.sin(3 * a + seed) + 0.09 * Math.sin(5 * a - 1.7 * seed) + 0.06 * Math.sin(9 * a + 2.3 * seed)
      + 0.04 * Math.sin(13 * a + 0.7 * seed + t * 6)) * ledge;
    return base * wob * taper;
  }
  function smooth(e0, e1, x) {
    const k = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return k * k * (3 - 2 * k);
  }

  function makePillar({ h = H, R = 1, seed = 1, rings = 30, segs = 30, topColor = 0x8a9a5a } = {}) {
    const verts = [];
    const cols = [];
    const idx = [];
    const c = new THREE.Color();
    const lo = new THREE.Color(0xb8996a);
    const hi = new THREE.Color(0xdcc494);
    const dk = new THREE.Color(0x8a6e4a);
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      const y = t * h;
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const r = radiusAt(t, a, seed, R);
        verts.push(Math.cos(a) * r, y, Math.sin(a) * r);
        // 沉积层的明暗带 + 雨水冲刷的竖向暗痕
        const band = 0.5 + 0.5 * Math.sin(t * 46 + Math.sin(a * 3 + seed) * 1.4);
        c.copy(lo).lerp(hi, band * 0.8);
        c.lerp(dk, (Math.floor(t * 16) % 2) * 0.18);   // 隔一层深一层，岩棚的阴影
        const streak = Math.max(0, Math.sin(a * 7 + seed * 2) - 0.7) * 1.4;
        c.lerp(dk, Math.min(0.6, streak));
        if (t < 0.06) c.lerp(new THREE.Color(0x7a7a4a), 1 - t / 0.06);   // 脚下长草
        cols.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j;
        const b = a + segs + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    // 顶面：扇形
    const topStart = verts.length / 3;
    verts.push(0, h, 0);
    cols.push(...new THREE.Color(topColor).toArray());
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const r = radiusAt(1, a, seed, R);
      verts.push(Math.cos(a) * r, h, Math.sin(a) * r);
      cols.push(...new THREE.Color(topColor).toArray());
    }
    for (let j = 0; j < segs; j++) idx.push(topStart, topStart + 1 + j, topStart + 2 + j);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, rockMat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  /* ================= 主石柱 ================= */
  const MAIN = { x: 0, z: -20 };
  const pillar = makePillar({ seed: 2.1 });
  T.add(pillar, MAIN.x, MAIN.z);
  const topR = (a) => radiusAt(1, a, 2.1);
  const surfR = (t, a) => radiusAt(t, a, 2.1);

  // 周围的小石柱：只是景观
  const spires = [
    { x: -62, z: -70, h: 56, R: 0.55, seed: 4.2 }, { x: 70, z: -58, h: 66, R: 0.62, seed: 5.7 },
    { x: -96, z: 8, h: 42, R: 0.46, seed: 8.1 }, { x: 102, z: 20, h: 50, R: 0.5, seed: 9.3 },
    { x: -30, z: -120, h: 70, R: 0.7, seed: 11.2 }, { x: 44, z: -124, h: 44, R: 0.45, seed: 12.6 },
  ];
  for (const s of spires) T.add(makePillar({ h: s.h, R: s.R, seed: s.seed, rings: 22, segs: 24 }), s.x, s.z);

  // 隐修士的小石柱：与主柱之间一座吊桥
  const HERMIT = { x: 44, z: -34, h: 70, R: 0.5, seed: 6.4 };
  T.add(makePillar({ h: HERMIT.h, R: HERMIT.R, seed: HERMIT.seed, rings: 24, segs: 26 }), HERMIT.x, HERMIT.z);

  /* ================= 顶上的修道院 ================= */
  {
    const g = new THREE.Group();
    g.position.set(MAIN.x, H, MAIN.z);   // 局部原点放在顶面中心
    const parts = new THREE.Group();

    // 小教堂（中殿 + 半球顶）
    const nave = K.makeHouse(P, {
      w: 7, d: 12, floors: 1, floorH: 5.4, wall: wallH, base: sand, baseH: 0.6,
      roof: 'gable', roofMat: terracotta, pitch: 0.42, windows: 1, door: P.woodDark, chimney: false,
    });
    nave.position.set(-2, 0, -1);
    nave.rotation.y = 0.2;
    parts.add(nave);
    const drum = cyl(2.6, 2.8, 2.0, 12, wallH);
    drum.position.set(-2.3, 7.4, -3.2);
    parts.add(drum);
    const dome = K.dome(2.7, P.copper);
    dome.position.set(-2.3, 8.4, -3.2);
    parts.add(dome);
    const cross = box(0.14, 1.2, 0.14, P.iron);
    cross.position.set(-2.3, 11.6, -3.2);
    parts.add(cross);
    const cross2 = box(0.6, 0.14, 0.14, P.iron);
    cross2.position.set(-2.3, 11.9, -3.2);
    parts.add(cross2);

    // 钟楼
    const bt = box(3.6, 12, 3.6, wallH);
    bt.position.set(5.8, 6, -4);
    parts.add(bt);
    for (const yy of [8.6, 10.2]) {
      for (const s of [-1, 1]) {
        const a1 = box(0.9, 1.4, 0.2, P.dark, false);
        a1.position.set(5.8 + s * 0.9, yy, -4 + 1.82);
        parts.add(a1);
        const a2 = box(0.2, 1.4, 0.9, P.dark, false);
        a2.position.set(5.8 + 1.82, yy, -4 + s * 0.9);
        parts.add(a2);
      }
    }
    const btc = cone(2.8, 3.0, 4, terracotta);
    btc.rotation.y = Math.PI / 4;
    btc.position.set(5.8, 13.5, -4);
    parts.add(btc);
    // 钟挂在钟亭的横梁下：敲钟的时候来回摆
    const bellPivot = new THREE.Group();
    bellPivot.position.set(5.8, 10.2, -4);
    bellPivot.userData.keepSeparate = true;
    const bell = cyl(0.3, 0.55, 0.7, 8, P.iron);
    bell.position.y = -0.8;
    bellPivot.add(bell);
    parts.add(bellPivot);
    T.animate((dt, t) => {
      const c = t % 22;
      bellPivot.rotation.z = c < 7 ? Math.sin(t * 4.6) * 0.5 * Math.min(1, c / 1.0) * Math.min(1, (7 - c) / 1.5) : 0;
    });

    // 修士单人房：两排小屋
    for (let i = 0; i < 5; i++) {
      const a = (-0.2 + i * 0.45) * 1;
      const cell = K.makeHouse(P, {
        w: 3.4, d: 3.8, floors: 1, floorH: 2.6, wall: wallH, base: sand, baseH: 0.4,
        roof: 'gable', roofMat: terracotta, pitch: 0.5, windows: 1, door: P.woodDark, chimney: i % 2 === 0, over: 0.3,
      });
      const ang = Math.PI * 0.55 + i * 0.5;
      const rr = 11;
      cell.position.set(Math.cos(ang) * rr, 0, Math.sin(ang) * rr);
      cell.rotation.y = -ang + Math.PI / 2 + Math.PI;
      parts.add(cell);
      if (cell.userData.chimney) {
        const wp = cell.userData.chimney.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), cell.rotation.y).add(cell.position);
        T.smokeFrom(g, wp);
      }
    }
    // 食堂：长屋
    const ref = K.makeHouse(P, {
      w: 10, d: 5.4, floors: 1, floorH: 3.4, wall: wallH, base: sand, baseH: 0.5,
      roof: 'gable', roofMat: terracotta, pitch: 0.46, windows: 4, door: P.woodDark, chimney: true,
    });
    ref.position.set(1, 0, 8.8);
    ref.rotation.y = Math.PI;
    parts.add(ref);
    T.smokeFrom(g, ref.userData.chimney.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI).add(ref.position));

    // 崖边石栏：沿顶面轮廓一圈矮墙
    const rimPts = [];
    for (let j = 0; j <= 40; j++) {
      const a = (j / 40) * Math.PI * 2;
      const r = topR(a) - 0.7;
      rimPts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    parts.add(K.wallAlong(rimPts, { h: 1.1, thick: 0.5, y0: 0, mat: sandL }));

    // 外挑的吊臂（吊篮的滑轮）：从崖边伸出去
    const outA = 0.0;       // 朝 +X
    const edgeR = topR(outA);
    const beam = box(14, 0.5, 0.5, P.timber);
    beam.position.set(edgeR - 2 + 7 - 1, 3.4, 0);
    parts.add(beam);
    for (const s of [-1, 1]) {
      const sup = box(0.4, 3.6, 0.4, P.timber);
      sup.position.set(edgeR - 3, 1.8, s * 1.2);
      parts.add(sup);
      const br = box(0.3, 5, 0.3, P.timber);
      br.position.set(edgeR + 1.8, 1.4, s * 1.2);
      br.rotation.z = 0.7;
      parts.add(br);
    }
    const winch = new THREE.Group();
    const drumW = cyl(0.7, 0.7, 2.6, 10, P.wood);
    drumW.rotation.x = Math.PI / 2;
    winch.add(drumW);
    for (const s of [-1, 1]) {
      const h = box(0.1, 0.1, 2.0, P.wood);
      h.position.set(0, 0, s * 1.6);
      winch.add(h);
    }
    winch.position.set(edgeR - 3.4, 2.3, 0);
    winch.userData.keepSeparate = true;
    parts.add(winch);
    g.userData.winch = winch;

    // 花园小台地 + 柏树
    const garden = box(7, 0.4, 5, P.flat(0x6a8a3a, 1));
    garden.position.set(-9.5, 0.2, 5);
    parts.add(garden);
    const cy = [];
    for (let i = 0; i < 5; i++) cy.push({ x: -12 + i * 1.8, y: 2.8, z: 3.2, sx: 0.9, sy: 1.2, sz: 0.9 });
    parts.add(K.scatter(new THREE.ConeGeometry(0.8, 5.2, 6), P.flat(0x2a4a2e, 1, { flatShading: true }), cy));
    // 水池
    const cis = cyl(1.4, 1.5, 0.7, 10, sandL);
    cis.position.set(3, 0.35, 3);
    parts.add(cis);
    const cw = cyl(1.2, 1.2, 0.05, 10, P.water, false);
    cw.position.set(3, 0.7, 3);
    parts.add(cw);

    g.add(parts);
    // 顶上的灯
    T.glow(MAIN.x + 5.8, H + 10, MAIN.z - 4, { color: 0xffb060, size: 4, light: false });
    T.landmark(g, MAIN.x, MAIN.z, 0, {
      name: '云顶修道院 · Skyhold Monastery',
      shortName: '修道院',
      tag: '悬在半空的祈祷',
      desc: '八十八米高的石柱顶上，一座赤陶屋顶的小教堂配一枚铜绿的半球顶，旁边是带拱窗的钟楼，一圈修士的单人房围着一方花园，边缘一圈矮石栏；崖外伸出一根木吊臂，下面垂着一根长长的绳子，一直放到谷底。',
      detail: '希腊的"迈泰奥拉"（Meteora）修道院是真实的原型：十四世纪的修士为了躲避战乱和土耳其人的劫掠，一个个爬到了几十米高的岩柱顶上。他们靠吊篮和绳梯往上送物资——据说绳子要用到"断了才换"，所以到今天还有人说"绳子断了才算命数到了"。',
    }, { dist: 130, height: 120, ty: 70, rot: -1.9 });
    g.position.set(MAIN.x, H, MAIN.z);
  }

  /* ================= 岩梯：沿石柱盘旋而上 ================= */
  {
    const g = new THREE.Group();
    const items = [];
    const posts = [];
    const N = 210;
    for (let i = 0; i < N; i++) {
      const t = 0.03 + (i / N) * 0.95;
      const a = 2.4 + i * 0.105;
      const r = surfR(t, a) + 0.9;
      const y = t * H;
      items.push({ x: Math.cos(a) * r, y: y, z: Math.sin(a) * r, ry: -a, sx: 2.2, sy: 0.22, sz: 1.0 });
      if (i % 5 === 0) posts.push({ x: Math.cos(a) * (r + 1.0), y: y + 0.8, z: Math.sin(a) * (r + 1.0), sx: 0.1, sy: 1.5, sz: 0.1 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), sandL, items));
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.wood, posts));
    // 每隔几十步一座小平台
    for (let k = 1; k <= 3; k++) {
      const t = 0.03 + (k / 4) * 0.95;
      const a = 2.4 + Math.floor(t * N) * 0.105;
      const r = surfR(t, a) + 1.0;
      const pl = box(3.4, 0.3, 3.4, P.woodDark);
      pl.position.set(Math.cos(a) * r, t * H + 0.1, Math.sin(a) * r);
      pl.rotation.y = -a;
      g.add(pl);
    }
    T.landmark(g, MAIN.x, MAIN.z, 0, {
      name: '岩梯 · The Rock Stair',
      shortName: '岩梯',
      tag: '一千级台阶',
      desc: '沿着石柱盘旋而上的石阶，两侧立着细木桩，每隔一段有一座小木平台供人歇脚；从谷底一路爬到顶上，足足要走一小时。',
      detail: '迈泰奥拉的岩梯是十五世纪才凿出来的：此前上山只能靠吊篮和绳梯，修士们不欢迎外人。后来朝圣者越来越多，才在岩壁上一级一级凿出台阶——据说开凿的石匠，完工后一个都没有下山。',
    }, { dist: 70, height: 46, ty: 30, rot: 2.4, });
  }

  /* ================= 吊篮：沿一根斜拉的缆绳升降 =================
   * 石柱脚下有一圈外扩的岩盘（半径能到 40 米），垂直的绳子会插进岩石里，
   * 所以缆绳从崖顶外挑的吊臂斜拉到岩盘外的货台，吊篮沿它滑行。 */
  {
    const edgeR = topR(0);
    const A = new THREE.Vector3(MAIN.x + edgeR + 9, H + 2.3, MAIN.z);
    const B = new THREE.Vector3(MAIN.x + 48, 2.0, MAIN.z);
    const dirv = new THREE.Vector3().subVectors(A, B);
    const Lc = dirv.length();
    const cable = cyl(0.09, 0.09, Lc, 4, P.rope, false);
    T.add(cable, 0, 0);   // add 会重写 rotation（连带 quaternion），所以朝向要在它之后设
    cable.position.copy(B).addScaledVector(dirv, 0.5);
    cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirv.clone().normalize());
    // 货台端的立架
    const post = box(0.5, 6, 0.5, P.timber);
    post.position.set(B.x + 1.5, 3, B.z);
    T.add(post, 0, 0);
    post.position.set(B.x + 1.5, 3, B.z);

    const basket = new THREE.Group();
    const floor = box(2.2, 0.18, 2.2, P.woodDark);
    basket.add(floor);
    for (const [sx, sz, w, d] of [[0, 1.05, 2.2, 0.1], [0, -1.05, 2.2, 0.1], [1.05, 0, 0.1, 2.0], [-1.05, 0, 0.1, 2.0]]) {
      const wl = box(w, 0.9, d, P.flat(0x9a7a4a, 1));
      wl.position.set(sx, 0.55, sz);
      basket.add(wl);
    }
    const cargo = box(0.9, 0.7, 0.9, P.wood);
    cargo.position.set(0.2, 0.55, 0);
    basket.add(cargo);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const r2 = cyl(0.03, 0.03, 2.6, 4, P.rope, false);
      r2.position.set(sx * 0.5, 1.9, sz * 0.5);
      r2.rotation.z = sx * 0.3;
      r2.rotation.x = -sz * 0.3;
      basket.add(r2);
    }
    T.dynamic(basket);
    T.add(basket, B.x, B.z, 0, B.y);
    T.animate((dt, t) => {
      // 34 秒一个来回：升到顶、停一会、落到底、停一会
      const p = (t % 34) / 34;
      let k;
      if (p < 0.4) k = p / 0.4;
      else if (p < 0.5) k = 1;
      else if (p < 0.9) k = 1 - (p - 0.5) / 0.4;
      else k = 0;
      const e = k * k * (3 - 2 * k);
      basket.position.set(B.x + (A.x - B.x) * e, B.y + (A.y - B.y) * e - 2.6, B.z);
      basket.rotation.y = Math.sin(t * 0.6) * 0.15;
    });

    // 脚下的绞车房 / 货台
    const g = new THREE.Group();
    const hut = K.makeHouse(P, {
      w: 5.6, d: 5, floors: 1, floorH: 3.0, wall: wallH, base: sand, baseH: 0.4,
      roof: 'gable', roofMat: terracotta, pitch: 0.55, windows: 1, door: P.woodDark, chimney: false,
    });
    g.add(hut);
    const dock = box(5.5, 0.5, 4.5, P.woodDark);
    dock.position.set(-6.5, 0.25, 0);
    g.add(dock);
    for (let i = 0; i < 4; i++) {
      const sack = sphere(0.4, P.flat(0xcdbf9a, 1));
      sack.scale.set(1, 0.7, 0.8);
      sack.position.set(-5.4 - (i % 2) * 0.9, 0.85, -1 + Math.floor(i / 2) * 1.2);
      g.add(sack);
    }
    const bs = K.barrelStack(P, { rows: 2, cols: 2 });
    bs.position.set(-9, 0.5, 1.4);
    g.add(bs);
    T.landmark(g, B.x + 8, B.z, -Math.PI / 2, {
      name: '吊篮 · The Basket Lift',
      shortName: '吊篮',
      tag: '修士们的电梯',
      desc: '岩盘外的货台上有一间小石屋，台边码着面袋、酒桶；一根粗缆从八十几米高的崖顶斜斜拉下来，缆上挂着一只藤条编的吊篮，每隔十几秒升到崖顶，再慢慢落回来。',
      detail: '朝圣者和货物都靠它：把东西放进篮里，摇铃通知上面的修士，上面就绞盘一圈圈卷绳。据说最紧张的是人：爬篮的人要闭着眼，因为一阵风就能让篮子在八十米空中转几圈。',
    }, { dist: 105, height: 48, ty: 38, rot: 0.15, ox: (A.x - B.x) / 2 - 8 });   // 缆绳沿 x 铺开，从侧面（+z）看才摊得开
  }

  /* ================= 隐修士的小石柱与吊桥 ================= */
  {
    const g = new THREE.Group();
    g.position.set(HERMIT.x, HERMIT.h, HERMIT.z);
    const cell = K.makeHouse(P, {
      w: 3.6, d: 4, floors: 1, floorH: 2.6, wall: wallH, base: sand, baseH: 0.4,
      roof: 'gable', roofMat: terracotta, pitch: 0.55, windows: 1, door: P.woodDark, chimney: true,
    });
    cell.position.set(0, 0, 0);
    g.add(cell);
    T.smokeFrom(g, cell.userData.chimney);
    const sc = box(0.14, 1.6, 0.14, P.iron);
    sc.position.set(2.4, 1.0, 1.4);
    g.add(sc);
    const sc2 = box(0.6, 0.14, 0.14, P.iron);
    sc2.position.set(2.4, 1.5, 1.4);
    g.add(sc2);
    T.landmark(g, HERMIT.x, HERMIT.z, 0, {
      name: '隐修士的石柱 · The Hermit’s Spire',
      shortName: '隐修士',
      tag: '比修道院更高的孤独',
      desc: '主柱东边七十米高的另一根细石柱，顶上只有一间单人小屋，屋前插着一个铁十字。一座木吊桥从主柱顶垂过来，可是桥板稀稀拉拉，似乎不常有人走。',
      detail: '"柱头修士"（Stylites）是早期基督教最极端的隐修：圣西蒙在叙利亚的一根柱子顶上住了三十七年，靠人用篮子吊饭。他们认为离地越远越接近天堂——可想而知，这类人在当时是公认的"圣人"，也是最麻烦的"圣人"：围观的人堵得山路都走不通。',
    }, { dist: 52, height: 90, ty: 70, rot: -1.9 });
    g.position.set(HERMIT.x, HERMIT.h, HERMIT.z);
    // 吊桥：主柱顶 → 隐修士柱顶（高差 18，所以是斜的）
    const A = new THREE.Vector3(MAIN.x + topR(0.1) * 0.9 * Math.cos(0.1), H + 0.5, MAIN.z + topR(0.1) * 0.9 * Math.sin(0.1));
    const B = new THREE.Vector3(HERMIT.x - 4.5, HERMIT.h + 0.3, HERMIT.z + 1.4);
    const L = A.distanceTo(B);
    const n = Math.floor(L / 0.9);
    const planks = [];
    const ropes = [];
    const dir = new THREE.Vector3().subVectors(B, A);
    const yaw = Math.atan2(dir.x, dir.z);
    for (let i = 0; i <= n; i++) {
      const tt = i / n;
      const p = new THREE.Vector3().lerpVectors(A, B, tt);
      p.y -= Math.sin(tt * Math.PI) * 1.6;
      if (i % 2 === 0 || rand() < 0.7) planks.push({ x: p.x, y: p.y, z: p.z, ry: yaw, sx: 1.5, sy: 0.08, sz: 0.5 });
      for (const s of [-1, 1]) {
        const off = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(s * 0.8);
        ropes.push({ x: p.x + off.x, y: p.y + 0.95, z: p.z + off.z, ry: yaw, sx: 0.05, sy: 0.05, sz: L / n + 0.1 });
      }
    }
    T.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.woodDark, planks), 0, 0);
    T.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.rope, ropes), 0, 0);
  }

  /* ================= 脚下的朝圣者村 ================= */
  {
    // 环绕石柱的一圈石屋：赤陶顶，窗上是蓝漆
    const ring = [];
    const taken = [{ x: MAIN.x, z: MAIN.z, r: 40 }, { x: HERMIT.x, z: HERMIT.z, r: 16 }, { x: MAIN.x + topR(0) + 4, z: MAIN.z, r: 14 }];
    for (const s of spires) taken.push({ x: s.x, z: s.z, r: 12 + 20 * s.R });
    let placed = 0;
    let guard = 0;
    while (placed < 16 && guard < 700) {
      guard++;
      const a = rand() * Math.PI * 2;
      const r = rand.range(44, 108);
      const x = MAIN.x + Math.cos(a) * r;
      const z = MAIN.z + Math.sin(a) * r;
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r)) continue;
      T.house({
        w: rand.range(4.8, 6.4), d: rand.range(4.6, 5.8), floors: rand() < 0.4 ? 2 : 1, floorH: 2.7,
        wall: rand() < 0.5 ? wallH : sandL, base: sand, baseH: 0.5, roof: 'gable', roofMat: terracotta, pitch: 0.5,
        windows: 2, shutter: 0x2f5a8a, chimney: rand() < 0.7, over: 0.4,
      }, x, z, -a + Math.PI / 2 + (rand() < 0.5 ? 0 : Math.PI));
      taken.push({ x, z, r: 9 });
      placed++;
    }
    // 朝圣者客栈
    const inn = new THREE.Group();
    const main = K.makeHouse(P, {
      w: 14, d: 8, floors: 2, floorH: 3.2, wall: wallH, base: sand, baseH: 0.7,
      roof: 'gable', roofMat: terracotta, pitch: 0.46, windows: 4, shutter: 0x2f5a8a, chimney: true, porch: true, over: 0.7,
    });
    inn.add(main);
    T.smokeFrom(inn, main.userData.chimney);
    const bench = box(3, 0.12, 0.5, P.wood);
    bench.position.set(-4, 0.5, 5.2);
    inn.add(bench);
    for (let i = 0; i < 3; i++) {
      const bd = box(0.8, 0.8, 0.8, P.flat(0x9a7a4a, 1));
      bd.position.set(5 + i * 1.0, 0.4, 5.6);
      inn.add(bd);
    }
    T.landmark(inn, -52, 40, 0.3, {
      name: '朝圣者客栈 · Pilgrims’ Hostel',
      shortName: '客栈',
      tag: '爬了一天山的人睡在这儿',
      desc: '石柱脚下最大的一幢房子，两层、赤陶顶、蓝漆窗框；门口一排长凳上摆着朝圣者的拐杖和草鞋，墙边堆着给修道院送的面袋。',
      detail: '朝圣在中世纪是一桩大生意：每年有成千上万人长途跋涉去圣地，路上要住"朝圣者客栈"——通常由修道院或行会开设，价格便宜、床位拥挤。住店的人要交出武器，也不许在夜里大声说话。',
    }, { dist: 40, height: 20, ty: 5, rot: 0.3 });
    // 山羊
    const goats = [];
    for (let i = 0; i < 9; i++) {
      const { group, head } = K.makeSheepLite(P, { tone: rand.pick([0xb0a088, 0x8a7a64, 0xcfc4a8, 0x5a4a3a]), scale: 0.85 });
      group.userData.keepSeparate = true;
      const x = 34 + rand.range(-12, 12);
      const z = 40 + rand.range(-8, 8);
      T.add(group, x, z, rand() * 6);
      goats.push({ g: group, head, ph: rand() * 10, bx: x, bz: z, br: group.rotation.y });
    }
    T.animate((dt, t) => {
      for (const s of goats) {
        s.head.rotation.x = 0.4 + Math.sin(t * 0.5 + s.ph) * 0.3;
        s.g.rotation.y = s.br + Math.sin(t * 0.2 + s.ph) * 0.4;
        s.g.position.x = s.bx + Math.sin(t * 0.07 + s.ph) * 2.0;
      }
    });
    T.add(K.fenceLine(P, [[22, 30], [46, 30], [46, 50], [22, 50], [22, 30]], { h: 1.0, gap: 2.6 }), 0, 0);

    // 道路与梯田菜园
    T.add(K.ribbon([[-95, 60], [-60, 48], [-30, 34], [0, 18], [12, 0]], 4.4, P.road, 0.05), 0, 0);
    for (let i = 0; i < 4; i++) {
      const tr = box(18, 0.5 + i * 0.4, 5, P.flat(0x8a6240, 1));
      tr.position.set(70, (0.5 + i * 0.4) / 2, 50 + i * 4.8);
      T.add(tr, 0, 0);
      const veg = box(16, 0.4, 3.2, P.flat([0x5a7a2e, 0x6a8a30, 0x7a9a3a, 0x4a6a2a][i], 1));
      veg.position.set(70, 0.7 + i * 0.4, 50 + i * 4.8);
      T.add(veg, 0, 0);
    }
    for (let x = -50; x <= 50; x += 40) T.lamp(x, 30 + (x < 0 ? 0 : 5), { ry: 0.5, h: 3.2, light: x === -10 });
  }

  /* ================= 居民 ================= */
  {
    const monk = { tabard: 0x2a2420, helmet: 'hood' };
    T.walker({ ...monk }, [-30, 30], [-8, 12], 0.35);
    T.walker({ villager: true }, [20, 10], [-20, 40], 0.5);
    T.walker({ villager: true }, [-60, 50], [-40, 36], 0.5);
    for (let i = 0; i < 6; i++) T.person({ villager: true }, rand.range(-40, 40), rand.range(20, 50), rand() * 6, 'idle');
    // 顶上的修士
    for (let i = 0; i < 3; i++) T.person(monk, MAIN.x + rand.range(-5, 5), MAIN.z + rand.range(0, 6), rand() * 6, 'idle', 1, H);
  }

  /* ================= 生气：绕柱的云、鹰、崖顶的旗 ================= */
  {
    // 石柱腰间缓缓飘过的云（白天）：贴着崖壁一团团横移
    T.emitter({ x: 0, y: 62, z: -20, count: 16, life: 16, size: 15, color: 0xffffff, opacity: 0.3,
      spread: [75, 16, 75], vel: [1.4, 0, 0.35], jitter: [0.4, 0.05, 0.4], grow: 0.6, fadeIn: 0.25, night: 'day' });
    T.emitter({ x: 0, y: 30, z: -20, count: 10, life: 14, size: 11, color: 0xf0f4f8, opacity: 0.2,
      spread: [70, 8, 70], vel: [1.0, 0, 0.2], jitter: [0.3, 0.05, 0.3], grow: 0.5, fadeIn: 0.25, night: 'day' });

    // 绕着主柱盘旋的鹰
    T.birds({ count: 6, center: [MAIN.x, MAIN.z], radius: 48, height: 74, color: 0x3a3028, scale: 1.8 });
    T.birds({ count: 3, center: [MAIN.x, MAIN.z], radius: 30, height: 100, color: 0x2a2420, scale: 1.5 });

    // 崖顶边缘的旗杆
    const ex = MAIN.x + topR(0) - 2.5;
    const pole = cyl(0.12, 0.16, 7, 6, P.woodDark);
    T.add(pole, ex, MAIN.z, 0, H + 3.5 + 1.2);
    T.flag(ex, H + 8.2, MAIN.z, { w: 4.2, h: 2.1, color: 0xb8322a, ry: -0.6 });
  }

  /* ================= 信标：整根石柱 ================= */
  {
    const bp = makePillar({ rings: 24, segs: 26, seed: 2.1 });
    bp.position.set(MAIN.x, 0, MAIN.z);
    T.beacon(bp);
    // 顶上的金色点：晚上远远就能看见那一盏灯
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T.glowTx, color: 0xffb060, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.position.set(5.8, H + 10, -4);
    glow.scale.setScalar(20);
    bp.add(glow);
    T.beaconAnimate((dt, t, day) => { glow.material.opacity = day * 0.9; });
  }

  T.overview({
    name: '云顶修道院 · Skyhold',
    tag: '悬在半空的祈祷',
    desc: '最东边的荒原上，几十根砂岩石柱破土而出，最高的一根有八十八米，顶上是赤陶屋顶的修道院；一条石阶盘着岩壁而上，另一条路是一只藤吊篮，吊在崖外一根长绳上，升降一次要十七秒。',
    detail: '中世纪的修道院往往选在最难到达的地方：越远离世俗，越被认为接近神。这样的选址也有现实一面——岩柱顶上是最安全的地方，战乱时修士把吊篮收上去，下面的人就只能干瞪眼。几百年里，这样的修道院保住了很多古籍和圣物。',
  }, { cx: 0, cz: -10, dist: 250, height: 115, rot: -1.9 });
}
