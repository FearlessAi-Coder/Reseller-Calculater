let currency = localStorage.getItem("resell_currency") || "MAD";

let products =
    JSON.parse(localStorage.getItem("resell_products") || "[]");

let sales =
    JSON.parse(localStorage.getItem("resell_sales") || "[]");


const currencySymbols = {
    MAD: "د.م.",
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "$",
    AUD: "$",
    CHF: "Fr",
    JPY: "¥"
};


function money(value) {

    const symbol = currencySymbols[currency] || currency;

    return `${Number(value || 0).toLocaleString(undefined,{
        maximumFractionDigits:2
    })} ${symbol}`;

}


function save() {

    localStorage.setItem(
        "resell_products",
        JSON.stringify(products)
    );

    localStorage.setItem(
        "resell_sales",
        JSON.stringify(sales)
    );

    localStorage.setItem(
        "resell_currency",
        currency
    );

}


function toast(message) {

    const box = document.getElementById("toast");

    box.textContent = message;

    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    },2200);

}


/* NAVIGATION */

function showPage(page) {

    document.querySelectorAll(".page")
        .forEach(p => p.classList.remove("active"));

    const target = document.getElementById(page);

    if (target) {
        target.classList.add("active");
    }

    document.querySelectorAll(".nav-item")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });

    const titles = {
        dashboard:"Dashboard",
        calculator:"Calculator",
        products:"Products",
        sales:"Sales",
        analytics:"Analytics",
        settings:"Settings"
    };

    document.getElementById("pageTitle").textContent =
        titles[page] || "Dashboard";

    window.scrollTo({
        top:0,
        behavior:"smooth"
    });

}


document.addEventListener("click", event => {

    const button =
        event.target.closest("[data-page]");

    if (!button) return;

    showPage(button.dataset.page);

});


/* CURRENCY */

function updateCurrency() {

    document.querySelectorAll(".currency-label")
        .forEach(el => {
            el.textContent = currency;
        });

    document.getElementById("currencySelect").value =
        currency;

    document.getElementById("settingsCurrency").value =
        currency;

    renderAll();

}


document.getElementById("currencySelect")
    .addEventListener("change", event => {

        currency = event.target.value;

        save();

        updateCurrency();

        toast("Currency changed to " + currency);

    });


document.getElementById("settingsCurrency")
    .addEventListener("change", event => {

        currency = event.target.value;

        save();

        updateCurrency();

        toast("Currency updated");

    });


/* CALCULATOR */

function calculate() {

    const cost =
        Number(document.getElementById("calcCost").value) || 0;

    const shipping =
        Number(document.getElementById("calcShipping").value) || 0;

    const packaging =
        Number(document.getElementById("calcPackaging").value) || 0;

    const other =
        Number(document.getElementById("calcOther").value) || 0;

    const price =
        Number(document.getElementById("calcPrice").value) || 0;

    const quantity =
        Number(document.getElementById("calcQuantity").value) || 0;


    const totalCost =
        cost + shipping + packaging + other;

    const profit =
        price - totalCost;

    const revenue =
        price * quantity;

    const totalProfit =
        profit * quantity;

    const margin =
        price > 0
        ? (profit / price) * 100
        : 0;


    document.getElementById("calcTotalProfit")
        .textContent = money(totalProfit);

    document.getElementById("calcProfit")
        .textContent = money(profit);

    document.getElementById("calcRevenue")
        .textContent = money(revenue);

    document.getElementById("calcBreakEven")
        .textContent = money(totalCost);

    document.getElementById("calcMargin")
        .textContent = margin.toFixed(1) + "%";


    const message =
        document.getElementById("calcMessage");


    if (profit < 0) {

        message.textContent =
            "⚠️ You're selling below your total cost.";

        message.style.color = "#ff8795";

    } else if (profit === 0) {

        message.textContent =
            "⚠️ You're breaking even.";

        message.style.color = "#ffc76b";

    } else {

        message.textContent =
            "🔥 You're making " +
            money(profit) +
            " per item.";

        message.style.color = "#8ee8b5";

    }

}


document.getElementById("calculateBtn")
    .addEventListener("click",calculate);


document.querySelectorAll("#calculator input")
    .forEach(input => {

        input.addEventListener(
            "input",
            calculate
        );

    });


/* PRODUCTS */

function addProduct() {

    const name =
        document.getElementById("productName").value.trim();

    const cost =
        Number(document.getElementById("productCost").value);

    const price =
        Number(document.getElementById("productPrice").value);

    const stock =
        Number(document.getElementById("productStock").value);


    if (!name || !cost || !price || stock < 0) {

        toast("Fill in all product details");

        return;

    }


    products.push({

        id: Date.now(),

        name,

        cost,

        price,

        stock,

        created: new Date().toISOString()

    });


    save();

    closeModal("productModal");

    document.getElementById("productName").value = "";
    document.getElementById("productCost").value = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productStock").value = "";

    renderAll();

    toast("Product added ✓");

}


