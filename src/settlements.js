import * as THREE from 'three';
import * as VIL from './village.js';
import * as FORT from './fortress.js';
import * as POP from './population.js';
import * as TOWN from './town.js';
import * as IND from './industry.js';
import * as PRIORY from './priory.js';
import * as TOURNEY from './tournament.js';
import * as INN from './inn.js';
import * as P_OUT from './priory_outskirts.js';
import * as T_OUT from './tournament_outskirts.js';
import * as I_OUT from './inn_outskirts.js';
import * as P_OUT2 from './priory_outskirts2.js';
import * as T_OUT2 from './tournament_outskirts2.js';
import * as I_OUT2 from './inn_outskirts2.js';

/* 城堡外的旧世界：村落、前哨、镇中心、工匠区、修道院、比武场、客栈，以及两圈外围。 */
export function buildSettlements({ keepWindows, scene, glowTx, awningMaps, woodMaterial, ironMat, villageWindows, VM, TM, box, cyl, registerInteractive, torchFlames, torchLights, windmills, waterWheels, stalls, bellRopes, BELL_POS, BELFREY_GLOW, ANVIL_POS, lampHaloes, TABARDS_RED, TABARDS_BLUE, schedule, addPerson }) {
/* ============================================================
 *  城堡外的村落
 * ========================================================== */
const village = new THREE.Group();
scene.add(village);
// 牲畜单独成组：数量多、不需要点击拾取
const livestock = new THREE.Group();
scene.add(livestock);
keepWindows.push(...villageWindows);

/* 地形基准：草地平面在 y = -2.2，护城河外岸 r ≈ 58 */
const GRASS_Y = -2.2;

/* ---- 通往城堡的土路 ---- */
const ROAD_PTS = [
  [0, 60], [1.5, 72], [-3, 88], [-13, 103], [-30, 115], [-50, 121], [-70, 118],
];
/* makeRoad 生成的路面自带 y = 0.03，得自己抬到草地高度 */
function addRoad(pts, width) {
  const r = VIL.makeRoad(VM, pts, width);
  r.position.y = GRASS_Y + 0.03;
  village.add(r);
  return r;
}
addRoad(ROAD_PTS, 4.6);

/* 村口岔路：向南通到要塞大门前的台阶 */
addRoad([[-9, 96], [-4, 112], [6, 130], [18, 146], [28, 152], [34, 157]], 3.4);

/* ---- 农舍 ---- */
const FARMSTEADS = [
  { x: -22, z: 74, rot: 0.30, w: 7.4, d: 5.8, h: 3.2 },
  { x: -40, z: 86, rot: 0.62, w: 6.2, d: 5.0, h: 2.9 },
  { x: -58, z: 100, rot: 1.05, w: 8.0, d: 6.0, h: 3.4 },
  { x: 20, z: 82, rot: -0.42, w: 6.8, d: 5.2, h: 3.0 },
  { x: 38, z: 98, rot: -0.80, w: 7.6, d: 5.6, h: 3.3 },
  { x: -78, z: 128, rot: 1.55, w: 6.4, d: 5.2, h: 3.0 },
  { x: 1, z: 148, rot: 2.75, w: 7.0, d: 5.4, h: 3.1 },
  { x: -34, z: 146, rot: 0.15, w: 8.2, d: 6.2, h: 3.5 },
  { x: 46, z: 132, rot: -2.2, w: 6.6, d: 5.0, h: 2.9 },
];

const farmsteads = new THREE.Group();
village.add(farmsteads);

const farmhouses = [];
const chimneys = [];
FARMSTEADS.forEach((f, i) => {
  const house = VIL.makeFarmhouse(VM, { w: f.w, d: f.d, h: f.h });
  const chimneyLocal = house.userData.chimney.clone();
  VIL.compactGroup(house);
  house.userData.chimney = chimneyLocal;
  house.position.set(f.x, GRASS_Y, f.z);
  house.rotation.y = f.rot;
  farmsteads.add(house);
  farmhouses.push(house);

  const c = house.userData.chimney.clone();
  // 旋转到世界坐标
  c.applyAxisAngle(new THREE.Vector3(0, 1, 0), f.rot);
  chimneys.push({ x: f.x + c.x, y: GRASS_Y + c.y, z: f.z + c.z, seed: i * 1.7, house });
});

/* 农舍群作为一个可点击对象（田地、篱笆不进拾取，省开销） */
registerInteractive(farmsteads, {
  name: '城堡外的村落 · The Village',
  tag: '城堡的粮仓',
  desc: '城堡并不自给自足。周围的农舍种粮、养羊、酿啤酒，是驻军赖以生存的根本。战时，村民会带着牲畜和存粮躲进城墙，走之前烧掉田里剩下的作物。',
  detail: '农舍多用夯土或木筋墙配茅草顶，因为石料要留给城堡；冬天人和牲畜同住一屋取暖，烟囱是少数奢侈的设施。',
  view: { pos: [-14, 12, 128], target: [-22, 2, 100] },
});

/* ---- 篱笆与田地 ---- */
function addFence(x, z, len, rot) {
  const f = VIL.makeFence(VM, len);
  f.position.set(x, GRASS_Y, z);
  f.rotation.y = rot;
  village.add(f);
}

// 每户农舍前的一小段篱笆
for (const f of FARMSTEADS) {
  const fwd = new THREE.Vector3(Math.sin(f.rot), 0, Math.cos(f.rot));
  const side = new THREE.Vector3(Math.cos(f.rot), 0, -Math.sin(f.rot));

  // 院子两侧的短篱笆（贴着房子往前伸一段，别伸到路上）
  const half = (f.w ?? 7) / 2 + 1.5;
  const mid = new THREE.Vector3(f.x, 0, f.z).addScaledVector(fwd, 3.2);
  for (const s of [-1, 1]) {
    const p = mid.clone().addScaledVector(side, s * half);
    addFence(p.x, p.z, 5.0, f.rot + Math.PI / 2);
  }
}

const FIELDS = [
  { x: -18, z: 92, w: 20, d: 13, rot: 0.32 },
  { x: -46, z: 116, w: 24, d: 15, rot: 0.9 },
  { x: 24, z: 104, w: 18, d: 12, rot: -0.5 },
  { x: -70, z: 152, w: 22, d: 14, rot: 0.2 },
  { x: 51, z: 149, w: 18, d: 11, rot: -1.9 },
  { x: -6, z: 128, w: 14, d: 10, rot: 2.9 },
];
for (const f of FIELDS) {
  const field = VIL.makeField(VM, f.w, f.d);
  field.position.set(f.x, GRASS_Y, f.z);
  field.rotation.y = f.rot;
  village.add(field);
}

/* ---- 稻草人 ---- */
for (const [x, z] of [[-18, 92], [24, 104], [-46, 116], [-70, 152], [51, 149]]) {
  const sc = VIL.makeScarecrow(VM);
  sc.position.set(x + 2.5, GRASS_Y, z + 1.5);
  sc.rotation.y = Math.random() * Math.PI * 2;
  village.add(sc);
}

/* ---- 柴垛 / 板车 / 水井 ---- */
for (const [x, z, r] of [[-19, 79, 0.4], [23, 87, -0.7], [-55, 105, 1.2], [15, 145, 2.0], [-31, 151, 0.9]]) {
  const wp = VIL.makeWoodpile(VM);
  wp.position.set(x, GRASS_Y, z);
  wp.rotation.y = r;
  village.add(wp);
}
for (const [x, z, r] of [[-26, 80, 0.9], [17, 89, -1.4]]) {
  const cart = VIL.makeCart(VM);
  cart.position.set(x, GRASS_Y, z);
  cart.rotation.y = r;
  village.add(cart);
}
const vWell = VIL.makeVillageWell(VM);
vWell.position.set(-31, GRASS_Y, 88);
village.add(vWell);

/* ---- 羊群与鸡 ---- */
const sheep = [];
for (let i = 0; i < 26; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 8 + Math.random() * 26;
  const cx = -36 + Math.cos(a) * r;
  const cz = 128 + Math.sin(a) * r * 0.7;
  if (cz < 108) continue;
  const s = VIL.makeSheep(0.85 + Math.random() * 0.3);
  s.group.position.set(cx, GRASS_Y, cz);
  s.group.rotation.y = Math.random() * Math.PI * 2;
  livestock.add(s.group);
  sheep.push({ ...s, phase: Math.random() * 10, baseRot: s.group.rotation.y, graze: Math.random() });
}

const chickens = [];
for (const [cx, cz, n] of [[-22, 78, 5], [20, 86, 4], [12, 144, 5], [-34, 148, 4]]) {
  for (let i = 0; i < n; i++) {
    const ch = VIL.makeChicken(0.9 + Math.random() * 0.25);
    ch.position.set(cx + (Math.random() - 0.5) * 6, GRASS_Y, cz + (Math.random() - 0.5) * 6);
    ch.rotation.y = Math.random() * Math.PI * 2;
    livestock.add(ch);
    chickens.push({ mesh: ch, phase: Math.random() * 10, home: new THREE.Vector2(ch.position.x, ch.position.z) });
  }
}

/* ============================================================
 *  前哨要塞
 * ========================================================== */
// 大门朝 -z（面向城堡与村落），土路正好接到台阶下
const FORT_POS = { x: 34, z: 178, rot: Math.PI - 0.16 };
const fortress = FORT.makeFortress(VM, { hx: 15, hz: 13 });
// 合并同材质网格（望楼 Group 本身保留，只清空其中的网格）
VIL.compactGroup(fortress);
fortress.position.set(FORT_POS.x, GRASS_Y + FORT.RISE_OUT, FORT_POS.z);
fortress.rotation.y = FORT_POS.rot;
scene.add(fortress);
registerInteractive(fortress, {
  name: '前哨要塞 · Outpost',
  tag: '外围警戒',
  desc: '城堡之外还要有眼睛。这座木栅前哨扼守着通往领地的土路，负责盘查商队、点燃烽火，并给往来的信使换马。',
  detail: '木栅用的是就地砍伐的尖头木桩，成本远低于石墙；一旦敌军大举来犯，守军会放弃前哨，退回主城。',
  view: { pos: [22, 15, 146], target: [34, 4, 178] },
});

/* ---- 要塞里的守军 ---- */
{
  const fwd = new THREE.Vector3(Math.sin(FORT_POS.rot), 0, Math.cos(FORT_POS.rot));
  const side = new THREE.Vector3(Math.cos(FORT_POS.rot), 0, -Math.sin(FORT_POS.rot));
  const YARD_Y = GRASS_Y + FORT.RISE_OUT; // 院子地面
  const at = (sx, sz, y = YARD_Y) =>
    new THREE.Vector3(FORT_POS.x, y, FORT_POS.z).addScaledVector(side, sx).addScaledVector(fwd, sz);
  const faceOut = FORT_POS.rot; // 朝向 +Z（本地），即土路方向

  // 门楼两侧
  for (const sx of [-1, 1]) {
    const p = at(sx * 2.4, 13.6);
    addPerson(
      POP.makePerson({ tabard: TABARDS_RED, helmet: 'kettle', weapon: 'spear', shield: true }),
      p.x, p.y, p.z, faceOut
    );
  }
  // 院子里巡逻的一个
  const a0 = at(-8, -2);
  const a1 = at(8, 6);
  addPerson(
    POP.makePerson({ tabard: TABARDS_RED, helmet: 'kettle', weapon: 'halberd', shield: false }),
    a0.x, a0.y, a0.z, faceOut,
    { walk: { from: [a0.x, a0.z], to: [a1.x, a1.z], speed: 0.85 } }
  );
  // 望楼平台上的哨兵
  const tw = fortress.userData.tower; // 位置 & 平台高度在合并后仍然保留
  const twPos = at(tw.position.x, tw.position.z, YARD_Y + tw.userData.deckY);
  addPerson(
    POP.makePerson({ tabard: TABARDS_BLUE, helmet: 'great', weapon: 'bow', shield: false, cape: true }),
    twPos.x, twPos.y, twPos.z, faceOut
  );

  // 院子里的火塘点起来（入夜后是这一片唯一的光源）
  const fp = at(fortress.userData.firepit.position.x, fortress.userData.firepit.position.z);
  const campfire = new THREE.Group();
  campfire.position.set(fp.x, fp.y, fp.z);
  {
    const logs = new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 1 });
    for (let i = 0; i < 5; i++) {
      const log = cyl(0.12, 0.12, 1.1, 6, logs);
      log.position.y = 0.22;
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 5) * Math.PI;
      log.rotation.x = 0.3;
      campfire.add(log);
    }
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTx, color: 0xff8a2a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    fire.position.y = 1.0;
    fire.scale.setScalar(3.6);
    fire.userData.baseScale = 3.6;
    campfire.add(fire);
    torchFlames.push({ flame: fire, core: null, seed: 5.1 });

    const light = new THREE.PointLight(0xff8420, 0, 22, 2);
    light.position.y = 1.4;
    campfire.add(light);
    torchLights.push(light);
  }
  scene.add(campfire);
}

