import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  雪岭长屋 Frostholm
 *
 *  最北边的雪原。一座三十多米的议事长屋居中，周围是盖着积雪草皮的
 *  长屋和高脚仓房；西边是冻湖，湖上有冰钓棚；东边的冰港里停着一艘
 *  龙头长船。夜里天空垂下绿色和紫色的极光，雪片一直在飘。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;

  const snow = P.flat(0xe2ecf1, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const snowTop = P.flat(0xf2f7fa, 0.95);
  const darkWood = P.tint('timber', 0x4a3a2a);
  const lightWood = P.tint('timber', 0x8a6a48);
  const iceMat = P.std('frost:ice', {
    color: 0xa8d4e6, roughness: 0.06, metalness: 0.12, transparent: true, opacity: 0.96,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });

  T.add(K.groundPatch(175, snow, { segs: 48 }), 0, 0, 0, 0.03);

  /* ---------- 背后的雪山 ---------- */
  T.add(T.nature.makeMountain(T.NM, { h: 150, r: 220, snow: true, seed: 71 }), -20, -250);
  T.add(T.nature.makeMountain(T.NM, { h: 100, r: 150, snow: true, seed: 83 }), 150, -230);
  T.add(T.nature.makeMountain(T.NM, { h: 90, r: 130, snow: true, seed: 97 }), -170, -200);

  /* ---------- 冻湖 ---------- */
  const lake = { x: -78, z: 44, rx: 58, rz: 40 };
  {
    const m = K.groundPatch(1, iceMat, { segs: 40 });
    T.add(m, lake.x, lake.z, 0, 0.08);
    m.rotation.set(-Math.PI / 2, 0, 0.3);
    m.scale.set(lake.rx, lake.rz, 1);
    // 冰面裂纹：几条细长的深色线
    const cracks = [];
    for (let i = 0; i < 18; i++) {
      const a = rand() * 6.28;
      const r = Math.sqrt(rand()) * 0.85;
      cracks.push({ x: lake.x + Math.cos(a) * lake.rx * r, y: 0.12, z: lake.z + Math.sin(a) * lake.rz * r, sx: rand.range(4, 14), sy: 0.02, sz: 0.08, ry: rand() * 3.14 });
    }
    T.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0x6a8ca0, 0.4), cracks, { cast: false }), 0, 0);
  }

  /* ================= 议事长屋 ================= */
  function longhouse(w, d, wallH, roofH, { carved = true, snowy = true, door = true } = {}) {
    const g = new THREE.Group();
    // 低矮的石基 + 木墙
    const base = box(w + 0.6, 0.9, d + 0.6, P.tint('stone', 0xa8a8a4));
    base.position.y = 0.45;
    g.add(base);
    const walls = box(w, wallH, d, darkWood);
    walls.position.y = wallH / 2 + 0.6;
    g.add(walls);
    // 陡坡屋顶：草皮底 + 积雪面
    const roofUnder = K.gableRoof(d, w, roofH, P.turf, null, { over: 0.7, thick: 0.4, gables: false });
    roofUnder.rotation.y = Math.PI / 2;
    roofUnder.position.y = wallH + 0.6;
    g.add(roofUnder);
    if (snowy) {
      const roofSnow = K.gableRoof(d, w, roofH + 0.18, snowTop, null, { over: 0.8, thick: 0.28, gables: false });
      roofSnow.rotation.y = Math.PI / 2;
      roofSnow.position.y = wallH + 0.78;
      g.add(roofSnow);
    }
    // 山墙（木板）
    const gs = new THREE.Shape();
    gs.moveTo(-d / 2, 0);
    gs.lineTo(d / 2, 0);
    gs.lineTo(0, roofH - 0.05);
    gs.closePath();
    for (const s of [-1, 1]) {
      const tri = new THREE.Mesh(new THREE.ShapeGeometry(gs), darkWood);
      tri.position.set((s * w) / 2, wallH + 0.6, 0);
      tri.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(tri);
    }
    if (carved) {
      // 两端山墙顶的龙头：几块弯折的木板
      for (const s of [-1, 1]) {
        const dragon = new THREE.Group();
        for (let k = 0; k < 4; k++) {
          const seg = box(0.28, 1.1, 0.28, P.tint('timber', 0x2e2218));
          seg.position.set(s * k * 0.34, k * 0.55 + (k === 3 ? 0.2 : 0), 0);
          seg.rotation.z = -s * (0.5 - k * 0.2);
          dragon.add(seg);
        }
        const head = box(0.9, 0.34, 0.34, P.tint('timber', 0x2e2218));
        head.position.set(s * 1.5, 2.4, 0);
        head.rotation.z = -s * 0.2;
        dragon.add(head);
        dragon.position.set((s * w) / 2 + s * 0.4, wallH + roofH + 0.4, 0);
        g.add(dragon);
      }
      // 沿墙一圈圆盾
      const shields = [];
      for (let i = 0; i < Math.floor(w / 1.7); i++) {
        shields.push({ x: -w / 2 + 1.1 + i * 1.7, y: wallH + 0.2, z: d / 2 + 0.1, rx: Math.PI / 2, s: 0.55 });
        shields.push({ x: -w / 2 + 1.1 + i * 1.7, y: wallH + 0.2, z: -d / 2 - 0.1, rx: Math.PI / 2, s: 0.55 });
      }
      const shCols = [0xa8322a, 0x2f58a8, 0xe0b028, 0xe8e0d0, 0x4a8a3a];
      shields.forEach((s, i) => { s.color = shCols[i % shCols.length]; });
      g.add(K.scatter(new THREE.CylinderGeometry(1, 1, 0.12, 10), P.flat(0xffffff, 0.8), shields));
    }
    if (door) {
      const dr = box(1.6, 2.6, 0.2, P.tint('timber', 0x2e2218));
      dr.position.set(-w / 2 + 3.2, 1.9, d / 2 + 0.12);
      g.add(dr);
      const frame = box(2.1, 0.4, 0.3, P.tint('timber', 0x2e2218));
      frame.position.set(-w / 2 + 3.2, 3.4, d / 2 + 0.14);
      g.add(frame);
    }
    // 屋脊中间的排烟口
    const louver = box(1.2, 0.8, 1.2, darkWood);
    louver.position.set(0, wallH + roofH + 0.4, 0);
    g.add(louver);
    g.userData.size = { w, d };
    return g;
  }

  {
    const g = longhouse(34, 11, 3.6, 5.2);
    const meadHall = g;
    // 门前火盆
    for (const s of [-1, 1]) {
      const br = cyl(0.5, 0.35, 0.7, 8, P.iron);
      br.position.set(-14 + s * 1.6, 0.8, 7.4);
      g.add(br);
    }
    // 屋前的长桌（露天宴席）与酒桶
    const tbl = box(8, 0.12, 1.1, P.woodDark);
    tbl.position.set(6, 1.0, 9.0);
    g.add(tbl);
    for (const sx of [-3, 0, 3]) {
      const lg = box(0.14, 1.0, 0.9, P.wood);
      lg.position.set(6 + sx, 0.5, 9.0);
      g.add(lg);
    }
    const bs = K.barrelStack(P, { rows: 2, cols: 3 });
    bs.position.set(14, 0, 8.4);
    g.add(bs);
    T.smokeFrom(g, new THREE.Vector3(0, 11.6, 0));
    T.landmark(g, 0, -4, 0, {
      name: '议事长屋 · The Mead Hall',
      shortName: '长屋',
      tag: '火从来不灭',
      desc: '三十四米长的木头大屋，低矮的墙上压着陡峭的草皮屋顶，屋面积着厚厚的雪；两端山墙顶上各立着一条木刻的龙头，墙上挂着一圈彩色的圆盾，屋脊中间一个排烟口整天冒着烟。门前两只火盆夜夜烧着。',
      detail: '维京的"长屋"是一座村子的心脏：中间一条通长的火塘，人们沿墙睡在高出地面的长榻上，首领坐在火塘一端的高座上。冬天它是仓库、法庭、客栈和学堂；每一个大事——婚礼、审判、出征——都在火光里决定。',
    }, { dist: 62, height: 26, ty: 5, rot: 0.2 });
    T.glow(-14, 1.8, -4 + 6.4, { color: 0xff8a30, size: 5, light: true, gain: 1.0 });
    T.glow(-12.4, 1.8, -4 + 6.4, { color: 0xff8a30, size: 3.5 });
  }

  /* ================= 民居长屋与高脚仓房 ================= */
  {
    const taken = [{ x: 0, z: -4, r: 30 }, { x: lake.x, z: lake.z, r: 66 }, { x: 110, z: 60, r: 40 }, { x: 72, z: -36, r: 22 }, { x: 40, z: 56, r: 16 }];
    let placed = 0;
    let guard = 0;
    while (placed < 9 && guard < 600) {
      guard++;
      const a = rand() * Math.PI * 2;
      const r = rand.range(46, 120);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r * 0.9;
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r)) continue;
      const w = rand.range(13, 20);
      const lh = longhouse(w, rand.range(6.4, 8), 3.0, 4.0, { carved: rand() < 0.4, door: true });
      T.add(lh, x, z, rand() * Math.PI);
      T.smokeFrom(T.root, lh.userData.size ? new THREE.Vector3(x, 8.6, z) : new THREE.Vector3(x, 8.6, z));
      taken.push({ x, z, r: w * 0.8 });
      placed++;
    }
    // 高脚仓房：防鼠防潮
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const x = Math.cos(a) * 36;
      const z = -4 + Math.sin(a) * 30;
      if (Math.hypot(x - lake.x, z - lake.z) < 62) continue;
      const g = new THREE.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const p = cyl(0.22, 0.26, 1.7, 6, P.wood);
        p.position.set(sx * 1.4, 0.85, sz * 1.2);
        g.add(p);
        const cap = cyl(0.5, 0.5, 0.1, 8, P.stoneLight);
        cap.position.set(sx * 1.4, 1.65, sz * 1.2);
        g.add(cap);
      }
      const hut = box(3.6, 2.2, 3.2, darkWood);
      hut.position.y = 2.8;
      g.add(hut);
      const rf = K.gableRoof(3.6, 4.0, 1.4, snowTop, null, { over: 0.4, gables: false });
      rf.position.y = 3.9;
      rf.rotation.y = Math.PI / 2;
      g.add(rf);
      T.add(g, x, z, a + Math.PI);
    }
    // 鱼干架
    for (let i = 0; i < 4; i++) {
      const rack = new THREE.Group();
      for (const sx of [-1, 1]) {
        const p = box(0.14, 3.0, 0.14, P.wood);
        p.position.set(sx * 3.2, 1.5, 0);
        rack.add(p);
      }
      for (const yy of [1.8, 2.5]) {
        const rod = box(6.6, 0.08, 0.08, P.wood);
        rod.position.set(0, yy, 0);
        rack.add(rod);
      }
      const fish = [];
      for (let k = 0; k < 12; k++) for (const yy of [1.4, 2.1]) fish.push({ x: -3 + k * 0.52, y: yy, z: 0, sx: 0.14, sy: 0.75, sz: 0.16, ry: rand() * 0.4 });
      rack.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0xc8c0a8, 0.8), fish));
      T.add(rack, 52 + (i % 2) * 8, 24 + Math.floor(i / 2) * 8, 0.3);
    }
  }

  /* ================= 冰钓棚 ================= */
  {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const x = lake.x + (i - 1.5) * 20 + rand.range(-4, 4);
      const z = lake.z + rand.range(-14, 14);
      const hut = box(2.6, 2.0, 2.2, darkWood);
      hut.position.set(x - lake.x, 1.1, z - lake.z);
      g.add(hut);
      const rf = K.gableRoof(2.6, 2.6, 0.9, snowTop, null, { over: 0.2, gables: false });
      rf.position.set(x - lake.x, 2.1, z - lake.z);
      rf.rotation.y = Math.PI / 2;
      g.add(rf);
      const hole = cyl(0.55, 0.55, 0.06, 10, P.flat(0x0c1a26, 0.1), false);
      hole.position.set(x - lake.x + 2.2, 0.14, z - lake.z + 0.6);
      g.add(hole);
      const sl = box(1.8, 0.1, 0.7, P.woodDark);
      sl.position.set(x - lake.x - 1.8, 0.2, z - lake.z + 1.3);
      g.add(sl);
    }
    // 几个单独的冰洞和鱼杆
    for (let i = 0; i < 5; i++) {
      const hx = rand.range(-40, 40);
      const hz = rand.range(-24, 24);
      const hole = cyl(0.5, 0.5, 0.06, 10, P.flat(0x0c1a26, 0.1), false);
      hole.position.set(hx, 0.14, hz);
      g.add(hole);
    }
    T.landmark(g, lake.x, lake.z, 0, {
      name: '冻湖 · The Frozen Lake',
      shortName: '冻湖',
      tag: '冬天的第二块地',
      desc: '西边一整片冰封的湖，冰面像一块打磨过的青石，裂纹交织；湖上散着几座木板搭的冰钓棚，棚旁凿着圆圆的冰洞，旁边放着一架雪橇。',
      detail: '北方的冬天，冰湖是最好的路也是最好的田：车能压过去，人可以凿洞钓鱼，一冬天的蛋白质都靠它。冰厚要超过一掌才能走人，要一个肘才能过车；每年总有那么几个人，因为"再多钓一条"而掉进水里。',
    }, { dist: 70, height: 34, ty: 0, rot: 0.9 });
  }

  /* ================= 龙头长船 ================= */
  {
    const g = new THREE.Group();
    const L = 26;
    const hullShape = (len, wid) => {
      const s = new THREE.Shape();
      s.moveTo(0, -len / 2);
      s.bezierCurveTo(wid * 0.6, -len * 0.3, wid * 0.6, len * 0.3, 0, len / 2);
      s.bezierCurveTo(-wid * 0.6, len * 0.3, -wid * 0.6, -len * 0.3, 0, -len / 2);
      return s;
    };
    const geo = new THREE.ExtrudeGeometry(hullShape(L, 5.2), { depth: 1.7, bevelEnabled: false, curveSegments: 14 });
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      // 船首船尾上翘：y += (|z|/(L/2))^3 * 3.2；底部收窄
      p.setY(i, p.getY(i) + Math.pow(Math.abs(z) / (L / 2), 3) * 3.2);
      if (p.getY(i) < 0.4) p.setX(i, p.getX(i) * 0.55);
    }
    geo.computeVertexNormals();
    const hull = new THREE.Mesh(geo, P.tint('timber', 0x6a4a30));
    hull.position.y = 0.7;
    hull.castShadow = true;
    hull.receiveShadow = true;
    g.add(hull);
    // 龙首与船尾
    const head = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const seg = box(0.34, 0.9, 0.34, P.tint('timber', 0x2e2218));
      seg.position.set(0, 0.5 + k * 0.6, k * 0.25);
      seg.rotation.x = -0.3 - k * 0.1;
      head.add(seg);
    }
    const snout = box(0.5, 0.45, 1.0, P.tint('timber', 0x2e2218));
    snout.position.set(0, 4.3, 1.9);
    head.add(snout);
    head.position.set(0, 3.0, L / 2 - 0.4);
    g.add(head);
    const tail = box(0.3, 2.4, 0.3, P.tint('timber', 0x2e2218));
    tail.position.set(0, 3.8, -L / 2 + 0.5);
    tail.rotation.x = 0.4;
    g.add(tail);
    // 沿舷一圈圆盾
    const shields = [];
    const cols = [0xa8322a, 0xe8e0d0, 0x2f58a8, 0xe0b028];
    for (let i = 0; i < 12; i++) {
      for (const s of [-1, 1]) {
        const z = -9 + i * 1.6;
        const w = 2.15 * Math.sqrt(Math.max(0.05, 1 - Math.pow(z / 11, 2)));
        shields.push({ x: s * (w + 0.1), y: 2.3 + Math.pow(Math.abs(z) / 13, 3) * 3, z, rz: Math.PI / 2, s: 0.5, color: cols[i % 4] });
      }
    }
    g.add(K.scatter(new THREE.CylinderGeometry(1, 1, 0.1, 10), P.flat(0xffffff, 0.8), shields));
    // 桅杆放倒、帆收起
    const mast = cyl(0.2, 0.26, 10, 6, P.wood);
    mast.rotation.x = Math.PI / 2;
    mast.position.set(0, 3.0, 0);
    g.add(mast);
    const sail = box(4.6, 0.6, 0.8, P.flat(0xe8dcc0, 1));
    sail.position.set(0, 3.5, 1.5);
    g.add(sail);
    // 船桨
    const oars = [];
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) oars.push({ x: s * 2.7, y: 2.0, z: -7 + i * 1.7, rz: s * 0.9, sx: 0.12, sy: 3.4, sz: 0.2 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.wood, oars));
    // 滚木船台
    for (let i = 0; i < 6; i++) {
      const lg = cyl(0.3, 0.3, 6, 6, darkWood);
      lg.rotation.z = Math.PI / 2;
      lg.position.set(0, 0.3, -9 + i * 3.6);
      g.add(lg);
    }
    // 一格冰港
    T.landmark(g, 112, 60, 0.6, {
      name: '龙头长船 · The Longship',
      shortName: '长船',
      tag: '冬天拖上岸，春天再下水',
      desc: '二十六米长的狭长船体两头高高翘起，船首立着一条木刻龙头；舷侧一圈红黄蓝白的圆盾，九对长桨斜斜地穿过桨孔。桅杆放倒、帆卷起，整条船安稳地架在滚木上，等着春天冰化。',
      detail: '长船是维京人的魔法：船壳是搭接的橡木板，轻而有弹性，吃水不到一米，可以顺着河溯流深入欧洲内陆，也能横渡北大西洋。龙首是用来吓敌的——据说它会让当地的"土地精灵"退避，所以靠岸前要先把龙头卸下来。',
    }, { dist: 54, height: 24, ty: 4, rot: 0.6 + 1.2 });
  }

  /* ================= 卢恩石与法律山 ================= */
  {
    const g = new THREE.Group();
    const rock = P.tint('stone', 0xb8b8b4);
    const heights = [3.4, 2.8, 4.2, 3.0, 3.6];
    for (let i = 0; i < 5; i++) {
      const s = box(1.0, heights[i], 0.5, rock);
      s.position.set((i - 2) * 2.2, heights[i] / 2, (i % 2) * 0.8);
      s.rotation.y = (i - 2) * 0.12;
      s.rotation.z = (i % 2 ? -1 : 1) * 0.04;
      g.add(s);
      // 刻痕：几道竖条与斜条
      for (let k = 0; k < 4; k++) {
        const line = box(0.06, heights[i] * 0.16, 0.06, P.flat(0x3a3a38, 1), false);
        line.position.set((i - 2) * 2.2 + (k % 2 - 0.5) * 0.3, 0.7 + k * heights[i] * 0.2, (i % 2) * 0.8 + 0.27);
        line.rotation.z = k % 2 ? 0.7 : -0.7;
        g.add(line);
      }
      const cap = box(1.1, 0.25, 0.6, snowTop);
      cap.position.set((i - 2) * 2.2, heights[i] + 0.1, (i % 2) * 0.8);
      g.add(cap);
    }
    T.landmark(g, 72, -36, 0.3, {   // 原来在 (70,-66)，正好压在后山脚下的乱石堆上
      name: '卢恩石 · The Rune Stones',
      shortName: '卢恩石',
      tag: '他们说，这是石头在讲话',
      desc: '岗上立着五块高低不一的灰色立石，石面刻着一圈圈蛇形的纹路和一排排细小的符号；每块石顶上都顶着一小堆雪。',
      detail: '卢恩石是维京人的"墓志铭和广告牌"：大多是为纪念死去的亲人或夸耀自己修的桥、路，石上刻着"谁为谁立了这块石头"。刻好后还要涂上红色颜料，所以曾经色彩鲜艳——现在我们看到的灰石头，只是被风雪磨掉了颜色。',
    }, { dist: 24, height: 12, ty: 2, rot: 0.3 });

    // 法律山：一座圆土丘 + 一圈石头
    const m = new THREE.Group();
    const mound = new THREE.Mesh(new THREE.SphereGeometry(8, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), snowTop);
    mound.scale.set(1.5, 0.3, 1.5);
    mound.castShadow = true;
    mound.receiveShadow = true;
    m.add(mound);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const st = box(0.8, 1.4, 0.5, rock);
      st.position.set(Math.cos(a) * 11.5, 0.7, Math.sin(a) * 11.5);
      st.rotation.y = -a;
      m.add(st);
    }
    const speaker = box(2.4, 0.8, 2.4, P.woodDark);
    speaker.position.set(0, 2.9, 0);
    m.add(speaker);
    T.landmark(m, -22, 90, 0, {
      name: '法律山 · The Thing Mound',
      shortName: '法律山',
      tag: '谁都能站上去讲话',
      desc: '一座圆形的雪丘，十二块低石围成一圈，正中一块木台——"法律说话者"站在那里，把全村的法律背给大家听。',
      detail: '"Thing"是北欧的议事会：每年夏天，各家族的自由男子聚到山上，由"法律说话者"背诵法律，裁决纠纷，选出首领。冰岛的阿尔庭（Althing）至今已有一千年——是世界上最古老的议会，就是从这样的石头圈里长出来的。',
    }, { dist: 40, height: 20, ty: 3 });
  }

  /* ================= 桑拿棚与铁匠铺 ================= */
  {
    const g = new THREE.Group();
    const hut = box(5.4, 3.0, 4.4, darkWood);
    hut.position.y = 1.5;
    g.add(hut);
    const rf = K.gableRoof(5.4, 5.0, 1.8, snowTop, null, { over: 0.4, gables: false });
    rf.position.y = 3.0;
    rf.rotation.y = Math.PI / 2;
    g.add(rf);
    const chim = box(0.8, 2.0, 0.8, P.stone);
    chim.position.set(1.8, 4.4, -1);
    g.add(chim);
    T.smokeFrom(g, new THREE.Vector3(1.8, 5.6, -1));
    // 门前的浸身冰洞
    const hole = cyl(1.2, 1.2, 0.05, 10, P.flat(0x0c1a26, 0.1), false);
    hole.position.set(-4.5, 0.12, 4);
    g.add(hole);
    T.landmark(g, -34, 20, 0.5, {
      name: '桑拿棚 · The Sauna',
      shortName: '桑拿棚',
      tag: '烫到冒汗再跳进冰窟',
      desc: '冻湖边一座低矮的木屋，烟囱里冒着白烟；门前冰面上凿着一个圆形的浸身洞，边上放着一把桦木扫帚。',
      detail: '桑拿（sauna）是北欧人冬天的日常：把石头烧到滚烫，往上浇水冒出蒸汽，烫透之后冲出门跳进冰窟——据说这样一冬天都不会感冒。中世纪的教会曾经想禁止它，说"男女混浴不检点"，但没人理会。',
    }, { dist: 24, height: 13, ty: 2, rot: 0.5 });
    T.glow(-34 + 1.4, 1.8, 20 + 2.4, { color: 0xff8a30, size: 2.4, light: true, gain: 0.4 });

    const sm = new THREE.Group();
    const walls = box(5.6, 3.4, 4.8, P.tint('stone', 0x8a8a86));
    walls.position.y = 1.7;
    sm.add(walls);
    const rf2 = K.gableRoof(5.6, 5.2, 1.8, snowTop, null, { over: 0.4, gables: false });
    rf2.position.y = 3.4;
    rf2.rotation.y = Math.PI / 2;
    sm.add(rf2);
    const anvil = box(0.9, 0.4, 0.5, P.iron);
    anvil.position.set(-1.0, 0.85, 3.2);
    sm.add(anvil);
    const stump = cyl(0.5, 0.6, 0.6, 8, P.woodDark);
    stump.position.set(-1.0, 0.3, 3.2);
    sm.add(stump);
    const chim2 = box(0.9, 2.4, 0.9, P.stone);
    chim2.position.set(1.2, 4.6, -1.0);
    sm.add(chim2);
    T.smokeFrom(sm, new THREE.Vector3(1.2, 5.9, -1.0));
    T.landmark(sm, 44, 54, -0.3, {
      name: '铁匠铺 · The Smithy',
      shortName: '铁匠铺',
      tag: '船钉、斧头与刀',
      desc: '一座石砌低屋，屋顶盖着雪；门前一块木墩上摆着一只铁砧，屋里炉火通红，烟囱里喷出一股浓烟。',
      detail: '维京的铁匠在社会里地位特殊：传说奥丁赐给铁匠神秘的力量，所以他们既受尊敬又被畏惧。一条长船需要几千枚铁钉，一个战士需要斧、剑、盾钉——铁匠铺是整个村子最忙的地方。',
    }, { dist: 26, height: 14, ty: 3, rot: -0.3 });
    T.glow(44 + 1.2, 1.8, 54 + 2.6, { color: 0xff7a24, size: 3, light: true, gain: 0.6 });
  }

  /* ================= 雪地的松林 ================= */
  {
    // 林子要让开所有地标和它们的镜头：树是最后种的，此时地标都已登记
    const lms = T.town.landmarks.map((l) => l.root.position);
    const keep = (x, z) => Math.hypot(x - lake.x, z - lake.z) < 64 || Math.hypot(x, z + 4) < 40 || Math.hypot(x - 112, z - 60) < 24
      || lms.some((p) => Math.hypot(x - p.x, z - p.z) < 26);
    const pts = K.ringPoints(rand, 0, 0, 40, 165, 170, keep);
    T.add(K.grove(P, 'pine', pts, { leaf: 0xdbe6ee, trunk: 0x3a2e22, scale: [0.9, 1.6], rand }), 0, 0);
    const pts2 = K.ringPoints(rand, 0, 0, 80, 170, 60, keep);
    T.add(K.grove(P, 'pine', pts2, { leaf: 0x2f4a38, trunk: 0x3a2e22, scale: [0.9, 1.5], rand }), 0, 0);
  }

  /* ================= 道路与路灯 ================= */
  {
    T.add(K.ribbon([[-20, 168], [-8, 120], [-6, 70], [0, 20]], 5, P.flat(0xc8d4da, 1, { polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }), 0.05), 0, 0);
    for (const [x, z] of [[-12, 30], [14, 30], [-30, -14], [30, -14], [0, 60]]) T.lamp(x, z, { ry: 0.5, h: 3.0, light: x === -12 || x === 30 });
  }

  /* ================= 居民 ================= */
  {
    const viking = { tabard: 0x2f58a8, helmet: 'kettle', weapon: 'spear', shield: true };
    T.walker({ ...viking }, [-12, 14], [14, 14], 0.5);
    T.walker({ ...viking, tabard: 0xa8322a }, [14, -20], [-14, -20], 0.5);
    T.walker({ tabard: 0x8a6a48, helmet: 'hood' }, [-30, 40], [-60, 30], 0.4);
    T.walker({ villager: true }, [40, 40], [20, 56], 0.5);
    for (let i = 0; i < 8; i++) T.person({ tabard: [0x8a6a48, 0xa8322a, 0x2f58a8, 0xe8e0d0][i % 4], helmet: i % 2 ? 'hood' : 'none' }, rand.range(-20, 24), rand.range(8, 36), rand() * 6, 'idle');
    // 冰钓的人
    for (let i = 0; i < 4; i++) T.person({ tabard: 0x6a5a48, helmet: 'hood' }, lake.x + (i - 1.5) * 20 + 2.2, lake.z + (i % 2 ? 4 : -4), 1.0, 'idle', 1, 0.1);
  }

  /* ================= 生气：锤声火星、火盆、旗、鱼竿、冰面闪光、蒸汽、乌鸦 ================= */
  {
    // 铁匠铺：铁砧上一把一下下落的锤 + 迸出的火星
    const sw = K.toWorld(44, 54, -0.3);
    const anvilAt = sw(-1.0, 3.2);
    const hammer = new THREE.Group();
    const handle = box(0.09, 0.9, 0.09, P.wood);
    handle.position.y = 0.45;
    hammer.add(handle);
    const hd = box(0.42, 0.22, 0.22, P.iron);
    hd.position.y = 0.95;
    hammer.add(hd);
    T.dynamic(hammer);
    T.add(hammer, anvilAt.x - 0.3, anvilAt.z, 0.2, 1.05);
    T.animate((dt, t) => {
      const p = (t % 1.5) / 1.5;                       // 1.5 秒一锤：慢慢举起、猛地砸下、停一拍
      hammer.rotation.z = p < 0.62 ? 0.15 + 1.1 * (p / 0.62) : p < 0.7 ? 1.25 - 1.25 * ((p - 0.62) / 0.08) : 0;
    });
    T.emitter({ x: anvilAt.x, y: 1.35, z: anvilAt.z, count: 22, life: 0.65, size: 0.2, color: 0xffb050, additive: true,
      spread: [0.12, 0.05, 0.12], vel: [0, 2.6, 0], jitter: [1.6, 1.2, 1.6], gravity: 7, fadeIn: 0.02,
      gate: (t) => { const p = (t % 1.5) / 1.5; return p > 0.62 && p < 0.7; } });

    // 长屋门前两只火盆
    for (const s of [-1, 1]) {
      T.emitter({ x: -14 + s * 1.6, y: 1.35, z: -4 + 7.4, count: 14, life: 0.8, size: 0.85, color: 0xff8a30, additive: true,
        spread: [0.22, 0.05, 0.22], vel: [0, 1.3, 0], jitter: [0.25, 0.4, 0.25], grow: -0.55, fadeIn: 0.08, opacity: 0.9 });
    }

    // 长屋两端山墙上的旗
    for (const s of [-1, 1]) {
      const pole = cyl(0.07, 0.07, 3.4, 5, P.woodDark);
      T.add(pole, s * 17.6, -4, 0, 10.4);
      T.flag(s * 17.6, 12.1, -4, { w: 3.2, h: 1.5, color: s < 0 ? 0x2f58a8 : 0xa8322a, ry: s < 0 ? Math.PI : 0 });
    }

    // 冰钓：每人面前一个冰洞，手里一根微微颤的竿，线尾的浮漂一沉一浮
    for (let i = 0; i < 4; i++) {
      const fx = lake.x + (i - 1.5) * 20 + 2.2;
      const fz = lake.z + (i % 2 ? 4 : -4);
      const hx = fx + Math.sin(1.0) * 1.6;
      const hz = fz + Math.cos(1.0) * 1.6;
      const hole = cyl(0.55, 0.55, 0.05, 10, P.flat(0x0c1a26, 0.1), false);
      T.add(hole, hx, hz, 0, 0.13);
      const hand = new THREE.Vector3(fx, 1.15, fz);
      const dir = new THREE.Vector3(hx - fx, 0.2 - 1.15, hz - fz);
      const L = dir.length();
      const rod = new THREE.Group();
      const stick = cyl(0.02, 0.035, L, 4, P.woodDark, false);
      stick.position.copy(dir).multiplyScalar(0.5);
      stick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      rod.add(stick);
      T.add(rod, hand.x, hand.z, 0, hand.y);
      T.sway(rod, { ax: 0.025, az: 0.03, speed: 1.4 + i * 0.3 });
      const bob = sphere(0.1, P.flat(0xc0392b, 0.6));
      T.add(bob, hx, hz, 0, 0.2);
      bob.userData.keepSeparate = true;
      T.animate((dt, t) => { bob.position.y = 0.2 + Math.sin(t * 2.1 + i * 1.7) * 0.025 + (Math.sin(t * 0.37 + i * 3) > 0.96 ? -0.07 : 0); });
    }

    // 冻湖：冰面上一闪一闪的碎光
    T.emitter({ x: lake.x, y: 0.5, z: lake.z, count: 38, life: 1.9, size: 0.55, color: 0xcfeaff, additive: true,
      spread: [lake.rx * 0.9, 0.05, lake.rz * 0.9], vel: [0, 0, 0], jitter: [0.02, 0.02, 0.02], fadeIn: 0.45, opacity: 0.95, night: 'day' });

    // 桑拿浸身洞：冰窟上方袅袅的蒸汽
    const sa = K.toWorld(-34, 20, 0.5)(-4.5, 4);
    T.emitter({ x: sa.x, y: 0.4, z: sa.z, count: 16, life: 3.2, size: 1.3, color: 0xe8f2f8, opacity: 0.26,
      spread: [0.7, 0.05, 0.7], vel: [0.1, 0.45, 0.05], jitter: [0.1, 0.1, 0.1], grow: 2.2, fadeIn: 0.25 });

    // 屋顶上盘旋的乌鸦
    T.birds({ count: 5, center: [0, -4], radius: 38, height: 19, color: 0x1c1c20, scale: 1.4 });
  }

  /* ================= 雪 ================= */
  {
    const N = 700;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const spd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rand.range(-120, 120);
      pos[i * 3 + 1] = rand.range(0, 60);
      pos[i * 3 + 2] = rand.range(-120, 120);
      spd[i] = rand.range(1.2, 3.2);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
    pts.frustumCulled = false;
    pts.userData.keepSeparate = true;
    T.root.add(pts);
    T.animate((dt, t) => {
      const p = geo.attributes.position;
      for (let i = 0; i < N; i++) {
        let y = p.getY(i) - spd[i] * dt;
        if (y < 0) y = 60;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.7 + i) * 0.012 + 0.2 * dt);
        if (p.getX(i) > 120) p.setX(i, -120);
      }
      p.needsUpdate = true;
    });
  }

  /* ================= 极光：夜里垂在北方天空的绿色与紫色帘子 ================= */
  {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uT;
        void main() {
          vUv = uv;
          vec3 p = position;
          // 帘子沿水平方向像风吹过一样起伏
          p.z += sin(p.x * 0.012 + uT * 0.5) * 22.0 + sin(p.x * 0.031 - uT * 0.8) * 8.0;
          p.y += sin(p.x * 0.02 + uT * 0.35) * 8.0 * uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uT;
        uniform float uA;
        void main() {
          // 竖向：底部亮线、往上渐隐；横向：一缕一缕的竖纹
          float stripes = 0.55 + 0.45 * sin(vUv.x * 60.0 + uT * 0.9 + sin(vUv.x * 13.0) * 2.0);
          float fade = pow(1.0 - vUv.y, 1.4) * smoothstep(0.0, 0.08, vUv.y);
          vec3 green = vec3(0.15, 1.0, 0.55);
          vec3 purple = vec3(0.65, 0.25, 0.95);
          vec3 col = mix(green, purple, smoothstep(0.35, 1.0, vUv.y + sin(vUv.x * 5.0 + uT * 0.3) * 0.12));
          float a = stripes * fade * uA * 0.55;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    const makeCurtain = (w, h, x, y, z, ry, ph) => {
      const geo = new THREE.PlaneGeometry(w, h, 80, 6);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      m.frustumCulled = false;
      m.renderOrder = 2;
      return m;
    };
    const ag = new THREE.Group();
    ag.add(makeCurtain(620, 120, 0, 190, -420, 0, 0));
    ag.add(makeCurtain(420, 90, -240, 170, -380, 0.5, 1));
    ag.add(makeCurtain(380, 100, 260, 200, -400, -0.45, 2));
    T.ambient(ag);
    T.beaconAnimate((dt, t, day) => {
      mat.uniforms.uT.value = t;
      mat.uniforms.uA.value = day > 0.3 ? Math.min(1, (day - 0.3) / 0.5) : 0;
      ag.visible = mat.uniforms.uA.value > 0.01;
    });
  }

  /* ================= 信标：长屋的烟 ================= */
  {
    const bg = new THREE.Group();
    const mat = new THREE.SpriteMaterial({
      map: T.tex.cloudTx, color: 0xd8d8d0, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false,
    });
    const puffs = [];
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(mat.clone());
      sp.userData.k = i / 7;
      bg.add(sp);
      puffs.push(sp);
    }
    bg.position.set(0, 10, -4);
    T.beacon(bg);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T.glowTx, color: 0xff8a30, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.position.set(0, 0, 4);
    glow.scale.setScalar(36);
    bg.add(glow);
    T.beaconAnimate((dt, t, day) => {
      for (const sp of puffs) {
        const k = (t * 0.03 + sp.userData.k) % 1;
        sp.position.set(Math.sin(k * 6 + sp.userData.k * 9) * 4 + k * 20, k * 100, 0);
        sp.scale.setScalar(10 + k * 40);
        sp.material.opacity = (1 - k) * 0.35;
      }
      glow.material.opacity = day * 0.8;
    });
  }

  T.overview({
    name: '雪岭长屋 · Frostholm',
    tag: '冬天比夏天长的地方',
    desc: '大陆最北的雪原：三十四米的议事长屋居中，龙头在山墙顶上张着嘴；周围是盖着积雪草皮的长屋和高脚仓房；西边是冻湖和冰钓棚，东边冰港里架着龙头长船；夜里天空垂下绿色和紫色的极光，雪一直在飘。',
    detail: '北方的村子靠"冬天"的节奏活着：夏天抢着捕鱼、割草、砍柴，冬天全家挤在长屋里取暖、织网、修船、讲故事。长夜里的故事是他们的"书"——萨迦、神话、家谱都靠嘴传，一代一代，直到有人把它们刻在石头上。',
  }, { cx: 0, cz: 20, dist: 230, height: 105, rot: 0.2 });
}
