import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SEA } from '../world.js';

/* ============================================================
 *  灯塔港 Lanternport
 *
 *  南面是海。石砌码头顺着海岸线弯过去，东头一道防波堤伸进海里，
 *  堤头立着灯塔；码头上有踏轮吊车、三条木栈桥、一艘下锚的科格船；
 *  岸上是商人街、港务楼、水手礼拜堂和酒馆，再往北是渔民的小屋。
 *
 *  坐标：镇内局部坐标，x 向东、z 向南，原点在镇心（地面 y=0，海面 y≈0.16）。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand, site } = T;
  const { box, cyl, cone, sphere } = K;

  /** 海岸线的局部 z（海在它的南边，z 更大） */
  const shoreZ = (lx) => (SEA.z - Math.sqrt(SEA.r ** 2 - (site.x + lx - SEA.x) ** 2)) - site.z;
  const QUAY_Y = 0.8;

  const stone = P.stone;
  const cobble = P.cobble;

  /* ================= 码头 ================= */
  {
    const xs = [];
    for (let x = -118; x <= 104; x += 8) xs.push(x);
    const center = xs.map((x) => [x, shoreZ(x) + 3]);
    const deck = K.ribbon(center, 20, cobble, QUAY_Y);
    T.add(deck, 0, 0);
    // 外壁（入水）与内侧台阶
    T.add(K.wallAlong(xs.map((x) => [x, shoreZ(x) + 13]), { h: 3.3, thick: 1.3, y0: -2.5, mat: stone }), 0, 0);
    T.add(K.wallAlong(xs.map((x) => [x, shoreZ(x) - 7]), { h: QUAY_Y, thick: 0.7, y0: 0, mat: stone }), 0, 0);
    // 码头西端收头
    T.add(K.wallAlong([[-118, shoreZ(-118) - 7], [-118, shoreZ(-118) + 13]], { h: 3.3, thick: 1.3, y0: -2.5, mat: stone }), 0, 0);

    // 系缆桩：沿外沿每 7 米一个
    const bols = [];
    for (let x = -112; x <= 100; x += 7) {
      bols.push({ x, y: QUAY_Y + 0.28, z: shoreZ(x) + 12.2, sx: 1, sy: 1, sz: 1 });
    }
    T.add(K.scatter(new THREE.CylinderGeometry(0.2, 0.26, 0.56, 8), P.iron, bols), 0, 0);
    // 沿外沿的木护舷（挡船）
    const fenders = [];
    for (let x = -108; x <= 100; x += 14) fenders.push({ x, y: -0.3, z: shoreZ(x) + 13.9, rx: 0, s: 1 });
    T.add(K.scatter(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 6), P.wood, fenders), 0, 0);
  }

  /* ================= 防波堤与灯塔 ================= */
  const MOLE_X = 100;
  const moleZ0 = shoreZ(MOLE_X) - 6;
  const MOLE_LEN = 96;
  {
    const pts = [[MOLE_X - 2, moleZ0], [MOLE_X - 1, moleZ0 + 32], [MOLE_X, moleZ0 + 64], [MOLE_X + 1, moleZ0 + MOLE_LEN]];
    T.add(K.ribbon(pts, 8, cobble, 1.4), 0, 0);
    for (const s of [-1, 1]) {
      T.add(K.wallAlong(pts.map(([x, z]) => [x + s * 4.2, z]), { h: 3.9, thick: 1.5, y0: -2.5, mat: stone }), 0, 0);
    }
    // 堤脚的抛石
    const items = [];
    for (let i = 0; i < 70; i++) {
      const t = rand();
      const side = rand.sign();
      items.push({
        x: MOLE_X + t + side * (5.2 + rand() * 1.8),
        y: -0.2 + rand() * 0.3,
        z: moleZ0 + t * MOLE_LEN,
        s: 0.7 + rand() * 1.1, ry: rand() * 6, rx: rand() * 3,
      });
    }
    T.add(K.scatter(new THREE.DodecahedronGeometry(1, 0), P.flat(0x7a7468, 1, { flatShading: true }), items), 0, 0);
  }

  /** 灯塔：石塔 + 灯笼室 + 铜顶；返回 { group, beams } */
  function makeLighthouse({ withBeam = true } = {}) {
    const g = new THREE.Group();
    const base = cyl(5.4, 6.2, 4.2, 12, stone);
    base.position.y = 2.1;
    g.add(base);
    // 塔身：分三段逐级收窄，段间有束带
    const segs = [[4.4, 5.2, 8], [3.7, 4.4, 8], [3.1, 3.7, 7]];
    let y = 4.2;
    for (const [rt, rb, h] of segs) {
      const s = cyl(rt, rb, h, 12, P.stoneLight);
      s.position.y = y + h / 2;
      g.add(s);
      const band = cyl(rb + 0.28, rb + 0.28, 0.5, 12, stone);
      band.position.y = y + 0.25;
      g.add(band);
      // 箭窗：沿塔身一线排开
      for (let k = 0; k < 2; k++) {
        const slit = box(0.34, 1.0, 0.2, P.window, false);
        const a = k * Math.PI;
        slit.position.set(Math.sin(a) * (rb - 0.2), y + h * 0.55, Math.cos(a) * (rb - 0.2));
        slit.rotation.y = a;
        g.add(slit);
      }
      y += h;
    }
    // 回廊平台 + 栏杆
    const gallery = cyl(4.6, 3.4, 0.7, 12, stone);
    gallery.position.y = y + 0.35;
    g.add(gallery);
    const posts = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      posts.push({ x: Math.cos(a) * 4.3, y: y + 1.2, z: Math.sin(a) * 4.3 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(0.1, 1.0, 0.1), P.iron, posts));
    const rail = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.05, 4, 24), P.iron);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = y + 1.7;
    g.add(rail);
    // 灯笼室：玻璃柱 + 立柱 + 铜顶
    const lampY = y + 0.7;
    const glass = cyl(2.2, 2.2, 3.2, 12, P.lanternGlass, false);
    glass.position.y = lampY + 1.6;
    glass.userData.keepSeparate = true;
    g.add(glass);
    const cols = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      cols.push({ x: Math.cos(a) * 2.25, y: lampY + 1.6, z: Math.sin(a) * 2.25 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(0.16, 3.3, 0.16), P.iron, cols));
    const roof = cone(2.9, 2.0, 12, P.copper);
    roof.position.y = lampY + 4.2;
    g.add(roof);
    const ball = sphere(0.35, P.copper);
    ball.position.y = lampY + 5.4;
    g.add(ball);
    const vane = box(0.06, 0.9, 0.5, P.iron, false);
    vane.position.y = lampY + 6.0;
    g.add(vane);

    // 火篮 + 光晕 + 旋转光束
    const lampPos = new THREE.Vector3(0, lampY + 1.6, 0);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T.glowTx, color: 0xffc070, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    halo.position.copy(lampPos);
    halo.scale.setScalar(26);
    g.add(halo);

    const beams = new THREE.Group();
    beams.position.copy(lampPos);
    if (withBeam) {
      const geo = new THREE.ConeGeometry(7, 160, 14, 1, true);
      geo.translate(0, -80, 0);
      geo.rotateZ(Math.PI / 2);
      const bm = new THREE.MeshBasicMaterial({
        color: 0xffe2a0, transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      for (const s of [1, -1]) {
        const b = new THREE.Mesh(geo, bm);
        b.rotation.y = s > 0 ? 0 : Math.PI;
        beams.add(b);
      }
      beams.userData.keepSeparate = true;
      g.add(beams);
    }
    g.userData.halo = halo;
    g.userData.beams = beams;
    g.userData.height = lampY + 6.4;
    return g;
  }

  function tickLighthouse(lh, dt, t, day) {
    const n = Math.sin(t * 7) * 0.05;
    lh.userData.halo.material.opacity = THREE.MathUtils.clamp(day * 0.95 + n, 0, 1);
    lh.userData.beams.rotation.y = t * 0.55;
    // registerInteractive 会克隆材质，所以要取网格上"正在用"的那一份
    const bm = lh.userData.beams.children[0] && lh.userData.beams.children[0].material;
    if (bm) bm.opacity = day > 0.2 ? 0.1 * day : 0;
  }

  {
    const lh = makeLighthouse();
    const lx = MOLE_X + 1;
    const lz = moleZ0 + MOLE_LEN + 4;
    T.landmark(lh, lx, lz, 0, {
      name: '灯塔 · The Pharos',
      shortName: '灯塔',
      tag: '海边的第一盏灯',
      desc: '防波堤尽头的一座三十米石塔，塔身分三段逐级收窄，段间束带上开着箭窗。顶上的回廊围着铁栏杆，玻璃灯笼室里整夜烧着火；入夜之后，两道光束绕着塔顶缓缓转动，铜顶在月光下发青。',
      detail: '中世纪的灯塔几乎都是石塔顶上烧木柴或煤：没有反射镜，火越旺越远；热那亚的"灯笼塔"建于十二世纪，是欧洲最著名的一座。守塔人一般是修士或领主派来的仆役，靠过往船只交的"灯火钱"养活——船主给的钱，等于买一晚上不撞礁的运气。',
    }, { dist: 62, height: 30, ty: 14, rot: 0.5 });

    T.animate((dt, t, day) => tickLighthouse(lh, dt, t, day));

    // 远景信标：站在城堡里也能看见这盏灯
    const bl = makeLighthouse();
    bl.position.set(lx, 0, lz);
    bl.scale.setScalar(1.35);
    T.beacon(bl);
    T.beaconAnimate((dt, t, day) => tickLighthouse(bl, dt, t, day));
  }

  /* ================= 科格船 ================= */
  function makeCog() {
    const g = new THREE.Group();
    const tar = P.flat(0x2a2118, 0.9);
    const L = 21, W = 7.2;

    const outline = (l, w) => {
      const s = new THREE.Shape();
      s.moveTo(0, -l / 2);
      s.bezierCurveTo(w * 0.62, -l * 0.34, w * 0.62, l * 0.26, 0, l / 2);
      s.bezierCurveTo(-w * 0.62, l * 0.26, -w * 0.62, -l * 0.34, 0, -l / 2);
      return s;
    };
    const hull = (depth, mat, y0) => {
      const geo = new THREE.ExtrudeGeometry(outline(L, W), { depth, bevelEnabled: false, curveSegments: 12 });
      geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) < 0.02) { p.setX(i, p.getX(i) * 0.6); p.setZ(i, p.getZ(i) * 0.82); }
      }
      geo.computeVertexNormals();
      geo.translate(0, y0, 0);
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };
    g.add(hull(1.6, tar, -0.9));
    g.add(hull(1.9, P.woodDark, 0.7));

    // 甲板
    const deckGeo = new THREE.ShapeGeometry(outline(L * 0.95, W * 0.95), 12);
    deckGeo.rotateX(-Math.PI / 2);
    const deck = new THREE.Mesh(deckGeo, P.wood);
    deck.position.y = 2.55;
    deck.receiveShadow = true;
    g.add(deck);

    // 艏楼、艉楼
    const fore = box(5.0, 2.0, 5.4, P.woodDark);
    fore.position.set(0, 3.55, L * 0.34);
    g.add(fore);
    const foreRail = box(5.4, 0.7, 0.14, P.wood);
    foreRail.position.set(0, 4.9, L * 0.34 + 2.6);
    g.add(foreRail);
    const aft = box(5.6, 2.9, 6.6, P.woodDark);
    aft.position.set(0, 4.0, -L * 0.33);
    g.add(aft);
    const aftRoof = box(6.0, 0.18, 7.0, P.wood);
    aftRoof.position.set(0, 5.54, -L * 0.33);
    g.add(aftRoof);
    for (const sx of [-1.4, 1.4]) {
      const w = box(0.7, 0.55, 0.12, P.window, false);
      w.position.set(sx, 4.4, -L * 0.33 - 3.34);
      g.add(w);
    }
    // 舷墙
    for (const s of [-1, 1]) {
      const bw = box(0.14, 0.9, 11, P.wood);
      bw.position.set(s * (W * 0.5 - 0.5), 3.1, 0.5);
      g.add(bw);
    }
    // 舵
    const rudder = box(0.22, 2.8, 1.5, P.woodDark);
    rudder.position.set(0, 1.2, -L / 2 - 0.4);
    g.add(rudder);

    // 桅杆、横桁、方帆
    const mast = cyl(0.26, 0.38, 19, 8, P.wood);
    mast.position.set(0, 12, 0.4);
    g.add(mast);
    const yard = cyl(0.14, 0.14, 9.6, 6, P.wood);
    yard.rotation.z = Math.PI / 2;
    yard.position.set(0, 18, 0.5);
    g.add(yard);
    const nest = cyl(0.9, 0.7, 0.8, 8, P.woodDark);
    nest.position.set(0, 20.2, 0.4);
    g.add(nest);

    const sailTex = K.canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = '#e9dfc6';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#a8322a';
      for (let i = 0; i < 8; i += 2) c.fillRect((i / 8) * w, 0, w / 8, h);
      c.fillStyle = 'rgba(70,50,30,0.12)';
      for (let y = 0; y < h; y += 16) c.fillRect(0, y, w, 1.5);
    });
    const sailMat = new THREE.MeshStandardMaterial({ map: sailTex, roughness: 1, side: THREE.DoubleSide });
    const sailGeo = new THREE.PlaneGeometry(9.0, 9.4, 8, 6);
    const sp = sailGeo.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i) / 4.5;
      const y = (sp.getY(i) + 4.7) / 9.4;
      sp.setZ(i, (1 - x * x) * Math.sin(y * Math.PI) * 1.5);
    }
    sailGeo.computeVertexNormals();
    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.position.set(0, 13.2, 0.6);
    sail.castShadow = true;
    g.add(sail);
    g.userData.sail = sail;

    // 缆绳：桅顶到艏艉与两舷
    const rope = (a, b) => {
      const d = new THREE.Vector3().subVectors(b, a);
      const m = cyl(0.04, 0.04, d.length(), 4, P.rope, false);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      g.add(m);
    };
    const top = new THREE.Vector3(0, 19.4, 0.4);
    rope(top, new THREE.Vector3(0, 5.4, L * 0.46));
    rope(top, new THREE.Vector3(0, 5.5, -L * 0.40));
    rope(top, new THREE.Vector3(W * 0.46, 2.9, 0.5));
    rope(top, new THREE.Vector3(-W * 0.46, 2.9, 0.5));

    // 桅顶旗
    const flag = K.banner(P, 0xa8322a, { h: 3, w: 0.9, len: 2.0 });
    flag.position.set(0, 20.4, 0.4);
    g.add(flag);

    // 船首锚与甲板货
    const anc = K.anchor(P, 0.9);
    anc.position.set(W * 0.3, 2.9, L * 0.34 + 0.2);
    anc.rotation.z = -0.4;
    g.add(anc);
    const crates = K.crateStack(P, { n: 5, s: 0.75 });
    crates.position.set(-1.6, 2.55, 3.6);
    g.add(crates);
    const barrels = K.barrelStack(P, { rows: 2, cols: 3 });
    barrels.position.set(1.0, 2.55, -2.4);
    barrels.rotation.y = 1.57;
    g.add(barrels);
    return g;
  }

  const cogAnchor = { x: 26, z: shoreZ(26) + 74 };
  const cog = makeCog();
  cog.userData.baseRot = 1.1;
  cog.userData.baseY = -0.2;
  T.landmark(cog, cogAnchor.x, cogAnchor.z, 1.1, {
    name: '科格船 · Hanseatic Cog',
    shortName: '科格船',
    tag: '北海的卡车',
    desc: '一艘二十一米长的平底大船，艏艉各有一座木制的"城堡"，当中立一根粗桅，挂一面红白条纹的方帆。甲板上堆着木箱和酒桶，船头的铁锚还吊在舷边，船艉的舵直接挂在艉柱上。',
    detail: '科格船是十二到十四世纪汉萨同盟的主力货船：平底吃水浅、舱容大，一艘能装一百多吨货，只要十几个船员就能开。艏艉的"城堡"是战时的弓箭平台，商船被海盗攻击时靠它们还击。',
  }, { dist: 56, height: 26, ty: 7, rot: 1.1 + 1.2 });
  // 船是动的：landmark 里已经烘合了网格，所以 sail 的引用要在烘合前取——
  // 这里让整艘船轻轻摇、绕锚缓缓转，帆不单独动。
  T.animate((dt, t) => {
    cog.position.y = cog.userData.baseY + Math.sin(t * 0.8) * 0.09;
    cog.rotation.y = cog.userData.baseRot + Math.sin(t * 0.18) * 0.16;
    cog.rotation.z = Math.sin(t * 0.7) * 0.025;
    cog.rotation.x = Math.sin(t * 0.55 + 1) * 0.018;
  });

  /* ================= 木栈桥与渔船 ================= */
  const fleet = [];
  {
    const piers = [[-86, 30], [-56, 38], [-26, 32], [4, 26]];
    for (const [lx, len] of piers) {
      const z0 = shoreZ(lx) + 14;
      T.add(K.boardwalk(P, len, 2.6, { y: 0.7, piles: true }), lx, z0);
      // 桥头灯
      // 两侧泊船
      for (const side of [-1, 1]) {
        if (rand() < 0.15) continue;
        const bl = rand.range(4.4, 5.8);
        const boat = T.POP.makeBoat({ len: bl, wid: bl * 0.34, wallH: 0.7, rower: false });
        const bz = z0 + len * rand.range(0.35, 0.8);
        const b = T.add(boat, lx + side * 2.9, bz, rand.range(-0.07, 0.07) + (rand() < 0.5 ? 0 : Math.PI));
        b.position.y = -0.02;
        boat.userData.phase = rand() * 6;
        T.dynamic(boat);
        fleet.push(boat);
      }
    }
    // 翻扣在沙滩上的小船
    for (let i = 0; i < 3; i++) {
      const boat = T.POP.makeBoat({ len: 4.4, wid: 1.5, wallH: 0.66, rower: false });
      boat.rotation.z = Math.PI;
      const lx = -108 + i * 9 + rand();
      T.add(boat, lx, shoreZ(lx) - 14, rand.range(-0.5, 0.5), 0.9);
    }
    T.animate((dt, t) => {
      for (const b of fleet) {
        b.position.y = -0.02 + Math.sin(t * 1.2 + b.userData.phase) * 0.05;
        b.rotation.z = Math.sin(t * 0.9 + b.userData.phase) * 0.04;
      }
    });
  }

  /* ================= 踏轮吊车 ================= */
  {
    const g = new THREE.Group();
    const foot = box(6.2, 1.2, 6.2, stone);
    foot.position.y = 0.6;
    g.add(foot);
    // 四根斜立柱 + 层层横撑
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = box(0.4, 9.4, 0.4, P.wood);
      p.position.set(sx * 2.1, 5.8, sz * 2.1);
      p.rotation.z = -sx * 0.045;
      p.rotation.x = sz * 0.045;
      g.add(p);
    }
    for (const yy of [3.2, 6.2, 9.0]) {
      const k = 1 - (yy - 3) * 0.025;
      for (const [ww, dd, px, pz] of [[4.4 * k, 0.22, 0, 2.05 * k], [4.4 * k, 0.22, 0, -2.05 * k], [0.22, 4.4 * k, 2.05 * k, 0], [0.22, 4.4 * k, -2.05 * k, 0]]) {
        const bm = box(ww, 0.24, dd, P.wood);
        bm.position.set(px, yy, pz);
        g.add(bm);
      }
    }
    // 屋顶
    const roof = K.gableRoof(5, 5.6, 1.9, P.shingle, P.woodDark, { over: 0.4 });
    roof.position.set(0, 10.5, 0);
    roof.rotation.y = Math.PI / 2;
    g.add(roof);

    // 大踏轮：两侧轮圈 + 辐条 + 踏板，绕 X 轴转（朝向海）
    const wheel = new THREE.Group();
    const R = 3.1;
    const rimGeos = [];
    for (const sx of [-1, 1]) {
      const rim = new THREE.TorusGeometry(R, 0.14, 5, 22);
      rim.rotateY(Math.PI / 2);
      rim.translate(sx * 1.1, 0, 0);
      rimGeos.push(rim);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI;
        const sp = new THREE.BoxGeometry(0.12, R * 2, 0.12);
        sp.rotateX(a);
        sp.translate(sx * 1.1, 0, 0);
        rimGeos.push(sp);
      }
    }
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const tr = new THREE.BoxGeometry(2.4, 0.1, 0.5);
      tr.rotateX(a);
      tr.translate(0, Math.cos(a) * R * 1, Math.sin(a) * R);
      // 修正：踏板放在轮缘上
      rimGeos.push(tr);
    }
    const wm = new THREE.Mesh(mergeGeometries(rimGeos, false), P.wood);
    wm.castShadow = true;
    wheel.add(wm);
    const axle = cyl(0.22, 0.22, 2.8, 8, P.iron);
    axle.rotation.z = Math.PI / 2;
    wheel.add(axle);
    wheel.position.set(0, 6.4, 0);
    wheel.userData.keepSeparate = true;
    g.add(wheel);

    // 吊臂：伸出码头外沿
    const jib = box(0.34, 0.34, 8.2, P.wood);
    jib.position.set(0, 9.2, 4.6);
    g.add(jib);
    const brace = box(0.2, 0.2, 5.4, P.wood);
    brace.position.set(0, 7.8, 3.6);
    brace.rotation.x = 0.3;
    g.add(brace);
    const pulley = cyl(0.3, 0.3, 0.2, 10, P.iron);
    pulley.rotation.z = Math.PI / 2;
    pulley.position.set(0, 9.0, 8.4);
    g.add(pulley);

    // 货钩与桶：绳随钩上下
    const hook = new THREE.Group();
    const rope = cyl(0.03, 0.03, 6, 4, P.rope, false);
    rope.position.y = 3;
    hook.add(rope);
    const barrel = K.barrelStack(P, { rows: 1, cols: 1 });
    barrel.position.set(0, -0.2, 0);
    hook.add(barrel);
    hook.position.set(0, 3.2, 8.4);
    hook.userData.keepSeparate = true;
    g.userData.hook = hook;
    g.add(hook);

    const cx = 30;
    const cz = shoreZ(cx) + 7;
    T.landmark(g, cx, cz, 0, {
      name: '踏轮吊车 · Treadwheel Crane',
      shortName: '吊车',
      tag: '靠人走路吊货',
      desc: '码头外沿立着一座四脚木塔，塔身侧面是一只两人多高的大踏轮，吊臂探出码头，臂端的滑轮上吊着一只正在升降的货桶。塔顶盖着木瓦屋顶，塔脚下堆着等着起吊的桶和箱。',
      detail: '中世纪港口没有动力，起重靠"踏轮"——一两个壮汉钻进大木轮里，像仓鼠一样往前走，轮轴就把绳子卷起来。这种吊车能吊起两三吨货，是十三世纪之后港口货运提速的关键。',
    }, { dist: 34, height: 18, ty: 6, rot: 0 });
    T.animate((dt, t) => {
      wheel.rotation.x = t * 0.35;
      hook.position.y = 3.2 + (Math.sin(t * 0.5) * 0.5 + 0.5) * 3.2;
    });
  }

  /* ================= 港务楼 ================= */
  {
    const g = new THREE.Group();
    const sz = shoreZ(-6);
    const house = K.makeHouse(P, {
      w: 15, d: 9, floors: 2, floorH: 3.2, wall: P.stoneLight, base: stone, baseH: 0.8,
      roof: 'hip', roofMat: P.slate, pitch: 0.55, windows: 5, door: P.woodDark, chimney: false,
    });
    g.add(house);
    // 一层前廊：一排方柱 + 平梁
    const arc = [];
    for (let i = 0; i < 6; i++) arc.push({ x: -6.4 + i * 2.56, y: 1.8, z: 5.7 });
    g.add(K.scatter(new THREE.BoxGeometry(0.6, 3.4, 0.6), stone, arc));
    const beam = box(15.6, 0.5, 1.3, P.timber);
    beam.position.set(0, 3.5, 5.15);
    g.add(beam);
    // 屋顶钟塔
    const tower = box(2.2, 2.6, 2.2, P.stoneLight);
    tower.position.set(0, 8.6, 0);
    g.add(tower);
    const tcone = cone(1.9, 2.4, 4, P.copper);
    tcone.rotation.y = Math.PI / 4;
    tcone.position.set(0, 11.1, 0);
    g.add(tcone);
    const bell = cyl(0.3, 0.55, 0.7, 8, P.iron);
    bell.position.set(0, 8.7, 0);
    g.add(bell);
    // 门旁的挂旗
    const fl = K.banner(P, 0x1c3a63, { h: 5.4, w: 1.2, len: 2.4 });
    fl.position.set(7.2, 0.8, 5.6);
    g.add(fl);
    // 称重台与货物
    const scale = box(1.6, 0.14, 1.0, P.wood);
    scale.position.set(-3.2, 0.9, 6.9);
    g.add(scale);
    const cr = K.crateStack(P, { n: 4, s: 0.7 });
    cr.position.set(4.4, 0.8, 6.8);
    g.add(cr);
    g.userData.noSmoke = true;

    T.landmark(g, -6, sz - 30, 0, {
      name: '港务楼 · Customs House',
      shortName: '港务楼',
      tag: '每一桶货都要过秤',
      desc: '码头后排最气派的一幢：石砌的二层楼，一楼是一排方柱撑起的前廊，板岩四坡顶上冒出一座带铜顶的小钟塔。廊下摆着称重台和待验的箱子，门口挂着蓝底的城镇旗。',
      detail: '港口是领主最大的税源：进港要收停泊费，卸货要收货物税，称重、量尺、验封都有专人。港务官同时是法官——船主和商人在这里吵架，钟一响就开庭。',
    }, { dist: 38, height: 20, ty: 6 });
  }

  /* ================= 商人街（五幢汉萨式山墙楼） ================= */
  {
    const g = new THREE.Group();
    const washes = [0xe3b36a, 0xd98a72, 0x7fa3b4, 0xe8dcc0, 0xb4bf8a];
    const roofs = [P.slate, P.tile, P.slate, P.tile, P.slate];
    for (let i = 0; i < 5; i++) {
      const w = 5.4 + (i % 2) * 0.5;
      const h = K.makeHouse(P, {
        w, d: 8, floors: 3, floorH: 2.7, wall: P.wash(washes[i]), base: stone, baseH: 0.7,
        roof: 'gable', roofMat: roofs[i], pitch: 0.7, jetty: i % 2 === 0, timber: i % 2 === 1,
        windows: 2, shutter: [0x2f5a7a, 0x7a2f2f, 0x2f6a4a, 0x5a3a2a, 0x7a5a2a][i], chimney: i !== 2,
      });
      const gx = (i - 2) * 6.1;
      h.position.set(gx, 0, 0);
      g.add(h);
      if (h.userData.chimney) {
        const c = h.userData.chimney.clone().add(new THREE.Vector3(gx, 0, 0));
        T.smokeFrom(g, c);
      }
      // 阶梯山墙：贴在正面屋脊之上
      const sg = K.stepGable(w, P.wash(washes[i]), { steps: 4, stepH: 0.62, thick: 0.38 });
      sg.position.set(gx, 3 * 2.7 + 0.5, 4.0);
      g.add(sg);
      // 门前台阶与招牌
      const step = box(1.6, 0.25, 0.9, stone);
      step.position.set(gx, 0.12, 4.5);
      g.add(step);
    }
    // 吊货的滑轮梁：二楼山墙下伸出一根横梁（商人街的标志性细节）
    for (const gx of [-6.1, 6.1]) {
      const hb = box(0.2, 0.2, 1.6, P.wood);
      hb.position.set(gx, 3 * 2.7 + 0.2, 4.7);
      g.add(hb);
    }
    // 只让第一根烟囱登记炊烟，其余被 userData 覆盖——所以改成逐个登记
    g.userData.chimney = undefined;
    const sz = shoreZ(-62);
    T.landmark(g, -62, sz - 27, 0, {
      name: '商人街 · Merchants’ Row',
      shortName: '商人街',
      tag: '山墙朝着码头',
      desc: '五幢三层的窄楼并肩立在码头后街，每幢都把阶梯形的山墙对着海：灰泥墙刷着赭黄、鲑红、海蓝，二层外挑，山墙下伸出一根吊货的横梁，门前两级石阶。',
      detail: '汉萨城市的商人住宅是"前店后仓"：一楼谈生意，二楼住人，阁楼堆货，山墙下的横梁直接从街上把货吊进阁楼。地皮按临街宽度收税，所以房子都窄而高，山墙越花哨，说明生意越大。',
    }, { dist: 40, height: 20, ty: 7, rot: 0.15 });
  }

  /* ================= 水手礼拜堂 ================= */
  {
    const g = new THREE.Group();
    const nave = K.makeHouse(P, {
      w: 6.4, d: 11, floors: 1, floorH: 4.6, wall: P.stoneLight, base: stone, baseH: 0.6,
      roof: 'gable', roofMat: P.slate, pitch: 0.8, windows: 1, door: P.woodDark, chimney: false,
    });
    g.add(nave);
    // 钟塔小尖顶：骑在前山墙上
    const turret = box(1.8, 2.4, 1.8, P.stoneLight);
    turret.position.set(0, 7.4, 4.2);
    g.add(turret);
    const spire = cone(1.4, 3.6, 8, P.slate);
    spire.position.set(0, 10.4, 4.2);
    g.add(spire);
    const cross = box(0.12, 1.0, 0.12, P.iron);
    cross.position.set(0, 12.7, 4.2);
    g.add(cross);
    const cross2 = box(0.5, 0.12, 0.12, P.iron);
    cross2.position.set(0, 12.9, 4.2);
    g.add(cross2);
    // 彩窗（正面圆窗）
    const rose = cyl(0.9, 0.9, 0.12, 12, TMWin(), false);
    rose.rotation.x = Math.PI / 2;
    rose.position.set(0, 5.6, 5.52);
    g.add(rose);
    // 门口悬着的船模（还愿物）
    const ship = box(1.0, 0.3, 0.4, P.woodDark);
    ship.position.set(0, 3.6, 5.9);
    g.add(ship);
    const sm = box(0.05, 0.8, 0.05, P.wood);
    sm.position.set(0, 4.0, 5.9);
    g.add(sm);
    // 墓石：海难者的无名碑
    for (let i = 0; i < 5; i++) {
      const s = box(0.6, 0.9 + (i % 2) * 0.3, 0.14, stone);
      s.position.set(-5 + i * 1.5, 0.5, -8.5 - (i % 2));
      g.add(s);
    }
    function TMWin() { return T.TM.stainedGlass; }
    T.landmark(g, -112, shoreZ(-112) - 40, 0.4, {
      name: '水手礼拜堂 · St Nicholas’ Chapel',
      shortName: '礼拜堂',
      tag: '出海前先来一趟',
      desc: '码头西头的一座小石堂，圆形彩窗对着海，前山墙上骑着一座带铁十字的小钟楼。门楣下悬着一只木刻的船模，堂后的小墓地里是一排没有名字的石碑。',
      detail: '圣尼古拉是水手与商人的守护圣人。船离港前，船员要到堂里点一支蜡烛、捐一点钱；平安回来的人把船模挂在门口还愿。海难者的尸体往往找不回来，墓地里立的多半是"衣冠碑"。',
    }, { dist: 34, height: 17, ty: 6, rot: 0.4 });
  }

  /* ================= 酒馆「锚」 ================= */
  {
    const g = new THREE.Group();
    const t = K.makeHouse(P, {
      w: 10, d: 7.5, floors: 2, floorH: 2.9, wall: P.wash(0xeadfc4), base: stone, baseH: 0.6,
      roof: 'gable', roofMat: P.tile, pitch: 0.62, timber: true, jetty: true, windows: 3,
      shutter: 0x2f5a7a, porch: true,
    });
    g.add(t);
    T.smokeFrom(g, t.userData.chimney);
    // 招牌：铁臂 + 木牌 + 锚形图案
    const arm = box(1.6, 0.1, 0.1, P.iron);
    arm.position.set(5.6, 4.6, 3.9);
    g.add(arm);
    // 牌子吊在铁臂上，风一吹就晃
    const signPivot = new THREE.Group();
    signPivot.position.set(6.2, 4.55, 3.9);
    const sign = box(1.1, 0.85, 0.1, P.woodDark);
    sign.position.set(0, -0.55, 0);
    signPivot.add(sign);
    const anc = K.anchor(P, 0.4);
    anc.position.set(0, -0.85, 0.1);
    signPivot.add(anc);
    g.add(signPivot);
    T.sway(signPivot, { ax: 0.16, az: 0.0, speed: 1.7 });
    // 长凳与桶桌
    const bench = box(2.4, 0.12, 0.5, P.wood);
    bench.position.set(-2.4, 0.5, 5.3);
    g.add(bench);
    const tb = cyl(0.45, 0.45, 0.85, 10, P.woodDark);
    tb.position.set(-2.4, 0.43, 6.1);
    g.add(tb);
    T.landmark(g, 52, shoreZ(52) - 32, 0, {
      name: '酒馆「锚」 · The Anchor Inn',
      shortName: '酒馆',
      tag: '水手发工钱的地方',
      desc: '临着码头的两层木筋楼，二层外挑，门前一小块雨棚下摆着长凳和一只充当桌子的酒桶。铁臂上挂着一块画着船锚的木牌，窗里夜夜亮着灯。',
      detail: '港口酒馆是水手的银行、职介所和澡堂：船长在这里招人，工钱常常直接在酒桌上结，欠了酒账的水手会被"卖"给下一艘缺人的船。酒馆老板与港务官分账，所以镇上谁都得罪不起他。',
    }, { dist: 34, height: 17, ty: 5 });
    T.glow(52 + 3, 3.4, shoreZ(52) - 32 + 4.2, { color: 0xffb060, size: 3.4 });
  }

  /* ================= 熏鱼房与晾网 ================= */
  {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const sm = K.makeHouse(P, {
        w: 4.6, d: 5.4, floors: 1, floorH: 3.0, wall: P.flat(0x6a5238, 1), base: stone, baseH: 0.5,
        roof: 'gable', roofMat: P.shingle, pitch: 0.9, windows: 0, door: P.woodDark, chimney: true,
        chimneyMat: stone,
      });
      sm.position.set(i * 7.2, 0, 0);
      g.add(sm);
      T.smokeFrom(g, sm.userData.chimney.clone().add(new THREE.Vector3(i * 7.2, 0, 0)));
    }
    // 鱼干架：杆上挂满银色鱼
    for (let i = 0; i < 3; i++) {
      const px = i * 7.2 + 1;
      for (const sx of [-1, 1]) {
        const pst = cyl(0.07, 0.09, 2.4, 6, P.wood);
        pst.position.set(px + sx * 2.6, 1.2, 8);
        g.add(pst);
      }
      const rod = cyl(0.04, 0.04, 5.2, 5, P.wood, false);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(px, 2.3, 8);
      g.add(rod);
      const fish = [];
      for (let k = 0; k < 11; k++) {
        fish.push({ x: px - 2.3 + k * 0.46, y: 1.85, z: 8, sx: 0.12, sy: 0.7, sz: 0.2, ry: rand() * 0.5 });
      }
      g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0xb8c4c8, 0.4, { metalness: 0.4 }), fish));
    }
    T.landmark(g, -104, shoreZ(-104) - 44, 0.15, {
      name: '熏鱼房 · Smokehouses',
      shortName: '熏鱼房',
      tag: '一年的蛋白质',
      desc: '三间黑乎乎的木板小屋并排而立，屋顶烟囱里整天冒着烟；屋前两根木杆拉着长杆，成串的鲱鱼风干在海风里，银灰的鱼身在阳光下一闪一闪。',
      detail: '鲱鱼是中世纪欧洲最重要的蛋白质：腌过、熏过的鱼能存放几个月，正好供应四旬斋期间不吃肉的几百万人。靠鲱鱼生意发家的汉萨城市，一度能让国王借钱给它们。',
    }, { dist: 32, height: 16, ty: 4, rot: 0.15 });
  }

  /* ================= 渔民小屋 + 巷子 ================= */
  {
    // 主街：路口 → 码头
    const sz0 = shoreZ(0);
    const main = [[10, -62], [8, -30], [4, sz0 - 40], [0, sz0 - 10]];
    T.add(K.ribbon(main, 6.2, cobble, 0.05), 0, 0);
    // 侧巷
    T.add(K.ribbon([[-60, sz0 - 14], [-30, sz0 - 18], [0, sz0 - 18], [30, sz0 - 22], [60, sz0 - 26]], 3.6, P.road, 0.04), 0, 0);
    T.add(K.ribbon([[8, -45], [-30, -52], [-70, -48], [-112, -42]], 3.2, P.road, 0.04), 0, 0);
    T.add(K.ribbon([[8, -45], [40, -50], [78, -46], [112, -38]], 3.2, P.road, 0.04), 0, 0);

    // 集市小广场
    const sq = box(26, 0.14, 20, cobble, false);
    sq.position.set(-8, 0.07, -50);
    T.add(sq, 0, 0);
    const well = T.VIL.makeVillageWell(T.TM);
    T.add(well, -8, -50, 0.4);

    // 渔民小屋：散落在北面，避开主街与广场
    const taken = [
      { x: -62, z: shoreZ(-62) - 27, r: 22 }, { x: -6, z: shoreZ(-6) - 30, r: 14 }, { x: 52, z: shoreZ(52) - 32, r: 10 },
      { x: -112, z: shoreZ(-112) - 40, r: 10 }, { x: -104, z: shoreZ(-104) - 44, r: 14 }, { x: -8, z: -50, r: 18 },
      { x: 8, z: -62, r: 8 },
    ];
    const lane = (x, z) => Math.hypot(x - (6 + (z + 62) * -0.05), 0) < 6.5 && z > -64 && z < sz0 - 8;
    let placed = 0;
    let guard = 0;
    while (placed < 17 && guard < 600) {
      guard++;
      const x = rand.range(-132, 132);
      const z = rand.range(-108, shoreZ(x) - 48);
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r) || lane(x, z)) continue;
      if (taken.some((t) => t.r < 9 && Math.hypot(x - t.x, z - t.z) < 9)) continue;
      const w = rand.range(4.2, 5.8);
      const style = rand.int(0, 2);
      const h = T.house({
        w, d: rand.range(4, 5.4), floors: style === 2 ? 2 : 1, floorH: 2.5,
        wall: style === 0 ? P.plaster : style === 1 ? P.wash(0xdcd0b8) : P.timber,
        base: stone, baseH: 0.45,
        roof: style === 1 ? 'hip' : 'gable', roofMat: style === 2 ? P.shingle : P.thatch,
        pitch: 0.7, windows: 1, chimney: rand() < 0.7, timber: style === 1,
      }, x, z, rand.range(-0.5, 0.5) + (z < -50 ? 0 : 0));
      taken.push({ x, z, r: 8 });
      placed++;
      // 屋前的杂物
      if (rand() < 0.45) T.add(K.barrelStack(P, { rows: 1, cols: 2 }), x + 3.2, z + 3.4, rand() * 6);
      if (rand() < 0.35) T.add(K.sackPile(P, { n: 4 }), x - 3.0, z + 3.0, rand() * 6);
    }

    // 沙滩上晾的渔网：杆 + 网
    for (let i = 0; i < 6; i++) {
      const lx = -112 + i * 7 + rand() * 2;
      const lz = shoreZ(lx) - 10 + rand() * 2;
      for (const sx of [-1, 1]) {
        const pst = cyl(0.06, 0.08, 3.2, 5, P.wood);
        pst.position.set(lx + sx * 2.1, 1.6, lz);
        T.add(pst, 0, 0);
      }
      const net = K.hangingNet(4.2, 2.2);
      T.add(net, lx, lz, rand.range(-0.1, 0.1), 2.0);
    }
  }

  /* ================= 码头货堆 ================= */
  {
    const items = [
      [-92, 'barrel'], [-72, 'crate'], [-44, 'sack'], [-16, 'barrel'], [14, 'crate'], [46, 'sack'], [66, 'barrel'], [84, 'crate'],
    ];
    for (const [lx, kind] of items) {
      const z = shoreZ(lx) + 3 + rand.range(-2.5, 1.5);
      const obj = kind === 'barrel' ? K.barrelStack(P, { rows: rand.int(1, 2), cols: 3 })
        : kind === 'crate' ? K.crateStack(P, { n: 4, s: 0.75 }) : K.sackPile(P, { n: 6 });
      T.add(obj, lx, z, rand() * 3, QUAY_Y);
    }
    // 锚与缆
    T.add(K.anchor(P, 1.2), -100, shoreZ(-100) + 2, 0.6, QUAY_Y);
    T.add(K.anchor(P, 1.0), 72, shoreZ(72) + 6, -0.8, QUAY_Y);
    // 路灯：沿码头一线；两盏挂真光源
    for (let x = -100, i = 0; x <= 100; x += 25, i++) {
      T.lamp(x, shoreZ(x) + 8.5, { ry: Math.PI, h: 3.4, y: QUAY_Y, light: i === 2 || i === 5 });
    }
    T.lamp(MOLE_X, moleZ0 + 20, { ry: Math.PI / 2, h: 3.4, y: 1.4, light: true, gain: 0.5 });
    T.lamp(8, -48, { ry: 0.5, h: 3.2 });
    T.lamp(-20, shoreZ(-20) - 20, { ry: 0.5, h: 3.2 });
  }

  /* ================= 居民 ================= */
  {
    const palette = [0x8a3a2a, 0x2f5a7a, 0x4a6a3a, 0x7a5a2a, 0x5a3a52];
    const qz = (lx) => shoreZ(lx) + 3;
    // 码头上扛货的人
    for (let i = 0; i < 5; i++) {
      const x0 = -90 + i * 36;
      T.person({ tabard: palette[i % 5], helmet: i % 2 ? 'hood' : 'none' }, x0, qz(x0), 0,
        { walk: { from: [x0, qz(x0)], to: [x0 + 24, qz(x0 + 24)], speed: 0.8 + rand() * 0.3 } }, 1, QUAY_Y);
    }
    // 栈桥尽头钓鱼的人
    for (const [lx, len] of [[-86, 30], [-26, 32]]) {
      T.person({ villager: true }, lx + 1.1, shoreZ(lx) + 14 + len - 1.5, 3.1, 'idle', 1, 0.76);
    }
    // 街上的居民
    for (let i = 0; i < 6; i++) {
      const x = rand.range(-50, 50);
      const z = rand.range(-56, shoreZ(x) - 30);
      T.person({ villager: true }, x, z, rand() * 6, 'idle');
    }
    T.walker({ villager: true }, [-8, -58], [-8, -34], 0.6);
    T.walker({ villager: true }, [14, -40], [6, shoreZ(6) - 16], 0.7);
  }

  /* ================= 生气：旗杆、波光、浪沫、船灯 ================= */
  {
    // 码头上三根旗杆：红白、蓝、黄
    [[-62, 0xb8322a], [0, 0x2f58a8], [62, 0xe0b028]].forEach(([x, c], i) => {
      const z = shoreZ(x) + 10.4;
      const pole = cyl(0.1, 0.14, 8, 6, P.woodDark);
      T.add(pole, x, z, 0, QUAY_Y + 4);
      T.flag(x, QUAY_Y + 7.0, z, { w: 3.6, h: 1.9, color: c, ry: 0.5, wind: 1 + i * 0.1 });
    });

    // 港池里的阳光碎光（白天）
    T.emitter({ x: 0, y: 0.4, z: shoreZ(0) + 42, count: 70, life: 1.9, size: 0.55, color: 0xffffff, additive: true, opacity: 0.7,
      spread: [118, 0.03, 32], vel: [0, 0, 0], jitter: [0.03, 0, 0.03], fadeIn: 0.45, night: 'day' });

    // 码头外沿一线的白色浪沫，被轻轻推着走
    for (let x = -96; x <= 90; x += 31) {
      T.emitter({ x, y: 0.18, z: shoreZ(x) + 14.6, count: 12, life: 2.6, size: 0.7, color: 0xf2f8fc, opacity: 0.5,
        spread: [13, 0.02, 0.5], vel: [0.25, 0, 0.12], jitter: [0.12, 0, 0.1], fadeIn: 0.25 });
    }

    // 夜里每条小渔船的船头挂一盏提灯
    const lanterns = [];
    for (const boat of fleet) {
      const pole = box(0.06, 1.3, 0.06, P.woodDark, false);
      pole.position.set(0, 1.0, 1.1);
      boat.add(pole);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.glowTx, color: 0xffb860, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      halo.position.set(0, 1.75, 1.1);
      halo.scale.setScalar(1.6);
      boat.add(halo);
      lanterns.push(halo);
    }
    T.animate((dt, t, night) => {
      const a = THREE.MathUtils.clamp((night - 0.25) / 0.5, 0, 1);
      lanterns.forEach((h, i) => { h.material.opacity = a * (0.8 + Math.sin(t * 3 + i) * 0.1); });
    });
  }

  /* ================= 海鸥 ================= */
  T.birds({ count: 14, center: [10, shoreZ(10) + 8], radius: 54, height: 17, color: 0xf2f2ee, scale: 1.7 });
  T.birds({ count: 8, center: [-70, shoreZ(-70)], radius: 30, height: 13, color: 0xe6e6e0, scale: 1.5 });

  /* ================= 总览入口 ================= */
  T.overview({
    name: '灯塔港 · Lanternport',
    tag: '海边的第一盏灯',
    desc: '大陆最南端的海港。石砌的码头顺着海岸弯成一道弧，东头一道防波堤伸进海里，堤头的灯塔彻夜不灭；码头上有踏轮吊车、木栈桥和一艘下锚的科格船，岸上是汉萨式的山墙楼、水手礼拜堂和熏鱼房。',
    detail: '内陆的人叫它"世界的南门"：盐、鱼、酒、羊毛从这里出海，香料、丝绸、葡萄酒从这里上岸。镇子靠关税与渔业为生，镇议会里最有话语权的不是领主，而是船主公会。',
  }, { cx: 0, cz: 20, dist: 210, height: 95, rot: 0.3 });
}