/* ============================================================
 *  镇中心：市集广场 + 木筋楼 + 酒馆 + 铁匠铺 + 教堂
 * ========================================================== */
const TOWN_POS = { x: -118, z: 132, rot: 0.1 };
const townCenter = new THREE.Group();
townCenter.position.set(TOWN_POS.x, GRASS_Y, TOWN_POS.z);
townCenter.rotation.y = TOWN_POS.rot;
scene.add(townCenter);

/* 镇内局部坐标 → 世界坐标（路是挂在 village 组下的，得换算） */
const tSide = new THREE.Vector3(Math.cos(TOWN_POS.rot), 0, -Math.sin(TOWN_POS.rot));
const tFwd = new THREE.Vector3(Math.sin(TOWN_POS.rot), 0, Math.cos(TOWN_POS.rot));
const tat = (sx, sz, y = GRASS_Y) =>
  new THREE.Vector3(TOWN_POS.x, y, TOWN_POS.z).addScaledVector(tSide, sx).addScaledVector(tFwd, sz);

/* ---- 从村口一路通到镇上的大路 ---- */
{
  const entry = tat(14, 0);
  addRoad([[-70, 118], [-82, 122.5], [-93, 127], [-100, 129.5], [entry.x, entry.z]], 4.2);

  // 穿过广场往南的支巷
  const q1 = tat(6, 9);
  const q2 = tat(6, 24);
  addRoad([[q1.x, q1.z], [q2.x, q2.z], [q2.x - 2, q2.z + 13]], 3.0);
}

/* ---- 广场铺地 + 石十字 ---- */
const townPlaza = new THREE.Group();
townCenter.add(townPlaza);

{
  const sq = TOWN.makeMarketSquare(TM, { w: 26, d: 20 });
  sq.position.y = 0.01;
  townPlaza.add(sq);

  const cross = TOWN.makeMarketCross(TM);
  cross.position.set(0, 0, 1.5);
  townPlaza.add(cross);

  // 沿北侧摆一排摊位，顾客从广场上来
  const STALL_KINDS = ['bread', 'fish', 'apple', 'cloth', 'pottery'];
  STALL_KINDS.forEach((kind, i) => {
    const stall = TOWN.makeStall(TM, {
      kind,
      awning: new THREE.MeshStandardMaterial({
        map: awningMaps[i], roughness: 0.92, side: THREE.DoubleSide,
      }),
    });
    stall.position.set(-9.4 + i * 4.7, 0, -6.6);
    stall.rotation.y = 0;
    townPlaza.add(stall);
    stalls.push({
      group: stall,
      pivot: stall.userData.awning,
      cloth: stall.userData.awningCloth,
      flap: stall.userData.awningFlap,
      goods: stall.userData.goods,
      cover: stall.userData.cover,
      open: 0,            // 0 = 收摊，1 = 开张
      phase: i * 0.7,
    });
  });

  // 广场两侧的石凳
  for (const [x, z, r] of [[-9.5, 6.5, 0.2], [9.5, 6.5, -0.2]]) {
    const b = TOWN.makeBench(TM, 2.4);
    b.position.set(x, 0, z);
    b.rotation.y = r;
    townPlaza.add(b);
  }

  // 四角的灯柱：灯罩玻璃夜里会亮，再各挂一盏点光源给广场照个底
  for (const [x, z] of [[-10.5, -8.5], [10.5, -8.5], [-10.5, 8.5], [10.5, 8.5]]) {
    const lamp = TOWN.makeLantern(TM);
    lamp.position.set(x, 0, z);
    lamp.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2;

    // makeLantern 的灯在本地 (0.66, 3.16, 0)，旋转后正好朝向广场外侧
    const light = new THREE.PointLight(0xffa848, 0, 18, 2);
    light.position.copy(lamp.userData.lantern);
    light.userData.gain = 0.42;      // 街灯比火把暗，只给脚下铺一层暖光
    light.userData.rangeGain = 0.5;
    lamp.add(light);
    torchLights.push(light);

    // 灯罩本身也要发光，否则夜里只有地上的光斑、灯是黑的
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTx, color: 0xffb14a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    halo.position.copy(lamp.userData.lantern);
    halo.scale.setScalar(1.9);
    lamp.add(halo);
    lampHaloes.push(halo);

    townPlaza.add(lamp);
  }
}

VIL.compactGroup(townPlaza);
registerInteractive(townPlaza, {
  name: '市集广场 · Market Square',
  tag: '全镇的心脏',
  desc: '每周一次的集日，方圆十几里的农户都会赶着车来这里。广场铺的是鹅卵石——雨天不陷车，也压得住马蹄。石十字立在正中，既是地标，也是布告和宣判的地方。',
  detail: '摊位按行当分区：面包、鱼、果蔬、布匹、陶器。摊位要交"摊税"，这笔钱往往就是镇子修桥铺路的来源。',
  view: { pos: [-104, 10, 148], target: [-118, 3, 132] },
});

/* ---- 沿街的木筋楼 ---- */
const TOWN_HOUSES = [
  // 北排（面朝 +Z，正对广场）
  { x: -5.5, z: -15.5, rot: 0, w: 6.6, d: 5.4, h1: 2.6, h2: 2.3, roofH: 2.5 },
  { x: 2.5, z: -15.8, rot: 0, w: 6.0, d: 5.2, h1: 2.4, h2: 2.2, roofH: 2.4 },
  { x: 10.5, z: -15.5, rot: 0, w: 6.4, d: 5.4, h1: 2.7, h2: 2.3, roofH: 2.6 },
  // 南排（面朝 -Z）
  { x: -14.0, z: 16.0, rot: Math.PI, w: 7.0, d: 5.6, h1: 2.8, h2: 2.4, roofH: 2.7 },
  { x: -5.5, z: 16.4, rot: Math.PI, w: 6.2, d: 5.2, h1: 2.5, h2: 2.2, roofH: 2.4 },
  // 东侧（面朝 -X）
  { x: 20.0, z: -9.0, rot: -Math.PI / 2, w: 6.4, d: 5.2, h1: 2.6, h2: 2.3, roofH: 2.5 },
  { x: 21.0, z: 14.0, rot: -Math.PI / 2, w: 6.0, d: 5.0, h1: 2.5, h2: 2.2, roofH: 2.4 },
];

const townHouses = new THREE.Group();
townCenter.add(townHouses);

TOWN_HOUSES.forEach((h, i) => {
  const house = TOWN.makeTudorHouse(TM, {
    w: h.w, d: h.d, h1: h.h1, h2: h.h2, roofH: h.roofH,
    doorX: i % 2 ? 0.9 : -0.9,
  });
  const chimneyLocal = house.userData.chimney.clone();
  VIL.compactGroup(house);
  house.userData.chimney = chimneyLocal;
  house.position.set(h.x, 0, h.z);
  house.rotation.y = h.rot;
  townHouses.add(house);

  // 烟囱位置换算到世界坐标，接进炊烟系统
  const c = chimneyLocal.clone();
  c.applyAxisAngle(new THREE.Vector3(0, 1, 0), h.rot + TOWN_POS.rot);
  const p = tat(h.x, h.z);
  chimneys.push({
    x: p.x + c.x, y: GRASS_Y + c.y, z: p.z + c.z,
    seed: 20 + i * 1.7,
  });
});

