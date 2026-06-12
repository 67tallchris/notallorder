// "Signal from noise" particle field behind the home hero.
// Scattered grey particles drift on the left; toward the right they organize
// into a converging navy-tinted flow — the visual metaphor for finding your
// next customer in a noisy market. Gentle pointer parallax.

import * as THREE from '/js/vendor/three.module.min.js';

const VERT = /* glsl */ `
  attribute float aOrder;   // 0 = noise, 1 = fully ordered
  attribute float aSeed;
  uniform float uTime;
  uniform vec2 uPointer;
  varying float vOrder;

  void main() {
    vOrder = aOrder;
    vec3 p = position;

    // Chaotic drift, damped as order increases
    float wob = (1.0 - aOrder * 0.85);
    p.x += sin(uTime * 0.30 + aSeed * 17.0) * 0.45 * wob;
    p.y += cos(uTime * 0.24 + aSeed * 29.0) * 0.35 * wob;
    p.z += sin(uTime * 0.18 + aSeed * 41.0) * 0.30 * wob;

    // Ordered particles breathe along their lane
    p.y += sin(uTime * 0.45 + p.x * 0.8) * 0.05 * aOrder;

    // Pointer parallax (depth-weighted)
    p.x += uPointer.x * (0.4 + p.z * 0.08);
    p.y -= uPointer.y * (0.3 + p.z * 0.06);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (3.0 + aOrder * 2.2) * (10.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying float vOrder;

  const vec3 GREY = vec3(0.62, 0.63, 0.64); // noise tone (#9ea0a3)
  const vec3 NAVY = vec3(0.00, 0.294, 0.549); // #004B8C

  void main() {
    // Soft round sprite
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.15, d);
    vec3 col = mix(GREY, NAVY, vOrder);
    float alpha = a * (0.30 + vOrder * 0.40);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function init() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Wrap-free attach: canvas absolutely fills the hero block
  const cs = getComputedStyle(hero);
  if (cs.position === 'static') hero.style.position = 'relative';
  for (const child of hero.children) {
    const ccs = getComputedStyle(child);
    if (ccs.position === 'static') child.style.position = 'relative';
    if (ccs.zIndex === 'auto') child.style.zIndex = '1';
  }

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
  });
  hero.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
  camera.position.z = 12;

  const small = matchMedia('(max-width: 640px)').matches;
  const COUNT = small ? 900 : 2400;

  const pos = new Float32Array(COUNT * 3);
  const order = new Float32Array(COUNT);
  const seed = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    // x spans wide; order ramps up toward the right side
    const x = (Math.random() - 0.5) * 26;
    const t = THREE.MathUtils.smoothstep(x, 1.0, 11.0); // 0 left → 1 right
    const o = t * (0.6 + Math.random() * 0.4);

    // Ordered particles converge toward lanes (a loose horizontal flow)
    const laneCount = 7;
    const lane = (Math.floor(Math.random() * laneCount) / (laneCount - 1) - 0.5) * 6.5;
    const yNoise = (Math.random() - 0.5) * 14;
    const y = yNoise * (1 - o) + lane * o;

    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    order[i] = o;
    seed[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
  };

  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
    })
  );
  scene.add(points);

  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(hero);

  // Smoothed pointer parallax
  const target = new THREE.Vector2();
  addEventListener('pointermove', (e) => {
    target.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  }, { passive: true });

  let visible = false;
  const clock = new THREE.Clock();
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) renderer.setAnimationLoop(tick);
    else renderer.setAnimationLoop(null);
  }).observe(hero);

  function tick() {
    uniforms.uTime.value += clock.getDelta();
    uniforms.uPointer.value.lerp(target, 0.04);
    renderer.render(scene, camera);
  }
}
