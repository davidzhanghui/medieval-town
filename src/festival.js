/**
 * festival.js —— 集市节庆道具
 *
 * 广场上每隔一阵会办一次集日：三角彩旗串、五月柱、铁火盆、长条宴桌、
 * 花环拱门，以及赶集路上那辆驴车。
 * 所有会动的部件都在 userData 里留了句柄，由 main.js 的动画循环驱动。
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

/** 需要随节庆一起淡入淡出的材质：拷贝一份，别动到全局材质 */
function fadeMat(src, opts = {}) {
  const m = src.clone();
  m.transparent = true;
  m.opacity = 0;
  Object.assign(m, opts);
  return m;
}

/* ============================================================
 *  三角彩旗串
 *  沿 X 轴横跨 span 米，两端各一根木柱，绳子按抛物线垂下去
 * ========================================================== */
export function makeBunting(M, { span = 14, h = 4.6, sag = 0.75, colors = null } = {}) {
  const g = new THREE.Group();
  const fadeMats = [];

  const ropeMat = fadeMat(M.rope, { opacity: 0 });
  fadeMats.push(ropeMat);

  // 两端的立柱
  for (const sx of [-1, 1]) {
    const post = cyl(0.075, 0.09, h, 6, M.wood);
    post.position.set((sx * span) / 2, h / 2, 0);
    g.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M.goldMark ?? M.iron);
    cap.position.set((sx * span) / 2, h + 0.08, 0);
    g.add(cap);
  }

  const N = Math.max(6, Math.round(span / 1.3));
  const yAt = (u) => h - sag * (1 - Math.pow(2 * u - 1, 2));
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    pts.push(new THREE.Vector3(-span / 2 + span * u, yAt(u), 0));
  }

  // 绳子：一小段一小段地拼
  for (let i = 0; i < N; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = a.distanceTo(b);
    const seg = box(len, 0.035, 0.035, ropeMat, false);
    seg.position.copy(a).add(b).multiplyScalar(0.5);
    seg.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
    g.add(seg);
  }

  // 旗子：三角形，垂在绳子下面
  const PALETTE = colors || [0x8e2b22, 0xd9c9a3, 0x4f6b3a, 0xc9a45e];
  const mats = PALETTE.map((c) => {
    const m = fadeMat(new THREE.MeshStandardMaterial({
      color: c, side: THREE.DoubleSide, roughness: 0.92,
    }));
    fadeMats.push(m);
    return m;
  });

  const shape = new THREE.Shape();
  shape.moveTo(-0.17, 0);
  shape.lineTo(0.17, 0);
  shape.lineTo(0, -0.44);
  shape.closePath();
  const flagGeo = new THREE.ShapeGeometry(shape);

  for (let i = 1; i < N; i++) {
    const p = pts[i];
    const flag = new THREE.Mesh(flagGeo, mats[i % mats.length]);
    flag.position.copy(p).add(new THREE.Vector3(0, -0.02, 0));
    flag.rotation.y = (i % 2 ? 1 : -1) * 0.14;
    g.add(flag);
  }

  g.userData.fadeMats = fadeMats;
  return g;
}

/* ============================================================
 *  五月柱
 *  柱顶垂下一圈彩带，节庆时整圈慢慢转，像围着柱子跳的舞
 * ========================================================== */
