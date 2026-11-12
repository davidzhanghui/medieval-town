import * as THREE from 'three';

/* ------------------------------------------------------------
 *  程序化纹理生成（不依赖任何外部图片资源）
 * ---------------------------------------------------------- */

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas, { rx = 1, ry = 1, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

/* ---------------- 石材 ---------------- */
export function stoneTextures() {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3d3830';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 7;
  const bh = 512 / rows;
  const cols = 5;
  const bw = 512 / cols;

  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw * 0.5;
    for (let i = -1; i <= cols; i++) {
      const x = i * bw + off + 2.5;
      const y = r * bh + 2.5;
      const w = bw - 5;
      const h = bh - 5;
      const g = 132 + Math.random() * 42;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fillStyle = `rgb(${(g * 1.04) | 0},${(g * 0.99) | 0},${(g * 0.9) | 0})`;
      ctx.fill();
      ctx.clip();

      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, 'rgba(255,255,255,0.13)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.24)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      for (let k = 0; k < 55; k++) {
        const a = Math.random() * 0.09;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.8})`;
        ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 1 + Math.random() * 4, 1 + Math.random() * 3);
      }
      ctx.restore();
    }
  }

  return { map: toTexture(c, { srgb: true }), bump: toTexture(c, { srgb: false }) };
}

/**
 * 天然断崖面：不像砌石那样有横平竖直的砖缝，改用
 * 竖向的裂隙 + 横向的层理 + 零星的苔痕，做瀑布与山脚的岩壁。
 */
export function cliffTexture() {
  const W = 512;
  const c = makeCanvas(W);
  const ctx = c.getContext('2d');

  // 底：一层深浅不一的灰褐
  const g = ctx.createLinearGradient(0, 0, 0, W);
  g.addColorStop(0, '#6d685c');
  g.addColorStop(0.55, '#5b574c');
  g.addColorStop(1, '#4a463c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, W);

  // 横向层理：一条条略微起伏的暗带
  for (let i = 0; i < 26; i++) {
    const y = (i / 26) * W + (Math.random() - 0.5) * 12;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.012 + i) * 4 + (Math.random() - 0.5) * 3);
    }
    ctx.strokeStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.1})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.stroke();
  }

  // 竖向裂隙：从上往下的主裂纹，旁边分叉
  const crack = (x0, y0, len, w0) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let x = x0;
    for (let y = y0; y < y0 + len; y += 14) {
      x += (Math.random() - 0.5) * 12;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.34)';
    ctx.lineWidth = w0;
    ctx.stroke();
    // 裂纹旁边补一道亮边，看起来有深度
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = Math.max(1, w0 * 0.6);
    ctx.stroke();
  };
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * W;
    const y = Math.random() * W * 0.45;
    crack(x, y, W * (0.3 + Math.random() * 0.6), 1.4 + Math.random() * 2.6);
  }

  // 岩面上的斑驳
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * W;
    const y = Math.random() * W;
    const a = Math.random() * 0.16;
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(255,250,240,${a})`
      : `rgba(0,0,0,${a * 1.6})`;
    ctx.fillRect(x, y, 1 + Math.random() * 5, 1 + Math.random() * 4);
  }

  // 渗水的地方发暗，还带一点苔绿
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * W;
    const y = Math.random() * W;
    const r = 20 + Math.random() * 70;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const moss = Math.random() > 0.5;
    rg.addColorStop(0, moss ? 'rgba(74,92,58,0.30)' : 'rgba(20,24,20,0.28)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return { map: toTexture(c, { srgb: true }), bump: toTexture(c, { srgb: false }) };
}

