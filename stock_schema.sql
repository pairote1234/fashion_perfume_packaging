CREATE DATABASE IF NOT EXISTS stock
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stock;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  parent_name VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  country VARCHAR(80) NOT NULL DEFAULT 'China',
  city VARCHAR(100) NULL,
  contact_name VARCHAR(120) NULL,
  phone VARCHAR(60) NULL,
  email VARCHAR(160) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(220) NOT NULL,
  category_id INT NOT NULL,
  supplier_id INT NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  reorder_point INT NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT chk_products_prices CHECK (selling_price >= 0 AND cost_price >= 0),
  CONSTRAINT chk_products_stock CHECK (stock_quantity >= 0 AND reorder_point >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  movement_type ENUM('opening','purchase_in','sale_out','adjust_in','adjust_out','set_balance','delete_adjustment') NOT NULL,
  quantity INT NOT NULL,
  balance_after INT NOT NULL,
  reference_type VARCHAR(40) NULL,
  reference_id BIGINT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT chk_inventory_quantity CHECK (quantity >= 0),
  CONSTRAINT chk_inventory_balance CHECK (balance_after >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  customer_type ENUM('retail','b2b','online','walk_in') NOT NULL DEFAULT 'retail',
  phone VARCHAR(60) NULL,
  email VARCHAR(160) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT NULL,
  order_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('draft','paid','cancelled') NOT NULL DEFAULT 'paid',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales_order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sales_order_id BIGINT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) AS (quantity * unit_price) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_items_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT chk_sales_items_quantity CHECK (quantity > 0),
  CONSTRAINT chk_sales_items_prices CHECK (unit_price >= 0 AND unit_cost >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS import_shipments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  shipment_no VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(220) NOT NULL,
  origin_city VARCHAR(120) NOT NULL,
  origin_country VARCHAR(80) NOT NULL DEFAULT 'China',
  destination VARCHAR(180) NOT NULL,
  transport_mode VARCHAR(80) NOT NULL,
  eta_date DATE NOT NULL,
  total_units INT NOT NULL DEFAULT 0,
  current_stage_index INT NOT NULL DEFAULT 0,
  status ENUM('preparing','in_transit','customs','arrived','closed','cancelled') NOT NULL DEFAULT 'in_transit',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_shipments_units CHECK (total_units >= 0),
  CONSTRAINT chk_shipments_stage CHECK (current_stage_index >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS import_shipment_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  shipment_id BIGINT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shipment_items_shipment FOREIGN KEY (shipment_id) REFERENCES import_shipments(id) ON DELETE CASCADE,
  CONSTRAINT fk_shipment_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT chk_shipment_items_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS import_tracking_stages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  shipment_id BIGINT NOT NULL,
  stage_index INT NOT NULL,
  stage_name VARCHAR(140) NOT NULL,
  planned_date DATE NOT NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tracking_shipment FOREIGN KEY (shipment_id) REFERENCES import_shipments(id) ON DELETE CASCADE,
  CONSTRAINT uq_tracking_stage UNIQUE (shipment_id, stage_index)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW v_product_stock_summary AS
SELECT
  p.id,
  p.sku,
  p.name,
  c.name AS category,
  s.name AS supplier,
  p.selling_price,
  p.cost_price,
  p.stock_quantity,
  p.reorder_point,
  COALESCE(SUM(soi.quantity), 0) AS sold_quantity,
  CASE
    WHEN p.stock_quantity = 0 THEN 'หมด'
    WHEN p.stock_quantity <= p.reorder_point THEN 'ควรเติม'
    ELSE 'พร้อมขาย'
  END AS stock_status
FROM products p
JOIN categories c ON c.id = p.category_id
JOIN suppliers s ON s.id = p.supplier_id
LEFT JOIN sales_order_items soi ON soi.product_id = p.id
GROUP BY p.id, p.sku, p.name, c.name, s.name, p.selling_price, p.cost_price, p.stock_quantity, p.reorder_point;

INSERT IGNORE INTO categories (name, parent_name) VALUES
  ('เสื้อ / เสื้อยืด', 'เสื้อ'),
  ('เสื้อ / เสื้อโปโล', 'เสื้อ'),
  ('เสื้อ / เสื้อเชิ้ต', 'เสื้อ'),
  ('กางเกง / กางเกงยีนส์', 'กางเกง'),
  ('กางเกง / กางเกงขาสั้น', 'กางเกง'),
  ('กางเกง / กางเกงขายาว', 'กางเกง'),
  ('ขวด / ขวดน้ำหอม', 'ขวด'),
  ('ขวด / ขวดใส่ไม้น้ำหอม', 'ขวด');

INSERT IGNORE INTO suppliers (name, country, city) VALUES
  ('Guangzhou Apparel Co.', 'China', 'Guangzhou'),
  ('Hangzhou Textile', 'China', 'Hangzhou'),
  ('Shenzhen Garment', 'China', 'Shenzhen'),
  ('Yiwu Fashion Market', 'China', 'Yiwu'),
  ('Xuzhou Glass Bottle', 'China', 'Xuzhou'),
  ('Ningbo Glass Packaging', 'China', 'Ningbo'),
  ('Dongguan Aroma Bottle', 'China', 'Dongguan');

INSERT IGNORE INTO customers (name, customer_type) VALUES
  ('Maison Sample Lab', 'b2b'),
  ('Online B2B', 'b2b'),
  ('Live sale', 'online'),
  ('Online', 'online'),
  ('Aroma Studio', 'b2b'),
  ('Retail', 'retail');

INSERT IGNORE INTO products
  (sku, name, category_id, supplier_id, selling_price, cost_price, stock_quantity, reorder_point)
SELECT 'SHIRT-TS-001', 'เสื้อยืด Oversize Cotton 240gsm', c.id, s.id, 390, 168, 84, 30
FROM categories c JOIN suppliers s ON s.name = 'Guangzhou Apparel Co.'
WHERE c.name = 'เสื้อ / เสื้อยืด';

INSERT IGNORE INTO products
  (sku, name, category_id, supplier_id, selling_price, cost_price, stock_quantity, reorder_point)
SELECT 'SHIRT-POLO-012', 'เสื้อโปโลผ้า Pique สีกรม', c.id, s.id, 490, 210, 18, 24
FROM categories c JOIN suppliers s ON s.name = 'Hangzhou Textile'
WHERE c.name = 'เสื้อ / เสื้อโปโล';

INSERT IGNORE INTO products
  (sku, name, category_id, supplier_id, selling_price, cost_price, stock_quantity, reorder_point)
SELECT 'PANTS-JEAN-009', 'กางเกงยีนส์ Straight Fit', c.id, s.id, 890, 390, 31, 20
FROM categories c JOIN suppliers s ON s.name = 'Shenzhen Garment'
WHERE c.name = 'กางเกง / กางเกงยีนส์';

INSERT IGNORE INTO products
  (sku, name, category_id, supplier_id, selling_price, cost_price, stock_quantity, reorder_point)
SELECT 'PANTS-SHORT-004', 'กางเกงขาสั้นผ้าคอตตอน', c.id, s.id, 420, 170, 9, 18
FROM categories c JOIN suppliers s ON s.name = 'Yiwu Fashion Market'
WHERE c.name = 'กางเกง / กางเกงขาสั้น';

INSERT IGNORE INTO products
  (sku, name, category_id, supplier_id, selling_price, cost_price, stock_quantity, reorder_point)
SELECT 'PKG-BTL-030', 'ขวดน้ำหอมแก้ว 30ml ทรงเหลี่ยม', c.id, s.id, 38, 16, 420, 250
FROM categories c JOIN suppliers s ON s.name = 'Xuzhou Glass Bottle'
WHERE c.name = 'ขวด / ขวดน้ำหอม';

INSERT IGNORE INTO products
  (sku, name, category_id, supplier_id, selling_price, cost_price, stock_quantity, reorder_point)
SELECT 'PKG-BTL-050', 'ขวดน้ำหอมแก้ว 50ml ทรงกลม', c.id, s.id, 45, 19, 160, 220
FROM categories c JOIN suppliers s ON s.name = 'Xuzhou Glass Bottle'
WHERE c.name = 'ขวด / ขวดน้ำหอม';

INSERT IGNORE INTO products
  (sku, name, category_id, supplier_id, selling_price, cost_price, stock_quantity, reorder_point)
SELECT 'PKG-DIFF-100', 'ขวดใส่ไม้น้ำหอม 100ml', c.id, s.id, 52, 23, 680, 300
FROM categories c JOIN suppliers s ON s.name = 'Ningbo Glass Packaging'
WHERE c.name = 'ขวด / ขวดใส่ไม้น้ำหอม';

INSERT IGNORE INTO products
  (sku, name, category_id, supplier_id, selling_price, cost_price, stock_quantity, reorder_point)
SELECT 'PKG-DIFF-150', 'ขวดใส่ไม้น้ำหอม 150ml ฝาไม้', c.id, s.id, 68, 31, 190, 260
FROM categories c JOIN suppliers s ON s.name = 'Dongguan Aroma Bottle'
WHERE c.name = 'ขวด / ขวดใส่ไม้น้ำหอม';

INSERT IGNORE INTO inventory_movements
  (product_id, movement_type, quantity, balance_after, reference_type, note)
SELECT id, 'opening', stock_quantity, stock_quantity, 'seed', 'Initial sample stock'
FROM products;

INSERT IGNORE INTO sales_orders (order_no, customer_id, order_date, total_amount)
SELECT 'SO-2048', c.id, '2026-04-29', 160 * 52 FROM customers c WHERE c.name = 'Maison Sample Lab';
INSERT IGNORE INTO sales_orders (order_no, customer_id, order_date, total_amount)
SELECT 'SO-2047', c.id, '2026-04-29', 120 * 38 FROM customers c WHERE c.name = 'Online B2B';
INSERT IGNORE INTO sales_orders (order_no, customer_id, order_date, total_amount)
SELECT 'SO-2046', c.id, '2026-04-28', 8 * 390 FROM customers c WHERE c.name = 'Live sale';
INSERT IGNORE INTO sales_orders (order_no, customer_id, order_date, total_amount)
SELECT 'SO-2045', c.id, '2026-04-28', 5 * 890 FROM customers c WHERE c.name = 'Online';
INSERT IGNORE INTO sales_orders (order_no, customer_id, order_date, total_amount)
SELECT 'SO-2044', c.id, '2026-04-27', 90 * 68 FROM customers c WHERE c.name = 'Aroma Studio';
INSERT IGNORE INTO sales_orders (order_no, customer_id, order_date, total_amount)
SELECT 'SO-2043', c.id, '2026-04-27', 3 * 490 FROM customers c WHERE c.name = 'Retail';

INSERT IGNORE INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, unit_cost)
SELECT so.id, p.id, 160, p.selling_price, p.cost_price FROM sales_orders so JOIN products p ON p.sku = 'PKG-DIFF-100' WHERE so.order_no = 'SO-2048';
INSERT IGNORE INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, unit_cost)
SELECT so.id, p.id, 120, p.selling_price, p.cost_price FROM sales_orders so JOIN products p ON p.sku = 'PKG-BTL-030' WHERE so.order_no = 'SO-2047';
INSERT IGNORE INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, unit_cost)
SELECT so.id, p.id, 8, p.selling_price, p.cost_price FROM sales_orders so JOIN products p ON p.sku = 'SHIRT-TS-001' WHERE so.order_no = 'SO-2046';
INSERT IGNORE INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, unit_cost)
SELECT so.id, p.id, 5, p.selling_price, p.cost_price FROM sales_orders so JOIN products p ON p.sku = 'PANTS-JEAN-009' WHERE so.order_no = 'SO-2045';
INSERT IGNORE INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, unit_cost)
SELECT so.id, p.id, 90, p.selling_price, p.cost_price FROM sales_orders so JOIN products p ON p.sku = 'PKG-DIFF-150' WHERE so.order_no = 'SO-2044';
INSERT IGNORE INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, unit_cost)
SELECT so.id, p.id, 3, p.selling_price, p.cost_price FROM sales_orders so JOIN products p ON p.sku = 'SHIRT-POLO-012' WHERE so.order_no = 'SO-2043';

