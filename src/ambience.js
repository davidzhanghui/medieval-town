/* ============================================================
 *  环境生命：跟着镜头走的一小团空气
 *
 *  不管飞到世界的哪个角落，镜头注视点周围总有一点活的东西：
 *  白天是顺风飘过的落叶和阳光里的浮尘，夜里是明灭的萤火。
 *  整团粒子只有一百多个，挂在一个组里，每帧把组挪到注视点脚下就行，
 *  所以不用知道世界里哪儿有树、哪儿有草。镜头升到高空或者注视点落在水上时就收起来。
 * ========================================================== */

import * as THREE from 'three';
import { createEmitter } from './kit.js';

export function createAmbience({ scene, camera, controls, isWater }) {
  const group = new THREE.Group();
  group.name = 'ambience';
  scene.add(group);
  const emitters = [];
  const add = (opt) => {
    const e = createEmitter(camera, opt);
    group.add(e.pts);
    emitters.push(e);
  };

  // 落叶：绿、金两色，被风顺着吹
  for (const [c, n] of [[0x6a8a30, 26], [0xd0a030, 20], [0xb8602a, 10]]) {
    add({ y: 6, count: n, life: 8, size: 0.2, color: c, opacity: 0.95,
      spread: [55, 5, 55], vel: [1.5, -0.65, 0.5], jitter: [0.7, 0.2, 0.7], wind: [0.03, 0, 0.01], fadeIn: 0.05, night: 'day' });
  }
  // 阳光里的浮尘
  add({ y: 5, count: 70, life: 3.2, size: 0.1, color: 0xfff4d0, opacity: 0.55, additive: true,
    spread: [30, 8, 30], vel: [0.1, 0.03, 0.05], jitter: [0.12, 0.08, 0.12], fadeIn: 0.45, night: 'day' });
  // 萤火（夜里）
  add({ y: 1.8, count: 60, life: 3.4, size: 0.2, color: 0xd8ff70, opacity: 0.95, additive: true,
    spread: [50, 2.4, 50], vel: [0, 0.03, 0], jitter: [0.4, 0.2, 0.4], fadeIn: 0.3, night: 'only' });

  return {
    update(dt, t, night) {
      const tg = controls.target;
      group.position.set(tg.x, -2.2, tg.z);
      // 镜头太高（俯瞰）或注视点在水上：收起来
      group.visible = camera.position.y < 140 && !isWater(tg.x, tg.z);
      if (!group.visible) return;
      for (const e of emitters) e.update(dt, t, night);
    },
  };
}
