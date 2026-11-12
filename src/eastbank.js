import * as THREE from 'three';
import * as NATURE from './nature.js';
import * as VIL from './village.js';
import * as TOWN from './town.js';
import * as TOWN2 from './town2.js';
import * as POP from './population.js';

/* 河东：大河、群山、瀑布、镜湖、渡口镇和两座桥。 */
export function buildEastbank({ scene, glowTx, awningMaps, TM, NM, box, RIVER_PTS, RIVER_W, inClearZone, registerInteractive, torchFlames, torchLights, waterWheels, stalls, lampHaloes, schedule, addPerson, GRASS_Y, addRoad, chimneys, onPad, HOLY_WELL, TITHE_BARN, ALMSHOUSE, MASONS_LODGE, HERMITAGE, TRAINING_YARD, HORSE_FAIR, TOURNEY_FAIR, ARMORER_CAMP, SURGEON_TENT, FERRY, SHRINE, CAMPFIRE, WAYSTATION, GRAVEYARD2, ABBEY_MILL, SHEEPFOLD, APIARY, RUIN_CHAPEL, HORSE_PASTURE, ARCHERY, TIMBER_YARD, SADDLERY, KNIGHT_MANOR, TOLL_GATE, WATCHTOWER, HOSPITAL, MILLER_COTTAGE, GALLOW }) {
/* ============================================================
 *  河东：大河、渡口镇、瀑布、镜湖与群山
 *
 *  地图东侧原先是一片空草地，这里补上一条从东南流来的大河。
 *  河把地界分成两半，西岸是老城堡与老镇，东岸是新开的渡口镇，
 *  两座石桥把两边连起来；河的北面是山，山脚一道瀑布落进镜湖。
 * ========================================================== */

/* 河边拴着的船：随水轻轻起伏 */
const riverBoats = [];

const RIVER = new THREE.Group();
scene.add(RIVER);
{
  const river = NATURE.makeGreatRiver(NM, RIVER_PTS, RIVER_W, { waterY: 0.34 });
  river.position.y = GRASS_Y + 0.02;
  VIL.compactGroup(river);
  RIVER.add(river);

  // 河岸的柳树：垂在水边，比山上的松树矮且圆
  {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x5c7a3e, roughness: 1, flatShading: true });
    for (let i = 2; i < RIVER_PTS.length - 1; i += 1) {
      const [x, z] = RIVER_PTS[i];
      const [nx, nz] = RIVER_PTS[i + 1];
      const dx = nx - x, dz = nz - z;
      const L = Math.hypot(dx, dz) || 1;
      // 法线
      const px = -dz / L, pz = dx / L;
      const w = RIVER_W[i];
      for (const sgn of [-1, 1]) {
        if (Math.random() > 0.72) continue;
        const off = w / 2 + 5 + Math.random() * 9;
        const tx = x + px * sgn * off;
        const tz = z + pz * sgn * off;
        if (inClearZone(tx, tz, 3)) continue;
        const h = 3.2 + Math.random() * 2.4;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, h, 6), trunkMat);
        trunk.position.set(tx, GRASS_Y + h / 2, tz);
        trunk.castShadow = true;
        scene.add(trunk);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(2.4 + Math.random() * 1.2, 7, 6), leafMat);
        crown.scale.set(1, 0.78, 1);
        crown.position.set(tx, GRASS_Y + h + 1.2, tz);
        crown.castShadow = true;
        crown.receiveShadow = true;
        scene.add(crown);
      }
    }
  }
}

/* ---------- 群山：东边一整条山脊 ---------- */
const MOUNTAINS = [
  // [x, z, 山脚半径, 高度, 有没有雪]
  [470, 70, 100, 168, true],
  [570, -50, 115, 205, true],
  [600, 130, 100, 150, true],
  [440, -210, 90, 142, false],
  [480, -300, 85, 128, false],
  [380, 8, 74, 118, false],
];
for (const [mx, mz, mr, mh, snow] of MOUNTAINS) {
  const mtn = NATURE.makeMountain(NM, { h: mh, r: mr, snow, seed: mx + mz });
  mtn.position.set(mx, GRASS_Y, mz);
  // 一座山有 129 个网格（松林、碎石、山体），烘成几批
  VIL.compactGroup(mtn);
  scene.add(mtn);
}

/* ---------- 瀑布与镜湖 ---------- */
const FALLS_POS = { x: 400, z: 150, rot: 0.42 };
let FALLS = null;
{
  const falls = NATURE.makeFalls(NM, { width: 20, height: 26, depth: 14 });
  falls.position.set(FALLS_POS.x, GRASS_Y, FALLS_POS.z);
  falls.rotation.y = FALLS_POS.rot;
  scene.add(falls);
  FALLS = falls;
  registerInteractive(falls, {
    name: '银线瀑 · Silverthread Falls',
    tag: '山把水送下来',
    desc: '北山的南坡在这里断开一截，融雪汇成的水从二十四米高的崖口直落下来，砸进崖下的石潭。潭水漫出后往南淌成一条小溪，最后汇进大河。',
    detail: '中世纪的磨坊要么挂在水车上，要么就得靠这种落差。山里人管瀑布叫"银线"，因为细水时节只剩几缕白线挂在崖上。',
    view: { pos: [404, 15, 214], target: [400, 12, 156] },
  });
}

const LAKE_POS = { x: 330, z: 205 };
const LAKE = NATURE.makeLake(NM, { r: 34, rect: 1.3 });
LAKE.position.set(LAKE_POS.x, GRASS_Y, LAKE_POS.z);
// 芦苇、睡莲加起来近四百个网格，先烘再注册；鱼群是后挂上去的，不受影响
VIL.compactGroup(LAKE);
scene.add(LAKE);
registerInteractive(LAKE, {
  name: '镜湖 · Mirror Lake',
  tag: '山脚下的一汪静水',
  desc: '瀑布下游的一处洼地积水成湖，水面平得像镜子，晴天能照出对岸的山。湖里长满睡莲，岸边一圈芦苇和香蒲，水鸟整天在上面绕。',
  detail: '这种冰川挖出来的小湖在山地很常见：水浅、底平、四周有草甸。村里人秋天来割芦苇，冬天结冰后从湖心凿洞捕鱼。',
  view: { pos: [330, 30, 285], target: [330, 4, 205] },
});

/* ---------- 河湾的花甸 ---------- */
{
  const meadow = NATURE.makeMeadow(NM, { w: 44, d: 32, flowers: 300 });
  meadow.position.set(150, GRASS_Y, 320);
  meadow.rotation.y = -0.3;
  VIL.compactGroup(meadow);
  scene.add(meadow);
}

