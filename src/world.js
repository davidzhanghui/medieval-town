/* ============================================================
 *  世界蓝图：十个远方村镇的选址、道路与海岸
 *
 *  只放纯数据与几何小函数（不依赖 THREE），main.js 在搭地面、种树之前
 *  就要用它来划"禁种区"，所以必须能最早加载。
 *
 *  坐标系与主场景一致：x 向东、z 向南，草地平面 y = -2.2。
 *  原有世界占据 r ≲ 800；十个新镇都落在 r ≈ 1000~1700 的外环上。
 * ========================================================== */

/** 草地与世界的半径（原来是 900） */
export const WORLD_R = 2000;

/** 南面的海：一个巨大的圆，圆心在很远的南方，只有北缘露在草地范围里 */
export const SEA = { x: 0, z: 3400, r: 1760 };

/**
 * 十个村镇。
 *  rot  ：镇子"正面"朝向（局部 +Z 指向来路）
 *  R    ：镇子占地半径（禁种树、禁摆岩石）
 *  showR：相机离镇心多近时才渲染它（省 draw call）
 */
export const SITES = [
  {
    key: 'harbor', name: '灯塔港', en: 'Lanternport', tag: '海边的第一盏灯',
    x: -260, z: 1560, rot: 0, R: 150, showR: 1250, color: '#4a8fb0',
  },
  {
    key: 'mining', name: '铁砧矿镇', en: 'Ironhold', tag: '山肚子里的叮当声',
    x: 950, z: -760, rot: 0.6, R: 140, showR: 1250, color: '#8a7a6a',
  },
  {
    key: 'vintner', name: '酒乡', en: 'Vintner’s Vale', tag: '阳坡上的一百行葡萄',
    x: -980, z: 760, rot: -0.7, R: 160, showR: 1250, color: '#8a3a5a',
  },
  {
    key: 'oak', name: '古橡镇', en: 'Oakhaven', tag: '住在一棵树下的人',
    x: -980, z: -820, rot: 0.7, R: 150, showR: 1250, color: '#3f6a2f',
  },
  {
    key: 'wool', name: '羊毛染坊镇', en: 'Woolmarket', tag: '一匹布五种颜色',
    x: -120, z: -1080, rot: 0.1, R: 150, showR: 1250, color: '#c9a45e',
  },
  {
    key: 'sky', name: '云顶修道院', en: 'Skyhold', tag: '悬在半空的祈祷',
    x: 1300, z: -120, rot: -1.9, R: 130, showR: 1500, color: '#a8a8b8',
  },
  {
    key: 'marsh', name: '沼泽水乡', en: 'Marshmere', tag: '脚下全是水的镇子',
    x: 860, z: 1000, rot: -2.6, R: 170, showR: 1250, color: '#5f7f55',
  },
  {
    key: 'frost', name: '雪岭长屋', en: 'Frostholm', tag: '冬天比夏天长的地方',
    x: 420, z: -1560, rot: 0.2, R: 150, showR: 1250, color: '#cfe0ea',
  },
  {
    key: 'scholar', name: '学者镇', en: 'Scholarium', tag: '把世界抄进书里',
    x: -1450, z: 80, rot: 1.5, R: 140, showR: 1250, color: '#6a6aa8',
  },
  {
    key: 'bazaar', name: '商队集市', en: 'Caravan Bazaar', tag: '丝绸与香料的尽头',
    x: 1500, z: 760, rot: -2.0, R: 190, showR: 1400, color: '#d0904a',
  },
];

/**
 * 主干道（折线，会在 expansion.js 里做样条平滑）。
 * 起点都接在原有世界已有的节点上；穿河的路线借用已有的两座桥。
 */
export const ROADS = [
  // 北：比武场外围 → 羊毛镇 → 雪岭
  { name: '北路', w: 5.0, pts: [[20, -218], [10, -420], [-30, -700], [-80, -900], [-120, -1000]] },
  { name: '雪岭路', w: 4.6, pts: [[-120, -1080], [60, -1230], [260, -1400], [380, -1500], [420, -1530]] },
  // 东北：比武场外围 → 铁砧矿镇 → 云顶
  { name: '矿路', w: 5.0, pts: [[306, -246], [390, -420], [600, -610], [800, -700], [920, -745]] },
  { name: '云梯路', w: 4.4, pts: [[950, -760], [1080, -520], [1200, -300], [1280, -190]] },
  // 西北：修道院外围 → 古橡镇
  { name: '林路', w: 4.6, pts: [[-372, -206], [-560, -400], [-760, -620], [-900, -760], [-950, -790]] },
  // 西：客栈外围 → 学者镇
  { name: '西路', w: 5.0, pts: [[-352, 140], [-640, 130], [-950, 110], [-1250, 90], [-1410, 80]] },
  // 西南：客栈外围 → 酒乡
  { name: '酒路', w: 4.6, pts: [[-286, 262], [-470, 430], [-700, 620], [-900, 740], [-945, 800]] },
  // 南：渡口镇 → 灯塔港
  { name: '港路', w: 5.0, pts: [[34, 530], [10, 800], [-90, 1100], [-200, 1380], [-250, 1500]] },
  // 东南：渡口镇 → 沼泽 → 商队集市
  { name: '沼路', w: 4.6, pts: [[80, 520], [300, 650], [560, 820], [780, 950], [830, 980]] },
  { name: '商队路', w: 5.4, pts: [[900, 1010], [1120, 960], [1320, 860], [1450, 790]] },
  // 云顶 ↔ 商队集市（沿东缘贯通南北）
  { name: '东缘路', w: 4.4, pts: [[1300, -40], [1380, 220], [1450, 520], [1490, 700]] },
];

/** Catmull-Rom 折线平滑，返回 [[x,z],…]，步长约 step 米 */
export function smoothPath(pts, step = 24) {
  const out = [];
  const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([...pts[pts.length - 1]]);
  return out;
}

/** 给 CLEAR_ZONES 用：十个镇子 + 沿路的走廊（每 36 米一个小圆） */
export function expansionClearZones() {
  const zones = SITES.map((s) => ({ x: s.x, z: s.z, r: s.R }));
  for (const road of ROADS) {
    for (const [x, z] of smoothPath(road.pts, 36)) zones.push({ x, z, r: road.w / 2 + 5 });
  }
  return zones;
}

/** 点到海的"陆地深度"：>0 在海里 */
export function seaDepth(x, z) {
  return SEA.r - Math.hypot(x - SEA.x, z - SEA.z);
}
