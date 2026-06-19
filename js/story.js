/* ===== STORY READER PAGE ===== */

const MOONS_S = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];

function getMoonS(index) { return MOONS_S[index % MOONS_S.length]; }

function formatDateS(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function escHtmlS(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderContent(content) {
  return content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escHtmlS(p)}</p>`)
    .join('');
}

function initStarsS() {
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function buildStars() {
    stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.006 + 0.002,
      bright: Math.random() * 0.5 + 0.3,
    }));
  }

  resize();
  buildStars();
  window.addEventListener('resize', () => { resize(); buildStars(); });

  let raf;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const now = performance.now() / 1000;
    for (const s of stars) {
      const alpha = s.bright * (0.5 + 0.5 * Math.sin(now * s.speed * 6 + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }

  draw();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else draw();
  });
}

async function initStoryPage() {
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get('id');

  const container = document.getElementById('story-container');
  if (!container) return;

  if (!storyId) {
    window.location.href = 'index.html';
    return;
  }

  let stories = [];
  try {
    const res = await fetch('./data/stories.json?v=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      stories = Array.isArray(data) ? data.filter(s => s.published) : [];
    }
  } catch { /* ignore */ }

  const storyIndex = stories.findIndex(s => s.id === storyId);
  const story = stories[storyIndex];

  if (!story) {
    container.innerHTML = `
      <div style="text-align:center;padding:80px 24px;color:var(--text-dim)">
        <span style="font-size:3rem;display:block;margin-bottom:16px">🌑</span>
        <p>Cette histoire n'existe pas ou a disparu dans les rêves…</p>
        <a href="index.html" class="story-back" style="display:inline-flex;margin-top:24px">← Retour aux histoires</a>
      </div>`;
    return;
  }

  document.title = `${story.title} — Dreaming Stories`;

  const moon = getMoonS(storyIndex);
  const prevStory = stories[storyIndex - 1];
  const nextStory = stories[storyIndex + 1];

  const navHtml = `
    <nav class="story-nav" style="display:flex;justify-content:space-between;margin-top:64px;padding-top:40px;border-top:1px solid var(--border);position:relative;z-index:1;">
      <div>${prevStory
        ? `<a href="story.html?id=${encodeURIComponent(prevStory.id)}" class="story-back" style="display:inline-flex">← ${escHtmlS(prevStory.title)}</a>`
        : ''
      }</div>
      <div>${nextStory
        ? `<a href="story.html?id=${encodeURIComponent(nextStory.id)}" class="story-back" style="display:inline-flex">→ ${escHtmlS(nextStory.title)}</a>`
        : ''
      }</div>
    </nav>`;

  container.innerHTML = `
    <a href="index.html" class="story-back">← Toutes les histoires</a>
    <article>
      <header class="story-header">
        <span class="story-moon" aria-hidden="true">${moon}</span>
        <h1 class="story-title">${escHtmlS(story.title)}</h1>
        <div class="story-meta">
          <span>📅 ${formatDateS(story.date)}</span>
          <span>⏱ ${story.readTime} min de lecture</span>
        </div>
      </header>
      <div class="story-divider"></div>
      <div class="story-content">
        ${renderContent(story.content)}
      </div>
      <div class="story-end">✦ ✦ ✦</div>
    </article>
    ${navHtml}
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  initStarsS();

  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  initStoryPage();
});
