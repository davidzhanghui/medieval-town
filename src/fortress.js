import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  城外的前哨要塞
 *  石砌望楼 + 木栅围场 + 门楼，建在一小块夯土高台上
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

/**
 * 一圈尖头木桩（合并成一个网格）
 * 在 +Z 一侧留出大门缺口
 */
function palisade(mat, { hx, hz, h = 3.0, gap = 3.2 }) {
  const geos = [];
  const step = 0.52;
  const tr = 0.19;

  const stake = (x, z, ang, hh) => {
    const body = new THREE.CylinderGeometry(tr, tr * 1.06, hh, 6);
    body.translate(x, hh / 2, z);
    geos.push(body);

    const tip = new THREE.ConeGeometry(tr * 1.05, tr * 2.6, 6);
    tip.translate(x, hh + tr * 1.2, z);
    geos.push(tip);
  };

  // 四条边
  const edges = [
    { from: [-hx, -hz], to: [hx, -hz], dir: 'x' },  // 北
    { from: [-hx, hz], to: [hx, hz], dir: 'x', gate: true }, // 南（开门）
    { from: [-hx, -hz], to: [-hx, hz], dir: 'z' },   // 西
    { from: [hx, -hz], to: [hx, hz], dir: 'z' },     // 东
  ];

  for (const e of edges) {
    const len = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]);
    const n = Math.round(len / step);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = e.from[0] + (e.to[0] - e.from[0]) * t;
      const z = e.from[1] + (e.to[1] - e.from[1]) * t;
      if (e.gate && Math.abs(x) < gap / 2 + 0.3) continue;
      const hh = h * (0.92 + Math.random() * 0.12);
      stake(x, z, 0, hh);
    }
  }

  // 两道横撑
  for (const y of [h * 0.34, h * 0.72]) {
    const north = new THREE.BoxGeometry(hx * 2, 0.14, 0.14);
    north.translate(0, y, -hz + 0.28);
    geos.push(north);
    const west = new THREE.BoxGeometry(0.14, 0.14, hz * 2);
    west.translate(-hx + 0.28, y, 0);
    geos.push(west);
    const east = new THREE.BoxGeometry(0.14, 0.14, hz * 2);
    east.translate(hx - 0.28, y, 0);
    geos.push(east);

    // 南面分成两段，避开大门
    for (const sx of [-1, 1]) {
      const segLen = hx - gap / 2;
      const south = new THREE.BoxGeometry(segLen, 0.14, 0.14);
      south.translate(sx * (gap / 2 + segLen / 2), y, hz - 0.28);
      geos.push(south);
    }
  }

  const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ---------------- 石砌望楼 ---------------- */
function watchtower(M, { size = 6.6, height = 12 } = {}) {
  const g = new THREE.Group();
  const S = size;

  const body = box(S, height, S, M.stoneStrong);
  body.position.y = height / 2;
  g.add(body);

  // 束带层
  for (const y of [height * 0.38, height * 0.72]) {
    const band = box(S + 0.36, 0.34, S + 0.36, M.stoneLight);
    band.position.y = y;
    g.add(band);
  }

  // 顶部外挑的城垛平台
  const deck = box(S + 1.5, 0.5, S + 1.5, M.stone);
  deck.position.y = height + 0.25;
  g.add(deck);

  // 城垛
  const merlonMat = M.stoneLight;
  const half = (S + 1.5) / 2 - 0.45;
  for (const sz of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const m = box(1.5, 1.5, 0.9, merlonMat);
      m.position.set(i * half, height + 1.25, sz * half);
      g.add(m);
    }
  }
  for (const sx of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const m = box(0.9, 1.5, 1.5, merlonMat);
      m.position.set(sx * half, height + 1.25, i * half);
      g.add(m);
    }
  }

  // 箭孔
  for (const [fx, fz, ry] of [[0, 1, 0], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, -1, Math.PI]]) {
    for (const y of [height * 0.46, height * 0.66, height * 0.86]) {
      const frame = box(0.5, 1.15, 0.16, M.stoneLight, false);
      frame.position.set(fx * (S / 2 + 0.02), y, fz * (S / 2 + 0.02));
      frame.rotation.y = ry;
      g.add(frame);

      const slit = box(0.16, 0.82, 0.2, M.dark, false);
      slit.position.set(fx * (S / 2 + 0.04), y, fz * (S / 2 + 0.04));
      slit.rotation.y = ry;
      g.add(slit);
    }
  }

  // 门（朝 +Z）
  const doorFrame = box(2.0, 3.0, 0.3, M.stoneLight, false);
  doorFrame.position.set(0, 1.5, S / 2 + 0.05);
  g.add(doorFrame);
  const door = box(1.55, 2.7, 0.18, M.wood);
  door.position.set(0, 1.35, S / 2 + 0.16);
  g.add(door);
  const lintel = box(2.4, 0.34, 0.5, M.stoneLight);
  lintel.position.set(0, 3.2, S / 2 + 0.2);
  g.add(lintel);
  // 门轴铁件
  for (const y of [0.7, 2.1]) {
    const strap = box(1.4, 0.12, 0.1, M.iron, false);
    strap.position.set(0, y, S / 2 + 0.27);
    g.add(strap);
  }

  // 一层的小窗（夜里点亮）
  const win = box(0.62, 0.62, 0.14, M.window, false);
  win.position.set(-S * 0.3, 4.4, S / 2 + 0.06);
  g.add(win);

  // 屋顶旗杆
  const pole = cyl(0.07, 0.07, 4.4, 6, M.iron);
  pole.position.set(0, height + 3.2, 0);
  g.add(pole);

  g.userData.deckY = height + 0.5;
  g.userData.size = S;
  return g;
}