export function makeMaypole(M, { height = 7.0 } = {}) {
  const g = new THREE.Group();
  const fadeMats = [];

  // 石座
  const base = cyl(0.62, 0.72, 0.26, 10, M.stone);
  base.position.y = 0.13;
  g.add(base);

  const pole = cyl(0.11, 0.15, height, 8, M.wood);
  pole.position.y = height / 2;
  g.add(pole);

  // 顶上的花环与金球
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.1, 6, 14),
    M.yewGreen
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = height - 0.55;
  ring.castShadow = true;
  g.add(ring);

  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), M.goldMark ?? M.iron);
  globe.position.y = height + 0.06;
  g.add(globe);

  // 彩带：8 条，从柱顶斜拉到地面
  const ribbons = new THREE.Group();
  ribbons.position.y = height - 0.9;

  const RIBBON_COLORS = [0x8e2b22, 0xd9c9a3, 0x4f6b3a, 0xc9a45e];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const mat = fadeMat(new THREE.MeshStandardMaterial({
      color: RIBBON_COLORS[i % RIBBON_COLORS.length],
      side: THREE.DoubleSide, roughness: 0.95,
    }));
    fadeMats.push(mat);

    const reach = 2.7;
    const top = new THREE.Vector3(0, 0, 0);
    const bot = new THREE.Vector3(Math.cos(a) * reach, -(height - 1.1), Math.sin(a) * reach);
    const mid = top.clone().add(bot).multiplyScalar(0.5);
    const len = top.distanceTo(bot);

    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.17, len), mat);
    strip.position.copy(mid);
    // 布条的长轴（本地 Y）对准"从柱顶垂到落点"的方向
    const dir = bot.clone().normalize();
    strip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    // 再绕自身长轴拧一下，别像一块平板立在那儿
    strip.rotateY(0.5 + 0.3 * Math.sin(i));
    ribbons.add(strip);
  }
  g.add(ribbons);

  g.userData.ribbons = ribbons;
  g.userData.fadeMats = fadeMats;
  return g;
}

/* ============================================================
 *  铁火盆（三脚）
 * ========================================================== */
export function makeBrazier(M) {
  const g = new THREE.Group();

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(0.045, 0.06, 1.0, 6, M.iron);
    leg.position.set(Math.cos(a) * 0.34, 0.48, Math.sin(a) * 0.34);
    leg.rotation.z = Math.cos(a) * 0.24;
    leg.rotation.x = -Math.sin(a) * 0.24;
    g.add(leg);
  }

  const bowl = cyl(0.5, 0.34, 0.3, 12, M.iron);
  bowl.position.y = 1.0;
  g.add(bowl);

  const coal = cyl(0.42, 0.42, 0.08, 12, M.ember, false);
  coal.position.y = 1.16;
  coal.userData.keepSeparate = true;
  g.add(coal);

  g.userData.firePos = new THREE.Vector3(0, 1.24, 0);
  g.userData.ember = coal;
  return g;
}

/* ============================================================
 *  节庆长桌：桌面 + 交叉支架 + 两侧长凳 + 吃食
 * ========================================================== */
export function makeFestivalTable(M, len = 4.6) {
  const g = new THREE.Group();

  const top = box(len, 0.12, 1.0, M.wood);
  top.position.y = 0.78;
  g.add(top);

  for (const sx of [-1, 1]) {
    const x = sx * (len / 2 - 0.45);
    for (const sz of [-1, 1]) {
      const leg = box(0.11, 0.78, 0.11, M.timber);
      leg.position.set(x, 0.39, sz * 0.36);
      leg.rotation.z = sx * 0.12;
      g.add(leg);
    }
    const tie = box(0.09, 0.09, 0.86, M.timber);
    tie.position.set(x, 0.3, 0);
    g.add(tie);
  }

  // 长凳
  for (const sz of [-1, 1]) {
    const seat = box(len - 0.3, 0.09, 0.3, M.wood);
    seat.position.set(0, 0.44, sz * 0.82);
    g.add(seat);
    for (const sx of [-1, 1]) {
      const leg = box(0.09, 0.44, 0.24, M.timber);
      leg.position.set(sx * (len / 2 - 0.6), 0.22, sz * 0.82);
      g.add(leg);
    }
  }

  // 吃食：面包、奶酪、酒壶、苹果
  for (let i = 0; i < Math.floor(len / 0.8); i++) {
    const x = -len / 2 + 0.55 + i * 0.8;
    if (i % 3 === 0) {
      for (let k = 0; k < 3; k++) {
        const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), M.straw);
        loaf.scale.set(1.35, 0.62, 0.85);
        loaf.position.set(x + (k - 1) * 0.2, 0.9, 0.12 - (k % 2) * 0.18);
        loaf.castShadow = true;
        g.add(loaf);
      }
    } else if (i % 3 === 1) {
      const cheese = cyl(0.2, 0.2, 0.13, 10, M.straw, false);
      cheese.position.set(x, 0.9, -0.12);
      g.add(cheese);
      const jug = cyl(0.09, 0.12, 0.28, 8, M.wood);
      jug.position.set(x + 0.26, 0.98, 0.2);
      g.add(jug);
    } else {
      for (let k = 0; k < 4; k++) {
        const apple = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), M.fruitRed);
        apple.position.set(x + (k % 2) * 0.17, 0.9, -0.06 + Math.floor(k / 2) * 0.16);
        g.add(apple);
      }
    }
  }

  return g;
}

