# OpenCode Agent Instructions

## Architecture & Conventions
- **Stack:** Node.js, Express, `mysql2`, Vanilla HTML/CSS/JS (SPA).
- **Structure:** Monolithic. The entire backend API is inside `server.js`. The frontend is a vanilla JS SPA with its entry point at `index.html`.
- **Database-Driven Logic:** Business rules rely heavily on MySQL features (views, triggers). `schema.sql` is the source of truth for the DB schema and contains important business logic.
  - **Crucial Quirk:** Although `README.md` and `schema.sql` document stored procedures like `sp_checkout` and `sp_restock_product`, **`server.js` actually implements this logic manually in Node.js** via transactions (`conn.beginTransaction()`). Any modifications to checkout or restock flows must be made in `server.js`.
  - Triggers (e.g., `trg_block_expired_product`, `trg_low_stock_alert`) enforce constraints and generate notifications automatically at the database level.
- **Auth & Roles:** Available roles are `admin`, `manager`, `cashier`, `customer`. Backend routes are protected using `authMiddleware(['role'])` in `server.js`.
- **API Responses:** Always use the predefined helper functions in `server.js`: `ok(res, data)` for success (`{ success: true, ...data }`) and `err(res, msg, status_code)` for errors.

## Setup & Execution
- **Prerequisites:** A running MySQL server is required. Initialize the database by running `source schema.sql` in your MySQL CLI or client.
- **Environment:** Create a `.env` file containing `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, and `JWT_SECRET`.
- **Run Backend:** `npm run dev` starts the backend with `nodemon` at `http://localhost:3000`.
- **Frontend Development:** No build tools (like Webpack or Vite) are used. Changes to `js/` or `css/` files apply immediately upon browser reload.

## Development Rules
- Keep backend logic centralized in `server.js`. Do not split routes or controllers into separate files unless explicitly instructed by the user.
- **Database Safety:** Always use parameterized queries (e.g., `pool.query('SELECT * FROM ... WHERE id = ?', [id])`) to prevent SQL injection.
- **Transactions:** When executing multiple dependent queries (e.g., creating an order and its line items), use `pool.getConnection()`, `await conn.beginTransaction()`, and ensure you call `conn.commit()` on success or `conn.rollback()` on failure before releasing the connection (`conn.release()`).