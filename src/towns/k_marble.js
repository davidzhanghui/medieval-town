import * as THREE from 'three';
import { buildCastleSite, buildTownSite } from './kingdom_common.js';

/* ============================================================
 *  大理石王国 Marmara —— 爱琴海式的城邦
 *  白色大理石神庙、柱廊与山花、圆形剧场、赤陶红瓦、蓝门白墙、橄榄与柏树。
 * ========================================================== */

function kit(T) {
  const { K, P } = T;
  const { box, cyl, cone, sphere } = K;
  const M = {
    marble: P.flat(0xf0ece4, 0.55),
    marbleD: P.flat(0xd8d2c4, 0.6),
    stone: P.tint('stone', 0xd8d0bc),
    stoneD: P.tint('stone', 0xb8ae96),
    terra: P.flat(0xc8643a, 0.8),
    blue: P.flat(0x2f6aa8, 0.6),
    gold: P.flat(0xd8a838, 0.35, { metalness: 0.6 }),
    white: P.wash(0xf4f0e6),
    dark: P.dark,
    wood: P.woodDark,
    pave: P.flat(0xe0d8c4, 0.9, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    water: P.flat(0x4aa8c8, 0.12, { metalness: 0.3 }),
  };
  const ROBES = [0xf0ece4, 0x2f6aa8, 0xc8643a, 0xd8c890, 0x8a3a5a, 0x3a7a5a];

  /** 柱廊：沿 X，n 根柱 */
  function colonnade(n, gap, h, r = 0.55, mat = M.marble) {
    const g = new THREE.Group();
    const cols = [], caps = [], bases = [];
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * gap;
      cols.push({ x, y: h / 2 + 0.3, z: 0 });
      caps.push({ x, y: h + 0.5, z: 0 });
      bases.push({ x, y: 0.15, z: 0 });
    }
    g.add(K.scatter(new THREE.CylinderGeometry(r * 0.85, r, h - 0.4, 14), mat, cols));
    g.add(K.scatter(new THREE.BoxGeometry(r * 2.8, 0.4, r * 2.8), mat, caps));
    g.add(K.scatter(new THREE.BoxGeometry(r * 2.6, 0.3, r * 2.6), mat, bases));
    return g;
  }
  /** 山花：三角形实体，沿 X 方向宽 w，厚 th */
  function pediment(w, h, th, mat = M.marble) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false });
    geo.translate(0, 0, -th / 2);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  }
  /** 神庙：台基 + 四周柱廊 + 内殿 + 前后山花 + 赤陶瓦顶 */
  function temple(cx, cz, gap = 3.4, h = 8.4, { roofMat = M.terra } = {}) {
    const g = new THREE.Group();
    const W = (cx - 1) * gap + 4, D = (cz - 1) * gap + 4;
    for (let i = 0; i < 3; i++) {
      const b = box(W + 2 - i * 1.4, 0.6, D + 2 - i * 1.4, M.marbleD);
      b.position.y = 0.3 + i * 0.6;
      g.add(b);
    }
    const y0 = 1.8;
    for (const sz of [-1, 1]) {
      const c = colonnade(cx, gap, h);
      c.position.set(0, y0, sz * ((cz - 1) * gap) / 2);
      g.add(c);
    }
    for (const sx of [-1, 1]) {
      for (let i = 1; i < cz - 1; i++) {
        const c = colonnade(1, gap, h);
        c.position.set(sx * ((cx - 1) * gap) / 2, y0, -((cz - 1) * gap) / 2 + i * gap);
        g.add(c);
      }
    }
    const cella = box((cx - 3) * gap + 1.2, h, (cz - 2) * gap, M.marble);
    cella.position.y = y0 + h / 2;
    g.add(cella);
    const door = box(2.4, h * 0.6, 0.2, M.dark, false);
    door.position.set(0, y0 + h * 0.3, ((cz - 2) * gap) / 2 + 0.05);
    g.add(door);
    const arch = box(W, 0.9, D, M.marbleD);
    arch.position.y = y0 + h + 0.7;
    g.add(arch);
    const rh = W * 0.16;
    const ro = K.gableRoof(W - 0.4, D, rh, roofMat, M.marble, { over: 0.4, gables: false });
    ro.position.y = y0 + h + 1.1;
    g.add(ro);
    for (const sz of [-1, 1]) {
      const pd = pediment(W - 0.6, rh, 0.6);
      pd.position.set(0, y0 + h + 1.1, sz * (D / 2 - 0.2));
      g.add(pd);
    }
    g.userData.top = y0 + h + rh + 1.1;
    g.userData.size = { W, D };
    return g;
  }
  /** 圆形剧场：同心半圆台阶 */
  function theatre(R = 14, rows = 9) {
    const g = new THREE.Group();
    for (let i = 0; i < rows; i++) {
      const r0 = 5 + i * ((R - 5) / rows), r1 = r0 + (R - 5) / rows;
      const geo = new THREE.CylinderGeometry(r1, r1, 0.5 + i * 0.5, 22, 1, false, -Math.PI / 2, Math.PI);
      const m = new THREE.Mesh(geo, i % 2 ? M.marble : M.marbleD);
      m.position.y = (0.5 + i * 0.5) / 2;
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    const orch = new THREE.Mesh(new THREE.CircleGeometry(5.2, 22, -Math.PI / 2, Math.PI), M.pave);
    orch.rotation.x = -Math.PI / 2;
    orch.position.y = 0.08;
    g.add(orch);
    const stage = box(14, 1, 5, M.marble);
    stage.position.set(-7, 0.5, 0);
    stage.rotation.y = Math.PI / 2;
    g.add(stage);
    const sc = colonnade(5, 3, 5);
    sc.position.set(-10, 1, 0);
    sc.rotation.y = Math.PI / 2;
    g.add(sc);
    return g;
  }
  /** 雕像：基座 + 人形简化 */
  function statue(h = 4) {
    const g = new THREE.Group();
    const b = box(1.6, h * 0.5, 1.6, M.marbleD);
    b.position.y = h * 0.25;
    g.add(b);
    const body = cyl(0.4, 0.55, h * 0.45, 8, M.marble);
    body.position.y = h * 0.5 + h * 0.22;
    g.add(body);
    const hd = sphere(0.38, M.marble, 8, 6);
    hd.position.y = h * 0.5 + h * 0.5;
    g.add(hd);
    for (const s of [-1, 1]) { const arm = box(0.18, h * 0.3, 0.18, M.marble, false); arm.position.set(s * 0.62, h * 0.62, 0); arm.rotation.z = s * 0.4; g.add(arm); }
    return g;
  }
  function villa(T2, rand, x, z, ry) {
    const w = 5.5 + rand() * 3, d = 5 + rand() * 3;
    const h = T2.house({
      w, d, floors: rand() < 0.3 ? 2 : 1, floorH: 2.7, wall: M.white, base: null, roof: 'hip', roofMat: M.terra, pitch: 0.38, chimney: false,
      windows: 2, door: P.flat(0x2f6aa8, 0.7), shutter: 0x2f6aa8, over: 0.7,
    }, x, z, ry);
    if (rand() < 0.5) {
      const co = colonnade(2, w * 0.5, 2.4, 0.16);
      co.position.set(0, 0, d / 2 + 1.2);
      h.add(co);
      const rf = box(w * 0.7, 0.14, 1.8, M.terra, false);
      rf.position.set(0, 2.9, d / 2 + 1.2);
      h.add(rf);
    }
    return h;
  }
  function olives(pts, rand) { return K.grove(P, 'oak', pts, { leaf: 0x8fa070, trunk: 0x6a5a48, scale: [0.55, 0.85], rand }); }
  function cypress(pts, rand) {
    const t = new THREE.CylinderGeometry(0.12, 0.2, 1.2, 5); t.translate(0, 0.6, 0);
    const c = new THREE.ConeGeometry(0.95, 6.4, 7); c.translate(0, 4.0, 0);
    const it = pts.map(([x, z]) => ({ x, z, ry: rand() * 6, s: 0.9 + rand() * 0.6 }));
    const g = new THREE.Group();
    g.add(K.scatter(t, P.flat(0x4a3423, 1), it));
    g.add(K.scatter(c, P.flat(0x2c4a2a, 1, { flatShading: true }), it));
    return g;
  }
  return { M, ROBES, colonnade, pediment, temple, theatre, statue, villa, olives, cypress };
}