/* ---------- 会动的：水鸟、鱼、虫 ---------- */
const WILDLIFE = [];
{
  // 湖上的水鸟：绕湖盘旋
  const birds1 = NATURE.makeBirdFlock(NM, {
    count: 16, center: [LAKE_POS.x, LAKE_POS.z], radius: 30, height: 16,
    color: 0xf0ece2, scale: 1.6,
  });
  scene.add(birds1.group);
  WILDLIFE.push(birds1);

  // 河湾上的一群，飞得低一些
  const birds2 = NATURE.makeBirdFlock(NM, {
    count: 10, center: [160, 382], radius: 42, height: 11,
    color: 0xd6d2c6, scale: 1.3,
  });
  scene.add(birds2.group);
  WILDLIFE.push(birds2);

  // 湖里的鱼
  const fish1 = NATURE.makeFishShoal(NM, {
    count: 26, center: [0, 0], radius: 26, waterY: 0.34,
    color: 0x8f9c8a, scale: 1.1,
  });
  LAKE.add(fish1.group);
  WILDLIFE.push(fish1);

  // 瀑布潭里的鱼
  const fish2 = NATURE.makeFishShoal(NM, {
    // 潭心在瀑布本地 z ≈ 16（崖前脸往南一个潭的半径），鱼群跟着挪过去
    count: 14, center: [0, 16], radius: 7.5, waterY: 0.4, color: 0x9aa89c, scale: 0.95,
  });
  // 鱼群挂在瀑布组里，跟着瀑布一起转
  FALLS.add(fish2.group);
  WILDLIFE.push(fish2);

  // 草甸与河滩的蜻蜓蝴蝶
  const bugs1 = NATURE.makeInsectSwarm(NM, {
    count: 30, center: [150, 320], radius: 16, height: 1.7, scale: 0.5,
  });
  scene.add(bugs1.group);
  WILDLIFE.push(bugs1);

  const bugs2 = NATURE.makeInsectSwarm(NM, {
    count: 22, center: [LAKE_POS.x, LAKE_POS.z + 30], radius: 14, height: 1.4, scale: 0.45,
    color: 0xe0c8b0,
  });
  scene.add(bugs2.group);
  WILDLIFE.push(bugs2);

  const bugs3 = NATURE.makeInsectSwarm(NM, {
    count: 18, center: [-60, 430], radius: 18, height: 1.5, scale: 0.46,
    color: 0xd8d0c0,
  });
  scene.add(bugs3.group);
  WILDLIFE.push(bugs3);
}

/* ============================================================
 *  渡口镇（Fordham）：河东的第二个镇子
 *
 *  镇子的长轴顺着河岸（rot 与这一段河道平行），所以北面一整条街都贴着水：
 *  码头、鱼市、货栈、老渡口、水磨、洗衣石阶一字排开。
 *  广场在内陆一侧，面积与西岸老镇的镇中心广场完全一样（26 × 20）。
 *  镇门开在西头，正对着从西桥下来的大路。
 * ========================================================== */
const TOWN2_POS = { x: 34, z: 456, rot: 0.14 };
const town2 = new THREE.Group();
town2.position.set(TOWN2_POS.x, GRASS_Y, TOWN2_POS.z);
town2.rotation.y = TOWN2_POS.rot;
scene.add(town2);

/* 镇内局部坐标 → 世界坐标 */
const t2Side = new THREE.Vector3(Math.cos(TOWN2_POS.rot), 0, -Math.sin(TOWN2_POS.rot));
const t2Fwd = new THREE.Vector3(Math.sin(TOWN2_POS.rot), 0, Math.cos(TOWN2_POS.rot));
const t2at = (sx, sz, y = GRASS_Y) =>
  new THREE.Vector3(TOWN2_POS.x, y, TOWN2_POS.z).addScaledVector(t2Side, sx).addScaledVector(t2Fwd, sz);

/* ---- 广场 ---- */
const town2Plaza = new THREE.Group();
town2.add(town2Plaza);
{
  const sq = TOWN.makeMarketSquare(TM, { w: 26, d: 20 });
  sq.position.y = 0.01;
  town2Plaza.add(sq);

  const cross = TOWN.makeMarketCross(TM);
  cross.position.set(0, 0, 1.5);
  town2Plaza.add(cross);

  // 沿南侧摆五个摊位，数目与西岸一样
  const KINDS = ['fish', 'bread', 'apple', 'cloth', 'pottery'];
  KINDS.forEach((kind, i) => {
    const stall = TOWN.makeStall(TM, {
      kind,
      awning: new THREE.MeshStandardMaterial({
        map: awningMaps[(i + 2) % awningMaps.length], roughness: 0.92, side: THREE.DoubleSide,
      }),
    });
    stall.position.set(-9.4 + i * 4.7, 0, 6.6);
    stall.rotation.y = Math.PI;   // 摊子朝北，正对广场
    town2Plaza.add(stall);
    stalls.push({
      group: stall,
      pivot: stall.userData.awning,
      cloth: stall.userData.awningCloth,
      flap: stall.userData.awningFlap,
      goods: stall.userData.goods,
      cover: stall.userData.cover,
      open: 0,
      phase: 2.2 + i * 0.7,
    });
  });

  // 广场两侧的石凳
  for (const [x, z, r] of [[-10.5, -6.5, 0.2], [10.5, -6.5, -0.2]]) {
    const b = TOWN.makeBench(TM, 2.4);
    b.position.set(x, 0, z);
    b.rotation.y = r + Math.PI;
    town2Plaza.add(b);
  }

  // 四角的灯柱
  for (const [x, z] of [[-11, -8.5], [11, -8.5], [-11, 8.5], [11, 8.5]]) {
    const lamp = TOWN.makeLantern(TM);
    lamp.position.set(x, 0, z);
    lamp.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;

    const light = new THREE.PointLight(0xffa848, 0, 18, 2);
    light.position.copy(lamp.userData.lantern);
    light.userData.gain = 0.42;
    light.userData.rangeGain = 0.5;
    lamp.add(light);
    torchLights.push(light);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTx, color: 0xffb14a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    halo.position.copy(lamp.userData.lantern);
    halo.scale.setScalar(1.9);
    lamp.add(halo);
    lampHaloes.push(halo);

    town2Plaza.add(lamp);
  }
}
VIL.compactGroup(town2Plaza);
registerInteractive(town2Plaza, {
  name: '渡口镇广场 · Fordham Market',
  tag: '河东的新市集',
  desc: '和西岸的老镇广场一样大，一样铺着鹅卵石，正中一样立着石十字——新镇子要立的第一样东西总是它。摊位以鱼为主：河就在镇北头，鱼从水里到案上不过一炷香。',
  detail: '渡口镇的兴起全靠两座石桥。桥通之前这里只是个摆渡的滩头，桥修好之后商队改走陆路，河这边的地价一年翻了一倍。',
  view: { pos: [34, 13, 424], target: [34, 3, 456] },
});

/* ---- 木筋楼：南、东、西三面围住广场，北面留给河 ---- */
const TOWN2_HOUSES = [
  // 南排（面朝 -Z）
  { x: -5.5, z: 15.5, rot: Math.PI, w: 6.6, d: 5.4, h1: 2.6, h2: 2.3, roofH: 2.5 },
  { x: 2.5, z: 15.8, rot: Math.PI, w: 6.0, d: 5.2, h1: 2.4, h2: 2.2, roofH: 2.4 },
  { x: 10.5, z: 15.5, rot: Math.PI, w: 6.4, d: 5.4, h1: 2.7, h2: 2.3, roofH: 2.6 },
  // 东侧（面朝 -X）
  { x: 20.0, z: -9.0, rot: -Math.PI / 2, w: 6.4, d: 5.2, h1: 2.6, h2: 2.3, roofH: 2.5 },
  { x: 21.0, z: 9.0, rot: -Math.PI / 2, w: 6.0, d: 5.0, h1: 2.5, h2: 2.2, roofH: 2.4 },
  // 西侧（面朝 +X）
  { x: -20.0, z: -9.0, rot: Math.PI / 2, w: 6.4, d: 5.2, h1: 2.6, h2: 2.3, roofH: 2.5 },
  { x: -21.0, z: 9.0, rot: Math.PI / 2, w: 6.0, d: 5.0, h1: 2.5, h2: 2.2, roofH: 2.4 },
];
const town2Houses = new THREE.Group();
town2.add(town2Houses);
TOWN2_HOUSES.forEach((h, i) => {
  const house = TOWN.makeTudorHouse(TM, {
    w: h.w, d: h.d, h1: h.h1, h2: h.h2, roofH: h.roofH,
    doorX: i % 2 ? 0.8 : -0.8,
  });
  const chimneyLocal = house.userData.chimney.clone();
  VIL.compactGroup(house);
  house.userData.chimney = chimneyLocal;
  house.position.set(h.x, 0, h.z);
  house.rotation.y = h.rot;
  town2Houses.add(house);

  const c = chimneyLocal.clone();
  c.applyAxisAngle(new THREE.Vector3(0, 1, 0), h.rot + TOWN2_POS.rot);
  const p = t2at(h.x, h.z);
  chimneys.push({
    x: p.x + c.x, y: GRASS_Y + c.y, z: p.z + c.z,
    seed: 60 + i * 1.7,
  });
});
registerInteractive(town2Houses, {
  name: '渡口镇的街屋 · Fordham Houses',
  tag: '新镇的木头房子',
  desc: '跟西岸一样是木骨架加灰泥的二层楼，但木料用得更新——镇子才立了三十来年，墙还没被炉烟熏黑。二层照例往外挑，楼下留出一线躲雨的檐。',
  detail: '新镇子的房子往往比老镇更整齐：街是规划着划出来的，屋基一样宽，进深也一样。',
  view: { pos: [30, 12, 492], target: [34, 4, 470] },
});