registerInteractive(townHouses, {
  name: '木筋楼 · Half-timbered Houses',
  tag: '镇上人家',
  desc: '镇上和村里最大的不同，是房子紧挨着排成街。这些楼是木骨架加灰泥填充，二层比一层向外挑出一点——凭空多出半间房，还挡住了楼下的雨。',
  detail: '木料在别处预制成榫卯构件，运到现场几天就能立起来。墙面的灰泥里掺了石灰和碎麻，防潮又抗裂。',
  view: { pos: [-109, 10, 137], target: [-125, 4, 118] },
});

/* ---- 酒馆 ---- */
{
  const tavern = TOWN.makeTavern(TM, {});
  VIL.compactGroup(tavern);
  tavern.position.set(-15.5, 0, -15.5);
  tavern.rotation.y = 0;
  townCenter.add(tavern);

  registerInteractive(tavern, {
    name: '酒馆 · The Boar & Barrel',
    tag: '消息比啤酒多',
    desc: '镇上的消息都在这儿转手：哪条商路被劫了、谁家的闺女要嫁、领主又要加什么税。二楼有几间客房，赶夜路的商人就在这里落脚。',
    detail: '酒馆招牌要挂在铁架上伸出来，因为街面窄，直挂的牌子走两步就被屋檐挡住看不见。杯子里的东西大半是淡啤酒——那时候水不干净，一天喝几升啤酒是常事。',
    view: { pos: [-108, 8, 128], target: [-133.5, 4, 116.5] },
  });
}

/* ---- 铁匠铺 ---- */
{
  const smithy = TOWN.makeSmithy(TM, {});
  const forgeLocal = smithy.userData.forge.clone();
  const anvilLocal = smithy.userData.anvil.clone();
  VIL.compactGroup(smithy);
  smithy.position.set(12.5, 0, 16.5);
  smithy.rotation.y = Math.PI;
  townCenter.add(smithy);

  // 炉火的光晕：先算世界坐标（旋转 π 后再转到镇坐标）
  forgeLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI + TOWN_POS.rot);
  const fp = tat(12.5, 16.5);
  const forgeGlow = new THREE.Group();
  forgeGlow.position.set(fp.x + forgeLocal.x, GRASS_Y + forgeLocal.y + 0.2, fp.z + forgeLocal.z);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx, color: 0xff7a2a, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  glow.scale.setScalar(2.0);
  glow.userData.baseScale = 2.0;
  forgeGlow.add(glow);
  torchFlames.push({ flame: glow, core: null, seed: 7.7 });

  const forgeLight = new THREE.PointLight(0xff7a24, 0, 20, 2);
  forgeLight.position.y = 0.5;
  forgeGlow.add(forgeLight);
  torchLights.push(forgeLight);

  scene.add(forgeGlow);

  // 铁砧位置：铺子转了 π，所以本地 x/z 都要取反再套镇子的旋转
  {
    const l = anvilLocal.clone();
    l.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI + TOWN_POS.rot);
    const ap = tat(12.5, 16.5);
    ANVIL_POS.set(ap.x + l.x, GRASS_Y + l.y + 0.1, ap.z + l.z);
  }

  registerInteractive(smithy, {
    name: '铁匠铺 · Smithy',
    tag: '全镇唯一的火',
    desc: '马蹄铁、犁头、钉子、锅、门铰链，全从这里出。也是镇上唯一能打兵器的地方——战时这里会被领主直接征用。',
    detail: '铁匠的地位高于普通匠人：炉子不能熄，铺子要临街但不能在木楼密集处，怕走水。门口常备一桶水淬火，也兼作消防。',
    view: { pos: [-102, 8, 148], target: [-105.5, 3, 148.5] },
  });
}

/* ---- 教堂与钟楼 ---- */
{
  const church = TOWN.makeChurch(TM, {});
  const lampsLocal = (church.userData.interiorLamps || []).map((v) => v.clone());
  const bellsLocal = (church.userData.bells || []).slice();
  const belfryLocal = (church.userData.belfryGlow || []).map((v) => v.clone());
  VIL.compactGroup(church);
  church.position.set(-22, 0, 0);
  church.rotation.y = Math.PI / 2;
  townCenter.add(church);

  // 钟：合并后仍然留着这个枢轴组，整点时绕横轭摆动
  church.updateMatrixWorld(true);
  for (const b of bellsLocal) {
    bellRopes.push({ pivot: b, angle: 0, amt: 0 });
    // 钟楼的世界坐标，给钟声和节庆的定位用
    BELL_POS.copy(b.getWorldPosition(new THREE.Vector3()));
  }
  BELFREY_GLOW.length = 0;
  for (const v of belfryLocal) BELFREY_GLOW.push(church.localToWorld(v.clone()));

  // 堂内吊灯的烛光：夜里从门洞和彩窗里透出来
  for (const lp of lampsLocal) {
    const light = new THREE.PointLight(0xffc074, 0, 14, 2);
    light.position.copy(lp);
    light.userData.gain = 0.9;
    light.userData.rangeGain = 0.42;
    church.add(light);
    torchLights.push(light);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTx, color: 0xffb45a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.position.copy(lp);
    glow.scale.setScalar(1.5);
    glow.userData.baseScale = 1.5;
    church.add(glow);
    torchFlames.push({ flame: glow, core: null, seed: 11.3 + lampsLocal.indexOf(lp) * 2 });
  }

  registerInteractive(church, {
    name: '教堂 · Parish Church',
    tag: '镇上最高的建筑',
    desc: '钟楼压过所有屋顶，是这个时代唯一不计成本往高处修的东西。钟声划分作息：晨祷、正午、日落，也报火警和敌情。门是往里推开的——进堂的人要在阶前停一停。',
    detail: '彩窗、石砌拱券和扶壁都是昂贵的工艺，一座堂往往要修上几十年。堂内两列石柱撑起木梁，东端是祭坛；北侧的墓园围了矮墙，紫杉四季常青，是最早长在坟地里的树。',
    view: { pos: [-112, 12, 146], target: [-139, 8, 133] },
  });

  // 墓园单独做成一个可点的热点：一块透明薄板罩住整片坟地，
  // 挂在 townCenter 上（不挂在教堂组里，否则会被教堂的拾取抢走）
  {
    const y = church.userData.yard;
    const yard = new THREE.Group();
    const local = new THREE.Vector3(y.x, 0, y.z)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
      .add(new THREE.Vector3(-22, 0, 0));
    yard.position.set(local.x, 0, local.z);
    yard.rotation.y = Math.PI / 2;

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(y.x1 - y.x0, 1.6, y.z1 - y.z0),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
    );
    pad.position.y = 0.8;
    yard.add(pad);
    townCenter.add(yard);

    registerInteractive(yard, {
      name: '墓园 · Churchyard',
      tag: '全镇共用的一块地',
      desc: '矮石墙围起来的一片坟地，开一道铁门。墓不分贫富，只是碑的大小、石料的好坏有别；有钱人葬在墙根下，最靠近祭坛的位置。',
      detail: '坟前那棵紫杉是英国墓园的标配：四季常青，象征永生，树皮与针叶却有毒，正好挡住牲口。入夜后这里一片漆黑——教堂只在节日和葬礼时点灯。',
      view: { pos: [-124, 9, 156], target: [-139, 1.5, 143] },
    });
  }
}

/* ---- 街边零碎 ---- */
{
  const clutter = new THREE.Group();
  for (const [x, z, r] of [[-6.2, -11.6, 0.3], [6.8, -11.4, -0.5], [-15.2, 12.0, 1.1]]) {
    const c = TOWN.makeTownClutter(TM);
    c.position.set(x, 0, z);
    c.rotation.y = r;
    clutter.add(c);
  }
  for (const [x, z, r] of [[-19.6, 10.4, Math.PI / 2], [16.5, -14.0, 0.15]]) {
    const w = TOWN.makeWashLine(TM, 3.6);
    w.position.set(x, 0, z);
    w.rotation.y = r;
    clutter.add(w);
  }
  VIL.compactGroup(clutter);
  townCenter.add(clutter);
}

/* ============================================================
 *  城墙外的工匠区：小溪 + 水磨 + 风车 + 采石场 + 伐木场 + 作坊
 * ========================================================== */
const CRAFT = { x: 96, z: 22 };
const craftGroup = new THREE.Group();
scene.add(craftGroup);

/* ---- 小溪：从北边的林子流过来，穿过工匠区，往南出画面 ---- */
// 小溪要避开风车（76,-34）与采石场（110,-8）的基座，从两者之间穿过
const STREAM_PTS = [
  [70, -76], [72, -58], [76, -42], [82, -26], [88, -12],
  [94, 2], [98, 16], [100, 30], [98, 44], [92, 58], [86, 74], [82, 92],
];
{
  const stream = IND.makeStream(TM, STREAM_PTS, 3.2);
  stream.position.y = GRASS_Y;
  craftGroup.add(stream);
}

/* ---- 跨溪的石桥（工匠区的主入口） ---- */
{
  // 找小溪在 z ≈ 22 附近的位置与走向
  const bridge = IND.makeStoneBridge(TM, { span: 4.0, wide: 3.4, rise: 1.0, TH: 0.3 });
  bridge.position.set(99.6, GRASS_Y, 21.0);
  // 桥的跨度方向要横跨水流（水流大致沿 z 走），所以桥身沿 X
  bridge.rotation.y = 0.18;
  craftGroup.add(bridge);
}

/* ---- 从城堡东门外的土路接一条岔路到桥上 ---- */
{
  addRoad([[62, 36], [74, 31], [86, 26], [98, 22]], 3.2);
  // 桥另一侧往作坊区
  addRoad([[103, 20], [110, 18], [116, 14]], 2.6);
}

