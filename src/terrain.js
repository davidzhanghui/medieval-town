import * as THREE from 'three';
import { WORLD_R, expansionClearZones, seaDepth } from './world.js';
import * as KIT from './kit.js';

/* 草地、护城河、禁种区和远景。内层的 buildTerrain 是原来的地面函数。 */
export function buildGround({ scene, stoneTx, grassMap, waterTx, cloudTx, scaled }) {
/* ============================================================
 *  地面 / 护城河 / 远景
 * ========================================================== */

/* 村落与要塞占用的地块：长树时要避开，否则会插进农田和房子 */
const CLEAR_ZONES = [
  { x: -26, z: 104, r: 40 },
  { x: -88, z: -52, r: 58 },  // 西北的修道院（院墙 80×64）
  { x: 28, z: -112, r: 58 },  // 东北的比武场（跑道 54 米）
  { x: -132, z: 18, r: 40 },  // 西边的朝圣客栈

  // ---- 十五处外围场景：各自向外延伸的一链 ----
  { x: -142, z: -104, r: 20 },  // 修道院·圣泉
  { x: -206, z: -122, r: 20 },  // 修道院·什一税谷仓
  { x: -148, z: -178, r: 19 },  // 修道院·济贫院
  { x: -246, z: -166, r: 22 },  // 修道院·石匠场
  { x: -96, z: -186, r: 23 },   // 修道院·隐士居

  { x: 64, z: -178, r: 21 },    // 比武场·校场
  { x: 122, z: -160, r: 21 },   // 比武场·马市
  { x: 110, z: -232, r: 24 },   // 比武场·场外集市
  { x: 180, z: -196, r: 16 },   // 比武场·甲胄匠
  { x: 20, z: -218, r: 17 },    // 比武场·伤兵帐

  { x: -206, z: 42, r: 24 },    // 客栈·渡口
  { x: -190, z: 110, r: 13 },   // 客栈·路边神龛
  { x: -246, z: 96, r: 16 },    // 客栈·篝火营地
  { x: -186, z: 168, r: 19 },   // 客栈·货栈
  { x: -238, z: 186, r: 25 },   // 客栈·荒村

  // ---- 第二圈：再向外一倍 ----
  { x: -300, z: -170, r: 20 },  // 修道院·朝圣者墓地
  { x: -268, z: -244, r: 18 },  // 修道院·修道院磨坊
  { x: -372, z: -206, r: 22 },  // 修道院·羊圈
  { x: -268, z: -84, r: 16 },   // 修道院·蜂场
  { x: -128, z: -268, r: 15 },  // 修道院·废弃小教堂

  { x: 236, z: -232, r: 28 },   // 比武场·牧马场
  { x: 52, z: -286, r: 24 },    // 比武场·箭术场
  { x: 268, z: -166, r: 19 },   // 比武场·木料场
  { x: 306, z: -246, r: 12 },   // 比武场·马具匠
  { x: 198, z: -310, r: 17 },   // 比武场·老骑士宅

  { x: -300, z: 60, r: 22 },    // 客栈·收税关卡
  { x: -352, z: 140, r: 12 },   // 客栈·瞭望塔
  { x: -286, z: 262, r: 14 },   // 客栈·朝圣者病舍
  { x: -366, z: 236, r: 19 },   // 客栈·水磨人家
  { x: -176, z: 258, r: 12 },   // 客栈·绞架
  { x: 28, z: 100, r: 26 },
  { x: 8, z: 146, r: 26 },
  { x: -66, z: 142, r: 26 },
  { x: 34, z: 178, r: 40 },   // 要塞（含门前空地）
  { x: 51, z: 149, r: 15 },   // 东坡那块田，别让树长进去
  { x: -6, z: 76, r: 18 },
  { x: -118, z: 132, r: 52 }, // 镇中心（含教堂与墓地）
  { x: -96, z: 160, r: 22 },  // 镇南的支巷
  { x: 96, z: 22, r: 50 },    // 东侧工匠区（含水磨、作坊、晒场）
  { x: 76, z: -34, r: 26 },   // 风车
  { x: 110, z: -8, r: 26 },   // 采石场
  { x: 78, z: 48, r: 20 },    // 伐木场

  // ---- 河东的新地界：渡口镇、湖、瀑布与山 ----
  { x: 330, z: 205, r: 40 },    // 镜湖
  { x: 400, z: 150, r: 26 },    // 瀑布与落水潭
  { x: 470, z: 70, r: 100 },    // 北山（瀑布挂在它的南坡）
  { x: 570, z: -50, r: 115 },   // 最高的那座
  { x: 440, z: -210, r: 90 },   // 东北山
  { x: 600, z: 130, r: 100 },   // 东边的山
  { x: 480, z: -300, r: 85 },   // 更北的一座
  { x: 150, z: 320, r: 30 },    // 河湾的花甸
  { x: -30, z: 408, r: 26 },    // 西桥
  { x: 200, z: 374, r: 26 },    // 东桥
  { x: 34, z: 476, r: 76 },     // 渡口镇（河东南岸）

  // ---- 外环十镇与连接它们的主干道 ----
  ...expansionClearZones(),
];

/* ---------- 大河：河心线与各处水面宽度（渡口镇也靠它定位） ---------- */
const RIVER_PTS = [
  [680, 276], [600, 296], [520, 318], [430, 336], [340, 352], [250, 368],
  [160, 382], [70, 394], [-30, 408], [-140, 424], [-250, 442], [-360, 464],
  [-470, 488], [-580, 512], [-660, 528],
  // 世界扩到 r=2000 之后，河不能在旧地图边缘戛然而止：继续向西，一直流出草地
  [-780, 548], [-940, 566], [-1140, 596], [-1380, 640], [-1650, 704], [-1960, 786],
  // 世界再扩到 r=3300：河继续向西流出草地
  [-2300, 880], [-2700, 980], [-3100, 1080], [-3380, 1160],
];
// 越往下游越宽：上游 22 米，到镇前 30 米，出图处 38 米，西去更宽
const RIVER_W = [22, 24, 26, 28, 29, 30, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58];

/** 到河心的最近距离；用来把树、石头挡在岸上 */
function riverDist(x, z) {
  let best = Infinity;
  for (let i = 0; i < RIVER_PTS.length - 1; i++) {
    const [ax, az] = RIVER_PTS[i];
    const [bx, bz] = RIVER_PTS[i + 1];
    const dx = bx - ax, dz = bz - az;
    const L2 = dx * dx + dz * dz;
    let t = ((x - ax) * dx + (z - az) * dz) / L2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t, pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz) - (RIVER_W[i] + (RIVER_W[i + 1] - RIVER_W[i]) * t) / 2;
    if (d < best) best = d;
  }
  return best;
}

