import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TEX from './textures.js';
import * as POP from './population.js';
import * as VIL from './village.js';
import * as FORT from './fortress.js';
import * as TOWN from './town.js';
import * as IND from './industry.js';
import * as FESTIVAL from './festival.js';
import * as PRIORY from './priory.js';
import * as TOURNEY from './tournament.js';
import * as INN from './inn.js';
import * as P_OUT from './priory_outskirts.js';
import * as T_OUT from './tournament_outskirts.js';
import * as I_OUT from './inn_outskirts.js';
import * as P_OUT2 from './priory_outskirts2.js';
import * as T_OUT2 from './tournament_outskirts2.js';
import * as I_OUT2 from './inn_outskirts2.js';
import * as NATURE from './nature.js';
import * as TOWN2 from './town2.js';
import { WORLD_R, SEA, SITES, ROADS, smoothPath, expansionClearZones, seaDepth } from './world.js';
import { createMinimap } from './minimap.js';
import * as EXP from './expansion.js';
import * as KIT from './kit.js';
import { createAmbience } from './ambience.js';

/* ============================================================
 *  基础环境
 * ========================================================== */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const IS_SMALL = window.innerWidth < 780;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// 阴影图不再每帧重画：场景绝大多数物体是静止的，只在日夜过渡 / 每隔几帧
// （让走动的人和船的影子跟上）时置 needsUpdate，省下约 3/4 的阴影 pass。
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
let shadowFrame = 0;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc4d6e6, 560, 2800);

// 世界扩到 r≈2500 以后，远平面要跟着推；近平面抬到 1.0，免得 24 位深度在千米外把贴地的路面和草地打架
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1.0, 6200);

/* 竖屏 / 窄屏时按宽高比把相机整体推远，保证城堡完整入画
 * 注意：面板折叠 / 标签页隐藏时 innerHeight 可能是 0，直接除会得到 NaN，
 * 相机会被写到 NaN 上，整个场景就渲染不出来。这里必须兜底。 */
function homeFrame() {
  const w = window.innerWidth || 0;
  const h = window.innerHeight || 0;
  const aspect = h > 0 ? w / h : 0;
  const k = !isFinite(aspect) || aspect <= 0
    ? 1
    : (aspect >= 1.3 ? 1 : Math.min(1.95, Math.pow(1.3 / aspect, 0.85)));
  return {
    pos: [78 * k, 58 * k, 92 * k],
    target: [0, 10, 0],
  };
}
const HOME = homeFrame();
camera.position.set(...HOME.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 18;
controls.maxDistance = 2200;
controls.maxPolarAngle = Math.PI * 0.495;
controls.autoRotateSpeed = 0.45;
controls.update();

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

/* ============================================================
 *  工具函数
 * ========================================================== */
const CASTLE = new THREE.Group();
scene.add(CASTLE);

function box(w, h, d, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, seg, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

/** 三角形截面的坡屋顶，沿 Z 方向拉伸 */
function gableRoof(w, d, h, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 圆塔顶部的城垛环 */
function ringMerlons(parent, radius, y, count, mat, size = 1.05, h = 1.5) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const m = box(size, h, size, mat);
    m.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    m.rotation.y = -a + Math.PI / 2;
    parent.add(m);
  }
}

/** 一段直墙上的城垛 */
function lineMerlons(parent, { x0, x1, z, y, depth = 0.9, step = 2.4, w = 1.3, h = 1.5, mat }) {
  const len = Math.abs(x1 - x0);
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const m = box(w, h, depth, mat);
    m.position.set(x, y, z);
    parent.add(m);
  }
}

/* ============================================================
 *  天空 / 光照
 * ========================================================== */
const skyUniforms = {
  uTop: { value: new THREE.Color(0x2c66ad) },
  uBottom: { value: new THREE.Color(0xa9c9e6) },
};

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(4600, 40, 24),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uBottom;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        float t = pow(clamp(h, 0.0, 1.0), 0.42);
        vec3 col = mix(uBottom, uTop, t);
        // 地平线附近加一层暖白薄雾，衔接远景
        col = mix(col, uBottom * 1.04, smoothstep(0.09, -0.03, h));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xbfd8ef, 0x4a5038, 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
sun.castShadow = true;
/* ---- 跟随相机的阴影盒 ----
 * 世界扩到 r≈2000 以后，一张图罩住整片地图已经不现实（每纹素要摊一米多）。
 * 改成：阴影盒以相机注视点为中心，视野越近盒子越小、影子越清晰；
 * 中心按"光空间纹素"吸附，平移相机时影子边缘不会爬。
 * 光源放在离中心 SUN_DIST 米的地方，保证太阳一侧的高物体也落在近平面之后。 */
const SUN_DIST = 800;
const sunDir = new THREE.Vector3(70, 100, 55).normalize();   // 由阴影中心指向太阳
const SHADOW_SIZES = [110, 190, 320, 520];                      // 阴影盒半宽（米）的几档
const SHADOW_MAP = IS_SMALL ? 2048 : 4096;
let shadowHalf = 0;
const _sRight = new THREE.Vector3();
const _sUp = new THREE.Vector3();
const _sCenter = new THREE.Vector3();
const _sLast = new THREE.Vector3(1e9, 0, 0);
const _worldUp = new THREE.Vector3(0, 1, 0);
sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun.target);
scene.add(sun);

/** 重新摆放阴影盒；返回是否真的动了（动了就要重画阴影图） */
function updateShadowRig(force = false) {
  const dist = camera.position.distanceTo(controls.target);
  let half = SHADOW_SIZES[SHADOW_SIZES.length - 1];
  for (const sz of SHADOW_SIZES) {
    if (dist * 0.85 <= sz) { half = sz; break; }
  }
  _sRight.crossVectors(_worldUp, sunDir).normalize();
  _sUp.crossVectors(sunDir, _sRight).normalize();
  const texel = (2 * half) / SHADOW_MAP;
  const t = controls.target;
  const x = Math.round(t.dot(_sRight) / texel) * texel;
  const y = Math.round(t.dot(_sUp) / texel) * texel;
  _sCenter.set(0, 0, 0)
    .addScaledVector(_sRight, x)
    .addScaledVector(_sUp, y)
    .addScaledVector(sunDir, t.dot(sunDir));
  if (!force && half === shadowHalf && _sCenter.distanceToSquared(_sLast) < 1e-6) return false;
  _sLast.copy(_sCenter);

  sun.target.position.copy(_sCenter);
  sun.position.copy(_sCenter).addScaledVector(sunDir, SUN_DIST);
  sun.target.updateMatrixWorld();

  if (half !== shadowHalf) {
    shadowHalf = half;
    const cam = sun.shadow.camera;
    cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
    // 深度范围只罩住"盒子 + 高物体"，不然 bias 会按几公里的量程折算成一米多的悬浮
    const reach = half + 120;
    cam.near = SUN_DIST - reach;
    cam.far = SUN_DIST + reach;
    cam.updateProjectionMatrix();
    sun.shadow.bias = -0.3 / (2 * reach);
    sun.shadow.normalBias = 0.02 + texel * 0.6;
  }
  renderer.shadowMap.needsUpdate = true;
  return true;
}

const fill = new THREE.DirectionalLight(0x9fc4ff, 0.35);
fill.position.set(-60, 40, -50);
scene.add(fill);

// 夜间补一点环境光，避免背光面成为纯黑
const nightAmbient = new THREE.AmbientLight(0x8fa8d6, 0);
scene.add(nightAmbient);

// 星空
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 1800; i++) {
  const v = new THREE.Vector3().randomDirection().multiplyScalar(3600);
  if (v.y < 30) v.y = Math.abs(v.y) + 30;
  starPos.push(v.x, v.y, v.z);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false })
);
scene.add(stars);

// 月亮
const moon = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTx, color: 0xdfe9ff, transparent: true, opacity: 0,
  depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending,
}));
const MOON_OFFSET = new THREE.Vector3(-330, 150, -240);
moon.position.copy(MOON_OFFSET);
moon.scale.setScalar(170);
scene.add(moon);
const moonDisc = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTx, color: 0xffffff, transparent: true, opacity: 0,
  depthWrite: false, fog: false, toneMapped: false,
}));
moonDisc.position.copy(moon.position).multiplyScalar(0.94);
moonDisc.scale.setScalar(30);
scene.add(moonDisc);

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
];
// 越往下游越宽：上游 22 米，到镇前 30 米，出图处 38 米，西去更宽
const RIVER_W = [22, 24, 26, 28, 29, 30, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 42, 44, 46, 48, 50];

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
  const n = N_INNER + 4400;
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
        : Math.sqrt(760 * 760 + Math.random() * (1900 * 1900 - 760 * 760));
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
  const N_ROCKS = 600;
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
      r = i < 150 ? 62 + Math.random() * 660 : Math.sqrt(760 * 760 + Math.random() * (1900 * 1900 - 760 * 760));
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
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + Math.random() * 0.25;
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
  for (let i = 0; i < 34; i++) {
    const sp = new THREE.Sprite(cloudMat.clone());
    const a = Math.random() * Math.PI * 2;
    const r = 150 + Math.random() * 1600;
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

/* ============================================================
 *  可拾取对象注册（悬停高亮 / 点击详情）
 * ========================================================== */
const pickables = [];
const interactiveRoots = [];

function registerInteractive(group, info) {
  group.userData.info = info;
  // 同一建筑内，同一个原材质只克隆一份，由所有网格共享：
  // 高亮是整栋一起亮，用不着每个网格一份；独立材质数量直接决定 draw call 的换态次数。
  const cloned = new Map();
  group.traverse((o) => {
    if (o.isMesh) {
      let m = cloned.get(o.material);
      if (!m) {
        m = o.material.clone();
        cloned.set(o.material, m);
        if (m.userData && m.userData.windowGlow) keepWindows.push(m);
      }
      o.material = m;
      o.userData.root = group;
      pickables.push(o);
    }
  });
  group.userData._highlight = false;
  interactiveRoots.push(group);
}

function setHighlight(root, on) {
  if (root.userData._highlight === on) return;
  root.userData._highlight = on;
  root.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.emissive) return;
    // 材质在同一建筑内被多个网格共享，原始发光值要记在材质上而不是网格上
    const ud = o.material.userData;
    if (on) {
      if (ud._origEmissive === undefined) {
        ud._origEmissive = o.material.emissive.getHex();
        ud._origIntensity = o.material.emissiveIntensity ?? 1;
      }
      o.material.emissive.setHex(0xffa04a);
      o.material.emissiveIntensity = 0.055;
    } else if (ud._origEmissive !== undefined) {
      o.material.emissive.setHex(ud._origEmissive);
      o.material.emissiveIntensity = ud._origIntensity;
      ud._origEmissive = undefined;
    }
  });
}

/* ============================================================
 *  城墙
 * ========================================================== */
const WALL_H = 11;
const WALL_T = 2.8;
const HALF = 26;

/* 墙体沿本地 X 轴延伸，终点用 position / rotationY 摆放 */
function buildWallSegment(x0, x1, z, alongX = true) {
  const len = Math.abs(x1 - x0);
  const wall = box(len, WALL_H, WALL_T, stoneMaterial(len, WALL_H, WALL_T));

  const walk = box(len, 0.55, WALL_T + 1.4, stoneMaterial(len, 0.5, WALL_T + 1.4));
  walk.position.set(0, WALL_H / 2 + 0.27, 0);

  const merlonMat = stoneMaterial(1.3, 1.5, 0.9, 0xded8c9);
  const merlons = new THREE.Group();
  lineMerlons(merlons, { x0: -len / 2, x1: len / 2, z: (WALL_T + 1.4) / 2 - 0.45, y: WALL_H / 2 + 0.8, mat: merlonMat });
  const merlons2 = new THREE.Group();
  lineMerlons(merlons2, { x0: -len / 2, x1: len / 2, z: -(WALL_T + 1.4) / 2 + 0.45, y: WALL_H / 2 + 0.8, mat: merlonMat });

  wall.add(walk, merlons, merlons2);

  const g = new THREE.Group();
  g.add(wall);
  const mid = (x0 + x1) / 2;
  if (alongX) {
    g.position.set(mid, 0, z);
  } else {
    g.rotation.y = Math.PI / 2;
    g.position.set(z, 0, mid);
  }
  return g;
}

// 四面墙（南面留城门）
CASTLE.add(buildWallSegment(-HALF, -8.8, 26, true));
CASTLE.add(buildWallSegment(8.8, HALF, 26, true));
CASTLE.add(buildWallSegment(-HALF, HALF, -26, true));
CASTLE.add(buildWallSegment(-HALF, HALF, -HALF, false));
CASTLE.add(buildWallSegment(-HALF, HALF, HALF, false));

/* ============================================================
 *  圆塔
 * ========================================================== */
