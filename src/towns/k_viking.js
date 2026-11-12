import * as THREE from 'three';
import { buildCastleSite, buildTownSite } from './kingdom_common.js';

/* ============================================================
 *  霜牙王国 Frostfang —— 北海的船民
 *  深色原木、草皮屋顶、龙头山墙、尖木栅、长船、圆盾与符文石；雪地与白霜松树。
 * ========================================================== */

function kit(T) {
  const { K, P } = T;
  const { box, cyl, cone, sphere } = K;
  const M = {
    log: P.flat(0x4a3626, 0.95),
    logL: P.flat(0x6a4a30, 0.95),
    plank: P.tint('woodDark', 0x7a5a3a),
    turf: P.flat(0x5f7a42, 1, { flatShading: true }),
    snowRoof: P.flat(0xe8eef2, 0.9),
    stone: P.tint('stone', 0x8a8e92),
    iron: P.iron,
    dark: P.dark,
    red: P.flat(0xa8282a, 0.85),
    cream: P.flat(0xe6dcc0, 0.9),
    blue: P.flat(0x2f4a6a, 0.85),
    gold: P.flat(0xc9a03a, 0.4, { metalness: 0.6 }),
    fur: P.flat(0xb8b0a0, 1),
    pave: P.flat(0xb8c0c4, 0.95, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    ice: P.flat(0x9ac8dc, 0.15, { metalness: 0.3 }),
  };
  const CLOAK = [0xa8282a, 0x2f4a6a, 0x6a6a68, 0x8a6a3a, 0xd8d0c0, 0x3a5a3a];

  /** 龙头山墙装饰：屋脊两端交叉的两根弯角 */
  function dragonEnds(len, y, mat = M.logL) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      for (const k of [-1, 1]) {
        const h = box(0.22, 2.2, 0.22, mat, false);
        h.position.set(0, y + 0.8, s * (len / 2 + 0.3));
        h.rotation.x = s * k * 0.55;
        g.add(h);
      }
      const knob = sphere(0.28, mat, 6, 5, false);
      knob.position.set(0, y + 1.9, s * (len / 2 + 0.9));
      g.add(knob);
    }
    return g;
  }
  /** 长屋：原木墙 + 草皮 / 雪顶，屋脊沿 Z */
  function longhouse(w, d, { floors = 1, roofMat = M.turf, h = 2.8, dragon = true } = {}) {
    const g = new THREE.Group();
    const body = box(w, h * floors, d, M.log);
    body.position.y = (h * floors) / 2;
    g.add(body);
    const logs = [];
    for (let i = 0; i < Math.round(h * floors / 0.5); i++) logs.push({ x: 0, y: 0.25 + i * 0.5, z: 0, sx: w + 0.16, sy: 0.12, sz: d + 0.16 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.logL, logs));
    const ro = K.gableRoof(w, d, w * 0.5, roofMat, M.log, { over: 0.7 });
    ro.position.y = h * floors;
    g.add(ro);
    const door = box(1.1, 2.0, 0.2, M.plank);
    door.position.set(0, 1.0, d / 2 + 0.05);
    g.add(door);
    const wins = [];
    for (let i = 0; i < 3; i++) wins.push({ x: (i - 1) * (w / 3.4), y: h * 0.62, z: d / 2 + 0.03, sx: 0.5, sy: 0.4, sz: 0.1 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.window, wins));
    const sh = [];
    for (let i = 0; i < 5; i++) sh.push({ x: -w / 2 + 0.8 + i * ((w - 1.6) / 4), y: h * 0.45, z: d / 2 + 0.12 });
    g.add(K.scatter(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 10).rotateX(Math.PI / 2), M.red, sh));
    if (dragon) { const dr = dragonEnds(d, h * floors + w * 0.5, M.logL); g.add(dr); }
    return g;
  }
  /** 长船：船体剖面挤出 + 桅 + 红白条纹帆 + 舷侧圆盾 */
  function longship(L = 16, rigged = true) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-L / 2, 1.9);
    s.quadraticCurveTo(-L / 2 + 1.4, 0.2, -L * 0.25, 0);
    s.lineTo(L * 0.25, 0);
    s.quadraticCurveTo(L / 2 - 1.4, 0.2, L / 2, 1.9);
    s.lineTo(L / 2 - 0.5, 1.4);
    s.quadraticCurveTo(0, 0.8, -L / 2 + 0.5, 1.4);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: false });
    geo.translate(0, 0, -1.3);
    const hull = new THREE.Mesh(geo, M.plank);
    hull.rotation.y = Math.PI / 2;
    hull.castShadow = true;
    g.add(hull);
    // 龙首尾柱
    for (const e of [-1, 1]) {
      const post = box(0.25, 2.4, 0.25, M.logL, false);
      post.position.set(0, 2.9, e * (L / 2 - 0.2));
      post.rotation.x = e * 0.25;
      g.add(post);
      const hd = sphere(0.4, M.logL, 6, 5, false);
      hd.position.set(0, 4.1, e * (L / 2 + 0.1));
      g.add(hd);
    }
    const shields = [];
    for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) shields.push({ x: sx * 1.34, y: 1.2, z: -L * 0.38 + i * (L * 0.76 / 8), ry: Math.PI / 2, color: [0xa8282a, 0xe6dcc0, 0x2f4a6a][i % 3] });
    g.add(K.scatter(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 10).rotateZ(Math.PI / 2), P.flat(0xffffff, 0.85), shields));
    if (rigged) {
      const mast = cyl(0.12, 0.16, 9, 6, M.logL);
      mast.position.y = 4.8;
      g.add(mast);
      const yard = cyl(0.08, 0.08, 6.4, 6, M.logL, false);
      yard.rotation.z = Math.PI / 2;
      yard.position.y = 8.6;
      g.add(yard);
      for (let i = 0; i < 6; i++) {
        const st = box(1.05, 5.4, 0.05, i % 2 ? M.cream : M.red, false);
        st.position.set(-2.6 + i * 1.04, 5.7, 0);
        g.add(st);
      }
    }
    return g;
  }
  /** 木栅尖桩（沿 X 方向 len 米） */
  function palisadeTop(len) {
    const items = [];
    for (let x = -len / 2 + 0.5; x <= len / 2; x += 0.9) items.push({ x, y: 1.2, z: 1.0 }, { x: x + 0.45, y: 1.2, z: -1.0 });
    return K.scatter(new THREE.ConeGeometry(0.4, 2.4, 5), M.logL, items);
  }
  /** 符文石 */
  function runestones(pts, rand) {
    const g = new THREE.Group();
    g.add(K.scatter(new THREE.BoxGeometry(0.9, 3, 0.5), P.flat(0x7a7e80, 1, { flatShading: true }), pts.map(([x, z]) => ({ x, y: 1.5, z, ry: rand() * 3, s: 0.8 + rand() * 0.5, rz: (rand() - 0.5) * 0.15 }))));
    g.add(K.scatter(new THREE.BoxGeometry(0.5, 0.05, 0.12), P.flat(0xc9a03a, 0.5), pts.map(([x, z]) => ({ x, y: 2.0, z: z + 0.27, s: 1 }))));
    return g;
  }
  /** 霜松：带雪的松 */
  function frostPine(pts, rand) {
    return K.grove(P, 'pine', pts, { leaf: 0x4a6a5c, trunk: 0x3a2a20, scale: [0.8, 1.4], rand });
  }
  /** 火盆 / 篝火 */
  function firepit(r = 1.6) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.3, 6, 12), M.stone);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    g.add(ring);
    for (let i = 0; i < 6; i++) {
      const lg = cyl(0.12, 0.14, 1.5, 5, M.logL, false);
      lg.position.set(Math.cos(i) * 0.5, 0.45, Math.sin(i) * 0.5);
      lg.rotation.set(Math.sin(i) * 0.8, 0, Math.cos(i) * 0.8);
      g.add(lg);
    }
    return g;
  }
  return { M, CLOAK, dragonEnds, longhouse, longship, palisadeTop, runestones, frostPine, firepit };
}

