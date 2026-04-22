// ============================================================
// CASHIER BILLING PAGE — Touch-friendly big-icon POS
// ============================================================
registerRoute('billing', (root) => {
  if (!State.user || State.user.role !== 'cashier') {
    navigateTo('login'); return;
  }
  State.cart = [];

  root.innerHTML = `
  <div class="cashier-layout">
    <!-- LEFT: Products -->
    <div class="cashier-main">
      <!-- Topbar -->
      <div class="cashier-topbar">
        <div style="font-size:1.3rem;font-weight:700;color:var(--accent)">◉ SmartStock</div>
        <div style="font-size:.85rem;color:var(--text-m)">Cashier: <strong>${State.user.full_name}</strong></div>
        <div class="search-bar" style="flex:1;max-width:320px;margin-left:auto">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search product or barcode…" id="product-search"
            oninput="filterProducts(this.value)" />
        </div>
        <button class="btn btn-ghost" onclick="navigateTo('orders')">📋 Bills</button>
        <button class="btn btn-ghost" onclick="logout()" style="color:var(--danger)">Sign Out</button>
      </div>

      <!-- Customer selector -->
      <div style="padding:16px 20px 8px;background:var(--surface2);border-bottom:1px solid var(--border)">
        <div class="flex gap-12" style="align-items:center;flex-wrap:wrap">
          <span style="font-weight:600;font-size:.9rem">👤 Customer:</span>
          <div id="customer-display" style="flex:1;min-width:200px">
            <button class="btn btn-outline" onclick="openCustomerSearch()">
              Select Customer →
            </button>
          </div>
          <button class="btn btn-ghost btn-icon" title="Clear customer" onclick="clearCustomer()">✕</button>
        </div>
      </div>

      <!-- Category chips -->
      <div style="padding:14px 20px 4px">
        <div class="chip-list" id="category-chips">
          <div class="chip active" data-cat="all" onclick="filterCategory(this,'all')">All</div>
        </div>
      </div>

      <!-- Product grid -->
      <div style="padding:8px 20px 20px">
        <div class="product-grid" id="product-grid">
          <div class="empty-state"><div class="empty-icon">⏳</div><div>Loading products…</div></div>
        </div>
      </div>
    </div>

    <!-- RIGHT: Bill Panel -->
    <div class="bill-panel">
      <div class="bill-header">
        <div style="font-weight:700;font-size:1.05rem">🧾 Current Bill</div>
        <div style="font-size:.8rem;color:var(--text-m)" id="bill-order-no">New Order</div>
      </div>

      <div class="bill-items" id="bill-items">
        <div class="empty-state" style="padding:40px 20px">
          <div class="empty-icon">🛒</div>
          <div class="empty-text">Tap a product to add</div>
        </div>
      </div>

      <div class="bill-footer">
        <div class="bill-row"><span>Subtotal</span><span id="bill-subtotal">₹0.00</span></div>
        <div class="bill-row">
          <span>Discount</span>
          <div class="flex gap-8" style="align-items:center">
            <span>₹</span>
            <input type="number" id="bill-discount" value="0" min="0" step="1"
              style="width:70px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:.88rem"
              oninput="updateBillTotals()" />
          </div>
        </div>
        <div class="bill-row"><span>GST (18%)</span><span id="bill-tax">₹0.00</span></div>
        <div class="bill-row total"><span>TOTAL</span><span id="bill-total">₹0.00</span></div>

        <div class="form-group mt-16 mb-16">
          <label class="form-label">Payment Mode</label>
          <select class="form-input" id="payment-mode">
            <option value="cash">💵 Cash</option>
            <option value="upi">📱 UPI</option>
            <option value="card">💳 Card</option>
          </select>
        </div>

        <div id="checkout-warn" class="alert alert-warn mb-16 hidden" style="font-size:.82rem"></div>

        <button class="btn btn-primary btn-lg w-full" id="checkout-btn" onclick="doCheckout()">
          ✓ Checkout
        </button>
        <button class="btn btn-ghost w-full mt-8" onclick="clearCart()">✕ Clear Bill</button>
      </div>
    </div>
  </div>`;

  loadCashierProducts();
  loadCategories();
});

let _allProducts = [];
let _activeCategory = 'all';

async function loadCashierProducts() {
  try {
    const data = await apiFetch('/products?cashier=1');
    _allProducts = data.products;
    renderProductGrid(_allProducts);
  } catch (e) { showToast('Failed to load products: ' + e.message, 'error'); }
}

