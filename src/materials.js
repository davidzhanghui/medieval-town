import * as THREE from 'three';
import * as TEX from './textures.js';

/* 程序化贴图收成城堡、村落、镇中心和自然景观共用的材质。 */
export function buildMaterials({ renderer, scene }) {
/* ============================================================
 *  纹理与材质
 * ========================================================== */
const stoneTx = TEX.stoneTextures();
const cliffTx = TEX.cliffTexture();
const roofMap = TEX.roofTextures();
const spireMap = TEX.spireTexture();
const woodMap = TEX.woodTextures();
const grassMap = TEX.grassTexture();
const waterTx = TEX.waterTextures();
const bannerRed = TEX.bannerTexture('crimson');
const bannerBlue = TEX.bannerTexture('navy');
const glowTx = TEX.glowTexture();
const cloudTx = TEX.cloudTexture();
const thatchMap = TEX.thatchTexture();
const fieldMap = TEX.fieldTexture();
const dirtMap = TEX.dirtTexture();
const cobbleMap = TEX.cobbleTexture();
const stuccoMap = TEX.stuccoTexture();
// 市集摊位的五种布篷
const awningMaps = [
  TEX.awningTexture('#b23a32', '#efe6cf'),
  TEX.awningTexture('#2f5d7c', '#e8e2cf'),
  TEX.awningTexture('#4a7043', '#e9e3ce'),
  TEX.awningTexture('#c08a2e', '#efe6cf'),
  TEX.awningTexture('#6b3550', '#e8e0cc'),
];

// 环境反射贴图（让石墙、铁件与水面有真实的环境色）
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envDay = pmrem.fromEquirectangular(TEX.environmentTexture(false)).texture;
const envNight = pmrem.fromEquirectangular(TEX.environmentTexture(true)).texture;
scene.environment = envDay;
scene.environmentIntensity = 0.65;

function scaled(tex, rx, ry) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

function stoneMaterial(w, h, d, tint = 0xd6cfc0) {
  const s = Math.max(w, d) / 5.5;
  return new THREE.MeshStandardMaterial({
    map: scaled(stoneTx.map, s, h / 5.5),
    bumpMap: scaled(stoneTx.bump, s, h / 5.5),
    bumpScale: 0.22,
    roughness: 0.96,
    metalness: 0.01,
    color: tint,
  });
}

function stoneMaterialRound(r, h, tint = 0xd6cfc0) {
  return new THREE.MeshStandardMaterial({
    map: scaled(stoneTx.map, (Math.PI * 2 * r) / 6, h / 5.5),
    bumpMap: scaled(stoneTx.bump, (Math.PI * 2 * r) / 6, h / 5.5),
    bumpScale: 0.22,
    roughness: 0.96,
    metalness: 0.01,
    color: tint,
  });
}

function roofMaterial(rep = 4) {
  return new THREE.MeshStandardMaterial({
    map: scaled(roofMap, rep, rep * 1.6),
    roughness: 0.72,
    metalness: 0.06,
    color: 0xb8543f,
  });
}

function woodMaterial(rep = 2) {
  return new THREE.MeshStandardMaterial({
    map: scaled(woodMap, rep, rep),
    roughness: 0.88,
    metalness: 0.02,
    color: 0xb08a63,
  });
}

/* ExtrudeGeometry / ShapeGeometry 的 UV 以世界单位生成，
   需要把 repeat 设成 1/瓦片尺寸，否则石纹会被压缩得极密 */
function shapeStoneMaterial(tile = 5.5, tint = 0xd6cfc0) {
  return new THREE.MeshStandardMaterial({
    map: scaled(stoneTx.map, 1 / tile, 1 / tile),
    bumpMap: scaled(stoneTx.bump, 1 / tile, 1 / tile),
    bumpScale: 0.2,
    roughness: 0.96,
    metalness: 0.01,
    color: tint,
  });
}

function shapeWoodMaterial(tile = 2.4) {
  return new THREE.MeshStandardMaterial({
    map: scaled(woodMap, 1 / tile, 1 / tile),
    roughness: 0.9,
    metalness: 0.02,
    color: 0x9a7449,
  });
}

function spireMaterial(height = 8) {
  return new THREE.MeshStandardMaterial({
    map: scaled(spireMap, 3, Math.max(1.4, height / 2.6)),
    roughness: 0.66,
    metalness: 0.08,
    color: 0xa8462f,
  });
}

function shapeRoofMaterial(tile = 4.5) {
  return new THREE.MeshStandardMaterial({
    map: scaled(roofMap, 1 / tile, 1 / tile),
    roughness: 0.72,
    metalness: 0.06,
    color: 0xb8543f,
  });
}

const ironMat = new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.45, metalness: 0.85 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xd8b25e, roughness: 0.3, metalness: 0.9 });
const darkStone = new THREE.MeshStandardMaterial({ color: 0x5a544a, roughness: 1 });

