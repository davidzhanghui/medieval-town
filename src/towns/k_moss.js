import * as THREE from 'three';
import { buildCastleSite, buildTownSite } from './kingdom_common.js';

/* ============================================================
 *  苔光王国 Mosslight —— 蘑菇与古树的童话国度
 *  巨大的彩色蘑菇、爬满树屋的老树、荆棘与花拱门、发光的水晶与萤火虫。
 * ========================================================== */

function kit(T) {
  const { K, P } = T;
  const { box, cyl, cone, sphere } = K;
  const glow = (hex, i = 0.5) => P.flat(hex, 0.6, { emissive: hex, emissiveIntensity: i });
  const M = {
    stem: P.flat(0xefe6d0, 0.9),
    bark: P.flat(0x5a4636, 1, { flatShading: true }),
    barkL: P.flat(0x7a5e46, 1, { flatShading: true }),
    leaf: P.flat(0x3a8a4a, 1, { flatShading: true }),
    leafD: P.flat(0x2a6a3e, 1, { flatShading: true }),
    moss: P.flat(0x4a8a4a, 1),
    wood: P.woodDark,
    dark: P.dark,
    pave: P.flat(0x6a8a6a, 1, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    water: P.flat(0x4acaa8, 0.1, { metalness: 0.3, emissive: 0x1a6a5a, emissiveIntensity: 0.3 }),
    caps: [P.flat(0xc83a4a, 0.6), P.flat(0x8a4ac8, 0.6), P.flat(0xe89a3a, 0.6), P.flat(0x3aa8c8, 0.6), P.flat(0xe86aa8, 0.6)],
    spot: P.flat(0xfff4e0, 0.8),
    lamp: glow(0xffe08a, 0.9),
    crystal: [glow(0x7ae8e0, 0.7), glow(0xc87af0, 0.7), glow(0xf08ac0, 0.7)],
  };
  const ROBES = [0x8a4ac8, 0x3aa8c8, 0xe86aa8, 0x6aa84a, 0xe8c04a, 0xc83a4a];

  /** 蘑菇：茎 + 伞盖 + 白点，capIdx 选盖色 */
  function mushroom(stemH, stemR, capR, capIdx = 0, { spots = 8, gills = true } = {}) {
    const g = new THREE.Group();
    const st = cyl(stemR * 0.85, stemR, stemH, 10, M.stem);
    st.position.y = stemH / 2;
    g.add(st);
    const cap = K.dome(capR, M.caps[capIdx % 5], { squash: 0.62 });
    cap.position.y = stemH;
    g.add(cap);
    if (gills) {
      const gl = cyl(capR * 0.98, capR * 0.7, 0.35, 14, P.flat(0xe8d8c0, 0.9), false);
      gl.position.y = stemH + 0.05;
      g.add(gl);
    }
    const items = [];
    for (let i = 0; i < spots; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.35 + Math.random() * 0.9;
      items.push({ x: Math.cos(a) * Math.cos(e) * capR * 0.96, y: stemH + Math.sin(e) * capR * 0.6, z: Math.sin(a) * Math.cos(e) * capR * 0.96, s: capR * (0.08 + Math.random() * 0.06), sy: capR * 0.04 });
    }
    g.add(K.scatter(new THREE.SphereGeometry(1, 6, 4), M.spot, items));
    return g;
  }
  /** 老树：粗树干 + 分叉 + 圆冠 + 垂下的藤；返回 Group，userData.top */
  function elderTree(h = 30, r = 4.4) {
    const g = new THREE.Group();
    const tr = cyl(r * 0.6, r * 1.15, h, 10, M.bark);
    tr.position.y = h / 2;
    g.add(tr);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const root = box(1.2, 3, r * 1.4, M.bark);
      root.position.set(Math.cos(a) * r * 1.0, 1.2, Math.sin(a) * r * 1.0);
      root.rotation.y = -a + Math.PI / 2;
      root.rotation.z = 0.35;
      g.add(root);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const br = cyl(r * 0.22, r * 0.38, h * 0.4, 7, M.barkL);
      br.position.set(Math.cos(a) * r * 1.5, h * 0.82, Math.sin(a) * r * 1.5);
      br.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8);
      g.add(br);
    }
    const crown = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      crown.push({ x: Math.cos(a) * r * 3.2, y: h * 0.98 + (i % 2) * 2, z: Math.sin(a) * r * 3.2, s: r * 2.6 });
    }
    crown.push({ x: 0, y: h * 1.08, z: 0, s: r * 3.2 });
    g.add(K.scatter(new THREE.IcosahedronGeometry(1, 0), M.leaf, crown));
    const vines = [];
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, rr = r * (2 + Math.random() * 2.4);
      vines.push({ x: Math.cos(a) * rr, y: h * 0.82 - 3, z: Math.sin(a) * rr, sx: 0.12, sy: 6 + Math.random() * 5, sz: 0.12 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.leafD, vines));
    g.userData.top = h * 1.1 + r * 3;
    return g;
  }
  /** 树屋：圆形小屋 + 叶片屋顶 + 暖窗，挂在给定高度 */
  function treehouse(r = 2.6) {
    const g = new THREE.Group();
    const b = cyl(r, r, 2.4, 10, P.wash(0xd8c8a0));
    b.position.y = 1.2;
    g.add(b);
    const ro = cone(r * 1.35, r * 1.5, 10, M.leaf);
    ro.position.y = 2.4 + r * 0.7;
    g.add(ro);
    const pl = cyl(r * 1.3, r * 1.3, 0.3, 10, M.wood);
    pl.position.y = 0.05;
    g.add(pl);
    const dr = box(0.9, 1.5, 0.15, M.wood, false);
    dr.position.set(0, 0.75, r);
    g.add(dr);
    const wn = box(0.6, 0.6, 0.1, M.lamp, false);
    wn.position.set(r * 0.65, 1.6, r * 0.75);
    wn.rotation.y = 0.8;
    g.add(wn);
    return g;
  }
  /** 蘑菇屋：粗矮的茎当墙，大伞盖当屋顶，门窗 */
  function mushroomHouse(T2, rand, x, z, ry) {
    const g = new THREE.Group();
    const capR = 3.6 + rand() * 1.8, sh = 2.4 + rand() * 1.6, sr = 1.9 + rand() * 0.8;
    const m = mushroom(sh, sr, capR, (rand() * 5) | 0, { spots: 9 });
    g.add(m);
    const dr = box(0.95, 1.7, 0.2, M.wood, false);
    dr.position.set(0, 0.85, sr * 0.98);
    g.add(dr);
    const wn = box(0.7, 0.7, 0.12, M.lamp, false);
    wn.position.set(sr * 0.7, 1.7, sr * 0.7);
    wn.rotation.y = 0.8;
    g.add(wn);
    const ch = cyl(0.25, 0.3, 1.4, 6, M.bark, false);
    ch.position.set(-capR * 0.4, sh + capR * 0.5, 0);
    g.add(ch);
    T2.add(g, x, z, ry);
    T2.smokeFrom(g, new THREE.Vector3(-capR * 0.4, sh + capR * 0.5 + 0.9, 0));
    return g;
  }
  function crystals(pts, rand) {
    const g = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const geo = new THREE.OctahedronGeometry(1, 0);
      geo.scale(0.5, 1.8, 0.5);
      geo.translate(0, 1.4, 0);
      g.add(K.scatter(geo, M.crystal[k], pts.filter((_, i) => i % 3 === k).map(([x, z]) => ({ x, z, s: 0.7 + rand() * 1.1, ry: rand() * 6, rz: (rand() - 0.5) * 0.4 }))));
    }
    return g;
  }
  function fairyRing(r, n, rand) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const m = mushroom(0.6 + rand() * 0.5, 0.15, 0.4 + rand() * 0.3, (rand() * 5) | 0, { spots: 3, gills: false });
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      g.add(m);
    }
    return g;
  }
  function flowerArch(w = 7, h = 7) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const p = cyl(0.3, 0.4, h, 6, M.barkL);
      p.position.set(s * w / 2, h / 2, 0);
      g.add(p);
    }
    const top = new THREE.Mesh(new THREE.TorusGeometry(w / 2, 0.35, 6, 14, Math.PI), M.barkL);
    top.position.y = h;
    g.add(top);
    const fl = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 25) * Math.PI;
      fl.push({ x: Math.cos(a) * w / 2, y: h + Math.sin(a) * w / 2, z: (i % 2) * 0.3 - 0.15, s: 0.3 + (i % 3) * 0.1, color: [0xe86aa8, 0xe8c04a, 0xc87af0, 0xf0f0f0][i % 4] });
    }
    g.add(K.scatter(new THREE.SphereGeometry(1, 6, 5), P.flat(0xffffff, 0.8), fl));
    return g;
  }
  function trees(pts, rand) {
    const g = new THREE.Group();
    g.add(K.grove(P, 'oak', pts, { leaf: 0x3a8a4a, trunk: 0x5a4636, scale: [1.1, 1.8], rand }));
    return g;
  }
  function fireflies(T2, x, y, z, spread = [40, 4, 30], count = 40) {
    T2.emitter({ x, y, z, count, life: 5, size: 0.35, color: 0xffee80, opacity: 0.95, spread, vel: [0, 0.2, 0], jitter: [0.5, 0.3, 0.5], additive: true, fadeIn: 0.4, night: 'only' });
  }
  function glowFlowers(pts, rand) {
    const g = new THREE.Group();
    const col = [0x7ae8e0, 0xc87af0, 0xf08ac0, 0xffe08a];
    for (let k = 0; k < 4; k++) g.add(K.scatter(new THREE.SphereGeometry(1, 6, 5), glow(col[k], 0.9), pts.filter((_, i) => i % 4 === k).map(([x, z]) => ({ x, y: 0.4, z, s: 0.2 + rand() * 0.15 }))));
    return g;
  }
  return { M, ROBES, mushroom, elderTree, treehouse, mushroomHouse, crystals, fairyRing, flowerArch, trees, fireflies, glowFlowers };
}