INSERT IGNORE INTO import_shipments
  (shipment_no, title, origin_city, destination, transport_mode, eta_date, total_units, current_stage_index, status)
VALUES
  ('CN-IMP-7712', 'ขวดน้ำหอม 30ml + ขวดใส่ไม้น้ำหอม', 'Xuzhou', 'คลังบางนา, Thailand', 'Sea + Truck', '2026-05-08', 3600, 4, 'in_transit'),
  ('CN-IMP-7713', 'เสื้อยืดและกางเกงยีนส์ Lot Summer', 'Guangzhou', 'คลังพระราม 2, Thailand', 'Air cargo', '2026-05-03', 520, 5, 'customs'),
  ('CN-IMP-7714', 'ขวดใส่ไม้น้ำหอม 150ml ฝาไม้', 'Dongguan', 'คลังบางนา, Thailand', 'Sea freight', '2026-05-14', 5000, 2, 'preparing');

INSERT IGNORE INTO import_shipment_items (shipment_id, product_id, quantity)
SELECT sh.id, p.id, 1800 FROM import_shipments sh JOIN products p ON p.sku = 'PKG-BTL-030' WHERE sh.shipment_no = 'CN-IMP-7712';
INSERT IGNORE INTO import_shipment_items (shipment_id, product_id, quantity)
SELECT sh.id, p.id, 1800 FROM import_shipments sh JOIN products p ON p.sku = 'PKG-DIFF-100' WHERE sh.shipment_no = 'CN-IMP-7712';
INSERT IGNORE INTO import_shipment_items (shipment_id, product_id, quantity)
SELECT sh.id, p.id, 300 FROM import_shipments sh JOIN products p ON p.sku = 'SHIRT-TS-001' WHERE sh.shipment_no = 'CN-IMP-7713';
INSERT IGNORE INTO import_shipment_items (shipment_id, product_id, quantity)
SELECT sh.id, p.id, 220 FROM import_shipments sh JOIN products p ON p.sku = 'PANTS-JEAN-009' WHERE sh.shipment_no = 'CN-IMP-7713';
INSERT IGNORE INTO import_shipment_items (shipment_id, product_id, quantity)
SELECT sh.id, p.id, 5000 FROM import_shipments sh JOIN products p ON p.sku = 'PKG-DIFF-150' WHERE sh.shipment_no = 'CN-IMP-7714';

