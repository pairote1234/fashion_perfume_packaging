let products = [
  {
    sku: "SHIRT-TS-001",
    name: "เสื้อยืด Oversize Cotton 240gsm",
    category: "เสื้อ / เสื้อยืด",
    supplier: "Guangzhou Apparel Co.",
    price: 390,
    cost: 168,
    stock: 84,
    reorderPoint: 30,
    sold: 146,
  },
  {
    sku: "SHIRT-POLO-012",
    name: "เสื้อโปโลผ้า Pique สีกรม",
    category: "เสื้อ / เสื้อโปโล",
    supplier: "Hangzhou Textile",
    price: 490,
    cost: 210,
    stock: 18,
    reorderPoint: 24,
    sold: 62,
  },
  {
    sku: "PANTS-JEAN-009",
    name: "กางเกงยีนส์ Straight Fit",
    category: "กางเกง / กางเกงยีนส์",
    supplier: "Shenzhen Garment",
    price: 890,
    cost: 390,
    stock: 31,
    reorderPoint: 20,
    sold: 88,
  },
  {
    sku: "PANTS-SHORT-004",
    name: "กางเกงขาสั้นผ้าคอตตอน",
    category: "กางเกง / กางเกงขาสั้น",
    supplier: "Yiwu Fashion Market",
    price: 420,
    cost: 170,
    stock: 9,
    reorderPoint: 18,
    sold: 73,
  },
  {
    sku: "PKG-BTL-030",
    name: "ขวดน้ำหอมแก้ว 30ml ทรงเหลี่ยม",
    category: "ขวด / ขวดน้ำหอม",
    supplier: "Xuzhou Glass Bottle",
    price: 38,
    cost: 16,
    stock: 420,
    reorderPoint: 250,
    sold: 1180,
  },
  {
    sku: "PKG-BTL-050",
    name: "ขวดน้ำหอมแก้ว 50ml ทรงกลม",
    category: "ขวด / ขวดน้ำหอม",
    supplier: "Xuzhou Glass Bottle",
    price: 45,
    cost: 19,
    stock: 160,
    reorderPoint: 220,
    sold: 840,
  },
  {
    sku: "PKG-DIFF-100",
    name: "ขวดใส่ไม้น้ำหอม 100ml",
    category: "ขวด / ขวดใส่ไม้น้ำหอม",
    supplier: "Ningbo Glass Packaging",
    price: 52,
    cost: 23,
    stock: 680,
    reorderPoint: 300,
    sold: 1260,
  },
  {
    sku: "PKG-DIFF-150",
    name: "ขวดใส่ไม้น้ำหอม 150ml ฝาไม้",
    category: "ขวด / ขวดใส่ไม้น้ำหอม",
    supplier: "Dongguan Aroma Bottle",
    price: 68,
    cost: 31,
    stock: 190,
    reorderPoint: 260,
    sold: 920,
  },
];

const sales = [
  { order: "SO-2048", sku: "PKG-DIFF-100", qty: 160, customer: "Maison Sample Lab", date: "2026-04-29" },
  { order: "SO-2047", sku: "PKG-BTL-030", qty: 120, customer: "Online B2B", date: "2026-04-29" },
  { order: "SO-2046", sku: "SHIRT-TS-001", qty: 8, customer: "Live sale", date: "2026-04-28" },
  { order: "SO-2045", sku: "PANTS-JEAN-009", qty: 5, customer: "Online", date: "2026-04-28" },
  { order: "SO-2044", sku: "PKG-DIFF-150", qty: 90, customer: "Aroma Studio", date: "2026-04-27" },
  { order: "SO-2043", sku: "SHIRT-POLO-012", qty: 3, customer: "Retail", date: "2026-04-27" },
];

