# ◉ SMART-STOCK: Integrated Inventory & Billing Solution

> TIET Patiala · UCS310 Database Management Systems · Sub Group 2C34 · AY 2025-26

**Team:** Ishant Mehndiratta (1024030525) · Satyam Tiwari (1024030088) · Anshaj (1024030494)  
**Guide:** Dr. Shashank Singh

---

## 🚀 Quick Setup (5 Minutes)

### Prerequisites
- **Node.js** v18+ → https://nodejs.org
- **MySQL** (free options below)

### Step 1 — Get MySQL (Free)

**Option A: Local (easiest for dev)**
```bash
# Install MySQL Community Server (free) from:
# https://dev.mysql.com/downloads/mysql/
# OR use XAMPP: https://www.apachefriends.org
```

**Option B: Free Cloud (for hosting)**
- **PlanetScale** (free tier): https://planetscale.com
- **Railway** (free MySQL): https://railway.app
- **Aiven** (free tier): https://aiven.io
- **db4free.net** (free MySQL): https://www.db4free.net

### Step 2 — Set Up Database
```sql
-- In MySQL Workbench or CLI:
source /path/to/smartstock/schema.sql
```

### Step 3 — Configure Environment
```bash
# Copy and edit environment variables
cp .env.example .env
# Edit .env with your MySQL credentials
```

Create `.env` file:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=smartstock
JWT_SECRET=your_secret_key_here
PORT=3000
```

### Step 4 — Install & Run
```bash
npm install
npm start
# Server starts at http://localhost:3000
```

### Step 5 — Open App
Open your browser: **http://localhost:3000**

---

## 🔑 Demo Login Credentials

| Role | Username | Password |
|------|----------|----------|
| 👑 Owner/Admin | `admin_ishant` | `admin@123` |
| 👔 Manager | `mgr_rajesh` | `mgr@1234` |
| 🏪 Cashier | `cashier_ramu` | `cash@1234` |
| 👤 Customer | `cust_001` | `cust@1234` |

> 3 more accounts exist for each role (see schema.sql seed data)

---

## 🏗 Project Structure

```
smartstock/
├── index.html          # SPA entry point
├── server.js           # Express + MySQL API backend
├── schema.sql          # Full MySQL schema with triggers, procedures, views
├── package.json
├── .env                # Environment config (create from .env.example)
├── css/
│   └── style.css       # Complete design system
└── js/
    ├── app.js          # Core app, routing, auth, helpers
    ├── landing.js      # Public landing + login + register pages
    ├── cashier.js      # Cashier billing POS + orders view
    ├── dashboard.js    # Admin/Manager dashboard, products, analytics, users
    └── customer.js     # Customer portal
```

---

## 🗄 Database Design

### Tables
| Table | Purpose |
|-------|---------|
| `USER` | All roles: admin, manager, cashier, customer |
| `PRODUCT` | SKUs with expiry, price, stock, warning labels |
| `CATEGORY` | Product categories (normalized, 3NF) |
| `ORDERS` | Bill headers with GST, discount, totals |
| `ORDER_ITEMS` | Line items (price snapshot preserved — 2NF compliant) |
| `STOCK_LOG` | Full audit trail for every stock movement |
| `DISCOUNT_RULES` | Configurable discount rules |
| `NOTIFICATION` | Auto-generated alerts for low stock & expiry |

### Views
- `vw_cashier_products` — Non-expired, in-stock products for billing
- `vw_daily_summary` — Today's sales KPIs
- `vw_expiry_alerts` — Items expiring within 30 days
- `vw_product_sales_summary` — Revenue per product
- `vw_highest_ticket_items` — Top items by revenue
- `vw_customer_history` — Full customer purchase history

### Triggers
- `trg_block_expired_product` — BEFORE INSERT on ORDER_ITEMS: blocks expired product sales
- `trg_low_stock_alert` — AFTER UPDATE on PRODUCT: creates notification when stock hits reorder level
- `trg_product_create_log` — Logs initial stock on product creation
- `trg_expiry_warning` — Creates alert for products expiring within 30 days

### Stored Procedures
- `sp_checkout()` — Full atomic checkout: validates, creates order, deducts stock, rollback on error
- `sp_restock_product()` — Restock with audit log
- `sp_register_customer()` — Safe customer registration
- `sp_analytics_report()` — Revenue report by date range

### Functions
- `fn_get_discount()` — Dynamically calculates applicable discount percentage

---

## 👥 User Roles & Access

| Feature | Admin | Manager | Cashier | Customer |
|---------|-------|---------|---------|---------|
| Dashboard & Analytics | ✅ | ✅ | ❌ | ❌ |
| Add/Edit Products | ✅ | ✅ | ❌ | ❌ |
| Restock Inventory | ✅ | ✅ | ❌ | ❌ |
| Billing / POS | ✅ | ✅ | ✅ | ❌ |
| View All Orders | ✅ | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| View Own Purchases | ❌ | ❌ | ❌ | ✅ |
| Alerts/Notifications | ✅ | ✅ | ❌ | ❌ |

---

## 🔒 ACID Compliance

- **Atomicity**: `sp_checkout` uses `START TRANSACTION … COMMIT / ROLLBACK`
- **Consistency**: CHECK constraints prevent negative stock/price; triggers enforce expiry rules
- **Isolation**: Row-level `FOR UPDATE` locks prevent double-selling last item
- **Durability**: MySQL InnoDB engine guarantees durability with WAL

---

## 🌐 Free Hosting Options

### Backend + Frontend
1. **Railway** (recommended): https://railway.app — Free MySQL + Node.js hosting
2. **Render**: https://render.com — Free Node.js + PostgreSQL (change DB driver)
3. **Cyclic.sh**: Free Node.js hosting

### Database Only
1. **PlanetScale**: Free MySQL-compatible, 5GB storage
2. **db4free.net**: Free MySQL, good for dev
3. **Aiven**: Free 1-month trial, then small cost

### Deploy to Railway (Example)
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway add mysql
railway up
```

---

## 📊 Key SQL Queries (Analytical)

```sql
-- Highest Ticket Item
SELECT * FROM vw_highest_ticket_items LIMIT 5;

-- Items expiring within 30 days
SELECT * FROM vw_expiry_alerts;

-- Products not sold in last 30 days (clearance)
SELECT p.name, p.stock_qty FROM PRODUCT p
WHERE p.product_id NOT IN (
  SELECT DISTINCT oi.product_id FROM ORDER_ITEMS oi
  JOIN ORDERS o ON oi.order_id = o.order_id
  WHERE o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
) AND p.stock_qty > 0;

-- Revenue by category
SELECT c.category_name, SUM(oi.line_total) AS revenue
FROM ORDER_ITEMS oi JOIN PRODUCT p ON oi.product_id = p.product_id
JOIN CATEGORY c ON p.category_id = c.category_id
JOIN ORDERS o ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY c.category_name ORDER BY revenue DESC;
```

---

## 📝 Normalization

- **1NF**: All attributes atomic (warning_label stores single value per product)
- **2NF**: `unit_price` in ORDER_ITEMS — no partial dependencies on composite PK
- **3NF**: `category_name` moved to CATEGORY table, removing transitive dependency `product_id → category_id → category_name`

---

*TIET Patiala · CSE Department · UCS310 · Sub Group 2C34 · 2025-26*
