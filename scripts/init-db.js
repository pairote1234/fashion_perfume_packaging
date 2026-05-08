const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    const rawValue = trimmed.slice(equalsAt + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(root, ".env"));

const databaseUrl = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL || process.env.MYSQL_URL;

function config() {
  if (databaseUrl) {
    return {
      uri: databaseUrl,
      charset: "utf8mb4",
      decimalNumbers: true,
      dateStrings: true,
      multipleStatements: true,
    };
  }

  return {
    host: process.env.MYSQLHOST,
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    charset: "utf8mb4",
    decimalNumbers: true,
    dateStrings: true,
    multipleStatements: true,
  };
}

function readSql(fileName) {
  const filePath = path.join(root, fileName);
  return fs
    .readFileSync(filePath, "utf8")
    .replace(/CREATE DATABASE IF NOT EXISTS\s+`?stock`?[\s\S]*?;/i, "")
    .replace(/USE\s+`?stock`?\s*;/i, "");
}

async function tableHasRows(connection, tableName) {
  try {
    const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
    return Number(rows[0]?.total || 0) > 0;
  } catch (error) {
    if (error && error.code === "ER_NO_SUCH_TABLE") return false;
    throw error;
  }
}

async function ensureProductImageColumn(connection) {
  const [columns] = await connection.query("SHOW COLUMNS FROM products LIKE 'image_url'");
  if (columns.length) return;

  await connection.query("ALTER TABLE products ADD COLUMN image_url LONGTEXT NULL AFTER reorder_point");
}

async function ensureProductImagesTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      image_url LONGTEXT NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_product_images_product (product_id, is_primary, sort_order)
    ) ENGINE=InnoDB
  `);

  await connection.query(`
    INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
    SELECT p.id, p.image_url, 1, 0
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE p.image_url IS NOT NULL
      AND p.image_url <> ''
      AND pi.id IS NULL
  `);
}

async function columnExists(connection, tableName, columnName) {
  const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
  return columns.length > 0;
}

async function ensureColumn(connection, tableName, columnName, ddl) {
  if (await columnExists(connection, tableName, columnName)) return;
  await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${ddl}`);
}

async function ensureBusinessColumns(connection) {
  await ensureColumn(connection, "products", "shipping_cost", "shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER cost_price");
  await ensureColumn(connection, "products", "tax_cost", "tax_cost DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER shipping_cost");
  await ensureColumn(connection, "products", "other_cost", "other_cost DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER tax_cost");
  await ensureColumn(connection, "inventory_movements", "created_by", "created_by VARCHAR(80) NULL AFTER note");

  await connection.query(`
    ALTER TABLE sales_orders
    MODIFY status ENUM('draft','pending','paid','shipped','cancelled') NOT NULL DEFAULT 'paid'
  `);
  await connection.query("UPDATE sales_orders SET status = 'pending' WHERE status = 'draft'");
  await connection.query(`
    ALTER TABLE sales_orders
    MODIFY status ENUM('pending','paid','shipped','cancelled') NOT NULL DEFAULT 'paid'
  `);
}

async function main() {
  const connection = await mysql.createConnection(config());

  try {
    await connection.query("SET NAMES utf8mb4");
    const schemaSql = readSql("stock_schema.sql");
    const firstSeedAt = schemaSql.search(/\bINSERT\b/i);
    const ddlSql = firstSeedAt === -1 ? schemaSql : schemaSql.slice(0, firstSeedAt);
    const seedSql = firstSeedAt === -1 ? "" : schemaSql.slice(firstSeedAt);

    await connection.query(ddlSql);
    await ensureProductImageColumn(connection);
    await ensureProductImagesTable(connection);
    await ensureBusinessColumns(connection);

    const alreadySeeded = await tableHasRows(connection, "products");
    if (!alreadySeeded && seedSql.trim()) {
      await connection.query(seedSql);
    }

    const fixPath = path.join(root, "stock_fix_thai.sql");
    if (fs.existsSync(fixPath)) {
      await connection.query(readSql("stock_fix_thai.sql"));
    }

    const [tables] = await connection.query("SHOW TABLES");
    console.log(`Database initialized. Tables: ${tables.length}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