export function castle(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  buildCastleSite(T, {
    ground: 0xc8bc94, groundR: 150, WH: 8,
    wallMat: M.stone,
    wallTop(len) {
      const g = new THREE.Group();
      const items = [];
      for (let x = -len / 2 + 2; x <= len / 2; x += 4) items.push({ x, y: 0.55, z: 1.3 }, { x, y: 0.55, z: -1.3 });
      g.add(K.scatter(new THREE.BoxGeometry(2, 1.1, 0.8), M.marbleD, items));
      return g;
    },
    flags: [0x2f6aa8, 0xf0ece4], flagY: 24, keepFlagY: 34, robes: S.ROBES, helmet: 'kettle', weapon: 'spear', shield: true, birdColor: 0xf4f0e4,
    tabards: [0x2f6aa8, 0xc8643a],
    tower() {
      const g = new THREE.Group();
      const b = cyl(4.8, 5.4, 13, 16, M.stone);
      b.position.y = 6.5;
      g.add(b);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const col = cyl(0.3, 0.34, 3.4, 10, M.marble);
        col.position.set(Math.cos(a) * 4.4, 14.7, Math.sin(a) * 4.4);
        g.add(col);
      }
      const d = K.dome(4.8, M.terra, { squash: 0.55 });
      d.position.y = 16.4;
      g.add(d);
      return g;
    },
    gate() {
      // 山门：六柱门廊 + 山花
      const g = new THREE.Group();
      const c = S.colonnade(6, 3.6, 9);
      c.position.set(0, 0.6, 0);
      g.add(c);
      const base = box(24, 0.6, 8, M.marbleD);
      base.position.y = 0.3;
      g.add(base);
      const ar = box(21, 1.2, 5.4, M.marbleD);
      ar.position.y = 10.4;
      g.add(ar);
      const pd = S.pediment(21, 3.6, 0.8);
      pd.position.set(0, 11, 2.2);
      g.add(pd);
      const door = box(6, 8, 0.4, M.dark, false);
      door.position.set(0, 4.6, -0.5);
      g.add(door);
      for (const s of [-1, 1]) { const st = S.statue(5); st.position.set(s * 14, 0, 4); g.add(st); }
      return g;
    },
    keep() {
      const g = new THREE.Group();
      const t = S.temple(8, 14, 3.5, 9);
      g.add(t);
      for (const s of [-1, 1]) {
        const sm = S.temple(4, 6, 3.2, 6);
        sm.position.set(s * 38, 0, 4);
        sm.scale.setScalar(0.9);
        g.add(sm);
      }
      for (let i = 0; i < 6; i++) { const st = box(14 - i * 0.4, 0.5, 1.6, M.marbleD); st.position.set(0, 0.3 + i * 0.5, 30 - i * 0.7); g.add(st); }
      return g;
    },
    court(T2) {
      const g = new THREE.Group();
      const pave = box(70, 0.12, 36, M.pave, false);
      pave.position.y = 0.06;
      g.add(pave);
      // 圣林：橄榄 + 雕像两列 + 浅水池
      const pool = box(22, 0.2, 8, M.water, false);
      pool.position.set(0, 0.16, 0);
      g.add(pool);
      const rim = box(24, 0.4, 10, M.marbleD, false);
      rim.position.set(0, 0.1, 0);
      g.add(rim);
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const st = S.statue(3.6); st.position.set(-12.5 + i * 5, 0, s * 8); g.add(st); }
      g.add(S.olives(Array.from({ length: 16 }, () => [(rand() < 0.5 ? -1 : 1) * (18 + rand() * 12), -14 + rand() * 28]), rand));
      g.add(S.cypress(Array.from({ length: 12 }, (_, i) => [-30 + i * 5.4, -16]), rand));
      return g;
    },
    annex(T2) {
      const g = S.theatre(14, 9);
      g.rotation.y = Math.PI / 2;
      return g;
    },
    barracks(T2, x, z) { S.villa(T2, rand, x, z, 0); },
    text: {
      walls: { name: '白石城墙 · The Limestone Wall', shortName: '角塔', tag: '塔顶有一圈小柱廊',
        desc: '米色石灰岩的城墙，墙顶一排大理石垛口；四角是圆塔，塔顶一圈八根小柱廊托着赤陶圆顶。', detail: '大理石王国把“防御”也做成了一件艺术品：每座塔的柱廊都不一样，雅典人说，连敌人看了都要先欣赏三分钟。' },
      gate: { name: '山门 · The Propylaea', shortName: '正门', tag: '六根柱子夹着一道门',
        desc: '六柱的大理石门廊，上面是三角形山花，门两侧立着石雕像。', detail: '“山门”不只是门，是仪式：进门的人要先抬头看山花上刻的神谱，念出自己的名字，再迈步进去。' },
      keep: { name: '白石神殿 · The Great Temple', shortName: '王宫', tag: '八乘十四根柱子',
        desc: '八乘十四根柱子围起的巨型神庙，前后各一面三角形山花，赤陶瓦顶；两侧各有一座小神庙。', detail: '柱子都是整块大理石削出来的，微微向内倾斜、中间略粗，为的是让人眼中看上去它是直的——这是工匠和视觉之间的一场小小的游戏。' },
      court: { name: '圣林雕像园 · The Sacred Grove', shortName: '圣林', tag: '二十四尊雕像排成两列',
        desc: '殿前的庭院中央是一汪浅水池，两侧各一列石雕像，外围是橄榄树和柏树。', detail: '雕像不是国王，而是历代的诗人、医生、造船师。国王自己是活的，不上石头。' },
      annex: { name: '半圆剧场 · The Theatre', shortName: '剧场', tag: '后排的人也听得见低语',
        desc: '一座九排台阶的半圆剧场，圆心是石铺的乐池，前面是一排柱廊舞台。', detail: '声音沿台阶往上走，所以舞台上说一句悄悄话，最后一排也能听清。这座剧场每年春天演一次新戏。' },
      overview: { name: '大理石王城 · Marmara', tag: '白柱、红瓦与蓝门', desc: '大理石王国的王城：米色石墙、六柱山门、八乘十四柱的神殿、圣林雕像园与半圆剧场。', detail: '大理石王国不打仗，但吵架——广场上每天都有人为一个比喻争论半天。' },
    },
    beacon() {
      const g = S.temple(8, 14, 3.5, 9);
      g.position.z = -14;
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
    ground: 0xc8bc94, paving: M.pave, robes: S.ROBES, flags: [0x2f6aa8, 0xf0ece4], houseN: 52, birdColor: 0xf4f0e4,
    centerpiece() {
      const g = new THREE.Group();
      const base = cyl(4.5, 5, 1.2, 14, M.marbleD);
      base.position.y = 0.6;
      g.add(base);
      const col = cyl(0.8, 1, 9, 14, M.marble);
      col.position.y = 5.7;
      g.add(col);
      const cap = box(2.6, 0.7, 2.6, M.marble);
      cap.position.y = 10.5;
      g.add(cap);
      const st = S.statue(4);
      st.position.y = 10.8;
      g.add(st);
      const wat = cyl(8, 8, 0.15, 24, M.water, false);
      wat.position.y = 0.1;
      wat.visible = false;
      return g;
    },
    stall(T2, r, i) {
      // 市政柱廊小棚：白布帐子 + 蓝色条
      const g = new THREE.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const p = cyl(0.12, 0.14, 2.6, 8, M.marble);
        p.position.set(sx * 1.4, 1.3, sz * 0.9);
        g.add(p);
      }
      const roof = box(3.6, 0.15, 2.6, i % 2 ? P.flat(0xf0ece4, 0.9) : P.flat(0x2f6aa8, 0.8), false);
      roof.position.y = 2.7;
      roof.rotation.x = 0.1;
      g.add(roof);
      const counter = box(2.9, 0.9, 0.8, M.marbleD);
      counter.position.set(0, 0.45, 0.45);
      g.add(counter);
      const goods = [];
      for (let k = 0; k < 5; k++) goods.push({ x: -1 + k * 0.5, y: 1.1, z: 0.45, s: 0.24 });
      g.add(K.scatter(new THREE.SphereGeometry(1, 6, 5), P.flat([0x4a6a2a, 0x8a3a5a, 0xd8a838, 0xc8643a, 0x2f6aa8][i % 5], 0.8), goods));
      return g;
    },
    hall() { return S.temple(6, 9, 3.4, 8); },
    inn() {
      // 柱廊别墅：中庭 + 四面屋
      const g = new THREE.Group();
      for (const [x, z, w, d] of [[0, -9, 28, 6], [-11, 0, 6, 20], [11, 0, 6, 20], [0, 9, 28, 6]]) {
        const b = box(w, 4, d, M.white);
        b.position.set(x, 2, z);
        g.add(b);
        const r = box(w + 1.4, 0.4, d + 1.4, M.terra);
        r.position.set(x, 4.2, z);
        g.add(r);
      }
      const co = S.colonnade(5, 3.2, 3.6, 0.3);
      co.position.set(0, 0, -4.8);
      g.add(co);
      g.add(S.olives([[0, 0]], rand));
      return g;
    },
    craft() {
      const g = new THREE.Group();
      const h = box(14, 4, 9, M.white);
      h.position.set(0, 2, -3);
      g.add(h);
      const r = K.gableRoof(9, 14, 2.6, M.terra, M.white, { over: 0.7 });
      r.rotation.y = Math.PI / 2;
      r.position.y = 4;
      r.position.z = -3;
      g.add(r);
      const amph = [];
      for (let i = 0; i < 14; i++) amph.push({ x: -6 + (i % 7) * 1.6, y: 0.7, z: 4 + ((i / 7) | 0) * 1.6, s: 0.8 + (i % 3) * 0.12 });
      const geo = new THREE.CylinderGeometry(0.5, 0.3, 1.4, 8);
      geo.translate(0, 0.0, 0);
      g.add(K.scatter(geo, P.flat(0xc8643a, 0.8), amph));
      return g;
    },
    house: (T2, r, x, z, ry) => S.villa(T2, r, x, z, ry),
    trees(T2, pts) {
      T2.add(S.olives(pts.slice(0, 26), rand), 0, 0);
      T2.add(S.cypress(pts.slice(26), rand), 0, 0);
    },
    animal() { return K.makeSheepLite(P, { tone: [0xe8e0d0, 0xb0a088, 0x4a3a2a][(rand() * 3) | 0], scale: 0.8 }); },
    animalN: 12,
    plazaProps(T2, g) {
      for (const [x, z] of [[-14, -12], [14, -12], [-14, 12], [14, 12]]) { const st = S.statue(3.4); st.position.set(x, 0, z); g.add(st); }
    },
    text: {
      plaza: { name: '广场 · The Agora', shortName: '广场', tag: '柱子上站着第一位市长',
        desc: '大理石铺的集会广场，正中一根九米高的柱子，柱顶立着石雕；四角四尊雕像，四周二十四座白布蓝条的小摊。', detail: '“agora”是聚集之地：买卖、辩论、投票、办案都在这里。柱子上那位是第一个靠投票而不是靠刀子做了市长的人。' },
      hall: { name: '市政神殿 · The Civic Temple', shortName: '神殿', tag: '六乘九根柱',
        desc: '六乘九根柱子围起的神庙，前后山花，赤陶瓦顶。', detail: '市政神殿同时是市政厅：神在上，账本在下，大家觉得这样比较省事。' },
      inn: { name: '柱廊别墅 · The Peristyle Villa', shortName: '客栈', tag: '中庭里一棵橄榄',
        desc: '四面屋围成的院落，中庭种着一棵老橄榄，北面屋前一排小柱廊。', detail: '客栈以橄榄油炸的小鱼出名。老板说秘诀是中庭里那棵树的叶子。' },
      craft: { name: '陶坊 · The Potters’ Workshop', shortName: '陶坊', tag: '一千只双耳瓶',
        desc: '白灰泥的陶坊，屋前的空地上排着一排排赤陶双耳瓶。', detail: '王国的出口主要是橄榄油、葡萄酒和蜂蜜，所以全国最大的行业是陶工：他们要把这些东西装进去。' },
      overview: { name: '大理石镇 · Marmara Town', tag: '白房子、红屋顶、蓝门', desc: '大理石王国的王镇：广场、市政神殿、柱廊别墅、陶坊，五十多栋白房子红瓦顶。', detail: '镇上的每扇门都是蓝色的，传说蓝色能让恶眼看不见。' },
    },
    beacon() {
      const g = S.temple(6, 9, 3.4, 8);
      g.position.z = -34;
      return g;
    },
  };
  if (tweak) tweak(cfg, T);
  buildTownSite(T, cfg);
}