function inClearZone(x, z, pad = 0) {
  // 海里与海岸线 14 米内不长树
  if (seaDepth(x, z) > -14 - pad) return true;
  // 河里不长树：离水边五米以内都算河里
  if (riverDist(x, z) < 5 + pad) return true;
  for (const c of CLEAR_ZONES) {
    if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + pad) ** 2) return true;
  }
  return false;
}

function buildTerrain() {
  // 草地
  const ground = new THREE.Mesh(
    // 外环十镇最远到 r≈1700，草地铺到 WORLD_R（2000）
    new THREE.CircleGeometry(WORLD_R, 160),
    // 贴图按半径等比放大，草叶的疏密跟原来一样（900 → 1.96，所以 WORLD_R 要乘 1.96 / 900）
    new THREE.MeshStandardMaterial({ map: scaled(grassMap, WORLD_R * 1.96 / 900, WORLD_R * 1.96 / 900), roughness: 1, color: 0xc6d0b4 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.2;
  ground.receiveShadow = true;
  scene.add(ground);

  // 城堡所在的高台
  const plateau = new THREE.Mesh(
    new THREE.CylinderGeometry(41, 45, 3.6, 48),
    new THREE.MeshStandardMaterial({
      map: scaled(stoneTx.map, 9, 3),
      bumpMap: scaled(stoneTx.bump, 9, 3),
      bumpScale: 0.3,
      roughness: 1,
      color: 0x9a9384,
    })
  );
  plateau.position.y = -1.8;
  plateau.receiveShadow = true;
  plateau.castShadow = true;
  scene.add(plateau);

  // 高台顶草地
  const top = new THREE.Mesh(
    new THREE.CircleGeometry(41, 48),
    new THREE.MeshStandardMaterial({ map: scaled(grassMap, 8, 8), roughness: 1, color: 0xb9c4a2 })
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.02;
  top.receiveShadow = true;
  scene.add(top);

  // 护城河
  const water = new THREE.Mesh(
    new THREE.RingGeometry(45, 58, 64, 1),
    new THREE.MeshStandardMaterial({
      color: 0x3f7f92,
      map: waterTx.map,
      bumpMap: waterTx.bump,
      bumpScale: 0.5,
      roughness: 0.22,
      metalness: 0.18,
      transparent: true,
      opacity: 0.95,
    })
  );
  water.material.envMapIntensity = 0.18;
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.5;
  water.receiveShadow = true;
  scene.add(water);
  return water;
}
const moatWater = buildTerrain();

function buildSurroundings() {
  // 树林：近处 1100 棵老林子 + 外环 4400 棵（r 760~1900，疏密与近处相当）
  const N_INNER = 1100;
  const N_MID = 4400, N_FAR = 5200;
  const n = N_INNER + N_MID + N_FAR;
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.2, 6);
  const leafGeo = new THREE.ConeGeometry(2.4, 7.5, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x35502a, roughness: 1, flatShading: true });
  // 树冠随风轻摇（顶点着色器里按高度摆，五千多棵树没有 CPU 开销）
  KIT.windSway(leafMat, { amp: 0.22, speed: 1.25, y0: -3.75, h: 7.5 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, n);
  trunks.castShadow = leaves.castShadow = true;
  leaves.receiveShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const col = new THREE.Color();

  for (let i = 0; i < n; i++) {
    let a, r, guard = 0;
    do {
      a = Math.random() * Math.PI * 2;
      // 前密后疏：近处仍是老林子，外环按面积均匀撒开
      r = i < N_INNER
        ? 66 + Math.pow(Math.random(), 0.72) * 694
        : i < N_INNER + N_MID
          ? Math.sqrt(760 * 760 + Math.random() * (1900 * 1900 - 760 * 760))
          : Math.sqrt(1900 * 1900 + Math.random() * ((WORLD_R - 80) ** 2 - 1900 * 1900));
      guard++;
    } while (inClearZone(Math.cos(a) * r, Math.sin(a) * r, 4) && guard < 24);
    // 试了 24 次还落在禁种区里的，干脆不长（以前是硬种下去，会插进房子里）
    const blocked = inClearZone(Math.cos(a) * r, Math.sin(a) * r, 4);

    const sc = blocked ? 0.0001 : 0.7 + Math.random() * 1.5;
    p.set(Math.cos(a) * r, -2 + 1.6 * sc, Math.sin(a) * r);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI);
    s.set(sc, sc, sc);

    m.compose(p.clone().setY(p.y + 1.6 * sc), q, s);
    trunks.setMatrixAt(i, m);
    m.compose(p.clone().setY(p.y + (3.2 + 3.4) * sc), q, s);
    leaves.setMatrixAt(i, m);

    col.setHSL(0.26 + Math.random() * 0.06, 0.28 + Math.random() * 0.18, 0.19 + Math.random() * 0.1);
    leaves.setColorAt(i, col);
  }
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  scene.add(trunks, leaves);

  // 散落岩石（同样避开村镇占用的地块，别落到屋顶上）。
  // 600 块合成一个 InstancedMesh：以前是 150 个独立网格，外环扩出来之后会变成 600 次绘制
  const N_ROCKS = 900;
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x77705f, roughness: 0.95, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, N_ROCKS);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const rq = new THREE.Quaternion();
  const re = new THREE.Euler();
  for (let i = 0; i < N_ROCKS; i++) {
    let a, r, rx, rz, guard = 0;
    do {
      a = Math.random() * Math.PI * 2;
      r = i < 150 ? 62 + Math.random() * 660 : i < 600 ? Math.sqrt(760 * 760 + Math.random() * (1900 * 1900 - 760 * 760)) : Math.sqrt(1900 * 1900 + Math.random() * ((WORLD_R - 80) ** 2 - 1900 * 1900));
      rx = Math.cos(a) * r;
      rz = Math.sin(a) * r;
      guard++;
    } while (inClearZone(rx, rz, 2) && guard < 24);
    const sc = inClearZone(rx, rz, 2) ? 0.0001 : 0.7 + Math.random() * 2.4;
    re.set(Math.random(), Math.random(), Math.random());
    rq.setFromEuler(re);
    p.set(rx, -2 + sc * 0.3, rz);
    s.set(sc, sc * (0.6 + Math.random() * 0.5), sc);
    m.compose(p, rq, s);
    rocks.setMatrixAt(i, m);
  }
  rocks.instanceMatrix.needsUpdate = true;
  scene.add(rocks);

  // 远山：地平线上的那一圈剪影。近处的几座真山由 NATURE 生成，这里只负责远景
  const mtnMat = new THREE.MeshStandardMaterial({ color: 0x6b8199, roughness: 1, flatShading: true });
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2 + Math.random() * 0.25;
    // 草地铺到 WORLD_R（2000），山脚要站到草地外面
    const r = WORLD_R + 150 + Math.random() * 420;
    const h = 130 + Math.random() * 210;
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(150 + Math.random() * 130, h, 6 + ((Math.random() * 3) | 0)), mtnMat);
    mtn.position.set(Math.cos(a) * r, h / 2 - 14, Math.sin(a) * r);
    mtn.rotation.y = Math.random() * Math.PI;
    scene.add(mtn);
  }

  // 云
  const cloudMat = new THREE.SpriteMaterial({
    map: cloudTx, transparent: true, opacity: 0.75, depthWrite: false, fog: false,
    color: 0xffffff, toneMapped: false,
  });
  const clouds = [];
  for (let i = 0; i < 60; i++) {
    const sp = new THREE.Sprite(cloudMat.clone());
    const a = Math.random() * Math.PI * 2;
    const r = 150 + Math.random() * 3000;
    sp.position.set(Math.cos(a) * r, 80 + Math.random() * 90, Math.sin(a) * r);
    const sc = 90 + Math.random() * 130;
    sp.scale.set(sc, sc * 0.5, 1);
    sp.material.opacity = 0.35 + Math.random() * 0.4;
    sp.userData.baseOpacity = sp.material.opacity;
    scene.add(sp);
    clouds.push(sp);
  }
  return clouds;
}
const clouds = buildSurroundings();

  return { RIVER_PTS, RIVER_W, inClearZone, clouds };
}
