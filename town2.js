/**
 * town2.js —— 河东的第二个镇子：渡口镇（Fordham）
 *
 * 与西岸的镇中心同一套构件（town.js 的市集广场、木筋楼、酒馆、铁匠铺、教堂），
 * 但布局不一样：它靠河吃河——广场朝西对着大桥，码头与鱼市沿着河岸一字排开。
 * 构件用主场景传入的材质 M（townMaterials）。
 */

import * as THREE from 'three';

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

const solid = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra });

/* ============================================================
 *  码头：木栈桥 + 系船柱 + 货堆 + 绞盘
 * ========================================================== */
export function makeWharf(M, { len = 16, wide = 4.2 } = {}) {
  const g = new THREE.Group();

  // 栈桥面：一条条横板，缝里露出水面
  const N = Math.round(len / 0.62);
  for (let i = 0; i < N; i++) {
    const plank = box(wide, 0.12, 0.5, i % 3 === 0 ? M.woodDark : M.wood);
    plank.position.set(0, 0.72, -len / 2 + i * 0.62);
    g.add(plank);
  }
  // 底下的纵梁
  for (const sx of [-1, 1]) {
    const beam = box(0.22, 0.24, len, M.timber);
    beam.position.set(sx * (wide / 2 - 0.35), 0.56, 0);
    g.add(beam);
  }
  // 桩：打进水里的圆木
  for (let i = 0; i < 5; i++) {
    const z = -len / 2 + 1.2 + i * (len - 2.4) / 4;
    for (const sx of [-1, 1]) {
      const pile = cyl(0.2, 0.24, 2.6, 7, M.woodDark);
      pile.position.set(sx * (wide / 2 - 0.3), -0.5, z);
      g.add(pile);
      // 桩头的铁箍
      const band = cyl(0.24, 0.24, 0.12, 8, M.iron, false);
      band.position.set(sx * (wide / 2 - 0.3), 0.82, z);
      g.add(band);
    }
  }

  // 系船柱
  for (const [x, z] of [[-wide / 2 + 0.4, len / 2 - 2], [wide / 2 - 0.4, len / 2 - 4.5]]) {
    const bollard = cyl(0.16, 0.2, 0.9, 8, M.woodDark);
    bollard.position.set(x, 1.2, z);
    g.add(bollard);
    const cap = cyl(0.26, 0.26, 0.12, 8, M.iron, false);
    cap.position.set(x, 1.68, z);
    g.add(cap);
  }

  // 货堆：木桶、箱子、麻袋
  for (const [x, z, kind] of [
    [-1.0, 4.2, 'barrel'], [0.6, 4.8, 'crate'], [-0.4, 5.4, 'sack'],
    [1.2, 1.6, 'barrel'], [-1.3, 0.2, 'crate'],
  ]) {
    if (kind === 'barrel') {
      const b = cyl(0.34, 0.36, 0.86, 10, M.wood);
      b.position.set(x, 1.21, z);
      g.add(b);
      for (const y of [0.22, 0.64]) {
        const hoop = cyl(0.37, 0.37, 0.06, 10, M.iron, false);
        hoop.position.set(x, 1.21 - 0.43 + y, z);
        g.add(hoop);
      }
    } else if (kind === 'crate') {
      const c = box(0.78, 0.66, 0.7, M.wood);
      c.position.set(x, 1.11, z);
      g.add(c);
      const lid = box(0.82, 0.06, 0.74, M.woodDark, false);
      lid.position.set(x, 1.46, z);
      g.add(lid);
    } else {
      const s = box(0.6, 0.42, 0.48, solid(0xcbbd9c));
      s.position.set(x, 0.99, z);
      s.rotation.y = 0.3;
      g.add(s);
    }
  }

  // 绞盘：码头东头，卷着缆绳
  {
    const post = box(0.34, 1.5, 0.34, M.timber);
    post.position.set(wide / 2 - 1.0, 1.47, -len / 2 + 3.0);
    g.add(post);
    const drum = cyl(0.34, 0.34, 0.9, 10, M.woodDark);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(wide / 2 - 1.0, 1.9, -len / 2 + 3.0);
    g.add(drum);
    for (const sx of [-1, 1]) {
      const arm = box(0.9, 0.08, 0.08, M.iron, false);
      arm.position.set(wide / 2 - 1.0 + sx * 0.45, 1.9, -len / 2 + 3.0);
      arm.rotation.y = sx * 0.3;
      g.add(arm);
    }
    // 缆绳
    for (let i = 0; i < 9; i++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 4, 12), M.rope);
      coil.rotation.y = Math.PI / 2;
      coil.position.set(wide / 2 - 1.0 + (Math.random() - 0.5) * 0.2, 1.62 + i * 0.02, -len / 2 + 3.0);
      g.add(coil);
    }
  }

  g.userData.deckY = 0.78;
  return g;
}