/* ============================================================
 *  花环拱门：立在广场入口
 * ========================================================== */
export function makeGarlandArch(M, { w = 5.0, h = 3.6 } = {}) {
  const g = new THREE.Group();
  const fadeMats = [];

  for (const sx of [-1, 1]) {
    const post = cyl(0.11, 0.14, h, 8, M.wood);
    post.position.set((sx * w) / 2, h / 2, 0);
    g.add(post);
    // 柱脚缠的常春藤
    const wrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.2, 1.1, 8, 1, true),
      M.yewGreen
    );
    wrap.position.set((sx * w) / 2, 0.55, 0);
    g.add(wrap);
  }

  const leafMat = fadeMat(new THREE.MeshStandardMaterial({
    color: 0x2b4630, roughness: 1, flatShading: true,
  }));
  fadeMats.push(leafMat);
  const flowerMat = fadeMat(new THREE.MeshStandardMaterial({
    color: 0xb8493a, roughness: 0.9, flatShading: true,
  }));
  fadeMats.push(flowerMat);
  const paleMat = fadeMat(new THREE.MeshStandardMaterial({
    color: 0xd9c9a3, roughness: 0.95, flatShading: true,
  }));
  fadeMats.push(paleMat);

  // 拱顶：沿半圆铺一串叶子
  const SEG = 11;
  for (let i = 0; i <= SEG; i++) {
    const a = Math.PI * (i / SEG);
    const x = Math.cos(a) * (w / 2);
    const y = h + Math.sin(a) * 1.15;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.42, 6, 5), leafMat);
    leaf.position.set(x, y, 0);
    leaf.scale.set(1, 1.25, 0.85);
    leaf.castShadow = true;
    g.add(leaf);

    if (i % 2 === 0 && i > 0 && i < SEG) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.11, 5, 4), i % 4 === 0 ? flowerMat : paleMat);
      f.position.set(x, y + 0.34, 0.24);
      g.add(f);
    }
  }

  g.userData.fadeMats = fadeMats;
  return g;
}

/* ============================================================
 *  赶集的驴车
 *  返回的组原点在车板后轴中心，车头朝 +X
 * ========================================================== */
