import * as THREE from 'three';
import { solKit } from './sol_shared.js';

/* ============================================================
 *  金砂集市镇 Souk Halim —— 琥珀王城脚下的商镇
 *
 *  白房子顺着起伏的小巷往上叠；镇中心是石铺的大广场和喷泉，
 *  四周是挂满遮阳篷的露天市集；北面是带金顶的大礼拜堂和一座细塔，
 *  东边是商队客栈（中间一口大院，骆驼卧着卸货），西边是公共浴场和烘焙坊。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, sphere } = K;
  const S = solKit(P, K);
  const { M } = S;

  T.add(K.groundPatch(150, P.flat(0xb59b60, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { segs: 48 }), 0, 0, 0, 0.03);

  /* ---------- 广场：铺装 + 喷泉 + 四周摊位 ---------- */
  const PLAZA = { w: 44, d: 34 };
  {
    const g = new THREE.Group();
    const pv = box(PLAZA.w, 0.14, PLAZA.d, M.paving, false);
    pv.position.y = 0.07;
    g.add(pv);
    // 铺装拼花：对角的深浅条
    const tiles = [];
    for (let i = -10; i <= 10; i++) tiles.push({ x: i * 2, y: 0.15, z: 0, sx: 0.5, sy: 0.02, sz: PLAZA.d - 2, ry: 0 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0xd2bd8c, 1), tiles));
    const fo = S.fountain(4.4);
    g.add(fo);
    // 四周摊位，朝向广场中心
    const rowZ = (z, face) => {
      for (let i = 0; i < 6; i++) {
        const st = S.stall(T, rand, [0xe8a040, 0xc8452f, 0x6aa04a, 0xe0d0a0, 0x9a5aa8, 0x2f6aa8][i]);
        st.position.set(-17 + i * 6.8, 0, z);
        st.rotation.y = face;
        g.add(st);
      }
    };
    rowZ(-PLAZA.d / 2 + 3, 0);
    rowZ(PLAZA.d / 2 - 3, Math.PI);
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) {
        const st = S.stall(T, rand);
        st.position.set(s * (PLAZA.w / 2 - 3), 0, -8 + i * 8);
        st.rotation.y = -s * Math.PI / 2;
        g.add(st);
      }
    }
    // 地上的货箱、麻袋、陶罐
    const sacks = [];
    for (let i = 0; i < 16; i++) sacks.push({ x: (rand() - 0.5) * 36, y: 0.3, z: (rand() - 0.5) * 26, sx: 0.8, sy: 0.6, sz: 0.6, ry: rand() * 3 });
    g.add(K.scatter(new THREE.SphereGeometry(0.5, 6, 5), P.flat(0xd8c9a0, 1), sacks));
    g.add(S.pots(Array.from({ length: 14 }, () => [(rand() - 0.5) * 38, (rand() - 0.5) * 28]), rand));
    T.landmark(g, 0, 0, 0, {
      name: '金砂集市广场 · The Souk Square',
      shortName: '集市广场',
      tag: '喷泉边二十五个摊位，一个也不重样',
      desc: '四十四米乘三十四米的石铺广场，正中是八角喷泉，四周二十四个挂着条纹遮阳篷的摊位：香料、陶器、织毯、枣子、铜器、琉璃珠。',
      detail: '集市从日出开到日落，中午最热的两个小时全镇歇业，躺在篷下喝薄荷茶。摊位要抽签才能拿到：靠喷泉近的位置，夏天凉快，所以一直是兑水的茶商和卖冰的人抢着要。',
    }, { dist: 62, height: 38, ty: 2, rot: 0.2 });
    // 喷泉水雾
    T.emitter({ x: 0, y: 3.4, z: 0, count: 22, life: 1.1, size: 0.22, color: 0xcdeaf2, opacity: 0.7,
      spread: [0.1, 0.05, 0.1], vel: [0, 3.4, 0], jitter: [0.7, 0.8, 0.7], gravity: 7, fadeIn: 0.05 });
  }

  /* ---------- 大礼拜堂 + 细塔（北面） ---------- */
  {
    const g = new THREE.Group();
    const body = box(30, 12, 22, M.sand);
    body.position.y = 6;
    g.add(body);
    const plinth = box(32, 1.2, 24, M.sandD);
    plinth.position.y = 0.6;
    g.add(plinth);
    const front = S.archedWall(24, 8, 1.4, 5, M.sandL, { aw: 3, ah: 6, back: M.dark });
    front.position.set(0, 1.2, 11.7);
    g.add(front);
    const dome = S.bigDome(8, { cap: M.gold, drum: M.sandL, drumH: 5, onionTop: true });
    dome.position.y = 12;
    g.add(dome);
    for (const s of [-1, 1]) {
      const d = S.bigDome(3.4, { cap: M.teal, drum: M.sandL, drumH: 2.2 });
      d.position.set(s * 12, 12, 7);
      g.add(d);
    }
    const mina = S.minaret(40, 1.9, { cap: M.teal });
    mina.position.set(17, 0, 10);
    g.add(mina);
    // 门前八级台阶与门洞
    for (let i = 0; i < 4; i++) {
      const st = box(8 - i, 0.35, 2, M.sandL);
      st.position.set(0, 0.2 + i * 0.35, 13.2 - i * 0.5);
      g.add(st);
    }
    T.landmark(g, 0, -34, 0, {
      name: '金顶礼拜堂 · The Golden-Domed Hall',
      shortName: '礼拜堂',
      tag: '洋葱顶下面是镇里最凉快的地方',
      desc: '三十米宽的象牙色大厅，中央一座金色洋葱顶，两侧各一座青绿小圆顶；东南角立着一座四十米高的细塔，塔上的人每天喊五次。',
      detail: '礼拜堂的墙厚近两米，窗开得很高很窄，是镇里夏天最凉快的地方，所以也是调解纠纷和审理小案子的场所：人在凉快的地方，火气小一点。',
    }, { dist: 70, height: 36, ty: 12, rot: 0.15 });
  }

  /* ---------- 商队客栈（东）：回字形大院 ---------- */
  {
    const g = new THREE.Group();
    const W = 38, D = 30;
    const wallH = 7.5;
    for (const [x, z, w, d] of [[0, -D / 2, W, 3], [-W / 2, 0, 3, D], [W / 2, 0, 3, D]]) {
      const m = box(w, wallH, d, M.ochre);
      m.position.set(x, wallH / 2, z);
      g.add(m);
    }
    // 正面带门的一道墙
    for (const s of [-1, 1]) {
      const m = box((W - 8) / 2, wallH, 3, M.ochre);
      m.position.set(s * ((W - 8) / 4 + 4), wallH / 2, D / 2);
      g.add(m);
    }
    const gate = S.archedWall(8, wallH + 1.5, 3, 1, M.sandL, { aw: 4.8, ah: 6, back: null });
    gate.position.set(0, 0, D / 2);
    g.add(gate);
    // 院内一圈两层拱廊 + 屋顶平台
    for (const [x, z, len, ry] of [[0, -D / 2 + 3, W - 6, 0], [-W / 2 + 3, 0, D - 6, Math.PI / 2], [W / 2 - 3, 0, D - 6, -Math.PI / 2]]) {
      const ar = S.archedWall(len, 3.8, 0.8, Math.round(len / 3.4), M.sandL, { aw: 1.8, ah: 3.0, back: M.dark });
      ar.position.set(x, 0, z);
      ar.rotation.y = ry;
      g.add(ar);
    }
    for (const [x, z, w, d] of [[0, -D / 2 + 2, W - 3, 6], [-W / 2 + 2, 0, 6, D - 3], [W / 2 - 2, 0, 6, D - 3]]) {
      const slab = box(w, 0.4, d, M.sandL);
      slab.position.set(x, 4.1, z);
      g.add(slab);
    }
    // 院中央的井 + 卧着的骆驼
    const well = cyl(1.6, 1.8, 1.0, 10, M.sandL);
    well.position.set(0, 0.5, -2);
    g.add(well);
    const wat = cyl(1.2, 1.2, 0.1, 10, M.water, false);
    wat.position.set(0, 1.02, -2);
    g.add(wat);
    const camels = [];
    for (let i = 0; i < 6; i++) {
      const c = S.camel(0.95, 0xc59a60);
      c.position.set(-11 + (i % 3) * 11 + (rand() - 0.5) * 2, 0, 4 + ((i / 3) | 0) * 7);
      c.rotation.y = rand() * 6.28;
      c.userData.keepSeparate = true;
      g.add(c);
      camels.push(c);
    }
    // 货包堆
    const bales = [];
    for (let i = 0; i < 18; i++) bales.push({ x: -W / 2 + 5 + (i % 6) * 1.3, y: 0.5 + ((i / 6) | 0) * 0.8, z: -D / 2 + 6.5 + (rand() - 0.5), sx: 1.2, sy: 0.8, sz: 1, ry: rand() * 0.3 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0xd5bc86, 1), bales));
    T.landmark(g, 44, -4, -Math.PI / 2, {
      name: '商队客栈 · The Caravanserai',
      shortName: '商队客栈',
      tag: '一天的路程，就有一口井',
      desc: '三十八米宽的回字形大院，四面是两层拱廊，院子正中一口石井，六头骆驼卧在地上卸货；拱廊下一间间客房，屋顶平台上可以睡觉乘凉。',
      detail: '商队客栈是商路上的节点：房间便宜，牲口免费喝水，晚上大家围着井讲各自路上的见闻。往往一个客栈里同时住着来自五个国家的商人，所以消息传得比马快。',
    }, { dist: 66, height: 38, ty: 2, rot: -Math.PI / 2 });
    for (const c of camels) {
      const ph = rand() * 6;
      const neck = c.userData.neck;
      T.animate((dt, t) => { neck.rotation.x = Math.sin(t * 0.4 + ph) * 0.22 + 0.15; });
    }
  }

  /* ---------- 公共浴场（西）+ 烘焙坊 ---------- */
  {
    const g = new THREE.Group();
    const body = box(24, 6, 16, M.cream);
    body.position.y = 3;
    g.add(body);
    // 屋顶一排小圆顶，白天透光、夜里发白
    for (let i = 0; i < 5; i++) {
      const d = K.dome(2.0, M.sandL, { squash: 0.8 });
      d.position.set(-9.6 + i * 4.8, 6, -3);
      g.add(d);
      const d2 = K.dome(2.0, M.sandL, { squash: 0.8 });
      d2.position.set(-9.6 + i * 4.8, 6, 3.5);
      g.add(d2);
    }
    const dm = S.bigDome(4.8, { cap: M.teal, drum: M.cream, drumH: 2 });
    dm.position.set(0, 6, 0);
    g.add(dm);
    const door = S.archedWall(6, 4.8, 0.8, 1, M.sandL, { aw: 2.4, ah: 3.8 });
    door.position.set(0, 0, 8.3);
    g.add(door);
    const ch = box(1.2, 5, 1.2, M.sandD);
    ch.position.set(10, 8, -6);
    g.add(ch);
    T.smokeFrom(g, new THREE.Vector3(10, 10.6, -6));
    T.landmark(g, -48, -6, Math.PI / 2, {
      name: '公共浴场 · The Hammam',
      shortName: '浴场',
      tag: '屋顶上的圆孔是给蒸汽的',
      desc: '二十四米长的低矮大房子，屋顶是十几个小圆顶，每个圆顶上开着星形小孔；正中一座青绿小圆顶，东北角的烟囱日夜冒烟。',
      detail: '浴场是镇里的会客厅：水烧得很热，大家躺在大理石台子上聊天，谈生意、说媒、传消息。男人和女人错开时间，门口挂红布是女宾日，挂蓝布是男宾日。',
    }, { dist: 44, height: 24, ty: 4, rot: Math.PI / 2 });
  }
  {
    const g = new THREE.Group();
    const b = box(9, 4.2, 7, M.rose);
    b.position.y = 2.1;
    g.add(b);
    const oven = K.dome(2.2, M.sandD, { squash: 0.9 });
    oven.position.set(5.8, 0, 0);
    g.add(oven);
    const ch = box(0.9, 3, 0.9, M.sandD);
    ch.position.set(5.8, 2.6, 0);
    g.add(ch);
    const fl = sphere(0.35, P.flat(0xff9a3c, 0.5, { emissive: 0xff7a1c, emissiveIntensity: 0.6 }), 6, 5, false);
    fl.position.set(5.8, 0.9, 1.9);
    g.add(fl);
    const breads = [];
    for (let i = 0; i < 12; i++) breads.push({ x: -3.5 + (i % 6) * 0.6, y: 1.12, z: 3.8 + ((i / 6) | 0) * 0.5, sx: 0.5, sy: 0.25, sz: 0.4, ry: rand() });
    g.add(K.scatter(new THREE.SphereGeometry(1, 6, 5), P.flat(0xc8924a, 0.9), breads));
    const tbl = box(5, 0.9, 1.4, M.wood);
    tbl.position.set(-1.5, 0.45, 4.2);
    g.add(tbl);
    T.landmark(g, -30, 20, 0, {
      name: '烘焙坊 · The Bakery',
      shortName: '烘焙坊',
      tag: '天亮前第一炉饼',
      desc: '白灰泥的小屋，旁边是一座圆顶泥炉，门口的木桌上摆着刚出炉的圆饼。',
      detail: '圆饼要贴在炉壁上烤，一眨眼的工夫就熟。烘焙坊也是邻里的公共炉：各家各户把和好的面送来，付一把面粉当炉费。',
    }, { dist: 24, height: 12, ty: 2, rot: 0.3 });
    T.smokeFrom(g, new THREE.Vector3(5.8, 4.2, 0));
  }

  /* ---------- 民居：沿同心弧排开，避开广场和大建筑 ---------- */
  const keepOut = [
    { x: 0, z: 0, r: 34 }, { x: 0, z: -34, r: 26 }, { x: 44, z: -4, r: 30 }, { x: -48, z: -6, r: 22 }, { x: -30, z: 20, r: 12 },
  ];
  const homes = [];
  const free = (x, z, r) => {
    for (const k of keepOut) if (Math.hypot(x - k.x, z - k.z) < k.r + r) return false;
    for (const h of homes) if (Math.hypot(x - h.x, z - h.z) < h.r + r) return false;
    return true;
  };
  let tries = 0;
  while (homes.length < 56 && tries++ < 3000) {
    const a = rand() * Math.PI * 2;
    const r = 38 + rand() * 76;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 0.85;
    const rr = 5.2;
    if (!free(x, z, rr)) continue;
    homes.push({ x, z, r: rr });
    // 房子朝向广场
    const ry = Math.atan2(-x, -z) + (rand() - 0.5) * 0.35;
    S.whiteHouse(T, rand, x, z, ry);
  }
  // 屋间的晒布绳、花盆、阳台
  const potPts = homes.slice(0, 30).map((h) => [h.x + (rand() - 0.5) * 3, h.z + 4.2]);
  T.add(S.pots(potPts, rand), 0, 0);

  /* ---------- 树、灯、牲畜、人 ---------- */
  const trees = K.ringPoints(rand, 0, 0, 100, 135, 40, (x, z) => !free(x, z, 3));
  T.add(S.olives(trees.slice(0, 22), rand), 0, 0);
  T.add(S.palms(trees.slice(22), rand), 0, 0);
  T.add(S.cypresses(K.ringPoints(rand, 0, -34, 18, 26, 12), rand), 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    T.lamp(Math.cos(a) * 24, Math.sin(a) * 18, { h: 3.6, light: i % 4 === 0, gain: 0.5 });
  }
  for (const [sx, sz] of [[-30, -20], [30, 18], [-22, 24]]) T.glow(sx, 2, sz, { size: 1.6, color: 0xffb060 });

  const merchant = (tab) => ({ tabard: tab, helmet: 'hood', weapon: 'none', cape: rand() < 0.5 });
  // 集市里的摊主与顾客
  for (let i = 0; i < 18; i++) T.person({ villager: true }, -17 + (i % 6) * 6.8 + 0.4, (i < 6 ? -14 : i < 12 ? 14 : -4) + 1.6 * (i < 6 ? 1 : -1), i < 6 ? Math.PI : 0, 'idle');
  for (let i = 0; i < 20; i++) {
    const a = [-18 + rand() * 36, -11 + rand() * 22];
    const b = [-18 + rand() * 36, -11 + rand() * 22];
    T.walker(merchant(S.ROBES[(rand() * 7) | 0]), a, b, 0.4 + rand() * 0.3);
  }
  // 街巷里走动的人 + 驮货的骆驼
  for (let i = 0; i < 16; i++) {
    const h = homes[(rand() * homes.length) | 0];
    if (!h) continue;
    T.walker(merchant(S.ROBES[(rand() * 7) | 0]), [h.x, h.z + 5], [h.x + (rand() - 0.5) * 24, h.z + 5 + (rand() - 0.5) * 12], 0.5 + rand() * 0.2);
  }
  const caravan = [];
  for (let i = 0; i < 3; i++) {
    const c = S.camel(1, 0xbe9358);
    c.userData.keepSeparate = true;
    const load = box(1.3, 0.9, 1.0, P.flat(S.M.cloth[i], 1), false);
    load.position.set(0, 2.5, 0);
    c.add(load);
    T.add(c, 0, 0);
    caravan.push(c);
  }
  const route = [[-96, 40], [-40, 52], [30, 52], [96, 38]];
  T.animate((dt, t) => {
    for (let i = 0; i < caravan.length; i++) {
      const u = ((t * 0.022 + i * 0.07) % 1);
      const k = u * (route.length - 1);
      const s0 = Math.min(route.length - 2, Math.floor(k));
      const f = k - s0;
      const A = route[s0], B = route[s0 + 1];
      const c = caravan[i];
      c.position.set(A[0] + (B[0] - A[0]) * f, 0, A[1] + (B[1] - A[1]) * f);
      c.rotation.y = Math.atan2(B[0] - A[0], B[1] - A[1]);
      c.userData.neck.rotation.x = Math.sin(t * 2 + i) * 0.06 + 0.1;
      c.position.y = Math.abs(Math.sin(t * 2.6 + i)) * 0.06;
    }
  });
  for (let i = 0; i < 12; i++) {
    const gt = S.goat(1);
    const a = rand() * 6.28;
    gt.group.position.set(Math.cos(a) * (96 + rand() * 20), 0, Math.sin(a) * (80 + rand() * 20));
    gt.group.rotation.y = rand() * 6.28;
    gt.group.userData.keepSeparate = true;
    T.add(gt.group, gt.group.position.x, gt.group.position.z, gt.group.rotation.y);
    const ph = rand() * 6;
    T.animate((dt, t) => { gt.head.rotation.x = 0.45 + Math.sin(t * 0.42 + ph) * 0.3; });
  }
  // 旗：金色长旗
  for (const [x, z, c] of [[-20, -16, 0x1e8c92], [20, -16, 0xe0ac2e], [-20, 16, 0xe0ac2e], [20, 16, 0x1e8c92]]) {
    const pole = cyl(0.08, 0.1, 7, 6, M.wood);
    pole.position.set(x, 3.5, z);
    T.root.add(pole);
    T.flag(x, 6.4, z, { w: 3.2, h: 1.8, color: c, ry: 0.3, wind: 1.0 });
  }
  T.birds({ count: 8, center: [0, -34], radius: 22, height: 28, color: 0xf0ece0, scale: 0.8 });
  T.birds({ count: 6, center: [44, -4], radius: 16, height: 16, color: 0xd8d0c0, scale: 0.9 });

  T.overview({
    name: '金砂集市镇 · Souk Halim',
    tag: '白房子一层层往山上叠',
    desc: '琥珀王城脚下的商镇。中央是喷泉广场和二十四个摊位，北面金顶礼拜堂，东边商队客栈，西边公共浴场；五十多栋白灰泥平顶房围成同心的弧。',
    detail: '这里是琥珀王国最繁忙的地方：北方的羊毛、南方的香料、东方的丝绸都要在这里换手。镇上的人说，只要在广场喷泉边站够一个下午，你就能听见半个世界的消息。',
  }, { dist: 220, height: 120, rot: 0.2 });

  const bc = new THREE.Group();
  const md = S.minaret(40, 1.9, { cap: M.teal });
  md.position.set(17, 0, -24);
  bc.add(md);
  const bdm = S.bigDome(8, { cap: M.gold, drum: M.sandL, drumH: 5, onionTop: true });
  bdm.position.set(0, 12, -34);
  bc.add(bdm);
  const bbx = box(30, 12, 22, M.sand);
  bbx.position.set(0, 6, -34);
  bc.add(bbx);
  T.beacon(bc);
}