/* ---- 城外村落 / 要塞共用的一套材质 ---- */
const villageWindows = [];
function villageMaterials() {
  const plaster = new THREE.MeshStandardMaterial({
    color: 0xd9cdb6, roughness: 1, metalness: 0,
  });
  // 夯土墙的斑驳感用同色 canvas 叠加——直接用石纹会太"城堡"
  plaster.map = scaled(stoneTx.map, 2.2, 1.1);
  plaster.bumpMap = scaled(stoneTx.bump, 2.2, 1.1);
  plaster.bumpScale = 0.1;

  const winMat = new THREE.MeshStandardMaterial({
    color: 0x2a2118, emissive: 0xffb45a, emissiveIntensity: 0, roughness: 0.85,
  });
  winMat.userData.windowGlow = true;
  villageWindows.push(winMat);

  return {
    stone: stoneMaterial(2, 2, 2, 0xb4ac9c),
    stoneLight: stoneMaterial(2, 2, 2, 0xcdc5b4),
    stoneStrong: stoneMaterial(3, 6, 3, 0xbfb6a4),
    plaster,
    beam: new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.95 }),
    wood: woodMaterial(1.6),
    woodDark: new THREE.MeshStandardMaterial({
      map: scaled(woodMap, 1.5, 1.5), color: 0xdcbf94, roughness: 0.9,
    }),
    thatch: new THREE.MeshStandardMaterial({
      map: scaled(thatchMap, 3, 2), color: 0xb9a578, roughness: 1,
    }),
    field: new THREE.MeshStandardMaterial({
      map: scaled(fieldMap, 2, 1), color: 0xc4b48c, roughness: 1,
    }),
    soilBorder: new THREE.MeshStandardMaterial({ color: 0x6b5638, roughness: 1 }),
    straw: new THREE.MeshStandardMaterial({ color: 0xb59a54, roughness: 1, flatShading: true }),
    window: winMat,
    iron: ironMat,
    rope: new THREE.MeshStandardMaterial({ color: 0x8a7a55, roughness: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 1 }),
    plateau: new THREE.MeshStandardMaterial({
      map: scaled(stoneTx.map, 5, 1.4),
      bumpMap: scaled(stoneTx.bump, 5, 1.4),
      bumpScale: 0.2,
      color: 0x8f8878, roughness: 1,
    }),
    plateauTop: new THREE.MeshStandardMaterial({
      map: scaled(grassMap, 3, 3), color: 0xa9b48f, roughness: 1,
    }),
    road: new THREE.MeshStandardMaterial({
      map: scaled(dirtMap, 1, 1), color: 0xdcd0b2, roughness: 1,
    }),
  };
}
const VM = villageMaterials();