/* ---- 水磨坊：坐落在溪边，水轮浸在水里 ---- */
{
  const mill = IND.makeWaterMill(TM, { w: 6.4, d: 5.6, h: 4.4, wheelR: 2.4 });
  mill.position.set(104.5, GRASS_Y, 30.0);
  mill.rotation.y = -1.42;   // 水轮朝西对着小溪
  craftGroup.add(mill);

  waterWheels.push({ wheel: mill.userData.wheel, speed: mill.userData.spinSpeed });

  registerInteractive(mill, {
    name: '水磨坊 · Water Mill',
    tag: '一天磨十几袋麦',
    desc: '引水槽把溪水提到水轮上方，水落下来推着轮子转，轮轴直接带动磨盘。比起人推磨，一头水轮能顶十几个壮劳力的产出。',
    detail: '磨坊主是镇上的"包税人"：农户来磨面要留下十分之一的面粉作为磨费。水轮怕旱也怕洪，所以磨坊往往建在溪流最稳的那一段。',
    view: { pos: [88, 9, 44], target: [104.5, 3, 30] },
  });
}

/* ---- 风车：立在西侧的高地上，是这一带的天际线 ---- */
{
  const mill = IND.makeWindmill(TM, { h: 9.5, r: 3.1 });
  mill.position.set(76, GRASS_Y, -34);
  mill.rotation.y = 0.55;
  craftGroup.add(mill);

  windmills.push({ sails: mill.userData.sails, speed: mill.userData.spinSpeed });

  registerInteractive(mill, {
    name: '风车 · Windmill',
    tag: '这一带最高的东西',
    desc: '风车的整座顶盖可以转动——磨坊主拉着后面的尾杆，把帆调到迎风的角度。风大就张帆，风小就把帆布拉紧。',
    detail: '风车不挑地方，山冈、风口都能立；水磨却必须临水。所以凡是没有溪流的村子，吃的面都靠风车。夜里帆停下来时，能听见木轴"吱呀"地响。',
    view: { pos: [56, 13, -18], target: [76, 7, -34] },
  });
}

/* ---- 采石场 ---- */
{
  const quarry = IND.makeQuarry(TM, { w: 18, d: 14, steps: 3 });
  quarry.position.set(110, GRASS_Y, -8);
  quarry.rotation.y = -0.3;
  VIL.compactGroup(quarry);
  craftGroup.add(quarry);

  registerInteractive(quarry, {
    name: '采石场 · Quarry',
    tag: '城堡的石头从这儿来',
    desc: '石匠顺着天然岩层一层层往下凿，凿出阶梯状的崖壁。大块石料靠木吊架吊上地面，再用牛车运到工地。',
    detail: '采石最费的不是凿，是运费——石头越远越贵。所以城堡、教堂大多就地取材，只有窗框、拱券这类精细构件才用远处的上等石。',
    view: { pos: [94, 12, 10], target: [110, 3, -8] },
  });
}

/* ---- 伐木场 ---- */
{
  const yard = IND.makeLumberYard(TM);
  yard.position.set(78, GRASS_Y, 48);
  yard.rotation.y = 0.8;
  VIL.compactGroup(yard);
  craftGroup.add(yard);

  registerInteractive(yard, {
    name: '伐木场 · Lumber Yard',
    tag: '锯木、劈柴、备料',
    desc: '原木架在锯架上，两人一上一下拉大锯，把圆木解成方料和板子。劈好的柴堆在一边，等着卖给镇上的面包房和铁匠铺。',
    detail: '木料要先风干一年以上才能用，否则建起来的房子会缩、会扭。所以伐木场真正的库存是那些堆在场院里、盖着草帘的旧木头。',
    view: { pos: [64, 10, 62], target: [78, 2, 48] },
  });
}

/* ---- 四座敞棚作坊：陶、箍桶、织布、补锅 ---- */
{
  const SHEDS = [
    { kind: 'potter', x: 88, z: 10, rot: -0.2, name: '陶坊 · Potter\'s Shed',
      tag: '轮子上的手艺',
      desc: '陶轮靠脚踢着转，泥坯在手上一点点收口。做好的坯要先阴干，再进窑烧一整天，出窑时温度降得太快就会炸。',
      detail: '陶器是当时最便宜的容器：装水、装油、装粮、盛饭。碎了的陶片也能用——垫排水沟、铺地面、当瓦片。' },
    { kind: 'cooper', x: 110, z: 34, rot: 0.5, name: '箍桶坊 · Cooperage',
      tag: '会箍桶就能吃饭',
      desc: '桶板要一根根削出弧度，拼起来箍紧，再靠干湿胀缩自己咬死。一个好的箍桶匠能靠这门手艺养活一家人。',
      detail: '桶不只是容器——啤酒、葡萄酒、腌鱼、火药、钉子都靠它运输和存放。桶匠必须懂木头：橡木耐水，松木轻，槐木最硬。' },
    { kind: 'weaver', x: 84, z: 36, rot: 1.1, name: '织坊 · Weaver\'s Shed',
      tag: '一匹布要织三个月',
      desc: '经线绷在织机上，纬线用梭子来回穿。织一匹普通羊毛布大约要三个月，所以衣服是可以留给下一代的东西。',
      detail: '羊毛要先纺成线，再上机织，最后靠漂洗和捶打让布面密实。染布用的茜草、靛蓝、核桃壳，都是就地取材。' },
    { kind: 'tinker', x: 118, z: 4, rot: -0.8, name: '补锅匠 · Tinker',
      tag: '走街串巷的手艺人',
      desc: '补锅匠不属于镇上——他们背着工具从一个村走到另一个村，谁家的锅漏了就敲两下，用一块小铁片铆上去。',
      detail: '这个行当几乎没有资产：一副风箱、一把小锤、一小包锌和锡。干得好的补锅匠比普通农工挣得多，但要一直在路上。' },
  ];

  for (const s of SHEDS) {
    const shed = IND.makeCraftShed(TM, { kind: s.kind, w: 5.4, d: 4.4, h: 3.0 });
    shed.position.set(s.x, GRASS_Y, s.z);
    shed.rotation.y = s.rot;
    VIL.compactGroup(shed);
    craftGroup.add(shed);

    registerInteractive(shed, {
      name: s.name,
      tag: s.tag,
      desc: s.desc,
      detail: s.detail,
      view: { pos: [s.x - Math.cos(s.rot) * 9, 7, s.z - Math.sin(s.rot) * 9],
              target: [s.x, 2, s.z] },
    });
  }
}

/* ---- 陶窑（在陶坊后面，是这一片夜里的一点火光） ---- */
{
  const kiln = IND.makeKiln(TM, { r: 1.9, h: 2.4 });
  const kLocal = kiln.userData.emberPos.clone();
  VIL.compactGroup(kiln);
  kiln.position.set(93.5, GRASS_Y, 6.0);
  craftGroup.add(kiln);

  // 窑口的余火：窑组已经定位，直接算一次世界坐标挂到场景上
  const emberWorld = kLocal.clone().add(kiln.position);
  const emberGlow = new THREE.Group();
  emberGlow.position.copy(emberWorld);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx, color: 0xff8a2e, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  glow.scale.setScalar(1.5);
  glow.userData.baseScale = 1.5;
  emberGlow.add(glow);
  torchFlames.push({ flame: glow, core: null, seed: 15.4 });

  const light = new THREE.PointLight(0xff8a2a, 0, 15, 2);
  light.userData.gain = 0.7;
  light.userData.rangeGain = 0.6;
  emberGlow.add(light);
  torchLights.push(light);
  scene.add(emberGlow);

  registerInteractive(kiln, {
    name: '陶窑 · Kiln',
    tag: '烧一窑要三天',
    desc: '窑室是砖砌的圆顶，柴火从下面的窑口塞进去。烧窑要连续守着，火候一到就封窑，再等两天让它慢慢凉。',
    detail: '窑温能到一千度上下——这是中世纪少数能稳定达到的高温。所以陶窑也兼职烧砖、烧瓦，甚至烧石灰。',
    view: { pos: [78, 7, 0], target: [93.5, 1.5, 6] },
  });
}

/* ---- 晒场 ---- */
{
  const DR = [
    [102, 40, 0.3, 'cloth'], [112, 42, -0.4, 'hide'],
    [90, 46, 1.2, 'cloth'],
  ];
  const racks = new THREE.Group();
  for (const [x, z, r, kind] of DR) {
    const rack = IND.makeDryingRack(TM, { len: 6.2, kind });
    rack.position.set(x, GRASS_Y, z);
    rack.rotation.y = r;
    racks.add(rack);
  }
  VIL.compactGroup(racks);
  craftGroup.add(racks);
}

/* ---- 工匠区总览热点：一块透明拾取面，点了飞到全景 ---- */
const craftSpot = new THREE.Group();
{
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(70, 6, 110),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
  );
  pad.position.set(96, GRASS_Y + 3, 12);
  craftSpot.add(pad);
  scene.add(craftSpot);

  registerInteractive(craftSpot, {
    name: '工匠区 · Craftsmen\'s Quarter',
    tag: '城墙外的手艺',
    desc: '铁匠、陶工、箍桶匠、织工、石匠、锯木匠——这些行当吵、脏、费火，所以都赶到城墙外面来，沿着一条小溪排开。水是动力，也是排污。',
    detail: '中世纪的行会规定匠人必须住在哪条街：铁匠怕走水，染坊怕臭，陶窑怕烟。工匠区顺着水源展开，是这类规矩最直观的样子。',
    view: { pos: [62, 44, 76], target: [96, 4, 12] },
  });
}

/* ---- 工匠区的照明：木杆上挂一盏油灯，入夜点亮 ---- */
{
  const LAMPS = [
    [88, 10, 0.6], [110, 34, -0.4], [84, 36, 1.2], [118, 4, 0.2],
    [104.5, 30, 0.9], [76, -34, 0.3], [78, 48, -0.7],
  ];
  const pole = woodMaterial(1.6);

  for (const [x, z, r] of LAMPS) {
    const g = new THREE.Group();
    g.position.set(x, GRASS_Y, z);
    g.rotation.y = r;

    const post = cyl(0.09, 0.12, 3.2, 7, pole);
    post.position.y = 1.6;
    g.add(post);

    const arm = box(0.9, 0.09, 0.09, ironMat, false);
    arm.position.set(0.42, 3.18, 0);
    g.add(arm);

    // 灯罩：铁框 + 会亮的玻璃
    const glass = box(0.26, 0.34, 0.26, TM.lanternGlass, false);
    glass.position.set(0.82, 2.94, 0);
    glass.userData.keepSeparate = true;
    g.add(glass);

    const cap = box(0.34, 0.08, 0.34, ironMat, false);
    cap.position.set(0.82, 3.14, 0);
    g.add(cap);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTx, color: 0xffb14a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.position.set(0.82, 2.94, 0);
    glow.scale.setScalar(1.7);
    g.add(glow);
    lampHaloes.push(glow);

    const light = new THREE.PointLight(0xffa848, 0, 16, 2);
    light.position.set(0.82, 2.94, 0);
    light.userData.gain = 0.4;
    light.userData.rangeGain = 0.55;
    g.add(light);
    torchLights.push(light);

    craftGroup.add(g);
  }
}

