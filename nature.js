/**
 * nature.js —— 高山、大河、瀑布、湖泊，以及水鸟虫鱼
 *
 * 与其它模块同一套约定：构件用主场景传入的材质 M，纹理全部程序化生成。
 * 导出分两类：
 *   静态造景   makeGreatRiver / makeFalls / makeMountain / makeLake / makeMarsh /
 *              makeMeadow / makeOrchardGrove
 *   会动的     makeBirdFlock / makeFishShoal / makeInsectSwarm
 * 会动的那几个只返回数据 + 网格，由 main.js 在主循环里调 update。
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
 *  水：一条按折线生成的大河（带深浅分层、浅滩与沙洲）
 * ========================================================== */

/** 沿折线铺一条带宽变化的带子；widths 可与 pts 等长，也可以是常量 */
function ribbon(pts, widths, y, mat, uvRepeat = 4) {
  const n = pts.length;
  const left = [];
  const right = [];
  const lens = [0];
  let total = 0;

  for (let i = 0; i < n; i++) {
    const cur = new THREE.Vector2(pts[i][0], pts[i][1]);
    const prev = new THREE.Vector2(pts[Math.max(0, i - 1)][0], pts[Math.max(0, i - 1)][1]);
    const next = new THREE.Vector2(pts[Math.min(n - 1, i + 1)][0], pts[Math.min(n - 1, i + 1)][1]);
    const dir = next.clone().sub(prev);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1);
    dir.normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x);
    const w = Array.isArray(widths) ? widths[i] : widths;
    left.push(cur.clone().addScaledVector(nrm, w / 2));
    right.push(cur.clone().addScaledVector(nrm, -w / 2));
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
      uv.push(u, lens[i] / uvRepeat);
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

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * 大河：河床（泥土）→ 浅水 → 深水 → 岸边卵石、芦苇、沙滩
 * pts 是河心线，widths 是各处的水面宽度
 */
export function makeGreatRiver(M, pts, widths, opt = {}) {
  const g = new THREE.Group();
  const waterY = opt.waterY ?? 0.34;

  // 河床：比水面宽一圈的泥岸
  const bedW = Array.isArray(widths) ? widths.map((w) => w + 16) : widths + 16;
  g.add(ribbon(pts, bedW, 0.02, M.riverBed));

  // 浅水：整条河面，颜色浅一些
  const shallow = ribbon(pts, widths, waterY - 0.04, M.riverShallow, 7);
  g.add(shallow);

  // 深水：河心 58% 宽，颜色深、反光强，叠出一层"主流"
  const deepW = Array.isArray(widths) ? widths.map((w) => w * 0.58) : widths * 0.58;
  const deep = ribbon(pts, deepW, waterY, M.riverDeep, 5);
  g.add(deep);

  // 沙洲：在几个转弯的外侧摊一片浅色沙
  const SAND = opt.sandMat || solid(0xc8b48c, { roughness: 1 });
  for (let i = 1; i < pts.length - 1; i += 2) {
    const a = new THREE.Vector2(pts[i][0], pts[i][1]);
    const b = new THREE.Vector2(pts[i + 1][0], pts[i + 1][1]);
    const dir = b.clone().sub(a).normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x);
    const w = Array.isArray(widths) ? widths[i] : widths;
    const s = 0.55 + Math.random() * 0.5;
    const bar = new THREE.Mesh(new THREE.CircleGeometry(3.4 * s, 12), SAND);
    bar.rotation.x = -Math.PI / 2;
    const off = (w / 2 - 3.0) * (Math.random() < 0.5 ? 1 : -1);
    bar.position.set(a.x + nrm.x * off, waterY + 0.05, a.y + nrm.y * off);
    bar.scale.set(1.4, 1, 0.7);
    bar.receiveShadow = true;
    g.add(bar);
  }

  // 两岸：卵石与芦苇
  const rockGeo = new THREE.DodecahedronGeometry(0.28, 0);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = new THREE.Vector2(pts[i][0], pts[i][1]);
    const b = new THREE.Vector2(pts[i + 1][0], pts[i + 1][1]);
    const dir = b.clone().sub(a).normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x);
    const w = Array.isArray(widths) ? widths[i] : widths;

    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      const p = a.clone().lerp(b, t);
      for (const s of [-1, 1]) {
        if (Math.random() > 0.5) {
          const rock = new THREE.Mesh(rockGeo, M.stone);
          const off = w / 2 + 1.4 + Math.random() * 2.6;
          rock.position.set(
            p.x + nrm.x * s * off,
            0.06 + Math.random() * 0.14,
            p.y + nrm.y * s * off
          );
          const sc = 0.6 + Math.random() * 1.6;
          rock.scale.set(sc, sc * 0.55, sc);
          rock.rotation.set(Math.random(), Math.random(), Math.random());
          rock.castShadow = true;
          g.add(rock);
        }
        if (Math.random() > 0.58) {
          const off = w / 2 + 1.0 + Math.random() * 2.0;
          const rx = p.x + nrm.x * s * off;
          const rz = p.y + nrm.y * s * off;
          for (let r = 0; r < 4; r++) {
            const reed = box(0.04, 0.9 + Math.random() * 0.7, 0.04, M.reed, false);
            reed.position.set(rx + (Math.random() - 0.5) * 0.5, 0.5, rz + (Math.random() - 0.5) * 0.5);
            reed.rotation.z = (Math.random() - 0.5) * 0.4;
            reed.rotation.x = (Math.random() - 0.5) * 0.4;
            g.add(reed);
          }
        }
      }
    }
  }

  g.userData.waterY = waterY;
  return g;
}