/* ---------------- 屋瓦 ---------------- */
export function roofTextures() {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a2018';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 14;
  const rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * 24;
    for (let x = -48; x < 512 + 48; x += 48) {
      const px = x + off;
      const base = 150 + Math.random() * 45;
      ctx.beginPath();
      ctx.moveTo(px + 1, r * rh);
      ctx.lineTo(px + 47, r * rh);
      ctx.lineTo(px + 47, r * rh + rh - 5);
      ctx.quadraticCurveTo(px + 24, r * rh + rh + 5, px + 1, r * rh + rh - 5);
      ctx.closePath();
      ctx.fillStyle = `rgb(${base | 0},${(base * 0.42) | 0},${(base * 0.3) | 0})`;
      ctx.fill();

      const g = ctx.createLinearGradient(px, r * rh, px, r * rh + rh);
      g.addColorStop(0, 'rgba(255,255,255,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = g;
      ctx.fill();

      ctx.strokeStyle = 'rgba(30,10,5,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  return toTexture(c);
}

/* ---------------- 木纹 ---------------- */
export function woodTextures() {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a2f1c';
  ctx.fillRect(0, 0, 256, 256);

  for (let x = 0; x < 256; x += 32) {
    const g = 90 + Math.random() * 30;
    ctx.fillStyle = `rgb(${g | 0},${(g * 0.62) | 0},${(g * 0.38) | 0})`;
    ctx.fillRect(x + 1, 0, 30, 256);

    for (let k = 0; k < 26; k++) {
      ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '255,230,190' : '20,10,5'},${0.04 + Math.random() * 0.07})`;
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.beginPath();
      const yy = Math.random() * 256;
      ctx.moveTo(x + 2, yy);
      ctx.bezierCurveTo(x + 10, yy + 12, x + 20, yy - 10, x + 30, yy + 4);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, 0, 1.5, 256);
  }
  return toTexture(c);
}

/* ---------------- 草地 ---------------- */
export function grassTexture() {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4c6b32';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 9000; i++) {
    const g = 60 + Math.random() * 70;
    ctx.fillStyle = `rgba(${(g * 0.7) | 0},${g | 0},${(g * 0.42) | 0},${0.15 + Math.random() * 0.35})`;
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 2 + Math.random() * 4);
  }

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 12 + Math.random() * 45;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${Math.random() > 0.5 ? '90,110,50' : '60,80,40'},0.18)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  return toTexture(c, { rx: 40, ry: 40 });
}

/* ---------------- 水面法线/凹凸 ---------------- */
export function waterTextures() {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 8 + Math.random() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = Math.random() > 0.5 ? 255 : 0;
    g.addColorStop(0, `rgba(${v},${v},${v},${0.05 + Math.random() * 0.1})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  return {
    map: toTexture(c, { rx: 6, ry: 6 }),
    bump: toTexture(c, { rx: 6, ry: 6, srgb: false }),
  };
}

/* ---------------- 旗帜 ---------------- */
export function bannerTexture(hue = 'crimson') {
  const c = makeCanvas(128, 256);
  const ctx = c.getContext('2d');
  const base = hue === 'crimson' ? '#7d1c22' : '#1c3a63';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);

  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let x = 0; x < 128; x += 16) ctx.fillRect(x, 0, 7, 256);

  ctx.strokeStyle = '#d8b25e';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 108, 236);

  // 金色纹章：盾形 + 十字
  ctx.fillStyle = '#d8b25e';
  ctx.beginPath();
  ctx.moveTo(64, 62);
  ctx.lineTo(100, 78);
  ctx.lineTo(100, 140);
  ctx.quadraticCurveTo(100, 186, 64, 204);
  ctx.quadraticCurveTo(28, 186, 28, 140);
  ctx.lineTo(28, 78);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = base;
  ctx.fillRect(58, 82, 12, 104);
  ctx.fillRect(38, 104, 52, 12);

  // 底部燕尾
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(64, 218);
  ctx.lineTo(128, 256);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  return toTexture(c);
}