/* ---- 酒馆：广场东南角 ---- */
{
  const tavern = TOWN.makeTavern(TM, {});
  VIL.compactGroup(tavern);
  tavern.position.set(16.5, 0, 21.5);
  tavern.rotation.y = Math.PI * 1.12;
  town2.add(tavern);
  registerInteractive(tavern, {
    name: '渡口酒馆 · The Ferryman',
    tag: '过河的人在这儿歇脚',
    desc: '招牌上画着一支船桨。桥修好之前这里就是渡口，船夫兼卖酒；桥通了之后酒留下，船收了起来。楼上四间客房，专做过河商队的生意。',
    detail: '桥头堡式的酒馆在中世纪很常见：它吃的是"过路人"这碗饭，位置比味道重要。',
    view: { pos: [62, 10, 496], target: [50, 4, 478] },
  });
}

/* ---- 铁匠铺 ---- */
{
  const smithy = TOWN.makeSmithy(TM, {});
  const forgeLocal = smithy.userData.forge.clone();
  VIL.compactGroup(smithy);
  smithy.position.set(-17.0, 0, 17.0);
  smithy.rotation.y = Math.PI * 0.88;
  town2.add(smithy);

  forgeLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 0.88 + TOWN2_POS.rot);
  const fp = t2at(-17.0, 17.0);
  const forgeGlow = new THREE.Group();
  forgeGlow.position.set(fp.x + forgeLocal.x, GRASS_Y + forgeLocal.y + 0.2, fp.z + forgeLocal.z);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx, color: 0xff7a2a, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  glow.scale.setScalar(2.0);
  glow.userData.baseScale = 2.0;
  forgeGlow.add(glow);
  torchFlames.push({ flame: glow, core: null, seed: 17.7 });

  const forgeLight = new THREE.PointLight(0xff7a24, 0, 20, 2);
  forgeLight.position.y = 0.5;
  forgeGlow.add(forgeLight);
  torchLights.push(forgeLight);
  scene.add(forgeGlow);

  registerInteractive(smithy, {
    name: '渡口铁匠铺 · Fordham Smithy',
    tag: '两座炉子里的第二座',
    desc: '新镇也得有自己的铁匠——马掌、船钉、箍桶的铁箍、桥上的铁栓，都从这儿出。铺子比老镇的小一间，炉膛却砌得更深，烧的是从东山林子运来的硬木炭。',
    detail: '桥与船都要大量铁件：桥面的铁栓、船帮的铁钉、绞盘的轴。一个镇子能不能立起来，先看有没有铁匠。',
    view: { pos: [-2, 10, 500], target: [10, 3, 480] },
  });
}

/* ---- 教堂：镇子的第二座，规模小一号，在广场西边 ---- */
{
  const church = TOWN.makeChurch(TM, {
    naveW: 7.0, naveD: 12.0, naveH: 4.8, towerS: 4.8, towerH: 12.0, spireH: 6.4,
  });
  const lampsLocal = (church.userData.interiorLamps || []).map((v) => v.clone());
  VIL.compactGroup(church);
  church.position.set(-22.0, 0, -13.0);
  church.rotation.y = Math.PI / 2;
  town2.add(church);

  for (const lp of lampsLocal) {
    const light = new THREE.PointLight(0xffc074, 0, 14, 2);
    light.position.copy(lp);
    light.userData.gain = 0.9;
    light.userData.rangeGain = 0.42;
    church.add(light);
    torchLights.push(light);
  }

  church.updateMatrixWorld(true);
  registerInteractive(church, {
    name: '渡口镇教堂 · St. Christopher',
    tag: '守渡人的主保',
    desc: '供的是圣克里斯托弗——旅人与渡夫的主保圣人。堂比西岸那间短三米，钟楼也矮一截，但位置一样在镇子最靠水的一块高地上。',
    detail: '沿河的镇子多半把圣克里斯托弗当作主保：画里的他拄杖涉水，肩上扛着圣婴。桥修好后他的香火不减反增，毕竟过桥也算赶路。',
    view: { pos: [-4, 13, 424], target: [12, 6, 440] },
  });
}

/* ---- 镇门：西头，从桥上下来进镇的第一道建筑 ---- */
{
  const gate = TOWN2.makeTownGate(TM);
  gate.position.set(-30.0, 0, 4.0);
  gate.rotation.y = Math.PI / 2;   // 券洞沿镇内的东西向
  town2.add(gate);

  // 门柱上的两盏灯（灯位跟着门本身转，先算门局部坐标）
  for (const sx of [-1, 1]) {
    const lx = sx * 3.4;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTx, color: 0xffb14a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    halo.position.set(lx, 4.2, 1.5);
    halo.scale.setScalar(2.0);
    gate.add(halo);
    lampHaloes.push(halo);

    const light = new THREE.PointLight(0xffa848, 0, 16, 2);
    light.position.set(lx, 4.1, 2.2);
    light.userData.gain = 0.5;
    light.userData.rangeGain = 0.55;
    gate.add(light);
    torchLights.push(light);
  }
  VIL.compactGroup(gate);

  registerInteractive(gate, {
    name: '渡口镇门 · Fordham Gate',
    tag: '桥这头的第一道门',
    desc: '两座方墩撑起一道半圆券，券上是雉堞与一块无字的石板。门从来不关——镇子没有城墙，这道门的作用是收过桥税、挂告示，以及让人一眼知道：到镇上了。',
    detail: '没有城墙的镇子在中世纪并不少见，尤其是靠桥收税富起来的那些。门与桥收的"桥税"（pontage）专款专用，就拿来修桥。',
    view: { pos: [-6, 10, 476], target: [-8, 5, 462] },
  });
}