/* ---- 镇中心专用：鹅卵石、木筋、灰泥、板岩瓦、彩窗 ---- */
function townMaterials(base) {
  // 木板墙用的深色木筋
  const timber = new THREE.MeshStandardMaterial({
    map: scaled(woodMap, 1.2, 3), color: 0x6a4a30, roughness: 0.94, metalness: 0.02,
  });

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x2a2118, emissive: 0xffb45a, emissiveIntensity: 0, roughness: 0.85,
  });
  windowMat.userData.windowGlow = true;
  villageWindows.push(windowMat);

  // 教堂彩窗：白天也是暗色玻璃，入夜透出暖光
  const stained = new THREE.MeshStandardMaterial({
    color: 0x2a3348, emissive: 0xffc270, emissiveIntensity: 0, roughness: 0.5,
  });
  stained.userData.windowGlow = true;
  villageWindows.push(stained);

  // 灯笼玻璃
  const lanternGlass = new THREE.MeshStandardMaterial({
    color: 0x3a3222, emissive: 0xffc470, emissiveIntensity: 0, roughness: 0.6,
  });
  lanternGlass.userData.windowGlow = true;
  villageWindows.push(lanternGlass);

  return {
    ...base,
    window: windowMat,
    timber,
    stucco: new THREE.MeshStandardMaterial({
      map: scaled(stuccoMap, 2, 2), color: 0xf0e8d6, roughness: 1,
    }),
    cobble: new THREE.MeshStandardMaterial({
      map: scaled(cobbleMap, 5, 4), color: 0xcfc7b8, roughness: 0.94,
    }),
    tile: new THREE.MeshStandardMaterial({
      map: scaled(roofMap, 2.6, 2.2), roughness: 0.74, metalness: 0.05, color: 0xa8503a,
    }),
    // 板岩：石纹薄叠 + 冷灰蓝，比红瓦"贵气"也更耐看
    slate: new THREE.MeshStandardMaterial({
      map: scaled(stoneTx.map, 3.5, 6), bumpMap: scaled(stoneTx.bump, 3.5, 6),
      bumpScale: 0.14, roughness: 0.6, metalness: 0.12, color: 0x6f7a8a,
    }),
    slateDark: new THREE.MeshStandardMaterial({ color: 0x4e5560, roughness: 0.6, metalness: 0.25 }),
    bronze: new THREE.MeshStandardMaterial({
      color: 0x8a6a3c, roughness: 0.42, metalness: 0.8, side: THREE.DoubleSide,
    }),
    stainedGlass: stained,
    lanternGlass,
    ember: new THREE.MeshStandardMaterial({
      color: 0x35180c, emissive: 0xff6a14, emissiveIntensity: 0.9, roughness: 0.9,
    }),
    waterDark: new THREE.MeshStandardMaterial({
      color: 0x2c4a52, roughness: 0.18, metalness: 0.35,
    }),
    fruitRed: new THREE.MeshStandardMaterial({ color: 0x9c3226, roughness: 0.8 }),
    goldMark: new THREE.MeshStandardMaterial({ color: 0xc9a45e, roughness: 0.35, metalness: 0.75 }),
    linen: new THREE.MeshStandardMaterial({
      color: 0xc9bda2, roughness: 1, side: THREE.DoubleSide,
    }),
    // 墓园里那棵紫杉
    yewGreen: new THREE.MeshStandardMaterial({ color: 0x1f3324, roughness: 1, flatShading: true }),

    /* ---- 工匠区 ---- */
    // 小溪的水面：比护城河浅，带一点绿
    water: new THREE.MeshStandardMaterial({
      color: 0x4a8a86,
      map: scaled(waterTx.map, 1.6, 4),
      bumpMap: scaled(waterTx.bump, 1.6, 4),
      bumpScale: 0.35,
      roughness: 0.16,
      metalness: 0.25,
      transparent: true,
      opacity: 0.92,
    }),
    reed: new THREE.MeshStandardMaterial({ color: 0x6f7a3c, roughness: 1 }),
    sailCloth: new THREE.MeshStandardMaterial({
      color: 0xd8cdb2, roughness: 1, side: THREE.DoubleSide,
    }),
    // 陶窑的砖
    kilnBrick: new THREE.MeshStandardMaterial({
      map: scaled(stoneTx.map, 3, 2), color: 0xa2634a, roughness: 0.95,
    }),
    // 晒场上风干的皮子
    hideMat: new THREE.MeshStandardMaterial({
      color: 0x9a7a56, roughness: 1, side: THREE.DoubleSide,
    }),
  };
}
const TM = townMaterials(VM);

