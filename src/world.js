/* ============================================================
 *  世界蓝图：十个远方村镇的选址、道路与海岸
 *
 *  只放纯数据与几何小函数（不依赖 THREE），main.js 在搭地面、种树之前
 *  就要用它来划"禁种区"，所以必须能最早加载。
 *
 *  坐标系与主场景一致：x 向东、z 向南，草地平面 y = -2.2。
 *  原有世界占据 r ≲ 800；十个新镇都落在 r ≈ 1000~1700 的外环上。
 * ========================================================== */

import { REALM_VILLAGES } from './realms_data.js';

/** 草地与世界的半径（原来是 900） */
export const WORLD_R = 3300;

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
    x: -260, z: 1560, rot: 0, R: 150, showR: 850, color: '#4a8fb0',
  },
  {
    key: 'mining', name: '铁砧矿镇', en: 'Ironhold', tag: '山肚子里的叮当声',
    x: 950, z: -760, rot: 0.6, R: 140, showR: 850, color: '#8a7a6a',
  },
  {
    key: 'vintner', name: '酒乡', en: 'Vintner’s Vale', tag: '阳坡上的一百行葡萄',
    x: -980, z: 760, rot: -0.7, R: 160, showR: 850, color: '#8a3a5a',
  },
  {
    key: 'oak', name: '古橡镇', en: 'Oakhaven', tag: '住在一棵树下的人',
    x: -980, z: -820, rot: 0.7, R: 150, showR: 850, color: '#3f6a2f',
  },
  {
    key: 'wool', name: '羊毛染坊镇', en: 'Woolmarket', tag: '一匹布五种颜色',
    x: -120, z: -1080, rot: 0.1, R: 150, showR: 850, color: '#c9a45e',
  },
  {
    key: 'sky', name: '云顶修道院', en: 'Skyhold', tag: '悬在半空的祈祷',
    x: 1300, z: -120, rot: -1.9, R: 130, showR: 1000, color: '#a8a8b8',
  },
  {
    key: 'marsh', name: '沼泽水乡', en: 'Marshmere', tag: '脚下全是水的镇子',
    x: 860, z: 1000, rot: -2.6, R: 170, showR: 850, color: '#5f7f55',
  },
  {
    key: 'frost', name: '雪岭长屋', en: 'Frostholm', tag: '冬天比夏天长的地方',
    x: 420, z: -1560, rot: 0.2, R: 150, showR: 850, color: '#cfe0ea',
  },
  {
    key: 'scholar', name: '学者镇', en: 'Scholarium', tag: '把世界抄进书里',
    x: -1450, z: 80, rot: 1.5, R: 140, showR: 850, color: '#6a6aa8',
  },
  {
    key: 'bazaar', name: '商队集市', en: 'Caravan Bazaar', tag: '丝绸与香料的尽头',
    x: 1500, z: 760, rot: -2.0, R: 190, showR: 950, color: '#d0904a',
  },

  /* ---------- 琥珀王国 Solmira：北境偏西的邻国，风格与老王国完全不同 ---------- */
  {
    key: 'solcastle', kingdom: 'sol', name: '琥珀王城', en: 'Aurelia', tag: '金顶、青绿塔和十字水渠',
    x: -720, z: -1500, rot: 0.55, R: 150, showR: 1100, color: '#e0ac2e',
  },
  {
    key: 'soltown', kingdom: 'sol', name: '金砂集市镇', en: 'Souk Halim', tag: '白房子一层层往山上叠',
    x: -560, z: -1330, rot: 0.6, R: 150, showR: 950, color: '#f0e8d0',
  },
  {
    key: 'solvillage', kingdom: 'sol', name: '橄榄村', en: 'Olivar', tag: '山坡上的银灰色梯田',
    x: -420, z: -1180, rot: 0.8, R: 118, showR: 850, color: '#8fa070',
  },
  {
    key: 'soloasis', kingdom: 'sol', name: '枣椰绿洲', en: 'Palmira', tag: '沙里的一块绿',
    x: -930, z: -1350, rot: 0.1, R: 125, showR: 850, color: '#4f8a3a',
  },
  /* ---------- 六个远方王国：世界外环（r≈2500~3000），每国一座王城 + 一座王镇 ---------- */
  { key: 'yjcastle', kingdom: 'yunjin', name: '云锦王城', en: 'Yunjin', tag: '红柱、白墙与飞檐宝塔', x: 2450, z: -250, rot: -1.03, R: 150, showR: 1100, color: '#b5302a' },
  { key: 'yjtown', kingdom: 'yunjin', name: '锦绣镇', en: 'Silkford', tag: '茶香、丝绸与锦鲤池', x: 2250, z: -130, rot: -1.6, R: 150, showR: 950, color: '#4f7a6e' },
  { key: 'fgcastle', kingdom: 'frostfang', name: '霜牙王城', en: 'Frostfang', tag: '龙首门与四十米长厅', x: 300, z: -2600, rot: -0.79, R: 150, showR: 1100, color: '#a8282a' },
  { key: 'fgtown', kingdom: 'frostfang', name: '篝火镇', en: 'Skaldholm', tag: '长船、篝火与晾鱼架', x: 150, z: -2450, rot: 0.29, R: 150, showR: 950, color: '#c4ced2' },
  { key: 'jvcastle', kingdom: 'jadeveil', name: '翡翠王城', en: 'Jadeveil', tag: '太阳金字塔与蛇首门', x: 2500, z: 1250, rot: -2.22, R: 160, showR: 1100, color: '#3aa88a' },
  { key: 'jvtown', kingdom: 'jadeveil', name: '雨神镇', en: 'Chacmool', tag: '茅屋、羽毛与吊床大棚', x: 2330, z: 1120, rot: -1.98, R: 150, showR: 950, color: '#4a7a3a' },
  { key: 'mmcastle', kingdom: 'marmara', name: '大理石王城', en: 'Marmara', tag: '八乘十四根柱子的神殿', x: -2300, z: 1800, rot: 2.29, R: 150, showR: 1100, color: '#f0ece4' },
  { key: 'mmtown', kingdom: 'marmara', name: '白柱镇', en: 'Agora', tag: '蓝门、白墙与橄榄油', x: -2130, z: 1650, rot: 2.49, R: 150, showR: 950, color: '#2f6aa8' },
  { key: 'mlcastle', kingdom: 'mosslight', name: '苔光王城', en: 'Mosslight', tag: '一棵树就是一座宫殿', x: -2250, z: -1500, rot: 0.79, R: 160, showR: 1100, color: '#8a4ac8' },
  { key: 'mltown', kingdom: 'mosslight', name: '蘑菇镇', en: 'Capwick', tag: '萤火、水晶与蘑菇屋', x: -2100, z: -1350, rot: 1.13, R: 150, showR: 950, color: '#e86aa8' },
  { key: 'sfcastle', kingdom: 'steamforge', name: '铆钉王城', en: 'Rivetgate', tag: '齿轮门、玻璃穹顶与飞艇', x: -2500, z: -200, rot: 0.96, R: 150, showR: 1100, color: '#b8663a' },
  { key: 'sftown', kingdom: 'steamforge', name: '齿轮镇', en: 'Cogsmoor', tag: '烟囱林立的红砖镇', x: -2300, z: -60, rot: 1.41, R: 150, showR: 950, color: '#9a5a44' },
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
  // 琥珀王国：羊毛镇 → 橄榄村 → 集市镇 → 王城 → 绿洲，另有一条从古橡镇北上的路
  { name: '琥珀王道', w: 5.2, tint: 0xc9b383, pts: [[-135, -1085], [-260, -1150], [-360, -1170], [-415, -1175]] },
  { name: '橄榄路', w: 4.6, tint: 0xc9b383, pts: [[-425, -1190], [-490, -1250], [-540, -1305], [-558, -1325]] },
  { name: '集市路', w: 5.2, tint: 0xd8c898, pts: [[-565, -1340], [-630, -1410], [-690, -1470], [-715, -1495]] },
  { name: '绿洲路', w: 4.6, tint: 0xc9b383, pts: [[-735, -1500], [-820, -1440], [-885, -1380], [-925, -1355]] },
  { name: '橡树商路', w: 4.6, tint: 0xc9b383, pts: [[-950, -860], [-940, -1040], [-935, -1220], [-930, -1330]] },
  // ---------- 六个远方王国的道路 ----------
  { name: '云锦官道', w: 5.2, tint: 0xb9a98c, pts: [[1310, -90], [1600, -150], [1900, -170], [2120, -140], [2240, -130]] },
  { name: '云锦王道', w: 5.0, tint: 0xb9a98c, pts: [[2262, -124], [2330, -170], [2400, -215], [2440, -245]] },
  { name: '霜牙北路', w: 5.0, tint: 0xc4ced2, pts: [[430, -1570], [380, -1850], [300, -2150], [200, -2380], [155, -2440]] },
  { name: '霜牙王道', w: 5.0, tint: 0xc4ced2, pts: [[162, -2458], [210, -2510], [260, -2560], [292, -2592]] },
  { name: '翡翠商路', w: 5.0, tint: 0xa08a64, pts: [[1520, 780], [1800, 880], [2050, 980], [2250, 1090], [2320, 1112]] },
  { name: '翡翠王道', w: 5.0, tint: 0xa08a64, pts: [[2340, 1128], [2400, 1170], [2460, 1215], [2495, 1243]] },
  { name: '白柱南路', w: 5.0, tint: 0xe0d8c4, pts: [[-980, 790], [-1200, 1000], [-1500, 1250], [-1800, 1500], [-2060, 1630], [-2120, 1645]] },
  { name: '大理石王道', w: 5.0, tint: 0xe0d8c4, pts: [[-2140, 1660], [-2200, 1710], [-2260, 1765], [-2294, 1792]] },
  { name: '苔光林路', w: 4.6, tint: 0x6a8a6a, pts: [[-995, -830], [-1300, -1000], [-1650, -1180], [-1950, -1290], [-2090, -1340]] },
  { name: '苔光王道', w: 4.6, tint: 0x6a8a6a, pts: [[-2108, -1358], [-2160, -1410], [-2210, -1460], [-2244, -1495]] },
  { name: '铆钉铁路', w: 5.0, tint: 0x8a8884, pts: [[-1460, 70], [-1700, 20], [-1950, -20], [-2150, -50], [-2290, -58]] },
  { name: '铆钉王道', w: 5.0, tint: 0x8a8884, pts: [[-2312, -70], [-2370, -110], [-2440, -160], [-2494, -196]] },
  // 云顶 ↔ 商队集市（沿东缘贯通南北）
  { name: '东缘路', w: 4.4, pts: [[1300, -40], [1380, 220], [1450, 520], [1490, 700]] },
];