export function makeDonkeyCart(M) {
  const g = new THREE.Group();

  /* ---- 车 ---- */
  const bed = box(2.4, 0.14, 1.25, M.wood);
  bed.position.set(0, 0.78, 0);
  g.add(bed);

  for (const sz of [-1, 1]) {
    const side = box(2.4, 0.34, 0.08, M.wood);
    side.position.set(0, 0.98, sz * 0.62);
    g.add(side);
  }
  const back = box(0.08, 0.34, 1.25, M.wood);
  back.position.set(-1.16, 0.98, 0);
  g.add(back);

  // 车轮
  const wheels = [];
  for (const sz of [-1, 1]) {
    const wheel = new THREE.Group();
    const rim = cyl(0.56, 0.56, 0.1, 14, M.beam);
    rim.rotation.x = Math.PI / 2;
    wheel.add(rim);
    for (let i = 0; i < 6; i++) {
      const spoke = box(0.06, 1.02, 0.06, M.beam);
      spoke.rotation.z = (i / 6) * Math.PI;
      spoke.rotation.x = Math.PI / 2;
      wheel.add(spoke);
    }
    wheel.position.set(0, 0.56, sz * 0.74);
    wheel.rotation.z = 0;
    g.add(wheel);
    wheels.push(wheel);
  }

  // 车辕
  for (const sz of [-1, 1]) {
    const shaft = box(1.9, 0.08, 0.08, M.wood);
    shaft.position.set(1.9, 0.7, sz * 0.4);
    shaft.rotation.z = 0.05;
    g.add(shaft);
  }

  // 车上的货：两只板条箱 + 一筐苹果
  for (const [x, z, s] of [[-0.5, 0, 0.62], [0.35, 0.12, 0.5]]) {
    const crate = box(s, s, s, M.wood);
    crate.position.set(x, 0.86 + s / 2, z);
    crate.rotation.y = x * 0.4;
    g.add(crate);
  }
  const basket = cyl(0.3, 0.24, 0.26, 10, M.straw);
  basket.position.set(-0.85, 1.02, -0.18);
  g.add(basket);
  for (let i = 0; i < 5; i++) {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), M.fruitRed);
    a.position.set(-0.85 + Math.cos(i * 1.3) * 0.14, 1.18, -0.18 + Math.sin(i * 1.3) * 0.14);
    g.add(a);
  }

  /* ---- 驴 ---- */
  const donkey = new THREE.Group();
  donkey.position.set(2.55, 0, 0);

  const hide = new THREE.MeshStandardMaterial({ color: 0x6d6154, roughness: 1 });
  const hideDark = new THREE.MeshStandardMaterial({ color: 0x4a4238, roughness: 1 });

  const body = box(1.18, 0.52, 0.44, hide);
  body.position.set(0, 0.94, 0);
  donkey.add(body);

  const neck = box(0.34, 0.62, 0.3, hide);
  neck.position.set(0.56, 1.24, 0);
  neck.rotation.z = -0.42;
  donkey.add(neck);

  const head = box(0.46, 0.24, 0.24, hide);
  head.position.set(0.76, 1.5, 0);
  head.rotation.z = -0.16;
  donkey.add(head);

  const muzzle = box(0.18, 0.16, 0.17, hideDark);
  muzzle.position.set(0.96, 1.44, 0);
  donkey.add(muzzle);

  for (const sz of [-1, 1]) {
    const ear = box(0.07, 0.26, 0.07, hideDark);
    ear.position.set(0.6, 1.68, sz * 0.09);
    ear.rotation.z = sz * 0.12;
    ear.rotation.x = sz * 0.2;
    donkey.add(ear);
  }

  const legs = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = box(0.13, 0.72, 0.13, hide);
      leg.position.set(sx * 0.44, 0.36, sz * 0.15);
      donkey.add(leg);
      legs.push(leg);
    }
  }

  const tail = box(0.06, 0.42, 0.06, hideDark);
  tail.position.set(-0.62, 1.02, 0);
  tail.rotation.z = 0.35;
  donkey.add(tail);

  const mane = box(0.06, 0.5, 0.08, hideDark);
  mane.position.set(0.42, 1.36, 0);
  mane.rotation.z = -0.42;
  donkey.add(mane);

  // 挽具
  const yoke = box(0.14, 0.14, 1.1, M.timber);
  yoke.position.set(0.14, 1.16, 0);
  donkey.add(yoke);

  g.add(donkey);

  g.userData.wheels = wheels;
  g.userData.legs = legs;
  g.userData.donkey = donkey;
  return g;
}
