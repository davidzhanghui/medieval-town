import * as THREE from 'three';
import { buildCastleSite, buildTownSite } from './kingdom_common.js';

/* ============================================================
 *  翡翠雨林王国 Jadeveil
 *  长满青苔的阶梯金字塔、石雕蛇头与石碑、茅草屋、羽毛旗、浓密雨林与鹦鹉。
 * ========================================================== */

function kit(T) {
  const { K, P } = T;
  const { box, cyl, cone, sphere } = K;
  const M = {
    stone: P.flat(0x9a9a82, 0.95),
    stoneD: P.flat(0x6a6e5a, 0.95),
    moss: P.flat(0x4a7a3a, 1, { flatShading: true }),
    jade: P.flat(0x3aa88a, 0.4, { metalness: 0.2 }),
    gold: P.flat(0xdca92c, 0.35, { metalness: 0.65 }),
    thatch: P.thatch,
    wood: P.woodDark,
    dark: P.dark,
    red: P.flat(0xb8382a, 0.7),
    cloth: [0x2fa08a, 0xd8382a, 0xe8b830, 0x3a6ac8, 0xe86a2a].map((c) => P.flat(c, 0.85)),
    pave: P.flat(0x8a8a6a, 0.95, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    mud: P.flat(0xa08a64, 1),
    water: P.flat(0x3aa6a0, 0.12, { metalness: 0.3 }),
  };
  const CLOTH = [0x2fa08a, 0xd8382a, 0xe8b830, 0x3a6ac8, 0xe86a2a, 0xf0e8d0];

  /** 阶梯金字塔：n 层收分，四面各一道中央台阶，顶上一座小神庙（可选） */
  function pyramid(w, n, tierH, { temple = true, stairW = 5, mat = M.stone } = {}) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const s = w * (1 - i / (n + 0.6));
      const t = box(s, tierH, s, i % 2 ? M.stoneD : mat);
      t.position.y = tierH / 2 + i * tierH;
      g.add(t);
      // 青苔：每层顶面薄薄一层绿
      const mo = box(s * 0.96, 0.18, s * 0.96, M.moss, false);
      mo.position.y = tierH + i * tierH + 0.06;
      g.add(mo);
    }
    // 正面台阶
    const sH = n * tierH;
    const steps = n * 6;
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const st = box(stairW, sH / steps + 0.02, 1.0, M.stone);
      st.position.set(0, (sH * (k + 0.5)) / steps, w / 2 - t * (w / 2 - w * (1 - (n - 1) / (n + 0.6)) / 2) + 0.4);
      g.add(st);
    }
    for (const sx of [-1, 1]) {
      const rail = box(0.9, sH * 0.6, w * 0.5, M.stoneD);
      rail.position.set(sx * (stairW / 2 + 0.6), sH * 0.3, w / 2 - w * 0.25 + 0.5);
      rail.rotation.x = Math.atan2(sH, w * 0.5) * 0.0;
      g.add(rail);
    }
    if (temple) {
      const tw = w * (1 - (n - 1) / (n + 0.6)) * 0.62;
      const tb = box(tw, tierH * 1.3, tw * 0.8, M.stone);
      tb.position.y = sH + tierH * 0.65;
      g.add(tb);
      const door = box(tw * 0.3, tierH, 0.3, M.dark, false);
      door.position.set(0, sH + tierH * 0.5, tw * 0.4 + 0.1);
      g.add(door);
      const roof = box(tw + 1.2, 0.8, tw * 0.8 + 1.2, M.stoneD);
      roof.position.y = sH + tierH * 1.3 + 0.4;
      g.add(roof);
      const comb = box(tw * 0.8, tierH * 1.1, 0.6, M.jade);
      comb.position.y = sH + tierH * 1.3 + 1.3;
      g.add(comb);
    }
    g.userData.top = n * tierH + (temple ? tierH * 2.3 : 0);
    return g;
  }
  /** 蛇头：方头加獠牙 */
  function serpent(s = 1) {
    const g = new THREE.Group();
    const h = box(1.6 * s, 1.2 * s, 2 * s, M.stone);
    h.position.y = 0.6 * s;
    g.add(h);
    for (const sx of [-1, 1]) {
      const f = cone(0.18 * s, 0.9 * s, 4, P.flat(0xefe6c8, 0.8), false);
      f.position.set(sx * 0.5 * s, 0.1 * s, 1.1 * s);
      f.rotation.x = Math.PI;
      g.add(f);
      const e = sphere(0.2 * s, M.jade, 6, 5, false);
      e.position.set(sx * 0.6 * s, 1.0 * s, 0.9 * s);
      g.add(e);
    }
    return g;
  }
  /** 石碑群 */
  function stelae(pts, rand) {
    const g = new THREE.Group();
    g.add(K.scatter(new THREE.BoxGeometry(1.2, 4.4, 0.7), M.stone, pts.map(([x, z]) => ({ x, y: 2.2, z, ry: rand() * 3, s: 0.8 + rand() * 0.5 }))));
    g.add(K.scatter(new THREE.BoxGeometry(0.8, 0.8, 0.2), M.jade, pts.map(([x, z]) => ({ x, y: 3.4, z: z + 0.4, s: 1 }))));
    return g;
  }
  /** 火盆（金字塔顶 / 台阶旁） */
  function brazier() {
    const g = new THREE.Group();
    const b = cyl(0.7, 0.4, 0.9, 8, M.stoneD);
    b.position.y = 0.45;
    g.add(b);
    const f = cone(0.5, 1.1, 6, P.flat(0xff8a2a, 0.5, { emissive: 0xff6a10, emissiveIntensity: 0.7 }), false);
    f.position.y = 1.4;
    g.add(f);
    return g;
  }
  /** 茅草屋：低台基 + 木柱墙 + 陡茅顶 */
  function hut(T2, rand, x, z, ry) {
    const w = 5 + rand() * 2.5, d = 5 + rand() * 2.5;
    const h = T2.house({
      w, d, floors: 1, floorH: 2.3, wall: P.wash(0xc8b080), base: M.stoneD, baseH: 0.7, roof: rand() < 0.5 ? 'hip' : 'gable', roofMat: M.thatch, pitch: 0.95,
      timber: true, chimney: false, windows: 1, door: M.wood, over: 0.9,
    }, x, z, ry);
    if (rand() < 0.4) {
      const fl = box(0.06, 1.6, 0.9, P.flat(CLOTH[(rand() * 6) | 0], 0.9), false);
      fl.position.set(w / 2 + 0.3, 1.8, d / 2);
      h.add(fl);
    }
    return h;
  }
  /** 雨林：大叶阔树 + 棕榈 + 蕨丛 */
  function jungle(pts, rand) {
    const g = new THREE.Group();
    const a = pts.filter((_, i) => i % 3 !== 0);
    const b = pts.filter((_, i) => i % 3 === 0);
    g.add(K.grove(P, 'oak', a, { leaf: 0x2f7a30, trunk: 0x5a4030, scale: [1.2, 2.0], rand }));
    g.add(K.grove(P, 'palm', b, { leaf: 0x3a9a3a, trunk: 0x8a6a42, scale: [1.0, 1.7], rand }));
    return g;
  }
  function ferns(pts, rand) {
    const geo = new THREE.ConeGeometry(1.0, 1.2, 6, 1, true);
    geo.translate(0, 0.6, 0);
    return K.scatter(geo, P.flat(0x4a9a3a, 1, { flatShading: true, side: THREE.DoubleSide }), pts.map(([x, z]) => ({ x, z, s: 0.6 + rand() * 0.9, ry: rand() * 6 })));
  }
  return { M, CLOTH, pyramid, serpent, stelae, brazier, hut, jungle, ferns };
}

