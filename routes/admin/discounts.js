const express = require("express");

const db = require("../../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// GET ALL DISCOUNT OPTIONS (Admin only – includes inactive)
// =====================================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin"),
    (req, res) => {

        const sql = `
            SELECT
                d.discount_id,
                d.percentage,
                d.label,
                d.is_active,
                d.created_by,
                u.full_name AS created_by_name,
                d.created_at,
                d.updated_at
            FROM discount_options d
            LEFT JOIN users u
                ON d.created_by = u.user_id
            ORDER BY d.percentage ASC
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
// ADD DISCOUNT OPTION (Admin only)
// =====================================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin"),
    (req, res) => {

        const {
            percentage,
            label
        } = req.body;


        // Validate percentage
        const pct = parseFloat(percentage);

        if (
            isNaN(pct) ||
            pct < 0 ||
            pct > 100
        ) {
            return res.status(400).json({
                message:
                    "Percentage must be a number between 0.00 and 100.00."
            });
        }


        // Validate label
        if (
            !label ||
            typeof label !== "string" ||
            label.trim().length === 0
        ) {
            return res.status(400).json({
                message: "Label is required."
            });
        }


        // Check for duplicate percentage
        const checkSql = `
            SELECT discount_id
            FROM discount_options
            WHERE percentage = ?
        `;

        db.query(
            checkSql,
            [pct.toFixed(2)],
            (checkError, checkResults) => {

                if (checkError) {
                    console.error(checkError);

                    return res.status(500).json({
                        message: "Database error."
                    });
                }


                if (checkResults.length > 0) {
                    return res.status(409).json({
                        message:
                            `A discount option for ${pct.toFixed(2)}% already exists.`
                    });
                }


                const insertSql = `
                    INSERT INTO discount_options
                    (percentage, label, is_active, created_by)
                    VALUES (?, ?, 1, ?)
                `;

                db.query(
                    insertSql,
                    [
                        pct.toFixed(2),
                        label.trim(),
                        req.user.user_id
                    ],
                    (insertError, insertResult) => {

                        if (insertError) {
                            console.error(insertError);

                            return res.status(500).json({
                                message: "Failed to add discount option."
                            });
                        }

                        res.status(201).json({
                            message: "Discount option added successfully.",
                            discount_id: insertResult.insertId
                        });
                    }
                );
            }
        );
    }
);


// =====================================================
// UPDATE DISCOUNT STATUS – ACTIVATE / DEACTIVATE (Admin only)
// =====================================================

router.put(
    "/:id/status",
    authenticateToken,
    authorizeRoles("admin"),
    (req, res) => {

        const discountId = req.params.id;

        const { is_active } = req.body;


        if (
            is_active === undefined ||
            is_active === null ||
            (is_active !== 0 && is_active !== 1 &&
             is_active !== "0" && is_active !== "1" &&
             is_active !== true && is_active !== false)
        ) {
            return res.status(400).json({
                message:
                    "is_active must be 1 (active) or 0 (inactive)."
            });
        }

        const activeValue = Number(is_active) ? 1 : 0;


        // Fetch the option first to confirm it exists
        const checkSql = `
            SELECT discount_id, percentage
            FROM discount_options
            WHERE discount_id = ?
        `;

        db.query(
            checkSql,
            [discountId],
            (checkError, checkResults) => {

                if (checkError) {
                    console.error(checkError);

                    return res.status(500).json({
                        message: "Database error."
                    });
                }


                if (checkResults.length === 0) {
                    return res.status(404).json({
                        message: "Discount option not found."
                    });
                }


                const updateSql = `
                    UPDATE discount_options
                    SET is_active = ?
                    WHERE discount_id = ?
                `;

                db.query(
                    updateSql,
                    [activeValue, discountId],
                    (updateError) => {

                        if (updateError) {
                            console.error(updateError);

                            return res.status(500).json({
                                message:
                                    "Failed to update discount option status."
                            });
                        }

                        res.json({
                            message:
                                `Discount option ${activeValue ? "activated" : "deactivated"} successfully.`
                        });
                    }
                );
            }
        );
    }
);


module.exports = router;

