// Subtle 3D tilt + lift on service cards (.sc). Pure CSS transforms — no WebGL needed.

const MAX_TILT = 5; // degrees

export function init() {
  // Touch devices: skip hover tilt entirely
  if (matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.sc').forEach((card) => {
    card.style.transition = 'transform 0.18s ease-out, box-shadow 0.25s ease-out';
    card.style.willChange = 'transform';

    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;  // -0.5 .. 0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(700px) rotateX(${(-py * MAX_TILT).toFixed(2)}deg)` +
        ` rotateY(${(px * MAX_TILT).toFixed(2)}deg) translateY(-2px)`;
      card.style.boxShadow = '0 12px 28px rgba(0, 75, 140, 0.12)';
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateY(0)';
      card.style.boxShadow = 'none';
    });
  });
}