/* ---- 沿河的一条街：码头、鱼市、货栈、老渡口、水磨、石阶 ---- */
{
  // 码头：伸进河里
  {
    const wharf = TOWN2.makeWharf(TM, { len: 17, wide: 4.4 });
    wharf.position.set(-18, 0, -45);
    wharf.rotation.y = Math.PI;      // 桥面朝北（朝河）伸出去
    town2.add(wharf);
    VIL.compactGroup(wharf);
    registerInteractive(wharf, {
      name: '河码头 · The Wharf',
      tag: '货从水上走',
      desc: '栈桥打进河里十七米，桥面比岸低半米，涨水时刚好漫不上来。桩上箍着铁环，系着等卸的平底船；码头东头一架绞盘，缆绳绕了满满一盘。',
      detail: '河运比陆运便宜得多：同样一车货，走水路的花费大约是走陆路的三分之一。所以中世纪的大宗货物——粮、木、石、酒——都优先走河。',
      view: { pos: [10, 15, 398], target: [16, 2, 420] },
    });
  }

  // 鱼市：码头东边，敞开朝南
  {
    const fishMkt = TOWN2.makeFishMarket(TM);
    fishMkt.position.set(-5, 0, -38);
    town2.add(fishMkt);
    VIL.compactGroup(fishMkt);
    registerInteractive(fishMkt, {
      name: '鱼市 · Fish Market',
      tag: '天亮前就散场',
      desc: '一间敞开的木棚，两张长案上码着今早刚起网的鱼，案子底下是接血的木盆。后墙挂着一张晾干的渔网。鱼市开得最早——天不亮就开秤，日头一高就收摊。',
      detail: '鱼是唯一不进集市、而是单独成市的食物：它放不住。教会规定一年里有小半年是斋期，那段时间鱼价能翻两三倍，鱼市的地位也就跟着水涨船高。',
      view: { pos: [30, 12, 406], target: [31, 2, 424] },
    });
  }

  // 货栈
  {
    const wh = TOWN2.makeRiversideWarehouse(TM);
    wh.position.set(10, 0, -38);
    wh.rotation.y = Math.PI;       // 卸货门与吊臂朝着河面
    town2.add(wh);
    VIL.compactGroup(wh);
    registerInteractive(wh, {
      name: '河畔货栈 · Riverside Warehouse',
      tag: '盐、酒与铁',
      desc: '石砌一层防潮，木构二层堆货，正面一扇离地三米的卸货门，门上方支出吊臂，用滑轮把货包直接吊进二层。门口的木箱上盖着防雨的粗麻布。',
      detail: '货栈要贴着水，却不能泡在水里：地基往往抬到历年最高水位之上，一层只放不怕潮的东西，贵重货都在楼上。',
      view: { pos: [54, 15, 404], target: [44, 4, 424] },
    });
  }

  // 老渡口
  {
    const ferry = TOWN2.makeFerryLanding(TM);
    ferry.position.set(-27, 0, -38);
    ferry.rotation.y = Math.PI * 0.92;
    town2.add(ferry);
    VIL.compactGroup(ferry);
    registerInteractive(ferry, {
      name: '老渡口 · The Old Ferry',
      tag: '桥修好了，船还在',
      desc: '一间木板小屋和一截伸进水里的栈台。桥通之后摆渡的生意少了大半，但发水时桥面漫过、或者赶车太宽的，还得靠船。栈台边常年拴着一条平底渡船。',
      detail: '渡口往往比桥更早存在，也往往比桥活得更久——桥会塌、会被冲走，渡口只要有一块滩、一条船就能重开。',
      view: { pos: [-10, 12, 402], target: [-2, 2, 424] },
    });

    // 那条平底渡船就拴在栈台边，随水起伏
    const boat = TOWN2.makeFerryBoat(TM);
    const bp = t2at(-25, -46);
    boat.position.set(bp.x, GRASS_Y - 0.5, bp.z);
    boat.rotation.y = TOWN2_POS.rot + 0.5;
    scene.add(boat);
    riverBoats.push({
      mesh: boat,
      baseY: GRASS_Y - 0.5,
      phase: Math.random() * 6,
    });
  }

  // 河畔水磨：水轮朝河
  {
    const rmill = TOWN2.makeRiverMill(TM);
    rmill.position.set(20, 0, -38);
    rmill.rotation.y = -Math.PI / 2;   // 水轮转到北侧（临河）
    town2.add(rmill);
    const wheel = rmill.userData.wheel;
    VIL.compactGroup(rmill);
    if (wheel) waterWheels.push({ wheel, speed: 0.9 });
    registerInteractive(rmill, {
      name: '河畔水磨 · Fordham Mill',
      tag: '全镇吃的面',
      desc: '石砌方屋，北侧挂一具两米三的水轮，下半浸在河里。上游一道引水闸把水拢进轮槽，水从轮下走过，推着轮子转。磨坊主是镇上少数不用交磨面税的人。',
      detail: '领主垄断磨坊（mill-suit）是常态：领地上的农户必须把谷子送到领主的磨坊，还要留下大约十六分之一的面粉作磨费。',
      view: { pos: [72, 14, 400], target: [62, 4, 424] },
    });
  }

  // 河边石阶：洗衣与取水
  {
    const steps = TOWN2.makeRiverSteps(TM, { w: 6, steps: 7 });
    steps.position.set(0, 0, -43);
    town2.add(steps);
    VIL.compactGroup(steps);
    registerInteractive(steps, {
      name: '河边石阶 · River Steps',
      tag: '洗衣与取水',
      desc: '七级石阶从镇子下到水边，两侧压着矮墙。最下面一块大石是洗衣石，被拍打得凹下去一个坑。每天清早这里最热闹：洗衣的、打水的、洗菜的挤成一排。',
      detail: '河边的石阶是镇上女人唯一不受管束的公共空间。洗衣时交换消息，效果不亚于酒馆。',
      view: { pos: [38, 10, 396], target: [34, 1, 418] },
    });
  }

  // 镇上的零碎
  const clutter2 = new THREE.Group();
  for (const [x, z, r] of [[-13.5, 11.5, 0.4], [13.0, -11.0, -0.6], [-24.0, 12.0, 1.2]]) {
    const c = TOWN2.makeTownClutter2(TM);
    c.position.set(x, 0, z);
    c.rotation.y = r;
    clutter2.add(c);
  }
  VIL.compactGroup(clutter2);
  town2.add(clutter2);
}

