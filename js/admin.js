/* ===== ADMIN PANEL ===== */

const ADMIN_KEY = btoa('171225');
const STORAGE_KEY = 'dreaming_stories_v1';
const SESSION_KEY = 'dreaming_admin_session';
const MOONS_A = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];

function getMoonA(i) { return MOONS_A[i % MOONS_A.length]; }

function formatDateA(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function escA(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateId(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60) + '-' + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function estimateReadTime(content) {
  const words = (content || '').trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/* ===== STORAGE ===== */
function loadStories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveStories(stories) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
}

async function initStoriesFromRepo() {
  try {
    const res = await fetch('./data/stories.json?v=' + Date.now());
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/* ===== STAR CANVAS ===== */
function initStarsA() {
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function buildStars() {
    stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.005 + 0.002,
      bright: Math.random() * 0.4 + 0.2,
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

/* ===== TOAST ===== */
function showToast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: '◈' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || '◈'}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.classList.add('hide');
    t.addEventListener('animationend', () => t.remove());
  }, 2800);
}

/* ===== CONFIRM ===== */
function showConfirm(title, msg, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <h3>${escA(title)}</h3>
      <p>${escA(msg)}</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary" id="confirm-cancel">Annuler</button>
        <button class="btn btn-danger" id="confirm-ok">Supprimer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); onConfirm(); };
}

/* ===== MODAL ===== */
let currentEditId = null;

function openStoryModal(story = null) {
  currentEditId = story ? story.id : null;
  const isEdit = !!story;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'story-modal';

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">${isEdit ? 'Modifier l\'histoire' : 'Nouvelle histoire'}</h2>
        <button class="btn btn-ghost" id="modal-close" aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="f-title">Titre</label>
          <input type="text" id="f-title" placeholder="Le titre de l'histoire…" value="${escA(story?.title || '')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="f-date">Date du rêve</label>
            <input type="date" id="f-date" value="${story?.date || todayStr()}">
          </div>
          <div class="form-group">
            <label for="f-readtime">Temps de lecture (min)</label>
            <input type="number" id="f-readtime" min="1" max="60" value="${story?.readTime || 3}">
          </div>
        </div>
        <div class="form-group">
          <label for="f-excerpt">Accroche <span class="char-count" id="excerpt-count">0/220</span></label>
          <textarea id="f-excerpt" placeholder="Une courte phrase d'accroche pour donner envie de lire…" maxlength="220" rows="3">${escA(story?.excerpt || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="f-content">Histoire</label>
          <textarea id="f-content" class="content-area" placeholder="L'histoire complète…

Séparez les paragraphes avec une ligne vide.">${escA(story?.content || '')}</textarea>
          <span class="hint">Séparez les paragraphes avec une ligne vide pour créer de nouveaux alinéas.</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-preview">👁 Prévisualiser</button>
        <button class="btn btn-secondary" id="modal-cancel">Annuler</button>
        <button class="btn btn-primary" id="modal-save">Sauvegarder</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Char counter
  const excerptField = overlay.querySelector('#f-excerpt');
  const excerptCount = overlay.querySelector('#excerpt-count');
  function updateCount() {
    excerptCount.textContent = `${excerptField.value.length}/220`;
  }
  updateCount();
  excerptField.addEventListener('input', updateCount);

  // Auto read time
  const contentField = overlay.querySelector('#f-content');
  const rtField = overlay.querySelector('#f-readtime');
  contentField.addEventListener('input', () => {
    rtField.value = estimateReadTime(contentField.value);
  });

  overlay.querySelector('#modal-close').onclick = () => overlay.remove();
  overlay.querySelector('#modal-cancel').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#modal-preview').onclick = () => {
    openPreview(
      overlay.querySelector('#f-title').value,
      overlay.querySelector('#f-content').value
    );
  };

  overlay.querySelector('#modal-save').onclick = () => {
    const title = overlay.querySelector('#f-title').value.trim();
    const date = overlay.querySelector('#f-date').value;
    const excerpt = overlay.querySelector('#f-excerpt').value.trim();
    const content = overlay.querySelector('#f-content').value.trim();
    const readTime = parseInt(overlay.querySelector('#f-readtime').value) || 3;

    if (!title) { showToast('Le titre est requis.', 'error'); return; }
    if (!content) { showToast('Le contenu est requis.', 'error'); return; }
    if (!excerpt) { showToast('L\'accroche est requise.', 'error'); return; }

    const stories = loadStories() || [];
    const idx = stories.findIndex(s => s.id === currentEditId);

    const entry = {
      id: currentEditId || generateId(title),
      title,
      date: date || todayStr(),
      excerpt,
      content,
      readTime,
      published: true,
    };

    if (idx >= 0) {
      stories[idx] = entry;
    } else {
      stories.unshift(entry);
    }

    saveStories(stories);
    overlay.remove();
    renderStoryList(stories);
    showToast(isEdit ? 'Histoire modifiée !' : 'Histoire ajoutée !', 'success');
  };
}

function openPreview(title, content) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const paragraphs = content.split(/\n\n+/).filter(Boolean).map(p => `<p>${escA(p)}</p>`).join('');

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">Prévisualisation</h2>
        <button class="btn btn-ghost" id="prev-close" aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <div style="text-align:center;margin-bottom:24px">
          <h3 style="font-family:'Playfair Display',Georgia,serif;font-size:1.4rem;color:var(--text)">${escA(title || 'Sans titre')}</h3>
        </div>
        <div class="preview-content">${paragraphs || '<em>Aucun contenu</em>'}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="prev-close2">Fermer</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#prev-close').onclick = () => overlay.remove();
  overlay.querySelector('#prev-close2').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ===== EXPORT MODAL ===== */
function openExportModal(stories) {
  const json = JSON.stringify(stories, null, 2);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">🚀 Exporter pour GitHub Pages</h2>
        <button class="btn btn-ghost" id="exp-close" aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <ol class="export-steps">
          <li><span class="step-num">1</span>Copiez le JSON ci-dessous</li>
          <li><span class="step-num">2</span>Allez sur GitHub → votre dépôt → fichier <code style="background:rgba(167,139,250,0.1);padding:2px 6px;border-radius:4px;font-size:0.8em">data/stories.json</code></li>
          <li><span class="step-num">3</span>Cliquez sur l'icône de crayon (Éditer), remplacez le contenu par le JSON copié</li>
          <li><span class="step-num">4</span>Cliquez sur "Commit changes" — les histoires sont en ligne !</li>
        </ol>
        <textarea class="export-json-area" id="export-json" readonly>${escA(json)}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="exp-close2">Fermer</button>
        <button class="btn btn-primary" id="exp-copy">Copier le JSON</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#exp-close').onclick = () => overlay.remove();
  overlay.querySelector('#exp-close2').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#exp-copy').onclick = () => {
    navigator.clipboard.writeText(json)
      .then(() => showToast('JSON copié dans le presse-papier !', 'success'))
      .catch(() => {
        const area = overlay.querySelector('#export-json');
        area.select();
        document.execCommand('copy');
        showToast('JSON copié !', 'success');
      });
  };
}

