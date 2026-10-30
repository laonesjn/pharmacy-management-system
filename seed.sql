INSERT INTO categories (category_name, description) VALUES
('Pain Relief', 'Medicines for pain and fever'),
('Antibiotics', 'Prescription antibiotics'),
('Vitamins', 'Vitamins and supplements'),
('First Aid', 'Basic first-aid supplies');

INSERT INTO suppliers (supplier_name, company_name, phone, email, address) VALUES
('Amina Patel', 'HealthPlus Distributors', '555-0101', 'orders@healthplus.example', '12 Market Street'),
('David Chen', 'MedSupply Co.', '555-0102', 'sales@medsupply.example', '48 River Road');

INSERT INTO medicines
(medicine_name, category_id, supplier_id, batch_number, purchase_price, selling_price, quantity, reorder_level, expiry_date)
VALUES
('Paracetamol 500mg', (SELECT category_id FROM categories WHERE category_name = 'Pain Relief'), (SELECT supplier_id FROM suppliers WHERE supplier_name = 'Amina Patel'), 'PAR-2026-001', 2.50, 4.00, 120, 20, '2027-12-31'),
('Ibuprofen 200mg', (SELECT category_id FROM categories WHERE category_name = 'Pain Relief'), (SELECT supplier_id FROM suppliers WHERE supplier_name = 'Amina Patel'), 'IBU-2026-002', 3.00, 5.50, 80, 15, '2027-09-30'),
('Amoxicillin 500mg', (SELECT category_id FROM categories WHERE category_name = 'Antibiotics'), (SELECT supplier_id FROM suppliers WHERE supplier_name = 'David Chen'), 'AMX-2026-003', 6.00, 9.50, 45, 10, '2027-06-30'),
('Vitamin C 1000mg', (SELECT category_id FROM categories WHERE category_name = 'Vitamins'), (SELECT supplier_id FROM suppliers WHERE supplier_name = 'David Chen'), 'VTC-2026-004', 4.25, 7.00, 65, 12, '2028-03-31'),
('Adhesive Bandages', (SELECT category_id FROM categories WHERE category_name = 'First Aid'), (SELECT supplier_id FROM suppliers WHERE supplier_name = 'Amina Patel'), 'BAN-2026-005', 1.50, 3.00, 100, 25, '2028-12-31');

INSERT INTO customers (customer_name, phone, email, address) VALUES
('Jordan Lee', '555-0201', 'jordan.lee@example.com', '7 Oak Avenue'),
('Sam Rivera', '555-0202', 'sam.rivera@example.com', '19 Hill Street');

-- CR-003: Baseline approved discount options (created by admin user_id = 1)
INSERT INTO discount_options (percentage, label, is_active, created_by) VALUES
(0.00,  'Standard (0%)',        1, 1),
(5.00,  'Special (5%)',         1, 1),
(10.00, 'Staff Discount (10%)', 1, 1),
(15.00, 'Privilege (15%)',      1, 1),
(20.00, 'VIP (20%)',            1, 1);