/* ============================================================
 *  鱼市：一个敞开的木棚，棚下是摆鱼的案子
 * ========================================================== */
export function makeFishMarket(M) {
  const g = new THREE.Group();
  const W = 7.0, D = 4.0, H = 2.9;

  // 铺地
  const floor = box(W + 1.2, 0.1, D + 1.2, M.cobble, false);
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  g.add(floor);

  // 四角立柱 + 后墙
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(0.22, H, 0.22, M.timber);
      post.position.set(sx * (W / 2), H / 2, sz * (D / 2));
      g.add(post);
    }
  }
  const back = box(W, H, 0.2, M.plaster);
  back.position.set(0, H / 2, -D / 2);
  g.add(back);

  // 单坡顶
  const roof = box(W + 1.4, 0.16, D + 1.6, M.slate);
  roof.position.set(0, H + 0.18, 0.1);
  roof.rotation.x = -0.09;
  g.add(roof);
  // 檐口的压条
  const fascia = box(W + 1.5, 0.2, 0.16, M.timber);
  fascia.position.set(0, H - 0.1, D / 2 + 0.75);
  g.add(fascia);

  // 案子：两张长桌，上面摆鱼
  for (const z of [-1.1, 1.0]) {
    const table = box(W - 1.4, 0.12, 0.9, M.wood);
    table.position.set(0, 0.86, z);
    g.add(table);
    for (const sx of [-1, 1]) {
      const leg = box(0.12, 0.84, 0.12, M.timber);
      leg.position.set(sx * (W / 2 - 1.0), 0.42, z);
      g.add(leg);
    }
    // 鱼：一色的青灰小鱼，横七竖八
    const FISH = solid(0x9aa8a4, { roughness: 0.5, metalness: 0.2 });
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), FISH);
      f.scale.set(0.55, 0.6, 1.7);
      f.position.set(-W / 2 + 1.3 + i * 0.52, 0.98, z + (Math.random() - 0.5) * 0.42);
      f.rotation.y = (Math.random() - 0.5) * 0.9;
      f.castShadow = true;
      g.add(f);
    }
    // 案子下的木盆
    const tub = cyl(0.5, 0.44, 0.42, 12, M.woodDark);
    tub.position.set(1.6, 0.21, z + 0.9);
    g.add(tub);
  }

  // 墙上挂的渔网（用交叉细杆近似）
  {
    const NET = solid(0x8a8060, { roughness: 1 });
    for (let i = 0; i < 7; i++) {
      const v = box(0.03, 1.5, 0.03, NET, false);
      v.position.set(-2.4 + i * 0.8, 1.9, -D / 2 + 0.14);
      v.rotation.z = 0.04;
      g.add(v);
    }
    for (let i = 0; i < 5; i++) {
      const h = box(5.4, 0.03, 0.03, NET, false);
      h.position.set(0, 1.2 + i * 0.36, -D / 2 + 0.14);
      g.add(h);
    }
  }

  return g;
}

/* ============================================================
 *  摆渡小屋与渡船：老渡口，桥修好之后还留着
 * ========================================================== */
