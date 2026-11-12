import * as THREE from 'three';
import { buildCastleSite, buildTownSite } from './kingdom_common.js';

/* ============================================================
 *  云锦国 Yunjin —— 丝绸与茶的东方王国
 *  红柱、白墙、灰绿瓦的飞檐屋顶，宝塔、牌楼、锦鲤池、樱花与竹林。
 * ========================================================== */

function kit(T) {
  const { K, P } = T;
  const { box, cyl, cone, sphere } = K;
  const M = {
    wall: P.tint('stone', 0xd8d4c8),
    wallD: P.tint('stone', 0xa8a498),
    white: P.wash(0xf4f0e4),
    red: P.flat(0xb5302a, 0.6),
    gold: P.flat(0xdca92c, 0.35, { metalness: 0.6 }),
    tile: P.flat(0x4f7a6e, 0.55, { metalness: 0.15 }),
    tileD: P.flat(0x39594f, 0.6),
    tileGold: P.flat(0xd8a838, 0.4, { metalness: 0.4 }),
    wood: P.woodDark,
    dark: P.dark,
    stone: P.tint('stone', 0xcfcabc),
    water: P.flat(0x4aa0a8, 0.12, { metalness: 0.35 }),
    pave: P.flat(0xa89f8c, 0.95, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    win: P.window,
  };
  const COL = [0xb5302a, 0xe0b030, 0x2f6aa8, 0xf0e8d8, 0x3a8a5a, 0xd06a8a];

  /** 飞檐屋顶：四坡 + 四角翘起的小尖 */
  function eave(w, d, h, mat, over = 1.1) {
    const g = new THREE.Group();
    g.add(K.hipRoof(w, d, h, mat, over));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const t = cone(0.32, 0.9, 5, mat, false);
      t.position.set(sx * (w / 2 + over - 0.1), 0.35, sz * (d / 2 + over - 0.1));
      t.rotation.set(sz * 0.5, 0, -sx * 0.5);
      g.add(t);
    }
    return g;
  }
  /** 一层带红柱的亭阁：柱 + 墙 + 飞檐 */
  function hall(w, d, floors, { roofMat = M.tile, wall = M.white, h = 3.4, plinth = 1.0 } = {}) {
    const g = new THREE.Group();
    const base = box(w + 2.4, plinth, d + 2.4, M.stone);
    base.position.y = plinth / 2;
    g.add(base);
    let y = plinth;
    for (let f = 0; f < floors; f++) {
      const sc = 1 - f * 0.18;
      const ww = w * sc, dd = d * sc;
      const body = box(ww - 0.8, h, dd - 0.8, wall);
      body.position.y = y + h / 2;
      g.add(body);
      const cols = [];
      const n = Math.max(2, Math.round(ww / 3.2));
      for (let i = 0; i <= n; i++) for (const sz of [-1, 1]) cols.push({ x: -ww / 2 + 0.2 + (ww - 0.4) * (i / n), y: y + h / 2, z: sz * (dd / 2 - 0.2), sx: 0.5, sy: h, sz: 0.5 });
      for (const sx of [-1, 1]) for (let i = 1; i < 3; i++) cols.push({ x: sx * (ww / 2 - 0.2), y: y + h / 2, z: -dd / 2 + (dd * i) / 3, sx: 0.5, sy: h, sz: 0.5 });
      g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.red, cols));
      const lintel = box(ww + 0.2, 0.5, dd + 0.2, M.red);
      lintel.position.y = y + h - 0.1;
      g.add(lintel);
      const lat = [];
      for (let i = 0; i < n; i++) lat.push({ x: -ww / 2 + 0.2 + (ww - 0.4) * ((i + 0.5) / n), y: y + h * 0.55, z: dd / 2 - 0.45, sx: (ww - 0.4) / n - 0.7, sy: h * 0.55, sz: 0.1 });
      g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.dark, lat));
      const ro = eave(ww, dd, h * 0.62, roofMat, 1.2);
      ro.position.y = y + h;
      g.add(ro);
      y += h + h * 0.62 * (f < floors - 1 ? 0.35 : 0);
    }
    g.userData.top = y + h * 0.62;
    return g;
  }
  /** 宝塔：七层逐层收小，每层一圈小飞檐 */
  function pagoda(tiers = 7, w0 = 9, h = 3.2) {
    const g = new THREE.Group();
    const b = box(w0 + 3, 1.2, w0 + 3, M.stone);
    b.position.y = 0.6;
    g.add(b);
    let y = 1.2;
    for (let i = 0; i < tiers; i++) {
      const w = w0 * (1 - i * 0.105);
      const body = box(w - 1, h, w - 1, i % 2 ? M.white : M.red);
      body.position.y = y + h / 2;
      g.add(body);
      const win = box(w * 0.3, h * 0.5, 0.12, M.dark, false);
      win.position.set(0, y + h * 0.55, (w - 1) / 2 + 0.03);
      g.add(win);
      const ro = eave(w, w, h * 0.55, M.tile, 1.1);
      ro.position.y = y + h;
      g.add(ro);
      y += h + h * 0.18;
    }
    const sp = cyl(0.12, 0.2, 5, 6, M.gold, false);
    sp.position.y = y + 2.2;
    g.add(sp);
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.5 - i * 0.08, 0.07, 5, 10), M.gold);
      r.rotation.x = Math.PI / 2;
      r.position.y = y + 0.8 + i * 0.7;
      g.add(r);
    }
    g.userData.top = y + 4;
    return g;
  }
  /** 牌楼：两柱一横梁，小飞檐 */
  function paifang(w = 10, h = 7) {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      const c = cyl(0.4, 0.45, h, 8, M.red);
      c.position.set(sx * w / 2, h / 2, 0);
      g.add(c);
      const ba = box(1.4, 0.5, 1.4, M.stone);
      ba.position.set(sx * w / 2, 0.25, 0);
      g.add(ba);
    }
    const beam = box(w + 1.6, 0.8, 0.9, M.red);
    beam.position.y = h - 0.4;
    g.add(beam);
    const band = box(w * 0.6, 0.9, 0.35, M.gold, false);
    band.position.set(0, h - 1.5, 0);
    g.add(band);
    const ro = eave(w + 1.6, 1.2, 1.4, M.tile, 0.9);
    ro.position.y = h;
    g.add(ro);
    return g;
  }
  /** 灰砖墙头的瓦压顶 */
  function wallCap(len) {
    const g = new THREE.Group();
    const cap = box(len + 0.2, 0.5, 4.0, M.tile);
    cap.position.y = 0.25;
    g.add(cap);
    const ridge = box(len + 0.2, 0.28, 0.5, M.tileD);
    ridge.position.y = 0.62;
    g.add(ridge);
    return g;
  }
  /** 灯笼：红色小圆柱 + 金盖 */
  function lanterns(pts) {
    const g = new THREE.Group();
    const body = new THREE.SphereGeometry(0.36, 8, 6);
    body.scale(1, 1.2, 1);
    g.add(K.scatter(body, P.flat(0xd8302a, 0.55, { emissive: 0x501008, emissiveIntensity: 0.4 }), pts.map(([x, y, z]) => ({ x, y, z }))));
    return g;
  }
  /** 民居：白墙灰瓦，门前红柱小廊，小飞檐 */
  function house(T2, rand, x, z, ry) {
    const w = 5.5 + rand() * 3, d = 5 + rand() * 3;
    const fl = rand() < 0.3 ? 2 : 1;
    const g = hall(w, d, fl, { h: 2.6, plinth: 0.5 });
    g.scale.setScalar(0.82);
    T2.add(g, x, z, ry);
    return g;
  }
  function bamboo(pts, rand) {
    const geo = new THREE.CylinderGeometry(0.1, 0.12, 7, 5);
    geo.translate(0, 3.5, 0);
    const g = new THREE.Group();
    g.add(K.scatter(geo, P.flat(0x6a9a3a, 0.8), pts.map(([x, z]) => ({ x, z, s: 0.8 + rand() * 0.8, rx: (rand() - 0.5) * 0.1, rz: (rand() - 0.5) * 0.1 }))));
    const leaf = new THREE.SphereGeometry(0.9, 5, 4);
    leaf.scale(1, 0.6, 1);
    leaf.translate(0, 7, 0);
    g.add(K.scatter(leaf, P.flat(0x5a9a3a, 1, { flatShading: true }), pts.map(([x, z]) => ({ x, z, s: 0.9 + rand() * 0.7 }))));
    return g;
  }
  function sakura(pts, rand) {
    const trunk = new THREE.CylinderGeometry(0.22, 0.34, 3, 6);
    trunk.translate(0, 1.5, 0);
    const crown = new THREE.IcosahedronGeometry(2.4, 0);
    crown.translate(0, 4.4, 0);
    const g = new THREE.Group();
    const items = pts.map(([x, z]) => ({ x, z, ry: rand() * 6, s: 0.8 + rand() * 0.6 }));
    g.add(K.scatter(trunk, P.flat(0x4a3028, 1), items));
    g.add(K.scatter(crown, P.flat(0xf2a8c0, 0.9, { flatShading: true }), items));
    return g;
  }
  function stone(pts, rand) {
    const g = new THREE.Group();
    g.add(K.scatter(new THREE.DodecahedronGeometry(1, 0), P.flat(0x8a928a, 1, { flatShading: true }), pts.map(([x, z]) => ({ x, y: 0.4, z, sx: 1 + rand(), sy: 1.4 + rand() * 1.5, sz: 1 + rand() * 0.6, ry: rand() * 6 }))));
    return g;
  }
  return { M, COL, eave, hall, pagoda, paifang, wallCap, lanterns, house, bamboo, sakura, stone };
}

