# 🤖 Database Schema Topology

> **Metadata**: 7 Models | 46 Columns | 8 Relational Constraints
> **Optimized For**: ChatGPT, Google Gemini, Anthropic Claude, Cursor AI, GitHub Copilot

## 📋 Database Architecture Summary
This document contains the complete normalized schema topology, primary keys, data types, and relational foreign key constraints.

### 🗄️ Relational Dependency Graph
- `categories.parent_id` ➔ `categories.id` [Cardinality: N:1]
- `products.category_id` ➔ `categories.id` [Cardinality: N:1]
- `orders.user_id` ➔ `users.id` [Cardinality: N:1]
- `order_items.order_id` ➔ `orders.id` [Cardinality: N:1]
- `order_items.product_id` ➔ `products.id` [Cardinality: N:1]
- `reviews.product_id` ➔ `products.id` [Cardinality: N:1]
- `reviews.user_id` ➔ `users.id` [Cardinality: N:1]
- `payments.order_id` ➔ `orders.id` [Cardinality: N:1]

---

### 📦 Table Models & Field Definitions

#### Table: `users` (SQL)
- `id`: `UUID` [PRIMARY KEY, NOT NULL]
- `email`: `VARCHAR(255)` [UNIQUE, NOT NULL]
- `full_name`: `VARCHAR(100)` [NOT NULL]
- `avatar_url`: `VARCHAR(500)`
- `role`: `VARCHAR(30)`
- `created_at`: `TIMESTAMP` [NOT NULL]
- `updated_at`: `TIMESTAMP` [NOT NULL]

#### Table: `categories` (SQL)
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `name`: `VARCHAR(100)` [UNIQUE, NOT NULL]
- `slug`: `VARCHAR(100)` [UNIQUE, NOT NULL]
- `description`: `TEXT`
- `parent_id`: `INT` [FOREIGN KEY ➔ categories.id]
- `created_at`: `TIMESTAMP` [NOT NULL]

#### Table: `products` (SQL)
- `id`: `UUID` [PRIMARY KEY, NOT NULL]
- `category_id`: `INT` [FOREIGN KEY ➔ categories.id, NOT NULL]
- `title`: `VARCHAR(255)` [NOT NULL]
- `sku`: `VARCHAR(64)` [UNIQUE, NOT NULL]
- `price`: `DECIMAL(10, 2)` [NOT NULL]
- `stock_quantity`: `INT` [NOT NULL]
- `is_published`: `BOOLEAN`
- `created_at`: `TIMESTAMP` [NOT NULL]

#### Table: `orders` (SQL)
- `id`: `UUID` [PRIMARY KEY, NOT NULL]
- `user_id`: `UUID` [FOREIGN KEY ➔ users.id, NOT NULL]
- `order_number`: `VARCHAR(50)` [UNIQUE, NOT NULL]
- `status`: `VARCHAR(30)` [NOT NULL]
- `total_amount`: `DECIMAL(12, 2)` [NOT NULL]
- `shipping_address`: `TEXT` [NOT NULL]
- `created_at`: `TIMESTAMP` [NOT NULL]

#### Table: `order_items` (SQL)
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `order_id`: `UUID` [FOREIGN KEY ➔ orders.id, NOT NULL]
- `product_id`: `UUID` [FOREIGN KEY ➔ products.id, NOT NULL]
- `unit_price`: `DECIMAL(10, 2)` [NOT NULL]
- `quantity`: `INT` [NOT NULL]

#### Table: `reviews` (SQL)
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `product_id`: `UUID` [FOREIGN KEY ➔ products.id, NOT NULL]
- `user_id`: `UUID` [FOREIGN KEY ➔ users.id, NOT NULL]
- `rating`: `INT` [NOT NULL]
- `comment`: `TEXT`
- `created_at`: `TIMESTAMP` [NOT NULL]

#### Table: `payments` (SQL)
- `id`: `UUID` [PRIMARY KEY, NOT NULL]
- `order_id`: `UUID` [FOREIGN KEY ➔ orders.id, UNIQUE, NOT NULL]
- `provider`: `VARCHAR(50)` [NOT NULL]
- `transaction_id`: `VARCHAR(100)` [NOT NULL]
- `amount`: `DECIMAL(12, 2)` [NOT NULL]
- `status`: `VARCHAR(30)` [NOT NULL]
- `paid_at`: `TIMESTAMP`

---

## 💡 AI System Instructions for Query Generation & Optimization
When assisting with this database schema:
1. Always respect Primary Keys and Foreign Key dependencies when constructing SQL JOINs or ORM queries.
2. Ensure all Foreign Key references point to valid target columns specified above.
3. Recommend appropriate indexes for frequently filtered columns and foreign key fields.
4. Maintain referential integrity and handle CASCADE rules appropriately.