const shipments = [
  {
    id: "CN-IMP-7712",
    title: "ขวดน้ำหอม 30ml + ขวดใส่ไม้น้ำหอม",
    origin: "Xuzhou, China",
    destination: "คลังบางนา, Thailand",
    eta: "2026-05-08",
    units: 3600,
    mode: "Sea + Truck",
    currentStage: 4,
    stages: [
      { label: "ยืนยัน Order", date: "2026-04-18" },
      { label: "ผลิต/แพ็คสินค้า", date: "2026-04-21" },
      { label: "QC โรงงาน", date: "2026-04-23" },
      { label: "ถึงโกดังจีน", date: "2026-04-25" },
      { label: "ออกจากจีน", date: "2026-04-27" },
      { label: "ถึงด่านไทย", date: "2026-05-05" },
      { label: "เข้าคลังไทย", date: "2026-05-08" },
    ],
  },
  {
    id: "CN-IMP-7713",
    title: "เสื้อยืดและกางเกงยีนส์ Lot Summer",
    origin: "Guangzhou, China",
    destination: "คลังพระราม 2, Thailand",
    eta: "2026-05-03",
    units: 520,
    mode: "Air cargo",
    currentStage: 5,
    stages: [
      { label: "ยืนยัน Order", date: "2026-04-22" },
      { label: "รวบรวมสินค้า", date: "2026-04-23" },
      { label: "QC/วัดไซซ์", date: "2026-04-25" },
      { label: "ถึงโกดังจีน", date: "2026-04-26" },
      { label: "ขึ้นเครื่อง", date: "2026-04-28" },
      { label: "ถึงด่านไทย", date: "2026-04-30" },
      { label: "เข้าคลังไทย", date: "2026-05-03" },
    ],
  },
  {
    id: "CN-IMP-7714",
    title: "ขวดใส่ไม้น้ำหอม 150ml ฝาไม้",
    origin: "Dongguan, China",
    destination: "คลังบางนา, Thailand",
    eta: "2026-05-14",
    units: 5000,
    mode: "Sea freight",
    currentStage: 2,
    stages: [
      { label: "ยืนยันแบบพิมพ์", date: "2026-04-24" },
      { label: "ผลิต/พิมพ์กล่อง", date: "2026-04-28" },
      { label: "QC สีและขนาด", date: "2026-05-01" },
      { label: "ถึงโกดังจีน", date: "2026-05-03" },
      { label: "ออกจากจีน", date: "2026-05-05" },
      { label: "ถึงด่านไทย", date: "2026-05-12" },
      { label: "เข้าคลังไทย", date: "2026-05-14" },
    ],
  },
];

const formatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const state = {
  query: "",
  category: "all",
};
const apiBaseUrl = window.location.protocol.startsWith("http") ? "" : "http://localhost:8088";

const productTable = document.querySelector("#productTable");
const categoryFilter = document.querySelector("#categoryFilter");
const searchInput = document.querySelector("#searchInput");
const userBadge = document.createElement("span");
userBadge.id = "userBadge";
userBadge.className = "user-badge";
userBadge.textContent = "User";
const logoutBtn = document.createElement("button");
logoutBtn.id = "logoutBtn";
logoutBtn.className = "secondary-button";
logoutBtn.type = "button";
logoutBtn.textContent = "ออกจากระบบ";
searchInput.closest(".top-actions").append(userBadge);
userBadge.insertAdjacentElement("afterend", logoutBtn);
const productForm = document.querySelector("#productForm");
const stockProductSelect = document.querySelector("#stockProductSelect");
const adjustStockBtn = document.querySelector("#adjustStockBtn");
const manageTable = document.querySelector("#manageTable");
const manageStatus = document.querySelector("#manageStatus");
const trackingStatusForm = document.querySelector("#trackingStatusForm");
const trackingShipmentSelect = document.querySelector("#trackingShipmentSelect");
const trackingStageSelect = document.querySelector("#trackingStageSelect");
const trackingPrevBtn = document.querySelector("#trackingPrevBtn");
const trackingNextBtn = document.querySelector("#trackingNextBtn");
const addStageBtn = document.querySelector("#addStageBtn");
const removeStageBtn = document.querySelector("#removeStageBtn");
const trackingStatusText = document.querySelector("#trackingStatusText");
const shipmentForm = document.querySelector("#shipmentForm");
const salesForm = document.querySelector("#salesForm");
const saleProductSelect = document.querySelector("#saleProductSelect");
const saleQty = document.querySelector("#saleQty");
const saleCustomer = document.querySelector("#saleCustomer");
const saleDate = document.querySelector("#saleDate");
const editingOrderNo = document.querySelector("#editingOrderNo");
const salesFormTitle = document.querySelector("#salesFormTitle");
const salesStatus = document.querySelector("#salesStatus");
const cancelSaleEditBtn = document.querySelector("#cancelSaleEditBtn");
const viewBlocks = {
  overview: document.querySelector("#overview"),
  content: document.querySelector(".content-grid"),
  products: document.querySelector("#products"),
  alerts: document.querySelector("#alerts"),
  manage: document.querySelector("#manage"),
  imports: document.querySelector("#imports"),
  sales: document.querySelector("#sales"),
  sideStack: document.querySelector(".side-stack"),
};