/* ---- 工匠区的人 ---- */
{
  const C = GRASS_Y;
  const make = (opt) => POP.makePerson({ weapon: 'none', shield: false, ...opt });
  const CLOTHES = [0x8a6a3a, 0x5e6b3a, 0x7a4630, 0x445a6e, 0x8c7a58, 0x6b4a5a];

  // 水磨坊门口翻面的磨坊主
  addPerson(make({ tabard: 0xb0a080 }), 101.5, C, 30.6, -1.4);
  // 桥上来回走的两个
  addPerson(make({ tabard: CLOTHES[0] }), 99.6, C, 21.0, 1.4,
    { walk: { from: [96.5, 21.6], to: [103.0, 20.4], speed: 0.5 } });
  addPerson(make({ tabard: CLOTHES[2], helmet: 'hood' }), 99.6, C, 21.0, -1.4,
    { walk: { from: [103.0, 20.4], to: [96.5, 21.6], speed: 0.46 } });
  // 陶坊：一人踩轮，一人摆坯
  addPerson(make({ tabard: CLOTHES[3] }), 88.0, C, 8.6, -0.2);
  addPerson(make({ tabard: CLOTHES[1], helmet: 'hood' }), 90.4, C, 9.8, 2.6);
  // 箍桶：两个人在箍一只桶
  addPerson(make({ tabard: CLOTHES[4] }), 109.4, C, 33.0, 0.5);
  addPerson(make({ tabard: CLOTHES[5], helmet: 'hood' }), 110.6, C, 33.8, -2.4);
  // 织坊：织布的女人
  addPerson(make({ tabard: CLOTHES[0], helmet: 'hood' }), 84.0, C, 34.4, 1.1);
  // 补锅匠蹲在门口
  addPerson(make({ tabard: CLOTHES[2], helmet: 'hood' }), 117.0, C, 4.6, -0.8);
  // 采石场：一个在凿石，一个在推车
  addPerson(make({ tabard: CLOTHES[1] }), 108.0, C, -4.0, -0.3);
  addPerson(make({ tabard: CLOTHES[3] }), 113.0, C, 2.0, -0.3,
    { walk: { from: [113.5, 3.0], to: [104.0, 6.0], speed: 0.42 } });
  // 伐木场：拉锯的两个人
  addPerson(make({ tabard: CLOTHES[4] }), 77.2, C, 47.0, 0.8);
  addPerson(make({ tabard: CLOTHES[5], helmet: 'hood' }), 79.0, C, 48.6, 0.8);
  // 风车下扛麦袋的
  addPerson(make({ tabard: CLOTHES[2] }), 74.0, C, -31.0, 2.4,
    { walk: { from: [73.0, -30.0], to: [79.0, -37.5], speed: 0.4 } });
  // 晒场边上的
  addPerson(make({ tabard: CLOTHES[1], helmet: 'hood' }), 105.0, C, 43.0, 0.4);
}

/* ============================================================
 *  西北的修道院
 *  院门朝东南，正对着城堡方向
 * ========================================================== */
const PRIORY_POS = { x: -88, z: -52, rot: 0.62 };
const priory = PRIORY.makePriory(TM);
VIL.compactGroup(priory);
priory.position.set(PRIORY_POS.x, GRASS_Y, PRIORY_POS.z);
priory.rotation.y = PRIORY_POS.rot;
scene.add(priory);

// 礼拜堂钟楼里的铜钟也跟着整点钟声摆动
for (const b of (priory.userData.bells || [])) {
  bellRopes.push({ pivot: b, angle: 0, amt: 0 });
}

registerInteractive(priory, {
  name: '修道院 · Priory',
  tag: '抄经与济贫',
  desc: '城堡北面这片院落属于本笃会的修士。回廊四面包着方形庭院，庭中种药草、设日晷；东侧是礼拜堂，院墙里还有一方鱼塘和一片果园——修士靠自己的劳动吃饭。',
  detail: '中世纪修道院是医疗、识字和保存书籍的地方。药草园里种的是缬草、鼠尾草和艾草，抄经房里的羊皮纸要耗费整群羊。教会还规定：修道院必须向过路的穷人施粥。',
  view: { pos: [-40, 30, -6], target: [-88, 5, -52] },
});

/* ---- 通向修道院的土路：从城堡北面绕过去 ---- */
addRoad([[-9, 60], [-22, 40], [-38, 16], [-56, -8], [-70, -28], [-82, -42]], 3.2);

/* ---- 修道院里的修士 ---- */
{
  const c = Math.cos(PRIORY_POS.rot), s = Math.sin(PRIORY_POS.rot);
  const pv = (lx, lz) => ({
    x: PRIORY_POS.x + lx * c + lz * s,
    z: PRIORY_POS.z - lx * s + lz * c,
  });
  const HABIT = 0x2f2a24;   // 本笃会的黑褐会衣
  const make = () => POP.makePerson({ weapon: 'none', shield: false, helmet: 'hood', tabard: HABIT });

  // 药草园里除草的一位
  {
    const p = pv(-2.6, 2.6);
    const rec = addPerson(make(), p.x, GRASS_Y, p.z, PRIORY_POS.rot + 2.4);
    rec.isMonk = true;
    schedule(rec, pv(14, -12).x, pv(14, -12).z, PRIORY_POS.rot + Math.PI * 0.5);
  }
  // 回廊下边走边读经的
  {
    const p = pv(-8.4, 0);
    const rec = addPerson(make(), p.x, GRASS_Y, p.z, PRIORY_POS.rot,
      { walk: { from: [pv(-8.4, 6.4).x, pv(-8.4, 6.4).z], to: [pv(-8.4, -6.4).x, pv(-8.4, -6.4).z], speed: 0.34 } });
    rec.isMonk = true;
    schedule(rec, pv(14, -12).x, pv(14, -12).z, PRIORY_POS.rot + Math.PI * 0.5);
  }
  // 鱼塘边撒食的
  {
    const p = pv(-22, -13.5);
    const rec = addPerson(make(), p.x, GRASS_Y, p.z, PRIORY_POS.rot + Math.PI);
    rec.isMonk = true;
    schedule(rec, pv(14, -12).x, pv(14, -12).z, PRIORY_POS.rot + Math.PI * 0.5);
  }
  // 礼拜堂门口迎客的
  {
    const p = pv(14.5, 3.2);
    const rec = addPerson(make(), p.x, GRASS_Y, p.z, PRIORY_POS.rot - Math.PI / 2);
    rec.isMonk = true;
    schedule(rec, pv(14, -12).x, pv(14, -12).z, PRIORY_POS.rot + Math.PI * 0.5);
  }
}

/* ============================================================
 *  东北的比武场
 *  跑道沿东西向，南侧与北侧各一道看台
 * ========================================================== */
const TOURNEY_POS = { x: 28, z: -112, rot: -0.34 };
const tourney = TOURNEY.makeTournament(TM);
VIL.compactGroup(tourney);
tourney.position.set(TOURNEY_POS.x, GRASS_Y, TOURNEY_POS.z);
tourney.rotation.y = TOURNEY_POS.rot;
scene.add(tourney);

registerInteractive(tourney, {
  name: '比武场 · Tournament Ground',
  tag: '骑士的舞台',
  desc: '一圈木栅夹出两条平行的跑道，中间那道矮栏叫 tilt——骑士分列两边，隔着栏杆对冲，长矛指向对方的盾。看台上挤着贵族与镇上的人，营帐区住着来参赛的骑士。',
  detail: '比武是骑士阶层的成人礼：赢了能拿对手的盔甲和战马，一夜暴富；输了可能要举债赎身。教会屡次禁止比武，理由是"无谓地流血"，但从未真正禁绝。',
  view: { pos: [-34, 46, -74], target: [28, 4, -112] },
});

/* ---- 通往比武场的土路：从城堡东侧绕向东北 ---- */
addRoad([[16, 52], [30, 30], [46, 8], [58, -18], [58, -46], [46, -72], [34, -90]], 3.4);

/* ---- 比武场里的人 ---- */
{
  const c = Math.cos(TOURNEY_POS.rot), s = Math.sin(TOURNEY_POS.rot);
  const tv = (lx, lz) => ({
    x: TOURNEY_POS.x + lx * c + lz * s,
    z: TOURNEY_POS.z - lx * s + lz * c,
  });
  const makeKnight = () => POP.makePerson({ helmet: 'great', weapon: 'halberd', shield: false, tabard: 0x9e2f2c });
  const makeFan = () => POP.makeVillager();

  // 跑道西端并辔待发的两名骑士
  for (const sz of [-1, 1]) {
    const p = tv(-20, sz * 3.2);
    const rec = addPerson(makeKnight(), p.x, GRASS_Y, p.z, TOURNEY_POS.rot - Math.PI / 2);
    schedule(rec, tv(-6, sz * 14).x, tv(-6, sz * 14).z, TOURNEY_POS.rot + Math.PI);
  }

  // 看台上的观众：南侧看台坐三排
  for (let i = 0; i < 9; i++) {
    const p = tv(-11 + (i % 5) * 5.2, 13.4 + Math.floor(i / 5) * 1.5);
    const rec = addPerson(makeFan(), p.x, GRASS_Y + 0.9, p.z, TOURNEY_POS.rot + Math.PI);
    schedule(rec, tv(-6, 16).x, tv(-6, 16).z, TOURNEY_POS.rot);
  }
  // 北侧看台
  for (let i = 0; i < 6; i++) {
    const p = tv(-9 + (i % 3) * 6.0, -13.4 - Math.floor(i / 3) * 1.5);
    const rec = addPerson(makeFan(), p.x, GRASS_Y + 0.9, p.z, TOURNEY_POS.rot);
    schedule(rec, tv(-6, -16).x, tv(-6, -16).z, TOURNEY_POS.rot);
  }

  // 营帐区擦甲的马夫
  addPerson(makeFan(), ...(() => { const q = tv(-12, -22); return [q.x, GRASS_Y, q.z]; })(), TOURNEY_POS.rot + 2.0);

  // 五柱靶旁边练枪的侍从
  {
    const q = tv(-36, 3);
    const rec = addPerson(POP.makePerson({ helmet: 'kettle', weapon: 'spear', shield: true, tabard: 0x2c4f86 }),
      q.x, GRASS_Y, q.z, TOURNEY_POS.rot + Math.PI * 0.5);
    schedule(rec, tv(-6, -16).x, tv(-6, -16).z, TOURNEY_POS.rot);
  }
}