function roundTower({ x, z, r = 5.2, h = 21, roof = true, flagTex = bannerRed, name }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const bodyMat = stoneMaterialRound(r, h);
  const body = cyl(r, r * 1.08, h, 28, bodyMat);
  body.position.y = h / 2;
  g.add(body);

  // 束带层
  for (let i = 1; i <= 2; i++) {
    const belt = cyl(r * 1.03, r * 1.03, 0.35, 28, stoneMaterialRound(r, 0.5, 0xbdb4a2));
    belt.position.y = (h / 3) * i;
    g.add(belt);
  }

  // 挑檐 + 城垛
  const corbel = cyl(r * 1.16, r * 1.02, 1.0, 28, stoneMaterialRound(r, 1, 0xd0c8b8));
  corbel.position.y = h + 0.5;
  g.add(corbel);

  // 塔顶平台（石板），避免看到圆柱默认顶盖的木纹
  const deck = new THREE.Mesh(
    new THREE.CircleGeometry(r * 1.03, 28),
    new THREE.MeshStandardMaterial({
      map: scaled(stoneTx.map, 3, 3),
      bumpMap: scaled(stoneTx.bump, 3, 3),
      bumpScale: 0.2,
      roughness: 0.98,
      color: 0xa9a292,
    })
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = h + 0.02;
  deck.receiveShadow = true;
  g.add(deck);

  ringMerlons(g, r * 1.06, h + 1.65, 12, stoneMaterial(1.1, 1.5, 1.1, 0xe2dccc), 1.1, 1.6);

  // 箭窗：外框 + 内部暗槽，远看不会成为纯黑洞
  const slitFrameMat = new THREE.MeshStandardMaterial({ color: 0xb9b1a0, roughness: 1 });
  const slitMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const frame = box(0.72, 2.4, 0.22, slitFrameMat, false);
    frame.position.set(Math.cos(a) * (r - 0.02), h * 0.62, Math.sin(a) * (r - 0.02));
    frame.rotation.y = -a;
    const slit = box(0.4, 2.0, 0.26, slitMat, false);
    slit.position.set(Math.cos(a) * (r - 0.06), h * 0.62, Math.sin(a) * (r - 0.06));
    slit.rotation.y = -a;
    g.add(frame, slit);
  }

  if (roof) {
    const cone = cyl(0.15, r * 0.98, r * 1.55, 28, spireMaterial(r * 1.55));
    cone.position.y = h + 1.6 + r * 0.78;
    g.add(cone);

    // 旗杆 + 旗帜
    const pole = cyl(0.09, 0.09, 6.5, 8, ironMat);
    pole.position.y = h + 1.6 + r * 1.55 + 2.2;
    g.add(pole);

    const flag = makeFlag(3.4, 2.0, flagTex);
    flag.position.set(1.7, h + 1.6 + r * 1.55 + 3.6, 0);
    g.add(flag);
  }

  g.userData.towerName = name;
  return g;
}

function makeFlag(w, h, tex) {
  const geo = new THREE.PlaneGeometry(w, h, 12, 8);
  geo.translate(w / 2, 0, 0);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0,
    alphaTest: 0.5,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.userData.base = Float32Array.from(geo.attributes.position.array);
  mesh.userData.width = w;
  flags.push(mesh);
  return mesh;
}
const flags = [];

/* ============================================================
 *  主楼（Keep）
 * ========================================================== */
function buildKeep() {
  const g = new THREE.Group();
  g.position.set(0, 0, -8);

  const W = 17;
  const D = 15;
  const H = 23;

  const base = box(W, H, D, stoneMaterial(W, H, D, 0xd2cbbb));
  base.position.y = H / 2;
  g.add(base);

  // 基座斜台
  const plinth = box(W + 1.6, 3, D + 1.6, stoneMaterial(W, 3, D, 0xa89f8e));
  plinth.position.y = 1.5;
  g.add(plinth);

  // 顶部挑檐 + 城垛
  const corbel = box(W + 1.4, 1.1, D + 1.4, stoneMaterial(W, 1, D, 0xded7c6));
  corbel.position.y = H + 0.55;
  g.add(corbel);

  const merlonMat = stoneMaterial(1.2, 1.6, 1.0, 0xe4ded0);
  const mg = new THREE.Group();
  lineMerlons(mg, { x0: -W / 2, x1: W / 2, z: (D + 1.4) / 2 - 0.5, y: H + 1.6, mat: merlonMat });
  lineMerlons(mg, { x0: -W / 2, x1: W / 2, z: -(D + 1.4) / 2 + 0.5, y: H + 1.6, mat: merlonMat });
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 5; i++) {
      const m = box(1.0, 1.6, 1.2, merlonMat);
      m.position.set((sx * (W + 1.4)) / 2 - sx * 0.5, H + 1.6, -D / 2 + (D / 5) * i);
      mg.add(m);
    }
  }
  g.add(mg);

  // 屋顶
  const roof = gableRoof(W + 1.2, D + 1.2, 7.5, shapeRoofMaterial(4.5));
  roof.position.y = H + 1.05;
  g.add(roof);

  // 四角小塔
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const t = cyl(1.9, 1.9, H + 6, 18, stoneMaterialRound(1.9, H + 6, 0xd8d1c1));
      t.position.set((sx * W) / 2, (H + 6) / 2, (sz * D) / 2);
      g.add(t);

      const c = cyl(0.05, 2.3, 3.4, 18, spireMaterial(3.4));
      c.position.set((sx * W) / 2, H + 6 + 1.7, (sz * D) / 2);
      g.add(c);

      const sp = cyl(0.07, 0.07, 4.5, 6, ironMat);
      sp.position.set((sx * W) / 2, H + 6 + 5.2, (sz * D) / 2);
      g.add(sp);
    }
  }

  // 塔身旗帜
  const pole = cyl(0.11, 0.11, 9, 8, ironMat);
  pole.position.set(0, H + 11, 0);
  g.add(pole);
  const flag = makeFlag(4.2, 2.4, bannerBlue);
  flag.position.set(2.1, H + 13.6, 0);
  g.add(flag);

  // 拱门
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-2.2, 0);
  doorShape.lineTo(2.2, 0);
  doorShape.lineTo(2.2, 5);
  doorShape.absarc(0, 5, 2.2, 0, Math.PI, false);
  doorShape.lineTo(-2.2, 0);
  const doorGeo = new THREE.ShapeGeometry(doorShape, 16);
  const door = new THREE.Mesh(doorGeo, shapeWoodMaterial(2.4));
  door.position.set(0, 0.05, D / 2 + 0.02);
  g.add(door);

  const frameMat = stoneMaterial(7, 9, 1, 0xe6dfd0);
  const frameL = box(1.0, 7.6, 0.8, frameMat);
  frameL.position.set(-2.7, 3.8, D / 2 + 0.3);
  const frameR = frameL.clone();
  frameR.position.x = 2.7;
  g.add(frameL, frameR);

  // 窗（夜间发光）
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x4a3a24,
    emissive: 0xffb85c,
    emissiveIntensity: 0,
    roughness: 0.55,
    metalness: 0.25,
  });
  winMat.userData.windowGlow = true;
  keepWindows.push(winMat);
  for (let row = 0; row < 3; row++) {
    for (let col = -2; col <= 2; col++) {
      if (row === 0 && Math.abs(col) < 2) continue;
      const win = box(1.1, 2.0, 0.3, winMat, false);
      win.position.set(col * 3.1, 8 + row * 5.4, D / 2 + 0.08);
      g.add(win);
      const winB = win.clone();
      winB.position.z = -D / 2 - 0.08;
      g.add(winB);
    }
  }

  // 侧翼山墙
  const wing = box(6, 13, 9, stoneMaterial(6, 13, 9, 0xcbc4b4));
  wing.position.set(-12.5, 6.5, -7);
  g.add(wing);
  const wingRoof = gableRoof(7.2, 10.2, 3.6, shapeRoofMaterial(4.5));
  wingRoof.position.set(-12.5, 13, -7);
  g.add(wingRoof);

  return g;
}

const keepWindows = [];

const keep = buildKeep();
CASTLE.add(keep);
registerInteractive(keep, {
  name: '主楼 · Keep',
  tag: '城堡核心',
  desc: '主楼是中世纪城堡里最后一道防线，也是领主的居所。厚重的石墙、狭小的箭窗、独立的蓄水与粮仓，让它在城墙失守后仍能坚守数月。',
  detail: '注意它抬高的入口、四角的瞭望塔，以及屋顶的旗帜 —— 那是领主的家族纹章。',
  view: { pos: [50, 54, 48], target: [0, 16, -8] },
});

/* ============================================================
 *  城门楼
 * ========================================================== */
const gateGroup = new THREE.Group();
gateGroup.position.set(0, 0, 0);
CASTLE.add(gateGroup);

let portcullis;
let gateDoors = [];

function buildGatehouse() {
  const g = gateGroup;

  // 拱形墙体（带门洞）
  const outer = new THREE.Shape();
  outer.moveTo(-8.8, 0);
  outer.lineTo(8.8, 0);
  outer.lineTo(8.8, 13.5);
  outer.lineTo(-8.8, 13.5);
  outer.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-2.8, 0);
  hole.lineTo(-2.8, 5.4);
  hole.absarc(0, 5.4, 2.8, Math.PI, 0, true);
  hole.lineTo(2.8, 0);
  hole.closePath();
  outer.holes.push(hole);

  const wallGeo = new THREE.ExtrudeGeometry(outer, { depth: WALL_T + 1.2, bevelEnabled: false });
  wallGeo.translate(0, 0, -(WALL_T + 1.2) / 2);

  const gateway = new THREE.Mesh(wallGeo, shapeStoneMaterial(5.5));
  gateway.position.set(0, 0, 26);
  gateway.castShadow = true;
  gateway.receiveShadow = true;
  g.add(gateway);

  // 城门顶部走道与城垛
  const deck = box(17.6, 0.6, WALL_T + 2.6, stoneMaterial(17.6, 0.6, WALL_T));
  deck.position.set(0, 13.8, 26);
  g.add(deck);

  const mg = new THREE.Group();
  lineMerlons(mg, { x0: -8.4, x1: 8.4, z: 26 + (WALL_T + 2.6) / 2 - 0.5, y: 15.1, mat: stoneMaterial(1.3, 1.6, 0.9, 0xe4ded0) });
  lineMerlons(mg, { x0: -8.4, x1: 8.4, z: 26 - (WALL_T + 2.6) / 2 + 0.5, y: 15.1, mat: stoneMaterial(1.3, 1.6, 0.9, 0xe4ded0) });
  g.add(mg);

  // 两侧塔楼
  for (const sx of [-1, 1]) {
    const t = cyl(4.0, 4.3, 18.5, 24, stoneMaterialRound(4, 18.5, 0xd8d1c1));
    t.position.set(sx * 8.8, 9.25, 26);
    g.add(t);

    const corbel = cyl(4.65, 4.05, 1.0, 24, stoneMaterialRound(4, 1, 0xe0d9c9));
    corbel.position.set(sx * 8.8, 19.0, 26);
    g.add(corbel);

    ringMerlons(g, 4.3, 20.2, 10, stoneMaterial(1.1, 1.5, 1.1, 0xe8e2d3), 1.1, 1.6);

    // 圆锥顶
    const cone = cyl(0.12, 4.25, 6.6, 24, spireMaterial(6.6));
    cone.position.set(sx * 8.8, 22.5, 26);
    g.add(cone);

    const pole = cyl(0.08, 0.08, 5, 6, ironMat);
    pole.position.set(sx * 8.8, 27.5, 26);
    g.add(pole);

    const flag = makeFlag(2.6, 1.6, sx < 0 ? bannerRed : bannerBlue);
    flag.position.set(sx * 8.8 + 1.3, 29.2, 26);
    g.add(flag);
  }

  // 闸门（可升降）
  portcullis = new THREE.Group();
  const barMat = ironMat;
  for (let i = -3; i <= 3; i++) {
    const bar = box(0.22, 8.2, 0.22, barMat);
    bar.position.set(i * 0.85, 4.1, 26);
    portcullis.add(bar);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 4), barMat);
    tip.rotation.x = Math.PI;
    tip.position.set(i * 0.85, -0.2, 26);
    portcullis.add(tip);
  }
  for (let j = 0; j < 5; j++) {
    const h = box(6.2, 0.2, 0.2, barMat);
    h.position.set(0, 1 + j * 1.7, 26);
    portcullis.add(h);
  }
  g.add(portcullis);

  // 木门（敞开靠在内墙）
  for (const sx of [-1, 1]) {
    const door = box(2.7, 6.2, 0.28, woodMaterial(2));
    const pivot = new THREE.Group();
    pivot.position.set(sx * 2.75, 0, 24.3);
    door.position.set(sx * -1.35, 3.1, 0);
    pivot.add(door);

    // 铁钉
    for (let r = 0; r < 4; r++) {
      const stud = box(2.4, 0.16, 0.1, ironMat, false);
      stud.position.set(sx * -1.35, 1.0 + r * 1.5, 0.2);
      pivot.add(stud);
    }
    pivot.userData.base = sx * 1.35;
    pivot.rotation.y = pivot.userData.base;
    g.add(pivot);
    gateDoors.push(pivot);
  }

  // 桥头石阶 + 通往对岸的木桥
  const road = box(9.2, 0.5, 12, stoneMaterial(9.2, 0.5, 12, 0x9c9384));
  road.position.set(0, -0.2, 33);
  road.receiveShadow = true;
  g.add(road);

  const bridge = new THREE.Group();
  const bMat = woodMaterial(4);
  const PLANK = 1.15;
  const N = 30; // 一直铺到护城河外岸（z ≈ 59.8）
  for (let i = 0; i < N; i++) {
    const plank = box(8.4, 0.28, PLANK * 0.86, bMat);
    plank.position.set(0, 0, i * PLANK);
    bridge.add(plank);
  }
  for (const sx of [-1, 1]) {
    const beam = box(0.42, 0.44, N * PLANK, bMat);
    beam.position.set(sx * 4.1, 0.06, (N * PLANK) / 2 - PLANK / 2);
    bridge.add(beam);

    for (let i = 0; i < N; i += 3) {
      const post = box(0.22, 1.5, 0.22, bMat);
      post.position.set(sx * 4.0, 0.9, i * PLANK);
      bridge.add(post);
    }
    const rail = box(0.18, 0.18, N * PLANK, bMat);
    rail.position.set(sx * 4.0, 1.6, (N * PLANK) / 2 - PLANK / 2);
    bridge.add(rail);

    // 吊桥铁链
    for (let k = 0; k <= 7; k++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 10), ironMat);
      link.position.set(sx * 4.6, 4.4 - k * 0.42, 1.2 + k * 1.05);
      link.rotation.x = Math.PI / 2 + 0.35;
      bridge.add(link);
    }
  }

  // 桥墩
  for (let i = 2; i < N; i += 7) {
    const zz = i * PLANK;
    for (const sx of [-1, 1]) {
      const pier = cyl(0.55, 0.75, 4.2, 8, stoneMaterialRound(0.7, 4.2, 0x8d8577));
      pier.position.set(sx * 3.4, -2.2, zz);
      bridge.add(pier);
    }
  }

  bridge.position.set(0, -0.1, 26.4);
  g.add(bridge);

  return g;
}
buildGatehouse();