document.getElementById("addProductBtn")
    .addEventListener("click",() => {

        openModal("productModal");

    });


document.getElementById("saveProduct")
    .addEventListener("click",addProduct);


function deleteProduct(id) {

    if (!confirm("Delete this product?")) return;

    products =
        products.filter(p => p.id !== id);

    save();

    renderAll();

    toast("Product deleted");

}


/* SALES */

function populateSaleProducts() {

    const select =
        document.getElementById("saleProduct");

    select.innerHTML =
        `<option value="">Choose a product</option>`;

    products.forEach(product => {

        if (product.stock <= 0) return;

        const option =
            document.createElement("option");

        option.value = product.id;

        option.textContent =
            `${product.name} — ${product.stock} available`;

        select.appendChild(option);

    });

}


function recordSale() {

    const productId =
        Number(document.getElementById("saleProduct").value);

    const quantity =
        Number(document.getElementById("saleQuantity").value);


    const product =
        products.find(p => p.id === productId);


    if (!product) {

        toast("Choose a product");

        return;

    }


    if (!quantity || quantity < 1) {

        toast("Enter a valid quantity");

        return;

    }


    if (quantity > product.stock) {

        toast("Not enough stock");

        return;

    }


    const revenue =
        product.price * quantity;

    const profit =
        (product.price - product.cost) * quantity;


    product.stock -= quantity;


    sales.unshift({

        id: Date.now(),

        productId,

        productName: product.name,

        quantity,

        revenue,

        profit,

        date: new Date().toISOString()

    });


    save();

    closeModal("saleModal");

    renderAll();

    toast("Sale recorded ✓");

}


document.getElementById("recordSaleBtn")
    .addEventListener("click",() => {

        populateSaleProducts();

        openModal("saleModal");

    });


document.getElementById("saveSale")
    .addEventListener("click",recordSale);


/* MODALS */

function openModal(id) {

    document.getElementById(id)
        .classList.add("open");

}


function closeModal(id) {

    document.getElementById(id)
        .classList.remove("open");

}


document.querySelectorAll("[data-close]")
    .forEach(button => {

        button.addEventListener("click",() => {

            closeModal(button.dataset.close);

        });

    });


document.querySelectorAll(".modal")
    .forEach(modal => {

        modal.addEventListener("click",event => {

            if (event.target === modal) {

                modal.classList.remove("open");

            }

        });

    });


/* DASHBOARD */

function updateDashboard() {

    const revenue =
        sales.reduce(
            (sum,sale) => sum + sale.revenue,
            0
        );

    const profit =
        sales.reduce(
            (sum,sale) => sum + sale.profit,
            0
        );

    const sold =
        sales.reduce(
            (sum,sale) => sum + sale.quantity,
            0
        );


    const margin =
        revenue > 0
        ? (profit / revenue) * 100
        : 0;


    const average =
        sold > 0
        ? profit / sold
        : 0;


    const inventory =
        products.reduce(
            (sum,p) => sum + p.cost * p.stock,
            0
        );


    document.getElementById("dashRevenue")
        .textContent = money(revenue);

    document.getElementById("dashProfit")
        .textContent = money(profit);

    document.getElementById("dashProducts")
        .textContent = products.length;

    document.getElementById("dashSold")
        .textContent = sold;

    document.getElementById("dashAverage")
        .textContent = money(average);

    document.getElementById("dashMargin")
        .textContent = margin.toFixed(1) + "%";

    document.getElementById("dashInventory")
        .textContent = money(inventory);


    document.getElementById("analyticsRevenue")
        .textContent = money(revenue);

    document.getElementById("analyticsProfit")
        .textContent = money(profit);

    document.getElementById("analyticsSold")
        .textContent = sold;

    document.getElementById("analyticsMargin")
        .textContent = margin.toFixed(1) + "%";

}


/* PRODUCTS RENDER */

function renderProducts() {

    const container =
        document.getElementById("productsList");

    if (!products.length) {

        container.innerHTML = `
            <div class="empty">
                <div>📦</div>
                <strong>Your inventory is empty</strong>
                <p>Add products to start building your business.</p>
            </div>
        `;

        return;

    }


    container.innerHTML =
        products.map(product => {

            const profit =
                product.price - product.cost;

            const stockClass =
                product.stock <= 5
                ? "stock-low"
                : "stock-good";


            return `

                <div class="product-card">

                    <h3>${escapeHTML(product.name)}</h3>

                    <div class="product-meta">

                        <div>
                            <span>Cost</span>
                            <strong>${money(product.cost)}</strong>
                        </div>

                        <div>
                            <span>Price</span>
                            <strong>${money(product.price)}</strong>
                        </div>

                        <div>
                            <span>Profit</span>
                            <strong class="stock-good">
                                ${money(profit)}
                            </strong>
                        </div>

                        <div>
                            <span>Stock</span>
                            <strong class="${stockClass}">
                                ${product.stock}
                            </strong>
                        </div>

                    </div>

                    <div class="product-actions">

                        <button onclick="quickSale(${product.id})">
                            Sell
                        </button>

                        <button
                            class="delete"
                            onclick="deleteProduct(${product.id})"
                        >
                            Delete
                        </button>

                    </div>

                </div>
            `;

        }).join("");

}


