import * as THREE from 'three';
import { buildCastleSite, buildTownSite } from './kingdom_common.js';

/* ============================================================
 *  铆钉王国 Rivetgate —— 蒸汽与齿轮
 *  红砖、铸铁、铜绿穹顶、烟囱与管道、转动的大齿轮，天上飘着飞艇。
 * ========================================================== */

function kit(T) {
  const { K, P } = T;
  const { box, cyl, cone, sphere } = K;
  const M = {
    brick: P.tint('stone', 0x9a5a44),
    brickD: P.tint('stone', 0x6a3a2e),
    iron: P.flat(0x3a3c40, 0.5, { metalness: 0.6 }),
    ironL: P.flat(0x6a6e74, 0.45, { metalness: 0.6 }),
    brass: P.flat(0xc99a3a, 0.35, { metalness: 0.75 }),
    copper: P.flat(0x4f9a86, 0.5, { metalness: 0.45 }),
    copperD: P.flat(0xb8663a, 0.45, { metalness: 0.55 }),
    glass: P.flat(0x8ac8c0, 0.1, { metalness: 0.2, transparent: false }),
    dark: P.dark,
    soot: P.flat(0x6a6864, 1, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    wood: P.woodDark,
    stone: P.tint('stone', 0xa8a498),
    win: P.window,
    balloon: [P.flat(0xd8c8a0, 0.7), P.flat(0xa8382a, 0.7)],
  };
  const COATS = [0x3a3c40, 0x6a4a2a, 0x2f4a5a, 0x8a3a2a, 0x4a4a52, 0x5a6a3a];

  /** 齿轮：圆盘 + 一圈齿 + 中孔。整体可旋转，需 keepSeparate */
  function gear(r, thick = 0.6, teeth = 14, mat = M.brass) {
    const g = new THREE.Group();
    const disc = cyl(r, r, thick, 24, mat, false);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    const items = [];
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      items.push({ x: Math.cos(a) * (r + 0.15), y: Math.sin(a) * (r + 0.15), z: 0, rz: a });
    }
    g.add(K.scatter(new THREE.BoxGeometry(r * 0.32, r * 0.2, thick), mat, items));
    const hub = cyl(r * 0.28, r * 0.28, thick + 0.3, 12, M.iron, false);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    for (let i = 0; i < 4; i++) {
      const sp = box(r * 1.5, r * 0.12, thick + 0.1, M.iron, false);
      sp.rotation.z = (i / 4) * Math.PI;
      g.add(sp);
    }
    g.userData.keepSeparate = true;
    return g;
  }
  /** 烟囱：砖砌细长筒，顶口一圈铁环 */
  function stack(h = 22, r = 1.3) {
    const g = new THREE.Group();
    const s = cyl(r * 0.8, r * 1.1, h, 12, M.brick);
    s.position.y = h / 2;
    g.add(s);
    for (const y of [0.55, 0.78]) {
      const ring = cyl(r * (1.1 - y * 0.3) + 0.12, r * (1.1 - y * 0.3) + 0.12, 0.3, 12, M.iron, false);
      ring.position.y = h * y;
      g.add(ring);
    }
    const top = cyl(r * 1.0, r * 0.82, 0.8, 12, M.iron);
    top.position.y = h + 0.1;
    g.add(top);
    return g;
  }
  /** 横向管道 + 竖管 */
  function pipe(len, r = 0.4, mat = M.copperD) {
    const g = new THREE.Group();
    const p = cyl(r, r, len, 8, mat, false);
    p.rotation.z = Math.PI / 2;
    g.add(p);
    for (let x = -len / 2 + 1; x < len / 2; x += 3) {
      const fl = cyl(r * 1.4, r * 1.4, 0.25, 8, M.iron, false);
      fl.rotation.z = Math.PI / 2;
      fl.position.x = x;
      g.add(fl);
    }
    return g;
  }
  /** 飞艇：椭球气囊、吊舱、尾翼、螺旋桨（keepSeparate，可移动） */
  function zeppelin(scale = 1) {
    const g = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), M.balloon[0]);
    env.scale.set(4.2, 4.2, 15);
    env.castShadow = true;
    g.add(env);
    for (let i = 0; i < 5; i++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 5, 16), M.balloon[1]);
      band.scale.set(4.2 * Math.sqrt(1 - ((i - 2) / 2.6) ** 2), 4.2 * Math.sqrt(1 - ((i - 2) / 2.6) ** 2), 1);
      band.position.z = (i - 2) * 5.2;
      g.add(band);
    }
    const gon = box(2.4, 1.6, 6, M.wood);
    gon.position.set(0, -5.2, 0);
    g.add(gon);
    for (const sz of [-2, 2]) { const st = box(0.12, 1.2, 0.12, M.iron, false); st.position.set(0, -4.4, sz); g.add(st); }
    for (let i = 0; i < 4; i++) {
      const fin = box(i < 2 ? 0.2 : 4, i < 2 ? 4 : 0.2, 3, M.balloon[1], false);
      fin.position.set(0, 0, -14.5);
      fin.rotation.z = i < 2 ? 0 : 0;
      g.add(fin);
    }
    const prop = new THREE.Group();
    for (let i = 0; i < 2; i++) { const bl = box(2.4, 0.2, 0.1, M.iron, false); bl.rotation.z = i * Math.PI / 2; prop.add(bl); }
    prop.position.set(0, -5.2, -3.4);
    g.add(prop);
    g.userData.prop = prop;
    g.scale.setScalar(scale);
    g.userData.keepSeparate = true;
    return g;
  }
  function addZeppelin(T2, cx, cz, R, y, scale, speed, phase) {
    const z = zeppelin(scale);
    T2.root.add(z);
    z.userData.keepSeparate = true;
    T2.animate((dt, t) => {
      const a = t * speed + phase;
      z.position.set(cx + Math.cos(a) * R, y + Math.sin(t * 0.6 + phase) * 1.5, cz + Math.sin(a) * R);
      z.rotation.y = -a;
      z.userData.prop.rotation.z += dt * 18;
    });
    return z;
  }
  /** 砖房：红砖 + 铁窗 + 烟囱 + 管道，平 / 斜屋顶 */
  function brickHouse(T2, rand, x, z, ry, big = false) {
    const w = big ? 12 : 5 + rand() * 3.5, d = big ? 14 : 5 + rand() * 3.5;
    const fl = big ? 3 : 1 + ((rand() * 3) | 0);
    const h = T2.house({
      w, d, floors: fl, floorH: 2.8, wall: rand() < 0.7 ? M.brick : M.brickD, base: M.stone, roof: rand() < 0.5 ? 'gable' : 'flat', roofMat: rand() < 0.5 ? M.copper : P.slate,
      chimney: true, chimneyMat: M.brickD, windows: 2 + ((rand() * 2) | 0), door: M.iron, porch: false,
    }, x, z, ry);
    const top = h.userData.size.h;
    if (rand() < 0.5) { const p = pipe(w * 0.8, 0.22, M.copperD); p.position.set(0, 2.2, d / 2 + 0.3); h.add(p); }
    if (rand() < 0.35) { const g2 = gear(0.7, 0.2, 8, M.brass); g2.position.set(w * 0.2, top - 0.4, d / 2 + 0.2); h.add(g2); }
    return h;
  }
  function smokers(T2, pts, rate = 1) {
    for (const [x, y, z] of pts) {
      T2.emitter({ x, y, z, count: 22, life: 3.4, size: 2.4, color: 0x5a5856, opacity: 0.35, spread: [0.4, 0.1, 0.4], vel: [0.4, 2.4, 0.2], jitter: [0.25, 0.35, 0.25], fadeIn: 0.2, grow: 2.2 });
    }
  }
  return { M, COATS, gear, stack, pipe, zeppelin, addZeppelin, brickHouse, smokers };
}