/* ---------------- 光斑 / 火焰 ---------------- */
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,160,60,0)') {
  const c = makeCanvas(128);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.55)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = toTexture(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---------------- 环境反射（等距柱状投影） ---------------- */
export function environmentTexture(night = false) {
  const c = makeCanvas(1024, 512);
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 512);
  if (night) {
    g.addColorStop(0, '#070c1e');
    g.addColorStop(0.42, '#1a2a49');
    g.addColorStop(0.5, '#33445f');
    g.addColorStop(0.56, '#131a26');
    g.addColorStop(1, '#080a0d');
  } else {
    g.addColorStop(0, '#5d97cf');
    g.addColorStop(0.4, '#a8c8e4');
    g.addColorStop(0.5, '#eef3f5');
    g.addColorStop(0.56, '#8a9370');
    g.addColorStop(1, '#3c4529');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);

  // 太阳 / 月亮光斑，给水面一个高光方向
  const sunX = 780;
  const sunY = night ? 140 : 150;
  const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, night ? 55 : 100);
  sg.addColorStop(0, night ? 'rgba(200,215,255,0.85)' : 'rgba(255,248,225,0.85)');
  sg.addColorStop(0.25, night ? 'rgba(150,175,235,0.35)' : 'rgba(255,232,180,0.4)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 200, sunY - 200, 400, 400);

  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- 尖顶瓦片（锥形屋顶专用） ---------------- */
export function spireTexture() {
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a1410';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 30;
  const rh = 512 / rows;
  for (let r = rows - 1; r >= 0; r--) {
    const cols = 40;
    const cw = 512 / cols;
    const off = (r % 2) * cw * 0.5;
    for (let i = -1; i <= cols; i++) {
      const x = i * cw + off;
      const y = r * rh;
      const shade = 132 + Math.random() * 30;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + rh);
      ctx.lineTo(x + cw * 0.5, y);
      ctx.lineTo(x + cw - 1, y + rh);
      ctx.closePath();
      ctx.fillStyle = `rgb(${shade | 0},${(shade * 0.36) | 0},${(shade * 0.28) | 0})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,12,8,0.28)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  return toTexture(c);
}

/* ---------------- 茅草屋顶 ---------------- */
export function thatchTexture() {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7d6534';
  ctx.fillRect(0, 0, 256, 256);

  // 一根根草茎
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = 7 + Math.random() * 24;
    const g = 118 + Math.random() * 96;
    ctx.strokeStyle = `rgba(${g | 0},${(g * 0.78) | 0},${(g * 0.4) | 0},${0.22 + Math.random() * 0.5})`;
    ctx.lineWidth = 0.7 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 3, y + len);
    ctx.stroke();
  }

  // 一层层压叠的阴影，让屋面有厚度
  for (let y = -16; y < 256; y += 30) {
    const g = ctx.createLinearGradient(0, y, 0, y + 18);
    g.addColorStop(0, 'rgba(20,14,4,0.32)');
    g.addColorStop(0.55, 'rgba(40,28,10,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, 256, 18);
    ctx.strokeStyle = 'rgba(60,44,16,0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y + 18);
    ctx.lineTo(256, y + 18);
    ctx.stroke();
  }

  return toTexture(c);
}

/* ---------------- 农田（俯视：垄沟 + 麦秆） ---------------- */
export function fieldTexture() {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3f3020';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 18;
  const rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const g = ctx.createLinearGradient(0, y, 0, y + rh);
    g.addColorStop(0, '#6f5732');
    g.addColorStop(0.45, '#5b462a');
    g.addColorStop(1, '#33261a');
    ctx.fillStyle = g;
    ctx.fillRect(0, y + 2, 512, rh - 5);

    // 麦秆 / 幼苗
    for (let i = 0; i < 380; i++) {
      const x = Math.random() * 512;
      const yy = y + 4 + Math.random() * (rh - 9);
      const hgt = 3.5 + Math.random() * 7;
      const ripe = Math.random() > 0.28;
      ctx.strokeStyle = ripe
        ? `rgba(${176 + Math.random() * 54 | 0},${138 + Math.random() * 44 | 0},${58 + Math.random() * 26 | 0},0.8)`
        : 'rgba(96,116,58,0.72)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + (Math.random() - 0.5) * 2, yy - hgt);
      ctx.stroke();
    }

    // 垄背高光
    ctx.fillStyle = 'rgba(255,224,160,0.05)';
    ctx.fillRect(0, y + 2, 512, 2);
  }

  // 横向的田垄分界
  for (let i = 0; i < 3; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = 'rgba(24,18,10,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  return toTexture(c, { rx: 2, ry: 2 });
}

/* ---------------- 土路（车辙 + 碎石） ---------------- */
export function dirtTexture() {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a8916a';
  ctx.fillRect(0, 0, 256, 256);

  // 土色斑块
  for (let i = 0; i < 130; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 8 + Math.random() * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = Math.random() > 0.5;
    g.addColorStop(0, dark ? 'rgba(92,72,44,0.34)' : 'rgba(186,166,124,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // 碎石
  for (let i = 0; i < 900; i++) {
    const g = 120 + Math.random() * 90;
    ctx.fillStyle = `rgba(${g | 0},${(g * 0.92) | 0},${(g * 0.76) | 0},${0.25 + Math.random() * 0.5})`;
    const s = 0.8 + Math.random() * 2.2;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, s, s);
  }

  // 两道车辙（沿 V 方向，即路的走向）
  for (const x of [78, 178]) {
    const g = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
    g.addColorStop(0, 'rgba(70,54,32,0)');
    g.addColorStop(0.5, 'rgba(70,54,32,0.3)');
    g.addColorStop(1, 'rgba(70,54,32,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 22, 0, 44, 256);
  }

  // 路两侧的草沿（U 方向两端）
  for (const [x, w] of [[0, 26], [256 - 26, 26]]) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    const edge = x === 0;
    g.addColorStop(0, `rgba(74,92,50,${edge ? 0.5 : 0})`);
    g.addColorStop(1, `rgba(74,92,50,${edge ? 0 : 0.5})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, 256);
  }

  return toTexture(c, { rx: 1, ry: 1 });
}