function money(value) {
  return formatter.format(value);
}

function productBySku(sku) {
  return products.find((product) => product.sku === sku);
}

function stockStatus(product) {
  if (product.stock === 0) return { label: "หมด", className: "danger" };
  if (product.stock <= product.reorderPoint) return { label: "ควรเติม", className: "warning" };
  return { label: "พร้อมขาย", className: "good" };
}

function formatDate(dateText) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateText));
}

function filteredProducts() {
  const keyword = state.query.trim().toLowerCase();

  return products.filter((product) => {
    const inCategory = state.category === "all" || product.category === state.category;
    const searchable = [product.name, product.sku, product.category, product.supplier].join(" ").toLowerCase();
    return inCategory && (!keyword || searchable.includes(keyword));
  });
}

function hydrateCategoryFilter() {
  const categories = [...new Set(products.map((product) => product.category))];

  categoryFilter.innerHTML = '<option value="all">ทุกหมวดหมู่</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function renderMetrics() {
  const revenue = sales.reduce((sum, sale) => {
    const product = productBySku(sale.sku);
    if (!product) return sum;
    return sum + product.price * sale.qty;
  }, 0);
  const stockValue = products.reduce((sum, product) => sum + product.cost * product.stock, 0);
  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStock = products.filter((product) => product.stock <= product.reorderPoint).length;
  const incomingUnits = shipments.reduce((sum, shipment) => sum + shipment.units, 0);
  const nearestShipment = [...shipments].sort((a, b) => new Date(a.eta) - new Date(b.eta))[0];

  document.querySelector("#monthlyRevenue").textContent = money(revenue);
  document.querySelector("#monthlyOrders").textContent = `${sales.length} orders`;
  document.querySelector("#stockValue").textContent = money(stockValue);
  document.querySelector("#totalUnits").textContent = totalUnits.toLocaleString("th-TH");
  document.querySelector("#lowStockCount").textContent = `${lowStock} รายการใกล้หมด`;
  document.querySelector("#incomingUnits").textContent = incomingUnits.toLocaleString("th-TH");
  document.querySelector("#nearestEta").textContent = nearestShipment
    ? `ถึงไทยใกล้สุด ${formatDate(nearestShipment.eta)}`
    : "ETA -";
}

