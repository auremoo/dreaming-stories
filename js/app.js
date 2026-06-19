const MOONS = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
function getMoon(i) { return MOONS[i % MOONS.length]; }

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function fetchStories() {
  try {
    const res = await fetch('./data/stories.json?v='+Date.now());
    if (!res.ok) throw new Error();
    const data = await res.json();
    return Array.isArray(data) ? data.filter(s => s.published) : [];
  } catch { return []; }
}

function initStars() {
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars;

  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  function build() {
    stars = Array.from({length:160}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.3+0.2,
      phase: Math.random()*Math.PI*2,
      speed: Math.random()*0.006+0.002,
      bright: Math.random()*0.5+0.25,
    }));
  }

  resize(); build();
  window.addEventListener('resize', () => { resize(); build(); });

  let raf;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const now = performance.now()/1000;
    for (const s of stars) {
      const a = s.bright * (0.5 + 0.5*Math.sin(now*s.speed*6+s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(167,139,250,${a})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }
  draw();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else draw();
  });
}

async function initHomepage() {
  const grid = document.getElementById('stories-grid');
  if (!grid) return;

  const stories = await fetchStories();
  const countEl = document.getElementById('story-count');
  if (countEl) countEl.textContent = `${stories.length} histoire${stories.length!==1?'s':''}`;

  if (stories.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="moon-big">🌙</span><p>Les histoires arrivent bientôt…</p></div>`;
    return;
  }

  grid.innerHTML = stories.map((s, i) => `
    <a href="story.html?id=${encodeURIComponent(s.id)}" class="story-card" role="listitem">
      <div class="card-top">
        <span class="card-moon" aria-hidden="true">${getMoon(i)}</span>
        <span class="card-number">${String(i+1).padStart(2,'0')}</span>
      </div>
      <h2 class="card-title">${escHtml(s.title)}</h2>
      <p class="card-excerpt">${escHtml(s.excerpt)}</p>
      <div class="card-meta">
        <span>${formatDate(s.date)}</span>
        <span>⏱ ${s.readTime} min</span>
      </div>
    </a>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initStars();
  initHomepage();
});
