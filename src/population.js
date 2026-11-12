import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  场景里的"人"与"船"
 *  所有模型都是低多边形拼装，尺寸按 1 单位 ≈ 1 米
 * ========================================================== */

const MAT = {
  skin: new THREE.MeshStandardMaterial({ color: 0xc79a72, roughness: 0.85 }),
  mail: new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.55, metalness: 0.65 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb9c0c8, roughness: 0.3, metalness: 0.9 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x5b4029, roughness: 0.9 }),
  darkLeather: new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.95 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.9 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x8d6a3f, roughness: 0.95 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x33353a, roughness: 0.5, metalness: 0.8 }),
  hay: new THREE.MeshStandardMaterial({ color: 0xb99a4e, roughness: 1 }),
};

const TABARDS = [0x7d1c22, 0x1c3a63, 0x3f5c33, 0x6b3f1a, 0x4a2a52];
const TUNICS = [0x8a6a3a, 0x5e6b3a, 0x7a4630, 0x445a6e, 0x8c7a58];

function m(geo, mat, cast = true) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = cast;
  mesh.receiveShadow = false;
  return mesh;
}


/* ============================================================
 *  人物烘焙：把每个"刚性部件"里的碎网格并成 2 个
 *
 *  一个人有十几二十个网格（靴、躯干、罩袍、腰带、肩甲、头盔、武器…），
 *  场景里有一百七十多人，光人物就占了近一半的 draw call。
 *  腿、手臂、躯干各自是一个摆动枢轴，枢轴内部的网格彼此没有相对运动，
 *  所以每个枢轴只需要"哑光"和"金属"两次绘制：颜色烘进顶点色，
 *  粗糙度 / 金属度按材质是否偏金属分成两档。
 *  枢轴 Group 本身与层级保持不变，main.js 里的动画代码不用改。
 * ========================================================== */
const BAKED = {
  matte: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, vertexColors: true }),
  metal: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.8, vertexColors: true }),
};