export function makeFerryLanding(M) {
  const g = new THREE.Group();

  // 小木屋
  {
    const W = 4.0, D = 3.4, H = 2.5;
    const wall = box(W, H, D, M.wood);
    wall.position.set(0, H / 2, 0);
    g.add(wall);
    // 屋顶：两坡
    const roofGeo = new THREE.CylinderGeometry(2.55, 2.55, W + 0.6, 3, 1, false, 0, Math.PI);
    const roof = new THREE.Mesh(roofGeo, M.thatch);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(0, H + 0.35, 0);
    roof.scale.set(1, 1, 0.62);
    roof.castShadow = true;
    g.add(roof);
    const door = box(0.9, 1.9, 0.12, M.woodDark);
    door.position.set(0, 0.95, D / 2 + 0.02);
    g.add(door);
    const win = box(0.7, 0.6, 0.1, M.window, false);
    win.position.set(1.2, 1.6, D / 2 + 0.02);
    win.userData.keepSeparate = true;
    g.add(win);
    const chim = box(0.6, 1.5, 0.6, M.stoneLight);
    chim.position.set(-1.2, H + 0.9, -0.8);
    g.add(chim);
  }

  // 木栈台伸进河里
  {
    for (let i = 0; i < 8; i++) {
      const plank = box(3.2, 0.1, 0.46, i % 2 ? M.woodDark : M.wood);
      plank.position.set(0, 0.6, 2.6 + i * 0.5);
      g.add(plank);
    }
    for (const sx of [-1, 1]) {
      const pile = cyl(0.16, 0.2, 2.2, 6, M.woodDark);
      pile.position.set(sx * 1.3, -0.3, 5.4);
      g.add(pile);
    }
    // 系船的短柱
    const bollard = cyl(0.14, 0.18, 0.7, 7, M.woodDark);
    bollard.position.set(1.3, 1.15, 5.4);
    g.add(bollard);
  }

  return g;
}

/** 一条平底渡船：船身 + 两根桨 + 船头的小灯 */
export function makeFerryBoat(M) {
  const g = new THREE.Group();
  const L = 5.2, W = 1.9, H = 0.6;

  // 船底与船帮：用一圈木板拼出来
  const bottom = box(W * 0.8, 0.14, L * 0.9, M.woodDark);
  bottom.position.y = 0.12;
  g.add(bottom);
  for (const sx of [-1, 1]) {
    const side = box(0.12, H, L * 0.92, M.wood);
    side.position.set(sx * W / 2, H / 2 + 0.1, 0);
    g.add(side);
  }
  for (const sz of [-1, 1]) {
    const end = box(W, H * 0.9, 0.12, M.wood);
    end.position.set(0, H * 0.45 + 0.1, sz * L * 0.46);
    g.add(end);
  }
  // 船内的横座板
  for (const z of [-1.4, 0, 1.4]) {
    const seat = box(W - 0.24, 0.08, 0.32, M.woodDark);
    seat.position.set(0, 0.52, z);
    g.add(seat);
  }
  // 桨
  for (const sx of [-1, 1]) {
    const oar = box(0.07, 0.07, 2.6, M.woodDark);
    oar.position.set(sx * (W / 2 + 0.15), 0.5, -0.2);
    oar.rotation.y = sx * 0.24;
    oar.rotation.x = 0.12;
    g.add(oar);
  }
  // 船头的小灯
  {
    const post = cyl(0.05, 0.05, 0.9, 5, M.iron, false);
    post.position.set(0, 1.0, L / 2 - 0.4);
    g.add(post);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), M.lanternGlass);
    glass.userData.keepSeparate = true;
    glass.position.set(0, 1.5, L / 2 - 0.4);
    g.add(glass);
  }

  g.userData.deckY = 0.42;
  return g;
}

/* ============================================================
 *  河畔货栈：大屋面 + 卸货门 + 吊臂
 * ========================================================== */