export function castle(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  buildCastleSite(T, {
    ground: 0xc4ced2, groundR: 150, WH: 8.5, TH: 2.4,
    wallMat: M.log, wallTop: (len) => S.palisadeTop(len),
    flags: [0xa8282a, 0xe6dcc0], flagY: 26, keepFlagY: 40, robes: S.CLOAK, helmet: 'great', weapon: 'spear', shield: true, birdColor: 0x2a2a2e, birdScale: 1.1,
    tabards: [0xa8282a, 0x2f4a6a],
    tower() {
      const g = new THREE.Group();
      const b = box(7, 14, 7, M.log);
      b.position.y = 7;
      g.add(b);
      const pl = box(9, 0.8, 9, M.logL);
      pl.position.y = 14;
      g.add(pl);
      const r = cone(6.4, 7, 4, M.turf);
      r.position.y = 18.4;
      r.rotation.y = Math.PI / 4;
      g.add(r);
      const br = new THREE.Group();
      br.add(S.firepit(0.8));
      br.position.set(0, 14.4, 0);
      g.add(br);
      return g;
    },
    gate() {
      const g = new THREE.Group();
      for (const s of [-1, 1]) {
        const pylon = box(5, 14, 5, M.log);
        pylon.position.set(s * 9, 7, 0);
        g.add(pylon);
        const roof = cone(4.8, 5, 4, M.turf);
        roof.position.set(s * 9, 16.4, 0);
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
        const post = cyl(0.35, 0.4, 12, 6, M.logL);
        post.position.set(s * 13, 6, 5);
        g.add(post);
        const skull = sphere(0.7, P.flat(0xe6dcc0, 0.9), 8, 6);
        skull.position.set(s * 13, 12.4, 5);
        g.add(skull);
      }
      const lintel = box(26, 2.4, 3.4, M.logL);
      lintel.position.y = 12;
      g.add(lintel);
      for (const s of [-1, 1]) { const d = S.dragonEnds(3, 13, M.logL); d.position.set(s * 12, 0, 0); g.add(d); }
      for (const s of [-1, 1]) {
        const leaf = box(4, 9, 0.5, M.plank);
        leaf.position.set(s * 2.4, 4.5, 0.2);
        leaf.rotation.y = s * 1.0;
        g.add(leaf);
      }
      return g;
    },
    keep() {
      const g = new THREE.Group();
      // 长厅：四十米长，屋脊南北，山墙朝正门
      const hall = S.longhouse(14, 40, { floors: 2, h: 3.4, roofMat: M.turf });
      hall.position.set(0, 0, 0);
      g.add(hall);
      for (const sx of [-1, 1]) {
        const w = S.longhouse(8, 22, { floors: 1, h: 3, roofMat: M.snowRoof });
        w.position.set(sx * 17, 0, 4);
        g.add(w);
      }
      // 厅前一段阶台
      const plat = box(30, 0.6, 8, M.logL);
      plat.position.set(0, 0.3, 24);
      g.add(plat);
      // 屋脊烟孔
      const sm = box(1.4, 1.6, 1.4, M.stone);
      sm.position.set(0, 14.6, -4);
      g.add(sm);
      T.smokeFrom(g, new THREE.Vector3(0, 15.6, -4));
      return g;
    },
    court(T2) {
      const g = new THREE.Group();
      const mud = box(70, 0.1, 36, P.flat(0xa8a090, 1, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), false);
      mud.position.y = 0.05;
      g.add(mud);
      const fp = S.firepit(2.2);
      g.add(fp);
      for (const sz of [-1, 1]) {
        const tb = box(18, 0.3, 1.6, M.logL);
        tb.position.set(0, 1.0, sz * 4.5);
        g.add(tb);
        for (let i = 0; i < 6; i++) { const bn = box(2.4, 0.3, 0.6, M.plank); bn.position.set(-6.5 + i * 2.6, 0.55, sz * 6.1); g.add(bn); }
      }
      g.add(S.runestones(Array.from({ length: 9 }, (_, i) => [Math.cos(i * 0.7) * 22, Math.sin(i * 0.7) * 11]), rand));
      for (let i = 0; i < 6; i++) {
        const rk = box(2.4, 1.6, 0.3, M.logL);
        rk.position.set(-30 + i * 3.2, 1.2, -16);
        g.add(rk);
      }
      T2.glow(0, 1.2, 22.5, { size: 7, light: true, gain: 1.3 });
      T2.emitter({ x: 0, y: 1.6, z: 22.5, count: 26, life: 1.3, size: 0.3, color: 0xffa040, opacity: 0.9, spread: [0.5, 0.1, 0.5], vel: [0, 2, 0], jitter: [0.4, 0.5, 0.4], gravity: -0.4, additive: true, fadeIn: 0.05 });
      return g;
    },
    annex(T2) {
      const g = new THREE.Group();
      const sh = S.longship(18, true);
      sh.position.set(0, 1.2, 0);
      g.add(sh);
      const cr = box(6, 1.2, 12, M.logL);
      cr.position.set(0, 0.6, 0);
      g.add(cr);
      return g;
    },
    barracks(T2, x, z) { T2.add(S.longhouse(10, 6, { floors: 1, h: 2.6, roofMat: M.turf, dragon: false }), x, z, Math.PI / 2); },
    text: {
      walls: { name: '霜牙木栅 · The Frostfang Palisade', shortName: '角塔', tag: '一圈削尖的松木',
        desc: '深色原木立成的栅墙，顶上是一排削尖的木桩；四角是草皮尖顶的哨塔，塔顶点着火盆。', detail: '原木是整棵北方松，树干埋进冻土里两米，铁不如它耐冻。哨塔上的火盆整夜不熄，因为熄了就等于告诉海上的人这里睡了。' },
      gate: { name: '龙首门 · The Dragon Gate', shortName: '正门', tag: '门边的柱子上插着颅骨',
        desc: '两座草皮尖顶的门柱夹着一道粗木横梁，横梁两端的龙首向外怒视；门边的立柱顶着兽颅。', detail: '龙首不是装饰，是警告：这里的人信奉先开口的先输。颅骨是敌人的还是熊的，每个来客都有自己的答案。' },
      keep: { name: '长厅 · The Great Longhall', shortName: '王宫', tag: '四十米长，一条火塘通到底',
        desc: '二层的巨型长屋，草皮屋顶，屋脊上交叉的龙角；两侧各一栋雪顶侧厅，厅前有一座木平台。', detail: '长厅里没有隔间：王、战士、客人、狗睡在同一屋，火塘在正中，所以每个人都离国王近，也离火近。' },
      court: { name: '集会庭 · The Moot Yard', shortName: '集会庭', tag: '长桌、火坑与符文石',
        desc: '庭院中央一个大火坑，两侧各一张十八米长桌，周围立着九块符文石，墙边挂满盾牌。', detail: '符文石上刻的是已故首领的名字和他们的功绩，活着的人在宴席上轮流把酒洒在石脚下。' },
      annex: { name: '长船棚 · The Ship-Shed', shortName: '船棚', tag: '船是活着的屋',
        desc: '宫内一艘搁在木架上的长船，舷侧挂着一排圆盾，红白条纹的帆还没落下。', detail: '长船一年只下水两次：春天出海，秋天回来，剩下的时间在棚里补缝、刷焦油、听老人讲故事。' },
      overview: { name: '霜牙王城 · Frostfang', tag: '木栅、长厅与龙首门', desc: '霜牙王国的王城：深色木栅墙、草皮尖顶哨塔、龙首门和四十米的长厅。', detail: '霜牙王国在世界最北端，冬天比夏天长，所以他们的故事也都是关于怎么熬过冬天的。' },
    },
    beacon() {
      const g = new THREE.Group();
      const h = S.longhouse(14, 40, { floors: 2, h: 3.4 });
      h.position.set(0, 0, -14);
      g.add(h);
      for (const sx of [-1, 1]) {
        const t = box(7, 14, 7, M.log); t.position.set(sx * 30, 7, -30); g.add(t);
        const r = cone(6.4, 7, 4, M.turf); r.position.set(sx * 30, 18, -30); r.rotation.y = Math.PI / 4; g.add(r);
      }
      return g;
    },
    extra(T2) {
      // 港口方向的两艘长船停在冰上
      for (const [x, z, ry] of [[-78, 30, 0.4], [78, 36, -0.3]]) {
        const sh = S.longship(16, rand() < 0.5);
        T2.add(sh, x, z, ry, 1.2);
      }
      T2.add(S.frostPine(K.ringPoints(rand, 0, 0, 70, 105, 36), rand), 0, 0);
    },
  });
}

