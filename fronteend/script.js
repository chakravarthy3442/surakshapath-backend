'use strict';

/* ═══════════════════════════════════════════════
   SURAKSHAPATH AI v3 — PRODUCTION JAVASCRIPT
═══════════════════════════════════════════════ */

// ─── CUSTOM CROSSHAIR CURSOR ─────────────────
const cursor = document.getElementById('cursorCross');
const chRing = document.getElementById('chRing');

if (cursor && window.matchMedia('(pointer:fine)').matches) {
  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  const hoverEls = document.querySelectorAll(
    'a, button, .dsl-card, .ds-etype, .snav-btn, .psd-btn, .bento-card'
  );
  hoverEls.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
  });
}

// ─── NAV SCROLL ──────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('stuck', window.scrollY > 40);
}, { passive: true });

// ─── MOBILE NAV ──────────────────────────────
const mobBtn = document.getElementById('mobBtn');
if (mobBtn) {
  mobBtn.addEventListener('click', () => {
    const menu = document.querySelector('.nav-menu');
    if (menu) {
      const open = menu.style.display === 'flex';
      menu.style.cssText = open ? '' :
        'display:flex;flex-direction:column;position:fixed;top:64px;left:0;right:0;background:rgba(8,11,18,0.97);backdrop-filter:blur(24px);padding:1.5rem 2rem;gap:1.5rem;z-index:899;border-bottom:1px solid rgba(255,255,255,0.06)';
      mobBtn.querySelectorAll('span')[0].style.transform = open ? '' : 'translateY(7.5px) rotate(45deg)';
      mobBtn.querySelectorAll('span')[1].style.transform = open ? '' : 'translateY(-7.5px) rotate(-45deg)';
    }
  });
}

// ─── SMOOTH SCROLL ───────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    const menu = document.querySelector('.nav-menu');
    if (menu) menu.style.cssText = '';
  });
});

// ─── HERO PARTICLE CANVAS ────────────────────
(function initParticles() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  const resize = () => {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.size = Math.random() * 1.5 + 0.3;
      this.speed = Math.random() * 0.3 + 0.1;
      this.opacity = Math.random() * 0.4 + 0.05;
      this.color = Math.random() > 0.85 ? '#ff2d2d' : `rgba(255,255,255,${this.opacity})`;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = -this.speed;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.y < -5 || this.x < -5 || this.x > W + 5) this.reset();
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < 120; i++) particles.push(new Particle());

  const animate = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const grad = ctx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.35, W * 0.55);
    grad.addColorStop(0, 'rgba(255,45,45,0.05)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  };
  animate();
})();

