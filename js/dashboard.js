// ============================================================
// DASHBOARD (Admin / Manager)
// ============================================================
registerRoute('dashboard', async (root) => {
  if (!State.user || !['admin','manager'].includes(State.user.role)) { navigateTo('login'); return; }

  root.innerHTML = `
  ${buildSidebar('dashboard')}
  <div class="with-sidebar page">
    <div class="page-header">
      <div>
        <div class="page-title">📊 Dashboard</div>
        <div class="page-sub">Today's overview — ${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div class="flex gap-12">
        <button class="btn btn-ghost" onclick="loadDashboard()">↻ Refresh</button>
        <button class="btn btn-primary" onclick="navigateTo('products')">+ Add Products</button>
      </div>
    </div>
    <div class="page-body">
      <div id="dashboard-content">
        <div class="grid-4 mb-24" id="stat-cards">
          ${[...Array(4)].map(()=>`<div class="stat-card"><div class="stat-label">Loading…</div><div class="stat-value">–</div></div>`).join('')}
        </div>
        <div class="grid-2 mb-24">
          <div class="card">
            <div class="fw-600 mb-16">🏆 Top Products by Revenue</div>
            <div id="top-products-list">Loading…</div>
          </div>
          <div class="card">
            <div class="fw-600 mb-16">⚠️ Expiry Alerts</div>
            <div id="expiry-list">Loading…</div>
          </div>
        </div>
        <div class="card mb-24">
          <div class="fw-600 mb-16">📈 Monthly Revenue (Last 6 Months)</div>
          <div id="revenue-chart" style="height:180px;display:flex;align-items:flex-end;gap:8px;padding:10px 0"></div>
        </div>
        <div class="card">
          <div class="flex-between mb-16">
            <div class="fw-600">🔔 Recent Alerts</div>
            <button class="btn btn-ghost" style="font-size:.8rem" onclick="navigateTo('notifications')">View All</button>
          </div>
          <div id="notif-preview">Loading…</div>
        </div>
      </div>
    </div>
  </div>`;

  loadDashboard();
});

