// =====================================================
// AUTHENTICATION
// =====================================================

const token = localStorage.getItem("token");

let user = null;

try {
    user = JSON.parse(localStorage.getItem("user"));
} catch (error) {
    console.error("Invalid user data:", error);
}

if (!token || !user) {
    window.location.href = "/pages/login.html";
}


// =====================================================
// USER INFORMATION
// =====================================================

if (user) {
    document.getElementById("userName").textContent =
        user.full_name;

    document.getElementById("welcomeMessage").textContent =
        `Welcome, ${user.full_name} (${user.role})`;
}


// =====================================================
// ELEMENTS
// =====================================================

const medicineForm = document.getElementById("medicineForm");

const medicineTable = document.getElementById("medicineTable");

const searchInput = document.getElementById("searchInput");

const cancelBtn = document.getElementById("cancelBtn");


// =====================================================
// CR-001 ADVANCED FILTER ELEMENTS
// =====================================================

const filterCategory =
    document.getElementById("filterCategory");

const filterSupplier =
    document.getElementById("filterSupplier");

const minPrice =
    document.getElementById("minPrice");

const maxPrice =
    document.getElementById("maxPrice");

const stockFilter =
    document.getElementById("stockFilter");

const clearFiltersBtn =
    document.getElementById("clearFilters");

const filterCount =
    document.getElementById("filterCount");

const filterError =
    document.getElementById("filterError");


// Store all medicine records

let allMedicines = [];


// =====================================================
// CR-001 POPULATE CATEGORY AND SUPPLIER FILTERS
// =====================================================

function populateFilterOptions() {

    const selectedCategory = filterCategory.value;
    const selectedSupplier = filterSupplier.value;

    // Get unique categories

    const categories = [
        ...new Map(
            allMedicines
                .filter(m => m.category_id != null)
                .map(m => [
                    String(m.category_id),
                    m.category_name || "Unknown"
                ])
        ).entries()
    ];

    // Get unique suppliers

    const suppliers = [
        ...new Map(
            allMedicines
                .filter(m => m.supplier_id != null)
                .map(m => [
                    String(m.supplier_id),
                    m.supplier_name || "Unknown"
                ])
        ).entries()
    ];

    // Reset category dropdown

    filterCategory.replaceChildren(
        new Option("All Categories", "")
    );

    categories.forEach(([id, name]) => {

        filterCategory.add(
            new Option(name, id)
        );

    });

    // Reset supplier dropdown

    filterSupplier.replaceChildren(
        new Option("All Suppliers", "")
    );

    suppliers.forEach(([id, name]) => {

        filterSupplier.add(
            new Option(name, id)
        );

    });

    // Restore selected values

    filterCategory.value = selectedCategory;
    filterSupplier.value = selectedSupplier;
}


// =====================================================
// CR-001 ADVANCED FILTERING FUNCTION
// =====================================================

function applyFilters() {

    const search =
        searchInput.value.trim().toLowerCase();

    const category = filterCategory.value;

    const supplier = filterSupplier.value;

    const stock = stockFilter.value;

    const minText = minPrice.value.trim();

    const maxText = maxPrice.value.trim();

    const min =
        minText === "" ? null : Number(minText);

    const max =
        maxText === "" ? null : Number(maxText);

    // Clear previous errors

    filterError.textContent = "";

    // Validate prices

    if (
        (min !== null &&
            (!Number.isFinite(min) || min < 0)) ||
        (max !== null &&
            (!Number.isFinite(max) || max < 0))
    ) {

        filterError.textContent =
            "Please enter valid non-negative prices.";

        displayMedicines([]);

        filterCount.textContent =
            `Showing 0 of ${allMedicines.length} medicines`;

        return;
    }

    // Minimum cannot exceed maximum

    if (
        min !== null &&
        max !== null &&
        min > max
    ) {

        filterError.textContent =
            "Minimum price cannot exceed maximum price.";

        displayMedicines([]);

        filterCount.textContent =
            `Showing 0 of ${allMedicines.length} medicines`;

        return;
    }

    // Filter all medicines

    const filteredMedicines = allMedicines.filter(medicine => {

        // 1. Medicine Name Search

        const nameMatch =
            String(medicine.medicine_name || "")
                .toLowerCase()
                .includes(search);

        // 2. Category Filter

        const categoryMatch =
            !category ||
            String(medicine.category_id) === category;

        // 3. Supplier Filter

        const supplierMatch =
            !supplier ||
            String(medicine.supplier_id) === supplier;

        // 4. Price Range Filter

        const price =
            medicine.selling_price == null ||
            medicine.selling_price === ""
                ? null
                : Number(medicine.selling_price);

        const validPrice =
            price !== null &&
            Number.isFinite(price);

        const minMatch =
            min === null ||
            (validPrice && price >= min);

        const maxMatch =
            max === null ||
            (validPrice && price <= max);

        // 5. Stock Status Filter

        const quantity =
            Number(medicine.quantity);

        const reorderLevel =
            Number(medicine.reorder_level);

        let stockStatus = "unknown";

        if (
            medicine.quantity != null &&
            medicine.quantity !== "" &&
            Number.isFinite(quantity) &&
            quantity >= 0 &&
            medicine.reorder_level != null &&
            medicine.reorder_level !== "" &&
            Number.isFinite(reorderLevel) &&
            reorderLevel >= 0
        ) {

            if (quantity === 0) {

                stockStatus = "out";

            } else if (quantity <= reorderLevel) {

                stockStatus = "low";

            } else {

                stockStatus = "available";

            }
        }

        const stockMatch =
            !stock ||
            stockStatus === stock;

        // 6. Combined Filtering (AND Logic)

        return (
            nameMatch &&
            categoryMatch &&
            supplierMatch &&
            minMatch &&
            maxMatch &&
            stockMatch
        );

    });

    // Display matching medicines

    displayMedicines(filteredMedicines);

    // Update result count

    filterCount.textContent =
        `Showing ${filteredMedicines.length} of ${allMedicines.length} medicines`;
}


