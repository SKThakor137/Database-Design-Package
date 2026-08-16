-- E-Commerce SQL Schema Migration

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(30) DEFAULT 'customer',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INT REFERENCES categories(id),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE products (
    id UUID PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    sku VARCHAR(64) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id),
    user_id UUID NOT NULL REFERENCES users(id),
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
    provider VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL,
    paid_at TIMESTAMP
);
