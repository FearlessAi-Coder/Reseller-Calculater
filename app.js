
"use strict";

/* =====================================================
   RESELLPRO X 3.0 — COMPLETE APPLICATION
   No external JavaScript libraries required.
===================================================== */

const $ = (id) => document.getElementById(id);
const KEY = "resellprox_v3_data";

const freshData = () => ({
  products: [],
  sales: [],
  currency: "MAD"
});

function loadData() {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return freshData();

    const parsed = JSON.parse(saved);

    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      currency: parsed.currency || "MAD"
    };
  } catch (error) {
    console.error("Storage error:", error);
    return freshData();
  }
}

let db = loadData();
let toastTimer;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch (error) {
    console.error("Save failed:", error);
    notify("Could not save data in this browser.", "error");
    return false;
  }
}

function id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function cash(value) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: db.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num(value));
  } catch {
    return num(value).toFixed(2) + " " + db.currency;
  }
}

function dateToday() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function displayDate(value) {
  if (!value) return "—";
  const d = new Date(value + "T00:00:00");
  return Number.isNaN(d.getTime())
    ? safe(value)
    : d.toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric"
      });
}

function notify(message, type = "success") {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast show" + (type === "error" ? " error" : "");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

/* ---------------- NAVIGATION ---------------- */

const pageNames = {
  dashboard: "Overview",
  calculator: "Profit calculator",
  products: "Products",
  sales: "Sales",
  analytics: "Analytics",
  settings: "Settings"
};

function goTo(page) {
  if (!pageNames[page]) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === "page-" + page);
  });

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("topHeading").textContent = pageNames[page];
  $("sidebar").classList.remove("open");

  if (page === "dashboard" || page === "analytics") {
    renderCharts();
  }
}

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-page]");
  const go = event.target.closest("[data-go]");

  if (nav) {
    event.preventDefault();
    goTo(nav.dataset.page);
  }

  if (go) {
    event.preventDefault();
    goTo(go.dataset.go);
  }
});

$("mobileMenu").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

document.addEventListener("click", event => {
  const sidebar = $("sidebar");
  const menu = $("mobileMenu");

  if (
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !menu.contains(event.target)
  ) {
    sidebar.classList.remove("open");
  }
});

/* ---------------- MODAL ---------------- */

function openModal(title, html) {
  $("modalTitle").textContent = title;
  $("modalContent").innerHTML = html;
  $("modalLayer").classList.add("open");
  $("modalLayer").setAttribute("aria-hidden", "false");
}

function closeModal() {
  $("modalLayer").classList.remove("open");
  $("modalLayer").setAttribute("aria-hidden", "true");
  $("modalContent").innerHTML = "";
}

$("modalClose").addEventListener("click", closeModal);

