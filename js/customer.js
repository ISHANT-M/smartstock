// ============================================================
// CUSTOMER PORTAL
// ============================================================
registerRoute('customer-home', async (root) => {
  if (!State.user || State.user.role !== 'customer') { navigateTo('login'); return; }

  root.innerHTML = `
  ${buildSidebar('customer-home')}
  <div class="with-sidebar page">
    <div class="page-header">
      <div>
        <div class="page-title">👋 Hello, ${State.user.full_name.split(' ')[0]}!</div>
        <div class="page-sub">Welcome to your SmartStock Customer Portal</div>
      </div>
    </div>
    <div class="page-body">
      <!-- Profile Card -->
      <div class="grid-2 mb-24">
        <div class="card">
          <div class="fw-600 mb-16">👤 My Profile</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div class="bill-item">
              <span class="text-muted" style="width:100px">Full Name</span>
              <span class="fw-600">${State.user.full_name}</span>
            </div>
            <div class="bill-item">
              <span class="text-muted" style="width:100px">Username</span>
              <span>@${State.user.username}</span>
            </div>
            <div class="bill-item">
              <span class="text-muted" style="width:100px">Customer ID</span>
              <span class="mono fw-600 badge badge-accent">#${State.user.user_id}</span>
            </div>
            <div class="bill-item">
              <span class="text-muted" style="width:100px">Phone</span>
              <span>${State.user.phone_no||'Not set'}</span>
            </div>
          </div>
          <div class="alert alert-info mt-16" style="font-size:.82rem">
            💡 Share your Customer ID <strong>#${State.user.user_id}</strong> with the cashier when billing
          </div>
        </div>
        <div class="card">
          <div class="fw-600 mb-16">📊 My Summary</div>
          <div id="customer-stats">Loading…</div>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="card">
        <div class="flex-between mb-16">
          <div class="fw-600">🧾 Recent Purchases</div>
          <button class="btn btn-ghost" style="font-size:.85rem" onclick="navigateTo('customer-orders')">View All →</button>
        </div>
        <div id="recent-orders">Loading…</div>
      </div>
    </div>
  </div>`;

  loadCustomerSummary();
});

async function loadCustomerSummary() {
  try {
    const data = await apiFetch('/orders');
    const orders = data.orders;

    // Stats
    const totalSpent   = orders.reduce((s,o) => s + parseFloat(o.total_bill||0), 0);
    const totalOrders  = orders.length;
    const lastOrder    = orders[0];

    document.getElementById('customer-stats').innerHTML = `
      <div class="grid-2" style="gap:14px">
        <div class="stat-card"><div class="stat-label">Total Spent</div><div class="stat-value" style="font-size:1.4rem">${fmtRs(totalSpent)}</div></div>
        <div class="stat-card"><div class="stat-label">Purchases</div><div class="stat-value" style="font-size:1.4rem">${totalOrders}</div></div>
      </div>
      ${lastOrder ? `<div class="alert alert-info mt-14" style="font-size:.82rem">Last visit: ${fmtDT(lastOrder.order_date)}</div>` : ''}`;

    // Recent orders
    const recentEl = document.getElementById('recent-orders');
    if (!orders.length) {
      recentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><div>No purchases yet — come visit us!</div></div>`;
      return;
    }
    recentEl.innerHTML = orders.slice(0,5).map(o => `
      <div class="bill-item" style="margin-bottom:10px;cursor:pointer" onclick="viewOrder(${o.order_id})">
        <div style="flex:1">
          <div class="fw-600">Bill #${o.order_id}</div>
          <div class="text-muted text-sm">${fmtDT(o.order_date)} · ${o.cashier_name}</div>
        </div>
        <div class="text-right">
          <div class="mono fw-600">${fmtRs(o.total_bill)}</div>
          <div class="badge ${o.payment_mode==='cash'?'badge-gray':'badge-accent'} mt-4">${o.payment_mode}</div>
        </div>
        <span style="color:var(--text-l);margin-left:8px">›</span>
      </div>`).join('');
  } catch(e) {}
}

// ── Customer Orders Full List ─────────────────────────────────
registerRoute('customer-orders', async (root) => {
  if (!State.user || State.user.role !== 'customer') { navigateTo('login'); return; }

  root.innerHTML = `
  ${buildSidebar('customer-orders')}
  <div class="with-sidebar page">
    <div class="page-header">
      <div>
        <div class="page-title">🧾 My Purchases</div>
        <div class="page-sub">Complete purchase history</div>
      </div>
    </div>
    <div class="page-body">
      <div id="all-orders">Loading…</div>
    </div>
  </div>`;

  try {
    const data = await apiFetch('/orders');
    const el = document.getElementById('all-orders');
    if (!data.orders.length) {
      el.innerHTML = `<div class="empty-state" style="padding:80px"><div class="empty-icon">🛒</div><div>No purchases found</div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Bill #</th><th>Date</th><th>Cashier</th><th>Subtotal</th><th>Discount</th><th>GST</th><th>Total</th><th>Payment</th><th></th></tr></thead>
          <tbody>
            ${data.orders.map(o=>`
              <tr>
                <td class="mono fw-600">#${o.order_id}</td>
                <td>${fmtDT(o.order_date)}</td>
                <td>${o.cashier_name}</td>
                <td class="mono">${fmtRs(o.subtotal)}</td>
                <td class="mono text-success">-${fmtRs(o.discount)}</td>
                <td class="mono text-muted">${fmtRs(o.tax_amount)}</td>
                <td class="mono fw-600">${fmtRs(o.total_bill)}</td>
                <td><span class="badge badge-gray">${o.payment_mode}</span></td>
                <td><button class="btn btn-ghost" style="padding:4px 12px;font-size:.8rem" onclick="viewOrder(${o.order_id})">Receipt</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) { showToast(e.message,'error'); }
});
