const express = require("express");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

loadEnvFile(path.join(__dirname, ".env"));

const app = express();
const port = Number(process.env.PORT || 3000);
const root = __dirname;
const loginUser = process.env.APP_USERNAME || "kapi";
const loginPassword = process.env.APP_PASSWORD || "?kapi@2026";
const authSecret = process.env.AUTH_SECRET || "supplypilot-local-auth-secret";
const authCookieName = "supplypilot_auth";
const allowedSaleStatuses = new Set(["pending", "paid", "shipped", "cancelled"]);

app.use(express.json({ limit: "18mb" }));

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const equalsAt = cookie.indexOf("=");
        if (equalsAt === -1) return [cookie, ""];
        return [cookie.slice(0, equalsAt), decodeURIComponent(cookie.slice(equalsAt + 1))];
      })
  );
}

function signAuthToken(username, expiresAt) {
  return crypto.createHmac("sha256", authSecret).update(`${username}:${expiresAt}`).digest("hex");
}

function createAuthToken(username) {
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  const signature = signAuthToken(username, expiresAt);
  return `${username}:${expiresAt}:${signature}`;
}

function isValidAuthToken(token) {
  if (!token) return false;
  const [username, expiresAtText, signature] = token.split(":");
  const expiresAt = Number(expiresAtText);

  if (username !== loginUser || !expiresAt || Date.now() > expiresAt || !signature) return false;

  const expected = signAuthToken(username, expiresAt);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function setAuthCookie(response, token) {
  response.cookie(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(response) {
  response.clearCookie(authCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function requireAuth(request, response, next) {
  const token = parseCookies(request.headers.cookie)[authCookieName];
  if (isValidAuthToken(token)) {
    request.authUser = token.split(":")[0];
    next();
    return;
  }

  if (request.path.startsWith("/api/")) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  response.redirect("/login");
}

app.get("/login", (request, response) => {
  const token = parseCookies(request.headers.cookie)[authCookieName];
  if (isValidAuthToken(token)) {
    response.redirect("/");
    return;
  }

  response.sendFile(path.join(root, "login.html"));
});

app.post("/api/login", (request, response) => {
  const { username, password } = request.body || {};

  if (username === loginUser && password === loginPassword) {
    setAuthCookie(response, createAuthToken(username));
    response.json({ ok: true });
    return;
  }

  response.status(401).json({ error: "Invalid username or password" });
});

app.post("/api/logout", (_request, response) => {
  clearAuthCookie(response);
  response.json({ ok: true });
});

app.use(requireAuth);

app.get("/api/session", (request, response) => {
  const token = parseCookies(request.headers.cookie)[authCookieName];
  const [username] = token.split(":");
  response.json({ username });
});

app.use(express.static(root));

const databaseUrl = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL || process.env.MYSQL_URL;

function mysqlConfig() {
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
    host: process.env.MYSQLHOST || "localhost",
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "",
    database: process.env.MYSQLDATABASE || "stock",
    charset: "utf8mb4",
    decimalNumbers: true,
    dateStrings: true,
    multipleStatements: true,
  };
}

const pool = mysql.createPool({
  ...mysqlConfig(),
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 5),
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function toDateText(value) {
  if (!value) return value;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function monthRange(monthText) {
  if (!/^\d{4}-\d{2}$/.test(monthText || "")) return null;
  const start = `${monthText}-01`;
  const [year, month] = monthText.split("-").map(Number);
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end: next };
}

function reportPeriod(request) {
  const mode = request.query.period === "month" ? "month" : "all";
  const range = mode === "month" ? monthRange(request.query.month) : null;
  return {
    mode: range ? "month" : "all",
    month: range ? request.query.month : "",
    range,
  };
}

function salesDateClause(period, alias = "so") {
  if (!period.range) return { sql: "", params: [] };
  return {
    sql: ` AND ${alias}.order_date >= ? AND ${alias}.order_date < ?`,
    params: [period.range.start, period.range.end],
  };
}

function movementDateClause(period, alias = "im") {
  if (!period.range) return { sql: "", params: [] };
  return {
    sql: ` WHERE ${alias}.created_at >= ? AND ${alias}.created_at < ?`,
    params: [period.range.start, period.range.end],
  };
}

async function getProducts(period = { mode: "all" }) {
  const salesClause = salesDateClause(period);
  const useSnapshot = Boolean(period.range);
  const stockSelect = useSnapshot ? "COALESCE(stock_snapshot.balance_after, p.stock_quantity)" : "p.stock_quantity";
  const stockJoin = useSnapshot
    ? `
    LEFT JOIN (
      SELECT im.product_id, im.balance_after
      FROM inventory_movements im
      JOIN (
        SELECT product_id, MAX(id) AS movement_id
        FROM inventory_movements
        WHERE created_at < ?
        GROUP BY product_id
      ) latest ON latest.movement_id = im.id
    ) stock_snapshot ON stock_snapshot.product_id = p.id`
    : "";
  const stockParams = useSnapshot ? [period.range.end] : [];

  const rows = await query(`
    SELECT
      p.id,
      p.sku,
      p.name,
      c.name AS category,
      s.name AS supplier,
      p.selling_price AS price,
      p.cost_price AS cost,
      p.shipping_cost AS shippingCost,
      p.tax_cost AS taxCost,
      p.other_cost AS otherCost,
      ${stockSelect} AS stock,
      p.reorder_point AS reorderPoint,
      p.image_url AS imageUrl,
      COALESCE(sold_items.sold, 0) AS sold
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN (
      SELECT soi.product_id, SUM(soi.quantity) AS sold
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.sales_order_id
      WHERE so.status <> 'cancelled'
      ${salesClause.sql}
      GROUP BY soi.product_id
    ) sold_items ON sold_items.product_id = p.id
    ${stockJoin}
    WHERE p.status = 'active'
    GROUP BY p.id, p.sku, p.name, c.name, s.name, p.selling_price, p.cost_price, p.shipping_cost, p.tax_cost, p.other_cost, p.stock_quantity, p.reorder_point, p.image_url, sold_items.sold${useSnapshot ? ", stock_snapshot.balance_after" : ""}
    ORDER BY p.id
  `, [...salesClause.params, ...stockParams]);

  const productRows = rows.map((row) => ({
    ...row,
    id: Number(row.id),
    cost: Number(row.cost),
    shippingCost: Number(row.shippingCost || 0),
    taxCost: Number(row.taxCost || 0),
    otherCost: Number(row.otherCost || 0),
    landedCost: Number(row.cost || 0) + Number(row.shippingCost || 0) + Number(row.taxCost || 0) + Number(row.otherCost || 0),
    stock: Number(row.stock),
    reorderPoint: Number(row.reorderPoint),
    sold: Number(row.sold),
  }));

  if (!productRows.length) return productRows;

  const imageRows = await query(
    `
      SELECT id, product_id, image_url, is_primary, sort_order
      FROM product_images
      WHERE product_id IN (${productRows.map(() => "?").join(",")})
      ORDER BY is_primary DESC, sort_order ASC, id ASC
    `,
    productRows.map((product) => product.id)
  );
  const imagesByProductId = new Map();

  for (const image of imageRows) {
    const productImages = imagesByProductId.get(image.product_id) || [];
    productImages.push({
      id: Number(image.id),
      url: image.image_url,
      isPrimary: Boolean(image.is_primary),
    });
    imagesByProductId.set(image.product_id, productImages);
  }

  return productRows.map((product) => {
    const images = imagesByProductId.get(product.id) || [];
    return {
      ...product,
      images,
      imageUrl: images[0]?.url || product.imageUrl || null,
    };
  });
}

async function getSales(period = { mode: "all" }) {
  const salesClause = salesDateClause(period);
  const rows = await query(`
    SELECT
      so.id AS order_id,
      so.order_no AS \`order\`,
      soi.id AS item_id,
      p.sku,
      soi.quantity AS qty,
      COALESCE(c.name, 'Walk-in') AS customer,
      c.phone AS customer_phone,
      so.order_date AS date,
      so.total_amount AS total,
      so.status,
      soi.unit_price,
      soi.unit_cost
    FROM sales_orders so
    JOIN sales_order_items soi ON soi.sales_order_id = so.id
    JOIN products p ON p.id = soi.product_id
    LEFT JOIN customers c ON c.id = so.customer_id
    WHERE so.status <> 'cancelled'
    ${salesClause.sql}
    ORDER BY so.order_date DESC, so.id DESC
    LIMIT 50
  `, salesClause.params);

  return rows.map((row) => ({
    ...row,
    orderId: Number(row.order_id),
    itemId: Number(row.item_id),
    qty: Number(row.qty),
    status: row.status,
    unitPrice: Number(row.unit_price || 0),
    unitCost: Number(row.unit_cost || 0),
    cost: Number(row.unit_cost || 0) * Number(row.qty || 0),
    profit: (Number(row.unit_price || 0) - Number(row.unit_cost || 0)) * Number(row.qty || 0),
    customerPhone: row.customer_phone || "",
    date: toDateText(row.date),
  }));
}

async function getProfitSummary(period = { mode: "all" }) {
  const salesClause = salesDateClause(period);
  const rows = await query(`
    SELECT
      COALESCE(SUM(soi.quantity * soi.unit_price), 0) AS revenue,
      COALESCE(SUM(soi.quantity * soi.unit_cost), 0) AS cost,
      COALESCE(SUM(soi.quantity * (soi.unit_price - soi.unit_cost)), 0) AS profit,
      COALESCE(SUM(soi.quantity), 0) AS units
    FROM sales_orders so
    JOIN sales_order_items soi ON soi.sales_order_id = so.id
    WHERE so.status <> 'cancelled'
    ${salesClause.sql}
  `, salesClause.params);

  const productRows = await query(`
    SELECT
      p.sku,
      p.name,
      COALESCE(SUM(soi.quantity), 0) AS units,
      COALESCE(SUM(soi.quantity * soi.unit_price), 0) AS revenue,
      COALESCE(SUM(soi.quantity * soi.unit_cost), 0) AS cost,
      COALESCE(SUM(soi.quantity * (soi.unit_price - soi.unit_cost)), 0) AS profit
    FROM sales_orders so
    JOIN sales_order_items soi ON soi.sales_order_id = so.id
    JOIN products p ON p.id = soi.product_id
    WHERE so.status <> 'cancelled'
    ${salesClause.sql}
    GROUP BY p.sku, p.name
    ORDER BY profit DESC, units DESC
    LIMIT 10
  `, salesClause.params);

  const summary = rows[0] || {};
  const revenue = Number(summary.revenue || 0);
  const cost = Number(summary.cost || 0);
  const profit = Number(summary.profit || 0);

  return {
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    units: Number(summary.units || 0),
    products: productRows.map((row) => {
      const productRevenue = Number(row.revenue || 0);
      const productProfit = Number(row.profit || 0);
      return {
        sku: row.sku,
        name: row.name,
        units: Number(row.units || 0),
        revenue: productRevenue,
        cost: Number(row.cost || 0),
        profit: productProfit,
        margin: productRevenue > 0 ? (productProfit / productRevenue) * 100 : 0,
      };
    }),
  };
}

async function getStockMovements(period = { mode: "all" }) {
  const movementClause = movementDateClause(period);
  const rows = await query(`
    SELECT
      im.id,
      p.sku,
      p.name AS product_name,
      im.movement_type,
      im.quantity,
      im.balance_after,
      im.reference_type,
      im.note,
      im.created_by,
      im.created_at
    FROM inventory_movements im
    JOIN products p ON p.id = im.product_id
    ${movementClause.sql}
    ORDER BY im.created_at DESC, im.id DESC
    LIMIT 80
  `, movementClause.params);

  return rows.map((row) => ({
    id: Number(row.id),
    sku: row.sku,
    productName: row.product_name,
    type: row.movement_type,
    qty: Number(row.quantity || 0),
    balanceAfter: Number(row.balance_after || 0),
    referenceType: row.reference_type || "",
    note: row.note || "",
    user: row.created_by || "system",
    createdAt: row.created_at,
  }));
}

async function getCustomers() {
  const rows = await query(`
    SELECT
      c.id,
      c.name,
      c.customer_type,
      c.phone,
      c.email,
      COALESCE(SUM(CASE WHEN so.status <> 'cancelled' THEN so.total_amount ELSE 0 END), 0) AS total_spent,
      COALESCE(SUM(CASE WHEN so.status <> 'cancelled' THEN 1 ELSE 0 END), 0) AS order_count,
      MAX(so.order_date) AS last_order_date
    FROM customers c
    LEFT JOIN sales_orders so ON so.customer_id = c.id
    GROUP BY c.id, c.name, c.customer_type, c.phone, c.email
    ORDER BY total_spent DESC, c.name ASC
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    type: row.customer_type,
    phone: row.phone || "",
    email: row.email || "",
    totalSpent: Number(row.total_spent || 0),
    orderCount: Number(row.order_count || 0),
    lastOrderDate: toDateText(row.last_order_date),
  }));
}

async function getShipments() {
  const rows = await query(`
    SELECT
      sh.shipment_no,
      sh.title,
      sh.origin_city,
      sh.origin_country,
      sh.destination,
      sh.eta_date,
      sh.total_units,
      sh.transport_mode,
      sh.current_stage_index,
      ts.stage_index,
      ts.stage_name,
      ts.planned_date
    FROM import_shipments sh
    LEFT JOIN import_tracking_stages ts ON ts.shipment_id = sh.id
    WHERE sh.status <> 'cancelled'
    ORDER BY sh.eta_date ASC, sh.id ASC, ts.stage_index ASC
  `);

  const shipmentsByNo = new Map();

  for (const row of rows) {
    if (!shipmentsByNo.has(row.shipment_no)) {
      shipmentsByNo.set(row.shipment_no, {
        id: row.shipment_no,
        title: row.title,
        origin: `${row.origin_city}, ${row.origin_country}`,
        destination: row.destination,
        eta: toDateText(row.eta_date),
        units: Number(row.total_units),
        mode: row.transport_mode,
        currentStage: Number(row.current_stage_index),
        stages: [],
      });
    }

    if (row.stage_name) {
      shipmentsByNo.get(row.shipment_no).stages.push({
        label: row.stage_name,
        date: toDateText(row.planned_date),
      });
    }
  }

  return [...shipmentsByNo.values()];
}

app.get("/api/products", asyncRoute(async (request, response) => {
  response.json(await getProducts(reportPeriod(request)));
}));

app.get("/api/sales", asyncRoute(async (request, response) => {
  response.json(await getSales(reportPeriod(request)));
}));

app.get("/api/shipments", asyncRoute(async (_request, response) => {
  response.json(await getShipments());
}));

app.get("/api/profit-summary", asyncRoute(async (request, response) => {
  response.json(await getProfitSummary(reportPeriod(request)));
}));

app.get("/api/stock-movements", asyncRoute(async (request, response) => {
  response.json(await getStockMovements(reportPeriod(request)));
}));

app.get("/api/customers", asyncRoute(async (_request, response) => {
  response.json(await getCustomers());
}));

app.post("/api/customers", asyncRoute(async (request, response) => {
  const payload = request.body || {};
  const name = String(payload.name || "").trim();

  if (!name) {
    response.status(400).json({ error: "Customer name is required" });
    return;
  }

  await query(
    `
      INSERT INTO customers (name, customer_type, phone, email)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        customer_type = VALUES(customer_type),
        phone = VALUES(phone),
        email = VALUES(email)
    `,
    [name, payload.type || "retail", payload.phone || null, payload.email || null]
  );

  response.json({ ok: true, customers: await getCustomers() });
}));

function normalizeImageUrl(value) {
  if (!value) return null;
  const imageUrl = String(value);
  const validDataUrl = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(imageUrl);

  if (!validDataUrl) {
    const error = new Error("Invalid image format");
    error.statusCode = 400;
    throw error;
  }

  if (imageUrl.length > 5 * 1024 * 1024) {
    const error = new Error("Image is too large");
    error.statusCode = 413;
    throw error;
  }

  return imageUrl;
}

function normalizeImageUrls(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map(normalizeImageUrl).filter(Boolean).slice(0, 20);
}

async function insertProductImages(connection, sku, imageUrls, replace = false) {
  if (replace) {
    await connection.execute(
      `
        DELETE pi
        FROM product_images pi
        JOIN products p ON p.id = pi.product_id
        WHERE p.sku = ?
      `,
      [sku]
    );
  }

  const [productRows] = await connection.execute("SELECT id FROM products WHERE sku = ?", [sku]);
  if (!productRows.length) return;

  const productId = productRows[0].id;
  const [sortRows] = await connection.execute(
    "SELECT COALESCE(MAX(sort_order) + 1, 0) AS nextSort FROM product_images WHERE product_id = ?",
    [productId]
  );
  let nextSort = Number(sortRows[0]?.nextSort || 0);

  for (let index = 0; index < imageUrls.length; index += 1) {
    await connection.execute(
      `
        INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
        VALUES (?, ?, ?, ?)
      `,
      [productId, imageUrls[index], replace && index === 0 ? 1 : 0, nextSort]
    );
    nextSort += 1;
  }

  const [primaryRows] = await connection.execute(
    `
      SELECT pi.id
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE p.sku = ?
      ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
      LIMIT 1
    `,
    [sku]
  );

  if (primaryRows.length) {
    await connection.execute(
      `
        UPDATE product_images pi
        JOIN products p ON p.id = pi.product_id
        SET pi.is_primary = CASE WHEN pi.id = ? THEN 1 ELSE 0 END
        WHERE p.sku = ?
      `,
      [primaryRows[0].id, sku]
    );

    await connection.execute(
      `
        UPDATE products p
        JOIN product_images pi ON pi.product_id = p.id AND pi.id = ?
        SET p.image_url = pi.image_url
        WHERE p.sku = ?
      `,
      [primaryRows[0].id, sku]
    );
  } else {
    await connection.execute("UPDATE products SET image_url = NULL WHERE sku = ?", [sku]);
  }
}

app.post("/api/products", asyncRoute(async (request, response) => {
  const payload = request.body;
  const imageUrls = normalizeImageUrls(payload.imageUrls || payload.imageUrl);

  await transaction(async (connection) => {
    await connection.execute(
      `
        INSERT INTO categories (name, parent_name)
        VALUES (?, SUBSTRING_INDEX(?, ' / ', 1))
        ON DUPLICATE KEY UPDATE parent_name = VALUES(parent_name)
      `,
      [payload.category, payload.category]
    );

    await connection.execute(
      `
        INSERT INTO suppliers (name, country)
        VALUES (?, 'China')
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `,
      [payload.supplier]
    );

    await connection.execute(
      `
        INSERT INTO products
          (sku, name, category_id, supplier_id, selling_price, cost_price, shipping_cost, tax_cost, other_cost, stock_quantity, reorder_point, image_url)
        SELECT ?, ?, c.id, s.id, ?, ?, ?, ?, ?, ?, ?, ?
        FROM categories c
        JOIN suppliers s ON s.name = ?
        WHERE c.name = ?
      `,
      [
        payload.sku,
        payload.name,
        Number(payload.price || 0),
        Number(payload.cost || 0),
        Number(payload.shippingCost || 0),
        Number(payload.taxCost || 0),
        Number(payload.otherCost || 0),
        Number(payload.stock || 0),
        Number(payload.reorderPoint || 0),
        imageUrls[0] || null,
        payload.supplier,
        payload.category,
      ]
    );

    await connection.execute(
      `
        INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, note, created_by)
        SELECT id, 'opening', stock_quantity, stock_quantity, 'web', 'เพิ่มสินค้าจากหน้าเว็บ', ?
        FROM products
        WHERE sku = ?
      `,
      [request.authUser || loginUser, payload.sku]
    );

    await insertProductImages(connection, payload.sku, imageUrls, true);
  });

  response.json({ ok: true, products: await getProducts() });
}));

app.put("/api/products/:sku/image", asyncRoute(async (request, response) => {
  const imageUrls = normalizeImageUrls(request.body?.imageUrls || request.body?.imageUrl);
  const result = await transaction(async (connection) => {
    const [rows] = await connection.execute("SELECT id FROM products WHERE sku = ? AND status = 'active'", [
      request.params.sku,
    ]);

    if (!rows.length) return { found: false };
    await insertProductImages(connection, request.params.sku, imageUrls, true);
    return { found: true };
  });

  if (!result.found) {
    response.status(404).json({ error: "Product not found" });
    return;
  }

  response.json({ ok: true, products: await getProducts() });
}));

app.post("/api/products/:sku/images", asyncRoute(async (request, response) => {
  const imageUrls = normalizeImageUrls(request.body?.imageUrls || request.body?.imageUrl);

  if (!imageUrls.length) {
    response.status(400).json({ error: "No images provided" });
    return;
  }

  const result = await transaction(async (connection) => {
    const [rows] = await connection.execute("SELECT id FROM products WHERE sku = ? AND status = 'active'", [
      request.params.sku,
    ]);

    if (!rows.length) return { found: false };
    await insertProductImages(connection, request.params.sku, imageUrls, false);
    return { found: true };
  });

  if (!result.found) {
    response.status(404).json({ error: "Product not found" });
    return;
  }

  response.json({ ok: true, products: await getProducts() });
}));

app.put("/api/products/:sku/images/:imageId/primary", asyncRoute(async (request, response) => {
  const result = await transaction(async (connection) => {
    const [rows] = await connection.execute(
      `
        SELECT pi.id, pi.image_url
        FROM product_images pi
        JOIN products p ON p.id = pi.product_id
        WHERE p.sku = ? AND pi.id = ?
      `,
      [request.params.sku, request.params.imageId]
    );

    if (!rows.length) return { found: false };

    await connection.execute(
      `
        UPDATE product_images pi
        JOIN products p ON p.id = pi.product_id
        SET pi.is_primary = CASE WHEN pi.id = ? THEN 1 ELSE 0 END
        WHERE p.sku = ?
      `,
      [request.params.imageId, request.params.sku]
    );
    await connection.execute("UPDATE products SET image_url = ? WHERE sku = ?", [
      rows[0].image_url,
      request.params.sku,
    ]);

    return { found: true };
  });

  if (!result.found) {
    response.status(404).json({ error: "Image not found" });
    return;
  }

  response.json({ ok: true, products: await getProducts() });
}));

app.delete("/api/products/:sku/images/:imageId", asyncRoute(async (request, response) => {
  const result = await transaction(async (connection) => {
    const [rows] = await connection.execute(
      `
        SELECT pi.id
        FROM product_images pi
        JOIN products p ON p.id = pi.product_id
        WHERE p.sku = ? AND pi.id = ?
      `,
      [request.params.sku, request.params.imageId]
    );

    if (!rows.length) return { found: false };

    await connection.execute(
      `
        DELETE pi
        FROM product_images pi
        JOIN products p ON p.id = pi.product_id
        WHERE p.sku = ? AND pi.id = ?
      `,
      [request.params.sku, request.params.imageId]
    );
    await insertProductImages(connection, request.params.sku, [], false);

    return { found: true };
  });

  if (!result.found) {
    response.status(404).json({ error: "Image not found" });
    return;
  }

  response.json({ ok: true, products: await getProducts() });
}));

app.delete("/api/products/:sku", asyncRoute(async (request, response) => {
  await transaction(async (connection) => {
    const params = [request.params.sku];

    await connection.execute(
      `
        DELETE im
        FROM inventory_movements im
        JOIN products p ON p.id = im.product_id
        WHERE p.sku = ?
      `,
      params
    );

    await connection.execute(
      `
        DELETE isi
        FROM import_shipment_items isi
        JOIN products p ON p.id = isi.product_id
        WHERE p.sku = ?
      `,
      params
    );

    await connection.execute(
      `
        DELETE soi
        FROM sales_order_items soi
        JOIN products p ON p.id = soi.product_id
        WHERE p.sku = ?
      `,
      params
    );

    await connection.execute(`
      DELETE so
      FROM sales_orders so
      LEFT JOIN sales_order_items soi ON soi.sales_order_id = so.id
      WHERE soi.id IS NULL
    `);

    await connection.execute("DELETE FROM products WHERE sku = ?", params);
  });

  response.json({ ok: true, products: await getProducts() });
}));

app.post("/api/stock", asyncRoute(async (request, response) => {
  const { sku, action } = request.body;
  const qty = Math.max(0, Number(request.body.qty || 0));

  const updateSqlByAction = {
    add: "stock_quantity = stock_quantity + ?",
    remove: "stock_quantity = GREATEST(0, stock_quantity - ?)",
    set: "stock_quantity = ?",
  };
  const movementByAction = {
    add: "adjust_in",
    remove: "adjust_out",
    set: "set_balance",
  };

  const updateSql = updateSqlByAction[action] || updateSqlByAction.set;
  const movement = movementByAction[action] || movementByAction.set;

  await transaction(async (connection) => {
    await connection.execute(`UPDATE products SET ${updateSql} WHERE sku = ?`, [qty, sku]);
    await connection.execute(
      `
        INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, note, created_by)
        SELECT id, ?, ?, stock_quantity, 'web', ?, ?
        FROM products
        WHERE sku = ?
      `,
      [movement, qty, request.body.reason || "ปรับ stock จากหน้าเว็บ", request.authUser || loginUser, sku]
    );
  });

  response.json({ ok: true, products: await getProducts() });
}));

app.post("/api/sales/sample", asyncRoute(async (request, response) => {
  const { sku } = request.body;
  const qty = Math.max(1, Number(request.body.qty || 1));
  const customer = request.body.customer || "Sample customer";

  await transaction(async (connection) => {
    await connection.execute(
      `
        INSERT INTO customers (name, customer_type)
        VALUES (?, 'online')
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `,
      [customer]
    );

    const [orderResult] = await connection.execute(
      `
        INSERT INTO sales_orders (order_no, customer_id, order_date, total_amount)
        SELECT CONCAT('SO-WEB-', DATE_FORMAT(NOW(6), '%Y%m%d%H%i%s%f')), c.id, CURDATE(), ? * p.selling_price
        FROM customers c
        JOIN products p ON p.sku = ?
        WHERE c.name = ?
          AND p.status = 'active'
          AND p.stock_quantity > 0
      `,
      [qty, sku, customer]
    );

    await connection.execute(
      `
        INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, unit_cost)
        SELECT ?, p.id, LEAST(?, p.stock_quantity), p.selling_price, p.cost_price
        FROM products p
        WHERE p.sku = ?
          AND p.status = 'active'
          AND p.stock_quantity > 0
      `,
      [orderResult.insertId, qty, sku]
    );

    await connection.execute(
      `
        UPDATE products
        SET stock_quantity = GREATEST(0, stock_quantity - ?)
        WHERE sku = ?
          AND status = 'active'
      `,
      [qty, sku]
    );

    await connection.execute(
      `
        INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, reference_id, note)
        SELECT p.id, 'sale_out', ?, p.stock_quantity, 'sales_order', ?, 'เธเธฒเธขเธ•เธฑเธงเธญเธขเนเธฒเธเธเธฒเธเธซเธเนเธฒเน€เธงเนเธ'
        FROM products p
        WHERE p.sku = ?
          AND p.status = 'active'
      `,
      [qty, orderResult.insertId, sku]
    );
  });

  response.json({ ok: true, products: await getProducts(), sales: await getSales() });
}));

app.post("/api/sales", asyncRoute(async (request, response) => {
  const { sku } = request.body;
  const qty = Math.max(1, Number(request.body.qty || 1));
  const customer = request.body.customer || "Walk-in";
  const customerPhone = request.body.customerPhone || null;
  const date = request.body.date || new Date().toISOString().slice(0, 10);
  const status = allowedSaleStatuses.has(request.body.status) ? request.body.status : "paid";

  await transaction(async (connection) => {
    await connection.execute(
      `
        INSERT INTO customers (name, customer_type, phone)
        VALUES (?, 'online', ?)
        ON DUPLICATE KEY UPDATE phone = COALESCE(VALUES(phone), phone)
      `,
      [customer, customerPhone]
    );

    const [products] = await connection.execute(
      "SELECT id, selling_price, cost_price, shipping_cost, tax_cost, other_cost, stock_quantity FROM products WHERE sku = ? AND status = 'active'",
      [sku]
    );

    if (!products.length) throw new Error("Product not found");

    const product = products[0];
    if (status !== "cancelled" && Number(product.stock_quantity) < qty) throw new Error("Not enough stock for this sale");

    const [customers] = await connection.execute("SELECT id FROM customers WHERE name = ?", [customer]);
    const total = qty * Number(product.selling_price);
    const actualCost = Number(product.cost_price) + Number(product.shipping_cost || 0) + Number(product.tax_cost || 0) + Number(product.other_cost || 0);
    const [orderResult] = await connection.execute(
      `
        INSERT INTO sales_orders (order_no, customer_id, order_date, total_amount, status)
        VALUES (CONCAT('SO-WEB-', DATE_FORMAT(NOW(6), '%Y%m%d%H%i%s%f')), ?, ?, ?, ?)
      `,
      [customers[0].id, date, total, status]
    );

    await connection.execute(
      `
        INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, unit_cost)
        VALUES (?, ?, ?, ?, ?)
      `,
      [orderResult.insertId, product.id, qty, product.selling_price, actualCost]
    );

    if (status !== "cancelled") {
      await connection.execute("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [
        qty,
        product.id,
      ]);

      await connection.execute(
        `
          INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, reference_id, note, created_by)
          SELECT id, 'sale_out', ?, stock_quantity, 'sales_order', ?, 'บันทึกยอดขาย', ?
          FROM products
          WHERE id = ?
        `,
        [qty, orderResult.insertId, request.authUser || loginUser, product.id]
      );
    }
  });

  response.json({ ok: true, products: await getProducts(), sales: await getSales() });
}));

app.put("/api/sales/:orderNo", asyncRoute(async (request, response) => {
  const { sku } = request.body;
  const qty = Math.max(1, Number(request.body.qty || 1));
  const customer = request.body.customer || "Walk-in";
  const customerPhone = request.body.customerPhone || null;
  const date = request.body.date || new Date().toISOString().slice(0, 10);
  const status = allowedSaleStatuses.has(request.body.status) ? request.body.status : "paid";

  await transaction(async (connection) => {
    const [existingRows] = await connection.execute(
      `
        SELECT so.id AS order_id, soi.id AS item_id, soi.product_id AS old_product_id, soi.quantity AS old_qty
        FROM sales_orders so
        JOIN sales_order_items soi ON soi.sales_order_id = so.id
        WHERE so.order_no = ?
          AND so.status <> 'cancelled'
        LIMIT 1
      `,
      [request.params.orderNo]
    );

    if (!existingRows.length) throw new Error("Sale not found");

    const existing = existingRows[0];
    await connection.execute("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [
      existing.old_qty,
      existing.old_product_id,
    ]);

    await connection.execute(
      `
        INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, reference_id, note, created_by)
        SELECT id, 'adjust_in', ?, stock_quantity, 'sales_order', ?, 'แก้ไขยอดขาย คืน stock เดิม', ?
        FROM products
        WHERE id = ?
      `,
      [existing.old_qty, existing.order_id, request.authUser || loginUser, existing.old_product_id]
    );

    await connection.execute(
      `
        INSERT INTO customers (name, customer_type, phone)
        VALUES (?, 'online', ?)
        ON DUPLICATE KEY UPDATE phone = COALESCE(VALUES(phone), phone)
      `,
      [customer, customerPhone]
    );

    const [customers] = await connection.execute("SELECT id FROM customers WHERE name = ?", [customer]);
    const [products] = await connection.execute(
      "SELECT id, selling_price, cost_price, shipping_cost, tax_cost, other_cost, stock_quantity FROM products WHERE sku = ? AND status = 'active'",
      [sku]
    );

    if (!products.length) throw new Error("Product not found");

    const product = products[0];
    if (status !== "cancelled" && Number(product.stock_quantity) < qty) throw new Error("Not enough stock for this sale");

    const total = qty * Number(product.selling_price);
    const actualCost = Number(product.cost_price) + Number(product.shipping_cost || 0) + Number(product.tax_cost || 0) + Number(product.other_cost || 0);
    await connection.execute(
      "UPDATE sales_orders SET customer_id = ?, order_date = ?, total_amount = ?, status = ? WHERE id = ?",
      [customers[0].id, date, total, status, existing.order_id]
    );
    await connection.execute(
      `
        UPDATE sales_order_items
        SET product_id = ?, quantity = ?, unit_price = ?, unit_cost = ?
        WHERE id = ?
      `,
      [product.id, qty, product.selling_price, actualCost, existing.item_id]
    );
    if (status !== "cancelled") {
      await connection.execute("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [
        qty,
        product.id,
      ]);

      await connection.execute(
        `
          INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, reference_id, note, created_by)
          SELECT id, 'sale_out', ?, stock_quantity, 'sales_order', ?, 'แก้ไขยอดขาย ตัด stock ใหม่', ?
          FROM products
          WHERE id = ?
        `,
        [qty, existing.order_id, request.authUser || loginUser, product.id]
      );
    }
  });

  response.json({ ok: true, products: await getProducts(), sales: await getSales() });
}));

app.delete("/api/sales/:orderNo", asyncRoute(async (request, response) => {
  await transaction(async (connection) => {
    const [rows] = await connection.execute(
      `
        SELECT so.id AS order_id, soi.product_id, soi.quantity
        FROM sales_orders so
        JOIN sales_order_items soi ON soi.sales_order_id = so.id
        WHERE so.order_no = ?
          AND so.status <> 'cancelled'
      `,
      [request.params.orderNo]
    );

    for (const row of rows) {
      await connection.execute("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [
        row.quantity,
        row.product_id,
      ]);
      await connection.execute(
        `
          INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, reference_id, note, created_by)
          SELECT id, 'adjust_in', ?, stock_quantity, 'sales_order', ?, 'ยกเลิกยอดขาย คืน stock', ?
          FROM products
          WHERE id = ?
        `,
        [row.quantity, row.order_id, request.authUser || loginUser, row.product_id]
      );
    }

    if (rows.length) {
      await connection.execute("UPDATE sales_orders SET status = 'cancelled' WHERE id = ?", [rows[0].order_id]);
    }
  });

  response.json({ ok: true, products: await getProducts(), sales: await getSales() });
}));

app.post("/api/shipments", asyncRoute(async (request, response) => {
  const payload = request.body;
  const units = Number(payload.units || 0);

  if (units < 1) {
    response.status(400).json({ error: "Shipment units must be greater than zero" });
    return;
  }

  await transaction(async (connection) => {
    const [shipmentResult] = await connection.execute(
      `
        INSERT INTO import_shipments
          (shipment_no, title, origin_city, origin_country, destination, transport_mode, eta_date, total_units, current_stage_index, status)
        VALUES (?, ?, ?, 'China', ?, ?, ?, ?, 0, 'preparing')
      `,
      [
        payload.shipmentNo,
        payload.title,
        payload.originCity,
        payload.destination,
        payload.mode,
        payload.eta,
        units,
      ]
    );

    await connection.execute(
      `
        INSERT INTO import_tracking_stages (shipment_id, stage_index, stage_name, planned_date, completed_at)
        VALUES (?, 0, ?, ?, NOW())
      `,
      [shipmentResult.insertId, payload.firstStage, payload.firstStageDate]
    );
  });

  response.json({ ok: true, shipments: await getShipments() });
}));

app.post("/api/shipments/status", asyncRoute(async (request, response) => {
  const { shipmentNo } = request.body;
  const currentStage = Number(request.body.currentStage || 0);

  await transaction(async (connection) => {
    await connection.execute(
      `
        UPDATE import_shipments sh
        JOIN (
          SELECT shipment_id, MAX(stage_index) AS max_stage
          FROM import_tracking_stages
          GROUP BY shipment_id
        ) stages ON stages.shipment_id = sh.id
        SET
          sh.current_stage_index = GREATEST(0, LEAST(?, stages.max_stage)),
          sh.status = CASE
            WHEN GREATEST(0, LEAST(?, stages.max_stage)) >= stages.max_stage THEN 'arrived'
            WHEN GREATEST(0, LEAST(?, stages.max_stage)) >= 5 THEN 'customs'
            ELSE 'in_transit'
          END
        WHERE sh.shipment_no = ?
      `,
      [currentStage, currentStage, currentStage, shipmentNo]
    );

    await connection.execute(
      `
        UPDATE import_tracking_stages ts
        JOIN import_shipments sh ON sh.id = ts.shipment_id
        SET ts.completed_at = CASE
          WHEN ts.stage_index <= sh.current_stage_index THEN COALESCE(ts.completed_at, NOW())
          ELSE NULL
        END
        WHERE sh.shipment_no = ?
      `,
      [shipmentNo]
    );
  });

  response.json({ ok: true, shipments: await getShipments() });
}));

app.post("/api/shipments/stages", asyncRoute(async (request, response) => {
  const { shipmentNo, label, date } = request.body;

  await transaction(async (connection) => {
    await connection.execute(
      `
        INSERT INTO import_tracking_stages (shipment_id, stage_index, stage_name, planned_date)
        SELECT sh.id, COALESCE(MAX(ts.stage_index), -1) + 1, ?, ?
        FROM import_shipments sh
        LEFT JOIN import_tracking_stages ts ON ts.shipment_id = sh.id
        WHERE sh.shipment_no = ?
        GROUP BY sh.id
      `,
      [label, date, shipmentNo]
    );
  });

  response.json({ ok: true, shipments: await getShipments() });
}));

app.delete("/api/shipments/:shipmentNo/stages/last", asyncRoute(async (request, response) => {
  await transaction(async (connection) => {
    await connection.execute(
      `
        DELETE ts
        FROM import_tracking_stages ts
        JOIN import_shipments sh ON sh.id = ts.shipment_id
        JOIN (
          SELECT shipment_id, MAX(stage_index) AS max_stage, COUNT(*) AS stage_count
          FROM import_tracking_stages
          GROUP BY shipment_id
        ) last_stage ON last_stage.shipment_id = ts.shipment_id
        WHERE sh.shipment_no = ?
          AND ts.stage_index = last_stage.max_stage
          AND last_stage.stage_count > 1
      `,
      [request.params.shipmentNo]
    );

    await connection.execute(
      `
        UPDATE import_shipments sh
        JOIN (
          SELECT shipment_id, MAX(stage_index) AS max_stage
          FROM import_tracking_stages
          GROUP BY shipment_id
        ) stages ON stages.shipment_id = sh.id
        SET sh.current_stage_index = LEAST(sh.current_stage_index, stages.max_stage)
        WHERE sh.shipment_no = ?
      `,
      [request.params.shipmentNo]
    );
  });

  response.json({ ok: true, shipments: await getShipments() });
}));

app.delete("/api/shipments/:shipmentNo", asyncRoute(async (request, response) => {
  await transaction(async (connection) => {
    const params = [request.params.shipmentNo];

    await connection.execute(
      `
        DELETE ts
        FROM import_tracking_stages ts
        JOIN import_shipments sh ON sh.id = ts.shipment_id
        WHERE sh.shipment_no = ?
      `,
      params
    );

    await connection.execute(
      `
        DELETE isi
        FROM import_shipment_items isi
        JOIN import_shipments sh ON sh.id = isi.shipment_id
        WHERE sh.shipment_no = ?
      `,
      params
    );

    await connection.execute("DELETE FROM import_shipments WHERE shipment_no = ?", params);
  });

  response.json({ ok: true, shipments: await getShipments() });
}));

app.get("*", (_request, response) => {
  response.sendFile(path.join(root, "index.html"));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.statusCode || 500).json({ error: error.message || "Internal server error" });
});

app.listen(port, () => {
  console.log(`jipatabykapi running on port ${port}`);
});
