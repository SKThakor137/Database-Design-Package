# E-Commerce Architecture ERD

```mermaid
erDiagram
    products ||--o{ categories : "category_id -> id"
    orders ||--o{ users : "user_id -> id"
    order_items ||--o{ orders : "order_id -> id"
    order_items ||--o{ products : "product_id -> id"
    reviews ||--o{ users : "user_id -> id"
    reviews ||--o{ products : "product_id -> id"

    users {
        SERIAL id PK
        VARCHAR_100_ name
        VARCHAR_255_ email
        VARCHAR_255_ password_hash
        VARCHAR_500_ avatar_url
        VARCHAR_20_ role
        TIMESTAMP created_at
    }
    categories {
        SERIAL id PK
        VARCHAR_100_ name
        VARCHAR_120_ slug
        TEXT description
    }
    products {
        SERIAL id PK
        INT category_id FK
        VARCHAR_200_ name
        VARCHAR_220_ slug
        DECIMAL_10__2_ price
        INT stock
        BOOLEAN is_active
        TIMESTAMP created_at
    }
    orders {
        SERIAL id PK
        INT user_id FK
        VARCHAR_50_ order_number
        DECIMAL_10__2_ total_amount
        VARCHAR_50_ status
        VARCHAR_50_ payment_status
        TEXT shipping_address
        TIMESTAMP created_at
    }
    order_items {
        SERIAL id PK
        INT order_id FK
        INT product_id FK
        INT quantity
        DECIMAL_10__2_ unit_price
    }
    reviews {
        SERIAL id PK
        INT user_id FK
        INT product_id FK
        INT rating
        TEXT comment
        TIMESTAMP created_at
    }
```

## 📖 Database Data Dictionary

### Table: `users`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY`, `NOT NULL` | | 
| `name` | `VARCHAR(100)` | `NOT NULL` | | 
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | | 
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | | 
| `avatar_url` | `VARCHAR(500)` | — | | 
| `role` | `VARCHAR(20)` | — | | 
| `created_at` | `TIMESTAMP` | — | | 

### Table: `categories`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY`, `NOT NULL` | | 
| `name` | `VARCHAR(100)` | `NOT NULL` | | 
| `slug` | `VARCHAR(120)` | `NOT NULL`, `UNIQUE` | | 
| `description` | `TEXT` | — | | 

### Table: `products`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY`, `NOT NULL` | | 
| `category_id` | `INT` | `FOREIGN KEY`, `NOT NULL` | | 
| `name` | `VARCHAR(200)` | `NOT NULL` | | 
| `slug` | `VARCHAR(220)` | `NOT NULL`, `UNIQUE` | | 
| `price` | `DECIMAL(10, 2)` | `NOT NULL` | | 
| `stock` | `INT` | — | | 
| `is_active` | `BOOLEAN` | — | | 
| `created_at` | `TIMESTAMP` | — | | 

### Table: `orders`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY`, `NOT NULL` | | 
| `user_id` | `INT` | `FOREIGN KEY`, `NOT NULL` | | 
| `order_number` | `VARCHAR(50)` | `NOT NULL`, `UNIQUE` | | 
| `total_amount` | `DECIMAL(10, 2)` | `NOT NULL` | | 
| `status` | `VARCHAR(50)` | — | | 
| `payment_status` | `VARCHAR(50)` | — | | 
| `shipping_address` | `TEXT` | `NOT NULL` | | 
| `created_at` | `TIMESTAMP` | — | | 

### Table: `order_items`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY`, `NOT NULL` | | 
| `order_id` | `INT` | `FOREIGN KEY`, `NOT NULL` | | 
| `product_id` | `INT` | `FOREIGN KEY`, `NOT NULL` | | 
| `quantity` | `INT` | `NOT NULL` | | 
| `unit_price` | `DECIMAL(10, 2)` | `NOT NULL` | | 

### Table: `reviews`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY`, `NOT NULL` | | 
| `user_id` | `INT` | `FOREIGN KEY`, `NOT NULL` | | 
| `product_id` | `INT` | `FOREIGN KEY`, `NOT NULL` | | 
| `rating` | `INT` | `NOT NULL` | | 
| `comment` | `TEXT` | — | | 
| `created_at` | `TIMESTAMP` | — | | 

