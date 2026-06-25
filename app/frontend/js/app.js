/* ========================================================
   Campus Resource Booking System — Shared App Logic
   CCS6344 Assignment 1 | Group 23
   ======================================================== */

// ── In-memory caches (populated per-page from API responses) ──
let _resources = [];
let _users     = [];

function setResourceCache(resources) { _resources = resources || []; }
function setUserCache(users)         { _users     = users     || []; }
function resourceById(id)  { return _resources.find(r => r.id === Number(id)) || {}; }
function userById(id)      { return _users.find(u => u.id === Number(id)) || { fullName: 'Unknown', role: '—' }; }

// ── Session Helpers ──────────────────────────────────────
const Session = {
  get()  {
    try { return JSON.parse(sessionStorage.getItem('crb_user')) || null; } catch { return null; }
  },
  set(user) { sessionStorage.setItem('crb_user', JSON.stringify(user)); },
  clear()   { sessionStorage.removeItem('crb_user'); },
  require() {
    const u = this.get();
    if (!u) { window.location.href = 'index.html'; return null; }
    return u;
  },
};

// ── Toast Notifications ──────────────────────────────────
function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Format Helpers ───────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function statusBadge(status) {
  const map = { Confirmed: 'badge-success', Cancelled: 'badge-danger', Pending: 'badge-warning' };
  return `<span class="badge ${map[status] || 'badge-blue'}">${status}</span>`;
}

// ── Navbar ───────────────────────────────────────────────
function initNavbar(user) {
  const initials = user.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatarEl = document.querySelector('.avatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.querySelector('.nav-username');
  if (nameEl) nameEl.textContent = user.fullName;

  const logoutBtn = document.querySelector('.btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    try { await API.post('/auth/logout'); } catch {}
    Session.clear();
    window.location.href = 'index.html';
  });

  // Inject Admin Panel link for admins (only on non-admin pages)
  const onAdminPage = window.location.pathname.split('/').pop() === 'admin.html';
  if (user.role === 'Admin' && !onAdminPage) {
    const nav = document.querySelector('.navbar-nav');
    if (nav && !nav.querySelector('[href="admin.html"]')) {
      const li = document.createElement('li');
      li.innerHTML = '<a href="admin.html" style="background:rgba(204,0,0,.25);">⚙️ Admin</a>';
      nav.appendChild(li);
    }
  }

  // Highlight active nav link
  document.querySelectorAll('.navbar-nav a').forEach(l => {
    if (l.href.includes(window.location.pathname.split('/').pop())) l.classList.add('active');
  });
}