async function loadDashboard() {
  try {
    const data = await apiFetch('/analytics/dashboard');
    const s = data.summary || {};

    // Stat cards
    document.getElementById('stat-cards').innerHTML = `
      <div class="stat-card"><div class="stat-label">Orders Today</div><div class="stat-value">${s.orders_today||0}</div><div class="stat-sub">Bills processed</div></div>
      <div class="stat-card"><div class="stat-label">Revenue Today</div><div class="stat-value">${fmtRs(s.revenue_today||0)}</div><div class="stat-sub">After discount</div></div>
      <div class="stat-card"><div class="stat-label">GST Collected</div><div class="stat-value">${fmtRs(s.tax_today||0)}</div><div class="stat-sub">18% GST today</div></div>
      <div class="stat-card"><div class="stat-label">Customers Served</div><div class="stat-value">${s.unique_customers_today||0}</div><div class="stat-sub">Unique today</div></div>`;

    // Top products
    const tp = document.getElementById('top-products-list');
    tp.innerHTML = data.topProducts?.length
      ? data.topProducts.map((p,i) => `
          <div class="bill-item" style="margin-bottom:6px">
            <span class="badge badge-gray">#${i+1}</span>
            <div style="flex:1;font-weight:500">${p.name}</div>
            <span class="mono fw-600">${fmtRs(p.total_revenue||0)}</span>
          </div>`).join('')
      : `<div class="empty-state" style="padding:20px"><div class="empty-icon">📦</div><div>No sales data yet</div></div>`;

    // Expiry alerts
    const ea = document.getElementById('expiry-list');
    ea.innerHTML = data.expiryAlerts?.length
      ? data.expiryAlerts.map(p => `
          <div class="bill-item" style="margin-bottom:6px">
            <span class="badge ${p.days_remaining<=7?'badge-red':'badge-yellow'}">${p.days_remaining}d</span>
            <div style="flex:1;font-weight:500">${p.name}</div>
            <span class="text-muted text-sm">Stock: ${p.stock_qty}</span>
          </div>`).join('')
      : `<div class="empty-state" style="padding:20px"><div class="empty-icon">✅</div><div>No expiry alerts</div></div>`;

    // Revenue bar chart
    if (data.monthlySales?.length) {
      const maxRev = Math.max(...data.monthlySales.map(m => m.revenue));
      document.getElementById('revenue-chart').innerHTML = data.monthlySales.map(m => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
          <span style="font-size:.72rem;color:var(--text-m);font-weight:600">${fmtRs(m.revenue)}</span>
          <div style="width:100%;background:var(--accent);border-radius:6px 6px 0 0;height:${Math.max(16,(m.revenue/maxRev)*140)}px;transition:.5s ease"></div>
          <span style="font-size:.7rem;color:var(--text-l)">${m.month?.slice(5)}/25</span>
        </div>`).join('');
    } else {
      document.getElementById('revenue-chart').innerHTML = `<div class="empty-state" style="width:100%"><div>No monthly data yet</div></div>`;
    }

    // Notifications
    const nf = document.getElementById('notif-preview');
    nf.innerHTML = data.notifications?.length
      ? data.notifications.slice(0,5).map(n => `
          <div class="alert alert-${n.type==='low_stock'?'warn':n.type==='expired'?'danger':'info'} mb-8" style="font-size:.82rem">
            <span>${n.type==='low_stock'?'📦':n.type==='expired'?'🚫':'ℹ'}</span>
            <span>${n.message}</span>
          </div>`).join('')
      : `<div class="text-muted text-sm">No new alerts.</div>`;
  } catch(e) { showToast('Dashboard error: '+e.message, 'error'); }
}

// ============================================================
// PRODUCTS PAGE (Admin / Manager)
// ============================================================
registerRoute('products', async (root) => {
  if (!State.user || !['admin','manager'].includes(State.user.role)) { navigateTo('login'); return; }

  root.innerHTML = `
  ${buildSidebar('products')}
  <div class="with-sidebar page">
    <div class="page-header">
      <div>
        <div class="page-title">📦 Products</div>
        <div class="page-sub">Manage inventory and stock</div>
      </div>
      <div class="flex gap-12">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search products…" oninput="searchProductsMgr(this.value)" />
        </div>
        <button class="btn btn-primary" onclick="openAddProduct()">+ Add Product</button>
      </div>
    </div>
    <div class="page-body">
      <div class="tabs">
        <div class="tab-item active" onclick="switchProductTab(this,'all')">All Products</div>
        <div class="tab-item" onclick="switchProductTab(this,'low')">Low Stock</div>
        <div class="tab-item" onclick="switchProductTab(this,'expiring')">Expiring Soon</div>
        <div class="tab-item" onclick="switchProductTab(this,'clearance')">Clearance</div>
      </div>
      <div id="products-content">
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Reorder</th><th>Expiry</th><th>Warning</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="products-table"><tr><td colspan="10" class="text-center" style="padding:30px">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;

  loadProductsTable();
});

let _mgrProducts = [];
async function loadProductsTable(filter = 'all') {
  try {
    let endpoint = '/products';
    const data = await apiFetch(endpoint);
    _mgrProducts = data.products;
    renderProductsTable(_mgrProducts, filter);
  } catch(e) { showToast(e.message, 'error'); }
}

function renderProductsTable(products, filter='all') {
  let list = products;
  if (filter === 'low')       list = products.filter(p => p.stock_qty <= p.reorder_level);
  if (filter === 'expiring')  list = products.filter(p => p.days_to_expiry !== null && p.days_to_expiry >= 0 && p.days_to_expiry <= 30);
  const tbody = document.getElementById('products-table');
  if (!tbody) return;
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding:30px">No products found</td></tr>`; return; }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td class="mono text-muted">#${p.product_id}</td>
      <td><div class="fw-600">${p.name}</div><div class="text-muted text-sm">${p.barcode||'No barcode'}</div></td>
      <td>${catEmoji(p.category_name)} ${p.category_name}</td>
      <td class="mono fw-600">${fmtRs(p.price)}</td>
      <td>
        <span class="badge ${p.stock_qty<=0?'badge-red':p.stock_qty<=p.reorder_level?'badge-yellow':'badge-green'}">${p.stock_qty}</span>
      </td>
      <td class="text-muted">${p.reorder_level}</td>
      <td>${p.expiry_date ? `<span class="${p.days_to_expiry<=7?'text-danger':p.days_to_expiry<=30?'text-warn':''}">${fmtDate(p.expiry_date)}</span>` : '–'}</td>
      <td>${p.warning_label ? `<span class="badge badge-yellow" style="font-size:.7rem">${p.warning_label}</span>` : '–'}</td>
      <td><span class="badge ${p.is_active?'badge-green':'badge-gray'}">${p.is_active?'Active':'Inactive'}</span></td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-ghost" style="padding:4px 10px;font-size:.8rem" onclick="openRestockModal(${p.product_id},'${p.name.replace(/'/g,"\\'")}')">+ Stock</button>
          <button class="btn btn-ghost" style="padding:4px 10px;font-size:.8rem" onclick="openEditProduct(${p.product_id})">Edit</button>
        </div>
      </td>
    </tr>`).join('');
}

function searchProductsMgr(q) {
  const filtered = _mgrProducts.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.barcode||'').includes(q));
  renderProductsTable(filtered);
}

function switchProductTab(el, filter) {
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (filter === 'clearance') { loadClearanceProducts(); return; }
  loadProductsTable(filter);
}

async function loadClearanceProducts() {
  try {
    const data = await apiFetch('/analytics/clearance');
    renderProductsTable(data.products.map(p => ({...p, reorder_level:10, is_active:1, barcode:null, warning_label:null, days_to_expiry: p.expiry_date ? Math.floor((new Date(p.expiry_date)-new Date())/(1000*86400)) : null})));
  } catch(e) {}
}

// ── Add Product Modal ─────────────────────────────────────────
async function openAddProduct() {
  const cats = (await apiFetch('/categories')).categories;
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">+ Add Product</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Product Name *</label>
        <input class="form-input" id="ap-name" placeholder="e.g. Aashirvaad Atta 5kg" />
      </div>
      <div class="form-group">
        <label class="form-label">Category *</label>
        <select class="form-input" id="ap-cat">
          ${cats.map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Price (₹) *</label>
        <input class="form-input" id="ap-price" type="number" step="0.01" min="0" placeholder="0.00" />
      </div>
      <div class="form-group">
        <label class="form-label">Initial Stock</label>
        <input class="form-input" id="ap-stock" type="number" min="0" value="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Reorder Level</label>
        <input class="form-input" id="ap-reorder" type="number" min="0" value="10" />
      </div>
      <div class="form-group">
        <label class="form-label">Barcode</label>
        <input class="form-input" id="ap-barcode" placeholder="Optional barcode" />
      </div>
      <div class="form-group">
        <label class="form-label">Expiry Date</label>
        <input class="form-input" id="ap-expiry" type="date" />
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Warning Label</label>
        <select class="form-input" id="ap-warn">
          <option value="">None</option>
          <option>Prescription Required</option>
          <option>Harmful to Kids</option>
          <option>Age 18+ Only</option>
          <option>Allergen: Contains Nuts</option>
          <option>Refrigerate After Opening</option>
          <option>Restricted Drug</option>
        </select>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="ap-desc" rows="2" placeholder="Optional description"></textarea>
      </div>
    </div>
    <div id="ap-err" class="alert alert-danger mt-16 hidden"></div>
    <div class="flex gap-12 mt-20">
      <button class="btn btn-primary flex-1" onclick="submitAddProduct()">Add Product</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`,'modal-lg');
}

