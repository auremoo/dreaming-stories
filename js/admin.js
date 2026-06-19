/* ===== CONFIG ===== */
const GITHUB_OWNER = 'auremoo';
const GITHUB_REPO  = 'dreaming-stories';
const GITHUB_FILE  = 'data/stories.json';
const ADMIN_KEY    = btoa('171225');
const SESSION_KEY  = 'ds_session';
const STORIES_KEY  = 'ds_stories_v1';
const PAT_KEY      = 'ds_github_pat';
const MOONS_A      = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];

function getMoonA(i) { return MOONS_A[i % MOONS_A.length]; }

function escA(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function formatDateA(s) {
  if (!s) return '';
  const [y,m,d] = s.split('-');
  const months=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function estimateRT(content) {
  // Retire la syntaxe Markdown avant de compter les mots
  const plain = (content||'').replace(/[#*_~`>\[\]()!]/g, ' ').replace(/\s+/g, ' ').trim();
  return Math.max(1, Math.ceil(plain.split(' ').length / 200));
}

function genId(title) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').substring(0,50)
    + '-' + Date.now().toString(36);
}

/* ===== STORAGE ===== */
function loadStories() {
  try { const r = localStorage.getItem(STORIES_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveStories(s) { localStorage.setItem(STORIES_KEY, JSON.stringify(s)); }

function getPAT() { return localStorage.getItem(PAT_KEY) || ''; }
function setPAT(t) { t ? localStorage.setItem(PAT_KEY, t) : localStorage.removeItem(PAT_KEY); }

/* ===== GITHUB API ===== */
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function githubGet(token) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

async function githubPut(stories, token) {
  const file = await githubGet(token);
  const json = JSON.stringify(stories, null, 2);
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '✦ Mise à jour des histoires', content: utf8ToB64(json), sha: file.sha })
    }
  );
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `Erreur ${res.status}`); }
}

async function githubImport(token) {
  const file = await githubGet(token);
  const json = atob(file.content.replace(/\n/g,''));
  return JSON.parse(json);
}

