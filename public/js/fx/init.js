// FX bootstrap — lazy-loads effects only for elements present on the page.
// Loaded after window 'load'; skipped entirely for prefers-reduced-motion.

const tasks = [];

if (document.querySelector('.stats-bar, .cta-band')) {
  tasks.push(import('/js/fx/gradient-band.js').then((m) => m.init()));
}

if (document.querySelector('.sc')) {
  tasks.push(import('/js/fx/card-tilt.js').then((m) => m.init()));
}

if (document.querySelector('.hero')) {
  tasks.push(import('/js/fx/hero-field.js').then((m) => m.init()));
}

Promise.allSettled(tasks);
