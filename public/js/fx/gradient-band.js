// Animated gradient mesh for the navy bands (.stats-bar, .cta-band).
// A slow-moving shader gradient in brand navies sits behind the band content.

import * as THREE from '/js/vendor/three.module.min.js';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;

  // Brand palette
  const vec3 NAVY      = vec3(0.000, 0.294, 0.549); // #004B8C
  const vec3 NAVY_DEEP = vec3(0.000, 0.208, 0.400); // #003566
  const vec3 STEEL     = vec3(0.443, 0.588, 0.741); // #7196BD

  // Cheap smooth noise from layered sines
  float blob(vec2 p, vec2 c, float r) {
    return smoothstep(r, 0.0, distance(p, c));
  }

  void main() {
    vec2 p = vUv;
    p.x *= uAspect;
    float t = uTime * 0.05;

    vec2 c1 = vec2(uAspect * (0.25 + 0.18 * sin(t * 1.10)), 0.45 + 0.30 * cos(t * 0.90));
    vec2 c2 = vec2(uAspect * (0.70 + 0.20 * cos(t * 0.70)), 0.55 + 0.28 * sin(t * 1.30));
    vec2 c3 = vec2(uAspect * (0.50 + 0.25 * sin(t * 0.50)), 0.40 + 0.35 * cos(t * 1.70));

    float b1 = blob(p, c1, uAspect * 0.85);
    float b2 = blob(p, c2, uAspect * 0.75);
    float b3 = blob(p, c3, uAspect * 0.90);

    vec3 col = NAVY;
    col = mix(col, NAVY_DEEP, b1 * 0.85);
    col = mix(col, STEEL,     b2 * 0.28);
    col = mix(col, NAVY_DEEP, b3 * 0.55);

    // Gentle vertical vignette so band edges stay anchored
    float vig = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
    col = mix(NAVY * 0.92, col, 0.55 + 0.45 * vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function attach(band) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-band-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
  });

  const cs = getComputedStyle(band);
  if (cs.position === 'static') band.style.position = 'relative';
  // Keep band content above the canvas
  for (const child of band.children) {
    const ccs = getComputedStyle(child);
    if (ccs.position === 'static') child.style.position = 'relative';
    if (ccs.zIndex === 'auto') child.style.zIndex = '1';
  }
  band.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: Math.random() * 100 },
    uAspect: { value: 1 },
  };
  scene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms })
    )
  );

  function resize() {
    const w = band.clientWidth;
    const h = band.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uAspect.value = w / Math.max(h, 1);
  }
  resize();
  new ResizeObserver(resize).observe(band);

  // Render only while visible
  let visible = false;
  const clock = new THREE.Clock();
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) renderer.setAnimationLoop(tick);
    else renderer.setAnimationLoop(null);
  }).observe(band);

  function tick() {
    uniforms.uTime.value += clock.getDelta();
    renderer.render(scene, camera);
  }
}

export function init() {
  document.querySelectorAll('.stats-bar, .cta-band').forEach(attach);
}
