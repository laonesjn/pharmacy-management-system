
(function applyRoleBasedMenus() {
const token =
    localStorage.getItem("token");

const user =
    JSON.parse(localStorage.getItem("user"));


if (!token || !user) {

    window.location.href =
        "/pages/login.html";

}


/*
    Role-based menu access

    admin:
        All menus (including Discounts)

    pharmacist:
        Dashboard
        Medicines
        Categories
        Suppliers
        Stock
        Expiry
        Sales

    staff:
        Dashboard
        Medicines
        Stock
        Expiry
        Sales
*/


const role =
    user.role;


const usersMenu =
    document.getElementById(
        "usersMenu"
    );


const categoriesMenu =
    document.getElementById(
        "categoriesMenu"
    );


const suppliersMenu =
    document.getElementById(
        "suppliersMenu"
    );


const medicinesMenu =
    document.getElementById(
        "medicinesMenu"
    );


const stockMenu =
    document.getElementById(
        "stockMenu"
    );


const expiryMenu =
    document.getElementById(
        "expiryMenu"
    );


const salesMenu =
    document.getElementById(
        "salesMenu"
    );


const discountsMenu =
    document.getElementById(
        "discountsMenu"
    );



/* =========================
   ADMIN
========================= */

if (role === "admin") {

    // Admin can access everything – show Discounts menu.
    if (discountsMenu) {
        discountsMenu.style.display = "";
    }

}



/* =========================
   PHARMACIST
========================= */

else if (role === "pharmacist") {

    if (usersMenu) {

        usersMenu.style.display =
            "none";

    }

    // Discounts menu hidden for pharmacist
    if (discountsMenu) {
        discountsMenu.style.display = "none";
    }

}



/* =========================
   STAFF
========================= */

else if (role === "staff") {

    if (usersMenu) {

        usersMenu.style.display =
            "none";

    }


    if (categoriesMenu) {

        categoriesMenu.style.display =
            "none";

    }


    if (suppliersMenu) {

        suppliersMenu.style.display =
            "none";

    }

    // Discounts menu hidden for staff
    if (discountsMenu) {
        discountsMenu.style.display = "none";
    }

}



/* =========================
   UNKNOWN ROLE
========================= */

else {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    window.location.href =
        "/pages/login.html";

}

})();
