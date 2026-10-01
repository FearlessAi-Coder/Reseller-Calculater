
/* =====================================================
   RESELLPRO X 2.0 — APPLICATION ENGINE
   ===================================================== */

const STORAGE_KEY = "resellpro_x_2_data";

const defaultData = {
  currency: "MAD",
  products: [],
  sales: []
};

let data;

try {
  data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(defaultData);
} catch {
  data = structuredClone(defaultData);
}

data.products ||= [];
data.sales ||= [];
data.currency ||= "MAD";

let revenueChart = null;
let analyticsChart = null;
let toastTimer = null;

const $ = id => document.getElementById(id);

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function money(value) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: data.currency,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* NAVIGATION */

function navigate(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === `page-${page}`);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const titles = {
    dashboard: "Command Center",
    calculator: "Profit Calculator",
    products: "Products",
    sales: "Sales Activity",
    analytics: "Analytics",
    settings: "Settings"
  };

  const title = document.querySelector(".top-title");
  if (title) title.textContent = titles[page] || "ResellPro X";

  $("sidebar").classList.remove("open");

  if (page === "analytics") renderCharts();
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.go));
});

$("menuToggle").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

/* CALCULATOR */

function getCalculation() {
  const buy = Math.max(0, Number($("buyPrice").value) || 0);
  const sell = Math.max(0, Number($("sellPrice").value) || 0);
  const shipping = Math.max(0, Number($("shippingCost").value) || 0);
  const other = Math.max(0, Number($("otherCost").value) || 0);

  const cost = buy + shipping + other;
  const profit = sell - cost;

  return {
    buy, sell, shipping, other, cost, profit,
    margin: sell > 0 ? profit / sell * 100 : 0,
    roi: cost > 0 ? profit / cost * 100 : 0
  };
}

function calculate() {
  const result = getCalculation();

  $("calcProfit").textContent = money(result.profit);
  $("calcCost").textContent = money(result.cost);
  $("calcMargin").textContent = result.margin.toFixed(1) + "%";
  $("calcROI").textContent = result.roi.toFixed(1) + "%";
  $("calcRevenue").textContent = money(result.sell);

  $("calcProfit").className = result.profit >= 0 ? "green" : "profit-negative";

  $("calcMessage").textContent =
    result.sell <= 0
      ? "Enter your selling price to see your potential profit."
      : result.profit > 0
        ? "You're making " + money(result.profit) + " per item. Keep an eye on your costs!"
        : result.profit < 0
          ? "Warning: this product currently loses money."
          : "You're breaking even. There is no profit yet.";
}

$("calculateBtn").addEventListener("click", calculate);

["buyPrice", "sellPrice", "shippingCost", "otherCost"].forEach(id => {
  $(id).addEventListener("input", calculate);
});

/* MODALS */

function openModal(title, content) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = content;
  $("modal").classList.add("open");
}

function closeModal() {
  $("modal").classList.remove("open");
}

$("closeModal").addEventListener("click", closeModal);

$("modal").addEventListener("click", event => {
  if (event.target === $("modal")) closeModal();
});

/* PRODUCTS */

function showProductModal(product = null) {
  const editing = product !== null;

  openModal(editing ? "Edit product" : "Add a product", `
    <form id="productForm">
      <label>Product name
        <input id="productName" required maxlength="80" value="${escapeHTML(product?.name || "")}" placeholder="Product name">
      </label>
      <label>Buying price (${data.currency})
        <input id="productBuy" type="number" min="0" step="0.01" required value="${product?.buy ?? ""}">
      </label>
      <label>Selling price (${data.currency})
        <input id="productSell" type="number" min="0" step="0.01" required value="${product?.sell ?? ""}">
      </label>
      <label>Stock quantity
        <input id="productStock" type="number" min="0" step="1" required value="${product?.stock ?? 0}">
      </label>
      <div class="modal-actions">
        <button type="button" class="danger-btn" id="cancelProduct">Cancel</button>
        <button type="submit" class="primary-btn">${editing ? "Save changes" : "Add product"}</button>
      </div>
    </form>
  `);

  $("cancelProduct").addEventListener("click", closeModal);

  $("productForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("productName").value.trim();
    const buy = Number($("productBuy").value);
    const sell = Number($("productSell").value);
    const stock = Number($("productStock").value);

    if (!name || !Number.isFinite(buy) || !Number.isFinite(sell) ||
        !Number.isInteger(stock) || buy < 0 || sell < 0 || stock < 0) {
      notify("Please enter valid product details.");
      return;
    }

    if (editing) {
      const target = data.products.find(item => item.id === product.id);
      if (!target) return;
      Object.assign(target, { name, buy, sell, stock });
    } else {
      data.products.push({
        id: crypto.randomUUID(),
        name, buy, sell, stock
      });
    }

    saveData();
    closeModal();
    renderAll();
    notify(editing ? "Product updated!" : "Product added!");
  });
}