registerInteractive(gateGroup, {
  name: '城门楼 · Gatehouse',
  tag: '咽喉要地',
  desc: '城门是城堡最脆弱的地方，因此被建得格外坚固：双塔夹峙、拱形门洞、可升降的铁闸门，以及跨过护城河的吊桥。',
  detail: '点击下方按钮，可以升起铁闸门 —— 现实中它靠绞盘与铁链驱动，需要数名士兵合力操作。',
  view: { pos: [2, 22, 80], target: [0, 10, 24] },
});

/* ============================================================
 *  角塔
 * ========================================================== */
const towerData = [
  { x: -HALF, z: -HALF, name: '西北角塔', roof: true, flagTex: bannerRed },
  { x: HALF, z: -HALF, name: '东北角塔', roof: false, flagTex: bannerBlue },
  { x: -HALF, z: HALF, name: '西南角塔', roof: false, flagTex: bannerBlue },
  { x: HALF, z: HALF, name: '东南角塔', roof: true, flagTex: bannerRed },
];

towerData.forEach((t, i) => {
  const tower = roundTower({ ...t, r: 5.4, h: 22 });
  tower.position.y = 0;
  CASTLE.add(tower);

  if (i === 0) {
    registerInteractive(tower, {
      name: '角塔 · Corner Tower',
      tag: '瞭望与射击',
      desc: '圆形的角塔没有射击死角，塔顶的城垛为弓箭手提供掩护，塔内的螺旋楼梯只容一人通行，易守难攻。',
      detail: '塔顶旗帜的方向，就是风向。',
      view: { pos: [-58, 30, -58], target: [-26, 16, -26] },
    });
  }
});

/* ============================================================
 *  庭院
 * ========================================================== */
function buildWell(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const ring = cyl(2.1, 2.3, 1.5, 20, stoneMaterialRound(2.2, 1.5, 0xa9a294));
  ring.position.y = 0.75;
  g.add(ring);

  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20), new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 1 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 1.45;
  g.add(hole);

  for (const sx of [-1, 1]) {
    const post = box(0.28, 3.4, 0.28, woodMaterial(1));
    post.position.set(sx * 1.75, 1.7, 0);
    g.add(post);
  }
  const beam = box(4.0, 0.28, 0.3, woodMaterial(1));
  beam.position.y = 3.4;
  g.add(beam);

  const roof = gableRoof(3.6, 1.5, 1.1, shapeRoofMaterial(4.5));
  roof.position.set(0, 3.55, 0);
  g.add(roof);

  const rope = cyl(0.05, 0.05, 2.0, 6, new THREE.MeshStandardMaterial({ color: 0x8a7a55, roughness: 1 }));
  rope.position.set(0, 2.4, 0);
  g.add(rope);

  const bucket = cyl(0.34, 0.28, 0.5, 10, woodMaterial(1));
  bucket.position.set(0, 1.4, 0);
  g.add(bucket);

  return g;
}
const well = buildWell(9, 9);
CASTLE.add(well);
registerInteractive(well, {
  name: '水井 · The Well',
  tag: '围城生死线',
  desc: '围城战中，水源比粮食更致命。城堡内必须有自己的水井或蓄水池，否则敌人只需围而不攻就能取胜。',
  detail: '水井通常深达数十米，井壁用石块砌成，井口加盖防止投毒。',
  view: { pos: [22, 11, 24], target: [9, 2, 9] },
});

function buildHut(x, z, rot, w = 6, d = 5, h = 3.6) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;

  const body = box(w, h, d, new THREE.MeshStandardMaterial({
    map: scaled(stoneTx.map, w / 4, h / 4),
    bumpMap: scaled(stoneTx.bump, w / 4, h / 4),
    bumpScale: 0.15,
    roughness: 1,
    color: 0xb9b0a0,
  }));
  body.position.y = h / 2;
  g.add(body);

  // 木筋
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x4a3625, roughness: 0.9 });
  for (const sx of [-1, 1]) {
    const b = box(0.28, h, 0.28, beamMat);
    b.position.set((sx * w) / 2 - sx * 0.14, h / 2, d / 2 + 0.02);
    g.add(b);
  }
  const b2 = box(w, 0.26, 0.26, beamMat);
  b2.position.set(0, h - 0.2, d / 2 + 0.02);
  g.add(b2);

  const roof = gableRoof(w + 0.8, d + 1.0, 2.3, shapeRoofMaterial(4.5));
  roof.position.y = h;
  g.add(roof);

  // 门
  const door = box(1.3, 2.2, 0.12, woodMaterial(1));
  door.position.set(0, 1.1, d / 2 + 0.06);
  g.add(door);

  // 烟囱
  const chim = box(0.7, 1.8, 0.7, stoneMaterial(0.7, 1.8, 0.7, 0x8d8578));
  chim.position.set(w / 2 - 1.1, h + 1.9, -d / 2 + 1.2);
  g.add(chim);

  return g;
}

const huts = new THREE.Group();
huts.add(buildHut(-17, 12, 0.25, 6.5, 5.2, 3.8));
huts.add(buildHut(-16.5, 3.5, -0.1, 5.0, 4.4, 3.2));
huts.add(buildHut(18, -12, -1.9, 5.6, 4.6, 3.4));
CASTLE.add(huts);
registerInteractive(huts, {
  name: '庭院民居 · Courtyard',
  tag: '日常生活',
  desc: '城堡不只是军事要塞，也是一个小型城镇：铁匠铺、马厩、粮仓、面包房、礼拜堂一应俱全。',
  detail: '平时，庭院里挤满士兵、工匠、仆役与商贩；战时，周边村落的农民会带着牲畜躲进城墙。',
  view: { pos: [-2, 24, 40], target: [-14, 5, 6] },
});

// 登上城墙的石阶
function buildStairs(x, z, w, steps, h, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const mat = stoneMaterial(w, 1, 1.4, 0xbdb5a5);
  const stepH = h / steps;
  const stepD = 0.85;
  for (let i = 0; i < steps; i++) {
    const s = box(w, stepH, stepD, mat);
    s.position.set(0, stepH * i + stepH / 2, -i * stepD);
    g.add(s);
  }
  return g;
}
const stairs = buildStairs(-22.4, 5.6, 3.0, 23, WALL_H + 0.6, Math.PI);
CASTLE.add(stairs);

// 火盆 / 火把
const fireGroup = new THREE.Group();
CASTLE.add(fireGroup);
const torchFlames = [];
const torchLights = [];
const flameBodies = [];
const windmills = [];   // 风车的帆（工匠区在下面才建）
const waterWheels = []; // 水磨坊的水轮
const stalls = [];      // 市集摊位（昼夜开合）
const bellRopes = [];   // 会跟着钟声摆动的钟舌
const BELL_POS = new THREE.Vector3();  // 钟楼钟口的世界坐标
const BELFREY_GLOW = [];               // 钟室四面开口外侧（世界坐标）
const ANVIL_POS = new THREE.Vector3(); // 铁砧的世界坐标（打铁火星从这里蹦）
const lampHaloes = [];                 // 街灯灯罩的光晕

function addTorch(x, y, z, withLight = true, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const bracket = box(0.16, 0.16, 0.9, ironMat);
  bracket.position.z = 0.4;
  g.add(bracket);

  const bowl = cyl(0.42, 0.22, 0.5, 10, ironMat);
  bowl.position.set(0, 0.3, 0.82);
  g.add(bowl);

  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx,
    color: 0xff9a33,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  flame.position.set(0, 1.45, 0.82);
  flame.scale.setScalar(3.0 * scale);
  flame.userData.baseScale = 3.0 * scale;
  g.add(flame);

  // 火苗本体（小锥体，随火焰跳动的更明确形状）
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.26 * scale, 0.9 * scale, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc45e, transparent: true, opacity: 0.95, toneMapped: false })
  );
  body.position.set(0, 1.15 * scale, 0.82);
  body.userData.baseY = body.position.y;
  g.add(body);
  flameBodies.push({ mesh: body, seed: Math.random() * 10, scale });

  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx,
    color: 0xfff0c0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  core.position.copy(flame.position);
  core.scale.setScalar(1.5 * scale);
  core.userData.baseScale = 1.5 * scale;
  g.add(core);

  torchFlames.push({ flame, core, seed: Math.random() * 10 });

  if (withLight) {
    const light = new THREE.PointLight(0xff9a3c, 0, 16, 2);
    light.position.set(0, 1.5, 0.82);
    g.add(light);
    torchLights.push(light);
  }

  fireGroup.add(g);
  return g;
}

// 城门两侧
addTorch(-5.6, 6.2, 27.2, true, 1.15);
addTorch(5.6, 6.2, 27.2, true, 1.15);
// 主楼门前
addTorch(-4.2, 4.2, -0.4, true, 1.0);
addTorch(4.2, 4.2, -0.4, true, 1.0);
// 庭院
addTorch(-17.8, 3.4, 14.6, true, 0.9);
addTorch(13.5, 3.4, 18.5, false, 0.9);