function bakeRigidPart(pivot, stopAt = null) {
  pivot.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(pivot.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = { matte: [], metal: [] };
  const victims = [];

  const visit = (node) => {
    for (const c of node.children) {
      if (stopAt && stopAt.has(c)) continue;
      // 双面材质（披风）烘进顶点色会丢掉 side，单独留着
      if (c.isMesh && c.material.side === THREE.FrontSide) {
        const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
        for (const name of Object.keys(g.attributes)) {
          if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        }
        g.clearGroups();
        rel.multiplyMatrices(inv, c.matrixWorld);
        g.applyMatrix4(rel);

        const col = c.material.color;
        const n = g.attributes.position.count;
        const colors = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          colors[i * 3] = col.r;
          colors[i * 3 + 1] = col.g;
          colors[i * 3 + 2] = col.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        buckets[c.material.metalness > 0.5 ? 'metal' : 'matte'].push(g);
        victims.push(c);
      }
      visit(c);
    }
  };
  visit(pivot);

  for (const v of victims) {
    v.parent.remove(v);
    v.geometry.dispose();
  }
  for (const key of ['matte', 'metal']) {
    const geos = buckets[key];
    if (!geos.length) continue;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    const mesh = new THREE.Mesh(merged, BAKED[key]);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    pivot.add(mesh);
    for (const g of geos) if (g !== merged) g.dispose();
  }
}

/* ---------------- 士兵 / 平民 ---------------- */
/**
 * @param {object} opt
 *  tabard  罩袍颜色
 *  helmet  'kettle' | 'great' | 'hood' | 'none'
 *  weapon  'spear' | 'halberd' | 'bow' | 'none'
 *  shield  boolean
 *  cape    boolean
 */
export function makePerson(opt = {}) {
  const {
    tabard = TABARDS[0],
    helmet = 'kettle',
    weapon = 'spear',
    shield = false,
    cape = false,
    scale = 1,
  } = opt;

  const root = new THREE.Group();
  const body = new THREE.Group(); // 用于呼吸 / 上下起伏
  root.add(body);

  const tabMat = new THREE.MeshStandardMaterial({ color: tabard, roughness: 0.92 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: TUNICS[(Math.random() * TUNICS.length) | 0], roughness: 0.95 });

  // 腿（髋部枢轴）
  const legGeo = new THREE.BoxGeometry(0.17, 0.66, 0.2);
  legGeo.translate(0, -0.33, 0);
  const legL = new THREE.Group();
  legL.position.set(-0.12, 0.7, 0);
  legL.add(m(legGeo, MAT.darkLeather));
  const legR = new THREE.Group();
  legR.position.set(0.12, 0.7, 0);
  legR.add(m(legGeo, MAT.darkLeather));
  // 靴子
  const bootGeo = new THREE.BoxGeometry(0.19, 0.16, 0.3);
  bootGeo.translate(0, -0.62, 0.05);
  legL.add(m(bootGeo, MAT.darkLeather));
  legR.add(m(bootGeo, MAT.darkLeather));
  body.add(legL, legR);

  // 躯干
  const torso = m(new THREE.BoxGeometry(0.44, 0.56, 0.27), shirtMat);
  torso.position.y = 1.0;
  body.add(torso);

  // 罩袍（略宽的一层）
  const tabardMesh = m(new THREE.BoxGeometry(0.47, 0.66, 0.3), tabMat);
  tabardMesh.position.y = 0.94;
  tabardMesh.scale.z = 1.02;
  body.add(tabardMesh);

  // 腰带
  const belt = m(new THREE.BoxGeometry(0.48, 0.09, 0.31), MAT.leather);
  belt.position.y = 0.78;
  body.add(belt);

  // 肩甲 / 锁甲袖
  const shoulderGeo = new THREE.SphereGeometry(0.13, 8, 6);
  for (const sx of [-1, 1]) {
    const sh = m(shoulderGeo, MAT.mail);
    sh.position.set(sx * 0.24, 1.22, 0);
    sh.scale.set(1, 0.8, 1);
    body.add(sh);
  }

  // 手臂（肩部枢轴）
  const armGeo = new THREE.BoxGeometry(0.12, 0.5, 0.14);
  armGeo.translate(0, -0.25, 0);
  const armL = new THREE.Group();
  armL.position.set(-0.28, 1.2, 0);
  armL.add(m(armGeo, MAT.mail));
  const armR = new THREE.Group();
  armR.position.set(0.28, 1.2, 0);
  armR.add(m(armGeo, MAT.mail));
  body.add(armL, armR);

  // 头 + 头盔
  const head = m(new THREE.SphereGeometry(0.135, 10, 8), MAT.skin);
  head.position.y = 1.44;
  body.add(head);

  if (helmet === 'kettle') {
    const dome = m(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), MAT.steel);
    dome.position.y = 1.47;
    body.add(dome);
    const brim = m(new THREE.CylinderGeometry(0.235, 0.25, 0.03, 14), MAT.steel);
    brim.position.y = 1.44;
    brim.rotation.x = 0.05;
    body.add(brim);
  } else if (helmet === 'great') {
    const helm = m(new THREE.CylinderGeometry(0.155, 0.145, 0.3, 12), MAT.steel);
    helm.position.y = 1.48;
    body.add(helm);
    const crown = m(new THREE.SphereGeometry(0.155, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), MAT.steel);
    crown.position.y = 1.63;
    body.add(crown);
    // 面甲缝 + 呼吸孔
    const slit = m(new THREE.BoxGeometry(0.19, 0.028, 0.02), MAT.iron, false);
    slit.position.set(0, 1.53, 0.15);
    body.add(slit);
    for (const sx of [-1, 1]) {
      const hole = m(new THREE.BoxGeometry(0.03, 0.03, 0.02), MAT.iron, false);
      hole.position.set(sx * 0.05, 1.46, 0.152);
      body.add(hole);
    }
  } else if (helmet === 'hood') {
    const hood = m(new THREE.SphereGeometry(0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), MAT.cloth);
    hood.position.y = 1.46;
    body.add(hood);
    const mantle = m(new THREE.CylinderGeometry(0.2, 0.27, 0.22, 10, 1, true), MAT.cloth);
    mantle.position.y = 1.3;
    body.add(mantle);
  }

  // 披风
  if (cape) {
    const capeGeo = new THREE.PlaneGeometry(0.5, 0.95, 1, 1);
    capeGeo.translate(0, -0.47, 0);
    const capeMesh = m(capeGeo, new THREE.MeshStandardMaterial({
      color: tabard, roughness: 0.95, side: THREE.DoubleSide,
    }));
    capeMesh.position.set(0, 1.24, -0.16);
    capeMesh.rotation.x = 0.12;
    body.add(capeMesh);
  }

  // 武器
  let weaponMesh = null;
  if (weapon === 'spear' || weapon === 'halberd') {
    const g = new THREE.Group();
    const shaft = m(new THREE.CylinderGeometry(0.028, 0.032, 2.35, 6), MAT.wood);
    shaft.position.y = 0;
    g.add(shaft);

    if (weapon === 'spear') {
      const tip = m(new THREE.ConeGeometry(0.055, 0.3, 6), MAT.steel);
      tip.position.y = 1.31;
      g.add(tip);
    } else {
      const blade = m(new THREE.BoxGeometry(0.02, 0.42, 0.24), MAT.steel);
      blade.position.set(0, 1.12, 0.1);
      g.add(blade);
      const spike = m(new THREE.ConeGeometry(0.045, 0.26, 6), MAT.steel);
      spike.position.y = 1.36;
      g.add(spike);
      const hook = m(new THREE.BoxGeometry(0.02, 0.16, 0.16), MAT.steel);
      hook.position.set(0, 0.95, -0.12);
      g.add(hook);
    }

    g.position.set(0.34, 1.05, 0.06);
    weaponMesh = g;
    body.add(g);
    armR.rotation.x = -0.25;
  } else if (weapon === 'bow') {
    const bowGeo = new THREE.TorusGeometry(0.42, 0.022, 5, 14, Math.PI * 1.15);
    const bow = m(bowGeo, MAT.wood);
    bow.rotation.z = Math.PI * 0.42;
    bow.position.set(0.3, 1.0, 0.16);
    body.add(bow);
    armR.rotation.x = -0.45;
  }

  // 盾牌
  if (shield) {
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(-0.21, 0.26);
    shieldShape.lineTo(0.21, 0.26);
    shieldShape.lineTo(0.21, 0.0);
    shieldShape.quadraticCurveTo(0.2, -0.24, 0, -0.34);
    shieldShape.quadraticCurveTo(-0.2, -0.24, -0.21, 0.0);
    shieldShape.closePath();
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, { depth: 0.045, bevelEnabled: false });
    const shieldMesh = m(shieldGeo, tabMat);
    shieldMesh.position.set(-0.36, 1.02, 0.14);
    shieldMesh.rotation.y = 0.22;
    body.add(shieldMesh);

    const boss = m(new THREE.SphereGeometry(0.06, 8, 6), MAT.steel);
    boss.position.set(-0.36, 1.02, 0.2);
    body.add(boss);
    armL.rotation.x = -0.32;
  }

  // 枢轴（腿 / 臂）在 body 下面，烘 body 时要把它们当作边界跳过
  bakeRigidPart(legL);
  bakeRigidPart(legR);
  bakeRigidPart(armL);
  bakeRigidPart(armR);
  bakeRigidPart(body, new Set([legL, legR, armL, armR]));

  root.scale.setScalar(scale);
  root.traverse((o) => {
    if (o.isMesh) o.frustumCulled = true;
  });

  return {
    root,
    body,
    legL,
    legR,
    armL,
    armR,
    weapon: weaponMesh,
    height: 1.75 * scale,
  };
}

