const express = require("express");

const db = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// CR-002 - MEDICINE EXPIRY VALIDATION
// ==========================================

function validateMedicineExpiry(expiryDate) {

    // Missing expiry date
    if (!expiryDate) {
        return {
            valid: false,
            message: "Medicine expiry date is missing."
        };
    }

    // Keep database DATE values date-only to avoid timezone shifts.
    let expiry;

    if (expiryDate instanceof Date) {

        if (Number.isNaN(expiryDate.getTime())) {
            return {
                valid: false,
                message: "Invalid medicine expiry date."
            };
        }

        expiry = [
            expiryDate.getFullYear(),
            String(expiryDate.getMonth() + 1).padStart(2, "0"),
            String(expiryDate.getDate()).padStart(2, "0")
        ].join("-");

    } else {

        expiry = String(expiryDate).trim();
    }

    // Validate YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
        return {
            valid: false,
            message: "Invalid medicine expiry date."
        };
    }

    const [year, month, day] =
        expiry.split("-").map(Number);

    const parsedDate = new Date(
        Date.UTC(year, month - 1, day)
    );

    // Reject impossible dates
    if (
        parsedDate.getUTCFullYear() !== year ||
        parsedDate.getUTCMonth() + 1 !== month ||
        parsedDate.getUTCDate() !== day
    ) {
        return {
            valid: false,
            message: "Invalid medicine expiry date."
        };
    }

    // Sri Lanka business date (Asia/Colombo)
    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());

    // Expiry date is treated as valid until end of that day
    if (expiry < today) {
        return {
            valid: false,
            message: "Cannot sell expired medicine."
        };
    }

    return {
        valid: true,
        message: "Medicine is valid for sale."
    };
}


// =====================================================
// GET ALL SALES
// =====================================================

router.get(
    "/",
    authenticateToken,
    (req, res) => {

        const sql = `
            SELECT
                s.sale_id,
                s.customer_id,
                c.customer_name,
                s.sold_by,
                u.full_name AS sold_by_name,
                s.sale_date,
                s.total_amount
            FROM sales s
            LEFT JOIN customers c
                ON s.customer_id = c.customer_id
            LEFT JOIN users u
                ON s.sold_by = u.user_id
            ORDER BY s.sale_id DESC
        `;

        db.query(sql, (error, results) => {

            if (error) {
                console.error(error);

                return res.status(500).json({
                    message: "Database error."
                });
            }

            res.json(results);
        });
    }
);


// =====================================================
// GET ACTIVE DISCOUNT OPTIONS FOR SALES DROPDOWN
// Admin, Pharmacist, Pharmacy Staff
// =====================================================

router.get(
    "/discounts",
    authenticateToken,
    authorizeRoles("admin", "pharmacist", "staff"),
    (req, res) => {

        const sql = `
            SELECT
                discount_id,
                percentage,
                label
            FROM discount_options
            WHERE is_active = 1
            ORDER BY percentage ASC
        `;

        db.query(sql, (error, results) => {

            if (error) {
                console.error(error);

                return res.status(500).json({
                    message: "Unable to load discount options."
                });
            }

            res.json(results);
        });
    }
);


// =====================================================
// GET MEDICINES FOR SALE
// =====================================================

router.get(
    "/medicines",
    authenticateToken,
    (req, res) => {

        const sql = `
            SELECT
                medicine_id,
                medicine_name,
                selling_price,
                quantity,
                DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date
            FROM medicines
            WHERE quantity > 0
            ORDER BY medicine_name ASC
        `;

        db.query(sql, (error, results) => {

            if (error) {
                console.error(error);

                return res.status(500).json({
                    message: "Database error."
                });
            }

            res.json(results);
        });
    }
);


// =====================================================
// GET CUSTOMERS
// =====================================================

router.get(
    "/customers",
    authenticateToken,
    (req, res) => {

        const sql = `
            SELECT
                customer_id,
                customer_name,
                phone
            FROM customers
            ORDER BY customer_name ASC
        `;

        db.query(sql, (error, results) => {

            if (error) {
                console.error(error);

                return res.status(500).json({
                    message: "Database error."
                });
            }

            res.json(results);
        });
    }
);


