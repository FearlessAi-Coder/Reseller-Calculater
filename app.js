
/* =========================================================
   RESELLPRO X — BUSINESS COMMAND CENTER
   Complete app logic | Version 2.0
   Matches the supplied index.html
========================================================= */

"use strict";

/* -------------------- HELPERS -------------------- */

const $ = (id) => document.getElementById(id);

const makeId = () =>
  window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : "rp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

const money = (amount) => {
  const currency = data.settings.currency || "MAD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount) || 0);
  } catch {
    return (Number(amount) || 0).toFixed(2) + " " + currency;
  }
};

const number = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime())
    ? escapeHTML(value)
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
};

/* -------------------- DATA -------------------- */

const STORAGE_KEY = "resellpro_x_data_v2";

const defaultData = {
  products: [],
  sales: [],
  settings: {
    currency: "MAD"
  }
};

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...defaultData, settings: { ...defaultData.settings } };

    const parsed = JSON.parse(saved);

    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      settings: {
        currency: parsed.settings?.currency || "MAD"
      }
    };
  } catch (error) {
    console.error("Could not load saved data:", error);
    return { ...defaultData, settings: { ...defaultData.settings } };
  }
}

let data = loadData();
let revenueChart = null;
let analyticsChart = null;
let toastTimer = null;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    showToast("Could not save data. Check your browser storage.", "error");
    return false;
  }
}

/* -------------------- NOTIFICATIONS -------------------- */

function showToast(message, type = "success") {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast show " + type;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

/* -------------------- NAVIGATION -------------------- */

function showPage(pageName) {
  const validPages = [
    "dashboard",
    "calculator",
    "products",
    "sales",
    "analytics",
    "settings"
  ];

  if (!validPages.includes(pageName)) return;

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === "page-" + pageName);
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  const titles = {
    dashboard: "Command Center",
    calculator: "Profit Calculator",
    products: "Your Products",
    sales: "Sales Activity",
    analytics: "Analytics",
    settings: "Settings"
  };

  const title = document.querySelector(".top-title");
  if (title) title.textContent = titles[pageName];

  const sidebar = $("sidebar");
  if (sidebar) sidebar.classList.remove("open");

  document.body.classList.remove("menu-open");

  if (pageName === "analytics") renderCharts();
  if (pageName === "dashboard") renderRevenueChart();
}

function setupNavigation() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.go);
    });
  });

  const menuToggle = $("menuToggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const sidebar = $("sidebar");
      if (!sidebar) return;
      sidebar.classList.toggle("open");
      document.body.classList.toggle(
        "menu-open",
        sidebar.classList.contains("open")
      );
    });
  }

  document.addEventListener("click", (event) => {
    const sidebar = $("sidebar");
    const toggle = $("menuToggle");

    if (
      sidebar &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      toggle &&
      !toggle.contains(event.target)
    ) {
      sidebar.classList.remove("open");
      document.body.classList.remove("menu-open");
    }
  });
}

/* -------------------- CALCULATOR -------------------- */

function getCalculatorValues() {
  const buy = Math.max(0, number($("buyPrice")?.value));
  const sell = Math.max(0, number($("sellPrice")?.value));
  const shipping = Math.max(0, number($("shippingCost")?.value));
  const other = Math.max(0, number($("otherCost")?.value));

  const cost = buy + shipping + other;
  const profit = sell - cost;
  const margin = sell > 0 ? (profit / sell) * 100 : 0;
  const roi = cost > 0 ? (profit / cost) * 100 : 0;

  return { buy, sell, shipping, other, cost, profit, margin, roi };
}

function calculate() {
  const values = getCalculatorValues();

  if ($("calcProfit")) $("calcProfit").textContent = money(values.profit);
  if ($("calcCost")) $("calcCost").textContent = money(values.cost);
  if ($("calcMargin")) $("calcMargin").textContent = values.margin.toFixed(1) + "%";
  if ($("calcROI")) $("calcROI").textContent = values.roi.toFixed(1) + "%";
  if ($("calcRevenue")) $("calcRevenue").textContent = money(values.sell);

  const profitElement = $("calcProfit");
  if (profitElement) {
    profitElement.style.color = values.profit < 0 ? "#ff6464" : "";
  }

  const message = $("calcMessage");
  if (message) {
    if (values.sell === 0 && values.cost === 0) {
      message.textContent = "Enter your prices to see your potential profit.";
    } else if (values.profit > 0) {
      message.textContent = "You're making a profit on this item.";
    } else if (values.profit < 0) {
      message.textContent = "Your costs are higher than your selling price.";
    } else {
      message.textContent = "You're breaking even.";
    }
  }
}

