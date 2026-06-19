const MOONS_S = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
function getMoonS(i) { return MOONS_S[i % MOONS_S.length]; }

function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function escS(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderContent(content) {
  return content.split(/\n\n+/).map(p => p.trim()).filter(Boolean).map(p => `<p>${escS(p)}</p>`).join('');
}

function initStars() {
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars;
  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  function build() {
    stars = Array.from({length:140}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.2+0.2,
      phase: Math.random()*Math.PI*2,
      speed: Math.random()*0.006+0.002,
      bright: Math.random()*0.45+0.2,
    }));
  }
  resize(); build();
  window.addEventListener('resize', () => { resize(); build(); });
  let raf;
  function draw() {
    ctx.clearRect(0,0,W,H);
    const now = performance.now()/1000;
    for (const s of stars) {
      const a = s.bright*(0.5+0.5*Math.sin(now*s.speed*6+s.phase));
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(167,139,250,${a})`; ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }
  draw();
  document.addEventListener('visibilitychange', () => { if(document.hidden) cancelAnimationFrame(raf); else draw(); });
}

function initReadingProgress() {
  const bar = document.getElementById('reading-progress');
  if (!bar) return;
  function update() {
    const el = document.documentElement;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
    bar.style.width = Math.min(100, pct) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
}

async function initStoryPage() {
  const params = new URLSearchParams(location.search);
  const storyId = params.get('id');
  const container = document.getElementById('story-container');
  if (!container) return;

  if (!storyId) { location.href = 'index.html'; return; }

  let stories = [];
  try {
    const res = await fetch('./data/stories.json?v='+Date.now());
    if (res.ok) { const d = await res.json(); stories = Array.isArray(d) ? d.filter(s=>s.published) : []; }
  } catch {}

  const idx = stories.findIndex(s => s.id === storyId);
  const story = stories[idx];

  if (!story) {
    container.innerHTML = `
      <div style="text-align:center;padding:80px 0;color:var(--text-dim)">
        <span style="font-size:3rem;display:block;margin-bottom:16px">🌑</span>
        <p>Cette histoire n'existe pas ou a disparu dans les rêves…</p>
        <a href="index.html" class="story-back" style="display:inline-flex;margin-top:24px">← Retour aux histoires</a>
      </div>`;
    return;
  }

  document.title = `${story.title} — Dreaming Stories`;

  const prev = stories[idx-1];
  const next = stories[idx+1];

  container.innerHTML = `
    <a href="index.html" class="story-back">← Toutes les histoires</a>
    <article>
      <header class="story-header">
        <span class="story-moon" aria-hidden="true">${getMoonS(idx)}</span>
        <h1 class="story-title">${escS(story.title)}</h1>
        <div class="story-meta">
          <span>📅 ${formatDateLong(story.date)}</span>
          <span>⏱ ${story.readTime} min de lecture</span>
        </div>
      </header>
      <div class="story-divider"></div>
      <div class="story-content">${renderContent(story.content)}</div>
      <div class="story-end">✦ ✦ ✦</div>
    </article>
    <nav class="story-nav" aria-label="Navigation entre histoires">
      <div>${prev ? `<a href="story.html?id=${encodeURIComponent(prev.id)}" class="story-back">← ${escS(prev.title)}</a>` : ''}</div>
      <div>${next ? `<a href="story.html?id=${encodeURIComponent(next.id)}" class="story-back">${escS(next.title)} →</a>` : ''}</div>
    </nav>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  initStars();
  initReadingProgress();
  initStoryPage();
});
