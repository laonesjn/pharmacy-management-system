const token =
    localStorage.getItem("token");

const user =
    JSON.parse(localStorage.getItem("user"));


if (!token || !user) {

    window.location.href =
        "/pages/login.html";
}


document.getElementById("userName")
    .textContent = user.full_name;

document.getElementById("welcomeMessage")
    .textContent =
    `Welcome, ${user.full_name} (${user.role})`;


// Show Discounts menu only to Admin
if (user.role === "admin") {

    const discountsMenu =
        document.getElementById("discountsMenu");

    if (discountsMenu) {
        discountsMenu.style.display = "";
    }
}

// Hide Users menu for non-admin
if (user.role !== "admin") {

    const usersMenu =
        document.getElementById("usersMenu");

    if (usersMenu) {
        usersMenu.style.display = "none";
    }
}


const customerSelect =
    document.getElementById("customerId");

const saleItemsContainer =
    document.getElementById("saleItems");

const grossTotalEl =
    document.getElementById("grossTotal");

const totalDiscountEl =
    document.getElementById("totalDiscount");

const totalAmountEl =
    document.getElementById("totalAmount");

const salesTable =
    document.getElementById("salesTable");

const searchInput =
    document.getElementById("searchInput");

const addItemBtn =
    document.getElementById("addItemBtn");

const completeSaleBtn =
    document.getElementById("completeSaleBtn");

const clearSaleBtn =
    document.getElementById("clearSaleBtn");


let medicines = [];

let discountOptions = [];

let sales = [];


// =====================================================
// LOAD DISCOUNT OPTIONS
// =====================================================

async function loadDiscountOptions() {

    try {

        const response =
            await fetch(
                "/api/sales/discounts",
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            console.error(
                "Failed to load discounts:",
                data.message
            );

            return;
        }


        discountOptions = data;


    } catch (error) {

        console.error(
            "Unable to load discount options:",
            error
        );
    }
}


// =====================================================
// LOAD MEDICINES
// =====================================================

async function loadMedicines() {

    try {

        const response =
            await fetch(
                "/api/sales/medicines",
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(data.message);

            return;
        }


        medicines = data;

        addSaleItem();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to load medicines."
        );
    }
}


// =====================================================
// LOAD CUSTOMERS
// =====================================================

async function loadCustomers() {

    try {

        const response =
            await fetch(
                "/api/sales/customers",
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(data.message);

            return;
        }


        customerSelect.innerHTML = `
            <option value="">
                Walk-in Customer
            </option>
        `;


        data.forEach(customer => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                customer.customer_id;

            option.textContent =
                `${customer.customer_name} ${customer.phone ? "(" + customer.phone + ")" : ""}`;

            customerSelect.appendChild(
                option
            );
        });


    } catch (error) {

        console.error(error);

        alert(
            "Unable to load customers."
        );
    }
}


// =====================================================
// BUILD DISCOUNT DROPDOWN OPTIONS HTML
// =====================================================

function buildDiscountOptions() {

    if (discountOptions.length === 0) {
        return `<option value="0.00">No Discount (0%)</option>`;
    }

    return discountOptions.map(d => {

        const pct =
            parseFloat(d.percentage).toFixed(2);

        const selected =
            pct === "0.00" ? "selected" : "";

        return `
            <option
                value="${pct}"
                ${selected}
            >
                ${d.label}
            </option>
        `;

    }).join("");
}


// =====================================================
// ADD SALE ITEM
// =====================================================

function addSaleItem() {

    const item =
        document.createElement("div");

    item.className =
        "sale-item";


    const medicineOptions =
        medicines.map(
            medicine => `
                <option
                    value="${medicine.medicine_id}"
                >
                    ${medicine.medicine_name}
                    - Rs. ${Number(
                        medicine.selling_price
                    ).toFixed(2)}
                    (Stock: ${medicine.quantity})
                </option>
            `
        ).join("");


    item.innerHTML = `

        <select
            class="medicine-select"
            required
        >

            <option value="">
                Select Medicine
            </option>

            ${medicineOptions}

        </select>


        <input
            type="number"
            class="quantity-input"
            min="1"
            value="1"
            placeholder="Quantity"
            required
        >


        <select class="discount-select">
            ${buildDiscountOptions()}
        </select>


        <div class="item-breakdown">
            <span class="item-gross">Rs. 0.00</span>
            <span class="item-discount-amt text-discount">- Rs. 0.00</span>
            <span class="item-subtotal">Rs. 0.00</span>
        </div>


        <button
            type="button"
            class="remove-item-btn"
        >
            Remove
        </button>

    `;


    const medicineSelect =
        item.querySelector(
            ".medicine-select"
        );

    const quantityInput =
        item.querySelector(
            ".quantity-input"
        );

    const discountSelect =
        item.querySelector(
            ".discount-select"
        );


    function updateItemBreakdown() {

        const med =
            medicines.find(
                m =>
                    Number(m.medicine_id) ===
                    Number(medicineSelect.value)
            );

        const qty =
            Number(quantityInput.value) || 0;

        const pct =
            parseFloat(discountSelect.value) || 0;


        if (med && qty > 0) {

            const price =
                parseFloat(med.selling_price);

            const gross =
                price * qty;

            const discAmt =
                Math.round(gross * pct / 100 * 100) / 100;

            const sub =
                Math.round((gross - discAmt) * 100) / 100;

            item.querySelector(".item-gross")
                .textContent =
                `Rs. ${gross.toFixed(2)}`;

            item.querySelector(".item-discount-amt")
                .textContent =
                `- Rs. ${discAmt.toFixed(2)}`;

            item.querySelector(".item-subtotal")
                .textContent =
                `Rs. ${sub.toFixed(2)}`;

        } else {

            item.querySelector(".item-gross")
                .textContent = "Rs. 0.00";

            item.querySelector(".item-discount-amt")
                .textContent = "- Rs. 0.00";

            item.querySelector(".item-subtotal")
                .textContent = "Rs. 0.00";
        }

        calculateTotal();
    }


    medicineSelect.addEventListener(
        "change",
        updateItemBreakdown
    );

    quantityInput.addEventListener(
        "input",
        updateItemBreakdown
    );

    discountSelect.addEventListener(
        "change",
        updateItemBreakdown
    );


    item.querySelector(
        ".remove-item-btn"
    ).addEventListener(
        "click",
        function() {

            item.remove();

            calculateTotal();
        }
    );


    saleItemsContainer.appendChild(
        item
    );


    calculateTotal();
}


