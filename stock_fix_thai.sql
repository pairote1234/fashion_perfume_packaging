SET NAMES utf8mb4;
USE stock;

UPDATE categories SET name = 'เสื้อ / เสื้อยืด', parent_name = 'เสื้อ' WHERE id = 1;
UPDATE categories SET name = 'เสื้อ / เสื้อโปโล', parent_name = 'เสื้อ' WHERE id = 2;
UPDATE categories SET name = 'เสื้อ / เสื้อเชิ้ต', parent_name = 'เสื้อ' WHERE id = 3;
UPDATE categories SET name = 'กางเกง / กางเกงยีนส์', parent_name = 'กางเกง' WHERE id = 4;
UPDATE categories SET name = 'กางเกง / กางเกงขาสั้น', parent_name = 'กางเกง' WHERE id = 5;
UPDATE categories SET name = 'กางเกง / กางเกงขายาว', parent_name = 'กางเกง' WHERE id = 6;
UPDATE categories SET name = 'ขวด / ขวดน้ำหอม', parent_name = 'ขวด' WHERE id = 7;
UPDATE categories SET name = 'ขวด / ขวดใส่ไม้น้ำหอม', parent_name = 'ขวด' WHERE id = 8;
INSERT IGNORE INTO categories (name, parent_name) VALUES ('ขวด / ขวดใส่ไม้น้ำหอม', 'ขวด');

UPDATE products SET name = 'เสื้อยืด Oversize Cotton 240gsm' WHERE sku = 'SHIRT-TS-001';
UPDATE products SET name = 'เสื้อโปโลผ้า Pique สีกรม' WHERE sku = 'SHIRT-POLO-012';
UPDATE products SET name = 'กางเกงยีนส์ Straight Fit' WHERE sku = 'PANTS-JEAN-009';
UPDATE products SET name = 'กางเกงขาสั้นผ้าคอตตอน' WHERE sku = 'PANTS-SHORT-004';
UPDATE products SET name = 'ขวดน้ำหอมแก้ว 30ml ทรงเหลี่ยม' WHERE sku = 'PKG-BTL-030';
UPDATE products SET name = 'ขวดน้ำหอมแก้ว 50ml ทรงกลม' WHERE sku = 'PKG-BTL-050';
UPDATE products SET name = 'ขวดใส่ไม้น้ำหอม 100ml' WHERE sku = 'PKG-DIFF-100';
UPDATE products SET name = 'ขวดใส่ไม้น้ำหอม 150ml ฝาไม้' WHERE sku = 'PKG-DIFF-150';
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'ขวด / ขวดน้ำหอม') WHERE sku IN ('PKG-BTL-030', 'PKG-BTL-050');
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'ขวด / ขวดใส่ไม้น้ำหอม') WHERE sku IN ('PKG-DIFF-100', 'PKG-DIFF-150');

UPDATE inventory_movements SET note = 'Stock เริ่มต้นจาก sample data' WHERE reference_type = 'seed';

UPDATE import_shipments
SET title = 'ขวดน้ำหอม 30ml + ขวดใส่ไม้น้ำหอม',
    destination = 'คลังบางนา, Thailand'
WHERE shipment_no = 'CN-IMP-7712';

UPDATE import_shipments
SET title = 'เสื้อยืดและกางเกงยีนส์ Lot Summer',
    destination = 'คลังพระราม 2, Thailand'
WHERE shipment_no = 'CN-IMP-7713';

UPDATE import_shipments
SET title = 'ขวดใส่ไม้น้ำหอม 150ml ฝาไม้',
    destination = 'คลังบางนา, Thailand'
WHERE shipment_no = 'CN-IMP-7714';

UPDATE import_tracking_stages SET stage_name = 'ยืนยัน Order' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7712') AND stage_index = 0;
UPDATE import_tracking_stages SET stage_name = 'ผลิต/แพ็คสินค้า' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7712') AND stage_index = 1;
UPDATE import_tracking_stages SET stage_name = 'QC โรงงาน' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7712') AND stage_index = 2;
UPDATE import_tracking_stages SET stage_name = 'ถึงโกดังจีน' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7712') AND stage_index = 3;
UPDATE import_tracking_stages SET stage_name = 'ออกจากจีน' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7712') AND stage_index = 4;
UPDATE import_tracking_stages SET stage_name = 'ถึงด่านไทย' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7712') AND stage_index = 5;
UPDATE import_tracking_stages SET stage_name = 'เข้าคลังไทย' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7712') AND stage_index = 6;

UPDATE import_tracking_stages SET stage_name = 'ยืนยัน Order' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7713') AND stage_index = 0;
UPDATE import_tracking_stages SET stage_name = 'รวบรวมสินค้า' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7713') AND stage_index = 1;
UPDATE import_tracking_stages SET stage_name = 'QC/วัดไซซ์' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7713') AND stage_index = 2;
UPDATE import_tracking_stages SET stage_name = 'ถึงโกดังจีน' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7713') AND stage_index = 3;
UPDATE import_tracking_stages SET stage_name = 'ขึ้นเครื่อง' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7713') AND stage_index = 4;
UPDATE import_tracking_stages SET stage_name = 'ถึงด่านไทย' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7713') AND stage_index = 5;
UPDATE import_tracking_stages SET stage_name = 'เข้าคลังไทย' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7713') AND stage_index = 6;

UPDATE import_tracking_stages SET stage_name = 'ยืนยันแบบสินค้า' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7714') AND stage_index = 0;
UPDATE import_tracking_stages SET stage_name = 'ผลิตขวด' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7714') AND stage_index = 1;
UPDATE import_tracking_stages SET stage_name = 'QC ขนาด/ฝา' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7714') AND stage_index = 2;
UPDATE import_tracking_stages SET stage_name = 'ถึงโกดังจีน' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7714') AND stage_index = 3;
UPDATE import_tracking_stages SET stage_name = 'ออกจากจีน' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7714') AND stage_index = 4;
UPDATE import_tracking_stages SET stage_name = 'ถึงด่านไทย' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7714') AND stage_index = 5;
UPDATE import_tracking_stages SET stage_name = 'เข้าคลังไทย' WHERE shipment_id = (SELECT id FROM import_shipments WHERE shipment_no = 'CN-IMP-7714') AND stage_index = 6;