// 篝火
const bonfire = new THREE.Group();
bonfire.position.set(6.5, 0, 14);
{
  const logs = new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const log = cyl(0.16, 0.16, 2.0, 6, logs);
    log.position.set(0, 0.2, 0);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 7) * Math.PI;
    log.rotation.x = 0.35;
    log.position.y = 0.26;
    bonfire.add(log);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.28, 8, 20), new THREE.MeshStandardMaterial({ color: 0x6b6355, roughness: 1 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.12;
  bonfire.add(ring);

  const fire = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx, color: 0xff8a2a, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  fire.position.y = 1.3;
  fire.scale.setScalar(5);
  fire.userData.baseScale = 5;
  bonfire.add(fire);
  torchFlames.push({ flame: fire, core: null, seed: 3.3 });

  const light = new THREE.PointLight(0xff8420, 0, 26, 2);
  light.position.y = 1.8;
  bonfire.add(light);
  torchLights.push(light);
}
CASTLE.add(bonfire);

/* ============================================================
 *  城墙上的旗帜
 * ========================================================== */
for (const [x, z, tex] of [[-17, 26, bannerRed], [17, 26, bannerRed], [0, -26, bannerBlue]]) {
  const pole = cyl(0.09, 0.09, 5.6, 6, ironMat);
  pole.position.set(x, WALL_H + 3.3, z);
  CASTLE.add(pole);
  const flag = makeFlag(3.0, 1.8, tex);
  flag.position.set(x + 1.5, WALL_H + 5.4, z);
  CASTLE.add(flag);
}

/* ============================================================
 *  人物：城墙守卫 / 城门哨兵 / 庭院平民
 * ========================================================== */
const people = [];
const TABARDS_RED = 0x7d1c22;
const TABARDS_BLUE = 0x1c3a63;
const WALK_TOP = WALL_H / 2 + 0.5; // 城墙走道地面高度 ≈ 6.0
const GATE_DECK = 14.1;            // 城门楼顶平台

/**
 * 给镇上的居民登记一份作息：白天在 work 点，天黑之后走回 home 点进屋。
 * 只对镇上的人调用；守卫、船夫这些当值的人不回家。
 */
function schedule(rec, hx, hz, hface) {
  rec.home = { x: hx, z: hz, face: hface };
  rec.work = { x: rec.root.position.x, z: rec.root.position.z, face: rec.facingY };
  rec.sched = 'out';    // out | toHome | in | toWork
  rec.presence = 1;
  return rec;
}

/**
 * activity: 'idle' | { walk: {from:[x,z], to:[x,z], speed} }
 */
function addPerson(model, x, y, z, facingY, activity = 'idle', parent = CASTLE) {
  model.root.position.set(x, y, z);
  model.root.rotation.y = facingY;
  parent.add(model.root);

  const rec = {
    ...model,
    activity,
    phase: Math.random() * Math.PI * 2,
    t: Math.random(),
    baseY: y,
    facingY,
  };

  if (activity && activity.walk) {
    rec.walkT = Math.random();
    rec.dir = 1;
    rec.activity0 = activity;   // 收工回家再出门时要把走动还原
  }
  people.push(rec);
  return rec;
}

/* ---------- 城墙上的守卫 ---------- */
const WALL_TROOPS = [
  // 南墙（面向城外 +z）
  { x: -20.5, z: 26, y: WALK_TOP, face: 0, helm: 'kettle', weapon: 'spear', shield: true },
  { x: -14.5, z: 26.2, y: WALK_TOP, face: 0.15, helm: 'great', weapon: 'halberd', shield: false },
  { x: -11.5, z: 25.8, y: WALK_TOP, face: -0.2, helm: 'kettle', weapon: 'spear', shield: false },
  { x: 12.0, z: 26.1, y: WALK_TOP, face: 0.1, helm: 'kettle', weapon: 'spear', shield: true },
  { x: 18.0, z: 25.9, y: WALK_TOP, face: -0.12, helm: 'great', weapon: 'spear', shield: false },
  { x: 22.5, z: 26.2, y: WALK_TOP, face: 0.2, helm: 'kettle', weapon: 'halberd', shield: false },
  // 北墙（面向 -z）
  { x: -17.0, z: -26, y: WALK_TOP, face: Math.PI, helm: 'kettle', weapon: 'spear', shield: true },
  { x: -4.0, z: -26.1, y: WALK_TOP, face: Math.PI + 0.2, helm: 'great', weapon: 'halberd', shield: false },
  { x: 9.0, z: -25.9, y: WALK_TOP, face: Math.PI - 0.15, helm: 'kettle', weapon: 'spear', shield: false },
  { x: 20.0, z: -26, y: WALK_TOP, face: Math.PI, helm: 'kettle', weapon: 'bow', shield: false },
  // 东墙（面向 +x）
  { x: 26, z: -12.0, y: WALK_TOP, face: Math.PI / 2, helm: 'kettle', weapon: 'spear', shield: true },
  { x: 26.1, z: 2.0, y: WALK_TOP, face: Math.PI / 2 - 0.1, helm: 'great', weapon: 'halberd', shield: false },
  // 西墙（面向 -x）
  { x: -26, z: 16.0, y: WALK_TOP, face: -Math.PI / 2, helm: 'kettle', weapon: 'spear', shield: false },
  { x: -26.1, z: -6.0, y: WALK_TOP, face: -Math.PI / 2 + 0.12, helm: 'kettle', weapon: 'bow', shield: false },
];

WALL_TROOPS.forEach((t, i) => {
  const model = POP.makePerson({
    tabard: i % 3 === 0 ? TABARDS_BLUE : TABARDS_RED,
    helmet: t.helm,
    weapon: t.weapon,
    shield: t.shield,
    cape: i % 4 === 1,
  });
  addPerson(model, t.x, t.y, t.z, t.face);
});

/* ---------- 城墙上巡逻的卫兵 ---------- */
addPerson(
  POP.makePerson({ tabard: TABARDS_RED, helmet: 'kettle', weapon: 'spear', shield: false }),
  -22, WALK_TOP, 25.2, 0,
  { walk: { from: [-22, 25.2], to: [-10.5, 25.2], speed: 1.05 } }
);
addPerson(
  POP.makePerson({ tabard: TABARDS_BLUE, helmet: 'kettle', weapon: 'spear', shield: true }),
  14, WALK_TOP, -25.2, Math.PI,
  { walk: { from: [14, -25.2], to: [24, -25.2], speed: 0.95 } }
);

/* ---------- 城门楼顶的旗手与哨兵 ---------- */
addPerson(
  POP.makePerson({ tabard: TABARDS_RED, helmet: 'great', weapon: 'halberd', shield: false, cape: true }),
  0, GATE_DECK, 24.6, 0
);
addPerson(
  POP.makePerson({ tabard: TABARDS_BLUE, helmet: 'kettle', weapon: 'spear', shield: true }),
  -6.0, GATE_DECK, 25.4, 0.3
);
addPerson(
  POP.makePerson({ tabard: TABARDS_BLUE, helmet: 'kettle', weapon: 'spear', shield: true }),
  6.0, GATE_DECK, 25.4, -0.3
);

/* ---------- 城门内侧的守卫 ---------- */
addPerson(
  POP.makePerson({ tabard: TABARDS_RED, helmet: 'great', weapon: 'spear', shield: false }),
  -4.6, 0, 21.4, 0.35
);
addPerson(
  POP.makePerson({ tabard: TABARDS_RED, helmet: 'great', weapon: 'spear', shield: false }),
  4.6, 0, 21.4, -0.35
);

/* ---------- 庭院里的平民 ---------- */
const VILLAGER_SPOTS = [
  { x: 11.6, z: 10.4, face: -0.9 },     // 水井旁打水
  { x: 8.2, z: 7.0, face: 1.4 },
  { x: -14.2, z: 10.2, face: 0.4 },     // 民居前
  { x: -19.0, z: 2.0, face: 2.2 },
  { x: 16.0, z: -9.0, face: -1.2 },
  { x: 4.4, z: 12.4, face: 2.6 },       // 篝火旁
  { x: 8.6, z: 15.6, face: -2.4 },
  { x: -8.0, z: 15.0, face: 0.9 },
];
VILLAGER_SPOTS.forEach((v) => {
  addPerson(POP.makeVillager(1), v.x, 0, v.z, v.face);
});

// 两个在庭院里走动的人
addPerson(
  POP.makeVillager(1.02),
  -2, 0, 16, 0,
  { walk: { from: [-4.5, 18.5], to: [12, 18.5], speed: 0.72 } }
);
addPerson(
  POP.makeVillager(0.98),
  20, 0, 6, Math.PI,
  { walk: { from: [21, 8], to: [21, -8], speed: 0.66 } }
);

/* ---------- 马车 / 草垛 / 木桶 ---------- */
const props = new THREE.Group();
CASTLE.add(props);

[[12.5, 17.5, 0.0], [13.4, 18.4, 0.4], [-13.0, 15.4, 0.2]].forEach(([x, z, r]) => {
  const barrel = POP.makeBarrel(0.34, 0.85);
  barrel.position.set(x, 0, z);
  barrel.rotation.y = r;
  props.add(barrel);
});
[[-11.4, 13.6, 0.5], [-10.8, 14.4, -0.2], [15.8, -14.4, 0.3]].forEach(([x, z, r]) => {
  const crate = POP.makeCrate(0.72);
  crate.position.set(x, 0, z);
  crate.rotation.y = r;
  props.add(crate);
});
[[-20.4, 17.6, 1.0], [17.4, 20.2, 0.85], [19.6, -18.4, 0.9]].forEach(([x, z, r]) => {
  const hay = POP.makeHaystack(r);
  hay.position.set(x, 0, z);
  hay.rotation.y = Math.random() * 3;
  props.add(hay);
});

/* ============================================================
 *  护城河里的小船
 * ========================================================== */
const boats = [];
const MOAT_R = 51.6;
const WATER_Y = -1.5;
const BOAT_DRAFT = 0.2; // 吃水深度（船内底 0.3 高于水线）

function addBoat({ angle, radius = MOAT_R, speed = 0.012, dir = 1, withRower = true }) {
  const boat = POP.makeBoat({ len: 4.6, wid: 1.55, wallH: 0.72, rower: withRower });
  const a = angle;
  boat.position.set(Math.cos(a) * radius, WATER_Y - BOAT_DRAFT, Math.sin(a) * radius);
  // 船首朝向切线方向
  boat.rotation.y = -a + (dir > 0 ? Math.PI : 0);
  CASTLE.add(boat);
  boats.push({
    mesh: boat,
    angle: a,
    radius,
    speed: speed * dir,
    phase: Math.random() * Math.PI * 2,
    baseY: WATER_Y - BOAT_DRAFT,
  });
  return boat;
}

addBoat({ angle: 0.55, speed: 0.013 });
addBoat({ angle: 2.35, speed: 0.011, dir: -1 });
addBoat({ angle: 4.05, speed: 0.009, rower: false });
addBoat({ angle: 5.35, radius: 54.5, speed: 0.008, dir: -1 });

/* 岸边的系船桩 */
for (const a of [0.62, 2.42, 4.12, 5.42]) {
  const post = new THREE.Group();
  const p = cyl(0.16, 0.19, 1.5, 8, woodMaterial(1));
  p.position.y = 0.35;
  post.add(p);
  const ringGeo = new THREE.TorusGeometry(0.14, 0.035, 4, 10);
  const ring = new THREE.Mesh(ringGeo, ironMat);
  ring.position.set(0, 0.75, 0.2);
  post.add(ring);
  post.position.set(Math.cos(a) * 44.6, -0.9, Math.sin(a) * 44.6);
  post.rotation.y = -a;
  CASTLE.add(post);
}

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

/* ============================================================
 *  外环十镇：灯塔港、铁砧矿镇、酒乡、古橡镇、羊毛染坊镇、
 *  云顶修道院、沼泽水乡、雪岭长屋、学者镇、商队集市
 *  装配、剔除与动画都在 expansion.js，这里只负责把需要的东西递进去。
 * ========================================================== */
const _bootT0 = performance.now();
const EXPANSION = EXP.buildExpansion({
  scene, camera, controls, TM, GRASS_Y, registerInteractive, addPerson,
  lampHaloes, torchLights, glowTx, VIL, POP, nature: NATURE, NM,
  tex: { waterTx, cloudTx },
});

console.info(`[boot] 外环十镇装配耗时 ${(performance.now() - _bootT0).toFixed(0)} ms`);

/* ---- 屋顶炊烟 ---- */
const smokePuffs = [];
{
  const smokeMat = new THREE.SpriteMaterial({
    map: glowTx, color: 0xdad2c2, transparent: true, opacity: 0.16,
    depthWrite: false, blending: THREE.NormalBlending, toneMapped: false,
  });
  const smokeTex = TEX.cloudTexture();
  smokeMat.map = smokeTex;

  for (const ch of chimneys) {
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(smokeMat.clone());
      sp.position.set(ch.x, ch.y, ch.z);
      const sc = 1.4 + Math.random() * 1.2;
      sp.scale.setScalar(sc);
      sp.userData.baseScale = sc;
      sp.userData.offset = i / 5;
      sp.userData.chimney = ch;
      village.add(sp);
      smokePuffs.push(sp);
    }
  }
}