$("modalLayer").addEventListener("click", event => {
  if (event.target === $("modalLayer")) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

/* ---------------- CALCULATOR ---------------- */

function getCalc() {
  const buy = Math.max(0, num($("calcBuy").value));
  const sell = Math.max(0, num($("calcSell").value));
  const shipping = Math.max(0, num($("calcShipping").value));
  const other = Math.max(0, num($("calcOther").value));
  const quantity = Math.max(1, Math.floor(num($("calcQuantity").value) || 1));

  const unitCost = buy + shipping + other;
  const revenue = sell * quantity;
  const cost = unitCost * quantity;
  const profit = revenue - cost;

  return {
    buy, sell, shipping, other, quantity,
    unitCost, revenue, cost, profit,
    unitProfit: sell - unitCost,
    margin: revenue ? profit / revenue * 100 : 0,
    roi: cost ? profit / cost * 100 : 0
  };
}

function calculate() {
  const v = getCalc();

  $("calcResultProfit").textContent = cash(v.profit);
  $("calcResultRevenue").textContent = cash(v.revenue);
  $("calcResultCost").textContent = cash(v.cost);
  $("calcResultMargin").textContent = v.margin.toFixed(1) + "%";
  $("calcResultROI").textContent = v.roi.toFixed(1) + "%";
  $("calcResultUnit").textContent = cash(v.unitProfit);

  $("calcResultProfit").style.color =
    v.profit < 0 ? "var(--red)" : "var(--green)";

  $("calcResultMessage").textContent =
    v.revenue === 0 && v.cost === 0
      ? "Enter your numbers to get started."
      : v.profit > 0
        ? "This product is making a profit."
        : v.profit < 0
          ? "Your costs are higher than your revenue."
          : "This product is breaking even.";
}

["calcBuy", "calcSell", "calcShipping", "calcOther", "calcQuantity"]
  .forEach(id => $(id).addEventListener("input", calculate));

$("runCalculator").addEventListener("click", () => {
  calculate();
  notify("Calculation updated.");
});

/* ---------------- PRODUCTS ---------------- */

function productForm(product = null) {
  const editing = Boolean(product);

  openModal(editing ? "Edit product" : "Add a product", `
    <form class="modal-form" id="productForm">
      <label>Product name
        <input name="name" required maxlength="100"
          placeholder="e.g. Wireless headphones"
          value="${safe(product?.name || "")}">
      </label>
      <label>Buying price (${safe(db.currency)})
        <input name="buy" type="number" min="0" step="0.01" required
          value="${editing ? num(product.buy) : ""}">
      </label>
      <label>Selling price (${safe(db.currency)})
        <input name="sell" type="number" min="0" step="0.01" required
          value="${editing ? num(product.sell) : ""}">
      </label>
      <label>Stock quantity
        <input name="stock" type="number" min="0" step="1" required
          value="${editing ? num(product.stock) : 1}">
      </label>
      <button class="button button-primary" type="submit">
        ${editing ? "Save changes" : "Add product"}
      </button>
    </form>
  `);

  $("productForm").addEventListener("submit", event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const buy = num(form.get("buy"));
    const sell = num(form.get("sell"));
    const stock = num(form.get("stock"));

    if (!name || buy < 0 || sell < 0 ||
        stock < 0 || !Number.isInteger(stock)) {
      notify("Check your product details.", "error");
      return;
    }

    if (editing) {
      product.name = name;
      product.buy = buy;
      product.sell = sell;
      product.stock = stock;
    } else {
      db.products.push({
        id: id(), name, buy, sell, stock
      });
    }

    save();
    closeModal();
    renderAll();
    notify(editing ? "Product updated." : "Product added.");
  });
}

function renderProducts() {
  const rows = $("productRows");

  if (!db.products.length) {
    rows.innerHTML = '<tr><td colspan="5" class="empty">No products yet. Add your first product.</td></tr>';
  } else {
    rows.innerHTML = db.products.map(p => `
      <tr>
        <td><strong>${safe(p.name)}</strong></td>
        <td>${cash(p.buy)}</td>
        <td>${cash(p.sell)}</td>
        <td>${num(p.stock)}</td>
        <td>
          <button class="table-action" data-edit-product="${safe(p.id)}">Edit</button>
          <button class="table-action delete" data-delete-product="${safe(p.id)}">Delete</button>
        </td>
      </tr>
    `).join("");
  }

  const units = db.products.reduce((sum, p) => sum + num(p.stock), 0);
  const value = db.products.reduce((sum, p) => sum + num(p.buy) * num(p.stock), 0);

  $("productTypes").textContent = db.products.length;
  $("stockUnits").textContent = units;
  $("stockValue").textContent = cash(value);
  $("productCount").textContent = db.products.length + " PRODUCTS";
  $("navProductCount").textContent = db.products.length;
}

$("newProduct").addEventListener("click", () => productForm());

$("productRows").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit-product]");
  const del = event.target.closest("[data-delete-product]");

  if (edit) {
    const product = db.products.find(p => p.id === edit.dataset.editProduct);
    if (product) productForm(product);
  }

  if (del) {
    const product = db.products.find(p => p.id === del.dataset.deleteProduct);
    if (!product) return;

    if (!confirm("Delete " + product.name + "? Historical sales will remain.")) return;

    db.products = db.products.filter(p => p.id !== product.id);
    save();
    renderAll();
    notify("Product deleted.");
  }
});

/* ---------------- SALES ---------------- */

