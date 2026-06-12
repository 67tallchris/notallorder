// Scroll-driven journey line for the "How it works" steps.
// A 3D tube draws itself down the timeline gutter as you scroll; a glowing
// node lights up (and the step number turns navy) as each step activates.
// The line starts muted grey and resolves into brand navy — plateau to plan.

import * as THREE from '/js/vendor/three.module.min.js';

const GUTTER_X = 44;     // line centerline within the 96px gutter
const NODE_R = 7;
const HALO_R = 15;

const TUBE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TUBE_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uProgress;

  const vec3 GREY  = vec3(0.72, 0.73, 0.74);
  const vec3 NAVY  = vec3(0.00, 0.294, 0.549); // #004B8C
  const vec3 STEEL = vec3(0.443, 0.588, 0.741); // #7196BD

  void main() {
    if (vUv.x > uProgress) discard;
    vec3 col = mix(GREY, NAVY, smoothstep(0.0, 0.75, vUv.x));
    // Bright "comet head" just behind the draw front
    float head = smoothstep(0.05, 0.0, uProgress - vUv.x);
    col = mix(col, STEEL, head * 0.85);
    gl_FragColor = vec4(col, 0.95);
  }
`;

export function init() {
  const steps = document.querySelector('.steps');
  if (!steps) return;

  const cards = [...steps.querySelectorAll('.step')];
  if (cards.length < 2) return;

  // ── Card reveal (all viewports) ──
  cards.forEach((c) => c.classList.add('fx-pre'));
  const revealIO = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.replace('fx-pre', 'fx-in');
          revealIO.unobserve(e.target);
        }
      }
    },
    { threshold: 0.15 }
  );
  cards.forEach((c) => revealIO.observe(c));

  // ── Journey line (desktop only — gutter collapses on mobile) ──
  if (matchMedia('(max-width: 760px)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'fx-journey-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  steps.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  let camera;

  const tubeUniforms = { uProgress: { value: 0 } };
  let tube = null;
  let nodes = []; // { group, core, halo, y, lit, t (0..1 activation) }

  const navyMat = () => new THREE.MeshBasicMaterial({ color: 0x004b8c, transparent: true });
  const haloMat = () =>
    new THREE.MeshBasicMaterial({ color: 0x7196bd, transparent: true, opacity: 0 });

  function build() {
    // Tear down previous geometry
    if (tube) {
      scene.remove(tube);
      tube.geometry.dispose();
      tube.material.dispose();
    }
    nodes.forEach((n) => scene.remove(n.group));
    nodes = [];

    const w = steps.clientWidth;
    const h = steps.clientHeight;
    renderer.setSize(w, h, false);
    camera = new THREE.OrthographicCamera(0, w, 0, -h, -200, 200);

    const stepsRect = steps.getBoundingClientRect();

    // Node anchor: vertically aligned with each step number
    const anchors = cards.map((c) => {
      const r = c.getBoundingClientRect();
      return r.top - stepsRect.top + 56;
    });

    // Curve: enters flat-ish at the top, waves through the gutter, exits below
    const pts = [];
    pts.push(new THREE.Vector3(GUTTER_X - 14, 6, -10));
    anchors.forEach((y, i) => {
      if (i > 0) {
        const midY = (anchors[i - 1] + y) / 2;
        const sway = i % 2 === 0 ? -16 : 16;
        pts.push(new THREE.Vector3(GUTTER_X + sway, -midY, i % 2 === 0 ? -14 : 14));
      }
      pts.push(new THREE.Vector3(GUTTER_X, -y, 0));
    });
    pts.push(new THREE.Vector3(GUTTER_X + 18, -(h - 8), 12));

    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.6);
    tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 220, 2.4, 8, false),
      new THREE.ShaderMaterial({
        vertexShader: TUBE_VERT,
        fragmentShader: TUBE_FRAG,
        uniforms: tubeUniforms,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    scene.add(tube);

    // Activation point of each node along the curve (by vertical position)
    anchors.forEach((y, i) => {
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.CircleGeometry(NODE_R, 32), navyMat());
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(NODE_R + 3, HALO_R, 32),
        haloMat()
      );
      group.add(halo, core);
      group.position.set(GUTTER_X, -y, 20);
      group.scale.setScalar(0.001);
      scene.add(group);
      nodes.push({ group, core, halo, y, card: cards[i], lit: false, t: 0 });
    });
  }

  build();
  new ResizeObserver(() => requestAnimationFrame(build)).observe(steps);

  // ── Scroll → draw progress ──
  let target = 0;
  function onScroll() {
    const r = steps.getBoundingClientRect();
    // Head of the line tracks ~70% down the viewport
    target = THREE.MathUtils.clamp((innerHeight * 0.7 - r.top) / r.height, 0, 1);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Render loop, only while visible ──
  const clock = new THREE.Clock();
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) renderer.setAnimationLoop(tick);
    else renderer.setAnimationLoop(null);
  }).observe(steps);

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const u = tubeUniforms.uProgress;
    u.value += (target - u.value) * Math.min(dt * 4, 1);

    const h = steps.clientHeight;
    const headY = u.value * h;
    const time = clock.elapsedTime;

    for (const n of nodes) {
      const shouldLight = headY >= n.y - 4;
      if (shouldLight !== n.lit) {
        n.lit = shouldLight;
        n.card.classList.toggle('lit', shouldLight);
      }
      // Ease node activation
      n.t += ((n.lit ? 1 : 0) - n.t) * Math.min(dt * 5, 1);
      const pop = 0.001 + n.t * (1 + 0.08 * Math.sin(time * 2.2 + n.y));
      n.group.scale.setScalar(pop);
      n.halo.material.opacity = n.t * (0.30 + 0.15 * Math.sin(time * 2.2 + n.y));
      n.core.material.opacity = n.t;
    }

    renderer.render(scene, camera);
  }
}
