/* ===== SHARED UTILITIES ===== */

const MOONS = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];

function getMoon(index) {
  return MOONS[index % MOONS.length];
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

async function fetchStories() {
  try {
    const res = await fetch('./data/stories.json?v=' + Date.now());
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    return Array.isArray(data) ? data.filter(s => s.published) : [];
  } catch {
    return [];
  }
}

/* ===== STAR CANVAS ===== */
function initStars() {
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

/* ===== STICKY HEADER ===== */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ===== HOMEPAGE ===== */
async function initHomepage() {
  const grid = document.getElementById('stories-grid');
  if (!grid) return;

  const stories = await fetchStories();

  const countEl = document.querySelector('.story-count');
  if (countEl) countEl.textContent = `${stories.length} histoire${stories.length !== 1 ? 's' : ''}`;

  if (stories.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="moon-big">🌙</span>
        <p>Les histoires arrivent bientôt…</p>
      </div>`;
    return;
  }

  grid.innerHTML = stories.map((story, i) => `
    <a href="story.html?id=${encodeURIComponent(story.id)}" class="story-card">
      <div class="card-top">
        <span class="card-moon" aria-hidden="true">${getMoon(i)}</span>
        <span class="card-number">${String(i + 1).padStart(2, '0')}</span>
      </div>
      <h2 class="card-title">${escHtml(story.title)}</h2>
      <p class="card-excerpt">${escHtml(story.excerpt)}</p>
      <div class="card-meta">
        <span class="card-date">${formatDate(story.date)}</span>
        <span class="card-readtime">⏱ ${story.readTime} min</span>
      </div>
    </a>
  `).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initStars();
  initStickyHeader();
  initHomepage();
});
