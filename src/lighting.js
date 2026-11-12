import * as THREE from 'three';

/* 天空、日月、环境光和跟着镜头走的阴影盒。 */
export function buildLighting({ renderer, IS_SMALL, scene, camera, controls, glowTx }) {
/* ============================================================
 *  天空 / 光照
 * ========================================================== */
const skyUniforms = {
  uTop: { value: new THREE.Color(0x2c66ad) },
  uBottom: { value: new THREE.Color(0xa9c9e6) },
};

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(4600, 40, 24),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uBottom;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        float t = pow(clamp(h, 0.0, 1.0), 0.42);
        vec3 col = mix(uBottom, uTop, t);
        // 地平线附近加一层暖白薄雾，衔接远景
        col = mix(col, uBottom * 1.04, smoothstep(0.09, -0.03, h));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xbfd8ef, 0x4a5038, 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
sun.castShadow = true;
/* ---- 跟随相机的阴影盒 ----
 * 世界扩到 r≈2000 以后，一张图罩住整片地图已经不现实（每纹素要摊一米多）。
 * 改成：阴影盒以相机注视点为中心，视野越近盒子越小、影子越清晰；
 * 中心按"光空间纹素"吸附，平移相机时影子边缘不会爬。
 * 光源放在离中心 SUN_DIST 米的地方，保证太阳一侧的高物体也落在近平面之后。 */
const SUN_DIST = 800;
const sunDir = new THREE.Vector3(70, 100, 55).normalize();   // 由阴影中心指向太阳
const SHADOW_SIZES = [110, 190, 320, 520];                      // 阴影盒半宽（米）的几档
const SHADOW_MAP = IS_SMALL ? 2048 : 4096;
let shadowHalf = 0;
const _sRight = new THREE.Vector3();
const _sUp = new THREE.Vector3();
const _sCenter = new THREE.Vector3();
const _sLast = new THREE.Vector3(1e9, 0, 0);
const _worldUp = new THREE.Vector3(0, 1, 0);
sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun.target);
scene.add(sun);

/** 重新摆放阴影盒；返回是否真的动了（动了就要重画阴影图） */
function updateShadowRig(force = false) {
  const dist = camera.position.distanceTo(controls.target);
  let half = SHADOW_SIZES[SHADOW_SIZES.length - 1];
  for (const sz of SHADOW_SIZES) {
    if (dist * 0.85 <= sz) { half = sz; break; }
  }
  _sRight.crossVectors(_worldUp, sunDir).normalize();
  _sUp.crossVectors(sunDir, _sRight).normalize();
  const texel = (2 * half) / SHADOW_MAP;
  const t = controls.target;
  const x = Math.round(t.dot(_sRight) / texel) * texel;
  const y = Math.round(t.dot(_sUp) / texel) * texel;
  _sCenter.set(0, 0, 0)
    .addScaledVector(_sRight, x)
    .addScaledVector(_sUp, y)
    .addScaledVector(sunDir, t.dot(sunDir));
  if (!force && half === shadowHalf && _sCenter.distanceToSquared(_sLast) < 1e-6) return false;
  _sLast.copy(_sCenter);

  sun.target.position.copy(_sCenter);
  sun.position.copy(_sCenter).addScaledVector(sunDir, SUN_DIST);
  sun.target.updateMatrixWorld();

  if (half !== shadowHalf) {
    shadowHalf = half;
    const cam = sun.shadow.camera;
    cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
    // 深度范围只罩住"盒子 + 高物体"，不然 bias 会按几公里的量程折算成一米多的悬浮
    const reach = half + 120;
    cam.near = SUN_DIST - reach;
    cam.far = SUN_DIST + reach;
    cam.updateProjectionMatrix();
    sun.shadow.bias = -0.3 / (2 * reach);
    sun.shadow.normalBias = 0.02 + texel * 0.6;
  }
  renderer.shadowMap.needsUpdate = true;
  return true;
}

const fill = new THREE.DirectionalLight(0x9fc4ff, 0.35);
fill.position.set(-60, 40, -50);
scene.add(fill);

// 夜间补一点环境光，避免背光面成为纯黑
const nightAmbient = new THREE.AmbientLight(0x8fa8d6, 0);
scene.add(nightAmbient);

// 星空
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 1800; i++) {
  const v = new THREE.Vector3().randomDirection().multiplyScalar(3600);
  if (v.y < 30) v.y = Math.abs(v.y) + 30;
  starPos.push(v.x, v.y, v.z);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false })
);
scene.add(stars);

// 月亮
const moon = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTx, color: 0xdfe9ff, transparent: true, opacity: 0,
  depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending,
}));
const MOON_OFFSET = new THREE.Vector3(-330, 150, -240);
moon.position.copy(MOON_OFFSET);
moon.scale.setScalar(170);
scene.add(moon);
const moonDisc = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTx, color: 0xffffff, transparent: true, opacity: 0,
  depthWrite: false, fog: false, toneMapped: false,
}));
moonDisc.position.copy(moon.position).multiplyScalar(0.94);
moonDisc.scale.setScalar(30);
scene.add(moonDisc);

  return { skyUniforms, sky, hemi, sun, sunDir, updateShadowRig, fill, nightAmbient, stars, moon, MOON_OFFSET, moonDisc };
}