/* ===== RENDER STORY LIST ===== */
function renderStoryList(stories) {
  const container = document.getElementById('admin-stories');
  if (!container) return;

  const countEl = document.getElementById('stories-count');
  if (countEl) countEl.textContent = `${stories.length} histoire${stories.length !== 1 ? 's' : ''}`;

  if (stories.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:48px;text-align:center;color:var(--text-dim)">
        <span style="font-size:2.5rem;display:block;margin-bottom:16px">🌙</span>
        <p>Aucune histoire pour le moment. Créez-en une !</p>
      </div>`;
    return;
  }

  container.innerHTML = stories.map((story, i) => `
    <div class="admin-story-row" data-id="${escA(story.id)}">
      <span class="admin-story-moon" aria-hidden="true">${getMoonA(i)}</span>
      <div class="admin-story-info">
        <div class="admin-story-title">${escA(story.title)}</div>
        <div class="admin-story-date">${formatDateA(story.date)} · ${story.readTime} min</div>
      </div>
      <div class="admin-story-actions">
        <button class="btn btn-secondary btn-small edit-btn" data-id="${escA(story.id)}">Modifier</button>
        <button class="btn btn-danger btn-small delete-btn" data-id="${escA(story.id)}">Supprimer</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stories = loadStories() || [];
      const story = stories.find(s => s.id === btn.dataset.id);
      if (story) openStoryModal(story);
    });
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const stories = loadStories() || [];
      const story = stories.find(s => s.id === id);
      showConfirm(
        'Supprimer l\'histoire ?',
        `"${story?.title || id}" sera supprimée de vos brouillons admin. Les visiteurs la verront encore jusqu'à la prochaine exportation.`,
        () => {
          const updated = (loadStories() || []).filter(s => s.id !== id);
          saveStories(updated);
          renderStoryList(updated);
          showToast('Histoire supprimée.', 'info');
        }
      );
    });
  });
}

/* ===== PASSWORD GATE ===== */
function checkSession() {
  return sessionStorage.getItem(SESSION_KEY) === ADMIN_KEY;
}

function unlockAdmin() {
  sessionStorage.setItem(SESSION_KEY, ADMIN_KEY);
  document.getElementById('password-gate').remove();
  showAdmin();
}

/* ===== MAIN ADMIN INIT ===== */
async function showAdmin() {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  adminContent.style.display = 'block';

  let stories = loadStories();
  if (stories === null) {
    stories = await initStoriesFromRepo();
    saveStories(stories);
  }

  renderStoryList(stories);

  document.getElementById('new-story-btn').addEventListener('click', () => openStoryModal());

  document.getElementById('export-btn').addEventListener('click', () => {
    const stories = loadStories() || [];
    openExportModal(stories);
  });

  document.getElementById('import-repo-btn').addEventListener('click', async () => {
    if (!confirm('Importer depuis data/stories.json ? Cela remplacera vos brouillons locaux.')) return;
    const imported = await initStoriesFromRepo();
    saveStories(imported);
    renderStoryList(imported);
    showToast(`${imported.length} histoire(s) importée(s) depuis le dépôt.`, 'success');
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initStarsA();

  if (checkSession()) {
    document.getElementById('password-gate').remove();
    showAdmin();
    return;
  }

  const input = document.getElementById('password-input');
  const btn = document.getElementById('login-btn');

  function tryLogin() {
    if (btoa(input.value) === ADMIN_KEY) {
      unlockAdmin();
    } else {
      input.classList.add('error');
      input.value = '';
      input.focus();
      setTimeout(() => input.classList.remove('error'), 600);
    }
  }

  btn.addEventListener('click', tryLogin);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  input.focus();
});