export function makeRiversideWarehouse(M) {
  const g = new THREE.Group();
  const W = 11.0, D = 8.0, H = 5.6;

  // 石基
  const base = box(W + 0.8, 0.6, D + 0.8, M.stoneLight);
  base.position.y = 0.3;
  g.add(base);

  // 墙体：下石上木
  const lower = box(W, 2.2, D, M.stone);
  lower.position.y = 0.6 + 1.1;
  g.add(lower);
  const upper = box(W, H - 2.2, D, M.timber);
  upper.position.y = 0.6 + 2.2 + (H - 2.2) / 2;
  g.add(upper);

  // 两坡顶（脊沿 X）
  {
    const shape = new THREE.Shape();
    const span = D + 1.6;
    shape.moveTo(-span / 2, 0);
    shape.lineTo(span / 2, 0);
    shape.lineTo(0, 3.0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: W + 1.2, bevelEnabled: false });
    geo.translate(0, 0, -(W + 1.2) / 2);
    geo.rotateY(Math.PI / 2);
    const roof = new THREE.Mesh(geo, M.tile);
    roof.position.set(0, 0.6 + H, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    g.add(roof);
  }

  // 卸货门：二楼正面一扇大平门 + 上方的吊臂
  {
    const door = box(2.6, 2.4, 0.14, M.woodDark);
    door.position.set(-1.5, 0.6 + 3.4, D / 2 + 0.04);
    g.add(door);
    // 门框
    for (const sx of [-1, 1]) {
      const f = box(0.18, 2.6, 0.2, M.timber);
      f.position.set(-1.5 + sx * 1.4, 0.6 + 3.4, D / 2 + 0.06);
      g.add(f);
    }
    // 吊臂与滑轮
    const jib = box(0.16, 0.16, 2.6, M.timber);
    jib.position.set(-1.5, 0.6 + H - 0.2, D / 2 + 1.1);
    jib.rotation.x = -0.22;
    g.add(jib);
    const pulley = cyl(0.14, 0.14, 0.1, 8, M.iron, false);
    pulley.rotation.z = Math.PI / 2;
    pulley.position.set(-1.5, 0.6 + H - 0.62, D / 2 + 2.2);
    g.add(pulley);
    const rope = cyl(0.02, 0.02, 2.4, 4, M.rope, false);
    rope.position.set(-1.5, 0.6 + H - 1.8, D / 2 + 2.2);
    g.add(rope);
  }

  // 一层的货门与窗
  {
    const door = box(2.0, 2.2, 0.12, M.woodDark);
    door.position.set(2.4, 0.6 + 1.1, D / 2 + 0.04);
    g.add(door);
    for (const x of [-3.6, 3.6]) {
      const win = box(0.8, 0.7, 0.1, M.window, false);
      win.position.set(x, 0.6 + 3.6, D / 2 + 0.04);
      win.userData.keepSeparate = true;
      g.add(win);
    }
  }

  // 门口的货堆
  {
    for (const [x, z, s] of [[3.0, D / 2 + 1.2, 0.8], [4.0, D / 2 + 1.0, 0.7], [3.5, D / 2 + 1.9, 0.6]]) {
      const c = box(s, s * 0.85, s, M.wood);
      c.position.set(x, 0.6 + s * 0.43, z);
      c.rotation.y = Math.random() * 0.4;
      g.add(c);
    }
    const tarp = box(2.2, 0.5, 1.6, solid(0xb0a890, { roughness: 1 }));
    tarp.position.set(-3.4, 0.9, D / 2 + 1.4);
    tarp.rotation.y = 0.2;
    g.add(tarp);
  }

  return g;
}

/* ============================================================
 *  河畔石阶：从镇子走到水边的一段台阶
 * ========================================================== */
export function makeRiverSteps(M, { w = 6.0, steps = 7 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < steps; i++) {
    const h = 0.16 * (steps - i);
    const st = box(w, h, 0.72, i % 2 ? M.stoneLight : M.stone);
    st.position.set(0, h / 2, -i * 0.72);
    g.add(st);
  }
  // 两侧的矮墙
  for (const sx of [-1, 1]) {
    const side = box(0.4, 0.9, steps * 0.72, M.stoneStrong);
    side.position.set(sx * (w / 2 + 0.2), 0.45, -(steps - 1) * 0.36);
    g.add(side);
  }
  // 水边的洗衣石
  const wash = box(2.4, 0.18, 1.4, M.stoneLight);
  wash.position.set(0, 0.28, -steps * 0.72 - 0.6);
  wash.rotation.x = -0.06;
  g.add(wash);
  return g;
}

