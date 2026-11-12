import * as THREE from 'three';
import { REALM_VILLAGES } from '../realms_data.js';
import * as yunjin from './k_yunjin.js';
import * as viking from './k_viking.js';
import * as jungle from './k_jungle.js';
import * as marble from './k_marble.js';
import * as moss from './k_moss.js';
import * as steam from './k_steam.js';
import * as sol from './k_sol.js';

/* ============================================================
 *  七个王国的主题村镇：同一王国共用王镇的建筑风格（cfg 工厂），
 *  再按名册里的主题改地面色、规模、旗色、植被疏密、池塘 / 田垄 / 院墙 / 挂灯等，
 *  地标改成各自的名字与文案。
 * ========================================================== */

const TOWN_FN = { yunjin: yunjin.town, frostfang: viking.town, jadeveil: jungle.town, marmara: marble.town, mosslight: moss.town, steamforge: steam.town, sol: sol.town };

/** 在村里找一块离所有民居都够远的空地（环形搜索，找不到就取最远的） */
function emptySpot(rand, homes, rMin, rMax, clear) {
  let best = null, bestD = -1;
  for (let i = 0; i < 160; i++) {
    const a = rand() * Math.PI * 2, r = rMin + rand() * (rMax - rMin);
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.85;
    let d = Infinity;
    for (const h of homes) d = Math.min(d, Math.hypot(x - h.x, z - h.z));
    d = Math.min(d, Math.hypot(x, z) - 50, Math.hypot(x, z + 34) - 30, Math.hypot(x - 44, z + 4) - 34, Math.hypot(x + 48, z + 6) - 26);
    if (d >= clear) return [x, z];
    if (d > bestD) { bestD = d; best = [x, z]; }
  }
  return best;
}

function decorate(T, v, homes) {
  const { K, P, rand } = T;
  const mods = v.mods || [];
  if (mods.includes('pond')) {
    const [x, z] = emptySpot(rand, homes, 60, 118, 22);
    const R = 14 + rand() * 6;
    const wat = new THREE.Mesh(new THREE.CircleGeometry(R, 28), P.flat(0x4aa0b8, 0.1, { metalness: 0.3 }));
    wat.rotation.x = -Math.PI / 2;
    wat.scale.y = 0.7;
    wat.position.set(x, 0.12, z);
    T.root.add(wat);
    const rim = new THREE.Mesh(new THREE.RingGeometry(R, R + 2.2, 28), P.flat(0x6a7a52, 1));
    rim.rotation.x = -Math.PI / 2;
    rim.scale.y = 0.7;
    rim.position.set(x, 0.1, z);
    T.root.add(rim);
    const reeds = [];
    for (let i = 0; i < 18; i++) { const a = rand() * 6.28; reeds.push({ x: x + Math.cos(a) * (R + 1.2), z: z + Math.sin(a) * (R + 1.2) * 0.7, s: 0.7 + rand() * 0.7, ry: rand() * 6 }); }
    const rg = new THREE.ConeGeometry(0.25, 2.4, 4); rg.translate(0, 1.2, 0);
    T.root.add(K.scatter(rg, P.flat(0x6a8a3a, 1), reeds));
  }
  if (mods.includes('fields')) {
    for (let f = 0; f < 2; f++) {
      const [x, z] = emptySpot(rand, homes, 70, 124, 26);
      const col = [0xc8b050, 0x6a9a3a, 0x9a8a3a, 0x7ab04a][(rand() * 4) | 0];
      const rows = [];
      for (let i = 0; i < 8; i++) rows.push({ x: x + (i - 3.5) * 3, y: 0.18, z, sx: 1.5, sy: 0.36, sz: 22, s: undefined });
      T.root.add(K.scatter(new THREE.BoxGeometry(1, 1, 1), P.flat(col, 1), rows.map((r) => ({ ...r, sx: 1.5, sy: 0.36, sz: 22 })), { cast: false }));
      const soil = new THREE.Mesh(new THREE.BoxGeometry(28, 0.1, 25), P.flat(0x6a5a3a, 1, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      soil.position.set(x, 0.07, z);
      T.root.add(soil);
    }
  }
  if (mods.includes('wall')) {
    const pts = [];
    for (let i = 4; i <= 36; i++) { const a = Math.PI / 2 + (i / 40) * Math.PI * 2; pts.push([Math.cos(a) * 132, Math.sin(a) * 118]); }
    T.root.add(K.wallAlong(pts, { h: 1.4, thick: 0.6, mat: P.stone }));
  }
  if (mods.includes('lights')) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      T.lamp(Math.cos(a) * 62, Math.sin(a) * 52, { h: 3.6, light: i % 5 === 0, gain: 0.45 });
      T.glow(Math.cos(a) * 62, 4.2, Math.sin(a) * 52, { size: 2.2, color: 0xffc070 });
    }
  }
}

function textFor(v) {
  const [a, b, c, d] = v.L;
  return {
    plaza: { name: a, shortName: a, tag: `${v.name}的中心`, desc: v.b, detail: v.d },
    hall: { name: b, shortName: b.length > 4 ? b.slice(0, 4) : b, tag: `${v.name}最显眼的建筑`, desc: `${v.name}的${b}，全村最高、最显眼的建筑。${v.tag}。`, detail: v.d },
    inn: { name: c, shortName: c.length > 4 ? '客栈' : c, tag: '旅人落脚的地方', desc: `${c}，路过${v.name}的旅人都在这里歇脚。`, detail: `在${v.name}，${v.tag}——旅人边吃边听本地人讲。` },
    craft: { name: d, shortName: d.length > 4 ? '工坊' : d, tag: `${v.name}的手艺`, desc: `${d}，${v.name}的本行手艺都出在这里。`, detail: v.d },
    overview: { name: `${v.name} · ${v.en}`, tag: v.tag, desc: v.b, detail: v.d },
  };
}

/** key → 建造函数 (T) => void */
export function realmVillageBuilders() {
  const out = {};
  for (const [kingdom, def] of Object.entries(REALM_VILLAGES)) {
    def.list.forEach((v, i) => {
      const key = `${def.prefix}${i + 1}`;
      out[key] = (T) => {
        TOWN_FN[kingdom](T, (cfg) => {
          cfg.ground = v.g;
          cfg.houseN = v.n;
          cfg.text = textFor(v);
          cfg.groundR = 120;
          cfg.flags = [parseInt(v.color.slice(1), 16), cfg.flags[1]];
          const hall = cfg.hall;
          if (v.sc !== 1) cfg.hall = (T2) => { const g = hall(T2); g.scale.setScalar(v.sc); return g; };
          const mods = v.mods || [];
          const trees = cfg.trees;
          if (mods.includes('sparse')) cfg.trees = (T2, pts) => trees(T2, pts.filter((_, k) => k % 3 === 0));
          else if (mods.includes('dense')) cfg.trees = (T2, pts) => trees(T2, pts.concat(T.K.ringPoints(T.rand, 0, 0, 96, 150, 44)));
          if (mods.includes('fields')) cfg.animalN = 4;
          const extra = cfg.extra;
          cfg.extra = (T2, homes) => { if (extra) extra(T2, homes); decorate(T2, v, homes); };
        });
      };
    });
  }
  return out;
}