$("addProductBtn").addEventListener("click", () => showProductModal());

function renderProducts() {
  const body = $("productList");

  $("productCount").textContent = `${data.products.length} products`;

  if (!data.products.length) {
    body.innerHTML = `<tr><td colspan="5" class="empty-cell">No products yet. Add your first product.</td></tr>`;
    return;
  }

  body.innerHTML = data.products.map(product => `
    <tr>
      <td><strong>${escapeHTML(product.name)}</strong></td>
      <td>${money(product.buy)}</td>
      <td>${money(product.sell)}</td>
      <td>${product.stock}</td>
      <td>
        <button class="text-btn" data-edit-product="${product.id}">Edit</button>
        <button class="text-btn" data-delete-product="${product.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-edit-product]").forEach(button => {
    button.addEventListener("click", () => {
      const product = data.products.find(item => item.id === button.dataset.editProduct);
      if (product) showProductModal(product);
    });
  });

  body.querySelectorAll("[data-delete-product]").forEach(button => {
    button.addEventListener("click", () => {
      if (!confirm("Delete this product? Existing sales will remain recorded.")) return;
      data.products = data.products.filter(item => item.id !== button.dataset.deleteProduct);
      saveData();
      renderAll();
      notify("Product deleted.");
    });
  });
}

/* SALES */

function showSaleModal() {
  if (!data.products.length) {
    notify("Add a product before recording a sale.");
    navigate("products");
    return;
  }

  openModal("Record a sale", `
    <form id="saleForm">
      <label>Select product
        <select id="saleProduct" required>
          ${data.products.map(product => `<option value="${product.id}">${escapeHTML(product.name)} — ${money(product.sell)}</option>`).join("")}
        </select>
      </label>
      <label>Quantity sold
        <input id="saleQuantity" type="number" min="1" step="1" value="1" required>
      </label>
      <div class="modal-actions">
        <button type="button" class="danger-btn" id="cancelSale">Cancel</button>
        <button type="submit" class="primary-btn">Save sale</button>
      </div>
    </form>
  `);

  $("cancelSale").addEventListener("click", closeModal);

  $("saleForm").addEventListener("submit", event => {
    event.preventDefault();

    const product = data.products.find(item => item.id === $("saleProduct").value);
    const quantity = Number($("saleQuantity").value);

    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      notify("Enter a valid quantity.");
      return;
    }

    if (quantity > product.stock) {
      notify("Not enough stock available.");
      return;
    }

    const revenue = product.sell * quantity;
    const profit = (product.sell - product.buy) * quantity;

    product.stock -= quantity;

    data.sales.push({
      id: crypto.randomUUID(),
      name: product.name,
      quantity,
      revenue,
      profit,
      date: new Date().toISOString()
    });

    saveData();
    closeModal();
    renderAll();
    notify("Sale successfully recorded!");
  });
}

$("addSaleBtn").addEventListener("click", showSaleModal);

function renderSales() {
  const body = $("salesList");

  if (!data.sales.length) {
    body.innerHTML = `<tr><td colspan="6" class="empty-cell">No sales recorded yet.</td></tr>`;
    return;
  }

  body.innerHTML = [...data.sales].reverse().map(sale => `
    <tr>
      <td><strong>${escapeHTML(sale.name)}</strong></td>
      <td>${new Date(sale.date).toLocaleDateString()}</td>
      <td>${sale.quantity}</td>
      <td>${money(sale.revenue)}</td>
      <td class="${sale.profit >= 0 ? "profit-positive" : "profit-negative"}">${money(sale.profit)}</td>
      <td><button class="text-btn" data-delete-sale="${sale.id}">Delete</button></td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-delete-sale]").forEach(button => {
    button.addEventListener("click", () => {
      if (!confirm("Delete this sale record? Inventory will not be changed.")) return;
      data.sales = data.sales.filter(sale => sale.id !== button.dataset.deleteSale);
      saveData();
      renderAll();
      notify("Sale record deleted.");
    });
  });
}