// =====================================================
// POPULATE FORM DROPDOWNS
// =====================================================

async function populateFormDropdowns() {

    const [catRes, supRes] = await Promise.all([
        fetch("/api/categories", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/suppliers", { headers: { "Authorization": `Bearer ${token}` } })
    ]);

    const categories = catRes.ok ? await catRes.json() : [];
    const suppliers = supRes.ok ? await supRes.json() : [];

    const categorySelect = document.getElementById("categoryId");
    const supplierSelect = document.getElementById("supplierId");

    categories.forEach(c => {
        categorySelect.add(new Option(`${c.category_name} (ID: ${c.category_id})`, c.category_id));
    });

    suppliers.forEach(s => {
        supplierSelect.add(new Option(`${s.supplier_name} (ID: ${s.supplier_id})`, s.supplier_id));
    });
}


// =====================================================
// LOAD MEDICINES
// =====================================================

async function loadMedicines() {

    try {

        const response = await fetch(
            "/api/medicines",
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        console.log("Medicine API Status:", response.status);

        if (!response.ok) {

            alert(data.message || "Unable to load medicines.");

            return;
        }

        // Handle array or object API response

        if (Array.isArray(data)) {

            allMedicines = data;

        } else if (Array.isArray(data.medicines)) {

            allMedicines = data.medicines;

        } else {

            console.error(
                "Unexpected medicine API response:",
                data
            );

            allMedicines = [];
        }

        console.log(
            "Total Medicines Loaded:",
            allMedicines.length
        );

        // Populate dropdown options

        populateFilterOptions();

        // Apply selected filters

        applyFilters();

    } catch (error) {

        console.error("Load Medicines Error:", error);

        alert("Unable to load medicines.");

    }
}


// =====================================================
// DISPLAY MEDICINES
// =====================================================

function displayMedicines(medicines) {

    medicineTable.innerHTML = "";

    // No matching medicines

    if (medicines.length === 0) {

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 9;

        cell.className = "no-results";

        cell.textContent =
            "No medicines match your filters. Try changing or clearing the filters.";

        row.appendChild(cell);

        medicineTable.appendChild(row);

        return;
    }

    medicines.forEach(medicine => {

        const row = document.createElement("tr");

        // Helper for safe text rendering

        function addCell(value) {

            const cell = document.createElement("td");

            cell.textContent = value ?? "-";

            row.appendChild(cell);

        }

        // Medicine ID

        addCell(
            `MD${String(medicine.medicine_id).padStart(3, "0")}`
        );

        // Medicine Name

        addCell(medicine.medicine_name);

        // Category

        addCell(medicine.category_name || "-");

        // Supplier

        addCell(medicine.supplier_name || "-");

        // Batch Number

        addCell(medicine.batch_number || "-");

        // Selling Price

        const price = Number(medicine.selling_price);

        addCell(
            Number.isFinite(price)
                ? price.toFixed(2)
                : "-"
        );

        // Quantity

        addCell(medicine.quantity);

        // Expiry Date

        addCell(medicine.expiry_date || "-");

        // Actions

        const actionCell = document.createElement("td");

        const editBtn = document.createElement("button");

        editBtn.className = "edit-btn";

        editBtn.textContent = "Edit";

        editBtn.addEventListener("click", function() {

            editMedicine(medicine.medicine_id);

        });

        const deleteBtn = document.createElement("button");

        deleteBtn.className = "delete-btn";

        deleteBtn.textContent = "Delete";

        deleteBtn.addEventListener("click", function() {

            deleteMedicine(medicine.medicine_id);

        });

        actionCell.appendChild(editBtn);

        actionCell.appendChild(deleteBtn);

        row.appendChild(actionCell);

        medicineTable.appendChild(row);

    });
}


// =====================================================
// ADD / UPDATE MEDICINE
// =====================================================

medicineForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const medicineId =
            document.getElementById("medicineId").value;

        const medicineData = {

            medicine_name:
                document.getElementById("medicineName")
                    .value.trim(),

            category_id:
                document.getElementById("categoryId")
                    .value || null,

            supplier_id:
                document.getElementById("supplierId")
                    .value || null,

            batch_number:
                document.getElementById("batchNumber")
                    .value.trim(),

            purchase_price:
                document.getElementById("purchasePrice")
                    .value || 0,

            selling_price:
                document.getElementById("sellingPrice")
                    .value,

            quantity:
                document.getElementById("quantity")
                    .value || 0,

            reorder_level:
                document.getElementById("reorderLevel")
                    .value || 10,

            expiry_date:
                document.getElementById("expiryDate")
                    .value || null
        };

        try {

            let url = "/api/medicines";

            let method = "POST";

            if (medicineId) {

                url = `/api/medicines/${medicineId}`;

                method = "PUT";
            }

            const response = await fetch(
                url,
                {
                    method: method,

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify(medicineData)
                }
            );

            const data = await response.json();

            if (!response.ok) {

                alert(data.message || "Unable to save medicine.");

                return;
            }

            alert(data.message || "Medicine saved successfully.");

            resetForm();

            await loadMedicines();

        } catch (error) {

            console.error(error);

            alert("Unable to save medicine.");

        }
    }
);