async function loadCategories() {
  try {
    const data = await apiFetch('/categories');
    const chips = document.getElementById('category-chips');
    if (!chips) return;
    chips.innerHTML = `<div class="chip active" data-cat="all" onclick="filterCategory(this,'all')">All</div>`;
    data.categories.forEach(c => {
      const div = document.createElement('div');
      div.className = 'chip';
      div.setAttribute('data-cat', c.category_id);
      div.onclick = function() { filterCategory(this, c.category_id); };
      div.textContent = `${catEmoji(c.category_name)} ${c.category_name}`;
      chips.appendChild(div);
    });
  } catch(e) {}
}

function filterCategory(el, catId) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  _activeCategory = catId;
  const search = document.getElementById('product-search')?.value || '';
  let filtered = _allProducts;
  if (catId !== 'all') filtered = filtered.filter(p => p.category_id == catId);
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode||'').includes(search));
  renderProductGrid(filtered);
}

function filterProducts(search) {
  let filtered = _allProducts;
  if (_activeCategory !== 'all') filtered = filtered.filter(p => p.category_id == _activeCategory);
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode||'').includes(search));
  renderProductGrid(filtered);
}

function renderProductGrid(products) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div>No products found</div></div>`;
    return;
  }
  grid.innerHTML = products.map(p => {
    const inCart = State.cart.find(i => i.product_id === p.product_id);
    const expiringSoon = p.days_to_expiry !== null && p.days_to_expiry <= 7 && p.days_to_expiry >= 0;
    return `
    <div class="product-tile ${inCart?'selected':''}" onclick="addToCart(${p.product_id})" title="${p.warning_label||p.name}">
      ${p.warning_label ? `<div style="position:absolute;top:6px;right:6px;font-size:.65rem;background:var(--warn);color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">${p.warning_label.split(' ')[0]}</div>` : ''}
      ${expiringSoon ? `<div style="position:absolute;top:6px;left:6px;font-size:.65rem;background:var(--danger);color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">EXP ${p.days_to_expiry}d</div>` : ''}
      <div class="tile-icon">${catEmoji(p.category_name)}</div>
      <div class="tile-name">${p.name}</div>
      <div class="tile-price">${fmtRs(p.price)}</div>
      <div class="tile-stock">Stock: ${p.stock_qty}</div>
      ${inCart ? `<div class="badge badge-accent" style="margin-top:4px">In cart: ${inCart.qty}</div>` : ''}
    </div>`;
  }).join('');
}

function addToCart(productId) {
  const product = _allProducts.find(p => p.product_id === productId);
  if (!product) return;

  // Warning label prompt
  if (product.warning_label) {
    if (!confirm(`⚠️ WARNING: This product has a label:\n"${product.warning_label}"\n\nProceed to add to bill?`)) return;
  }

  const existing = State.cart.find(i => i.product_id === productId);
  if (existing) {
    if (existing.qty >= product.stock_qty) { showToast('Max stock reached for this item', 'warn'); return; }
    existing.qty++;
  } else {
    State.cart.push({ product_id: product.product_id, name: product.name, price: product.price, qty: 1, stock: product.stock_qty });
  }
  renderBill();
  renderProductGrid(_allProducts.filter(p => _activeCategory === 'all' || p.category_id == _activeCategory));
}

function changeQty(productId, delta) {
  const item = State.cart.find(i => i.product_id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) State.cart = State.cart.filter(i => i.product_id !== productId);
  renderBill();
  const search = document.getElementById('product-search')?.value || '';
  filterProducts(search);
}

function clearCart() {
  State.cart = [];
  renderBill();
  filterProducts('');
}

function renderBill() {
  const container = document.getElementById('bill-items');
  if (!container) return;
  if (!State.cart.length) {
    container.innerHTML = `<div class="empty-state" style="padding:40px 20px"><div class="empty-icon">🛒</div><div class="empty-text">Tap a product to add</div></div>`;
  } else {
    container.innerHTML = State.cart.map(item => `
      <div class="bill-item">
        <div class="item-name">${item.name}</div>
        <div class="item-qty">
          <button class="qty-btn" onclick="changeQty(${item.product_id},-1)">−</button>
          <span style="font-weight:600;min-width:20px;text-align:center">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.product_id},1)">+</button>
        </div>
        <div class="item-total">${fmtRs(item.price * item.qty)}</div>
      </div>`).join('');
  }
  updateBillTotals();
}

function updateBillTotals() {
  const subtotal = State.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = parseFloat(document.getElementById('bill-discount')?.value) || 0;
  const taxable  = Math.max(0, subtotal - discount);
  const tax      = taxable * 0.18;
  const total    = taxable + tax;
  document.getElementById('bill-subtotal').textContent = fmtRs(subtotal);
  document.getElementById('bill-tax').textContent      = fmtRs(tax);
  document.getElementById('bill-total').textContent    = fmtRs(total);
}

// ── Customer Search ──────────────────────────────────────────
function openCustomerSearch() {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">👤 Find Customer</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div class="search-bar w-full mb-16" style="width:100%">
      <span class="search-icon">🔍</span>
      <input type="text" id="cust-search-input" placeholder="Name, phone or username…"
        oninput="searchCustomers(this.value)" autofocus style="width:100%" />
    </div>
    <div id="cust-results" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px">
      <div class="text-muted text-center" style="padding:20px">Start typing to search…</div>
    </div>
    <div class="divider"></div>
    <button class="btn btn-outline w-full" onclick="closeModal();navigateTo('register')">
      + Register New Customer
    </button>`);
}

