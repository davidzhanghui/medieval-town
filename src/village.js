import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  把一棵子树里同材质的网格烘成一个网格
 *  村落里一栋农舍原本有 30+ 个 draw call，合并后只剩 4-6 个
 * ========================================================== */
export function compactGroup(root) {
  root.updateMatrixWorld(true);

  const buckets = new Map();
  const victims = [];

  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4();

  // 标了 keepSeparate 的节点整枝跳过：它自己和它下面所有东西都要单独留着。
  // 注意要连同"子树下面的网格"一起排除——parent 不合并，子网格照样会被拆走。
  // 这一趟必须走 traverse 之后才知道，所以先做一遍，再慢慢办。
  const protectedNodes = new Set();
  root.traverse((o) => {
    if (o.userData && o.userData.keepSeparate) {
      o.traverse((c) => protectedNodes.add(c));
    }
  });

  // 单独保留的网格，也要从它自己的父级往上打标记：
  // 父链上的任何节点都不能被删掉（否则子树跟着消失）
  const protectedAncestors = new Set();
  for (const n of protectedNodes) {
    let p = n.parent;
    while (p) {
      protectedAncestors.add(p);
      p = p.parent;
    }
  }

  root.traverse((o) => {
    // InstancedMesh 的几何体只是"一个实例"，烘进去会丢掉其余实例，必须原样留着
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    const geo = o.geometry;
    if (!geo || !geo.attributes.position) return;
    if (protectedNodes.has(o) || protectedAncestors.has(o)) return;
    // 顶点色材质（山体那种）不能烘：这里合并时会丢掉 color 属性
    if (o.material && o.material.vertexColors) return;

    rel.multiplyMatrices(inv, o.matrixWorld);

    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    // 统一属性集合，否则 mergeGeometries 会拒绝
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    g.clearGroups();
    g.applyMatrix4(rel);

    // 投影与不投影的分开烘，否则平整的田地面会自阴影
    const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}`;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
    buckets.get(key).geos.push(g);
    victims.push(o);
  });

  for (const o of victims) {
    o.parent.remove(o);
    o.geometry.dispose();
  }

  for (const { mat, cast, geos } of buckets.values()) {
    if (!geos.length) continue;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    root.add(mesh);
    for (const g of geos) if (g !== merged) g.dispose();
  }

  return root;
}

/* ============================================================
 *  城外的农舍与田庄
 *  所有构件用主场景传入的材质（M），保持与城堡同一套程序化纹理
 * ========================================================== */

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

/** 三角截面、沿 Z 拉伸的坡屋顶 */
function gable(w, d, h, mat) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ---------------- 农舍 ---------------- */
/**
 * 夯土 + 木筋 + 茅草顶的小农舍
 * 门朝 +Z，返回的 group.userData 里带烟囱口坐标（用于炊烟）
 */
export function makeFarmhouse(M, opt = {}) {
  const { w = 7, d = 5.5, h = 3.1, roofH = 2.9 } = opt;
  const g = new THREE.Group();
  const BASE = 0.5;
  const W2 = w / 2;
  const D2 = d / 2;

  // 石砌墙基
  const plinth = box(w + 0.42, BASE, d + 0.42, M.stone);
  plinth.position.y = BASE / 2;
  g.add(plinth);

  // 夯土墙
  const walls = box(w, h, d, M.plaster);
  walls.position.y = BASE + h / 2;
  g.add(walls);

  // 四角立柱
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(0.26, h, 0.26, M.beam);
      post.position.set(sx * W2, BASE + h / 2, sz * D2);
      g.add(post);
    }
  }

  // 上下两道横梁（前后 + 两侧）
  const railY = [BASE + 0.22, BASE + h - 0.14];
  for (const y of railY) {
    for (const sz of [-1, 1]) {
      const r = box(w + 0.08, 0.17, 0.08, M.beam);
      r.position.set(0, y, sz * (D2 + 0.03));
      g.add(r);
    }
    for (const sx of [-1, 1]) {
      const r = box(0.08, 0.17, d + 0.08, M.beam);
      r.position.set(sx * (W2 + 0.03), y, 0);
      g.add(r);
    }
  }

  // 正面的斜撑
  for (const sx of [-1, 1]) {
    const len = Math.hypot(w * 0.42, h * 0.46);
    const brace = box(0.15, len, 0.07, M.beam);
    brace.position.set(sx * w * 0.27, BASE + h * 0.5, D2 + 0.04);
    brace.rotation.z = sx * Math.atan2(w * 0.42, h * 0.46);
    g.add(brace);
  }

  // 门
  const doorX = -w * 0.22;
  const door = box(1.15, 2.05, 0.14, M.wood);
  door.position.set(doorX, BASE + 1.02, D2 + 0.06);
  g.add(door);
  const frameTop = box(1.42, 0.16, 0.16, M.beam);
  frameTop.position.set(doorX, BASE + 2.13, D2 + 0.07);
  g.add(frameTop);
  for (const sx of [-1, 1]) {
    const jamb = box(0.14, 2.1, 0.16, M.beam);
    jamb.position.set(doorX + sx * 0.63, BASE + 1.05, D2 + 0.07);
    g.add(jamb);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), M.iron);
  knob.position.set(doorX + 0.38, BASE + 1.0, D2 + 0.16);
  g.add(knob);

  // 窗（正面一扇 + 侧面一扇），夜里会亮
  const winFront = box(0.74, 0.66, 0.1, M.window, false);
  winFront.position.set(w * 0.24, BASE + h * 0.62, D2 + 0.06);
  g.add(winFront);
  const winSide = box(0.1, 0.66, 0.74, M.window, false);
  winSide.position.set(W2 + 0.04, BASE + h * 0.62, -d * 0.12);
  g.add(winSide);

  // 窗框与百叶
  // 局部坐标：窗面在 XY 平面、朝 +Z，最后整体平移到墙上并转向
  for (const [wx, wy, wz, ry] of [
    [w * 0.24, BASE + h * 0.62, D2 + 0.05, 0],
    [W2 + 0.05, BASE + h * 0.62, -d * 0.12, Math.PI / 2],
  ]) {
    const frame = new THREE.Group();
    frame.position.set(wx, wy, wz);
    frame.rotation.y = ry;

    const top = box(0.92, 0.1, 0.16, M.beam, false);
    top.position.y = 0.38;
    const bot = box(0.92, 0.1, 0.2, M.beam, false);
    bot.position.y = -0.38;
    frame.add(top, bot);

    // 两扇半开的百叶，贴在窗框两侧
    for (const sx of [-1, 1]) {
      const shutter = new THREE.Group();
      shutter.position.set(sx * 0.46, 0, 0.02);
      shutter.rotation.y = sx * 0.6;
      const sh = box(0.36, 0.76, 0.045, M.beam, false);
      sh.position.x = sx * 0.18;
      shutter.add(sh);
      frame.add(shutter);
    }
    g.add(frame);
  }

  // 茅草屋顶（出檐）
  const roof = gable(w + 1.5, d + 1.2, roofH, M.thatch);
  roof.position.y = BASE + h;
  g.add(roof);

  // 屋脊压条
  const ridge = box(0.34, 0.26, d + 1.3, M.beam);
  ridge.position.y = BASE + h + roofH - 0.02;
  g.add(ridge);

  // 山墙封檐板
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const len = Math.hypot((w + 1.5) / 2, roofH);
      const barge = box(len, 0.16, 0.14, M.beam);
      barge.position.set((sx * (w + 1.5)) / 4, BASE + h + roofH / 2, sz * (d + 1.2) / 2);
      barge.rotation.z = -sx * Math.atan2(roofH, (w + 1.5) / 2);
      g.add(barge);
    }
  }

  // 烟囱
  const chimX = w * 0.3;
  const chimH = roofH + 1.3;
  const chim = box(0.66, chimH, 0.66, M.stone);
  chim.position.set(chimX, BASE + h + chimH / 2 - 0.5, -d * 0.18);
  g.add(chim);
  const chimCap = box(0.82, 0.14, 0.82, M.stone);
  chimCap.position.set(chimX, BASE + h + chimH - 0.55, -d * 0.18);
  g.add(chimCap);

  g.userData.chimney = new THREE.Vector3(chimX, BASE + h + chimH - 0.4, -d * 0.18);
  return g;
}

/* ---------------- 编条篱笆（合并成单个网格） ---------------- */
export function makeFence(M, len, opt = {}) {
  const { h = 1.05 } = opt;
  const g = new THREE.Group();
  const geos = [];
  const push = (w, hh, d, x, y, z, rotZ = 0) => {
    const geo = new THREE.BoxGeometry(w, hh, d);
    if (rotZ) geo.rotateZ(rotZ);
    geo.translate(x, y, z);
    geos.push(geo);
  };

  // 细枝
  const n = Math.max(3, Math.round(len / 0.42));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (len * i) / n;
    const hh = h * (0.88 + Math.random() * 0.2);
    push(0.07, hh, 0.07, x, hh / 2, 0, (Math.random() - 0.5) * 0.07);
  }
  // 横向编织杆
  for (const y of [h * 0.32, h * 0.7]) {
    push(len, 0.06, 0.055, 0, y, 0.045);
    push(len, 0.06, 0.055, 0, y + 0.02, -0.045);
  }
  // 立柱
  const posts = Math.max(2, Math.round(len / 2.4));
  for (let i = 0; i <= posts; i++) {
    const x = -len / 2 + (len * i) / posts;
    push(0.13, h * 1.16, 0.13, x, (h * 1.16) / 2, 0);
  }

  const mesh = new THREE.Mesh(mergeGeometries(geos, false), M.wood);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}

/* ---------------- 农田 ---------------- */
export function makeField(M, w, d) {
  const g = new THREE.Group();

  const soil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.field);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.02;
  soil.receiveShadow = true;
  g.add(soil);

  // 田埂
  const border = 0.34;
  const bMat = M.soilBorder;
  for (const sz of [-1, 1]) {
    const b = box(w, 0.22, border, bMat);
    b.position.set(0, 0.1, (sz * d) / 2);
    g.add(b);
  }
  for (const sx of [-1, 1]) {
    const b = box(border, 0.22, d, bMat);
    b.position.set((sx * w) / 2, 0.1, 0);
    g.add(b);
  }

  // 几道隆起的垄
  const rows = Math.max(3, Math.round(d / 2.6));
  for (let i = 1; i < rows; i++) {
    const r = box(w * 0.94, 0.14, 0.5, M.soilBorder, false);
    r.position.set(0, 0.07, -d / 2 + (d * i) / rows);
    g.add(r);
  }
  return g;
}

/* ---------------- 稻草人 ---------------- */
export function makeScarecrow(M) {
  const g = new THREE.Group();

  const pole = cyl(0.075, 0.09, 2.3, 6, M.wood);
  pole.position.y = 1.15;
  g.add(pole);

  const arm = box(1.7, 0.09, 0.09, M.wood);
  arm.position.y = 1.72;
  g.add(arm);

  // 稻草身体
  const coat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.0, 7), M.straw);
  coat.position.y = 1.3;
  coat.castShadow = true;
  g.add(coat);
  for (const sx of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 6), M.straw);
    sleeve.position.set(sx * 0.7, 1.66, 0);
    sleeve.rotation.z = sx * -1.2;
    g.add(sleeve);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), M.straw);
  head.position.y = 2.12;
  head.castShadow = true;
  g.add(head);

  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.24, 9), M.straw);
  hat.position.y = 2.3;
  g.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.035, 10), M.straw);
  brim.position.y = 2.2;
  g.add(brim);

  return g;
}

/* ---------------- 绵羊 ---------------- */
export function makeSheep(scale = 1) {
  const g = new THREE.Group();
  const wool = new THREE.MeshStandardMaterial({ color: 0xe4ddcc, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a332a, roughness: 0.95 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 8), wool);
  body.scale.set(1, 0.86, 1.5);
  body.position.y = 0.78;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // 背上的毛团，破一下球体的规整感
  for (let i = 0; i < 4; i++) {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.26, 7, 6), wool);
    tuft.position.set((Math.random() - 0.5) * 0.5, 0.95 + Math.random() * 0.14, (Math.random() - 0.5) * 1.0);
    g.add(tuft);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.82, 0.72);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), dark);
  skull.scale.set(1, 1.05, 1.15);
  head.add(skull);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.2), dark);
  snout.position.set(0, -0.05, 0.16);
  head.add(snout);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.09), dark);
    ear.position.set(sx * 0.19, 0.05, -0.02);
    ear.rotation.z = sx * 0.45;
    head.add(ear);
  }
  g.add(head);

  const legGeo = new THREE.BoxGeometry(0.09, 0.42, 0.09);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, dark);
      leg.position.set(sx * 0.24, 0.21, sz * 0.4);
      leg.castShadow = true;
      g.add(leg);
    }
  }

  g.scale.setScalar(scale);
  return { group: g, head };
}

/* ---------------- 板车 ---------------- */
export function makeCart(M) {
  const g = new THREE.Group();

  const bed = box(2.5, 0.16, 1.35, M.wood);
  bed.position.y = 0.72;
  g.add(bed);

  for (const sz of [-1, 1]) {
    const side = box(2.5, 0.42, 0.1, M.wood);
    side.position.set(0, 0.94, (sz * 1.35) / 2);
    g.add(side);
  }
  const back = box(0.1, 0.42, 1.35, M.wood);
  back.position.set(-1.2, 0.94, 0);
  g.add(back);

  // 车轮
  for (const sx of [-1, 1]) {
    const wheel = new THREE.Group();
    const rim = cyl(0.56, 0.56, 0.11, 14, M.beam, true);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);
    for (let i = 0; i < 6; i++) {
      const spoke = box(0.06, 1.0, 0.06, M.beam);
      spoke.rotation.x = (i / 6) * Math.PI;
      wheel.add(spoke);
    }
    wheel.position.set(0.1, 0.56, sx * 0.8);
    g.add(wheel);
  }

  // 车辕
  for (const sz of [-1, 1]) {
    const shaft = box(1.9, 0.09, 0.09, M.wood);
    shaft.position.set(1.9, 0.62, sz * 0.45);
    shaft.rotation.z = 0.07;
    g.add(shaft);
  }

  // 车上装的干草
  const hay = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 6), M.straw);
  hay.scale.set(1.3, 0.55, 0.72);
  hay.position.set(-0.2, 1.05, 0);
  hay.castShadow = true;
  g.add(hay);

  return g;
}

/* ---------------- 柴垛 ---------------- */
export function makeWoodpile(M) {
  const g = new THREE.Group();
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const n = 7 - r;
    for (let i = 0; i < n; i++) {
      const log = cyl(0.11, 0.11, 1.5, 6, M.wood, r === rows - 1);
      log.rotation.z = Math.PI / 2;
      log.position.set(0, 0.13 + r * 0.21, (i - (n - 1) / 2) * 0.24);
      g.add(log);
    }
  }
  return g;
}

/* ---------------- 土路（按折线生成的带状面） ---------------- */
export function makeRoad(M, pts, width = 4.4) {
  const n = pts.length;
  const left = [];
  const right = [];
  let total = 0;
  const lens = [0];

  for (let i = 0; i < n; i++) {
    const cur = new THREE.Vector2(pts[i][0], pts[i][1]);
    const prev = new THREE.Vector2(pts[Math.max(0, i - 1)][0], pts[Math.max(0, i - 1)][1]);
    const next = new THREE.Vector2(pts[Math.min(n - 1, i + 1)][0], pts[Math.min(n - 1, i + 1)][1]);
    const dir = next.clone().sub(prev);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1);
    dir.normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x);
    left.push(cur.clone().addScaledVector(nrm, width / 2));
    right.push(cur.clone().addScaledVector(nrm, -width / 2));
    if (i > 0) {
      total += cur.distanceTo(new THREE.Vector2(pts[i - 1][0], pts[i - 1][1]));
      lens.push(total);
    }
  }

  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i < n; i++) {
    for (const [arr, u] of [[left, 0], [right, 1]]) {
      pos.push(arr[i].x, 0, arr[i].y);
      uv.push(u, lens[i] / 6);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, M.road);
  mesh.receiveShadow = true;
  mesh.position.y = 0.03;
  return mesh;
}

/* ---------------- 农具（握在手里的小道具） ---------------- */
export function makeFarmTool(M, kind = 'pitchfork') {
  const g = new THREE.Group();

  if (kind === 'scythe') {
    const shaft = cyl(0.035, 0.035, 1.75, 5, M.wood);
    shaft.position.y = -0.2;
    g.add(shaft);
    const blade = box(0.09, 0.62, 0.045, M.iron, false);
    blade.position.set(0.02, 0.6, 0.22);
    blade.rotation.x = -1.15;
    g.add(blade);
    const heel = box(0.08, 0.2, 0.08, M.iron, false);
    heel.position.set(0, 0.6, 0.03);
    g.add(heel);
  } else if (kind === 'hoe') {
    const shaft = cyl(0.033, 0.033, 1.5, 5, M.wood);
    shaft.position.y = -0.1;
    g.add(shaft);
    const head = box(0.06, 0.1, 0.3, M.iron, false);
    head.position.set(0, 0.62, 0.12);
    g.add(head);
  } else {
    // 干草叉
    const shaft = cyl(0.033, 0.033, 1.8, 5, M.wood);
    shaft.position.y = -0.15;
    g.add(shaft);
    const bar = box(0.32, 0.05, 0.05, M.iron, false);
    bar.position.y = 0.78;
    g.add(bar);
    for (let i = -1; i <= 1; i++) {
      const tine = box(0.045, 0.34, 0.045, M.iron, false);
      tine.position.set(i * 0.14, 0.95, 0);
      g.add(tine);
    }
  }
  return g;
}

/* ---------------- 鸡 ---------------- */
export function makeChicken(scale = 1) {
  const g = new THREE.Group();
  const feather = new THREE.MeshStandardMaterial({ color: 0xc9a878, roughness: 1 });
  const comb = new THREE.MeshStandardMaterial({ color: 0xa8322a, roughness: 1 });
  const beak = new THREE.MeshStandardMaterial({ color: 0xd8a838, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), feather);
  body.scale.set(1, 0.92, 1.3);
  body.position.y = 0.27;
  body.castShadow = true;
  g.add(body);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 5), feather);
  tail.position.set(0, 0.34, -0.19);
  tail.rotation.x = -1.0;
  g.add(tail);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 6), feather);
  head.position.set(0, 0.42, 0.19);
  g.add(head);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.1), comb);
  crest.position.set(0, 0.5, 0.18);
  g.add(crest);
  const bill = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 4), beak);
  bill.rotation.x = Math.PI / 2;
  bill.position.set(0, 0.41, 0.27);
  g.add(bill);

  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.025), beak);
    leg.position.set(sx * 0.05, 0.08, 0.02);
    g.add(leg);
  }

  g.scale.setScalar(scale);
  return g;
}

/* ---------------- 村口水井 ---------------- */
export function makeVillageWell(M) {
  const g = new THREE.Group();

  const ring = cyl(1.15, 1.3, 1.1, 16, M.stone);
  ring.position.y = 0.55;
  g.add(ring);

  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.95, 16), M.dark);
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 1.06;
  g.add(hole);

  for (const sx of [-1, 1]) {
    const post = box(0.16, 2.1, 0.16, M.wood);
    post.position.set(sx * 1.0, 1.05, 0);
    g.add(post);
  }
  const beam = box(2.2, 0.16, 0.18, M.beam);
  beam.position.y = 2.1;
  g.add(beam);

  const roof = gable(2.6, 1.4, 0.75, M.thatch);
  roof.position.y = 2.16;
  g.add(roof);

  const rope = cyl(0.03, 0.03, 1.1, 5, M.rope);
  rope.position.set(0, 1.5, 0);
  g.add(rope);

  const bucket = cyl(0.24, 0.2, 0.36, 8, M.wood);
  bucket.position.set(0, 0.92, 0);
  g.add(bucket);

  return g;
}
