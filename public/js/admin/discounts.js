const token =
    localStorage.getItem("token");

const user =
    JSON.parse(localStorage.getItem("user"));


// Guard: Admin only
if (!token || !user) {

    window.location.href =
        "/pages/login.html";
}

if (user.role !== "admin") {

    alert(
        "Access denied. Admin only."
    );

    window.location.href =
        "/pages/dashboard.html";
}


document.getElementById("userName")
    .textContent = user.full_name;

document.getElementById("welcomeMessage")
    .textContent =
    `Welcome, ${user.full_name} (${user.role})`;


const discountsTable =
    document.getElementById("discountsTable");

const discountPercentageInput =
    document.getElementById("discountPercentage");

const discountLabelInput =
    document.getElementById("discountLabel");

const addDiscountBtn =
    document.getElementById("addDiscountBtn");

const formMessage =
    document.getElementById("formMessage");


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(text, isError) {

    formMessage.textContent = text;

    formMessage.className =
        "form-message " +
        (isError ? "msg-error" : "msg-success");

    setTimeout(() => {

        formMessage.textContent = "";
        formMessage.className = "form-message";

    }, 4000);
}


// =====================================================
// LOAD ALL DISCOUNT OPTIONS
// =====================================================

async function loadDiscounts() {

    try {

        const response =
            await fetch(
                "/api/admin/discounts",
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

            discountsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        ${data.message}
                    </td>
                </tr>
            `;

            return;
        }


        renderDiscounts(data);


    } catch (error) {

        console.error(error);

        discountsTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    Unable to load discount options.
                </td>
            </tr>
        `;
    }
}


// =====================================================
// RENDER DISCOUNTS TABLE
// =====================================================

function renderDiscounts(data) {

    discountsTable.innerHTML = "";


    if (data.length === 0) {

        discountsTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    No discount options found.
                </td>
            </tr>
        `;

        return;
    }


    data.forEach(d => {

        const row =
            document.createElement("tr");

        const isActive =
            d.is_active === 1 ||
            d.is_active === true;

        row.innerHTML = `

            <td>${d.discount_id}</td>

            <td>
                <strong>
                    ${parseFloat(d.percentage).toFixed(2)}%
                </strong>
            </td>

            <td>${d.label}</td>

            <td>
                <span class="status-badge ${isActive ? "badge-active" : "badge-inactive"}">
                    ${isActive ? "Active" : "Inactive"}
                </span>
            </td>

            <td>${d.created_by_name || "-"}</td>

            <td>
                <button
                    class="${isActive ? "deactivate-btn" : "activate-btn"}"
                    onclick="toggleStatus(
                        ${d.discount_id},
                        ${isActive ? 0 : 1}
                    )"
                >
                    ${isActive ? "Deactivate" : "Activate"}
                </button>
            </td>
        `;

        discountsTable.appendChild(row);
    });
}


// =====================================================
// ADD DISCOUNT OPTION
// =====================================================

addDiscountBtn.addEventListener(
    "click",
    async function() {

        const percentage =
            discountPercentageInput.value.trim();

        const label =
            discountLabelInput.value.trim();


        if (!percentage) {

            showMessage(
                "Please enter a percentage.",
                true
            );

            return;
        }


        const pct = parseFloat(percentage);

        if (
            isNaN(pct) ||
            pct < 0 ||
            pct > 100
        ) {

            showMessage(
                "Percentage must be between 0.00 and 100.00.",
                true
            );

            return;
        }


        if (!label) {

            showMessage(
                "Please enter a label.",
                true
            );

            return;
        }


        try {

            const response =
                await fetch(
                    "/api/admin/discounts",
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
                                percentage: pct,
                                label: label
                            })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                showMessage(
                    data.message,
                    true
                );

                return;
            }


            showMessage(
                data.message,
                false
            );

            discountPercentageInput.value = "";

            discountLabelInput.value = "";

            loadDiscounts();


        } catch (error) {

            console.error(error);

            showMessage(
                "Unable to add discount option.",
                true
            );
        }
    }
);


// =====================================================
// TOGGLE DISCOUNT STATUS
// =====================================================

async function toggleStatus(id, newStatus) {

    const action =
        newStatus === 1 ? "activate" : "deactivate";

    const confirmed =
        confirm(
            `Are you sure you want to ${action} this discount option?`
        );

    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/admin/discounts/${id}/status`,
                {
                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify({
                            is_active: newStatus
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            showMessage(
                data.message,
                true
            );

            return;
        }


        showMessage(
            data.message,
            false
        );

        loadDiscounts();


    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to update discount status.",
            true
        );
    }
}


// =====================================================
// LOGOUT
// =====================================================

document.getElementById(
    "logoutBtn"
).addEventListener(
    "click",
    function() {

        localStorage.removeItem("token");

        localStorage.removeItem("user");

        window.location.href =
            "/pages/login.html";
    }
);


// =====================================================
// START
// =====================================================

loadDiscounts();