/* ---- 自然景观专用的一套材质：河水、山岩、雪、睡莲、花甸 ---- */
const NM = {
  ...TM,
  // 河床的湿泥
  riverBed: new THREE.MeshStandardMaterial({ color: 0x6a5c44, roughness: 1 }),
  // 浅水：能看见底，颜色偏黄绿
  riverShallow: new THREE.MeshStandardMaterial({
    color: 0x5f8f8a,
    map: scaled(waterTx.map, 5, 22),
    bumpMap: scaled(waterTx.bump, 5, 22),
    bumpScale: 0.32,
    roughness: 0.14, metalness: 0.3,
    transparent: true, opacity: 0.86,
  }),
  // 主流：更深更蓝，反光更强
  riverDeep: new THREE.MeshStandardMaterial({
    color: 0x2f6478,
    map: scaled(waterTx.map, 3, 16),
    bumpMap: scaled(waterTx.bump, 3, 16),
    bumpScale: 0.5,
    roughness: 0.1, metalness: 0.4,
    transparent: true, opacity: 0.93,
  }),
  // 湖：静水，比河水清
  lakeWater: new THREE.MeshStandardMaterial({
    color: 0x3d7f88,
    map: scaled(waterTx.map, 3.5, 3.5),
    bumpMap: scaled(waterTx.bump, 3.5, 3.5),
    bumpScale: 0.22,
    roughness: 0.08, metalness: 0.42,
    transparent: true, opacity: 0.94,
  }),
  // 瀑布下的潭水：带白沫，更亮
  poolWater: new THREE.MeshStandardMaterial({
    color: 0x86b8bc,
    map: scaled(waterTx.map, 2.2, 2.2),
    bumpMap: scaled(waterTx.bump, 2.2, 2.2),
    bumpScale: 0.7,
    roughness: 0.06, metalness: 0.3,
    transparent: true, opacity: 0.9,
  }),
  foam: new THREE.MeshStandardMaterial({
    color: 0xeef6f8, roughness: 0.5, transparent: true, opacity: 0.62,
    depthWrite: false,
  }),
  // 断崖：天然岩壁（不是砌石），有竖向裂隙与横向层理
  cliff: new THREE.MeshStandardMaterial({
    map: scaled(cliffTx.map, 2.2, 3.2),
    bumpMap: scaled(cliffTx.bump, 2.2, 3.2),
    bumpScale: 0.6,
    color: 0xa9a396, roughness: 1,
  }),
  cliffTop: new THREE.MeshStandardMaterial({ color: 0x8a8778, roughness: 1 }),
  cliffGrass: new THREE.MeshStandardMaterial({
    map: scaled(grassMap, 4, 2), color: 0x9fb083, roughness: 1,
  }),
  // 瀑布的崖体：比山岩偏褐、更湿
  fallsRock: new THREE.MeshStandardMaterial({
    map: scaled(cliffTx.map, 1.6, 2.2),
    bumpMap: scaled(cliffTx.bump, 1.6, 2.2),
    bumpScale: 0.65,
    // 崖壁多半背光（水帘在北面），材质本身要亮一档，否则糊成一块黑
    color: 0xb9b2a0, roughness: 1,
  }),
  // 山体岩面
  rockFace: new THREE.MeshStandardMaterial({
    map: scaled(stoneTx.map, 3, 5),
    bumpMap: scaled(stoneTx.bump, 3, 5),
    bumpScale: 0.5,
    color: 0x7b8091, roughness: 1,
  }),
  snow: new THREE.MeshStandardMaterial({ color: 0xf2f6fa, roughness: 0.62 }),
  mtnTrunk: new THREE.MeshStandardMaterial({ color: 0x40342a, roughness: 1 }),
  mtnLeaf: new THREE.MeshStandardMaterial({ color: 0x2c4630, roughness: 1, flatShading: true }),
  lilyPad: new THREE.MeshStandardMaterial({ color: 0x4c7a44, roughness: 0.9, side: THREE.DoubleSide }),
  lilyFlower: new THREE.MeshStandardMaterial({ color: 0xf6f2e4, roughness: 0.8 }),
  cattail: new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1 }),
  meadowGrass: new THREE.MeshStandardMaterial({
    map: scaled(grassMap, 5, 4), color: 0xb2c48f, roughness: 1,
  }),
  beak: new THREE.MeshStandardMaterial({ color: 0xd9a33c, roughness: 0.7 }),
  // 水雾与瀑布的雾贴图
  mistMap: TEX.glowTexture('rgba(255,255,255,0.85)', 'rgba(210,232,240,0)'),
};

  return { stoneTx, grassMap, waterTx, bannerRed, bannerBlue, glowTx, cloudTx, awningMaps, envDay, envNight, scaled, stoneMaterial, stoneMaterialRound, woodMaterial, shapeStoneMaterial, shapeWoodMaterial, spireMaterial, shapeRoofMaterial, ironMat, villageWindows, VM, TM, NM };
}
