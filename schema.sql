-- ============================================================
-- SMART-STOCK: INTEGRATED INVENTORY & BILLING SOLUTION
-- MySQL Backend Schema
-- Authors: Ishant Mehndiratta, Satyam Tiwari, Anshaj
-- TIET Patiala | UCS310 DBMS Project | 2025-26
-- ============================================================

-- Create & select database
CREATE DATABASE IF NOT EXISTS smartstock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartstock;

-- ============================================================
-- TABLE DEFINITIONS (DDL)
-- ============================================================

-- CATEGORY Table
CREATE TABLE IF NOT EXISTS CATEGORY (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description   VARCHAR(255),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USER Table (covers Admin/Owner, Manager, Cashier, Customer)
CREATE TABLE IF NOT EXISTS USER (
    user_id    INT AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,  -- store bcrypt hash in real deployment
    role       ENUM('admin','manager','cashier','customer') NOT NULL,
    full_name  VARCHAR(100) NOT NULL,
    phone_no   VARCHAR(15),
    email      VARCHAR(100),
    is_active  TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_phone CHECK (phone_no REGEXP '^[0-9]{10}$' OR phone_no IS NULL)
);

-- PRODUCT Table
CREATE TABLE IF NOT EXISTS PRODUCT (
    product_id     INT AUTO_INCREMENT PRIMARY KEY,
    barcode        VARCHAR(50) UNIQUE,
    name           VARCHAR(150) NOT NULL,
    description    TEXT,
    price          DECIMAL(10,2) NOT NULL,
    stock_qty      INT NOT NULL DEFAULT 0,
    reorder_level  INT DEFAULT 10,
    expiry_date    DATE,
    warning_label  VARCHAR(255),   -- e.g. "Prescription Required", "Harmful to Kids"
    category_id    INT NOT NULL,
    image_url      VARCHAR(500),
    is_active      TINYINT(1) DEFAULT 1,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id),
    CONSTRAINT chk_price CHECK (price >= 0),
    CONSTRAINT chk_stock CHECK (stock_qty >= 0)
);

-- ORDERS Table
CREATE TABLE IF NOT EXISTS ORDERS (
    order_id      INT AUTO_INCREMENT PRIMARY KEY,
    customer_id   INT NOT NULL,
    cashier_id    INT NOT NULL,
    order_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal      DECIMAL(10,2) DEFAULT 0,
    discount      DECIMAL(10,2) DEFAULT 0,
    tax_rate      DECIMAL(5,2)  DEFAULT 18.00,  -- GST %
    tax_amount    DECIMAL(10,2) DEFAULT 0,
    total_bill    DECIMAL(10,2) DEFAULT 0,
    payment_mode  ENUM('cash','card','upi','other') DEFAULT 'cash',
    status        ENUM('pending','completed','cancelled') DEFAULT 'completed',
    notes         TEXT,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES USER(user_id),
    CONSTRAINT fk_orders_cashier  FOREIGN KEY (cashier_id)  REFERENCES USER(user_id)
);

-- ORDER_ITEMS Table
CREATE TABLE IF NOT EXISTS ORDER_ITEMS (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT NOT NULL,
    product_id    INT NOT NULL,
    qty_sold      INT NOT NULL,
    unit_price    DECIMAL(10,2) NOT NULL,  -- snapshot price at time of sale (2NF)
    discount_pct  DECIMAL(5,2)  DEFAULT 0,
    line_total    DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES ORDERS(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id),
    CONSTRAINT chk_qty CHECK (qty_sold > 0)
);

-- STOCK_LOG Table (audit trail for all inventory movements)
CREATE TABLE IF NOT EXISTS STOCK_LOG (
    log_id       INT AUTO_INCREMENT PRIMARY KEY,
    product_id   INT NOT NULL,
    change_qty   INT NOT NULL,       -- positive = restock, negative = sale
    reason       ENUM('sale','restock','adjustment','expired_removal') NOT NULL,
    reference_id INT,                -- order_id or NULL for manual
    performed_by INT,                -- user_id
    log_time     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes        TEXT,
    CONSTRAINT fk_log_product FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id)
);

