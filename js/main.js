// Octant — interaction & motion orchestration
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

gsap.registerPlugin(ScrollTrigger, SplitText);
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---------------- Lenis smooth scroll ---------------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new Lenis({ autoRaf: false, lerp: 0.105 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.lenis = lenis;
}

function scrollToTarget(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

$$('a[data-scroll]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const hash = a.getAttribute('href');
    if (!hash || !hash.startsWith('#')) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(hash === '#top' ? document.body : hash);
    history.replaceState(null, '', hash);
  });
});

/* ---------------- three.js hero scene ---------------- */
let sceneApi = null;
const scenePromise = (async () => {
  const canvas = $('#scene');
  if (!canvas) return null;
  try {
    const mod = await import('./scene.js');
    sceneApi = mod.createHeroScene(canvas);
    window.__sceneOK = !!sceneApi;
  } catch (err) {
    window.__sceneOK = false;
    canvas.style.display = 'none';
    console.warn('Octant: WebGL scene unavailable —', err.message);
  }
  return sceneApi;
})();

/* ---------------- Loader + hero intro ---------------- */
const loader = $('.loader');
const heroIntro = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.set('body', { overflow: '' })
    .from('.nav', { yPercent: -100, duration: 0.9, ease: 'power2.out' }, 0)
    .fromTo('.hero__eyebrow', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.1)
    .fromTo('.hline__in', { yPercent: 112 }, { yPercent: 0, duration: 1.3, ease: 'power4.out', stagger: 0.11 }, 0.18)
    .fromTo('.hero__sub', { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.62)
    .fromTo('.hero__cta', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.78)
    .fromTo('.hero__foot', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 1.0)
    .fromTo('.hero__scale', { autoAlpha: 0, x: 10 }, { autoAlpha: 0.85, x: 0, duration: 1 }, 1.05);

  scenePromise.then((api) => {
    if (!api) return;
    const fade = { k: 0 };
    gsap.to(fade, {
      k: 1, duration: 2.6, ease: 'power2.inOut', delay: 0.15,
      onUpdate: () => { api.uniforms.uOpacity.value = fade.k; api.setMaster(fade.k); },
    });
    gsap.fromTo(api.globe.scale, { x: 0.93, y: 0.93, z: 0.93 },
      { x: 1, y: 1, z: 1, duration: 3.2, ease: 'expo.out', delay: 0.1 });
  });
  return tl;
};

function dismissLoader() {
  document.body.removeAttribute('data-loading');
  if (!loader || reduced) {
    if (loader) loader.remove();
    if (reduced) gsap.set(['.hero__eyebrow', '.hero__sub', '.hero__cta', '.hero__foot', '.hero__scale'], { clearProps: 'all' });
    ScrollTrigger.refresh();
    return;
  }
  const tl = gsap.timeline({
    onComplete: () => { loader.remove(); ScrollTrigger.refresh(); },
  });
  tl.to('.loader__center, .loader__foot', { autoAlpha: 0, y: -16, duration: 0.45, ease: 'power2.in' })
    .to(loader, { yPercent: -100, duration: 0.85, ease: 'power4.inOut' }, '-=0.08')
    .add(heroIntro(), '-=0.55');
}