/* ---- 环境生命、旧区的鸟群、水轮的水花 ---- */
const AMBIENCE = createAmbience({ scene, camera, controls, isWater: (x, z) => seaDepth(x, z) > -10 });
const OLD_FX = [];     // 旧区的粒子：{ e, x, z }，镜头离得远就不更新
{
  scene.updateMatrixWorld(true);
  const bx = new THREE.Box3();
  const sz = new THREE.Vector3();
  const ct = new THREE.Vector3();
  for (const w of waterWheels) {
    bx.setFromObject(w.wheel);
    bx.getSize(sz);
    bx.getCenter(ct);
    const e = KIT.createEmitter(camera, {
      x: ct.x, y: bx.min.y + 0.35, z: ct.z, count: 22, life: 0.9, size: 0.16, color: 0xdfeef7, opacity: 0.85,
      spread: [Math.max(0.5, sz.x * 0.3), 0.05, Math.max(0.5, sz.z * 0.3)], vel: [0, 1.5, 0], jitter: [0.5, 0.6, 0.5], gravity: 6, fadeIn: 0.04,
    });
    scene.add(e.pts);
    OLD_FX.push({ e, x: ct.x, z: ct.z });
  }
  const flock = (opt) => { const f = NATURE.makeBirdFlock(NM, opt); scene.add(f.group); WILDLIFE.push(f); };
  flock({ count: 9, center: [0, -8], radius: 26, height: 38, color: 0xe8e4da, scale: 0.8 });       // 主楼上空的鸽子
  flock({ count: 8, center: [-118, 132], radius: 32, height: 30, color: 0xf0ece2, scale: 0.8 });   // 镇中心教堂
  flock({ count: 8, center: [-88, -52], radius: 28, height: 26, color: 0xf2eee6, scale: 0.75 });   // 修道院
  flock({ count: 6, center: [-176, 258], radius: 14, height: 12, color: 0x1a1a1e, scale: 1.3 });   // 绞架上的乌鸦
  flock({ count: 5, center: [34, 178], radius: 30, height: 26, color: 0x202024, scale: 1.2 });     // 要塞上空的乌鸦
  flock({ count: 7, center: [34, 456], radius: 38, height: 22, color: 0xf0ece2, scale: 1.2 });     // 渡口镇的河鸥
}

/* ============================================================
 *  交互：拾取 / 相机飞行 / 状态
 * ========================================================== */
const raycaster = new THREE.Raycaster();
function isShown(o) {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}
const pointer = new THREE.Vector2();
let hovered = null;
let selected = null;

const tooltip = document.getElementById('tooltip');
const panel = document.getElementById('panel');
const panelTitle = document.getElementById('panel-title');
const panelTag = document.getElementById('panel-tag');
const panelDesc = document.getElementById('panel-desc');
const panelDetail = document.getElementById('panel-detail');

const camTween = {
  active: false,
  t: 0,
  dur: 1.5,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromTarget: new THREE.Vector3(),
  toTarget: new THREE.Vector3(),
};

function flyTo(pos, target, dur = null) {
  // 飞行时间随距离拉长：近处 1.5 秒，横跨整个世界约 5 秒
  const d = Math.hypot(pos[0] - camera.position.x, pos[2] - camera.position.z);
  camTween.active = true;
  camTween.t = 0;
  camTween.dur = dur ?? THREE.MathUtils.clamp(1.2 + d / 600, 1.5, 5.5);
  camTween.fromPos.copy(camera.position);
  camTween.toPos.set(...pos);
  camTween.fromTarget.copy(controls.target);
  camTween.toTarget.set(...target);
  controls.enabled = false;
}

function openPanel(info) {
  panelTitle.textContent = info.name;
  panelTag.textContent = info.tag;
  panelDesc.textContent = info.desc;
  panelDetail.textContent = info.detail || '';
  panel.classList.add('show');
}

function closePanel() {
  panel.classList.remove('show');
  if (selected) {
    setHighlight(selected, false);
    selected = null;
  }
}

function onPointerMove(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  // Raycaster 不看 visible：被距离剔除的远处建筑也会被射中，要自己滤掉
  const hit = hits.find((h) => isShown(h.object));
  const root = hit ? hit.object.userData.root : null;

  if (root !== hovered) {
    if (hovered && hovered !== selected) setHighlight(hovered, false);
    hovered = root;
    if (hovered) {
      setHighlight(hovered, true);
      tooltip.textContent = hovered.userData.info.name;
      tooltip.classList.add('show');
    } else {
      tooltip.classList.remove('show');
    }
    renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
  }

  if (hovered) {
    tooltip.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
  }
}

function onClick(e) {
  if (!hovered) {
    closePanel();
    return;
  }
  if (selected && selected !== hovered) setHighlight(selected, false);
  selected = hovered;
  setHighlight(selected, true);
  openPanel(selected.userData.info);
  const v = selected.userData.info.view;
  if (v) flyTo(v.pos, v.target);
}

renderer.domElement.addEventListener('pointermove', onPointerMove);

// 记录按下位置，避免拖拽旋转视角时误触发点击
let dragStart = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragStart = { x: e.clientX, y: e.clientY, time: performance.now() };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dragStart) return;
  const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
  const dt = performance.now() - dragStart.time;
  dragStart = null;
  if (moved < 6 && dt < 700) {
    onPointerMove(e); // 用抬起位置重新拾取，避免与移动事件错帧
    onClick(e);
  }
});

/* ============================================================
 *  UI 控件
 * ========================================================== */
const state = {
  night: false,
  dayFactor: 0, // 0 = 白天, 1 = 夜晚
  targetNight: 0,
  gatesOpen: false,
  gateAmount: 0,
  autoRotate: false,
  festival: true,  // 集日：摊位开张、彩旗挂起
  bellT: 0,        // 钟声的余韵计时
  chimeT: 0,       // 距离下次整点钟声
};

const btnNight = document.getElementById('btn-night');
const btnRotate = document.getElementById('btn-rotate');
const btnGate = document.getElementById('btn-gate');
const btnReset = document.getElementById('btn-reset');

btnNight.addEventListener('click', () => {
  state.night = !state.night;
  state.targetNight = state.night ? 1 : 0;
  btnNight.classList.toggle('active', state.night);
  btnNight.querySelector('span').textContent = state.night ? '白昼' : '夜晚';
});

btnRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  controls.autoRotate = state.autoRotate;
  btnRotate.classList.toggle('active', state.autoRotate);
});

btnGate.addEventListener('click', () => {
  state.gatesOpen = !state.gatesOpen;
  btnGate.classList.toggle('active', state.gatesOpen);
  btnGate.querySelector('span').textContent = state.gatesOpen ? '落下闸门' : '升起闸门';
});

btnReset.addEventListener('click', () => {
  closePanel();
  const h = homeFrame();
  flyTo(h.pos, h.target, 1.6);
});

/* ---- 集日开关 ---- */
const btnFest = document.getElementById('btn-festival');
if (btnFest) {
  btnFest.addEventListener('click', () => {
    state.festival = !state.festival;
    btnFest.classList.toggle('active', state.festival);
    btnFest.querySelector('span').textContent = state.festival ? '收起集市' : '开办集市';
    ringBell(3);
  });
  btnFest.querySelector('span').textContent = state.festival ? '收起集市' : '开办集市';
  btnFest.classList.toggle('active', state.festival);
}

// 窗口尺寸变化时，只有在近似初始视角时才重新构图
window.addEventListener('resize', () => {
  if (camera.position.distanceTo(new THREE.Vector3(...HOME.pos)) < 6) {
    const next = homeFrame();
    HOME.pos = next.pos;
    camera.position.set(...next.pos);
    controls.target.set(...next.target);
  }
});

document.getElementById('panel-close').addEventListener('click', closePanel);

// 点击面板内部不触发场景拾取
['pointerdown', 'pointerup', 'pointermove'].forEach((ev) =>
  panel.addEventListener(ev, (e) => e.stopPropagation())
);
document.getElementById('go-there').addEventListener('click', () => {
  if (selected && selected.userData.info.view) {
    const v = selected.userData.info.view;
    flyTo(v.pos, v.target);
  }
});

// 底部地标快捷导航
const SPOTS = {
  keep: keep,
  gate: gateGroup,
  tower: interactiveRoots.find((r) => r.userData.towerName === '西北角塔'),
  well: well,
  hut: huts,
  village: farmsteads,
  town: townPlaza,
  festival: festivalPad,
  craft: craftSpot,
  tourney: tourney,
  priory: priory,
  inn: inn,
  fort: fortress,

  // 十五处外围场景
  ...OUTSKIRTS,

  // 外环十镇：每镇一个总览入口 + 若干地标
  ...EXPANSION.spots,

  // 河东：渡口镇、两座桥、山水
  town2: town2Plaza,
  town2houses: town2Houses,
  bridgeW: bridgeW,
  bridgeE: bridgeE,
};

function gotoSpot(root) {
  if (!root) return;
  if (selected && selected !== root) setHighlight(selected, false);
  hovered = root;
  selected = root;
  setHighlight(root, true);
  openPanel(root.userData.info);
  const v = root.userData.info.view;
  if (v) flyTo(v.pos, v.target);
}

/* ---- 外围场景的分组条：点母场景按钮展开它的五个邻居 ---- */
// 每组十项：前五项是第一圈，后五项是第二圈
const SUB_GROUPS = {
  priory: [
    ['holywell', '圣泉'], ['tithebarn', '谷仓'], ['almshouse', '济贫院'],
    ['masons', '石匠场'], ['hermitage', '隐士居'],
    ['graveyard2', '墓地'], ['abbeymill', '磨坊'], ['sheepfold', '羊圈'],
    ['apiary', '蜂场'], ['ruinchapel', '废教堂'],
  ],
  tourney: [
    ['training', '校场'], ['horsefair', '马市'], ['tourneyfair', '场外集市'],
    ['armorer', '甲胄匠'], ['surgeon', '伤兵帐'],
    ['pasture', '牧马场'], ['archery', '箭术场'], ['timberyard', '木料场'],
    ['saddlery', '马具匠'], ['manor', '骑士宅'],
  ],
  inn: [
    ['ferry', '渡口'], ['shrine', '神龛'], ['campfire', '营地'],
    ['waystation', '货栈'], ['hamlet', '荒村'],
    ['toll', '关卡'], ['watchtower', '瞭望塔'], ['hospital', '病舍'],
    ['millercottage', '水磨人家'], ['gallow', '绞架'],
  ],
};
// 外环十镇：第一层是十个镇，点进某个镇之后第二层换成它的地标（见 showTown）
SUB_GROUPS.towns = EXPANSION.towns.map((t) => [`town:${t.key}`, t.name]);
const spotsSub = document.getElementById('spots-sub');
let openGroup = null;

function makeChip(label, handler, on = false) {
  const b = document.createElement('button');
  b.className = 'spot' + (on ? ' on' : '');
  b.textContent = label;
  b.addEventListener('click', handler);
  spotsSub.appendChild(b);
  return b;
}

/** 点进某个镇之后：左边一个"‹ 十镇"返回，接着是镇名与它的地标 */
function showTown(townKey) {
  const t = EXPANSION.towns.find((x) => x.key === townKey);
  if (!t) return;
  spotsSub.innerHTML = '';
  makeChip('‹ 十镇', () => showGroup('towns'));
  makeChip(t.name, () => gotoSpot(SPOTS[`town:${t.key}`]), true);
  for (const lm of t.landmarks) makeChip(lm.name, () => gotoSpot(SPOTS[lm.key]));
  spotsSub.hidden = false;
}

function showGroup(key) {
  for (const b of document.querySelectorAll('.spot-group')) {
    b.classList.toggle('on', b.dataset.group === key);
  }
  if (!key) {
    spotsSub.hidden = true;
    spotsSub.innerHTML = '';
    openGroup = null;
    return;
  }
  openGroup = key;
  spotsSub.innerHTML = '';
  for (const [id, label] of SUB_GROUPS[key]) {
    const b = document.createElement('button');
    b.className = 'spot';
    b.textContent = label;
    b.dataset.spot = id;
    b.addEventListener('click', () => {
      gotoSpot(SPOTS[id]);
      if (key === 'towns') showTown(id.slice(5));
    });
    spotsSub.appendChild(b);
  }
  spotsSub.hidden = false;
}

for (const b of document.querySelectorAll('.spot-group')) {
  b.addEventListener('click', () => {
    const key = b.dataset.group;
    showGroup(openGroup === key ? null : key);
  });
}

document.querySelectorAll('.spot:not(.spot-group)').forEach((btn) => {
  btn.addEventListener('click', () => {
    gotoSpot(SPOTS[btn.dataset.spot]);
    if (openGroup) showGroup(null);
  });
});

/* ============================================================
 *  小地图：点地标飞过去，点空地飞到那一带的高空
 * ========================================================== */
const MINIMAP = createMinimap({
  canvas: document.getElementById('minimap-canvas'),
  tipEl: document.getElementById('mm-tip'),
  worldR: WORLD_R,
  sea: SEA,
  river: RIVER_PTS,
  roads: ROADS,
  smoothPath,
  towns: EXPANSION.towns,
  places: [
    { key: 'keep', name: '城堡', x: 0, z: 0 }, { key: 'village', name: '村落', x: -22, z: 100 },
    { key: 'town', name: '镇中心', x: -118, z: 130 }, { key: 'craft', name: '工匠区', x: 96, z: 22 },
    { key: 'tourney', name: '比武场', x: 28, z: -112 }, { key: 'priory', name: '修道院', x: -88, z: -52 },
    { key: 'inn', name: '客栈', x: -132, z: 18 }, { key: 'fort', name: '前哨', x: 34, z: 178 },
    { key: 'town2', name: '渡口镇', x: 34, z: 476 },
  ],
  camera,
  controls,
  onPick(pick) {
    if (pick.type === 'town') {
      gotoSpot(SPOTS[`town:${pick.key}`]);
      showGroup('towns');
      showTown(pick.key);
    } else if (pick.type === 'place') {
      gotoSpot(SPOTS[pick.key]);
    } else {
      flyTo([pick.x + 120, 170, pick.z + 170], [pick.x, 0, pick.z]);
    }
  },
});
{
  const btn = document.getElementById('btn-map');
  const box = document.getElementById('minimap');
  btn.addEventListener('click', () => {
    box.classList.toggle('hidden');
    btn.classList.toggle('active', !box.classList.contains('hidden'));
  });
}