-- DISCOUNT_RULES Table
CREATE TABLE IF NOT EXISTS DISCOUNT_RULES (
    rule_id       INT AUTO_INCREMENT PRIMARY KEY,
    rule_name     VARCHAR(100) NOT NULL,
    min_qty       INT    DEFAULT 1,
    min_amount    DECIMAL(10,2) DEFAULT 0,
    discount_pct  DECIMAL(5,2) NOT NULL,
    is_active     TINYINT(1) DEFAULT 1,
    valid_from    DATE,
    valid_to      DATE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICATION Table (for low-stock and expiry alerts)
CREATE TABLE IF NOT EXISTS NOTIFICATION (
    notif_id    INT AUTO_INCREMENT PRIMARY KEY,
    type        ENUM('low_stock','expiry_warning','expired','info') NOT NULL,
    message     TEXT NOT NULL,
    product_id  INT,
    is_read     TINYINT(1) DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_product FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id)
);

-- ============================================================
-- INDEXES for performance (idempotent — ignores duplicates)
-- ============================================================
DROP PROCEDURE IF EXISTS _add_indexes;
DELIMITER //
CREATE PROCEDURE _add_indexes()
BEGIN
    -- handler: silently skip if index already exists (error 1061)
    DECLARE CONTINUE HANDLER FOR 1061 BEGIN END;

    CREATE INDEX idx_product_category  ON PRODUCT(category_id);
    CREATE INDEX idx_product_expiry    ON PRODUCT(expiry_date);
    CREATE INDEX idx_orders_customer   ON ORDERS(customer_id);
    CREATE INDEX idx_orders_cashier    ON ORDERS(cashier_id);
    CREATE INDEX idx_orders_date       ON ORDERS(order_date);
    CREATE INDEX idx_items_order       ON ORDER_ITEMS(order_id);
    CREATE INDEX idx_items_product     ON ORDER_ITEMS(product_id);
    CREATE INDEX idx_stock_log_product ON STOCK_LOG(product_id);
END //
DELIMITER ;
CALL _add_indexes();
DROP PROCEDURE IF EXISTS _add_indexes;


-- ============================================================
-- VIEWS
-- ============================================================

-- Cashier View: Only active, non-expired products with stock > 0
CREATE OR REPLACE VIEW vw_cashier_products AS
SELECT
    p.product_id,
    p.barcode,
    p.name,
    p.price,
    p.stock_qty,
    p.warning_label,
    p.image_url,
    c.category_name,
    DATEDIFF(p.expiry_date, CURDATE()) AS days_to_expiry
FROM PRODUCT p
JOIN CATEGORY c ON p.category_id = c.category_id
WHERE p.is_active = 1
  AND p.stock_qty > 0
  AND (p.expiry_date IS NULL OR p.expiry_date >= CURDATE());

-- Analytics View: Product sales summary
CREATE OR REPLACE VIEW vw_product_sales_summary AS
SELECT
    p.product_id,
    p.name AS product_name,
    c.category_name,
    p.price AS current_price,
    p.stock_qty AS current_stock,
    COALESCE(SUM(oi.qty_sold), 0)   AS total_units_sold,
    COALESCE(SUM(oi.line_total), 0) AS total_revenue,
    COUNT(DISTINCT oi.order_id)     AS order_count
FROM PRODUCT p
JOIN CATEGORY c ON p.category_id = c.category_id
LEFT JOIN ORDER_ITEMS oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.name, c.category_name, p.price, p.stock_qty;

-- Expiry Alert View: Items expiring within 30 days
CREATE OR REPLACE VIEW vw_expiry_alerts AS
SELECT
    p.product_id,
    p.name,
    p.stock_qty,
    p.expiry_date,
    DATEDIFF(p.expiry_date, CURDATE()) AS days_remaining,
    c.category_name
FROM PRODUCT p
JOIN CATEGORY c ON p.category_id = c.category_id
WHERE p.expiry_date IS NOT NULL
  AND p.expiry_date >= CURDATE()
  AND DATEDIFF(p.expiry_date, CURDATE()) <= 30
  AND p.stock_qty > 0
ORDER BY days_remaining ASC;