/* ---- 渡口镇的人 ---- */
{
  const p2 = (sx, sz) => t2at(sx, sz);

  // 摊主：站在摊后（本地 +Z 一侧），收摊回南排的屋子
  const STALL_X = [-9.4, -4.7, 0, 4.7, 9.4];
  const HOMES = [[-5.5, 12.6], [2.5, 12.8], [10.5, 12.6], [19.0, 9.0], [19.0, -9.0]];
  STALL_X.forEach((sx, i) => {
    const pos = p2(sx, 7.6);
    const rec = addPerson(
      POP.makePerson({
        helmet: Math.random() > 0.6 ? 'hood' : 'none',
        weapon: 'none', shield: false,
        tabard: [0x8a6a3a, 0x5e6b3a, 0x7a4630, 0x445a6e, 0x8c7a58][i],
      }),
      pos.x, GRASS_Y, pos.z, TOWN2_POS.rot
    );
    const h = p2(...HOMES[i]);
    schedule(rec, h.x, h.z, TOWN2_POS.rot + Math.PI);
  });

  // 逛集市的人：几个站着，两个沿广场来回走
  const SHOPPERS = [
    [-6.8, 4.2, false], [-1.8, 4.0, false], [3.0, 4.4, false],
    [-11.0, -2.0, true], [11.4, 1.0, true], [-2.0, -5.0, false], [5.5, -6.5, false],
  ];
  SHOPPERS.forEach(([sx, sz, walk], i) => {
    const pos = p2(sx, sz);
    const model = POP.makePerson({
      helmet: Math.random() > 0.5 ? 'hood' : 'none',
      weapon: 'none', shield: false,
      cape: Math.random() > 0.8,
      tabard: [0x5e6b3a, 0x7a4630, 0x445a6e, 0x8c7a58, 0x6b4a6e][(Math.random() * 5) | 0],
    });

    let rec;
    if (walk) {
      const a = p2(-11, sz);
      const b = p2(11, sz);
      rec = addPerson(model, a.x, GRASS_Y, a.z, Math.atan2(b.x - a.x, b.z - a.z), {
        walk: { from: [a.x, a.z], to: [b.x, b.z], speed: 0.42 },
      });
    } else {
      const face = Math.atan2(pos.x - p2(sx, 8).x, pos.z - p2(sx, 8).z);
      rec = addPerson(model, pos.x, GRASS_Y, pos.z, face);
    }
    const h = p2(-5.5 + (i % 3) * 8, 12.8);
    schedule(rec, h.x, h.z, TOWN2_POS.rot + Math.PI);
    rec.work = { x: rec.root.position.x, z: rec.root.position.z, face: rec.facingY };
  });

  // 码头上的装卸工
  {
    const pos = p2(-16, -33);
    const rec = addPerson(POP.makePerson({
      helmet: 'hood', weapon: 'none', shield: false, tabard: 0x6b5a3a,
    }), pos.x, GRASS_Y, pos.z, TOWN2_POS.rot + Math.PI);
    const h = p2(-13.0, 11.0);
    schedule(rec, h.x, h.z, TOWN2_POS.rot);
  }

  // 洗衣的女人：天亮就在石阶上
  {
    const pos = p2(1.6, -37.5);
    const rec = addPerson(POP.makePerson({
      helmet: 'hood', weapon: 'none', shield: false, tabard: 0x7a6a4a,
    }), pos.x, GRASS_Y, pos.z, TOWN2_POS.rot + Math.PI);
    rec.earlyBird = true;
    const h = p2(-2.0, 12.4);
    schedule(rec, h.x, h.z, TOWN2_POS.rot + Math.PI);
  }
}
/* ============================================================
 *  两座桥：西桥（老镇一侧）、东桥（城堡直下）
 * ========================================================== */
/**
 * 大石桥：比工匠区那座宽得多，能过一辆马车。
 *
 * 主拱是一段圆弧，桥面沿着圆弧起拱；两头各接一段斜坡落到岸上。
 * 桥身两侧是石墙，墙上除了主拱还开了两个小泄洪孔。
 * 所有尺寸都在本地坐标里：X 是桥的跨度方向，Z 是桥宽。
 */
function makeBigBridge(M, { span = 34, wide = 7.2, rise = 3.4 } = {}) {
  const g = new THREE.Group();

  // 主拱的圆：过 (-span/2, 0)、(span/2, 0)，顶在 (0, rise)
  const R = (span * span / 4 + rise * rise) / (2 * rise);
  const Y0 = rise - R;
  const th = Math.asin(span / 2 / R);

  const rampLen = span * 0.42;          // 两端引桥的水平长度
  const L = span + rampLen * 2;         // 桥面总长
  const slope = rise / rampLen;         // 引桥坡度 ≈ 1:4

  /** 桥面在本地 x 处的高度 */
  const deckAt = (x) => {
    const ax = Math.abs(x);
    if (ax <= span / 2) return Y0 + Math.sqrt(Math.max(0, R * R - x * x));
    return Math.max(0, rise - (ax - span / 2) * slope);
  };

  /* ---- 桥面：沿曲线切成一节一节的石板 ---- */
  {
    const N = 26;
    for (let i = 0; i < N; i++) {
      const x0 = -L / 2 + (i / N) * L;
      const x1 = -L / 2 + ((i + 1) / N) * L;
      const xm = (x0 + x1) / 2;
      const y0 = deckAt(x0), y1 = deckAt(x1);
      const len = Math.hypot(x1 - x0, y1 - y0) + 0.06;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const seg = box(len, 0.32, wide, i % 2 ? M.stoneLight : M.stone);
      seg.position.set(xm, (y0 + y1) / 2, 0);
      seg.rotation.z = ang;
      g.add(seg);
    }
  }

  /* ---- 两侧石墙：挖出主拱与两个泄洪孔 ---- */
  {
    const wallT = 0.7;
    const halfW = span / 2 + 3.2;       // 墙体比拱脚各宽出一点，当作桥台
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, -3.0);
    // 沿桥面曲线走过来
    const S = 24;
    for (let i = 0; i <= S; i++) {
      const x = -halfW + (i / S) * halfW * 2;
      shape.lineTo(x, deckAt(Math.max(-L / 2, Math.min(L / 2, x))) - 0.16);
    }
    shape.lineTo(halfW, -3.0);
    shape.closePath();

    // 主拱
    {
      const hole = new THREE.Path();
      hole.moveTo(-span / 2, -3.0);
      hole.lineTo(-span / 2, 0);
      hole.absarc(0, Y0, R, Math.PI / 2 + th, Math.PI / 2 - th, true);
      hole.lineTo(span / 2, 0);
      hole.lineTo(span / 2, -3.0);
      hole.closePath();
      shape.holes.push(hole);
    }
    // 两个泄洪小孔：落在桥台之内
    for (const sx of [-1, 1]) {
      const r2 = span * 0.11;
      const cx = sx * (span / 2 + 1.55);
      const hole = new THREE.Path();
      hole.moveTo(cx - r2, -3.0);
      hole.lineTo(cx - r2, -1.1);
      hole.absarc(cx, -1.1, r2, Math.PI, 0, true);
      hole.lineTo(cx + r2, -3.0);
      hole.closePath();
      shape.holes.push(hole);
    }

    for (const sz of [-1, 1]) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: wallT, bevelEnabled: false, curveSegments: 24,
      });
      geo.translate(0, 0, -wallT / 2);
      const wall = new THREE.Mesh(geo, M.stoneStrong);
      wall.position.z = sz * (wide / 2 - wallT / 2);
      wall.castShadow = true;
      wall.receiveShadow = true;
      g.add(wall);
    }

    // 主拱的券石圈
    for (const sz of [-1, 1]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(R, R + 0.45, 34, 1, Math.PI / 2 - th, th * 2), M.stoneLight
      );
      ring.position.set(0, Y0, sz * (wide / 2 + 0.02));
      if (sz < 0) ring.rotation.y = Math.PI;
      ring.castShadow = true;
      g.add(ring);
    }
  }

  /* ---- 栏板与望柱 ---- */
  {
    const N = 9;
    for (const sz of [-1, 1]) {
      const zEdge = sz * (wide / 2 - 0.16);
      for (let i = 0; i < N; i++) {
        const x0 = -L / 2 + (i / N) * L;
        const x1 = -L / 2 + ((i + 1) / N) * L;
        const y0 = deckAt(x0), y1 = deckAt(x1);
        const len = Math.hypot(x1 - x0, y1 - y0);
        const rail = box(len - 0.1, 0.55, 0.22, M.stoneLight);
        rail.position.set((x0 + x1) / 2, (y0 + y1) / 2 + 0.72, zEdge);
        rail.rotation.z = Math.atan2(y1 - y0, x1 - x0);
        g.add(rail);
      }
      // 望柱：每隔一段一根，柱头压一块稍宽的石板
      for (let i = 0; i <= 6; i++) {
        const x = -L / 2 + (i / 6) * L;
        const y = deckAt(x);
        const post = box(0.42, 0.98, 0.5, M.stoneStrong);
        post.position.set(x, y + 0.66, zEdge);
        g.add(post);
        const cap = box(0.52, 0.14, 0.6, M.stoneLight);
        cap.position.set(x, y + 1.2, zEdge);
        g.add(cap);
      }
    }
  }

  g.userData.deckY = rise;
  g.userData.length = L;
  return g;
}