(function runLoader() {
  if (!loader || reduced) { dismissLoader(); return; }
  if (lenis) lenis.stop();
  const count = $('.loader__count');
  const arc = $('.loader__arc');
  const strokes = $$('.loader__stroke');
  strokes.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });
  const tl = gsap.timeline({
    onComplete: () => { if (lenis) lenis.start(); dismissLoader(); },
  });
  const n = { v: 0 };
  tl.to(strokes, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut', stagger: 0.12 }, 0)
    .fromTo('.loader__star', { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, 0.9)
    .fromTo('.loader__word span', { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', stagger: 0.045 }, 0.35)
    .to(n, {
      v: 100, duration: 1.25, ease: 'power2.inOut',
      onUpdate: () => { if (count) count.textContent = String(Math.round(n.v)).padStart(2, '0'); },
    }, 0)
    .to({}, { duration: 0.15 });
})();

/* ---------------- Generic reveals ---------------- */
function initReveals() {
  $$('[data-reveal]').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, y: 26 }, {
      autoAlpha: 1, y: 0, duration: 1.05, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  $$('[data-rule]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => el.classList.add('rule-in'),
    });
    gsap.fromTo(el.children, { autoAlpha: 0, y: 18 }, {
      autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

/* ---------------- Split headings ---------------- */
const playedSplits = new WeakSet();
function initSplits() {
  $$('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        gsap.set(el, { autoAlpha: 1 });
        if (playedSplits.has(el)) {
          gsap.set(self.lines, { yPercent: 0 });
          return;
        }
        return gsap.fromTo(self.lines, { yPercent: 115 }, {
          yPercent: 0, duration: 1.15, ease: 'power4.out', stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
          onComplete: () => playedSplits.add(el),
        });
      },
    });
  });
}

/* ---------------- Stat counters ---------------- */
function initCounters() {
  $$('.stat__num').forEach((el) => {
    const target = parseFloat(el.dataset.target || '0');
    const start = parseFloat(el.dataset.start || '0');
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = (el.dataset.suffix || '').replace(/&nbsp;/g, ' ');
    const obj = { v: start };
    const render = () => { el.textContent = prefix + obj.v.toFixed(dec) + suffix; };
    render();
    gsap.to(obj, {
      v: target, duration: 2.1, ease: 'power2.out', onUpdate: render,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

/* ---------------- Instrument figure ---------------- */
function initInstrument() {
  const svg = $('.instrument__svg');
  if (!svg) return;
  // generate degree ticks along the arc (center 20,396 / r 376)
  const g = $('.instrument__ticks', svg);
  if (g) {
    for (let d = 0; d <= 45; d += 2.5) {
      const a = (d * Math.PI) / 180;
      const major = d % 10 === 0;
      const r1 = 376, r0 = major ? 354 : 363;
      const x0 = 20 + Math.cos(a) * r0, y0 = 396 - Math.sin(a) * r0;
      const x1 = 20 + Math.cos(a) * r1, y1 = 396 - Math.sin(a) * r1;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x0.toFixed(1)); line.setAttribute('y1', y0.toFixed(1));
      line.setAttribute('x2', x1.toFixed(1)); line.setAttribute('y2', y1.toFixed(1));
      g.appendChild(line);
    }
  }
  if (reduced) return;
  const arc = $('.instrument__arc', svg);
  if (arc) {
    const len = arc.getTotalLength();
    gsap.fromTo(arc, { strokeDasharray: len, strokeDashoffset: len }, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: '.instrument', start: 'top 78%', end: 'center 45%', scrub: 0.6 },
    });
  }
  if (g) {
    gsap.fromTo($$('line', g), { opacity: 0 }, {
      opacity: 1, stagger: 0.03, ease: 'none',
      scrollTrigger: { trigger: '.instrument', start: 'top 75%', end: 'center 45%', scrub: 0.6 },
    });
  }
  gsap.fromTo('.instrument__star', { scale: 0, transformOrigin: 'center' }, {
    scale: 1, ease: 'back.out(2.5)', duration: 0.6,
    scrollTrigger: { trigger: '.instrument', start: 'center 52%', once: true },
  });
}

/* ---------------- Strategies horizontal scroll ---------------- */
function initStrategies() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    const track = $('.strategies__track');
    const stage = $('.strategies__stage');
    const bar = $('.strategies__progress i');
    if (!track || !stage) return;
    const dist = () => Math.max(track.scrollWidth - window.innerWidth, 0);
    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => '+=' + (dist() + window.innerHeight * 0.35),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (st) => { if (bar) bar.style.transform = `scaleX(${st.progress})`; },
      },
    });
    return () => tween.scrollTrigger && tween.scrollTrigger.kill();
  });

  // card entrance on mobile / reduced
  mm.add('(max-width: 1023px)', () => {
    $$('.scard').forEach((card) => {
      gsap.fromTo(card, { autoAlpha: 0, y: 34 }, {
        autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 90%', once: true },
      });
    });
  });
}