async function submitAddProduct() {
  const body = {
    name:          document.getElementById('ap-name').value.trim(),
    category_id:   document.getElementById('ap-cat').value,
    price:         parseFloat(document.getElementById('ap-price').value),
    stock_qty:     parseInt(document.getElementById('ap-stock').value)||0,
    reorder_level: parseInt(document.getElementById('ap-reorder').value)||10,
    barcode:       document.getElementById('ap-barcode').value.trim()||null,
    expiry_date:   document.getElementById('ap-expiry').value||null,
    warning_label: document.getElementById('ap-warn').value||null,
    description:   document.getElementById('ap-desc').value.trim()||null,
  };
  if (!body.name || !body.price) {
    document.getElementById('ap-err').textContent = 'Name and price are required';
    document.getElementById('ap-err').classList.remove('hidden'); return;
  }
  try {
    await apiFetch('/products', { method:'POST', body: JSON.stringify(body) });
    closeModal();
    showToast(`Product "${body.name}" added!`, 'success');
    loadProductsTable();
  } catch(e) {
    document.getElementById('ap-err').textContent = e.message;
    document.getElementById('ap-err').classList.remove('hidden');
  }
}

// ── Edit / Restock modals ─────────────────────────────────────
async function openEditProduct(id) {
  const data = await apiFetch(`/products/${id}`);
  const p    = data.product;
  const cats = (await apiFetch('/categories')).categories;
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">Edit Product #${id}</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Product Name *</label>
        <input class="form-input" id="ep-name" value="${p.name}" />
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-input" id="ep-cat">
          ${cats.map(c=>`<option value="${c.category_id}" ${c.category_id===p.category_id?'selected':''}>${c.category_name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Price (₹)</label>
        <input class="form-input" id="ep-price" type="number" step="0.01" value="${p.price}" />
      </div>
      <div class="form-group">
        <label class="form-label">Reorder Level</label>
        <input class="form-input" id="ep-reorder" type="number" value="${p.reorder_level}" />
      </div>
      <div class="form-group">
        <label class="form-label">Expiry Date</label>
        <input class="form-input" id="ep-expiry" type="date" value="${p.expiry_date?p.expiry_date.split('T')[0]:''}" />
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Warning Label</label>
        <select class="form-input" id="ep-warn">
          <option value="" ${!p.warning_label?'selected':''}>None</option>
          ${['Prescription Required','Harmful to Kids','Age 18+ Only','Allergen: Contains Nuts','Refrigerate After Opening','Restricted Drug'].map(w=>`<option ${p.warning_label===w?'selected':''}>${w}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Status</label>
        <select class="form-input" id="ep-active">
          <option value="1" ${p.is_active?'selected':''}>Active</option>
          <option value="0" ${!p.is_active?'selected':''}>Inactive</option>
        </select>
      </div>
    </div>
    <div class="flex gap-12 mt-20">
      <button class="btn btn-primary flex-1" onclick="submitEditProduct(${id})">Save Changes</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`,'modal-lg');
}

async function submitEditProduct(id) {
  const body = {
    name:          document.getElementById('ep-name').value.trim(),
    category_id:   document.getElementById('ep-cat').value,
    price:         parseFloat(document.getElementById('ep-price').value),
    reorder_level: parseInt(document.getElementById('ep-reorder').value)||10,
    expiry_date:   document.getElementById('ep-expiry').value||null,
    warning_label: document.getElementById('ep-warn').value||null,
    is_active:     parseInt(document.getElementById('ep-active').value),
  };
  await apiFetch(`/products/${id}`, { method:'PUT', body: JSON.stringify(body) });
  closeModal();
  showToast('Product updated!', 'success');
  loadProductsTable();
}

function openRestockModal(id, name) {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">+ Restock: ${name}</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group mb-16">
      <label class="form-label">Quantity to Add *</label>
      <input class="form-input" id="rs-qty" type="number" min="1" placeholder="e.g. 50" autofocus />
    </div>
    <div class="form-group mb-24">
      <label class="form-label">Notes</label>
      <input class="form-input" id="rs-notes" placeholder="e.g. Supplier: Sharma Traders, Invoice #101" />
    </div>
    <div class="flex gap-12">
      <button class="btn btn-primary flex-1" onclick="submitRestock(${id})">Confirm Restock</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function submitRestock(id) {
  const qty = parseInt(document.getElementById('rs-qty').value);
  const notes = document.getElementById('rs-notes').value;
  if (!qty||qty<=0) { showToast('Enter a valid quantity','warn'); return; }
  await apiFetch(`/products/${id}/restock`, { method:'POST', body: JSON.stringify({qty,notes}) });
  closeModal();
  showToast('Stock updated successfully!', 'success');
  loadProductsTable();
}

// ============================================================
// ANALYTICS PAGE
// ============================================================
registerRoute('analytics', async (root) => {
  if (!State.user || !['admin','manager'].includes(State.user.role)) { navigateTo('login'); return; }

  root.innerHTML = `
  ${buildSidebar('analytics')}
  <div class="with-sidebar page">
    <div class="page-header">
      <div>
        <div class="page-title">📈 Analytics</div>
        <div class="page-sub">Sales performance & inventory insights</div>
      </div>
    </div>
    <div class="page-body">
      <div class="grid-2 mb-24">
        <div class="card">
          <div class="fw-600 mb-16">Revenue by Category</div>
          <div id="cat-revenue">Loading…</div>
        </div>
        <div class="card">
          <div class="fw-600 mb-16">🏷 Highest Ticket Items</div>
          <div id="ticket-items">Loading…</div>
        </div>
      </div>
      <div class="card mb-24">
        <div class="fw-600 mb-16">🧹 Clearance Candidates (Not sold in 30 days)</div>
        <div id="clearance-items">Loading…</div>
      </div>
      <div class="card">
        <div class="fw-600 mb-16">📋 All Products Sales Summary</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Units Sold</th><th>Revenue</th><th>Orders</th></tr></thead>
            <tbody id="prod-summary-table"><tr><td colspan="7" class="text-center" style="padding:20px">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;

  try {
    const [catData, prodData, clearData, dashData] = await Promise.all([
      apiFetch('/analytics/revenue-by-category'),
      apiFetch('/analytics/products'),
      apiFetch('/analytics/clearance'),
      apiFetch('/analytics/dashboard'),
    ]);

    // Category revenue
    document.getElementById('cat-revenue').innerHTML = catData.data.length
      ? catData.data.map(c => `
          <div class="bill-item mb-8">
            <span>${catEmoji(c.category_name)}</span>
            <div style="flex:1;font-weight:500">${c.category_name}</div>
            <span class="text-muted text-sm">${c.units} units</span>
            <span class="mono fw-600">${fmtRs(c.revenue)}</span>
          </div>`).join('')
      : `<div class="empty-state"><div>No sales data yet</div></div>`;

    // Highest ticket
    document.getElementById('ticket-items').innerHTML = dashData.topProducts.length
      ? dashData.topProducts.map((p,i) => `
          <div class="bill-item mb-8">
            <span class="badge badge-accent">#${i+1}</span>
            <div style="flex:1;font-weight:500">${p.name}</div>
            <span class="mono fw-600">${fmtRs(p.total_revenue||0)}</span>
          </div>`).join('')
      : `<div class="empty-state"><div>No data yet</div></div>`;

    // Clearance
    document.getElementById('clearance-items').innerHTML = clearData.products.length
      ? `<div class="table-wrap"><table>
          <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Expiry</th></tr></thead>
          <tbody>${clearData.products.map(p=>`
            <tr>
              <td>${p.name}</td>
              <td>${p.category_name}</td>
              <td><span class="badge badge-yellow">${p.stock_qty}</span></td>
              <td class="mono">${fmtRs(p.price)}</td>
              <td>${fmtDate(p.expiry_date)}</td>
            </tr>`).join('')}
          </tbody></table></div>`
      : `<div class="empty-state"><div class="empty-icon">✅</div><div>No clearance items — all products sold recently!</div></div>`;

    // Products summary
    document.getElementById('prod-summary-table').innerHTML = prodData.products.map(p=>`
      <tr>
        <td class="fw-600">${p.product_name}</td>
        <td>${p.category_name}</td>
        <td class="mono">${fmtRs(p.current_price)}</td>
        <td><span class="badge ${p.current_stock<=0?'badge-red':'badge-green'}">${p.current_stock}</span></td>
        <td>${p.total_units_sold}</td>
        <td class="mono fw-600">${fmtRs(p.total_revenue)}</td>
        <td>${p.order_count}</td>
      </tr>`).join('');
  } catch(e) { showToast(e.message,'error'); }
});

// ============================================================
// NOTIFICATIONS PAGE
// ============================================================
registerRoute('notifications', async (root) => {
  if (!State.user || !['admin','manager'].includes(State.user.role)) { navigateTo('login'); return; }

  root.innerHTML = `
  ${buildSidebar('notifications')}
  <div class="with-sidebar page">
    <div class="page-header">
      <div><div class="page-title">🔔 Alerts</div><div class="page-sub">System notifications and warnings</div></div>
      <button class="btn btn-ghost" onclick="loadNotifications()">↻ Refresh</button>
    </div>
    <div class="page-body">
      <div id="notif-list">Loading…</div>
    </div>
  </div>`;
  loadNotifications();
});

async function loadNotifications() {
  try {
    const data = await apiFetch('/notifications');
    const el   = document.getElementById('notif-list');
    if (!el) return;
    if (!data.notifications.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div>No alerts at this time.</div></div>`;
      return;
    }
    el.innerHTML = data.notifications.map(n => `
      <div class="alert alert-${n.type==='low_stock'?'warn':n.type.includes('expir')?'danger':'info'} mb-12" style="justify-content:space-between">
        <div class="flex gap-12" style="align-items:center">
          <span>${n.type==='low_stock'?'📦':n.type==='expired'?'🚫':n.type==='expiry_warning'?'⏰':'ℹ'}</span>
          <div>
            <div>${n.message}</div>
            <div class="text-muted text-sm">${fmtDT(n.created_at)}</div>
          </div>
        </div>
        ${n.is_read?'':'<button class="btn btn-ghost" style="font-size:.78rem;padding:4px 10px" onclick="markRead('+n.notif_id+',this)">Mark Read</button>'}
      </div>`).join('');
  } catch(e) {}
}

async function markRead(id, btn) {
  await apiFetch(`/notifications/${id}/read`, { method:'PUT' });
  btn.parentElement.style.opacity = '.5';
  btn.remove();
}

// ============================================================
// USERS PAGE (Admin only)
// ============================================================
registerRoute('users', async (root) => {
  if (!State.user || State.user.role !== 'admin') { navigateTo('login'); return; }

  root.innerHTML = `
  ${buildSidebar('users')}
  <div class="with-sidebar page">
    <div class="page-header">
      <div><div class="page-title">👥 Users</div><div class="page-sub">Manage all system users</div></div>
      <button class="btn btn-primary" onclick="openAddUser()">+ Add User</button>
    </div>
    <div class="page-body">
      <div class="tabs">
        <div class="tab-item active" onclick="switchUserTab(this,'')">All</div>
        <div class="tab-item" onclick="switchUserTab(this,'admin')">👑 Owners</div>
        <div class="tab-item" onclick="switchUserTab(this,'manager')">👔 Managers</div>
        <div class="tab-item" onclick="switchUserTab(this,'cashier')">🏪 Cashiers</div>
        <div class="tab-item" onclick="switchUserTab(this,'customer')">👤 Customers</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Role</th><th>Phone</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody id="users-table"><tr><td colspan="8" class="text-center" style="padding:30px">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>`;
  loadUsers('');
});

async function loadUsers(role) {
  const data = await apiFetch(`/users${role?'?role='+role:''}`);
  const tbody = document.getElementById('users-table');
  if (!tbody) return;
  const roleIcon = {admin:'👑',manager:'👔',cashier:'🏪',customer:'👤'};
  tbody.innerHTML = data.users.map(u => `
    <tr>
      <td class="mono text-muted">#${u.user_id}</td>
      <td class="fw-600">${u.full_name}</td>
      <td class="text-muted">@${u.username}</td>
      <td><span class="badge badge-accent">${roleIcon[u.role]||''} ${u.role}</span></td>
      <td>${u.phone_no||'–'}</td>
      <td class="text-muted">${u.email||'–'}</td>
      <td><span class="badge ${u.is_active?'badge-green':'badge-gray'}">${u.is_active?'Active':'Inactive'}</span></td>
      <td class="text-muted text-sm">${fmtDate(u.created_at)}</td>
    </tr>`).join('');
}

function switchUserTab(el, role) {
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadUsers(role);
}

function openAddUser() {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">+ Add User</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group mb-12">
      <label class="form-label">Full Name *</label>
      <input class="form-input" id="au-name" placeholder="Full name" />
    </div>
    <div class="form-group mb-12">
      <label class="form-label">Username *</label>
      <input class="form-input" id="au-user" placeholder="username" />
    </div>
    <div class="form-group mb-12">
      <label class="form-label">Password *</label>
      <input class="form-input" id="au-pass" type="password" placeholder="Password" />
    </div>
    <div class="form-group mb-12">
      <label class="form-label">Role *</label>
      <select class="form-input" id="au-role">
        <option value="cashier">Cashier</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin/Owner</option>
        <option value="customer">Customer</option>
      </select>
    </div>
    <div class="form-group mb-12">
      <label class="form-label">Phone</label>
      <input class="form-input" id="au-phone" type="tel" placeholder="10-digit phone" />
    </div>
    <div class="form-group mb-24">
      <label class="form-label">Email</label>
      <input class="form-input" id="au-email" type="email" placeholder="email@example.com" />
    </div>
    <div class="flex gap-12">
      <button class="btn btn-primary flex-1" onclick="submitAddUser()">Create User</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function submitAddUser() {
  const body = {
    full_name: document.getElementById('au-name').value.trim(),
    username:  document.getElementById('au-user').value.trim(),
    password:  document.getElementById('au-pass').value,
    role:      document.getElementById('au-role').value,
    phone_no:  document.getElementById('au-phone').value.trim()||null,
    email:     document.getElementById('au-email').value.trim()||null,
  };
  await apiFetch('/users', { method:'POST', body: JSON.stringify(body) });
  closeModal();
  showToast('User created!', 'success');
  loadUsers('');
}
