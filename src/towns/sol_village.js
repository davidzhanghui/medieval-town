import * as THREE from 'three';
import { solKit } from './sol_shared.js';

/* ============================================================
 *  橄榄村 Olivar —— 梯田橄榄林里的白房子小村
 *
 *  山坡被石墙切成一层层梯田，每层种着银灰色的橄榄树；
 *  村中央是蓝顶小礼拜堂和一座榨油坊——石碾子被一头驴拉着一圈圈转；
 *  村外有晒谷场、鸽塔、羊圈，和一排排蜂箱。
 * ========================================================== */
export default function build(T) {
  const { K, P, rand } = T;
  const { box, cyl, sphere } = K;
  const S = solKit(P, K);
  const { M } = S;

  T.add(K.groundPatch(115, P.flat(0xa68f5a, 1, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { segs: 44 }), 0, 0, 0, 0.03);

  /* 梯田：四层弧形矮石墙，墙间种橄榄 */
  const terraceTrees = [];
  for (let k = 0; k < 4; k++) {
    const r = 48 + k * 17;
    const pts = [];
    for (let a = -0.9; a <= 0.9; a += 0.12) pts.push([Math.sin(a) * r, -Math.cos(a) * r * 0.9 - 8]);
    T.add(K.wallAlong(pts, { h: 1.3, thick: 0.7, mat: M.sandD }), 0, 0);
    for (let a = -0.85; a <= 0.85; a += 0.16 + rand() * 0.05) {
      const rr = r + 7 + (rand() - 0.5) * 3;
      terraceTrees.push([Math.sin(a) * rr, -Math.cos(a) * rr * 0.9 - 8]);
    }
  }
  T.add(S.olives(terraceTrees, rand), 0, 0);
  T.add(S.olives(K.ringPoints(rand, 0, 0, 78, 108, 34, (x, z) => z < -30), rand), 0, 0);
  T.add(S.cypresses(K.ringPoints(rand, 0, 0, 20, 90, 14, (x, z) => Math.hypot(x, z) < 22), rand), 0, 0);

  /* 蓝顶礼拜堂 */
  {
    const g = new THREE.Group();
    const b = box(8, 6, 10, M.white);
    b.position.y = 3;
    g.add(b);
    const d = S.bigDome(3.6, { cap: M.teal, drum: M.white, drumH: 2 });
    d.position.set(0, 6, -1);
    g.add(d);
    const bell = box(2.2, 4, 2.2, M.white);
    bell.position.set(3.4, 8, 3);
    g.add(bell);
    const bm = S.archedWall(2.2, 1.8, 2.2, 1, M.white, { aw: 1.0, ah: 1.6 });
    bm.position.set(3.4, 10, 3);
    g.add(bm);
    const cone = K.cone(1.7, 2.2, 4, M.teal);
    cone.position.set(3.4, 11.9, 3);
    cone.rotation.y = Math.PI / 4;
    g.add(cone);
    const door = box(1.4, 2.5, 0.2, M.door);
    door.position.set(0, 1.25, 5.1);
    g.add(door);
    T.landmark(g, 0, 0, 0, {
      name: '蓝顶礼拜堂 · The Blue Chapel',
      shortName: '蓝顶堂',
      tag: '全村最亮的颜色',
      desc: '白灰泥的方屋，顶上一座蓝釉小圆顶，侧面一座带钟的方塔；门是一整块青蓝色的木板。',
      detail: '蓝色在这个王国里是“水”的颜色。橄榄村夏天几乎不下雨，村民把最值钱的一桶釉都给了礼拜堂的顶，希望它能把雨招来。',
    }, { dist: 30, height: 14, ty: 5, rot: 0.3 });
  }
  /* 榨油坊：石碾槽 + 转动的碾盘（驴拉） */
  {
    const g = new THREE.Group();
    const house = box(10, 4.5, 8, M.cream);
    house.position.set(0, 2.25, -4);
    g.add(house);
    const roof = box(11, 0.3, 9, M.terra);
    roof.position.set(0, 4.6, -4);
    g.add(roof);
    const bed = cyl(3.4, 3.6, 0.8, 16, M.sandD);
    bed.position.set(0, 0.4, 6);
    g.add(bed);
    const rim = cyl(3.5, 3.5, 0.2, 16, M.sandL, false);
    rim.position.set(0, 0.88, 6);
    g.add(rim);
    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(0, 0.9, 6);
    const stone = cyl(1.4, 1.4, 0.5, 14, P.flat(0x9a9488, 1));
    stone.rotation.z = Math.PI / 2;
    stone.position.set(1.9, 0.9, 0);
    wheelPivot.add(stone);
    const arm = box(4.4, 0.2, 0.2, M.wood);
    arm.position.set(2.2, 0.9, 0);
    wheelPivot.add(arm);
    const donkey = S.goat(1.4);
    donkey.group.position.set(3.9, 0, 0);
    donkey.group.rotation.y = Math.PI / 2;
    wheelPivot.add(donkey.group);
    wheelPivot.userData.keepSeparate = true;
    g.add(wheelPivot);
    // 油罐
    g.add(S.pots(Array.from({ length: 9 }, (_, i) => [-5 + (i % 5) * 1.1, -0.3 + ((i / 5) | 0) * 1.2]), rand));
    T.landmark(g, 18, 8, -0.6, {
      name: '榨油坊 · The Olive Press',
      shortName: '榨油坊',
      tag: '一头驴，一天一圈圈',
      desc: '石碾槽里一块圆形大碾石，被一头驴拉着绕圈转，把橄榄压成糊；旁边的屋里排着一排排陶油罐。',
      detail: '十一月橄榄成熟，全村人都来摘。一棵老树能出二十公斤果，三十公斤果压一公斤油。第一道冷榨的油绿得发亮，要留给礼拜堂和新郎新娘。',
    }, { dist: 28, height: 15, ty: 1, rot: -0.6 });
    // 碾盘每帧转 —— 需要拿到 landmark 后的 pivot
    T.animate((dt) => { wheelPivot.rotation.y += dt * 0.35; });
  }

  /* 民居：围着礼拜堂堆成一小团 */
  const homes = [];
  let tries = 0;
  while (homes.length < 26 && tries++ < 1500) {
    const a = rand() * 6.28, r = 14 + rand() * 38;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8 + 4;
    if (Math.hypot(x - 18, z - 8) < 14 || Math.hypot(x, z) < 10) continue;
    if (homes.some((h) => Math.hypot(h.x - x, h.z - z) < 8)) continue;
    homes.push({ x, z });
    S.whiteHouse(T, rand, x, z, Math.atan2(-x, -z) + (rand() - 0.5) * 0.5, { floors: rand() < 0.2 ? 2 : 1, w: 5 + rand() * 2.5, d: 4.5 + rand() * 2 });
  }
  T.add(S.pots(homes.map((h) => [h.x + 1, h.z + 3.8]), rand), 0, 0);

  /* 鸽塔 + 晒谷场 + 蜂箱 + 羊圈 */
  {
    const g = new THREE.Group();
    const t = cyl(2.3, 2.7, 8, 12, M.sandL);
    t.position.y = 4;
    g.add(t);
    const roof = K.cone(2.7, 2.2, 12, M.terra);
    roof.position.y = 9;
    g.add(roof);
    const holes = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) holes.push({ x: Math.sin((j / 8) * 6.28) * 2.45, y: 5 + i * 0.7, z: Math.cos((j / 8) * 6.28) * 2.45, sx: 0.28, sy: 0.28, sz: 0.2, ry: (j / 8) * 6.28 });
    g.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), M.dark, holes));
    T.landmark(g, -34, 26, 0, {
      name: '鸽塔 · The Dovecote',
      shortName: '鸽塔',
      tag: '一千个洞，一千只鸽子',
      desc: '八米高的圆塔，塔身开着上百个方形小洞，尖顶上盖赤陶瓦；清晨鸽子成群飞出，傍晚又回来。',
      detail: '鸽粪是橄榄林最好的肥，所以鸽塔归全村共有，谁家的树结得多，谁就多分到几筐。',
    }, { dist: 22, height: 11, ty: 4, rot: 0.2 });
  }
  const floor = K.groundPatch(9, M.paving, { soft: false, segs: 24 });
  T.add(floor, -22, -20, 0, 0.06);
  for (let i = 0; i < 6; i++) {
    const hv = box(0.7, 0.7, 0.9, P.flat(0xeadfba, 1));
    T.add(hv, 30 + (i % 3) * 1.4, -22 + ((i / 3) | 0) * 1.6, 0, 0.4);
  }
  const pen = [];
  for (let a = 0; a < 6.28; a += 0.3) pen.push([-30 + Math.cos(a) * 8, -4 + Math.sin(a) * 6]);
  T.add(K.fenceLine(P, pen, { gap: 1.6, h: 1.1 }), 0, 0);
  for (let i = 0; i < 12; i++) {
    const gt = S.goat(1);
    gt.group.userData.keepSeparate = true;
    T.add(gt.group, -30 + (rand() - 0.5) * 11, -4 + (rand() - 0.5) * 8, rand() * 6.28);
    const ph = rand() * 6;
    T.animate((dt, t) => { gt.head.rotation.x = 0.45 + Math.sin(t * 0.42 + ph) * 0.3; });
  }

  /* 人 */
  const peasant = (c) => ({ tabard: c, helmet: 'hood', weapon: 'none', cape: false });
  for (let i = 0; i < 14; i++) {
    const p = terraceTrees[(rand() * terraceTrees.length) | 0];
    T.person({ villager: true }, p[0] + 1.4, p[1] + 1, rand() * 6, 'idle');
  }
  for (let i = 0; i < 10; i++) {
    const h = homes[(rand() * homes.length) | 0];
    T.walker(peasant(S.ROBES[(rand() * 7) | 0]), [h.x, h.z + 5], [h.x + (rand() - 0.5) * 18, h.z + 5 + (rand() - 0.5) * 8], 0.4 + rand() * 0.2);
  }
  for (let i = 0; i < 3; i++) T.person({ villager: true }, -22 + (i - 1) * 3, -20 + (i % 2) * 2, rand() * 6, 'idle');
  for (let i = 0; i < 8; i++) T.lamp(-34 + i * 9, 12 + (i % 2) * 6, { h: 3.2 });
  T.birds({ count: 10, center: [-34, 26], radius: 18, height: 16, color: 0xf0ece0, scale: 0.7 });

  T.overview({
    name: '橄榄村 · Olivar',
    tag: '山坡上的银灰色梯田',
    desc: '白房子簇拥着一座蓝顶小礼拜堂，四层弧形石墙梯田种满橄榄；村东的榨油坊有一头驴在拉碾，村西是鸽塔和羊圈。',
    detail: '橄榄是这个王国的血液：油拿去点灯、做饭、涂身体、洗衣服，渣子喂牲口，枝条当柴烧。村里最老的树两千岁了，还年年结果。',
  }, { dist: 190, height: 100, rot: 0.2 });

  const bc = new THREE.Group();
  const bt = cyl(2.3, 2.7, 8, 10, M.sandL);
  bt.position.set(-34, 4, 26);
  bc.add(bt);
  const bd = S.bigDome(3.6, { cap: M.teal, drum: M.white, drumH: 2 });
  bd.position.set(0, 6, -1);
  bc.add(bd);
  T.beacon(bc);
}