/* ============================================================
 *  西面的朝圣客栈
 *  主楼朝南临街，车马院在后
 * ========================================================== */
const INN_POS = { x: -132, z: 18, rot: 1.62 };
const inn = INN.makeInn(TM);
VIL.compactGroup(inn);
inn.position.set(INN_POS.x, GRASS_Y, INN_POS.z);
inn.rotation.y = INN_POS.rot;
scene.add(inn);

registerInteractive(inn, {
  name: '朝圣客栈 · Pilgrim Inn',
  tag: '路上的一夜',
  desc: '临街是两层主楼，后面围出能赶车进来的院子：马厩、草料棚、水井、猪圈一应俱全。朝圣者、商队和赶路的信使都在这里打尖过夜。',
  detail: '中世纪的客栈没有单间，通铺上几个人挤一床草垫是常态。价钱按"床、酒、马料"分别算，马料的钱往往比人的房钱还贵。',
  view: { pos: [-96, 22, 40], target: [-132, 4, 18] },
});

/* ---- 通向客栈的路：从城堡西侧绕过去 ---- */
addRoad([[-40, 52], [-62, 44], [-84, 36], [-104, 30], [-120, 24]], 3.4);

/* ---- 客栈里的人 ---- */
{
  const c = Math.cos(INN_POS.rot), s = Math.sin(INN_POS.rot);
  const iv = (lx, lz) => ({
    x: INN_POS.x + lx * c + lz * s,
    z: INN_POS.z - lx * s + lz * c,
  });
  const make = () => POP.makeVillager();

  // 柜台后的店主
  {
    const p = iv(0, 7.4);
    const rec = addPerson(make(), p.x, GRASS_Y, p.z, INN_POS.rot + Math.PI);
    schedule(rec, p.x, p.z, INN_POS.rot + Math.PI);
  }
  // 门口卸货的伙计
  {
    const p = iv(-4.6, 9.2);
    const rec = addPerson(make(), p.x, GRASS_Y, p.z, INN_POS.rot + 2.4);
    schedule(rec, iv(4, 12).x, iv(4, 12).z, INN_POS.rot);
  }
  // 院子里喂马的
  {
    const p = iv(11.5, 20);
    const rec = addPerson(make(), p.x, GRASS_Y, p.z, INN_POS.rot - 1.4);
    schedule(rec, iv(-4, 16).x, iv(-4, 16).z, INN_POS.rot);
  }
  // 井边打水的
  {
    const p = iv(4.0, 23);
    const rec = addPerson(make(), p.x, GRASS_Y, p.z, INN_POS.rot + Math.PI);
    schedule(rec, iv(-4, 16).x, iv(-4, 16).z, INN_POS.rot);
  }
  // 靠在猪圈边上的旅人
  {
    const p = iv(8.4, 30);
    const rec = addPerson(make(), p.x, GRASS_Y, p.z, INN_POS.rot + 0.6);
    schedule(rec, iv(-4, 16).x, iv(-4, 16).z, INN_POS.rot);
  }
}

/* ============================================================
 *  十五处外围场景
 *  修道院、比武场、客栈各自再向外延伸一链，每处有一条土路连回母场景
 * ========================================================== */

/**
 * 外围场景的统一落位：同材质合并 → 摆到世界坐标 → 登记成可点击。
 * 相机默认放在"正面"那一侧（rot 指向的方向）的斜上方，
 * 所以 rot 应该设成建筑正面朝向母场景、朝向来的那条路的角度。
 */
const OUTSKIRTS = {};   // key → 组的映射，底部导航要用

function addOutskirt(key, group, { x, z, rot = 0, dist = 42, height = 28, info }) {
  VIL.compactGroup(group);
  group.position.set(x, GRASS_Y, z);
  group.rotation.y = rot;
  scene.add(group);
  registerInteractive(group, {
    ...info,
    view: {
      pos: [x + Math.sin(rot) * dist, height, z + Math.cos(rot) * dist],
      target: [x, 3, z],
    },
  });
  OUTSKIRTS[key] = group;
  return group;
}

/** 局部坐标 → 世界坐标，与 group.rotation.y = rot 用的是同一套变换 */
function onPad(x, z, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return (lx, lz) => ({ x: x + lx * c + lz * s, z: z - lx * s + lz * c });
}

/* ---------- 修道院外围：一条往西北、往北去的链 ---------- */
const HOLY_WELL = { x: -142, z: -104, rot: 0.80 };
const TITHE_BARN = { x: -206, z: -122, rot: 0.70 };
const ALMSHOUSE = { x: -148, z: -178, rot: 0.20 };
const MASONS_LODGE = { x: -246, z: -166, rot: 0.40 };
const HERMITAGE = { x: -96, z: -186, rot: -0.40 };

addOutskirt('holywell', P_OUT.makeHolyWell(TM), {
  ...HOLY_WELL, dist: 24, height: 13,
  info: {
    name: '圣泉 · Holy Well',
    tag: '治病的泉水',
    desc: '修道院西北的一眼泉水。石砌的圆池，四根石墩撑起一座小亭；北面的壁龛里供着圣人像，东侧的木栏杆上挂满了还愿的布条、拐杖和蜡制的手脚。',
    detail: '中世纪的圣泉被认为有疗效：朝圣者绕着池子走几圈，把布条系在栏杆上，病好了就把拐杖留下。修道院靠泉水得来的捐献过日子，也靠它把病人引到门口。',
  },
});

addOutskirt('tithebarn', P_OUT.makeTitheBarn(TM), {
  ...TITHE_BARN, dist: 40, height: 24,
  info: {
    name: '什一税谷仓 · Tithe Barn',
    tag: '收成的十分之一',
    desc: '一座二十二米长的大木仓，石砌墙基、木板墙、大坡度的茅草顶。正面宽得能整车赶进去，门楣下开了一排通风缝；仓里是平整的脱粒木地板和成堆的粮袋，门外停着板车与木桶。',
    detail: '什一税是教区居民把收成的十分之一交给教会。谷仓必须又大又干——木构的大跨度屋架就是为了让马车直接驶入，谷物摊在通风的地板上，靠穿堂风防霉。',
  },
});

addOutskirt('almshouse', P_OUT.makeAlmshouse(TM), {
  ...ALMSHOUSE, dist: 40, height: 22,
  info: {
    name: '济贫院 · Almshouse',
    tag: '一碗粥',
    desc: '一间挂着钟架的小堂，加一排通铺棚。门口三脚铁架上吊着施粥的大锅，火塘整天烧着；院子里开了一小块草药圃，晾着洗过的布。',
    detail: '本笃会规要求修道院无条件接待穷人与旅人。济贫院是中世纪最早的"医院"之一：管吃、管住、给伤者包扎，临终的人在这里等最后一程。',
  },
});

addOutskirt('masons', P_OUT.makeMasonsLodge(TM), {
  ...MASONS_LODGE, dist: 42, height: 26,
  info: {
    name: '石匠场 · Masons’ Lodge',
    tag: '一块石头的第一刀',
    desc: '三级下挖的石坑，坑里躺着已经凿方的石块；坑外码着待运的石料，旁边是石匠的工作台和一副吊石架，碎石堆里散着凿子与木槌。',
    detail: '中世纪的石匠是跟着大工程走的流动匠团，住在工地旁的木棚里。从采石、粗凿到现场装配都由他们一手包办，工钱按日算，手艺最好的"自由石匠"能拿普通石匠的两倍。',
  },
});

addOutskirt('hermitage', P_OUT.makeHermitage(TM), {
  ...HERMITAGE, dist: 30, height: 18,
  info: {
    name: '隐士居 · Hermitage',
    tag: '一个人的林子',
    desc: '林子深处的一间石屋，旁边一座更小的祈祷室，山墙上挂着钟。屋前是编条篱笆围出的一小块菜地，一块石十字立在林间空地上。',
    detail: '隐士是中世纪宗教生活的一种极端形式：离开团体，独自住在林子里祈祷。教会对此态度矛盾——他们可能被尊为圣徒，也可能被当作异端。多数隐士靠附近村民送饭活着。',
  },
});

/* ---------- 比武场外围 ---------- */
const TRAINING_YARD = { x: 64, z: -178, rot: -0.55 };
const HORSE_FAIR = { x: 122, z: -160, rot: -0.50 };
const TOURNEY_FAIR = { x: 110, z: -232, rot: 0.10 };
const ARMORER_CAMP = { x: 180, z: -196, rot: 0.50 };
const SURGEON_TENT = { x: 20, z: -218, rot: 0.10 };

addOutskirt('training', T_OUT.makeTrainingYard(TM), {
  ...TRAINING_YARD, dist: 42, height: 28,
  info: {
    name: '校场 · Training Yard',
    tag: '一天一千枪',
    desc: '一片被踩秃的场地，白灰画出跑马圈。木桩靶裹着草绳，三道草垛箭靶立在场边，射箭线前插着射偏的箭。角落里是兵器维护棚，磨刀石和油壶摆在台面上。',
    detail: '骑士的训练从七岁当侍童开始：先学骑马，再学用剑和长矛。木桩靶用于练刺击，一天要刺上千次。正式上场比武之前，侍从要先在这种校场上练好几年。',
  },
});

