import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  铁砧矿镇 Ironhold
 *
 *  镇子贴着山脚。山腰有矿口，矿车沿木轨在矿口与选矿场之间来回跑；
 *  竖井上立着转动的绞车塔，高炉日夜冒烟，水锤锻坊里大锤一下一下砸；
 *  山脚下是一排排石砌的矿工排屋。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;

  const gravel = P.flat(0x4f4b43, 1);
  gravel.polygonOffset = true;
  gravel.polygonOffsetFactor = -2;
  gravel.polygonOffsetUnits = -2;
  const darkStone = P.tint('stone', 0x8a8882);
  const slag = P.flat(0x2a2826, 1, { flatShading: true });
  const oreRed = P.flat(0x8a4a38, 0.9, { flatShading: true });
  const oreGrey = P.flat(0x6a6e72, 0.8, { flatShading: true });
  const ingot = P.flat(0xa4aab0, 0.35, { metalness: 0.8 });
  const sootWall = P.flat(0x4a4540, 1);

  /* ---------- 地面：一片灰色的矿渣碎石地 ---------- */
  T.add(K.groundPatch(95, gravel, { y: 0.03, segs: 40 }), 0, 10, 0, 0.03);
  T.add(K.groundPatch(70, P.flat(0x3a3732, 1, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), { y: 0.04, segs: 32 }), -30, -20, 0, 0.04);

  /* ---------- 背后的山 ---------- */
  {
    const mtn = T.nature.makeMountain(T.NM, { h: 110, r: 190, snow: false, seed: 31 });
    T.add(mtn, 10, -200);
  }

  const RAIL_Z0 = -52;   // 矿口前沿：实测此处山坡约 3 米高，扶壁露在外面洞口才看得见（-64 时整座矿口埋进山里）

  /* ---------- 木轨 ---------- */
  function rails(len) {
    const g = new THREE.Group();
    const sl = [];
    for (let z = 0; z < len; z += 1.2) sl.push({ x: 0, y: 0.06, z, sx: 1.7, sy: 0.12, sz: 0.26 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.wood, sl));
    for (const s of [-1, 1]) {
      const r = box(0.1, 0.12, len, P.iron);
      r.position.set(s * 0.55, 0.18, len / 2);
      g.add(r);
    }
    return g;
  }

  /* ================= 矿口 ================= */
  {
    const g = new THREE.Group();
    // 左右扶壁 + 拱顶石
    for (const s of [-1, 1]) {
      const wall = box(4.0, 7.4, 5.0, darkStone);
      wall.position.set(s * 5.6, 3.7, -1.4);
      g.add(wall);
      const butt = box(1.6, 5.4, 1.6, darkStone);
      butt.position.set(s * 8.4, 2.7, 0.2);
      g.add(butt);
    }
    const cap = box(15, 2.4, 5.4, darkStone);
    cap.position.set(0, 8.6, -1.4);
    g.add(cap);
    // 木框：两根立柱 + 横梁 + 斜撑
    for (const s of [-1, 1]) {
      const p = box(0.7, 5.2, 0.7, P.timber);
      p.position.set(s * 3.1, 2.6, 1.2);
      g.add(p);
      const br = box(0.3, 2.0, 0.3, P.timber);
      br.position.set(s * 2.6, 4.7, 1.2);
      br.rotation.z = s * 0.7;
      g.add(br);
    }
    const lintel = box(7.4, 0.8, 0.8, P.timber);
    lintel.position.set(0, 5.4, 1.2);
    g.add(lintel);
    // 黑洞洞的坑道
    const hole = box(5.4, 4.8, 9, P.dark);
    hole.position.set(0, 2.4, -3.2);
    g.add(hole);
    // 两侧的矿灯：一盏提灯
    for (const s of [-1, 1]) {
      const lamp = box(0.34, 0.5, 0.34, P.lanternGlass, false);
      lamp.position.set(s * 3.9, 3.6, 1.7);
      lamp.userData.keepSeparate = true;
      g.add(lamp);
    }
    // 门楣上的锤与镐交叉标志
    const h1 = box(0.16, 1.5, 0.16, P.wood);
    h1.position.set(0, 7.1, 1.4);
    h1.rotation.z = 0.7;
    g.add(h1);
    const h2 = box(0.16, 1.5, 0.16, P.wood);
    h2.position.set(0, 7.1, 1.4);
    h2.rotation.z = -0.7;
    g.add(h2);
    const hd = box(0.9, 0.2, 0.2, P.iron);
    hd.position.set(-0.55, 7.5, 1.5);
    hd.rotation.z = 0.7;
    g.add(hd);
    // 矿口前的木轨与废石
    const rl = rails(50);
    rl.position.set(0, 0, 3);
    g.add(rl);
    // 洞外的碎矿堆
    const items = [];
    for (let i = 0; i < 30; i++) items.push({ x: rand.range(-9, 9), y: 0.25, z: rand.range(4, 12), s: rand.range(0.3, 0.9), ry: rand() * 6, rx: rand() * 3 });
    g.add(K.scatter(new THREE.DodecahedronGeometry(1, 0), oreGrey, items));

    T.landmark(g, 6, RAIL_Z0, 0, {
      name: '矿口 · Mine Portal',
      shortName: '矿口',
      tag: '山肚子的嘴',
      desc: '山脚凿出的一道坑口，两侧是厚实的石扶壁，口上横着一根粗木梁，两根立柱和斜撑把洞顶撑住。门楣上挂着交叉的锤与镐，两盏提灯照着黑洞洞的坑道，木轨从洞里一直铺到场子上。',
      detail: '中世纪的矿坑全靠木头撑：坑道每隔几步就得立一副木框，否则顶板随时会塌。矿工自带油灯和锤凿，一天凿进不到一米；矿车那时叫"狗"（Hund），因为推着走时轮子的声音像狗叫。',
    }, { dist: 44, height: 20, ty: 5, rot: 0 });
    // 坑口的火把光
    T.glow(6 - 3.9, 3.6, RAIL_Z0 + 1.7, { color: 0xffa050, size: 3, light: true, gain: 0.6 });
    T.glow(6 + 3.9, 3.6, RAIL_Z0 + 1.7, { color: 0xffa050, size: 3 });
  }

  /* ================= 矿车 ================= */
  {
    const cart = new THREE.Group();
    const body = box(1.5, 0.8, 2.1, P.wood);
    body.position.y = 0.95;
    cart.add(body);
    for (const sz of [-1, 1]) {
      const band = box(1.62, 0.1, 0.12, P.iron);
      band.position.set(0, 1.0, sz * 0.6);
      cart.add(band);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = cyl(0.28, 0.28, 0.1, 10, P.iron);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * 0.62, 0.32, sz * 0.7);
      cart.add(w);
    }
    const pile = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), oreRed);
    pile.scale.set(1, 0.6, 1.3);
    pile.position.y = 1.5;
    pile.castShadow = true;
    cart.add(pile);
    T.dynamic(cart);
    const cx = 6;
    T.add(cart, cx, RAIL_Z0 + 8, 0);
    const z0 = RAIL_Z0 + 9;
    const z1 = RAIL_Z0 + 50;
    let phase = 0;
    T.animate((dt) => {
      // 往返：2 秒装卸停顿，中间匀速（15 秒走完全程），两端缓入缓出
      phase = (phase + dt / 17) % 1;
      const k = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      const e = k * k * (3 - 2 * k);
      cart.position.z = z0 + (z1 - z0) * e;
      cart.position.y = Math.sin(phase * 80) * 0.01;
      cart.rotation.y = phase < 0.5 ? 0 : Math.PI;
    });
  }

  /* ================= 绞车塔 ================= */
  {
    const g = new THREE.Group();
    // 井口：石圈 + 木盖板
    const collar = cyl(2.6, 3.0, 0.9, 12, darkStone);
    collar.position.y = 0.45;
    g.add(collar);
    const pit = cyl(1.9, 1.9, 0.1, 12, P.dark);
    pit.position.y = 0.92;
    g.add(pit);
    // A 形塔架：四根斜柱 + 横撑
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = box(0.46, 17.5, 0.46, P.wood);
      p.position.set(sx * 2.4 * 0.6, 8.6, sz * 3.0 * 0.6);
      p.rotation.z = -sx * 0.14;
      p.rotation.x = sz * 0.1;
      g.add(p);
    }
    for (const yy of [4, 8, 12]) {
      const k = 1 - yy / 28;
      for (const sz of [-1, 1]) {
        const bm = box(4.8 * k, 0.28, 0.28, P.wood);
        bm.position.set(0, yy, sz * 3.0 * k);
        g.add(bm);
      }
      for (const sx of [-1, 1]) {
        const bm = box(0.28, 0.28, 6.0 * k, P.wood);
        bm.position.set(sx * 2.4 * k, yy, 0);
        g.add(bm);
      }
    }
    // 顶部天轮：绕 X 转
    const wheel = new THREE.Group();
    const geos = [];
    for (const sx of [-0.35, 0.35]) {
      const rim = new THREE.TorusGeometry(2.0, 0.12, 5, 20);
      rim.rotateY(Math.PI / 2);
      rim.translate(sx, 0, 0);
      geos.push(rim);
    }
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.BoxGeometry(0.7, 4.0, 0.1);
      sp.rotateX((i / 8) * Math.PI);
      geos.push(sp);
    }
    const wm = new THREE.Mesh(mergeGeometries(geos, false), P.wood);
    wm.castShadow = true;
    wheel.add(wm);
    const axle = cyl(0.14, 0.14, 1.8, 6, P.iron);
    axle.rotation.z = Math.PI / 2;
    wheel.add(axle);
    wheel.position.set(0, 16.2, 0);
    wheel.userData.keepSeparate = true;
    g.add(wheel);
    const roofC = K.gableRoof(2.6, 3.2, 1.0, P.shingle, null, { over: 0.3, gables: false });
    roofC.position.set(0, 17.6, 0);
    g.add(roofC);

    // 吊桶 + 绳
    const bucket = new THREE.Group();
    const bb = cyl(0.7, 0.55, 0.9, 8, P.woodDark);
    bb.position.y = -0.5;
    bucket.add(bb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 4, 10), P.iron);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.1;
    bucket.add(ring);
    const rope = cyl(0.04, 0.04, 1, 4, P.rope, false);
    rope.position.y = 0.5;
    rope.userData.isRope = true;
    bucket.add(rope);
    bucket.userData.keepSeparate = true;
    bucket.position.y = 4;
    g.add(bucket);

    T.landmark(g, -34, -38, 0, {
      name: '绞车塔 · Winding Tower',
      shortName: '绞车塔',
      tag: '把矿石从地底拽上来',
      desc: '竖井口立着一座十七米高的木塔架，顶上是一只两人高的大天轮，绳子从轮上垂进井里，吊桶一上一下。塔脚是圈石砌的井口，盖板半开，黑黝黝的井里时不时传来回响。',
      detail: '十五世纪的德意志矿区已经在用马拉绞盘（Göpel）加天轮提升矿石：马绕着圈走，绳子绕上滚筒，吊桶一桶能提几十公斤矿。井越深越危险，淹水、塌方、毒气都是家常便饭，所以矿工最重要的守护神是圣芭芭拉。',
    }, { dist: 40, height: 22, ty: 9, rot: 0.8 });

    T.animate((dt, t) => {
      wheel.rotation.x = t * 0.9;
      const k = (Math.sin(t * 0.45) * 0.5 + 0.5);
      bucket.position.y = 1.2 + k * 11;
      const len = 16.2 - bucket.position.y;
      const r = bucket.children.find((c) => c.userData.isRope);
      if (r) { r.scale.y = len; r.position.y = len / 2; }
    });
  }

  /* ================= 高炉 ================= */
  let furnaceTop = null;
  {
    const g = new THREE.Group();
    // 石砌炉身：由粗到细，外加黑烟熏黑的上半段
    const body = cyl(2.6, 4.0, 7.6, 10, darkStone);
    body.position.y = 3.8;
    g.add(body);
    const upper = cyl(1.7, 2.6, 5.0, 10, sootWall);
    upper.position.y = 10.0;
    g.add(upper);
    const top = cyl(2.0, 1.7, 0.6, 10, darkStone);
    top.position.y = 12.8;
    g.add(top);
    // 炉前工作台与炉口
    const apron = box(8, 0.4, 5, darkStone);
    apron.position.set(0, 0.2, 4.2);
    g.add(apron);
    const mouth = box(1.8, 1.6, 0.6, T.TM.ember, false);
    mouth.position.set(0, 1.5, 3.7);
    mouth.userData.keepSeparate = true;
    g.add(mouth);
    // 鼓风皮囊房
    const bellows = K.makeHouse(P, {
      w: 5.4, d: 5, floors: 1, floorH: 3.2, wall: sootWall, base: darkStone, baseH: 0.6,
      roof: 'gable', roofMat: P.shingle, pitch: 0.7, windows: 1, door: P.woodDark, chimney: false,
    });
    bellows.position.set(-7.4, 0, 1.5);
    g.add(bellows);
    // 木炭堆（黑色圆锥）
    for (let i = 0; i < 3; i++) {
      const c = cone(2.2, 2.4, 8, slag);
      c.position.set(7 + i * 3.2, 1.2, -0.8 + (i % 2) * 2.2);
      g.add(c);
    }
    // 铁锭垛
    const ing = [];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
      ing.push({ x: -2.2 + i * 1.0 + r * 0.5, y: 0.7 + r * 0.32, z: 7.3, sx: 0.9, sy: 0.28, sz: 0.42 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), ingot, ing));
    T.smokeFrom(g, new THREE.Vector3(0, 13.4, 0));
    furnaceTop = new THREE.Vector3(0, 13.4, 0);

    T.landmark(g, -62, -22, 0.2, {
      name: '高炉 · The Furnace',
      shortName: '高炉',
      tag: '日夜不熄的火',
      desc: '一座十三米高的石炉，上半截被烟熏得发黑，炉前是一块石台，炉口烧得通红。旁边的皮囊房里风箱一张一合，木炭堆成黑色的小山，台边码着一垛一垛的铁锭。',
      detail: '中世纪炼铁多用"块炼法"：木炭加矿石在炉里烧，铁熔不成水，只结成一块海绵似的铁坯，要趁热反复锻打挤出渣。十四世纪起水力鼓风让炉温更高，才出现真正的液态铸铁。一座炉一昼夜要烧掉几十筐木炭，所以矿镇周围的森林总是秃的。',
    }, { dist: 40, height: 20, ty: 6, rot: 0.2 });
    T.glow(-62, 1.8, -22 + 3.8, { color: 0xff7a24, size: 5, light: true, gain: 1.2 });
  }

  /* ================= 水锤锻坊 ================= */
  {
    const g = new THREE.Group();
    // 四柱敞棚
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = box(0.4, 4.4, 0.4, P.timber);
      p.position.set(sx * 3.4, 2.2, sz * 3.0);
      g.add(p);
    }
    const roof = K.gableRoof(7.8, 7.4, 2.2, P.shingle, null, { over: 0.4, gables: false });
    roof.position.set(0, 4.4, 0);
    roof.rotation.y = Math.PI / 2;
    g.add(roof);
    // 石砌后墙
    const back = box(7.4, 3.6, 0.6, darkStone);
    back.position.set(0, 1.8, -3.2);
    g.add(back);
    // 铁砧与木墩
    const stump = cyl(0.55, 0.65, 0.8, 8, P.woodDark);
    stump.position.set(0.4, 0.4, 0.4);
    g.add(stump);
    const anvil = box(0.9, 0.4, 0.45, P.iron);
    anvil.position.set(0.4, 1.0, 0.4);
    g.add(anvil);
    // 锤：一根大木杆绕支点翘动，端头是铁锤头
    const hammer = new THREE.Group();
    const arm = box(0.3, 0.3, 5.0, P.wood);
    arm.position.set(0, 0, -1.4);
    hammer.add(arm);
    const head = box(0.7, 0.7, 0.9, P.iron);
    head.position.set(0, -0.2, 1.1);
    hammer.add(head);
    hammer.position.set(0.4, 2.6, -1.6);
    hammer.userData.keepSeparate = true;
    g.add(hammer);
    // 凸轮轴（带着锤尾转）
    const cam = cyl(0.2, 0.2, 1.4, 6, P.wood);
    cam.rotation.z = Math.PI / 2;
    cam.position.set(0.4, 2.6, -3.4);
    g.add(cam);
    // 水轮（贴在后墙外）：静态外观，旋转放在 animate 里
    const wheel = new THREE.Group();
    const geos = [];
    const rim = new THREE.TorusGeometry(2.5, 0.12, 5, 20);
    rim.rotateY(Math.PI / 2);
    geos.push(rim);
    for (let i = 0; i < 12; i++) {
      const bl = new THREE.BoxGeometry(0.9, 0.5, 0.1);
      bl.translate(0, 2.5, 0);
      bl.rotateX((i / 12) * Math.PI * 2);
      geos.push(bl);
    }
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.BoxGeometry(0.1, 5, 0.1);
      sp.rotateX((i / 6) * Math.PI);
      geos.push(sp);
    }
    const wmm = new THREE.Mesh(mergeGeometries(geos, false), P.wood);
    wmm.castShadow = true;
    wheel.add(wmm);
    wheel.position.set(4.6, 2.5, -3.2);
    wheel.userData.keepSeparate = true;
    g.add(wheel);
    // 引水槽
    const flume = box(0.9, 0.18, 7, P.woodDark);
    flume.position.set(4.6, 5.4, -7);
    g.add(flume);
    // 成品堆
    const ing = [];
    for (let i = 0; i < 6; i++) ing.push({ x: -2.6 + (i % 3) * 0.9, y: 0.2 + Math.floor(i / 3) * 0.3, z: 2.0, sx: 0.8, sy: 0.25, sz: 0.4 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), ingot, ing));

    T.landmark(g, -14, -10, 0.1, {
      name: '水锤锻坊 · Trip-Hammer Forge',
      shortName: '锻坊',
      tag: '水替人抡锤',
      desc: '一座敞开的木棚，后墙外挂着一只大水轮，凸轮轴随着水轮转，一下一下把杠杆式的大锤翘起又砸下，正砸在铁砧上的红铁坯上。棚边码着刚锻好的铁条。',
      detail: '水力锤十二世纪就在欧洲出现，一把锤顶得上好几个壮工：水轮带着凸轮压下锤尾，锤头抬起，再靠重力砸落。有了它，铁匠才第一次能把大块铁坯锻成条、锻成板，铠甲、农具、钉子都因此变便宜。',
    }, { dist: 32, height: 16, ty: 3, rot: 0.1 });

    let hp = 0;
    T.animate((dt, t) => {
      wheel.rotation.x = -t * 0.8;
      hp = t * 1.5;
      // 锤杆：前端抬起（-0.4）→ 落下（0），落下那一下很快
      const s = (hp % 1);
      const lift = s < 0.7 ? Math.sin((s / 0.7) * Math.PI * 0.5) : Math.cos(((s - 0.7) / 0.3) * Math.PI * 0.5);
      hammer.rotation.x = -0.42 * lift;
    });
  }

  /* ================= 矿工排屋 ================= */
  function makeTerrace(n, unit = 5.2) {
    const g = new THREE.Group();
    const L = n * unit;
    const wall = box(L, 5.6, 6.2, P.tint('stone', 0x9a978f));
    wall.position.set(0, 2.8, 0);
    g.add(wall);
    const roof = K.gableRoof(6.2, L, 2.4, P.slate, null, { over: 0.4, gables: false });
    roof.rotation.y = Math.PI / 2;
    roof.position.set(0, 5.6, 0);
    g.add(roof);
    const gableGeo = new THREE.Shape();
    gableGeo.moveTo(-3.1, 0);
    gableGeo.lineTo(3.1, 0);
    gableGeo.lineTo(0, 2.38);
    gableGeo.closePath();
    for (const s of [-1, 1]) {
      const tri = new THREE.Mesh(new THREE.ShapeGeometry(gableGeo), P.tint('stone', 0x9a978f));
      tri.position.set((s * L) / 2, 5.6, 0);
      tri.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(tri);
    }
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + unit * (i + 0.5);
      const d = box(1.0, 2.0, 0.14, P.woodDark);
      d.position.set(x - 0.9, 1.0, 3.14);
      g.add(d);
      for (const yy of [1.5, 4.1]) {
        const w = box(0.6, 0.8, 0.1, P.window, false);
        w.position.set(x + 0.9, yy, 3.12);
        g.add(w);
      }
      const w2 = box(0.6, 0.8, 0.1, P.window, false);
      w2.position.set(x - 0.9, 4.1, 3.12);
      g.add(w2);
      // 烟囱
      const ch = box(0.8, 2.0, 0.8, P.tint('stone', 0x7a766e));
      ch.position.set(x, 8.6, -0.9);
      g.add(ch);
      T.smokeFrom(g, new THREE.Vector3(x, 9.7, -0.9));
      // 门前台阶
      const st = box(1.4, 0.25, 0.8, darkStone);
      st.position.set(x - 0.9, 0.12, 3.5);
      g.add(st);
    }
    return g;
  }
  {
    const row = makeTerrace(6);
    T.landmark(row, 34, 36, 0, {
      name: '矿工排屋 · Miners’ Terrace',
      shortName: '排屋',
      tag: '一家一间，共用一堵墙',
      desc: '六户连成一排的二层石屋，板岩屋顶压得很低，每户一扇门、两扇窗、一根小烟囱，门前一级石阶。墙被烟熏得发灰，窗台上总晾着几件工服。',
      detail: '矿主为了留住熟练矿工，会盖成排的"公司屋"低价租给他们——房租从工资里扣。一家人挤在两层小屋里：楼下做饭，楼上睡觉，男人下井，女人和孩子在洗矿槽边挑拣碎矿。',
    }, { dist: 38, height: 18, ty: 4 });
    // 第二排
    T.add(makeTerrace(5), 34, 54, 0);
    // 门前的灯
    for (let i = 0; i < 4; i++) T.lamp(34 - 12 + i * 8, 41, { ry: 0, h: 2.8 });
  }

  /* ================= 矿业官邸 ================= */
  {
    const g = new THREE.Group();
    const hall = K.makeHouse(P, {
      w: 12, d: 8, floors: 2, floorH: 3.1, wall: P.tint('stone', 0xb4b0a6), base: darkStone, baseH: 0.7,
      roof: 'hip', roofMat: P.slate, pitch: 0.6, windows: 4, door: P.woodDark, chimney: true, porch: true,
    });
    g.add(hall);
    T.smokeFrom(g, hall.userData.chimney);
    const fl = K.banner(P, 0x1c3a63, { h: 6, w: 1.3, len: 2.6 });
    fl.position.set(5.6, 7.6, 3.4);
    g.add(fl);
    // 台阶与门前的天平
    const sc = box(1.4, 1.0, 0.1, P.wood);
    sc.position.set(-3.6, 1.2, 4.8);
    g.add(sc);
    const sb = box(1.5, 0.08, 0.08, P.iron);
    sb.position.set(-3.6, 1.8, 4.8);
    g.add(sb);
    T.landmark(g, 12, 6, 0.1, {
      name: '矿业官邸 · Bergmeister’s Hall',
      shortName: '官邸',
      tag: '矿山的法官',
      desc: '镇上最体面的石屋：两层、四坡板岩顶、带雨棚的大门，门口立着一杆挂蓝旗的旗杆，台阶边摆着一杆验矿用的天平。矿工吵架、矿主分账、新矿脉登记，都得到这里来。',
      detail: '中世纪的矿区有自己的法律：德意志的"矿业法"规定任何人发现矿脉都可以申请开采，矿主要交十分之一给领主。矿山由"矿务官"（Bergmeister）管，他审案、量地、收税，矿工只服他，不服当地领主。',
    }, { dist: 36, height: 18, ty: 5 });
  }

  /* ================= 圣芭芭拉礼拜堂 ================= */
  {
    const g = new THREE.Group();
    const nave = K.makeHouse(P, {
      w: 6, d: 10, floors: 1, floorH: 4.4, wall: P.tint('stone', 0xbdb8ac), base: darkStone, baseH: 0.6,
      roof: 'gable', roofMat: P.slate, pitch: 0.8, windows: 1, door: P.woodDark, chimney: false,
    });
    g.add(nave);
    const tw = box(2.4, 5.0, 2.4, P.tint('stone', 0xbdb8ac));
    tw.position.set(0, 7.0, -3.4);
    g.add(tw);
    const sp = cone(1.9, 3.0, 4, P.slate);
    sp.rotation.y = Math.PI / 4;
    sp.position.set(0, 11.0, -3.4);
    g.add(sp);
    // 供奉的矿灯
    const l1 = box(0.3, 0.45, 0.3, P.lanternGlass, false);
    l1.position.set(-1.2, 1.8, 5.2);
    l1.userData.keepSeparate = true;
    g.add(l1);
    const l2 = box(0.3, 0.45, 0.3, P.lanternGlass, false);
    l2.position.set(1.2, 1.8, 5.2);
    l2.userData.keepSeparate = true;
    g.add(l2);
    T.landmark(g, -50, 30, 0.35, {
      name: '圣芭芭拉礼拜堂 · St Barbara’s Chapel',
      shortName: '礼拜堂',
      tag: '下井前先来磕个头',
      desc: '一座不大的石堂，板岩顶，钟塔立在堂后。门廊两侧摆着矿工供的小提灯，白天也点着。',
      detail: '圣芭芭拉是炮手、建筑工和矿工的守护圣人：传说她被雷劈死，所以最怕突然塌方和爆炸的人都求她保佑。矿工下井前在这里点灯、念短祷，上来后要把灯放回原位，表示"人和灯都回来了"。',
    }, { dist: 30, height: 16, ty: 5, rot: 0.35 });
  }

  /* ================= 选矿场：矿堆与洗矿槽 ================= */
  {
    // 洗矿槽：长木槽 + 水（深色薄片）
    const tr = box(10, 0.5, 1.2, P.woodDark);
    tr.position.set(0, 0.6, 0);
    const trough = new THREE.Group();
    trough.add(tr);
    const wt = box(9.6, 0.05, 0.9, P.water, false);
    wt.position.set(0, 0.86, 0);
    trough.add(wt);
    for (const sx of [-4.4, -1.4, 1.6, 4.4]) {
      const lg = box(0.2, 0.9, 1.0, P.wood);
      lg.position.set(sx, 0.2, 0);
      trough.add(lg);
    }
    T.add(trough, 4, -4, 0.15);
    // 矿堆
    const piles = [];
    for (let i = 0; i < 16; i++) {
      piles.push({ x: rand.range(-16, 16), y: 0.4, z: rand.range(8, 24), sx: rand.range(1.2, 3), sy: rand.range(0.6, 1.4), sz: rand.range(1.2, 3), ry: rand() * 6 });
    }
    T.add(K.scatter(new THREE.DodecahedronGeometry(1, 0), oreRed, piles.slice(0, 8)), 16, 0);
    T.add(K.scatter(new THREE.DodecahedronGeometry(1, 0), oreGrey, piles.slice(8)), 12, -10);
    // 矿渣山
    const sl = [];
    for (let i = 0; i < 10; i++) {
      const a = rand() * 6.28;
      const r = rand() * 10;
      sl.push({ x: Math.cos(a) * r, y: 1.0, z: Math.sin(a) * r, sx: rand.range(3, 6), sy: rand.range(2, 4.5), sz: rand.range(3, 6), ry: rand() * 6 });
    }
    T.add(K.scatter(new THREE.DodecahedronGeometry(1, 0), slag, sl), -92, -2);
  }

  /* ================= 背景民居 / 小径 ================= */
  {
    T.add(K.ribbon([[0, 100], [4, 60], [14, 30], [20, -10], [10, -30]], 5.4, P.road, 0.05), 0, 0);
    T.add(K.ribbon([[14, 30], [-30, 36], [-60, 26], [-90, 12]], 3.2, P.road, 0.045), 0, 0);
    T.add(K.ribbon([[20, 0], [60, 30], [92, 44]], 3.2, P.road, 0.045), 0, 0);

    const taken = [{ x: 34, z: 42, r: 24 }, { x: 12, z: 6, r: 14 }, { x: -50, z: 30, r: 12 }, { x: -62, z: -22, r: 20 }, { x: -14, z: -10, r: 12 }, { x: -34, z: -38, r: 12 }, { x: 6, z: -26, r: 18 }, { x: 10, z: 70, r: 10 }];
    let placed = 0;
    let guard = 0;
    while (placed < 12 && guard < 400) {
      guard++;
      const x = rand.range(-110, 110);
      const z = rand.range(-20, 110);
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r)) continue;
      if (Math.abs(x - 6 - (z - 50) * 0.1) < 5 && z > 20) continue;
      T.house({
        w: rand.range(4.4, 6), d: rand.range(4.2, 5.4), floors: 1 + (rand() < 0.4 ? 1 : 0), floorH: 2.6,
        wall: rand() < 0.5 ? P.tint('stone', 0x9a978f) : P.plaster, base: darkStone, baseH: 0.4,
        roof: 'gable', roofMat: rand() < 0.6 ? P.slate : P.thatch, pitch: 0.72, windows: 1, chimney: true,
      }, x, z, rand.range(-0.6, 0.6));
      taken.push({ x, z, r: 8 });
      placed++;
    }
    // 木料堆（坑木）
    for (let i = 0; i < 4; i++) {
      const lg = box(5, 0.4, 0.4, P.wood);
      T.add(lg, 54 + (i % 2) * 0.3, 0.2 + Math.floor(i / 2) * 0.4, -10 + i * 0.3);
    }
    T.lamp(8, 70, { ry: 0.3, h: 3.0 });
    T.lamp(12, 30, { ry: 3.4, h: 3.0, light: true });
  }

  /* ================= 居民 ================= */
  {
    const miner = { tabard: 0x5a4a38, helmet: 'hood' };
    T.walker(miner, [8, -14], [8, 20], 0.8);
    T.walker(miner, [4, 0], [4, 28], 0.6);
    T.walker({ villager: true }, [30, 32], [-20, 30], 0.7);
    for (let i = 0; i < 6; i++) T.person({ ...miner, tabard: [0x5a4a38, 0x4a5a38, 0x6a4a2a][i % 3] }, rand.range(-30, 20), rand.range(-30, 30), rand() * 6, 'idle');
    T.person({ tabard: 0x2a2826, helmet: 'none' }, -12, -8, 1.2, 'idle');    // 铁匠
    T.person({ tabard: 0x2a2826, helmet: 'none' }, -64, -17, 0.4, 'idle');   // 炉前
  }

  /* ================= 生气：火星、溅水、火焰、旗 ================= */
  {
    // 锻坊：每次锤头落下，铁砧上迸一蓬火星（落锤的相位同上面 animate 里的 hp）
    const anv = K.toWorld(-14, -10, 0.1)(0.4, 0.4);
    T.emitter({ x: anv.x, y: 1.3, z: anv.z, count: 26, life: 0.55, size: 0.2, color: 0xffb050, additive: true,
      spread: [0.2, 0.05, 0.2], vel: [0, 2.8, 0], jitter: [1.8, 1.3, 1.8], gravity: 8, fadeIn: 0.02,
      gate: (t) => { const s = (t * 1.5) % 1; return s > 0.7 && s < 0.78; } });
    // 水轮底部溅起的水花
    const wh = K.toWorld(-14, -10, 0.1)(4.6, -3.2);
    T.emitter({ x: wh.x, y: 0.3, z: wh.z, count: 24, life: 0.9, size: 0.16, color: 0xdfeef7, opacity: 0.85,
      spread: [0.9, 0.05, 0.5], vel: [0, 1.6, 0], jitter: [0.6, 0.6, 0.6], gravity: 6, fadeIn: 0.04 });

    // 高炉口：火星带着风飘散 + 一股更浓更黑的烟
    T.emitter({ x: -62, y: 13.4, z: -22, count: 20, life: 1.6, size: 0.22, color: 0xff9a40, additive: true,
      spread: [0.5, 0.1, 0.5], vel: [0.3, 1.6, 0.1], jitter: [0.5, 0.5, 0.5], wind: [0.5, 0, 0.1], fadeIn: 0.05 });
    T.emitter({ x: -62, y: 13.4, z: -22, count: 16, life: 5, size: 2.2, color: 0x2a2826, opacity: 0.4,
      spread: [0.6, 0.1, 0.6], vel: [0.5, 1.5, 0.15], jitter: [0.3, 0.3, 0.3], wind: [0.18, 0, 0.03], grow: 3.2, fadeIn: 0.15 });

    // 矿口两侧的火把：真的火苗
    for (const s of [-1, 1]) {
      T.emitter({ x: 6 + s * 3.9, y: 3.7, z: RAIL_Z0 + 1.7, count: 10, life: 0.7, size: 0.7, color: 0xff9a40, additive: true,
        spread: [0.12, 0.04, 0.12], vel: [0, 1.1, 0], jitter: [0.15, 0.3, 0.15], grow: -0.5, fadeIn: 0.08, opacity: 0.9 });
    }

    // 广场上一杆矿镇旗
    const mast = cyl(0.12, 0.16, 11, 6, P.woodDark);
    T.add(mast, 26, 20, 0, 5.5);
    T.flag(26, 9.6, 20, { w: 4.2, h: 2.2, color: 0xc8742a, ry: -0.4 });
  }

  /* ================= 烟柱信标：站在城堡里也能看见矿镇的烟 ================= */
  {
    const bg = new THREE.Group();
    const mat = new THREE.SpriteMaterial({
      map: T.tex.cloudTx, color: 0x4a4540, transparent: true, opacity: 0.55,
      depthWrite: false, toneMapped: false,
    });
    const puffs = [];
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(mat.clone());
      sp.userData.k = i / 9;
      bg.add(sp);
      puffs.push(sp);
    }
    bg.position.set(-62, 13, -22);
    T.beacon(bg);
    // 一点夜光
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T.glowTx, color: 0xff7a24, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.position.set(0, 2, 0);
    glow.scale.setScalar(40);
    bg.add(glow);
    T.beaconAnimate((dt, t, day) => {
      for (const sp of puffs) {
        const k = (t * 0.03 + sp.userData.k) % 1;
        sp.position.set(Math.sin(k * 6 + sp.userData.k * 9) * 6 + k * 24, k * 140, Math.cos(k * 5) * 6);
        sp.scale.setScalar(14 + k * 70);
        sp.material.opacity = (1 - k) * 0.5;
      }
      glow.material.opacity = day * 0.7;
    });
  }

  T.overview({
    name: '铁砧矿镇 · Ironhold',
    tag: '山肚子里的叮当声',
    desc: '东北群山脚下的矿镇：山腰的矿口里有矿车来回，竖井上的绞车塔不停转动，高炉的黑烟从早到晚；山脚下是一排排被烟熏灰的石屋，锻坊里的大锤一下下砸在铁砧上，震得地都有点颤。',
    detail: '铁是中世纪最值钱的东西之一：犁、斧、钉、马掌、枪头都要铁，一座铁矿镇常常比一座村子大十倍。矿工们自治性很强，有自己的行会、自己的圣人和自己的法律——领主也不敢轻易惹他们，因为一旦停工，整个地区的铁就断了。',
  }, { cx: -10, cz: 10, dist: 200, height: 100, rot: 0.6 });
}