// =====================================================
// CREATE SALE  (with server-side price + discount validation)
// =====================================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin", "pharmacist", "staff"),
    (req, res) => {

        const {
            customer_id,
            items
        } = req.body;


        if (
            !items ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                message:
                    "At least one medicine is required."
            });
        }


        // Check duplicate medicines
        const medicineIds =
            items.map(item =>
                Number(item.medicine_id)
            );

        const uniqueMedicineIds =
            new Set(medicineIds);

        if (
            uniqueMedicineIds.size !==
            medicineIds.length
        ) {
            return res.status(400).json({
                message:
                    "The same medicine cannot be added twice."
            });
        }


        // Validate quantities and discount percentages per item
        for (const item of items) {

            if (
                !item.medicine_id ||
                !Number.isInteger(
                    Number(item.quantity)
                ) ||
                Number(item.quantity) <= 0
            ) {
                return res.status(400).json({
                    message:
                        "Each medicine must have a valid quantity."
                });
            }

            const pct = parseFloat(item.discount_percentage);

            if (
                isNaN(pct) ||
                pct < 0 ||
                pct > 100
            ) {
                return res.status(400).json({
                    message:
                        "Discount percentage must be between 0.00 and 100.00."
                });
            }
        }


        // Collect unique discount percentages submitted
        const submittedPercentages = [
            ...new Set(
                items.map(i =>
                    parseFloat(i.discount_percentage).toFixed(2)
                )
            )
        ];


        // Fetch active approved discount options for whitelist validation
        const discountPlaceholders =
            submittedPercentages.map(() => "?").join(",");

        const discountSql = `
            SELECT percentage
            FROM discount_options
            WHERE is_active = 1
              AND CAST(percentage AS CHAR) IN (${discountPlaceholders})
        `;


        db.query(
            discountSql,
            submittedPercentages,
            (discountError, approvedDiscounts) => {

                if (discountError) {
                    console.error(discountError);

                    return res.status(500).json({
                        message: "Database error validating discounts."
                    });
                }


                // Build a set of approved percentages (as strings to 2dp)
                const approvedSet = new Set(
                    approvedDiscounts.map(d =>
                        parseFloat(d.percentage).toFixed(2)
                    )
                );


                // Verify every submitted percentage is in the approved set
                for (const pctStr of submittedPercentages) {

                    if (!approvedSet.has(pctStr)) {

                        return res.status(400).json({
                            message:
                                `Discount ${pctStr}% is not an approved active discount option.`
                        });
                    }
                }


                // Fetch authoritative medicine prices from DB
                const medicinePlaceholders =
                    medicineIds.map(() => "?").join(",");


        const medicineSql = `
            SELECT
                medicine_id,
                medicine_name,
                selling_price,
                quantity,
                DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date
            FROM medicines
            WHERE medicine_id IN (${medicinePlaceholders})
        `;


                db.query(
                    medicineSql,
                    medicineIds,
                    (error, medicines) => {

                        if (error) {
                            console.error(error);

                            return res.status(500).json({
                                message: "Database error."
                            });
                        }


                        if (
                            medicines.length !==
                            medicineIds.length
                        ) {
                            return res.status(400).json({
                                message:
                                    "One or more medicines were not found."
                            });
                        }


                        // Build sale items with server-calculated values
                        let grossSaleTotal = 0;
                        let totalDiscount = 0;

                        const saleItems = [];


                        for (const item of items) {

                            const medicine =
                                medicines.find(
                                    m =>
                                        Number(m.medicine_id) ===
                                        Number(item.medicine_id)
                                );


                            const quantity =
                                Number(item.quantity);

                    const expiryValidation =
                        validateMedicineExpiry(medicine.expiry_date);

                    if (!expiryValidation.valid) {
                        return res.status(400).json({
                            success: false,
                            message:
                                `${medicine.medicine_name}: ${expiryValidation.message}`,
                            code: "MEDICINE_EXPIRY_ERROR",
                            medicine_id: medicine.medicine_id
                        });
                    }


                            if (
                                quantity >
                                Number(medicine.quantity)
                            ) {
                                return res.status(400).json({
                                    message:
                                        `Insufficient stock for ${medicine.medicine_name}. Available quantity: ${medicine.quantity}.`
                                });
                            }


                            // Use DB price – never trust client
                            const sellingPrice =
                                parseFloat(medicine.selling_price);

                            const discountPercentage =
                                parseFloat(item.discount_percentage);

                            const grossTotal =
                                sellingPrice * quantity;

                            const discountAmount =
                                Math.round(
                                    grossTotal *
                                    discountPercentage /
                                    100 *
                                    100
                                ) / 100;

                            const subtotal =
                                Math.round(
                                    (grossTotal - discountAmount) *
                                    100
                                ) / 100;


                            grossSaleTotal += grossTotal;
                            totalDiscount += discountAmount;


                            saleItems.push({
                                medicine_id:
                                    medicine.medicine_id,

                                quantity:
                                    quantity,

                                selling_price:
                                    sellingPrice,

                                discount_percentage:
                                    discountPercentage,

                                discount_amount:
                                    discountAmount,

                                subtotal:
                                    subtotal
                            });
                        }


                        const finalPayable =
                            Math.round(
                                (grossSaleTotal - totalDiscount) *
                                100
                            ) / 100;


                        db.beginTransaction(
                            transactionError => {

                                if (transactionError) {

                                    console.error(
                                        transactionError
                                    );

                                    return res.status(500).json({
                                        message:
                                            "Unable to start sale transaction."
                                    });
                                }


                                const saleSql = `
                                    INSERT INTO sales
                                    (
                                        customer_id,
                                        sold_by,
                                        total_amount
                                    )
                                    VALUES (?, ?, ?)
                                `;


                                db.query(
                                    saleSql,
                                    [
                                        customer_id || null,
                                        req.user.user_id,
                                        finalPayable
                                    ],
                                    (saleError, saleResult) => {

                                        if (saleError) {

                                            return db.rollback(
                                                () => {

                                                    console.error(
                                                        saleError
                                                    );

                                                    res.status(500).json({
                                                        message:
                                                            "Failed to create sale."
                                                    });
                                                }
                                            );
                                        }


                                        const saleId =
                                            saleResult.insertId;


                                        const itemSql = `
                                            INSERT INTO sale_items
                                            (
                                                sale_id,
                                                medicine_id,
                                                quantity,
                                                selling_price,
                                                discount_percentage,
                                                discount_amount,
                                                subtotal
                                            )
                                            VALUES ?
                                        `;


                                        const itemValues =
                                            saleItems.map(item => [
                                                saleId,
                                                item.medicine_id,
                                                item.quantity,
                                                item.selling_price,
                                                item.discount_percentage,
                                                item.discount_amount,
                                                item.subtotal
                                            ]);


                                        db.query(
                                            itemSql,
                                            [itemValues],
                                            (itemError) => {

                                                if (itemError) {

                                                    return db.rollback(
                                                        () => {

                                                            console.error(
                                                                itemError
                                                            );

                                                            res.status(500).json({
                                                                message:
                                                                    "Failed to save sale items."
                                                            });
                                                        }
                                                    );
                                                }


                                                // Update stock
                                                let completed = 0;

                                                let stockError = null;


                                                saleItems.forEach(
                                                    item => {

                                                        const stockSql = `
                                                            UPDATE medicines
                                                            SET quantity =
                                                                quantity - ?
                                                            WHERE medicine_id = ?
                                                        `;


                                                        db.query(
                                                            stockSql,
                                                            [
                                                                item.quantity,
                                                                item.medicine_id
                                                            ],
                                                            (
                                                                error
                                                            ) => {

                                                                if (
                                                                    error &&
                                                                    !stockError
                                                                ) {
                                                                    stockError =
                                                                        error;
                                                                }


                                                                completed++;


                                                                if (
                                                                    completed ===
                                                                    saleItems.length
                                                                ) {

                                                                    if (
                                                                        stockError
                                                                    ) {

                                                                        return db.rollback(
                                                                            () => {

                                                                                console.error(
                                                                                    stockError
                                                                                );

                                                                                res.status(500).json({
                                                                                    message:
                                                                                        "Failed to update stock."
                                                                                });
                                                                            }
                                                                        );
                                                                    }


                                                                    db.commit(
                                                                        commitError => {

                                                                            if (
                                                                                commitError
                                                                            ) {

                                                                                return db.rollback(
                                                                                    () => {

                                                                                        console.error(
                                                                                            commitError
                                                                                        );

                                                                                        res.status(500).json({
                                                                                            message:
                                                                                                "Failed to complete sale."
                                                                                        });
                                                                                    }
                                                                                );
                                                                            }


                                                                            res.status(201).json({
                                                                                message:
                                                                                    "Sale completed successfully.",

                                                                                sale_id:
                                                                                    saleId,

                                                                                gross_total:
                                                                                    grossSaleTotal.toFixed(2),

                                                                                total_discount:
                                                                                    totalDiscount.toFixed(2),

                                                                                total_amount:
                                                                                    finalPayable.toFixed(2)
                                                                            });
                                                                        }
                                                                    );
                                                                }
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    }
);


// =====================================================
// GET SALE DETAILS
// =====================================================

router.get(
    "/:id",
    authenticateToken,
    (req, res) => {

        const saleId =
            req.params.id;


        const saleSql = `
            SELECT
                s.sale_id,
                s.customer_id,
                c.customer_name,
                c.phone,
                s.sold_by,
                u.full_name AS sold_by_name,
                s.sale_date,
                s.total_amount
            FROM sales s
            LEFT JOIN customers c
                ON s.customer_id = c.customer_id
            LEFT JOIN users u
                ON s.sold_by = u.user_id
            WHERE s.sale_id = ?
        `;


        db.query(
            saleSql,
            [saleId],
            (error, saleResults) => {

                if (error) {

                    console.error(error);

                    return res.status(500).json({
                        message:
                            "Database error."
                    });
                }


                if (
                    saleResults.length === 0
                ) {

                    return res.status(404).json({
                        message:
                            "Sale not found."
                    });
                }


                const itemSql = `
                    SELECT
                        si.sale_item_id,
                        si.medicine_id,
                        m.medicine_name,
                        si.quantity,
                        si.selling_price,
                        si.discount_percentage,
                        si.discount_amount,
                        si.subtotal
                    FROM sale_items si
                    INNER JOIN medicines m
                        ON si.medicine_id = m.medicine_id
                    WHERE si.sale_id = ?
                `;


                db.query(
                    itemSql,
                    [saleId],
                    (itemError, itemResults) => {

                        if (itemError) {

                            console.error(
                                itemError
                            );

                            return res.status(500).json({
                                message:
                                    "Database error."
                            });
                        }


                        res.json({
                            sale:
                                saleResults[0],

                            items:
                                itemResults
                        });
                    }
                );
            }
        );
    }
);


module.exports = router;
