import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  学者镇 Scholarium
 *
 *  世界最西边的"书之城"：一座哥特式大图书馆居中，旁边是方形回廊，
 *  东南是一座顶着浑天仪的天文台，西边的钟楼里是齿轮的机械钟；
 *  再往外是药草园、缮写室、三座学寮的方庭和一条穿镇而过的运河。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;

  const stone = P.tint('stone', 0xcfc7b4);
  const stoneL = P.tint('stone', 0xe0d8c6);
  const stoneD = P.tint('stone', 0x9a9486);
  const slate = P.tint('slate', 0x5e6672);
  const glass = T.TM.stainedGlass;
  const bronze = T.TM.bronze;

  const lawn = P.flat(0x4f7a38, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  T.add(K.groundPatch(130, lawn, { segs: 44 }), 0, 20, 0, 0.03);

  /* ================= 大图书馆 ================= */
  {
    const g = new THREE.Group();
    const nave = K.makeHouse(P, {
      w: 14, d: 34, floors: 1, floorH: 10, wall: stone, base: stoneD, baseH: 1.0,
      roof: 'gable', roofMat: slate, pitch: 0.55, windows: 0, door: P.woodDark, chimney: false, over: 0.6,
    });
    nave.rotation.y = Math.PI / 2;     // 长轴沿 X
    g.add(nave);
    // 两侧各七扇尖拱高窗 + 扶壁
    const gw = [];
    const bt = [];
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) {
      gw.push({ x: -14.2 + i * 4.7, y: 6.6, z: s * 7.05, sx: 1.5, sy: 6.2, sz: 0.2 });
      bt.push({ x: -14.2 + i * 4.7 + 2.35, y: 6, z: s * 7.5, sx: 0.8, sy: 12, sz: 1.0 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), glass, gw));
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), stoneL, bt));
    // 窗顶的尖拱：小三角
    const tips = [];
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) tips.push({ x: -14.2 + i * 4.7, y: 10.0, z: s * 7.1, sx: 1.5, sy: 1.4, sz: 0.2 });
    g.add(K.scatter(new THREE.ConeGeometry(0.75, 1, 3), glass, tips.map((t) => ({ ...t, ry: 0, rz: 0 }))));

    // 十字交叉处的八角塔 + 尖顶
    const oct = cyl(5.0, 5.4, 12, 8, stone);
    oct.position.set(0, 15, 0);
    g.add(oct);
    const octWin = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      octWin.push({ x: Math.cos(a) * 5.0, y: 17, z: Math.sin(a) * 5.0, ry: -a, sx: 0.25, sy: 4, sz: 1.5 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), glass, octWin));
    const spire = cone(5.2, 14, 8, slate);
    spire.position.set(0, 28, 0);
    g.add(spire);
    const fin = box(0.14, 2.4, 0.14, bronze);
    fin.position.set(0, 36.2, 0);
    g.add(fin);
    const finB = sphere(0.4, bronze);
    finB.position.set(0, 35.2, 0);
    g.add(finB);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pin = cone(0.5, 2.0, 4, stoneL);
      pin.position.set(Math.cos(a) * 5.0, 21.4, Math.sin(a) * 5.0);
      g.add(pin);
    }
    // 正面（南）：大门 + 玫瑰窗
    const door = box(3.4, 5.4, 0.4, P.woodDark);
    door.position.set(0, 2.9, 7.2);
    g.add(door);
    const rose = cyl(2.1, 2.1, 0.2, 18, glass, false);
    rose.rotation.x = Math.PI / 2;
    rose.position.set(0, 10, 7.2);
    g.add(rose);
    // 门前台阶与两侧铜灯
    for (let i = 0; i < 4; i++) {
      const st = box(8 - i * 0.6, 0.3, 1.6, stoneL);
      st.position.set(0, 0.15 + i * 0.28, 8.8 - i * 0.7);
      g.add(st);
    }
    T.landmark(g, 0, -30, 0, {
      name: '大图书馆 · The Great Library',
      shortName: '图书馆',
      tag: '把世界抄进书里',
      desc: '三十四米长的哥特式大厅：两侧各七扇尖拱高窗，窗间是石扶壁；十字交叉处立着一座八角塔，板岩尖顶高过三十米，顶尖一枚铜球。正面大门上方是一扇直径四米的玫瑰窗，到了夜里彩光透出来，照亮整个广场。',
      detail: '中世纪的书都是手抄的：一本《圣经》要用两百张羊皮，抄一年。所以大图书馆里的书是用链子拴在桌上的——它们比骑士的剑还贵。十三世纪起，大学兴起，图书馆开始向学生开放，这才有了"借阅"这件事；但借出去的书必须留下抵押金，数额通常是书价的两倍。',
    }, { dist: 74, height: 38, ty: 14, rot: 0.2 });
    T.glow(0, 9.0, -30 + 6.0, { color: 0xffc070, size: 6, light: true, gain: 0.9 });
  }

  /* ================= 回廊与日晷 ================= */
  {
    const g = new THREE.Group();
    const S = 22;
    const cols = [];
    for (let i = 0; i <= 10; i++) {
      const t = -S / 2 + (i / 10) * S;
      cols.push({ x: t, y: 1.6, z: -S / 2 }, { x: t, y: 1.6, z: S / 2 });
      if (i > 0 && i < 10) cols.push({ x: -S / 2, y: 1.6, z: t }, { x: S / 2, y: 1.6, z: t });
    }
    g.add(K.scatter(new THREE.CylinderGeometry(0.22, 0.26, 3.2, 8), stoneL, cols));
    // 柱顶的拱梁与四面斜屋顶
    for (const s of [-1, 1]) {
      const bx = box(S + 2.4, 0.5, 0.7, stoneL);
      bx.position.set(0, 3.4, s * S / 2);
      g.add(bx);
      const bz = box(0.7, 0.5, S + 2.4, stoneL);
      bz.position.set(s * S / 2, 3.4, 0);
      g.add(bz);
      const rx = box(S + 3, 0.18, 3.6, slate);
      rx.position.set(0, 4.0, s * (S / 2 + 0.9));
      rx.rotation.x = s * 0.28;
      g.add(rx);
      const rz = box(3.6, 0.18, S + 3, slate);
      rz.position.set(s * (S / 2 + 0.9), 4.0, 0);
      rz.rotation.z = -s * 0.28;
      g.add(rz);
    }
    // 中央：井 + 十字小径
    const well = cyl(1.6, 1.8, 1.0, 10, stoneL);
    well.position.y = 0.5;
    g.add(well);
    const ww = cyl(1.3, 1.3, 0.05, 10, P.water, false);
    ww.position.y = 0.98;
    g.add(ww);
    for (const [w, d] of [[S - 4, 1.6], [1.6, S - 4]]) {
      const path = box(w, 0.1, d, P.cobble, false);
      path.position.y = 0.05;
      g.add(path);
    }
    // 日晷：石座 + 倾斜的铜盘 + 三角晷针
    const sd = new THREE.Group();
    const ped = cyl(0.5, 0.7, 1.0, 8, stone);
    ped.position.y = 0.5;
    sd.add(ped);
    const dial = cyl(1.0, 1.0, 0.1, 16, bronze);
    dial.position.y = 1.15;
    dial.rotation.x = -0.4;
    sd.add(dial);
    const gn = new THREE.Mesh(new THREE.BufferGeometry(), bronze);
    const gv = new Float32Array([0, 0, 0, 0, 0.9, 0, 0, 0, 0.9]);
    gn.geometry.setAttribute('position', new THREE.BufferAttribute(gv, 3));
    gn.geometry.computeVertexNormals();
    gn.material = bronze;
    gn.position.set(0, 1.2, -0.5);
    gn.rotation.x = -0.4;
    sd.add(gn);
    sd.position.set(5.5, 0, 5.5);
    g.add(sd);
    // 四块花圃
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const bed = box(5.4, 0.3, 5.4, P.flat(0x6a8a3a, 1));
      bed.position.set(sx * 5.8, 0.15, sz * 5.8);
      g.add(bed);
    }
    T.landmark(g, 50, -34, 0, {
      name: '回廊 · The Cloister',
      shortName: '回廊',
      tag: '边走边想的地方',
      desc: '二十二米见方的石柱回廊，四面是斜屋顶的拱廊，当中是一方草坪，一口石井，十字形的鹅卵石小径，西南角一座铜盘日晷，每块花圃里种着不同的草。',
      detail: '回廊是中世纪学者的"户外教室"：下雨时在廊下散步讨论，天晴时在草坪上读书。方庭中央的井象征"生命之泉"，日晷提醒修士们每天的祷告时间——因为他们把一天分成八段，每一段都有对应的祈祷。',
    }, { dist: 40, height: 22, ty: 3, rot: 0.2 });
  }

  /* ================= 天文台与浑天仪 ================= */
  let armillary;
  {
    const g = new THREE.Group();
    const base = cyl(4.6, 5.2, 18, 12, stone);
    base.position.y = 9;
    g.add(base);
    const band = cyl(5.0, 5.0, 0.6, 12, stoneL);
    band.position.y = 18.3;
    g.add(band);
    // 顶上的平台与女儿墙
    const deck = cyl(5.4, 5.4, 0.5, 12, stoneL);
    deck.position.y = 18.8;
    g.add(deck);
    const mer = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      mer.push({ x: Math.cos(a) * 5.0, y: 19.9, z: Math.sin(a) * 5.0, ry: -a });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1.0, 1.4, 0.7), stoneL, mer));
    // 箭窗
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1;
      const sl = box(0.34, 1.2, 0.2, P.window, false);
      sl.position.set(Math.cos(a) * 5.0, 5 + i * 5, Math.sin(a) * 5.0);
      sl.rotation.y = -a;
      g.add(sl);
    }
    // 浑天仪：基座 + 一组转动的铜环
    const ped = cyl(0.4, 0.55, 1.4, 8, bronze);
    ped.position.set(0, 20.2, 0);
    g.add(ped);
    armillary = new THREE.Group();
    const ring = (r, rx, ry, rz) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 6, 36), bronze);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      armillary.add(m);
    };
    ring(2.2, Math.PI / 2, 0, 0);               // 赤道
    ring(2.2, 0, 0, 0);                         // 子午
    ring(2.2, 0, Math.PI / 2, 0);               // 经圈
    ring(1.9, Math.PI / 2 - 0.41, 0, 0);        // 黄道（倾 23.5°）
    ring(1.5, Math.PI / 2, 0, 0);
    const axis = cyl(0.04, 0.04, 5.2, 4, bronze, false);
    axis.rotation.z = 0.0;
    armillary.add(axis);
    const earth = sphere(0.55, P.flat(0x4a7aa0, 0.5, { metalness: 0.2 }));
    armillary.add(earth);
    const sun = sphere(0.22, P.flat(0xe0b040, 0.4, { metalness: 0.5 }));
    sun.position.set(1.9, 0, 0);
    armillary.add(sun);
    // 外面套一个倾斜的枢轴：极轴指向北极星，浑天仪绕自己的极轴转，而不是绕竖直轴
    const tilt = new THREE.Group();
    tilt.position.set(0, 23, 0);
    tilt.rotation.z = 0.4;
    tilt.userData.keepSeparate = true;
    tilt.add(armillary);
    g.add(tilt);
    // 旁边的小圆顶：开了一道观测缝
    const turret = cyl(1.9, 2.1, 4, 10, stone);
    turret.position.set(7.4, 2.0, -2.6);
    g.add(turret);
    const dm = K.dome(2.1, P.copper);
    dm.position.set(7.4, 4.0, -2.6);
    g.add(dm);
    const slit = box(0.5, 1.8, 0.2, P.dark, false);
    slit.position.set(7.4, 5.2, -0.6);
    slit.rotation.x = -0.4;
    g.add(slit);
    // 门口一块象限仪
    const quad = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 4, 16, Math.PI / 2), bronze);
    quad.position.set(-3, 1.4, 6.2);
    quad.rotation.z = Math.PI;
    g.add(quad);

    T.landmark(g, 56, 26, 0, {
      name: '天文台 · The Observatory',
      shortName: '天文台',
      tag: '把星星当历法用',
      desc: '十八米高的圆石塔，顶上平台立着一座两层楼高的铜浑天仪：赤道、子午、黄道几道铜环套在一起，慢慢转动，中心一颗蓝色的小球，铜环上一颗金色的小太阳绕着它转。塔边另有一座铜绿圆顶，开着一道朝天的缝。',
      detail: '中世纪天文学最大的用处是"算日子"：复活节的日期要按春分后第一个满月后的星期天来定，错一天就是亵渎。所以修道院和大学都养着一两个会算历法的修士。浑天仪、象限仪和星盘，是他们手里的三件宝——有了它们，才能在星空里"找到上帝的钟"。',
    }, { dist: 54, height: 40, ty: 20, rot: 0.2 });
    T.animate((dt, t) => { armillary.rotation.y = t * 0.35; });
  }

  /* ================= 机械钟塔 ================= */
  let handM;
  let handH;
  {
    const g = new THREE.Group();
    const tower = box(6.0, 24, 6.0, stone);
    tower.position.y = 12;
    g.add(tower);
    // 四面钟盘：圆盘 + 十二个刻度；指针单独做、会走
    for (let s = 0; s < 4; s++) {
      const face = new THREE.Group();
      const disc = cyl(2.0, 2.0, 0.2, 24, P.flat(0xf2ead2, 0.7), false);
      disc.rotation.x = Math.PI / 2;
      face.add(disc);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.12, 5, 28), bronze);
      face.add(rim);
      const tick = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        tick.push({ x: Math.sin(a) * 1.65, y: Math.cos(a) * 1.65, z: 0.16, rz: -a, sx: 0.08, sy: i % 3 === 0 ? 0.36 : 0.22, sz: 0.04 });
      }
      face.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0x2a2420, 0.8), tick));
      face.position.set(0, 19, 3.05);
      const wrap = new THREE.Group();
      wrap.rotation.y = (s * Math.PI) / 2;
      wrap.add(face);
      g.add(wrap);
    }
    // 指针（只做正面那一对会动，其余三面用静态）
    const mkHand = (len, w, mat) => {
      const grp = new THREE.Group();
      const hand = box(w, len, 0.1, mat, false);
      hand.position.y = len / 2;
      grp.add(hand);
      grp.userData.keepSeparate = true;
      return grp;
    };
    handM = mkHand(1.6, 0.1, P.flat(0x2a2420, 0.8));
    handH = mkHand(1.1, 0.16, P.flat(0x2a2420, 0.8));
    handM.position.set(0, 19, 3.25);
    handH.position.set(0, 19, 3.27);
    g.add(handM);
    g.add(handH);
    // 钟室、尖顶
    const bell = box(5.4, 3.2, 5.4, stoneL);
    bell.position.y = 25.6;
    g.add(bell);
    for (const s of [-1, 1]) {
      const a1 = box(1.2, 2.2, 0.2, P.dark, false);
      a1.position.set(s * 1.2, 25.8, 2.75);
      g.add(a1);
      const a2 = box(0.2, 2.2, 1.2, P.dark, false);
      a2.position.set(2.75, 25.8, s * 1.2);
      g.add(a2);
    }
    const cap = cone(4.2, 5.4, 4, P.copper);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = 29.9;
    g.add(cap);
    const ball = sphere(0.4, bronze);
    ball.position.y = 33;
    g.add(ball);
    // 钟下的小门
    const door = box(1.5, 2.6, 0.2, P.woodDark);
    door.position.set(0, 1.3, 3.1);
    g.add(door);
    T.landmark(g, -34, 6, 0, {
      name: '机械钟塔 · The Clock Tower',
      shortName: '钟塔',
      tag: '第一次，时间可以被听见',
      desc: '二十四米高的方塔，四面都有一块铜框的大钟盘，十二个刻度、一对黑色的长短针；顶上一座铜绿四坡顶，钟室四面开着拱窗，钟声一响全镇都听得见。',
      detail: '机械钟是十四世纪的发明：靠重锤驱动、擒纵机构控制节奏，没有表盘，只有报时的钟声。最早的钟装在修道院和大教堂里，目的是让修士按时祷告；后来才传到市镇，慢慢变成了"工作时间"——也就是说，第一次有了"迟到"这回事。',
    }, { dist: 52, height: 26, ty: 14, rot: 0.2 });
    T.animate((dt, t) => {
      // 现场加速：分针 1 圈 = 60 秒，时针 12 分钟
      handM.rotation.z = -(t / 60) * Math.PI * 2;
      handH.rotation.z = -(t / 720) * Math.PI * 2;
    });
  }

  /* ================= 药草园 ================= */
  {
    const g = new THREE.Group();
    const cols = [0x8a4a8a, 0xc8a840, 0x4a8a4a, 0xa83a3a, 0x6a8ab0, 0xe8e0d0, 0xc87a3a, 0x3a7a5a];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const bx = (c - 1.5) * 6.2;
      const bz = (r - 1) * 6.4;
      const bed = box(5, 0.5, 5.4, P.flat(0x5a3f26, 1));
      bed.position.set(bx, 0.25, bz);
      g.add(bed);
      const plants = [];
      for (let k = 0; k < 14; k++) {
        plants.push({ x: bx + rand.range(-2.2, 2.2), y: 0.75, z: bz + rand.range(-2.4, 2.4), sx: 0.3, sy: rand.range(0.5, 1.1), sz: 0.3, color: cols[(r * 4 + c + k) % cols.length] });
      }
      g.add(K.scatter(new THREE.ConeGeometry(1, 1.4, 5), P.flat(0xffffff, 0.9, { flatShading: true }), plants));
      // 标牌
      const lb = box(0.6, 0.4, 0.08, P.woodDark);
      lb.position.set(bx, 0.7, bz + 2.9);
      lb.rotation.x = -0.3;
      g.add(lb);
    }
    // 篱：矮绿墙一圈
    const hedge = P.flat(0x3f6a2e, 1);
    for (const [w, d, x, z] of [[28, 0.9, 0, -11.4], [28, 0.9, 0, 11.4], [0.9, 23, -14, 0], [0.9, 23, 14, 0]]) {
      const h = box(w, 1.2, d, hedge);
      h.position.set(x, 0.6, z);
      g.add(h);
    }
    // 中央一口井
    const well = cyl(1.0, 1.1, 0.8, 8, stoneL);
    well.position.set(0, 0.4, 0);
    g.add(well);
    T.landmark(g, -46, 46, 0, {
      name: '药草园 · The Physic Garden',
      shortName: '药草园',
      tag: '一块地里种着三百种药',
      desc: '一方被矮绿篱围起来的花园，里面是十二块整整齐齐的苗床，每块苗床前钉着一块小木牌，写着草药名；紫的是薰衣草，黄的是金盏花，红的是玫瑰，白的是洋甘菊。',
      detail: '中世纪的医学里，药草是最主要的"药"：修道院都有"药草园"，园里按疗效分区。大学医学院开课要先教认草；草药书（Herbal）是最畅销的手抄本之一，里面画着每种草的样子和用法——有一半的插图其实是画错了，但没人知道。',
    }, { dist: 40, height: 22, ty: 2, rot: 0.2 });
  }

  /* ================= 缮写室 ================= */
  {
    const g = new THREE.Group();
    const sc = K.makeHouse(P, {
      w: 24, d: 8, floors: 2, floorH: 3.4, wall: stone, base: stoneD, baseH: 0.8,
      roof: 'gable', roofMat: slate, pitch: 0.55, windows: 8, door: P.woodDark, chimney: true, over: 0.6,
    });
    g.add(sc);
    T.smokeFrom(g, sc.userData.chimney);
    // 大块的斜写字桌（放在窗前）
    const desks = [];
    for (let i = 0; i < 8; i++) desks.push({ x: -9.6 + i * 2.7, y: 1.0, z: 6.2, sx: 1.6, sy: 0.1, sz: 1.0, rx: 0.4 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.woodDark, desks));
    for (let i = 0; i < 8; i++) {
      const lg = box(0.12, 1.0, 0.12, P.wood);
      lg.position.set(-9.6 + i * 2.7, 0.5, 6.2);
      g.add(lg);
    }
    T.landmark(g, -30, -26, 0, {
      name: '缮写室 · The Scriptorium',
      shortName: '缮写室',
      tag: '一天写七百个字',
      desc: '二层的长石楼，一楼一排大窗对着南方的日光；窗前整齐地排着八张斜桌，每张桌后都坐着一个低头抄写的修士，旁边摆着墨水、羽毛笔和小刀。',
      detail: '缮写室是修道院的"印刷厂"：规矩很严——不许说话，不许点火（怕烧书），一个修士一天只能抄两三页。抄书人偶尔会在页边写下抱怨："我手冷了""这墨水太差了""感谢上帝，快到晚饭了"。这些抱怨今天成了最珍贵的史料。',
    }, { dist: 42, height: 22, ty: 5, rot: 0.2 });
  }

  /* ================= 三座学寮（方庭） ================= */
  {
    const quads = [[40, 70, 0.0], [-20, 80, 0.1], [-72, 62, -0.1]];
    quads.forEach(([qx, qz, qr], qi) => {
      const g = new THREE.Group();
      const hall = (w, d, x, z, ry) => {
        const h = K.makeHouse(P, {
          w, d, floors: 2, floorH: 3.2, wall: qi % 2 ? stone : stoneL, base: stoneD, baseH: 0.7,
          roof: 'gable', roofMat: slate, pitch: 0.58, windows: Math.floor(w / 3), chimney: true, over: 0.5, door: P.woodDark,
        });
        h.position.set(x, 0, z);
        h.rotation.y = ry;
        g.add(h);
        if (h.userData.chimney) {
          T.smokeFrom(g, h.userData.chimney.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(h.position));
        }
        return h;
      };
      hall(22, 7, 0, -10, 0);                 // 北翼
      hall(18, 7, -14, 0, Math.PI / 2);       // 西翼
      hall(18, 7, 14, 0, -Math.PI / 2);       // 东翼
      // 南面一座门楼
      const gate = box(8, 9, 5, qi % 2 ? stone : stoneL);
      gate.position.set(0, 4.5, 12);
      g.add(gate);
      const ar = box(3, 4.4, 5.2, P.dark, false);
      ar.position.set(0, 2.2, 12);
      g.add(ar);
      const gc = cone(5.4, 3.6, 4, slate);
      gc.rotation.y = Math.PI / 4;
      gc.position.set(0, 10.8, 12);
      g.add(gc);
      // 院心草坪与小径
      const lw = box(18, 0.1, 16, P.flat(0x5c8a40, 1), false);
      lw.position.set(0, 0.06, 2);
      g.add(lw);
      const pth = box(2, 0.14, 16, P.cobble, false);
      pth.position.set(0, 0.08, 2);
      g.add(pth);
      const names = ['王后学寮 · Queen’s College', '圣约翰学寮 · St John’s', '新学寮 · New College'];
      const tags = ['红袍学生的方庭', '读神学的人住这里', '连墙都是新的'];
      const descs = [
        '一座四面围合的石砌方庭：北、西、东各是一排二层的学舍，南面是带拱门的门楼，门楼顶是四坡的板岩尖顶；院心是一块方正的草坪，一条鹅卵石小径从门楼通向北翼的大厅。',
        '一座较老的学寮：石墙被烟熏出了深灰，窗子又窄又高；门楼边挂着一面绣着书和钥匙的旗，学生们抱着书在院子里踱步，嘴里念着拉丁语的变格表。',
        '学镇里最年轻的学寮：墙面还泛着新石的浅灰，窗框是新刷的黑漆，门楼下的石阶还没被踩出凹痕；院里的草坪修得整整齐齐，没有一根杂草。',
      ];
      T.landmark(g, qx, qz, qr, {
        name: names[qi],
        shortName: ['王后学寮', '圣约翰', '新学寮'][qi],
        tag: tags[qi],
        desc: descs[qi],
        detail: '"学寮"（college）最初只是穷学生的宿舍，由富人捐钱建立，提供食宿和书。慢慢地，学寮变成了大学的核心——牛津和剑桥至今仍以学寮为基本单位。学生一律穿黑袍，起床、吃饭、祈祷、上课都按钟声，违规要被罚款、关禁闭，甚至鞭笞。',
      }, { dist: 46, height: 24, ty: 4, rot: qr });
    });
  }

  /* ================= 皮纸坊 ================= */
  {
    const g = new THREE.Group();
    // 绷皮架：一块方框里绷着一张皮
    for (let i = 0; i < 7; i++) {
      const fr = new THREE.Group();
      const f1 = box(2.6, 0.12, 0.12, P.wood);
      f1.position.y = 2.2;
      fr.add(f1);
      const f2 = box(2.6, 0.12, 0.12, P.wood);
      f2.position.y = 0.4;
      fr.add(f2);
      for (const s of [-1, 1]) {
        const v = box(0.12, 1.9, 0.12, P.wood);
        v.position.set(s * 1.3, 1.3, 0);
        fr.add(v);
      }
      const hide = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.6), T.TM.hideMat);
      hide.position.set(0, 1.3, 0.02);
      fr.add(hide);
      fr.position.set((i % 4) * 3.4 - 5, 0, Math.floor(i / 4) * 4);
      g.add(fr);
    }
    // 石灰池与水槽
    for (let i = 0; i < 3; i++) {
      const pit = box(3.2, 0.6, 2.4, P.flat(0xcfcab8, 0.9));
      pit.position.set(10 + i * 3.8, 0.3, -1);
      g.add(pit);
      const liq = box(2.8, 0.05, 2.0, P.flat(0xe8e4d0, 0.3), false);
      liq.position.set(10 + i * 3.8, 0.62, -1);
      g.add(liq);
    }
    T.landmark(g, 86, -12, 0.3, {
      name: '皮纸坊 · The Parchment Works',
      shortName: '皮纸坊',
      tag: '一本书要杀一百只小牛',
      desc: '空地上立着一排排方木架，每架上都绷着一张刮净的牛犊皮；旁边是三只石灰池，皮子要先在池里泡几天，再拉在架上晾干，最后用月牙刀刮薄。',
      detail: '一本中等大小的《圣经》需要两百张小牛皮——也就是一百多头牛犊。皮纸坊的工序很折磨人：泡灰、去毛、绷皮、刮薄、浮石磨光，一张好皮要做两周。正因为这样，中世纪的书比黄金还贵，书里的字是"一刀一刀刻在牛身上"的。',
    }, { dist: 36, height: 18, ty: 3, rot: 0.3 });
  }

  /* ================= 运河与石桥 ================= */
  {
    const canal = [[-125, 62], [-70, 56], [-20, 52], [40, 56], [90, 62], [125, 70]];
    const wm = P.std('scholar:canal', {
      color: 0x3a6a82, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.92,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    T.add(K.ribbon(canal, 7.4, wm, 0.1), 0, 0);
    for (const s of [-1, 1]) {
      T.add(K.wallAlong(canal.map(([x, z]) => [x, z + s * 3.9]), { h: 0.9, thick: 0.6, y0: 0, mat: stoneD }), 0, 0);
    }
    // 两座小石拱桥：桥面三段，中间高
    const bridge = (bx, bz) => {
      const g = new THREE.Group();
      const mid = box(5, 0.5, 4, stoneL);
      mid.position.set(0, 1.5, 0);
      g.add(mid);
      for (const s of [-1, 1]) {
        const ramp = box(4, 0.5, 4, stoneL);
        ramp.position.set(s * 4.1, 0.9, 0);
        ramp.rotation.z = -s * 0.2;
        g.add(ramp);
        const rail = box(0.4, 0.8, 4.6, stone);
        rail.position.set(s * 6, 1.4, 0);
        g.add(rail);
        const pl = box(0.5, 0.6, 4.6, stone);
        pl.position.set(s * 2.4, 2.0, 0);
        g.add(pl);
      }
      for (const sz of [-1, 1]) {
        const pr = box(10.4, 0.5, 0.4, stone);
        pr.position.set(0, 1.9, sz * 1.9);
        g.add(pr);
      }
      g.rotation.y = Math.PI / 2;
      g.position.set(bx, 0, bz);
      return g;
    };
    T.add(bridge(-20, 52), 0, 0);
    T.add(bridge(40, 56), 0, 0);
    // 河边几棵垂柳
    const pts = [[-90, 52], [-60, 49], [-10, 46], [60, 51], [100, 56], [-50, 66], [20, 62], [70, 68]];
    T.add(K.grove(P, 'oak', pts, { leaf: 0x6a8a3e, trunk: 0x4a3a26, scale: [0.7, 1.0], rand }), 0, 0);
  }

  /* ================= 道路、路灯、民居、居民 ================= */
  {
    T.add(K.ribbon([[88, 0], [60, 8], [30, 14], [0, 18], [-30, 20]], 6, P.cobble, 0.05), 0, 0);
    T.add(K.ribbon([[0, 18], [0, -14]], 6, P.cobble, 0.05), 0, 0);
    T.add(K.ribbon([[0, 18], [0, 50]], 5, P.cobble, 0.05), 0, 0);
    T.add(K.ribbon([[-30, 20], [-46, 34]], 4, P.cobble, 0.05), 0, 0);
    // 广场中心的石柱
    const col = cyl(0.5, 0.7, 5, 8, stoneL);
    col.position.y = 2.5;
    T.add(col, 8, 24);
    const bk = sphere(0.8, bronze);
    T.add(bk, 8, 24, 0, 5.4);
    // 路灯
    for (const [x, z] of [[-10, 16], [10, 16], [-10, -8], [10, -8], [-22, 40], [24, 40], [60, 10], [-60, 24]]) T.lamp(x, z, { ry: 0.4, h: 3.3, light: x === 10 && z === 16 });
    // 零散民居：书商、装订匠、抄书人
    const taken = [{ x: 0, z: -30, r: 28 }, { x: 50, z: -34, r: 20 }, { x: 56, z: 26, r: 14 }, { x: -34, z: 6, r: 12 }, { x: -46, z: 46, r: 22 }, { x: -30, z: -26, r: 18 },
      { x: 40, z: 70, r: 26 }, { x: -20, z: 80, r: 26 }, { x: -72, z: 62, r: 26 }, { x: 86, z: -12, r: 22 }, { x: 0, z: 54, r: 14 }];
    let placed = 0;
    let guard = 0;
    while (placed < 12 && guard < 700) {
      guard++;
      const x = rand.range(-110, 110);
      const z = rand.range(-70, 110);
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r)) continue;
      if (Math.abs(z - (52 + (x < 0 ? -0.1 : 0.05) * x)) < 8) continue;
      T.house({
        w: rand.range(5, 7), d: rand.range(5, 6.4), floors: 2, floorH: 2.8,
        wall: rand() < 0.5 ? P.wash(0xe6dcc0) : stoneL, base: stoneD, baseH: 0.5, roof: 'gable', roofMat: rand() < 0.5 ? slate : P.tile,
        pitch: 0.65, windows: 2, timber: rand() < 0.4, chimney: true, over: 0.5,
      }, x, z, rand.range(-0.3, 0.3) + (rand() < 0.5 ? 0 : Math.PI));
      taken.push({ x, z, r: 9 });
      placed++;
    }
  }
  {
    const scholar = { tabard: 0x1a1a22, helmet: 'hood' };
    T.walker(scholar, [-8, 20], [10, 20], 0.5);
    T.walker({ ...scholar, tabard: 0x3a2a5a }, [0, -2], [0, 26], 0.5);
    T.walker(scholar, [40, 18], [58, 10], 0.5);
    T.walker({ ...scholar, tabard: 0x5a2a2a }, [-10, 40], [14, 42], 0.5);
    T.walker({ villager: true }, [-34, 12], [-12, 22], 0.6);
    for (let i = 0; i < 8; i++) T.person({ tabard: [0x1a1a22, 0x3a2a5a, 0x5a2a2a][i % 3], helmet: 'hood' }, rand.range(-12, 18), rand.range(10, 34), rand() * 6, 'idle');
    // 缮写室里的修士
    for (let i = 0; i < 4; i++) T.person({ tabard: 0x2a2420, helmet: 'hood' }, -30 - 9 + i * 5.4, -26 + 6.6, Math.PI, 'idle');
    // 天文台顶
    T.person({ tabard: 0x1a1a22, helmet: 'hood' }, 56 + 1.5, 26 + 2.5, 2.0, 'idle', 1, 20.4);
    // 回廊里
    for (let i = 0; i < 3; i++) T.person({ tabard: 0x1a1a22, helmet: 'hood' }, 50 - 4 + i * 4, -34 + 3, 0.5, 'idle');
  }

  /* ================= 生气：运河上的小船、飘落的纸页、光尘、鸽子、蝴蝶 ================= */
  {
    // 运河上两条平底小船，沿河来回；船头指向前进方向，到头停一会儿再掉头
    const canal = [[-118, 62], [-70, 56], [-20, 52], [40, 56], [90, 62], [118, 69]];
    const seg = [];
    let total = 0;
    for (let i = 0; i < canal.length - 1; i++) {
      const [ax, az] = canal[i];
      const [bx, bz] = canal[i + 1];
      const L = Math.hypot(bx - ax, bz - az);
      seg.push({ ax, az, bx, bz, L, s0: total });
      total += L;
    }
    const at = (s) => {
      const sg = seg.find((q) => s <= q.s0 + q.L) || seg[seg.length - 1];
      const k = (s - sg.s0) / sg.L;
      return { x: sg.ax + (sg.bx - sg.ax) * k, z: sg.az + (sg.bz - sg.az) * k, dx: sg.bx - sg.ax, dz: sg.bz - sg.az };
    };
    const boats = [];
    for (let i = 0; i < 2; i++) {
      const boat = T.POP.makeBoat({ len: 4.6, wid: 1.5, wallH: 0.6, rower: false });
      T.dynamic(boat);
      T.add(boat, -100, 60, 0, 0.14);
      boats.push({ b: boat, s: i ? total * 0.6 : total * 0.1, dir: i ? -1 : 1, wait: 0, ph: i * 2 });
    }
    T.animate((dt, t) => {
      for (const o of boats) {
        if (o.wait > 0) { o.wait -= dt; }
        else {
          o.s += o.dir * 2.0 * dt;
          if (o.s > total - 4 || o.s < 4) { o.dir *= -1; o.s = THREE.MathUtils.clamp(o.s, 4, total - 4); o.wait = 3; }
        }
        const p = at(o.s);
        o.b.position.set(p.x, 0.14 + Math.sin(t * 1.4 + o.ph) * 0.03, p.z + 0.4 * Math.sin(t * 0.6 + o.ph));
        o.b.rotation.y = Math.atan2(p.dx * o.dir, p.dz * o.dir);
        o.b.rotation.z = Math.sin(t * 1.1 + o.ph) * 0.03;
      }
    });
    // 运河水面的碎光（白天）
    T.emitter({ x: 0, y: 0.35, z: 60, count: 44, life: 1.8, size: 0.45, color: 0xffffff, additive: true, opacity: 0.65,
      spread: [118, 0.02, 7], vel: [0, 0, 0], jitter: [0.03, 0, 0.03], fadeIn: 0.45, night: 'day' });

    // 缮写室窗口飘出的纸页，被风带着往东飘
    T.emitter({ x: -30, y: 3.2, z: -26 + 3, count: 8, life: 4.5, size: 0.34, color: 0xf2ead2, opacity: 0.95,
      spread: [1.5, 0.8, 0.4], vel: [0.5, 0.35, 0.2], jitter: [0.25, 0.25, 0.25], wind: [0.02, -0.05, 0.01], fadeIn: 0.1, night: 'day' });

    // 大图书馆玫瑰窗前的暖金光尘（夜里）
    T.emitter({ x: 0, y: 9.5, z: -30 + 6.8, count: 30, life: 3.5, size: 0.22, color: 0xffd890, additive: true, opacity: 0.75,
      spread: [6, 3.5, 1.2], vel: [0, 0.12, 0.1], jitter: [0.12, 0.12, 0.12], fadeIn: 0.25, night: 'only' });

    // 天文台顶：夜里亮起的星点
    T.emitter({ x: 56, y: 17, z: 26, count: 18, life: 2.4, size: 0.3, color: 0xcfe0ff, additive: true, opacity: 0.9,
      spread: [8, 4, 8], vel: [0, 0, 0], jitter: [0.03, 0.03, 0.03], fadeIn: 0.4, night: 'only' });

    // 图书馆尖顶上空的鸽子；药草园的蝴蝶
    T.birds({ count: 8, center: [0, -30], radius: 17, height: 33, color: 0xf0ede4, scale: 0.7 });
    T.emitter({ x: -46, y: 1.6, z: 46, count: 14, life: 4.5, size: 0.28, color: 0xf6ecc0, opacity: 0.95,
      spread: [14, 1.2, 10], vel: [0.15, 0.05, 0.1], jitter: [0.7, 0.35, 0.7], fadeIn: 0.2, night: 'day' });
  }

  /* ================= 信标：图书馆的尖顶，夜里玫瑰窗放光 ================= */
  {
    const bg = new THREE.Group();
    const oct = cyl(5.0, 5.4, 12, 8, stone);
    oct.position.set(0, 15, 0);
    bg.add(oct);
    const spire = cone(5.2, 14, 8, slate);
    spire.position.set(0, 28, 0);
    bg.add(spire);
    const nv = box(34, 12, 14, stone);
    nv.position.set(0, 6, 0);
    bg.add(nv);
    const ct = box(6, 24, 6, stone);
    ct.position.set(-34, 12, 36);
    bg.add(ct);
    const cc = cone(4.2, 5.4, 4, P.copper);
    cc.rotation.y = Math.PI / 4;
    cc.position.set(-34, 26.7, 36);
    bg.add(cc);
    bg.position.set(0, 0, -30);
    T.beacon(bg);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T.glowTx, color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.position.set(0, 10, 8);
    glow.scale.setScalar(34);
    bg.add(glow);
    T.beaconAnimate((dt, t, day) => { glow.material.opacity = day * 0.85; });
  }

  T.overview({
    name: '学者镇 · Scholarium',
    tag: '把世界抄进书里',
    desc: '世界最西边的一座"书之城"：大图书馆三十多米的八角尖顶高过整座镇子，玫瑰窗夜里透出彩光；旁边是石柱回廊和一座顶着浑天仪的天文台，西边的钟塔里是齿轮的机械钟；运河从镇中穿过，三座学寮的方庭里学生抱着书走来走去。',
    detail: '十二世纪的欧洲，大学像种子一样突然在几个城市发芽：博洛尼亚、巴黎、牛津。它们最初只是学生和老师凑在一起的行会，后来才有了房子、图书馆和学位。这里教的东西不多——神学、法学、医学、"七艺"——但学生一学就是十年，因为读书本身就是一份职业。',
  }, { cx: 0, cz: 10, dist: 240, height: 115, rot: 0.2 });
}
