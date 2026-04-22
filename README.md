# ◉ SMART-STOCK: Integrated Inventory & Billing Solution

> TIET Patiala · UCS310 Database Management Systems · Sub Group 2C34 · AY 2025-26

**Team:** Ishant Mehndiratta (1024030525) · Satyam Tiwari (1024030088) · Anshaj (1024030494)  
**Guide:** Dr. Shashank Singh

---

## 🚀 Comprehensive Setup Guide

### Prerequisites
- **Node.js** v18+ → https://nodejs.org
- **MySQL Server** (Local or Cloud)

### Step 1 — Get MySQL (Local or Cloud)

**Option A: Local Development (Recommended)**
1. Download & Install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) or use [XAMPP](https://www.apachefriends.org).
2. Start the MySQL Server service.
3. Keep your `root` password handy.

**Option B: Free Cloud Hosting (No installation required)**
- **PlanetScale** / **Railway** / **Aiven** / **db4free.net**
- Create a database and get your host, user, password, and port.

### Step 2 — Initialize the Database
1. Open your MySQL client (MySQL Workbench, DBeaver, or CLI).
2. Connect to your MySQL server using your root credentials.
3. Execute the provided schema file to create the database, tables, views, procedures, and insert seed data:

**Using Bash / macOS / Linux:**
```bash
mysql -u root -p < /path/to/smartstock/schema.sql
```

**Using CMD (Windows):**
```cmd
mysql -u root -p < schema.sql
```

**Using PowerShell (Windows):**
```powershell
Get-Content .\schema.sql | mysql -u root -p
```
*Alternatively, in MySQL Workbench: File -> Run SQL Script... -> select `schema.sql`.*

### Step 3 — Configure Environment Variables
1. Copy the example environment file:

**Using Bash / macOS / Linux:**
```bash
cp .env.example .env
```

**Using CMD / PowerShell (Windows):**
```cmd
copy .env.example .env
```
2. Edit `.env` with your correct database credentials (leave DB_PASS and JWT_SECRET empty if not using them):
```env
DB_HOST=localhost       # Or your cloud DB host
DB_USER=root            # Your MySQL username
DB_PASS=                # Your MySQL password (leave blank if none)
DB_NAME=smartstock
JWT_SECRET=             # Your JWT Secret (leave blank if none)
PORT=3000
```

### Step 4 — Install Dependencies & Run
```bash
# Install required Node.js packages (Express, MySQL2, etc.)
npm install

# Start the application in development mode
npm run dev
# OR use: npm start
```

### Step 5 — Access the Application
Open your web browser and navigate to: **http://localhost:3000**

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

## 🗄 Database Management System (DBMS) Concepts Implemented

The database architecture of Smart-Stock has been meticulously designed following fundamental DBMS principles to ensure data integrity, optimal performance, and robustness.

### 1. Normalization (Achieved up to 3rd Normal Form - 3NF)
The schema has been normalized to eliminate data redundancy and prevent insertion, update, and deletion anomalies.
- **First Normal Form (1NF):** Every table has a primary key (`product_id`, `user_id`, etc.). All attributes contain atomic, indivisible values. E.g., the `warning_label` in `PRODUCT` stores a single distinct value, and there are no repeating groups.
- **Second Normal Form (2NF):** The schema meets 1NF, and all non-key attributes are fully functionally dependent on the entire primary key. In `ORDER_ITEMS`, the `unit_price` is stored as a snapshot to capture the product's price at the exact moment of sale. This preserves historical integrity without violating normalization.
- **Third Normal Form (3NF):** The schema meets 2NF, and all transitive dependencies have been removed. For example, instead of storing `category_name` directly in the `PRODUCT` table (which introduces `product_id → category_id → category_name`), we abstracted it into a separate `CATEGORY` table linked via the `category_id` foreign key.

### 2. ACID Properties & Transactions
The system strictly enforces ACID properties, particularly during critical operations like billing.
- **Atomicity:** Operations that modify multiple tables (like checkout) are enclosed within `START TRANSACTION` and `COMMIT` blocks (see `sp_checkout`). If a product is out of stock mid-transaction, a `ROLLBACK` is issued.
- **Consistency:** Constraints (`CHECK (price >= 0)`, `CHECK (stock_qty >= 0)`) enforce domain integrity. Triggers ensure business rules are maintained automatically (e.g., preventing the sale of expired products).
- **Isolation:** Transactional concurrency is managed using row-level locking. The `SELECT ... FOR UPDATE` clause in `sp_checkout` prevents race conditions, ensuring two cashiers cannot double-sell the last unit.
- **Durability:** Changes are persisted permanently using the MySQL InnoDB storage engine's write-ahead logging (WAL).

### 3. Constraints and Data Integrity
- **Entity Integrity:** Implemented using `PRIMARY KEY` with `AUTO_INCREMENT`.
- **Referential Integrity:** Implemented using `FOREIGN KEY` constraints (e.g., linking `ORDERS` to `USER`). `ON DELETE CASCADE` is applied where appropriate (e.g., `ORDER_ITEMS`).
- **Domain/Semantic Integrity:** Enforced using `CHECK` constraints (e.g., `phone_no REGEXP '^[0-9]{10}$'`, `qty_sold > 0`) and `ENUM` types.

### 4. Advanced Database Objects

#### Stored Procedures & Functions
- `sp_checkout()`: Handles the entire complex checkout flow (inventory deduction, cart iteration, discount calculation) atomically.
- `sp_restock_product()`: Safely updates stock levels while automatically generating a detailed audit log entry.
- `sp_register_customer()`: Registers a user with the 'customer' role.
- `sp_analytics_report()`: Generates revenue reports by date range.
- `fn_get_discount()`: Encapsulates the logic for determining the highest applicable discount dynamically.

#### Triggers (Active Database Rules)
- `trg_block_expired_product`: A `BEFORE INSERT` trigger preventing the sale of expired products.
- `trg_low_stock_alert`: An `AFTER UPDATE` trigger that generates a system notification if stock dips below the `reorder_level`.
- `trg_product_create_log`: Logs initial stock upon product creation.
- `trg_expiry_warning`: Flags products nearing expiration.

#### Views (Virtual Tables)
- `vw_cashier_products`: Filters out inactive or expired products for a clean cashier UI.
- `vw_product_sales_summary` & `vw_daily_summary`: Aggregates data for real-time dashboards.
- `vw_highest_ticket_items`: Computes top revenue-generating items.
- `vw_expiry_alerts`: Lists items expiring within 30 days.

### 5. Indexing and Performance Tuning
Secondary indexes were purposefully created to optimize query execution:
- `idx_product_category` on `PRODUCT(category_id)`
- `idx_orders_date` on `ORDERS(order_date)`
- `idx_items_order` on `ORDER_ITEMS(order_id)`

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

*TIET Patiala · CSE Department · UCS310 · Sub Group 2C34 · 2025-26*