/* ===== STARS ===== */
function initStars() {
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars;
  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  function build() {
    stars = Array.from({length:100}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.1+0.2, phase: Math.random()*Math.PI*2,
      speed: Math.random()*0.005+0.002, bright: Math.random()*0.35+0.15,
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

/* ===== TOAST ===== */
function toast(msg, type='info') {
  const icons = { success:'✓', error:'✕', info:'◈', loading:'⟳' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]||'◈'}</span><span>${msg}</span>`;
  document.body.appendChild(el);
  if (type !== 'loading') {
    setTimeout(() => { el.classList.add('hide'); el.addEventListener('animationend', () => el.remove()); }, 3000);
  }
  return el;
}

/* ===== CONFIRM ===== */
function confirm_(title, msg, onOk) {
  const ov = document.createElement('div');
  ov.className = 'confirm-overlay';
  ov.innerHTML = `<div class="confirm-box">
    <h3>${escA(title)}</h3><p>${escA(msg)}</p>
    <div class="confirm-actions">
      <button class="btn btn-secondary" id="c-cancel">Annuler</button>
      <button class="btn btn-danger" id="c-ok">Supprimer</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#c-cancel').onclick = () => ov.remove();
  ov.querySelector('#c-ok').onclick = () => { ov.remove(); onOk(); };
}

/* ===== PAT STATUS BADGE ===== */
function updatePatBadge() {
  const el = document.getElementById('pat-status-badge');
  if (!el) return;
  const pat = getPAT();
  if (pat) {
    el.innerHTML = `<div class="pat-status ok">🔑 Token configuré</div>`;
  } else {
    el.innerHTML = `<div class="pat-status missing">⚠️ Token manquant</div>`;
  }
}

/* ===== TOKEN SETTINGS MODAL ===== */
function openSettingsModal() {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  const current = getPAT();
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">🔑 Token GitHub</h2>
        <button class="btn btn-ghost" id="set-close" aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <div class="pat-info">
          Pour publier directement sur GitHub, tu as besoin d'un <strong>Personal Access Token</strong> avec la permission <code>contents: write</code>.<br><br>
          <strong>Comment créer ton token :</strong><br>
          GitHub → Settings → Developer settings → Personal access tokens → <strong>Fine-grained tokens</strong> → Generate new token<br>
          → Sélectionne ce repo → Permissions : <em>Contents → Read and write</em>
        </div>
        <div class="form-group">
          <label for="pat-input">Token GitHub</label>
          <input type="password" id="pat-input" placeholder="github_pat_…" value="${escA(current)}" autocomplete="off">
        </div>
        ${current ? `<button class="btn btn-danger btn-small" id="clear-pat" style="align-self:flex-start">Supprimer le token</button>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="set-cancel">Annuler</button>
        <button class="btn btn-primary" id="set-save">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  ov.querySelector('#set-close').onclick = () => ov.remove();
  ov.querySelector('#set-cancel').onclick = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  const clearBtn = ov.querySelector('#clear-pat');
  if (clearBtn) clearBtn.onclick = () => { setPAT(''); ov.remove(); updatePatBadge(); toast('Token supprimé.', 'info'); };

  ov.querySelector('#set-save').onclick = () => {
    const val = ov.querySelector('#pat-input').value.trim();
    setPAT(val);
    ov.remove();
    updatePatBadge();
    toast(val ? 'Token enregistré !' : 'Token supprimé.', 'success');
  };
}

/* ===== STORY MODAL (add/edit) ===== */
let currentEditId = null;

function openStoryModal(story = null) {
  currentEditId = story ? story.id : null;
  const isEdit = !!story;

  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.id = 'story-modal';
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">${isEdit ? 'Modifier l\'histoire' : 'Nouvelle histoire'}</h2>
        <button class="btn btn-ghost" id="m-close" aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="f-title">Titre</label>
          <input type="text" id="f-title" placeholder="Le titre de l'histoire…" value="${escA(story?.title||'')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="f-date">Date du rêve</label>
            <input type="date" id="f-date" value="${story?.date||todayStr()}">
          </div>
          <div class="form-group">
            <label for="f-rt">Temps de lecture (min)</label>
            <input type="number" id="f-rt" min="1" max="60" value="${story?.readTime||3}">
          </div>
        </div>
        <div class="form-group">
          <label for="f-excerpt">Accroche <span class="char-count" id="ex-count">0/220</span></label>
          <textarea id="f-excerpt" placeholder="Une courte phrase d'accroche…" maxlength="220" rows="3">${escA(story?.excerpt||'')}</textarea>
        </div>
        <div class="form-group">
          <label for="f-content">Histoire</label>
          <textarea id="f-content" class="content-area" placeholder="L'histoire complète…\n\nSéparez les paragraphes avec une ligne vide.">${escA(story?.content||'')}</textarea>
          <span class="hint">Markdown supporté — <code style="background:rgba(167,139,250,0.1);padding:1px 5px;border-radius:4px;font-size:0.85em">**gras**</code> <code style="background:rgba(167,139,250,0.1);padding:1px 5px;border-radius:4px;font-size:0.85em">*italique*</code> <code style="background:rgba(167,139,250,0.1);padding:1px 5px;border-radius:4px;font-size:0.85em"># Titre</code> — Ligne vide entre les paragraphes.</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="m-preview">👁 Aperçu</button>
        <button class="btn btn-secondary" id="m-cancel">Annuler</button>
        <button class="btn btn-primary" id="m-save">💾 Sauvegarder & Publier</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  const excerptEl = ov.querySelector('#f-excerpt');
  const countEl = ov.querySelector('#ex-count');
  const contentEl = ov.querySelector('#f-content');
  const rtEl = ov.querySelector('#f-rt');

  function updateCount() { countEl.textContent = `${excerptEl.value.length}/220`; }
  updateCount();
  excerptEl.addEventListener('input', updateCount);
  contentEl.addEventListener('input', () => { rtEl.value = estimateRT(contentEl.value); });

  ov.querySelector('#m-close').onclick = () => ov.remove();
  ov.querySelector('#m-cancel').onclick = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  ov.querySelector('#m-preview').onclick = () => {
    openPreview(ov.querySelector('#f-title').value, ov.querySelector('#f-content').value);
  };

  ov.querySelector('#m-save').onclick = async () => {
    const title   = ov.querySelector('#f-title').value.trim();
    const date    = ov.querySelector('#f-date').value;
    const excerpt = ov.querySelector('#f-excerpt').value.trim();
    const content = ov.querySelector('#f-content').value.trim();
    const readTime = parseInt(rtEl.value) || 3;

    if (!title)   { toast('Le titre est requis.', 'error'); return; }
    if (!excerpt) { toast('L\'accroche est requise.', 'error'); return; }
    if (!content) { toast('Le contenu est requis.', 'error'); return; }

    const stories = loadStories() || [];
    const idx = stories.findIndex(s => s.id === currentEditId);
    const entry = { id: currentEditId||genId(title), title, date: date||todayStr(), excerpt, content, readTime, published: true };
    if (idx >= 0) stories[idx] = entry; else stories.unshift(entry);

    saveStories(stories);
    ov.remove();
    renderStoryList(stories);

    await publishToGitHub(stories);
  };
}

function renderMd(content) {
  if (typeof marked !== 'undefined') return marked.parse(content, { breaks: false, gfm: true });
  return content.split(/\n\n+/).filter(Boolean).map(p => `<p>${escA(p)}</p>`).join('');
}

function openPreview(title, content) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  const paras = renderMd(content);
  ov.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">Aperçu</h2>
        <button class="btn btn-ghost" id="pv-close">✕</button>
      </div>
      <div class="modal-body">
        <div style="text-align:center;margin-bottom:20px">
          <h3 style="font-family:'Playfair Display',Georgia,serif;font-size:1.3rem;color:var(--text)">${escA(title||'Sans titre')}</h3>
        </div>
        <div class="preview-content">${paras||'<em>Aucun contenu</em>'}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="pv-close2">Fermer</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#pv-close').onclick = () => ov.remove();
  ov.querySelector('#pv-close2').onclick = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

/* ===== GITHUB PUBLISH ===== */
async function publishToGitHub(stories) {
  const pat = getPAT();
  if (!pat) {
    toast('Configure ton token GitHub pour publier automatiquement.', 'error');
    setTimeout(() => openSettingsModal(), 800);
    return;
  }

  const t = toast('Publication en cours…', 'loading');
  try {
    await githubPut(stories, pat);
    t.remove();
    toast('Publié sur GitHub ! 🚀', 'success');
  } catch (err) {
    t.remove();
    toast(`Erreur : ${err.message}`, 'error');
    console.error(err);
  }
}

/* ===== RENDER STORY LIST ===== */
function renderStoryList(stories) {
  const container = document.getElementById('admin-stories');
  if (!container) return;
  const countEl = document.getElementById('stories-count');
  if (countEl) countEl.textContent = `${stories.length} histoire${stories.length!==1?'s':''}`;

  if (stories.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="moon-big">🌙</span><p>Aucune histoire. Créez-en une !</p></div>`;
    return;
  }

  container.innerHTML = stories.map((s, i) => `
    <div class="admin-story-row" role="listitem">
      <span class="admin-story-moon" aria-hidden="true">${getMoonA(i)}</span>
      <div class="admin-story-info">
        <div class="admin-story-title">${escA(s.title)}</div>
        <div class="admin-story-date">${formatDateA(s.date)} · ${s.readTime} min</div>
      </div>
      <div class="admin-story-actions">
        <button class="btn btn-secondary btn-small edit-btn" data-id="${escA(s.id)}">Modifier</button>
        <button class="btn btn-danger btn-small delete-btn" data-id="${escA(s.id)}">Supprimer</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = (loadStories()||[]).find(x => x.id === btn.dataset.id);
      if (s) openStoryModal(s);
    });
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const s = (loadStories()||[]).find(x => x.id === id);
      confirm_(
        'Supprimer l\'histoire ?',
        `"${s?.title||id}" sera supprimée et dépubliée sur GitHub.`,
        async () => {
          const updated = (loadStories()||[]).filter(x => x.id !== id);
          saveStories(updated);
          renderStoryList(updated);
          await publishToGitHub(updated);
        }
      );
    });
  });
}

/* ===== AUTH ===== */
function isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === ADMIN_KEY; }
function login() { sessionStorage.setItem(SESSION_KEY, ADMIN_KEY); }

/* ===== INIT ADMIN ===== */
async function showAdmin() {
  document.getElementById('admin-content').style.display = 'block';

  let stories = loadStories();
  if (stories === null) {
    const pat = getPAT();
    if (pat) {
      try { stories = await githubImport(pat); saveStories(stories); }
      catch { stories = []; }
    } else {
      stories = [];
    }
  }

  renderStoryList(stories);
  updatePatBadge();

  document.getElementById('new-story-btn').addEventListener('click', () => openStoryModal());

  const openSettings = () => openSettingsModal();
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('sidebar-settings-link')?.addEventListener('click', e => { e.preventDefault(); openSettings(); });

  function doLogout() { sessionStorage.removeItem(SESSION_KEY); location.reload(); }
  document.getElementById('logout-btn')?.addEventListener('click', doLogout);
  document.getElementById('logout-btn-mobile')?.addEventListener('click', doLogout);
}

/* ===== BOOT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initStars();

  if (isLoggedIn()) {
    document.getElementById('password-gate').remove();
    showAdmin();
    return;
  }

  const input = document.getElementById('password-input');
  const btn   = document.getElementById('login-btn');

  function tryLogin() {
    if (btoa(input.value) === ADMIN_KEY) {
      login();
      document.getElementById('password-gate').remove();
      showAdmin();
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