async function searchCustomers(query) {
  if (!query || query.length < 2) {
    document.getElementById('cust-results').innerHTML = `<div class="text-muted text-center" style="padding:20px">Start typing to search…</div>`;
    return;
  }
  try {
    const data = await apiFetch(`/users/customers?search=${encodeURIComponent(query)}`);
    const el = document.getElementById('cust-results');
    if (!data.customers.length) {
      el.innerHTML = `
        <div class="text-center" style="padding:20px">
          <div class="text-muted mb-16">No customer found</div>
          <button class="btn btn-primary" onclick="closeModal();navigateTo('register')">Register "${query}"</button>
        </div>`;
      return;
    }
    el.innerHTML = data.customers.map(c => `
      <div class="bill-item" style="cursor:pointer" onclick="selectCustomer(${c.user_id},'${c.full_name}','${c.phone_no||''}')">
        <span>👤</span>
        <div style="flex:1">
          <div style="font-weight:600">${c.full_name}</div>
          <div class="text-muted text-sm">${c.phone_no||''} · @${c.username}</div>
        </div>
        <button class="btn btn-primary" style="padding:6px 14px;font-size:.82rem">Select</button>
      </div>`).join('');
  } catch(e) {}
}

function selectCustomer(id, name, phone) {
  State.currentCustomer = { user_id: id, full_name: name, phone_no: phone };
  const display = document.getElementById('customer-display');
  if (display) {
    display.innerHTML = `
      <div class="flex gap-12" style="align-items:center">
        <div class="badge badge-accent">ID: ${id}</div>
        <strong>${name}</strong>
        <span class="text-muted text-sm">${phone}</span>
      </div>`;
  }
  closeModal();
  showToast(`Customer: ${name}`, 'success');
}

function clearCustomer() {
  State.currentCustomer = null;
  const display = document.getElementById('customer-display');
  if (display) display.innerHTML = `<button class="btn btn-outline" onclick="openCustomerSearch()">Select Customer →</button>`;
}

// ── Checkout ─────────────────────────────────────────────────
async function doCheckout() {
  if (!State.cart.length)          { showToast('Cart is empty', 'warn'); return; }
  if (!State.currentCustomer)      { showToast('Please select a customer first', 'warn'); openCustomerSearch(); return; }

  const btn     = document.getElementById('checkout-btn');
  const warnEl  = document.getElementById('checkout-warn');
  const discount = parseFloat(document.getElementById('bill-discount')?.value) || 0;
  const payMode  = document.getElementById('payment-mode')?.value || 'cash';

  btn.innerHTML = '<span class="spinner"></span> Processing…'; btn.disabled = true;
  warnEl.classList.add('hidden');

  try {
    const data = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_id:     State.currentCustomer.user_id,
        items:           State.cart.map(i => ({ product_id: i.product_id, qty: i.qty })),
        payment_mode:    payMode,
        discount_amount: discount,
      })
    });

    showToast(`Bill #${data.order_id} created! Total: ${fmtRs(data.total)}`, 'success');
    showReceipt(data.order_id);
    State.cart = [];
    State.currentCustomer = null;
    clearCustomer();
    renderBill();
    loadCashierProducts();

  } catch (e) {
    warnEl.textContent = '⚠ ' + e.message;
    warnEl.classList.remove('hidden');
    btn.innerHTML = '✓ Checkout'; btn.disabled = false;
  }
}