/* QUICK SALE */

function quickSale(id) {

    populateSaleProducts();

    document.getElementById("saleProduct").value =
        id;

    openModal("saleModal");

}


/* SALES RENDER */

function renderSales() {

    const container =
        document.getElementById("salesList");


    if (!sales.length) {

        container.innerHTML = `
            <div class="empty">
                <div>🛒</div>
                <strong>No sales yet</strong>
                <p>Your recorded sales will appear here.</p>
            </div>
        `;

        return;

    }


    container.innerHTML = `

        <div class="sale-row">

            <span>Product</span>
            <span>Quantity</span>
            <span>Revenue</span>
            <span>Profit</span>

        </div>

        ${sales.map(sale => `

            <div class="sale-row">

                <strong>
                    ${escapeHTML(sale.productName)}
                </strong>

                <span>
                    ${sale.quantity}
                </span>

                <span>
                    ${money(sale.revenue)}
                </span>

                <strong class="stock-good">
                    ${money(sale.profit)}
                </strong>

            </div>

        `).join("")}

    `;

}


/* RECENT PRODUCTS */

function renderRecentProducts() {

    const container =
        document.getElementById("recentProducts");

    if (!products.length) {

        container.innerHTML = `
            <div class="empty">
                <div>📦</div>
                <strong>No products yet</strong>
                <p>Add your first product to start tracking your business.</p>
                <button class="primary-btn small" data-page="products">
                    Add first product
                </button>
            </div>
        `;

        return;

    }


    container.innerHTML =
        products.slice(0,4).map(product => `

            <div class="sale-row">

                <strong>
                    ${escapeHTML(product.name)}
                </strong>

                <span>
                    ${product.stock} in stock
                </span>

                <span>
                    ${money(product.price)}
                </span>

                <strong class="stock-good">
                    ${money(product.price-product.cost)}
                </strong>

            </div>

        `).join("");

}


/* CHART */

function renderChart() {

    const chart =
        document.getElementById("barChart");

    if (!sales.length) {

        chart.innerHTML = `
            <div class="chart-empty">
                Record sales to unlock your business chart.
            </div>
        `;

        return;

    }


    const recent =
        sales.slice(0,8).reverse();

    const max =
        Math.max(
            ...recent.map(s => s.profit),
            1
        );


    chart.innerHTML =
        recent.map(sale => {

            const height =
                Math.max(
                    8,
                    (sale.profit / max) * 190
                );

            return `
                <div
                    class="bar"
                    style="height:${height}px"
                    title="${money(sale.profit)}"
                ></div>
            `;

        }).join("");

}


/* DEMO */

function loadDemo() {

    products = [

        {
            id:1,
            name:"Wireless Earbuds",
            cost:90,
            price:179,
            stock:23
        },

        {
            id:2,
            name:"Mini Projector",
            cost:240,
            price:399,
            stock:8
        },

        {
            id:3,
            name:"LED Desk Lamp",
            cost:65,
            price:129,
            stock:31
        }

    ];


    sales = [

        {
            id:1,
            productId:1,
            productName:"Wireless Earbuds",
            quantity:4,
            revenue:716,
            profit:356,
            date:new Date().toISOString()
        },

        {
            id:2,
            productId:2,
            productName:"Mini Projector",
            quantity:2,
            revenue:798,
            profit:318,
            date:new Date().toISOString()
        },

        {
            id:3,
            productId:3,
            productName:"LED Desk Lamp",
            quantity:6,
            revenue:774,
            profit:384,
            date:new Date().toISOString()
        }

    ];


    save();

    renderAll();

    toast("Demo business loaded 🚀");

}


document.getElementById("demoBtn")
    .addEventListener("click",loadDemo);


/* RESET */

document.getElementById("resetBtn")
    .addEventListener("click",() => {

        if (!confirm(
            "Delete ALL products and sales?"
        )) return;

        products = [];

        sales = [];

        save();

        renderAll();

        toast("Business reset");

    });


/* ESCAPE HTML */

function escapeHTML(text) {

    return String(text)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

}


/* RENDER EVERYTHING */

function renderAll() {

    updateDashboard();

    renderProducts();

    renderSales();

    renderRecentProducts();

    renderChart();

    updateCurrency();

}


/* MOBILE MENU */

document.getElementById("mobileMenu")
    .addEventListener("click",() => {

        document
            .querySelector(".sidebar")
            .classList.toggle("open");

    });


/* START */

document.getElementById("currencySelect").value =
    currency;

document.getElementById("settingsCurrency").value =
    currency;

renderAll();

calculate();
