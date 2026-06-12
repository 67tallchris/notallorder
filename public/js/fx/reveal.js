// Site-wide scroll reveals: cards and panels fade up as they enter the
// viewport, with a small stagger between siblings. Uses the shared
// .fx-pre / .fx-in classes defined in base.njk. Applied by JS only, so
// no-JS and reduced-motion users always see content.

const SELECTORS = [
  '.sc',              // home service cards
  '.service-card',    // services page
  '.profile-card',    // who-i-help
  '.not-for',
  '.reassurance-step',// contact
  '.result-card',     // results (if/when used)
];

export function init() {
  const els = [...document.querySelectorAll(SELECTORS.join(','))]
    // Skip anything already managed (journey.js owns .step)
    .filter((el) => !el.classList.contains('fx-pre') && !el.classList.contains('fx-in'));
  if (!els.length) return;

  // Stagger siblings that share a parent
  const byParent = new Map();
  for (const el of els) {
    const list = byParent.get(el.parentElement) || [];
    list.push(el);
    byParent.set(el.parentElement, list);
  }
  for (const list of byParent.values()) {
    list.forEach((el, i) => el.style.setProperty('--fx-delay', `${Math.min(i * 0.08, 0.4)}s`));
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.replace('fx-pre', 'fx-in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.15 }
  );

  for (const el of els) {
    // Only hide elements that are below the fold; visible ones stay put
    const r = el.getBoundingClientRect();
    if (r.top > innerHeight * 0.9) {
      el.classList.add('fx-pre');
      io.observe(el);
    } else {
      el.classList.add('fx-in');
    }
  }
}
