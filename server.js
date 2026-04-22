// ============================================================
// SMART-STOCK Backend API (Node.js + Express + mysql2)
// Run: npm install express mysql2 cors bcryptjs jsonwebtoken
//      node server.js
// ============================================================

const express     = require('express');
const mysql       = require('mysql2/promise');
const cors        = require('cors');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const path        = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'smartstock_secret_2025';

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── DB Pool ───────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME     || 'smartstock',
  waitForConnections: true,
  connectionLimit:    10,
});

// ── Auth Middleware ──────────────────────────────────────────
function authMiddleware(roles = []) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      if (roles.length && !roles.includes(decoded.role))
        return res.status(403).json({ error: 'Forbidden' });
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// ── Helper ────────────────────────────────────────────────────
const ok  = (res, data)    => res.json({ success: true, ...data });
const err = (res, msg, c=400) => res.status(c).json({ success: false, error: msg });

// ================================================================
// AUTH ROUTES
// ================================================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return err(res, 'Username and password required');
  try {
    const [rows] = await pool.query(
      'SELECT * FROM USER WHERE username = ? AND is_active = 1', [username]
    );
    if (!rows.length) return err(res, 'Invalid credentials', 401);
    const user = rows[0];
    // Support plain-text for seed data; prefer hashed in production
    const valid = user.password === password || await bcrypt.compare(password, user.password);
    if (!valid) return err(res, 'Invalid credentials', 401);
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role, full_name: user.full_name },
      JWT_SECRET, { expiresIn: '12h' }
    );
    ok(res, { token, user: { user_id: user.user_id, username: user.username, role: user.role, full_name: user.full_name, phone_no: user.phone_no, email: user.email } });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/auth/register  (customer self-registration)
app.post('/api/auth/register', async (req, res) => {
  const { username, password, full_name, phone_no, email } = req.body;
  if (!username || !password || !full_name) return err(res, 'Missing required fields');
  try {
    const [exists] = await pool.query('SELECT user_id FROM USER WHERE username = ?', [username]);
    if (exists.length) return err(res, 'Username already exists');
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO USER (username, password, role, full_name, phone_no, email) VALUES (?,?,?,?,?,?)',
      [username, hashed, 'customer', full_name, phone_no || null, email || null]
    );
    const token = jwt.sign({ user_id: result.insertId, username, role: 'customer', full_name }, JWT_SECRET, { expiresIn: '12h' });
    ok(res, { token, user: { user_id: result.insertId, username, role: 'customer', full_name } });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware(), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, username, role, full_name, phone_no, email FROM USER WHERE user_id = ?', [req.user.user_id]);
    ok(res, { user: rows[0] });
  } catch (e) { err(res, e.message, 500); }
});

// ================================================================
// CATEGORIES
// ================================================================
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CATEGORY ORDER BY category_name');
    ok(res, { categories: rows });
  } catch (e) { err(res, e.message, 500); }
});

app.post('/api/categories', authMiddleware(['admin','manager']), async (req, res) => {
  const { category_name, description } = req.body;
  try {
    const [r] = await pool.query('INSERT INTO CATEGORY (category_name, description) VALUES (?,?)', [category_name, description]);
    ok(res, { category_id: r.insertId });
  } catch (e) { err(res, e.message, 500); }
});

// ================================================================
// PRODUCTS
// ================================================================

