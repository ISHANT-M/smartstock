// ============================================================
// SMART-STOCK Frontend App (Vanilla JS SPA)
// ============================================================

const API = '/api';  // Change to 'http://localhost:3000/api' if needed

// ── State ─────────────────────────────────────────────────────
const State = {
  token:     localStorage.getItem('ss_token') || null,
  user:      JSON.parse(localStorage.getItem('ss_user') || 'null'),
  cart:      [],
  products:  [],
  categories:[],
  customers: [],
  currentCustomer: null,
};

// ── API Helper ────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (State.token) headers['Authorization'] = `Bearer ${State.token}`;
  const res = await fetch(API + endpoint, { headers, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Auth ──────────────────────────────────────────────────────
async function login(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  State.token = data.token;
  State.user  = data.user;
  localStorage.setItem('ss_token', data.token);
  localStorage.setItem('ss_user', JSON.stringify(data.user));
  return data.user;
}

function logout() {
  State.token = null;
  State.user  = null;
  State.cart  = [];
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  navigateTo('landing');
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', error: '✕', warn: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(htmlContent, extraClass = '') {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `<div class="modal ${extraClass}">${htmlContent}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}
function closeModal() {
  document.getElementById('modal-overlay')?.remove();
}

// ── Router ────────────────────────────────────────────────────
const routes = {};
function registerRoute(name, fn) { routes[name] = fn; }

function navigateTo(page, params = {}) {
  const root = document.getElementById('app');
  if (!root) return;
  if (routes[page]) {
    root.innerHTML = '';
    routes[page](root, params);
  } else {
    root.innerHTML = `<div class="flex-center" style="height:100vh;"><h2>404 – Page not found</h2></div>`;
  }
}

// ── Format helpers ────────────────────────────────────────────
const fmtRs  = n => `₹${parseFloat(n||0).toFixed(2)}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '–';
const fmtDT   = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '–';

// ── Category emojis map ───────────────────────────────────────
const CAT_EMOJI = {
  'Groceries':    '🛒',
  'Beverages':    '🥤',
  'Medicines':    '💊',
  'Personal Care':'🧴',
  'Snacks':       '🍪',
  'Dairy':        '🥛',
  'default':      '📦',
};
function catEmoji(catName) { return CAT_EMOJI[catName] || CAT_EMOJI.default; }

// ── Sidebar builder ───────────────────────────────────────────
function buildSidebar(activeItem) {
  const role = State.user?.role;
  const navMap = {
    admin:    [['dashboard','📊','Dashboard'],['products','📦','Products'],['orders','🧾','Orders'],['users','👥','Users'],['analytics','📈','Analytics'],['notifications','🔔','Alerts']],
    manager:  [['dashboard','📊','Dashboard'],['products','📦','Products'],['orders','🧾','Orders'],['analytics','📈','Analytics'],['notifications','🔔','Alerts']],
    cashier:  [['billing','🏪','Billing'],['orders','🧾','My Bills']],
    customer: [['customer-home','🏠','My Account'],['customer-orders','🧾','My Purchases']],
  };
  const navItems = navMap[role] || [];
  return `
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-text">◉ SmartStock</div>
      <div class="logo-sub">${role?.toUpperCase()}</div>
    </div>
    <nav class="sidebar-nav">
      ${navItems.map(([page,icon,label]) => `
        <div class="nav-item ${activeItem===page?'active':''}" onclick="navigateTo('${page}')">
          <span class="icon">${icon}</span> ${label}
        </div>`).join('')}
    </nav>
    <div class="sidebar-footer">
      <div style="font-size:.85rem;font-weight:600;color:rgba(255,255,255,.85)">${State.user?.full_name}</div>
      <div style="font-size:.75rem;color:rgba(255,255,255,.45);margin-top:2px">${State.user?.username}</div>
      <button class="btn btn-ghost" style="margin-top:12px;width:100%;font-size:.85rem" onclick="logout()">Sign Out</button>
    </div>
  </aside>`;
}

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (State.user && State.token) {
    const roleHome = { admin:'dashboard', manager:'dashboard', cashier:'billing', customer:'customer-home' };
    navigateTo(roleHome[State.user.role] || 'landing');
  } else {
    navigateTo('landing');
  }
});