/* ---------------- 门楼（木构） ---------------- */
function gatehouse(M, gap) {
  const g = new THREE.Group();
  const POST_H = 4.2;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(0.42, POST_H, 0.42, M.beam);
      post.position.set(sx * (gap / 2 + 0.3), POST_H / 2, sz * 1.5);
      g.add(post);
    }
    // 斜撑
    const brace = box(0.18, 1.9, 0.18, M.beam);
    brace.position.set(sx * (gap / 2 + 0.9), POST_H * 0.68, 0);
    brace.rotation.z = sx * 0.5;
    g.add(brace);
  }

  const lintel = box(gap + 1.6, 0.42, 0.55, M.beam);
  lintel.position.y = POST_H;
  g.add(lintel);

  const wall = box(gap + 1.2, 1.5, 0.34, M.wood);
  wall.position.y = POST_H + 0.95;
  g.add(wall);

  const roof = new THREE.Mesh(
    (() => {
      const s = new THREE.Shape();
      s.moveTo(-(gap + 2.4) / 2, 0);
      s.lineTo((gap + 2.4) / 2, 0);
      s.lineTo(0, 1.3);
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: 4.6, bevelEnabled: false });
      geo.translate(0, 0, -2.3);
      return geo;
    })(),
    M.thatch
  );
  roof.position.y = POST_H + 1.65;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);

  // 两扇半开的木门
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * (gap / 2), 0, 1.4);
    const leaf = box(gap / 2 - 0.1, 2.9, 0.14, M.wood);
    leaf.position.set(-sx * (gap / 4), 1.45, 0);
    pivot.add(leaf);
    for (const y of [0.8, 2.2]) {
      const band = box(gap / 2 - 0.3, 0.1, 0.08, M.iron, false);
      band.position.set(-sx * (gap / 4), y, 0.1);
      pivot.add(band);
    }
    pivot.rotation.y = sx * 0.95;
    g.add(pivot);
  }

  g.userData.topY = POST_H + 0.6;
  return g;
}

/* ---------------- 整个要塞 ---------------- */
/**
 * 院子地面在本地 y=0（调用方把 group 抬到台顶高度）。
 * RISE_OUT 是高台露出草地的高度，台阶据此从坡脚砌上来。
 */
export const RISE_OUT = 1.9;

