import * as THREE from 'three';

/* ============================================================
 *  酒乡 Vintner's Vale
 *
 *  镇子背靠一面朝南的阳坡，坡被切成八层石砌的梯田，每层三行葡萄架。
 *  山脚是广场（中间一座喷泉）、钟楼教堂、榨酒坊和凿进山壁的酒窖；
 *  东边一条柏树大道通到带塔楼的酒庄；广场南边正在办采摘宴。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;

  const soil = P.flat(0x8a6240, 1);
  const wall = P.tint('stone', 0xcfc4ad);
  const ochre = (h) => P.wash(h);
  const terracotta = P.terracotta;
  const white = P.flat(0xffffff, 0.9);

  /* ---------- 地面：暖色的泥土 ---------- */
  const dirt = P.flat(0x86683f, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  T.add(K.groundPatch(62, dirt, { segs: 40 }), 0, 30, 0, 0.03);

  /* ================= 梯田葡萄园 ================= */
  const TERRACES = 8;
  const STEP = 2.4;
  const terraceTop = (i) => (i + 1) * STEP;
  const terraceZ = (i) => -34 - i * 9.2;
  const terraceLen = (i) => 150 - i * 11;
  const terraceCx = (i) => -6 + i * 3;
  {
    const g = new THREE.Group();
    const leafTones = [0x5a7a2e, 0x6a8a30, 0x7a8a2c, 0x8a8a2a, 0x9a7a28, 0x8a5a2a, 0x7a3a2a, 0x6a8a30];
    for (let i = 0; i < TERRACES; i++) {
      const L = terraceLen(i);
      const top = terraceTop(i);
      const z = terraceZ(i);
      const cx = terraceCx(i);
      // 台体（土）+ 正面石墙
      const body = box(L, top, 9.6, soil);
      body.position.set(cx, top / 2, z);
      g.add(body);
      const face = box(L + 0.4, STEP + 0.4, 0.7, wall);
      face.position.set(cx, top - STEP / 2 - 0.1, z + 4.9);
      g.add(face);
      // 墙顶压石
      const cap = box(L + 0.6, 0.22, 1.0, P.stoneLight);
      cap.position.set(cx, top + 0.1, z + 4.85);
      g.add(cap);
      // 两端的侧墙
      for (const s of [-1, 1]) {
        const sw = box(0.7, STEP + 0.4, 9.8, wall);
        sw.position.set(cx + (s * L) / 2, top - STEP / 2 - 0.1, z);
        g.add(sw);
      }

      // 葡萄架：每层三行；立柱每 4 米一根，行体是一条绿墙
      const rows = [-2.8, 0, 2.8];
      const posts = [];
      const grapes = [];
      for (const rz of rows) {
        for (let x = -L / 2 + 3; x <= L / 2 - 3; x += 4) {
          posts.push({ x: cx + x, y: top + 0.8, z: z + rz, sy: 1 });
        }
        for (let x = -L / 2 + 4; x <= L / 2 - 4; x += 2.1) {
          if (rand() < 0.55) grapes.push({ x: cx + x + rand(), y: top + 0.45, z: z + rz + rand.sign() * 0.45, s: rand.range(0.22, 0.34) });
        }
        const row = box(L - 5, 0.95, 0.95, P.flat(leafTones[i], 1));
        row.position.set(cx, top + 0.7, z + rz);
        g.add(row);
      }
      g.add(K.scatter(new THREE.BoxGeometry(0.12, 1.6, 0.12), P.wood, posts));
      g.add(K.scatter(new THREE.IcosahedronGeometry(1, 0), P.flat(0x4a2a5a, 0.6), grapes));
    }
    // 梯田间的石阶（从底层一路上到顶）
    for (let i = 0; i < TERRACES; i++) {
      const sx = terraceCx(i) - terraceLen(i) / 2 + 9;
      for (let k = 0; k < 4; k++) {
        const st = box(2.4, 0.6 * (k + 1), 0.6, P.stoneLight);
        st.position.set(sx, terraceTop(i) - STEP + 0.3 * (k + 1), terraceZ(i) + 5.4 + (3 - k) * 0.6 - 1.2);
        g.add(st);
      }
    }
    T.landmark(g, 0, 0, 0, {
      name: '梯田葡萄园 · Terraced Vineyards',
      shortName: '梯田',
      tag: '一百行葡萄',
      desc: '朝南的阳坡被切成八层石砌的台地，每层三行葡萄架，从山脚一直爬到坡顶；叶子从碧绿渐变到金黄再到酒红，藤下挂着一簇簇深紫的果串，台地间用窄石阶相连。',
      detail: '葡萄爱阳光、怕积水，所以修士们把山坡切成梯田：石墙白天吸热、夜里放热，让果子更甜，也防止雨水把土冲走。十一世纪以后，勃艮第的西多会修士一块地一块地地记录风味，才有了"产区"这个概念。',
    }, { dist: 130, height: 70, ty: 12, rot: -0.7 });
  }

  /* ================= 广场与喷泉 ================= */
  const PLAZA = { x: 0, z: 30 };
  {
    const sq = box(40, 0.14, 30, P.cobble, false);
    sq.position.set(PLAZA.x, 0.07, PLAZA.z);
    T.add(sq, 0, 0);
    // 喷泉：八角水池 + 立柱 + 上层水盘
    const f = new THREE.Group();
    const basin = cyl(3.4, 3.7, 0.9, 8, P.stoneLight);
    basin.position.y = 0.45;
    f.add(basin);
    const water = cyl(3.0, 3.0, 0.05, 16, P.water, false);
    water.position.y = 0.88;
    f.add(water);
    const pillar = cyl(0.5, 0.7, 2.6, 8, P.stoneLight);
    pillar.position.y = 1.9;
    f.add(pillar);
    const bowl = cyl(1.5, 0.8, 0.5, 12, P.stoneLight);
    bowl.position.y = 3.2;
    f.add(bowl);
    const bw = cyl(1.3, 1.3, 0.05, 12, P.water, false);
    bw.position.y = 3.46;
    f.add(bw);
    const top = sphere(0.35, P.stoneLight);
    top.position.y = 3.9;
    f.add(top);
    T.landmark(f, PLAZA.x, PLAZA.z, 0, {
      name: '广场喷泉 · Piazza Fountain',
      shortName: '喷泉',
      tag: '村里最凉快的地方',
      desc: '广场正中一座八角石池，立柱托着两层水盘，水从上盘溢到下盘，再漫进池里。正午的时候，全村的水桶都在这儿排队。',
      detail: '中世纪南欧的村镇几乎都围着一口井或一座喷泉：它既是饮水点，也是消息集散地。酿酒要用大量的水清洗桶和器具，所以酒乡的喷泉总是修得特别大。',
    }, { dist: 24, height: 12, ty: 2 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      T.lamp(PLAZA.x + Math.cos(a) * 15, PLAZA.z + Math.sin(a) * 11, { ry: a, h: 3.4, light: i === 1 });
    }
  }

  /* ================= 钟楼教堂 ================= */
  {
    const g = new THREE.Group();
    const nave = K.makeHouse(P, {
      w: 8.5, d: 15, floors: 1, floorH: 5.4, wall: ochre(0xeadcb8), base: wall, baseH: 0.7,
      roof: 'gable', roofMat: terracotta, pitch: 0.46, windows: 2, door: P.woodDark, chimney: false,
    });
    g.add(nave);
    // 钟楼（意式 campanile）：方塔 + 三层拱窗 + 方锥顶
    const tower = box(4.6, 21, 4.6, ochre(0xe6d4a8));
    tower.position.set(6.4, 10.5, -4.2);
    g.add(tower);
    for (const yy of [8, 13, 18]) {
      for (const s of [-1, 1]) {
        const a = box(1.0, 1.9, 0.2, P.dark, false);
        a.position.set(6.4 + s * 0.0, yy, -4.2 + 2.32);
        a.position.x += s * 0.9;
        g.add(a);
        const b = box(0.2, 1.9, 1.0, P.dark, false);
        b.position.set(6.4 + 2.32, yy, -4.2 + s * 0.9);
        g.add(b);
      }
    }
    const belfry = box(5.0, 0.5, 5.0, P.stoneLight);
    belfry.position.set(6.4, 21.2, -4.2);
    g.add(belfry);
    const cap = cone(3.6, 4.2, 4, terracotta);
    cap.rotation.y = Math.PI / 4;
    cap.position.set(6.4, 23.5, -4.2);
    g.add(cap);
    // 铜钟挂在横梁下，绕梁摆动（钟舌的撞击声没有，但能看见它在拱窗里晃）
    const bellPivot = new THREE.Group();
    bellPivot.position.set(6.4, 20.0, -4.2);
    const bell = cyl(0.35, 0.6, 0.8, 8, P.iron);
    bell.position.y = -1.0;
    bellPivot.add(bell);
    g.add(bellPivot);
    bellPivot.userData.keepSeparate = true;
    T.animate((dt, t) => {
      const ring = (t % 26) < 9;                          // 每 26 秒敲 9 秒
      const k = ring ? Math.sin(t * 5.2) * 0.55 * Math.min(1, (t % 26) / 1.2) * Math.min(1, (9 - (t % 26)) / 2) : 0;
      bellPivot.rotation.x = k;
      bellPivot.rotation.z = 0;
    });
    // 前廊台阶
    const stp = box(5, 0.4, 2, P.stoneLight);
    stp.position.set(0, 0.2, 8.6);
    g.add(stp);
    // 彩窗
    const rose = cyl(1.0, 1.0, 0.12, 14, T.TM.stainedGlass, false);
    rose.rotation.x = Math.PI / 2;
    rose.position.set(0, 5.6, 7.58);
    g.add(rose);
    T.landmark(g, -42, 26, 0.35, {
      name: '钟楼教堂 · Parish Church & Campanile',
      shortName: '钟楼教堂',
      tag: '收完最后一筐葡萄才敲钟',
      desc: '一座赭黄灰泥的小教堂，赤陶瓦的两坡顶，圆形彩窗对着广场；旁边立着一座二十一米高的方形钟楼，三层拱窗里挂着铜钟，方锥顶也是赤陶色。',
      detail: '葡萄酒对基督教有特殊意义：弥撒上的圣餐用酒代表基督的血，所以教会是欧洲最大的葡萄园主之一，也是最早系统酿酒的人。采摘季里，钟声就是命令——敲三下开工，敲两下收筐。',
    }, { dist: 46, height: 24, ty: 9, rot: 0.35 });
  }

  /* ================= 榨酒坊 ================= */
  {
    const g = new THREE.Group();
    const barn = K.makeHouse(P, {
      w: 12, d: 9.5, floors: 1, floorH: 5.2, wall: P.timber, base: wall, baseH: 0.8,
      roof: 'gable', roofMat: terracotta, pitch: 0.5, windows: 0, door: P.woodDark, chimney: false, over: 0.8,
    });
    g.add(barn);
    // 大门洞（敞开）
    const gate = box(4.0, 4.2, 0.2, P.dark, false);
    gate.position.set(0, 2.1, 4.8);
    g.add(gate);
    // 棚前的螺旋压榨机：木槽 + 两根立柱 + 横梁 + 大木螺杆 + 转杆
    const press = new THREE.Group();
    const trough = box(3.4, 0.7, 3.4, P.woodDark);
    trough.position.y = 0.35;
    press.add(trough);
    for (const sx of [-1, 1]) {
      const p = box(0.4, 4.2, 0.4, P.wood);
      p.position.set(sx * 1.6, 2.1, 0);
      press.add(p);
    }
    const beam = box(4, 0.5, 0.6, P.wood);
    beam.position.y = 4.1;
    press.add(beam);
    const screw = cyl(0.26, 0.26, 3.6, 8, P.woodDark);
    screw.position.y = 2.4;
    screw.userData.keepSeparate = true;
    press.add(screw);
    const plate = cyl(1.3, 1.3, 0.3, 10, P.wood);
    plate.position.y = 1.2;
    plate.userData.keepSeparate = true;
    press.add(plate);
    // 转杆一圈，螺杆和压板跟着一升一降
    T.animate((dt, t) => {
      const lift = 0.5 + 0.5 * Math.sin(t * 0.5);
      screw.rotation.y = Math.sin(t * 0.5) * 1.4;
      screw.position.y = 2.4 + lift * 0.0;
      plate.position.y = 1.0 + lift * 0.9;
    });
    // 转杆：整体绕 Y 转
    const bar = new THREE.Group();
    const barM = box(4.6, 0.22, 0.22, P.wood);
    bar.add(barM);
    bar.position.y = 3.6;
    bar.userData.keepSeparate = true;
    press.add(bar);
    // 汁液
    const must = cyl(1.4, 1.4, 0.05, 12, P.flat(0x5a1f3a, 0.3), false);
    must.position.y = 0.72;
    press.add(must);
    press.position.set(8.2, 0, 3.0);
    g.add(press);
    // 酒桶与葡萄筐
    const bs = K.barrelStack(P, { rows: 2, cols: 3 });
    bs.position.set(-8, 0, 3.2);
    g.add(bs);
    for (let i = 0; i < 4; i++) {
      const basket = cyl(0.5, 0.4, 0.6, 8, P.woodDark);
      basket.position.set(4 + i * 1.1, 0.3, 6.6 + (i % 2) * 0.5);
      g.add(basket);
      const gr = sphere(0.45, P.flat(0x4a2a5a, 0.6));
      gr.scale.y = 0.6;
      gr.position.set(4 + i * 1.1, 0.7, 6.6 + (i % 2) * 0.5);
      g.add(gr);
    }
    T.landmark(g, -62, -6, 0.2, {
      name: '榨酒坊 · Wine Press House',
      shortName: '榨酒坊',
      tag: '一年的汗水在这里变成汁',
      desc: '一座木筋大棚，赤陶瓦的低矮屋顶，门洞黑黝黝的。棚前的露天压榨机有一根粗得抱不拢的木螺杆，两个人推着横杆转，紫红的汁水顺着木槽淌进桶里；旁边堆着刚摘下的葡萄筐。',
      detail: '螺旋压榨机十三世纪前后在欧洲普及：转动螺杆，把木板压到葡萄上，一压就能榨出头道汁。第一道最好、第二道次之，最后压出来的渣要拿去蒸馏成烈酒。榨季里整个村子没日没夜轮班，因为汁放久了会氧化。',
    }, { dist: 36, height: 18, ty: 4, rot: 0.2 });
    // 转杆动画：需要把 bar 的世界位置对上；它在 landmark 的组里，动它自己的 rotation.y 即可
    T.animate((dt, t) => { bar.rotation.y = Math.sin(t * 0.5) * 1.4; });
  }

  /* ================= 酒窖（凿进最底层石墙） ================= */
  {
    const g = new THREE.Group();
    const frame = box(7.6, 5.6, 1.6, P.stoneLight);
    frame.position.set(0, 2.8, 0);
    g.add(frame);
    const arch = box(5.2, 4.4, 1.7, P.dark, false);
    arch.position.set(0, 2.2, 0.1);
    g.add(arch);
    const top = box(6.4, 0.9, 1.8, P.stoneLight);
    top.position.set(0, 4.7, 0.05);
    g.add(top);
    const door = box(1.4, 2.8, 0.2, P.woodDark);
    door.position.set(-1.0, 1.4, 0.9);
    door.rotation.y = 0.9;
    g.add(door);
    for (const s of [-1, 1]) {
      const b = K.barrelStack(P, { rows: 2, cols: 2 });
      b.position.set(s * 6.2, 0, 2.4);
      g.add(b);
    }
    // 品酒桌
    const tb = box(2.6, 0.12, 1.2, P.woodDark);
    tb.position.set(0, 1.0, 4.2);
    g.add(tb);
    for (const sx of [-1, 1]) {
      const lg = box(0.12, 1.0, 0.12, P.wood);
      lg.position.set(sx * 1.1, 0.5, 4.2);
      g.add(lg);
    }
    for (let i = 0; i < 3; i++) {
      const jug = cyl(0.14, 0.18, 0.4, 8, P.flat(0x7a4a2a, 0.8));
      jug.position.set(-0.8 + i * 0.8, 1.26, 4.2);
      g.add(jug);
    }
    T.landmark(g, -26, terraceZ(0) + 5.4, 0, {
      name: '酒窖 · The Cellar',
      shortName: '酒窖',
      tag: '十二度的黑暗',
      desc: '最底层的石墙上掏出一个拱形洞口，一扇橡木门半开着，洞里一直深到山肚子里；门两边码着空桶，门前摆着一张品酒桌，几只陶壶里还剩着半壶新酒。',
      detail: '酒需要陈放，而山洞是最好的酒窖：一年四季恒温在十二度上下，湿度也刚好。中世纪酒窖里的桶叫"butt"，一只能装五百多升；酒越陈价越高，所以最大的酒庄往往也是最大的地下建筑。',
    }, { dist: 30, height: 14, ty: 3, rot: 0 });
    T.glow(-26 - 2.2, 3.4, terraceZ(0) + 5.4 + 1.4, { color: 0xffa050, size: 2.4, light: true, gain: 0.5 });
  }

  /* ================= 酒庄（塔楼庄园）+ 柏树大道 ================= */
  {
    const g = new THREE.Group();
    const villa = K.makeHouse(P, {
      w: 20, d: 12, floors: 2, floorH: 3.6, wall: ochre(0xe9d49a), base: wall, baseH: 0.8,
      roof: 'hip', roofMat: terracotta, pitch: 0.4, windows: 5, door: P.woodDark, shutter: 0x4a6a3a, chimney: true, over: 0.8,
    });
    g.add(villa);
    T.smokeFrom(g, villa.userData.chimney);
    // 塔楼
    const tower = box(6.0, 14.5, 6.0, ochre(0xe3cb90));
    tower.position.set(-9, 7.2, -2);
    g.add(tower);
    const tcap = cone(5.2, 4.0, 4, terracotta);
    tcap.rotation.y = Math.PI / 4;
    tcap.position.set(-9, 16.5, -2);
    g.add(tcap);
    for (const yy of [10, 12.5]) {
      for (const s of [-1, 1]) {
        const w1 = box(0.9, 1.5, 0.2, P.dark, false);
        w1.position.set(-9 + s * 1.2, yy, 1.05);
        g.add(w1);
      }
    }
    // 前廊：一排方柱 + 平台
    const cols = [];
    for (let i = 0; i < 7; i++) cols.push({ x: -8.4 + i * 2.8, y: 1.8, z: 7.2 });
    g.add(K.scatter(new THREE.BoxGeometry(0.5, 3.4, 0.5), P.stoneLight, cols));
    const beam = box(18.4, 0.5, 2.2, P.timber);
    beam.position.set(0, 3.5, 6.6);
    g.add(beam);
    const terrace = box(19, 0.3, 3, P.stoneLight);
    terrace.position.set(0, 0.15, 6.8);
    g.add(terrace);
    // 院墙与门柱
    for (const s of [-1, 1]) {
      const post = box(1.0, 3.2, 1.0, P.stoneLight);
      post.position.set(s * 3, 1.6, 15);
      g.add(post);
    }
    const flag = K.banner(P, 0x6a1f3a, { h: 5, w: 1.1, len: 2.2 });
    flag.position.set(8.5, 7.6, 1);
    g.add(flag);

    T.landmark(g, 66, -6, -0.25, {
      name: '酒庄 · The Winery Estate',
      shortName: '酒庄',
      tag: '塔楼是用来看天的',
      desc: '坡脚东侧的大庄园：赭黄灰泥的二层楼，赤陶四坡顶，正面一排方柱撑起的前廊，西头一座十四米高的方塔；门柱前一条柏树夹道的白石路一直通到广场。',
      detail: '酒庄塔楼不是为防御，而是为了"看天"——酿酒人要盯着云的走向决定哪一天开摘：早一天糖分不够，晚一天可能赶上雨。庄园主常常是修道院的世俗代理或富裕的商人，酒是他们和城里人换银币的主要货。',
    }, { dist: 54, height: 26, ty: 7, rot: -0.25 });

    // 柏树大道：从庄园门口一路到广场东侧
    const cy = [];
    for (let i = 0; i < 12; i++) {
      for (const s of [-1, 1]) {
        const t = i / 11;
        cy.push({ x: 66 + (30 - 66) * t * 0.0 + s * 4.2 - 2 * t, y: 4.2, z: 8 + i * 4.4, sx: 1, sy: rand.range(0.85, 1.2), sz: 1 });
      }
    }
    T.add(K.scatter(new THREE.ConeGeometry(0.95, 8.4, 6), P.flat(0x2a4a2e, 1, { flatShading: true }), cy), 0, 0);
    T.add(K.ribbon([[63, 8], [62, 28], [58, 46], [40, 56], [24, 56]], 4.2, P.road, 0.05), 0, 0);
    // 薰衣草田
    const lav = [];
    for (let r = 0; r < 6; r++) lav.push({ x: 92, y: 0.35, z: -8 + r * 2.0, sx: 12, sy: 0.7, sz: 0.9 });
    T.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0x8a6ac0, 1), lav), 0, 0);
  }

  /* ================= 采摘宴：凉棚下的长桌 ================= */
  {
    const g = new THREE.Group();
    // 棚：八根立柱 + 横梁 + 葡萄藤顶
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) {
      const p = box(0.3, 3.6, 0.3, P.wood);
      p.position.set(sx * 7, 1.8, sz * 3.4);
      g.add(p);
    }
    for (const sz of [-1, 1]) {
      const b = box(14.6, 0.24, 0.3, P.wood);
      b.position.set(0, 3.6, sz * 3.4);
      g.add(b);
    }
    for (let i = 0; i < 8; i++) {
      const r = box(0.2, 0.2, 7.2, P.wood);
      r.position.set(-6.3 + i * 1.8, 3.72, 0);
      g.add(r);
    }
    const leaves = box(14.8, 0.32, 7.4, P.flat(0x5a7a2e, 1));
    leaves.position.set(0, 3.95, 0);
    g.add(leaves);
    // 两张长桌 + 长凳
    for (const sz of [-1.2, 1.2]) {
      const tb = box(12, 0.12, 1.1, P.woodDark);
      tb.position.set(0, 0.95, sz);
      g.add(tb);
      for (const sx of [-5, 0, 5]) {
        const lg = box(0.14, 0.95, 0.9, P.wood);
        lg.position.set(sx, 0.47, sz);
        g.add(lg);
      }
      for (const side of [-1, 1]) {
        const bn = box(12, 0.1, 0.4, P.wood);
        bn.position.set(0, 0.5, sz + side * 0.95);
        g.add(bn);
      }
    }
    // 酒壶、面包、葡萄盘
    const things = [];
    for (let i = 0; i < 14; i++) things.push({ x: -5.6 + i * 0.86, y: 1.2, z: (i % 2 ? 1.2 : -1.2) + rand.range(-0.2, 0.2), sx: 0.18, sy: 0.38, sz: 0.18 });
    g.add(K.scatter(new THREE.CylinderGeometry(1, 0.8, 1, 8), P.flat(0x7a4a2a, 0.8), things));
    const plates = [];
    for (let i = 0; i < 6; i++) plates.push({ x: -4.5 + i * 1.8, y: 1.08, z: (i % 2 ? 1.0 : -1.0), s: 0.28 });
    g.add(K.scatter(new THREE.IcosahedronGeometry(1, 0), P.flat(0x4a2a5a, 0.6), plates));
    // 悬挂的彩旗串
    for (let i = 0; i < 5; i++) {
      const fl = K.banner(P, [0x8a3a2a, 0xd0a040, 0x4a6a3a, 0x6a1f3a, 0x2f5a7a][i], { h: 2.2, w: 0.5, len: 0.9 });
      fl.position.set(-6 + i * 3, 3.7, 3.5);
      fl.rotation.z = Math.PI / 2;
      g.add(fl);
    }
    T.landmark(g, 28, 62, 0, {
      name: '采摘宴 · Harvest Feast',
      shortName: '采摘宴',
      tag: '收完最后一筐，全村一起吃',
      desc: '广场南头搭起一座葡萄藤顶的凉棚，两张十几米长的桌子摆满了陶壶、面包和一盘盘紫葡萄，长凳边坐满了人，棚梁上挂着一串彩色三角旗。',
      detail: '收葡萄的最后一天叫"收筐宴"：庄园主出酒，农户出菜，雇工和主人同桌——这是一年里唯一不分身份的一餐。歌唱、跳舞、赤脚踩葡萄，常常闹到天亮；很多现在欧洲的酒节，就是这样一代代传下来的。',
    }, { dist: 32, height: 16, ty: 2, rot: 0 });
    T.glow(28 - 4, 3.2, 62, { color: 0xffb060, size: 4, light: true, gain: 0.6 });
    T.glow(28 + 4, 3.2, 62, { color: 0xffb060, size: 4 });
  }

  /* ================= 民居与街巷 ================= */
  {
    // 东西向主街 + 通往酒庄、教堂、榨坊的小路
    T.add(K.ribbon([[-90, 42], [-50, 46], [-10, 52], [30, 52], [80, 44]], 5, P.road, 0.045), 0, 0);
    T.add(K.ribbon([[-62, 4], [-52, 18], [-42, 34], [-34, 46]], 3.2, P.road, 0.045), 0, 0);
    T.add(K.ribbon([[0, 52], [-2, 64], [-6, 90]], 4, P.road, 0.045), 0, 0);

    const washes = [0xe8c88a, 0xdca06a, 0xe4d2a8, 0xcf8a6a, 0xe6b68a, 0xd8c090];
    const taken = [
      { x: PLAZA.x, z: PLAZA.z, r: 24 }, { x: -42, z: 26, r: 18 }, { x: -62, z: -6, r: 16 }, { x: 66, z: -6, r: 24 },
      { x: 28, z: 62, r: 18 }, { x: -26, z: -26, r: 12 },
    ];
    let placed = 0;
    let guard = 0;
    while (placed < 22 && guard < 700) {
      guard++;
      const x = rand.range(-96, 96);
      const z = rand.range(26, 100);
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r)) continue;
      if (Math.abs(z - (46 + (x + 50) * 0.02)) < 6) continue;    // 别压到主街
      if (Math.abs(x + 3 * (z - 52) / 20) < 4 && z > 56) continue;
      const wide = rand.range(5.4, 7.6);
      T.house({
        w: wide, d: rand.range(5, 6.4), floors: rand() < 0.5 ? 2 : 1, floorH: 2.7,
        wall: ochre(rand.pick(washes)), base: wall, baseH: 0.5,
        roof: 'gable', roofMat: terracotta, pitch: 0.46, windows: 2, shutter: rand.pick([0x4a6a3a, 0x6a2f2f, 0x2f5a7a, 0x5a3a2a]),
        chimney: rand() < 0.6, over: 0.5,
      }, x, z, (z < 46 ? 0 : Math.PI) + rand.range(-0.15, 0.15));
      taken.push({ x, z, r: 9 });
      placed++;
    }
    // 橄榄树
    const ol = K.ringPoints(rand, 0, 50, 70, 110, 22, (x, z) => taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r));
    T.add(K.grove(P, 'oak', ol, { leaf: 0x8a9a6a, trunk: 0x6a5a40, scale: [0.6, 0.9], rand }), 0, 0);
    // 路灯
    for (let x = -70; x <= 70; x += 28) T.lamp(x, 50, { ry: Math.PI, h: 3.2, light: x === -14 });
  }

  /* ================= 居民 ================= */
  {
    // 梯田里干活的人
    for (let i = 0; i < 6; i++) {
      const ti = 1 + (i % 6);
      const L = terraceLen(ti);
      const z = terraceZ(ti) + 4.1 + (i % 2) * -1.2;
      const x0 = terraceCx(ti) - L / 2 + 10;
      const rec = T.walker({ tabard: [0x8a3a2a, 0x7a6a3a, 0x5a4a38][i % 3], helmet: 'hood' }, [x0 + i * 4, z], [x0 + 40 + i * 4, z], 0.5, 1, terraceTop(ti));
    }
    // 广场与街上
    T.walker({ villager: true }, [-10, 30], [12, 40], 0.5);
    T.walker({ villager: true }, [20, 46], [-30, 48], 0.55);
    for (let i = 0; i < 8; i++) T.person({ villager: true }, rand.range(-14, 14), rand.range(22, 40), rand() * 6, 'idle');
    // 宴席上的人
    for (let i = 0; i < 8; i++) {
      T.person({ tabard: [0x8a3a2a, 0xd0a040, 0x4a6a3a, 0x6a1f3a][i % 4], helmet: 'none' }, 28 - 5 + i * 1.4, 62 + (i % 2 ? 2.3 : -2.3), i % 2 ? Math.PI : 0, 'idle');
    }
  }

  /* ================= 生气：水柱、滴汁、落叶、鸽子、牛车、旗、蝴蝶 ================= */
  {
    // 喷泉：顶上喷出的水柱 + 水盘溢出的细流 + 池面一圈圈涟漪
    T.emitter({ x: PLAZA.x, y: 3.9, z: PLAZA.z, count: 70, life: 1.4, size: 0.34, color: 0xdff2fb, opacity: 0.95,
      spread: [0.08, 0.05, 0.08], vel: [0, 5.4, 0], jitter: [0.95, 0.8, 0.95], gravity: 9, fadeIn: 0.02 });
    T.emitter({ x: PLAZA.x, y: 3.5, z: PLAZA.z, count: 24, life: 0.8, size: 0.16, color: 0xcfeaf8, opacity: 0.8,
      spread: [1.2, 0.02, 1.2], vel: [0, 0.2, 0], jitter: [0.5, 0.1, 0.5], gravity: 6, fadeIn: 0.05 });
    const rippleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
    const ripples = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 24), rippleMat.clone());
      r.rotation.x = -Math.PI / 2;
      r.userData.keepSeparate = true;
      T.add(r, PLAZA.x, PLAZA.z, 0, 0.92);
      r.rotation.x = -Math.PI / 2;
      ripples.push(r);
    }
    T.animate((dt, t) => {
      ripples.forEach((r, i) => {
        const k = ((t * 0.35 + i / 3) % 1);
        r.scale.setScalar(0.5 + k * 2.6);
        r.material.opacity = (1 - k) * 0.42;
      });
    });

    // 榨酒机：紫红的汁水从槽口滴下去
    const pr = K.toWorld(-62, -6, 0.2)(8.2, 3.0);
    T.emitter({ x: pr.x, y: 1.0, z: pr.z, count: 20, life: 0.7, size: 0.13, color: 0x7a1f4a, opacity: 0.95,
      spread: [1.3, 0.03, 1.3], vel: [0, 0.9, 0], jitter: [0.2, 0.3, 0.2], gravity: 5, fadeIn: 0.03 });

    // 梯田上空飘落的叶子：绿、金、酒红三色，被风斜着吹
    for (const [c, n] of [[0x7a8a2c, 40], [0xd9a020, 46], [0xb8322a, 40]]) {
      T.emitter({ x: 0, y: 12, z: -66, count: n, life: 7, size: 0.2, color: c, opacity: 0.95,
        spread: [78, 7, 34], vel: [0.35, -0.5, 0.08], jitter: [0.25, 0.12, 0.25], wind: [0.04, 0, 0.01], fadeIn: 0.05, night: 'day' });
    }

    // 钟楼上空与广场的鸽子
    T.birds({ count: 8, center: [-42, 26], radius: 16, height: 24, color: 0xf2efe6, scale: 0.7 });

    // 塔楼顶的风旗（庄园塔楼 (-9,-2) 局部，高 14.5 + 塔尖 4）
    const vt = K.toWorld(66, -6, -0.25)(-9, -2);
    const mast = cyl(0.08, 0.08, 3.4, 5, P.iron);
    T.add(mast, vt.x, vt.z, 0, 18.4);
    T.flag(vt.x, 19.6, vt.z, { w: 3.2, h: 1.6, color: 0x6a1f3a, ry: 0.6 });

    // 薰衣草田上的蝴蝶（只在白天）
    T.emitter({ x: 92, y: 1.6, z: -2, count: 14, life: 4.5, size: 0.28, color: 0xf0d070, opacity: 0.95,
      spread: [7, 1.2, 6], vel: [0.2, 0.05, 0.1], jitter: [0.7, 0.35, 0.7], fadeIn: 0.2, night: 'day' });

    // 酒桶牛车：沿主街来回，车轮转、牛腿迈，到头停一停掉头
    const cart = new THREE.Group();
    const bed = box(3.2, 0.28, 1.9, P.wood);
    bed.position.set(0, 1.0, 0);
    cart.add(bed);
    for (const bx of [-0.85, 0.85]) {
      const brl = cyl(0.62, 0.62, 1.3, 10, P.woodDark);
      brl.rotation.x = Math.PI / 2;
      brl.position.set(bx, 1.75, 0);
      cart.add(brl);
      const band = cyl(0.65, 0.65, 0.1, 10, P.iron);
      band.rotation.x = Math.PI / 2;
      band.position.set(bx, 1.75, 0.35);
      cart.add(band);
    }
    const wheels = [];
    for (const wz of [-1.0, 1.0]) {
      const w = new THREE.Group();
      const disc = cyl(0.72, 0.72, 0.12, 12, P.woodDark);
      disc.rotation.x = Math.PI / 2;
      w.add(disc);
      const spoke = box(1.4, 0.1, 0.14, P.wood);
      w.add(spoke);
      const spoke2 = box(0.1, 1.4, 0.14, P.wood);
      w.add(spoke2);
      w.position.set(-0.4, 0.72, wz);
      w.userData.keepSeparate = true;
      cart.add(w);
      wheels.push(w);
    }
    for (const sz of [-0.5, 0.5]) {
      const shaft = box(2.6, 0.1, 0.12, P.wood);
      shaft.position.set(2.9, 1.1, sz);
      cart.add(shaft);
    }
    const ox = new THREE.Group();
    const oxMat = P.flat(0x7a5a3a, 0.9);
    const oxBody = box(1.9, 0.95, 0.9, oxMat);
    oxBody.position.set(0, 1.35, 0);
    ox.add(oxBody);
    const head = box(0.7, 0.55, 0.55, oxMat);
    head.position.set(1.25, 1.55, 0);
    ox.add(head);
    for (const hz of [-1, 1]) {
      const horn = box(0.1, 0.4, 0.1, P.flat(0xe8e0c8, 0.7));
      horn.position.set(1.2, 1.95, hz * 0.28);
      horn.rotation.z = -0.4;
      ox.add(horn);
    }
    const legs = [];
    for (const [lx, lz] of [[0.7, -0.3], [0.7, 0.3], [-0.7, -0.3], [-0.7, 0.3]]) {
      const lg = new THREE.Group();
      const leg = box(0.2, 0.95, 0.2, oxMat);
      leg.position.y = -0.47;
      lg.add(leg);
      lg.position.set(lx, 0.95, lz);
      lg.userData.keepSeparate = true;
      ox.add(lg);
      legs.push(lg);
    }
    ox.position.set(4.6, 0, 0);
    cart.add(ox);
    T.dynamic(cart);
    const CART = { x0: -72, x1: 70, z: 49.2, x: -72, dir: 1, wait: 0 };
    T.add(cart, CART.x, CART.z, 0, 0.05);
    T.animate((dt, t) => {
      if (CART.wait > 0) {
        CART.wait -= dt;
        for (const l of legs) l.rotation.z = 0;
        return;
      }
      const v = 1.9;
      CART.x += CART.dir * v * dt;
      if (CART.x > CART.x1 || CART.x < CART.x0) {
        CART.dir *= -1;
        CART.x = THREE.MathUtils.clamp(CART.x, CART.x0, CART.x1);
        CART.wait = 4;
        cart.rotation.y = CART.dir > 0 ? 0 : Math.PI;
      }
      cart.position.x = CART.x;
      for (const w of wheels) w.rotation.z -= (v * dt) / 0.72;
      legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 4.2 + (i % 2 ? Math.PI : 0)) * 0.45; });
      cart.position.y = 0.05 + Math.abs(Math.sin(t * 4.2)) * 0.03;
    });
  }

  /* ================= 信标：一叠梯田的剪影 ================= */
  {
    const bg = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const b = box(110 - i * 14, 2.4, 9, i % 2 ? P.flat(0x6a8a30, 1) : soil);
      b.position.set(-6 + i * 3, 1.2 + i * 2.4, -34 - i * 9.2);
      bg.add(b);
    }
    T.beacon(bg);
  }

  T.overview({
    name: '酒乡 · Vintner’s Vale',
    tag: '阳坡上的一百行葡萄',
    desc: '西南群山脚下一面朝阳的大坡，被石墙切成八层梯田，葡萄藤从绿爬到金再爬到酒红；山脚是赤陶瓦的小镇，广场上一座喷泉，钟楼的影子每天扫过整座榨酒坊。',
    detail: '中世纪的酒不是奢侈品，而是日用品：水不干净，喝了会病，酒（和啤酒）才是安全的饮料；连小孩子也喝兑水的淡酒。所以"酒乡"是地图上最稳的地方——庄稼歉收可以买粮，没有酒，整个冬天都难熬。',
  }, { cx: 0, cz: 10, dist: 190, height: 90, rot: -0.7 });
}