/* ============================================================
 *  昼夜参数
 * ========================================================== */
const DAY = {
  skyTop: new THREE.Color(0x2c66ad),
  skyBottom: new THREE.Color(0xa9c9e6),
  fog: new THREE.Color(0xc4d6e6),
  hemiSky: new THREE.Color(0xbfd8ef),
  hemiGround: new THREE.Color(0x4a5038),
  hemiIntensity: 1.15,
  sunColor: new THREE.Color(0xfff0d0),
  sunIntensity: 2.6,
  sunPos: new THREE.Vector3(70, 100, 55),
  fillIntensity: 0.35,
  exposure: 1.0,
};
const NIGHT = {
  skyTop: new THREE.Color(0x050a1c),
  skyBottom: new THREE.Color(0x1b2a45),
  fog: new THREE.Color(0x0e1729),
  hemiSky: new THREE.Color(0x5c77ad),
  hemiGround: new THREE.Color(0x1a2133),
  hemiIntensity: 2.6,
  sunColor: new THREE.Color(0xb9ccff),
  sunIntensity: 3.2,
  sunPos: new THREE.Vector3(-70, 85, -45),
  fillIntensity: 0.55,
  exposure: 1.22,
};

let envIsNight = false;
const tmpColor = new THREE.Color();
const tmpVec = new THREE.Vector3();

/* ============================================================
 *  钟声：整点敲三下，钟体摆动，钟楼顶端泛起一圈暖光
 *  （没有音频，用视觉表达"整点报时"）
 * ========================================================== */
const bellGlows = [];
for (let i = 0; i < 4; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTx, color: 0xffcf88, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  s.scale.setScalar(6);
  s.visible = false;
  scene.add(s);
  bellGlows.push(s);
}

let bellHaloT = 0;

function ringBell(times = 3) {
  state.bellT = Math.max(state.bellT, times * 1.15);
  for (const b of bellRopes) b.amt = 1;
  bellHaloT = Math.max(bellHaloT, times * 1.15);
  if (BELL_POS.lengthSq() > 0) {
    for (let i = 0; i < bellGlows.length; i++) {
      if (BELFREY_GLOW[i]) bellGlows[i].position.copy(BELFREY_GLOW[i]);
      else bellGlows[i].position.copy(BELL_POS);
    }
  }
  const clock = document.getElementById('clock');
  if (clock) {
    clock.classList.add('ringing');
    clearTimeout(ringBell._t);
    ringBell._t = setTimeout(() => clock.classList.remove('ringing'), 1400);
  }
}

function applyTimeOfDay(f) {
  skyUniforms.uTop.value.copy(DAY.skyTop).lerp(NIGHT.skyTop, f);
  skyUniforms.uBottom.value.copy(DAY.skyBottom).lerp(NIGHT.skyBottom, f);
  scene.fog.color.copy(DAY.fog).lerp(NIGHT.fog, f);
  // 雾只作用于陆地远景，不让它吞掉天空
  // 雾的远近跟着翻倍的场地一起推：白天 380→1250，夜里收得更近一些好看
  scene.fog.near = THREE.MathUtils.lerp(560, 280, f);
  scene.fog.far = THREE.MathUtils.lerp(2800, 1500, f);
  renderer.setClearColor(scene.fog.color);

  hemi.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, f);
  hemi.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, f);
  hemi.intensity = THREE.MathUtils.lerp(DAY.hemiIntensity, NIGHT.hemiIntensity, f);

  sun.color.copy(DAY.sunColor).lerp(NIGHT.sunColor, f);
  sun.intensity = THREE.MathUtils.lerp(DAY.sunIntensity, NIGHT.sunIntensity, f);
  // 光的方向随昼夜变；阴影盒跟着相机走，位置由 updateShadowRig 统一摆
  sunDir.copy(DAY.sunPos).lerp(NIGHT.sunPos, f).normalize();
  updateShadowRig(true);
  fill.intensity = THREE.MathUtils.lerp(DAY.fillIntensity, NIGHT.fillIntensity, f);

  renderer.toneMappingExposure = THREE.MathUtils.lerp(DAY.exposure, NIGHT.exposure, f);

  const useNightEnv = f > 0.55;
  if (useNightEnv !== envIsNight) {
    envIsNight = useNightEnv;
    scene.environment = useNightEnv ? envNight : envDay;
  }
  scene.environmentIntensity = THREE.MathUtils.lerp(0.65, 0.28, f);

  stars.material.opacity = f;
  nightAmbient.intensity = f * 0.9;
  moon.material.opacity = f * 0.9;
  moonDisc.material.opacity = f;
  for (const c of clouds) {
    c.material.color.setRGB(1, 1, 1).lerp(new THREE.Color(0x33415e), f);
    c.material.opacity = THREE.MathUtils.lerp(c.userData.baseOpacity ?? 0.6, 0.16, f);
  }
  keepWindows.forEach((m) => (m.emissiveIntensity = f * 2.6));
  lampHaloes.forEach((s) => (s.material.opacity = f * 0.55));

  // userData.gain 用来给个别灯（比如广场路灯）压低亮度，默认 1
  torchLights.forEach((l) => {
    const gain = l.userData.gain ?? 1;
    l.userData.baseIntensity = THREE.MathUtils.lerp(0.0, 60, f) * gain;
    l.distance = THREE.MathUtils.lerp(16, 42, f) * (l.userData.rangeGain ?? 1);
  });
}

/* ============================================================
 *  昼夜作息：镇上的居民到点收摊回家，天亮再回来
 * ========================================================== */
const ROUTINE = {
  homeAt: 0.62,   // dayFactor 超过这个值就收摊往家走
  outAt: 0.32,    // 低于这个值就出门
  walkSpeed: 0.72,
};

function updateRoutine(dt) {
  const f = state.dayFactor;
  const homeT = ROUTINE.homeAt;
  const outT = ROUTINE.outAt;

  for (const p of people) {
    if (!p.home) continue;

    // 懒汉：酒客要等到更晚才走
    const leaveAt = p.lateNight ? homeT + 0.14 : homeT;

    if (p.sched === 'out' && f > leaveAt) p.sched = 'toHome';
    else if (p.sched === 'in' && f < outT) p.sched = 'toWork';
    else if (p.sched === 'toHome' && f < outT) p.sched = 'toWork';

    let tx = null;
    let tz = null;
    let face = 0;

    if (p.sched === 'toHome') {
      tx = p.home.x; tz = p.home.z; face = p.home.face;
    } else if (p.sched === 'toWork') {
      tx = p.work.x; tz = p.work.z; face = p.work.face;
    }

    if (tx === null) {
      // 停在原地：在家就淡出，在外就正常
      p.presence = p.sched === 'in' ? Math.max(0, p.presence - dt * 2.2) : 1;
      if (p.sched === 'in' && p.presence <= 0) p.root.visible = false;
      else p.root.visible = !p.far;
      continue;
    }

    const dx = tx - p.root.position.x;
    const dz = tz - p.root.position.z;
    const d = Math.hypot(dx, dz);

    if (d < 0.35) {
      p.root.position.x = tx;
      p.root.position.z = tz;
      p.facingY = face;
      if (p.sched === 'toHome') {
        p.sched = 'in';
        // 到家就不再绕圈；出门时再还原
        if (p.activity && p.activity.walk) p.activity.walk = null;
      } else {
        p.sched = 'out';
        if (p.activity0) p.activity = p.activity0;
      }
      continue;
    }

    const step = Math.min(d, ROUTINE.walkSpeed * dt);
    p.root.position.x += (dx / d) * step;
    p.root.position.z += (dz / d) * step;
    const want = Math.atan2(dx, dz);
    let diff = want - p.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.root.rotation.y += diff * Math.min(1, dt * 5);

    // 赶路时腿要动起来
    const swing = Math.sin(elapsed * 8 + p.phase) * 0.52;
    p.legL.rotation.x = swing;
    p.legR.rotation.x = -swing;
    p.armL.rotation.x = -swing * 0.5;
    p.body.position.y = Math.abs(Math.sin(elapsed * 8 + p.phase)) * 0.05;
  }
}

/* ============================================================
 *  集市：摊位昼夜开合 + 节庆道具淡入
 * ========================================================== */
function updateFestival(dt) {
  const f = state.dayFactor;

  // 集日：摊位天亮开张、天黑收摊；但彩旗、五月柱、火盆这些节庆陈设
  // 一直留到节庆结束——傍晚点起火盆才是集市最好看的时候
  const wantOpen = state.festival && f < 0.55 ? 1 : 0;
  const festWant = state.festival ? 1 : 0;

  FEST.amount += Math.sign(festWant - FEST.amount) * Math.min(Math.abs(festWant - FEST.amount), dt * 0.7);
  const A = FEST.amount;
  festival.visible = A > 0.004;

  // 所有淡入的材质跟着 A 走；透明材质一定要 invisible 才能真的"消失"，
  // 只把 opacity 归零的话，depthWrite 还会在夜里留下一道暗痕
  const wantTransparent = A < 0.995;
  for (const m of FEST.fadeMats) {
    m.opacity = A;
    m.depthWrite = A > 0.5;
    // transparent 一变就要重编着色器，所以只在真的翻转时打 needsUpdate
    if (m.transparent !== wantTransparent) {
      m.transparent = wantTransparent;
      m.needsUpdate = true;
    }
  }

  // 摊位：布篷卷起 / 放下，货品与苫布交接
  for (const s of stalls) {
    const k = THREE.MathUtils.clamp(wantOpen > s.open ? s.open + dt * 0.9 : s.open - dt * 0.55, 0, 1);
    s.open = k;

    if (s.pivot) {
      // 收摊时布篷卷到后梁上；收到差不多的程度就整片收掉，
      // 免得剩一条几乎侧对镜头的窄布，在阴影里成了一道黑杠
      s.pivot.rotation.x = -(1 - k) * 1.15;
      const show = k > 0.72;
      if (s.cloth) {
        s.cloth.visible = show;
        s.cloth.scale.y = 0.35 + k * 0.65;
      }
      if (s.flap) s.flap.visible = show;
    }
    if (s.goods) s.goods.visible = k > 0.42;
    if (s.cover) {
      const c = 1 - k;
      s.cover.scale.set(1, c, 1);
      s.cover.visible = c > 0.02;
    }
  }

  // 五月柱的彩带慢慢转
  if (FEST.ribbons && A > 0.01) FEST.ribbons.rotation.y = elapsed * 0.22;

  // 火盆：集日期间一直点着，天黑以后烧得更旺；收市才熄
  const brazierFire = A * (0.35 + 0.65 * f);
  for (const b of FEST.braziers) {
    b.fire.material.opacity = brazierFire * 0.95;
    b.fire.visible = brazierFire > 0.02;
    b.light.intensity = brazierFire * 34;
  }

  // 驴车：沿大路从村口赶到广场南侧，然后停稳卸货
  const cart = FEST.cart;
  if (cart) {
    // 从东口的花环拱门底下进来，卸在广场东南角
    const CART_PATH = [
      tat(26, 2.4), tat(20, 2.0), tat(16, 1.6), tat(13.6, 1.2),
    ];
    FEST.cartT = THREE.MathUtils.clamp(FEST.cartT + dt * (state.festival ? 0.022 : -0.05), 0, 1);
    const t = THREE.MathUtils.clamp(FEST.cartT, 0, 1);

    // 分段插值
    const segs = CART_PATH.length - 1;
    const g = Math.min(segs - 1, Math.floor(t * segs));
    const lt = t * segs - g;
    const a = CART_PATH[g];
    const b = CART_PATH[g + 1];
    const x = THREE.MathUtils.lerp(a.x, b.x, lt);
    const z = THREE.MathUtils.lerp(a.z, b.z, lt);
    cart.position.set(x, GRASS_Y, z);

    const moving = t < 0.995;
    // 车头朝 +X，所以模型朝向比路线方向少转 90°
    const heading = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
    cart.rotation.y = heading;

    // 车轮与驴腿
    const spin = moving ? elapsed * 3.4 : 0;
    for (const w of cart.userData.wheels) w.rotation.x = spin;
    const legs = cart.userData.legs;
    for (let i = 0; i < legs.length; i++) {
      legs[i].rotation.x = moving ? Math.sin(elapsed * 6 + i * Math.PI * 0.5) * 0.42 : 0;
    }
    if (cart.userData.donkey) {
      cart.userData.donkey.position.y = moving
        ? Math.abs(Math.sin(elapsed * 6)) * 0.045
        : Math.sin(elapsed * 1.2) * 0.008;
    }
  }
}