/* ---------------- 平民（更简单，用于庭院） ---------------- */
export function makeVillager(scale = 1) {
  const p = makePerson({
    helmet: Math.random() > 0.5 ? 'hood' : 'none',
    weapon: 'none',
    shield: false,
    cape: Math.random() > 0.7,
    scale: scale * (0.92 + Math.random() * 0.1),
    tabard: TUNICS[(Math.random() * TUNICS.length) | 0],
  });
  return p;
}

/* ---------------- 小船 ---------------- */
export function makeBoat({ len = 4.6, wid = 1.6, wallH = 0.72, rower = true } = {}) {
  const g = new THREE.Group();

  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, -len / 2);
  hullShape.bezierCurveTo(wid * 0.58, -len * 0.3, wid * 0.58, len * 0.24, 0, len / 2);
  hullShape.bezierCurveTo(-wid * 0.58, len * 0.24, -wid * 0.58, -len * 0.3, 0, -len / 2);

  // 船体轮廓（可按比例缩放，用于内壁与船底）
  function outline(l, w) {
    const s = new THREE.Shape();
    s.moveTo(0, -l / 2);
    s.bezierCurveTo(w * 0.58, -l * 0.3, w * 0.58, l * 0.24, 0, l / 2);
    s.bezierCurveTo(-w * 0.58, l * 0.24, -w * 0.58, -l * 0.3, 0, -l / 2);
    return s;
  }

  const FLOOR = 0.3; // 内底高度

  // 下半部：实心船底，底面收窄一点，像真有龙骨
  const lowerShape = outline(len, wid);
  const lowerGeo = new THREE.ExtrudeGeometry(lowerShape, { depth: FLOOR, bevelEnabled: false, curveSegments: 12 });
  lowerGeo.rotateX(-Math.PI / 2);
  const lp = lowerGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    if (lp.getY(i) < 0.015) {
      lp.setX(i, lp.getX(i) * 0.62);
      lp.setZ(i, lp.getZ(i) * 0.8);
    }
  }
  lowerGeo.computeVertexNormals();
  g.add(m(lowerGeo, MAT.darkLeather));

  // 上半部：一圈船壳（带挖空），从内底一直到舷缘
  const wallShape = outline(len, wid);
  wallShape.holes.push(outline(len * 0.9, wid * 0.8));
  const wallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: wallH - FLOOR, bevelEnabled: false, curveSegments: 12 });
  wallGeo.rotateX(-Math.PI / 2);
  wallGeo.translate(0, FLOOR - 0.01, 0);
  g.add(m(wallGeo, MAT.wood));

  // 内底铺板，盖住船底与船壳的接缝
  const floorShape = outline(len * 0.88, wid * 0.78);
  const floorGeo = new THREE.ShapeGeometry(floorShape, 12);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = m(floorGeo, MAT.wood, false);
  floor.position.y = FLOOR + 0.005;
  g.add(floor);

  // 坐板
  const BENCH_Y = FLOOR + 0.2;
  for (let i = -1; i <= 1; i++) {
    const bench = m(new THREE.BoxGeometry(wid * 0.86, 0.07, 0.32), MAT.wood);
    bench.position.set(0, BENCH_Y, i * len * 0.2);
    g.add(bench);
  }

  // 船首铁环
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 5, 10), MAT.iron);
  ring.position.set(0, wallH * 0.82, -len * 0.44);
  g.add(ring);

  let oars = [];
  if (rower) {
    // 划桨：桨架在舷缘上，桨身向船外伸出
    for (const sx of [-1, 1]) {
      const oarPivot = new THREE.Group();
      oarPivot.position.set(sx * wid * 0.5, wallH * 0.92, len * 0.12);

      // 桨身：从船舱内侧 0.5 处一直伸到船外 2.2 处
      const shaft = m(new THREE.CylinderGeometry(0.032, 0.042, 2.7, 6), MAT.wood);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.set(sx * 0.85, 0, 0);
      oarPivot.add(shaft);

      const blade = m(new THREE.BoxGeometry(0.56, 0.028, 0.15), MAT.wood);
      blade.position.set(sx * 2.1, 0, 0);
      oarPivot.add(blade);

      // 桨柄（船舱内侧的一小段，深色皮革缠）
      const grip = m(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 6), MAT.darkLeather);
      grip.rotation.z = Math.PI / 2;
      grip.position.set(-sx * 0.4, 0, 0);
      oarPivot.add(grip);

      // 桨架（舷缘上的小木栓）
      const thole = m(new THREE.CylinderGeometry(0.05, 0.055, 0.24, 6), MAT.darkLeather);
      thole.position.set(sx * wid * 0.5, wallH * 0.92, len * 0.06);
      g.add(thole);

      oarPivot.rotation.y = sx * 0.2;
      oarPivot.rotation.z = sx * -0.16;
      g.add(oarPivot);
      oars.push(oarPivot);
    }

    // 船夫（坐在船尾侧坐板上，面朝船首）
    const rowerP = makePerson({ helmet: 'hood', weapon: 'none', shield: false, tabard: 0x5d6b46 });
    // 髋部落在坐板上（腿前伸，身体缩放 0.92）
    rowerP.root.position.set(0, -0.11, len * 0.2);
    rowerP.root.rotation.y = Math.PI;
    rowerP.root.scale.setScalar(0.92);
    rowerP.legL.rotation.x = 1.5;
    rowerP.legR.rotation.x = 1.5;
    rowerP.armL.rotation.x = -1.05;
    rowerP.armR.rotation.x = -1.05;
    g.add(rowerP.root);
    g.userData.rower = rowerP;
  }

  // 船首灯笼：一根小木杆 + 吊环 + 灯身
  const LPX = 0, LPZ = -len * 0.36;
  const post = m(new THREE.CylinderGeometry(0.035, 0.045, 0.85, 6), MAT.darkLeather);
  post.position.set(LPX, wallH + 0.42, LPZ);
  g.add(post);
  const arm = m(new THREE.BoxGeometry(0.04, 0.04, 0.3), MAT.darkLeather);
  arm.position.set(LPX, wallH + 0.82, LPZ + 0.14);
  g.add(arm);

  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.26, 8),
    new THREE.MeshStandardMaterial({ color: 0xffb85c, emissive: 0xffa63a, emissiveIntensity: 0, roughness: 0.6 })
  );
  lantern.position.set(LPX, wallH + 0.6, LPZ + 0.28);
  g.add(lantern);

  const cap = m(new THREE.ConeGeometry(0.14, 0.1, 8), MAT.iron);
  cap.position.set(LPX, wallH + 0.77, LPZ + 0.28);
  g.add(cap);

  const lanternLight = new THREE.PointLight(0xffa04a, 0, 7, 2);
  lanternLight.position.set(LPX, wallH + 0.6, LPZ + 0.28);
  g.add(lanternLight);

  g.userData.lantern = lantern;
  g.userData.lanternLight = lanternLight;
  g.userData.oars = oars;
  g.userData.wallH = wallH;
  return g;
}

/* ---------------- 草垛 / 木桶 / 麻袋（点缀） ---------------- */
export function makeBarrel(r = 0.34, h = 0.85) {
  const g = new THREE.Group();
  const body = m(new THREE.CylinderGeometry(r, r, h, 10), MAT.wood);
  body.position.y = h / 2;
  g.add(body);
  for (const y of [h * 0.25, h * 0.75]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.03, 4, 12), MAT.iron);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = y;
    g.add(hoop);
  }
  return g;
}

export function makeCrate(s = 0.7) {
  const g = new THREE.Group();
  const b = m(new THREE.BoxGeometry(s, s, s), MAT.wood);
  b.position.y = s / 2;
  g.add(b);
  return g;
}

export function makeHaystack(r = 0.9) {
  const g = new THREE.Group();
  const b = m(new THREE.ConeGeometry(r, r * 1.3, 9), MAT.hay);
  b.position.y = r * 0.65;
  g.add(b);
  return g;
}