// =====================================================
// EDIT MEDICINE
// =====================================================

async function editMedicine(id) {

    try {

        const response = await fetch(
            `/api/medicines/${id}`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const medicine = await response.json();

        if (!response.ok) {

            alert(medicine.message || "Unable to load medicine.");

            return;
        }

        document.getElementById("medicineId").value =
            medicine.medicine_id;

        document.getElementById("medicineName").value =
            medicine.medicine_name;

        document.getElementById("categoryId").value =
            medicine.category_id || "";

        document.getElementById("supplierId").value =
            medicine.supplier_id || "";

        document.getElementById("batchNumber").value =
            medicine.batch_number || "";

        document.getElementById("purchasePrice").value =
            medicine.purchase_price;

        document.getElementById("sellingPrice").value =
            medicine.selling_price;

        document.getElementById("quantity").value =
            medicine.quantity;

        document.getElementById("reorderLevel").value =
            medicine.reorder_level;

        document.getElementById("expiryDate").value =
            medicine.expiry_date || "";

        document.getElementById("formTitle").textContent =
            "Update Medicine";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {

        console.error(error);

        alert("Unable to load medicine.");

    }
}


// =====================================================
// DELETE MEDICINE
// =====================================================

async function deleteMedicine(id) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this medicine?"
    );

    if (!confirmDelete) {
        return;
    }

    try {

        const response = await fetch(
            `/api/medicines/${id}`,
            {
                method: "DELETE",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Unable to delete medicine.");

            return;
        }

        alert(data.message || "Medicine deleted successfully.");

        await loadMedicines();

    } catch (error) {

        console.error(error);

        alert("Unable to delete medicine.");

    }
}


// =====================================================
// CR-001 FILTER EVENT LISTENERS
// =====================================================

searchInput.addEventListener("input", applyFilters);

filterCategory.addEventListener("change", applyFilters);

filterSupplier.addEventListener("change", applyFilters);

minPrice.addEventListener("input", applyFilters);

maxPrice.addEventListener("input", applyFilters);

stockFilter.addEventListener("change", applyFilters);


// =====================================================
// CLEAR ALL FILTERS
// =====================================================

clearFiltersBtn.addEventListener(
    "click",
    function() {

        searchInput.value = "";

        filterCategory.value = "";

        filterSupplier.value = "";

        minPrice.value = "";

        maxPrice.value = "";

        stockFilter.value = "";

        applyFilters();

    }
);


// =====================================================
// RESET FORM
// =====================================================

function resetForm() {

    medicineForm.reset();

    document.getElementById("medicineId").value = "";

    document.getElementById("reorderLevel").value = 10;

    document.getElementById("formTitle").textContent =
        "Add New Medicine";
}


// =====================================================
// CANCEL
// =====================================================

cancelBtn.addEventListener(
    "click",
    resetForm
);


// =====================================================
// LOGOUT
// =====================================================

document.getElementById("logoutBtn").addEventListener(
    "click",
    function() {

        localStorage.removeItem("token");

        localStorage.removeItem("user");

        window.location.href = "/pages/login.html";

    }
);


// =====================================================
// START
// =====================================================

if (token && user) {
    populateFormDropdowns();
    loadMedicines();
}