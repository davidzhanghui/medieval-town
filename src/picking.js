import * as THREE from 'three';

/* 悬停高亮和点击详情。窗户材质要推进 keepWindows，数组由 main 持有。 */
export function createPicking({ keepWindows }) {
const pickables = [];
const interactiveRoots = [];

function registerInteractive(group, info) {
  group.userData.info = info;
  // 同一建筑内，同一个原材质只克隆一份，由所有网格共享：
  // 高亮是整栋一起亮，用不着每个网格一份；独立材质数量直接决定 draw call 的换态次数。
  const cloned = new Map();
  group.traverse((o) => {
    if (o.isMesh) {
      let m = cloned.get(o.material);
      if (!m) {
        m = o.material.clone();
        cloned.set(o.material, m);
        if (m.userData && m.userData.windowGlow) keepWindows.push(m);
      }
      o.material = m;
      o.userData.root = group;
      pickables.push(o);
    }
  });
  group.userData._highlight = false;
  interactiveRoots.push(group);
}

function setHighlight(root, on) {
  if (root.userData._highlight === on) return;
  root.userData._highlight = on;
  root.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.emissive) return;
    // 材质在同一建筑内被多个网格共享，原始发光值要记在材质上而不是网格上
    const ud = o.material.userData;
    if (on) {
      if (ud._origEmissive === undefined) {
        ud._origEmissive = o.material.emissive.getHex();
        ud._origIntensity = o.material.emissiveIntensity ?? 1;
      }
      o.material.emissive.setHex(0xffa04a);
      o.material.emissiveIntensity = 0.055;
    } else if (ud._origEmissive !== undefined) {
      o.material.emissive.setHex(ud._origEmissive);
      o.material.emissiveIntensity = ud._origIntensity;
      ud._origEmissive = undefined;
    }
  });
}
  return { pickables, interactiveRoots, registerInteractive, setHighlight };
}