/* ---------------- Quote word scrub ---------------- */
function initQuote() {
  const q = $('.quote__text');
  if (!q || reduced) return;
  const split = new SplitText(q, { type: 'words', wordsClass: 'w' });
  gsap.fromTo(split.words, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.06, ease: 'none',
    scrollTrigger: { trigger: '.quote', start: 'top 72%', end: 'center 42%', scrub: 0.5 },
  });
  gsap.fromTo('.quote cite', { autoAlpha: 0, y: 14 }, {
    autoAlpha: 1, y: 0, duration: 0.9,
    scrollTrigger: { trigger: '.quote cite', start: 'top 92%', once: true },
  });
}

/* ---------------- Hero scroll behaviour ---------------- */
function initHeroScroll() {
  if (reduced) return;
  const hero = $('.hero');
  if (!hero) return;
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom top',
    onUpdate: (st) => {
      if (sceneApi) sceneApi.uniforms.uOpacity.value = Math.min(sceneApi.getMaster(), 1 - st.progress * 0.9);
    },
    onLeave: () => sceneApi && sceneApi.setInView(false),
    onEnterBack: () => sceneApi && sceneApi.setInView(true),
  });
  gsap.to('.hero__content', {
    yPercent: -10, autoAlpha: 0.25, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 25%', scrub: true },
  });
}

/* ---------------- Degree ruler ---------------- */
(function buildScale() {
  const el = $('.hero__scale');
  if (!el) return;
  const frag = document.createDocumentFragment();
  for (let d = 90; d >= 0; d -= 2) {
    if (d % 10 === 0) {
      const b = document.createElement('b');
      b.textContent = d + '°';
      frag.appendChild(b);
    }
    const i = document.createElement('i');
    if (d % 10 === 0) i.className = 'maj';
    frag.appendChild(i);
  }
  el.appendChild(frag);
})();