/* ---- 西桥：老镇出来往南，过河到渡口镇 ---- */
const BRIDGE_W_POS = { x: -30, z: 408 };
const BRIDGES = {};
let bridgeW = null;
let bridgeE = null;
{
  const b = makeBigBridge(TM, { span: 36, wide: 7.4, rise: 3.4 });
  b.position.set(BRIDGE_W_POS.x, GRASS_Y, BRIDGE_W_POS.z);
  // 河在这一段大致东西向，桥面（沿本地 X）要转到南北向才横得过去
  b.rotation.y = -1.431;
  scene.add(b);
  BRIDGES.w = b;
  bridgeW = b;
  registerInteractive(b, {
    name: '西桥 · West Bridge',
    tag: '三孔大石桥',
    desc: '跨河的三孔石桥，中间一孔最宽，两侧各一孔泄洪。桥面拱起近四米，这样可以少建桥墩、让洪水从桥下过。栏板上的望柱一共十六根，柱头都被摸得发亮。',
    detail: '中世纪的桥是烂泥路上少有的硬路面，也是收税点与集会地。修桥靠"桥税"与捐赎——富人出钱修一段，换得死后在桥上立一块小碑、由过路人代为祈祷。',
    view: { pos: [-30, 22, 452], target: [-30, 4, 408] },
  });
}

/* ---- 东桥：城堡方向直下，过河到渡口镇东 ---- */
const BRIDGE_E_POS = { x: 200, z: 376 };
{
  const b = makeBigBridge(TM, { span: 34, wide: 7.0, rise: 3.2 });
  b.position.set(BRIDGE_E_POS.x, GRASS_Y, BRIDGE_E_POS.z);
  b.rotation.y = -1.416;
  scene.add(b);
  BRIDGES.e = b;
  bridgeE = b;
  registerInteractive(b, {
    name: '东桥 · East Bridge',
    tag: '商队走的那座',
    desc: '比西桥小一号的两孔半石桥，桥面更平——商队的大车宁愿多绕两里，也不愿意把货翻在陡坡上。桥头各有一座石墩，上面刻着修桥那年的年号。',
    detail: '桥面坡度是按车轮定的：四轮大车能爬的坡大约 1:8，太陡就得靠人推。宽桥面还要留出会车的余地。',
    view: { pos: [200, 20, 418], target: [200, 4, 374] },
  });
}

/* ---- 连接两座桥的路 ---- */
{
  // 老镇 → 西桥北引桥（一直在河的北岸，不涉水）
  addRoad([[-96, 210], [-88, 258], [-76, 310], [-62, 344], [-48, 366], [-37, 374]], 4.2);
  // 西桥南引桥 → 渡口镇门
  addRoad([[-24, 444], [-14, 450], [-2, 455], [7, 460]], 4.2);
  // 城堡东门 → 东桥北引桥
  addRoad([[70, 150], [92, 190], [116, 232], [140, 270], [162, 300], [182, 326], [193, 342]], 4.0);
  // 东桥南引桥 → 绕过镇南 → 镇门（与西桥那条路在门口会合）
  addRoad([[204, 410], [206, 442], [200, 472], [186, 496], [158, 512], [124, 522],
           [90, 524], [60, 516], [36, 502], [16, 486], [7, 466]], 4.0);

  // 北岸：城堡东门 → 镜湖畔 → 瀑布脚下
  addRoad([[70, 150], [96, 166], [128, 180], [166, 192], [206, 200], [244, 204], [282, 206]], 3.6);
  // 瀑布 → 湖
  addRoad([[400, 176], [382, 186], [362, 196], [348, 202]], 2.8);
}

/* ---- 十五处外围场景的土路：每条都从母场景或邻景伸过去 ----
 * 三条从母场景伸出去的路都绕过院墙（从院门出去、贴着外墙走），
 * 其余的在外围场景之间接驳。坐标做过穿模校验，不压建筑。 */

// 修道院院门 → 绕院墙西侧 → 圣泉 → 谷仓 / 济贫院 → 石匠场 / 隐士居
addRoad([[-69.4, -26.0], [-84, -8], [-106, 2], [-128, 2], [-146, -12],
  [-154, -38], [-154, -70], [-148, -92], [-142, -104]], 2.8);
addRoad([[-152, -100], [-170, -108], [-188, -116], [-206, -122]], 2.8);
addRoad([[-144, -116], [-146, -138], [-148, -160], [-148, -178]], 2.8);
addRoad([[-160, -180], [-184, -178], [-208, -174], [-230, -170], [-246, -166]], 2.8);
addRoad([[-134, -180], [-118, -182], [-104, -184], [-96, -186]], 2.8);

// 比武场门楼 → 绕东侧南下 → 校场 → 马市 → 集市 → 甲胄匠 / 伤兵帐
addRoad([[61.9, -100.0], [80, -106], [88, -128], [88, -154], [80, -170], [64, -178]], 3.0);
addRoad([[78, -172], [94, -166], [110, -162], [122, -160]], 2.8);
addRoad([[126, -172], [126, -196], [120, -216], [110, -232]], 2.8);
addRoad([[122, -228], [144, -218], [164, -204], [180, -196]], 2.8);
addRoad([[98, -226], [72, -223], [46, -220], [20, -218]], 2.8);

// 客栈 → 渡口 / 神龛 → 篝火营地 / 货栈 → 荒村
addRoad([[-150, 24], [-168, 30], [-186, 36], [-198, 40]], 3.0);
addRoad([[-152, 30], [-164, 52], [-174, 76], [-182, 96], [-190, 110]], 3.0);
addRoad([[-202, 108], [-218, 103], [-232, 99], [-246, 96]], 2.8);
addRoad([[-190, 122], [-190, 142], [-188, 158], [-186, 168]], 2.8);
addRoad([[-198, 172], [-214, 178], [-228, 182], [-238, 186]], 2.8);

/* ---- 第二圈的土路：从第一圈的尽头再往外接 ----
 * 每条路的两端各有十米左右伸进场景占地，算接驳段；
 * 中段都做过矩形穿模校验，不压任何一幢建筑。 */

// 修道院方向
addRoad([[-300, -196], [-290, -214], [-282, -226], [-272, -238]], 2.7);   // 墓地 → 磨坊
addRoad([[-356, -196], [-340, -188], [-322, -178], [-314, -172]], 2.6);   // 羊圈 → 墓地
addRoad([[-262, -92], [-240, -104], [-210, -112], [-170, -108]], 2.8);    // 蜂场 → 圣泉
addRoad([[-132, -256], [-120, -238], [-108, -214], [-98, -196]], 2.6);    // 小教堂 → 隐士居
addRoad([[-292, -182], [-280, -186], [-266, -180], [-254, -172]], 2.5);   // 墓地 → 石匠场

// 比武场方向
addRoad([[228, -214], [208, -196], [188, -184], [160, -172], [140, -164]], 2.9);  // 牧马场 → 马市
addRoad([[48, -272], [50, -252], [54, -232], [58, -212], [62, -196]], 2.8);        // 箭术场 → 校场
addRoad([[256, -176], [222, -196], [188, -222], [152, -248], [112, -268], [80, -280]], 2.7); // 木料场 → 箭术场
addRoad([[300, -236], [288, -238], [272, -242], [258, -244], [246, -240]], 2.5);  // 马具匠 → 牧马场
addRoad([[206, -300], [232, -290], [262, -278], [288, -262], [302, -252]], 2.6);  // 老骑士宅 → 马具匠