export function castle(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  buildCastleSite(T, {
    ground: 0x7a8a58, groundR: 150,
    wallMat: M.wall, wallTop: (len) => S.wallCap(len),
    flags: [0xb5302a, 0xe0b030], flagY: 24, keepFlagY: 52,
    robes: S.COL, helmet: 'kettle', weapon: 'halberd', birdColor: 0xf4f0e4,
    tower() {
      const g = new THREE.Group();
      const b = box(11, 14, 11, M.wall);
      b.position.y = 7;
      g.add(b);
      const t = S.hall(10, 10, 1, { h: 3.4, plinth: 0 });
      t.position.y = 14;
      t.scale.set(0.9, 0.9, 0.9);
      g.add(t);
      return g;
    },
    gate() {
      const g = new THREE.Group();
      const body = box(24, 12, 8, M.wall);
      body.position.y = 6;
      g.add(body);
      const door = box(7, 8.5, 8.6, M.dark);
      door.position.y = 4.25;
      g.add(door);
      for (const s of [-1, 1]) {
        const leaf = box(3.1, 8, 0.4, M.red);
        leaf.position.set(s * 1.8, 4, 4.4);
        g.add(leaf);
      }
      const up = S.hall(22, 7, 1, { h: 3.2, plinth: 0 });
      up.position.y = 12;
      g.add(up);
      const pf = S.paifang(14, 7);
      pf.position.z = 16;
      g.add(pf);
      for (const s of [-1, 1]) {
        const lion = new THREE.Group();
        const b = box(1.6, 1.4, 2.2, M.stone);
        b.position.y = 0.9;
        lion.add(b);
        const h = sphere(0.7, M.stone, 8, 6);
        h.position.set(0, 2, 0.5);
        lion.add(h);
        const ped = box(2.2, 0.5, 2.8, M.stone);
        ped.position.y = 0.25;
        lion.add(ped);
        lion.position.set(s * 6.5, 0, 9.5);
        g.add(lion);
      }
      return g;
    },
    keep() {
      const g = new THREE.Group();
      // 三层汉白玉台基 + 大殿 + 两侧配殿 + 后面的宝塔
      for (let i = 0; i < 3; i++) {
        const b = box(52 - i * 4, 1.4, 34 - i * 3, M.stone);
        b.position.y = 0.7 + i * 1.4;
        g.add(b);
      }
      const main = S.hall(36, 20, 2, { h: 4.6, plinth: 0 });
      main.position.y = 4.2;
      g.add(main);
      for (const s of [-1, 1]) {
        const side = S.hall(12, 12, 1, { h: 3.6, plinth: 0 });
        side.position.set(s * 21, 4.2, 6);
        g.add(side);
      }
      const pg = S.pagoda(7, 8, 3);
      pg.position.set(0, 0, -23);
      g.add(pg);
      // 台阶
      for (let i = 0; i < 6; i++) {
        const st = box(9 - i * 0.2, 0.7, 2.2, M.stone);
        st.position.set(0, 0.35 + i * 0.7, 18 - i * 0.8);
        g.add(st);
      }
      return g;
    },
    court(T2) {
      const g = new THREE.Group();
      const pave = box(70, 0.12, 36, M.pave, false);
      pave.position.set(0, 0.06, 0);
      g.add(pave);
      // 锦鲤池 + 曲桥
      const pond = new THREE.Mesh(new THREE.CircleGeometry(11, 28), M.water);
      pond.rotation.x = -Math.PI / 2;
      pond.scale.y = 0.55;
      pond.position.set(0, 0.16, 0);
      g.add(pond);
      for (let i = 0; i < 8; i++) {
        const sg = box(3, 0.25, 1.6, M.wood);
        sg.position.set(-9 + i * 2.6, 0.5, (i % 2 ? 1 : -1) * 0.9);
        g.add(sg);
      }
      const pav = S.hall(6, 6, 1, { h: 2.8, plinth: 0.5 });
      pav.position.set(-9, 0, 0);
      pav.scale.setScalar(0.8);
      g.add(pav);
      const pts = [];
      for (let i = 0; i < 10; i++) pts.push([-30 + i * 6.5, -14 + (i % 2) * 28]);
      g.add(S.sakura(pts, rand));
      g.add(S.stone(Array.from({ length: 12 }, () => [(rand() - 0.5) * 26, (rand() - 0.5) * 12]).filter(([x, z]) => Math.hypot(x, z * 1.8) > 12), rand));
      g.add(S.bamboo(Array.from({ length: 24 }, () => [-34 + rand() * 8, -15 + rand() * 30]), rand));
      g.add(S.bamboo(Array.from({ length: 24 }, () => [26 + rand() * 8, -15 + rand() * 30]), rand));
      // 灯笼串
      g.add(S.lanterns(Array.from({ length: 16 }, (_, i) => [-28 + i * 3.7, 3.6, -16])));
      return g;
    },
    annex(T2) {
      const g = new THREE.Group();
      const h = S.hall(22, 9, 1, { h: 3.4, plinth: 0.4 });
      g.add(h);
      // 檐下晾晒的蚕丝与彩绸
      for (let i = 0; i < 6; i++) {
        const c = box(0.9, 4, 0.05, P.flat(S.COL[i % 6], 1), false);
        c.position.set(-8 + i * 3.2, 2.2, 5.6);
        g.add(c);
      }
      return g;
    },
    barracks(T2, x, z) { T2.add(S.hall(7, 5, 1, { h: 2.6, plinth: 0.3 }), x, z, 0); },
    text: {
      walls: { name: '云锦王城城墙 · Walls of Yunjin', shortName: '角塔', tag: '灰砖墙上压着青瓦',
        desc: '浅灰色的砖墙，墙头压一道青灰瓦；四角是方形的角楼，顶上一圈飞檐。', detail: '云锦国的城墙很少用来打仗，更多是用来划“内外”：墙里是宫，墙外是市。每扇门都有名字，每座角楼都有一首诗。' },
      gate: { name: '朱雀门 · The Vermilion Gate', shortName: '正门', tag: '门前先过一道牌楼',
        desc: '红柱灰瓦的门楼，门前立着一座三间牌楼和一对石狮。', detail: '牌楼本身不通向任何地方，它只是告诉你：从这里开始，要放轻脚步。' },
      keep: { name: '太和殿 · The Hall of Harmony', shortName: '王宫', tag: '三层汉白玉台基上的大殿',
        desc: '三层汉白玉台基托起两层重檐大殿，两侧配殿，殿后立着七层宝塔。', detail: '殿的屋顶是青绿琉璃瓦，檐角各蹲着一排小兽；台基越高，说话越要轻。宝塔是王国最高的建筑，塔铃随风声声不绝。' },
      court: { name: '锦鲤园 · The Koi Garden', shortName: '锦鲤园', tag: '一池水养着三百条锦鲤',
        desc: '殿前的庭园里有曲桥、凉亭、一池锦鲤，周围是樱花、竹林和奇石。', detail: '园子讲究“一步一景”：从曲桥这头走到那头，要转九个弯，每个弯看到的是不同的画。' },
      annex: { name: '蚕丝坊 · The Silk House', shortName: '丝坊', tag: '一匹锦要织三个月',
        desc: '宫内西南角的工坊，檐下晾着彩绸。', detail: '云锦国的立国之本是丝：养蚕、缫丝、染色、织锦，每个环节都有专属的官署。' },
      overview: { name: '云锦王城 · Yunjin', tag: '红柱、青瓦与七层宝塔', desc: '云锦国的王城：灰砖城墙、朱雀门、三层台基的大殿和锦鲤园。', detail: '云锦国在世界东缘，国人说“龙从东方来”，所以每座屋顶的角都往上翘，像要飞起来。' },
    },
    beacon() {
      const g = new THREE.Group();
      const pg = S.pagoda(7, 8, 3);
      pg.position.set(0, 0, -37);
      g.add(pg);
      const m = S.hall(36, 20, 2, { h: 4.6 });
      m.position.set(0, 4.2, -14);
      g.add(m);
      return g;
    },
  });
}