export function town(T, tweak) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  const cfg = {
    ground: 0xc4ced2, paving: M.pave, robes: S.CLOAK, flags: [0xa8282a, 0xe6dcc0], houseN: 48, birdColor: 0x2a2a2e, glow: 0xffa040,
    centerpiece() {
      const g = new THREE.Group();
      g.add(S.firepit(3.2));
      // 图腾柱
      const tp = cyl(0.55, 0.7, 11, 8, M.logL);
      tp.position.set(0, 5.5, -6);
      g.add(tp);
      for (let i = 0; i < 4; i++) {
        const face = box(1.5, 1.2, 1.5, [M.red, M.cream, M.blue, M.gold][i], false);
        face.position.set(0, 2 + i * 2.4, -6);
        g.add(face);
        const eye = sphere(0.2, M.dark, 6, 5, false);
        eye.position.set(0.4, 2.2 + i * 2.4, -5.2);
        g.add(eye);
      }
      const wing = box(6, 0.4, 0.4, M.logL);
      wing.position.set(0, 10.4, -6);
      g.add(wing);
      return g;
    },
    centerFx(T2) {
      T2.glow(0, 1.5, 0, { size: 8, light: true, gain: 1.3 });
      T2.emitter({ x: 0, y: 1.5, z: 0, count: 28, life: 1.4, size: 0.32, color: 0xffa040, opacity: 0.9, spread: [0.6, 0.1, 0.6], vel: [0, 2.2, 0], jitter: [0.4, 0.5, 0.4], gravity: -0.4, additive: true, fadeIn: 0.05 });
    },
    stall(T2, r, i) {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const p = cyl(0.07, 0.08, 2.4, 5, M.logL);
        p.position.set(sx * 1.4, 1.2, sz * 0.9);
        g.add(p);
      }
      const roof = box(3.4, 0.14, 2.4, i % 2 ? M.fur : M.snowRoof, false);
      roof.position.y = 2.5;
      roof.rotation.x = 0.14;
      g.add(roof);
      const counter = box(2.9, 0.9, 0.8, M.log);
      counter.position.set(0, 0.45, 0.45);
      g.add(counter);
      const goods = [];
      for (let k = 0; k < 6; k++) goods.push({ x: -1.1 + k * 0.45, y: 1.05, z: 0.45, s: 0.22, sx: 0.4, sz: 0.2 });
      g.add(K.scatter(new THREE.SphereGeometry(1, 6, 5), P.flat([0x8a9aa6, 0xc8b898, 0x6a5a48, 0xd8d0c0][i % 4], 0.9), goods));
      return g;
    },
    hall() {
      // 木板教堂：多层叠起的尖屋顶 + 龙头
      const g = new THREE.Group();
      const sizes = [[16, 16, 5], [12, 12, 5], [8, 8, 5]];
      let y = 0;
      sizes.forEach(([w, d, h], i) => {
        const b = box(w, h, d, M.log);
        b.position.y = y + h / 2;
        g.add(b);
        const r = cone(Math.hypot(w, d) * 0.62, h * 1.0, 4, M.plank);
        r.position.y = y + h + h * 0.5;
        r.rotation.y = Math.PI / 4;
        g.add(r);
        y += h * 1.1;
      });
      const sp = cyl(0.12, 0.2, 5, 5, M.logL);
      sp.position.y = y + 2;
      g.add(sp);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const hd = box(0.3, 2.4, 0.3, M.logL, false);
        hd.position.set(dx * 8.4, 5.4, dz * 8.4);
        hd.rotation.z = -dx * 0.5;
        hd.rotation.x = dz * 0.5;
        g.add(hd);
      }
      return g;
    },
    inn() {
      const g = new THREE.Group();
      const h = S.longhouse(14, 34, { floors: 1, h: 3.4, roofMat: M.turf });
      g.add(h);
      const ship = S.longship(14, false);
      ship.position.set(-16, 1.0, 0);
      ship.rotation.y = Math.PI / 2;
      g.add(ship);
      g.add(S.firepit(1.0));
      g.children[g.children.length - 1].position.set(0, 0, 22);
      return g;
    },
    craft() {
      // 铁匠铺 + 船坞架
      const g = new THREE.Group();
      const sm = S.longhouse(10, 12, { floors: 1, h: 3, roofMat: M.snowRoof, dragon: false });
      g.add(sm);
      const fo = box(2.4, 2.2, 2.2, M.stone);
      fo.position.set(0, 1.1, -3);
      g.add(fo);
      const ch = box(1.2, 5, 1.2, M.stone);
      ch.position.set(0, 4.5, -3);
      g.add(ch);
      T.smokeFrom(g, new THREE.Vector3(0, 7.2, -3));
      const an = box(0.9, 0.8, 1.6, M.iron);
      an.position.set(0, 0.5, 9);
      g.add(an);
      // 龙骨架
      for (let i = 0; i < 6; i++) {
        const rib = box(0.18, 3, 0.18, M.logL, false);
        rib.position.set(-9 + (i % 2) * 0.1, 1.6, -4 + i * 2);
        rib.rotation.x = 0.4;
        g.add(rib);
        const rib2 = box(0.18, 3, 0.18, M.logL, false);
        rib2.position.set(-12, 1.6, -4 + i * 2);
        rib2.rotation.x = -0.4;
        g.add(rib2);
      }
      return g;
    },
    house(T2, r, x, z, ry) {
      const h = S.longhouse(5 + r() * 2.4, 8 + r() * 5, { floors: 1, h: 2.5, roofMat: r() < 0.7 ? M.turf : M.snowRoof, dragon: r() < 0.3 });
      T2.add(h, x, z, ry);
      return h;
    },
    trees(T2, pts) { T2.add(S.frostPine(pts, rand), 0, 0); },
    animal() { return K.makeSheepLite(P, { tone: [0x5a4a3a, 0x8a7a68, 0xc8c0b0, 0x3a3028][(rand() * 4) | 0], scale: 0.85 }); },
    animalN: 14,
    plazaProps(T2, g) {
      g.add(S.runestones(Array.from({ length: 6 }, (_, i) => [-18 + i * 7, 15]), rand));
    },
    extra(T2, homes) {
      // 晾鱼架
      for (let i = 0; i < 6; i++) {
        const x = -80 + i * 6, z = 70;
        const fr = box(4, 0.15, 0.2, M.logL, false);
        fr.position.set(x, 2.4, z);
        T2.root.add(fr);
        for (const s of [-1, 1]) { const p = cyl(0.1, 0.1, 2.4, 5, M.logL, false); p.position.set(x + s * 2, 1.2, z); T2.root.add(p); }
        for (let k = 0; k < 8; k++) { const f = box(0.14, 0.7, 0.05, P.flat(0xc0b8a8, 1), false); f.position.set(x - 1.6 + k * 0.45, 1.95, z); T2.root.add(f); }
      }
    },
    text: {
      plaza: { name: '篝火广场 · The Bonfire Square', shortName: '篝火广场', tag: '一堆火，从秋烧到春',
        desc: '石铺广场中央是一座大篝火，火边立着一根雕刻着四张脸的图腾柱；四周二十四个挂皮毛的摊位卖鱼干、毛皮、蜂蜜酒和琥珀。', detail: '篝火的柴是各家轮流送的，谁家送得多，谁在宴会上坐得靠火。图腾柱上的四张脸分别是海、风、冰、火。' },
      hall: { name: '板教堂 · The Stave Church', shortName: '板教堂', tag: '一根钉子都没用的木塔',
        desc: '三层叠起的尖顶木教堂，四角龙头向外伸着；外墙全是深色木板。', detail: '木板教堂用榫卯拼成，不用一根钉子；屋顶的龙头既是装饰，也是排水的槽口，是王国最古老的建筑。' },
      inn: { name: '蜜酒厅 · The Mead Hall', shortName: '客栈', tag: '门前停着一艘船',
        desc: '十四米宽的草皮屋长厅，门外的雪地上搁着一艘小船，门口生着火。', detail: '蜜酒厅的规矩是：进门先放武器，出门前别提旧账，酒碗一旦举起，谁先放下谁请客。' },
      craft: { name: '铁匠与船坞 · Forge & Slip', shortName: '铁匠铺', tag: '铁砧边，是下一艘船的肋骨',
        desc: '一座砌石炉的铁匠铺，旁边的架子上是一条造到一半的龙骨。', detail: '船的每一颗铆钉都是铁匠打的，每一块板都是造船人劈的；一艘船要花五个冬天。' },
      overview: { name: '霜牙镇 · Frostfang Town', tag: '草皮屋顶的长屋', desc: '霜牙王国的王镇：篝火广场、板教堂、蜜酒厅，四十多栋草皮屋顶的长屋，晾着鱼干。', detail: '镇上每家都有一艘船的份子，所以每个人都认识海。' },
    },
    beacon() {
      const g = new THREE.Group();
      const b = cone(10, 24, 4, M.plank);
      b.position.set(0, 12, -34);
      b.rotation.y = Math.PI / 4;
      g.add(b);
      const sp = cyl(0.2, 0.3, 8, 5, M.logL);
      sp.position.set(0, 26, -34);
      g.add(sp);
      return g;
    },
  };
  if (tweak) tweak(cfg, T);
  buildTownSite(T, cfg);
}