export function castle(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = kit(T);
  const { M } = S;
  buildCastleSite(T, {
    ground: 0x8a8884, groundR: 150, WH: 10,
    wallMat: M.brick,
    wallTop(len) {
      const g = new THREE.Group();
      const items = [];
      for (let x = -len / 2 + 1; x <= len / 2; x += 2) items.push({ x, y: 0.7, z: 1.4 }, { x, y: 0.7, z: -1.4 });
      g.add(K.scatter(new THREE.BoxGeometry(1.1, 1.4, 0.6), M.ironL, items));
      const rail = box(len, 0.2, 0.2, M.iron, false);
      rail.position.y = 1.4;
      g.add(rail);
      return g;
    },
    flags: [0xb8663a, 0x4f9a86], flagY: 30, keepFlagY: 46, robes: S.COATS, helmet: 'kettle', weapon: 'halberd', birdColor: 0xd8d0c0,
    tabards: [0x3a3c40, 0xb8663a],
    tower() {
      const g = new THREE.Group();
      const b = cyl(5, 5.6, 17, 14, M.brick);
      b.position.y = 8.5;
      g.add(b);
      const ring = cyl(5.8, 5.8, 0.8, 14, M.iron);
      ring.position.y = 16.5;
      g.add(ring);
      const d = K.dome(5, M.copper, { squash: 0.9 });
      d.position.y = 17;
      g.add(d);
      const fin = cyl(0.1, 0.14, 4, 5, M.iron, false);
      fin.position.y = 23;
      g.add(fin);
      const gr = S.gear(2.4, 0.5, 12);
      gr.position.set(0, 11, 5.7);
      g.add(gr);
      T.animate((dt) => { gr.rotation.z += dt * 0.5; });
      return g;
    },
    gate() {
      const g = new THREE.Group();
      for (const s of [-1, 1]) {
        const p = box(7, 16, 7, M.brick);
        p.position.set(s * 10, 8, 0);
        g.add(p);
        const st = S.stack(24, 1.1);
        st.position.set(s * 10, 16, 0);
        g.add(st);
      }
      const lintel = box(14, 4, 6, M.brickD);
      lintel.position.y = 14;
      g.add(lintel);
      const big = S.gear(5.6, 1, 18);
      big.position.set(0, 9, 3.6);
      g.add(big);
      T.animate((dt) => { big.rotation.z -= dt * 0.25; });
      for (const s of [-1, 1]) {
        const leaf = box(3.4, 8, 0.4, M.iron);
        leaf.position.set(s * 2.2, 4, -0.2);
        g.add(leaf);
      }
      return g;
    },
    keep() {
      const g = new THREE.Group();
      const body = box(46, 14, 26, M.brick);
      body.position.y = 7;
      g.add(body);
      const upper = box(34, 8, 20, M.brickD);
      upper.position.y = 18;
      g.add(upper);
      // 玻璃穹顶（温室）
      const gl = K.dome(10, M.glass, { squash: 0.75 });
      gl.position.set(0, 22, 0);
      g.add(gl);
      const rib = [];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI; rib.push({ x: 0, y: 22 + 0.1, z: 0, ry: a }); }
      const ribMesh = new THREE.Mesh(new THREE.TorusGeometry(10, 0.15, 5, 24, Math.PI), M.iron);
      for (let i = 0; i < 4; i++) { const r = ribMesh.clone(); r.position.set(0, 22, 0); r.rotation.y = (i / 4) * Math.PI; r.scale.y = 0.75; g.add(r); }
      // 烟囱林
      const sx = [[-18, -8], [-12, -8], [18, -8], [12, -8], [-20, 6], [20, 6]];
      sx.forEach(([x, z]) => { const s = S.stack(30 + (x % 3) * 3, 1.2); s.position.set(x, 14, z); g.add(s); });
      // 钟：正面的大钟盘
      const face = cyl(4.6, 4.6, 0.5, 24, P.flat(0xefe6c8, 0.7), false);
      face.rotation.x = Math.PI / 2;
      face.position.set(0, 20, 10.3);
      g.add(face);
      const hand1 = box(0.25, 3.4, 0.2, M.iron, false); hand1.position.set(0, 21.4, 10.7); g.add(hand1);
      const hand2 = box(0.25, 2.4, 0.2, M.iron, false); hand2.position.set(1.0, 20.3, 10.7); hand2.rotation.z = -1.1; g.add(hand2);
      const gr = S.gear(3, 0.6, 14);
      gr.position.set(-16, 10, 13.3);
      g.add(gr);
      const gr2 = S.gear(2, 0.6, 10);
      gr2.position.set(-11.2, 10, 13.3);
      g.add(gr2);
      T.animate((dt) => { gr.rotation.z += dt * 0.4; gr2.rotation.z -= dt * 0.6; });
      for (let i = 0; i < 4; i++) {
        const p = S.pipe(10, 0.45);
        p.position.set(14, 3 + i * 2.5, 13.3);
        g.add(p);
      }
      // 正面台阶
      for (let i = 0; i < 4; i++) { const st = box(12, 0.5, 2, M.stone); st.position.set(0, 0.25 + i * 0.5, 14 - i * 0.6); g.add(st); }
      S.smokers(T, [[-18, 45, -8 - 14], [18, 45, -8 - 14]]);
      return g;
    },
    court(T2) {
      const g = new THREE.Group();
      const pad = box(70, 0.14, 36, M.soot, false);
      pad.position.y = 0.07;
      g.add(pad);
      // 铁轨一圈 + 矿车
      const railA = box(60, 0.15, 0.2, M.iron, false); railA.position.set(0, 0.2, -9); g.add(railA);
      const railB = box(60, 0.15, 0.2, M.iron, false); railB.position.set(0, 0.2, -7.6); g.add(railB);
      for (let x = -30; x <= 30; x += 1.6) { const sl = box(0.4, 0.1, 2.4, M.wood, false); sl.position.set(x, 0.12, -8.3); g.add(sl); }
      const cart = new THREE.Group();
      const cb = box(3, 1.2, 2, M.copperD); cb.position.y = 1.0; cart.add(cb);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = cyl(0.45, 0.45, 0.2, 10, M.iron, false); w.rotation.x = Math.PI / 2; w.position.set(sx * 1, 0.45, sz * 0.75); cart.add(w); }
      cart.userData.keepSeparate = true;
      T2.root.add(cart);
      T2.animate((dt, t) => { const u = (Math.sin(t * 0.25) * 0.5 + 0.5); cart.position.set(-26 + u * 52, 0, 22.5 - 8.3); });
      // 锅炉、齿轮广场
      for (let i = 0; i < 3; i++) {
        const b = cyl(2.2, 2.2, 6, 14, M.copperD); b.rotation.z = Math.PI / 2; b.position.set(-26 + i * 5.4, 2.4, 10); g.add(b);
        for (const s of [-1, 1]) { const sp = box(0.3, 2.4, 0.3, M.iron, false); sp.position.set(-26 + i * 5.4 + s * 2, 1.2, 10); g.add(sp); }
      }
      const gg = S.gear(7, 0.8, 22, M.brass);
      gg.rotation.x = -Math.PI / 2;
      gg.position.set(14, 0.5, 8);
      g.add(gg);
      T2.animate((dt) => { gg.rotation.z += dt * 0.3; });
      const gg2 = S.gear(4.4, 0.8, 14, M.ironL);
      gg2.rotation.x = -Math.PI / 2;
      gg2.position.set(24.6, 0.5, 8);
      g.add(gg2);
      T2.animate((dt) => { gg2.rotation.z -= dt * 0.48; });
      // 煤气路灯串
      for (let i = 0; i < 7; i++) { const p = cyl(0.1, 0.12, 4, 6, M.iron, false); p.position.set(-30 + i * 10, 2, 14); g.add(p); }
      T2.emitter({ x: -26, y: 5, z: 22.5 + 10, count: 16, life: 2.4, size: 1.4, color: 0xd0d0d0, opacity: 0.3, spread: [0.3, 0.1, 0.3], vel: [0, 2, 0], jitter: [0.2, 0.3, 0.2], fadeIn: 0.1, grow: 1.4 });
      return g;
    },
    annex(T2) {
      // 飞艇码头：系留塔
      const g = new THREE.Group();
      const mast = cyl(1.0, 1.6, 28, 8, M.ironL);
      mast.position.y = 14;
      g.add(mast);
      const arm = box(10, 0.5, 0.5, M.iron);
      arm.position.set(5, 26, 0);
      g.add(arm);
      const base = box(14, 1, 14, M.stone);
      base.position.y = 0.5;
      g.add(base);
      return g;
    },
    barracks(T2, x, z) { T2.add(S.pipe(1, 0.1), x, z, 0); S.brickHouse(T2, rand, x, z, 0); },
    text: {
      walls: { name: '铆钉城墙 · The Rivet Wall', shortName: '角塔', tag: '每一块砖都盖着钢印',
        desc: '红砖墙，墙顶是铸铁的垛口和扶栏；四角是圆形的砖塔，顶着铜绿穹顶，塔腰上嵌着一枚缓缓转动的黄铜齿轮。', detail: '铆钉王国用砖不用石：砖是窑里烧的，每一块都盖着出窑日期的钢印，万一哪段墙塌了，查得出是哪一窑的毛病。' },
      gate: { name: '齿轮门 · The Gear Gate', shortName: '正门', tag: '五米大的齿轮才是门栓',
        desc: '两座砖砌门墩各立着一根二十多米的烟囱，横梁中间嵌着一枚直径十一米的黄铜大齿轮，缓缓转动。', detail: '门的开关靠齿轮传动：蒸汽管里的压力推着齿条，一个人拉杆就能开关。来客等门的时候，抬头看齿轮转，是王国的第一课。' },
      keep: { name: '锅炉宫 · The Boiler Palace', shortName: '王宫', tag: '玻璃圆顶下是整个王国的心脏',
        desc: '红砖的大厦，顶上是一座玻璃温室穹顶，六根高烟囱冒着烟，正面一枚大钟盘和一排黄铜齿轮、铜管。', detail: '宫殿的地下室是王国最大的锅炉，一座城的热水、暖气和路灯都靠它；国王的卧室在玻璃穹顶下，那是全国唯一冬天不用点炉子的地方。' },
      court: { name: '机器庭 · The Machine Yard', shortName: '机器庭', tag: '铁轨绕着锅炉转',
        desc: '黑色铺地的庭院，一条铁轨上跑着矿车，旁边是三只铜锅炉和两枚咬合转动的大齿轮。', detail: '庭院是所有工程师的考场：想进宫当差，先让这套齿轮在一刻钟内重新咬合。' },
      annex: { name: '飞艇塔 · The Mooring Mast', shortName: '飞艇塔', tag: '飞艇来了，先系绳子',
        desc: '一座二十八米高的铁塔，塔顶伸出一根系缆臂，飞艇就系在上面。', detail: '飞艇是铆钉王国最得意的发明，装上一百袋煤能飞三天；国王每年夏天坐它去巡视各镇。' },
      overview: { name: '铆钉王城 · Rivetgate', tag: '齿轮、烟囱与飞艇', desc: '铆钉王国的王城：红砖城墙、齿轮门、玻璃穹顶的锅炉宫和机器庭，天上总有飞艇。', detail: '铆钉王国是世界上唯一一个把时间和压力当货币的国家。' },
    },
    extra(T2) {
      S.addZeppelin(T2, 0, 0, 120, 120, 1.2, 0.08, 0);
      S.addZeppelin(T2, 0, -10, 170, 150, 1.6, -0.05, 2.5);
      S.smokers(T2, [[-18, 47, -22], [18, 47, -22], [-20, 47, -8], [20, 47, -8]]);
    },
    beacon() {
      const g = new THREE.Group();
      for (const x of [-18, -12, 12, 18]) { const s = S.stack(48, 1.4); s.position.set(x, 0, -22); g.add(s); }
      const b = box(46, 22, 26, M.brick);
      b.position.set(0, 11, -14);
      g.add(b);
      const z = S.zeppelin(1.4);
      z.position.set(0, 80, 0);
      g.add(z);
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
    ground: 0x8a8884, paving: M.soot, robes: S.COATS, flags: [0xb8663a, 0x4f9a86], houseN: 50, birdColor: 0xd8d0c0, glow: 0xffd890,
    centerpiece() {
      // 齿轮喷泉：三枚大小齿轮叠转 + 蒸汽管
      const g = new THREE.Group();
      const base = cyl(4.2, 4.6, 0.8, 16, M.stone);
      base.position.y = 0.4;
      g.add(base);
      const gs = [[0, 0, 3.6, 16, M.brass, 0.3], [4.6, 0, 2.2, 10, M.ironL, -0.5], [-4.2, -2, 2.6, 12, M.copperD, -0.4]];
      gs.forEach(([x, z, r, n, mat, sp], i) => {
        const gr = S.gear(r, 0.5, n, mat);
        gr.rotation.x = -Math.PI / 2;
        gr.position.set(x, 1.2 + i * 0.3, z);
        g.add(gr);
        T.animate((dt) => { gr.rotation.z += dt * sp; });
      });
      const col = cyl(0.5, 0.6, 8, 8, M.copper);
      col.position.y = 4.6;
      g.add(col);
      const bulb = sphere(1.1, M.brass, 10, 8);
      bulb.position.y = 9.2;
      g.add(bulb);
      return g;
    },
    centerFx(T2) {
      T2.emitter({ x: 0, y: 10, z: 0, count: 20, life: 2.4, size: 1.6, color: 0xe8e8e8, opacity: 0.32, spread: [0.3, 0.1, 0.3], vel: [0, 2, 0], jitter: [0.3, 0.3, 0.3], fadeIn: 0.1, grow: 1.6 });
    },
    stall(T2, r, i) {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const p = cyl(0.07, 0.08, 2.5, 5, M.iron);
        p.position.set(sx * 1.4, 1.25, sz * 0.9);
        g.add(p);
      }
      const roof = box(3.4, 0.14, 2.4, [M.copper, M.copperD, P.slate][i % 3], false);
      roof.position.y = 2.55;
      roof.rotation.x = 0.1;
      g.add(roof);
      const counter = box(2.9, 0.9, 0.8, M.wood);
      counter.position.set(0, 0.45, 0.45);
      g.add(counter);
      const goods = [];
      for (let k = 0; k < 5; k++) goods.push({ x: -1 + k * 0.5, y: 1.1, z: 0.45, s: 0.22 });
      g.add(K.scatter(new THREE.DodecahedronGeometry(1, 0), M.brass, goods));
      return g;
    },
    hall() {
      // 车站：长厅 + 钟楼
      const g = new THREE.Group();
      const b = box(36, 10, 18, M.brick);
      b.position.y = 5;
      g.add(b);
      const vault = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 36, 14, 1, true, 0, Math.PI), M.glass);
      vault.rotation.z = Math.PI / 2;
      vault.rotation.y = Math.PI / 2;
      vault.position.set(0, 10, 0);
      vault.scale.set(1, 1, 0.6);
      g.add(vault);
      const tw = box(7, 26, 7, M.brickD);
      tw.position.set(-14, 13, 5);
      g.add(tw);
      const cap = cone(5, 7, 4, M.copper);
      cap.position.set(-14, 29.5, 5);
      cap.rotation.y = Math.PI / 4;
      g.add(cap);
      const cf = cyl(2.4, 2.4, 0.4, 20, P.flat(0xefe6c8, 0.7), false);
      cf.rotation.x = Math.PI / 2;
      cf.position.set(-14, 22, 8.6);
      g.add(cf);
      for (let i = 0; i < 2; i++) { const r = box(40, 0.18, 0.18, M.iron, false); r.position.set(0, 0.2, 12 + i * 1.4); g.add(r); }
      return g;
    },
    inn() {
      const g = new THREE.Group();
      const b = box(34, 14, 24, M.brickD);
      b.position.y = 7;
      g.add(b);
      const r = K.gableRoof(24, 34, 6, M.copper, M.brickD, { over: 0.8 });
      r.rotation.y = Math.PI / 2;
      r.position.y = 14;
      g.add(r);
      const win = [];
      for (let f = 0; f < 3; f++) for (let i = 0; i < 6; i++) win.push({ x: -13 + i * 5.2, y: 3 + f * 4, z: 12.05, sx: 1.4, sy: 1.8, sz: 0.1 });
      g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.window, win));
      const st = S.stack(24, 1.3);
      st.position.set(12, 14, -6);
      g.add(st);
      S.smokers(T, [[12 + 44, 40 - 2, -6 - 4]]);
      return g;
    },
    craft() {
      // 工厂：锯齿屋顶 + 三根烟囱 + 管道
      const g = new THREE.Group();
      const b = box(22, 8, 16, M.brick);
      b.position.y = 4;
      g.add(b);
      for (let i = 0; i < 4; i++) {
        const sw = box(5.4, 3.2, 16, M.copper);
        sw.position.set(-8 + i * 5.4, 9.6, 0);
        sw.rotation.z = 0.35;
        g.add(sw);
      }
      for (let i = 0; i < 3; i++) { const s = S.stack(26 + i * 3, 1.3); s.position.set(-8 + i * 7, 8, -5); g.add(s); }
      const p = S.pipe(16, 0.5);
      p.position.set(0, 6, 8.6);
      g.add(p);
      const gr = S.gear(2.4, 0.5, 12);
      gr.position.set(7, 4.5, 8.6);
      g.add(gr);
      T.animate((dt) => { gr.rotation.z += dt * 0.7; });
      S.smokers(T, [[-48 + 0 * 7 - 8, 36, -6 - 5], [-48 + 7 - 8, 39, -6 - 5]]);
      return g;
    },
    house(T2, r, x, z, ry) { return S.brickHouse(T2, r, x, z, ry); },
    trees(T2, pts) {
      T2.add(K.grove(P, 'oak', pts, { leaf: 0x6a7a4a, trunk: 0x3a2a20, scale: [0.6, 0.9], rand }), 0, 0);
    },
    extra(T2, homes) {
      S.addZeppelin(T2, 0, 0, 90, 90, 1.0, 0.1, 1);
      S.smokers(T2, homes.slice(0, 10).map((h) => [h.x, 9, h.z]));
    },
    text: {
      plaza: { name: '齿轮广场 · Gear Square', shortName: '齿轮广场', tag: '三枚齿轮永远在转',
        desc: '黑石铺的广场中央是一座三枚齿轮叠转的铜喷泉，顶上喷着白色蒸汽；四周二十四个摊位卖零件、钟表、铜壶和煤油灯。', detail: '广场的规矩：谁家的钟走得慢，谁就得在这里当众校时。' },
      hall: { name: '蒸汽车站 · The Steam Terminus', shortName: '车站', tag: '玻璃拱顶，铁轨伸向远方',
        desc: '红砖长厅顶着半圆形玻璃拱顶，一侧是铜顶钟楼，门前两条铁轨向远处延伸。', detail: '铁路是国王的手臂：煤、钢、粮食、邮件，都靠它在各镇之间走；每一班车都准点，因为钟楼就在站里。' },
      inn: { name: '铁锚旅馆 · The Iron Anchor Hotel', shortName: '客栈', tag: '三层楼，一台锅炉暖全屋',
        desc: '三层红砖大楼，铜绿坡屋顶，一根烟囱高出屋脊。', detail: '旅馆的热水来自厨房那台锅炉：一个铜龙头拧开，三分钟就有热水——这是他们最引以为傲的奢侈。' },
      craft: { name: '铸造厂 · The Foundry', shortName: '工厂', tag: '三根烟囱，从早响到晚',
        desc: '锯齿屋顶的大厂房，三根烟囱冒着浓烟，墙上一排黄铜管和一枚转动的小齿轮。', detail: '厂里造的是齿轮、阀门、钟表芯和飞艇骨架；老工匠说，听一台机器的声音就知道它哪里不舒服。' },
      overview: { name: '铆钉镇 · Rivet Town', tag: '烟囱林立的红砖镇', desc: '铆钉王国的王镇：齿轮广场、蒸汽车站、铁锚旅馆和铸造厂，五十多栋红砖小楼，每栋都有烟囱。', detail: '镇上没有一天是晴天，因为烟总是比云低。' },
    },
    beacon() {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) { const s = S.stack(34 + i * 4, 1.4); s.position.set(-8 + i * 7 - 48 + 48, 0, -34); g.add(s); }
      const b = box(36, 10, 18, M.brick);
      b.position.set(0, 5, -34);
      g.add(b);
      return g;
    },
  };
  if (tweak) tweak(cfg, T);
  buildTownSite(T, cfg);
}