function saleForm() {
  if (!db.products.length) {
    notify("Add a product before recording a sale.", "error");
    goTo("products");
    return;
  }

  const available = db.products.filter(p => num(p.stock) > 0);

  if (!available.length) {
    notify("There are no products with available stock.", "error");
    return;
  }

  const options = available.map(p =>
    `<option value="${safe(p.id)}">${safe(p.name)} — ${num(p.stock)} available</option>`
  ).join("");

  openModal("Record a sale", `
    <form class="modal-form" id="saleForm">
      <label>Choose product
        <select name="productId" id="saleProduct">${options}</select>
      </label>
      <div id="saleInfo" class="sale-product-info"></div>
      <label>Quantity
        <input name="quantity" type="number" min="1" step="1" value="1" required>
      </label>
      <label>Selling price per item (${safe(db.currency)})
        <input name="price" id="salePrice" type="number" min="0" step="0.01" required>
      </label>
      <label>Sale date
        <input name="date" type="date" value="${dateToday()}" required>
      </label>
      <button class="button button-primary" type="submit">Save sale</button>
    </form>
  `);

  const form = $("saleForm");
  const select = $("saleProduct");
  const price = $("salePrice");
  const info = $("saleInfo");

  function updateInfo() {
    const p = db.products.find(item => item.id === select.value);
    if (!p) return;

    price.value = num(p.sell);
    info.textContent = "Buying price: " + cash(p.buy) +
      " · Available stock: " + num(p.stock);
  }

  select.addEventListener("change", updateInfo);
  updateInfo();

  form.addEventListener("submit", event => {
    event.preventDefault();

    const p = db.products.find(item => item.id === select.value);
    const quantity = num(form.elements.quantity.value);
    const sellPrice = num(price.value);
    const date = form.elements.date.value;

    if (!p || !Number.isInteger(quantity) || quantity < 1 ||
        sellPrice < 0 || !date) {
      notify("Enter valid sale details.", "error");
      return;
    }

    if (quantity > num(p.stock)) {
      notify("Not enough stock available.", "error");
      return;
    }

    const revenue = sellPrice * quantity;
    const profit = (sellPrice - num(p.buy)) * quantity;

    db.sales.push({
      id: id(),
      productId: p.id,
      productName: p.name,
      quantity,
      sellPrice,
      unitCost: num(p.buy),
      revenue,
      profit,
      date
    });

    p.stock -= quantity;

    save();
    closeModal();
    renderAll();
    notify("Sale recorded successfully.");
  });
}

function renderSales() {
  const rows = $("saleRows");
  const sorted = [...db.sales].sort((a, b) => b.date.localeCompare(a.date));

  if (!sorted.length) {
    rows.innerHTML = '<tr><td colspan="6" class="empty">No sales recorded yet.</td></tr>';
  } else {
    rows.innerHTML = sorted.map(s => `
      <tr>
        <td><strong>${safe(s.productName)}</strong></td>
        <td>${displayDate(s.date)}</td>
        <td>${num(s.quantity)}</td>
        <td>${cash(s.revenue)}</td>
        <td>${cash(s.profit)}</td>
        <td><button class="table-action delete" data-delete-sale="${safe(s.id)}">Delete</button></td>
      </tr>
    `).join("");
  }

  const revenue = db.sales.reduce((sum, s) => sum + num(s.revenue), 0);
  const profit = db.sales.reduce((sum, s) => sum + num(s.profit), 0);
  const units = db.sales.reduce((sum, s) => sum + num(s.quantity), 0);

  $("salesRevenue").textContent = cash(revenue);
  $("salesProfit").textContent = cash(profit);
  $("salesUnits").textContent = units;
}

$("newSale").addEventListener("click", saleForm);

$("saleRows").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-sale]");
  if (!button) return;

  const sale = db.sales.find(s => s.id === button.dataset.deleteSale);
  if (!sale) return;

  if (!confirm("Delete this sale and return its quantity to stock?")) return;

  const product = db.products.find(p => p.id === sale.productId);
  if (product) product.stock += num(sale.quantity);

  db.sales = db.sales.filter(s => s.id !== sale.id);

  save();
  renderAll();
  notify("Sale deleted. Stock restored.");
});

/* ---------------- TOTALS + DASHBOARD ---------------- */