/* ============================================================
 *  水车与磨坊（镇子的第二座水磨，靠河）
 * ========================================================== */
export function makeRiverMill(M) {
  const g = new THREE.Group();
  const W = 7.0, D = 6.0, H = 4.6;

  const base = box(W + 0.6, 0.5, D + 0.6, M.stoneLight);
  base.position.y = 0.25;
  g.add(base);

  const wall = box(W, H, D, M.stone);
  wall.position.y = 0.5 + H / 2;
  g.add(wall);

  // 两坡顶（脊沿 X）
  {
    const shape = new THREE.Shape();
    const span = D + 1.2;
    shape.moveTo(-span / 2, 0);
    shape.lineTo(span / 2, 0);
    shape.lineTo(0, 2.6);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: W + 1.0, bevelEnabled: false });
    geo.translate(0, 0, -(W + 1.0) / 2);
    geo.rotateY(Math.PI / 2);
    const roof = new THREE.Mesh(geo, M.slate);
    roof.position.set(0, 0.5 + H, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    g.add(roof);
  }

  // 水轮：挂在西侧（朝河），下半浸在水里
  {
    const R = 2.3;
    const wheel = new THREE.Group();
    wheel.position.set(-W / 2 - 0.9, 2.0, 0);
    for (const dz of [-0.5, 0.5]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.1, 5, 20), M.woodDark);
      rim.rotation.y = Math.PI / 2;
      rim.position.z = dz;
      rim.castShadow = true;
      wheel.add(rim);
      for (let i = 0; i < 6; i++) {
        const sp = box(0.08, R * 2 - 0.24, 0.08, M.woodDark);
        sp.position.z = dz;
        sp.rotation.x = (i / 6) * Math.PI;
        wheel.add(sp);
      }
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const paddle = box(0.9, 0.06, 1.1, M.wood);
      paddle.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      paddle.rotation.z = a;
      wheel.add(paddle);
    }
    wheel.userData.isMillWheel = true;
    g.add(wheel);
    g.userData.wheel = wheel;
  }

  // 门与窗
  const door = box(1.2, 2.1, 0.14, M.woodDark);
  door.position.set(1.0, 1.55, D / 2 + 0.03);
  g.add(door);
  for (const x of [-1.8, 2.4]) {
    const win = box(0.7, 0.7, 0.1, M.window, false);
    win.position.set(x, 3.4, D / 2 + 0.03);
    win.userData.keepSeparate = true;
    g.add(win);
  }

  // 烟囱
  const chim = box(0.7, 1.8, 0.7, M.stoneLight);
  chim.position.set(-2.2, 0.5 + H + 1.4, -1.6);
  g.add(chim);

  return g;
}

/* ============================================================
 *  镇门：从桥进镇的一道石拱门
 * ========================================================== */