export function castle(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  buildCastleSite(T, {
    ground: 0x4a7a3a, groundR: 160, WH: 7,
    wallMat: M.stone,
    wallTop(len) {
      const g = new THREE.Group();
      const items = [];
      for (let x = -len / 2 + 1.5; x <= len / 2; x += 3) items.push({ x, y: 0.7, z: 1.4 }, { x, y: 0.7, z: -1.4 });
      g.add(K.scatter(new THREE.BoxGeometry(1.4, 1.4, 1.2), M.stoneD, items));
      const mo = box(len, 0.25, 3, M.moss, false);
      mo.position.y = 0.1;
      g.add(mo);
      return g;
    },
    flags: [0x2fa08a, 0xd8382a], flagY: 24, keepFlagY: 56, robes: S.CLOTH, helmet: 'none', weapon: 'spear', shield: true, birdColor: 0xd8382a, birdScale: 0.9,
    tabards: [0x2fa08a, 0xd8382a],
    tower() {
      const g = S.pyramid(12, 4, 3.4, { temple: false, stairW: 3 });
      const br = S.brazier();
      br.position.y = 13.6;
      g.add(br);
      return g;
    },
    gate() {
      const g = new THREE.Group();
      for (const s of [-1, 1]) {
        const p = box(7, 11, 7, M.stone);
        p.position.set(s * 8, 5.5, 0);
        g.add(p);
        const mo = box(7.2, 0.5, 7.2, M.moss);
        mo.position.set(s * 8, 11.2, 0);
        g.add(mo);
        const sp = S.serpent(1.6);
        sp.position.set(s * 8, 1, 5);
        g.add(sp);
      }
      const lintel = box(23, 3, 6, M.stoneD);
      lintel.position.y = 11;
      g.add(lintel);
      const jade = box(8, 1.2, 0.3, M.jade, false);
      jade.position.set(0, 11, 3.2);
      g.add(jade);
      const sun = cyl(2.4, 2.4, 0.4, 16, M.gold, false);
      sun.rotation.x = Math.PI / 2;
      sun.position.set(0, 13.6, 3.2);
      g.add(sun);
      return g;
    },
    keep() {
      const g = new THREE.Group();
      const pyr = S.pyramid(40, 6, 3.4, { temple: true, stairW: 7 });
      g.add(pyr);
      for (const sx of [-1, 1]) {
        const b = S.brazier();
        b.position.set(sx * 6, 20, 17);
        g.add(b);
      }
      for (const s of [-1, 1]) {
        const small = S.pyramid(14, 3, 2.6, { temple: true, stairW: 3 });
        small.position.set(s * 32, 0, 6);
        g.add(small);
      }
      T.glow(0, 24, 0, { size: 10, light: true, gain: 1.2, color: 0xff8a2a });
      T.emitter({ x: 0, y: 24, z: -14, count: 22, life: 3, size: 1.3, color: 0xcfcfc0, opacity: 0.28, spread: [0.3, 0.1, 0.3], vel: [0, 2, 0], jitter: [0.3, 0.3, 0.3], fadeIn: 0.15, grow: 1.4 });
      return g;
    },
    court(T2) {
      const g = new THREE.Group();
      const pave = box(70, 0.12, 36, M.pave, false);
      pave.position.y = 0.06;
      g.add(pave);
      // 球场：两面斜墙夹一条长场，墙中各嵌一个石环
      for (const s of [-1, 1]) {
        const w = box(1.6, 3.6, 30, M.stone);
        w.position.set(s * 9, 1.8, 0);
        g.add(w);
        const sl = box(2.2, 1.6, 30, M.stoneD);
        sl.position.set(s * 7.6, 0.8, 0);
        sl.rotation.z = s * -0.3;
        g.add(sl);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.22, 6, 14), M.jade);
        ring.position.set(s * 8.1, 3.4, 0);
        ring.rotation.y = Math.PI / 2;
        g.add(ring);
      }
      g.add(S.stelae(Array.from({ length: 8 }, (_, i) => [-30 + i * 9, -15]), rand));
      g.add(S.stelae(Array.from({ length: 5 }, (_, i) => [20 + i * 4, 10 + (i % 2) * 3]), rand));
      g.add(S.ferns(Array.from({ length: 28 }, () => [-34 + rand() * 68, -16 + rand() * 32]).filter(([x]) => Math.abs(x) > 12), rand));
      return g;
    },
    annex(T2) {
      // 观星台：圆形低塔 + 开口穹顶
      const g = new THREE.Group();
      const b = cyl(6, 6.8, 9, 14, M.stone);
      b.position.y = 4.5;
      g.add(b);
      const d = K.dome(6.2, M.stoneD, { squash: 0.7 });
      d.position.y = 9;
      g.add(d);
      const slit = box(1.4, 4, 2, M.dark, false);
      slit.position.set(0, 10.6, 3.6);
      g.add(slit);
      return g;
    },
    barracks(T2, x, z) { S.hut(T2, rand, x, z, 0); },
    text: {
      walls: { name: '青苔石墙 · The Mossy Wall', shortName: '角塔', tag: '墙缝里长着蕨',
        desc: '一圈布满青苔的石墙，墙顶是方块垛口；四角各立一座四层的小金字塔，塔顶点着火盆。', detail: '雨林里的石头不过三年就爬满苔藓，所以王国的建造师从不擦洗墙面：绿得越深，墙越老，越受尊敬。' },
      gate: { name: '蛇首门 · The Serpent Gate', shortName: '正门', tag: '门前的蛇张着嘴',
        desc: '两座石墩上各蹲着一条石雕蛇头，横梁中间嵌着一块金色的太阳盘和一条碧玉带。', detail: '蛇是雨水的使者：它每年旱季结束时从地下爬出来，引来第一场雨，所以进门要先给蛇头抹一点蜂蜜。' },
      keep: { name: '太阳金字塔 · The Pyramid of the Sun', shortName: '王宫', tag: '六层高台托着一座小庙',
        desc: '六层阶梯金字塔，正面一道七米宽的台阶，两侧火盆照亮；塔顶是带碧玉冠饰的小庙，两侧各有一座小金字塔。', detail: '国王住在塔顶的小庙里，每天清晨走下一百零八级台阶，迎接第一缕阳光；百姓站在庭院里，看他走下来的样子，就知道这一天的年成。' },
      court: { name: '球场与石碑 · The Ball Court', shortName: '球场', tag: '石环悬在三米高',
        desc: '庭院中间是两面斜墙夹出的长球场，墙上各嵌一个碧玉环；周围立着一排排雕花石碑。', detail: '球场既是竞技也是审判：赢的一方得到祭品，输的一方要把名字刻在石碑上。' },
      annex: { name: '观星台 · The Observatory', shortName: '观星台', tag: '圆塔顶上留着一道缝',
        desc: '圆形石塔顶着低矮的石穹顶，穹顶正面留着一道观测缝。', detail: '祭司通过这道缝看金星：每当金星从缝里升起，就是王国的新年。' },
      overview: { name: '翡翠王城 · Jadeveil', tag: '雨林里的金字塔城', desc: '翡翠雨林王国的王城：青苔石墙、蛇首门、六层的太阳金字塔与球场。', detail: '雨林里的路是走出来的，所以每座建筑前都留着一条磨亮的路。' },
    },
    beacon() {
      const g = new THREE.Group();
      const p = S.pyramid(40, 6, 3.4, { temple: true, stairW: 7 });
      p.position.z = -14;
      g.add(p);
      return g;
    },
    extra(T2) {
      T2.add(S.jungle(K.ringPoints(rand, 0, 0, 62, 118, 50, (x, z) => Math.abs(x) < 62 && Math.abs(z) < 56), rand), 0, 0);
    },
  });
}