async function showReceipt(orderId) {
  try {
    const data = await apiFetch(`/orders/${orderId}`);
    const o = data.order; const items = data.items;
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">🧾 Receipt — Bill #${orderId}</h3>
        <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div id="receipt" style="font-family:var(--font-mono);font-size:.82rem;border:1px dashed var(--border);border-radius:8px;padding:20px;background:var(--surface2)">
        <div style="text-align:center;margin-bottom:12px">
          <strong style="font-size:1rem">◉ SMART-STOCK</strong><br>
          <span>Integrated Billing Solution</span><br>
          <small>${fmtDT(o.order_date)}</small>
        </div>
        <div style="margin-bottom:8px">
          <div>Customer: ${o.customer_name} (ID: ${o.customer_id})</div>
          <div>Cashier: ${o.cashier_name}</div>
          <div>Payment: ${o.payment_mode?.toUpperCase()}</div>
        </div>
        <hr style="border-top:1px dashed #ccc;margin:8px 0"/>
        <table style="width:100%;font-size:.78rem">
          <tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Amt</th></tr>
          ${items.map(i=>`<tr><td>${i.name}</td><td style="text-align:center">${i.qty_sold}</td><td style="text-align:right">${fmtRs(i.line_total)}</td></tr>`).join('')}
        </table>
        <hr style="border-top:1px dashed #ccc;margin:8px 0"/>
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${fmtRs(o.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Discount</span><span>-${fmtRs(o.discount)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>GST (18%)</span><span>${fmtRs(o.tax_amount)}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1rem;border-top:1px dashed #ccc;padding-top:6px;margin-top:4px"><span>TOTAL</span><span>${fmtRs(o.total_bill)}</span></div>
        <div style="text-align:center;margin-top:12px;font-size:.72rem">Thank you for shopping! • GSTIN: 03ABCDE1234F1Z5</div>
      </div>
      <div class="flex gap-12 mt-16">
        <button class="btn btn-primary flex-1" onclick="window.print()">🖨 Print</button>
        <button class="btn btn-ghost flex-1" onclick="closeModal()">Close</button>
      </div>`, 'modal-lg');
  } catch(e) {}
}

// ============================================================
// ORDERS PAGE (cashier - view their bills)
// ============================================================
registerRoute('orders', async (root) => {
  if (!State.user) { navigateTo('login'); return; }

  root.innerHTML = `
  ${buildSidebar('orders')}
  <div class="with-sidebar page">
    <div class="page-header">
      <div style="display:flex;gap:16px;align-items:center">
        <button class="btn btn-ghost btn-icon" onclick="navigateTo(State.user.role === 'cashier' ? 'billing' : State.user.role === 'customer' ? 'customer-home' : 'dashboard')" title="Back">←</button>
        <div>
          <div class="page-title">🧾 Orders</div>
          <div class="page-sub">All completed bills</div>
        </div>
      </div>
    </div>
    <div class="page-body">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Bill #</th><th>Customer</th><th>Cashier</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
          <tbody id="orders-table"><tr><td colspan="9" class="text-center text-muted" style="padding:30px">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>`;

  try {
    const params = State.user.role === 'customer' ? `?customer_id=${State.user.user_id}` : '';
    const data = await apiFetch(`/orders${params}`);
    const tbody = document.getElementById('orders-table');
    if (!data.orders.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:30px">No orders found</td></tr>`;
      return;
    }
    tbody.innerHTML = data.orders.map(o => `
      <tr>
        <td class="mono fw-600">#${o.order_id}</td>
        <td>${o.customer_name}</td>
        <td>${o.cashier_name}</td>
        <td>${fmtDT(o.order_date)}</td>
        <td>–</td>
        <td class="fw-600 mono">${fmtRs(o.total_bill)}</td>
        <td><span class="badge badge-gray">${o.payment_mode}</span></td>
        <td><span class="badge ${o.status==='completed'?'badge-green':'badge-red'}">${o.status}</span></td>
        <td><button class="btn btn-ghost" style="padding:4px 12px;font-size:.8rem" onclick="viewOrder(${o.order_id})">View</button></td>
      </tr>`).join('');
  } catch(e) { showToast(e.message, 'error'); }
});

async function viewOrder(orderId) {
  await showReceipt(orderId);
}