/* ---------------- 鹅卵石铺地（市集广场） ---------------- */
export function cobbleTexture() {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');

  // 灰浆底
  ctx.fillStyle = '#4b4438';
  ctx.fillRect(0, 0, 512, 512);

  // 抖动的方格，每格里画一块圆角不规则石头
  const cell = 42;
  for (let gy = -1; gy <= 512 / cell; gy++) {
    for (let gx = -1; gx <= 512 / cell; gx++) {
      const cx = gx * cell + cell / 2 + (Math.random() - 0.5) * 10;
      const cy = gy * cell + cell / 2 + (Math.random() - 0.5) * 10;
      const rx = cell * (0.36 + Math.random() * 0.1);
      const ry = cell * (0.33 + Math.random() * 0.1);
      const n = 5 + ((Math.random() * 3) | 0);
      const rot = Math.random() * Math.PI;

      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = rot + (i / n) * Math.PI * 2;
        const k = 0.82 + Math.random() * 0.3;
        const px = cx + Math.cos(a) * rx * k;
        const py = cy + Math.sin(a) * ry * k;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const g = 118 + Math.random() * 62;
      ctx.fillStyle = `rgb(${(g * 1.02) | 0},${(g * 0.97) | 0},${(g * 0.86) | 0})`;
      ctx.fill();

      // 每块石头自己的明暗
      const grad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
      grad.addColorStop(0, 'rgba(255,255,255,0.14)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(28,24,18,0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // 泥土与青苔，破掉网格感
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 10 + Math.random() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const green = Math.random() > 0.72;
    g.addColorStop(0, green ? 'rgba(84,98,54,0.2)' : 'rgba(64,52,36,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  return toTexture(c);
}

/* ---------------- 灰泥墙（木筋楼的填充墙） ---------------- */
export function stuccoTexture() {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e2d9c4';
  ctx.fillRect(0, 0, 256, 256);

  // 抹灰的颗粒
  for (let i = 0; i < 5200; i++) {
    const v = Math.random();
    ctx.fillStyle = v > 0.5
      ? `rgba(255,252,240,${0.1 + Math.random() * 0.3})`
      : `rgba(150,136,110,${0.05 + Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.4, 1 + Math.random() * 2);
  }

  // 几处受潮的暗斑
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 14 + Math.random() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(158,142,112,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // 细裂纹
  ctx.strokeStyle = 'rgba(120,106,84,0.22)';
  for (let i = 0; i < 7; i++) {
    ctx.lineWidth = 0.6 + Math.random() * 0.8;
    ctx.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (Math.random() - 0.5) * 34;
      y += (Math.random() - 0.3) * 28;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return toTexture(c);
}

/* ---------------- 布篷条纹（市集摊位 / 酒馆遮阳） ---------------- */
export function awningTexture(a = '#b23a32', b = '#efe6cf') {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  const stripes = 8;
  const w = 128 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? a : b;
    ctx.fillRect(i * w, 0, w, 128);
  }
  // 布面的褶皱阴影
  for (let i = 0; i < 128; i += 16) {
    const g = ctx.createLinearGradient(i, 0, i + 16, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.16)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(i, 0, 16, 128);
  }
  return toTexture(c);
}

/* ---------------- 云朵 ---------------- */
export function cloudTexture() {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  for (let i = 0; i < 26; i++) {
    const x = 50 + Math.random() * 156;
    const y = 90 + Math.random() * 76;
    const r = 24 + Math.random() * 52;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = toTexture(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