function setupCalculator() {
  ["buyPrice", "sellPrice", "shippingCost", "otherCost"].forEach((id) => {
    const field = $(id);
    if (field) field.addEventListener("input", calculate);
  });

  const button = $("calculateBtn");
  if (button) {
    button.addEventListener("click", () => {
      calculate();
      showToast("Profit calculation updated.");
    });
  }
}

/* -------------------- MODAL SYSTEM -------------------- */

function openModal(title, content) {
  const modal = $("modal");
  const modalTitle = $("modalTitle");
  const modalBody = $("modalBody");

  if (!modal || !modalTitle || !modalBody) return;

  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = $("modal");
  if (!modal) return;

  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function setupModal() {
  const closeButton = $("closeModal");
  const modal = $("modal");

  if (closeButton) closeButton.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

/* -------------------- PRODUCTS -------------------- */

function renderProducts() {
  const list = $("productList");
  const count = $("productCount");

  if (!list) return;

  if (count) {
    count.textContent = data.products.length +
      (data.products.length === 1 ? " product" : " products");
  }

  if (data.products.length === 0) {
    list.innerHTML =
      '<tr><td colspan="5" class="empty-cell">No products yet. Add your first product.</td></tr>';
    return;
  }

  list.innerHTML = data.products.map((product) => `
    <tr>
      <td><strong>${escapeHTML(product.name)}</strong></td>
      <td>${money(product.buyPrice)}</td>
      <td>${money(product.sellPrice)}</td>
      <td>${number(product.stock)}</td>
      <td>
        <button class="text-btn" data-edit-product="${escapeHTML(product.id)}">Edit</button>
        <button class="text-btn" data-delete-product="${escapeHTML(product.id)}">Delete</button>
      </td>
    </tr>
  `).join("");
}

function productForm(product = null) {
  const editing = Boolean(product);

  openModal(editing ? "Edit product" : "Add a product", `
    <form id="productForm" class="modal-form">
      <label>Product name
        <input name="name" required maxlength="100"
          placeholder="e.g. Wireless headphones"
          value="${escapeHTML(product?.name || "")}">
      </label>

      <label>Buying price (${escapeHTML(data.settings.currency)})
        <input name="buyPrice" type="number" min="0" step="0.01" required
          value="${editing ? number(product.buyPrice) : ""}">
      </label>

      <label>Selling price (${escapeHTML(data.settings.currency)})
        <input name="sellPrice" type="number" min="0" step="0.01" required
          value="${editing ? number(product.sellPrice) : ""}">
      </label>

      <label>Stock quantity
        <input name="stock" type="number" min="0" step="1" required
          value="${editing ? number(product.stock) : "1"}">
      </label>

      <button class="primary-btn full-btn" type="submit">
        ${editing ? "Save changes" : "Add product"}
      </button>
    </form>
  `);

  const form = $("productForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const values = new FormData(form);
    const name = String(values.get("name") || "").trim();
    const buyPrice = number(values.get("buyPrice"));
    const sellPrice = number(values.get("sellPrice"));
    const stock = number(values.get("stock"));

    if (!name || buyPrice < 0 || sellPrice < 0 || stock < 0 ||
        !Number.isInteger(stock)) {
      showToast("Please enter valid product details.", "error");
      return;
    }

    if (editing) {
      product.name = name;
      product.buyPrice = buyPrice;
      product.sellPrice = sellPrice;
      product.stock = stock;
    } else {
      data.products.push({
        id: makeId(),
        name,
        buyPrice,
        sellPrice,
        stock,
        createdAt: today()
      });
    }

    saveData();
    closeModal();
    renderAll();
    showToast(editing ? "Product updated." : "Product added.");
  });
}

function deleteProduct(id) {
  const product = data.products.find((item) => item.id === id);
  if (!product) return;

  const usedInSales = data.sales.some((sale) => sale.productId === id);

  if (usedInSales) {
    showToast("This product has sales. Keep it to preserve your records.", "error");
    return;
  }

  if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

  data.products = data.products.filter((item) => item.id !== id);
  saveData();
  renderAll();
  showToast("Product deleted.");
}

function setupProducts() {
  const addButton = $("addProductBtn");
  if (addButton) addButton.addEventListener("click", () => productForm());

  const list = $("productList");
  if (!list) return;

  list.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-product]");
    const deleteButton = event.target.closest("[data-delete-product]");

    if (editButton) {
      const product = data.products.find(
        (item) => item.id === editButton.dataset.editProduct
      );
      if (product) productForm(product);
    }

    if (deleteButton) {
      deleteProduct(deleteButton.dataset.deleteProduct);
    }
  });
}

/* -------------------- SALES -------------------- */

