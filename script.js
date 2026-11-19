const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Mobile menu ----------
const burger = document.querySelector('.burger');
const menu = document.getElementById('menu');
const setMenu = open => {
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

// ---------- Count-up ----------
function countUp(el) {
  const target = Number(el.dataset.count);
  if (reduceMotion || !target) return;
  const pad = el.textContent.trim().length;
  const start = performance.now();
  const tick = now => {
    const t = Math.min((now - start) / 1200, 1);
    el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3)))).padStart(pad, '0');
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- Reveal on scroll (staggered among siblings) ----------
const revealEls = document.querySelectorAll('.reveal');
revealEls.forEach(el => {
  const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
  const idx = sibs.indexOf(el);
  if (idx > 0) el.style.setProperty('--rd', `${idx * 0.12}s`);
});
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('visible');
    e.target.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(e.target);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => io.observe(el));

// ---------- Group tree: draw connector lines when visible ----------
const tree = document.querySelector('.tree');
if (tree) {
  new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting) { tree.classList.add('drawn'); obs.disconnect(); }
  }, { threshold: 0.3 }).observe(tree);
}

// ---------- About: words light up as you scroll ----------
const scrub = document.querySelector('[data-scrub]');
const words = [];
if (scrub) {
  const wrap = (node, hl) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const s = document.createElement('span');
          s.className = 'wd' + (hl ? ' hl' : '');
          s.textContent = part;
          words.push(s);
          frag.append(s);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const isHl = child.hasAttribute('data-hl');
        wrap(child, hl || isHl);
        if (isHl) child.replaceWith(...child.childNodes);
      }
    });
  };
  wrap(scrub, false);
}

// ---------- Scroll-driven updates ----------
const cards = [...document.querySelectorAll('.scard')];
const links = [...document.querySelectorAll('.menu a')];
const sections = links.map(a => document.querySelector(a.getAttribute('href')));

function onScroll() {
  const vh = window.innerHeight;

  // Scrubbed statement
  if (scrub && words.length) {
    const r = scrub.getBoundingClientRect();
    const p = reduceMotion ? 1 : Math.min(Math.max((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0), 1);
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  }

  // Stacking cards: shrink the ones that are being covered
  if (!reduceMotion) {
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const a = card.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      const overlap = Math.min(Math.max((a.bottom - b.top) / a.height, 0), 1);
      card.style.transform = `scale(${1 - overlap * 0.06})`;
      card.style.filter = `brightness(${1 - overlap * 0.25})`;
    });
  }

  // Active menu link
  let current = null;
  sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * 0.45) current = i; });
  links.forEach((a, i) => a.classList.toggle('active', i === current));
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();