export function castle(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  buildCastleSite(T, {
    ground: 0x4f8048, groundR: 160, WH: 6.5, TH: 3,
    wallMat: M.leafD,
    wallTop(len) {
      // 荆棘墙：球状灌木团 + 尖刺
      const g = new THREE.Group();
      const items = [];
      for (let x = -len / 2 + 1.5; x <= len / 2; x += 3) items.push({ x, y: 1.0, z: 0, s: 2.2 + (x % 2) * 0.4 });
      g.add(K.scatter(new THREE.IcosahedronGeometry(1, 0), M.leaf, items));
      const th = [];
      for (let x = -len / 2 + 1; x <= len / 2; x += 1.6) th.push({ x, y: 2.6, z: (x % 3) - 1 });
      g.add(K.scatter(new THREE.ConeGeometry(0.2, 1.4, 4), M.bark, th));
      const fl = [];
      for (let x = -len / 2 + 2; x <= len / 2; x += 3.2) fl.push({ x, y: 1.6, z: 1.7, s: 0.3, color: [0xe86aa8, 0xe8c04a, 0xc87af0][(x * 7 | 0) % 3 + 0 > 2 ? 0 : 1] });
      g.add(K.scatter(new THREE.SphereGeometry(1, 5, 4), P.flat(0xe86aa8, 0.8), fl));
      return g;
    },
    flags: [0xc87af0, 0x6aa84a], flagY: 24, keepFlagY: 60, robes: S.ROBES, helmet: 'hood', weapon: 'spear', shield: false, birdColor: 0xf0e8ff, birdScale: 0.7,
    tabards: [0x8a4ac8, 0x3aa8c8],
    tower() {
      // 角塔：巨型蘑菇
      const g = S.mushroom(11, 2.6, 7, 0, { spots: 14 });
      const lamp = sphere(0.5, M.lamp, 8, 6, false);
      lamp.position.set(0, 12, 0);
      g.add(lamp);
      return g;
    },
    gate() {
      const g = new THREE.Group();
      const ar = S.flowerArch(14, 9);
      g.add(ar);
      for (const s of [-1, 1]) {
        const m = S.mushroom(7, 1.7, 4.4, s > 0 ? 1 : 2, { spots: 9 });
        m.position.set(s * 12, 0, 0);
        g.add(m);
      }
      for (const s of [-1, 1]) {
        const lantern = sphere(0.5, M.lamp, 8, 6, false);
        lantern.position.set(s * 4, 7, 1);
        g.add(lantern);
        T.glow(s * 4, 7, WZ0 + 1, { size: 4, light: s > 0, gain: 0.6, color: 0xffe08a });
      }
      return g;
    },
    keep() {
      // 古树宫殿：巨大的树，树干上嵌着窗，树枝上挂着一圈树屋
      const g = new THREE.Group();
      const tree = S.elderTree(34, 7);
      g.add(tree);
      const door = box(3.2, 5, 0.6, M.wood);
      door.position.set(0, 2.6, 7.2);
      g.add(door);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.4, 6, 12, Math.PI), M.barkL);
      arch.position.set(0, 5, 7.3);
      g.add(arch);
      const wins = [];
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; wins.push({ x: Math.cos(a) * 6.9, y: 8 + (i % 3) * 5, z: Math.sin(a) * 6.9, ry: -a + Math.PI / 2, sx: 0.9, sy: 1.4, sz: 0.2 }); }
      g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.lamp, wins));
      const hs = [[10, 22, 0.4], [-11, 26, 2.2], [8, 30, 4], [-6, 20, 5.2], [4, 34, 1.2]];
      for (const [x, y, ry] of hs) {
        const th = S.treehouse(2.4);
        th.position.set(x, y, ry * 1.2 - 3);
        th.rotation.y = ry;
        g.add(th);
        const br = box(Math.abs(x) + 1, 0.4, 0.4, M.barkL);
        br.position.set(x / 2, y - 0.2, ry * 1.2 - 3);
        g.add(br);
      }
      for (let i = 0; i < 8; i++) { const st = box(10, 0.5, 2, M.barkL); st.position.set(0, 0.25 + i * 0.5, 9 + (8 - i) * 0.1); }
      T.glow(0, 28, 0, { size: 24, light: true, gain: 1, color: 0xc8f0a8 });
      return g;
    },
    court(T2) {
      const g = new THREE.Group();
      const pave = box(70, 0.12, 36, M.pave, false);
      pave.position.y = 0.06;
      g.add(pave);
      const pond = new THREE.Mesh(new THREE.CircleGeometry(10, 28), M.water);
      pond.rotation.x = -Math.PI / 2;
      pond.scale.y = 0.6;
      pond.position.set(0, 0.16, 0);
      g.add(pond);
      for (let i = 0; i < 12; i++) {
        const lp = cyl(0.8, 0.8, 0.06, 10, P.flat(0x3aa84a, 0.8), false);
        lp.position.set((Math.random() - 0.5) * 14, 0.2, (Math.random() - 0.5) * 7);
        g.add(lp);
      }
      g.add(S.crystals(Array.from({ length: 12 }, (_, i) => [Math.cos(i * 0.6) * 12, Math.sin(i * 0.6) * 7]), rand));
      g.add(S.fairyRing(7, 12, rand));
      g.children[g.children.length - 1].position.set(-22, 0, 8);
      g.add(S.glowFlowers(Array.from({ length: 70 }, () => [-34 + rand() * 68, -16 + rand() * 32]), rand));
      for (let i = 0; i < 6; i++) {
        const m = S.mushroom(2 + (i % 3), 0.5, 1.6 + (i % 2), i, { spots: 5 });
        m.position.set(-30 + i * 12, 0, -14);
        g.add(m);
      }
      S.fireflies(T2, 0, 3, 22.5, [30, 3, 14], 40);
      return g;
    },
    annex(T2) {
      // 蜂巢塔：蜂巢形的蜜蜡塔
      const g = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const r = 3.4 - Math.abs(i - 3) * 0.35;
        const c = cyl(r, r, 1.6, 8, P.flat(0xe8b830, 0.7));
        c.position.y = 0.8 + i * 1.5;
        c.rotation.y = i * 0.2;
        g.add(c);
      }
      const hole = box(1, 1.6, 0.4, M.dark, false);
      hole.position.set(0, 2, 3.2);
      g.add(hole);
      return g;
    },
    barracks(T2, x, z) { S.mushroomHouse(T2, rand, x, z, 0); },
    text: {
      walls: { name: '荆棘墙 · The Briar Wall', shortName: '角塔', tag: '开花的墙，带刺的花',
        desc: '一圈由灌木团和长刺藤蔓织成的墙，墙头开满粉色的小花；四角各立着一朵巨型的红蘑菇。', detail: '荆棘墙是“种”出来的：每年春天由园丁引导藤蔓长一圈，越长越密。想进来的人先要被扎一次，才知道自己是不是受欢迎。' },
      gate: { name: '花门 · The Blossom Gate', shortName: '正门', tag: '一道开花的拱，两朵红蘑菇',
        desc: '一座缠满彩花的木藤拱门，门两侧各立一朵十米高的蘑菇，拱下挂着两盏暖黄色的灯。', detail: '门没有锁，只有一个规矩：进门要先对灯笼说你好。灯笼要是亮了，就说明它听见了。' },
      keep: { name: '古树宫 · The Elder Tree', shortName: '王宫', tag: '一棵树就是一座宫殿',
        desc: '三十多米高的巨树，粗大的树根盘在地面，树干上嵌着一圈暖黄色的窗，树枝上挂着五座圆形的树屋，冠上有一团柔和的绿光。', detail: '这棵树据说是王国最早的居民。它的年轮里藏着历代国王的名字，每过一百年树就长出一道新门。' },
      court: { name: '萤火池 · The Glowpond', shortName: '萤火池', tag: '夜里有一池星星',
        desc: '殿前庭院里一汪发光的池水，睡莲浮着，周围是水晶丛、蘑菇和一圈蘑菇仙环，夜里飞满萤火虫。', detail: '仙环里不许踩进去：传说里面是通往另一个世界的小门，一旦踩进去，一夜就是一百年。' },
      annex: { name: '蜂巢塔 · The Hive Tower', shortName: '蜂巢塔', tag: '蜜是王国的货币',
        desc: '七层蜜蜡般的圆形层层叠起，正面一个小黑门，里面是蜂群。', detail: '蜂巢塔归王室所有，每年秋天开一次割蜜节，所有居民排队领一小罐。' },
      overview: { name: '苔光王城 · Mosslight', tag: '蘑菇与古树', desc: '苔光王国的王城：荆棘墙、花门、一棵古树改成的宫殿、萤火池与蜂巢塔。', detail: '苔光王国没有地图，因为它每天都在长，每天都不一样。' },
    },
    extra(T2) {
      S.fireflies(T2, 0, 4, 0, [60, 6, 50], 60);
      T2.add(S.trees(K.ringPoints(rand, 0, 0, 62, 118, 34, (x, z) => Math.abs(x) < 62 && Math.abs(z) < 56), rand), 0, 0);
      T2.add(S.glowFlowers(K.ringPoints(rand, 0, 0, 64, 130, 80), rand), 0, 0);
    },
    beacon() {
      const g = new THREE.Group();
      const t = S.elderTree(34, 7);
      t.position.z = -14;
      g.add(t);
      return g;
    },
  });
}
const WZ0 = 48;