// =====================================================
// CALCULATE TOTALS
// =====================================================

function calculateTotal() {

    let grossTotal = 0;
    let discountTotal = 0;


    const items =
        document.querySelectorAll(
            ".sale-item"
        );


    items.forEach(item => {

        const medicineId =
            item.querySelector(
                ".medicine-select"
            ).value;


        const quantity =
            Number(
                item.querySelector(
                    ".quantity-input"
                ).value
            );


        const pct =
            parseFloat(
                item.querySelector(
                    ".discount-select"
                ).value
            ) || 0;


        const medicine =
            medicines.find(
                m =>
                    Number(m.medicine_id) ===
                    Number(medicineId)
            );


        if (
            medicine &&
            quantity > 0
        ) {

            const price =
                parseFloat(medicine.selling_price);

            const gross =
                price * quantity;

            const discAmt =
                Math.round(gross * pct / 100 * 100) / 100;

            grossTotal += gross;
            discountTotal += discAmt;
        }
    });


    const finalPayable =
        Math.round(
            (grossTotal - discountTotal) *
            100
        ) / 100;


    grossTotalEl.textContent =
        `Rs. ${grossTotal.toFixed(2)}`;

    totalDiscountEl.textContent =
        `- Rs. ${discountTotal.toFixed(2)}`;

    totalAmountEl.textContent =
        `Rs. ${finalPayable.toFixed(2)}`;
}


// =====================================================
// COMPLETE SALE
// =====================================================

completeSaleBtn.addEventListener(
    "click",
    async function() {

        const itemElements =
            document.querySelectorAll(
                ".sale-item"
            );


        if (
            itemElements.length === 0
        ) {

            alert(
                "Please add at least one medicine."
            );

            return;
        }


        const items = [];

        const selectedIds = [];


        for (
            const itemElement
            of itemElements
        ) {

            const medicineId =
                itemElement.querySelector(
                    ".medicine-select"
                ).value;


            const quantity =
                Number(
                    itemElement.querySelector(
                        ".quantity-input"
                    ).value
                );


            const discountPct =
                itemElement.querySelector(
                    ".discount-select"
                ).value;


            if (!medicineId) {

                alert(
                    "Please select a medicine."
                );

                return;
            }


            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {

                alert(
                    "Please enter a valid quantity."
                );

                return;
            }


            if (
                selectedIds.includes(
                    medicineId
                )
            ) {

                alert(
                    "The same medicine cannot be added twice."
                );

                return;
            }


            selectedIds.push(
                medicineId
            );


            const medicine =
                medicines.find(
                    m =>
                        Number(m.medicine_id) ===
                        Number(medicineId)
                );


            if (
                quantity >
                Number(medicine.quantity)
            ) {

                alert(
                    `Insufficient stock for ${medicine.medicine_name}. Available quantity: ${medicine.quantity}.`
                );

                return;
            }


            items.push({
                medicine_id:
                    Number(medicineId),

                quantity:
                    quantity,

                // Send discount percentage so server can validate
                discount_percentage:
                    parseFloat(discountPct)
            });
        }


        const confirmSale =
            confirm(
                "Are you sure you want to complete this sale?"
            );


        if (!confirmSale) {
            return;
        }


        try {

            const response =
                await fetch(
                    "/api/sales",
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify({
                                customer_id:
                                    customerSelect.value ||
                                    null,

                                items:
                                    items
                            })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                alert(data.message);

                return;
            }


            alert(
                `${data.message}\n` +
                `Gross Total: Rs. ${data.gross_total}\n` +
                `Discount:    Rs. ${data.total_discount}\n` +
                `Final Total: Rs. ${data.total_amount}`
            );


            clearSale();

            loadMedicines();

            loadSales();


        } catch (error) {

            console.error(error);

            alert(
                "Unable to complete sale."
            );
        }
    }
);


