import * as THREE from 'three';
import { solKit } from './sol_shared.js';

/* ============================================================
 *  琥珀王城 Aurelia —— 琥珀王国的王宫
 *
 *  与北方那座灰石红瓦的城堡不同：这里是象牙色砂岩的方城，
 *  四角圆塔顶着青绿琉璃的洋葱顶，正门是马蹄形拱，城里没有天守，
 *  而是一座带金色大圆顶的宫殿、四根细高的塔、一座十字水渠的御花园。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;
  const S = solKit(P, K);
  const { M } = S;

  T.add(K.groundPatch(150, P.flat(0xb59b60, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { segs: 48 }), 0, 0, 0, 0.03);

  const WX = 56, WZ = 48, WH = 9.5, TH = 3.2;

  /* ================= 城墙与角塔 ================= */
  {
    const g = new THREE.Group();
    const walls = [
      { x: 0, z: -WZ, len: WX * 2, ry: 0 },
      { x: 0, z: WZ, len: WX * 2, ry: 0, gate: true },
      { x: -WX, z: 0, len: WZ * 2, ry: Math.PI / 2 },
      { x: WX, z: 0, len: WZ * 2, ry: Math.PI / 2 },
    ];
    for (const w of walls) {
      const segs = w.gate ? [[-WX + 4, -9], [9, WX - 4]] : [[-w.len / 2 + 4, w.len / 2 - 4]];
      for (const [a, b] of segs) {
        const len = b - a;
        const m = box(len, WH, TH, M.sand);
        const cx = (a + b) / 2;
        const p = new THREE.Group();
        m.position.y = WH / 2;
        p.add(m);
        // 墙顶步道矮墙 + 锯齿垛口
        const cr = S.crenels(len, M.sandL, { step: 1.7, h: 1.1 });
        cr.position.set(0, WH, TH / 2 - 0.3);
        p.add(cr);
        const cr2 = S.crenels(len, M.sandL, { step: 1.7, h: 1.1 });
        cr2.position.set(0, WH, -TH / 2 + 0.3);
        p.add(cr2);
        // 墙面一排狭长箭窗
        const slits = [];
        for (let x = -len / 2 + 3; x < len / 2; x += 6) slits.push({ x, y: WH * 0.62, z: TH / 2 + 0.02, sx: 0.28, sy: 1.5, sz: 0.1 });
        p.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.dark, slits));
        // 墙脚加厚的斜台基
        const plinth = box(len, 1.2, TH + 0.9, M.sandD);
        plinth.position.y = 0.6;
        p.add(plinth);
        if (w.ry) { p.position.set(w.x, 0, w.z + cx); } else { p.position.set(w.x + cx, 0, w.z); }
        p.rotation.y = w.ry;
        g.add(p);
      }
    }
    // 四角塔：粗圆塔 + 青绿洋葱顶 + 金尖，塔顶一圈拱窗
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const t = new THREE.Group();
      const shaft = cyl(5.2, 5.8, 17, 14, M.sand);
      shaft.position.y = 8.5;
      t.add(shaft);
      const ring = cyl(6.1, 6.1, 0.9, 14, M.sandL);
      ring.position.y = 16.8;
      t.add(ring);
      const room = cyl(4.4, 4.4, 3.4, 14, M.sandL);
      room.position.y = 18.9;
      t.add(room);
      const wins = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        wins.push({ x: Math.sin(a) * 4.45, y: 19.2, z: Math.cos(a) * 4.45, ry: a, sx: 0.9, sy: 1.8, sz: 0.2 });
      }
      t.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.win, wins));
      const cap = S.onion(4.8, 9, M.teal, 16);
      cap.position.y = 20.6;
      t.add(cap);
      const fin = cyl(0.07, 0.1, 3, 5, M.gold, false);
      fin.position.y = 31.5;
      t.add(fin);
      const ball = sphere(0.35, M.gold, 8, 6, false);
      ball.position.y = 29.9;
      t.add(ball);
      // 墙腰上的一道青绿琉璃带
      const band = cyl(5.55, 5.7, 0.7, 14, M.teal, false);
      band.position.y = 11;
      t.add(band);
      t.position.set(sx * WX, 0, sz * WZ);
      g.add(t);
    }
    T.landmark(g, 0, 0, 0, {
      name: '王城城墙与角塔 · Walls of Aurelia',
      shortName: '角塔',
      tag: '青绿的顶，象牙色的身',
      desc: '一百一十二米乘九十六米的象牙色砂岩城墙，墙顶是锯齿状的小尖垛口。四角的圆塔高二十米，塔顶一圈拱窗，上面扣着青绿琉璃的洋葱顶和金尖。',
      detail: '北方的城堡靠厚、靠高、靠方，这座王城靠的是形：洋葱顶是从拜占庭和波斯一路传来的屋顶，雨水一滑到底，阳光下像一颗颗釉色的果实。琉璃是王国最值钱的手艺，烧一窑青绿要看三天的火。',
    }, { dist: 125, height: 60, ty: 12, rot: 0.35, oz: 0 });
  }

  /* ================= 正门 ================= */
  {
    const g = new THREE.Group();
    const front = S.archedWall(18, 13, 7, 1, M.sandL, { aw: 6, ah: 8.4, back: null });
    g.add(front);
    // 门洞里的双扇木门（半开）与黄铜铆钉
    for (const s of [-1, 1]) {
      const leaf = box(2.7, 6.8, 0.3, M.wood);
      leaf.position.set(s * 2.9, 3.4, -0.5);
      leaf.rotation.y = s * 1.15;
      g.add(leaf);
    }
    const lintel = box(8.4, 0.7, 7.4, M.teal);
    lintel.position.set(0, 9.2, 0);
    g.add(lintel);
    // 门楼顶的垛口与两面旗
    for (const z of [-3.2, 3.2]) {
      const cr = S.crenels(18, M.sandL, { step: 1.7, h: 1.1 });
      cr.position.set(0, 13, z);
      g.add(cr);
    }
    for (const s of [-1, 1]) {
      const mini = S.minaret(18, 1.05, { cap: M.teal });
      mini.position.set(s * 10, 0, 0);
      g.add(mini);
    }
    // 门前两只石狮（简化成蹲踞的方块 + 球）
    for (const s of [-1, 1]) {
      const lion = new THREE.Group();
      const b = box(1.4, 1.2, 2.2, M.sandD);
      b.position.y = 0.6;
      lion.add(b);
      const h = sphere(0.62, M.sandD, 8, 6);
      h.position.set(0, 1.55, 0.8);
      lion.add(h);
      const ped = box(1.8, 0.5, 2.6, M.sandL);
      ped.position.y = 0.25;
      lion.add(ped);
      lion.position.set(s * 6.5, 0.5, 5.8);
      g.add(lion);
    }
    T.landmark(g, 0, WZ, 0, {
      name: '王城正门 · The Gate of Dawn',
      shortName: '正门',
      tag: '日出时第一缕光会落在门洞里',
      desc: '十八米宽的门楼中间是一道马蹄形的大拱，青绿琉璃的门楣压在上面；门洞里两扇包铜的木门半开。门楼两侧各立一座十八米高的细塔，门前蹲着一对石狮。',
      detail: '这座门朝东偏南，每年夏至日出时，光线正好穿过门洞照到宫殿大圆顶上，所以叫“晨门”。国王接见远来的商队使节就在这个门洞下：使节要从门这头走到那头，一路被两侧塔上的卫兵看着。',
    }, { dist: 50, height: 17, ty: 7, rot: 0 });
  }

  /* ================= 宫殿 ================= */
  const PZ = -14;
  {
    const g = new THREE.Group();
    const W = 46, D = 26;
    const body = box(W, 11, D, M.sand);
    body.position.y = 5.5;
    g.add(body);
    const plinth = box(W + 2, 1.4, D + 2, M.sandD);
    plinth.position.y = 0.7;
    g.add(plinth);
    // 正面两层拱廊：下层七拱，上层七窗
    const arc = S.archedWall(W - 8, 4.6, 1.2, 9, M.sandL, { aw: 2.0, ah: 3.6, back: M.dark });
    arc.position.set(0, 1.4, D / 2 + 0.7);
    g.add(arc);
    const arc2 = S.archedWall(W - 8, 4.4, 1.0, 9, M.cream, { aw: 1.5, ah: 3.0, back: M.win });
    arc2.position.set(0, 6.4, D / 2 + 0.55);
    g.add(arc2);
    const cornice = box(W + 1.2, 0.7, D + 1.4, M.teal);
    cornice.position.y = 11.2;
    g.add(cornice);
    for (const z of [-D / 2, D / 2]) {
      const cr = S.crenels(W, M.sandL, { step: 1.6, h: 1.1 });
      cr.position.set(0, 11.6, z);
      g.add(cr);
    }
    // 中央大圆顶（金），圆顶下是高鼓座
    const dome = S.bigDome(10.5, { cap: M.gold, drum: M.sandL, drumH: 6.5 });
    dome.position.y = 11.5;
    g.add(dome);
    // 两翼小圆顶（青绿）
    for (const sx of [-1, 1]) {
      const d2 = S.bigDome(5.2, { cap: M.teal, drum: M.sandL, drumH: 3 });
      d2.position.set(sx * 16, 11.5, 0);
      g.add(d2);
    }
    // 四角宣礼塔
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const m = S.minaret(34, 1.7, { cap: M.teal });
      m.position.set(sx * (W / 2 + 1.5), 0, sz * (D / 2 + 0.5));
      g.add(m);
    }
    // 入口台阶
    for (let i = 0; i < 4; i++) {
      const st = box(10 - i * 0.6, 0.4, 2.4, M.sandL);
      st.position.set(0, 0.25 + i * 0.4, D / 2 + 2.6 - i * 0.55);
      g.add(st);
    }
    T.landmark(g, 0, PZ, 0, {
      name: '琥珀宫 · The Amber Palace',
      shortName: '王宫',
      tag: '金顶之下是王国的议事厅',
      desc: '四十六米宽的象牙色宫殿，正面两层拱廊，中央一座十米半径的金色大圆顶，两翼各一座青绿小圆顶，四角各立一座三十四米高的细塔。',
      detail: '宫殿没有塔楼和箭垛式的防御，因为它不是用来挡人的，是用来给人看的。金顶是铜胎贴金，在晴天十公里外都能看到反光；圆顶下的大厅没有一根柱子，是王国最大的无柱空间。国王每月第一天在这里听政，任何自由民都可以递上一张羊皮纸。',
    }, { dist: 105, height: 52, ty: 14, rot: 0.2 });
  }

  /* ================= 御花园：十字水渠 + 喷泉 ================= */
  {
    const g = new THREE.Group();
    const GZ0 = 4, GZ1 = 41;
    const cz = (GZ0 + GZ1) / 2;
    const pave = box(70, 0.12, GZ1 - GZ0, M.paving, false);
    pave.position.set(0, 0.06, 0);
    g.add(pave);
    // 十字渠
    const canalA = box(2.2, 0.16, GZ1 - GZ0 - 2, M.water, false);
    canalA.position.set(0, 0.12, 0);
    g.add(canalA);
    const canalB = box(66, 0.16, 2.2, M.water, false);
    canalB.position.set(0, 0.12, 0);
    g.add(canalB);
    const fo = S.fountain(4.2);
    fo.position.set(0, 0, 0);
    g.add(fo);
    // 四块花圃：低矮方形黄杨 + 橘子树盆栽 + 玫瑰色小圆点
    const beds = [[-17, -8], [17, -8], [-17, 9], [17, 9]];
    for (const [bx, bz] of beds) {
      const hedge = box(20, 0.9, 12, P.flat(0x3c6a30, 1), false);
      hedge.position.set(bx, 0.45, bz);
      g.add(hedge);
      const bed = box(18, 0.95, 10, P.flat(0xb8845a, 1), false);
      bed.position.set(bx, 0.5, bz);
      g.add(bed);
      const flowers = [];
      for (let i = 0; i < 70; i++) flowers.push({ x: bx + (rand() - 0.5) * 17, y: 1.0, z: bz + (rand() - 0.5) * 9, s: 0.18 + rand() * 0.1,
        color: [0xd44a4a, 0xe8c040, 0xf0e8d8, 0xc86aa0][(rand() * 4) | 0] });
      g.add(K.scatter(new THREE.SphereGeometry(1, 5, 4), P.flat(0xffffff, 0.9), flowers));
    }
    // 渠边柏树两列
    const cy = [];
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) cy.push([s * 3.2, -16 + i * 4.2]);
    g.add(S.cypresses(cy, rand, { scale: [0.8, 1.0] }));
    // 两侧亭子
    for (const s of [-1, 1]) {
      const kiosk = new THREE.Group();
      const floor = box(6.4, 0.3, 6.4, M.sandL);
      floor.position.y = 0.15;
      kiosk.add(floor);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const col = cyl(0.22, 0.26, 3.4, 8, M.white);
        col.position.set(sx * 2.8, 1.9, sz * 2.8);
        kiosk.add(col);
      }
      const dm = K.dome(3.6, M.teal, { squash: 0.8 });
      dm.position.y = 3.6;
      kiosk.add(dm);
      const tip = sphere(0.22, M.gold, 8, 6, false);
      tip.position.y = 6.5;
      kiosk.add(tip);
      kiosk.position.set(s * 32, 0, cz - 20);
      g.add(kiosk);
    }
    // 渠水边摆花盆
    const ptsPots = [];
    for (let i = 0; i < 12; i++) ptsPots.push([-30 + i * 5.4, -(GZ1 - GZ0) / 2 + 1]);
    g.add(S.pots(ptsPots, rand));
    T.landmark(g, 0, cz, 0, {
      name: '御花园 · The Garden of Four Waters',
      shortName: '御花园',
      tag: '一滴水走四条渠',
      desc: '宫殿前的十字水渠把花园分成四块方圃，正中是八角喷泉；渠边两列柏树，圃里种着橘树、玫瑰和黄杨，东西各有一座青绿圆顶的小亭。',
      detail: '“四渠花园”来自波斯：四条水渠象征四条河，把世界分成四份。水从北边山上的蓄水池靠高差流下来，不用一个水车。夏天正午花园比城外凉五度，所以国王的午觉总是在东边那座亭子里。',
    }, { dist: 52, height: 30, ty: 3, rot: 0.3 });
    // 喷泉水雾
    T.emitter({ parent: undefined, x: 0, y: 3.2, z: cz, count: 26, life: 1.2, size: 0.24, color: 0xcdeaf2, opacity: 0.75,
      spread: [0.12, 0.05, 0.12], vel: [0, 3.6, 0], jitter: [0.7, 0.8, 0.7], gravity: 7, fadeIn: 0.05 });
  }

  /* ================= 骆驼厩 + 兵营 ================= */
  {
    const g = new THREE.Group();
    // 骆驼厩：开敞的长棚，里面系着骆驼
    const L = 24;
    const floor = box(L, 0.2, 9, P.flat(0xcbb083, 1), false);
    floor.position.y = 0.1;
    g.add(floor);
    for (let i = 0; i <= 6; i++) {
      const p = cyl(0.2, 0.24, 4, 6, M.wood);
      p.position.set(-L / 2 + i * (L / 6), 2, 4);
      g.add(p);
    }
    const roof = box(L + 1, 0.3, 10, M.terra);
    roof.position.set(0, 4.1, 0);
    roof.rotation.x = 0.1;
    g.add(roof);
    const back = box(L, 3.4, 0.5, M.sand);
    back.position.set(0, 1.9, -4.4);
    g.add(back);
    const trough = box(L - 2, 0.5, 0.7, M.wood);
    trough.position.set(0, 0.4, 3.0);
    g.add(trough);
    const camels = [];
    for (let i = 0; i < 5; i++) {
      const c = S.camel(1, i % 2 ? 0xc9a066 : 0xb58a52);
      c.position.set(-L / 2 + 3 + i * 4.6, 0, 0.3);
      c.rotation.y = Math.PI / 2 + (rand() - 0.5) * 0.3;
      c.userData.keepSeparate = true;
      g.add(c);
      camels.push(c);
    }
    T.landmark(g, -34, 24, Math.PI, {
      name: '骆驼厩 · The Camel Stable',
      shortName: '驼厩',
      tag: '商队来了，先给骆驼喝水',
      desc: '城内西南角一座二十四米长的开敞长棚，五头骆驼并排系在食槽前，鞍毯是青、金、赭三色。',
      detail: '骆驼一次能喝一百多升水，王国的商路也因此沿着绿洲排开：每隔一天的路程就有一口井。国王的骆驼队有三百头，其中十几头长期养在王城里，用来给宫里运冰——冰来自北边的雪山，骆驼夜里走，天亮前到。',
    }, { dist: 38, height: 15, ty: 2, rot: Math.PI });
    for (const c of camels) {
      const ph = rand() * 6;
      const neck = c.userData.neck;
      T.animate((dt, t) => { neck.rotation.x = Math.sin(t * 0.5 + ph) * 0.18 + 0.1; });
    }
    // 兵营：东北角两排低平房
    for (let i = 0; i < 4; i++) T.house({ w: 7, d: 5, floors: 1, wall: M.sand, base: null, roof: 'flat', chimney: false, windows: 2, door: M.wood }, 36 + (i % 2) * 9, -36 + ((i / 2) | 0) * 7, 0);
  }

  /* ================= 旗、灯、人 ================= */
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    T.flag(sx * WX, 31, sz * WZ, { w: 4.2, h: 2.2, color: sz > 0 ? 0x1e8c92 : 0xe0ac2e, ry: sx > 0 ? 0.3 : 2.8, wind: 1.1 });
  }
  T.flag(0, 51, PZ, { w: 4.8, h: 2.6, color: 0x1e8c92, ry: 0.1, wind: 1.2 });
  for (let i = 0; i < 6; i++) T.lamp(-24 + i * 9.6, 40, { h: 3.6, light: i === 0 || i === 5, gain: 0.5 });
  for (let i = 0; i < 5; i++) T.lamp(-20 + i * 10, -1, { h: 3.6 });

  // 守卫：城墙步道上巡逻、门前站岗
  const gm = { helmet: 'kettle', weapon: 'spear', shield: false };
  T.walker({ ...gm, tabard: 0x1e8c92 }, [-48, WZ], [-12, WZ], 0.8, 1.0, WH);
  T.walker({ ...gm, tabard: 0xe0ac2e }, [12, WZ], [48, WZ], 0.8, 1.0, WH);
  T.walker({ ...gm, tabard: 0x1e8c92 }, [-WX, -40], [-WX, 40], 0.7, 1.0, WH);
  T.walker({ ...gm, tabard: 0xe0ac2e }, [WX, 40], [WX, -40], 0.7, 1.0, WH);
  T.walker({ ...gm, tabard: 0x1e8c92 }, [-48, -WZ], [48, -WZ], 0.8, 1.0, WH);
  for (const s of [-1, 1]) T.person({ ...gm, tabard: 0xe0ac2e, helmet: 'great', weapon: 'halberd' }, s * 4.4, WZ + 3.5, 0, 'idle', 1.05);
  for (const s of [-1, 1]) T.person({ ...gm, tabard: 0x1e8c92, helmet: 'great', weapon: 'halberd' }, s * 7, PZ + 15.5, 0, 'idle', 1.05);
  // 花园里的朝臣、园丁
  const courtier = (tab) => ({ villager: false, tabard: tab, helmet: 'hood', weapon: 'none', cape: true });
  for (let i = 0; i < 8; i++) {
    const a = [-26 + rand() * 20, 8 + rand() * 30];
    const b = [a[0] + (rand() < 0.5 ? 14 : -14) * (0.5 + rand() * 0.8), a[1] + (rand() - 0.5) * 6];
    T.walker(courtier(S.ROBES[(rand() * 7) | 0]), [a[0], a[1]], [Math.max(-30, Math.min(30, b[0])), b[1]], 0.45 + rand() * 0.2);
  }
  for (let i = 0; i < 4; i++) T.person({ villager: true }, -26 + i * 17 + rand() * 4, 12 + (i % 2) * 14, rand() * 6, 'idle');
  for (let i = 0; i < 4; i++) T.person({ villager: true }, 36 + (rand() - 0.5) * 12, -26 + rand() * 10, rand() * 6, 'idle');

  // 鸽子盘旋在大圆顶上
  T.birds({ count: 9, center: [0, PZ], radius: 28, height: 40, color: 0xf2ece0, scale: 0.8 });

  T.overview({
    name: '琥珀王城 · Aurelia',
    tag: '金顶、青绿塔和十字水渠',
    desc: '琥珀王国的王城。象牙色砂岩的方形城墙，四角青绿洋葱顶的圆塔，正门朝东南；城里是金色大圆顶的琥珀宫和四渠御花园。',
    detail: '琥珀王国靠商路和琉璃立国，与北边那个灰石红瓦的王国隔着一片丘陵相望。两国使节往来频繁，但谁也没学会对方的屋顶。',
  }, { dist: 230, height: 130, rot: 0.2 });

  // 远景信标：金色大圆顶 + 两座细塔
  const bc = new THREE.Group();
  const bd = S.bigDome(10.5, { cap: M.gold, drum: M.sandL, drumH: 6.5 });
  bd.position.set(0, 0, PZ);
  bc.add(bd);
  for (const sx of [-1, 1]) {
    const mi = S.minaret(34, 1.7, { cap: M.teal });
    mi.position.set(sx * 24.5, 0, PZ - 12);
    bc.add(mi);
  }
  const bb = box(46, 11, 26, M.sand);
  bb.position.set(0, 5.5, PZ);
  bc.add(bb);
  T.beacon(bc);
}