addOutskirt('horsefair', T_OUT.makeHorseFair(TM), {
  ...HORSE_FAIR, dist: 40, height: 26,
  info: {
    name: '马市 · Horse Fair',
    tag: '一匹马顶几年收成',
    desc: '三面围栏圈出的场地，南面留一道门。拍卖台搭在当中，两根旗杆挑着蓝布幔，台上摆一张小桌和木槌。两排拴马桩上系着马，蹄铁匠的帆布帐下面烧着炉子。',
    detail: '中世纪的马既是战略物资，也是身份象征。一匹战马的价格抵得上一个骑士几年的收入，所以买马要看牙、看蹄、看步态——马市上的掮客因此名声很差，因为太容易作假。',
  },
});

addOutskirt('tourneyfair', T_OUT.makeTournamentFair(TM), {
  ...TOURNEY_FAIR, dist: 46, height: 26,
  info: {
    name: '场外集市 · Tournament Fair',
    tag: '跟着骑士来的商人',
    desc: '比武场外的一条街：六座货摊沿街排开，各是一种颜色的条纹布篷，卖麦与草料、皮革、铁器、布匹、酒和铜器。跨街的旗绳上挂满三角旗，西头是斗鸡圈，东头是吊着锅的小吃摊。',
    detail: '比武大会同时也是集市。成千上万的人涌来看比赛，商人跟着军队走，酒、布、铁器、马具都在场外卖。国王多次想把集市从比武场挪开，因为聚集的人太多，容易出事。',
  },
});

addOutskirt('armorer', T_OUT.makeArmorerCamp(TM), {
  ...ARMORER_CAMP, dist: 28, height: 16,
  info: {
    name: '甲胄匠工坊 · Armorer’s Camp',
    tag: '敲铁的声音',
    desc: '一顶方顶大帐，前面敞开，帐里是工作台、半成品的护胸和挂甲架。帐外的石圈炉烧着，风箱摆在旁边；三具木架人像穿着胸甲、肩甲和头盔，两片锁子甲晾在柱间。',
    detail: '甲胄匠是比武大会上最赚钱的人之一。盔甲按件定制，一套全身板甲要做几个月；比武用的甲比实战甲更厚——目的不是不被击中，而是被击中也不死。',
  },
});

addOutskirt('surgeon', T_OUT.makeSurgeonTent(TM), {
  ...SURGEON_TENT, dist: 26, height: 15,
  info: {
    name: '伤兵帐 · Surgeon’s Tent',
    tag: '帐里的三把刀',
    desc: '一座圆锥大帐，顶上旗杆挂着红十字旗，帐口掀起门帘。帐里是手术台、白布和三把器械；帐外四张草垫躺着伤员，火塘上烧着水壶，绳上晾着绷带。',
    detail: '中世纪的"外科医生"与"内科医生"是两个行当：医生读大学、开药方，不动刀；动刀的是理发师-外科医生，地位低得多。比武场边的外科医生主要处理骨折和矛伤。',
  },
});

/* ---------- 客栈外围 ---------- */
const FERRY = { x: -206, z: 42, rot: Math.PI };
const SHRINE = { x: -190, z: 110, rot: Math.PI };
const CAMPFIRE = { x: -246, z: 96, rot: 0.30 };
const WAYSTATION = { x: -186, z: 168, rot: Math.PI };
const HAMLET = { x: -238, z: 186, rot: 0.60 };

addOutskirt('ferry', I_OUT.makeFerryCrossing(TM), {
  ...FERRY, dist: 34, height: 20,
  info: {
    name: '渡口 · Ferry Crossing',
    tag: '过河的钱',
    desc: '一条自北向南的河，一座木栈桥伸进水里，桥头立着两根带球头的系船柱。平底渡船靠在桥边，船头挂着灯笼；岸上一间石砌的渡口小屋，檐下摆着长凳和一圈草绳。',
    detail: '中世纪的桥是稀罕物，多数路口靠渡船。渡船属于领主或修道院，过河要收钱，价钱由习俗定。船夫也负责把人从水里捞上来——捞尸体的报酬往往比渡活人更高。',
  },
});

addOutskirt('shrine', I_OUT.makeRoadsideShrine(TM), {
  ...SHRINE, dist: 18, height: 10,
  info: {
    name: '路边神龛 · Roadside Shrine',
    tag: '出门前许的愿',
    desc: '一座小石龛立在路边，台基前三级台阶，龛里供着圣人像，两侧各一只烛台。龛外两道矮石栏挂满还愿的木牌，旁边一棵树上系着布条，地上留着烧剩的蜡烛头。',
    detail: '路边的神龛是给赶路的人用的：出门前祈祷一路平安，回家时来还愿。多数神龛由一户人家或一个行会出资修建，日常维护也是他们的责任。',
  },
});

addOutskirt('campfire', I_OUT.makeCampfireCircle(TM), {
  ...CAMPFIRE, dist: 24, height: 13,
  info: {
    name: '篝火营地 · Campfire Circle',
    tag: '路边的一夜',
    desc: '一块空地上的篝火：石圈、灰烬、四根交叠的圆木，火还烧着。周围六块平石当凳子，三顶帆布小帐撑在边上，一匹马拴在旁边。',
    detail: '中世纪的旅人很少住店，多数在路边露宿。火既是取暖，也是信号——一群人围在一处生火，比一个人走夜路安全。营地通常选在有水、有柴、看得见路的地方。',
  },
});

addOutskirt('waystation', I_OUT.makeWaystation(TM), {
  ...WAYSTATION, dist: 38, height: 24,
  info: {
    name: '货栈 · Waystation',
    tag: '货在这里换手',
    desc: '石台基上的一座大木仓，正面三扇大门对着卸货月台，台上堆着木桶、板条箱、麻袋和一挂咸鱼。两辆货车停在门口，车轮还上着货，檐下挂一盏铁灯。',
    detail: '货栈是长距离贸易的节点：商队把货寄存在这里，等另一支商队接运。中世纪的陆运成本极高，一车货走一百公里，运价可能和货价相当——所以大宗货物尽量走水路。',
  },
});

addOutskirt('hamlet', I_OUT.makeAbandonedHamlet(TM), {
  ...HAMLET, dist: 40, height: 24,
  info: {
    name: '荒村 · Abandoned Hamlet',
    tag: '没人回来的地方',
    desc: '一小片被丢下的村舍：三幢房子塌了半边，屋顶露天，墙顶的石头落了一地；井被封了，篱笆倒在草里，一辆破车陷在泥中，一棵树从屋子中间长了出来。',
    detail: '中世纪的村子会整体消失：黑死病之后人口锐减，加上领主改牧羊、圈地，许多村落被放弃。英格兰在 1450 到 1500 年间消失了上千个村子，今天只剩一片长草的土丘。',
  },
});

/* ============================================================
 *  第二圈：向外再扩一倍
 *  第一圈是母场景赖以为生的东西，第二圈是它养出来的地界——
 *  埋人的墓地、磨面的磨坊、牧马的草场、练箭的靶场、收税的路卡。
 * ========================================================== */

/* ---------- 修道院方向：往西、往西北、往北 ---------- */
const GRAVEYARD2 = { x: -300, z: -170, rot: 0.30 };
const ABBEY_MILL = { x: -268, z: -244, rot: 0.55 };
const SHEEPFOLD = { x: -372, z: -206, rot: 0.10 };
const APIARY = { x: -268, z: -84, rot: 1.35 };
const RUIN_CHAPEL = { x: -128, z: -268, rot: -0.25 };

addOutskirt('graveyard2', P_OUT2.makePilgrimGraveyard(TM), {
  ...GRAVEYARD2, dist: 30, height: 18,
  info: {
    name: '朝圣者墓地 · Pilgrim Graveyard',
    tag: '死在路上的人',
    desc: '修道院西墙外的一片坟地，石墙围起，南面留一道门。北端一座石龛，龛里供着圣母；几十块墓碑高低不一，多数已经歪了，碑前是浅浅的土堆；西北角一棵紫杉，树影盖住半个园子。',
    detail: '死在西欧路上的朝圣者太多，修道院便在院墙外辟出墓地收殓。紫杉在坟地边很常见——它的枝叶有毒，能防牛羊啃食坟头，也象征永生。',
  },
});

addOutskirt('abbeymill', P_OUT2.makeAbbeyMill(TM), {
  ...ABBEY_MILL, dist: 30, height: 17,
  info: {
    name: '修道院磨坊 · Abbey Mill',
    tag: '磨面的地方',
    desc: '一口石砌的磨坊塘，水面浮着三只鸭子；木槽把水引到轮子上方，上射式的十二片桨叶正被水推着转。磨坊主屋是石砌一层，山墙朝西，门口立着两片备用的磨盘，墙边码着空麻袋。',
    detail: '水磨是中世纪最重要的动力机械，一台能顶几十个人的力气。修道院的磨坊通常垄断全村的磨面，农户必须把麦子挑来磨，且要留下十分之一，这本身就是一笔收入。',
  },
});

addOutskirt('sheepfold', P_OUT2.makeSheepfold(TM), {
  ...SHEEPFOLD, dist: 34, height: 21,
  info: {
    name: '羊圈与剪毛棚 · Sheepfold',
    tag: '羊毛的家底',
    desc: '三十米见方的木栏围出一片被羊啃秃的场地，南面留一道宽门。西侧是一间敞开的剪毛棚，棚下有一张剪毛台，台上放着剪子和一卷刚剪下的羊毛；棚外堆着捆好的羊毛包。',
    detail: '中世纪英格兰的羊毛是硬通货，修道院正是靠大面积的羊群和羊毛出口赚到大笔银钱——西多会甚至被叫作"羊毛教会"。羊圈要离村子远，才免得羊啃了庄稼。',
  },
});

addOutskirt('apiary', P_OUT2.makeApiary(TM), {
  ...APIARY, dist: 26, height: 15,
  info: {
    name: '蜂场 · Apiary',
    tag: '蜡与蜜',
    desc: '编条篱笆围出的一方草圃，两排木台上摆着十二个草编蜂箱，箱口一律朝东。东侧留出的一畦花专门给蜂采；西侧一间小屋放蜂具，门口是一只摇蜜桶。空气里有一小群蜂在箱口盘桓。',
    detail: '中世纪的蜂蜡比蜂蜜更值钱——没有它就没有蜡烛，教堂一年用掉的蜡是笔大开销。修道院几乎都有蜂场，蜂箱用编草做成罩形，以避雨保温。',
  },
});