// ─── CTA CANVAS ───────────────────────────────
(function initCtaCanvas() {
  const canvas = document.getElementById('ctaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
  resize();
  window.addEventListener('resize', resize);
  let t = 0;
  const draw = () => {
    t += 0.008;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,45,45,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const r = 200 + Math.sin(t) * 50;
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
    g.addColorStop(0, `rgba(255,45,45,${0.08 + Math.sin(t) * 0.03})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    requestAnimationFrame(draw);
  };
  draw();
})();

// ─── ECG LINE ────────────────────────────────
(function initECG() {
  const path = document.getElementById('ecgPath');
  if (!path) return;
  let offset = 0;
  const ecgShape = [0,0,0,0,-3,-6,-3,0,18,-25,28,0,0,0,0,0];
  const generatePath = (off) => {
    let d = ''; let x = -off; let y = 40;
    while (x < 1500) {
      for (let i = 0; i < ecgShape.length; i++) {
        d += (i === 0 && x <= 0 ? 'M ' : 'L ') + x + ' ' + (y + ecgShape[i] * 1.5) + ' ';
        x += 8;
      }
    }
    return d;
  };
  const animEcg = () => {
    offset = (offset + 1.5) % (ecgShape.length * 8);
    path.setAttribute('d', generatePath(offset));
    requestAnimationFrame(animEcg);
  };
  animEcg();
})();

// ─── COUNTER ANIMATION ───────────────────────
const counterEls = document.querySelectorAll('.metric-val[data-count]');
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const isFloat = String(target).includes('.');
    let current = 0;
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = target * eased;
      el.textContent = (isFloat ? current.toFixed(1) : Math.floor(current)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = (isFloat ? target.toFixed(1) : target) + suffix;
    };
    requestAnimationFrame(step);
    counterObs.unobserve(el);
  });
}, { threshold: 0.5 });
counterEls.forEach(el => counterObs.observe(el));

// ─── SCROLL REVEAL ───────────────────────────
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const delay = parseInt(el.dataset.delay || 0);
    setTimeout(() => el.classList.add('visible'), delay);
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ─── PORTAL SWITCH DEMO ──────────────────────
const psdCaller = document.getElementById('psdCaller');
const psdDriver = document.getElementById('psdDriver');
const psdInd = document.querySelector('.psd-indicator');
if (psdCaller && psdDriver && psdInd) {
  const setInitial = () => {
    psdInd.style.width = psdCaller.offsetWidth + 'px';
    psdInd.style.left = '0px';
  };
  setTimeout(setInitial, 100);
  psdCaller.addEventListener('click', () => {
    psdCaller.classList.add('active'); psdDriver.classList.remove('active');
    psdInd.style.left = '0px';
    psdInd.style.width = psdCaller.offsetWidth + 'px';
  });
  psdDriver.addEventListener('click', () => {
    psdDriver.classList.add('active'); psdCaller.classList.remove('active');
    psdInd.style.left = psdDriver.offsetLeft + 'px';
    psdInd.style.width = psdDriver.offsetWidth + 'px';
  });
}

// ─── PORTAL DEMO NAVIGATION ──────────────────
// 4 screens: ds0=landing, ds1=SOS, ds2=tracking, ds3=firstaid
const screens = ['ds0', 'ds1', 'ds2', 'ds3'];
const stepBtns = document.querySelectorAll('.snav-btn');
const daNext = document.getElementById('daNext');
const daPrev = document.getElementById('daPrev');
const stepProgress = document.getElementById('stepProgress');
const daTitle = document.getElementById('daTitle');
const daDesc = document.getElementById('daDesc');
const daFeatures = document.getElementById('daFeatures');
const demoAnnotation = document.getElementById('demoAnnotation');

const annotationData = [
  {
    step: 'Step 1 of 4',
    title: 'Landing Screen',
    desc: 'The entry point for both callers and ambulance drivers. Clean role separation ensures users reach the right interface immediately without confusion.',
    features: ['Portal selection', 'Emergency hotline', 'Instant access']
  },
  {
    step: 'Step 2 of 4',
    title: 'SOS Screen',
    desc: 'The most critical screen in the app. Emergency type selector and real-time ambulance availability. Hold the SOS button 2 seconds to dispatch. GPS captured automatically — no login needed.',
    features: ['Emergency types', 'Nearest units', '2s hold-to-confirm']
  },
  {
    step: 'Step 3 of 4',
    title: 'Live Tracking',
    desc: 'Real-time map showing exactly where your ambulance is. ETA countdown, driver profile, and live route — so the caller stays calm and informed.',
    features: ['Live map', 'Driver details', 'Family notified']
  },
  {
    step: 'Step 4 of 4',
    title: 'First-Aid Guide',
    desc: 'AI-generated step-by-step first-aid instructions, tailored to the emergency type. Keeps bystanders effective while the ambulance is en route.',
    features: ['AI-generated', 'Step tracker', 'Live ETA']
  }
];

let currentStep = 0;

const goToStep = (step) => {
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  const target = document.getElementById(screens[step]);
  if (target) target.classList.add('active');

  stepBtns.forEach((btn, i) => {
    btn.classList.remove('active');
    if (i < step) btn.classList.add('done');
    else btn.classList.remove('done');
    if (i === step) btn.classList.add('active');
  });

  if (stepProgress) stepProgress.style.width = (step / (screens.length - 1) * 100) + '%';

  const data = annotationData[step];
  if (daTitle) daTitle.textContent = data.title;
  if (daDesc) daDesc.textContent = data.desc;
  if (daFeatures) {
    daFeatures.innerHTML = data.features.map(f => `<span>${f}</span>`).join('');
  }
  const stepLabel = demoAnnotation?.querySelector('.da-step');
  if (stepLabel) stepLabel.textContent = data.step;

  if (daPrev) daPrev.disabled = step === 0;
  if (daNext) daNext.textContent = step === screens.length - 1 ? 'Restart ↺' : 'Next →';

  currentStep = step;
};

stepBtns.forEach((btn, i) => {
  btn.addEventListener('click', () => goToStep(i));
});
if (daNext) daNext.addEventListener('click', () => {
  if (currentStep < screens.length - 1) goToStep(currentStep + 1);
  else goToStep(0);
});
if (daPrev) daPrev.addEventListener('click', () => {
  if (currentStep > 0) goToStep(currentStep - 1);
});

goToStep(0);

// ─── LANDING → SOS (direct, no login) ────────
const dslCaller = document.getElementById('dslCaller');
if (dslCaller) {
  dslCaller.addEventListener('click', () => goToStep(1));
}

// ─── SOS HOLD-TO-CONFIRM ─────────────────────
const dsSosBtn = document.getElementById('dsSosBtn');
if (dsSosBtn) {
  let holdTimer = null; let progress = 0;
  const start = () => {
    progress = 0;
    dsSosBtn.style.transition = 'transform 0.1s';
    holdTimer = setInterval(() => {
      progress += 4;
      dsSosBtn.style.transform = `scale(${1 + progress * 0.0015})`;
      dsSosBtn.style.boxShadow = `0 0 ${20 + progress * 0.5}px rgba(255,45,45,${0.3 + progress * 0.003})`;
      if (progress >= 100) { clearInterval(holdTimer); fireSOS(); }
    }, 80);
  };
  const cancel = () => {
    clearInterval(holdTimer);
    dsSosBtn.style.transform = '';
    dsSosBtn.style.boxShadow = '';
  };
  const fireSOS = () => {
    dsSosBtn.style.background = '#16a34a';
    dsSosBtn.querySelector('span').textContent = '✓';
    showToast('🚨 SOS Dispatched! Unit A-07 is on the way to your location.');
    setTimeout(() => {
      goToStep(2);
      dsSosBtn.style.background = '';
      dsSosBtn.style.transform = '';
      dsSosBtn.querySelector('span').textContent = 'SOS';
    }, 1600);
  };
  dsSosBtn.addEventListener('mousedown', start);
  dsSosBtn.addEventListener('touchstart', start, { passive: true });
  dsSosBtn.addEventListener('mouseup', cancel);
  dsSosBtn.addEventListener('touchend', cancel);
  dsSosBtn.addEventListener('mouseleave', cancel);
}

// ─── EMERGENCY TYPE SELECTION ─────────────────
document.querySelectorAll('.ds-etype').forEach(el => {
  el.addEventListener('click', function() {
    this.closest('.ds-etype-grid').querySelectorAll('.ds-etype').forEach(e => e.classList.remove('active'));
    this.classList.add('active');
  });
});

// ─── LIVE ETA COUNTDOWN ──────────────────────
let etaSecs = 154;
const etaEls = document.querySelectorAll('#dstEta, #phoneEta');
const dsfaEtaEl = document.getElementById('dsfaEta');

setInterval(() => {
  if (etaSecs > 0) etaSecs--;
  const m = Math.floor(etaSecs / 60);
  const s = etaSecs % 60;
  const formatted = m + ':' + String(s).padStart(2, '0');
  etaEls.forEach(el => { if (el) el.textContent = formatted; });
  if (dsfaEtaEl) {
    dsfaEtaEl.textContent = m + ' min ' + String(s).padStart(2, '0') + ' sec';
  }
  const fill = document.getElementById('petaFill');
  if (fill) {
    const pct = 10 + ((154 - etaSecs) / 154) * 85;
    fill.style.width = Math.min(pct, 95) + '%';
  }
  if (etaSecs === 0) {
    etaSecs = 154;
    showToast('✅ Ambulance has arrived!');
  }
}, 1000);

// ─── TOAST ───────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(msg) {
  if (!toastEl) return;
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4000);
}

// ─── CONSOLE SIGNATURE ───────────────────────
console.log(
  '%c SurakshaPath AI v3 \n%c Built for India. Every second matters.',
  'background:#ff2d2d;color:white;font-size:14px;font-weight:900;padding:8px 16px;border-radius:4px 4px 0 0',
  'background:#0d1119;color:#6b7a9a;font-size:11px;padding:6px 16px;border-radius:0 0 4px 4px'
);