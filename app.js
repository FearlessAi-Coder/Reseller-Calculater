
"use strict";

/* RESELLPRO X — BUSINESS COMMAND CENTER */

const $ = id => document.getElementById(id);
const STORAGE_KEY = "resellpro_x_workspace_v1";

const defaultData = {
  currency: "MAD",
  products: [],
  sales: []
};

let data = loadData();
let lastCalculation = null;

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return structuredClone(defaultData);
    return {
      currency: saved.currency || "MAD",
      products: Array.isArray(saved.products) ? saved.products : [],
      sales: Array.isArray(saved.sales) ? saved.sales : []
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    showToast("Could not save data in this browser.");
  }
}

function money(value) {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: data.currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return amount.toFixed(2) + " " + data.currency;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#039;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function navigate(page) {
  const target = $("page-" + page);
  if (!target) return;

  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });

  target.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    calculator: "Profit calculator",
    products: "Products",
    sales: "Sales",
    analytics: "Analytics",
    settings: "Settings"
  };

  document.querySelector(".top-title").textContent = titles[page] || "Dashboard";
  $("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal(title, html) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = html;
  $("modal").classList.add("open");
}

function closeModal() {
  $("modal").classList.remove("open");
  $("modalBody").innerHTML = "";
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function totalRevenue() {
  return data.sales.reduce((sum, sale) => sum + sale.revenue, 0);
}

function totalProfit() {
  return data.sales.reduce((sum, sale) => sum + sale.profit, 0);
}

function totalUnits() {
  return data.sales.reduce((sum, sale) => sum + sale.quantity, 0);
}

function renderDashboard() {
  $("totalRevenue").textContent = money(totalRevenue());
  $("totalProfit").textContent = money(totalProfit());
  $("totalProducts").textContent = data.products.length;
  $("totalSales").textContent = data.sales.length;

  const recent = [...data.sales]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  $("recentSales").innerHTML = recent.length
    ? recent.map(sale => `
      <tr>
        <td class="product-name">${escapeHTML(sale.productName)}</td>
        <td>${escapeHTML(sale.date)}</td>
        <td>${money(sale.revenue)}</td>
        <td>${money(sale.profit)}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" class="empty-cell">No sales yet. Record your first sale.</td></tr>`;

  renderChart($("revenueChart"));
}

function renderProducts() {
  $("productCount").textContent = data.products.length;

  $("productList").innerHTML = data.products.length
    ? data.products.map(product => `
      <tr>
        <td><span class="product-name">${escapeHTML(product.name)}</span></td>
        <td>${money(product.buyPrice)}</td>
        <td>${money(product.sellPrice)}</td>
        <td class="${product.stock <= 3 ? "stock-low" : "stock-good"}">${product.stock}</td>
        <td>
          <button class="action-btn" data-edit-product="${product.id}">Edit</button>
          <button class="action-btn delete" data-delete-product="${product.id}">Delete</button>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty-cell">No products yet. Add your first product.</td></tr>`;
}

function renderSales() {
  $("salesRevenue").textContent = money(totalRevenue());
  $("salesProfit").textContent = money(totalProfit());

  const sorted = [...data.sales].sort((a, b) => b.createdAt - a.createdAt);

  $("salesList").innerHTML = sorted.length
    ? sorted.map(sale => `
      <tr>
        <td><span class="product-name">${escapeHTML(sale.productName)}</span></td>
        <td>${escapeHTML(sale.date)}</td>
        <td>${sale.quantity}</td>
        <td>${money(sale.revenue)}</td>
        <td>${money(sale.profit)}</td>
        <td><button class="action-btn delete" data-delete-sale="${sale.id}">Delete</button></td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="empty-cell">No sales recorded yet.</td></tr>`;
}

function renderAnalytics() {
  $("analyticsRevenue").textContent = money(totalRevenue());
  $("analyticsProfit").textContent = money(totalProfit());

  const average = data.sales.length ? totalRevenue() / data.sales.length : 0;
  $("averageSale").textContent = money(average);
  $("unitsSold").textContent = totalUnits();

  renderChart($("analyticsChart"));
}

function renderChart(container) {
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const key = date.toLocaleDateString("en-CA");
    const value = data.sales
      .filter(sale => sale.dateKey === key)
      .reduce((sum, sale) => sum + sale.revenue, 0);

    days.push({
      label: date.toLocaleDateString("en", { weekday: "short" }),
      value
    });
  }

  const max = Math.max(...days.map(day => day.value), 1);

  if (!data.sales.length) {
    container.innerHTML = `<div class="empty-chart">Record sales to see your revenue chart.</div>`;
    return;
  }

  container.innerHTML = days.map(day => {
    const height = Math.max(3, (day.value / max) * 145);
    return `
      <div class="chart-column">
        <span class="chart-value">${day.value ? escapeHTML(money(day.value)) : ""}</span>
        <div class="chart-bar" style="height:${height}px"></div>
        <small>${day.label}</small>
      </div>`;
  }).join("");
}

function renderAll() {
  renderDashboard();
  renderProducts();
  renderSales();
  renderAnalytics();
  $("currencySelect").value = data.currency;
}

/* CALCULATOR */

function calculateProfit() {
  const name = $("calcName").value.trim();
  const buy = Number($("buyPrice").value);
  const sell = Number($("sellPrice").value);
  const shipping = Number($("shippingCost").value || 0);
  const other = Number($("otherCost").value || 0);

  const message = $("calcMessage");

  if (
    $("buyPrice").value === "" ||
    $("sellPrice").value === "" ||
    !Number.isFinite(buy) ||
    !Number.isFinite(sell) ||
    !Number.isFinite(shipping) ||
    !Number.isFinite(other) ||
    buy < 0 || sell < 0 || shipping < 0 || other < 0
  ) {
    message.textContent = "Enter valid, non-negative prices and costs.";
    showToast("Check the numbers you entered.");
    return;
  }

  const cost = buy + shipping + other;
  const profit = sell - cost;
  const margin = sell > 0 ? (profit / sell) * 100 : 0;
  const roi = cost > 0 ? (profit / cost) * 100 : 0;

  lastCalculation = { name, buy, sell, shipping, other, cost, profit, margin, roi };

  $("calcProfit").textContent = money(profit);
  $("calcCost").textContent = money(cost);
  $("calcRevenue").textContent = money(sell);
  $("calcMargin").textContent = margin.toFixed(1) + "%";
  $("calcROI").textContent = roi.toFixed(1) + "%";

  $("calcProfit").style.color = profit >= 0 ? "var(--green)" : "var(--red)";
  $("calcMessageResult").textContent =
    profit > 0 ? "This item makes a profit." :
    profit < 0 ? "This item would make a loss." :
    "This item breaks even.";

  message.textContent = "Calculation updated successfully.";
}

/* PRODUCTS */

function showProductForm(product = null) {
  const editing = Boolean(product);

  openModal(editing ? "Edit product" : "Add a product", `
    <form class="modal-form" id="productForm">
      <label>Product name
        <input name="name" required maxlength="80" placeholder="e.g. Wireless earbuds" value="${escapeHTML(product?.name || "")}">
      </label>
      <label>Buying price (${data.currency})
        <input name="buyPrice" type="number" min="0" step="0.01" required placeholder="0.00" value="${product?.buyPrice ?? ""}">
      </label>
      <label>Selling price (${data.currency})
        <input name="sellPrice" type="number" min="0" step="0.01" required placeholder="0.00" value="${product?.sellPrice ?? ""}">
      </label>
      <label>Stock quantity
        <input name="stock" type="number" min="0" step="1" required placeholder="0" value="${product?.stock ?? ""}">
      </label>
      <button class="primary-btn" type="submit">${editing ? "Save changes" : "Add product"}</button>
    </form>
  `);

  $("productForm").addEventListener("submit", event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const buyPrice = Number(form.get("buyPrice"));
    const sellPrice = Number(form.get("sellPrice"));
    const stock = Number(form.get("stock"));

    if (!name || !Number.isFinite(buyPrice) || !Number.isFinite(sellPrice) ||
        !Number.isInteger(stock) || buyPrice < 0 || sellPrice < 0 || stock < 0) {
      showToast("Please enter valid product details.");
      return;
    }

    if (editing) {
      Object.assign(product, { name, buyPrice, sellPrice, stock });
    } else {
      data.products.push({
        id: newId(), name, buyPrice, sellPrice, stock
      });
    }

    saveData();
    renderAll();
    closeModal();
    showToast(editing ? "Product updated." : "Product added.");
  });
}

function deleteProduct(id) {
  const product = data.products.find(item => item.id === id);
  if (!product) return;

  if (!confirm(`Delete "${product.name}" from your products?`)) return;

  data.products = data.products.filter(item => item.id !== id);
  saveData();
  renderAll();
  showToast("Product deleted.");
}

/* SALES */

function showSaleForm() {
  if (!data.products.length) {
    showToast("Add a product before recording a sale.");
    navigate("products");
    return;
  }

  const options = data.products.map(product => `
    <option value="${product.id}" ${product.stock < 1 ? "disabled" : ""}>
      ${escapeHTML(product.name)} — ${product.stock} in stock
    </option>
  `).join("");

  openModal("Record a sale", `
    <form class="modal-form" id="saleForm">
      <label>Choose product
        <select name="productId" required>${options}</select>
      </label>
      <label>Quantity sold
        <input name="quantity" type="number" min="1" step="1" required value="1">
      </label>
      <p class="muted">The sale uses the product's current selling price and buying price. Shipping and other costs saved in the calculator are not automatically included.</p>
      <button class="primary-btn" type="submit">Record transaction</button>
    </form>
  `);

  $("saleForm").addEventListener("submit", event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const product = data.products.find(item => item.id === form.get("productId"));
    const quantity = Number(form.get("quantity"));

    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      showToast("Enter a valid quantity.");
      return;
    }

    if (quantity > product.stock) {
      showToast("You don't have enough stock for that sale.");
      return;
    }

    const revenue = product.sellPrice * quantity;
    const profit = (product.sellPrice - product.buyPrice) * quantity;
    const now = new Date();

    data.sales.push({
      id: newId(),
      productId: product.id,
      productName: product.name,
      quantity,
      revenue,
      profit,
      date: now.toLocaleDateString(),
      dateKey: now.toLocaleDateString("en-CA"),
      createdAt: Date.now()
    });

    product.stock -= quantity;

    saveData();
    renderAll();
    closeModal();
    showToast("Sale recorded and stock updated.");
  });
}

