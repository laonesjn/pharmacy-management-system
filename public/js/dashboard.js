
const token = 
    localStorage.getItem("token"); 
 
const user = 
    JSON.parse(localStorage.getItem("user")); 
 
 
if (!token || !user) { 
 
    window.location.href = 
        "/pages/login.html"; 
 
} 
 
 
document.getElementById("userName").textContent = 
    user.full_name; 
 
 
document.getElementById("welcomeMessage").textContent = 
    `Welcome, ${user.full_name} (${user.role})`; 


const adminDiscountsSection =
    document.getElementById("adminDiscountsSection");
const dashboardDiscountsTable =
    document.getElementById("dashboardDiscountsTable");

async function loadDashboardDiscounts() {
    if (user.role !== "admin" || !dashboardDiscountsTable) {
        return;
    }

    try {
        const response = await fetch("/api/admin/discounts", {
            cache: "no-store",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (!response.ok || !Array.isArray(data)) {
            throw new Error(data.message || "Unable to load discounts.");
        }

        dashboardDiscountsTable.replaceChildren();

        if (data.length === 0) {
            dashboardDiscountsTable.innerHTML =
                '<tr><td colspan="3">No discount options found.</td></tr>';
            return;
        }

        data.forEach(discount => {
            const row = document.createElement("tr");
            const nameCell = document.createElement("td");
            const percentageCell = document.createElement("td");
            const statusCell = document.createElement("td");
            const isActive = Number(discount.is_active) === 1;

            nameCell.textContent = discount.label;
            percentageCell.textContent = `${Number(discount.percentage).toFixed(2)}%`;
            statusCell.textContent = isActive ? "Active" : "Inactive";
            row.append(nameCell, percentageCell, statusCell);
            dashboardDiscountsTable.appendChild(row);
        });
    } catch (error) {
        console.error("Unable to load dashboard discounts:", error);
        dashboardDiscountsTable.innerHTML =
            '<tr><td colspan="3">Unable to load discount options.</td></tr>';
    }
}

if (user.role === "admin" && adminDiscountsSection) {
    adminDiscountsSection.hidden = false;
    loadDashboardDiscounts();
    setInterval(loadDashboardDiscounts, 60000);
}
 
 
async function loadDashboard() { 
 
    try { 
 
        const response = await fetch( 
            "/api/dashboard/summary", 
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
 
 
        document.getElementById( 
            "totalMedicines" 
        ).textContent = 
            data.totalMedicines; 
 
 
        document.getElementById( 
            "totalStock" 
        ).textContent = 
            data.totalStock; 
 
 
        document.getElementById( 
            "lowStock" 
        ).textContent = 
            data.lowStock; 
 
 
        document.getElementById( 
            "totalSales" 
        ).textContent = 
            Number(data.totalSales).toFixed(2); 


        // ==============================
        // LOW STOCK MEDICINES TABLE
        // ==============================

        const lowStockTable =
            document.getElementById("lowStockTable");

        lowStockTable.innerHTML = "";

        if (
            !data.lowStockMedicines ||
            data.lowStockMedicines.length === 0
        ) {

            lowStockTable.innerHTML = `
                <tr>
                    <td colspan="3">
                        No low stock medicines.
                    </td>
                </tr>
            `;

        } else {

            data.lowStockMedicines.forEach(
                medicine => {

                    const row =
                        document.createElement("tr");

                    row.innerHTML = `
                        <td>
                            ${medicine.medicine_name}
                        </td>

                        <td>
                            ${medicine.quantity}
                        </td>

                        <td>
                            ${medicine.reorder_level}
                        </td>
                    `;

                    lowStockTable.appendChild(row);

                }
            );

        }
 
 
    } catch (error) { 
 
        console.error(error); 
 
    } 
 
} 
 
 
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
 
 
loadDashboard();