/* ============================================================
 *  钟声：整点报时
 * ========================================================== */
const clockEl = document.getElementById('clock');
const handHour = clockEl ? clockEl.querySelector('.hand-hour') : null;
const handMin = clockEl ? clockEl.querySelector('.hand-min') : null;
let clockHour = 7;   // 从早上 7 点开始

function updateBell(dt) {
  state.chimeT += dt;
  // 场景里的"一小时"压缩成 40 秒
  if (state.chimeT > 40) {
    state.chimeT = 0;
    clockHour = (clockHour + 1) % 12;
    ringBell(state.festival ? 4 : 3);
  }

  // 挂钟的两根针
  if (handHour && handMin) {
    const minutes = clockHour * 60 + (state.chimeT / 40) * 60;
    handMin.style.transform = `rotate(${(minutes % 60) * 6}deg)`;
    handHour.style.transform = `rotate(${(minutes / 60 % 12) * 30}deg)`;
  }

  if (state.bellT > 0) state.bellT = Math.max(0, state.bellT - dt);

  // 钟体摆动：三下，每下 1.15 秒
  const swingPhase = (3 * 1.15 - state.bellT) * 2.6;
  const decay = state.bellT > 0 ? Math.min(1, state.bellT / 0.6) : 0;
  for (const b of bellRopes) {
    b.pivot.rotation.x = Math.sin(swingPhase) * 0.26 * decay;
  }

  // 钟室四面的暖光
  if (bellHaloT > 0) {
    bellHaloT = Math.max(0, bellHaloT - dt);
    const k = Math.min(1, bellHaloT / 1.2);
    for (const g of bellGlows) {
      g.material.opacity = k * 0.62;
      g.visible = k > 0.01;
      g.scale.setScalar(6 + (1 - k) * 3);
    }
  } else {
    for (const g of bellGlows) g.visible = false;
  }
}

/* ============================================================
 *  打铁火星
 * ========================================================== */
function updateForgeSparks(dt) {
  // 铁匠天黑就回家了，火星只在白天蹦
  const active = state.dayFactor < 0.5;
  FEST.sparkTimer -= dt;
  if (active && FEST.sparkTimer <= 0 && ANVIL_POS.lengthSq() > 0) {
    FEST.sparkTimer = 0.55 + Math.random() * 0.5;
    const n = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const s = forgeSparks[(FEST.sparkCursor = (FEST.sparkCursor + 1) % forgeSparks.length)];
      s.life = 0.5 + Math.random() * 0.4;
      s.maxLife = s.life;
      s.sprite.position.copy(ANVIL_POS);
      s.sprite.position.y += 0.06;
      s.sprite.material.opacity = 1;
      s.sprite.visible = true;
      s.vel.set(
        (Math.random() - 0.5) * 2.4,
        1.4 + Math.random() * 1.9,
        (Math.random() - 0.5) * 2.4
      );
    }
  }

  for (const s of forgeSparks) {
    if (s.life <= 0) continue;
    s.life -= dt;
    if (s.life <= 0) {
      s.sprite.visible = false;
      s.sprite.material.opacity = 0;
      continue;
    }
    s.vel.y -= 7.5 * dt;
    s.sprite.position.addScaledVector(s.vel, dt);
    const k = s.life / s.maxLife;
    s.sprite.material.opacity = k * k;
    s.sprite.material.color.setHex(k > 0.55 ? 0xffd27a : 0xff7a2e);
  }
}

/* ============================================================
 *  点光源池
 *
 *  全场有六十多盏火把、街灯与火盆。每盏都要进所有材质的逐像素光照
 *  循环，全开着帧率直接掉到个位数。这里改成"只留离镜头最近的一批"：
 *  被隐藏的灯不进光照列表，远处的灯本来就照不到跟前，看不出来。
 *  可见数量固定，材质不会因为灯数变化而重新编译。
 * ========================================================== */
const LIGHT_POOL = IS_SMALL ? 14 : 24;
const _lw = new THREE.Vector3();
let lightPoolTimer = 0;

function updateLightPool() {
  if (!torchLights.length) return;
  const cam = camera.position;
  const scored = [];
  for (const l of torchLights) {
    l.getWorldPosition(_lw);
    scored.push([_lw.distanceToSquared(cam), l]);
  }
  scored.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < scored.length; i++) scored[i][1].visible = i < LIGHT_POOL;
}

/* ============================================================
 *  渲染循环
 * ========================================================== */
const clock = new THREE.Clock();
let elapsed = 0;
let flagTick = 0;
let cullTick = 0;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ---- 动态分辨率：持续掉帧就降一档像素比（1.5 → 1.25 → 1.0），一分钟后再试着升回去 ----
 * 屏幕大（4K / 视网膜）时填充率是瓶颈，场景里 CPU 才 5 毫秒，GPU 却要二十多毫秒；
 * 降像素比比削特效划算得多。 */
const ADAPT = {
  cap: Math.min(window.devicePixelRatio, 1.5), floor: 1.0, cur: Math.min(window.devicePixelRatio, 1.5),
  ema: 16.7, last: performance.now(), slow: 0, raiseAt: 0, warm: performance.now() + 8000,   // 开场八秒在编译着色器、铺场景，掉帧不算数
};
function adaptResolution(now) {
  const d = now - ADAPT.last;
  ADAPT.last = now;
  if (now < ADAPT.warm || d > 250 || document.hidden) { ADAPT.slow = 0; return; }       // 开场 / 切标签页 / 卡顿一下不算
  ADAPT.ema = ADAPT.ema * 0.93 + d * 0.07;
  ADAPT.slow = ADAPT.ema > 19 ? ADAPT.slow + d : 0;
  if (ADAPT.slow > 1800 && ADAPT.cur > ADAPT.floor) {
    ADAPT.cur = Math.max(ADAPT.floor, ADAPT.cur - 0.25);
    renderer.setPixelRatio(ADAPT.cur);
    ADAPT.ema = 16.7; ADAPT.slow = 0;
    ADAPT.raiseAt = now + 60000;
  } else if (now > ADAPT.raiseAt && ADAPT.cur < ADAPT.cap && ADAPT.ema < 18) {
    ADAPT.cur = Math.min(ADAPT.cap, ADAPT.cur + 0.25);
    renderer.setPixelRatio(ADAPT.cur);
    ADAPT.ema = 16.7; ADAPT.raiseAt = now + 60000;
  }
}

