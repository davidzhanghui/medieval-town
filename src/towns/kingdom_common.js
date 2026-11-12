import * as THREE from 'three';

/* ============================================================
 *  新王国的通用骨架：一座"王城"（方形城墙 + 角塔 + 正门 + 主殿 + 庭院）
 *  和一座"王镇"（广场 + 中心物 + 大厅 + 客栈 + 工坊 + 民居 + 摊位）。
 *
 *  各王国只提供 cfg：材质、零件工厂函数和文案，骨架负责布局、
 *  登记地标、放人与牲畜、挂旗与灯、总览入口与远景信标。
 *  布局坐标与琥珀王国一致（正门朝 +Z）。
 * ========================================================== */

const cfgRand = (T) => T.rand;

function ground(T, K, P, hex, R) {
  T.add(K.groundPatch(R, P.flat(hex, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { segs: 48 }), 0, 0, 0, 0.03);
}

/** 王城 */
export function buildCastleSite(T, cfg) {
  const { K, P, rand } = T;
  const { box } = K;
  const WX = cfg.WX ?? 56, WZ = cfg.WZ ?? 48, WH = cfg.WH ?? 9.5, TH = cfg.TH ?? 3.2;
  const PZ = cfg.PZ ?? -14;
  ground(T, K, P, cfg.ground, cfg.groundR ?? 150);

  /* 城墙 + 角塔 */
  {
    const g = new THREE.Group();
    const walls = [
      { x: 0, z: -WZ, len: WX * 2, ry: 0 },
      { x: 0, z: WZ, len: WX * 2, ry: 0, gate: true },
      { x: -WX, z: 0, len: WZ * 2, ry: Math.PI / 2 },
      { x: WX, z: 0, len: WZ * 2, ry: Math.PI / 2 },
    ];
    const gateGap = cfg.gateGap ?? 9;
    for (const w of walls) {
      const segs = w.gate ? [[-WX + 4, -gateGap], [gateGap, WX - 4]] : [[-w.len / 2 + 4, w.len / 2 - 4]];
      for (const [a, b] of segs) {
        const len = b - a;
        const p = new THREE.Group();
        const m = box(len, WH, TH, cfg.wallMat);
        m.position.y = WH / 2;
        p.add(m);
        if (cfg.wallTop) { const top = cfg.wallTop(len); top.position.y = WH; p.add(top); }
        const cx = (a + b) / 2;
        if (w.ry) p.position.set(w.x, 0, w.z + cx); else p.position.set(w.x + cx, 0, w.z);
        p.rotation.y = w.ry;
        g.add(p);
      }
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const t = cfg.tower();
      t.position.set(sx * WX, 0, sz * WZ);
      g.add(t);
    }
    T.landmark(g, 0, 0, 0, cfg.text.walls, { dist: 125, height: 60, ty: 12, rot: 0.35 });
  }

  /* 正门 */
  {
    const g = cfg.gate();
    T.landmark(g, 0, WZ, 0, cfg.text.gate, { dist: 50, height: 17, ty: 7, rot: 0 });
  }

  /* 主殿 */
  {
    const g = cfg.keep();
    T.landmark(g, 0, PZ, 0, cfg.text.keep, { dist: 105, height: 52, ty: 14, rot: 0.2 });
  }

  /* 庭院（从主殿前到正门） */
  {
    const g = cfg.court(T);
    T.landmark(g, 0, 22.5, 0, cfg.text.court, { dist: 52, height: 30, ty: 3, rot: 0.3 });
  }

  /* 配楼：左右各一座（骆驼厩 / 龙舟棚 / 工坊 …） */
  if (cfg.annex) {
    const g = cfg.annex(T);
    T.landmark(g, -34, 24, Math.PI, cfg.text.annex, { dist: 38, height: 15, ty: 2, rot: Math.PI });
  }
  if (cfg.barracks) for (let i = 0; i < 4; i++) cfg.barracks(T, 36 + (i % 2) * 9, -36 + ((i / 2) | 0) * 7);

  /* 旗、灯 */
  const [c1, c2] = cfg.flags;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    T.flag(sx * WX, cfg.flagY ?? 31, sz * WZ, { w: 4.2, h: 2.2, color: sz > 0 ? c1 : c2, ry: sx > 0 ? 0.3 : 2.8, wind: 1.1 });
  }
  T.flag(0, cfg.keepFlagY ?? 51, PZ, { w: 4.8, h: 2.6, color: c1, ry: 0.1, wind: 1.2 });
  for (let i = 0; i < 6; i++) T.lamp(-24 + i * 9.6, 40, { h: 3.6, light: i === 0 || i === 5, gain: 0.5 });
  for (let i = 0; i < 5; i++) T.lamp(-20 + i * 10, -1, { h: 3.6 });

  /* 人 */
  const gm = { helmet: cfg.helmet ?? 'kettle', weapon: cfg.weapon ?? 'spear', shield: !!cfg.shield };
  const [t1, t2] = cfg.tabards ?? [c1, c2];
  T.walker({ ...gm, tabard: t1 }, [-48, WZ], [-12, WZ], 0.8, 1.0, WH);
  T.walker({ ...gm, tabard: t2 }, [12, WZ], [48, WZ], 0.8, 1.0, WH);
  T.walker({ ...gm, tabard: t1 }, [-WX, -40], [-WX, 40], 0.7, 1.0, WH);
  T.walker({ ...gm, tabard: t2 }, [WX, 40], [WX, -40], 0.7, 1.0, WH);
  T.walker({ ...gm, tabard: t1 }, [-48, -WZ], [48, -WZ], 0.8, 1.0, WH);
  for (const s of [-1, 1]) T.person({ ...gm, tabard: t2, helmet: 'great', weapon: 'halberd' }, s * 4.4, WZ + 3.5, 0, 'idle', 1.05);
  for (const s of [-1, 1]) T.person({ ...gm, tabard: t1, helmet: 'great', weapon: 'halberd' }, s * 7, PZ + 15.5, 0, 'idle', 1.05);
  const robes = cfg.robes;
  for (let i = 0; i < 8; i++) {
    const a = [-26 + rand() * 20, 8 + rand() * 30];
    const b = [a[0] + (rand() < 0.5 ? 14 : -14) * (0.5 + rand() * 0.8), a[1] + (rand() - 0.5) * 6];
    T.walker({ tabard: robes[(rand() * robes.length) | 0], helmet: 'hood', weapon: 'none', cape: true }, a, [Math.max(-30, Math.min(30, b[0])), b[1]], 0.45 + rand() * 0.2);
  }
  for (let i = 0; i < 8; i++) T.person({ villager: true }, -26 + (i % 4) * 17 + rand() * 4, 12 + ((i / 4) | 0) * 14 + rand() * 4, rand() * 6, 'idle');
  T.birds({ count: 9, center: [0, PZ], radius: 28, height: 40, color: cfg.birdColor ?? 0xf2ece0, scale: cfg.birdScale ?? 0.8 });

  if (cfg.extra) cfg.extra(T);

  T.overview(cfg.text.overview, { dist: 230, height: 130, rot: 0.2 });
  T.beacon(cfg.beacon());
}