export function town(T, tweak) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  const cfg = {
    ground: 0x7a8a58, paving: M.pave, robes: S.COL, flags: [0xb5302a, 0xe0b030], houseN: 50, birdColor: 0xf4f0e4,
    centerpiece() {
      // 大铜香炉
      const g = new THREE.Group();
      const b = box(5, 1.2, 5, M.stone);
      b.position.y = 0.6;
      g.add(b);
      const pot = cyl(1.4, 1.1, 2, 12, P.flat(0x6a5a3a, 0.4, { metalness: 0.6 }));
      pot.position.y = 2.2;
      g.add(pot);
      for (const sx of [-1, 1]) { const ear = box(0.3, 0.9, 0.3, P.flat(0x6a5a3a, 0.4, { metalness: 0.6 })); ear.position.set(sx * 1.5, 3.4, 0); g.add(ear); }
      const lid = cone(1.2, 1.2, 8, P.flat(0x6a5a3a, 0.4, { metalness: 0.6 }));
      lid.position.y = 3.8;
      g.add(lid);
      g.add(S.paifang(16, 6.5));
      g.children[g.children.length - 1].position.z = 17;
      return g;
    },
    centerFx(T2) {
      T2.emitter({ x: 0, y: 3.9, z: 0, count: 20, life: 3, size: 0.9, color: 0xe0dcd0, opacity: 0.22, spread: [0.3, 0.1, 0.3], vel: [0, 0.8, 0], jitter: [0.2, 0.2, 0.2], fadeIn: 0.2 });
    },
    stall(T2, r, i) {
      const g = new THREE.Group();
      const col = S.COL[i % 6];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const p = cyl(0.07, 0.08, 2.6, 5, M.red);
        p.position.set(sx * 1.4, 1.3, sz * 0.9);
        g.add(p);
      }
      const roof = box(3.4, 0.12, 2.5, P.flat(col, 0.8), false);
      roof.position.y = 2.7;
      roof.rotation.x = 0.1;
      g.add(roof);
      const counter = box(2.9, 0.9, 0.8, M.wood);
      counter.position.set(0, 0.45, 0.45);
      g.add(counter);
      const goods = [];
      for (let k = 0; k < 6; k++) goods.push({ x: -1.1 + k * 0.45, y: 1.05, z: 0.45, s: 0.2 });
      g.add(K.scatter(new THREE.SphereGeometry(1, 6, 5), P.flat(S.COL[(i + 2) % 6], 0.8), goods));
      return g;
    },
    hall() {
      // 佛寺：三重檐 + 山门
      const g = new THREE.Group();
      const h = S.hall(24, 18, 3, { h: 4, plinth: 1.4 });
      g.add(h);
      const bell = S.pagoda(5, 6, 2.4);
      bell.position.set(19, 0, 4);
      g.add(bell);
      return g;
    },
    inn() {
      // 四合院：四面房围一个院，院中一棵树
      const g = new THREE.Group();
      for (const [x, z, w, d] of [[0, -11, 26, 7], [-15, 0, 7, 22], [15, 0, 7, 22], [0, 11, 26, 7]]) {
        const h = S.hall(w, d, 1, { h: 3, plinth: 0.4 });
        h.position.set(x, 0, z);
        g.add(h);
      }
      g.add(S.sakura([[0, 0]], rand));
      return g;
    },
    craft() {
      // 染坊：一排竹架挂着染好的绸
      const g = new THREE.Group();
      const h = S.hall(16, 10, 1, { h: 3.4, plinth: 0.4 });
      h.position.z = -5;
      g.add(h);
      for (let i = 0; i < 8; i++) {
        const post = cyl(0.1, 0.1, 6, 5, M.wood);
        post.position.set(-9 + i * 2.6, 3, 8);
        g.add(post);
        const cloth = box(2.2, 4.4, 0.05, P.flat(S.COL[i % 6], 1), false);
        cloth.position.set(-9 + i * 2.6 + 1.3, 3.6, 8);
        g.add(cloth);
      }
      return g;
    },
    house: (T2, r, x, z, ry) => S.house(T2, r, x, z, ry),
    trees(T2, pts) {
      T2.add(S.bamboo(pts.slice(0, 22), rand), 0, 0);
      T2.add(S.sakura(pts.slice(22), rand), 0, 0);
    },
    animal() { return K.makeSheepLite(P, { tone: 0xcfc4a0, scale: 0.8 }); },
    animalN: 10,
    plazaProps(T2, g) {
      g.add(S.lanterns(Array.from({ length: 14 }, (_, i) => [-19 + i * 3, 4.2, -2])));
    },
    text: {
      plaza: { name: '锦官广场 · Brocade Square', shortName: '锦官广场', tag: '铜炉里的香烟一直没断过',
        desc: '石铺的大广场，中央是一尊铜香炉，四周二十四个挂着彩篷的摊位：茶叶、绸缎、瓷器、竹编、糖人。', detail: '集市以茶和丝闻名。茶要用山泉水泡，所以广场边上总有挑水的人。' },
      hall: { name: '白云寺 · The Cloud Temple', shortName: '寺庙', tag: '三重檐下一口大钟',
        desc: '三重檐的大殿立在高台基上，东边的小塔里挂着一口铜钟。', detail: '寺里的钟每天敲一百零八下，全镇人听着钟声起床、下田、收工、睡觉。' },
      inn: { name: '四合客栈 · The Courtyard Inn', shortName: '客栈', tag: '一进院、两进院、三进院',
        desc: '四面房围成的院落，中间一棵樱花树。', detail: '客栈按“进”收费：越往里越静、越贵。最里面那间只留给读书人。' },
      craft: { name: '染坊 · The Dye House', shortName: '染坊', tag: '一匹布五种颜色',
        desc: '竹架上挂满刚染好的绸缎，红、蓝、金、绿、粉依次排开。', detail: '染料来自蓼蓝、茜草和槐花，染一匹布要泡三天、晒三天。' },
      overview: { name: '锦官镇 · Jinguan', tag: '白墙灰瓦的小镇', desc: '云锦国的王镇：铜炉广场、寺庙、四合客栈、染坊，以及五十多栋灰瓦小屋。', detail: '镇上所有屋顶的曲线都差不多，因为是同一个师傅教出来的。' },
    },
    beacon() {
      const g = new THREE.Group();
      const b = S.pagoda(5, 6, 2.4);
      b.position.set(19, 0, -30);
      g.add(b);
      const h = S.hall(24, 18, 3, { h: 4, plinth: 1.4 });
      h.position.z = -34;
      g.add(h);
      return g;
    },
  };
  if (tweak) tweak(cfg, T);
  buildTownSite(T, cfg);
}