// =====================================================
// CLEAR SALE
// =====================================================

function clearSale() {

    customerSelect.value = "";

    saleItemsContainer.innerHTML = "";

    grossTotalEl.textContent = "Rs. 0.00";
    totalDiscountEl.textContent = "- Rs. 0.00";
    totalAmountEl.textContent = "Rs. 0.00";

    if (medicines.length > 0) {

        addSaleItem();
    }
}


clearSaleBtn.addEventListener(
    "click",
    clearSale
);


// =====================================================
// LOAD SALES
// =====================================================

async function loadSales() {

    try {

        const response =
            await fetch(
                "/api/sales",
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(data.message);

            return;
        }


        sales = data;

        displaySales(sales);


    } catch (error) {

        console.error(error);

        alert(
            "Unable to load sales."
        );
    }
}


// =====================================================
// DISPLAY SALES
// =====================================================

function displaySales(salesData) {

    salesTable.innerHTML = "";


    if (
        salesData.length === 0
    ) {

        salesTable.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-message"
                >
                    No sales found.
                </td>
            </tr>
        `;

        return;
    }


    salesData.forEach(sale => {

        const row =
            document.createElement("tr");


        const date =
            new Date(
                sale.sale_date
            ).toLocaleString();


        row.innerHTML = `

            <td>
                ${sale.sale_id}
            </td>

            <td>
                ${sale.customer_name || "Walk-in Customer"}
            </td>

            <td>
                ${sale.sold_by_name || "-"}
            </td>

            <td>
                ${date}
            </td>

            <td>
                Rs. ${Number(
                    sale.total_amount
                ).toFixed(2)}
            </td>

            <td>

                <button
                    class="view-btn"
                    onclick="viewSale(
                        ${sale.sale_id}
                    )"
                >
                    View
                </button>

            </td>
        `;


        salesTable.appendChild(row);
    });
}


// =====================================================
// VIEW SALE
// =====================================================

async function viewSale(id) {

    try {

        const response =
            await fetch(
                `/api/sales/${id}`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(data.message);

            return;
        }


        let message =
            `Sale ID: ${data.sale.sale_id}\n`;

        message +=
            `Customer: ${
                data.sale.customer_name ||
                "Walk-in Customer"
            }\n`;

        message +=
            `Sold By: ${
                data.sale.sold_by_name
            }\n`;

        message +=
            `Date: ${
                new Date(
                    data.sale.sale_date
                ).toLocaleString()
            }\n\n`;

        message +=
            "Items:\n";


        let grossTotal = 0;
        let totalDiscount = 0;

        data.items.forEach(item => {

            const gross =
                Number(item.selling_price) *
                Number(item.quantity);

            const discAmt =
                Number(item.discount_amount);

            const sub =
                Number(item.subtotal);

            grossTotal += gross;
            totalDiscount += discAmt;

            const pct =
                Number(item.discount_percentage);

            message +=
                `  ${item.medicine_name} x ${
                    item.quantity
                } @ Rs.${
                    Number(item.selling_price).toFixed(2)
                }` +
                (pct > 0
                    ? ` (${pct.toFixed(2)}% off - Rs.${discAmt.toFixed(2)})`
                    : "") +
                ` = Rs. ${sub.toFixed(2)}\n`;
        });


        message +=
            `\nGross Total:     Rs. ${grossTotal.toFixed(2)}`;

        message +=
            `\nTotal Discount:  Rs. ${totalDiscount.toFixed(2)}`;

        message +=
            `\nFinal Payable:   Rs. ${
                Number(
                    data.sale.total_amount
                ).toFixed(2)
            }`;


        alert(message);


    } catch (error) {

        console.error(error);

        alert(
            "Unable to load sale details."
        );
    }
}


// =====================================================
// SEARCH SALES
// =====================================================

searchInput.addEventListener(
    "input",
    function() {

        const search =
            this.value
                .trim()
                .toLowerCase();


        if (!search) {

            displaySales(sales);

            return;
        }


        const filtered =
            sales.filter(sale => {

                return (

                    String(
                        sale.sale_id
                    ).includes(search)

                    ||

                    (
                        sale.customer_name ||
                        "Walk-in Customer"
                    )
                    .toLowerCase()
                    .includes(search)

                    ||

                    (
                        sale.sold_by_name ||
                        ""
                    )
                    .toLowerCase()
                    .includes(search)
                );
            });


        displaySales(filtered);
    }
);


// =====================================================
// LOGOUT
// =====================================================

document.getElementById(
    "logoutBtn"
).addEventListener(
    "click",
    function() {

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "user"
        );

        window.location.href =
            "/pages/login.html";
    }
);


// =====================================================
// START
// =====================================================

async function init() {

    await loadDiscountOptions();

    loadCustomers();

    loadMedicines();

    loadSales();
}

init();