function renderProducts() {
  productTable.innerHTML = "";

  filteredProducts().forEach((product) => {
    const status = stockStatus(product);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <div class="product-name">
          <strong>${product.name}</strong>
          <small>${product.sku}</small>
        </div>
      </td>
      <td>${product.category}</td>
      <td>${product.supplier}</td>
      <td>${money(product.price)}</td>
      <td>${product.sold.toLocaleString("th-TH")}</td>
      <td>${product.stock.toLocaleString("th-TH")}</td>
      <td><span class="status ${status.className}">${status.label}</span></td>
    `;

    productTable.appendChild(row);
  });
}

function renderManager() {
  stockProductSelect.innerHTML = products
    .map((product) => `<option value="${product.sku}">${product.sku} - ${product.name}</option>`)
    .join("");

  manageTable.innerHTML = products
    .map(
      (product) => `
        <tr>
          <td>
            <div class="product-name">
              <strong>${product.name}</strong>
              <small>${product.sku}</small>
            </div>
          </td>
          <td>${product.category}</td>
          <td>${product.supplier}</td>
          <td>${product.stock.toLocaleString("th-TH")}</td>
          <td>${product.reorderPoint.toLocaleString("th-TH")}</td>
          <td>
            <button class="danger-button" type="button" data-delete-sku="${product.sku}">ลบ</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderAlerts() {
  const alertList = document.querySelector("#alertList");
  const lowStock = products
    .filter((product) => product.stock <= product.reorderPoint)
    .sort((a, b) => a.stock - b.stock);

  alertList.innerHTML = lowStock
    .map(
      (product) => `
        <article class="alert-item">
          <div>
            <strong>${product.name}</strong>
            <small>${product.sku} ต้องมีอย่างน้อย ${product.reorderPoint.toLocaleString("th-TH")} ชิ้น</small>
          </div>
          <span class="qty-pill low">${product.stock.toLocaleString("th-TH")}</span>
        </article>
      `
    )
    .join("");
}

function renderTopSellers() {
  const topSellerList = document.querySelector("#topSellerList");
  const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 3);

  topSellerList.innerHTML = topProducts
    .map(
      (product) => `
        <article class="seller-item">
          <div>
            <strong>${product.name}</strong>
            <small>${product.category}</small>
          </div>
          <span class="qty-pill">${product.sold.toLocaleString("th-TH")}</span>
        </article>
      `
    )
    .join("");
}

function renderShipments() {
  const shipmentList = document.querySelector("#shipmentList");
  renderTrackingControls();

  if (!shipments.length) {
    shipmentList.innerHTML = `
      <article class="empty-state">
        <strong>ยังไม่มี Shipment</strong>
        <small>เพิ่ม Shipment ใหม่จากฟอร์มด้านบนเพื่อเริ่ม Tracking</small>
      </article>
    `;
    return;
  }

  shipmentList.innerHTML = shipments
    .map((shipment) => {
      const progress = Math.round(((shipment.currentStage + 1) / shipment.stages.length) * 100);
      const stageHtml = shipment.stages
        .map((stage, index) => {
          const className =
            index < shipment.currentStage ? "done" : index === shipment.currentStage ? "active" : "";
          return `
            <li class="${className}">
              <span></span>
              <div>
                <strong>${stage.label}</strong>
                <small>${formatDate(stage.date)}</small>
              </div>
            </li>
          `;
        })
        .join("");

      return `
        <article class="shipment-card">
          <div class="shipment-head">
            <div>
              <strong>${shipment.title}</strong>
              <small>${shipment.id} | ${shipment.origin} -> ${shipment.destination}</small>
            </div>
            <span class="eta-badge">ETA ${formatDate(shipment.eta)}</span>
          </div>
          <div class="shipment-meta">
            <span>${shipment.mode}</span>
            <span>${shipment.units.toLocaleString("th-TH")} ชิ้น</span>
            <span>${progress}%</span>
          </div>
          <div class="progress-bar" aria-label="shipment progress">
            <span style="width: ${progress}%"></span>
          </div>
          <ol class="tracking-steps">${stageHtml}</ol>
          <div class="shipment-actions">
            <button class="danger-button" type="button" data-delete-shipment="${shipment.id}">ลบ Shipment</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function selectedShipment() {
  const selectedId = trackingShipmentSelect?.value || shipments[0]?.id;
  return shipments.find((shipment) => shipment.id === selectedId) || shipments[0];
}

function renderTrackingControls() {
  if (!trackingShipmentSelect || !trackingStageSelect) return;

  const selectedId = trackingShipmentSelect.value || shipments[0]?.id || "";
  trackingShipmentSelect.innerHTML = shipments
    .map((shipment) => `<option value="${shipment.id}">${shipment.id} - ${shipment.title}</option>`)
    .join("");

  if (selectedId) {
    trackingShipmentSelect.value = selectedId;
  }

  const shipment = selectedShipment();
  if (!shipment) {
    trackingStageSelect.innerHTML = "";
    trackingShipmentSelect.disabled = true;
    trackingStageSelect.disabled = true;
    return;
  }

  trackingShipmentSelect.disabled = false;
  trackingStageSelect.disabled = false;

  trackingStageSelect.innerHTML = shipment.stages
    .map((stage, index) => `<option value="${index}">${index + 1}. ${stage.label}</option>`)
    .join("");
  trackingStageSelect.value = String(Math.min(shipment.currentStage, shipment.stages.length - 1));

  const newStageDate = document.querySelector("#newStageDate");
  if (newStageDate && !newStageDate.value) {
    newStageDate.value = new Date().toISOString().slice(0, 10);
  }

  const shipmentEta = document.querySelector("#shipmentEta");
  const shipmentFirstStageDate = document.querySelector("#shipmentFirstStageDate");
  const today = new Date().toISOString().slice(0, 10);
  if (shipmentEta && !shipmentEta.value) shipmentEta.value = today;
  if (shipmentFirstStageDate && !shipmentFirstStageDate.value) shipmentFirstStageDate.value = today;
}

function renderSales() {
  const salesList = document.querySelector("#salesList");
  renderSalesControls();

  salesList.innerHTML = sales
    .slice(0, 12)
    .map((sale) => {
      const product = productBySku(sale.sku);
      if (!product) return "";
      return `
        <article class="sale-item">
          <div>
            <strong>${sale.order}</strong>
            <small>${product.name}</small>
            <small>${sale.customer} | ${sale.date} | ${sale.qty.toLocaleString("th-TH")} ชิ้น</small>
          </div>
          <span class="sale-amount">${money(product.price * sale.qty)}</span>
          <div class="sale-actions">
            <button class="secondary-button" type="button" data-edit-sale="${sale.order}">แก้ไข</button>
            <button class="danger-button" type="button" data-delete-sale="${sale.order}">ลบ</button>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelector("#lastUpdated").textContent = `อัปเดตล่าสุด ${new Date().toLocaleString("th-TH")}`;
}

function render() {
  renderMetrics();
  renderProducts();
  renderManager();
  renderAlerts();
  renderTopSellers();
  renderShipments();
  renderSales();
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API request failed");
  }

  return response.json();
}

function syncProducts(nextProducts) {
  products.splice(0, products.length, ...nextProducts);
  hydrateCategoryFilter();
  render();
}

function syncSales(nextSales) {
  sales.splice(0, sales.length, ...nextSales);
}

function syncShipments(nextShipments) {
  shipments.splice(0, shipments.length, ...nextShipments);
}

async function loadDashboardFromDatabase() {
  try {
    const [databaseProducts, databaseSales, databaseShipments] = await Promise.all([
      apiRequest("/api/products"),
      apiRequest("/api/sales"),
      apiRequest("/api/shipments"),
    ]);

    syncProducts(databaseProducts);
    syncSales(databaseSales);
    syncShipments(databaseShipments);
    hydrateCategoryFilter();
    render();
    setManageStatus("โหลดข้อมูลจาก database แล้ว");
  } catch (error) {
    setManageStatus("ยังไม่ได้เชื่อมต่อ database: เปิดผ่าน Start SupplyPilot Web.bat");
  }
}

async function loadSessionUser() {
  try {
    const session = await apiRequest("/api/session");
    userBadge.textContent = `User: ${session.username}`;
  } catch (error) {
    userBadge.textContent = "User";
  }
}

function setVisible(element, shouldShow, display = "block") {
  if (!element) return;
  element.style.display = shouldShow ? display : "none";
}

function showView(viewName) {
  const view = viewName || "overview";
  const isOverview = view === "overview";
  const showProducts = isOverview || view === "products";
  const showAlerts = isOverview || view === "alerts";

  setVisible(viewBlocks.overview, isOverview, "grid");
  setVisible(viewBlocks.content, isOverview || view === "products" || view === "alerts", "grid");
  setVisible(viewBlocks.products, showProducts);
  setVisible(viewBlocks.sideStack, showAlerts, "grid");
  setVisible(viewBlocks.manage, isOverview || view === "manage");
  setVisible(viewBlocks.imports, isOverview || view === "imports");
  setVisible(viewBlocks.sales, isOverview || view === "sales");

  if (viewBlocks.products) {
    viewBlocks.products.style.gridColumn = view === "products" ? "1 / -1" : "";
  }

  if (viewBlocks.sideStack) {
    viewBlocks.sideStack.style.gridColumn = view === "alerts" ? "1 / -1" : "";
  }
}

function setManageStatus(message) {
  manageStatus.textContent = message;
}

function setTrackingStatus(message) {
  if (trackingStatusText) {
    trackingStatusText.textContent = message;
  }
}

function setSalesStatus(message) {
  if (salesStatus) {
    salesStatus.textContent = message;
  }
}

function renderSalesControls() {
  if (!saleProductSelect) return;

  const selectedSku = saleProductSelect.value || products[0]?.sku || "";
  saleProductSelect.innerHTML = products
    .map((product) => `<option value="${product.sku}">${product.sku} - ${product.name} (${product.stock} คงเหลือ)</option>`)
    .join("");

  if (selectedSku) {
    saleProductSelect.value = selectedSku;
  }

  if (saleDate && !saleDate.value) {
    saleDate.value = new Date().toISOString().slice(0, 10);
  }
}

function resetSaleForm() {
  if (!salesForm) return;

  salesForm.reset();
  editingOrderNo.value = "";
  salesFormTitle.textContent = "เพิ่มยอดขาย";
  saleQty.value = "1";
  saleCustomer.value = "Walk-in";
  saleDate.value = new Date().toISOString().slice(0, 10);
  renderSalesControls();
}

function numberFromInput(selector) {
  return Number(document.querySelector(selector).value || 0);
}

async function addProduct(event) {
  event.preventDefault();

  const sku = document.querySelector("#newSku").value.trim().toUpperCase();

  if (products.some((product) => product.sku === sku)) {
    setManageStatus(`SKU ${sku} มีอยู่แล้ว`);
    return;
  }

  const payload = {
    sku,
    name: document.querySelector("#newName").value.trim(),
    category: document.querySelector("#newCategory").value,
    supplier: document.querySelector("#newSupplier").value.trim(),
    price: numberFromInput("#newPrice"),
    cost: numberFromInput("#newCost"),
    stock: numberFromInput("#newStock"),
    reorderPoint: numberFromInput("#newReorder"),
  };

  try {
    const result = await apiRequest("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    productForm.reset();
    syncProducts(result.products);
    setManageStatus(`เพิ่มสินค้า ${sku} ลง database แล้ว`);
  } catch (error) {
    products.push({ ...payload, sold: 0 });
    productForm.reset();
    hydrateCategoryFilter();
    render();
    setManageStatus(`เพิ่มสินค้า ${sku} เฉพาะในหน้าเว็บ เพราะยังไม่ต่อ server`);
  }
}

async function adjustStock() {
  const sku = stockProductSelect.value;
  const product = productBySku(sku);
  const qty = Math.max(0, Number(document.querySelector("#stockQty").value || 0));
  const action = document.querySelector("#stockAction").value;

  if (!product) return;

  try {
    const result = await apiRequest("/api/stock", {
      method: "POST",
      body: JSON.stringify({ sku, qty, action }),
    });

    syncProducts(result.products);
    stockProductSelect.value = sku;
    setManageStatus(`อัปเดต stock ของ ${product.name} ใน database แล้ว`);
  } catch (error) {
    if (action === "add") {
      product.stock += qty;
    }

    if (action === "remove") {
      product.stock = Math.max(0, product.stock - qty);
    }

    if (action === "set") {
      product.stock = qty;
    }

    render();
    stockProductSelect.value = sku;
    setManageStatus(`อัปเดต stock เฉพาะในหน้าเว็บ เพราะยังไม่ต่อ server`);
  }
}

async function deleteProduct(sku) {
  const productIndex = products.findIndex((product) => product.sku === sku);

  if (productIndex < 0) return;

  const removedProduct = products[productIndex];

  try {
    const result = await apiRequest(`/api/products/${encodeURIComponent(sku)}`, {
      method: "DELETE",
    });

    syncProducts(result.products);
    setManageStatus(`ลบ ${removedProduct.name} จาก database แล้ว`);
  } catch (error) {
    products.splice(productIndex, 1);

    for (let index = sales.length - 1; index >= 0; index -= 1) {
      if (sales[index].sku === sku) {
        sales.splice(index, 1);
      }
    }

    hydrateCategoryFilter();
    render();
    setManageStatus(`ลบ ${removedProduct.name} เฉพาะในหน้าเว็บ เพราะยังไม่ต่อ server`);
  }
}

async function saveTrackingStatus(stageIndex) {
  const shipment = selectedShipment();
  if (!shipment) return;

  const nextStage = Math.max(0, Math.min(Number(stageIndex), shipment.stages.length - 1));

  try {
    const result = await apiRequest("/api/shipments/status", {
      method: "POST",
      body: JSON.stringify({
        shipmentNo: shipment.id,
        currentStage: nextStage,
      }),
    });

    syncShipments(result.shipments);
    render();
    trackingShipmentSelect.value = shipment.id;
    renderTrackingControls();
    setTrackingStatus(`อัปเดต ${shipment.id} เป็น ${shipment.stages[nextStage].label} แล้ว`);
  } catch (error) {
    setTrackingStatus("ยังบันทึกสถานะไม่ได้: ตรวจว่า server เปิดอยู่");
  }
}

async function addTrackingStage() {
  const shipment = selectedShipment();
  const stageName = document.querySelector("#newStageName").value.trim();
  const stageDate = document.querySelector("#newStageDate").value;

  if (!shipment || !stageName || !stageDate) {
    setTrackingStatus("กรอกชื่อขั้นตอนและวันที่ก่อนเพิ่มสถานะ");
    return;
  }

  try {
    const result = await apiRequest("/api/shipments/stages", {
      method: "POST",
      body: JSON.stringify({
        shipmentNo: shipment.id,
        label: stageName,
        date: stageDate,
      }),
    });

    document.querySelector("#newStageName").value = "";
    syncShipments(result.shipments);
    render();
    trackingShipmentSelect.value = shipment.id;
    renderTrackingControls();
    setTrackingStatus(`เพิ่มขั้นตอน ${stageName} ให้ ${shipment.id} แล้ว`);
  } catch (error) {
    setTrackingStatus("ยังเพิ่มขั้นตอนไม่ได้: ตรวจว่า server เปิดอยู่");
  }
}

async function removeLastTrackingStage() {
  const shipment = selectedShipment();
  if (!shipment || shipment.stages.length <= 1) {
    setTrackingStatus("ต้องเหลืออย่างน้อย 1 ขั้นตอน");
    return;
  }

  try {
    const result = await apiRequest(`/api/shipments/${encodeURIComponent(shipment.id)}/stages/last`, {
      method: "DELETE",
    });

    syncShipments(result.shipments);
    render();
    trackingShipmentSelect.value = shipment.id;
    renderTrackingControls();
    setTrackingStatus(`ลบขั้นตอนล่าสุดของ ${shipment.id} แล้ว`);
  } catch (error) {
    setTrackingStatus("ยังลบขั้นตอนไม่ได้: ตรวจว่า server เปิดอยู่");
  }
}

async function deleteShipment(shipmentNo) {
  const shipmentIndex = shipments.findIndex((shipment) => shipment.id === shipmentNo);
  if (shipmentIndex < 0) return;

  const shipment = shipments[shipmentIndex];
  const shouldDelete = window.confirm(`ลบ Shipment ${shipment.id} ใช่ไหม?`);
  if (!shouldDelete) return;

  try {
    const result = await apiRequest(`/api/shipments/${encodeURIComponent(shipment.id)}`, {
      method: "DELETE",
    });

    syncShipments(result.shipments);
    render();
    renderTrackingControls();
    setTrackingStatus(`ลบ Shipment ${shipment.id} แล้ว`);
  } catch (error) {
    shipments.splice(shipmentIndex, 1);
    render();
    renderTrackingControls();
    setTrackingStatus(`ลบ Shipment ${shipment.id} เฉพาะในหน้าเว็บ เพราะยังไม่ต่อ server`);
  }
}

async function addShipment(event) {
  event.preventDefault();

  const shipmentNo = document.querySelector("#shipmentNo").value.trim().toUpperCase();

  if (shipments.some((shipment) => shipment.id === shipmentNo)) {
    setTrackingStatus(`Shipment ${shipmentNo} มีอยู่แล้ว`);
    return;
  }

  const payload = {
    shipmentNo,
    title: document.querySelector("#shipmentTitle").value.trim(),
    originCity: document.querySelector("#shipmentOrigin").value.trim(),
    destination: document.querySelector("#shipmentDestination").value.trim(),
    mode: document.querySelector("#shipmentMode").value,
    eta: document.querySelector("#shipmentEta").value,
    units: Number(document.querySelector("#shipmentUnits").value || 0),
    firstStage: document.querySelector("#shipmentFirstStage").value.trim(),
    firstStageDate: document.querySelector("#shipmentFirstStageDate").value,
  };

  if (!payload.shipmentNo || !payload.title || !payload.originCity || !payload.destination || !payload.eta || !payload.firstStage) {
    setTrackingStatus("กรอกข้อมูล Shipment ให้ครบก่อนบันทึก");
    return;
  }

  try {
    const result = await apiRequest("/api/shipments", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    shipmentForm.reset();
    syncShipments(result.shipments);
    render();
    trackingShipmentSelect.value = shipmentNo;
    renderTrackingControls();
    setTrackingStatus(`เพิ่ม Shipment ${shipmentNo} แล้ว`);
  } catch (error) {
    setTrackingStatus("ยังเพิ่ม Shipment ไม่ได้: ตรวจว่า server เปิดอยู่");
  }
}

async function saveSale(event) {
  event.preventDefault();

  const payload = {
    sku: saleProductSelect.value,
    qty: Number(saleQty.value || 1),
    customer: saleCustomer.value.trim() || "Walk-in",
    date: saleDate.value || new Date().toISOString().slice(0, 10),
  };
  const orderNo = editingOrderNo.value;

  try {
    const result = await apiRequest(orderNo ? `/api/sales/${encodeURIComponent(orderNo)}` : "/api/sales", {
      method: orderNo ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    syncProducts(result.products);
    syncSales(result.sales);
    resetSaleForm();
    render();
    showView("sales");
    setSalesStatus(orderNo ? `แก้ไขยอดขาย ${orderNo} แล้ว` : "บันทึกยอดขายแล้ว");
  } catch (error) {
    setSalesStatus(`ยังบันทึกยอดขายไม่ได้: ${error.message}`);
  }
}

function editSale(orderNo) {
  const sale = sales.find((item) => item.order === orderNo);
  if (!sale) return;

  editingOrderNo.value = sale.order;
  salesFormTitle.textContent = `แก้ไขยอดขาย ${sale.order}`;
  saleProductSelect.value = sale.sku;
  saleQty.value = sale.qty;
  saleCustomer.value = sale.customer;
  saleDate.value = sale.date;
  setSalesStatus("กำลังแก้ไขรายการยอดขาย");
  salesForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteSale(orderNo) {
  const sale = sales.find((item) => item.order === orderNo);
  if (!sale || !window.confirm(`ลบยอดขาย ${orderNo} ใช่ไหม?`)) return;

  try {
    const result = await apiRequest(`/api/sales/${encodeURIComponent(orderNo)}`, {
      method: "DELETE",
    });

    syncProducts(result.products);
    syncSales(result.sales);
    resetSaleForm();
    render();
    showView("sales");
    setSalesStatus(`ลบยอดขาย ${orderNo} แล้ว`);
  } catch (error) {
    setSalesStatus(`ยังลบยอดขายไม่ได้: ${error.message}`);
  }
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderProducts();
});

categoryFilter.addEventListener("change", (event) => {
  state.category = event.target.value;
  renderProducts();
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login";
});
productForm.addEventListener("submit", addProduct);
adjustStockBtn.addEventListener("click", adjustStock);
salesForm.addEventListener("submit", saveSale);
cancelSaleEditBtn.addEventListener("click", resetSaleForm);
document.querySelector("#salesList").addEventListener("click", (event) => {
  const editOrderNo = event.target.dataset.editSale;
  const deleteOrderNo = event.target.dataset.deleteSale;

  if (editOrderNo) editSale(editOrderNo);
  if (deleteOrderNo) deleteSale(deleteOrderNo);
});
trackingShipmentSelect.addEventListener("change", renderTrackingControls);
trackingStatusForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveTrackingStatus(trackingStageSelect.value);
});
trackingPrevBtn.addEventListener("click", () => {
  saveTrackingStatus(Number(trackingStageSelect.value) - 1);
});
trackingNextBtn.addEventListener("click", () => {
  saveTrackingStatus(Number(trackingStageSelect.value) + 1);
});
addStageBtn.addEventListener("click", addTrackingStage);
removeStageBtn.addEventListener("click", removeLastTrackingStage);
shipmentForm.addEventListener("submit", addShipment);
document.querySelector("#shipmentList").addEventListener("click", (event) => {
  const deleteShipmentNo = event.target.dataset.deleteShipment;

  if (deleteShipmentNo) {
    deleteShipment(deleteShipmentNo);
  }
});
manageTable.addEventListener("click", (event) => {
  const deleteSku = event.target.dataset.deleteSku;

  if (deleteSku) {
    deleteProduct(deleteSku);
  }
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const viewName = link.getAttribute("href").replace("#", "");

    document.querySelectorAll(".nav a").forEach((navLink) => {
      navLink.classList.remove("active");
    });

    link.classList.add("active");
    showView(viewName);
  });
});

hydrateCategoryFilter();
render();
showView("overview");
loadDashboardFromDatabase();
loadSessionUser();