function animate() {
  requestAnimationFrame(animate);
  adaptResolution(performance.now());
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // 昼夜过渡
  if (Math.abs(state.dayFactor - state.targetNight) > 0.001) {
    state.dayFactor += Math.sign(state.targetNight - state.dayFactor) * dt * 0.8;
    state.dayFactor = THREE.MathUtils.clamp(state.dayFactor, 0, 1);
    applyTimeOfDay(state.dayFactor);
    renderer.shadowMap.needsUpdate = true;
  }

  // 相机飞行
  if (camTween.active) {
    camTween.t += dt / camTween.dur;
    const k = easeInOutCubic(Math.min(camTween.t, 1));
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, k);
    camera.lookAt(controls.target);
    if (camTween.t >= 1) {
      camTween.active = false;
      controls.enabled = true;
    }
  } else {
    controls.update();
  }

  // 阴影盒跟着注视点走（没动就什么都不做）
  updateShadowRig();

  // 天空、星空、月亮都跟着相机，世界再大也不会穿出天幕
  sky.position.copy(camera.position);
  stars.position.copy(camera.position);
  moon.position.copy(camera.position).add(MOON_OFFSET);
  moonDisc.position.copy(camera.position).addScaledVector(MOON_OFFSET, 0.94);

  // 点光源池：镜头移动后重新挑最近的十几盏，隔几帧算一次就够
  lightPoolTimer -= dt;
  if (lightPoolTimer <= 0) {
    lightPoolTimer = 0.25;
    updateLightPool();
  }

  // 闸门 / 吊桥
  const gateTarget = state.gatesOpen ? 1 : 0;
  if (Math.abs(state.gateAmount - gateTarget) > 0.001) {
    state.gateAmount += Math.sign(gateTarget - state.gateAmount) * dt * 0.7;
    state.gateAmount = THREE.MathUtils.clamp(state.gateAmount, 0, 1);
  }
  if (portcullis) portcullis.position.y = easeInOutCubic(state.gateAmount) * 7.6;
  gateDoors.forEach((p) => {
    p.rotation.y = THREE.MathUtils.lerp(p.userData.base, p.userData.base * 1.28, state.gateAmount);
  });

  // 旗帜（隔帧更新，减轻 CPU 负担）
  flagTick++;
  if (flagTick % 2 === 0)
  for (const f of flags) {
    const pos = f.geometry.attributes.position;
    const base = f.userData.base;
    const w = f.userData.width;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const k = Math.max(0, bx / w);
      const wave =
        Math.sin(elapsed * 4.2 - bx * 1.6 + by * 0.4) * 0.34 * k +
        Math.sin(elapsed * 2.1 - bx * 0.8) * 0.16 * k;
      pos.setZ(i, wave);
      pos.setY(i, by - k * k * 0.22);
    }
    pos.needsUpdate = true;
    f.geometry.computeVertexNormals();
  }

  // 火光闪烁
  for (const t of torchFlames) {
    const n = Math.sin(elapsed * 13 + t.seed) * 0.5 + Math.sin(elapsed * 23.7 + t.seed * 2) * 0.3;
    const s = 1 + n * 0.12;
    t.flame.scale.setScalar((t.flame.userData.baseScale || (t.flame.userData.baseScale = t.flame.scale.x)) * s);
    t.flame.material.opacity = 0.82 + n * 0.18;
    if (t.core) {
      t.core.scale.setScalar((t.core.userData.baseScale || (t.core.userData.baseScale = t.core.scale.x)) * (1 + n * 0.2));
    }
  }
  for (const b of flameBodies) {
    const n = Math.sin(elapsed * 9 + b.seed) * 0.5 + Math.sin(elapsed * 17.3 + b.seed * 3) * 0.5;
    b.mesh.scale.set(1 + n * 0.12, 1 + n * 0.22, 1 + n * 0.12);
    b.mesh.position.y = b.mesh.userData.baseY + n * 0.06;
    b.mesh.rotation.y = elapsed * 1.4 + b.seed;
  }

  for (const l of torchLights) {
    const base = l.userData.baseIntensity ?? 0;
    l.intensity = base * (0.86 + Math.sin(elapsed * 11 + l.id) * 0.09 + Math.sin(elapsed * 27 + l.id) * 0.07);
  }

  // 水面
  waterTx.map.offset.x = elapsed * 0.012;
  waterTx.map.offset.y = elapsed * 0.02;
  waterTx.bump.offset.x = -elapsed * 0.018;
  waterTx.bump.offset.y = elapsed * 0.008;

  // 风车帆 / 水轮
  for (const w of windmills) w.sails.rotation.z = elapsed * w.speed;
  for (const w of waterWheels) w.wheel.rotation.x = elapsed * w.speed;

  EXPANSION.update(dt, elapsed, state.dayFactor);
  AMBIENCE.update(dt, elapsed, state.dayFactor);
  for (const f of OLD_FX) {
    const dx = camera.position.x - f.x;
    const dz = camera.position.z - f.z;
    if (dx * dx + dz * dz < 450 * 450) f.e.update(dt, elapsed, state.dayFactor);
    else f.e.pts.visible = false;
  }
  MINIMAP.update(performance.now());
  if ((cullTick++ & 3) === 0) updateDistanceCull();

  updateRoutine(dt);
  updateFestival(dt);
  updateBell(dt);
  updateForgeSparks(dt);

  // 云
  for (const c of clouds) {
    c.position.x += dt * 0.7;
    // 场地半径翻倍后，云的回绕边界也要跟着推到草地外面
    if (c.position.x > 1900) c.position.x = -1900;
  }

  // 人物：站立呼吸 / 巡逻行走（远方村镇被剔除时 p.skip=true，不必更新）
  for (const p of people) {
    if (p.skip) continue;
    if (p.activity && p.activity.walk) {
      const w = p.activity.walk;
      const dist = Math.max(0.001, Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1]));
      const step = (dt * w.speed) / dist;

      if (p.pause > 0) {
        p.pause -= dt;
      } else {
        p.walkT += step * p.dir;
        if (p.walkT >= 1) {
          p.walkT = 1;
          p.dir = -1;
          p.pause = 1.8;
        } else if (p.walkT <= 0) {
          p.walkT = 0;
          p.dir = 1;
          p.pause = 1.8;
        }
      }

      const k = THREE.MathUtils.clamp(p.walkT, 0, 1);
      const x = THREE.MathUtils.lerp(w.from[0], w.to[0], k);
      const z = THREE.MathUtils.lerp(w.from[1], w.to[1], k);
      p.root.position.x = x;
      p.root.position.z = z;

      const dirSign = p.dir >= 0 ? 1 : -1;
      const targetAngle = Math.atan2(w.to[0] - w.from[0], w.to[1] - w.from[1]) + (dirSign < 0 ? Math.PI : 0);
      let diff = targetAngle - p.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.root.rotation.y += diff * Math.min(1, dt * 6);

      if (p.pause <= 0) {
        const swing = Math.sin(elapsed * 7 + p.phase) * 0.5;
        p.legL.rotation.x = swing;
        p.legR.rotation.x = -swing;
        p.armL.rotation.x = -swing * 0.6;
        p.armR.rotation.x = (p.weapon ? -0.25 : 0) + swing * 0.5;
        p.body.position.y = Math.abs(Math.sin(elapsed * 7 + p.phase)) * 0.045;
      } else {
        p.legL.rotation.x *= 0.9;
        p.legR.rotation.x *= 0.9;
        p.body.position.y = Math.sin(elapsed * 1.9 + p.phase) * 0.012;
      }
    } else {
      // 站立：轻微呼吸 + 偶尔调整重心
      const br = Math.sin(elapsed * 1.7 + p.phase);
      p.body.position.y = br * 0.014;
      p.body.rotation.z = Math.sin(elapsed * 0.9 + p.phase) * 0.012;
      p.root.rotation.y = p.facingY + Math.sin(elapsed * 0.55 + p.phase) * 0.05;
      if (p.weapon) p.armR.rotation.x = -0.25 + br * 0.02;
    }
  }

  // 小船：绕护城河缓慢航行
  for (const b of boats) {
    b.angle += dt * b.speed;
    const x = Math.cos(b.angle) * b.radius;
    const z = Math.sin(b.angle) * b.radius;
    const bob = Math.sin(elapsed * 1.25 + b.phase) * 0.075;
    b.mesh.position.set(x, b.baseY + bob, z);
    b.mesh.rotation.y = -b.angle + (b.speed > 0 ? Math.PI : 0);
    b.mesh.rotation.z = Math.sin(elapsed * 0.95 + b.phase) * 0.03;
    b.mesh.rotation.x = Math.sin(elapsed * 0.8 + b.phase * 1.7) * 0.022;

    // 划桨
    const oars = b.mesh.userData.oars;
    if (oars && oars.length) {
      for (let i = 0; i < oars.length; i++) {
        const sx = i === 0 ? -1 : 1;
        oars[i].rotation.x = Math.sin(elapsed * 1.5 + b.phase) * 0.28 - 0.15;
        oars[i].rotation.y = sx * (0.25 + Math.sin(elapsed * 0.75 + b.phase) * 0.12);
      }
    }
    const rower = b.mesh.userData.rower;
    if (rower) {
      rower.body.rotation.x = Math.sin(elapsed * 1.5 + b.phase) * 0.09 + 0.06;
      rower.armL.rotation.x = -1.1 + Math.sin(elapsed * 1.5 + b.phase) * 0.25;
      rower.armR.rotation.x = -1.1 + Math.sin(elapsed * 1.5 + b.phase + Math.PI) * 0.25;
    }

    // 灯笼随夜色点亮
    const lamp = b.mesh.userData.lantern;
    if (lamp) lamp.material.emissiveIntensity = state.dayFactor * 1.15;
    const lampLight = b.mesh.userData.lanternLight;
    if (lampLight) lampLight.intensity = state.dayFactor * 4.5;
  }

  // 河里拴着的渡船：随水起伏、轻轻横摇
  for (const b of riverBoats) {
    b.mesh.position.y = b.baseY + Math.sin(elapsed * 0.9 + b.phase) * 0.09;
    b.mesh.rotation.z = Math.sin(elapsed * 0.72 + b.phase) * 0.045;
    b.mesh.rotation.x = Math.sin(elapsed * 0.61 + b.phase * 1.4) * 0.03;
  }

  // 水鸟、鱼、虫：各自的 update 只动自己那一群
  for (const w of WILDLIFE) w.update(dt, elapsed, state.dayFactor);

  // 瀑布水雾：缓缓起伏
  if (FALLS && FALLS.userData.mist) {
    for (const m of FALLS.userData.mist) {
      const k = Math.sin(elapsed * 0.6 + m.userData.seed) * 0.5 + 0.5;
      m.position.y = m.userData.base + k * 1.6;
      m.material.opacity = 0.16 + k * 0.2;
    }
    // 三层水帘滚速不同，叠起来才有"水在流"的感觉
    FALLS.userData.fallMats.forEach((fm, i) => {
      if (fm.alphaMap) fm.alphaMap.offset.y = -elapsed * (0.62 + i * 0.24);
    });
  }

  // 羊：低头吃草 / 偶尔抬头
  for (const s of sheep) {
    const k = Math.sin(elapsed * 0.42 + s.phase);
    s.head.rotation.x = 0.45 + k * 0.32;
    s.group.rotation.y = s.baseRot + Math.sin(elapsed * 0.18 + s.phase) * 0.35;
    s.group.position.y = GRASS_Y + Math.max(0, Math.sin(elapsed * 1.3 + s.phase)) * 0.012;
  }

  // 鸡：走走停停地啄食
  for (const c of chickens) {
    const t = elapsed * 0.6 + c.phase;
    c.mesh.position.x = c.home.x + Math.sin(t * 0.7) * 2.2;
    c.mesh.position.z = c.home.y + Math.cos(t * 0.52) * 2.0;
    const heading = Math.atan2(Math.cos(t * 0.7) * 0.7, -Math.sin(t * 0.52) * 0.52);
    c.mesh.rotation.y = heading;
    c.mesh.rotation.x = Math.sin(elapsed * 6 + c.phase) * 0.12;
    c.mesh.position.y = GRASS_Y + Math.abs(Math.sin(elapsed * 5 + c.phase)) * 0.035;
  }

  // 炊烟
  for (const sp of smokePuffs) {
    const ch = sp.userData.chimney;
    const t = (elapsed * 0.16 + sp.userData.offset) % 1;
    sp.position.set(
      ch.x + Math.sin(t * 5 + ch.seed) * (0.4 + t * 1.8) + (state.night ? 0 : 0),
      ch.y + t * 7.5,
      ch.z + Math.cos(t * 4 + ch.seed) * (0.35 + t * 1.6)
    );
    sp.scale.setScalar(sp.userData.baseScale * (0.7 + t * 2.4));
    sp.material.opacity = (1 - t) * (1 - t) * 0.16 * (1 - state.dayFactor * 0.55);
  }

  // 高亮呼吸
  if (hovered) {
    const k = 0.05 + Math.sin(elapsed * 4.5) * 0.022;
    hovered.traverse((o) => {
      if (o.isMesh && o.material && o.material.emissive && o.material.emissive.getHex() === 0xffa04a) {
        o.material.emissiveIntensity = k;
      }
    });
  }

  if (++shadowFrame % 4 === 0) renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
}

/* ============================================================
 *  自适应
 * ========================================================== */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // 面板收起 / 窗口最小化时 h 可能是 0，别把 aspect 写成 Infinity
  if (w > 0 && h > 0) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  renderer.setSize(w || 1, h || 1);
});

/* ============================================================
 *  材质去重
 *
 *  各个 make* 工厂函数各自 new 材质，同色同参数的材质在场景里有上千份。
 *  Three.js 按材质换渲染状态，材质越碎，每个 draw call 的 CPU 开销越大。
 *  这里在场景搭完后把"渲染参数完全相同"的材质并成一份。
 *  运行时会被改动的材质不能合并：透明的（淡入淡出）、带发光色的（窗户 / 灯笼 / 火焰）、
 *  已被拾取注册的（悬停高亮改的是 emissive，已在 registerInteractive 里按建筑共享过）。
 * ========================================================== */
function dedupMaterials() {
  const pickSet = new Set(pickables);
  // 集日的淡入淡出材质 / 发光材质运行时要逐个改 opacity，绝不能并进别的材质
  const skipMats = new Set([...FEST.fadeMats, ...FEST.glowMats]);
  const pool = new Map();
  const texId = (t) => (t ? t.uuid : '');
  let before = 0;
  scene.traverse((o) => {
    if (!o.isMesh || pickSet.has(o)) return;
    const m = o.material;
    if (!m || Array.isArray(m) || m.type !== 'MeshStandardMaterial' || skipMats.has(m)) return;
    if (m.transparent || m.emissive.getHex() !== 0 || m.emissiveMap) return;
    if (m.userData && Object.keys(m.userData).length) return;
    before++;
    const key = [
      m.color.getHex(), m.roughness, m.metalness, m.side, m.flatShading, m.vertexColors,
      m.alphaTest, m.depthWrite, m.envMapIntensity, m.bumpScale, m.normalScale.x, m.normalScale.y,
      texId(m.map), texId(m.normalMap), texId(m.bumpMap), texId(m.roughnessMap),
      texId(m.metalnessMap), texId(m.aoMap), texId(m.alphaMap),
    ].join('|');
    const hit = pool.get(key);
    if (hit) o.material = hit;
    else pool.set(key, m);
  });
  console.info(`[dedupMaterials] ${before} -> ${pool.size}`);
}

/* 启动 */
/* ============================================================
 *  距离剔除
 *
 *  世界扩到 r≈2000 以后，站在一头往另一头看，整个旧世界都在视锥里，
 *  几千次绘制画的是一千多米外只有几个像素的东西。
 *  这里把场景顶层节点（遇到半径 > 150 的大组就下钻一层）按"包围球 + 体量"登记，
 *  离相机太远就整枝关掉：体量越小，关得越早（小屋 600 米，大建筑 1500 米封顶）。
 *  地面、群山这类半径 > 150 的大块头永不剔除；人物自己有作息逻辑，单独处理。
 * ========================================================== */
const cullList = [];
function buildCullList() {
  const skip = new Set([sky, stars, moon, moonDisc, sun, sun.target, hemi, fill, nightAmbient, EXPANSION.world, ...clouds]);
  const box = new THREE.Box3();
  const sph = new THREE.Sphere();
  const peopleRoots = new Set(people.map((p) => p.root));
  const add = (o) => {
    if (skip.has(o) || peopleRoots.has(o) || o.userData.noCull) return;
    if (o.isLight || o.isSprite || o.isPoints || o.isInstancedMesh || o.isCamera) return;
    o.updateMatrixWorld(true);
    box.makeEmpty();
    box.setFromObject(o);
    if (box.isEmpty()) return;
    box.getBoundingSphere(sph);
    if (sph.radius > 150) {
      if (o.isGroup) for (const k of o.children) add(k);
      return;
    }
    cullList.push({
      obj: o, c: sph.center.clone(), r: sph.radius + 24,
      thr: Math.min(1150, 260 + sph.radius * 22),
    });
  };
  for (const o of scene.children) add(o);
}
festival.userData.noCull = true;   // 集日的整组开关由 updateFestival 管
buildCullList();

const _cullV = new THREE.Vector3();
function updateDistanceCull() {
  const cx = camera.position.x;
  const cz = camera.position.z;
  const allow = Math.max(0, camera.position.y - 60) * 0.9;   // 站得高，看得远
  for (const e of cullList) {
    // 站得高的时候，大建筑能看得更远，小零碎却依然看不见：额外的视距按体量折算
    const vis = Math.hypot(cx - e.c.x, cz - e.c.z) - e.r < e.thr + allow * Math.min(1, (e.r / 90) ** 2);
    if (e.obj.visible !== vis) e.obj.visible = vis;
  }
  // 人物：太远就不画（作息里自己会把"在屋里"的人藏起来，所以只管有 home 的以外的人）
  for (const p of people) {
    // 远方村镇的人用的是镇内局部坐标，必须换成世界坐标才能和相机比距离
    p.root.getWorldPosition(_cullV);
    const far = Math.hypot(cx - _cullV.x, cz - _cullV.z) > 380 + allow;
    p.far = far;
    if (!p.home && !p.skip) p.root.visible = !far;
  }
}
updateDistanceCull();

dedupMaterials();
applyTimeOfDay(0);
animate();

// 方便调试 / 外部驱动相机
console.info(`[boot] 首帧前总耗时 ${performance.now().toFixed(0)} ms（自页面导航起）`);
window.__castle = { ADAPT, scene, camera, controls, state, flyTo, applyTimeOfDay, boats, people, THREE, renderer, EXPANSION, SPOTS, gotoSpot };

// 隐藏加载层（不依赖 rAF，后台标签页也能正常收起）
const loaderEl = document.getElementById('loader');
setTimeout(() => loaderEl.classList.add('hide'), 420);
window.addEventListener('pointerdown', () => loaderEl.classList.add('hide'), { once: true });