export function makeTownGate(M) {
  const g = new THREE.Group();
  const W = 8.4, H = 6.2;

  // 两侧方墩
  for (const sx of [-1, 1]) {
    const pier = box(1.6, H, 2.2, M.stone);
    pier.position.set(sx * (W / 2 - 0.8), H / 2, 0);
    g.add(pier);
    // 压顶
    const cap = box(1.9, 0.3, 2.5, M.stoneLight);
    cap.position.set(sx * (W / 2 - 0.8), H + 0.15, 0);
    g.add(cap);
    // 墩上的小雉堞
    for (let i = -1; i <= 1; i++) {
      const merlon = box(0.5, 0.55, 0.5, M.stone);
      merlon.position.set(sx * (W / 2 - 0.8) + i * 0.62, H + 0.55, 0.7);
      g.add(merlon);
    }
  }

  // 上部：横梁 + 半圆券
  {
    const lintel = box(W, 1.2, 2.0, M.stone);
    lintel.position.set(0, H - 0.6, 0);
    g.add(lintel);
    // 券：一圈楔石
    const R = (W - 3.2) / 2;
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI;
      const voussoir = box(0.5, 0.7, 2.05, M.stoneLight);
      voussoir.position.set(Math.cos(a) * (R + 0.2), H - 1.2 + Math.sin(a) * (R + 0.2), 0);
      voussoir.rotation.z = a - Math.PI / 2;
      g.add(voussoir);
    }
    // 门楣上的题字石板
    const plaque = box(2.2, 0.7, 0.12, M.stoneLight);
    plaque.position.set(0, H + 0.5, 1.06);
    g.add(plaque);
    // 石板下的两个小徽记
    for (const sx of [-1, 1]) {
      const crease = box(0.5, 0.22, 0.06, M.bronze, false);
      crease.position.set(sx * 0.6, H + 0.5, 1.14);
      g.add(crease);
    }
  }

  // 门柱上的两盏灯
  for (const sx of [-1, 1]) {
    const bracket = box(0.08, 0.08, 0.7, M.iron, false);
    bracket.position.set(sx * (W / 2 - 0.8), H - 1.8, 1.2);
    g.add(bracket);
    const glass = box(0.26, 0.36, 0.26, M.lanternGlass, false);
    glass.userData.keepSeparate = true;
    glass.position.set(sx * (W / 2 - 0.8), H - 2.0, 1.5);
    g.add(glass);
    const cap = box(0.34, 0.08, 0.34, M.iron, false);
    cap.position.set(sx * (W / 2 - 0.8), H - 1.78, 1.5);
    g.add(cap);
  }

  return g;
}

/* ============================================================
 *  镇上的零碎：拴马桩、水槽、布告栏、垃圾堆
 * ========================================================== */
export function makeTownClutter2(M) {
  const g = new THREE.Group();

  // 布告栏：两根柱子 + 一块板 + 几张纸
  {
    for (const sx of [-1, 1]) {
      const post = box(0.14, 2.4, 0.14, M.timber);
      post.position.set(sx * 1.1, 1.2, 0);
      g.add(post);
    }
    const board = box(2.6, 1.5, 0.1, M.woodDark);
    board.position.set(0, 1.9, 0);
    g.add(board);
    const PAPER = solid(0xe8e2d0, { roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const p = box(0.4, 0.52, 0.02, PAPER, false);
      p.position.set(-0.85 + i * 0.56, 1.85 + (i % 2) * 0.1, 0.07);
      p.rotation.z = (Math.random() - 0.5) * 0.12;
      g.add(p);
    }
    // 顶上的小雨檐
    const eave = box(2.9, 0.1, 0.5, M.timber);
    eave.position.set(0, 2.72, 0.12);
    eave.rotation.x = 0.14;
    g.add(eave);
  }

  // 拴马桩
  {
    const rail = box(3.0, 0.14, 0.14, M.wood);
    rail.position.set(2.6, 1.05, 0);
    g.add(rail);
    for (const sx of [-1, 1]) {
      const post = box(0.16, 1.1, 0.16, M.timber);
      post.position.set(2.6 + sx * 1.4, 0.55, 0);
      g.add(post);
    }
    // 挂着的缰绳
    for (const x of [2.2, 3.4]) {
      const rein = box(0.04, 0.7, 0.04, M.rope, false);
      rein.position.set(x, 0.7, 0.06);
      rein.rotation.z = 0.1;
      g.add(rein);
    }
  }

  // 木桶与板条箱
  {
    const barrel = cyl(0.34, 0.36, 0.86, 10, M.wood);
    barrel.position.set(-2.4, 0.43, 1.2);
    g.add(barrel);
    const crate = box(0.7, 0.6, 0.66, M.wood);
    crate.position.set(-3.0, 0.3, 0.4);
    crate.rotation.y = 0.4;
    g.add(crate);
  }

  return g;
}