export function makeFortress(M, { hx = 15, hz = 13 } = {}) {
  const g = new THREE.Group();

  // 夯土高台：圆角矩形，正好兜住木栅围场，四角不会悬空
  const pad = 2.2;
  const rr = 4.0;
  const W = hx + pad;
  const D = hz + pad;
  const s = new THREE.Shape();
  s.moveTo(-W + rr, -D);
  s.lineTo(W - rr, -D);
  s.quadraticCurveTo(W, -D, W, -D + rr);
  s.lineTo(W, D - rr);
  s.quadraticCurveTo(W, D, W - rr, D);
  s.lineTo(-W + rr, D);
  s.quadraticCurveTo(-W, D, -W, D - rr);
  s.lineTo(-W, -D + rr);
  s.quadraticCurveTo(-W, -D, -W + rr, -D);

  const DEPTH = RISE_OUT + 4.2;
  const plateauGeo = new THREE.ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: false, curveSegments: 6 });
  plateauGeo.rotateX(-Math.PI / 2);
  plateauGeo.translate(0, -DEPTH, 0);
  const plateau = new THREE.Mesh(plateauGeo, M.plateau);
  plateau.castShadow = true;
  plateau.receiveShadow = true;
  g.add(plateau);

  // 台顶草地单独一片（多抬一点点，压住挤出体的顶面，避免共面闪烁）
  const topGeo = new THREE.ShapeGeometry(s, 6);
  topGeo.rotateX(-Math.PI / 2);
  const plateauTop = new THREE.Mesh(topGeo, M.plateauTop);
  plateauTop.position.y = 0.05;
  plateauTop.receiveShadow = true;
  g.add(plateauTop);

  // 上高台的石阶（朝 +Z，对着大门）
  // 每级踏步从坡脚 (y=-RISE_OUT) 一直砌到自己的顶面，不会悬空
  const STEPS = 8;
  const RISE = RISE_OUT / STEPS;
  const TREAD = 0.72;
  const stepStart = hz + 1.6;
  for (let i = 0; i < STEPS; i++) {
    const topY = -RISE * (i + 1);
    const h = RISE_OUT + topY + 0.08;
    const s = box(6, h, TREAD, M.stoneLight);
    s.position.set(0, -RISE_OUT + h / 2, stepStart + i * TREAD);
    g.add(s);
  }
  // 台阶两侧的矮墙
  {
    const LEN = STEPS * TREAD;
    // 侧墙：三角形棱柱，顶面从院子一侧向坡脚往下收
    // 形状局部 y=0 对应地面高度(-RISE_OUT)
    const tri = new THREE.Shape();
    tri.moveTo(0, 0);
    tri.lineTo(LEN, 0);
    tri.lineTo(0, RISE_OUT + 0.9);
    tri.closePath();
    const cheekGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.55, bevelEnabled: false });
    cheekGeo.rotateY(-Math.PI / 2);   // 形状的 X 轴转到世界 +Z
    cheekGeo.translate(0.275, -RISE_OUT, 0);

    for (const sx of [-1, 1]) {
      const cheek = new THREE.Mesh(cheekGeo.clone(), M.stone);
      cheek.castShadow = true;
      cheek.receiveShadow = true;
      cheek.position.set(sx * 3.3, 0, stepStart - TREAD / 2);
      g.add(cheek);
    }
  }

  // 木栅
  g.add(palisade(M.woodDark, { hx, hz }));

  // 四角加粗的角柱
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = cyl(0.3, 0.34, 5.0, 7, M.woodDark);
      post.position.set(sx * hx, 2.5, sz * hz);
      g.add(post);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 7), M.woodDark);
      cap.position.set(sx * hx, 5.3, sz * hz);
      g.add(cap);
    }
  }

  // 门楼：门扇正好落在木栅缺口那条线上，屋顶只微微出挑
  const gh = gatehouse(M, 3.2);
  gh.position.set(0, 0, hz - 1.4);
  g.add(gh);

  // 望楼（靠北，与大门的视线错开）
  const tower = watchtower(M);
  tower.position.set(-4.5, 0, -hz + 4.4);
  g.add(tower);

  // 院里靠西的营房
  const hut = new THREE.Group();
  hut.position.set(hx - 4.6, 0, -1.5);
  hut.rotation.y = -Math.PI / 2;
  {
    const hw = 7.5;
    const hd = 4.6;
    const hh = 2.8;
    const walls = box(hw, hh, hd, M.plaster);
    walls.position.y = hh / 2 + 0.12;
    hut.add(walls);
    const roof = new THREE.Mesh(
      (() => {
        const s = new THREE.Shape();
        s.moveTo(-(hw + 1) / 2, 0);
        s.lineTo((hw + 1) / 2, 0);
        s.lineTo(0, 2.2);
        s.closePath();
        const geo = new THREE.ExtrudeGeometry(s, { depth: hd + 1, bevelEnabled: false });
        geo.translate(0, 0, -(hd + 1) / 2);
        return geo;
      })(),
      M.thatch
    );
    roof.position.y = hh + 0.12;
    roof.castShadow = true;
    hut.add(roof);
    const door = box(1.0, 1.9, 0.12, M.wood);
    door.position.set(-1.6, 1.05, hd / 2 + 0.06);
    hut.add(door);
    const w = box(0.6, 0.6, 0.1, M.window, false);
    w.position.set(1.8, 1.7, hd / 2 + 0.06);
    hut.add(w);
  }
  g.add(hut);

  // 院子中间的火塘
  const firepit = new THREE.Group();
  firepit.position.set(2.2, 0, 1.0);
  {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), M.stoneStrong);
      stone.position.set(Math.cos(a) * 1.25, 0.16, Math.sin(a) * 1.25);
      stone.rotation.set(a, a * 2, 0);
      stone.castShadow = true;
      firepit.add(stone);
    }
    const charred = new THREE.Mesh(new THREE.CircleGeometry(1.1, 12), M.dark);
    charred.rotation.x = -Math.PI / 2;
    charred.position.y = 0.03;
    firepit.add(charred);
  }
  g.add(firepit);

  // 院子里的补给
  const supplies = new THREE.Group();
  for (const [x, z, s] of [[8.2, 5.6, 0.8], [9.4, 4.2, 0.62], [7.4, 4.0, 0.5]]) {
    const crate = box(s, s, s, M.wood);
    crate.position.set(x, s / 2, z);
    crate.rotation.y = Math.random() * 0.6;
    supplies.add(crate);
  }
  for (const [x, z] of [[-8.4, 6.4], [-9.6, 5.2], [-7.9, 4.9]]) {
    const barrel = cyl(0.36, 0.36, 0.9, 10, M.wood);
    barrel.position.set(x, 0.45, z);
    supplies.add(barrel);
  }
  g.add(supplies);

  // 旗杆
  const flagPole = cyl(0.08, 0.1, 7.2, 6, M.iron);
  flagPole.position.set(-hx + 1.6, 3.6, hz - 1.6);
  g.add(flagPole);

  g.userData.tower = tower;
  g.userData.gatehouse = gh;
  g.userData.firepit = firepit;
  g.userData.flagPole = flagPole;
  g.userData.plateauTop = 0.02;
  return g;
}
