# CR-003 Implementation Report
**Medicine Price Validation and Role-Based Discount Management**

> [!IMPORTANT]
> All acceptance criteria from CR-003 and the Impact Analysis have been implemented and verified.

---

## 1. Summary

CR-003 introduced Admin-controlled discount options and enforced server-side medicine price and discount validation across the Sales & Billing module. The backend now retrieves all medicine prices from the database, validates every discount selection against the active approved list, and calculates sale totals independently — client-submitted prices and totals are never trusted.

---

## 2. Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `routes/sales.js` | **Modified** | Added `GET /api/sales/discounts`; rewrote `POST /api/sales` with discount whitelist validation, DB price lookup, and server-side calculation |
| `routes/admin/discounts.js` | **New** | Admin-only endpoints: `GET`, `POST`, `PUT /:id/status` |
| `app.js` | **Modified** | Registered `adminDiscountRoutes` at `/api/admin/discounts` |
| `public/pages/sales.html` | **Modified** | Added discount breakdown summary; added Discounts sidebar link |
| `public/js/sales.js` | **Modified** | Loads discount options from API; dropdown replaces free-text; live per-item and sale-total breakdown; sends `discount_percentage` per item to server |
| `public/css/sales.css` | **Modified** | Styles for discount dropdown column, per-item breakdown, and sale summary breakdown rows |
| `public/pages/admin/discounts.html` | **New** | Admin-only Discount Management page |
| `public/js/admin/discounts.js` | **New** | Load all options, add new option, toggle active/inactive |
| `public/css/discounts.css` | **New** | Styles for Admin Discount Management page |
| `public/js/roleMenu.js` | **Modified** | Shows "Discounts" sidebar link to Admin only |
| `public/pages/*.html` (x7) | **Modified** | Added Discounts sidebar link (hidden by default, shown by roleMenu.js for admin) |
| `schema.sql` | **Updated** | Documents `discount_options` table and updated `sale_items` snapshot columns |
| `seed.sql` | **Updated** | Includes the 5 baseline discount options |

---

## 3. Database State

The schema was already applied to the live database. No migration was needed.

### `discount_options` (pre-seeded)
| ID | Percentage | Label | Active |
|----|-----------|-------|--------|
| 1 | 0.00% | Standard (0%) | ✅ |
| 2 | 5.00% | Special (5%) | ✅ |
| 3 | 10.00% | Staff Discount (10%) | ✅ |
| 4 | 15.00% | Privilege (15%) | ✅ |
| 5 | 20.00% | VIP (20%) | ✅ |

### `sale_items` — snapshot columns added
| Column | Type | Default |
|--------|------|---------|
| `discount_percentage` | `DECIMAL(5,2)` | `0.00` |
| `discount_amount` | `DECIMAL(10,2)` | `0.00` |

---

## 4. API Endpoints

| Method | Route | Roles | Description |
|--------|-------|-------|-------------|
| `GET` | `/api/sales/discounts` | Admin, Pharmacist, Staff | Active discount options for Sales dropdown |
| `GET` | `/api/admin/discounts` | **Admin only** | All options including inactive |
| `POST` | `/api/admin/discounts` | **Admin only** | Add new approved discount option |
| `PUT` | `/api/admin/discounts/:id/status` | **Admin only** | Activate or deactivate an option |
| `POST` | `/api/sales` | Admin, Pharmacist, Staff | Create sale with server-side validation |

---

## 5. Calculation Rules (Server-Side Only)

For each item:
- **Gross Total** = DB `selling_price` × `quantity`
- **Discount Amount** = `round(Gross Total × discount_pct / 100, 2)`
- **Subtotal** = `Gross Total − Discount Amount`

For the sale:
- **Final Payable** = sum of all Subtotals

Client-submitted prices and totals are **ignored**.

---

## 6. Security Controls

| Requirement | Implementation |
|-------------|----------------|
| Admin-only discount management | `authorizeRoles("admin")` on all `/api/admin/discounts` routes |
| 403 for non-admin on management routes | `authorizeRoles` middleware |
| Discount whitelist validation | Each submitted `%` verified against `discount_options WHERE is_active = 1` |
| DB price used — not client price | `selling_price` from `medicines` table per sale |
| Inactive discounts rejected | Whitelist query filters `is_active = 1`; unknown % → `400 Bad Request` |
| Snapshot per item | `selling_price`, `discount_percentage`, `discount_amount`, `subtotal` written to `sale_items` |
| Frontend guard | `admin/discounts.js` redirects non-admin to dashboard immediately |

---

## 7. Acceptance Criteria

| AC | Requirement | Status |
|----|-------------|--------|
| AC-001 | Only Admin can add/manage discount options | ✅ |
| AC-002 | Pharmacist/Staff can view & select; cannot manage | ✅ |
| AC-003 | Sales dropdown: active options only, defaults to 0% | ✅ |
| AC-004 | Changing dropdown updates discount and subtotal live | ✅ |
| AC-005 | Unapproved/inactive/duplicate/out-of-range rejected | ✅ |
| AC-006 | Backend uses DB prices; ignores client-submitted prices | ✅ |
| AC-007 | Sale items retain snapshot fields | ✅ |
| AC-008 | Existing auth, stock, and sales workflow unchanged | ✅ |

---

## 8. Out of Scope

- Customer loyalty points (CR-008)
- Multi-medicine basket promotions e.g. Buy 2 Get 1 Free (CR-009)
- Multi-currency (system uses Rs. only)

---

## 9. Deployment Notes

> [!WARNING]
> The `discount_options` table and `sale_items` new columns must exist before deploying. They are already applied in the current environment. For a fresh install: run `schema.sql` then `seed.sql`.

Deployment order: **Database → Backend → Frontend → Regression test all three roles**.