-- Dashboard View: Today's sales summary
CREATE OR REPLACE VIEW vw_daily_summary AS
SELECT
    COUNT(DISTINCT o.order_id)   AS orders_today,
    COALESCE(SUM(o.total_bill),0)  AS revenue_today,
    COALESCE(SUM(o.tax_amount),0)  AS tax_today,
    COALESCE(SUM(o.discount),0)    AS discount_today,
    COUNT(DISTINCT o.customer_id)  AS unique_customers_today
FROM ORDERS o
WHERE DATE(o.order_date) = CURDATE()
  AND o.status = 'completed';

-- Highest Ticket Items view
CREATE OR REPLACE VIEW vw_highest_ticket_items AS
SELECT
    p.product_id,
    p.name,
    p.price,
    COALESCE(SUM(oi.qty_sold),0)   AS units_sold,
    COALESCE(SUM(oi.line_total),0) AS total_revenue,
    (p.price * COALESCE(SUM(oi.qty_sold),0)) AS ticket_value
FROM PRODUCT p
LEFT JOIN ORDER_ITEMS oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.name, p.price
ORDER BY ticket_value DESC;

-- Customer purchase history view
CREATE OR REPLACE VIEW vw_customer_history AS
SELECT
    o.order_id,
    o.customer_id,
    u.full_name  AS customer_name,
    o.order_date,
    o.subtotal,
    o.discount,
    o.tax_amount,
    o.total_bill,
    o.payment_mode,
    o.status,
    cu.full_name AS cashier_name
FROM ORDERS o
JOIN USER u  ON o.customer_id = u.user_id
JOIN USER cu ON o.cashier_id  = cu.user_id;


-- ============================================================
-- STORED PROCEDURES
-- ============================================================

DROP PROCEDURE IF EXISTS sp_checkout;
DROP PROCEDURE IF EXISTS sp_restock_product;
DROP PROCEDURE IF EXISTS sp_register_customer;
DROP PROCEDURE IF EXISTS sp_analytics_report;
DROP FUNCTION  IF EXISTS fn_get_discount;

DELIMITER $$

-- Procedure: Process a checkout (creates order + items, deducts stock)
CREATE PROCEDURE sp_checkout(
    IN  p_customer_id  INT,
    IN  p_cashier_id   INT,
    IN  p_items        JSON,        -- [{"product_id":1,"qty":2}, ...]
    IN  p_payment_mode VARCHAR(20),
    IN  p_discount     DECIMAL(10,2),
    OUT p_order_id     INT,
    OUT p_status       VARCHAR(100)
)
sp_checkout: BEGIN
    DECLARE v_subtotal   DECIMAL(10,2) DEFAULT 0;
    DECLARE v_tax        DECIMAL(10,2) DEFAULT 0;
    DECLARE v_total      DECIMAL(10,2) DEFAULT 0;
    DECLARE v_item_count INT DEFAULT 0;
    DECLARE v_i          INT DEFAULT 0;
    DECLARE v_product_id INT;
    DECLARE v_qty        INT;
    DECLARE v_price      DECIMAL(10,2);
    DECLARE v_stock      INT;
    DECLARE v_expiry     DATE;
    DECLARE v_line       DECIMAL(10,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status = 'ERROR: Transaction failed, rolled back.';
        SET p_order_id = -1;
    END;

    START TRANSACTION;

    -- Create order shell
    INSERT INTO ORDERS(customer_id, cashier_id, payment_mode, status, discount)
    VALUES(p_customer_id, p_cashier_id, p_payment_mode, 'pending', IFNULL(p_discount,0));

    SET p_order_id  = LAST_INSERT_ID();
    SET v_item_count = JSON_LENGTH(p_items);

    -- Loop through JSON array of items
    WHILE v_i < v_item_count DO
        SET v_product_id = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].product_id')));
        SET v_qty        = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].qty')));

        -- Fetch product details with lock
        SELECT price, stock_qty, expiry_date
        INTO v_price, v_stock, v_expiry
        FROM PRODUCT WHERE product_id = v_product_id FOR UPDATE;

        -- Expiry check
        IF v_expiry IS NOT NULL AND v_expiry < CURDATE() THEN
            ROLLBACK;
            SET p_status  = CONCAT('ERROR: Product ID ', v_product_id, ' is expired. Sale blocked.');
            SET p_order_id = -1;
            LEAVE sp_checkout;
        END IF;

        -- Stock check
        IF v_stock < v_qty THEN
            ROLLBACK;
            SET p_status  = CONCAT('ERROR: Insufficient stock for Product ID ', v_product_id, '. Available: ', v_stock);
            SET p_order_id = -1;
            LEAVE sp_checkout;
        END IF;

        SET v_line = v_price * v_qty;

        INSERT INTO ORDER_ITEMS(order_id, product_id, qty_sold, unit_price, line_total)
        VALUES(p_order_id, v_product_id, v_qty, v_price, v_line);

        -- Deduct stock
        UPDATE PRODUCT SET stock_qty = stock_qty - v_qty WHERE product_id = v_product_id;

        -- Log the stock change
        INSERT INTO STOCK_LOG(product_id, change_qty, reason, reference_id, performed_by)
        VALUES(v_product_id, -v_qty, 'sale', p_order_id, p_cashier_id);

        SET v_subtotal = v_subtotal + v_line;
        SET v_i = v_i + 1;
    END WHILE;

    -- Calculate tax & total
    SET v_tax   = ROUND((v_subtotal - IFNULL(p_discount,0)) * 0.18, 2);
    SET v_total = v_subtotal - IFNULL(p_discount,0) + v_tax;

    -- Update order totals
    UPDATE ORDERS
    SET subtotal   = v_subtotal,
        tax_amount = v_tax,
        total_bill = v_total,
        status     = 'completed'
    WHERE order_id = p_order_id;

    COMMIT;
    SET p_status = 'SUCCESS';
