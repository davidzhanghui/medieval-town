import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  羊毛染坊镇 Woolmarket
 *
 *  北方丘陵的牧羊地上发家的镇子：镇心是长长的布厅与羊毛大教堂，
 *  东边一条小溪被染成蓝、红、黄、绿一段一段的颜色，溪边排满染缸，
 *  再往东是一片拉着彩布的晾布架；西边的牧场上三十多只羊在低头吃草。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;

  const stoneW = P.tint('stone', 0xd6c9a8);          // 蜂蜜色的科茨沃尔德石灰岩
  const stoneL = P.tint('stone', 0xe6dcc0);
  const slateW = P.tint('slate', 0x8a8478);
  const pasture = P.flat(0x5f8340, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  T.add(K.groundPatch(120, pasture, { segs: 44 }), 0, 0, 0, 0.03);

  /* ================= 布厅 ================= */
  {
    const g = new THREE.Group();
    const L = 32;
    const wall = box(L, 7.4, 10, stoneW);
    wall.position.y = 3.7;
    g.add(wall);
    const roof = K.gableRoof(10, L, 3.6, slateW, stoneW, { over: 0.5, gables: false });
    roof.rotation.y = Math.PI / 2;
    roof.position.y = 7.4;
    g.add(roof);
    // 山墙
    const gs = new THREE.Shape();
    gs.moveTo(-5, 0);
    gs.lineTo(5, 0);
    gs.lineTo(0, 3.55);
    gs.closePath();
    for (const s of [-1, 1]) {
      const tri = new THREE.Mesh(new THREE.ShapeGeometry(gs), stoneW);
      tri.position.set((s * L) / 2, 7.4, 0);
      tri.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(tri);
    }
    // 底层拱廊：一排方柱 + 过梁，柱后是一排黑洞洞的铺面
    const cols = [];
    for (let i = 0; i < 12; i++) cols.push({ x: -L / 2 + 1.4 + i * 2.8, y: 2.0, z: 6.2 });
    g.add(K.scatter(new THREE.BoxGeometry(0.7, 4.0, 0.7), stoneL, cols));
    const arcB = box(L, 0.8, 1.6, stoneL);
    arcB.position.set(0, 4.2, 6.0);
    g.add(arcB);
    const floor = box(L, 0.3, 2.4, stoneL);
    floor.position.set(0, 0.15, 5.6);
    g.add(floor);
    const shops = [];
    for (let i = 0; i < 11; i++) shops.push({ x: -L / 2 + 2.8 + i * 2.8, y: 1.8, z: 5.05, sx: 1.9, sy: 3.0, sz: 0.2 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.dark, shops));
    // 二层长排窗
    const wins = [];
    for (let i = 0; i < 12; i++) wins.push({ x: -L / 2 + 1.8 + i * 2.7, y: 6.0, z: 5.02, sx: 1.1, sy: 1.4, sz: 0.1 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.window, wins));
    // 中央钟塔
    const tower = box(6.4, 12, 6.4, stoneW);
    tower.position.set(0, 13, 0);
    g.add(tower);
    const crown = box(7.2, 0.8, 7.2, stoneL);
    crown.position.set(0, 19.2, 0);
    g.add(crown);
    const mer = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mer.push({ x: Math.cos(a) * 3.4, y: 20.0, z: Math.sin(a) * 3.4, ry: -a });
    }
    g.add(K.scatter(new THREE.BoxGeometry(0.9, 1.0, 0.9), stoneL, mer));
    const clock = cyl(1.4, 1.4, 0.2, 16, P.flat(0xf0e6c8, 0.7), false);
    clock.rotation.x = Math.PI / 2;
    clock.position.set(0, 15.5, 3.25);
    g.add(clock);
    const flag = K.banner(P, 0x2f5a7a, { h: 5, w: 1.3, len: 2.6 });
    flag.position.set(0, 19.4, 0);
    g.add(flag);
    // 门口的称羊毛台
    const scale = box(1.8, 0.2, 1.2, P.woodDark);
    scale.position.set(-8, 0.9, 8.6);
    g.add(scale);
    const bales = [];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
      bales.push({ x: 8 + i * 1.3 + r * 0.65, y: 0.55 + r * 1.0, z: 8.4, sx: 1.2, sy: 0.9, sz: 0.9 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0xe8dcc0, 1), bales));
    T.landmark(g, 6, -12, 0, {
      name: '布厅 · The Cloth Hall',
      shortName: '布厅',
      tag: '一年的羊毛在这里变成银币',
      desc: '三十二米长的蜜色石楼，底层是十二根方柱撑起的拱廊，柱后是一间间黑洞洞的铺面；二层一排长窗，屋顶正中立着一座十二米高的钟塔，塔顶垛口上挂着蓝旗。门口是称羊毛的木台和一垛垛捆好的羊毛包。',
      detail: '十三到十五世纪，英格兰的羊毛是全欧洲最抢手的原料：一包羊毛卖到佛兰德就是一包银币。布厅是行会的大本营——织工、漂洗工、染匠按行规交货，商人在廊下验布论价，钟一响就是开市。羊毛商赚得最多，所以今天很多英国小镇最气派的建筑，是当年的羊毛大教堂和布厅。',
    }, { dist: 54, height: 26, ty: 7, rot: 0.1 });
  }

  /* ================= 羊毛大教堂 ================= */
  let towerTop = 28;
  {
    const g = new THREE.Group();
    const nave = K.makeHouse(P, {
      w: 12, d: 30, floors: 1, floorH: 11, wall: stoneW, base: null,
      roof: 'gable', roofMat: slateW, pitch: 0.42, windows: 0, door: P.woodDark, chimney: false, over: 0.5,
    });
    nave.rotation.y = 0;
    g.add(nave);
    // 大高窗：沿两侧各五扇
    const gw = [];
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) gw.push({ x: s * 6.05, y: 6.2, z: -10 + i * 5.2, sx: 0.2, sy: 6, sz: 1.8 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), T.TM.stainedGlass, gw));
    // 扶壁
    const bt = [];
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) bt.push({ x: s * 6.6, y: 5.5, z: -12.5 + i * 5.2, sx: 0.9, sy: 11, sz: 0.8 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), stoneL, bt));
    // 西塔（正面）：高 30 米，顶上四角各一小塔
    const tw = box(8.4, 30, 8.4, stoneW);
    tw.position.set(0, 15, 19.5);
    g.add(tw);
    const cap = box(9.4, 0.9, 9.4, stoneL);
    cap.position.set(0, 30.4, 19.5);
    g.add(cap);
    const mer = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      mer.push({ x: Math.cos(a) * 4.6, y: 31.4, z: 19.5 + Math.sin(a) * 4.6 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(0.9, 1.1, 0.9), stoneL, mer));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pin = box(1.2, 4, 1.2, stoneL);
      pin.position.set(sx * 4.2, 33, 19.5 + sz * 4.2);
      g.add(pin);
      const pc = cone(0.9, 2.2, 4, stoneL);
      pc.rotation.y = Math.PI / 4;
      pc.position.set(sx * 4.2, 36, 19.5 + sz * 4.2);
      g.add(pc);
    }
    // 塔上的三层钟室开口
    const lv = [];
    for (const yy of [12, 19, 25]) for (const s of [-1, 1]) {
      lv.push({ x: s * 1.6, y: yy, z: 19.5 + 4.25, sx: 1.0, sy: 3.2, sz: 0.2 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.dark, lv));
    // 正门与大西窗
    const door = box(2.8, 4.4, 0.4, P.woodDark);
    door.position.set(0, 2.2, 23.8);
    g.add(door);
    const west = box(3.2, 7.0, 0.3, T.TM.stainedGlass, false);
    west.position.set(0, 16.5, 23.8);
    g.add(west);
    towerTop = 36;
    T.landmark(g, -56, -14, 0.25, {
      name: '羊毛大教堂 · The Wool Church',
      shortName: '大教堂',
      tag: '用羊毛盖起来的教堂',
      desc: '一座和这座镇子的规模极不相称的大教堂：三十米高的方塔顶着四座小尖塔，长长的中殿两侧是一排排高窗和石扶壁，西面的大窗在夜里亮着彩光。',
      detail: '科茨沃尔德的"羊毛教堂"是羊毛商人的炫耀：他们捐钱盖教堂，既为赎罪，也为在石头上刻下自己的名字。教堂地板上常常嵌着羊毛商的铜像——脚踩一只绵羊，手按羊毛包。几百年后羊毛生意没了，镇子穷了，但教堂太贵，没人拆得起，就一直立到了今天。',
    }, { dist: 62, height: 30, ty: 14, rot: 0.25 });
    // 信标：教堂塔
    const bt2 = new THREE.Group();
    const t2 = box(8.4, 30, 8.4, stoneW);
    t2.position.y = 15;
    bt2.add(t2);
    const c2 = box(9.4, 0.9, 9.4, stoneL);
    c2.position.y = 30.4;
    bt2.add(c2);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pin = box(1.2, 4, 1.2, stoneL);
      pin.position.set(sx * 4.2, 33, sz * 4.2);
      bt2.add(pin);
    }
    const nv = box(12, 11, 28, stoneW);
    nv.position.set(0, 5.5, -17);
    bt2.add(nv);
    bt2.position.set(-56 + Math.sin(0.25) * 19.5, 0, -14 + Math.cos(0.25) * 19.5);
    bt2.rotation.y = 0.25;
    T.beacon(bt2);
  }

  /* ================= 羊毛市十字（六角亭） ================= */
  {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const st = cyl(5.2 - i * 0.7, 5.6 - i * 0.7, 0.4, 6, stoneL);
      st.position.y = 0.2 + i * 0.4;
      g.add(st);
    }
    const pillars = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      pillars.push({ x: Math.cos(a) * 3.3, y: 3.2, z: Math.sin(a) * 3.3 });
    }
    g.add(K.scatter(new THREE.CylinderGeometry(0.34, 0.4, 4.4, 8), stoneW, pillars));
    const ring = cyl(4.2, 4.4, 0.5, 6, stoneL);
    ring.position.y = 5.6;
    g.add(ring);
    const roof = cone(4.8, 3.6, 6, slateW);
    roof.position.y = 7.6;
    g.add(roof);
    const fin = box(0.14, 1.2, 0.14, P.iron);
    fin.position.y = 9.9;
    g.add(fin);
    const fin2 = box(0.5, 0.14, 0.14, P.iron);
    fin2.position.y = 10.2;
    g.add(fin2);
    // 中柱
    const mid = cyl(0.3, 0.4, 5, 8, stoneW);
    mid.position.y = 3.0;
    g.add(mid);
    T.landmark(g, 6, 34, 0, {
      name: '羊毛市十字 · The Buttercross',
      shortName: '市十字',
      tag: '成交了就在这儿握手',
      desc: '市集广场正中一座六角形的石亭：三级台阶、六根石柱托着一圈石梁，上头是六角锥形的板岩顶，顶尖一枚铁十字。亭下的石板被几百年的脚步磨得发亮。',
      detail: '英国的"市十字"（market cross）是赶集的标志：竖在广场中央，十字下立的规矩——买卖双方不能赊账，不能讲价到骂街。很多交易就是在十字下击掌成交的，所以"在十字下说的话"比契约还算数。',
    }, { dist: 28, height: 14, ty: 4, rot: 0.1 });
    const sq = box(46, 0.14, 30, P.cobble, false);
    sq.position.set(6, 0.07, 36);
    T.add(sq, 0, 0);
  }

  /* ================= 染缸与彩色小溪 ================= */
  const dyeColors = [0x2f58a8, 0xb8322a, 0xe0b028, 0x4a8a3a, 0x7a3a8a, 0xd0702a];
  {
    // 溪：折线分段，每段一种染料色（下游逐渐混成灰褐）
    const path = [[104, -34], [90, -18], [74, -4], [62, 10], [52, 26], [40, 40], [26, 52], [8, 62]];
    const segCols = [0x2f58a8, 0x2f58a8, 0xb8322a, 0xb8322a, 0xe0b028, 0x4a8a3a, 0x6a6a52];
    for (let i = 0; i < path.length - 1; i++) {
      const seg = [path[i], path[i + 1]];
      const mat = P.std(`dye:${segCols[i]}`, { color: segCols[i], roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.88 });
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -5;
      mat.polygonOffsetUnits = -5;
      T.add(K.ribbon(seg, 5.2, mat, 0.12), 0, 0);
    }
    // 溪岸：两侧窄石埂
    for (const s of [-1, 1]) {
      const edge = path.map(([x, z]) => [x + s * 3.0, z + s * 1.4]);
      T.add(K.wallAlong(edge, { h: 0.4, thick: 0.5, y0: 0, mat: stoneW }), 0, 0);
    }

    // 沿岸的染缸：大圆木桶，缸内液面带色
    const vats = new THREE.Group();
    const vatItems = [];
    path.slice(0, -1).forEach(([x, z], i) => {
      for (const s of [-1, 1]) {
        const ox = x + s * 6.2;
        const oz = z - s * 2.2;
        const col = dyeColors[(i * 2 + (s > 0 ? 1 : 0)) % dyeColors.length];
        const vat = cyl(1.3, 1.45, 1.4, 12, P.woodDark);
        vat.position.set(ox, 0.7, oz);
        vats.add(vat);
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 4, 14), P.iron);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.set(ox, 0.9, oz);
        vats.add(hoop);
        const liquid = cyl(1.2, 1.2, 0.05, 12, P.flat(col, 0.25), false);
        liquid.position.set(ox, 1.38, oz);
        vats.add(liquid);
        // 搅拌棍
        const stick = box(0.08, 2.2, 0.08, P.wood);
        stick.position.set(ox + 0.5, 1.9, oz);
        stick.rotation.z = 0.35;
        vats.add(stick);
      }
    });
    T.landmark(vats, 0, 0, 0, {
      name: '染缸 · The Dye Vats',
      shortName: '染缸',
      tag: '一条溪，五种颜色',
      desc: '小溪两岸排满了圆木染缸，缸里是蓝、红、黄、绿、紫的染液，染匠用长棍搅着；溪水顺着染坊的排水槽流进来，一段是靛蓝，一段是茜红，再往下是姜黄和草绿，最后混成褐灰色。',
      detail: '中世纪的染料全靠植物：蓝色来自菘蓝（woad）叶发酵，红色来自茜草根，黄色来自黄木樨草，绿色是蓝加黄叠染。染匠的手天天泡在染液里，常年带着蓝黑色的手；染坊被安排在城镇的下游，因为气味和污水实在太难闻。',
    }, { dist: 62, height: 38, ty: 1, rot: 0.9, ox: 56, oz: 14 });
  }

  /* ================= 晾布架（拉着彩布） ================= */
  {
    const g = new THREE.Group();
    const clothes = [];
    const cols = [0x2f58a8, 0xb8322a, 0xe0b028, 0x4a8a3a, 0x7a3a8a, 0xe8e0d0, 0xd0702a, 0x2f58a8];
    for (let i = 0; i < 8; i++) {
      const fx = (i % 4) * 16;
      const fz = Math.floor(i / 4) * 26;
      // 架：两排立柱 + 上下横杆
      for (const sx of [-1, 1]) {
        const p = box(0.22, 5.4, 0.22, P.wood);
        p.position.set(fx + sx * 6.0, 2.7, fz);
        g.add(p);
      }
      for (const yy of [0.6, 4.9]) {
        const b = box(12.4, 0.16, 0.16, P.wood);
        b.position.set(fx, yy, fz);
        g.add(b);
      }
      // 布：一块平面，微微起伏
      const geo = new THREE.PlaneGeometry(11.6, 4.2, 10, 3);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getX(k) * 0.9 + i) * 0.14);
      geo.computeVertexNormals();
      const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.95, side: THREE.DoubleSide }));
      cloth.position.set(fx, 2.7, fz);
      cloth.castShadow = true;
      cloth.userData.keepSeparate = true;
      g.add(cloth);
      clothes.push({ m: cloth, ph: i * 1.3 });
    }
    T.landmark(g, 40, 76, 0.2, {
      name: '晾布架 · Tenter Frames',
      shortName: '晾布架',
      tag: '被拉得笔直的颜色',
      desc: '一片木架林立的空地，每个架子上都用钩子拉着一整匹染好的布：靛蓝、绯红、姜黄、草绿、紫、象牙白，风吹过来整片布波浪似的起伏。',
      detail: '"Tenterhooks"（拉布钩）就是这么来的：织好或染好的布要钉在木架的钩子上绷直晾干，免得缩水起皱。英语里"on tenterhooks"现在是"坐立不安"的意思——因为布被拉着，就像人悬着心。',
    }, { dist: 66, height: 32, ty: 3, rot: 0.2, ox: 26, oz: 8 });
    T.animate((dt, t) => {
      for (const c of clothes) {
        c.m.rotation.y = Math.sin(t * 0.8 + c.ph) * 0.05;
        c.m.position.z = c.m.position.z; // 位置保持
      }
    });
  }

  /* ================= 漂洗磨坊 ================= */
  {
    const g = new THREE.Group();
    const mill = K.makeHouse(P, {
      w: 9, d: 7, floors: 2, floorH: 3.0, wall: P.wash(0xe8dcc0), base: stoneW, baseH: 0.7,
      roof: 'gable', roofMat: slateW, pitch: 0.7, timber: true, windows: 2, chimney: false, door: P.woodDark,
    });
    g.add(mill);
    // 水轮
    const wheel = new THREE.Group();
    const geos = [];
    const rim = new THREE.TorusGeometry(2.9, 0.14, 5, 22);
    rim.rotateY(Math.PI / 2);
    geos.push(rim);
    for (let i = 0; i < 14; i++) {
      const bl = new THREE.BoxGeometry(1.0, 0.55, 0.1);
      bl.translate(0, 2.9, 0);
      bl.rotateX((i / 14) * Math.PI * 2);
      geos.push(bl);
    }
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.BoxGeometry(0.1, 5.8, 0.1);
      sp.rotateX((i / 6) * Math.PI);
      geos.push(sp);
    }
    const wm = new THREE.Mesh(mergeGeometries(geos, false), P.wood);
    wm.castShadow = true;
    wheel.add(wm);
    wheel.position.set(5.4, 2.9, 0);
    wheel.userData.keepSeparate = true;
    g.add(wheel);
    const axle = cyl(0.2, 0.2, 2, 8, P.iron);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(4.6, 2.9, 0);
    g.add(axle);
    const flume = box(0.9, 0.2, 7, P.woodDark);
    flume.position.set(5.4, 6.1, -5);
    g.add(flume);
    T.landmark(g, 30, 12, -1.3, {
      name: '漂洗磨坊 · Fulling Mill',
      shortName: '磨坊',
      tag: '水代替人踩布',
      desc: '溪边一座木筋石基的小楼，侧面挂着一只大水轮，水从木槽里倾下来，轮子带着屋里的大木锤一下一下捶打浸湿的毛布；墙边晾着刚出缸的布。',
      detail: '漂洗是把织好的毛布泡在水和漂土里反复捶打，让纤维缩紧、变厚、变密。以前靠人在木盆里踩，一匹布要踩好几个小时；十二世纪水力漂洗磨出现后，一台磨顶得上几十个人——这场"工业革命"最早，就发生在英国的小溪边。',
    }, { dist: 32, height: 16, ty: 3, rot: -1.3 });
    T.animate((dt, t) => { wheel.rotation.x = -t * 0.7; });
  }

  /* ================= 牧场、羊群、剪毛棚 ================= */
  const flock = [];
  {
    const px = -56, pz = 56;
    const W = 74, D = 50;
    const fence = K.fenceLine(P, [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2], [-W / 2, -D / 2]], { h: 1.1, gap: 2.8 });
    T.add(fence, px, pz);
    for (let i = 0; i < 34; i++) {
      const { group, head } = K.makeSheepLite(P, { tone: rand.pick([0xe4ddcc, 0xeae4d4, 0xd8d0bc, 0xf0ece0]), scale: rand.range(0.9, 1.15) });
      group.userData.keepSeparate = true;
      const x = px + rand.range(-W / 2 + 4, W / 2 - 4);
      const z = pz + rand.range(-D / 2 + 4, D / 2 - 4);
      T.add(group, x, z, rand() * 6);
      flock.push({ g: group, head, ph: rand() * 10, bx: x, bz: z, br: group.rotation.y, graze: rand() });
    }
    T.animate((dt, t) => {
      for (const s of flock) {
        const k = Math.sin(t * 0.42 + s.ph);
        s.head.rotation.x = 0.45 + k * 0.32;
        s.g.rotation.y = s.br + Math.sin(t * 0.18 + s.ph) * 0.35;
        s.g.position.x = s.bx + Math.sin(t * 0.05 + s.ph) * 1.2;
        s.g.position.z = s.bz + Math.cos(t * 0.04 + s.ph) * 1.0;
      }
    });
    // 剪毛棚：四柱敞棚 + 毛包
    const g = new THREE.Group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = box(0.34, 3.6, 0.34, P.timber);
      p.position.set(sx * 4.6, 1.8, sz * 3.2);
      g.add(p);
    }
    const roof = K.gableRoof(10.4, 8.4, 2.2, P.shingle, null, { over: 0.5, gables: false });
    roof.rotation.y = Math.PI / 2;
    roof.position.y = 3.6;
    g.add(roof);
    const bales = [];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) bales.push({ x: -3 + i * 1.5, y: 0.5 + r * 1.0, z: -2.0, sx: 1.3, sy: 0.9, sz: 1.0 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(0xe8dcc0, 1), bales));
    const bench = box(2.6, 0.7, 1.0, P.woodDark);
    bench.position.set(0, 0.35, 1.4);
    g.add(bench);
    const shears = box(0.5, 0.06, 0.12, P.iron);
    shears.position.set(0.4, 0.75, 1.4);
    g.add(shears);
    T.landmark(g, -56, 22, 0, {
      name: '剪毛棚 · The Shearing Shed',
      shortName: '剪毛棚',
      tag: '一年里最忙的一天',
      desc: '牧场南头的敞棚，四根粗木柱撑着木瓦顶，棚下一排摞起来的羊毛包，长凳上还放着一把剪羊毛的铁剪。三十多只羊正在围栏里低头吃草，不时抬起头来。',
      detail: '夏初是剪毛季：全村的人一起上阵，一天能剪几百只。剪下的毛要选等级——背上的最好，肚子上的次一些，脏的拿去做毡。一只羊一年出两三公斤毛，一个大牧场主养上一万只，就是一位小国王。',
    }, { dist: 44, height: 22, ty: 3, rot: 0 });
  }

  /* ================= 织工排屋与商人宅 ================= */
  {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const w = 5.2 + (i % 2) * 0.4;
      const h = K.makeHouse(P, {
        w, d: 7, floors: 3, floorH: 2.6, wall: P.wash(rand.pick([0xe8dcc0, 0xe0d0a8, 0xd8c8a0])), base: stoneW, baseH: 0.6,
        roof: 'gable', roofMat: P.tint('tile', 0xa8603e), pitch: 0.65, timber: true, jetty: true, windows: 3,
        shutter: null, chimney: i % 2 === 0, over: 0.5,
      });
      h.position.set((i - 2) * 6.0, 0, 0);
      g.add(h);
      if (h.userData.chimney) T.smokeFrom(g, h.userData.chimney.clone().add(new THREE.Vector3((i - 2) * 6.0, 0, 0)));
      // 阁楼的长排窗：织机要光
      const lw = box(w - 1.2, 0.9, 0.1, P.window, false);
      lw.position.set((i - 2) * 6.0, 3 * 2.6 - 0.9, 4.1 + 0.3);
      g.add(lw);
    }
    T.landmark(g, -18, 62, 0, {
      name: '织工排屋 · Weavers’ Row',
      shortName: '织工屋',
      tag: '窗开得很大，因为要光',
      desc: '五幢三层的木筋楼并肩而立，每幢的顶层都开着一排长长的大窗；二楼外挑，红瓦屋顶压着深色的木骨架。窗里隐约能听见织机咔嗒咔嗒的声音。',
      detail: '织工通常住在自己的作坊里：一楼是厨房，二楼睡人，顶楼放织机——所以顶层窗户特别宽，借光织布。一台织机一天织不到几米布，一匹标准的呢绒要两个人织五六天，这些窗里的"咔嗒声"，就是镇子的心跳。',
    }, { dist: 38, height: 19, ty: 6, rot: 0 });

    const m = K.makeHouse(P, {
      w: 14, d: 9, floors: 3, floorH: 3.0, wall: P.wash(0xe4d8b4), base: stoneW, baseH: 0.8,
      roof: 'gable', roofMat: slateW, pitch: 0.58, timber: true, jetty: true, windows: 4, porch: true,
      shutter: 0x2f5a7a, chimney: true, over: 0.7,
    });
    const mg = new THREE.Group();
    mg.add(m);
    T.smokeFrom(mg, m.userData.chimney);
    // 门上盾徽：一只羊
    const shield = box(1.4, 1.7, 0.14, P.flat(0x2f5a7a, 0.7));
    shield.position.set(0, 6.4, 5.0);
    mg.add(shield);
    const sh = sphere(0.35, P.flat(0xeae4d4, 1));
    sh.scale.set(1.3, 0.9, 0.4);
    sh.position.set(0, 6.4, 5.12);
    mg.add(sh);
    T.landmark(mg, 32, -48, 0.15, {
      name: '羊毛商人宅 · The Woolstapler’s House',
      shortName: '商人宅',
      tag: '门上画只羊，就是羊毛商',
      desc: '镇上最大的一幢木筋楼：三层、二层三层依次外挑，红色的木骨架衬着象牙灰泥，板岩大屋顶下是一排排小窗，门前一片雨棚，门楣上钉着蓝底盾徽，徽上一只白羊。',
      detail: '"羊毛商"（woolstapler）是中世纪英国最富有的中间商：从牧场主手里收羊毛，分级打包，运到港口卖给佛兰德的织工。羊毛商之间有自己的行会和暗号，一包羊毛上要盖三个印——产地、分级、关税。',
    }, { dist: 48, height: 24, ty: 7, rot: 0.15 });
  }

  /* ================= 街巷与民居 ================= */
  {
    T.add(K.ribbon([[-6, 130], [-4, 90], [6, 56], [6, 36]], 6, P.road, 0.05), 0, 0);
    T.add(K.ribbon([[6, 36], [-20, 28], [-50, 18], [-70, 10]], 4, P.road, 0.045), 0, 0);
    T.add(K.ribbon([[6, 36], [40, 34], [70, 38]], 4, P.road, 0.045), 0, 0);
    T.add(K.ribbon([[6, 34], [8, 6], [8, -30]], 4, P.road, 0.045), 0, 0);

    const taken = [
      { x: 6, z: -12, r: 26 }, { x: -56, z: -14, r: 28 }, { x: 6, z: 36, r: 28 }, { x: 40, z: 76, r: 30 },
      { x: 30, z: 12, r: 12 }, { x: -56, z: 56, r: 48 }, { x: -18, z: 62, r: 22 }, { x: 32, z: -48, r: 16 },
      { x: 72, z: 0, r: 50 },
    ];
    let placed = 0;
    let guard = 0;
    while (placed < 18 && guard < 900) {
      guard++;
      const x = rand.range(-110, 110);
      const z = rand.range(-90, 100);
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r)) continue;
      T.house({
        w: rand.range(5, 7), d: rand.range(5, 6.4), floors: rand() < 0.5 ? 2 : 1, floorH: 2.8,
        wall: rand() < 0.5 ? stoneW : P.wash(0xe6dcc0), base: stoneW, baseH: 0.5,
        roof: 'gable', roofMat: rand() < 0.5 ? slateW : P.thatch, pitch: 0.7, windows: 2, chimney: true,
        timber: rand() < 0.4, over: 0.5,
      }, x, z, rand.range(-0.3, 0.3) + (rand() < 0.5 ? 0 : Math.PI));
      taken.push({ x, z, r: 9 });
      placed++;
    }
    // 干草垛与石墙
    const hay = K.ringPoints(rand, -56, 56, 0, 20, 6).map(([x, z]) => ({ x, y: 0.9, z, sx: 1.2, sy: 1.0, sz: 1.2 }));
    T.add(K.scatter(new THREE.ConeGeometry(1, 1.8, 8), P.flat(0xb99a4e, 1), hay.map((h) => ({ ...h, s: 1 }))), 0, 0);
    for (let x = -80; x <= 80; x += 32) T.lamp(x, 38, { ry: Math.PI, h: 3.2, light: x === -16 });
    T.lamp(6, 54, { ry: 1, h: 3.2 });
  }

  /* ================= 生气：水花、染溪水汽、鸽子、旗、蝴蝶、牧羊犬 ================= */
  {
    // 磨坊水轮底部溅起的水花
    const mw = K.toWorld(30, 12, -1.3)(5.4, 0);
    T.emitter({ x: mw.x, y: 0.3, z: mw.z, count: 22, life: 0.9, size: 0.16, color: 0xdfeef7, opacity: 0.85,
      spread: [0.5, 0.05, 1.0], vel: [0, 1.5, 0], jitter: [0.5, 0.6, 0.5], gravity: 6, fadeIn: 0.04 });

    // 染溪三段颜色上各飘一缕同色的水汽
    [[90, -18, 0x6a8ad8], [62, 10, 0xd86a6a], [40, 40, 0xe8c040]].forEach(([x, z, c]) => {
      T.emitter({ x, y: 0.5, z, count: 10, life: 3.5, size: 1.4, color: c, opacity: 0.2,
        spread: [4, 0.05, 2], vel: [0.1, 0.5, 0.05], jitter: [0.1, 0.1, 0.1], grow: 2, fadeIn: 0.25 });
    });

    // 大教堂塔楼上空的鸽子；市十字顶上的小旗
    T.birds({ count: 7, center: [-48, -14], radius: 15, height: 27, color: 0xf0ede4, scale: 0.7 });
    const pole = cyl(0.05, 0.05, 1.8, 5, P.iron);
    T.add(pole, 6, 34, 0, 11.0);
    T.flag(6, 11.6, 34, { w: 2.2, h: 1.1, color: 0xb8322a, ry: 0.4 });

    // 牧场上的蝴蝶（白天）
    T.emitter({ x: -56, y: 1.6, z: 56, count: 16, life: 4.5, size: 0.28, color: 0xf6ecc0, opacity: 0.95,
      spread: [30, 1.2, 22], vel: [0.15, 0.05, 0.1], jitter: [0.7, 0.35, 0.7], fadeIn: 0.2, night: 'day' });

    // 牧羊犬：绕着羊群外围一圈圈巡跑，尾巴甩，四条腿倒腾
    const dog = new THREE.Group();
    const fur = P.flat(0x3a2e24, 0.9);
    const dbody = box(0.95, 0.38, 0.34, fur);
    dbody.position.y = 0.55;
    dog.add(dbody);
    const dhead = box(0.34, 0.3, 0.3, fur);
    dhead.position.set(0.62, 0.72, 0);
    dog.add(dhead);
    const snout = box(0.2, 0.14, 0.18, P.flat(0x6a5444, 0.9));
    snout.position.set(0.86, 0.66, 0);
    dog.add(snout);
    const tail = new THREE.Group();
    tail.position.set(-0.5, 0.7, 0);
    const tl = box(0.4, 0.08, 0.08, fur);
    tl.position.x = -0.2;
    tail.add(tl);
    tail.userData.keepSeparate = true;
    dog.add(tail);
    const dlegs = [];
    for (const [lx, lz] of [[0.35, -0.13], [0.35, 0.13], [-0.35, -0.13], [-0.35, 0.13]]) {
      const lg = new THREE.Group();
      const leg = box(0.1, 0.4, 0.1, fur);
      leg.position.y = -0.2;
      lg.add(leg);
      lg.position.set(lx, 0.4, lz);
      lg.userData.keepSeparate = true;
      dog.add(lg);
      dlegs.push(lg);
    }
    T.dynamic(dog);
    T.add(dog, -56 + 28, 56, 0);
    T.animate((dt, t) => {
      const a = t * 0.3;
      const x = -56 + Math.cos(a) * 31;
      const z = 56 + Math.sin(a) * 21;
      dog.position.set(x, 0, z);
      dog.rotation.y = -a - Math.PI / 2;           // 面朝运动的切线方向（逆时针）
      dlegs.forEach((l, i) => { l.rotation.z = Math.sin(t * 11 + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.8 : 0)) * 0.7; });
      tail.rotation.y = Math.sin(t * 14) * 0.5;
      dog.position.y = Math.abs(Math.sin(t * 11)) * 0.06;
    });
  }

  /* ================= 居民 ================= */
  {
    const dyer = { tabard: 0x2f58a8, helmet: 'hood' };
    T.walker(dyer, [60, -2], [44, 36], 0.5);
    T.walker({ tabard: 0xb8322a, helmet: 'hood' }, [70, 20], [50, 40], 0.5);
    T.walker({ tabard: 0x8a6a3a, helmet: 'hood' }, [-56 + 8, 56 - 6], [-56 + 20, 56 + 8], 0.35);   // 牧羊人
    T.person({ tabard: 0x8a6a3a, helmet: 'hood' }, -56 - 14, 56 + 5, 1.4, 'idle');
    T.walker({ villager: true }, [-4, 20], [14, 40], 0.5);
    T.walker({ villager: true }, [18, 44], [-14, 28], 0.6);
    for (let i = 0; i < 10; i++) T.person({ villager: true }, rand.range(-12, 24), rand.range(26, 48), rand() * 6, 'idle');
    // 剪毛人
    for (let i = 0; i < 3; i++) T.person({ tabard: 0xe8dcc0, helmet: 'none' }, -56 - 2 + i * 2, 22 + 2, 3, 'idle');
  }

  T.overview({
    name: '羊毛染坊镇 · Woolmarket',
    tag: '一匹布五种颜色',
    desc: '北方丘陵上最富的镇子：镇心是三十二米长的布厅和一座羊毛大教堂，东边小溪被染成一段一段的颜色，溪边染缸成排、晾布架上拉着整匹的彩布；西边的牧场上，三十多只羊低头吃草。',
    detail: '十三到十五世纪，英国人靠"羊毛"撑起了整个国家的财政：国王把羊毛税当作最稳的收入，议会里的"羊毛袋"（Woolsack）至今还是上议院议长的座位。一座像这样的镇子，把羊从牧场一路变成染好的布，再运到佛兰德卖成银币——整条产业链都在这几百步之内。',
  }, { cx: 6, cz: 20, dist: 200, height: 100, rot: 0.1 });
}