function deleteSale(id) {
  const sale = data.sales.find(item => item.id === id);
  if (!sale) return;

  if (!confirm("Delete this sale? The product stock will be restored.")) return;

  const product = data.products.find(item => item.id === sale.productId);
  if (product) product.stock += sale.quantity;

  data.sales = data.sales.filter(item => item.id !== id);

  saveData();
  renderAll();
  showToast("Sale deleted and stock restored.");
}

/* EVENT LISTENERS */

document.addEventListener("click", event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    navigate(pageButton.dataset.page);
    return;
  }

  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    navigate(goButton.dataset.go);
    return;
  }

  const editButton = event.target.closest("[data-edit-product]");
  if (editButton) {
    const product = data.products.find(item => item.id === editButton.dataset.editProduct);
    if (product) showProductForm(product);
    return;
  }

  const deleteProductButton = event.target.closest("[data-delete-product]");
  if (deleteProductButton) {
    deleteProduct(deleteProductButton.dataset.deleteProduct);
    return;
  }

  const deleteSaleButton = event.target.closest("[data-delete-sale]");
  if (deleteSaleButton) {
    deleteSale(deleteSaleButton.dataset.deleteSale);
  }
});

$("menuToggle").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

$("addProductBtn").addEventListener("click", () => showProductForm());
$("addSaleBtn").addEventListener("click", showSaleForm);
$("calculateBtn").addEventListener("click", calculateProfit);
$("closeModal").addEventListener("click", closeModal);

$("modal").addEventListener("click", event => {
  if (event.target === $("modal")) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

$("currencySelect").addEventListener("change", event => {
  data.currency = event.target.value;
  saveData();
  renderAll();
  showToast("Currency updated.");
});

$("clearDataBtn").addEventListener("click", () => {
  const confirmed = confirm(
    "This will permanently delete all products and sales saved in this browser. Are you sure?"
  );

  if (!confirmed) return;

  data = structuredClone(defaultData);
  saveData();
  renderAll();
  showToast("Workspace data cleared.");
  navigate("dashboard");
});

/* START */

renderAll();
navigate("dashboard");

