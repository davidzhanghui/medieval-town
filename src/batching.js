import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
 *  静态批处理（Static Batching）
 *
 *  场景里有几千个只摆一次、再也不动的小网格（砖、梁、窗、瓦……），
 *  每个都是一次 draw call，阴影 pass 里还要再画一遍。
 *  这里把"确认不会动"的网格按 (材质, 阴影标志, 属性签名, 空间格子) 烘成世界坐标的大网格：
 *  同材质、同格子的几百个碎件 → 一次绘制；格子仍可被视锥与距离剔除。
 *
 *  "会不会动"不靠人工清单，靠观察：调用方给一个 probe(i)，把场景推进到几个差异很大的
 *  状态（白天/夜晚、集日开/关、闸门升/落、不同时刻），我们记录每个网格的世界矩阵、
 *  有效可见性与顶点缓冲版本，凡是出现变化的网格（连同被登记为拾取对象的）都原样保留。
 * ========================================================== */

const EPS = 1e-5;

function effectiveVisible(o) {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

function attrSignature(geo) {
  const names = Object.keys(geo.attributes).sort();
  return names.map((n) => `${n}${geo.attributes[n].itemSize}${geo.attributes[n].normalized ? 'n' : ''}`).join(',') + (geo.index ? '|i' : '|n');
}

/**
 * @param {THREE.Scene} scene
 * @param {object} opt
 * @param {Set<THREE.Object3D>} opt.skip     整棵子树都不碰的节点
 * @param {Set<THREE.Mesh>}     opt.pickSet  可拾取的网格（材质会在悬停时被改）
 * @param {number}              opt.probes   probe 次数
 * @param {(i:number)=>void}    opt.probe    把场景推进到第 i 个状态（调用方负责 updateMatrixWorld 前的变更）
 * @param {number}              opt.cell     空间格子边长（米）
 */
export function batchStatic(scene, { skip, pickSet, probes = 3, probe, cell = 110, maxRadius = 90, skipMats = new Set(), pickables = [] }) {
  const t0 = performance.now();

  /* 1. 候选：普通网格，单材质，不透明，没有任何运行期着色器改写 */
  const cand = [];
  const skipped = new Set();
  const markSkipped = (root) => root.traverse((o) => skipped.add(o));
  for (const s of skip) markSkipped(s);
  scene.traverse((o) => {
    if (skipped.has(o)) return;
    if (o.userData && (o.userData.keepSeparate || o.userData.noBatch)) { markSkipped(o); return; }
  });

  scene.updateMatrixWorld(true);
  const sph = new THREE.Sphere();
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || skipped.has(o)) return;
    const m = o.material;
    if (!m || Array.isArray(m) || m.transparent || m.depthWrite === false || skipMats.has(m)) return;
    if (m.isShaderMaterial || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return;
    if (m.userData && (m.userData.wind || m.userData.noBatch)) return;
    if (o.renderOrder !== 0 || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
    const g = o.geometry;
    if (!g || !g.attributes.position || g.morphAttributes.position) return;
    if (!effectiveVisible(o)) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
    if (sph.radius > maxRadius) return;   // 地面、群山、大河这类大块头原样留着
    cand.push(o);
  });

  /* 2. 观察：推进几个差异很大的状态，记录变化 */
  const snap = (list) => list.map((o) => ({
    e: o.matrixWorld.elements.slice(),
    v: effectiveVisible(o),
    ver: o.geometry.attributes.position.version,
  }));
  const allNodes = [];
  scene.traverse((o) => { if (o !== scene && !skipped.has(o)) allNodes.push(o); });
  const nodeBase = allNodes.map((o) => o.matrix.elements.slice());
  const nodeMoves = new Uint8Array(allNodes.length);
  const base = snap(cand);
  const dynamic = new Set();
  const why = new Map();
  for (let i = 0; i < probes; i++) {
    probe(i);
    scene.updateMatrixWorld(true);
    for (let k = 0; k < allNodes.length; k++) {
      const a = nodeBase[k], b = allNodes[k].matrix.elements;
      for (let j = 0; j < 16; j++) if (Math.abs(a[j] - b[j]) > EPS) { nodeMoves[k] = 1; break; }
    }
    const cur = snap(cand);
    for (let k = 0; k < cand.length; k++) {
      const a = base[k], b = cur[k];
      if (a.v !== b.v || a.ver !== b.ver) { dynamic.add(cand[k]); why.set(cand[k], a.v !== b.v ? 'vis' : 'ver'); continue; }
      for (let j = 0; j < 16; j++) {
        if (Math.abs(a.e[j] - b.e[j]) > EPS) { dynamic.add(cand[k]); why.set(cand[k], 'mat'); break; }
      }
    }
  }
  probe(-1);   // 复位
  scene.updateMatrixWorld(true);

  /* 2b. 冻结：整个探测过程里本地矩阵纹丝不动的节点，不再每帧重算矩阵
   *     （两万个节点的 updateMatrixWorld 约占每帧 4 毫秒） */
  let frozen = 0;
  allNodes.forEach((o, k) => {
    if (nodeMoves[k] || !o.matrixAutoUpdate || o.isCamera || o.isLight) return;
    o.updateMatrix();
    o.matrixAutoUpdate = false;
    frozen++;
  });

  /* 3. 分桶、烘合 */
  const buckets = new Map();
  const geoUsers = new Map();   // 几何体 -> 仍在使用它的网格数
  scene.traverse((o) => {
    if (o.isMesh && o.geometry) geoUsers.set(o.geometry, (geoUsers.get(o.geometry) || 0) + 1);
  });

  const c = new THREE.Vector3();
  for (const o of cand) {
    if (dynamic.has(o)) continue;
    const g = o.geometry;
    sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
    c.copy(sph.center);
    const key = [
      o.material.uuid, o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0, attrSignature(g),
      Math.floor(c.x / cell), Math.floor(c.z / cell),
      // 可拾取的网格只在自己的建筑根内合并（点击/高亮要认得出是哪一栋）
      pickSet.has(o) ? o.userData.root.uuid : '',
    ].join('|');
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [], pickRoot: pickSet.has(o) ? o.userData.root : null }));
    b.list.push(o);
  }

  const root = new THREE.Group();
  root.name = 'batched-static';
  const rel = new THREE.Matrix4();
  const gone = new Set();
  let merged = 0;
  let chunks = 0;
  for (const b of buckets.values()) {
    if (b.list.length < 2) continue;   // 单个的合了也没收益
    const geos = [];
    let inv = null;
    if (b.pickRoot) inv = new THREE.Matrix4().copy(b.pickRoot.matrixWorld).invert();
    for (const o of b.list) {
      let g = o.geometry.clone();
      if (b.pickRoot) { rel.copy(inv).multiply(o.matrixWorld); g.applyMatrix4(rel); } else g.applyMatrix4(o.matrixWorld);
      // 镜像变换会翻转三角形绕向，需要补回来
      if (o.matrixWorld.determinant() < 0) {
        if (g.index) {
          const idx = g.index.array;
          for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
          g.index.needsUpdate = true;
        } else {
          for (const name in g.attributes) {
            const a = g.attributes[name];
            const arr = a.array, s = a.itemSize;
            for (let i = 0; i < a.count; i += 3) {
              for (let k = 0; k < s; k++) {
                const t = arr[i * s + k];
                arr[i * s + k] = arr[(i + 2) * s + k];
                arr[(i + 2) * s + k] = t;
              }
            }
          }
        }
      }
      geos.push(g);
    }
    let out = null;
    try { out = mergeGeometries(geos, false); } catch (e) { out = null; }
    for (const g of geos) g.dispose();
    if (!out) continue;
    out.computeBoundingSphere();
    const mesh = new THREE.Mesh(out, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    mesh.matrixAutoUpdate = false;
    if (b.pickRoot) {
      b.pickRoot.add(mesh);
      mesh.userData.root = b.pickRoot;
      mesh.updateMatrix();
      mesh.matrixWorld.copy(b.pickRoot.matrixWorld);
      pickables.push(mesh);
    } else root.add(mesh);
    chunks++;
    for (const o of b.list) {
      gone.add(o);
      if (o.parent) o.parent.remove(o);
      merged++;
      const g = o.geometry;
      const left = geoUsers.get(g) - 1;
      geoUsers.set(g, left);
      if (left <= 0) g.dispose();
    }
  }
  scene.add(root);
  if (gone.size) {
    let w = 0;
    for (let i = 0; i < pickables.length; i++) if (!gone.has(pickables[i])) pickables[w++] = pickables[i];
    pickables.length = w;
  }

  const info = { frozen, candidates: cand.length, dynamic: dynamic.size, merged, chunks, ms: Math.round(performance.now() - t0) };
  console.info(`[batching] 候选 ${info.candidates}，会动 ${info.dynamic}，冻结节点 ${info.frozen}，烘合 ${info.merged} → ${info.chunks} 个网格，耗时 ${info.ms} ms`);
  if (typeof window !== 'undefined') {
    const tally = {};
    for (const o of dynamic) {
      let top = o; while (top.parent && top.parent !== scene) top = top.parent;
      const k = `${why.get(o)}:#${scene.children.indexOf(top)} kids${top.children.length} @${Math.round(top.position.x)},${Math.round(top.position.z)}`;
      tally[k] = (tally[k] || 0) + 1;
    }
    window.__batchDebug = tally;
  }
  return info;
}