function renderSales() {
  const list = $("salesList");
  if (!list) return;

  if (data.sales.length === 0) {
    list.innerHTML =
      '<tr><td colspan="6" class="empty-cell">No sales recorded yet.</td></tr>';
    return;
  }

  const sorted = [...data.sales].sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );

  list.innerHTML = sorted.map((sale) => `
    <tr>
      <td><strong>${escapeHTML(sale.productName)}</strong></td>
      <td>${formatDate(sale.date)}</td>
      <td>${number(sale.quantity)}</td>
      <td>${money(sale.revenue)}</td>
      <td>${money(sale.profit)}</td>
      <td><button class="text-btn" data-delete-sale="${escapeHTML(sale.id)}">Delete</button></td>
    </tr>
  `).join("");
}

function saleForm() {
  if (data.products.length === 0) {
    showToast("Add a product before recording a sale.", "error");
    showPage("products");
    return;
  }

  const options = data.products.map((product) => `
    <option value="${escapeHTML(product.id)}">
      ${escapeHTML(product.name)} — ${number(product.stock)} in stock
    </option>
  `).join("");

  openModal("Record a sale", `
    <form id="saleForm" class="modal-form">
      <label>Product
        <select name="productId" id="saleProduct" required>${options}</select>
      </label>

      <div class="sale-product-info" id="saleProductInfo"></div>

      <label>Quantity sold
        <input name="quantity" type="number" min="1" step="1" value="1" required>
      </label>

      <label>Selling price per item (${escapeHTML(data.settings.currency)})
        <input name="sellPrice" type="number" min="0" step="0.01" required>
      </label>

      <label>Date
        <input name="date" type="date" value="${today()}" required>
      </label>

      <button class="primary-btn full-btn" type="submit">Save sale</button>
    </form>
  `);

  const form = $("saleForm");
  const select = $("saleProduct");
  const priceInput = form?.elements.sellPrice;
  const quantityInput = form?.elements.quantity;

  function updateSaleInfo() {
    const product = data.products.find((item) => item.id === select.value);
    if (!product) return;

    priceInput.value = number(product.sellPrice);

    const info = $("saleProductInfo");
    if (info) {
      info.textContent =
        `Buying price: ${money(product.buyPrice)} · Available stock: ${number(product.stock)}`;
    }
  }

  if (select) {
    select.addEventListener("change", updateSaleInfo);
    updateSaleInfo();
  }

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const product = data.products.find(
      (item) => item.id === select.value
    );

    const quantity = number(quantityInput.value);
    const sellPrice = number(priceInput.value);
    const date = form.elements.date.value;

    if (!product || !Number.isInteger(quantity) || quantity < 1 ||
        sellPrice < 0 || !date) {
      showToast("Please enter valid sale details.", "error");
      return;
    }

    if (quantity > number(product.stock)) {
      showToast("Not enough stock available.", "error");
      return;
    }

    const unitCost = number(product.buyPrice);
    const revenue = sellPrice * quantity;
    const profit = (sellPrice - unitCost) * quantity;

    data.sales.push({
      id: makeId(),
      productId: product.id,
      productName: product.name,
      quantity,
      sellPrice,
      unitCost,
      revenue,
      profit,
      date
    });

    product.stock -= quantity;

    saveData();
    closeModal();
    renderAll();
    showToast("Sale recorded successfully.");
  });
}

function deleteSale(id) {
  const sale = data.sales.find((item) => item.id === id);
  if (!sale) return;

  if (!confirm("Delete this sale? Its quantity will be returned to stock.")) {
    return;
  }

  const product = data.products.find(
    (item) => item.id === sale.productId
  );

  if (product) {
    product.stock = number(product.stock) + number(sale.quantity);
  }

  data.sales = data.sales.filter((item) => item.id !== id);

  saveData();
  renderAll();
  showToast("Sale deleted and stock restored.");
}

function setupSales() {
  const addButton = $("addSaleBtn");
  if (addButton) addButton.addEventListener("click", saleForm);

  const list = $("salesList");
  if (!list) return;

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-sale]");
    if (button) deleteSale(button.dataset.deleteSale);
  });
}

/* -------------------- DASHBOARD -------------------- */

function getTotals() {
  const revenue = data.sales.reduce(
    (total, sale) => total + number(sale.revenue), 0
  );

  const profit = data.sales.reduce(
    (total, sale) => total + number(sale.profit), 0
  );

  const units = data.sales.reduce(
    (total, sale) => total + number(sale.quantity), 0
  );

  return {
    revenue,
    profit,
    units,
    salesCount: data.sales.length,
    averageSale: data.sales.length ? revenue / data.sales.length : 0
  };
}