// GET /api/products  (all active, for management)
app.get('/api/products', authMiddleware(), async (req, res) => {
  const { category, search, cashier } = req.query;
  let sql = `
    SELECT p.*, c.category_name,
           DATEDIFF(p.expiry_date, CURDATE()) AS days_to_expiry
    FROM PRODUCT p JOIN CATEGORY c ON p.category_id = c.category_id
    WHERE p.is_active = 1`;
  const params = [];
  if (cashier === '1') { sql += ' AND p.stock_qty > 0 AND (p.expiry_date IS NULL OR p.expiry_date >= CURDATE())'; }
  if (category) { sql += ' AND p.category_id = ?'; params.push(category); }
  if (search)   { sql += ' AND (p.name LIKE ? OR p.barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY p.name';
  try {
    const [rows] = await pool.query(sql, params);
    ok(res, { products: rows });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/products/:id
app.get('/api/products/:id', authMiddleware(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT p.*, c.category_name FROM PRODUCT p JOIN CATEGORY c ON p.category_id = c.category_id WHERE p.product_id = ?',
      [req.params.id]
    );
    if (!rows.length) return err(res, 'Product not found', 404);
    ok(res, { product: rows[0] });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/products  (admin/manager)
app.post('/api/products', authMiddleware(['admin','manager']), async (req, res) => {
  const { name, description, price, stock_qty, reorder_level, expiry_date, warning_label, category_id, barcode, image_url } = req.body;
  if (!name || !price || !category_id) return err(res, 'Name, price and category required');
  try {
    const [r] = await pool.query(
      `INSERT INTO PRODUCT (name, description, price, stock_qty, reorder_level, expiry_date, warning_label, category_id, barcode, image_url)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [name, description||null, price, stock_qty||0, reorder_level||10, expiry_date||null, warning_label||null, category_id, barcode||null, image_url||null]
    );
    ok(res, { product_id: r.insertId });
  } catch (e) { err(res, e.message, 500); }
});

// PUT /api/products/:id
app.put('/api/products/:id', authMiddleware(['admin','manager']), async (req, res) => {
  const { name, description, price, reorder_level, expiry_date, warning_label, category_id, barcode, image_url, is_active } = req.body;
  try {
    await pool.query(
      `UPDATE PRODUCT SET name=?, description=?, price=?, reorder_level=?, expiry_date=?, warning_label=?, category_id=?, barcode=?, image_url=?, is_active=?, updated_at=NOW()
       WHERE product_id = ?`,
      [name, description||null, price, reorder_level||10, expiry_date||null, warning_label||null, category_id, barcode||null, image_url||null, is_active??1, req.params.id]
    );
    ok(res, { updated: true });
  } catch (e) { err(res, e.message, 500); }
});

// POST /api/products/:id/restock
app.post('/api/products/:id/restock', authMiddleware(['admin','manager']), async (req, res) => {
  const { qty, notes } = req.body;
  if (!qty || qty <= 0) return err(res, 'Qty must be positive');
  try {
    await pool.query('UPDATE PRODUCT SET stock_qty = stock_qty + ? WHERE product_id = ?', [qty, req.params.id]);
    await pool.query(
      'INSERT INTO STOCK_LOG (product_id, change_qty, reason, performed_by, notes) VALUES (?,?,?,?,?)',
      [req.params.id, qty, 'restock', req.user.user_id, notes||null]
    );
    ok(res, { restocked: true });
  } catch (e) { err(res, e.message, 500); }
});

// ================================================================
// ORDERS / BILLING
// ================================================================

// POST /api/orders  (cashier creates order)
app.post('/api/orders', authMiddleware(['cashier','admin','manager']), async (req, res) => {
  const { customer_id, items, payment_mode, discount_amount } = req.body;
  // items: [{product_id, qty}]
  if (!customer_id || !items || !items.length) return err(res, 'Customer ID and items required');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validate customer exists
    const [custRows] = await conn.query('SELECT user_id FROM USER WHERE user_id = ? AND role = "customer"', [customer_id]);
    if (!custRows.length) { await conn.rollback(); conn.release(); return err(res, 'Customer not found'); }

    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const [pRows] = await conn.query('SELECT * FROM PRODUCT WHERE product_id = ? FOR UPDATE', [item.product_id]);
      if (!pRows.length) { await conn.rollback(); conn.release(); return err(res, `Product ${item.product_id} not found`); }
      const p = pRows[0];
      if (p.expiry_date && new Date(p.expiry_date) < new Date()) { await conn.rollback(); conn.release(); return err(res, `Product "${p.name}" is expired. Sale blocked.`); }
      if (p.stock_qty < item.qty)                                 { await conn.rollback(); conn.release(); return err(res, `Insufficient stock for "${p.name}". Available: ${p.stock_qty}`); }
      const line = p.price * item.qty;
      subtotal += line;
      lineItems.push({ product_id: item.product_id, qty: item.qty, price: p.price, line });
    }

    const discAmt  = parseFloat(discount_amount) || 0;
    const taxAmt   = parseFloat(((subtotal - discAmt) * 0.18).toFixed(2));
    const totalBill = parseFloat((subtotal - discAmt + taxAmt).toFixed(2));

    const [orderRes] = await conn.query(
      'INSERT INTO ORDERS (customer_id, cashier_id, payment_mode, subtotal, discount, tax_amount, total_bill, status) VALUES (?,?,?,?,?,?,?,?)',
      [customer_id, req.user.user_id, payment_mode||'cash', subtotal, discAmt, taxAmt, totalBill, 'completed']
    );
    const orderId = orderRes.insertId;

    for (const li of lineItems) {
      await conn.query(
        'INSERT INTO ORDER_ITEMS (order_id, product_id, qty_sold, unit_price, line_total) VALUES (?,?,?,?,?)',
        [orderId, li.product_id, li.qty, li.price, li.line]
      );
      await conn.query('UPDATE PRODUCT SET stock_qty = stock_qty - ? WHERE product_id = ?', [li.qty, li.product_id]);
      await conn.query('INSERT INTO STOCK_LOG (product_id, change_qty, reason, reference_id, performed_by) VALUES (?,?,?,?,?)',
        [li.product_id, -li.qty, 'sale', orderId, req.user.user_id]);
    }

    await conn.commit(); conn.release();
    ok(res, { order_id: orderId, subtotal, discount: discAmt, tax: taxAmt, total: totalBill });
  } catch (e) {
    await conn.rollback(); conn.release();
    err(res, e.message, 500);
  }
});

// GET /api/orders/:id  (get full receipt)
app.get('/api/orders/:id', authMiddleware(), async (req, res) => {
  try {
    const [order] = await pool.query(
      `SELECT o.*, cu.full_name AS customer_name, cu.phone_no AS customer_phone,
              ca.full_name AS cashier_name
       FROM ORDERS o
       JOIN USER cu ON o.customer_id = cu.user_id
       JOIN USER ca ON o.cashier_id  = ca.user_id
       WHERE o.order_id = ?`, [req.params.id]
    );
    if (!order.length) return err(res, 'Order not found', 404);
    const [items] = await pool.query(
      'SELECT oi.*, p.name FROM ORDER_ITEMS oi JOIN PRODUCT p ON oi.product_id = p.product_id WHERE oi.order_id = ?',
      [req.params.id]
    );
    ok(res, { order: order[0], items });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/orders?customer_id=X  (customer's own orders)
app.get('/api/orders', authMiddleware(), async (req, res) => {
  const { customer_id } = req.query;
  const uid = req.user.role === 'customer' ? req.user.user_id : customer_id;
  let sql = `SELECT o.*, cu.full_name AS customer_name, ca.full_name AS cashier_name
             FROM ORDERS o JOIN USER cu ON o.customer_id=cu.user_id JOIN USER ca ON o.cashier_id=ca.user_id`;
  const params = [];
  if (uid) { sql += ' WHERE o.customer_id = ?'; params.push(uid); }
  sql += ' ORDER BY o.order_date DESC LIMIT 100';
  try {
    const [rows] = await pool.query(sql, params);
    ok(res, { orders: rows });
  } catch (e) { err(res, e.message, 500); }
});

// ================================================================
// ANALYTICS (manager/admin)
// ================================================================
app.get('/api/analytics/dashboard', authMiddleware(['admin','manager']), async (req, res) => {
  try {
    const [[summary]]     = await pool.query('SELECT * FROM vw_daily_summary');
    const [topProducts]   = await pool.query('SELECT * FROM vw_highest_ticket_items LIMIT 5');
    const [expiryAlerts]  = await pool.query('SELECT * FROM vw_expiry_alerts LIMIT 10');
    const [notifications] = await pool.query('SELECT * FROM NOTIFICATION WHERE is_read=0 ORDER BY created_at DESC LIMIT 20');
    const [monthlySales]  = await pool.query(`
      SELECT DATE_FORMAT(order_date,'%Y-%m') AS month, SUM(total_bill) AS revenue, COUNT(*) AS orders
      FROM ORDERS WHERE status='completed' AND order_date >= DATE_SUB(CURDATE(),INTERVAL 6 MONTH)
      GROUP BY month ORDER BY month`);
    ok(res, { summary, topProducts, expiryAlerts, notifications, monthlySales });
  } catch (e) { err(res, e.message, 500); }
});

app.get('/api/analytics/products', authMiddleware(['admin','manager']), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vw_product_sales_summary ORDER BY total_revenue DESC');
    ok(res, { products: rows });
  } catch (e) { err(res, e.message, 500); }
});

app.get('/api/analytics/clearance', authMiddleware(['admin','manager']), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.product_id, p.name, p.stock_qty, p.price, p.expiry_date, c.category_name
      FROM PRODUCT p JOIN CATEGORY c ON p.category_id=c.category_id
      WHERE p.stock_qty > 0 AND p.is_active=1 AND p.product_id NOT IN (
        SELECT DISTINCT oi.product_id FROM ORDER_ITEMS oi JOIN ORDERS o ON oi.order_id=o.order_id
        WHERE o.order_date >= DATE_SUB(CURDATE(),INTERVAL 30 DAY)
      ) ORDER BY p.expiry_date ASC LIMIT 50`);
    ok(res, { products: rows });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/analytics/revenue-by-category
app.get('/api/analytics/revenue-by-category', authMiddleware(['admin','manager']), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.category_name, SUM(oi.qty_sold) AS units, SUM(oi.line_total) AS revenue
      FROM ORDER_ITEMS oi JOIN PRODUCT p ON oi.product_id=p.product_id
      JOIN CATEGORY c ON p.category_id=c.category_id
      JOIN ORDERS o ON oi.order_id=o.order_id WHERE o.status='completed'
      GROUP BY c.category_name ORDER BY revenue DESC`);
    ok(res, { data: rows });
  } catch (e) { err(res, e.message, 500); }
});

// ================================================================
// USERS (admin only)
// ================================================================
app.get('/api/users', authMiddleware(['admin']), async (req, res) => {
  const { role } = req.query;
  let sql = 'SELECT user_id, username, role, full_name, phone_no, email, is_active, created_at FROM USER';
  const params = [];
  if (role) { sql += ' WHERE role = ?'; params.push(role); }
  sql += ' ORDER BY role, full_name';
  try {
    const [rows] = await pool.query(sql, params);
    ok(res, { users: rows });
  } catch (e) { err(res, e.message, 500); }
});

app.post('/api/users', authMiddleware(['admin']), async (req, res) => {
  const { username, password, role, full_name, phone_no, email } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [r] = await pool.query('INSERT INTO USER (username,password,role,full_name,phone_no,email) VALUES (?,?,?,?,?,?)',
      [username, hashed, role, full_name, phone_no||null, email||null]);
    ok(res, { user_id: r.insertId });
  } catch (e) { err(res, e.message, 500); }
});

// GET /api/users/customers  (for cashier lookup)
app.get('/api/users/customers', authMiddleware(['cashier','admin','manager']), async (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT user_id, username, full_name, phone_no, email FROM USER WHERE role = "customer" AND is_active = 1';
  const params = [];
  if (search) { sql += ' AND (full_name LIKE ? OR phone_no LIKE ? OR username LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  sql += ' ORDER BY full_name LIMIT 20';
  try {
    const [rows] = await pool.query(sql, params);
    ok(res, { customers: rows });
  } catch (e) { err(res, e.message, 500); }
});

// ================================================================
// NOTIFICATIONS
// ================================================================
app.get('/api/notifications', authMiddleware(['admin','manager']), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT n.*, p.name AS product_name FROM NOTIFICATION n LEFT JOIN PRODUCT p ON n.product_id=p.product_id ORDER BY created_at DESC LIMIT 50');
    ok(res, { notifications: rows });
  } catch (e) { err(res, e.message, 500); }
});

app.put('/api/notifications/:id/read', authMiddleware(['admin','manager']), async (req, res) => {
  try {
    await pool.query('UPDATE NOTIFICATION SET is_read=1 WHERE notif_id=?', [req.params.id]);
    ok(res, { updated: true });
  } catch (e) { err(res, e.message, 500); }
});

// ================================================================
// STOCK LOG
// ================================================================
app.get('/api/stock-log', authMiddleware(['admin','manager']), async (req, res) => {
  const { product_id } = req.query;
  let sql = `SELECT sl.*, p.name AS product_name, u.full_name AS performed_by_name
             FROM STOCK_LOG sl JOIN PRODUCT p ON sl.product_id=p.product_id
             LEFT JOIN USER u ON sl.performed_by=u.user_id`;
  const params = [];
  if (product_id) { sql += ' WHERE sl.product_id=?'; params.push(product_id); }
  sql += ' ORDER BY sl.log_time DESC LIMIT 100';
  try {
    const [rows] = await pool.query(sql, params);
    ok(res, { logs: rows });
  } catch (e) { err(res, e.message, 500); }
});

// ================================================================
// START SERVER
// ================================================================
app.listen(PORT, () => {
  console.log(`\n🚀 SMART-STOCK Server running at http://localhost:${PORT}`);
  console.log(`📦 Database: ${process.env.DB_NAME || 'smartstock'} @ ${process.env.DB_HOST || 'localhost'}`);
  console.log(`\nSample login credentials:`);
  console.log(`  Admin:   admin_ishant / admin@123`);
  console.log(`  Manager: mgr_rajesh   / mgr@1234`);
  console.log(`  Cashier: cashier_ramu / cash@1234`);
  console.log(`  Customer:cust_001     / cust@1234\n`);
});

module.exports = app;