/* ---------------- Coords ticker ---------------- */
(function coordsTicker() {
  const el = $('#coords');
  if (!el) return;
  const entries = [
    '40.7128° N / 74.0060° W — NEW YORK',
    '51.5072° N / 0.1276° W — LONDON',
    '1.3521° N / 103.8198° E — SINGAPORE',
    '46.2044° N / 6.1432° E — GENEVA',
  ];
  if (reduced) return; // keep static first entry
  const CHARS = '0123456789°NSEW./— ';
  let idx = 0;
  function scrambleTo(text) {
    const dur = 700;
    const t0 = performance.now();
    function frame(now) {
      const p = Math.min((now - t0) / dur, 1);
      const keep = Math.floor(p * text.length);
      let out = text.slice(0, keep);
      for (let i = keep; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  setInterval(() => {
    idx = (idx + 1) % entries.length;
    scrambleTo(entries[idx]);
  }, 4200);
})();

/* ---------------- Office clocks ---------------- */
(function clocks() {
  const offices = $$('.office[data-tz]');
  if (!offices.length) return;
  const fmts = offices.map((o) => ({
    el: $('.office__time', o),
    fmt: new Intl.DateTimeFormat('en-GB', {
      timeZone: o.dataset.tz, hour12: false,
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
  }));
  function update() {
    const now = new Date();
    fmts.forEach(({ el, fmt }) => { if (el) el.textContent = fmt.format(now) + ' LOCAL'; });
  }
  update();
  setInterval(update, 1000);
})();

/* ---------------- Nav state ---------------- */
(function navState() {
  const nav = $('.nav');
  if (!nav) return;
  const onScroll = (y) => nav.classList.toggle('is-scrolled', y > 30);
  if (lenis) lenis.on('scroll', (e) => onScroll(e.scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
})();

/* ---------------- Menu overlay ---------------- */
const menu = $('#menu');
const toggle = $('.nav__toggle');
let menuOpen = false;
let menuTl = null;

function buildMenuTl() {
  menuTl = gsap.timeline({ paused: true })
    .set(menu, { visibility: 'visible' })
    .to(menu, { clipPath: 'inset(0% 0 0% 0)', duration: 0.7, ease: 'power4.inOut' })
    .fromTo($$('.menu__links a'), { yPercent: 60, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.055 }, '-=0.25')
    .fromTo('.menu__meta', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, '-=0.3');
}

function openMenu() {
  if (!menu || menuOpen) return;
  menuOpen = true;
  if (!menuTl) buildMenuTl();
  if (lenis) lenis.stop();
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Close menu');
  $('.nav__toggle-label').textContent = 'Close';
  menu.setAttribute('aria-hidden', 'false');
  if (reduced) { gsap.set(menu, { visibility: 'visible', clipPath: 'inset(0% 0 0% 0)' }); return; }
  menuTl.timeScale(1).play();
}

function closeMenu() {
  if (!menu || !menuOpen) return;
  menuOpen = false;
  if (lenis) lenis.start();
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  $('.nav__toggle-label').textContent = 'Menu';
  menu.setAttribute('aria-hidden', 'true');
  if (reduced || !menuTl) { gsap.set(menu, { visibility: 'hidden', clipPath: 'inset(0 0 100% 0)' }); return; }
  menuTl.timeScale(1.6).reverse();
}

if (toggle) toggle.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ---------------- Custom cursor ---------------- */
(function cursor() {
  if (!finePointer || reduced) return;
  const root = $('.cursor');
  if (!root) return;
  const dot = $('.cursor__dot', root);
  const ring = $('.cursor__ring', root);
  let mx = -100, my = -100, dx = -100, dy = -100, rx = -100, ry = -100;
  window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener('pointerdown', () => root.classList.add('is-down'));
  window.addEventListener('pointerup', () => root.classList.remove('is-down'));
  document.addEventListener('mouseover', (e) => {
    root.classList.toggle('is-hover', !!e.target.closest('a, button, [data-cursor]'));
  });
  gsap.ticker.add(() => {
    dx += (mx - dx) * 0.4; dy += (my - dy) * 0.4;
    rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
    dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
  });
})();

/* ---------------- Magnetic buttons ---------------- */
(function magnetic() {
  if (!finePointer || reduced) return;
  $$('.btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      gsap.to(btn, { x: x * 10, y: y * 8, duration: 0.4, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
    });
  });
})();

/* ---------------- Boot ---------------- */
$('#year').textContent = String(new Date().getFullYear());

function bootAnimations() {
  if (reduced) {
    // everything visible, no scroll choreography
    $$('[data-reveal], [data-split]').forEach((el) => { el.style.visibility = 'visible'; });
    $$('[data-rule]').forEach((el) => el.classList.add('rule-in'));
    initCounters(); // still nice; ScrollTrigger fires instantly on enter
    initInstrument();
    ScrollTrigger.refresh();
    return;
  }
  initReveals();
  initSplits();
  initCounters();
  initInstrument();
  initStrategies();
  initQuote();
  initHeroScroll();
  ScrollTrigger.refresh();
}

if (document.fonts && document.fonts.ready) {
  let booted = false;
  const boot = () => { if (!booted) { booted = true; bootAnimations(); } };
  document.fonts.ready.then(boot);
  setTimeout(boot, 2500); // safety if fonts hang
} else {
  bootAnimations();
}

console.log('%cOCTANT %c— measure, then conviction.',
  'font-family:monospace;letter-spacing:.3em;color:#c4a265;',
  'font-family:monospace;color:#6f7480;');