function totals() {
  const revenue = db.sales.reduce((sum, s) => sum + num(s.revenue), 0);
  const profit = db.sales.reduce((sum, s) => sum + num(s.profit), 0);
  const units = db.sales.reduce((sum, s) => sum + num(s.quantity), 0);

  return {
    revenue,
    profit,
    units,
    count: db.sales.length,
    average: db.sales.length ? revenue / db.sales.length : 0
  };
}

function renderDashboard() {
  const t = totals();

  $("dashRevenue").textContent = cash(t.revenue);
  $("dashProfit").textContent = cash(t.profit);
  $("dashProducts").textContent = db.products.length;
  $("dashSales").textContent = t.count;

  const recent = [...db.sales]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  $("recentSales").innerHTML = recent.length
    ? recent.map(s => `
      <tr>
        <td><strong>${safe(s.productName)}</strong></td>
        <td>${displayDate(s.date)}</td>
        <td>${num(s.quantity)}</td>
        <td>${cash(s.revenue)}</td>
        <td>${cash(s.profit)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5" class="empty">No sales yet. Your activity will appear here.</td></tr>';
}

/* ---------------- ANALYTICS ---------------- */

function renderAnalytics() {
  const t = totals();

  $("analyticsRevenue").textContent = cash(t.revenue);
  $("analyticsProfit").textContent = cash(t.profit);
  $("analyticsAverage").textContent = cash(t.average);
  $("analyticsUnits").textContent = t.units;

  const byProduct = {};

  db.sales.forEach(s => {
    const key = s.productId || s.productName;
    if (!byProduct[key]) {
      byProduct[key] = { name: s.productName, quantity: 0, revenue: 0 };
    }
    byProduct[key].quantity += num(s.quantity);
    byProduct[key].revenue += num(s.revenue);
  });

  const top = Object.values(byProduct)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  $("topProducts").innerHTML = top.length
    ? top.map((p, index) => `
      <div class="top-product">
        <div class="top-product-rank">${index + 1}</div>
        <div class="top-product-info">
          <strong>${safe(p.name)}</strong>
          <small>${p.quantity} units sold</small>
        </div>
        <div class="top-product-total">${cash(p.revenue)}</div>
      </div>
    `).join("")
    : '<p class="empty">Record sales to see product performance.</p>';
}

/* ---------------- CSS-ONLY CHARTS ---------------- */

function lastSevenDays() {
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);

    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");

    result.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      revenue: 0
    });
  }

  db.sales.forEach(s => {
    const day = result.find(d => d.key === s.date);
    if (day) day.revenue += num(s.revenue);
  });

  return result;
}

function chartHTML() {
  const days = lastSevenDays();
  const max = Math.max(1, ...days.map(d => d.revenue));

  return days.map(d => {
    const height = d.revenue ? Math.max(4, d.revenue / max * 100) : 3;

    return `
      <div class="chart-column" title="${safe(d.label)}: ${cash(d.revenue)}">
        <div class="chart-bar" style="height:${height}%"></div>
        <span class="chart-label">${safe(d.label)}</span>
      </div>
    `;
  }).join("");
}

function renderCharts() {
  const html = chartHTML();
  $("dashboardChart").innerHTML = html;
  $("analyticsChart").innerHTML = html;
}

/* ---------------- SETTINGS ---------------- */

$("currency").value = db.currency;

$("currency").addEventListener("change", () => {
  db.currency = $("currency").value;
  save();
  renderAll();
  notify("Currency changed to " + db.currency + ".");
});

$("clearData").addEventListener("click", () => {
  const confirmed = confirm(
    "Delete all products and sales saved in this browser? This cannot be undone."
  );

  if (!confirmed) return;

  const selectedCurrency = db.currency;
  db = freshData();
  db.currency = selectedCurrency;

  save();
  renderAll();
  notify("Workspace data cleared.");
});

/* ---------------- RENDER EVERYTHING ---------------- */

function renderAll() {
  $("currency").value = db.currency;
  renderDashboard();
  renderProducts();
  renderSales();
  renderAnalytics();
  renderCharts();
  calculate();
}

/* ---------------- START ---------------- */

function startApp() {
  renderAll();
  goTo("dashboard");
  console.log("ResellPro X 3.0 is ready.");
}

startApp();
