# Database Schema Topology

```mermaid
erDiagram
    categories ||--o{ categories : "parent_id -> id"
    products ||--o{ categories : "category_id -> id"
    orders ||--o{ users : "user_id -> id"
    order_items ||--o{ orders : "order_id -> id"
    order_items ||--o{ products : "product_id -> id"
    reviews ||--o{ products : "product_id -> id"
    reviews ||--o{ users : "user_id -> id"
    payments ||--o{ orders : "order_id -> id"

    users {
        UUID id PK
        VARCHAR_255_ email
        VARCHAR_100_ full_name
        VARCHAR_500_ avatar_url
        VARCHAR_30_ role
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    categories {
        SERIAL id PK
        VARCHAR_100_ name
        VARCHAR_100_ slug
        TEXT description
        INT parent_id FK
        TIMESTAMP created_at
    }
    products {
        UUID id PK
        INT category_id FK
        VARCHAR_255_ title
        VARCHAR_64_ sku
        DECIMAL_10__2_ price
        INT stock_quantity
        BOOLEAN is_published
        TIMESTAMP created_at
    }
    orders {
        UUID id PK
        UUID user_id FK
        VARCHAR_50_ order_number
        VARCHAR_30_ status
        DECIMAL_12__2_ total_amount
        TEXT shipping_address
        TIMESTAMP created_at
    }
    order_items {
        SERIAL id PK
        UUID order_id FK
        UUID product_id FK
        DECIMAL_10__2_ unit_price
        INT quantity
    }
    reviews {
        SERIAL id PK
        UUID product_id FK
        UUID user_id FK
        INT rating
        TEXT comment
        TIMESTAMP created_at
    }
    payments {
        UUID id PK
        UUID order_id FK
        VARCHAR_50_ provider
        VARCHAR_100_ transaction_id
        DECIMAL_12__2_ amount
        VARCHAR_30_ status
        TIMESTAMP paid_at
    }
```

## 📖 Database Data Dictionary

### Table: `users`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `NOT NULL` | | 
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | | 
| `full_name` | `VARCHAR(100)` | `NOT NULL` | | 
| `avatar_url` | `VARCHAR(500)` | — | | 
| `role` | `VARCHAR(30)` | — | | 
| `created_at` | `TIMESTAMP` | `NOT NULL` | | 
| `updated_at` | `TIMESTAMP` | `NOT NULL` | | 

### Table: `categories`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY`, `NOT NULL` | | 
| `name` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | | 
| `slug` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | | 
| `description` | `TEXT` | — | | 
| `parent_id` | `INT` | `FOREIGN KEY` | | 
| `created_at` | `TIMESTAMP` | `NOT NULL` | | 

### Table: `products`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `NOT NULL` | | 
| `category_id` | `INT` | `FOREIGN KEY`, `NOT NULL` | | 
| `title` | `VARCHAR(255)` | `NOT NULL` | | 
| `sku` | `VARCHAR(64)` | `NOT NULL`, `UNIQUE` | | 
| `price` | `DECIMAL(10, 2)` | `NOT NULL` | | 
| `stock_quantity` | `INT` | `NOT NULL` | | 
| `is_published` | `BOOLEAN` | — | | 
| `created_at` | `TIMESTAMP` | `NOT NULL` | | 

### Table: `orders`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `NOT NULL` | | 
| `user_id` | `UUID` | `FOREIGN KEY`, `NOT NULL` | | 
| `order_number` | `VARCHAR(50)` | `NOT NULL`, `UNIQUE` | | 
| `status` | `VARCHAR(30)` | `NOT NULL` | | 
| `total_amount` | `DECIMAL(12, 2)` | `NOT NULL` | | 
| `shipping_address` | `TEXT` | `NOT NULL` | | 
| `created_at` | `TIMESTAMP` | `NOT NULL` | | 

### Table: `order_items`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY`, `NOT NULL` | | 
| `order_id` | `UUID` | `FOREIGN KEY`, `NOT NULL` | | 
| `product_id` | `UUID` | `FOREIGN KEY`, `NOT NULL` | | 
| `unit_price` | `DECIMAL(10, 2)` | `NOT NULL` | | 
| `quantity` | `INT` | `NOT NULL` | | 

### Table: `reviews`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY`, `NOT NULL` | | 
| `product_id` | `UUID` | `FOREIGN KEY`, `NOT NULL` | | 
| `user_id` | `UUID` | `FOREIGN KEY`, `NOT NULL` | | 
| `rating` | `INT` | `NOT NULL` | | 
| `comment` | `TEXT` | — | | 
| `created_at` | `TIMESTAMP` | `NOT NULL` | | 

### Table: `payments`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `NOT NULL` | | 
| `order_id` | `UUID` | `FOREIGN KEY`, `NOT NULL`, `UNIQUE` | | 
| `provider` | `VARCHAR(50)` | `NOT NULL` | | 
| `transaction_id` | `VARCHAR(100)` | `NOT NULL` | | 
| `amount` | `DECIMAL(12, 2)` | `NOT NULL` | | 
| `status` | `VARCHAR(30)` | `NOT NULL` | | 
| `paid_at` | `TIMESTAMP` | — | | 