export function town(T, tweak) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  const cfg = {
    ground: 0x4a7a3a, paving: M.pave, robes: S.CLOTH, flags: [0x2fa08a, 0xd8382a], houseN: 54, birdColor: 0xd8382a, glow: 0xff8a40,
    centerpiece() {
      // 太阳石盘 + 四尊石像
      const g = new THREE.Group();
      const base = cyl(5, 5.4, 0.7, 16, M.stoneD);
      base.position.y = 0.35;
      g.add(base);
      const disc = cyl(4.2, 4.2, 0.5, 20, M.stone, false);
      disc.position.y = 0.95;
      g.add(disc);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = box(0.4, 0.2, 2.6, M.jade, false);
        r.position.set(Math.cos(a) * 2.6, 1.28, Math.sin(a) * 2.6);
        r.rotation.y = -a + Math.PI / 2;
        g.add(r);
      }
      const gold = cyl(1.2, 1.2, 0.3, 16, M.gold, false);
      gold.position.y = 1.35;
      g.add(gold);
      for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
        const st = box(1.4, 3.6, 1.4, M.stone);
        st.position.set(x, 1.8, z);
        g.add(st);
        const hd = box(1.6, 1.2, 1.6, M.stoneD);
        hd.position.set(x, 4.2, z);
        g.add(hd);
      }
      return g;
    },
    stall(T2, r, i) {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const p = cyl(0.07, 0.08, 2.5, 5, M.wood);
        p.position.set(sx * 1.4, 1.25, sz * 0.9);
        g.add(p);
      }
      const roof = box(3.6, 0.3, 2.6, M.thatch, false);
      roof.position.y = 2.6;
      roof.rotation.x = 0.16;
      g.add(roof);
      const counter = box(2.9, 0.9, 0.8, M.wood);
      counter.position.set(0, 0.45, 0.45);
      g.add(counter);
      const cl = box(2.9, 0.06, 0.9, M.cloth[i % 5], false);
      cl.position.set(0, 0.93, 0.45);
      g.add(cl);
      const goods = [];
      for (let k = 0; k < 6; k++) goods.push({ x: -1.1 + k * 0.45, y: 1.08, z: 0.45, s: 0.22 });
      g.add(K.scatter(new THREE.SphereGeometry(1, 6, 5), P.flat([0xe8b830, 0xd8382a, 0x3aa88a, 0x6a4a2a, 0xe86a2a][i % 5], 0.8), goods));
      return g;
    },
    hall() {
      const g = S.pyramid(30, 5, 3.2, { temple: true, stairW: 5 });
      return g;
    },
    inn() {
      // 大茅屋：圆柱支撑的敞开长棚 + 吊床
      const g = new THREE.Group();
      const fl = box(30, 0.5, 18, M.stoneD);
      fl.position.y = 0.25;
      g.add(fl);
      for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) {
        const c = cyl(0.3, 0.34, 4, 8, M.wood);
        c.position.set(-12.5 + i * 5, 2.5, sz * 7);
        g.add(c);
      }
      const r = K.gableRoof(18, 32, 6, M.thatch, M.thatch, { over: 1.2 });
      r.rotation.y = Math.PI / 2;
      r.position.y = 4.4;
      g.add(r);
      for (let i = 0; i < 5; i++) {
        const hm = box(3, 0.1, 0.9, P.flat(S.CLOTH[i % 6], 0.9), false);
        hm.position.set(-10 + i * 5, 2.3, 0);
        hm.rotation.z = (i % 2 ? 1 : -1) * 0.08;
        g.add(hm);
      }
      return g;
    },
    craft() {
      // 陶坊 + 羽毛作坊：晾晒架上挂着五彩羽毛
      const g = new THREE.Group();
      const h = box(12, 4, 9, P.wash(0xc8a870));
      h.position.set(0, 2, -3);
      g.add(h);
      const r = cone(8.4, 4.4, 4, M.thatch);
      r.position.set(0, 6.2, -3);
      r.rotation.y = Math.PI / 4;
      g.add(r);
      for (let i = 0; i < 7; i++) {
        const post = cyl(0.1, 0.1, 5, 5, M.wood);
        post.position.set(-9 + i * 3, 2.5, 9);
        g.add(post);
        const f = box(1.8, 3, 0.05, P.flat(S.CLOTH[i % 6], 0.9), false);
        f.position.set(-9 + i * 3 + 1, 3.4, 9);
        g.add(f);
      }
      const pots = [];
      for (let i = 0; i < 10; i++) pots.push({ x: -5 + (i % 5) * 1.6, y: 0.5, z: 3 + ((i / 5) | 0) * 1.4, s: 0.5 + (i % 3) * 0.1 });
      g.add(K.scatter(new THREE.SphereGeometry(1, 7, 6), P.terracotta, pots));
      return g;
    },
    house: (T2, r, x, z, ry) => S.hut(T2, r, x, z, ry),
    trees(T2, pts) {
      T2.add(S.jungle(pts, rand), 0, 0);
      T2.add(S.ferns(K.ringPoints(rand, 0, 0, 40, 130, 70), rand), 0, 0);
    },
    animal() { return K.makeSheepLite(P, { tone: [0xc8a878, 0xe0d0b0, 0x8a6a48][(rand() * 3) | 0], scale: 0.95 }); },
    animalN: 10,
    extra(T2, homes) {
      T2.birds({ count: 12, center: [0, 0], radius: 40, height: 20, color: 0xe03a2a, scale: 0.7 });
      T2.birds({ count: 8, center: [20, 10], radius: 30, height: 16, color: 0x2fa08a, scale: 0.7 });
    },
    text: {
      plaza: { name: '太阳石广场 · Sun-Stone Plaza', shortName: '广场', tag: '十二道光，十二个月',
        desc: '铺石广场中央是一块十二道射线的太阳石盘，四角蹲着石像；四周二十四个茅顶摊位卖可可、羽毛、玉器和陶罐。', detail: '广场上不许打架：太阳石盘看着。违规者要在盘上站一整个正午。' },
      hall: { name: '雨神庙 · The Temple of Rain', shortName: '神庙', tag: '五层高台，每层一个神',
        desc: '五层阶梯金字塔，正面一条陡峭的台阶通向顶上的小庙。', detail: '雨神庙每年旱季结束时要换一次顶上的茅草，换草那天全镇人都来排队传草。' },
      inn: { name: '吊床大棚 · The Hammock Hall', shortName: '客栈', tag: '吊床比床软',
        desc: '一座茅顶的开敞长棚，几十根木柱撑着屋顶，柱间挂着五彩吊床。', detail: '雨林里没有人睡床：床里藏蛇，吊床离地。客栈收费按吊床的高度算，越高越贵。' },
      craft: { name: '陶与羽毛坊 · Pottery & Feathers', shortName: '陶坊', tag: '一只鹦鹉，一千根羽毛',
        desc: '一座茅顶的作坊，门前的晾架上挂着五彩羽毛，窗下摆着一排陶罐。', detail: '羽毛是国王赐礼最贵的东西：一件羽披风要三千根，要花一个工匠一年。' },
      overview: { name: '翡翠镇 · Jade Town', tag: '茅屋与金字塔', desc: '翡翠雨林王国的王镇：太阳石广场、雨神庙、吊床大棚、陶坊，以及五十多栋茅屋。', detail: '镇里每年雨季都要把路面重新铺一次，因为雨水也是一个勤劳的建筑师。' },
    },
    beacon() {
      const g = S.pyramid(30, 5, 3.2, { temple: true, stairW: 5 });
      g.position.z = -34;
      return g;
    },
  };
  if (tweak) tweak(cfg, T);
  buildTownSite(T, cfg);
}