/** 王镇 */
export function buildTownSite(T, cfg) {
  const { K, P, rand } = T;
  const { box } = K;
  ground(T, K, P, cfg.ground, cfg.groundR ?? 150);
  const PLAZA = { w: 44, d: 34 };

  /* 广场：铺装 + 中心物 + 摊位 */
  {
    const g = new THREE.Group();
    const pv = box(PLAZA.w, 0.14, PLAZA.d, cfg.paving, false);
    pv.position.y = 0.07;
    g.add(pv);
    g.add(cfg.centerpiece(T));
    const row = (z, face) => {
      for (let i = 0; i < 6; i++) {
        const st = cfg.stall(T, rand, i);
        st.position.set(-17 + i * 6.8, 0, z);
        st.rotation.y = face;
        g.add(st);
      }
    };
    row(-PLAZA.d / 2 + 3, 0);
    row(PLAZA.d / 2 - 3, Math.PI);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
      const st = cfg.stall(T, rand, i + 6);
      st.position.set(s * (PLAZA.w / 2 - 3), 0, -8 + i * 8);
      st.rotation.y = -s * Math.PI / 2;
      g.add(st);
    }
    if (cfg.plazaProps) cfg.plazaProps(T, g);
    T.landmark(g, 0, 0, 0, cfg.text.plaza, { dist: 62, height: 38, ty: 2, rot: 0.2 });
    if (cfg.centerFx) cfg.centerFx(T);
  }
  /* 大厅（北） */
  T.landmark(cfg.hall(T), 0, -34, 0, cfg.text.hall, { dist: 70, height: 36, ty: 12, rot: 0.15 });
  /* 客栈（东） */
  T.landmark(cfg.inn(T), 44, -4, -Math.PI / 2, cfg.text.inn, { dist: 66, height: 38, ty: 2, rot: -Math.PI / 2 });
  /* 工坊（西） */
  T.landmark(cfg.craft(T), -48, -6, Math.PI / 2, cfg.text.craft, { dist: 44, height: 24, ty: 4, rot: Math.PI / 2 });

  /* 民居 */
  const keepOut = [{ x: 0, z: 0, r: 34 }, { x: 0, z: -34, r: 26 }, { x: 44, z: -4, r: 30 }, { x: -48, z: -6, r: 22 }];
  const homes = [];
  const free = (x, z, r) => {
    for (const k of keepOut) if (Math.hypot(x - k.x, z - k.z) < k.r + r) return false;
    for (const h of homes) if (Math.hypot(x - h.x, z - h.z) < h.r + r) return false;
    return true;
  };
  let tries = 0;
  const NH = cfg.houseN ?? 52;
  while (homes.length < NH && tries++ < 3000) {
    const a = rand() * Math.PI * 2, r = 38 + rand() * 76;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.85;
    if (!free(x, z, 5.2)) continue;
    homes.push({ x, z, r: 5.2 });
    cfg.house(T, rand, x, z, Math.atan2(-x, -z) + (rand() - 0.5) * 0.35);
  }

  /* 树、灯 */
  const trees = K.ringPoints(rand, 0, 0, 100, 135, 40, (x, z) => !free(x, z, 3));
  cfg.trees(T, trees);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    T.lamp(Math.cos(a) * 24, Math.sin(a) * 18, { h: 3.6, light: i % 4 === 0, gain: 0.5 });
  }
  for (const [sx, sz] of [[-30, -20], [30, 18], [-22, 24]]) T.glow(sx, 2, sz, { size: 1.6, color: cfg.glow ?? 0xffb060 });

  /* 人与牲畜 */
  const robes = cfg.robes;
  const folk = () => ({ tabard: robes[(rand() * robes.length) | 0], helmet: rand() < 0.6 ? 'hood' : 'none', weapon: 'none', cape: rand() < 0.4 });
  for (let i = 0; i < 18; i++) T.person({ villager: true }, -17 + (i % 6) * 6.8 + 0.4, (i < 6 ? -14 : i < 12 ? 14 : -4) + 1.6 * (i < 6 ? 1 : -1), i < 6 ? Math.PI : 0, 'idle');
  for (let i = 0; i < 20; i++) T.walker(folk(), [-18 + rand() * 36, -11 + rand() * 22], [-18 + rand() * 36, -11 + rand() * 22], 0.4 + rand() * 0.3);
  for (let i = 0; i < 16; i++) {
    const h = homes[(rand() * homes.length) | 0];
    if (!h) continue;
    T.walker(folk(), [h.x, h.z + 5], [h.x + (rand() - 0.5) * 24, h.z + 5 + (rand() - 0.5) * 12], 0.5 + rand() * 0.2);
  }
  if (cfg.animal) {
    for (let i = 0; i < (cfg.animalN ?? 12); i++) {
      const an = cfg.animal();
      const a = rand() * 6.28;
      an.group.userData.keepSeparate = true;
      T.add(an.group, Math.cos(a) * (96 + rand() * 20), Math.sin(a) * (80 + rand() * 20), rand() * 6.28);
      const ph = rand() * 6;
      if (an.head) T.animate((dt, t) => { an.head.rotation.x = 0.45 + Math.sin(t * 0.42 + ph) * 0.3; });
    }
  }
  if (cfg.extra) cfg.extra(T, homes);
  for (const [x, z, c] of [[-20, -16, cfg.flags[0]], [20, -16, cfg.flags[1]], [-20, 16, cfg.flags[1]], [20, 16, cfg.flags[0]]]) {
    const pole = K.cyl(0.08, 0.1, 7, 6, P.woodDark);
    pole.position.set(x, 3.5, z);
    T.root.add(pole);
    T.flag(x, 6.4, z, { w: 3.2, h: 1.8, color: c, ry: 0.3, wind: 1.0 });
  }
  T.birds({ count: 8, center: [0, -34], radius: 22, height: 28, color: cfg.birdColor ?? 0xf0ece0, scale: 0.8 });
  T.overview(cfg.text.overview, { dist: 220, height: 120, rot: 0.2 });
  T.beacon(cfg.beacon());
}
