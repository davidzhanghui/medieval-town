import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  商队集市 Caravan Bazaar
 *
 *  最东南的沙漠边缘：一汪绿洲边上长出的商城。西边是挂着骆驼的商队
 *  旅店，往东是一条挂满条纹遮篷的香料巷，北边是带宣礼塔的大寺；
 *  每天傍晚，一队驮货的骆驼从沙丘后走出来，绕着绿洲进城。
 *  夜里引路塔顶点起一堆火，给还在沙里赶路的人看。
 * ========================================================== */

export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, cone, sphere } = K;

  const sandGround = P.flat(0xd8bd82, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const sand2 = P.flat(0xcaa86a, 1, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const brick = (h) => P.wash(h);
  const teal = P.std('bazaar:teal', { color: 0x2a9a90, roughness: 0.4, metalness: 0.3 });
  const cream = P.wash(0xeadcb4);
  const tan = P.wash(0xd8bb86);
  const ochre = P.wash(0xc8a070);
  const white = P.flat(0xffffff, 0.9);

  // 骆驼商队走的闭合环路（后面的房屋选址要绕开它）
  const PATH = [[-170, 40], [-140, 14], [-100, 18], [-60, 28], [-14, 52], [20, 80], [60, 84], [100, 62], [120, 28], [150, -10], [190, -40], [210, -10], [200, 40], [150, 90], [60, 140], [-60, 130], [-150, 100]];
  const nearPath = (x, z, d) => {
    for (let i = 0; i < PATH.length; i++) {
      const [ax, az] = PATH[i];
      const [bx, bz] = PATH[(i + 1) % PATH.length];
      const dx = bx - ax;
      const dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < d) return true;
    }
    return false;
  };

  T.add(K.groundPatch(215, sandGround, { segs: 56 }), 0, 0, 0, 0.03);
  T.add(K.groundPatch(120, sand2, { segs: 40 }), 10, 10, 0, 0.04);

  /* ---------- 沙丘：压扁的半球，围在城外 ---------- */
  {
    const dunes = [];
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const r = rand.range(135, 205);
      dunes.push({ x: Math.cos(a) * r, y: -0.2, z: Math.sin(a) * r, sx: rand.range(18, 40), sy: rand.range(3, 9), sz: rand.range(14, 30), ry: rand() * 3 });
    }
    T.add(K.scatter(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), P.flat(0xc4a468, 1), dunes), 0, 0);
  }

  /* ---------- 条纹布 / 地毯的画布贴图 ---------- */
  const stripeMat = (a, b) => {
    const tex = K.canvasTexture(64, 64, (c, w, h) => {
      c.fillStyle = b;
      c.fillRect(0, 0, w, h);
      c.fillStyle = a;
      for (let i = 0; i < 4; i++) c.fillRect(i * 16, 0, 8, h);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide });
  };
  const awnings = [stripeMat('#b8322a', '#efe6cf'), stripeMat('#2f58a8', '#efe6cf'), stripeMat('#e0a020', '#efe6cf'), stripeMat('#3f8a4a', '#efe6cf'), stripeMat('#7a3a8a', '#efe6cf')];
  const rugMat = (c1, c2, c3) => {
    const tex = K.canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = c1;
      c.fillRect(0, 0, w, h);
      c.strokeStyle = c2;
      c.lineWidth = 6;
      c.strokeRect(10, 10, w - 20, h - 20);
      c.strokeStyle = c3;
      c.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(w / 2, 22 + i * 14);
        c.lineTo(w - 22 - i * 14, h / 2);
        c.lineTo(w / 2, h - 22 - i * 14);
        c.lineTo(22 + i * 14, h / 2);
        c.closePath();
        c.stroke();
      }
      c.fillStyle = c2;
      c.beginPath(); c.arc(w / 2, h / 2, 10, 0, Math.PI * 2); c.fill();
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide });
  };
  const rugs = [rugMat('#8a2a2a', '#e0b030', '#f0e0c0'), rugMat('#1f3a6a', '#d0a030', '#e8e0d0'), rugMat('#4a2a5a', '#d0803a', '#e0d0b0'), rugMat('#2a5a3a', '#e8d090', '#c85a3a')];

  /* ================= 商队旅店 ================= */
  {
    const g = new THREE.Group();
    const S = 40;
    // 四面外墙（西面留门）：厚墙 + 垛口
    const wall = (w, d, x, z) => {
      const m = box(w, 8.4, d, tan);
      m.position.set(x, 4.2, z);
      g.add(m);
    };
    wall(S, 1.6, 0, -S / 2);
    wall(S, 1.6, 0, S / 2);
    wall(1.6, S / 2 - 6, S / 2, 0);   // 东墙占一半
    wall(1.6, S / 2 - 8, -S / 2, -S / 4 - 4);
    wall(1.6, S / 2 - 8, -S / 2, S / 4 + 4);
    const mer = [];
    for (let i = 0; i < 20; i++) {
      mer.push({ x: -S / 2 + 1 + i * 2.1, y: 9.0, z: -S / 2 }, { x: -S / 2 + 1 + i * 2.1, y: 9.0, z: S / 2 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1.2, 1.2, 1.7), tan, mer));
    // 大门：两座塔 + 尖拱洞
    for (const s of [-1, 1]) {
      const tw = box(5.4, 12, 5.4, ochre);
      tw.position.set(-S / 2, 6, s * 8);
      g.add(tw);
      const cap = box(6.2, 0.8, 6.2, tan);
      cap.position.set(-S / 2, 12.4, s * 8);
      g.add(cap);
    }
    const arch = box(1.9, 9, 11, tan);
    arch.position.set(-S / 2, 7.2, 0);
    g.add(arch);
    const hole = box(2.0, 6.0, 7.0, P.dark, false);
    hole.position.set(-S / 2, 3.0, 0);
    g.add(hole);
    const tip = box(2.0, 2.6, 3.4, P.dark, false);
    tip.position.set(-S / 2, 7.2, 0);
    tip.rotation.z = 0;
    g.add(tip);
    const gcone = cone(2.0, 2.6, 4, tan);
    gcone.rotation.y = Math.PI / 4;
    gcone.position.set(-S / 2, 9.9, 0);
    g.add(gcone);

    // 内院四面两层拱廊
    const cols = [];
    for (let i = 0; i < 11; i++) {
      const t = -S / 2 + 4 + (i / 10) * (S - 8);
      cols.push({ x: t, y: 2.0, z: -S / 2 + 6 }, { x: t, y: 2.0, z: S / 2 - 6 });
      cols.push({ x: t, y: 6.2, z: -S / 2 + 6 }, { x: t, y: 6.2, z: S / 2 - 6 });
    }
    g.add(K.scatter(new THREE.CylinderGeometry(0.28, 0.32, 3.8, 8), cream, cols));
    for (const yy of [4.1, 8.3]) {
      for (const s of [-1, 1]) {
        const b = box(S - 6, 0.5, 0.8, cream);
        b.position.set(0, yy, s * (S / 2 - 6));
        g.add(b);
        const room = box(S - 6, 4.0, 4.2, tan);
        room.position.set(0, yy - 2.1, s * (S / 2 - 3.5));
        g.add(room);
      }
    }
    // 屋顶平台、屋面
    const roofA = box(S - 4, 0.4, 6, tan);
    roofA.position.set(0, 8.6, -S / 2 + 3);
    g.add(roofA);
    const roofB = box(S - 4, 0.4, 6, tan);
    roofB.position.set(0, 8.6, S / 2 - 3);
    g.add(roofB);
    // 房间的拱门口：一排黑洞
    const cells = [];
    for (let i = 0; i < 10; i++) {
      cells.push({ x: -S / 2 + 6 + i * 3.1, y: 1.8, z: -S / 2 + 5.7, sx: 1.4, sy: 2.6, sz: 0.2 });
      cells.push({ x: -S / 2 + 6 + i * 3.1, y: 1.8, z: S / 2 - 5.7, sx: 1.4, sy: 2.6, sz: 0.2 });
    }
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.dark, cells));
    // 院心：八角水池 + 小亭
    const pool = cyl(3.4, 3.7, 0.8, 8, cream);
    pool.position.set(0, 0.4, 0);
    g.add(pool);
    const pw = cyl(3.0, 3.0, 0.05, 8, P.water, false);
    pw.position.set(0, 0.8, 0);
    g.add(pw);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const p = cyl(0.2, 0.22, 3.6, 6, cream);
      p.position.set(Math.cos(a) * 2.2, 2.4, Math.sin(a) * 2.2);
      g.add(p);
    }
    const kd = K.dome(2.8, teal);
    kd.position.set(0, 4.2, 0);
    g.add(kd);
    // 货包与饮水槽
    for (let i = 0; i < 4; i++) {
      const pk = K.sackPile(P, { n: 6, color: [0xcdbf9a, 0xa8322a, 0x2f58a8, 0xd8b050][i] });
      pk.position.set(-S / 2 + 8 + i * 4.4, 0, -S / 2 + 8.6);
      g.add(pk);
    }
    const trough = box(6, 0.7, 1.2, P.woodDark);
    trough.position.set(10, 0.35, 10);
    g.add(trough);
    const tw = box(5.6, 0.05, 0.9, P.water, false);
    tw.position.set(10, 0.7, 10);
    g.add(tw);
    T.landmark(g, -40, -12, -Math.PI / 2, {
      name: '商队旅店 · The Caravanserai',
      shortName: '商队旅店',
      tag: '人在屋里，骆驼在院里',
      desc: '四十米见方的土墙大院：西面开一座带两座方塔的尖拱大门，院里四面是两层的拱廊，一楼停骆驼、堆货，二楼住人；院心一口八角水池，池上一座青绿色圆顶的小亭。墙头一圈垛口，夜里只剩门楼上一盏灯亮着。',
      detail: '丝绸之路上每隔一天的路程，就有一座这样的"汗"（Khan）：免费或廉价给商队住宿、存货、饮牲口。大门夜里上锁，防盗匪，也防瘟疫。商队旅店不只是客栈——也是商会、邮局和银行：商人在这里交换汇票，传递书信，打听下一站的行情。',
    }, { dist: 70, height: 36, ty: 6, rot: -Math.PI / 2 + 0.6 });
    T.glow(-40 - 20, 8, -12, { color: 0xffb060, size: 4.5, light: true, gain: 0.8 });
  }

  /* ================= 香料巷（条纹遮篷市） ================= */
  {
    const g = new THREE.Group();
    const L = 100;
    // 巷两侧各一排摊位
    const spiceCols = [0xb8322a, 0xe0a020, 0xd06a20, 0x6a9a3a, 0xa86a3a, 0x8a3a5a];
    for (let i = 0; i < 12; i++) {
      for (const side of [-1, 1]) {
        const x = -L / 2 + 5 + i * 8.0;
        const z = side * 6.2;
        const st = new THREE.Group();
        for (const sx of [-1, 1]) {
          const p = box(0.18, 3.0, 0.18, P.wood);
          p.position.set(sx * 2.8, 1.5, side * 0.4);
          st.add(p);
        }
        const roof = box(6.0, 0.08, 3.6, awnings[(i + (side > 0 ? 2 : 0)) % awnings.length]);
        roof.position.set(0, 3.2, side * -0.7);
        roof.rotation.x = side * 0.22;
        st.add(roof);
        const counter = box(5.4, 0.9, 1.0, P.woodDark);
        counter.position.set(0, 0.45, side * -1.0);
        st.add(counter);
        // 摊上货：香料堆（小锥）+ 麻袋
        const piles = [];
        for (let k = 0; k < 5; k++) piles.push({ x: -2.2 + k * 1.1, y: 1.15, z: side * -1.0, s: 0.4, sy: 0.55, color: spiceCols[(i + k) % spiceCols.length] });
        st.add(K.scatter(new THREE.ConeGeometry(1, 1, 8), P.flat(0xffffff, 0.9), piles));
        const bowls = [];
        for (let k = 0; k < 5; k++) bowls.push({ x: -2.2 + k * 1.1, y: 0.95, z: side * -1.0, sx: 0.5, sy: 0.15, sz: 0.5 });
        st.add(K.scatter(new THREE.CylinderGeometry(1, 0.8, 1, 10), P.flat(0x8a5a3a, 0.9), bowls));
        st.position.set(x, 0, z);
        g.add(st);
      }
    }
    // 巷顶的横拉遮布：每隔 12 米一条
    for (let i = 0; i < 8; i++) {
      const cloth = box(2.6, 0.05, 11, awnings[(i + 1) % awnings.length]);
      cloth.position.set(-L / 2 + 10 + i * 12, 4.3, 0);
      cloth.rotation.z = (i % 2 ? 0.05 : -0.05);
      g.add(cloth);
      const rope1 = box(0.05, 0.05, 11, P.rope);
      rope1.position.set(-L / 2 + 10 + i * 12, 4.0, 0);
      g.add(rope1);
    }
    // 悬挂的铜灯
    for (let i = 0; i < 14; i++) {
      const lan = box(0.3, 0.45, 0.3, P.lanternGlass, false);
      lan.position.set(-L / 2 + 8 + i * 7, 3.6, 0);
      lan.userData.keepSeparate = true;
      g.add(lan);
    }
    // 地面铺石
    const street = box(L, 0.1, 9, P.cobble, false);
    street.position.set(0, 0.05, 0);
    g.add(street);
    T.landmark(g, 60, 20, 0, {
      name: '香料巷 · Spice Lane',
      shortName: '香料巷',
      tag: '一把胡椒顶一把银币',
      desc: '一百米长的石板巷，两侧各十二座摊位，条纹遮篷红、蓝、黄、绿、紫轮番排开；摊上是一堆堆圆锥形的香料：辣红、姜黄、橙红、青绿，空气里全是肉桂和胡椒的气味。巷顶横着一道道遮阳布，布下垂着铜灯。',
      detail: '香料是中世纪欧洲最贵的"奢侈品"：一磅胡椒能换一头羊，肉桂只有贵族才用得起。它们在东方是日常调味品，一路被转卖——印度、波斯、君士坦丁堡、威尼斯——每过一道关价格翻一倍。所以欧洲人才会不顾一切地想找到去东方的海路，这就是大航海的起点。',
    }, { dist: 82, height: 42, ty: 2, rot: 0.35 });   // 巷长 100 米沿 x 铺开，镜头要退到能装下全长
  }

  /* ================= 大寺与宣礼塔 ================= */
  {
    const g = new THREE.Group();
    const hall = box(26, 11, 22, cream);
    hall.position.y = 5.5;
    g.add(hall);
    const ledge = box(27, 0.6, 23, tan);
    ledge.position.y = 11.2;
    g.add(ledge);
    // 大圆顶 + 两侧小圆顶
    const bigDrum = cyl(7.6, 8.0, 3.0, 16, cream);
    bigDrum.position.set(0, 13, 0);
    g.add(bigDrum);
    const dome = K.dome(8.0, teal);
    dome.position.set(0, 14.5, 0);
    g.add(dome);
    const fin = cyl(0.1, 0.18, 2.8, 6, P.TM.goldMark || P.iron);
    fin.position.set(0, 23.8, 0);
    g.add(fin);
    const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 5, 14, Math.PI * 1.5), P.TM.goldMark || P.iron);
    crescent.position.set(0, 25.4, 0);
    g.add(crescent);
    for (const [sx, sz] of [[-9, -7], [9, -7], [-9, 7], [9, 7]]) {
      const sd = K.dome(3.2, teal);
      sd.position.set(sx, 11.5, sz);
      g.add(sd);
    }
    // 宣礼塔：细高圆塔 + 阳台 + 尖顶
    const mina = cyl(1.9, 2.4, 32, 12, cream);
    mina.position.set(18, 16, -10);
    g.add(mina);
    for (const yy of [14, 26]) {
      const balc = cyl(3.0, 2.6, 0.8, 12, tan);
      balc.position.set(18, yy, -10);
      g.add(balc);
      const rail = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.07, 4, 24), P.iron);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(18, yy + 0.9, -10);
      g.add(rail);
    }
    const mc = cone(2.2, 6, 12, teal);
    mc.position.set(18, 35, -10);
    g.add(mc);
    const mf = cyl(0.08, 0.12, 2.4, 6, P.TM.goldMark || P.iron);
    mf.position.set(18, 39.2, -10);
    g.add(mf);
    // 正面：深拱门 + 小台阶
    const door = box(5, 7, 0.3, P.dark, false);
    door.position.set(0, 3.5, 11.1);
    g.add(door);
    const frame = box(7, 9, 0.4, tan);
    frame.position.set(0, 4.5, 11.0);
    g.add(frame);
    const frame2 = box(5.2, 7.2, 0.45, P.dark, false);
    frame2.position.set(0, 3.6, 11.05);
    g.add(frame2);
    for (let i = 0; i < 3; i++) {
      const st = box(8 - i, 0.3, 1.4, cream);
      st.position.set(0, 0.15 + i * 0.3, 12 - i * 0.6);
      g.add(st);
    }
    // 窗：一排小拱窗
    const wins = [];
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) wins.push({ x: -9 + i * 4.5, y: 6.5, z: s * 11.1, sx: 1.0, sy: 2.4, sz: 0.2 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), T.TM.stainedGlass, wins));
    T.landmark(g, 46, -56, 0.4, {
      name: '大寺 · The Great Mosque',
      shortName: '大寺',
      tag: '宣礼声越过沙丘',
      desc: '城北最大的建筑：二十六米宽的方殿上顶着直径十六米的青绿色大圆顶，四角各一座小圆顶；东北角立着三十多米高的细圆塔，两层阳台，青绿色的尖顶挑着金色的新月。正面是一座深拱门，门前三级台阶。',
      detail: '这类中央大圆顶加四角小圆顶的结构，来自拜占庭的圣索菲亚大教堂——伊斯兰世界借过去，又加上了细高的宣礼塔。每天五次，宣礼员登塔高声召唤礼拜，没有扩音器，全靠人嗓；这座塔既是信仰的标志，也是商队远远望见城市的"路标"。',
    }, { dist: 66, height: 34, ty: 14, rot: 0.4 });
  }

  /* ================= 引路塔 ================= */
  {
    const g = new THREE.Group();
    const base = cyl(3.6, 4.4, 8, 10, ochre);
    base.position.y = 4;
    g.add(base);
    const shaft = cyl(2.6, 3.4, 22, 10, tan);
    shaft.position.y = 19;
    g.add(shaft);
    for (const yy of [10, 20]) {
      const bd = cyl(3.9 - yy * 0.04, 3.9 - yy * 0.04, 0.6, 10, cream);
      bd.position.y = yy;
      g.add(bd);
    }
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const sl = box(0.4, 1.4, 0.2, P.window, false);
      sl.position.set(Math.cos(a) * 3.1, 14 + i * 3, Math.sin(a) * 3.1);
      sl.rotation.y = -a;
      g.add(sl);
    }
    // 顶上：火盆平台
    const deck = cyl(4.6, 3.4, 0.8, 10, cream);
    deck.position.y = 30.4;
    g.add(deck);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const pil = box(0.35, 1.6, 0.35, cream);
      pil.position.set(Math.cos(a) * 4.2, 31.6, Math.sin(a) * 4.2);
      g.add(pil);
    }
    const bowl = cyl(1.8, 1.0, 1.0, 10, P.iron);
    bowl.position.y = 31.4;
    g.add(bowl);
    const ember = cyl(1.6, 1.6, 0.1, 10, T.TM.ember, false);
    ember.position.y = 31.95;
    ember.userData.keepSeparate = true;
    g.add(ember);
    T.smokeFrom(g, new THREE.Vector3(0, 33, 0));
    T.landmark(g, -80, -46, 0, {
      name: '引路塔 · The Guide Tower',
      shortName: '引路塔',
      tag: '沙里的灯塔',
      desc: '三十多米高的土黄色圆塔，塔身两道石带，几道箭窗；顶上是一圈十根短柱撑着的平台，台心一只铁盆，里面整夜烧着火，浓烟笔直地升起，几十里外的沙丘上都看得见。',
      detail: '沙漠里的"灯塔"：夜间在塔顶点火，白天烧湿柴冒烟——商队望见烟，就知道离水源和城市不远。守塔人是整个绿洲最重要的人之一：火一灭，就意味着商队可能在黑暗里迷路、走错路，渴死在沙里。',
    }, { dist: 54, height: 30, ty: 18, rot: 0 });
    T.glow(-80, 31.9, -46, { color: 0xff8a30, size: 9, light: true, gain: 1.4 });

    // 远景信标：同一座塔，加上笔直的烟柱
    const bg = new THREE.Group();
    const bb = cyl(3.6, 4.4, 8, 10, ochre);
    bb.position.y = 4;
    bg.add(bb);
    const bs = cyl(2.6, 3.4, 22, 10, tan);
    bs.position.y = 19;
    bg.add(bs);
    bg.position.set(-80, 0, -46);
    const puffs = [];
    const smat = new THREE.SpriteMaterial({ map: T.tex.cloudTx, color: 0x6a6258, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false });
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(smat.clone());
      sp.userData.k = i / 7;
      bg.add(sp);
      puffs.push(sp);
    }
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowTx, color: 0xff8a30, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    fire.position.y = 32;
    fire.scale.setScalar(16);
    bg.add(fire);
    T.beacon(bg);
    T.beaconAnimate((dt, t, day) => {
      for (const sp of puffs) {
        const k = (t * 0.04 + sp.userData.k) % 1;
        sp.position.set(Math.sin(k * 5 + sp.userData.k * 7) * 2 + k * 8, 33 + k * 110, 0);
        sp.scale.setScalar(8 + k * 38);
        sp.material.opacity = (1 - k) * 0.38;
      }
      fire.material.opacity = 0.5 + day * 0.45 + Math.sin(t * 9) * 0.06;
    });
  }

  /* ================= 绿洲 ================= */
  const oasis = { x: 56, z: 54, rx: 28, rz: 19 };
  {
    const wm = P.std('bazaar:oasis', {
      color: 0x2f8aa0, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.93,
      polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5,
    });
    const pool = K.groundPatch(1, wm, { segs: 36 });
    T.add(pool, oasis.x, oasis.z, 0, 0.1);
    pool.rotation.set(-Math.PI / 2, 0, 0.3);
    pool.scale.set(oasis.rx, oasis.rz, 1);
    // 草地圈：绿洲周围一圈草
    const gr = K.groundPatch(1, P.flat(0x5a8a3a, 1, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), { segs: 36 });
    T.add(gr, oasis.x, oasis.z, 0, 0.06);
    gr.rotation.set(-Math.PI / 2, 0, 0.3);
    gr.scale.set(oasis.rx + 10, oasis.rz + 8, 1);
    // 棕榈：绕着水边
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rand() * 0.2;
      const k = 1.0 + rand.range(0.05, 0.35);
      pts.push([oasis.x + Math.cos(a) * oasis.rx * k, oasis.z + Math.sin(a) * oasis.rz * k]);
    }
    const { trunk: tg, crown: cg } = K.treeGeos('palm');
    const items = pts.map(([x, z]) => ({ x, z, ry: rand() * 6, s: rand.range(0.9, 1.35) }));
    T.add(K.scatter(tg, P.flat(0x7a5a3a, 1), items), 0, 0);
    const palmWind = (hex) => K.windSway(P.flat(hex, 0.9, { side: THREE.DoubleSide }).clone(), { amp: 0.34, speed: 1.7, h: 3.4, radial: true });
    T.add(K.scatter(cg, palmWind(0x3f8a3a), items), 0, 0);
    // 另外一些零散的棕榈
    const far = K.ringPoints(rand, 30, 20, 90, 170, 34, (x, z) => Math.hypot(x - oasis.x, z - oasis.z) < 50);
    const it2 = far.map(([x, z]) => ({ x: x + 0, z, ry: rand() * 6, s: rand.range(0.8, 1.3) }));
    T.add(K.scatter(tg, P.flat(0x7a5a3a, 1), it2), 0, 0);
    T.add(K.scatter(cg, palmWind(0x4a8a3a), it2), 0, 0);
    // 水边的石槽（骆驼饮水处）与取水的人
    const g = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 4, 24), cream);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(oasis.rx, oasis.rz, 1);
    rim.position.y = 0.2;
    rim.rotation.z = 0.3;
    g.add(rim);
    for (let i = 0; i < 4; i++) {
      const bk = cyl(0.4, 0.3, 0.6, 8, P.woodDark);
      bk.position.set(-6 + i * 3, 0.3, oasis.rz + 2);
      g.add(bk);
    }
    g.position.set(0, 0, 0);
    T.landmark(g, oasis.x, oasis.z, 0, {
      name: '绿洲 · The Oasis',
      shortName: '绿洲',
      tag: '整个城市的理由',
      desc: '沙地中间一汪蓝绿色的水，周围一圈绿草，二十几棵棕榈环着水边，羽叶在风里轻轻晃；水边摆着几只木桶，等着人来舀水。',
      detail: '绿洲是沙漠里的"银行"：地下水在这里涌出地面，几百年来一直有人在水边定居、种枣椰、养骆驼。商队的路线不是由距离决定的，而是由水源决定的——"城"其实是"一口井"周围长出来的。',
    }, { dist: 60, height: 28, ty: 3, rot: -0.6 });
  }

  /* ================= 毯子市场 ================= */
  {
    const g = new THREE.Group();
    // 地上铺的大毯子
    const rugsLay = [[-8, -6, 7, 5], [4, -4, 6, 4], [-4, 5, 6.4, 4.2], [9, 5, 5.6, 3.8], [0, 0, 4, 3]];
    rugsLay.forEach(([x, z, w, d], i) => {
      const rg = new THREE.Mesh(new THREE.PlaneGeometry(w, d), rugs[i % rugs.length]);
      rg.rotation.x = -Math.PI / 2;
      rg.position.set(x, 0.12 + i * 0.01, z);
      rg.rotation.z = rand.range(-0.15, 0.15);
      rg.receiveShadow = true;
      g.add(rg);
    });
    // 挂起来的毯子：绳 + 毯
    for (let i = 0; i < 4; i++) {
      const frame = new THREE.Group();
      for (const s of [-1, 1]) {
        const p = box(0.16, 4, 0.16, P.wood);
        p.position.set(s * 2.4, 2, 0);
        frame.add(p);
      }
      const rod = box(4.9, 0.12, 0.12, P.wood);
      rod.position.y = 3.9;
      frame.add(rod);
      const rg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.0), rugs[(i + 1) % rugs.length]);
      rg.position.set(0, 2.3, 0);
      rg.castShadow = true;
      frame.add(rg);
      frame.position.set(-12 + i * 8, 0, -14);
      g.add(frame);
    }
    // 织毯架
    const loom = new THREE.Group();
    for (const s of [-1, 1]) {
      const p = box(0.2, 3.2, 0.2, P.wood);
      p.position.set(s * 1.6, 1.6, 0);
      loom.add(p);
    }
    for (const yy of [0.5, 2.8]) {
      const rod = box(3.4, 0.14, 0.14, P.wood);
      rod.position.y = yy;
      loom.add(rod);
    }
    const warp = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.2), rugs[2]);
    warp.position.set(0, 1.65, 0);
    loom.add(warp);
    loom.position.set(14, 0, -8);
    g.add(loom);
    T.landmark(g, -22, 48, 0.2, {
      name: '毯子市场 · The Carpet Market',
      shortName: '毯子市',
      tag: '一块毯子织两年',
      desc: '广场西侧铺开了十几块大毯子，红的、蓝的、紫的、绿的，图案是几何的菱形与回字；北边一排木架上挂着更大的毯子，东头一座织毯架上还留着织了一半的经线。',
      detail: '波斯和土耳其的手织毯是丝绸之路上最耐用的奢侈品：一块一平方米的毯子要织几十万个结，一个织工要织一年。图案不是随便的——每个家族有自己的花纹，毯子的图案可以告诉你它来自哪里、谁织的。',
    }, { dist: 38, height: 20, ty: 1, rot: 0.2 });
  }

  /* ================= 商队帐篷 ================= */
  {
    const g = new THREE.Group();
    const tent = (x, z, r, mat, h) => {
      const t = new THREE.Group();
      // 方形帐：四个斜面 + 一根脊
      const body = box(r * 1.4, h, r * 1.2, mat);
      body.position.y = h / 2;
      t.add(body);
      const roof = K.hipRoof(r * 1.4, r * 1.2, h * 0.6, mat, 0.3);
      roof.position.y = h;
      t.add(roof);
      const door = box(r * 0.5, h * 0.8, 0.12, P.dark, false);
      door.position.set(0, h * 0.4, r * 0.6 + 0.04);
      t.add(door);
      t.position.set(x, 0, z);
      t.rotation.y = rand.range(-0.6, 0.6);
      g.add(t);
    };
    tent(-8, -4, 4.4, awnings[0], 2.6);
    tent(0, -9, 5.2, awnings[1], 3.0);
    tent(9, -4, 4.6, awnings[3], 2.6);
    tent(-4, 6, 4.0, awnings[2], 2.4);
    tent(8, 7, 4.2, awnings[4], 2.5);
    // 篝火
    const fp = cyl(0.9, 1.0, 0.3, 10, P.stone);
    fp.position.set(0, 0.15, 0);
    g.add(fp);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const lg = box(0.14, 0.14, 1.0, P.woodDark);
      lg.position.set(Math.cos(a) * 0.4, 0.4, Math.sin(a) * 0.4);
      lg.rotation.y = a;
      lg.rotation.z = 0.6;
      g.add(lg);
    }
    // 货包
    const bs = K.sackPile(P, { n: 8, color: 0xa8322a });
    bs.position.set(-12, 0, 6);
    g.add(bs);
    const bs2 = K.crateStack(P, { n: 5 });
    bs2.position.set(12, 0, -10);
    g.add(bs2);
    T.landmark(g, 110, -34, -0.3, {
      name: '商队帐篷 · The Caravan Camp',
      shortName: '帐篷',
      tag: '还没来得及进城的人',
      desc: '城东沙地上扎着五顶条纹布帐篷，红、蓝、绿、黄、紫，帐门朝着中间的篝火；货包和木箱堆在帐边，骆驼就躺在帐外的沙地上。',
      detail: '不是所有商队都住得进城：城门夜里关，或者住店太贵，很多人干脆在城外扎营。他们靠一个"商队首领"（caravan-bashi）管理——他决定每天走多远、在哪停、怎么分水，一旦路上出事，所有人都听他的。',
    }, { dist: 38, height: 20, ty: 2, rot: -0.3 });
    T.glow(110, 1.2, -34, { color: 0xff8a30, size: 4, light: true, gain: 0.8 });
  }

  /* ================= 城墙与西门 ================= */
  {
    const g = new THREE.Group();
    const arc = [];
    for (let a = 100; a <= 262; a += 6) {
      const r = 128;
      arc.push([10 + Math.cos((a * Math.PI) / 180) * r, 10 + Math.sin((a * Math.PI) / 180) * r]);
    }
    // 西边留一个缺口：门所在角度 ≈ 180°（x=-118, z=10）
    const segs = [arc.slice(0, 7), arc.slice(10)];
    for (const s of segs) {
      g.add(K.wallAlong(s, { h: 7.4, thick: 1.5, y0: 0, mat: tan }));
      const mer = [];
      for (let i = 0; i < s.length - 1; i++) {
        const [ax, az] = s[i];
        const [bx, bz] = s[i + 1];
        const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2));
        for (let k = 0; k < n; k++) mer.push({ x: ax + ((bx - ax) * k) / n, y: 8.0, z: az + ((bz - az) * k) / n, ry: Math.atan2(bx - ax, bz - az), sx: 1, sy: 1, sz: 1 });
      }
      g.add(K.scatter(new THREE.BoxGeometry(0.9, 1.0, 1.4), tan, mer));
    }
    // 门楼：两座方塔 + 门洞
    for (const s of [-1, 1]) {
      const tw = box(6, 12, 6, ochre);
      tw.position.set(-118, 6, 10 + s * 9);
      g.add(tw);
      const cap = box(7, 0.8, 7, tan);
      cap.position.set(-118, 12.4, 10 + s * 9);
      g.add(cap);
      const mc = cone(3.2, 2.4, 4, teal);
      mc.rotation.y = Math.PI / 4;
      mc.position.set(-118, 14, 10 + s * 9);
      g.add(mc);
    }
    const lin = box(2.4, 3, 12.6, tan);
    lin.position.set(-118, 10.5, 10);
    g.add(lin);
    T.landmark(g, 0, 0, 0, {
      name: '西门与城墙 · The Caravan Gate',
      shortName: '西门',
      tag: '日落时关门',
      desc: '土墙从北到南围出一道半圆，墙头一圈垛口；西边是进城的大门，两座方塔夹着一座矮门楼，塔顶盖着青绿的小尖顶，门洞宽得足够两峰骆驼并行。',
      detail: '商城的城墙高度不是为了防外敌，而是为了防"风沙和盗匪"：沙暴一来，整座城可以关门，让人和货都安全；强盗不敢硬攻，因为商城的税收养着几百个雇佣兵。每个商队进城都要交"通行税"——也就是说，城墙其实是一座巨大的"收费站"。',
    }, { dist: 52, height: 22, ty: 7, rot: -Math.PI / 2, ox: -118, oz: 10 });
  }

  /* ================= 民居（平顶土屋 + 风塔） ================= */
  {
    const taken = [{ x: -40, z: -12, r: 34 }, { x: 60, z: 20, r: 58 }, { x: 46, z: -56, r: 30 }, { x: -80, z: -46, r: 12 }, { x: oasis.x, z: oasis.z, r: 46 }, { x: -22, z: 48, r: 20 }, { x: 110, z: -34, r: 22 }];
    let placed = 0;
    let guard = 0;
    while (placed < 24 && guard < 900) {
      guard++;
      const a = rand() * Math.PI * 2;
      const r = rand.range(22, 112);
      const x = 10 + Math.cos(a) * r;
      const z = 10 + Math.sin(a) * r;
      if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r)) continue;
      if (Math.abs(z - 20) < 8 && x > 8) continue;   // 别压到香料巷
      if (nearPath(x, z, 11)) continue;              // 也别挡着骆驼商队
      const wash = rand.pick([tan, cream, ochre]);
      const h = T.house({
        w: rand.range(5, 7.5), d: rand.range(5, 7), floors: rand() < 0.5 ? 2 : 1, floorH: 2.8,
        wall: wash, base: null, roof: rand() < 0.2 ? 'dome' : 'flat', roofMat: teal, windows: 1, chimney: false, door: P.woodDark,
      }, x, z, rand.range(-0.6, 0.6));
      // 风塔：屋顶一角的方形小塔（有开口）
      if (rand() < 0.55) {
        const sz = h.userData.size || { w: 6, d: 6, h: 3 };
        const wt = new THREE.Group();
        const tw = box(1.6, 3.2, 1.6, wash);
        tw.position.set(0, 1.6, 0);
        wt.add(tw);
        for (const s of [-1, 1]) {
          const op = box(0.7, 1.4, 0.1, P.dark, false);
          op.position.set(s * 0.4, 2.4, 0.84);
          wt.add(op);
        }
        const cp = box(2.0, 0.3, 2.0, tan);
        cp.position.y = 3.3;
        wt.add(cp);
        wt.position.set(sz.w * 0.28, sz.h, sz.d * 0.2);
        h.add(wt);
      }
      taken.push({ x, z, r: 9 });
      placed++;
    }
    for (const [x, z] of [[-20, 20], [20, 14], [40, 30], [-50, 22], [74, 4], [100, 28], [-8, 50]]) T.lamp(x, z, { ry: 0.5, h: 3.2, light: x === 20 || x === -50 });
    // 道路：西门 → 香料巷与广场
    T.add(K.ribbon([[-118, 10], [-80, 14], [-40, 20], [0, 22], [60, 20], [112, 20]], 7, P.cobble, 0.05), 0, 0);
    T.add(K.ribbon([[0, 22], [10, 40], [-22, 48]], 5, P.cobble, 0.05), 0, 0);
  }

  /* ================= 骆驼商队 ================= */
  {
    const camelMat = P.std('camel:vc', { vertexColors: true, roughness: 0.95 });
    const makeCamel = (load) => {
      const g = new THREE.Group();
      const tanC = 0xc09a5a;
      const dark = 0x8a6a3a;
      const parts = [];
      const body = new THREE.BoxGeometry(0.95, 0.95, 2.5);
      body.translate(0, 1.9, 0);
      parts.push(K.colored(body, tanC));
      for (const z of [0.5, -0.55]) {
        const hump = new THREE.SphereGeometry(0.5, 7, 5);
        hump.scale(1, 0.9, 1);
        hump.translate(0, 2.65, z);
        parts.push(K.colored(hump, tanC));
      }
      const neck = new THREE.BoxGeometry(0.42, 1.5, 0.46);
      neck.rotateX(0.55);
      neck.translate(0, 2.75, 1.55);
      parts.push(K.colored(neck, tanC));
      const head = new THREE.BoxGeometry(0.4, 0.42, 0.85);
      head.translate(0, 3.4, 2.1);
      parts.push(K.colored(head, dark));
      const snout = new THREE.BoxGeometry(0.32, 0.3, 0.3);
      snout.translate(0, 3.28, 2.62);
      parts.push(K.colored(snout, 0x6a4a2a));
      const tail = new THREE.BoxGeometry(0.12, 0.7, 0.12);
      tail.translate(0, 1.75, -1.35);
      parts.push(K.colored(tail, dark));
      if (load) {
        // 驮货：毯子 + 两只大包
        const blanket = new THREE.BoxGeometry(1.15, 0.12, 1.5);
        blanket.translate(0, 2.4, 0);
        parts.push(K.colored(blanket, load[0]));
        for (const s of [-1, 1]) {
          const bag = new THREE.BoxGeometry(0.55, 0.9, 1.1);
          bag.translate(s * 0.72, 1.95, 0);
          parts.push(K.colored(bag, load[1]));
        }
      }
      const bm = new THREE.Mesh(mergeGeometries(parts, false), camelMat);
      bm.castShadow = true;
      g.add(bm);
      const legs = [];
      for (const [lx, lz] of [[-0.3, 0.85], [0.3, 0.85], [-0.3, -0.85], [0.3, -0.85]]) {
        const leg = new THREE.Group();
        const lg = new THREE.BoxGeometry(0.2, 1.6, 0.2);
        lg.translate(0, -0.8, 0);
        const lm = new THREE.Mesh(K.colored(lg, dark), camelMat);
        lm.castShadow = true;
        leg.add(lm);
        leg.position.set(lx, 1.5, lz);
        leg.userData.keepSeparate = true;
        g.add(leg);
        legs.push(leg);
      }
      g.userData.legs = legs;
      g.userData.keepSeparate = true;
      return g;
    };
    const loads = [[0xb8322a, 0xd8b050], [0x2f58a8, 0xcdbf9a], [0xe0a020, 0xa8322a], [0x3f8a4a, 0xd8b050], [0x7a3a8a, 0xcdbf9a], [0xb8322a, 0x2f58a8]];
    const caravan = [];
    loads.forEach((ld, i) => {
      const c = makeCamel(ld);
      T.add(c, 0, 0);
      caravan.push({ g: c, off: i * 0.026 });
    });
    // 沿着一条大环路：沙丘 → 西门前 → 绿洲 → 回沙丘
    const smooth = [];
    // 闭合的 Catmull-Rom
    for (let i = 0; i < PATH.length; i++) {
      const p0 = PATH[(i - 1 + PATH.length) % PATH.length];
      const p1 = PATH[i];
      const p2 = PATH[(i + 1) % PATH.length];
      const p3 = PATH[(i + 2) % PATH.length];
      for (let k = 0; k < 8; k++) {
        const t = k / 8, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        smooth.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    const cum = [0];
    for (let i = 1; i <= smooth.length; i++) {
      const a = smooth[i - 1];
      const b = smooth[i % smooth.length];
      cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const total = cum[cum.length - 1];
    const at = (s) => {
      const d = ((s % 1) + 1) % 1 * total;
      let lo = 0;
      let hi = cum.length - 1;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (cum[m] <= d) lo = m; else hi = m;
      }
      const a = smooth[lo % smooth.length];
      const b = smooth[(lo + 1) % smooth.length];
      const u = (d - cum[lo]) / Math.max(0.001, cum[hi] - cum[lo]);
      return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, ry: Math.atan2(b[0] - a[0], b[1] - a[1]) };
    };
    const speed = 3.2 / total;       // 每秒 3.2 米
    let phase = 0.08;
    // 商队头一个人牵驼
    const guide = T.person({ tabard: 0x8a2a2a, helmet: 'hood' }, 0, 0, 0, 'idle');
    T.animate((dt, t) => {
      phase = (phase + dt * speed) % 1;
      for (const c of caravan) {
        const p = at(phase - c.off);
        c.g.position.set(p.x, 0, p.z);
        c.g.rotation.y = p.ry;
        const sw = Math.sin(t * 4.2 + c.off * 40) * 0.42;
        const ls = c.g.userData.legs;
        ls[0].rotation.x = sw; ls[3].rotation.x = sw;
        ls[1].rotation.x = -sw; ls[2].rotation.x = -sw;
        c.g.position.y = Math.abs(Math.sin(t * 4.2 + c.off * 40)) * 0.05;
      }
      const gp = at(phase + 0.02);
      guide.root.position.set(gp.x, 0, gp.z);
      guide.facingY = gp.ry;
    });
    // 休息的骆驼：帐篷边几头
    for (let i = 0; i < 4; i++) {
      const c = makeCamel(i % 2 ? loads[i] : null);
      T.add(c, 110 + (i - 1.5) * 4 + rand.range(-1, 1), -34 + 12 + rand.range(-2, 2), rand() * 6);
    }
  }

  /* ================= 生气：风沙、塔顶与营火的火焰、绿洲涟漪、香料巷的烟火气、城门旗 ================= */
  {
    // 贴地被风吹着跑的沙尘（白天）
    T.emitter({ x: 0, y: 0.9, z: 20, count: 64, life: 7, size: 0.7, color: 0xd8bd82, opacity: 0.2,
      spread: [150, 0.6, 110], vel: [2.4, 0.05, 0.7], jitter: [0.7, 0.05, 0.4], fadeIn: 0.2, night: 'day' });

    // 引路塔顶的大火盆：真的火舌 + 被风带走的火星
    T.emitter({ x: -80, y: 31.9, z: -46, count: 30, life: 0.95, size: 2.4, color: 0xff8a30, additive: true, opacity: 0.85,
      spread: [0.9, 0.2, 0.9], vel: [0, 2.6, 0], jitter: [0.5, 0.5, 0.5], grow: -0.45, fadeIn: 0.08 });
    T.emitter({ x: -80, y: 32.6, z: -46, count: 16, life: 2.6, size: 0.26, color: 0xffc060, additive: true,
      spread: [0.7, 0.2, 0.7], vel: [0.5, 2.2, 0.1], jitter: [0.5, 0.5, 0.5], wind: [0.55, 0, 0.1], fadeIn: 0.05 });

    // 商队营地的篝火
    T.emitter({ x: 110, y: 1.3, z: -34, count: 16, life: 0.8, size: 1.3, color: 0xff8a30, additive: true, opacity: 0.85,
      spread: [0.5, 0.1, 0.5], vel: [0, 1.5, 0], jitter: [0.25, 0.4, 0.25], grow: -0.5, fadeIn: 0.08 });
    T.emitter({ x: 110, y: 2.4, z: -34, count: 10, life: 4, size: 1.6, color: 0x8a8a84, opacity: 0.2,
      spread: [0.5, 0.1, 0.5], vel: [0.3, 1.2, 0.1], jitter: [0.2, 0.2, 0.2], wind: [0.15, 0, 0.03], grow: 2.5, fadeIn: 0.2 });

    // 绿洲水面：一圈圈涟漪，水边的鸽子
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xe6f6fa, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
    const ripples = [];
    for (let i = 0; i < 6; i++) {
      const a = rand() * 6.28;
      const r = Math.sqrt(rand()) * 0.75;
      const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 24), ringMat.clone());
      m.userData.keepSeparate = true;
      T.add(m, oasis.x + Math.cos(a) * oasis.rx * r, oasis.z + Math.sin(a) * oasis.rz * r, 0, 0.14);
      m.rotation.x = -Math.PI / 2;
      ripples.push({ m, period: rand.range(3, 5), ph: rand() * 6 });
    }
    T.animate((dt, t) => {
      for (const r of ripples) {
        const k = ((t / r.period) + r.ph) % 1;
        r.m.scale.setScalar(0.4 + k * 3.6);
        r.m.material.opacity = (1 - k) * (1 - k) * 0.5;
      }
    });
    T.birds({ count: 6, center: [oasis.x, oasis.z], radius: 26, height: 10, color: 0xf0ede4, scale: 0.8 });

    // 香料巷：摊头上升起的炊烟与五颜六色的香料粉
    T.emitter({ x: 60, y: 2.2, z: 20, count: 12, life: 4, size: 1.1, color: 0xb8b2a4, opacity: 0.16,
      spread: [42, 0.5, 8], vel: [0.1, 0.5, 0.05], jitter: [0.1, 0.1, 0.1], grow: 2, fadeIn: 0.25 });
    for (const [c, off] of [[0xe0702a, -14], [0xb8322a, 0], [0xe0b028, 14]]) {
      T.emitter({ x: 60 + off, y: 1.8, z: 20, count: 10, life: 2.8, size: 0.2, color: c, opacity: 0.55,
        spread: [12, 0.4, 8], vel: [0.08, 0.35, 0.04], jitter: [0.12, 0.1, 0.12], fadeIn: 0.2 });
    }

    // 西门两座门楼顶上的旗
    for (const [z, c] of [[1, 0x2a9a90], [19, 0xd0902a]]) {
      const pole = cyl(0.08, 0.1, 3.2, 6, P.woodDark);
      T.add(pole, -118, z, 0, 16.8);
      T.flag(-118, 17.7, z, { w: 2.8, h: 1.4, color: c, ry: Math.PI + 0.3 });
    }
  }

  /* ================= 居民 ================= */
  {
    const robe = (c) => ({ tabard: c, helmet: 'hood' });
    // 香料巷里逛街的人
    T.walker(robe(0xe0d8c0), [10, 20], [100, 20], 0.5);
    T.walker(robe(0x3a5a8a), [100, 18], [14, 22], 0.55);
    T.walker(robe(0xb8322a), [30, 22], [80, 18], 0.45);
    // 广场与绿洲边
    T.walker({ villager: true }, [40, 44], [70, 40], 0.5);
    for (let i = 0; i < 10; i++) T.person(robe([0xe0d8c0, 0x3a5a8a, 0xb8322a, 0xd8b050][i % 4]), rand.range(-30, 30), rand.range(22, 60), rand() * 6, 'idle');
    // 毯子市场里
    for (let i = 0; i < 4; i++) T.person(robe(0x8a3a5a), -22 + rand.range(-6, 6), 48 + rand.range(-5, 5), rand() * 6, 'idle');
    // 旅店院里
    for (let i = 0; i < 3; i++) T.person(robe(0x8a6a3a), -40 + rand.range(-8, 8), -12 + rand.range(-8, 8), rand() * 6, 'idle');
    // 绿洲取水
    for (let i = 0; i < 3; i++) T.person(robe(0x4a6a3a), oasis.x - 6 + i * 3, oasis.z + oasis.rz + 3.5, Math.PI, 'idle');
  }

  T.overview({
    name: '商队集市 · Caravan Bazaar',
    tag: '丝绸与香料的尽头',
    desc: '大陆最东南的沙漠边缘：一汪绿洲边长出一座土黄色的商城。西边是挂满骆驼的商队旅店和土墙西门，往东是一百米长的条纹遮篷香料巷，北边是青绿大圆顶和三十多米高的宣礼塔；每天傍晚，一队驮货的骆驼从沙丘后走出，绕着绿洲进城，塔顶的火一点就是一整夜。',
    detail: '丝绸之路不是一条路，而是一张由绿洲连起来的网：这里的人从不生产丝绸，也不种香料，他们只做一件事——转手。靠着"每过一站加一道价"，东方的货到欧洲能涨一百倍，所以这座城里最大的财富不是黄金，而是消息：谁知道下一站什么最缺，谁就能发财。',
  }, { cx: 20, cz: 20, dist: 270, height: 125, rot: -2.0 });
}
