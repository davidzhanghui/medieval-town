import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  古橡镇 Oakhaven
 *
 *  镇子长在一棵四十五米高的巨橡下。树腰绕着螺旋阶梯，三层树屋平台
 *  之间有绳桥，一只吊篮在树干与地面间升降；树下是苔藓屋顶的林间小屋。
 *  周围是鹿园、猎鹰舍、烧炭人的土窑、绿人神龛的石圈，夜里满林萤火。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand, THREE: _t } = T;
  const { box, cyl, cone, sphere } = K;

  const bark = P.tint('timber', 0x5e4730);
  const barkDark = P.tint('timber', 0x3e2f20);
  const turf = P.turf;
  const white = P.flat(0xffffff, 1, { flatShading: true });
  const moss = P.flat(0x2f4a26, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const clearing = P.flat(0x4f5e30, 1, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });

  T.add(K.groundPatch(115, moss, { segs: 40 }), 0, 0, 0, 0.03);
  T.add(K.groundPatch(48, clearing, { segs: 36 }), 0, 0, 0, 0.04);

  /* ================= 长者橡树 ================= */
  const TRUNK_TOP = 24;
  function makeOak({ withStuff = true } = {}) {
    const g = new THREE.Group();
    // 树干：车削出的带根盘的轮廓
    const prof = [[10.5, 0], [8.0, 0.8], [6.2, 2.2], [5.2, 4.5], [4.5, 9], [4.1, 14], [3.8, 20], [3.5, TRUNK_TOP]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const trunkGeo = new THREE.LatheGeometry(prof, 18);
    const trunk = new THREE.Mesh(trunkGeo, bark);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    g.add(trunk);
    // 伸向地面的大根
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.3;
      const root = cone(1.6, 14, 6, bark);
      root.geometry.translate(0, 7, 0);
      root.rotation.z = -(Math.PI / 2 + 0.12);   // 向外并微微扎进土里
      root.rotation.y = -a;
      root.position.set(Math.cos(a) * 3.0, 1.2, Math.sin(a) * 3.0);
      g.add(root);
    }
    // 粗枝：六根从树顶辐射出去，再各分两杈
    const crownBlobs = [];
    const limbs = 7;
    for (let i = 0; i < limbs; i++) {
      const a = (i / limbs) * Math.PI * 2 + 0.3;
      const len = rand.range(15, 22);
      const lift = rand.range(0.55, 0.9);
      const limb = cyl(0.8, 1.7, len, 7, bark);
      limb.geometry.translate(0, len / 2, 0);
      limb.rotation.z = -(Math.PI / 2 - lift);
      limb.rotation.y = -a;
      limb.position.set(Math.cos(a) * 1.5, TRUNK_TOP - 2.4, Math.sin(a) * 1.5);
      g.add(limb);
      // 末梢与树冠团
      const ex = Math.cos(a) * (1.5 + Math.cos(lift) * len);
      const ez = Math.sin(a) * (1.5 + Math.cos(lift) * len);
      const ey = TRUNK_TOP - 2.4 + Math.sin(lift) * len;
      crownBlobs.push({ x: ex, y: ey + 3.0, z: ez, s: rand.range(7.5, 10.5), ry: rand() * 6 });
      crownBlobs.push({ x: ex * 0.7 + rand.range(-3, 3), y: ey + 6.5, z: ez * 0.7 + rand.range(-3, 3), s: rand.range(6, 8.5), ry: rand() * 6 });
      crownBlobs.push({ x: ex * 0.45, y: ey - 1.5, z: ez * 0.45, s: rand.range(5.5, 7.5), ry: rand() * 6 });
    }
    crownBlobs.push({ x: 0, y: TRUNK_TOP + 7, z: 0, s: 10, ry: 1 });
    const tones = [0x3a6a28, 0x44742c, 0x356026, 0x4d7a30, 0x2f5a24, 0x5a8434];
    const blobs = crownBlobs.map((b) => ({ ...b, color: rand.pick(tones) }));
    g.add(K.scatter(new THREE.IcosahedronGeometry(1, 1), white, blobs));
    return { g, crownBlobs: blobs };
  }

  const oakFull = new THREE.Group();
  const platforms = [];
  {
    const { g } = makeOak();
    oakFull.add(g);

    // 螺旋阶梯：绕着树干盘上第一层平台
    const steps = [];
    const N = 44;
    for (let i = 0; i < N; i++) {
      const a = i * 0.34;
      steps.push({ x: Math.cos(a) * 6.9, y: 0.5 + i * 0.22, z: Math.sin(a) * 6.9, ry: -a, sx: 2.6, sy: 0.18, sz: 1.1 });
    }
    oakFull.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.woodDark, steps));
    // 扶手柱
    const rp = [];
    for (let i = 0; i < N; i += 3) {
      const a = i * 0.34;
      rp.push({ x: Math.cos(a) * 8.1, y: 1.2 + i * 0.22, z: Math.sin(a) * 8.1, sx: 0.1, sy: 1.5, sz: 0.1 });
    }
    oakFull.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.wood, rp));

    // 三层平台
    const heights = [9.9, 15.5, 20.6];
    const radii = [8.4, 7.0, 5.8];
    heights.forEach((h, i) => {
      const r = radii[i];
      const deck = cyl(r, r, 0.4, 20, P.woodDark);
      deck.position.y = h;
      oakFull.add(deck);
      // 下面的托梁
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const br = box(r * 0.8, 0.3, 0.3, P.wood);
        br.position.set(Math.cos(a) * r * 0.55, h - 0.5, Math.sin(a) * r * 0.55);
        br.rotation.y = -a;
        br.rotation.z = 0.5;
        oakFull.add(br);
      }
      // 栏杆
      const posts = [];
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        posts.push({ x: Math.cos(a) * (r - 0.2), y: h + 0.95, z: Math.sin(a) * (r - 0.2), sx: 0.1, sy: 1.5, sz: 0.1 });
      }
      oakFull.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.wood, posts));
      const rail = new THREE.Mesh(new THREE.TorusGeometry(r - 0.2, 0.06, 4, 28), P.wood);
      rail.rotation.x = Math.PI / 2;
      rail.position.y = h + 1.65;
      oakFull.add(rail);
      platforms.push({ h, r });
    });

    // 平台上的小屋
    const cabin = (h, r, a, w, d, mat) => {
      const c = K.makeHouse(P, {
        w, d, floors: 1, floorH: 2.6, wall: P.tint('timber', mat), base: null, roof: 'gable', roofMat: turf, pitch: 0.7,
        windows: 1, chimney: false, over: 0.4,
      });
      c.position.set(Math.cos(a) * r, h + 0.2, Math.sin(a) * r);
      c.rotation.y = -a + Math.PI / 2;
      oakFull.add(c);
    };
    cabin(platforms[0].h, 5.0, 0.4, 4.6, 4.2, 0x7a5a3a);
    cabin(platforms[0].h, 5.0, 2.7, 4.2, 4.0, 0x6a4a30);
    cabin(platforms[0].h, 5.0, 4.4, 4.4, 4.0, 0x7a5a3a);
    cabin(platforms[1].h, 4.2, 1.6, 4.2, 3.8, 0x6a4a30);
    cabin(platforms[1].h, 4.2, 4.0, 4.0, 3.8, 0x7a5a3a);
    // 顶层是敞开的瞭望亭：四柱 + 草顶
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.78;
      const p = box(0.25, 3.0, 0.25, P.wood);
      p.position.set(Math.cos(a) * 2.8, platforms[2].h + 1.7, Math.sin(a) * 2.8);
      oakFull.add(p);
    }
    const lroof = cone(4.3, 2.0, 8, turf);
    lroof.position.y = platforms[2].h + 4.4;
    oakFull.add(lroof);

    // 挂在枝上的灯笼
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const lan = box(0.3, 0.4, 0.3, P.lanternGlass, false);
      lan.position.set(Math.cos(a) * 9.2, 8.6 + (i % 3) * 5.2, Math.sin(a) * 9.2);
      lan.userData.keepSeparate = true;
      oakFull.add(lan);
    }

    T.landmark(oakFull, 0, 0, 0, {
      name: '长者橡树 · The Elder Oak',
      shortName: '长者橡树',
      tag: '住在一棵树下的人',
      desc: '四十五米高的巨橡，树干要九个人才合抱，树根一直爬到十几米外。螺旋阶梯绕着树腰盘到第一层平台，三层平台上是树屋，顶层是敞开的瞭望亭；枝上挂着一串灯笼，到了夜里像是一棵长满了星星的树。',
      detail: '橡树在欧洲的民间信仰里一直是圣树：凯尔特人在橡树下集会，基督教传教士也常常把教堂盖在老橡树旁，借树的威望。中世纪英国国王的"王家森林"里，最老的橡树往往有名字、有专人看护，砍一棵就要罚一年的收入。',
    }, { dist: 80, height: 40, ty: 20, rot: 0.7 });
  }

  /* ----- 吊篮：沿树干在地面与第一层平台间升降 ----- */
  {
    const lift = new THREE.Group();
    const basket = box(1.6, 0.14, 1.6, P.woodDark);
    lift.add(basket);
    for (const [sx, sz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      const p = box(0.08, 0.8, 0.08, P.wood);
      p.position.set(sx, 0.4, sz);
      lift.add(p);
    }
    const rope = cyl(0.04, 0.04, 1, 4, P.rope, false);
    rope.userData.isRope = true;
    rope.userData.keepSeparate = true;   // 绳要随吊篮伸缩
    lift.add(rope);
    T.dynamic(lift);
    T.add(lift, 0, -7.6, 0, 0.6);
    const top = platforms[0].h;
    T.animate((dt, t) => {
      const k = Math.sin(t * 0.3) * 0.5 + 0.5;
      lift.position.y = 0.6 + k * (top - 0.4);
      const len = 12.5 - lift.position.y + 1;
      const r = lift.children.find((c) => c.userData.isRope);
      if (r) { r.scale.y = Math.max(0.1, len); r.position.y = len / 2 + 0.8; }
    });
  }

  /* ================= 绳桥与邻树 ================= */
  function ropeBridge(a, b, sag = 1.0) {
    const g = new THREE.Group();
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const L = A.distanceTo(B);
    const n = Math.max(6, Math.floor(L / 0.9));
    const planks = [];
    const ropes = [];
    const dir = new THREE.Vector3().subVectors(B, A);
    const yaw = Math.atan2(dir.x, dir.z);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = new THREE.Vector3().lerpVectors(A, B, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      planks.push({ x: p.x, y: p.y, z: p.z, ry: yaw, sx: 1.7, sy: 0.08, sz: 0.5 });
      for (const s of [-1, 1]) {
        const off = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(s * 0.85);
        ropes.push({ x: p.x + off.x, y: p.y + 1.0, z: p.z + off.z, ry: yaw, sx: 0.05, sy: 0.05, sz: L / n + 0.06 });
      }
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.woodDark, planks));
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.rope, ropes));
    return g;
  }
  // 邻树：细一点的橡树，顶着一个小平台
  const guard = [];
  const SMALL = [[34, 6], [-26, 30], [-4, -36]];
  SMALL.forEach(([x, z], i) => {
    const g = new THREE.Group();
    const tr = cyl(1.3, 2.0, 12, 8, bark);
    tr.position.y = 6;
    g.add(tr);
    const deck = cyl(3.4, 3.4, 0.3, 12, P.woodDark);
    deck.position.y = 9.8;
    g.add(deck);
    const posts = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      posts.push({ x: Math.cos(a) * 3.2, y: 10.7, z: Math.sin(a) * 3.2, sx: 0.08, sy: 1.4, sz: 0.08 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.wood, posts));
    const blobs = [];
    for (let k = 0; k < 5; k++) blobs.push({ x: rand.range(-3, 3), y: 14 + rand.range(0, 3), z: rand.range(-3, 3), s: rand.range(4.5, 6.5), color: rand.pick([0x3a6a28, 0x44742c, 0x4d7a30]) });
    g.add(K.scatter(new THREE.IcosahedronGeometry(1, 1), white, blobs));
    T.add(g, x, z);
    guard.push([x, z]);
  });
  {
    const bridges = new THREE.Group();
    const h0 = platforms[0].h + 0.4;
    for (const [x, z] of SMALL) {
      const ang = Math.atan2(z, x);
      const sx = Math.cos(ang) * platforms[0].r;
      const sz = Math.sin(ang) * platforms[0].r;
      const tx = x - Math.cos(ang) * 3.1;
      const tz = z - Math.sin(ang) * 3.1;
      bridges.add(ropeBridge([sx, h0, sz], [tx, 10.0, tz], 1.4));
    }
    // 小树之间也拉一道
    bridges.add(ropeBridge([34 - 2.5, 10.0, 6 + 2], [-4 + 2.5, 10.0, -36 + 1], 2.2));
    T.add(bridges, 0, 0);
  }

  /* ================= 森林里的鹿园 ================= */
  const deer = [];
  {
    const park = new THREE.Group();
    const px = 78, pz = -44;
    const W = 46, D = 34;
    park.add(K.fenceLine(P, [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2], [-W / 2, -D / 2]], { h: 1.4, gap: 2.4 }));
    // 林间草地
    const gp = K.groundPatch(26, P.flat(0x5d7438, 1, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), { squashZ: 0.7 });
    gp.position.set(0, 0.06, 0);
    park.add(gp);
    // 饮水槽
    const trough = box(3.4, 0.5, 1.0, P.woodDark);
    trough.position.set(-12, 0.25, -8);
    park.add(trough);
    const tw = box(3.0, 0.05, 0.7, P.water, false);
    tw.position.set(-12, 0.5, -8);
    park.add(tw);
    // 草料架
    const hay = box(2.8, 0.9, 0.9, P.flat(0xb9a04c, 1));
    hay.position.set(12, 0.5, 6);
    park.add(hay);
    T.landmark(park, px, pz, 0, {
      name: '鹿园 · The Deer Park',
      shortName: '鹿园',
      tag: '国王的鹿，谁碰谁掉脑袋',
      desc: '林中圈出的一大块栅栏地，几头赤鹿在草地上走动：公鹿头顶着分叉的大角，母鹿带着小鹿低头吃草。角落里有一只饮水槽和一架草料。',
      detail: '中世纪欧洲的"鹿园"是贵族特权的象征：森林里的鹿属于国王，平民偷猎一只鹿会被割手、剜眼，甚至处死。养鹿既是肉食来源，也是贵族狩猎消遣——狩猎被视为只有骑士才配做的"高贵运动"。',
    }, { dist: 54, height: 28, ty: 2, rot: 0.7 });

    // 鹿：身体 / 颈 / 头 / 角烘进一个顶点色网格，四条腿各挂一根枢轴
    const deerMat = P.std('deer', { vertexColors: true, roughness: 0.9 });
    const col = (geo, hex) => {
      const c = new THREE.Color(hex);
      const n = geo.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      return geo;
    };
    const makeDeer = (stag) => {
      const g = new THREE.Group();
      const bodyParts = [];
      const body = new THREE.BoxGeometry(0.8, 0.8, 1.9);
      body.translate(0, 1.15, 0);
      bodyParts.push(col(body, 0x8a6038));
      const belly = new THREE.BoxGeometry(0.6, 0.3, 1.6);
      belly.translate(0, 0.82, 0);
      bodyParts.push(col(belly, 0xd8c8a8));
      const neck = new THREE.BoxGeometry(0.38, 0.9, 0.4);
      neck.rotateX(-0.55);
      neck.translate(0, 1.7, 1.05);
      bodyParts.push(col(neck, 0x8a6038));
      const head = new THREE.BoxGeometry(0.32, 0.34, 0.6);
      head.translate(0, 2.15, 1.5);
      bodyParts.push(col(head, 0x7a5430));
      const snout = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      snout.translate(0, 2.08, 1.88);
      bodyParts.push(col(snout, 0x2a1f18));
      const tail = new THREE.BoxGeometry(0.16, 0.2, 0.14);
      tail.translate(0, 1.4, -1.0);
      bodyParts.push(col(tail, 0xe8dcc0));
      for (const s of [-1, 1]) {
        const ear = new THREE.BoxGeometry(0.1, 0.22, 0.12);
        ear.translate(s * 0.2, 2.35, 1.35);
        bodyParts.push(col(ear, 0x7a5430));
        if (stag) {
          // 角：一根主枝加两个杈
          const main = new THREE.BoxGeometry(0.06, 0.9, 0.06);
          main.rotateZ(-s * 0.25);
          main.translate(s * 0.28, 2.85, 1.38);
          bodyParts.push(col(main, 0xd8cdb0));
          for (const k of [0, 1]) {
            const tine = new THREE.BoxGeometry(0.05, 0.4, 0.05);
            tine.rotateX(-0.6);
            tine.rotateZ(-s * 0.4);
            tine.translate(s * (0.36 + k * 0.08), 2.7 + k * 0.35, 1.5);
            bodyParts.push(col(tine, 0xd8cdb0));
          }
        }
      }
      const bm = new THREE.Mesh(mergeGeometries(bodyParts, false), deerMat);
      bm.castShadow = true;
      g.add(bm);
      const legs = [];
      for (const [lx, lz] of [[-0.28, 0.7], [0.28, 0.7], [-0.28, -0.7], [0.28, -0.7]]) {
        const leg = new THREE.Group();
        const lg = new THREE.BoxGeometry(0.14, 0.95, 0.14);
        lg.translate(0, -0.47, 0);
        const lm = new THREE.Mesh(col(lg, 0x5a3e22), deerMat);
        lm.castShadow = true;
        leg.add(lm);
        leg.position.set(lx, 0.95, lz);
        leg.userData.keepSeparate = true;
        g.add(leg);
        legs.push(leg);
      }
      g.userData.legs = legs;
      g.userData.body = bm;
      g.userData.keepSeparate = true;
      return g;
    };
    for (let i = 0; i < 7; i++) {
      const d = makeDeer(i === 0 || i === 3);
      d.scale.setScalar(i === 6 ? 0.6 : 1);
      const rec = { d, cx: px + rand.range(-14, 14), cz: pz + rand.range(-9, 9), rad: rand.range(3, 8), ph: rand() * 6, sp: rand.range(0.1, 0.22), grazing: rand() < 0.5 };
      T.add(d, rec.cx, rec.cz, rand() * 6);
      deer.push(rec);
    }
    T.animate((dt, t) => {
      for (const r of deer) {
        const a = t * r.sp + r.ph;
        const x = r.cx + Math.cos(a) * r.rad;
        const z = r.cz + Math.sin(a * 0.8) * r.rad * 0.7;
        const dx = r.cx + Math.cos(a + 0.01) * r.rad - x;
        const dz = r.cz + Math.sin((a + 0.01) * 0.8) * r.rad * 0.7 - z;
        r.d.position.x = x;
        r.d.position.z = z;
        r.d.rotation.y = Math.atan2(dx, dz);
        const walking = Math.sin(t * 0.25 + r.ph) > -0.3;
        const sw = walking ? Math.sin(t * 5 + r.ph) * 0.5 : 0;
        const ls = r.d.userData.legs;
        ls[0].rotation.x = sw; ls[3].rotation.x = sw;
        ls[1].rotation.x = -sw; ls[2].rotation.x = -sw;
        // 吃草时低头
        r.d.userData.body.rotation.x = walking ? 0 : 0.0;
        r.d.position.y = walking ? Math.abs(Math.sin(t * 5 + r.ph)) * 0.03 : 0;
      }
    });
  }

  /* ================= 猎人大屋 ================= */
  {
    const g = new THREE.Group();
    const lodge = K.makeHouse(P, {
      w: 14, d: 8.5, floors: 1, floorH: 5.2, wall: P.tint('timber', 0x6e4e32), base: null, roof: 'gable',
      roofMat: P.shingle, pitch: 0.75, windows: 2, door: P.woodDark, porch: true, chimney: true, over: 0.8,
    });
    g.add(lodge);
    T.smokeFrom(g, lodge.userData.chimney);
    // 门上的鹿角
    const ant = new THREE.Group();
    for (const s of [-1, 1]) {
      const m = box(0.12, 1.6, 0.12, P.flat(0xd8cdb0, 0.8));
      m.position.set(s * 0.7, 0, 0);
      m.rotation.z = -s * 0.5;
      ant.add(m);
      for (let k = 0; k < 3; k++) {
        const t = box(0.08, 0.7, 0.08, P.flat(0xd8cdb0, 0.8));
        t.position.set(s * (0.9 + k * 0.25), 0.35 + k * 0.25, 0);
        t.rotation.z = -s * 0.2;
        ant.add(t);
      }
    }
    ant.position.set(0, 5.4, 4.6);
    g.add(ant);
    // 晾兽皮的架子
    for (let i = 0; i < 2; i++) {
      const frame = new THREE.Group();
      for (const s of [-1, 1]) {
        const p = box(0.12, 2.4, 0.12, P.wood);
        p.position.set(s * 0.8, 1.2, 0);
        frame.add(p);
      }
      const bar = box(1.8, 0.1, 0.1, P.wood);
      bar.position.y = 2.3;
      frame.add(bar);
      const hide = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.8), T.TM.hideMat);
      hide.position.set(0, 1.35, 0.03);
      frame.add(hide);
      frame.position.set(8.2 + i * 2.4, 0, 3.6);
      g.add(frame);
    }
    // 挂着的猎物（野兔、野鸡）
    for (let i = 0; i < 5; i++) {
      const prey = sphere(0.22, P.flat(0x8a6a48, 1));
      prey.scale.y = 1.5;
      prey.position.set(-5 + i * 0.5, 3.2, 4.9);
      g.add(prey);
    }
    const bar2 = box(3, 0.08, 0.08, P.wood);
    bar2.position.set(-4, 3.55, 4.9);
    g.add(bar2);
    // 劈柴垛
    const wp = T.VIL.makeWoodpile(T.TM);
    wp.position.set(-8, 0, 1);
    g.add(wp);
    T.landmark(g, 58, 42, -0.4, {
      name: '猎人大屋 · Hunting Lodge',
      shortName: '猎人屋',
      tag: '守森林的人',
      desc: '一幢圆木垒起的长屋，陡峭的木瓦顶，门廊上钉着一对巨大的鹿角；屋外的晾皮架上绷着几张兽皮，檐下挂着野兔和野鸡，墙边是一大垛劈好的柴。',
      detail: '"森林官"是中世纪最有实权的小官：他管着国王的林子，决定谁能砍柴、谁能放猪，也抓偷猎的人。他常常住在林间的大屋里，门口钉鹿角，既是炫耀也是警告——这里的一草一木，都归他管。',
    }, { dist: 40, height: 20, ty: 4, rot: -0.4 });
  }

  /* ================= 猎鹰舍 ================= */
  {
    const g = new THREE.Group();
    const walls = cyl(3.4, 3.6, 3.6, 8, P.tint('timber', 0x7a5a3a));
    walls.position.y = 1.8;
    g.add(walls);
    const roof = cone(5.0, 2.8, 8, P.shingle);
    roof.position.y = 5.0;
    g.add(roof);
    const door = box(1.2, 2.2, 0.2, P.dark, false);
    door.position.set(0, 1.1, 3.55);
    g.add(door);
    // 栖木
    for (let i = 0; i < 3; i++) {
      const p = box(0.12, 1.7, 0.12, P.wood);
      p.position.set(-4.4 + i * 1.8, 0.85, 5.4);
      g.add(p);
      const cap = box(0.5, 0.1, 0.18, P.woodDark);
      cap.position.set(-4.4 + i * 1.8, 1.75, 5.4);
      g.add(cap);
      const hawk = sphere(0.2, P.flat(0x6a4a2a, 1));
      hawk.scale.set(0.8, 1.2, 0.9);
      hawk.position.set(-4.4 + i * 1.8, 2.0, 5.4);
      g.add(hawk);
    }
    // 训鹰场的长绳桩
    const stake = box(0.1, 1.2, 0.1, P.wood);
    stake.position.set(5.2, 0.6, 5.0);
    g.add(stake);
    T.landmark(g, -52, 60, 0.4, {
      name: '猎鹰舍 · Falconry Mews',
      shortName: '猎鹰舍',
      tag: '比马还贵的鸟',
      desc: '一座八角木屋，圆锥形木瓦顶，门口一溜栖木上落着几只矛隼，脚上拴着皮绳。驯鹰人站在空地上，戴着长手套，天上还有一只正在盘旋。',
      detail: '中世纪的贵族以养猎鹰为荣：苍鹰、矛隼、游隼，等级与主人的身份严格对应——国王用矛隼，伯爵用游隼，骑士用苍鹰，牧师只能养小隼。一只好鹰的价格比一匹战马还高，丢了鹰甚至可能被视为不祥之兆。',
    }, { dist: 30, height: 16, ty: 3, rot: 0.4 });
    T.birds({ count: 2, center: [-52, 60], radius: 22, height: 15, color: 0x6a4a2a, scale: 1.6 });
    T.person({ tabard: 0x3a5a2a, helmet: 'hood' }, -52 + 3.4, 60 + 7, 3.2, 'idle');
  }

  /* ================= 烧炭人的土窑 ================= */
  {
    const g = new THREE.Group();
    const earth = P.flat(0x45382a, 1, { flatShading: true });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), earth);
      m.scale.y = 0.85;
      m.position.set(i * 9.4, 0, (i % 2) * 4);
      m.castShadow = true;
      g.add(m);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const st = box(0.12, 1.2, 0.12, P.wood);
        st.position.set(i * 9.4 + Math.cos(a) * 3.9, 0.5, (i % 2) * 4 + Math.sin(a) * 3.9);
        g.add(st);
      }
      T.smokeFrom(g, new THREE.Vector3(i * 9.4, 3.1, (i % 2) * 4));
    }
    // 窝棚：圆木搭成的 A 字形
    const hut = cone(2.6, 3.2, 6, P.flat(0x5a4632, 1));
    hut.position.set(-9, 1.6, -2);
    g.add(hut);
    const logs = [];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6 - r; i++) logs.push({ x: -2.5 + i * 0.5 + r * 0.25, y: 0.2 + r * 0.38, z: 8, sx: 3.2, sy: 0.36, sz: 0.36 });
    g.add(K.scatter(new THREE.CylinderGeometry(0.5, 0.5, 1, 6), P.woodDark, logs.map((l) => ({ ...l, rz: Math.PI / 2 }))));
    T.landmark(g, -74, -48, 0.3, {
      name: '烧炭人的土窑 · Charcoal Clamps',
      shortName: '土窑',
      tag: '半个森林变成煤',
      desc: '空地上三座土馒头一样的窑，外面糊着湿泥，顶上冒着青烟，四周钉着一圈小木桩；旁边是烧炭人的圆木窝棚和一垛垛等着入窑的短木。',
      detail: '烧炭是中世纪森林里最古老的职业：把木头垒成圆堆，盖上草皮和泥，只留一个小气孔，闷烧四五天不能熄。烧炭人要日夜守着，睡在窝棚里。木炭火力强、烟少，是炼铁和铁匠铺的命根子，所以矿镇周围的林子才会越砍越稀。',
    }, { dist: 38, height: 18, ty: 2, rot: 0.3 });
    T.person({ tabard: 0x2a2826, helmet: 'hood' }, -74 - 6, -48 + 3, 0.8, 'idle');
  }

  /* ================= 绿人神龛 ================= */
  {
    const g = new THREE.Group();
    const stones = P.tint('stone', 0xb0aca0);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const s = box(0.9, 2.2 + (i % 3) * 0.5, 0.6, stones);
      s.position.set(Math.cos(a) * 6.4, 1.2 + (i % 3) * 0.25, Math.sin(a) * 6.4);
      s.rotation.y = -a + 0.2;
      g.add(s);
    }
    // 中央木桩：刻着一张叶子脸
    const post = cyl(0.7, 0.9, 3.4, 8, bark);
    post.position.y = 1.7;
    g.add(post);
    const faceTex = K.canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = '#5a4630';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#4f8a36';
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        c.beginPath();
        c.ellipse(w / 2 + Math.cos(a) * 42, h / 2 + Math.sin(a) * 42, 14, 7, a, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#3a2a1c';
      c.beginPath(); c.arc(w / 2 - 15, h / 2 - 8, 6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(w / 2 + 15, h / 2 - 8, 6, 0, Math.PI * 2); c.fill();
      c.fillRect(w / 2 - 14, h / 2 + 14, 28, 6);
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshStandardMaterial({ map: faceTex, roughness: 1 }));
    face.position.set(0, 2.4, 0.95);
    g.add(face);
    // 供品
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const f = sphere(0.14, P.flat([0xd04a3a, 0xe0c040, 0xe8e0d0][i % 3], 0.8));
      f.position.set(Math.cos(a) * 1.5, 0.18, Math.sin(a) * 1.5);
      g.add(f);
    }
    T.landmark(g, 6, 82, 0.2, {
      name: '绿人神龛 · Green Man Shrine',
      shortName: '神龛',
      tag: '老神还没走',
      desc: '林间空地上围着九块低矮的立石，当中是一根橡木桩，上头刻着一张从嘴里长出叶子的脸；脚下摆着几颗野果、几朵花，是路过的人放的。',
      detail: '"绿人"（Green Man）是中世纪教堂里常见的雕刻：一张人脸，从嘴、鼻、眼里长出枝叶。它并不是基督教的圣像，而是更古老的森林神的残影——教会没法把它赶走，干脆让它躲进教堂的柱头和长椅上。',
    }, { dist: 22, height: 11, ty: 2, rot: 0.2 });
  }

  /* ================= 林间集市与民居 ================= */
  {
    // 路径：以橡树为圈，三条林间小径放射出去
    T.add(K.ribbon([[30, 30], [20, 40], [6, 44], [-12, 40]], 4.2, P.road, 0.05), 0, 0);
    for (const [ex, ez] of [[110, -60], [-110, -70], [-90, 80], [100, 70]]) {
      T.add(K.ribbon([[0, 0], [ex * 0.4, ez * 0.4], [ex, ez]], 3.2, P.flat(0x6a5a3e, 1, { polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }), 0.055), 0, 0);
    }

    // 集市摊位
    const stall = (x, z, ry, color, goods) => {
      const s = new THREE.Group();
      for (const sx of [-1, 1]) {
        const p = box(0.16, 2.8, 0.16, P.wood);
        p.position.set(sx * 1.5, 1.4, 0);
        s.add(p);
      }
      const roof = box(3.6, 0.1, 2.4, P.flat(color, 0.9));
      roof.position.set(0, 2.9, 0.2);
      roof.rotation.x = 0.22;
      s.add(roof);
      const counter = box(3.2, 0.9, 0.9, P.woodDark);
      counter.position.set(0, 0.45, 0.7);
      s.add(counter);
      for (let i = 0; i < 6; i++) {
        const gd = goods === 'honey' ? sphere(0.2, P.flat(0xe0a020, 0.4)) : goods === 'fur' ? box(0.5, 0.1, 0.5, P.flat(0x6a4a30, 1)) : sphere(0.18, P.flat(0xc8a070, 1));
        gd.position.set(-1.1 + i * 0.44, 1.05, 0.7);
        s.add(gd);
      }
      T.add(s, x, z, ry);
    };
    const mk = new THREE.Group();
    // 市集作为地标：把四个摊位放进一个组
    const addStall = (x, z, ry, color, goods) => {
      const s = new THREE.Group();
      for (const sx of [-1, 1]) {
        const p = box(0.16, 2.8, 0.16, P.wood);
        p.position.set(sx * 1.5, 1.4, 0);
        s.add(p);
      }
      const roof = box(3.6, 0.1, 2.4, P.flat(color, 0.9));
      roof.position.set(0, 2.9, 0.2);
      roof.rotation.x = 0.22;
      s.add(roof);
      const counter = box(3.2, 0.9, 0.9, P.woodDark);
      counter.position.set(0, 0.45, 0.7);
      s.add(counter);
      for (let i = 0; i < 6; i++) {
        const gd = goods === 'honey' ? sphere(0.2, P.flat(0xe0a020, 0.4)) : goods === 'fur' ? box(0.5, 0.1, 0.5, P.flat(0x6a4a30, 1)) : sphere(0.18, P.flat(0xc8a070, 1));
        gd.position.set(-1.1 + i * 0.44, 1.05, 0.7);
        s.add(gd);
      }
      s.position.set(x, 0, z);
      s.rotation.y = ry;
      mk.add(s);
    };
    addStall(-5, 0, 0.2, 0x7a2f2f, 'honey');
    addStall(0, -4, 0, 0x3f5c33, 'mush');
    addStall(5, 0, -0.2, 0x6b4a2a, 'fur');
    addStall(0, 5, Math.PI, 0x2f5a7a, 'honey');
    // 中间一口篝火
    const fp = cyl(0.9, 1.0, 0.3, 10, P.stone);
    fp.position.set(0, 0.15, 0);
    mk.add(fp);
    T.landmark(mk, -30, 48, 0, {
      name: '林间集市 · Forest Market',
      shortName: '集市',
      tag: '蜂蜜、毛皮、蘑菇',
      desc: '空地上支起四座低矮的摊位，彩布顶歪歪扭扭：红的卖蜂蜜，绿的卖蘑菇，褐的卖兽皮，蓝的卖干果；中间是一堆烧着的篝火，来赶集的人围着取暖。',
      detail: '林区的集市不用银币：一罐蜂蜜换一张皮，一筐蘑菇换一把斧头。以物易物之所以持续了那么久，是因为林子里的人手里压根没多少钱——他们的"货币"，是森林本身每年给的东西。',
    }, { dist: 24, height: 12, ty: 2 });
    T.glow(-30, 1.2, 48, { color: 0xff8a30, size: 4, light: true, gain: 0.8 });

    // 苔藓屋顶的小屋，围着橡树成圈
    const taken = [{ x: 0, z: 0, r: 22 }, { x: 58, z: 42, r: 18 }, { x: -52, z: 60, r: 14 }, { x: -74, z: -48, r: 22 }, { x: 6, z: 82, r: 14 }, { x: -30, z: 48, r: 12 }, { x: 78, z: -44, r: 32 }];
    SMALL.forEach(([x, z]) => taken.push({ x, z, r: 6 }));
    let placed = 0;
    let guard = 0;
    while (placed < 16 && guard < 700) {
      guard++;
      const a = rand() * Math.PI * 2;
      const r = rand.range(32, 100);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r)) continue;
      const wood = P.tint('timber', rand.pick([0x6a4a30, 0x7a5a3a, 0x5a4028]));
      T.house({
        w: rand.range(4.2, 5.6), d: rand.range(4, 5.2), floors: 1, floorH: 2.5, wall: wood, base: null,
        roof: 'gable', roofMat: turf, pitch: 0.75, windows: 1, chimney: rand() < 0.75, over: 0.5,
      }, x, z, -a + Math.PI / 2 + rand.range(-0.3, 0.3));
      taken.push({ x, z, r: 8 });
      placed++;
      if (rand() < 0.5) T.add(T.VIL.makeWoodpile(T.TM), x + Math.cos(a) * 4, z + Math.sin(a) * 4, rand() * 6);
    }
    for (let i = 0; i < 6; i++) T.lamp(Math.cos(i) * 44, Math.sin(i) * 44, { ry: i, h: 3.0, light: i === 2 });
  }

  /* ================= 林下杂物：蘑菇、蕨、倒木、树桩 ================= */
  {
    const keep = (x, z) => Math.hypot(x, z) < 12;
    const pts = K.ringPoints(rand, 0, 0, 14, 105, 70, keep);
    const mush = pts.slice(0, 40).map(([x, z]) => ({ x, y: 0.2, z, s: rand.range(0.15, 0.32), ry: rand() * 6 }));
    T.add(K.scatter(new THREE.SphereGeometry(1, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), P.flat(0xc83a2a, 0.7), mush), 0, 0);
    T.add(K.scatter(new THREE.CylinderGeometry(0.4, 0.5, 1.4, 6), P.flat(0xe8e0cc, 0.9), mush.map((m) => ({ ...m, y: 0.1, sy: m.s * 1.2, sx: m.s * 0.5, sz: m.s * 0.5 }))), 0, 0);
    const ferns = pts.slice(30).map(([x, z]) => ({ x, y: 0.35, z, sx: rand.range(0.6, 1.1), sy: rand.range(0.7, 1.4), sz: rand.range(0.6, 1.1), ry: rand() * 6 }));
    T.add(K.scatter(new THREE.ConeGeometry(1, 1.4, 5), P.flat(0x3f7a30, 1, { flatShading: true }), ferns), 0, 0);
    const logs = K.ringPoints(rand, 0, 0, 20, 100, 12, keep).map(([x, z]) => ({ x, y: 0.4, z, sx: rand.range(3, 5), sy: 0.8, sz: 0.8, ry: rand() * 6 }));
    T.add(K.scatter(new THREE.CylinderGeometry(0.5, 0.5, 1, 7), barkDark, logs.map((l) => ({ ...l, rz: Math.PI / 2 }))), 0, 0);
    const stumps = K.ringPoints(rand, 0, 0, 20, 100, 14, keep).map(([x, z]) => ({ x, y: 0.4, z, s: rand.range(0.6, 1.1) }));
    T.add(K.scatter(new THREE.CylinderGeometry(0.6, 0.75, 0.8, 8), bark, stumps), 0, 0);
    // 外圈的树林：橡树与松树混生
    const ring1 = K.ringPoints(rand, 0, 0, 105, 160, 90);
    T.add(K.grove(P, 'oak', ring1, { leaf: 0x3a6a28, scale: [0.9, 1.5], rand }), 0, 0);
    const ring2 = K.ringPoints(rand, 0, 0, 108, 165, 70);
    T.add(K.grove(P, 'pine', ring2, { leaf: 0x2a4a28, scale: [0.9, 1.5], rand }), 0, 0);
  }

  /* ================= 居民 ================= */
  {
    const fo = { tabard: 0x3a5a2a, helmet: 'hood' };
    T.walker(fo, [20, 30], [-16, 42], 0.6);
    T.walker({ ...fo, weapon: 'bow' }, [50, 30], [75, 10], 0.5);
    T.walker({ villager: true }, [-30, 40], [-10, 55], 0.5);
    T.walker({ villager: true }, [10, -30], [-20, -50], 0.5);
    for (let i = 0; i < 8; i++) T.person({ ...fo, tabard: rand.pick([0x3a5a2a, 0x5a4a28, 0x6a3a2a]) }, rand.range(-40, 40), rand.range(-35, 55), rand() * 6, 'idle');
    // 树屋平台上的人（高度要对上平台）
    T.person({ villager: true }, 3.5, 3.0, 0.5, 'idle', 1, platforms[0].h + 0.4);
    T.person({ villager: true }, -4, -3.5, 2.5, 'idle', 1, platforms[0].h + 0.4);
    T.person({ tabard: 0x3a5a2a, helmet: 'hood' }, 2, 1, 1, 'idle', 1, platforms[2].h + 0.4);
  }

  /* ================= 生气：灯笼光晕、落叶、林鸟、窑火、神龛的光点、绳桥上的行人 ================= */
  {
    // 枝上八盏灯笼：夜里各带一圈光晕，微微闪动
    const halos = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.glowTx, color: 0xffc070, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      sp.position.set(Math.cos(a) * 9.2, 8.6 + (i % 3) * 5.2 + 0.1, Math.sin(a) * 9.2);
      sp.scale.setScalar(3.4);
      sp.userData.keepSeparate = true;
      T.root.add(sp);
      halos.push(sp);
    }
    T.animate((dt, t, night) => {
      const k = THREE.MathUtils.clamp((night - 0.25) / 0.5, 0, 1);
      halos.forEach((h, i) => { h.material.opacity = k * (0.72 + Math.sin(t * 4.1 + i * 2) * 0.12); });
    });

    // 巨橡树冠飘下来的叶子（白天）
    for (const [c, n] of [[0x4d7a30, 30], [0xd0a030, 18]]) {
      T.emitter({ x: 0, y: 36, z: 0, count: n, life: 9, size: 0.24, color: c, opacity: 0.95,
        spread: [15, 4, 15], vel: [0.25, -1.2, 0.1], jitter: [0.3, 0.15, 0.3], wind: [0.03, 0, 0.01], fadeIn: 0.05, night: 'day' });
    }

    // 树冠上盘旋的小鸟
    T.birds({ count: 5, center: [0, 0], radius: 17, height: 32, color: 0x4a3a2a, scale: 0.9 });

    // 土窑：窑口透出的暗红火光 + 一股股青烟
    for (let i = 0; i < 3; i++) {
      const k = K.toWorld(-74, -48, 0.3)(i * 9.4, (i % 2) * 4);
      T.emitter({ x: k.x, y: 2.8, z: k.z, count: 8, life: 1.4, size: 0.3, color: 0xff7a30, additive: true,
        spread: [0.4, 0.1, 0.4], vel: [0, 0.6, 0], jitter: [0.2, 0.2, 0.2], fadeIn: 0.1, opacity: 0.8, night: 'only' });
      T.emitter({ x: k.x, y: 3.2, z: k.z, count: 10, life: 4.5, size: 1.5, color: 0x9aa4a0, opacity: 0.22,
        spread: [0.4, 0.1, 0.4], vel: [0.2, 1.1, 0.05], jitter: [0.15, 0.2, 0.15], wind: [0.1, 0, 0.02], grow: 2.6, fadeIn: 0.2 });
    }

    // 绿人神龛：一缕缕往上飘的绿色光点
    T.emitter({ x: 6, y: 1.2, z: 82, count: 26, life: 4, size: 0.26, color: 0x9aff80, additive: true, opacity: 0.85,
      spread: [3.2, 0.6, 3.2], vel: [0, 0.45, 0], jitter: [0.15, 0.15, 0.15], fadeIn: 0.3 });

    // 绳桥上来回走的人：从第一层平台走向邻树
    const h0 = platforms[0].h + 0.4;
    SMALL.slice(0, 2).forEach(([x, z], i) => {
      const ang = Math.atan2(z, x);
      T.walker({ tabard: i ? 0x2f58a8 : 0x6a3a22, helmet: 'hood' },
        [Math.cos(ang) * (platforms[0].r + 0.5), Math.sin(ang) * (platforms[0].r + 0.5)],
        [x - Math.cos(ang) * 3.6, z - Math.sin(ang) * 3.6], 0.45, 1, h0 - 1.05 + 0.25);
    });
  }

  /* ================= 萤火虫 ================= */
  {
    const flies = [];
    const mat = new THREE.SpriteMaterial({
      map: T.glowTx, color: 0xc8ff70, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    for (let i = 0; i < 70; i++) {
      const sp = new THREE.Sprite(mat.clone());
      const a = rand() * 6.28;
      const r = rand.range(6, 90);
      sp.userData = { cx: Math.cos(a) * r, cz: Math.sin(a) * r, cy: rand.range(1, 14), ph: rand() * 10, sp: rand.range(0.2, 0.6) };
      sp.scale.setScalar(rand.range(0.8, 1.6));
      T.root.add(sp);
      flies.push(sp);
    }
    T.animate((dt, t, day) => {
      for (const f of flies) {
        const u = f.userData;
        f.position.set(u.cx + Math.sin(t * u.sp + u.ph) * 3, u.cy + Math.sin(t * u.sp * 1.7 + u.ph) * 1.2, u.cz + Math.cos(t * u.sp * 0.8 + u.ph) * 3);
        const tw = Math.sin(t * 3 + u.ph * 3) * 0.5 + 0.5;
        f.material.opacity = day > 0.3 ? day * (0.25 + tw * 0.75) : 0;
      }
    });
  }

  /* ================= 信标：巨橡的树冠 ================= */
  {
    const { g } = makeOak();
    g.scale.setScalar(1.0);
    T.beacon(g);
  }

  T.overview({
    name: '古橡镇 · Oakhaven',
    tag: '住在一棵树下的人',
    desc: '西北深林里的小镇：一棵四十五米高的老橡树撑开整片天，树腰盘着阶梯，三层树屋之间拉着绳桥；树下是苔藓屋顶的圆木小屋，林子里有鹿园、猎鹰舍和冒青烟的炭窑，入夜后萤火虫把整片林子点亮。',
    detail: '中世纪的欧洲大陆约三分之一是森林，林子里的村庄靠林吃饭：放猪吃橡子、砍柴烧炭、打猎采蜜。林子既是衣食之源，也是国王和贵族的私产——砍一棵树、猎一头鹿都要付钱或者挨罚，所以林区的人学会了与树共处，也学会了躲着官差。',
  }, { cx: 0, cz: 0, dist: 190, height: 95, rot: 0.7 });
}