/* ---------- 七个王国各自的村镇：十处凑满（王城 + 王镇 + 八处主题村镇，琥珀王国补六处） ---------- */
const REALM_CENTER = {
  yunjin: [2350, -190], frostfang: [225, -2525], jadeveil: [2415, 1185],
  marmara: [-2215, 1725], mosslight: [-2175, -1425], steamforge: [-2400, -130], sol: [-640, -1400],
};
const REALM_TINT = {
  yunjin: 0xb9a98c, frostfang: 0xc4ced2, jadeveil: 0xa08a64, marmara: 0xe0d8c4, mosslight: 0x6a8a6a, steamforge: 0x8a8884, sol: 0xc9b383,
};
for (const [kingdom, def] of Object.entries(REALM_VILLAGES)) {
  const [cx, cz] = REALM_CENTER[kingdom];
  def.list.forEach((v, i) => {
    const [x, z] = def.pos[i];
    SITES.push({
      key: `${def.prefix}${i + 1}`, kingdom, name: v.name, en: v.en, tag: v.tag, x, z,
      rot: Math.atan2(cx - x, cz - z), R: 120, showR: 800, color: v.color, village: true,
    });
  });
}

/** 同一王国的站点用最小生成树连起来（原有的城—镇之间已经有路，先视作已连通） */
for (const kingdom of Object.keys(REALM_VILLAGES)) {
  const ss = SITES.filter((s) => s.kingdom === kingdom);
  const parent = ss.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => { parent[find(a)] = find(b); };
  // 原有道路已经连好的：琥珀四处全部；其余各国的 王城↔王镇
  ss.forEach((s, i) => {
    if (s.village) return;
    ss.forEach((t, j) => { if (j > i && !t.village) union(i, j); });
  });
  const edges = [];
  for (let i = 0; i < ss.length; i++) for (let j = i + 1; j < ss.length; j++) {
    edges.push([Math.hypot(ss[i].x - ss[j].x, ss[i].z - ss[j].z), i, j]);
  }
  edges.sort((a, b) => a[0] - b[0]);
  let seq = 0;
  for (const [len, i, j] of edges) {
    if (find(i) === find(j)) continue;
    union(i, j);
    const a = ss[i], b = ss[j];
    const ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
    const px = -uz, pz = ux;
    const wob = ((seq++ % 2) ? 1 : -1) * len * 0.05;
    const at = (t, o) => [Math.round(a.x + ux * (t * len) + px * o), Math.round(a.z + uz * (t * len) + pz * o)];
    ROADS.push({
      name: `${a.name}—${b.name}路`, w: 4.2, tint: REALM_TINT[kingdom],
      pts: [at(18 / len, 0), at(0.33, wob), at(0.66, -wob * 0.6), at(1 - 18 / len, 0)],
    });
  }
}

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
