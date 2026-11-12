import * as THREE from 'three';
import * as K from './kit.js';
import * as VIL from './village.js';
import * as POP from './population.js';

/* ============================================================
 *  老王国的"热闹化"：在已建好的世界里见缝插针
 *
 *  加：民居与谷仓、桶箱草垛柴堆、灌木野花岩石、果园与散树、
 *  羊群鸡群、赶路和闲聊的行人。
 *
 *  不去改各个建筑模块，而是把已有的网格栅格化成一张占用图（3 米一格），
 *  新东西只放进空格子；道路格子单独标出来，行人沿路走。
 *  所有静态件都是实例化网格或烘合后的房屋，几十次绘制就能换来数百件物品。
 * ========================================================== */

export function buildEnrichment({ scene, TM, GRASS_Y, addPerson, sheep, chickens, chimneys, exclude = [] }) {
  const t0 = performance.now();
  const rand = K.rng(20260);
  const P = K.makePalette(TM);

  /* ---------------- 占用图 ---------------- */
  const CELL = 3;
  const X0 = -520, Z0 = -420, NX = 340, NZ = 400;   // 覆盖 x∈[-520,500]，z∈[-420,780]
  const grid = new Uint8Array(NX * NZ);             // 0 空；1 占用；2 道路
  const ci = (x) => Math.floor((x - X0) / CELL);
  const cj = (z) => Math.floor((z - Z0) / CELL);
  const mark = (x, z, v, rad = 0) => {
    const i0 = ci(x - rad), i1 = ci(x + rad), j0 = cj(z - rad), j1 = cj(z + rad);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (i < 0 || j < 0 || i >= NX || j >= NZ) continue;
      const k = j * NX + i;
      if (v === 2 && grid[k] === 1) continue;
      grid[k] = v;
    }
  };
  const get = (x, z) => {
    const i = ci(x), j = cj(z);
    return i < 0 || j < 0 || i >= NX || j >= NZ ? 1 : grid[j * NX + i];
  };
  const markRect = (b, v) => {
    for (let z = b.min.z; z <= b.max.z + CELL; z += CELL) for (let x = b.min.x; x <= b.max.x + CELL; x += CELL) mark(x, z, v);
  };
  const markEdge = (ax, az, bx, bz, v, rad) => {
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(L / (CELL * 0.8)));
    for (let k = 0; k <= n; k++) mark(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, v, rad);
  };

  scene.updateMatrixWorld(true);
  const roadMaps = new Set([TM.road && TM.road.map].filter(Boolean));
  const ex = new Set();
  for (const e of exclude) e.traverse((o) => ex.add(o));
  const box = new THREE.Box3(), sz = new THREE.Vector3();
  const v3 = new THREE.Vector3(), w3 = new THREE.Vector3();
  const im = new THREE.Matrix4(), wm = new THREE.Matrix4();
  scene.traverse((o) => {
    if (!o.isMesh || ex.has(o)) return;
    const geo = o.geometry;
    if (!geo || !geo.attributes.position) return;
    if (!geo.boundingBox) geo.computeBoundingBox();
    if (o.isInstancedMesh) {
      geo.boundingBox.getSize(sz);
      const rad = Math.min(8, Math.max(sz.x, sz.z) * 0.5 + 1);
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, im);
        wm.multiplyMatrices(o.matrixWorld, im);
        v3.setFromMatrixPosition(wm);
        mark(v3.x, v3.z, 1, rad);
      }
      return;
    }
    box.copy(geo.boundingBox).applyMatrix4(o.matrixWorld);
    box.getSize(sz);
    const span = Math.max(sz.x, sz.z);
    if (sz.y > 50 && span > 100) return;                 // 群山、天幕
    const isRoad = !!(o.material && o.material.map && roadMaps.has(o.material.map));
    const flat = sz.y < 0.9;
    if (span < 60 && !isRoad) { markRect(box, 1); return; }
    // 长条 / 扁平物：沿三角形的边采样
    const pos = geo.attributes.position, idx = geo.index;
    const triN = idx ? idx.count / 3 : pos.count / 3;
    const step = Math.max(1, Math.floor(triN / 6000));
    const val = isRoad ? 2 : 1;
    const rad = isRoad ? 0 : (flat ? 1 : 0);
    for (let t = 0; t < triN; t += step) {
      const ids = idx ? [idx.getX(t * 3), idx.getX(t * 3 + 1), idx.getX(t * 3 + 2)] : [t * 3, t * 3 + 1, t * 3 + 2];
      for (let e = 0; e < 3; e++) {
        v3.fromBufferAttribute(pos, ids[e]).applyMatrix4(o.matrixWorld);
        w3.fromBufferAttribute(pos, ids[(e + 1) % 3]).applyMatrix4(o.matrixWorld);
        if (Math.hypot(v3.x - w3.x, v3.z - w3.z) > 700) continue;
        markEdge(v3.x, v3.z, w3.x, w3.z, val, rad);
      }
    }
  });
  // 道路边缘外扩一格算"路肩"：房子不压路
  const roadCells = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) if (grid[j * NX + i] === 2) roadCells.push([X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL]);

  const free = (x, z, r) => {
    for (let a = -r; a <= r; a += CELL) for (let b = -r; b <= r; b += CELL) {
      if (a * a + b * b > r * r) continue;
      if (get(x + a, z + b) !== 0) return false;
    }
    return true;
  };
  const claim = (x, z, r) => mark(x, z, 1, r);

  /* 禁区：城堡本体、护城河与内庭 */
  const CASTLE_R = 88;
  const blocked = (x, z) => Math.hypot(x, z) < CASTLE_R;
  const tryPlace = (cx, cz, r0, r1, rr, tries = 60) => {
    for (let k = 0; k < tries; k++) {
      const a = rand() * Math.PI * 2;
      const r = r0 + rand() * (r1 - r0);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.9;
      if (blocked(x, z) || Math.hypot(x, z) > 640) continue;
      if (free(x, z, rr)) return [x, z];
    }
    return null;
  };

  /* ---------------- 民居、谷仓、马厩 ---------------- */
  const houseGroup = new THREE.Group();
  houseGroup.name = 'enrich:houses';
  const WASH = [0xe8dcc0, 0xd9c9a0, 0xe4d2b0, 0xcfc1a4, 0xe0d4bc, 0xd5b890];
  const ROOFS = [P.thatch, P.thatch, P.tile, P.slate, P.shingle];
  const centers = [
    [-22, 100, 100, 18], [-118, 130, 110, 24], [96, 22, 80, 12], [34, 476, 110, 16],
    [-88, -52, 70, 8], [28, -112, 70, 8], [-132, 18, 60, 8], [34, 178, 60, 6],
  ];
  const houses = [];
  for (const [cx, cz, R, n] of centers) {
    for (let i = 0; i < n; i++) {
      const kind = rand();
      const big = kind < 0.12;       // 谷仓 / 马厩
      const w = big ? 9 + rand() * 4 : 5 + rand() * 3;
      const d = big ? 12 + rand() * 4 : 5 + rand() * 3;
      const rr = Math.max(w, d) * 0.62 + 2.2;
      const p = tryPlace(cx, cz, 10, R, rr);
      if (!p) continue;
      claim(p[0], p[1], rr);
      const timber = !big && rand() < 0.6;
      const floors = !big && rand() < 0.4 ? 2 : 1;
      const h = K.makeHouse(P, {
        w, d, floors, floorH: 2.5,
        wall: timber ? P.wash(WASH[(rand() * WASH.length) | 0]) : (rand() < 0.5 ? P.stone : P.wash(WASH[(rand() * WASH.length) | 0])),
        base: P.stone, roof: 'gable', roofMat: big ? P.thatch : ROOFS[(rand() * ROOFS.length) | 0],
        timber, jetty: floors > 1 && rand() < 0.6, chimney: !big, windows: big ? 1 : 2,
        door: P.wood, shutter: rand() < 0.5 ? [0x2f5a7a, 0x6a2a2a, 0x3a6a3a][(rand() * 3) | 0] : null, porch: rand() < 0.25,
      });
      // 门朝向聚落中心，加一点随机
      const ry = Math.atan2(cx - p[0], cz - p[1]) + (rand() - 0.5) * 0.7;
      h.position.set(p[0], GRASS_Y, p[1]);
      h.rotation.y = ry;
      houseGroup.add(h);
      houses.push({ x: p[0], z: p[1], ry, w, d, h });
    }
  }
  scene.add(houseGroup);
  VIL.compactGroup(houseGroup);
  houseGroup.updateMatrixWorld(true);
  for (const { h } of houses) {
    if (!h.userData.chimney) continue;
    const c = h.userData.chimney.clone();
    h.localToWorld(c);
    chimneys.push({ x: c.x, y: c.y, z: c.z, seed: rand() * 10, house: null });
  }

  /* ---------------- 实例化小物件 ---------------- */
  const inst = (geo, mat, items, o) => {
    if (!items.length) return;
    const m = K.scatter(geo, mat, items, o);
    m.userData.noBatch = true;
    scene.add(m);
  };
  // 门前小院：桶、箱、草垛、柴堆、花丛
  const barrels = [], crates = [], hay = [], logs = [], bushes = [], flowers = [], rocks = [], pots = [];
  const near = (h, back = false) => {
    const a = h.ry + (back ? Math.PI : 0) + (rand() - 0.5) * 2.4;
    const r = Math.max(h.w, h.d) * 0.62 + 2.5 + rand() * 2.6;
    const x = h.x + Math.sin(a) * r, z = h.z + Math.cos(a) * r;
    return get(x, z) !== 2 && !blocked(x, z) ? [x, z] : null;
  };
  for (const h of houses) {
    const n = 2 + ((rand() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const p = near(h, rand() < 0.4);
      if (!p) continue;
      claim(p[0], p[1], 0.8);
      const k = rand();
      const y = GRASS_Y;
      if (k < 0.2) barrels.push({ x: p[0], y: y + 0.42, z: p[1], s: 0.9 + rand() * 0.3 });
      else if (k < 0.38) crates.push({ x: p[0], y: y + 0.3, z: p[1], ry: rand() * 3, s: 0.8 + rand() * 0.5 });
      else if (k < 0.52) hay.push({ x: p[0], y, z: p[1], s: 0.9 + rand() * 0.7 });
      else if (k < 0.64) logs.push({ x: p[0], y: y + 0.22, z: p[1], ry: rand() * 3 });
      else if (k < 0.74) pots.push({ x: p[0], y, z: p[1], s: 0.8 + rand() * 0.5 });
      else {
        bushes.push({ x: p[0], y: y + 0.4, z: p[1], s: 0.7 + rand() * 0.7 });
        for (let f = 0; f < 5; f++) flowers.push({ x: p[0] + (rand() - 0.5) * 1.6, y: y + 0.14, z: p[1] + (rand() - 0.5) * 1.6, s: 0.12 + rand() * 0.08,
          color: [0xd44a4a, 0xe8c040, 0xf0e8d8, 0xc86aa0, 0x6a8ad8][(rand() * 5) | 0] });
      }
    }
  }
  // 野外灌木、野花丛、岩石
  for (let i = 0; i < 520; i++) {
    const x = X0 + rand() * NX * CELL, z = Z0 + rand() * NZ * CELL;
    if (blocked(x, z) || Math.hypot(x, z) > 640 || !free(x, z, 1.5)) continue;
    claim(x, z, 1.2);
    const k = rand();
    if (k < 0.5) bushes.push({ x, y: GRASS_Y + 0.35, z, s: 0.6 + rand() * 0.9 });
    else if (k < 0.82) {
      const col = [0xd44a4a, 0xe8c040, 0xf0e8d8, 0xc86aa0, 0x6a8ad8][(rand() * 5) | 0];
      for (let f = 0; f < 9; f++) flowers.push({ x: x + (rand() - 0.5) * 3, y: GRASS_Y + 0.14, z: z + (rand() - 0.5) * 3, s: 0.12 + rand() * 0.08, color: col });
    } else rocks.push({ x, y: GRASS_Y + 0.2, z, s: 0.5 + rand() * 1.1, ry: rand() * 6, rx: rand() * 0.5 });
  }
  const white = P.flat(0xffffff, 0.85);
  inst(new THREE.CylinderGeometry(0.34, 0.3, 0.85, 8), P.wood, barrels);
  inst(new THREE.BoxGeometry(0.7, 0.6, 0.7), P.woodDark, crates);
  inst(new THREE.ConeGeometry(0.95, 1.5, 8).translate(0, 0.75, 0), P.flat(0xcdb460, 1), hay);
  inst(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 6).rotateZ(Math.PI / 2), P.woodDark, logs);
  inst(new THREE.CylinderGeometry(0.3, 0.22, 0.55, 8).translate(0, 0.28, 0), P.terracotta, pots);
  inst(new THREE.IcosahedronGeometry(0.8, 0), P.flat(0x3f6a2e, 1, { flatShading: true }), bushes);
  inst(new THREE.SphereGeometry(1, 5, 4), white, flowers);
  inst(new THREE.DodecahedronGeometry(0.8, 0), P.flat(0x8a8a82, 1, { flatShading: true }), rocks);

  /* ---------------- 果园与散树 ---------------- */
  const treeItems = { oak: [], pine: [] };
  const orchards = [[-60, 190], [60, 120], [-190, 90], [130, 60], [-70, -150], [210, 150]];
  const orchardPts = [];
  for (const [ox, oz] of orchards) {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const x = ox + c * 5.2, z = oz + r * 5.6;
      if (blocked(x, z) || !free(x, z, 1.6)) continue;
      claim(x, z, 1.4);
      orchardPts.push([x, z]);
    }
  }
  if (orchardPts.length) {
    const g = K.grove(P, 'oak', orchardPts.map(([x, z]) => [x, z]), { leaf: 0x5f8a3a, trunk: 0x5a4030, scale: [0.55, 0.75], rand });
    g.position.y = GRASS_Y;
    scene.add(g);
    // 地上的落果
    const fruit = orchardPts.flatMap(([x, z]) => [0, 1].map(() => ({ x: x + (rand() - 0.5) * 2.2, y: GRASS_Y + 0.1, z: z + (rand() - 0.5) * 2.2, s: 0.12, color: [0xc8403a, 0xd8b040][(rand() * 2) | 0] })));
    inst(new THREE.SphereGeometry(1, 5, 4), white, fruit);
  }
  const loose = [];
  for (let i = 0; i < 260; i++) {
    const x = X0 + rand() * NX * CELL, z = Z0 + rand() * NZ * CELL;
    if (blocked(x, z) || Math.hypot(x, z) > 640 || !free(x, z, 2.2)) continue;
    claim(x, z, 2);
    loose.push([x, z, rand() < 0.55 ? 'oak' : 'pine']);
  }
  for (const kind of ['oak', 'pine']) {
    const pts = loose.filter((p) => p[2] === kind).map((p) => [p[0], p[1]]);
    if (!pts.length) continue;
    const g = K.grove(P, kind, pts, { leaf: kind === 'oak' ? 0x4a7a32 : 0x2f5a30, trunk: 0x4a3423, scale: [0.8, 1.35], rand });
    g.position.y = GRASS_Y;
    scene.add(g);
  }

  /* ---------------- 牲畜 ---------------- */
  const flocks = [[-120, 168], [90, 160], [-210, 40], [170, 110], [-40, -170], [230, 180], [60, 250]];
  let nSheep = 0;
  for (const [fx, fz] of flocks) {
    for (let i = 0; i < 6; i++) {
      const p = tryPlace(fx, fz, 2, 14, 1.4, 20);
      if (!p) continue;
      claim(p[0], p[1], 1.2);
      const s = K.makeSheepLite(P, { tone: [0xe4ddcc, 0xd8d0c0, 0xf0ece0, 0x8a7a68][(rand() * 4) | 0], scale: 0.9 + rand() * 0.3 });
      s.group.position.set(p[0], GRASS_Y, p[1]);
      s.group.rotation.y = rand() * 6.28;
      s.group.userData.keepSeparate = true;
      scene.add(s.group);
      sheep.push({ ...s, phase: rand() * 10, baseRot: s.group.rotation.y, graze: rand() });
      nSheep++;
    }
  }
  let nChick = 0;
  for (const h of houses) {
    if (rand() > 0.28) continue;
    const p = near(h, true);
    if (!p) continue;
    for (let i = 0; i < 2 + ((rand() * 3) | 0); i++) {
      const ch = VIL.makeChicken(0.85 + rand() * 0.3);
      ch.position.set(p[0] + (rand() - 0.5) * 3, GRASS_Y, p[1] + (rand() - 0.5) * 3);
      ch.rotation.y = rand() * 6.28;
      ch.userData.keepSeparate = true;
      scene.add(ch);
      chickens.push({ mesh: ch, phase: rand() * 10, home: new THREE.Vector2(ch.position.x, ch.position.z) });
      nChick++;
    }
  }

  /* ---------------- 行人 ---------------- */
  const TUNIC = [0x8a6a3a, 0x5e6b3a, 0x7a4630, 0x445a6e, 0x8c7a58, 0x7d1c22, 0x1c3a63, 0x3f5c33, 0x6b3f1a, 0x4a2a52];
  const kinds = [
    () => POP.makeVillager(0.95 + rand() * 0.15),
    () => POP.makePerson({ tabard: TUNIC[(rand() * 10) | 0], helmet: 'hood', weapon: 'none', cape: rand() < 0.5, scale: 0.95 + rand() * 0.1 }),
    () => POP.makePerson({ tabard: TUNIC[(rand() * 10) | 0], helmet: 'none', weapon: 'none', cape: false, scale: 0.85 + rand() * 0.1 }),   // 孩子
    () => POP.makePerson({ tabard: 0x7d1c22, helmet: 'kettle', weapon: 'spear', shield: rand() < 0.5, scale: 1 }),
  ];
  const mk = () => kinds[rand() < 0.62 ? 0 : rand() < 0.5 ? 1 : rand() < 0.5 ? 2 : 3]();
  let nPeople = 0;
  // 沿路行走：挑一个路格，向某方向延伸到路尽头（最多 36 米）
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let i = 0; i < 170 && roadCells.length; i++) {
    const [x, z] = roadCells[(rand() * roadCells.length) | 0];
    if (blocked(x, z)) continue;
    const [dx, dz] = dirs[(rand() * 4) | 0];
    const nrm = Math.hypot(dx, dz);
    let a = 0, b = 0;
    while (a < 36 && get(x - (dx / nrm) * (a + CELL), z - (dz / nrm) * (a + CELL)) === 2) a += CELL;
    while (b < 36 && get(x + (dx / nrm) * (b + CELL), z + (dz / nrm) * (b + CELL)) === 2) b += CELL;
    if (a + b < 12) continue;
    const from = [x - (dx / nrm) * a, z - (dz / nrm) * a], to = [x + (dx / nrm) * b, z + (dz / nrm) * b];
    addPerson(mk(), from[0], GRASS_Y, from[1], 0, { walk: { from, to, speed: 0.55 + rand() * 0.5 } });
    nPeople++;
  }
  // 家门口 / 院子里：闲聊（两三个一组）、干活
  for (const h of houses) {
    if (rand() > 0.55) continue;
    const p = near(h, false);
    if (!p) continue;
    const n = rand() < 0.4 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const face = Math.atan2(h.x - p[0], h.z - p[1]) + Math.PI + (i ? 1.2 : 0) + (rand() - 0.5) * 0.4;
      addPerson(mk(), p[0] + i * 0.9, GRASS_Y, p[1] + i * 0.4, face, 'idle');
      nPeople++;
    }
  }
  // 空地上往返走的人
  for (let i = 0; i < 40; i++) {
    const h = houses[(rand() * houses.length) | 0];
    if (!h) break;
    const p = near(h, false);
    if (!p) continue;
    const ang = rand() * 6.28, L = 8 + rand() * 14;
    const to = [p[0] + Math.cos(ang) * L, p[1] + Math.sin(ang) * L];
    if (get(to[0], to[1]) !== 0 || blocked(to[0], to[1])) continue;
    addPerson(mk(), p[0], GRASS_Y, p[1], 0, { walk: { from: [p[0], p[1]], to, speed: 0.45 + rand() * 0.35 } });
    nPeople++;
  }

  console.info(`[enrich] 路格 ${roadCells.length}； 民居 ${houses.length}，桶箱草垛等 ${barrels.length + crates.length + hay.length + logs.length + pots.length}，灌木/花/石 ${bushes.length}/${flowers.length}/${rocks.length}，果树 ${orchardPts.length}，散树 ${loose.length}，羊 ${nSheep}，鸡 ${nChick}，行人 ${nPeople}，耗时 ${(performance.now() - t0).toFixed(0)} ms`);
  return { houses };
}