// 客栈方向
addRoad([[-296, 44], [-290, 30], [-282, 18], [-262, 8], [-232, 12], [-214, 26], [-208, 38]], 2.9); // 关卡 → 渡口
addRoad([[-340, 132], [-318, 124], [-292, 116], [-268, 108], [-256, 100]], 2.7);  // 瞭望塔 → 营地
addRoad([[-286, 248], [-270, 238], [-248, 228], [-222, 214], [-200, 196], [-190, 182]], 2.8); // 病舍 → 货栈
addRoad([[-352, 244], [-336, 252], [-320, 260], [-302, 264]], 2.6);               // 水磨 → 病舍
addRoad([[-186, 246], [-196, 234], [-206, 220], [-212, 204], [-206, 190], [-194, 178]], 2.6); // 绞架 → 货栈

/* ---- 外围场景的人：天黑各自进屋 ---- */
{
  const C = GRASS_Y;
  const make = (col, opt = {}) => POP.makePerson({
    weapon: 'none', shield: false, tabard: col, ...opt,
  });
  const hood = (col) => make(col, { helmet: 'hood' });

  /** 往场景里放一个人，并给他一个"进屋"的家 */
  const put = (pad, home, at, facing, model, walk = null) => {
    const a = pad(at[0], at[1]);
    const h = pad(home[0], home[1]);
    const rec = addPerson(model, a.x, C, a.z, facing, walk ? { walk } : 'idle');
    return schedule(rec, h.x, h.z, facing);
  };

  // 圣泉：一个朝圣者在池边，一个修士守着壁龛
  {
    const p = onPad(HOLY_WELL.x, HOLY_WELL.z, HOLY_WELL.rot);
    put(p, [-1.2, -2.4], [1.8, 4.2], HOLY_WELL.rot + 2.5, hood(0x6b5a3a));
    put(p, [-1.2, -2.4], [-0.4, 1.6], HOLY_WELL.rot + Math.PI, make(0x2f2a24, { helmet: 'hood' }));
  }
  // 什一税谷仓：门口搬粮的两个农夫
  {
    const p = onPad(TITHE_BARN.x, TITHE_BARN.z, TITHE_BARN.rot);
    put(p, [-2, 1.0], [-3.2, 6.4], TITHE_BARN.rot + Math.PI, make(0x7a4630));
    put(p, [-2, 1.0], [-0.6, 6.8], TITHE_BARN.rot + 2.6, hood(0x5e6b3a),
      { from: [p(-0.6, 6.8).x, p(-0.6, 6.8).z], to: [p(3.4, 8.4).x, p(3.4, 8.4).z], speed: 0.35 });
  }
  // 济贫院：施粥的修士与两个等着的人
  {
    const p = onPad(ALMSHOUSE.x, ALMSHOUSE.z, ALMSHOUSE.rot);
    put(p, [0.6, 0.4], [2.4, 4.4], ALMSHOUSE.rot + 2.2, make(0x2f2a24, { helmet: 'hood' }));
    put(p, [0.6, 0.4], [0.8, 5.6], ALMSHOUSE.rot + Math.PI, hood(0x6b6055));
    put(p, [0.6, 0.4], [-1.0, 5.2], ALMSHOUSE.rot + 2.8, make(0x5a4a3a));
  }
  // 石匠场：坑里凿石的、工作台上画线的
  {
    const p = onPad(MASONS_LODGE.x, MASONS_LODGE.z, MASONS_LODGE.rot);
    put(p, [6.4, 1.6], [-2.4, 1.4], MASONS_LODGE.rot + 0.9, make(0x8c7a58));
    put(p, [6.4, 1.6], [5.2, 2.2], MASONS_LODGE.rot - 1.4, hood(0x6b5a3a));
  }
  // 隐士居：菜地里的一位
  {
    const p = onPad(HERMITAGE.x, HERMITAGE.z, HERMITAGE.rot);
    put(p, [-1.6, 0.6], [-1.4, 4.0], HERMITAGE.rot + Math.PI, make(0x3d362c, { helmet: 'hood' }));
  }
  // 校场：刺木桩的侍从、射箭的
  {
    const p = onPad(TRAINING_YARD.x, TRAINING_YARD.z, TRAINING_YARD.rot);
    put(p, [-12, 6.5], [-9.6, -5.4], TRAINING_YARD.rot - 1.5,
      make(0x2c4f86, { helmet: 'kettle', weapon: 'spear', shield: true }));
    put(p, [-12, 6.5], [9.0, 1.2], TRAINING_YARD.rot - 1.5,
      make(0x6b4a2c, { helmet: 'kettle', weapon: 'bow' }));
  }
  // 马市：拍卖台上喊价的、牵马给人看的
  {
    const p = onPad(HORSE_FAIR.x, HORSE_FAIR.z, HORSE_FAIR.rot);
    put(p, [-6, -4], [-6.0, -1.6], HORSE_FAIR.rot, make(0x7a3f2a, { helmet: 'hood' }));
    put(p, [9, -6], [-2.0, 4.6], HORSE_FAIR.rot + 1.2, make(0x445a6e, { helmet: 'hood' }));
  }
  // 场外集市：两个摊主与一个挑货的客人
  {
    const p = onPad(TOURNEY_FAIR.x, TOURNEY_FAIR.z, TOURNEY_FAIR.rot);
    put(p, [-13, -2], [-12.6, 1.4], TOURNEY_FAIR.rot, make(0x8a6a3a));
    put(p, [-13, -2], [-2.4, 1.4], TOURNEY_FAIR.rot, make(0x5e6b3a, { helmet: 'hood' }));
    put(p, [-13, -2], [2.0, 2.6], TOURNEY_FAIR.rot + 1.9, make(0x6b4a5a));
  }
  // 甲胄匠：帐里敲铁的，帐外试甲的
  {
    const p = onPad(ARMORER_CAMP.x, ARMORER_CAMP.z, ARMORER_CAMP.rot);
    put(p, [0, -1.4], [1.6, -1.2], ARMORER_CAMP.rot + Math.PI, make(0x3a3a40, { helmet: 'hood' }));
    put(p, [0, -1.4], [-3.4, 4.2], ARMORER_CAMP.rot + 2.2,
      make(0x9e2f2c, { helmet: 'great', weapon: 'none' }));
  }
  // 伤兵帐：外科医生与两个坐起来的伤员
  {
    const p = onPad(SURGEON_TENT.x, SURGEON_TENT.z, SURGEON_TENT.rot);
    put(p, [0, -1.2], [1.4, -0.4], SURGEON_TENT.rot + Math.PI, make(0x4a4a52, { helmet: 'hood' }));
    put(p, [0, -1.2], [-2.6, 2.6], SURGEON_TENT.rot + 0.4, make(0x6b6055));
    put(p, [0, -1.2], [-4.0, 1.4], SURGEON_TENT.rot + 0.9, make(0x5a4a3a));
  }
  // 渡口：撑船的船夫、等着过河的旅人
  {
    const p = onPad(FERRY.x, FERRY.z, FERRY.rot);
    put(p, [-15, -2], [-5.0, 3.4], FERRY.rot + 1.6, make(0x445a6e, { helmet: 'hood' }));
    put(p, [-15, -2], [-9.8, 0.4], FERRY.rot + 1.2, make(0x8c7a58));
  }
  // 路边神龛：一个还愿的旅人
  {
    const p = onPad(SHRINE.x, SHRINE.z, SHRINE.rot);
    put(p, [0, -2], [0.4, 2.6], SHRINE.rot + Math.PI, hood(0x6b5a3a));
  }
  // 篝火营地：围火坐着的两位
  {
    const p = onPad(CAMPFIRE.x, CAMPFIRE.z, CAMPFIRE.rot);
    put(p, [-6, 2.6], [1.2, 2.8], CAMPFIRE.rot + Math.PI, make(0x7a4630));
    put(p, [3.6, -6], [-1.6, 2.4], CAMPFIRE.rot + 2.6, hood(0x445a6e));
  }
  // 货栈：月台上搬桶的两个伙计
  {
    const p = onPad(WAYSTATION.x, WAYSTATION.z, WAYSTATION.rot);
    put(p, [0, -1], [-3.0, 8.4], WAYSTATION.rot + 0.8, make(0x8a6a3a, { helmet: 'hood' }));
    put(p, [0, -1], [4.2, 7.6], WAYSTATION.rot - 0.9, make(0x5e6b3a));
  }
  // 荒村不留人——没人回来的地方

  /* ---------------- 第二圈 ---------------- */
  // 墓地：一个掘墓的、一个来上坟的
  {
    const p = onPad(GRAVEYARD2.x, GRAVEYARD2.z, GRAVEYARD2.rot);
    put(p, [-2.4, -3.0], [1.6, 2.4], GRAVEYARD2.rot + Math.PI, make(0x4a4438, { helmet: 'hood' }));
    put(p, [3.0, 4.6], [-3.4, -1.2], GRAVEYARD2.rot + 0.3, hood(0x6b5a3a));
  }
  // 磨坊：磨坊主在门口，伙计在木槽下
  {
    const p = onPad(ABBEY_MILL.x, ABBEY_MILL.z, ABBEY_MILL.rot);
    put(p, [4.6, 3.8], [4.6, 5.6], ABBEY_MILL.rot, make(0x8a6a3a, { helmet: 'hood' }));
    put(p, [1.0, -2.0], [-1.2, -3.4], ABBEY_MILL.rot + 1.4, make(0x5e6b3a));
  }
  // 羊圈：剪毛的、赶羊的
  {
    const p = onPad(SHEEPFOLD.x, SHEEPFOLD.z, SHEEPFOLD.rot);
    put(p, [0, -2], [-12.5, -7.0], SHEEPFOLD.rot - 0.6, make(0x7a4630));
    put(p, [0, -2], [-6.0, 4.0], SHEEPFOLD.rot + 2.0, hood(0x8c7a58),
      { from: [p(-6.0, 4.0).x, p(-6.0, 4.0).z], to: [p(6.0, 2.0).x, p(6.0, 2.0).z], speed: 0.3 });
  }
  // 蜂场：看蜂的一位
  {
    const p = onPad(APIARY.x, APIARY.z, APIARY.rot);
    put(p, [-10.4, 1.0], [-2.2, 1.2], APIARY.rot + Math.PI, hood(0x6b6055));
  }
  // 废弃小教堂：只有一个来避雨的人
  {
    const p = onPad(RUIN_CHAPEL.x, RUIN_CHAPEL.z, RUIN_CHAPEL.rot);
    put(p, [-3.2, 3.0], [-3.0, 2.4], RUIN_CHAPEL.rot + 2.6, hood(0x445a6e));
  }
  // 牧马场：看马的、牵马的
  {
    const p = onPad(HORSE_PASTURE.x, HORSE_PASTURE.z, HORSE_PASTURE.rot);
    put(p, [12, -8], [-6.0, 2.0], HORSE_PASTURE.rot + 1.2, make(0x6b4a2c, { helmet: 'hood' }));
    put(p, [12, -8], [9.0, -5.0], HORSE_PASTURE.rot - 1.6, make(0x445a6e));
  }
  // 箭术场：射箭的两个
  {
    const p = onPad(ARCHERY.x, ARCHERY.z, ARCHERY.rot);
    put(p, [-12, 2], [-14.0, 1.4], ARCHERY.rot - Math.PI / 2, make(0x2c4f86, { helmet: 'kettle', weapon: 'bow' }));
    put(p, [-12, 2], [-11.0, -1.8], ARCHERY.rot - Math.PI / 2, make(0x6b4a2c, { weapon: 'bow' }));
  }
  // 木料场：锯木的、搬料的
  {
    const p = onPad(TIMBER_YARD.x, TIMBER_YARD.z, TIMBER_YARD.rot);
    put(p, [0, -4], [1.0, 1.2], TIMBER_YARD.rot + Math.PI, make(0x7a4630, { helmet: 'hood' }));
    put(p, [4, -5], [-6.0, 3.4], TIMBER_YARD.rot + 1.8, make(0x8c7a58));
  }
  // 马具匠：在案子前干活的一位
  {
    const p = onPad(SADDLERY.x, SADDLERY.z, SADDLERY.rot);
    put(p, [0, -2], [-2.0, 1.4], SADDLERY.rot + Math.PI, hood(0x6b4a2c));
  }
  // 老骑士宅：主人与马夫
  {
    const p = onPad(KNIGHT_MANOR.x, KNIGHT_MANOR.z, KNIGHT_MANOR.rot);
    put(p, [0, 2], [-3.6, 6.0], KNIGHT_MANOR.rot + 2.4, make(0x6b2f34, { helmet: 'none' }));
    put(p, [1, 6], [-4.1, 7.4], KNIGHT_MANOR.rot + 0.6, make(0x5e6b3a, { helmet: 'hood' }));
  }
  // 关卡：收税官站在杆子边
  {
    const p = onPad(TOLL_GATE.x, TOLL_GATE.z, TOLL_GATE.rot);
    put(p, [-5.2, -1.0], [-4.4, 2.0], TOLL_GATE.rot + Math.PI, make(0x3a3a44, { helmet: 'hood' }));
  }
  // 瞭望塔：塔上的哨兵、塔下的换班
  {
    const p = onPad(WATCHTOWER.x, WATCHTOWER.z, WATCHTOWER.rot);
    put(p, [0, -6], [3.2, 2.0], WATCHTOWER.rot + 0.8, make(0x2c4f86, { helmet: 'kettle', weapon: 'spear' }));
  }
  // 病舍：看护的修女与两个病人
  {
    const p = onPad(HOSPITAL.x, HOSPITAL.z, HOSPITAL.rot);
    put(p, [0, -2], [-4.4, 2.0], HOSPITAL.rot - Math.PI / 2, make(0xb8b0a0, { helmet: 'hood' }));
    put(p, [0, -2], [-4.6, -3.0], HOSPITAL.rot - Math.PI / 2, make(0x6b6055));
    put(p, [3, 3], [7.2, 2.6], HOSPITAL.rot + 2.2, make(0x5a4a3a));
  }
  // 水磨人家：磨坊主与妻子
  {
    const p = onPad(MILLER_COTTAGE.x, MILLER_COTTAGE.z, MILLER_COTTAGE.rot);
    put(p, [-8.0, 15.0], [-4.6, 9.0], MILLER_COTTAGE.rot + Math.PI, make(0x7a4630, { helmet: 'hood' }));
    put(p, [-8.0, 15.0], [-1.4, 8.2], MILLER_COTTAGE.rot + 2.6, make(0x5e6b3a, { helmet: 'hood' }));
  }
  // 绞架：看守人，站得远远的
  {
    const p = onPad(GALLOW.x, GALLOW.z, GALLOW.rot);
    put(p, [-6.4, -1.0], [-5.0, 1.6], GALLOW.rot + 1.2, make(0x2e2a26, { helmet: 'hood' }));
  }
}

  return { riverBoats, FALLS, WILDLIFE, town2, town2Plaza, town2Houses, bridgeW, bridgeE };
}
