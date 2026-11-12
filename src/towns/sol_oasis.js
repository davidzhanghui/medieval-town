import * as THREE from 'three';
import { solKit } from './sol_shared.js';

/* ============================================================
 *  枣椰绿洲 Palmira —— 王国西缘的歇脚地
 *
 *  一汪被枣椰环绕的水塘，塘边是商队的条纹帐篷和篝火；
 *  北岸一座土坯的小城寨（塔、院、箭窗）守着水源，
 *  水渠把塘水引到一块块枣椰园和麦地里。
 * ========================================================== */
export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, sphere } = K;
  const S = solKit(P, K);
  const { M } = S;

  const sandPatch = P.flat(0xb5a266, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  T.add(K.groundPatch(120, sandPatch, { segs: 44 }), 0, 0, 0, 0.03);
  // 绿洲内圈：草色
  T.add(K.groundPatch(58, P.flat(0x6a9a4a, 1, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), { segs: 40 }), 0, 4, 0, 0.05);

  /* 水塘 */
  {
    const pond = new THREE.Mesh(new THREE.CircleGeometry(22, 36), P.flat(0x3aa6b8, 0.12, { metalness: 0.4, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }));
    pond.rotation.x = -Math.PI / 2;
    pond.scale.y = 0.7;
    pond.position.set(0, 0.12, 6);
    pond.receiveShadow = true;
    T.root.add(pond);
    const rim = new THREE.Mesh(new THREE.RingGeometry(21.5, 24.5, 36), P.flat(0xa89a6a, 1, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    rim.rotation.x = -Math.PI / 2;
    rim.scale.y = 0.7;
    rim.position.set(0, 0.1, 6);
    T.root.add(rim);
    // 芦苇
    const reeds = [];
    for (let i = 0; i < 60; i++) {
      const a = rand() * 6.28;
      reeds.push({ x: Math.cos(a) * 22.5, y: 0.9, z: 6 + Math.sin(a) * 15.8, sx: 0.12, sy: 1.8, sz: 0.12, rz: (rand() - 0.5) * 0.2 });
    }
    T.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0x7a9a4a, 1), reeds), 0, 0);
    T.emitter({ x: 0, y: 0.6, z: 6, count: 18, life: 2.2, size: 0.5, color: 0xdff2f6, opacity: 0.18, spread: [14, 0.1, 9], vel: [0, 0.15, 0], jitter: [0.1, 0.05, 0.1], fadeIn: 0.3 });
  }

  /* 枣椰园 + 麦地 */
  const palmPts = [];
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * 6.28 + rand() * 0.1;
    const r = 28 + rand() * 20;
    palmPts.push([Math.cos(a) * r, 6 + Math.sin(a) * r * 0.82]);
  }
  for (let i = 0; i < 40; i++) {
    const a = rand() * 6.28, r = 55 + rand() * 40;
    palmPts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  T.add(S.palms(palmPts, rand, [0.9, 1.5]), 0, 0);
  {
    // 麦田：金黄色小块
    const fields = [];
    for (let i = 0; i < 5; i++) fields.push({ x: -34 + i * 16, y: 0.08, z: 40, sx: 12, sy: 0.06, sz: 14, color: [0xd8b84a, 0xc8aa40, 0xb89a38, 0xd8c060, 0xc4a444][i] });
    T.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0xffffff, 1), fields), 0, 0);
    // 水渠
    const canal = K.ribbon([[0, 20], [0, 34], [-20, 40], [-40, 40]], 1.6, M.water, 0.14);
    T.root.add(canal);
  }

  /* 商队营地：条纹钟形帐篷 */
  {
    const g = new THREE.Group();
    const makeTent = (c1, c2, s = 1) => {
      const t = new THREE.Group();
      const body = cyl(2.6 * s, 2.6 * s, 2.2 * s, 10, P.flat(c1, 1));
      body.position.y = 1.1 * s;
      t.add(body);
      const top = K.cone(2.9 * s, 2.6 * s, 10, P.flat(c2, 1));
      top.position.y = 3.4 * s;
      t.add(top);
      const door = box(1.1 * s, 1.7 * s, 0.1, M.dark, false);
      door.position.set(0, 0.9 * s, 2.55 * s);
      t.add(door);
      const pole = cyl(0.05, 0.07, 1.4 * s, 4, M.wood, false);
      pole.position.y = 5.2 * s;
      t.add(pole);
      return t;
    };
    const cols = [[0xe9e0c8, 0xc8452f], [0xe9e0c8, 0x1e8c92], [0xe0ac2e, 0xe9e0c8], [0xc8452f, 0xe9e0c8], [0x7a3a8a, 0xe9e0c8]];
    for (let i = 0; i < 7; i++) {
      const a = 3.5 + i * 0.42;
      const tent = makeTent(...cols[i % 5], 0.9 + (i % 3) * 0.12);
      tent.position.set(Math.cos(a) * 34, 0, 8 + Math.sin(a) * 26);
      tent.rotation.y = -a + Math.PI / 2 * 3;
      g.add(tent);
    }
    // 营火
    const fire = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const lg = cyl(0.1, 0.12, 1.2, 5, M.wood, false);
      lg.position.set(Math.cos(i) * 0.45, 0.2, Math.sin(i) * 0.45);
      lg.rotation.set(Math.sin(i) * 0.9, 0, Math.cos(i) * 0.9);
      fire.add(lg);
    }
    fire.position.set(-26, 0, 8);
    g.add(fire);
    // 骆驼与货包
    const camels = [];
    for (let i = 0; i < 6; i++) {
      const c = S.camel(1, 0xc9a066);
      c.position.set(-40 + (i % 3) * 5, 0, 22 + ((i / 3) | 0) * 5);
      c.rotation.y = rand() * 6.28;
      c.userData.keepSeparate = true;
      g.add(c);
      camels.push(c);
    }
    T.landmark(g, 0, 0, 0, {
      name: '商队营地 · The Caravan Camp',
      shortName: '商队营地',
      tag: '帐篷围成一个圈，圈里是火',
      desc: '西岸水塘边七顶条纹钟形帐篷围成半圈，圈心是一堆篝火；南边拴着六头骆驼，货包堆在帐篷之间。',
      detail: '商队在这里补水、歇脚、交换消息。规矩是：绿洲的水归所有人，但谁也不许在水塘里洗东西。违规的人要给全营地煮一天茶。',
    }, { dist: 64, height: 32, ty: 2, rot: -1.0, ox: -22, oz: 14 });
    T.glow(-26, 1.1, 8, { size: 6, light: true, gain: 1.2 });
    T.emitter({ x: -26, y: 1.0, z: 8, count: 24, life: 1.2, size: 0.26, color: 0xffb04a, opacity: 0.9, spread: [0.3, 0.1, 0.3], vel: [0, 1.6, 0], jitter: [0.35, 0.5, 0.35], gravity: -0.5, additive: true, fadeIn: 0.05, night: null });
    for (const c of camels) {
      const ph = rand() * 6;
      const neck = c.userData.neck;
      T.animate((dt, t) => { neck.rotation.x = Math.sin(t * 0.45 + ph) * 0.2 + 0.15; });
    }
  }

  /* 北岸土坯城寨 */
  {
    const g = new THREE.Group();
    const mud = P.wash(0xd0aa72);
    const W = 36, D = 30, H = 9;
    for (const [x, z, w, d] of [[0, -D / 2, W, 2.4], [-W / 2, 0, 2.4, D], [W / 2, 0, 2.4, D]]) {
      const m = box(w, H, d, mud);
      m.position.set(x, H / 2, z);
      g.add(m);
      const cr = box(w + 0.2, 0.9, d + 0.2, mud);
      cr.position.set(x, H + 0.45, z);
      g.add(cr);
    }
    for (const s of [-1, 1]) {
      const m = box((W - 7) / 2, H, 2.4, mud);
      m.position.set(s * ((W - 7) / 4 + 3.5), H / 2, D / 2);
      g.add(m);
    }
    const gate = S.archedWall(7, H + 1, 2.4, 1, M.sandL, { aw: 4, ah: 5.6, back: null });
    gate.position.set(0, 0, D / 2);
    g.add(gate);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const t = box(6.4, 15, 6.4, mud);
      t.position.set(sx * (W / 2), 7.5, sz * (D / 2));
      g.add(t);
      const cap = box(7.2, 1, 7.2, M.sandL);
      cap.position.set(sx * (W / 2), 15.5, sz * (D / 2));
      g.add(cap);
      const slits = [];
      for (let i = 0; i < 4; i++) slits.push({ x: sx * (W / 2) + (i - 1.5) * 1.3, y: 11, z: sz * (D / 2) + 3.25 * (sz > 0 ? 1 : -1), sx: 0.3, sy: 1.6, sz: 0.1 });
      g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.dark, slits));
    }
    // 院内：主屋 + 水井
    const keep = box(14, 11, 10, mud);
    keep.position.set(0, 5.5, -5);
    g.add(keep);
    const kd = K.dome(4, M.sandL, { squash: 0.8 });
    kd.position.set(0, 11, -5);
    g.add(kd);
    const well = cyl(1.4, 1.6, 1, 10, M.sandL);
    well.position.set(8, 0.5, 6);
    g.add(well);
    T.landmark(g, 0, -44, 0, {
      name: '绿洲城寨 · The Mud Fort',
      shortName: '城寨',
      tag: '用泥巴盖的城，守着一口水',
      desc: '三十六米宽的土坯方寨，四角是十五米高的方塔，墙顶一圈土坯垛口；正门是一道窄窄的马蹄拱，院里一栋带小圆顶的主屋和一口井。',
      detail: '土坯是泥、沙、草拌在一起晒干做的，夏天凉、冬天暖，但怕雨——所以每年雨季过后，全寨人都要上墙抹泥补缝，像给老房子换一层皮。',
    }, { dist: 62, height: 28, ty: 7, rot: 0.2 });
    // 守兵
    const gm = { helmet: 'kettle', weapon: 'spear', shield: false, tabard: 0xe0ac2e };
    for (const s of [-1, 1]) T.person(gm, s * 4.2, -44 + D / 2 + 3, 0, 'idle');
    T.walker({ ...gm, tabard: 0x1e8c92 }, [-16, -44 - D / 2], [16, -44 - D / 2], 0.5, 1, H + 1);
    T.walker({ ...gm, tabard: 0x1e8c92 }, [-W / 2, -44 - 12], [-W / 2, -44 + 12], 0.5, 1, H + 1);
  }

  /* 人 */
  for (let i = 0; i < 12; i++) {
    const a = rand() * 6.28;
    T.walker({ tabard: S.ROBES[(rand() * 7) | 0], helmet: 'hood', weapon: 'none', cape: rand() < 0.4 },
      [Math.cos(a) * 26, 6 + Math.sin(a) * 19], [Math.cos(a + 0.9) * 28, 6 + Math.sin(a + 0.9) * 20], 0.35 + rand() * 0.25);
  }
  for (let i = 0; i < 8; i++) T.person({ villager: true }, -34 + i * 9, 36 + (rand() - 0.5) * 8, rand() * 6, 'idle');
  for (let i = 0; i < 5; i++) T.person({ villager: true }, -28 + (rand() - 0.5) * 4, 8 + (rand() - 0.5) * 4, rand() * 6, 'idle');
  for (let i = 0; i < 6; i++) T.lamp(-26 + i * 10, 28, { h: 3 });
  T.birds({ count: 7, center: [0, 6], radius: 22, height: 12, color: 0xf0ece0, scale: 0.8 });

  T.overview({
    name: '枣椰绿洲 · Palmira',
    tag: '沙里的一块绿',
    desc: '王国西缘的绿洲：一汪被枣椰环绕的水塘，西岸商队的条纹帐篷和篝火，北岸的土坯城寨，南边是被水渠浇灌的金黄麦田。',
    detail: '地图上王国的边界往往不是线，是水：绿洲在谁手里，那一片的沙漠就属于谁。这口水塘从没干过，也从没有人敢独占。',
  }, { dist: 190, height: 100, rot: 0.2, cz: 6 });

  const bc = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const p = S.palms([[-8 + i * 5, 6 + (i % 2) * 4]], rand, [1.8, 2.4]);
    bc.add(p);
  }
  T.beacon(bc);
}
