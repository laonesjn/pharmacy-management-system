const express = require("express");

const cors = require("cors");

const path = require("path");

require("dotenv").config();


const db =
    require("./config/db");


const authRoutes =
    require("./routes/auth");

const medicineRoutes =
    require("./routes/medicines");

const supplierRoutes =
    require("./routes/suppliers");

const categoryRoutes =
    require("./routes/categories");

const salesRoutes =
    require("./routes/sales");

const stockRoutes =
    require("./routes/stock");

const dashboardRoutes =
    require("./routes/dashboard");

const userRoutes =
    require("./routes/users");

const expiryRoutes =
    require("./routes/expiry");
const adminDiscountRoutes =
    require("./routes/admin/discounts");


const errorHandler =
    require("./middleware/errorHandler");


const app =
    express();



/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);



/* =========================
   API ROUTES
========================= */

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/medicines",
    medicineRoutes
);

app.use(
    "/api/suppliers",
    supplierRoutes
);

app.use(
    "/api/categories",
    categoryRoutes
);

app.use(
    "/api/sales",
    salesRoutes
);

app.use(
    "/api/stock",
    stockRoutes
);

app.use(
    "/api/dashboard",
    dashboardRoutes
);

app.use(
    "/api/users",
    userRoutes
);

app.use(
    "/api/expiry",
    expiryRoutes
);

app.use(
    "/api/admin/discounts",
    adminDiscountRoutes
);



/* =========================
   HOME PAGE
========================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public/pages/login.html"
            )
        );

    }
);



/* =========================
   404 API HANDLER
========================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            message:
                "API endpoint not found."

        });

    }
);



/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use(
    errorHandler
);



/* =========================
   SERVER
========================= */

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);
