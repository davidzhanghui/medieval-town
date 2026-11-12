import * as THREE from 'three';
import { buildTownSite } from './kingdom_common.js';
import { solKit } from './sol_shared.js';

/* ============================================================
 *  琥珀王国的"参数化村镇"：给补出来的六处村镇用，布局与其它王国的王镇同一套骨架
 * ========================================================== */

export function town(T, tweak) {
  const { K, P, rand } = T;
  const { box, cyl, cone } = K;
  const S = solKit(P, K);
  const { M } = S;
  const cfg = {
    ground: 0xb5a266, paving: M.paving, robes: S.ROBES, flags: [0x1f8c92, 0xe0ac2e], houseN: 40, birdColor: 0xf6f0e0, glow: 0xffc070,
    centerpiece() {
      const g = new THREE.Group();
      g.add(S.fountain(3.8));
      return g;
    },
    stall(T2, r, i) { return S.stall(T2, r, M.awning[i % 6]); },
    hall() {
      const g = new THREE.Group();
      const b = box(20, 8, 16, M.white);
      b.position.y = 4;
      g.add(b);
      const d = S.bigDome(6.2, { cap: M.gold, drum: M.sandL, drumH: 3, onionTop: true });
      d.position.y = 8;
      g.add(d);
      const m = S.minaret(28, 1.5, { cap: M.teal });
      m.position.set(12, 0, 4);
      g.add(m);
      return g;
    },
    inn() {
      const g = new THREE.Group();
      const b = box(28, 5.5, 20, M.cream);
      b.position.y = 2.75;
      g.add(b);
      const court = box(16, 0.2, 10, M.dark, false);
      court.position.set(0, 5.6, 0);
      g.add(court);
      for (const sx of [-1, 1]) {
        const d = S.bigDome(3.2, { cap: M.teal, drum: M.sandL, drumH: 2 });
        d.position.set(sx * 11, 5.5, 7);
        g.add(d);
      }
      const door = box(4, 4.2, 0.4, M.door);
      door.position.set(0, 2.1, 10.1);
      g.add(door);
      return g;
    },
    craft() {
      const g = new THREE.Group();
      const b = box(14, 4, 10, M.ochre);
      b.position.set(0, 2, -3);
      g.add(b);
      const aw = box(14, 0.15, 4, P.flat(0xc8452f, 0.9), false);
      aw.position.set(0, 3.6, 4.2);
      g.add(aw);
      g.add(S.pots(Array.from({ length: 14 }, (_, i) => [-6 + (i % 7) * 2, 3 + ((i / 7) | 0) * 2]), rand));
      return g;
    },
    house: (T2, r, x, z, ry) => S.whiteHouse(T2, r, x, z, ry),
    trees(T2, pts) {
      T2.add(S.cypresses(pts.slice(0, 18), rand), 0, 0);
      T2.add(S.olives(pts.slice(18), rand), 0, 0);
    },
    animal() { return K.makeSheepLite(P, { tone: [0x8a6a4a, 0xb59a74, 0x3a2f28][(rand() * 3) | 0], scale: 0.85 }); },
    animalN: 10,
    text: {
      plaza: { name: '集市广场', shortName: '广场', tag: '喷泉与遮阳棚', desc: '铺石广场中央是一口喷泉，四周是撑着彩色遮阳棚的摊位。', detail: '喷泉是全村唯一不收费的水源。' },
      hall: { name: '大圆顶清真寺式礼堂', shortName: '礼堂', tag: '金色圆顶', desc: '白墙金顶的礼堂，旁边一座细高的塔。', detail: '礼堂的圆顶是远处旅人认路的标志。' },
      inn: { name: '驿馆', shortName: '客栈', tag: '带中庭的大馆', desc: '一座带中庭的两层驿馆。', detail: '商旅在这里歇脚。' },
      craft: { name: '作坊', shortName: '工坊', tag: '陶罐与遮阳', desc: '作坊前摆着一排陶罐。', detail: '' },
      overview: { name: '琥珀村镇', tag: '白房子与圆顶', desc: '琥珀王国的村镇。', detail: '' },
    },
    beacon() {
      const g = new THREE.Group();
      const b = box(20, 8, 16, M.white);
      b.position.set(0, 4, -34);
      g.add(b);
      const d = S.bigDome(6.2, { cap: M.gold, drum: M.sandL, drumH: 3, onionTop: true });
      d.position.set(0, 8, -34);
      g.add(d);
      return g;
    },
  };
  if (tweak) tweak(cfg, T);
  buildTownSite(T, cfg);
}
