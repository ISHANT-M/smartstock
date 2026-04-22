// ============================================================
// LANDING PAGE (Public home page with company info)
// ============================================================
registerRoute('landing', (root) => {
  root.innerHTML = `
  <div id="landing-page">
    <!-- NAV -->
    <nav class="lp-nav" id="lp-nav">
      <div class="container flex-between" style="height:64px">
        <div class="lp-logo">◉ SmartStock</div>
        <div class="lp-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
        <button class="btn btn-primary" onclick="navigateTo('login')">Login →</button>
      </div>
    </nav>

    <!-- HERO -->
    <section class="lp-hero">
      <div class="container-sm text-center">
        <div class="hero-badge">🇮🇳 Built for Indian Retail</div>
        <h1 class="hero-title">Smart Inventory &<br>Billing for Kirana Stores</h1>
        <p class="hero-sub">Replace your ledger with an intelligent system that tracks stock, auto-blocks expired items, and generates digital GST bills — all in one place.</p>
        <div class="flex-center gap-12" style="margin-top:36px;flex-wrap:wrap">
          <button class="btn btn-primary btn-xl" onclick="navigateTo('login')">Get Started Free →</button>
          <button class="btn btn-outline btn-xl" onclick="scrollTo({top:document.getElementById('features').offsetTop-80,behavior:'smooth'})">See Features</button>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><span class="stat-n">100%</span><span>Free Hosting</span></div>
          <div class="hero-stat"><span class="stat-n">4</span><span>User Roles</span></div>
          <div class="hero-stat"><span class="stat-n">GST</span><span>Compliant Bills</span></div>
          <div class="hero-stat"><span class="stat-n">Auto</span><span>Expiry Block</span></div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="lp-section" id="features">
      <div class="container">
        <div class="section-label">WHAT WE OFFER</div>
        <h2 class="section-title">Everything your store needs</h2>
        <div class="grid-3 mt-32">
          ${[
            ['📦','Inventory Control','Track every SKU with barcode support, stock levels, reorder alerts, and full audit logs.'],
            ['🚫','Expiry Protection','Database-level triggers automatically block sale of expired medicines and perishables.'],
            ['🧾','Digital GST Bills','Auto-calculate 18% GST, apply discounts, and send paperless receipts to customer portals.'],
            ['📊','Smart Analytics','Identify highest-ticket items, clearance candidates, and revenue breakdowns by category.'],
            ['👥','Role-Based Access','Admin, Manager, Cashier, and Customer each get tailored views and permissions.'],
            ['⚡','Touch-Friendly POS','Big-icon cashier interface designed for touchscreens — works even with untrained staff.'],
          ].map(([icon,title,desc]) => `
            <div class="feature-card">
              <div class="feat-icon">${icon}</div>
              <h3>${title}</h3>
              <p>${desc}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="lp-section lp-section-dark">
      <div class="container">
        <div class="section-label" style="color:rgba(255,255,255,.5)">HOW IT WORKS</div>
        <h2 class="section-title" style="color:#fff">From scan to receipt in seconds</h2>
        <div class="steps-row">
          ${[
            ['1','Cashier scans barcode or taps product icon'],
            ['2','System validates expiry & stock instantly'],
            ['3','Customer ID looked up or registered on the spot'],
            ['4','One-tap checkout generates GST bill & updates stock'],
          ].map(([n,t]) => `<div class="step"><div class="step-num">${n}</div><p>${t}</p></div>`).join('')}
        </div>
      </div>
    </section>

    <!-- PRICING -->
    <section class="lp-section" id="pricing">
      <div class="container">
        <div class="section-label">PRICING</div>
        <h2 class="section-title">Simple, transparent pricing</h2>
        <p style="text-align:center;color:var(--text-m);margin-bottom:40px">No hidden charges. Self-host on a free MySQL server and pay nothing.</p>
        <div class="pricing-row">
          ${[
            ['Starter','₹0/month','Free forever','Self-hosted on localhost or free tier MySQL',['Up to 3 staff accounts','Inventory management','Billing & receipts','30-day analytics'],false],
            ['Business','₹999/month','Most popular','Cloud-hosted with daily backups',['Unlimited staff accounts','Advanced analytics','Multi-branch support','Priority support','SMS bill notifications'],true],
            ['Enterprise','Custom','For large chains','Dedicated infrastructure & custom features',['Everything in Business','Custom integrations','SLA guarantee','On-site training','Dedicated account manager'],false],
          ].map(([plan,price,tag,desc,features,highlight]) => `
            <div class="pricing-card ${highlight?'pricing-highlight':''}">
              ${highlight?'<div class="pricing-badge">MOST POPULAR</div>':''}
              <div class="pricing-plan">${plan}</div>
              <div class="pricing-price">${price}</div>
              <div class="pricing-tag">${tag}</div>
              <p class="pricing-desc">${desc}</p>
              <ul class="pricing-features">
                ${features.map(f=>`<li>✓ ${f}</li>`).join('')}
              </ul>
              <button class="btn ${highlight?'btn-primary':'btn-outline'} w-full btn-lg" onclick="navigateTo('login')">Get Started</button>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- ABOUT -->
    <section class="lp-section lp-section-cream" id="about">
      <div class="container">
        <div class="section-label">ABOUT US</div>
        <h2 class="section-title">Built by students, for real stores</h2>
        <p style="text-align:center;color:var(--text-m);max-width:600px;margin:0 auto 48px">SmartStock is a DBMS project developed at Thapar Institute of Engineering & Technology, Patiala. It emerged from a real need — helping Indian kirana stores compete with e-commerce delivery apps.</p>
        <div class="team-grid">
          ${[
            ['Ishant Mehndiratta','1024030525','Lead Developer & Architect','Designed the complete database schema, PL/SQL triggers, stored procedures, and system architecture. Spearheaded backend integration and concurrency control mechanisms.','🎓'],
            ['Satyam Tiwari','1024030088','Backend Developer','Implemented SQL analytics queries, views, normalization logic, and the billing & checkout workflow. Led the ACID compliance and transaction management layer.','💻'],
            ['Anshaj Kumar','1024030494','Frontend & Integration','Developed the web interface, role-based dashboards, and real-time connectivity between cashier billing and customer portal. Handled UI/UX design.','🎨'],
          ].map(([name,roll,role,desc,icon]) => `
            <div class="team-card">
              <div class="team-avatar">${icon}</div>
              <div class="team-info">
                <h3>${name}</h3>
                <div class="team-roll">Roll: ${roll}</div>
                <div class="team-role">${role}</div>
                <p>${desc}</p>
              </div>
            </div>`).join('')}
        </div>
        <div class="institute-badge">
          <strong>THAPAR INSTITUTE OF ENGINEERING & TECHNOLOGY, PATIALA</strong><br>
          Computer Science & Engineering · Database Management Systems (UCS310) · Academic Year 2025-26<br>
          <em>Submitted to: Dr. Shashank Singh</em>
        </div>
      </div>
    </section>

    <!-- CONTACT -->
    <section class="lp-section" id="contact">
      <div class="container-sm text-center">
        <div class="section-label">CONTACT</div>
        <h2 class="section-title">Get in touch</h2>
        <p style="color:var(--text-m);margin-bottom:40px">Have questions about deployment or want to contribute? Reach out.</p>
        <div class="contact-grid">
          <div class="contact-item"><span class="contact-icon">📧</span><span>ishant@smartstock.in</span></div>
          <div class="contact-item"><span class="contact-icon">📍</span><span>TIET Patiala, Punjab</span></div>
          <div class="contact-item"><span class="contact-icon">🔗</span><span>github.com/smartstock-tiet</span></div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="lp-footer">
      <div class="container flex-between" style="flex-wrap:wrap;gap:16px">
        <div>
          <div class="lp-logo" style="font-size:1rem">◉ SmartStock</div>
          <div style="font-size:.8rem;color:var(--text-l);margin-top:4px">Integrated Inventory & Billing Solution</div>
        </div>
        <div style="font-size:.82rem;color:var(--text-l)">© 2025-26 Sub Group 2C34 · TIET Patiala · UCS310 DBMS Project</div>
        <div style="display:flex;gap:16px">
          <a href="#features" style="font-size:.82rem;color:var(--text-m)">Features</a>
          <a href="#pricing" style="font-size:.82rem;color:var(--text-m)">Pricing</a>
          <a href="#about" style="font-size:.82rem;color:var(--text-m)">About</a>
        </div>
      </div>
    </footer>
  </div>`;

  // Sticky nav
  window.addEventListener('scroll', () => {
    document.getElementById('lp-nav')?.classList.toggle('scrolled', window.scrollY > 40);
  });
});

// ============================================================
// LOGIN PAGE
// ============================================================
registerRoute('login', (root) => {
  root.innerHTML = `
  <div class="login-page">
    <div class="login-left">
      <div class="login-brand">
        <div class="login-logo">◉ SmartStock</div>
        <p class="login-tagline">Integrated Inventory & Billing Solution</p>
      </div>
      <div class="login-illustration">🏪</div>
      <div class="login-features">
        <div class="lf-item">✓ Auto expiry protection</div>
        <div class="lf-item">✓ Digital GST bills</div>
        <div class="lf-item">✓ Real-time inventory</div>
        <div class="lf-item">✓ Role-based access</div>
      </div>
    </div>
    <div class="login-right">
      <div class="login-box">
        <button class="btn btn-ghost btn-icon" onclick="navigateTo('landing')" style="margin-bottom:20px">←</button>
        <h2 style="margin-bottom:6px">Welcome back</h2>
        <p class="text-muted mb-24">Sign in to your SmartStock account</p>

        <div class="role-select-row">
          <button class="role-btn active" data-role="admin" onclick="selectRole(this,'admin')">👑<span>Owner</span></button>
          <button class="role-btn" data-role="manager" onclick="selectRole(this,'manager')">👔<span>Manager</span></button>
          <button class="role-btn" data-role="cashier" onclick="selectRole(this,'cashier')">🏪<span>Cashier</span></button>
          <button class="role-btn" data-role="customer" onclick="selectRole(this,'customer')">👤<span>Customer</span></button>
        </div>

        <div id="login-hint" class="alert alert-info mb-16" style="font-size:.82rem">
          <span>💡 Demo: admin_ishant / admin@123</span>
        </div>

        <div class="form-group mb-16">
          <label class="form-label">Username</label>
          <input class="form-input" id="login-user" type="text" placeholder="Enter your username" autocomplete="username" />
        </div>
        <div class="form-group mb-24">
          <label class="form-label">Password</label>
          <input class="form-input" id="login-pass" type="password" placeholder="Enter your password" autocomplete="current-password"
            onkeydown="if(event.key==='Enter')doLogin()" />
        </div>

        <div id="login-err" class="alert alert-danger mb-16 hidden"></div>

        <button class="btn btn-primary btn-lg w-full" id="login-btn" onclick="doLogin()">Sign In →</button>

        <div class="mt-16 text-center text-muted text-sm">
          New customer? <a onclick="navigateTo('register')" style="color:var(--accent);cursor:pointer;font-weight:600">Create account</a>
        </div>
      </div>
    </div>
  </div>`;
});

const ROLE_HINTS = {
  admin:    'Demo: admin_ishant / admin@123',
  manager:  'Demo: mgr_rajesh / mgr@1234',
  cashier:  'Demo: cashier_ramu / cash@1234',
  customer: 'Demo: cust_001 / cust@1234',
};

function selectRole(btn, role) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const hint = document.getElementById('login-hint');
  if (hint) hint.innerHTML = `<span>💡 ${ROLE_HINTS[role]}</span>`;
}

async function doLogin() {
  const username = document.getElementById('login-user')?.value?.trim();
  const password = document.getElementById('login-pass')?.value;
  const errEl    = document.getElementById('login-err');
  const btn      = document.getElementById('login-btn');
  if (!username || !password) { errEl.textContent = 'Please enter username and password'; errEl.classList.remove('hidden'); return; }
  errEl.classList.add('hidden');
  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;
  try {
    const user = await login(username, password);
    const roleHome = { admin:'dashboard', manager:'dashboard', cashier:'billing', customer:'customer-home' };
    showToast(`Welcome, ${user.full_name}!`, 'success');
    navigateTo(roleHome[user.role] || 'landing');
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
    btn.innerHTML = 'Sign In →';
    btn.disabled = false;
  }
}

// ============================================================
// REGISTER PAGE (customer self-registration)
// ============================================================
registerRoute('register', (root) => {
  root.innerHTML = `
  <div class="login-page">
    <div class="login-left">
      <div class="login-brand">
        <div class="login-logo">◉ SmartStock</div>
        <p class="login-tagline">Create your customer account</p>
      </div>
      <div class="login-illustration">👤</div>
      <div class="login-features">
        <div class="lf-item">✓ View your purchase history</div>
        <div class="lf-item">✓ Digital bill receipts</div>
        <div class="lf-item">✓ Paperless experience</div>
      </div>
    </div>
    <div class="login-right">
      <div class="login-box">
        <button class="btn btn-ghost btn-icon" onclick="navigateTo('login')" style="margin-bottom:20px">←</button>
        <h2 style="margin-bottom:6px">New Customer</h2>
        <p class="text-muted mb-24">Create your SmartStock account</p>
        <div class="form-group mb-12">
          <label class="form-label">Full Name *</label>
          <input class="form-input" id="reg-name" type="text" placeholder="Your full name" />
        </div>
        <div class="form-group mb-12">
          <label class="form-label">Username *</label>
          <input class="form-input" id="reg-user" type="text" placeholder="Choose a username" />
        </div>
        <div class="form-group mb-12">
          <label class="form-label">Phone Number</label>
          <input class="form-input" id="reg-phone" type="tel" placeholder="10-digit mobile number" maxlength="10" />
        </div>
        <div class="form-group mb-12">
          <label class="form-label">Email</label>
          <input class="form-input" id="reg-email" type="email" placeholder="your@email.com" />
        </div>
        <div class="form-group mb-24">
          <label class="form-label">Password *</label>
          <input class="form-input" id="reg-pass" type="password" placeholder="Choose a strong password" />
        </div>
        <div id="reg-err" class="alert alert-danger mb-16 hidden"></div>
        <button class="btn btn-primary btn-lg w-full" id="reg-btn" onclick="doRegister()">Create Account →</button>
        <div class="mt-16 text-center text-muted text-sm">
          Already have an account? <a onclick="navigateTo('login')" style="color:var(--accent);cursor:pointer;font-weight:600">Sign in</a>
        </div>
      </div>
    </div>
  </div>`;
});

async function doRegister() {
  const full_name = document.getElementById('reg-name')?.value?.trim();
  const username  = document.getElementById('reg-user')?.value?.trim();
  const phone_no  = document.getElementById('reg-phone')?.value?.trim();
  const email     = document.getElementById('reg-email')?.value?.trim();
  const password  = document.getElementById('reg-pass')?.value;
  const errEl     = document.getElementById('reg-err');
  const btn       = document.getElementById('reg-btn');
  if (!full_name || !username || !password) {
    errEl.textContent = 'Full name, username, and password are required';
    errEl.classList.remove('hidden'); return;
  }
  errEl.classList.add('hidden');
  btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
  try {
    const data = await apiFetch('/auth/register', { method:'POST', body: JSON.stringify({username,password,full_name,phone_no,email}) });
    State.token = data.token; State.user = data.user;
    localStorage.setItem('ss_token', data.token);
    localStorage.setItem('ss_user', JSON.stringify(data.user));
    showToast(`Account created! Welcome, ${full_name}`, 'success');
    navigateTo('customer-home');
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
    btn.innerHTML = 'Create Account →'; btn.disabled = false;
  }
}