END sp_checkout$$

-- Procedure: Restock a product
CREATE PROCEDURE sp_restock_product(
    IN p_product_id  INT,
    IN p_qty         INT,
    IN p_performed_by INT,
    IN p_notes        TEXT,
    OUT p_status     VARCHAR(100)
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO v_exists FROM PRODUCT WHERE product_id = p_product_id AND is_active = 1;
    IF v_exists = 0 THEN
        SET p_status = 'ERROR: Product not found.';
    ELSEIF p_qty <= 0 THEN
        SET p_status = 'ERROR: Quantity must be positive.';
    ELSE
        UPDATE PRODUCT SET stock_qty = stock_qty + p_qty WHERE product_id = p_product_id;
        INSERT INTO STOCK_LOG(product_id, change_qty, reason, performed_by, notes)
        VALUES(p_product_id, p_qty, 'restock', p_performed_by, p_notes);
        SET p_status = 'SUCCESS';
    END IF;
END$$

-- Procedure: Register a new customer
CREATE PROCEDURE sp_register_customer(
    IN  p_username  VARCHAR(50),
    IN  p_password  VARCHAR(255),
    IN  p_full_name VARCHAR(100),
    IN  p_phone     VARCHAR(15),
    IN  p_email     VARCHAR(100),
    OUT p_user_id   INT,
    OUT p_status    VARCHAR(100)
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO v_exists FROM USER WHERE username = p_username;
    IF v_exists > 0 THEN
        SET p_status = 'ERROR: Username already exists.';
        SET p_user_id = -1;
    ELSE
        INSERT INTO USER(username, password, role, full_name, phone_no, email)
        VALUES(p_username, p_password, 'customer', p_full_name, p_phone, p_email);
        SET p_user_id = LAST_INSERT_ID();
        SET p_status  = 'SUCCESS';
    END IF;
END$$

-- Procedure: Get analytics report
CREATE PROCEDURE sp_analytics_report(
    IN p_from_date DATE,
    IN p_to_date   DATE
)
BEGIN
    -- Revenue by category
    SELECT
        c.category_name,
        SUM(oi.qty_sold)   AS units_sold,
        SUM(oi.line_total) AS revenue
    FROM ORDER_ITEMS oi
    JOIN PRODUCT p  ON oi.product_id  = p.product_id
    JOIN CATEGORY c ON p.category_id  = c.category_id
    JOIN ORDERS o   ON oi.order_id    = o.order_id
    WHERE DATE(o.order_date) BETWEEN p_from_date AND p_to_date
      AND o.status = 'completed'
    GROUP BY c.category_name
    ORDER BY revenue DESC;
END$$

-- Function: Calculate dynamic discount based on rules
CREATE FUNCTION fn_get_discount(
    p_qty    INT,
    p_amount DECIMAL(10,2)
) RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_discount DECIMAL(10,2) DEFAULT 0;
    SELECT COALESCE(MAX(discount_pct), 0)
    INTO v_discount
    FROM DISCOUNT_RULES
    WHERE is_active = 1
      AND p_qty    >= min_qty
      AND p_amount >= min_amount
      AND (valid_from IS NULL OR valid_from <= CURDATE())
      AND (valid_to   IS NULL OR valid_to   >= CURDATE());
    RETURN v_discount;
END$$

DELIMITER ;


-- ============================================================
-- TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS trg_block_expired_product;
DROP TRIGGER IF EXISTS trg_low_stock_alert;
DROP TRIGGER IF EXISTS trg_product_create_log;
DROP TRIGGER IF EXISTS trg_expiry_warning;

DELIMITER $$

-- Trigger: Block sale of expired product (belt-and-suspenders beyond procedure)
CREATE TRIGGER trg_block_expired_product
BEFORE INSERT ON ORDER_ITEMS
FOR EACH ROW
BEGIN
    DECLARE v_expiry DATE;
    DECLARE v_stock  INT;
    SELECT expiry_date, stock_qty INTO v_expiry, v_stock
    FROM PRODUCT WHERE product_id = NEW.product_id;

    IF v_expiry IS NOT NULL AND v_expiry < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'SALE BLOCKED: Product is expired and cannot be sold.';
    END IF;

    IF v_stock < NEW.qty_sold THEN
        SIGNAL SQLSTATE '45001'
        SET MESSAGE_TEXT = 'SALE BLOCKED: Insufficient stock for this product.';
    END IF;
END$$

-- Trigger: After stock update, create notification if below reorder level
CREATE TRIGGER trg_low_stock_alert
AFTER UPDATE ON PRODUCT
FOR EACH ROW
BEGIN
    IF NEW.stock_qty <= NEW.reorder_level AND OLD.stock_qty > OLD.reorder_level THEN
        INSERT INTO NOTIFICATION(type, message, product_id)
        VALUES('low_stock',
               CONCAT('Low stock alert: "', NEW.name, '" has only ', NEW.stock_qty, ' units left. Reorder level: ', NEW.reorder_level),
               NEW.product_id);
    END IF;
END$$

-- Trigger: Log when product is created
CREATE TRIGGER trg_product_create_log
AFTER INSERT ON PRODUCT
FOR EACH ROW
BEGIN
    INSERT INTO STOCK_LOG(product_id, change_qty, reason, notes)
    VALUES(NEW.product_id, NEW.stock_qty, 'restock', 'Initial stock on product creation');
END$$

-- Trigger: Expiry notification (fires when expiry within 30 days at product update)
CREATE TRIGGER trg_expiry_warning
AFTER INSERT ON PRODUCT
FOR EACH ROW
BEGIN
    IF NEW.expiry_date IS NOT NULL AND DATEDIFF(NEW.expiry_date, CURDATE()) <= 30 AND DATEDIFF(NEW.expiry_date, CURDATE()) >= 0 THEN
        INSERT INTO NOTIFICATION(type, message, product_id)
        VALUES('expiry_warning',
               CONCAT('Expiry warning: "', NEW.name, '" expires on ', NEW.expiry_date, ' (', DATEDIFF(NEW.expiry_date, CURDATE()), ' days)'),
               NEW.product_id);
    END IF;
END$$

DELIMITER ;


-- ============================================================
-- SEED DATA: Sample roles (4 per role as requested)
-- Passwords are plain for dev; hash with bcrypt in production
-- ============================================================

-- Categories
INSERT IGNORE INTO CATEGORY (category_name, description) VALUES
('Groceries',   'Daily essential food items and staples'),
('Beverages',   'Cold drinks, juices, water, and hot beverages'),
('Medicines',   'Prescription and OTC pharmaceutical products'),
('Personal Care','Hygiene and beauty products'),
('Snacks',       'Chips, biscuits, and packaged snacks'),
('Dairy',        'Milk, cheese, butter, and related products');

-- Users: Admin/Owner (4)
INSERT IGNORE INTO USER (username, password, role, full_name, phone_no, email) VALUES
('admin_ishant',  'admin@123',   'admin',   'Ishant Mehndiratta',   '9876543210', 'ishant@smartstock.in'),
('admin_satyam',  'admin@123',   'admin',   'Satyam Tiwari',        '9876543211', 'satyam@smartstock.in'),
('admin_anshaj',  'admin@123',   'admin',   'Anshaj Kumar',         '9876543212', 'anshaj@smartstock.in'),
('admin_root',    'root@1234',   'admin',   'Super Admin',          '9876543213', 'root@smartstock.in');

-- Users: Store Manager (4)
INSERT IGNORE INTO USER (username, password, role, full_name, phone_no, email) VALUES
('mgr_rajesh',    'mgr@1234',    'manager', 'Rajesh Sharma',        '9812345670', 'rajesh.mgr@smartstock.in'),
('mgr_priya',     'mgr@1234',    'manager', 'Priya Verma',          '9812345671', 'priya.mgr@smartstock.in'),
('mgr_amit',      'mgr@1234',    'manager', 'Amit Gupta',           '9812345672', 'amit.mgr@smartstock.in'),
('mgr_neha',      'mgr@1234',    'manager', 'Neha Singh',           '9812345673', 'neha.mgr@smartstock.in');

-- Users: Cashier (4)
INSERT IGNORE INTO USER (username, password, role, full_name, phone_no, email) VALUES
('cashier_ramu',  'cash@1234',   'cashier', 'Ramu Prasad',          '9898765430', 'ramu.cash@smartstock.in'),
('cashier_sunita','cash@1234',   'cashier', 'Sunita Devi',          '9898765431', 'sunita.cash@smartstock.in'),
('cashier_vikram','cash@1234',   'cashier', 'Vikram Yadav',         '9898765432', 'vikram.cash@smartstock.in'),
('cashier_pooja', 'cash@1234',   'cashier', 'Pooja Kumari',         '9898765433', 'pooja.cash@smartstock.in');

-- Users: Customer (4)
INSERT IGNORE INTO USER (username, password, role, full_name, phone_no, email) VALUES
('cust_001',      'cust@1234',   'customer','Ramesh Patel',         '9001234567', 'ramesh@gmail.com'),
('cust_002',      'cust@1234',   'customer','Kavita Reddy',         '9001234568', 'kavita@gmail.com'),
('cust_003',      'cust@1234',   'customer','Suresh Nair',          '9001234569', 'suresh@gmail.com'),
('cust_004',      'cust@1234',   'customer','Meena Joshi',          '9001234570', 'meena@gmail.com');

-- Sample Discount Rules
INSERT IGNORE INTO DISCOUNT_RULES (rule_name, min_qty, min_amount, discount_pct) VALUES
('Bulk Buy (10+ items)',  10,    0,    5.00),
('Big Spender (₹500+)',   1,  500,   10.00),
('Mega Spender (₹1000+)', 1, 1000,  15.00);

-- ============================================================
-- USEFUL ANALYTICAL QUERIES (saved as reference)
-- ============================================================

-- Highest Ticket Item (by revenue)
-- SELECT name, total_revenue FROM vw_highest_ticket_items LIMIT 10;

-- Items expiring soon
-- SELECT * FROM vw_expiry_alerts;

-- Daily dashboard
-- SELECT * FROM vw_daily_summary;

-- Items not sold in last 30 days (clearance candidates)
-- SELECT p.product_id, p.name, p.stock_qty, p.price
-- FROM PRODUCT p
-- WHERE p.product_id NOT IN (
--     SELECT DISTINCT oi.product_id FROM ORDER_ITEMS oi
--     JOIN ORDERS o ON oi.order_id = o.order_id
--     WHERE o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
-- ) AND p.stock_qty > 0 AND p.is_active = 1;

-- Revenue by category for current month
-- SELECT c.category_name, SUM(oi.line_total) AS revenue
-- FROM ORDER_ITEMS oi
-- JOIN PRODUCT p ON oi.product_id = p.product_id
-- JOIN CATEGORY c ON p.category_id = c.category_id
-- JOIN ORDERS o ON oi.order_id = o.order_id
-- WHERE MONTH(o.order_date) = MONTH(CURDATE()) AND YEAR(o.order_date) = YEAR(CURDATE())
-- GROUP BY c.category_name ORDER BY revenue DESC;