/* DASHBOARD */

function getTotals() {
  return data.sales.reduce((totals, sale) => {
    totals.revenue += sale.revenue;
    totals.profit += sale.profit;
    totals.units += sale.quantity;
    return totals;
  }, { revenue: 0, profit: 0, units: 0 });
}

function renderDashboard() {
  const totals = getTotals();

  $("totalRevenue").textContent = money(totals.revenue);
  $("totalProfit").textContent = money(totals.profit);
  $("totalProducts").textContent = data.products.length;
  $("totalSales").textContent = data.sales.length;

  const recent = [...data.sales].reverse().slice(0, 5);

  $("recentSales").innerHTML = recent.length
    ? recent.map(sale => `
      <tr>
        <td><strong>${escapeHTML(sale.name)}</strong></td>
        <td>${new Date(sale.date).toLocaleDateString()}</td>
        <td>${money(sale.revenue)}</td>
        <td class="${sale.profit >= 0 ? "profit-positive" : "profit-negative"}">${money(sale.profit)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4" class="empty-cell">Your recent sales will appear here.</td></tr>`;
}

/* ANALYTICS */

function chartConfig(canvasId, days) {
  const labels = [];
  const revenue = [];
  const profit = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    labels.push(date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }));

    const matching = data.sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.toDateString() === date.toDateString();
    });

    revenue.push(matching.reduce((sum, sale) => sum + sale.revenue, 0));
    profit.push(matching.reduce((sum, sale) => sum + sale.profit, 0));
  }

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue",
          data: revenue,
          borderColor: "#35e58a",
          backgroundColor: "rgba(53,229,138,.10)",
          fill: true,
          tension: .4,
          pointRadius: 3
        },
        {
          label: "Profit",
          data: profit,
          borderColor: "#69a9ff",
          backgroundColor: "transparent",
          tension: .4,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: {
          labels: { color: "#a0ada4", usePointStyle: true, boxWidth: 7 }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,.035)" },
          ticks: { color: "#849188", maxRotation: 0 }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,.055)" },
          ticks: {
            color: "#849188",
            callback: value => new Intl.NumberFormat("en", {
              notation: "compact"
            }).format(value)
          }
        }
      }
    }
  };
}

function renderCharts() {
  if (typeof Chart === "undefined") return;

  const dashboardCanvas = $("revenueChart");
  const analyticsCanvas = $("analyticsChart");

  if (dashboardCanvas) {
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(dashboardCanvas, chartConfig("revenueChart", 7));
  }

  if (analyticsCanvas) {
    if (analyticsChart) analyticsChart.destroy();
    analyticsChart = new Chart(analyticsCanvas, chartConfig("analyticsChart", 30));
  }
}

function renderAnalytics() {
  const totals = getTotals();

  $("analyticsRevenue").textContent = money(totals.revenue);
  $("analyticsProfit").textContent = money(totals.profit);
  $("averageSale").textContent = money(data.sales.length ? totals.revenue / data.sales.length : 0);
  $("unitsSold").textContent = totals.units;
}

/* SETTINGS */

$("currencySelect").addEventListener("change", event => {
  data.currency = event.target.value;
  saveData();
  renderAll();
  notify("Currency updated.");
});

$("clearDataBtn").addEventListener("click", () => {
  if (!confirm("Permanently delete all products and sales saved in this browser?")) return;

  data.products = [];
  data.sales = [];
  saveData();
  renderAll();
  notify("Workspace data cleared.");
});

/* MAIN RENDER */

function renderAll() {
  $("currencySelect").value = data.currency;
  renderDashboard();
  renderProducts();
  renderSales();
  renderAnalytics();
  renderCharts();
}

/* START */

renderAll();
calculate();