function renderDashboard() {
  const totals = getTotals();

  if ($("totalRevenue")) $("totalRevenue").textContent = money(totals.revenue);
  if ($("totalProfit")) $("totalProfit").textContent = money(totals.profit);
  if ($("totalProducts")) $("totalProducts").textContent = data.products.length;
  if ($("totalSales")) $("totalSales").textContent = totals.salesCount;

  const recent = $("recentSales");
  if (!recent) return;

  const sorted = [...data.sales].sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  ).slice(0, 5);

  if (sorted.length === 0) {
    recent.innerHTML =
      '<tr><td colspan="4" class="empty-cell">Your recent sales will appear here.</td></tr>';
    return;
  }

  recent.innerHTML = sorted.map((sale) => `
    <tr>
      <td><strong>${escapeHTML(sale.productName)}</strong></td>
      <td>${formatDate(sale.date)}</td>
      <td>${money(sale.revenue)}</td>
      <td>${money(sale.profit)}</td>
    </tr>
  `).join("");
}

/* -------------------- ANALYTICS -------------------- */

function renderAnalytics() {
  const totals = getTotals();

  if ($("analyticsRevenue")) {
    $("analyticsRevenue").textContent = money(totals.revenue);
  }
  if ($("analyticsProfit")) {
    $("analyticsProfit").textContent = money(totals.profit);
  }
  if ($("averageSale")) {
    $("averageSale").textContent = money(totals.averageSale);
  }
  if ($("unitsSold")) {
    $("unitsSold").textContent = totals.units;
  }
}

/* -------------------- CHARTS -------------------- */

function getLastSevenDays() {
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    days.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      revenue: 0,
      profit: 0
    });
  }

  data.sales.forEach((sale) => {
    const day = days.find((item) => item.key === sale.date);
    if (day) {
      day.revenue += number(sale.revenue);
      day.profit += number(sale.profit);
    }
  });

  return days;
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#a8b5ae",
          usePointStyle: true,
          padding: 18
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#8b9991" },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#8b9991",
          callback: (value) => {
            const currency = data.settings.currency;
            return currency + " " + value;
          }
        },
        grid: { color: "rgba(255,255,255,0.07)" }
      }
    }
  };
}

function renderRevenueChart() {
  const canvas = $("revenueChart");
  if (!canvas || typeof Chart === "undefined") return;

  const days = getLastSevenDays();

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: days.map((day) => day.label),
      datasets: [{
        label: "Revenue",
        data: days.map((day) => day.revenue),
        borderColor: "#35e58a",
        backgroundColor: "rgba(53,229,138,0.12)",
        fill: true,
        tension: 0.4,
        pointRadius: 3
      }]
    },
    options: chartOptions()
  });
}

function renderCharts() {
  renderRevenueChart();

  const canvas = $("analyticsChart");
  if (!canvas || typeof Chart === "undefined") return;

  const days = getLastSevenDays();

  if (analyticsChart) analyticsChart.destroy();

  analyticsChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: days.map((day) => day.label),
      datasets: [
        {
          label: "Revenue",
          data: days.map((day) => day.revenue),
          backgroundColor: "rgba(53,229,138,0.75)",
          borderRadius: 5
        },
        {
          label: "Profit",
          data: days.map((day) => day.profit),
          backgroundColor: "rgba(93,157,255,0.65)",
          borderRadius: 5
        }
      ]
    },
    options: chartOptions()
  });
}

/* -------------------- SETTINGS -------------------- */

function setupSettings() {
  const currencySelect = $("currencySelect");

  if (currencySelect) {
    currencySelect.value = data.settings.currency;

    currencySelect.addEventListener("change", () => {
      data.settings.currency = currencySelect.value;
      saveData();
      renderAll();
      showToast("Currency updated to " + currencySelect.value + ".");
    });
  }

  const clearButton = $("clearDataBtn");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const confirmed = confirm(
        "This will permanently delete all products and sales saved in this browser. Continue?"
      );

      if (!confirmed) return;

      data = {
        products: [],
        sales: [],
        settings: {
          currency: data.settings.currency
        }
      };

      saveData();
      renderAll();
      showToast("Workspace data cleared.");
    });
  }
}

/* -------------------- FULL REFRESH -------------------- */

function renderAll() {
  renderDashboard();
  renderProducts();
  renderSales();
  renderAnalytics();
  renderRevenueChart();

  const currencySelect = $("currencySelect");
  if (currencySelect) {
    currencySelect.value = data.settings.currency;
  }

  calculate();
}

/* -------------------- START APPLICATION -------------------- */

function startResellPro() {
  setupNavigation();
  setupCalculator();
  setupModal();
  setupProducts();
  setupSales();
  setupSettings();

  renderAll();

  console.log("ResellPro X loaded successfully.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startResellPro);
} else {
  startResellPro();
}
