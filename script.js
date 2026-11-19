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

// ---------- Back to top ----------
// Custom eased scroll (the header is sticky, so "#top" anchors never scroll).
const toTop = document.querySelector(".to-top");
let scrollAnim = null;

// cubic-bezier(.45, 0, .08, 1): soft start, long feather-light landing at the top
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t;
  const sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    let t = x;
    for (let i = 0; i < 8; i++) {           // Newton-Raphson
      const e = sx(t) - x, d = dx(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = Math.min(Math.max(t, 0), 1);
    return sy(t);
  };
}
const ease = bezier(0.45, 0, 0.08, 1);

function smoothScrollToTop() {
  const start = window.scrollY;
  if (start <= 0) return;
  if (reduceMotion) { window.scrollTo(0, 0); return; }

  const root = document.documentElement;
  const prevBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";            // stop CSS smooth-scroll fighting the animation
  const duration = Math.min(2000, Math.max(1000, start * 0.45));
  const t0 = performance.now();

  const stop = () => {
    cancelAnimationFrame(scrollAnim); scrollAnim = null;
    root.style.scrollBehavior = prevBehavior;
    ["wheel", "touchstart", "keydown"].forEach(ev => window.removeEventListener(ev, stop));
  };
  ["wheel", "touchstart", "keydown"].forEach(ev => window.addEventListener(ev, stop, { passive: true }));

  const step = now => {
    const t = Math.min((now - t0) / duration, 1);
    window.scrollTo(0, start * (1 - ease(t)));
    if (t < 1) scrollAnim = requestAnimationFrame(step); else stop();
  };
  if (scrollAnim) cancelAnimationFrame(scrollAnim);
  scrollAnim = requestAnimationFrame(step);
}

if (toTop) toTop.addEventListener("click", smoothScrollToTop);
document.querySelectorAll("a[href=\"#top\"]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); smoothScrollToTop(); }));

function updateToTop() {
  if (!toTop) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  toTop.classList.toggle("show", window.scrollY > window.innerHeight * 0.6);
  toTop.style.setProperty("--p", max > 0 ? (window.scrollY / max).toFixed(4) : 0);
}
window.addEventListener("scroll", updateToTop, { passive: true });
window.addEventListener("resize", updateToTop);
updateToTop();