export function town(T, tweak) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  const cfg = {
    ground: 0x4f8048, paving: M.pave, robes: S.ROBES, flags: [0xc87af0, 0x6aa84a], houseN: 50, birdColor: 0xf0e8ff, birdScale: 0.7, glow: 0xc8f0a8,
    centerpiece() {
      // 水晶泉：中央一丛发光水晶 + 环形水池
      const g = new THREE.Group();
      const rim = cyl(5, 5.4, 0.8, 14, P.flat(0x7a8a7a, 1));
      rim.position.y = 0.4;
      g.add(rim);
      const wat = cyl(4.4, 4.4, 0.1, 14, M.water, false);
      wat.position.y = 0.8;
      g.add(wat);
      g.add(S.crystals(Array.from({ length: 9 }, (_, i) => [Math.cos(i) * (i ? 1.8 : 0), Math.sin(i) * (i ? 1.8 : 0)]), rand));
      g.children[g.children.length - 1].position.y = 0.6;
      g.children[g.children.length - 1].scale.setScalar(2.2);
      return g;
    },
    centerFx(T2) {
      T2.glow(0, 3, 0, { size: 9, light: true, gain: 1, color: 0x9affe8 });
      S.fireflies(T2, 0, 3, 0, [30, 3, 24], 36);
    },
    stall(T2, r, i) {
      // 蘑菇伞摊位
      const g = new THREE.Group();
      const counter = box(2.9, 0.9, 0.8, M.wood);
      counter.position.set(0, 0.45, 0.6);
      g.add(counter);
      const m = S.mushroom(1.8, 0.28, 2.6, i, { spots: 6, gills: false });
      m.position.set(0, 0.9, -0.2);
      g.add(m);
      const goods = [];
      for (let k = 0; k < 5; k++) goods.push({ x: -1 + k * 0.5, y: 1.1, z: 0.6, s: 0.22 });
      g.add(K.scatter(new THREE.SphereGeometry(1, 6, 5), P.flat([0xe86aa8, 0x7ae8e0, 0xe8c04a, 0xc87af0, 0x6aa84a][i % 5], 0.7), goods));
      return g;
    },
    hall() {
      // 蘑菇厅：三层叠起的大蘑菇盖
      const g = new THREE.Group();
      const st = cyl(5, 6.4, 12, 12, M.stem);
      st.position.y = 6;
      g.add(st);
      [[11, 12, 0], [8, 18, 1], [5, 23, 2]].forEach(([r, y, c]) => {
        const cap = K.dome(r, M.caps[c], { squash: 0.5 });
        cap.position.y = y;
        g.add(cap);
      });
      const dr = box(2.4, 4, 0.3, M.wood, false);
      dr.position.set(0, 2, 6.2);
      g.add(dr);
      const items = [];
      for (let i = 0; i < 20; i++) { const a = Math.random() * 6.28; items.push({ x: Math.cos(a) * 9, y: 13.5 + Math.random() * 1.5, z: Math.sin(a) * 9, s: 0.5 }); }
      g.add(K.scatter(new THREE.SphereGeometry(1, 6, 4), M.spot, items));
      return g;
    },
    inn() {
      // 空心树桩客栈
      const g = new THREE.Group();
      const trunk = cyl(11, 12.4, 10, 14, M.bark);
      trunk.position.y = 5;
      g.add(trunk);
      const top = cone(12, 6, 14, M.leaf);
      top.position.y = 13;
      g.add(top);
      const dr = box(3, 4.4, 0.4, M.wood);
      dr.position.set(0, 2.2, 12);
      g.add(dr);
      const wn = [];
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.2; wn.push({ x: Math.cos(a) * 11.6, y: 5 + (i % 2) * 2.4, z: Math.sin(a) * 11.6, ry: -a + Math.PI / 2, sx: 1.1, sy: 1.2, sz: 0.2 }); }
      g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.lamp, wn));
      T.glow(44, 8, -4 + 12, { size: 8, light: true, gain: 0.8, color: 0xffd890 });
      return g;
    },
    craft() {
      // 药剂坊：大釜 + 冒彩烟 + 吊着的草药
      const g = new THREE.Group();
      const h = S.mushroomHouse(T, rand, 0, 0, 0);
      g.remove(h);
      const b = cyl(4, 4.4, 4, 10, P.wash(0xd8c8a0));
      b.position.set(0, 2, -3);
      g.add(b);
      const cap = K.dome(6, M.caps[1], { squash: 0.6 });
      cap.position.set(0, 4, -3);
      g.add(cap);
      const cauldron = sphere(1.6, P.flat(0x2a2a2e, 0.5, { metalness: 0.5 }), 10, 8);
      cauldron.position.set(0, 1.4, 6);
      g.add(cauldron);
      const br = cyl(1.4, 1.4, 0.2, 12, P.flat(0x9a4ae8, 0.2, { emissive: 0x9a4ae8, emissiveIntensity: 0.8 }), false);
      br.position.set(0, 2.5, 6);
      g.add(br);
      T.emitter({ x: -48, y: 3, z: -6 - 6, count: 18, life: 2.6, size: 1.1, color: 0xc87af0, opacity: 0.45, spread: [0.4, 0.1, 0.4], vel: [0, 1.4, 0], jitter: [0.2, 0.3, 0.2], fadeIn: 0.15, grow: 1.4, additive: true });
      const hb = [];
      for (let i = 0; i < 8; i++) hb.push({ x: -6 + i * 1.7, y: 3.4, z: 3.6, sx: 0.3, sy: 1.2, sz: 0.3 });
      g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.leaf, hb));
      return g;
    },
    house(T2, r, x, z, ry) { return S.mushroomHouse(T2, r, x, z, ry); },
    trees(T2, pts) {
      T2.add(S.trees(pts.slice(0, 26), rand), 0, 0);
      T2.add(S.glowFlowers(K.ringPoints(rand, 0, 0, 40, 130, 90), rand), 0, 0);
    },
    animal() { return K.makeSheepLite(P, { tone: [0xe8d8f0, 0xc8e8d0, 0xf0d8c8][(rand() * 3) | 0], scale: 0.8 }); },
    animalN: 10,
    extra(T2) {
      S.fireflies(T2, 0, 3, 0, [60, 5, 50], 60);
    },
    text: {
      plaza: { name: '水晶泉广场 · Crystal Spring Square', shortName: '广场', tag: '泉水会唱歌',
        desc: '苔石铺的广场正中一圈浅水池，池里长着一丛发着蓝紫粉光的水晶；四周二十四个撑着蘑菇伞的摊位。', detail: '水晶是泉水凝出来的：每过一年长高一指。传说水晶长到十米高那天，王国会迎来一次大变化。' },
      hall: { name: '蘑菇议事厅 · The Mushroom Hall', shortName: '议事厅', tag: '三层伞盖，三种意见',
        desc: '一朵三层伞盖叠起的巨型蘑菇，粗壮的茎里是大厅，正面一道小木门。', detail: '议事厅里没有椅子，大家坐在软软的蘑菇坐垫上。因为太舒服，所以辩论总要拖到半夜才散。' },
      inn: { name: '树桩客栈 · The Hollow Stump Inn', shortName: '客栈', tag: '夜里每一扇窗都亮着',
        desc: '一截被掏空的巨大树桩，上面盖着一顶叶片屋顶，窗里透出暖黄色的光。', detail: '客栈的床是用蕨叶和苔藓铺的，据说睡一觉醒来，所有烦恼都会长出小蘑菇。' },
      craft: { name: '药剂坊 · The Potion House', shortName: '药剂坊', tag: '紫色的烟，是好兆头',
        desc: '一座蘑菇形的小屋，屋前一口冒紫烟的大釜，屋檐下挂着一串串草药。', detail: '药剂师靠颜色看病：紫烟是安神的，绿烟是退烧的，金烟是给刚吵了架的人喝的。' },
      overview: { name: '苔光镇 · Mosslight Town', tag: '蘑菇屋、萤火与水晶', desc: '苔光王国的王镇：水晶泉广场、蘑菇议事厅、树桩客栈、药剂坊，五十多栋蘑菇屋。', detail: '镇上的每栋蘑菇屋都是长出来的，所以每一栋都有自己的脾气。' },
    },
    beacon() {
      const g = new THREE.Group();
      [[11, 12, 0], [8, 18, 1], [5, 23, 2]].forEach(([r, y, c], i) => {
        const cap = K.dome(r * 1.6, M.caps[c], { squash: 0.5 });
        cap.position.set(0, y * 1.6, -34);
        g.add(cap);
      });
      const st = cyl(8, 10, 20, 12, M.stem);
      st.position.set(0, 10, -34);
      g.add(st);
      return g;
    },
  };
  if (tweak) tweak(cfg, T);
  buildTownSite(T, cfg);
}
