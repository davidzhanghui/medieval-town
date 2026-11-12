import * as THREE from 'three';

/* ============================================================
 *  沼泽水乡 Marshmere
 *
 *  镇子架在一片浅浅的泥塘上：七幢高脚屋立在桩上，木栈道把它们
 *  连到中央的小平台；南北各有一条原木铺的堤道通出沼泽。塘边是
 *  泥炭场、鳗鱼笼和猎鸟人的芦苇棚，塘里漂着一座浮筏集市；
 *  雾一层层飘过水面，夜里有鬼火在芦苇上空晃。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;

  const mud = P.flat(0x3a4530, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const water = P.std('marsh:water', {
    color: 0x2f4a3c, roughness: 0.1, metalness: 0.35, transparent: true, opacity: 0.9,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const reedMat = P.flat(0xffffff, 1, { flatShading: true });
  const DECK_Y = 2.2;

  T.add(K.groundPatch(150, mud, { segs: 44 }), 0, 0, 0, 0.03);

  /* ---------- 水面：中央大塘 + 散落的小水洼 ---------- */
  const pools = [
    { x: 0, z: 8, rx: 60, rz: 44 },
    { x: -78, z: 40, rx: 16, rz: 11 }, { x: 74, z: 56, rx: 14, rz: 10 }, { x: 88, z: -30, rx: 18, rz: 12 },
    { x: -90, z: -26, rx: 12, rz: 9 }, { x: -28, z: 84, rx: 14, rz: 9 }, { x: 40, z: -78, rx: 16, rz: 11 },
  ];
  for (const p of pools) {
    const m = K.groundPatch(1, water, { segs: 36 });
    m.scale.set(p.rx, p.rz, 1);
    // groundPatch 把圆旋到了水平面上；非均匀缩放要在旋转之前的局部 x/y 上做
    m.rotation.z = rand() * 3;
    T.add(m, p.x, p.z, 0, 0.1);
    m.rotation.set(-Math.PI / 2, 0, rand() * 3);
    m.scale.set(p.rx, p.rz, 1);
  }
  const inPool = (x, z, pad = 0) => pools.some((p) => ((x - p.x) / (p.rx + pad)) ** 2 + ((z - p.z) / (p.rz + pad)) ** 2 < 1);

  /* ---------- 芦苇、香蒲、睡莲 ---------- */
  {
    const reeds = [];
    const cattails = [];
    const tones = [0x7a8a4a, 0x8a9a52, 0x6a7a40, 0x9aa05a];
    for (const p of pools) {
      const n = Math.floor((p.rx + p.rz) * 2.6);
      for (let i = 0; i < n; i++) {
        const a = rand() * 6.28;
        const k = 1 + rand.range(-0.05, 0.22);
        const x = p.x + Math.cos(a) * p.rx * k;
        const z = p.z + Math.sin(a) * p.rz * k;
        // 芦苇丛：一撮三根
        for (let j = 0; j < 3; j++) {
          reeds.push({ x: x + rand.range(-0.5, 0.5), y: 1.3, z: z + rand.range(-0.5, 0.5), sx: 1, sy: rand.range(0.8, 1.4), sz: 1, ry: rand() * 6, color: rand.pick(tones) });
        }
        if (rand() < 0.3) cattails.push({ x, z, h: rand.range(1.6, 2.4) });
      }
    }
    // 芦苇随风摇：用一份单独的材质，顶点着色器里按高度摆动
    const reedWind = K.windSway(reedMat.clone(), { amp: 0.28, speed: 1.9, y0: -1.4, h: 2.8 });
    T.add(K.scatter(new THREE.ConeGeometry(0.14, 2.8, 4), reedWind, reeds), 0, 0);
    T.add(K.scatter(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), P.flat(0x6a7a40, 1), cattails.map((c) => ({ x: c.x, y: c.h / 2, z: c.z, sy: c.h }))), 0, 0);
    T.add(K.scatter(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6), P.flat(0x5a3a22, 1), cattails.map((c) => ({ x: c.x, y: c.h + 0.1, z: c.z }))), 0, 0);

    // 睡莲：浮在水面的圆片
    const pads = [];
    const flowers = [];
    for (let i = 0; i < 110; i++) {
      const p = pools[rand.int(0, pools.length - 1)];
      const a = rand() * 6.28;
      const r = Math.sqrt(rand());
      const x = p.x + Math.cos(a) * p.rx * r * 0.92;
      const z = p.z + Math.sin(a) * p.rz * r * 0.92;
      pads.push({ x, y: 0.2, z, rx: -Math.PI / 2, s: rand.range(0.4, 0.95) });
      if (rand() < 0.22) flowers.push({ x: x + 0.1, y: 0.3, z: z - 0.1, s: 0.2 });
    }
    T.add(K.scatter(new THREE.CircleGeometry(1, 8), P.flat(0x3f7a30, 0.8), pads), 0, 0);
    T.add(K.scatter(new THREE.SphereGeometry(1, 6, 4), P.flat(0xe8a8c0, 0.7), flowers), 0, 0);
  }

  /* ---------- 枯树与乌鸦 ---------- */
  {
    const pts = K.ringPoints(rand, 0, 0, 40, 140, 36, (x, z) => inPool(x, z, 3));
    T.add(K.grove(P, 'bare', pts, { leaf: 0x4a4a3a, trunk: 0x3a3a30, scale: [0.9, 1.5], rand }), 0, 0);
    T.birds({ count: 7, center: [10, -20], radius: 36, height: 13, color: 0x1a1a1e, scale: 1.4 });
    T.birds({ count: 4, center: [-40, 30], radius: 24, height: 9, color: 0xb8b8b0, scale: 1.8 });   // 苍鹭
  }

  /* ================= 高脚屋群 + 栈道 ================= */
  const hub = { x: 0, z: 6 };
  {
    const g = new THREE.Group();
    // 中心平台：圆形，带井与告示牌
    const plat = cyl(7, 7, 0.4, 16, P.woodDark);
    plat.position.set(hub.x, DECK_Y - 0.2, hub.z);
    g.add(plat);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const pile = cyl(0.25, 0.3, DECK_Y + 1.2, 6, P.wood);
      pile.position.set(hub.x + Math.cos(a) * 6.2, (DECK_Y - 1.2) / 2, hub.z + Math.sin(a) * 6.2);
      g.add(pile);
    }
    const post = box(0.2, 2.4, 0.2, P.wood);
    post.position.set(hub.x + 3, DECK_Y + 1.2, hub.z - 2);
    g.add(post);
    const sign = box(1.3, 0.8, 0.1, P.woodDark);
    sign.position.set(hub.x + 3, DECK_Y + 2.0, hub.z - 2);
    g.add(sign);
    const well = cyl(0.9, 1.0, 0.8, 10, P.wood);
    well.position.set(hub.x - 2.4, DECK_Y + 0.4, hub.z + 1.8);
    g.add(well);

    // 七幢高脚屋围一圈
    const ring = [[-26, -6], [-14, -22], [10, -20], [28, -2], [26, 22], [4, 32], [-22, 24]];
    ring.forEach(([x, z], i) => {
      const toHub = Math.atan2(hub.x - x, hub.z - z);
      const dist = Math.hypot(hub.x - x, hub.z - z);
      const h = K.makeHouse(P, {
        w: 5.4 + (i % 3) * 0.5, d: 5 + (i % 2) * 0.6, floors: 1, floorH: 2.6, wall: P.tint('timber', [0x9a7a54, 0xa88a60, 0x8a6a46][i % 3]),
        base: null, roof: 'gable', roofMat: P.thatch, pitch: 0.8, windows: 1, stilts: DECK_Y, chimney: i % 2 === 0, over: 0.5, door: P.woodDark,
      });
      h.position.set(x, 0, z);
      h.rotation.y = toHub;
      g.add(h);
      if (h.userData.chimney) {
        const wp = h.userData.chimney.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), toHub).add(h.position);
        T.smokeFrom(g, wp);
      }
      // 栈道：从平台边出发指向房子门口
      const len = dist - 7.0 - 3.0;
      const w = K.boardwalk(P, len, 1.7, { y: DECK_Y - 0.06, piles: true, rail: i % 2 === 0 });
      w.position.set(hub.x + Math.sin(toHub + Math.PI) * 7.0, 0, hub.z + Math.cos(toHub + Math.PI) * 7.0);
      w.rotation.y = toHub + Math.PI;
      g.add(w);
      // 屋边的渔获：鳗鱼笼、桶
      const trap = cyl(0.28, 0.4, 1.1, 8, P.flat(0xa08050, 1));
      trap.position.set(x + Math.sin(toHub + 1.5) * 3.2, 0.6, z + Math.cos(toHub + 1.5) * 3.2);
      g.add(trap);
    });
    // 堤道（南北各一）：沿水面外缘接上陆路——用原木拼成的"路"
    const logMat = P.tint('woodDark', 0x7a5a38);
    for (const route of [[[-62, -34], [-44, -26], [-22, -6], [-7, 4]], [[7, 8], [26, 12], [50, 20], [66, 24]]]) {
      g.add(K.ribbon(route, 3.6, logMat, 0.5));
      for (const [px, pz] of route) {
        const p = cyl(0.2, 0.25, 1.4, 6, P.wood);
        p.position.set(px, 0.3, pz);
        g.add(p);
      }
    }

    T.landmark(g, 0, 0, 0, {
      name: '高脚屋 · The Stilt Houses',
      shortName: '高脚屋',
      tag: '脚下全是水',
      desc: '七幢茅草顶的木屋立在两人高的木桩上，围着中央一座圆平台；每幢门口都伸出一条窄木栈道通向平台，栈道下是黑绿色的泥水，睡莲和芦苇一直长到桩脚下。南北两条原木堤道把整个水乡与陆地连起来。',
      detail: '低地的人为了躲水而住进水里：木桩能抵住涨水，高高的地板让洪水从脚下流过。这样的村子在德国北部、荷兰、波兰都有，"沼泽人"靠捕鳗鱼、挖泥炭、猎水鸟和割芦苇为生，对外面的人来说，他们的村子就像迷宫——没有向导进不来。',
    }, { dist: 110, height: 60, ty: 4, rot: -2.6 });
    // 灯：平台上与屋角
    T.lamp(hub.x - 4, hub.z - 3, { ry: 0.5, h: 3.4, y: DECK_Y, light: true, gain: 0.5 });
    T.lamp(hub.x + 4, hub.z + 3, { ry: 3.6, h: 3.2, y: DECK_Y });
  }

  /* ================= 撑篙船 ================= */
  function makePunt() {
    const g = new THREE.Group();
    const hull = box(1.3, 0.35, 4.6, P.woodDark);
    hull.position.y = 0.25;
    g.add(hull);
    for (const s of [-1, 1]) {
      const end = box(1.1, 0.35, 0.9, P.woodDark);
      end.position.set(0, 0.45, s * 2.55);
      end.rotation.x = -s * 0.35;
      g.add(end);
      const wl = box(0.1, 0.4, 4.4, P.wood);
      wl.position.set(s * 0.62, 0.5, 0);
      g.add(wl);
    }
    const pole = cyl(0.04, 0.05, 4.4, 5, P.wood);
    pole.position.set(0.5, 2.0, -0.4);
    pole.rotation.z = 0.15;
    pole.userData.isPole = true;
    pole.userData.keepSeparate = true;   // 撑篙要摆动，不能被 dynamic() 的内部烘合吃掉
    g.add(pole);
    const bundle = box(0.6, 0.35, 0.8, P.flat(0xb9a04c, 1));
    bundle.position.set(0, 0.7, 1.0);
    g.add(bundle);
    return g;
  }
  const punts = [];
  {
    for (let i = 0; i < 3; i++) {
      const pu = makePunt();
      T.dynamic(pu);
      T.add(pu, 0, 0, 0, 0.12);
      punts.push({ g: pu, ph: i * 2.1, rx: 38 + i * 4, rz: 28 + i * 3, sp: 0.07 + i * 0.012 });
      // 艄公
      const man = T.person({ tabard: [0x6a5a3a, 0x4a5a3a, 0x7a4a2a][i], helmet: 'hood' }, 0, 0, 0, 'idle', 1, 0.5);
      punts[i].man = man;
    }
    // 靠在栈道边的空船
    for (const [x, z, r] of [[-18, 12, 0.4], [18, 20, 2.2], [-6, -8, 1.1]]) {
      const pu = makePunt();
      T.dynamic(pu);
      T.add(pu, x, z, r, 0.1);
    }
    T.animate((dt, t) => {
      for (const p of punts) {
        const a = t * p.sp + p.ph;
        const x = Math.cos(a) * p.rx;
        const z = 8 + Math.sin(a) * p.rz;
        const dx = -Math.sin(a) * p.rx;
        const dz = Math.cos(a) * p.rz;
        p.g.position.x = x;
        p.g.position.z = z;
        p.g.rotation.y = Math.atan2(dx, dz);
        p.g.position.y = 0.1 + Math.sin(t * 1.4 + p.ph) * 0.03;
        const pole = p.g.children.find((c) => c.userData.isPole);
        if (pole) pole.rotation.x = Math.sin(t * 1.2 + p.ph) * 0.35;
        if (p.man) {
          p.man.root.position.set(x - Math.sin(p.g.rotation.y) * 1.2, 0.5, z - Math.cos(p.g.rotation.y) * 1.2);
          p.man.facingY = p.g.rotation.y;   // 站立动画是按 facingY 摆的，直接写 rotation 会被覆盖
        }
      }
    });
  }

  /* ================= 泥炭场 ================= */
  {
    const g = new THREE.Group();
    const dark = P.flat(0x2a1f14, 1);
    // 切开的泥炭沟：四条深色长沟
    for (let i = 0; i < 4; i++) {
      const t = box(24, 0.08, 2.6, dark, false);
      t.position.set(0, 0.06, i * 4.4);
      g.add(t);
    }
    // 切好的泥炭砖：成垛晾干
    const bricks = [];
    for (let s = 0; s < 6; s++) {
      for (let r = 0; r < 4; r++) for (let i = 0; i < 5 - (r % 2); i++) {
        bricks.push({ x: -10 + s * 4 + i * 0.5, y: 0.2 + r * 0.22, z: -4 + (s % 2) * 20 + (r % 2) * 0.25, sx: 0.45, sy: 0.2, sz: 0.25 });
      }
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0x4a3220, 1), bricks));
    // 小屋：草皮屋顶
    const hut = K.makeHouse(P, {
      w: 4.6, d: 4.4, floors: 1, floorH: 2.4, wall: P.tint('timber', 0x4a3a28), base: null,
      roof: 'gable', roofMat: P.turf, pitch: 0.8, windows: 0, chimney: true, over: 0.4, door: P.woodDark,
    });
    hut.position.set(16, 0, 6);
    g.add(hut);
    T.smokeFrom(g, hut.userData.chimney.clone().add(new THREE.Vector3(16, 0, 6)));
    // 独轮车
    const wb = new THREE.Group();
    const tray = box(0.8, 0.3, 1.1, P.woodDark);
    tray.position.y = 0.55;
    wb.add(tray);
    const whl = cyl(0.3, 0.3, 0.1, 10, P.iron);
    whl.rotation.z = Math.PI / 2;
    whl.position.set(0, 0.3, 0.7);
    wb.add(whl);
    wb.position.set(-12, 0, 14);
    wb.rotation.y = 0.5;
    g.add(wb);
    T.landmark(g, -66, 44, 0.2, {
      name: '泥炭场 · The Peat Cuttings',
      shortName: '泥炭场',
      tag: '烧得比木头久',
      desc: '塘边一块被切成长条的泥地：四条黑色的深沟，沟边一垛一垛码着切好的泥炭砖，砖间留着缝让风吹干；旁边一间草皮顶的小窝棚冒着青烟，独轮车还停在半路上。',
      detail: '泥炭是沼泽里几千年的植物残骸：切下来晒干就是燃料，烧起来烟大、味重，但耐烧——在没有森林的低地，几乎全靠它取暖做饭。切泥炭是重活：一个人一天能切几百块，要弯着腰在泥水里站七八个小时。',
    }, { dist: 34, height: 16, ty: 2, rot: 0.2 });
  }

  /* ================= 浮筏集市 ================= */
  {
    const g = new THREE.Group();
    const raft = box(20, 0.5, 11, P.woodDark);
    raft.position.y = 0.45;
    g.add(raft);
    // 筏下面的浮桶
    const barrels = [];
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) barrels.push({ x: -8 + i * 3.2, y: 0.1, z: s * 4.4, sx: 0.8, sy: 0.7, sz: 1.2 });
    g.add(K.scatter(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), P.wood, barrels.map((b) => ({ ...b, rz: Math.PI / 2 }))));
    // 摊位
    const colors = [0x7a2f2f, 0x2f5a7a, 0x6a5a2a, 0x3f5c33];
    for (let i = 0; i < 4; i++) {
      const st = new THREE.Group();
      for (const sx of [-1, 1]) {
        const p = box(0.14, 2.4, 0.14, P.wood);
        p.position.set(sx * 1.3, 1.2, 0);
        st.add(p);
      }
      const rf = box(3.2, 0.1, 2.2, P.flat(colors[i], 0.9));
      rf.position.set(0, 2.5, 0.1);
      rf.rotation.x = 0.2;
      st.add(rf);
      const ct = box(2.8, 0.8, 0.8, P.woodDark);
      ct.position.set(0, 0.4, 0.7);
      st.add(ct);
      for (let k = 0; k < 5; k++) {
        const gd = i % 2 === 0 ? sphere(0.18, P.flat(0xa8a090, 0.5)) : box(0.4, 0.14, 0.3, P.flat(0xb9a04c, 1));
        gd.position.set(-1 + k * 0.5, 0.9, 0.7);
        st.add(gd);
      }
      st.position.set(-7.4 + i * 4.8, 0.7, i % 2 ? 2.4 : -2.4);
      st.rotation.y = i % 2 ? Math.PI : 0;
      g.add(st);
    }
    const flag = K.banner(P, 0x2f5a7a, { h: 4.5, w: 1.0, len: 2.0 });
    flag.position.set(9, 0.7, 4);
    g.add(flag);
    T.landmark(g, 30, 36, 0.3, {
      name: '浮筏集市 · The Floating Market',
      shortName: '浮筏集市',
      tag: '船到哪儿，集就到哪儿',
      desc: '塘心浮着一座二十米长的木筏，下面绑着一排浮桶，上面支着四个彩布顶的摊位：卖鳗鱼和干鱼的、卖芦苇筐和席子的、卖泥炭砖的，每个摊前都拴着一条撑篙船。',
      detail: '沼泽里没有大路，集市就漂在水上：每逢集日，各村的船载着货聚到筏边做买卖，买卖完船又散开。浮筏的位置每年都不一样，因为水位变了——对外人来说，找到集市，本身就是一场考验。',
    }, { dist: 44, height: 22, ty: 2, rot: 0.3 });
    T.glow(30 - 6, 3.0, 36, { color: 0xffb060, size: 3, light: true, gain: 0.5 });
  }

  /* ================= 药草婆婆的小丘 ================= */
  {
    const g = new THREE.Group();
    const mound = new THREE.Mesh(new THREE.SphereGeometry(10, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), P.flat(0x4a6a34, 1, { flatShading: true }));
    mound.scale.set(1.3, 0.34, 1.1);
    mound.castShadow = true;
    mound.receiveShadow = true;
    g.add(mound);
    const hut = K.makeHouse(P, {
      w: 5.2, d: 4.8, floors: 1, floorH: 2.6, wall: P.tint('timber', 0x5a4028), base: null, roof: 'gable',
      roofMat: P.thatch, pitch: 0.95, windows: 1, chimney: true, over: 0.5, door: P.woodDark,
    });
    hut.position.set(0, 3.0, -1);
    g.add(hut);
    T.smokeFrom(g, hut.userData.chimney.clone().add(new THREE.Vector3(0, 3.0, -1)));
    // 屋檐下晾的药草束
    const herbs = [];
    for (let i = 0; i < 18; i++) herbs.push({ x: -2.2 + i * 0.26, y: 5.2, z: 1.6, sx: 0.1, sy: 0.55, sz: 0.1, color: rand.pick([0x6a8a3a, 0x8a6aa8, 0xa89a50, 0x4a7a4a]) });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0xffffff, 1), herbs));
    const rod = box(5.2, 0.06, 0.06, P.wood);
    rod.position.set(0, 5.5, 1.6);
    g.add(rod);
    // 大锅：铁锅 + 绿色的汤 + 三脚架
    const pot = cyl(0.9, 0.7, 0.8, 10, P.iron);
    pot.position.set(4.6, 3.45, 2.6);
    g.add(pot);
    const soup = cyl(0.8, 0.8, 0.05, 10, P.flat(0x6aa850, 0.3, { emissive: 0x2a5a20, emissiveIntensity: 0.2 }), false);
    soup.position.set(4.6, 3.85, 2.6);
    g.add(soup);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const leg = box(0.08, 1.8, 0.08, P.wood);
      leg.position.set(4.6 + Math.cos(a) * 0.6, 3.1, 2.6 + Math.sin(a) * 0.6);
      leg.rotation.z = Math.cos(a) * 0.3;
      leg.rotation.x = -Math.sin(a) * 0.3;
      g.add(leg);
    }
    T.landmark(g, 74, -42, 0.8, {
      name: '药草婆婆的小丘 · The Herbalist’s Mound',
      shortName: '药草婆',
      tag: '什么病都能治，也什么都敢说',
      desc: '塘东一座草丘上的茅草屋，屋檐下晾着一排排药草束；门前的三脚架上吊着一口铁锅，锅里是绿莹莹的汤，咕嘟咕嘟冒着泡。夜里锅底的火光把整座小丘映成一个红点。',
      detail: '中世纪的乡下，"药草婆"（wise woman）是最近的医生：她们懂草药、会接生、也懂一点占卜。教会对此很矛盾——病人都找她们，可一旦出了岔子，她们就可能被指为女巫。多数药草婆其实只是比常人多读了几十年自然这本书。',
    }, { dist: 38, height: 18, ty: 4, rot: 0.8 });
    T.glow(74 + 4.6, 3.5, -42 + 2.6, { color: 0x88ffa0, size: 3, light: true, gain: 0.4 });
  }

  /* ================= 猎鸟人的芦苇棚 ================= */
  {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const hut = cone(2.4, 3.2, 8, P.flat(0xa89a58, 1, { flatShading: true }));
      hut.position.set(i * 6.4, 1.6, (i % 2) * 2);
      g.add(hut);
      const door = box(0.9, 1.5, 0.12, P.dark, false);
      door.position.set(i * 6.4, 0.75, (i % 2) * 2 + 2.2);
      g.add(door);
    }
    // 诱鸭：几只木头鸭子漂在水边
    const decoys = [];
    for (let i = 0; i < 12; i++) decoys.push({ x: -2 + rand.range(-4, 14), y: 0.3, z: 9 + rand.range(-2, 5), sx: 0.4, sy: 0.25, sz: 0.65, ry: rand() * 6 });
    g.add(K.scatter(new THREE.SphereGeometry(1, 6, 4), P.flat(0x7a5a38, 0.9), decoys));
    // 渔网架
    for (const s of [-1, 1]) {
      const p = box(0.12, 3.2, 0.12, P.wood);
      p.position.set(-6 + s * 2, 1.6, -3);
      g.add(p);
    }
    const net = K.hangingNet(4.2, 2.4);
    net.position.set(-6, 2.4, -3);
    g.add(net);
    T.landmark(g, -4, -68, 0, {
      name: '猎鸟人的芦苇棚 · The Fowlers’ Hides',
      shortName: '猎鸟棚',
      tag: '等一只鸭子等一整个早上',
      desc: '塘北岸三座圆锥形的芦苇棚，门是个黑洞洞的小口；水边漂着十几只木刻的诱鸭，一架渔网晾在木桩间。',
      detail: '猎水鸟是沼泽居民的另一条生路：猎人藏在芦苇棚里，放出木鸭诱来野鸭，然后一网打尽或一箭射中。鸭肉和鸭绒卖给城里的贵族——贵族爱吃野鸭，却从不屑于下水，这些活就全留给了沼泽人。',
    }, { dist: 30, height: 15, ty: 2, rot: 0 });
  }

  /* ================= 雾 + 鬼火 ================= */
  {
    const mists = [];
    const mmat = new THREE.SpriteMaterial({
      map: T.tex.cloudTx, color: 0xdfe8e0, transparent: true, opacity: 0.2,
      depthWrite: false, toneMapped: false, fog: true,
    });
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(mmat.clone());
      sp.userData = { cx: rand.range(-110, 110), cz: rand.range(-90, 100), y: rand.range(1.5, 5), sp: rand.range(0.01, 0.03), ph: rand() * 10, base: rand.range(0.1, 0.22) };
      const sc = rand.range(36, 70);
      sp.scale.set(sc, sc * 0.28, 1);
      T.root.add(sp);
      mists.push(sp);
    }
    const wisps = [];
    const wmat = new THREE.SpriteMaterial({
      map: T.glowTx, color: 0x88ffd0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(wmat.clone());
      sp.userData = { cx: rand.range(-100, 100), cz: rand.range(-90, 100), y: rand.range(1.2, 3.2), ph: rand() * 10, sp: rand.range(0.15, 0.4) };
      sp.scale.setScalar(rand.range(1.2, 2.2));
      T.root.add(sp);
      wisps.push(sp);
    }
    T.animate((dt, t, day) => {
      for (const m of mists) {
        const u = m.userData;
        m.position.set(u.cx + Math.sin(t * u.sp + u.ph) * 14, u.y + Math.sin(t * 0.2 + u.ph) * 0.4, u.cz + Math.cos(t * u.sp * 0.8 + u.ph) * 8);
        m.material.opacity = u.base * (1 + day * 0.7) * (0.8 + Math.sin(t * 0.3 + u.ph) * 0.2);
      }
      for (const w of wisps) {
        const u = w.userData;
        w.position.set(u.cx + Math.sin(t * u.sp + u.ph) * 9, u.y + Math.sin(t * 0.9 + u.ph) * 0.6, u.cz + Math.cos(t * u.sp * 0.9 + u.ph) * 9);
        w.material.opacity = day > 0.35 ? day * (0.4 + Math.sin(t * 2 + u.ph * 5) * 0.4) : 0;
      }
    });
  }

  /* ================= 生气：窗灯、水面涟漪、冒泡的泥炭、虫群、药釜的火花、集市旗 ================= */
  {
    // 七幢高脚屋夜里的门灯：暖黄的一团光，各自闪烁
    const ringPos = [[-26, -6], [-14, -22], [10, -20], [28, -2], [26, 22], [4, 32], [-22, 24]];
    const halos = [];
    ringPos.forEach(([x, z], i) => {
      const toHub = Math.atan2(hub.x - x, hub.z - z);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.glowTx, color: 0xffb860, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      sp.position.set(x + Math.sin(toHub) * 2.9, DECK_Y + 1.6, z + Math.cos(toHub) * 2.9);
      sp.scale.setScalar(3.4);
      sp.userData.keepSeparate = true;
      T.root.add(sp);
      halos.push(sp);
    });
    T.animate((dt, t, night) => {
      const k = THREE.MathUtils.clamp((night - 0.25) / 0.5, 0, 1);
      halos.forEach((h, i) => { h.material.opacity = k * (0.7 + Math.sin(t * 3.3 + i * 1.9) * 0.14); });
    });

    // 中央大塘与小水洼上不时荡开的涟漪（鱼在吐泡）
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xdff0e8, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
    const ripples = [];
    for (let i = 0; i < 9; i++) {
      const p = pools[i < 5 ? 0 : 1 + (i % (pools.length - 1))];
      const a = rand() * 6.28;
      const r = Math.sqrt(rand()) * 0.8;
      const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 24), ringMat.clone());
      m.userData.keepSeparate = true;
      T.add(m, p.x + Math.cos(a) * p.rx * r, p.z + Math.sin(a) * p.rz * r, 0, 0.16);
      m.rotation.x = -Math.PI / 2;
      ripples.push({ m, period: rand.range(3.2, 5.4), ph: rand() * 6 });
    }
    T.animate((dt, t) => {
      for (const r of ripples) {
        const k = ((t / r.period) + r.ph) % 1;
        r.m.scale.setScalar(0.3 + k * 3.2);
        r.m.material.opacity = (1 - k) * (1 - k) * 0.5;
      }
    });

    // 泥炭场的沼气泡：灰绿的泡泡慢慢浮起来
    T.emitter({ x: -66, y: 0.3, z: 44, count: 22, life: 1.8, size: 0.3, color: 0x8a9a74, opacity: 0.6,
      spread: [9, 0.05, 6], vel: [0, 0.45, 0], jitter: [0.05, 0.12, 0.05], fadeIn: 0.1 });

    // 药草婆釜下的绿色火星
    T.emitter({ x: 74 + 4.6, y: 3.2, z: -42 + 2.6, count: 14, life: 2.2, size: 0.22, color: 0x88ffa0, additive: true, opacity: 0.9,
      spread: [0.5, 0.2, 0.5], vel: [0, 0.8, 0], jitter: [0.25, 0.25, 0.25], fadeIn: 0.15 });

    // 夜里芦苇丛上方的萤蚊、白天掠过水面的蜻蜓
    T.emitter({ x: 0, y: 2.0, z: 6, count: 42, life: 3.2, size: 0.2, color: 0xd8ff80, additive: true, opacity: 0.9,
      spread: [100, 1.4, 85], vel: [0, 0.05, 0], jitter: [0.35, 0.2, 0.35], fadeIn: 0.3, night: 'only' });
    T.emitter({ x: 0, y: 1.6, z: 6, count: 12, life: 4, size: 0.24, color: 0x3a8aa8, opacity: 0.95,
      spread: [60, 0.8, 44], vel: [0.4, 0, 0.2], jitter: [1.0, 0.3, 1.0], fadeIn: 0.1, night: 'day' });

    // 浮筏集市桅杆上的旗
    const mast = cyl(0.1, 0.12, 6.2, 6, P.woodDark);
    T.add(mast, 30 + 4.6, 36 - 3, 0, 3.4);
    T.flag(30 + 4.6, 6.0, 36 - 3, { w: 3.2, h: 1.6, color: 0x2f7a8a, ry: 0.3 });
  }

  /* ================= 居民 ================= */
  {
    const folk = { helmet: 'hood' };
    // 栈道上的人（高度对上栈道）
    T.walker({ ...folk, tabard: 0x6a5a3a }, [-14, -12], [-3, 2], 0.5, 1, DECK_Y);
    T.walker({ ...folk, tabard: 0x4a5a3a }, [14, 12], [4, 10], 0.5, 1, DECK_Y);
    T.walker({ villager: true }, [20, 2], [6, 6], 0.45, 1, DECK_Y);
    T.person({ villager: true }, 2, 2, 0.5, 'idle', 1, DECK_Y);
    T.person({ villager: true }, -3, 9, 2.2, 'idle', 1, DECK_Y);
    // 陆地上
    T.person({ ...folk, tabard: 0x3a2a1c }, -66 + 6, 44 + 3, 1.0, 'idle');
    T.person({ ...folk, tabard: 0x3a2a1c }, -66 - 4, 44 + 9, 3.0, 'idle');
    T.person({ ...folk, tabard: 0x5a3a2a }, 74 + 4, -42 + 5, 4.0, 'idle');
    T.person({ ...folk, tabard: 0x6a5a3a }, -4, -68 + 5, 3.0, 'idle');
    T.walker({ villager: true }, [-60, -34], [-40, -26], 0.6);
    for (let i = 0; i < 4; i++) T.person({ villager: true }, 30 + rand.range(-8, 8), 36 + rand.range(-3, 3), rand() * 6, 'idle', 1, 0.8);
  }

  /* ================= 信标：一缕泥炭烟和苍苍的雾 ================= */
  {
    const bg = new THREE.Group();
    const mat = new THREE.SpriteMaterial({
      map: T.tex.cloudTx, color: 0xc8c8c0, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false,
    });
    const puffs = [];
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(mat.clone());
      sp.userData.k = i / 7;
      bg.add(sp);
      puffs.push(sp);
    }
    bg.position.set(-60, 4, 50);
    T.beacon(bg);
    // 低矮的雾带
    const bank = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T.tex.cloudTx, color: 0xdfe8e0, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false,
    }));
    bank.position.set(70, 0, -50);
    bank.scale.set(260, 40, 1);
    bg.add(bank);
    const wisp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T.glowTx, color: 0x88ffd0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    wisp.position.set(100, 3, -70);
    wisp.scale.setScalar(12);
    bg.add(wisp);
    T.beaconAnimate((dt, t, day) => {
      for (const sp of puffs) {
        const k = (t * 0.03 + sp.userData.k) % 1;
        sp.position.set(Math.sin(k * 6 + sp.userData.k * 9) * 5 + k * 16, k * 90, 0);
        sp.scale.setScalar(10 + k * 44);
        sp.material.opacity = (1 - k) * 0.38;
      }
      wisp.material.opacity = day * (0.4 + Math.sin(t * 2) * 0.3);
    });
  }

  T.overview({
    name: '沼泽水乡 · Marshmere',
    tag: '脚下全是水的镇子',
    desc: '东南低地上的一片沼泽：七幢茅草顶的高脚屋围着中央平台，木栈道和原木堤道把它们与陆地连起来；塘边是泥炭场和芦苇棚，塘里漂着浮筏集市，雾一层层飘过水面，夜里有鬼火在芦苇上空晃。',
    detail: '沼泽对中世纪的外人是"恶地"：疾病、迷路、恶灵都被认为住在里面；对沼泽人却是家——这里有人没法占的田、没人要的树、没人抢的鱼。正因为难以到达，沼泽也成了躲避战乱和苛税的避难所：不少"失踪的村子"，其实只是退进了水里。',
  }, { cx: 0, cz: 10, dist: 230, height: 110, rot: -2.6 });
}
