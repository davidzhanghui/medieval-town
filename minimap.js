/* ============================================================
 *  小地图
 *
 *  圆形的世界俯视图：海、河、主干道、旧世界的几处地标、外环十镇，
 *  以及相机当前的位置与朝向。点地标 → 飞过去；点空地 → 飞到那一带的高空。
 *  只用 2D canvas，静态底图预渲染一次，之后每 250ms 只补画动态标记。
 * ========================================================== */

export function createMinimap(opt) {
  const {
    canvas, tipEl, worldR, sea, river, roads, smoothPath, towns, places, camera, controls, onPick,
  } = opt;
  const ctx = canvas.getContext('2d');
  const S = canvas.width;
  const R = S / 2 - 8;
  const k = R / worldR;
  const px = (x, z) => [S / 2 + x * k, S / 2 + z * k];

  /* ---------- 静态底图 ---------- */
  const base = document.createElement('canvas');
  base.width = base.height = S;
  {
    const b = base.getContext('2d');
    b.save();
    b.beginPath();
    b.arc(S / 2, S / 2, R, 0, Math.PI * 2);
    b.clip();
    // 草地：中心稍亮、边缘稍暗，像一张旧羊皮地图
    const g = b.createRadialGradient(S / 2, S / 2, R * 0.1, S / 2, S / 2, R);
    g.addColorStop(0, '#5f7f45');
    g.addColorStop(0.7, '#4a6a38');
    g.addColorStop(1, '#2f4a2c');
    b.fillStyle = g;
    b.fillRect(0, 0, S, S);
    // 海
    b.fillStyle = '#2c6a88';
    b.beginPath();
    const [sx, sz] = px(sea.x, sea.z);
    b.arc(sx, sz, sea.r * k, 0, Math.PI * 2);
    b.fill();
    b.strokeStyle = 'rgba(240,250,255,0.5)';
    b.lineWidth = 2;
    b.stroke();
    // 河
    b.strokeStyle = '#4a9ab8';
    b.lineCap = 'round';
    b.lineJoin = 'round';
    b.lineWidth = Math.max(2.5, 30 * k);
    b.beginPath();
    river.forEach(([x, z], i) => {
      const [X, Y] = px(x, z);
      if (i) b.lineTo(X, Y); else b.moveTo(X, Y);
    });
    b.stroke();
    // 道路
    b.strokeStyle = 'rgba(214,184,128,0.85)';
    b.lineWidth = 2;
    for (const road of roads) {
      b.beginPath();
      smoothPath(road.pts, 60).forEach(([x, z], i) => {
        const [X, Y] = px(x, z);
        if (i) b.lineTo(X, Y); else b.moveTo(X, Y);
      });
      b.stroke();
    }
    b.restore();
    // 边框
    b.strokeStyle = 'rgba(216,178,94,0.8)';
    b.lineWidth = 3;
    b.beginPath();
    b.arc(S / 2, S / 2, R, 0, Math.PI * 2);
    b.stroke();
    // 罗盘：北
    b.fillStyle = 'rgba(239,228,204,0.85)';
    b.font = `bold ${Math.round(S * 0.06)}px sans-serif`;
    b.textAlign = 'center';
    b.fillText('北', S / 2, 18);
  }

  /* ---------- 标记表 ---------- */
  const markers = [
    ...places.map((p) => ({ kind: 'place', key: p.key, name: p.name, x: p.x, z: p.z, color: '#e8d8a8', r: 4 })),
    ...towns.map((t) => ({ kind: 'town', key: t.key, name: t.name, x: t.x, z: t.z, color: t.color, r: 8 })),
  ];

  function draw() {
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(base, 0, 0);
    // 标记
    ctx.textAlign = 'center';
    for (const m of markers) {
      const [X, Y] = px(m.x, m.z);
      ctx.beginPath();
      ctx.arc(X, Y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = m.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(20,16,10,0.9)';
      ctx.stroke();
      if (m.kind === 'town') {
        ctx.font = `bold ${Math.round(S * 0.042)}px sans-serif`;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(20,16,10,0.85)';
        ctx.strokeText(m.name.slice(0, 2), X, Y - m.r - 5);
        ctx.fillStyle = '#f4ecd4';
        ctx.fillText(m.name.slice(0, 2), X, Y - m.r - 5);
      }
    }
    // 相机：位置 + 朝向的小扇形
    const [cx, cz] = px(camera.position.x, camera.position.z);
    const dx = controls.target.x - camera.position.x;
    const dz = controls.target.z - camera.position.z;
    const ang = Math.atan2(dz, dx);
    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 22, -0.5, 0.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,240,180,0.35)';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cz, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4c8';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8a6a2a';
    ctx.stroke();
  }

  /* ---------- 交互 ---------- */
  const toWorld = (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * S;
    const sy = ((e.clientY - rect.top) / rect.height) * S;
    return { sx, sy, x: (sx - S / 2) / k, z: (sy - S / 2) / k };
  };
  const nearest = (sx, sy) => {
    let best = null;
    let bd = 18;
    for (const m of markers) {
      const [X, Y] = px(m.x, m.z);
      const d = Math.hypot(X - sx, Y - sy);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  };
  canvas.addEventListener('pointermove', (e) => {
    const p = toWorld(e);
    const m = nearest(p.sx, p.sy);
    canvas.style.cursor = m ? 'pointer' : 'crosshair';
    if (tipEl) {
      if (m) {
        tipEl.textContent = m.name;
        tipEl.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
        tipEl.classList.add('show');
      } else tipEl.classList.remove('show');
    }
  });
  canvas.addEventListener('pointerleave', () => tipEl && tipEl.classList.remove('show'));
  canvas.addEventListener('click', (e) => {
    const p = toWorld(e);
    if (Math.hypot(p.sx - S / 2, p.sy - S / 2) > R) return;
    const m = nearest(p.sx, p.sy);
    if (m) onPick({ type: m.kind, key: m.key });
    else onPick({ type: 'ground', x: p.x, z: p.z });
  });

  draw();
  let last = 0;
  return {
    update(now) {
      if (now - last < 250) return;
      last = now;
      draw();
    },
    redraw: draw,
  };
}