/* ============================================================
 *  瀑布：断崖 + 三叠水帘 + 水潭 + 水雾
 * ========================================================== */

/**
 * 水帘的"透明度"贴图：一张灰度图，白 = 看得见，黑 = 透明。
 *
 * 注意 three 的 alphaMap 只读绿通道，所以这里必须画成不透明的灰度——
 * 用带 alpha 的白色去画，绿通道全是 1，水帘就成了一块硬边的白板。
 * 整张图交给 alphaMap，颜色由材质的 color 给。
 */
function fallSheetTexture() {
  const W = 128, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);

  // 底子：中间亮、两边慢慢淡出去。渐变拉得很宽——窄了水帘就是一块硬边的板
  const g = c.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0.0, '#000');
  g.addColorStop(0.13, '#1a1a1a');
  g.addColorStop(0.3, '#6a6a6a');
  g.addColorStop(0.5, '#a8a8a8');
  g.addColorStop(0.7, '#6a6a6a');
  g.addColorStop(0.87, '#1a1a1a');
  g.addColorStop(1.0, '#000');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // 竖条：位置、粗细、亮度都随机，模拟一缕一缕的水
  for (let i = 0; i < 90; i++) {
    const x = Math.pow(Math.random(), 0.8) * W;
    const edge = 1 - Math.abs(x / W - 0.5) * 1.7;
    if (edge <= 0) continue;
    const w = (0.8 + Math.random() * 3.2) * edge;
    const v = Math.round((0.08 + Math.random() * 0.42) * edge * 255);
    c.fillStyle = `rgb(${v},${v},${v})`;
    const y0 = Math.random() * H * 0.5;
    c.fillRect(x - w / 2, y0, w, H - y0);
  }

  // 下半段的水花
  for (let i = 0; i < 260; i++) {
    const y = H * (0.55 + Math.random() * 0.45);
    const x = Math.random() * W;
    const r = 0.8 + Math.random() * 2.4;
    const v = Math.round((0.06 + Math.random() * 0.26) * 255);
    c.fillStyle = `rgb(${v},${v},${v})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  // 顶部压一道暗：水从石槽里漫出来的那一截本来就细
  const gt = c.createLinearGradient(0, 0, 0, H * 0.2);
  gt.addColorStop(0, 'rgba(0,0,0,0.8)');
  gt.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gt;
  c.fillRect(0, 0, W, H * 0.2);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * 瀑布挂在一条从高处下来的支流末端。
 * 断崖沿 Z 方向排开，水从北面的崖顶落下往南。
 */
export function makeFalls(M, { width = 22, height = 26, depth = 14 } = {}) {
  const g = new THREE.Group();

  /* ---- 断崖：一堆互相嵌合的大岩块，中间塌出一道水口 ---- */
  {
    const ROCK = M.fallsRock || M.cliff;
    const halfW = width / 2 + 15;
    const notchHalf = width * 0.17;

    /** 一块不规则的岩：正二十面体细分一次，顶点按噪声推 */
    const boulder = (rad, seed) => {
      const geo = new THREE.IcosahedronGeometry(rad, 1);
      const pos = geo.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const n =
          1 +
          Math.sin(v.x * 0.9 + seed) * 0.16 +
          Math.sin(v.y * 1.3 - seed * 1.7) * 0.12 +
          Math.sin(v.z * 1.1 + seed * 2.3) * 0.10;
        v.multiplyScalar(n);
        // 压扁一点，岩块更像崖体而不是球
        v.y *= 1.15;
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      return geo;
    };

    // 三排岩块叠成崖壁：后排最高最厚，逐排向前变矮，形成阶梯状的崖面
    const ROWS = [
      { z: -depth * 0.70, rad: 11.0, scaleY: 1.6, topY: 0.98 },
      { z: -depth * 0.26, rad: 9.0, scaleY: 1.5, topY: 0.86 },
      { z: depth * 0.18, rad: 6.4, scaleY: 1.3, topY: 0.70 },
    ];
    ROWS.forEach((row, ri) => {
      const n = Math.max(3, Math.round((halfW * 2) / (row.rad * 1.35)));
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * 2 - 1;
        const x = t * halfW * (0.92 + Math.random() * 0.12);
        // 水口：中间那一段跳过，边缘的岩块也压低
        const inNotch = Math.abs(x) < notchHalf;
        if (inNotch) continue;
        const near = Math.max(0, 1 - (Math.abs(x) - notchHalf) / (notchHalf * 1.6));
        const drop = near * height * 0.30;
        const rad = row.rad * (0.82 + Math.random() * 0.42);
        const m = new THREE.Mesh(boulder(rad, i * 2.7 + ri * 5.1 + Math.random()), ROCK);
        const yTop = height * row.topY - drop;
        // boulder 的半径被 1.15 拉高过，顶到 yTop 就要往下退这么多
        m.position.set(x, yTop - rad * 1.15 * row.scaleY * 0.9, row.z + (Math.random() - 0.5) * 2.5);
        m.scale.set(1.0 + Math.random() * 0.2, row.scaleY, 0.9 + Math.random() * 0.3);
        m.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
      }
    });

    // 水口两侧各垫一块高石，把缺口收成一道竖缝
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(boulder(7.4, 31 + sx), ROCK);
      m.position.set(sx * (notchHalf + 4.0), height * 0.30, -depth * 0.16);
      m.scale.set(0.95, 1.75, 1.0);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }

    // 崖脚：几块半埋的乱石，跟草地接上
    for (let i = 0; i < 12; i++) {
      const t = (Math.random() * 2 - 1);
      if (Math.abs(t * halfW) < notchHalf) continue;
      const rad = 2.2 + Math.random() * 2.6;
      const m = new THREE.Mesh(boulder(rad, 50 + i), ROCK);
      m.position.set(t * halfW * 0.95, -0.6, depth * 0.2 + Math.random() * 3);
      m.scale.set(1.2, 0.7, 1.0);
      m.rotation.y = Math.random() * Math.PI;
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }

    // 崖顶的几棵松：树干埋进岩缝里，树冠探出来。
    // 之前这里铺的是方块草皮，岩块一错位就露出悬空的绿板，换成树更保险
    for (let i = 0; i < 7; i++) {
      const t = (Math.random() * 2 - 1);
      if (Math.abs(t * halfW) < notchHalf * 2.2) continue;
      const sc = 0.75 + Math.random() * 0.55;
      const x = t * halfW * 0.86;
      const z = -depth * 0.72 + (Math.random() - 0.5) * 4;
      const trunk = cyl(0.22 * sc, 0.3 * sc, 3.0 * sc, 5, M.mtnTrunk || M.woodDark, false);
      trunk.position.set(x, height * 0.86 + 1.5 * sc, z);
      g.add(trunk);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.5 * sc, 4.6 * sc, 6), M.mtnLeaf || M.cliffGrass);
      leaf.position.set(x, height * 0.86 + 3.6 * sc, z);
      leaf.castShadow = true;
      g.add(leaf);
    }
  }

  /* 前排岩块的临水面：水帘、落水潭都从这个位置往南排 */
  const frontZ = depth * 0.18;
  const frontFace = frontZ + 8.4;
  const spillY = height * 0.62;   // 水口的高度

  /* ---- 出水口的石槽：一道浅浅的石唇，水从上面漫出去 ---- */
  {
    // 用崖体同一套岩石材质；用浅色石料会变成瀑布顶上一条突兀的白横杠
    const lip = box(width * 0.42, 0.7, 2.6, M.fallsRock || M.cliff || M.cliffTop);
    lip.position.set(0, spillY - 0.35, frontZ + 6.0);
    lip.receiveShadow = true;
    g.add(lip);
  }

  /* ---- 水帘：三层薄片，越往下越宽，用透明材质叠出水花 ---- */
  const fallMats = [];
  {
    const fallH = spillY + 0.6;
    const sheetTex = fallSheetTexture();
    // 三层同宽：宽度不一样的话，从侧面看就是三块错开的白板。
    // 差别放在透明度、贴图密度和前后位置上，叠起来才有水汽的层次。
    const LAYERS = [
      { wf: 0.62, hf: 1.00, z: 0.0, x: 0.0, op: 0.62, rep: 2.4 },
      { wf: 0.58, hf: 0.97, z: 0.7, x: 0.35, op: 0.44, rep: 3.2 },
      { wf: 0.54, hf: 0.93, z: 1.4, x: -0.3, op: 0.3, rep: 4.1 },
    ];
    LAYERS.forEach((L, i) => {
      const w = width * L.wf;
      const h = fallH * L.hf;
      // 每一层用自己的贴图副本，滚动速度才不同步
      const tex = sheetTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1, L.rep);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xdff1f8, roughness: 0.08, metalness: 0.06,
        transparent: true, opacity: L.op,
        side: THREE.DoubleSide, depthWrite: false,
        alphaMap: tex,
        emissive: 0xc4dfe9, emissiveIntensity: 0.16,
      });
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      sheet.position.set(L.x, spillY - h / 2, frontFace - 0.4 + L.z);
      g.add(sheet);
      fallMats.push(mat);
    });
    // 落水处的白浪：平铺在潭面上的一圈碎沫，别顺着立面往上立——
    // 立起来就是两根白柱子，看着像水泥墩
    const FOAM = new THREE.MeshStandardMaterial({
      color: 0xdfeef2, roughness: 0.85, metalness: 0,
      transparent: true, opacity: 0.72, depthWrite: false,
    });
    // 泡沫贴着落水点聚成一圈，越往外越小越稀
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.pow(Math.random(), 1.6) * width * 0.46;
      const rad = 0.35 + Math.random() * 0.75 * (1 - rr / (width * 0.5));
      const sp = new THREE.Mesh(new THREE.CircleGeometry(rad, 7), FOAM);
      sp.rotation.x = -Math.PI / 2;
      sp.rotation.z = Math.random() * Math.PI;
      sp.scale.y = 0.5 + Math.random() * 0.5;
      sp.position.set(Math.cos(a) * rr, 0.42, frontFace + width * 0.16 + Math.sin(a) * rr * 0.7);
      g.add(sp);
    }
  }

  /* ---- 落水潭 ---- */
  const poolZ = frontFace + width * 0.42;
  {
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(width * 0.68, 28),
      M.poolWater
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.36, poolZ);
    pool.scale.set(1.25, 1, 0.95);
    pool.receiveShadow = true;
    g.add(pool);

    // 潭边的石圈
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = width * 0.74;
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.1 + Math.random() * 1.0, 0), M.stone
      );
      st.position.set(Math.cos(a) * r * 1.24, 0.3, poolZ + Math.sin(a) * r * 0.94);
      st.rotation.set(Math.random(), Math.random(), Math.random());
      st.scale.y = 0.6;
      st.castShadow = true;
      st.receiveShadow = true;
      g.add(st);
    }
  }

  /* ---- 水雾：几张朝上的半透明白片，主循环里缓缓呼吸 ---- */
  const mist = [];
  {
    const mat = new THREE.SpriteMaterial({
      map: M.mistMap, color: 0xffffff, transparent: true, opacity: 0.3,
      depthWrite: false, toneMapped: false,
    });
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(mat.clone());
      // 水雾只落在潭面上方，不要横着铺到崖壁前面去
      sp.position.set((Math.random() - 0.5) * width * 0.9, 1.0 + Math.random() * 3.2,
        poolZ - width * 0.3 + Math.random() * width * 0.7);
      const s = 9 + Math.random() * 10;
      sp.scale.set(s, s * 0.55, 1);
      sp.userData.base = sp.position.y;
      sp.userData.seed = Math.random() * 10;
      g.add(sp);
      mist.push(sp);
    }
  }

  g.userData.mist = mist;
  g.userData.fallMats = fallMats;
  return g;
}

function scaledWater(map, rx, ry) {
  if (!map) return null;
  const t = map.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

/* ============================================================
 *  高山：远处的锥体山 + 近处的岩壁 + 山顶积雪
 * ========================================================== */
/**
 * 一座山：几层锥体堆出轮廓，山顶盖雪，山脚铺碎石与松树。
 * 以 (0,0) 为山脚中心，h 是总高，r 是山脚半径。
 */
export function makeMountain(M, { h = 150, r = 110, snow = true, seed = 1 } = {}) {
  const g = new THREE.Group();
  let rnd = seed * 9301 + 49297;
  const rand = () => ((rnd = (rnd * 9301 + 49297) % 233280) / 233280);

  // 山形：极坐标下的一张高度场
  //
  //   半径按 f^0.9 张开（山脚缓、山顶收得快），
  //   高度按 (1-f)^1.4 下落，
  //   再叠三层低频起伏，让轮廓不是规整的圆锥。
  // 之所以不用锥体 + 顶点扰动：锥体的环向分段是直线，扰动后相邻环之间会
  // 露成一条条锯齿带，远看就是层层的横纹。高度场是索引几何，法线自动平滑。
  const profile = (f) => h * Math.pow(1 - f, 1.4);
  const radiusAt = (f) => r * Math.pow(f, 0.92);

  /** 山体表面在 (角度, 半径比例) 处的点 */
  const surface = (ang, f) => {
    const wob =
      1 +
      Math.sin(ang * 3.0 + seed) * 0.130 +
      Math.sin(ang * 5.5 - seed * 1.7) * 0.055 +
      Math.sin(ang * 9.1 + seed * 2.3) * 0.022;
    const rr = radiusAt(f) * wob;
    const yy = profile(f) * (1 + Math.sin(ang * 2.4 + seed * 1.3) * 0.07);
    return [Math.cos(ang) * rr, yy, Math.sin(ang) * rr];
  };

  const SEG = 72;
  const RINGS = 26;
  {
    const verts = [];
    const cols = [];
    const idx = [];
    const c = new THREE.Color();
    // 注意：顶点的颜色是线性空间，而材质又是无贴图的纯色，
    // 场景里日光 2.6 + 半球光 1.15，setHex 出来的颜色会被照得很亮，
    // 所以这几个值都比"看上去该有的灰"再压暗一档
    // 场景里日光 2.6 + 半球光 1.15，还有 ACES 色调映射，
    // 这几个值看着偏暗，渲出来才是正常的岩石灰
    const ROCK_LO = new THREE.Color(0x3a4231);   // 山脚：草与泥混着岩
    const ROCK_MID = new THREE.Color(0x565d64);  // 山腰：裸岩
    const ROCK_HI = new THREE.Color(0xf2f7fb);   // 雪线以上
    const snowLine = snow ? 0.84 : 1.2;

    for (let i = 0; i <= RINGS; i++) {
      const f = i / RINGS;                       // 0 = 山顶, 1 = 山脚
      for (let j = 0; j <= SEG; j++) {
        const ang = (j / SEG) * Math.PI * 2;
        const [x, y, z] = surface(ang, f);
        verts.push(x, y, z);

        const t = Math.max(0, Math.min(1, y / h));
        if (t < 0.30) c.copy(ROCK_LO).lerp(ROCK_MID, t / 0.30);
        else if (t < snowLine) c.copy(ROCK_MID);
        // 雪线不是一条硬边：0.16 的高度里从岩渐变到雪，边缘才不像贴上去的
        else c.copy(ROCK_MID).lerp(ROCK_HI, Math.min(1, (t - snowLine) / 0.10));
        // 沟脊的明暗：跟山形用同一组频率，颜色才和轮廓对得上
        const k = 0.93 + Math.sin(ang * 3.0 + seed) * 0.045 + Math.sin(t * 6.0 + seed) * 0.035;
        cols.push(c.r * k, c.g * k, c.b * k);
      }
    }
    const stride = SEG + 1;
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SEG; j++) {
        const a = i * stride + j;
        const b = a + 1;
        const cc = a + stride;
        const d = cc + 1;
        // 绕序：环从山顶往下排、角度逆时针增，这一序法线才朝外
        idx.push(a, b, cc, b, d, cc);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, metalness: 0,
    });
    const m = new THREE.Mesh(geo, rockMat);
    // 只投影、不接收：山体是一大片连续曲面，接受 8K 阴影会起条纹状自阴影
    m.castShadow = true;
    m.receiveShadow = false;
    g.add(m);
  }

  /* ---- 山腰的松林：贴合坡面，越往上越稀 ---- */
  {
    const treeN = 54;
    for (let i = 0; i < treeN; i++) {
      const ang = rand() * Math.PI * 2;
      const f = 0.42 + Math.pow(rand(), 0.7) * 0.56;   // 0.42 = 山腰, 1 = 山脚
      const [x, y, z] = surface(ang, f);
      const sc = 0.65 + rand() * 0.9;
      const trunk = cyl(0.2 * sc, 0.3 * sc, 2.4 * sc, 5, M.mtnTrunk, false);
      trunk.position.set(x, y + 1.2 * sc, z);
      g.add(trunk);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.5 * sc, 5.0 * sc, 6), M.mtnLeaf);
      leaf.position.set(x, y + 3.6 * sc, z);
      leaf.castShadow = true;
      g.add(leaf);
    }
  }

  /* ---- 山脚碎石 ---- */
  for (let i = 0; i < 20; i++) {
    const ang = rand() * Math.PI * 2;
    const f = 0.96 + rand() * 0.10;
    const [x, , z] = surface(ang, f);
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 + rand() * 2.4, 0), M.stone);
    st.position.set(x, 0.5, z);
    st.rotation.set(rand(), rand(), rand());
    st.scale.y = 0.55;
    st.castShadow = true;
    st.receiveShadow = true;
    g.add(st);
  }

  return g;
}

/* ============================================================
 *  湖泊与沼泽：静水 + 睡莲 + 沼泽草
 * ========================================================== */
export function makeLake(M, { r = 30, rect = 1.35 } = {}) {
  const g = new THREE.Group();

  const bed = new THREE.Mesh(new THREE.CircleGeometry(r * 1.18, 32), M.riverBed);
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = 0.02;
  bed.scale.x = rect;
  bed.receiveShadow = true;
  g.add(bed);

  const water = new THREE.Mesh(new THREE.CircleGeometry(r, 40), M.lakeWater);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.3;
  water.scale.x = rect;
  water.receiveShadow = true;
  g.add(water);

  // 睡莲：一串浮在水面的小圆盘 + 偶尔一朵白花
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * r * 0.82;
    const x = Math.cos(a) * rr * rect;
    const z = Math.sin(a) * rr;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.55 + Math.random() * 0.5, 9), M.lilyPad);
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = Math.random() * Math.PI;
    pad.position.set(x, 0.34, z);
    pad.receiveShadow = true;
    g.add(pad);
    if (Math.random() < 0.28) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), M.lilyFlower);
      flower.position.set(x, 0.44, z);
      flower.scale.y = 0.7;
      g.add(flower);
    }
  }

  // 岸边的芦苇与香蒲
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = r * (1.02 + Math.random() * 0.16);
    const x = Math.cos(a) * rr * rect;
    const z = Math.sin(a) * rr;
    for (let k = 0; k < 3; k++) {
      const reed = box(0.04, 0.8 + Math.random() * 0.8, 0.04, M.reed, false);
      reed.position.set(x + (Math.random() - 0.5) * 0.7, 0.55, z + (Math.random() - 0.5) * 0.7);
      reed.rotation.z = (Math.random() - 0.5) * 0.4;
      g.add(reed);
    }
    // 香蒲的穗
    if (Math.random() < 0.2) {
      const head = cyl(0.07, 0.09, 0.34, 5, M.cattail, false);
      head.position.set(x, 1.35, z);
      g.add(head);
    }
  }

  g.userData.waterY = 0.3;
  g.userData.radius = r * rect;
  return g;
}

/* ============================================================
 *  花甸：一片开花的草坡（随机撒花，四种颜色）
 * ========================================================== */
export function makeMeadow(M, { w = 46, d = 34, flowers = 260 } = {}) {
  const g = new THREE.Group();

  /* 不另铺地面：地形本身是平的草地，铺一块只会露出一道色差边。
   * 花直接撒在草地上，外圈撒得稀，边界自然过渡。 */
  const falloff = (x, z) => {
    const ex = Math.abs(x) / (w / 2);
    const ez = Math.abs(z) / (d / 2);
    return Math.max(ex, ez); // 0 中心，1 边缘
  };

  /* 花：成簇地开，一簇里同一个色，远看才有花海的色块感。
   * 材质先建好共用——每簇新建一个的话，合并时会被拆成十几批。 */
  const PETALS = [0xf7e27a, 0xef9fc4, 0xc7b4ee, 0xf6f2e4, 0xf2b06a]
    .map((c) => solid(c, { flatShading: true }));
  const CLUSTERS = Math.max(6, Math.round(flowers / 22));
  for (let c = 0; c < CLUSTERS; c++) {
    const cx = (Math.random() - 0.5) * w * 0.86;
    const cz = (Math.random() - 0.5) * d * 0.86;
    const mat = PETALS[c % PETALS.length];
    const n = 12 + Math.floor(Math.random() * 14);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.pow(Math.random(), 0.7) * 3.4;
      const x = cx + Math.cos(a) * rr;
      const z = cz + Math.sin(a) * rr;
      if (falloff(x, z) > 1) continue;
      const stem = box(0.035, 0.3 + Math.random() * 0.24, 0.035, M.reed, false);
      stem.position.set(x, 0.17, z);
      g.add(stem);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.09, 5, 4), mat);
      head.position.set(x, 0.36 + Math.random() * 0.12, z);
      head.scale.y = 0.5;
      head.castShadow = false;
      g.add(head);
    }
  }

  // 几丛高草：越靠边越稀
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * w * 0.9;
    const z = (Math.random() - 0.5) * d * 0.9;
    if (Math.random() < falloff(x, z) * 0.7) continue;
    for (let k = 0; k < 4; k++) {
      const blade = box(0.04, 0.5 + Math.random() * 0.4, 0.04, M.meadowGrass, false);
      blade.position.set(x + (Math.random() - 0.5) * 0.4, 0.32, z + (Math.random() - 0.5) * 0.4);
      blade.rotation.z = (Math.random() - 0.5) * 0.6;
      blade.rotation.x = (Math.random() - 0.5) * 0.6;
      g.add(blade);
    }
  }

  return g;
}

/* ============================================================
 *  会动的：水鸟、鱼群、虫群
 *  这几个返回 { group, update(dt, elapsed) }
 * ========================================================== */

/** 一只鸟：身子 + 两片会扇的翅膀 + 头颈 */
function birdMesh(M, scale, color) {
  const g = new THREE.Group();
  const bodyMat = solid(color, { flatShading: true });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), bodyMat);
  body.scale.set(0.85, 0.8, 1.7);
  body.castShadow = true;
  g.add(body);

  // 头与颈
  const neck = box(0.07, 0.28, 0.07, bodyMat);
  neck.position.set(0, 0.16, 0.24);
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), bodyMat);
  head.position.set(0, 0.32, 0.30);
  g.add(head);
  const beak = box(0.05, 0.04, 0.16, M.beak);
  beak.position.set(0, 0.31, 0.42);
  g.add(beak);

  // 尾巴
  const tail = box(0.14, 0.05, 0.24, bodyMat);
  tail.position.set(0, 0.02, -0.36);
  tail.rotation.x = 0.2;
  g.add(tail);

  // 翅膀：各自挂在一个枢轴上，主循环里绕 Z 扇
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.12, 0.04, 0);
    const wing = box(0.52, 0.035, 0.3, bodyMat);
    wing.position.set(sx * 0.26, 0, 0);
    wing.rotation.z = sx * 0.08;
    pivot.add(wing);
    g.add(pivot);
    wings.push({ pivot, sx });
  }

  g.scale.setScalar(scale);
  g.userData.wings = wings;
  return g;
}

/**
 * 一群水鸟：绕着湖面/河湾盘旋，翅膀按各自相位扇动。
 * 有些是"落水"的，贴着水面滑。
 */
export function makeBirdFlock(M, {
  count = 14, center = [0, 0], radius = 34, height = 14, color = 0xe8e4da, scale = 1.5,
} = {}) {
  const g = new THREE.Group();
  const birds = [];
  for (let i = 0; i < count; i++) {
    const b = birdMesh(M, scale * (0.8 + Math.random() * 0.5), color);
    const orbit = radius * (0.62 + Math.random() * 0.5);
    const y = height * (0.55 + Math.random() * 0.75);
    const speed = (0.22 + Math.random() * 0.16) * (Math.random() < 0.5 ? 1 : -1);
    b.userData.orbit = orbit;
    b.userData.y = y;
    b.userData.angle = Math.random() * Math.PI * 2;
    b.userData.speed = speed;
    b.userData.flap = 5.5 + Math.random() * 3.5;
    b.userData.phase = Math.random() * Math.PI * 2;
    b.userData.bob = 0.6 + Math.random() * 1.2;
    g.add(b);
    birds.push(b);
  }
  g.position.set(center[0], 0, center[1]);

  return {
    group: g,
    update(dt, elapsed) {
      for (const b of birds) {
        const u = b.userData;
        u.angle += dt * u.speed;
        const x = Math.cos(u.angle) * u.orbit;
        const z = Math.sin(u.angle) * u.orbit;
        b.position.set(x, u.y + Math.sin(elapsed * 0.7 + u.phase) * u.bob, z);
        // 朝向切线方向
        b.rotation.y = -u.angle + (u.speed > 0 ? 0 : Math.PI);
        b.rotation.z = -0.22 * Math.sign(u.speed);
        // 扇翅
        const f = Math.sin(elapsed * u.flap + u.phase);
        for (const w of b.userData.wings) {
          w.pivot.rotation.z = w.sx * (0.18 + f * 0.75);
        }
      }
    },
  };
}

/** 一条鱼：纺锤体 + 尾鳍，主循环里摆尾 */
function fishMesh(M, color, scale) {
  const g = new THREE.Group();
  const mat = solid(color, { roughness: 0.45, metalness: 0.25 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), mat);
  body.scale.set(0.55, 0.7, 1.8);
  g.add(body);
  const tail = box(0.03, 0.2, 0.18, mat);
  tail.position.set(0, 0, -0.34);
  g.add(tail);
  // 背鳍
  const fin = box(0.02, 0.12, 0.22, mat);
  fin.position.set(0, 0.15, 0.02);
  g.add(fin);
  g.userData.tail = tail;
  g.scale.setScalar(scale);
  return g;
}

/**
 * 鱼群：在给定圆域里游，遇到边界就掉头；每条鱼有独立的摆尾相位。
 * y 是水面高度，鱼在半米以下。
 */
export function makeFishShoal(M, {
  count = 22, center = [0, 0], radius = 12, waterY = 0.3, color = 0x8a9a86, scale = 1.0,
} = {}) {
  const g = new THREE.Group();
  const fish = [];
  for (let i = 0; i < count; i++) {
    const f = fishMesh(M, color, scale * (0.7 + Math.random() * 0.7));
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    f.position.set(Math.cos(a) * r, waterY - 0.35 - Math.random() * 0.5, Math.sin(a) * r);
    f.userData.angle = Math.random() * Math.PI * 2;
    f.userData.speed = 0.5 + Math.random() * 0.6;
    f.userData.turn = (Math.random() - 0.5) * 0.9;
    f.userData.phase = Math.random() * Math.PI * 2;
    f.userData.depth = f.position.y;
    g.add(f);
    fish.push(f);
  }
  g.position.set(center[0], 0, center[1]);

  return {
    group: g,
    update(dt, elapsed) {
      for (const f of fish) {
        const u = f.userData;
        u.angle += u.turn * dt;
        // 沿着当前方向前进，越靠近边界越往回拐
        const r = Math.hypot(f.position.x, f.position.z);
        if (r > radius * 0.86) {
          // 朝圆心拐
          const toCenter = Math.atan2(-f.position.z, -f.position.x) + Math.PI / 2;
          let d = toCenter - u.angle;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          u.angle += Math.sign(d) * Math.min(Math.abs(d), dt * 2.4);
        }
        f.position.x += Math.cos(u.angle) * u.speed * dt;
        f.position.z += Math.sin(u.angle) * u.speed * dt;
        f.position.y = u.depth + Math.sin(elapsed * 1.6 + u.phase) * 0.06;
        f.rotation.y = -u.angle + Math.PI / 2;
        f.rotation.z = Math.sin(elapsed * 2 + u.phase) * 0.06;
        if (f.userData.tail) f.userData.tail.rotation.y = Math.sin(elapsed * 9 + u.phase) * 0.5;
      }
    },
  };
}

/**
 * 虫群：蜻蜓 / 蝴蝶，绕着一点乱飞（用三组不同频率的正弦叠加近似）。
 * 白天才活跃，夜里自动淡出。
 */
export function makeInsectSwarm(M, {
  count = 26, center = [0, 0], radius = 9, height = 1.6,
  color = 0xbcd8e0, scale = 0.42, spread = 1.0,
} = {}) {
  const g = new THREE.Group();
  const bugs = [];
  for (let i = 0; i < count; i++) {
    const bug = new THREE.Group();
    const mat = solid(color, { roughness: 0.6, transparent: true, opacity: 0.95, flatShading: true });
    const body = box(0.05, 0.05, 0.22, mat, false);
    bug.add(body);
    // 两对翅：细长薄片
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xf2f8fa, transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, roughness: 0.4, depthWrite: false,
    });
    const wings = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(sx * 0.02, 0.03, sz * 0.03);
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.1), wingMat);
        w.rotation.x = -Math.PI / 2;
        w.position.x = sx * 0.13;
        pivot.add(w);
        bug.add(pivot);
        wings.push({ pivot, sx, sz });
      }
    }
    bug.userData.wings = wings;
    bug.userData.center = new THREE.Vector3(
      (Math.random() - 0.5) * radius * 2 * spread,
      0,
      (Math.random() - 0.5) * radius * 2 * spread
    );
    bug.userData.amp = [radius * (0.4 + Math.random() * 0.6), radius * (0.4 + Math.random() * 0.6)];
    bug.userData.freq = [0.5 + Math.random() * 0.9, 0.4 + Math.random() * 1.1];
    bug.userData.h = height * (0.6 + Math.random() * 0.9);
    bug.userData.phase = Math.random() * Math.PI * 2;
    bug.userData.mat = mat;
    bug.userData.wingMat = wingMat;
    bug.userData.baseOpacity = 0.95;
    bug.scale.setScalar(scale * (0.8 + Math.random() * 0.5));
    g.add(bug);
    bugs.push(bug);
  }
  g.position.set(center[0], 0, center[1]);

  return {
    group: g,
    bugs,
    update(dt, elapsed, dayFactor = 0) {
      // 白天露面，天一黑就藏起来
      const vis = Math.max(0, 1 - dayFactor * 1.6);
      for (const b of bugs) {
        const u = b.userData;
        const t = elapsed + u.phase;
        const x = u.center.x + Math.sin(t * u.freq[0]) * u.amp[0];
        const z = u.center.z + Math.sin(t * u.freq[1] + 1.3) * u.amp[1];
        const y = u.h + Math.sin(t * 2.1) * 0.35;
        b.position.set(x, y, z);
        b.rotation.y = Math.sin(t * 0.8) * Math.PI;
        b.rotation.z = Math.sin(t * 2.4) * 0.2;
        for (const w of u.wings) {
          w.pivot.rotation.z = w.sx * w.sz * (0.5 + Math.sin(t * 34) * 0.6);
        }
        u.mat.opacity = 0.95 * vis;
        u.wingMat.opacity = 0.42 * vis;
        b.visible = vis > 0.02;
      }
    },
  };
}
