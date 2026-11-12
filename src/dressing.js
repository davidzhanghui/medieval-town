import * as THREE from 'three';
import * as POP from './population.js';
import * as VIL from './village.js';
import * as FESTIVAL from './festival.js';

/* 外围与客栈方向的灯火、农夫，以及镇中心的集日。 */
export function buildDressing({ scene, glowTx, woodMaterial, ironMat, VM, TM, box, cyl, registerInteractive, torchFlames, torchLights, lampHaloes, schedule, addPerson, GRASS_Y, FARMSTEADS, TOWN_POS, townCenter, tat, onPad, HOLY_WELL, TITHE_BARN, ALMSHOUSE, MASONS_LODGE, HERMITAGE, TRAINING_YARD, HORSE_FAIR, TOURNEY_FAIR, ARMORER_CAMP, SURGEON_TENT, FERRY, SHRINE, CAMPFIRE, WAYSTATION, GRAVEYARD2, ABBEY_MILL, SHEEPFOLD, APIARY, RUIN_CHAPEL, HORSE_PASTURE, ARCHERY, TIMBER_YARD, SADDLERY, KNIGHT_MANOR, TOLL_GATE, WATCHTOWER, HOSPITAL, MILLER_COTTAGE, GALLOW }) {
/* ============================================================
 *  三处新场景的夜间照明：木杆油灯，入夜点亮
 * ========================================================== */
{
  const pole = woodMaterial(1.6);

  // [世界坐标 x, z, 朝向, 灯杆高]
  const LAMPS = [
    // 修道院：院门外、回廊四角
    [-49.5, -27.5, 0.6, 3.0],
    [-72.5, -39.5, 2.2, 2.8],
    [-103.5, -64.5, 3.8, 2.8],
    [-77.5, -75.0, 5.2, 2.8],
    [-99.5, -28.0, 1.0, 2.8],

    // 比武场：门楼两侧、看台两端、营帐区
    [59.0, -100.0, 0.2, 3.2],
    [50.0, -118.5, 1.4, 3.2],
    [-6.5, -94.5, 2.6, 2.8],
    [2.0, -134.0, 4.0, 2.8],
    [14.0, -136.0, 5.4, 2.8],

    // 客栈：主楼门口、院门口、马厩前
    [-114.6, 8.0, 0.9, 3.0],
    [-116.4, 25.5, 2.3, 3.0],
    [-125.0, 28.0, 3.7, 2.8],
  ];

  for (const [x, z, r, h] of LAMPS) {
    const g = new THREE.Group();
    g.position.set(x, GRASS_Y, z);
    g.rotation.y = r;

    const post = cyl(0.08, 0.11, h, 7, pole);
    post.position.y = h / 2;
    g.add(post);

    const arm = box(0.8, 0.08, 0.08, ironMat, false);
    arm.position.set(0.38, h - 0.06, 0);
    g.add(arm);

    const glass = box(0.24, 0.32, 0.24, TM.lanternGlass, false);
    glass.position.set(0.74, h - 0.3, 0);
    glass.userData.keepSeparate = true;
    g.add(glass);

    const cap = box(0.32, 0.07, 0.32, ironMat, false);
    cap.position.set(0.74, h - 0.11, 0);
    g.add(cap);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTx, color: 0xffb14a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.position.set(0.74, h - 0.3, 0);
    glow.scale.setScalar(1.7);
    g.add(glow);
    lampHaloes.push(glow);

    const light = new THREE.PointLight(0xffa848, 0, 16, 2);
    light.position.set(0.74, h - 0.3, 0);
    light.userData.gain = 0.4;
    light.userData.rangeGain = 0.55;
    g.add(light);
    torchLights.push(light);

    scene.add(g);
  }
}

/* ============================================================
 *  十五处外围场景的灯火
 *  每个场景在自己正面（局部 +Z）挑一处立灯杆，正对人来的方向。
 *  只有五处真正挂点光源——校场、场外集市、货栈、渡口、篝火营地，
 *  那几处夜里真有人聚着；其余的只亮灯罩，不做光源省着色器开销。
 * ========================================================== */
{
  const pole = woodMaterial(1.6);

  // [场景, 局部 x, 局部 z, 灯杆高, 是否挂点光源]
  const OUT_LAMPS = [
    // 修道院方向
    [HOLY_WELL, -4.0, 12.0, 2.9, false],
    [TITHE_BARN, 5.0, 12.0, 2.9, false],
    [ALMSHOUSE, -5.0, 11.0, 2.8, false],
    [MASONS_LODGE, 6.0, 12.0, 3.0, false],
    [HERMITAGE, -4.0, 12.0, 2.6, false],
    // 比武场方向
    [TRAINING_YARD, 0.0, 12.0, 3.0, true],
    [HORSE_FAIR, -6.0, 12.0, 2.9, false],
    [TOURNEY_FAIR, 4.0, 14.0, 3.0, true],
    [ARMORER_CAMP, -3.0, 9.0, 2.7, false],
    [SURGEON_TENT, 3.0, 10.0, 2.6, false],
    // 客栈方向
    [FERRY, -5.0, 13.0, 2.9, true],
    [SHRINE, 2.0, 8.0, 2.4, false],
    [CAMPFIRE, -3.0, 9.0, 2.6, true],
    [WAYSTATION, 4.0, 11.0, 3.0, true],
    // 荒村不点灯——没人回来了

    // ---- 第二圈 ----
    [GRAVEYARD2, 0.0, 13.0, 2.6, false],       // 墓地：龛前一盏
    [ABBEY_MILL, 6.0, 6.0, 2.9, true],         // 磨坊门口
    [SHEEPFOLD, 0.0, 15.0, 2.7, false],        // 羊圈门口
    [APIARY, -2.0, 8.0, 2.5, false],           // 蜂场
    [RUIN_CHAPEL, 0.0, 12.0, 2.4, false],      // 小教堂门前
    [HORSE_PASTURE, 4.0, 18.0, 2.9, true],     // 牧马场栅门
    [ARCHERY, -12.0, 4.0, 2.7, false],         // 箭术场起射线
    [TIMBER_YARD, 0.0, 13.0, 2.9, true],       // 木料场
    [SADDLERY, 0.0, 7.0, 2.6, false],          // 马具匠门口
    [KNIGHT_MANOR, 0.0, 12.0, 3.0, true],      // 老骑士宅院门
    [TOLL_GATE, -5.0, 4.0, 3.0, true],         // 关卡岗亭外
    [WATCHTOWER, 4.0, 6.0, 2.8, false],        // 瞭望塔梯脚
    [HOSPITAL, -6.0, 4.0, 2.8, true],          // 病舍门口
    [MILLER_COTTAGE, -4.0, 10.0, 2.8, true],   // 水磨人家院门口
    [GALLOW, -4.0, 6.0, 2.5, false],           // 绞架旁
  ];

  for (const [spot, lx, lz, h, real] of OUT_LAMPS) {
    const w = onPad(spot.x, spot.z, spot.rot)(lx, lz);

    const g = new THREE.Group();
    g.position.set(w.x, GRASS_Y, w.z);
    // 灯臂（局部 +X）一律指向场景中心，人从路上走进来时正好看见灯面
    g.rotation.y = Math.atan2(-(spot.z - w.z), spot.x - w.x);

    const post = cyl(0.08, 0.11, h, 7, pole);
    post.position.y = h / 2;
    g.add(post);

    const arm = box(0.8, 0.08, 0.08, ironMat, false);
    arm.position.set(0.38, h - 0.06, 0);
    g.add(arm);

    const glass = box(0.24, 0.32, 0.24, TM.lanternGlass, false);
    glass.position.set(0.74, h - 0.3, 0);
    glass.userData.keepSeparate = true;
    g.add(glass);

    const cap = box(0.32, 0.07, 0.32, ironMat, false);
    cap.position.set(0.74, h - 0.11, 0);
    g.add(cap);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTx, color: 0xffb14a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.position.set(0.74, h - 0.3, 0);
    glow.scale.setScalar(1.7);
    g.add(glow);
    lampHaloes.push(glow);

    if (real) {
      const light = new THREE.PointLight(0xffa848, 0, 16, 2);
      light.position.set(0.74, h - 0.3, 0);
      light.userData.gain = 0.38;
      light.userData.rangeGain = 0.55;
      g.add(light);
      torchLights.push(light);
    }

    scene.add(g);
  }
}

const farmers = [];

function addFarmer(x, z, rot, tool, walk = null) {
  const model = POP.makePerson({
    helmet: Math.random() > 0.55 ? 'hood' : 'none',
    weapon: 'none',
    shield: false,
    cape: Math.random() > 0.75,
    tabard: [0x8a6a3a, 0x5e6b3a, 0x7a4630, 0x445a6e, 0x8c7a58][(Math.random() * 5) | 0],
  });

  // 农具挂在右手
  const toolMesh = VIL.makeFarmTool(VM, tool);
  toolMesh.position.set(0.34, 1.02, 0.1);
  toolMesh.rotation.z = 0.12;
  model.body.add(toolMesh);
  model.armR.rotation.x = -0.5;

  const rec = addPerson(model, x, GRASS_Y, z, rot, walk || 'idle');
  rec.tool = toolMesh;
  // 就近找一间农舍当回家的门（田里干活的人天黑就走）
  let best = null;
  let bestD = Infinity;
  for (const f of FARMSTEADS) {
    const d = Math.hypot(f.x - x, f.z - z);
    if (d < bestD) { bestD = d; best = f; }
  }
  if (best) {
    const dx = Math.sin(best.rot) * (best.d * 0.5 + 1.4);
    const dz = Math.cos(best.rot) * (best.d * 0.5 + 1.4);
    schedule(rec, best.x + dx, best.z + dz, best.rot + Math.PI);
  }
  farmers.push(rec);
  return rec;
}

// 田间劳作
addFarmer(-18, 92, 0.6, 'scythe');
addFarmer(-15, 95, -1.1, 'pitchfork');
addFarmer(24, 104, 2.4, 'hoe');
addFarmer(-46, 116, 1.0, 'scythe');
addFarmer(-70, 152, 0.3, 'pitchfork');

// 院子里干活 / 走动
addFarmer(-24, 78, 1.4, 'hoe', { walk: { from: [-24, 78], to: [-19, 84], speed: 0.5 } });
addFarmer(21, 88, -0.6, 'pitchfork', { walk: { from: [21, 88], to: [27, 92], speed: 0.55 } });
addFarmer(9, 140, 2.9, 'hoe', { walk: { from: [9, 140], to: [16, 143], speed: 0.45 } });
addFarmer(-31, 89, 0.8, 'pitchfork'); // 井边
addFarmer(-36, 130, -0.4, 'hoe');     // 牧羊
addFarmer(-58, 103, 1.6, 'scythe');

/* ---- 镇上的人：摊主、买家、铁匠、酒客 ---- */
{
  const p = (sx, sz) => tat(sx, sz);
  const faceTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

  // 五个摊主，站在自己柜台后面（本地 -Z 侧）
  const STALL_X = [-9.4, -4.7, 0, 4.7, 9.4];
  // 收摊后各回各家：南排两幢楼的门前
  const TOWN_DOORS = [[-14.0, 13.0], [-5.5, 13.4], [-9.6, 13.2], [-16.8, 12.6], [-3.2, 12.8]];
  STALL_X.forEach((sx, i) => {
    const pos = p(sx, -7.6);
    const rec = addPerson(
      POP.makePerson({
        helmet: Math.random() > 0.6 ? 'hood' : 'none',
        weapon: 'none',
        shield: false,
        tabard: [0x8a6a3a, 0x5e6b3a, 0x7a4630, 0x445a6e, 0x8c7a58][i],
      }),
      pos.x, GRASS_Y, pos.z, TOWN_POS.rot + Math.PI
    );
    // 摊主天不亮就出摊，天黑后回南排的屋子
    const h = p(...TOWN_DOORS[i]);
    schedule(rec, h.x, h.z, TOWN_POS.rot);
  });

  // 逛集市的人：有的站在摊前挑货，有的沿广场来回走
  const SHOPPERS = [
    [-6.8, -4.2, 0], [-1.8, -4.0, 0], [3.0, -4.4, 0],
    [7.8, -3.8, 0], [-11.0, 2.0, 1], [11.4, -1.0, 1],
    [-2.0, 5.0, 0], [5.5, 6.5, 0],
  ];
  // 顾客散场后各回各家：前四个回南排，后四个回东侧
  const SHOP_HOMES = [
    [-12.4, 13.2, Math.PI], [-7.4, 13.6, Math.PI], [-2.8, 13.2, Math.PI], [-1.0, 12.8, Math.PI],
    [17.4, 10.6, -Math.PI / 2], [17.6, 8.2, -Math.PI / 2],
    [-15.2, 13.8, Math.PI], [18.2, 12.4, -Math.PI / 2],
  ];
  SHOPPERS.forEach(([sx, sz, walk], i) => {
    const pos = p(sx, sz);
    const model = POP.makePerson({
      helmet: Math.random() > 0.5 ? 'hood' : 'none',
      weapon: 'none', shield: false,
      cape: Math.random() > 0.8,
      tabard: [0x5e6b3a, 0x7a4630, 0x445a6e, 0x8c7a58, 0x6b4a6e][(Math.random() * 5) | 0],
    });

    let rec;
    if (walk) {
      // 沿广场横穿：本地 x 方向来回
      const a = p(-11, sz);
      const b = p(11, sz);
      rec = addPerson(model, a.x, GRASS_Y, a.z, faceTo(a, b), {
        walk: { from: [a.x, a.z], to: [b.x, b.z], speed: 0.42 },
      });
    } else {
      // 面朝北边的摊位
      const face = faceTo(pos, p(sx, -8));
      rec = addPerson(model, pos.x, GRASS_Y, pos.z, face);
    }
    const [hx, hz, hf] = SHOP_HOMES[i] || SHOP_HOMES[0];
    const h = p(hx, hz);
    schedule(rec, h.x, h.z, TOWN_POS.rot + hf);
    // 走着逛的顾客：原地待着的记录点就是起点，回家时再从当前位置算方向
    rec.work = { x: rec.root.position.x, z: rec.root.position.z, face: rec.facingY };
  });

  // 铁匠：站在铁砧边，手里有锤子
  {
    const pos = p(10.0, 15.6);
    const smith = POP.makePerson({
      helmet: 'none', weapon: 'none', shield: false,
      tabard: 0x4a3524,
    });
    const hammer = new THREE.Group();
    const haft = cyl(0.04, 0.045, 0.62, 6, woodMaterial(1));
    haft.position.y = -0.1;
    hammer.add(haft);
    const head = box(0.2, 0.12, 0.1, ironMat);
    head.position.y = 0.24;
    hammer.add(head);
    hammer.position.set(0.34, 1.02, 0.12);
    hammer.rotation.z = 0.4;
    smith.body.add(hammer);
    smith.armR.rotation.x = -0.7;

    const face = faceTo(pos, p(12.5, 16.5));
    const rec = addPerson(smith, pos.x, GRASS_Y, pos.z, face);
    rec.anvilSwing = hammer;
    rec.isSmith = true;
    // 铁匠铺后面就是他家，上一段台阶就进门
    const h = p(15.2, 13.0);
    schedule(rec, h.x, h.z, TOWN_POS.rot + Math.PI * 0.5);
  }

  // 酒馆门口举杯闲聊的两个人
  {
    const spots = [[-14.6, -11.6], [-16.6, -11.6]];
    spots.forEach(([sx, sz], i) => {
      const pos = p(sx, sz);
      const model = POP.makePerson({
        helmet: 'none', weapon: 'none', shield: false,
        tabard: [0x7d1c22, 0x445a6e][i],
      });
      const mug = cyl(0.075, 0.065, 0.17, 8, woodMaterial(1), false);
      mug.position.set(0.3, 1.34, 0.16);
      model.body.add(mug);
      model.armR.rotation.x = -1.05;

      const rec = addPerson(model, pos.x, GRASS_Y, pos.z, TOWN_POS.rot + Math.PI * 0.55 + i * 0.5);
      // 酒客回得最晚——他们要等打烊
      rec.lateNight = true;
      const h = p(-15.6 - i * 2.1, -14.2);
      schedule(rec, h.x, h.z, TOWN_POS.rot + Math.PI);
    });
  }

  // 教堂门口的一个神职
  {
    const pos = p(-25, 8.0);
    const rec = addPerson(
      POP.makePerson({ helmet: 'hood', weapon: 'none', shield: false, cape: true, tabard: 0x2b2b33 }),
      pos.x, GRASS_Y, pos.z, TOWN_POS.rot - Math.PI / 2
    );
    // 神职从教堂侧门回堂后的住处
    const h = p(-19.0, -4.0);
    schedule(rec, h.x, h.z, TOWN_POS.rot);
  }
}

/* ============================================================
 *  集市节庆：彩旗、五月柱、花环拱门、火盆、长桌、驴车
 *  这些只在"集日"出现（默认开，按钮可关），入夜多半收起来
 * ========================================================== */
const festival = new THREE.Group();
festival.visible = false;
townCenter.add(festival);
let festivalPad = null;

const FEST = {
  on: true,        // 是否办集
  amount: 0,       // 0 → 1 淡入
  maypole: null,
  ribbons: null,
  braziers: [],
  lights: [],
  cart: null,
  cartT: 0,
  fadeMats: [],
  glowMats: [],
};

{
  const fadd = (obj, x, z, ry = 0, y = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.y = ry;
    festival.add(obj);
    return obj;
  };

  // 两串横跨广场的彩旗
  fadd(FESTIVAL.makeBunting(TM, { span: 22, h: 5.0, sag: 0.9 }), 0, -2.2, 0);
  fadd(FESTIVAL.makeBunting(TM, { span: 19, h: 4.6, sag: 0.8 }), 0, 9.0, 0);

  // 广场入口的花环拱门：立在大路进广场的东口，横跨路面
  fadd(FESTIVAL.makeGarlandArch(TM, { w: 5.4, h: 3.7 }), 14.6, 0.4, Math.PI / 2);

  // 五月柱立在石十字旁边——节庆时全广场围着它转
  const pole = FESTIVAL.makeMaypole(TM, { height: 7.2 });
  fadd(pole, -7.4, 4.2, 0);
  FEST.maypole = pole;
  FEST.ribbons = pole.userData.ribbons;

  // 四座火盆围住广场
  for (const [x, z] of [[-8.6, -3.2], [8.6, -3.2], [-8.6, 8.2], [8.6, 8.2]]) {
    const b = FESTIVAL.makeBrazier(TM);
    fadd(b, x, z, 0);

    // 火盆里的炭火 + 火光
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTx, color: 0xff8a2a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    fire.position.copy(b.userData.firePos);
    fire.scale.setScalar(3.2);
    fire.userData.baseScale = 3.2;
    b.add(fire);
    torchFlames.push({ flame: fire, core: null, seed: 21.3 + FEST.braziers.length * 1.7 });

    const light = new THREE.PointLight(0xff8a30, 0, 20, 2);
    light.position.copy(b.userData.firePos);
    b.add(light);
    torchLights.push(light);

    FEST.braziers.push({ group: b, fire, light });
  }

  // 两条长桌，摆在五月柱两侧
  fadd(FESTIVAL.makeFestivalTable(TM, 4.8), 4.6, 2.0, 0.12);
  fadd(FESTIVAL.makeFestivalTable(TM, 4.2), -2.8, 10.4, -0.2);

  // 赶集的驴车：从镇上大路一路赶到广场边，停下卸货
  const cart = FESTIVAL.makeDonkeyCart(TM);
  const cartStart = tat(26, 2.4);
  cart.position.set(cartStart.x, GRASS_Y, cartStart.z);
  scene.add(cart);
  FEST.cart = cart;
  FEST.cartT = 0.02;

  // 收集所有需要淡入淡出的材质（每组各自一份，不会重复）
  FEST.fadeMats = [];
  festival.traverse((o) => {
    if (o.userData && o.userData.fadeMats) FEST.fadeMats.push(...o.userData.fadeMats);
  });

  // 集日本身也是个可点的地方：一块只罩住五月柱的透明板
  // （不能铺满整个广场，否则摊位和地面的点击全被它挡掉）
  {
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(6, 7, 6),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
    );
    pad.position.set(-7.4, 3.2, 4.2);
    pad.userData.keepSeparate = true;
    festival.add(pad);
    registerInteractive(pad, {
      name: '集日 · Market Fair',
      tag: '一个月里最热闹的几天',
      desc: '逢集日，方圆十几里的农户推车挑担赶来，广场上支满布篷，彩旗从这头拉到那头。五月柱立在石十字旁边，天一黑火盆就点起来，鼓乐和人声能闹到半夜。',
      detail: '集日往往跟宗教节日绑在一起——圣徒纪念日既是弥撒，也是开市的日子。领主靠"集场权"收税，也靠它把周边的生意拢到自己镇上。',
      view: { pos: [-104, 13, 148], target: [-118, 4, 130] },
    });
    festivalPad = pad;
  }
}

/* ---- 打铁火星：铁砧边上溅出来的一小把金色粒子 ---- */
const forgeSparks = [];
{
  const sparkMat = new THREE.SpriteMaterial({
    map: glowTx, color: 0xffb347, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  for (let i = 0; i < 22; i++) {
    const sp = new THREE.Sprite(sparkMat.clone());
    sp.scale.setScalar(0.16 + Math.random() * 0.1);
    sp.visible = false;
    scene.add(sp);
    forgeSparks.push({ sprite: sp, life: 0, vel: new THREE.Vector3() });
  }
  FEST.sparkCursor = 0;
  FEST.sparkTimer = 0;
}

  return { festival, festivalPad, FEST, forgeSparks };
}
