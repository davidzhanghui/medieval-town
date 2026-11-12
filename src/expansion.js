import * as THREE from 'three';
import { SITES, ROADS, SEA, WORLD_R, smoothPath, seaDepth } from './world.js';
import * as K from './kit.js';
import { TOWN_BUILDERS } from './towns/index.js';

/* ============================================================
 *  外环十镇：装配、剔除与动画
 *
 *  main.js 只调用 buildExpansion(ctx) 一次，之后每帧调 update()。
 *  每个镇是 towns/ 下的一个模块：export default function build(T)，
 *  用 T 提供的接口摆房子、登记可点击的地标、挂灯、放人、加动画。
 *
 *  性能策略：
 *   - 每个镇是一个独立 Group，离相机远于 showR 就整组 visible=false；
 *   - 镇里的碎网格在 finish() 里按材质烘合（compactGroup），一个镇约百次绘制；
 *   - 每个镇有一个"信标"（灯塔、巨橡、石柱……）放在镇外的常驻组里，
 *     镇子被剔除时才显示，所以站在城堡里也能远远看见它们；
 *   - 炊烟、动画只在镇子可见时更新。
 * ========================================================== */

export function buildExpansion(ctx) {
  const {
    scene, camera, controls, TM, GRASS_Y, registerInteractive, addPerson,
    lampHaloes, torchLights, glowTx, VIL, POP, tex, nature, NM,
  } = ctx;

  const P = K.makePalette(TM);
  const world = new THREE.Group();
  world.name = 'expansion';
  scene.add(world);

  /* ---------------- 海 ---------------- */
  const seaMap = tex.waterTx.map.clone();
  seaMap.wrapS = seaMap.wrapT = THREE.RepeatWrapping;
  seaMap.repeat.set(70, 70);
  seaMap.needsUpdate = true;
  const seaBump = tex.waterTx.bump.clone();
  seaBump.wrapS = seaBump.wrapT = THREE.RepeatWrapping;
  seaBump.repeat.set(70, 70);
  seaBump.needsUpdate = true;
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x2f6f8c, map: seaMap, bumpMap: seaBump, bumpScale: 0.6,
    roughness: 0.16, metalness: 0.3, transparent: true, opacity: 0.94,
  });
  seaMat.envMapIntensity = 0.35;
  const sea = new THREE.Mesh(new THREE.CircleGeometry(SEA.r, 192), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(SEA.x, GRASS_Y + 0.16, SEA.z);
  sea.receiveShadow = true;
  world.add(sea);

  // 沙滩：海岸线外侧一圈 + 浪沫
  const sandMat = P.flat(0xd9c79a, 1);
  sandMat.polygonOffset = true;
  sandMat.polygonOffsetFactor = -2;
  sandMat.polygonOffsetUnits = -2;
  const beach = new THREE.Mesh(new THREE.RingGeometry(SEA.r - 4, SEA.r + 34, 192, 1), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(SEA.x, GRASS_Y + 0.05, SEA.z);
  beach.receiveShadow = true;
  world.add(beach);
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xf2fbff, transparent: true, opacity: 0.55, depthWrite: false });
  foamMat.polygonOffset = true;
  foamMat.polygonOffsetFactor = -4;
  foamMat.polygonOffsetUnits = -4;
  const foam = new THREE.Mesh(new THREE.RingGeometry(SEA.r - 3, SEA.r + 1.2, 192, 1), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(SEA.x, GRASS_Y + 0.2, SEA.z);
  world.add(foam);

  /* ---------------- 道路 ---------------- */
  const roadMat = TM.road.clone();
  roadMat.polygonOffset = true;
  roadMat.polygonOffsetFactor = -3;
  roadMat.polygonOffsetUnits = -3;
  for (const road of ROADS) {
    const pts = smoothPath(road.pts, 20);
    let rm = roadMat;
    if (road.tint != null) { rm = roadMat.clone(); rm.color.setHex(road.tint); }
    const mesh = VIL.makeRoad({ road: rm }, pts, road.w);
    mesh.position.y = GRASS_Y + 0.08;
    mesh.userData.road = road.name;
    world.add(mesh);
    // 路缘的散石 / 里程碑留给各镇自己做
  }

  /* ---------------- 镇子容器 ---------------- */
  const towns = [];
  const byKey = {};
  const beaconGroup = new THREE.Group();
  world.add(beaconGroup);

  const smokeMat = new THREE.SpriteMaterial({
    map: tex.cloudTx, color: 0xdad2c2, transparent: true, opacity: 0.16,
    depthWrite: false, toneMapped: false,
  });

  SITES.forEach((site, index) => {
    const builder = TOWN_BUILDERS[site.key];
    if (!builder) return;

    const root = new THREE.Group();
    root.name = `town:${site.key}`;
    root.position.set(site.x, GRASS_Y, site.z);
    world.add(root);

    const rand = K.rng(1000 + index * 77);
    const town = {
      site, root, rand, index,
      center: new THREE.Vector3(site.x, GRASS_Y, site.z),
      landmarks: [],        // { key, name, root }
      animators: [],
      beaconAnimators: [],
      chimneySrc: [],
      smoke: [],
      beacon: null,
      people: [],
      overview: null,
      visible: true,
    };

    const T = {
      THREE, K, P, TM, site, rand, root, town, GRASS_Y, tex, POP, VIL, glowTx, nature, NM,

      /** 放到镇内局部坐标 (x,z)，朝向 ry，抬高 y */
      add(obj, x, z, ry = 0, y = 0) {
        obj.position.set(x, y, z);
        obj.rotation.y = ry;
        root.add(obj);
        return obj;
      },

      /** 参数化房屋；带烟囱的会自动登记炊烟 */
      house(opts, x, z, ry = 0, y = 0) {
        const h = K.makeHouse(P, opts);
        this.add(h, x, z, ry, y);
        if (h.userData.chimney && opts.smoke !== false) town.chimneySrc.push({ obj: h, pos: h.userData.chimney.clone() });
        return h;
      },

      /** 登记炊烟源：obj.userData.chimney 是 obj 局部坐标里的烟囱口 */
      smokeFrom(obj, localPos) {
        town.chimneySrc.push({ obj, pos: localPos.clone() });
      },

      /**
       * 一处可点击的地标。obj 里的碎网格会先烘合，再登记拾取；
       * view 缺省时从正面（obj 旋转后的 +Z）斜上方看过去。
       */
      landmark(obj, x, z, ry, info, view = {}) {
        this.add(obj, x, z, ry);
        VIL.compactGroup(obj);
        obj.userData.keepSeparate = true;
        const dist = view.dist ?? 42;
        const height = view.height ?? 24;
        const vr = view.rot ?? ry;
        // ox/oz：内容不在 obj 原点时（沿溪、沿墙的长条地标），把镜头对准内容中心
        const wx = site.x + x + (view.ox ?? 0);
        const wz = site.z + z + (view.oz ?? 0);
        const key = `${site.key}:${town.landmarks.length}`;
        registerInteractive(obj, {
          ...info,
          view: {
            pos: [wx + Math.sin(vr) * dist, height, wz + Math.cos(vr) * dist],
            target: [wx, view.ty ?? 3, wz],
          },
        });
        town.landmarks.push({ key, name: info.shortName || info.name.split(' · ')[0], root: obj });
        return obj;
      },

      /** 镇子本身的总览入口：一块几乎不可见的小板，挂在镇中心 */
      overview(info, view = {}) {
        const pad = new THREE.Group();
        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(3.2, 3.2, 0.2, 16),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
        );
        pad.add(disc);
        pad.userData.keepSeparate = true;
        const cx = view.cx ?? 0;
        const cz = view.cz ?? 0;
        this.add(pad, cx, cz, 0, 0.1);
        const vr = view.rot ?? site.rot;
        const dist = view.dist ?? 190;
        const height = view.height ?? 95;
        registerInteractive(pad, {
          ...info,
          view: {
            pos: [site.x + cx + Math.sin(vr) * dist, height, site.z + cz + Math.cos(vr) * dist],
            target: [site.x + cx, 4, site.z + cz],
          },
        });
        town.overview = pad;
        return pad;
      },

      /** 路灯：返回灯杆；light=true 时挂一盏真点光源 */
      lamp(x, z, { h = 3.2, ry = 0, light = false, gain = 0.4, y = 0 } = {}) {
        const lp = K.lampPost(P, h);
        this.add(lp, x, z, ry, y);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTx, color: 0xffb14a, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        }));
        halo.position.copy(lp.userData.lampPos);
        halo.scale.setScalar(1.7);
        lp.add(halo);
        lampHaloes.push(halo);
        if (light) {
          const l = new THREE.PointLight(0xffa848, 0, 16, 2);
          l.position.copy(lp.userData.lampPos);
          l.userData.gain = gain;
          l.userData.rangeGain = 0.55;
          lp.add(l);
          torchLights.push(l);
        }
        return lp;
      },

      /** 一团暖光（篝火、炉口、窗口大厅）：只有 light=true 才真的发光 */
      glow(x, y, z, { color = 0xff9a3c, size = 3.2, light = false, gain = 1 } = {}) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTx, color, transparent: true, opacity: 0.75,
          blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        }));
        sp.position.set(x, y, z);
        sp.scale.setScalar(size);
        root.add(sp);
        const rec = { sprite: sp, seed: rand() * 10, base: size };
        town.animators.push((dt, t) => {
          const n = Math.sin(t * 11 + rec.seed) * 0.5 + Math.sin(t * 23.7 + rec.seed * 2) * 0.3;
          sp.scale.setScalar(rec.base * (1 + n * 0.1));
          sp.material.opacity = 0.7 + n * 0.15;
        });
        if (light) {
          const l = new THREE.PointLight(color, 0, 20, 2);
          l.position.set(x, y, z);
          l.userData.gain = gain;
          l.userData.rangeGain = 0.8;
          root.add(l);
          torchLights.push(l);
        }
        return sp;
      },

      /** 居民：局部坐标 (x,z)，activity 同主场景 */
      person(opts, x, z, face = 0, activity = 'idle', scale = 1, y = 0) {
        const model = opts.villager
          ? POP.makeVillager(scale)
          : POP.makePerson({ weapon: 'none', shield: false, helmet: 'none', ...opts, scale });
        // 人物挂在镇根下（镇根本身已经抬到草地高度，所以局部 y 从 0 算起）；
        // 他们要动，不能被 compactGroup 烘进静态网格
        model.root.userData.keepSeparate = true;
        const rec = addPerson(model, x, y, z, face, activity, root);
        town.people.push(rec);
        return rec;
      },

      /** 走来走去的居民：在局部坐标的 from → to 之间往返 */
      walker(opts, from, to, speed = 0.9, scale = 1, y = 0) {
        return this.person(opts, from[0], from[1], 0, { walk: { from, to, speed } }, scale, y);
      },

      /** 标记一个会动的物体：不让镇根的 compactGroup 把它烘成静态网格 */
      dynamic(obj) {
        // 自己内部先烘合（船身的十几个碎件 → 几个网格），整体仍可移动 / 摇摆
        VIL.compactGroup(obj);
        obj.userData.keepSeparate = true;
        return obj;
      },

      /** 每帧动画；只在镇子可见时调用。fn(dt, elapsed, dayFactor) */
      animate(fn) {
        town.animators.push(fn);
      },

      /** 匀速自转：obj 先要能单独动（dynamic / keepSeparate） */
      spin(obj, speed = 1, axis = 'y') {
        obj.userData.keepSeparate = true;
        town.animators.push((dt) => { obj.rotation[axis] += dt * speed; });
        return obj;
      },

      /** 摇摆（挂灯、招牌、吊桶、风中的草）：围 x/z 轴做小幅正弦 */
      sway(obj, { ax = 0.06, az = 0.06, speed = 1.2, phase = null } = {}) {
        obj.userData.keepSeparate = true;
        const ph = phase ?? rand() * 6.28;
        const bx = obj.rotation.x;
        const bz = obj.rotation.z;
        town.animators.push((dt, t) => {
          obj.rotation.x = bx + Math.sin(t * speed + ph) * ax;
          obj.rotation.z = bz + Math.sin(t * speed * 0.83 + ph * 1.7) * az;
        });
        return obj;
      },

      /**
       * 迎风飘的旗/布：一块细分的平面，顶点随风起伏，左边（旗杆侧）固定。
       * 返回 mesh，位置用镇内局部坐标；ry 是朝向。
       */
      flag(x, y, z, { w = 3, h = 1.8, color = 0xb8322a, ry = 0, y0 = 0, wind = 1, material = null } = {}) {
        const geo = new THREE.PlaneGeometry(w, h, 10, 4);
        geo.translate(w / 2, 0, 0);
        const base = geo.attributes.position.array.slice();
        const mat = material || new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide, flatShading: true });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y + y0, z);
        m.rotation.y = ry;
        m.castShadow = true;
        m.userData.keepSeparate = true;
        root.add(m);
        const ph = rand() * 6.28;
        const pos = geo.attributes.position;
        town.animators.push((dt, t) => {
          for (let i = 0; i < pos.count; i++) {
            const bx = base[i * 3];
            const k = bx / w;                       // 0 固定端 → 1 自由端
            pos.setZ(i, Math.sin(bx * 2.1 - t * 4.2 * wind + ph) * 0.28 * k * (0.6 + wind * 0.4));
            pos.setY(i, base[i * 3 + 1] - k * k * 0.12 + Math.sin(bx * 1.3 - t * 3 + ph) * 0.05 * k);
          }
          pos.needsUpdate = true;
        });
        return m;
      },

      /** 粒子发射器（火星、水雾、落叶、尘土、气泡……），实现见 kit.createEmitter；位置用镇内局部坐标 */
      emitter({ parent = null, ...opt } = {}) {
        const e = K.createEmitter(camera, { rand, ...opt });
        (parent || root).add(e.pts);
        town.animators.push(e.update);
        return e.pts;
      },

      /** 一群鸟（海鸥、鸽子、乌鸦）：center 是镇内局部坐标 */
      birds(opts) {
        const flock = nature.makeBirdFlock(NM, { ...opts, center: opts.center || [0, 0] });
        flock.group.userData.keepSeparate = true;
        root.add(flock.group);
        town.animators.push((dt, t, day) => flock.update(dt, t, day));
        return flock;
      },

      /** 常驻动画：镇子被剔除（远景信标显示）时也要跑，比如灯塔的光 */
      beaconAnimate(fn) {
        town.beaconAnimators.push(fn);
      },

      /** 常驻环境物（极光、云之类的天象）：不随镇子剔除；obj 用局部坐标，会被搬到世界坐标。动画用 beaconAnimate */
      ambient(obj) {
        obj.position.add(new THREE.Vector3(site.x, GRASS_Y, site.z));
        beaconGroup.add(obj);
        return obj;
      },

      /** 远景信标：镇子被剔除时才显示；obj 用局部坐标摆好，会被搬到世界坐标 */
      beacon(obj) {
        obj.position.add(new THREE.Vector3(site.x, GRASS_Y, site.z));
        beaconGroup.add(obj);
        town.beacon = obj;
        obj.visible = false;   // 镇子一开始是可见的；第一帧 update 发现太远才会翻转并亮出信标
        return obj;
      },
    };

    builder(T);

    // 收尾：把碎网格按材质烘合（地标已烘过、标了 keepSeparate，会被整枝跳过）
    VIL.compactGroup(root);

    // 炊烟
    root.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    for (const { obj, pos } of town.chimneySrc) {
      wp.copy(pos);
      obj.localToWorld(wp);
      root.worldToLocal(wp);
      const ch = { x: wp.x, y: wp.y, z: wp.z, seed: rand() * 10 };
      for (let i = 0; i < 3; i++) {
        const sp = new THREE.Sprite(smokeMat.clone());
        sp.position.set(ch.x, ch.y, ch.z);
        const sc = 1.3 + rand() * 1.0;
        sp.scale.setScalar(sc);
        sp.userData = { baseScale: sc, offset: i / 3, chimney: ch };
        root.add(sp);
        town.smoke.push(sp);
      }
    }

    towns.push(town);
    byKey[site.key] = town;
  });

  /* ---------------- 每帧 ---------------- */
  const _t = new THREE.Vector3();
  let frame = 0;

  function update(dt, elapsed, dayFactor) {
    frame++;
    K.WIND.uTime.value = elapsed;
    seaMap.offset.x = elapsed * 0.006;
    seaMap.offset.y = elapsed * 0.01;
    seaBump.offset.x = -elapsed * 0.009;
    seaBump.offset.y = elapsed * 0.004;
    foamMat.opacity = 0.42 + Math.sin(elapsed * 0.9) * 0.14;
    // 村镇地块夜里压暗到 50%
    for (const { mat, base } of K.NIGHT_PATCHES) mat.color.copy(base).multiplyScalar(1 - 0.5 * dayFactor);

    // 可见性：相机或注视点离镇子够近就渲染
    for (const town of towns) {
      const { site } = town;
      const dc = Math.hypot(camera.position.x - site.x, camera.position.z - site.z);
      const dt2 = Math.hypot(controls.target.x - site.x, controls.target.z - site.z);
      const show = Math.min(dc, dt2 + 200) < site.showR;
      if (show !== town.visible) {
        town.visible = show;
        town.root.visible = show;
        // 被剔除的镇整个摘出场景图：visible=false 的节点每帧仍要递归更新矩阵，十个镇有几千个节点
        if (show) { if (town.root.parent !== world) { world.add(town.root); town.root.updateMatrixWorld(true); } }
        else if (town.root.parent === world) world.remove(town.root);
        if (town.beacon) town.beacon.visible = !show;
        for (const p of town.people) p.skip = !show;
      }
      for (const fn of town.beaconAnimators) fn(dt, elapsed, dayFactor);
      if (!town.visible) continue;

      for (const fn of town.animators) fn(dt, elapsed, dayFactor);

      for (const sp of town.smoke) {
        const ch = sp.userData.chimney;
        const k = (elapsed * 0.16 + sp.userData.offset) % 1;
        sp.position.set(
          ch.x + Math.sin(k * 5 + ch.seed) * (0.4 + k * 1.8),
          ch.y + k * 7.5,
          ch.z + Math.cos(k * 4 + ch.seed) * (0.35 + k * 1.6)
        );
        sp.scale.setScalar(sp.userData.baseScale * (0.7 + k * 2.4));
        sp.material.opacity = (1 - k) * (1 - k) * 0.16 * (1 - dayFactor * 0.55);
      }
    }
  }

  /* ---------------- 导出给 main.js 的东西 ---------------- */
  const spots = {};
  const townList = towns.map((t) => {
    spots[`town:${t.site.key}`] = t.overview;
    for (const lm of t.landmarks) spots[lm.key] = lm.root;
    return {
      key: t.site.key,
      kingdom: t.site.kingdom || null,
      village: !!t.site.village,
      name: t.site.name,
      en: t.site.en,
      x: t.site.x,
      z: t.site.z,
      color: t.site.color,
      overview: t.overview,
      landmarks: t.landmarks.map((l) => ({ key: l.key, name: l.name })),
    };
  });

  return { update, spots, towns: townList, byKey, world, P };
}