INSERT IGNORE INTO import_tracking_stages (shipment_id, stage_index, stage_name, planned_date)
SELECT sh.id, stage_index, stage_name, planned_date
FROM import_shipments sh
JOIN (
  SELECT 'CN-IMP-7712' shipment_no, 0 stage_index, 'ยืนยัน Order' stage_name, '2026-04-18' planned_date UNION ALL
  SELECT 'CN-IMP-7712', 1, 'ผลิต/แพ็คสินค้า', '2026-04-21' UNION ALL
  SELECT 'CN-IMP-7712', 2, 'QC โรงงาน', '2026-04-23' UNION ALL
  SELECT 'CN-IMP-7712', 3, 'ถึงโกดังจีน', '2026-04-25' UNION ALL
  SELECT 'CN-IMP-7712', 4, 'ออกจากจีน', '2026-04-27' UNION ALL
  SELECT 'CN-IMP-7712', 5, 'ถึงด่านไทย', '2026-05-05' UNION ALL
  SELECT 'CN-IMP-7712', 6, 'เข้าคลังไทย', '2026-05-08' UNION ALL
  SELECT 'CN-IMP-7713', 0, 'ยืนยัน Order', '2026-04-22' UNION ALL
  SELECT 'CN-IMP-7713', 1, 'รวบรวมสินค้า', '2026-04-23' UNION ALL
  SELECT 'CN-IMP-7713', 2, 'QC/วัดไซซ์', '2026-04-25' UNION ALL
  SELECT 'CN-IMP-7713', 3, 'ถึงโกดังจีน', '2026-04-26' UNION ALL
  SELECT 'CN-IMP-7713', 4, 'ขึ้นเครื่อง', '2026-04-28' UNION ALL
  SELECT 'CN-IMP-7713', 5, 'ถึงด่านไทย', '2026-04-30' UNION ALL
  SELECT 'CN-IMP-7713', 6, 'เข้าคลังไทย', '2026-05-03' UNION ALL
  SELECT 'CN-IMP-7714', 0, 'ยืนยันแบบสินค้า', '2026-04-24' UNION ALL
  SELECT 'CN-IMP-7714', 1, 'ผลิตขวด', '2026-04-28' UNION ALL
  SELECT 'CN-IMP-7714', 2, 'QC ขนาด/ฝา', '2026-05-01' UNION ALL
  SELECT 'CN-IMP-7714', 3, 'ถึงโกดังจีน', '2026-05-03' UNION ALL
  SELECT 'CN-IMP-7714', 4, 'ออกจากจีน', '2026-05-05' UNION ALL
  SELECT 'CN-IMP-7714', 5, 'ถึงด่านไทย', '2026-05-12' UNION ALL
  SELECT 'CN-IMP-7714', 6, 'เข้าคลังไทย', '2026-05-14'
) stages ON stages.shipment_no = sh.shipment_no;

INSERT INTO app_settings (setting_key, setting_value)
VALUES ('currency', 'THB'), ('timezone', 'Asia/Bangkok')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