addOutskirt('ruinchapel', P_OUT2.makeRuinedChapel(TM), {
  ...RUIN_CHAPEL, dist: 32, height: 18,
  info: {
    name: '废弃小教堂 · Ruined Chapel',
    tag: '没人做礼拜了',
    desc: '一座塌了顶的小教堂：西墙还立着，高处留着三扇尖券窗，窗外的券石环还在；北墙塌了半截，碎石滚了一地；东墙只剩半米高的墙根和东端的半圆后殿。地上到处是杂草、条石和几根烧焦的梁。',
    detail: '教堂被弃置多半因为教区人口散尽、或改归他处。石造建筑塌到只剩三面墙，通常是因为屋顶先朽——一旦漏雨，木屋架几年内就烂断，然后整片压垮墙头。',
  },
});

/* ---------- 比武场方向：往东、往北 ---------- */
const HORSE_PASTURE = { x: 236, z: -232, rot: -0.55 };
const ARCHERY = { x: 52, z: -286, rot: 0.15 };
const TIMBER_YARD = { x: 268, z: -166, rot: -0.85 };
const SADDLERY = { x: 306, z: -246, rot: -0.40 };
const KNIGHT_MANOR = { x: 198, z: -310, rot: -0.15 };

addOutskirt('pasture', T_OUT2.makeHorsePasture(TM), {
  ...HORSE_PASTURE, dist: 40, height: 26,
  info: {
    name: '牧马场 · Horse Pasture',
    tag: '养马的地方',
    desc: '四十二米见方的木栏围起一片深绿的草场，南面留一道栅门。栏内有五匹低头的马，西北角一眼水槽，东北角一座茅草顶草料棚和两个大草垛；场子中央偏东一棵孤树，是唯一的荫凉。',
    detail: '一匹战马的养成要四五年，草场得够大：一匹马的草料相当于三四个人的口粮。比武场边上必须有牧马场，否则赛前的马匹没法恢复体力。',
  },
});

addOutskirt('archery', T_OUT2.makeArcheryRange(TM), {
  ...ARCHERY, dist: 34, height: 20,
  info: {
    name: '箭术场 · Archery Range',
    tag: '练准头',
    desc: '一条三十四米长的射道，起射线是道白灰。东端一道长土垄用来挡飞箭，垄前立五个草靶，靶上画着三道同心圆；靶上、地上插着没拔的箭。西端一座兵器架，挂着三张弓和一筒箭。',
    detail: '英格兰自 1363 年起下令每个成年男子周日必须练射，靶场因此成了村里的标准配置。挡箭土垄是必需的——射偏的箭能飞出上百米，伤人的事例不少。',
  },
});

addOutskirt('timberyard', T_OUT2.makeTimberYard(TM), {
  ...TIMBER_YARD, dist: 34, height: 20,
  info: {
    name: '木料场 · Timber Yard',
    tag: '赛会背后的原料',
    desc: '一片铺满锯末的空场：中央高架锯上一根十一米长的原木，锯口开了一半，大锯还插在缝里；西侧码着三排原木，端面朝外；东侧斜靠着一排方木；东北角一座敞棚，棚下工作台上摆着斧子，地上是刨花。',
    detail: '看台、栅栏、门楼全是木头的，一场大赛之前木料场要忙上整个冬天。原木必须架高晾上一年才能锯——新鲜的木头会翘、会裂，做成梁撑不住。',
  },
});

addOutskirt('saddlery', T_OUT2.makeSaddlery(TM), {
  ...SADDLERY, dist: 22, height: 13,
  info: {
    name: '马具匠铺 · Saddlery',
    tag: '皮子与鞍',
    desc: '一间石基木骨的工坊，前脸敞开，木架裸露。门口三个木马形的鞍架上搭着半成品的马鞍，马镫的皮带垂下来；工作台上摊着皮子，旁边是锥子和线轴；墙上挂着一排皮带与缰绳，门边晾着一张生皮。',
    detail: '马鞍是中世纪最讲究的皮具之一：硬鞍要先把皮子泡软、包在木胎上、钉好再慢慢阴干。好的鞍匠在围城时是被重点保护的人。',
  },
});

addOutskirt('manor', T_OUT2.makeKnightManor(TM), {
  ...KNIGHT_MANOR, dist: 34, height: 20,
  info: {
    name: '老骑士的宅子 · Knight\'s Manor',
    tag: '退下来的人',
    desc: '一幢石砌一层、木构二层的宅子，二层出挑，山墙是浅色石面，屋顶铺板岩。院墙围出一个小院：拴马桩、水槽、兵器架上靠着两杆旧枪和一面盾。门前立着一面酒红色的家徽小旗。',
    detail: '比武场周围总住着几个退役的老骑士——他们不能再上阵，就靠教年轻人骑术、给赛会做裁判、替人作保过日子。房子比村里的大，比城堡的小，正合身份。',
  },
});

/* ---------- 客栈方向：往西、往南 ---------- */
const TOLL_GATE = { x: -300, z: 60, rot: Math.PI * 0.5 };
const WATCHTOWER = { x: -352, z: 140, rot: Math.PI };
const HOSPITAL = { x: -286, z: 262, rot: Math.PI };
const MILLER_COTTAGE = { x: -366, z: 236, rot: Math.PI * 0.82 };
const GALLOW = { x: -176, z: 258, rot: Math.PI };

addOutskirt('toll', I_OUT2.makeTollGate(TM), {
  ...TOLL_GATE, dist: 26, height: 15,
  info: {
    name: '收税关卡 · Toll Gate',
    tag: '过路要钱',
    desc: '驿道在这里被一根红白相间的横杆拦住。路西是一间小石屋，朝路开窗、屋顶冒烟；横杆架在立轴上，短的一端挂着石块配重，抬起来毫不费力。路东一只石墩，杆子落下时正好搭在凹槽里。',
    detail: '关卡收的是"过路税"（toll），按车、按驮畜、按人头分别计。领主修了路桥就有权收钱，这是中世纪最常见的一种税，也是路霸和国王都盯着的一块肥肉。',
  },
});

addOutskirt('watchtower', I_OUT2.makeWatchtower(TM), {
  ...WATCHTOWER, dist: 30, height: 20,
  info: {
    name: '瞭望塔 · Watchtower',
    tag: '看得见来路',
    desc: '一座九米半高的木构方塔，四根主柱向内收，每一面两道交叉斜撑，四道水平箍把塔身箍住。顶上一圈栏杆围出平台，四坡茅草顶，檐下是斜撑；平台上放着一只铁火盆用于示警。梯子从地面斜靠到平台。',
    detail: '木塔是瞭望和传讯的设施，不是堡垒——它挡不住进攻，但能在敌人来之前点火示警。中世纪的道路上每隔一段就有一座这样的塔，靠烟火接力把消息传下去。',
  },
});

addOutskirt('hospital', I_OUT2.makePilgrimHospital(TM), {
  ...HOSPITAL, dist: 34, height: 20,
  info: {
    name: '朝圣者病舍 · Pilgrim Hospital',
    tag: '走不动的人',
    desc: '一座十五米长的大厅，石墙、高坡茅草顶、两端山墙，门上方刻着十字，两侧是尖券窗。厅内两排共十二张草铺，铺间垂着布帘；门外一张长凳、两副靠墙的拐杖，屋后三畦药草，院角一口带辘轳的小井。',
    detail: '中世纪的"医院"（hospital）本义是"款待之所"，收的是走不动的朝圣者、老人和穷人，不是治病的地方。护理以洗澡、供饭、祈祷为主，真正的医术有限。',
  },
});

addOutskirt('millercottage', I_OUT2.makeMillerCottage(TM), {
  ...MILLER_COTTAGE, dist: 36, height: 21,
  info: {
    name: '水磨人家 · Miller\'s Cottage',
    tag: '一家人守着一台轮子',
    desc: '小溪从北往南穿过，一座小木桥跨过去。溪东是石砌的磨坊，下射水轮半沉在水里；溪西是一幢茅草顶农舍，门前两畦菜地，屋旁立着两片磨盘，墙边码着面袋，一根晾衣绳横在院子南头。',
    detail: '磨坊主是村里最招人恨也最离不开的人：他收的"磨费"是一成到两成，遇上荒年就成了众矢之的。磨坊多半世代相传，一家人住在轮子旁边，日夜听着水声。',
  },
});

addOutskirt('gallow', I_OUT2.makeGallow(TM), {
  ...GALLOW, dist: 24, height: 16,
  info: {
    name: '绞架 · Gallows',
    tag: '给路过的人看',
    desc: '驿道边一处高起的石台，两级踏步上去，两根粗木柱架起一根横梁，梁上垂着三根绳子，中间那根下挂着一只铁条编的空笼子。梁上停着两只乌鸦。旁边一间小木棚，是看守人歇脚的地方。',
    detail: '中世纪的绞架通常立在路口或荒坡上，目的不是行刑，而是让人看见。判决往往就地执行，尸体长期不取下——英格兰法律里"绞刑后不予埋葬"是一种额外的惩罚。',
  },
});

  return { village, GRASS_Y, addRoad, FARMSTEADS, farmsteads, chimneys, sheep, chickens, fortress, TOWN_POS, townCenter, tat, townPlaza, craftSpot, priory, tourney, inn, OUTSKIRTS, onPad, HOLY_WELL, TITHE_BARN, ALMSHOUSE, MASONS_LODGE, HERMITAGE, TRAINING_YARD, HORSE_FAIR, TOURNEY_FAIR, ARMORER_CAMP, SURGEON_TENT, FERRY, SHRINE, CAMPFIRE, WAYSTATION, GRAVEYARD2, ABBEY_MILL, SHEEPFOLD, APIARY, RUIN_CHAPEL, HORSE_PASTURE, ARCHERY, TIMBER_YARD, SADDLERY, KNIGHT_MANOR, TOLL_GATE, WATCHTOWER, HOSPITAL, MILLER_COTTAGE, GALLOW };
}
