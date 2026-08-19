# 🤖 Database Schema Topology

> **Metadata**: 28 Models | 269 Columns | 52 Relational Constraints
> **Optimized For**: ChatGPT, Google Gemini, Anthropic Claude, Cursor AI, GitHub Copilot

## 📋 Database Architecture Summary
This document contains the complete normalized schema topology, primary keys, data types, and relational foreign key constraints.

### 🗄️ Relational Dependency Graph
- `Account.posts` ➔ `Post.id` [Cardinality: 1:N]
- `Post.author` ➔ `Account.id` [Cardinality: N:1]
- `Post.tags` ➔ `Tag.id` [Cardinality: 1:N]
- `Post.author` ➔ `User.id` [Cardinality: N:1]
- `Post.comments` ➔ `Comment.id` [Cardinality: 1:N]
- `Post.authorId` ➔ `User.id` [Cardinality: N:1]
- `Tag.posts` ➔ `Post.id` [Cardinality: 1:N]
- `User.posts` ➔ `Post.id` [Cardinality: 1:N]
- `User.comments` ➔ `Comment.id` [Cardinality: 1:N]
- `Article.author` ➔ `User._id` [Cardinality: N:1]
- `Article.category` ➔ `Category._id` [Cardinality: N:1]
- `Comment.article` ➔ `Article._id` [Cardinality: N:1]
- `Comment.author` ➔ `User._id` [Cardinality: N:1]
- `Comment.author` ➔ `User.id` [Cardinality: N:1]
- `Comment.post` ➔ `Post.id` [Cardinality: N:1]
- `Comment.taskId` ➔ `Task.id` [Cardinality: N:1]
- `users.user_id` ➔ `orders.id` [Cardinality: N:1]
- `categories.parent_id` ➔ `categories.id` [Cardinality: N:1]
- `products.category_id` ➔ `categories.id` [Cardinality: N:1]
- `products.category_id` ➔ `categories.id` [Cardinality: N:1]
- `products.category_id` ➔ `categories.id` [Cardinality: N:1]
- `orders.user_id` ➔ `users.id` [Cardinality: N:1]
- `orders.user_id` ➔ `users.id` [Cardinality: N:1]
- `orders.user_id` ➔ `users.id` [Cardinality: N:1]
- `order_items.order_id` ➔ `orders.id` [Cardinality: N:1]
- `order_items.product_id` ➔ `products.id` [Cardinality: N:1]
- `order_items.order_id` ➔ `orders.id` [Cardinality: N:1]
- `order_items.product_id` ➔ `products.id` [Cardinality: N:1]
- `reviews.product_id` ➔ `products.id` [Cardinality: N:1]
- `reviews.user_id` ➔ `users.id` [Cardinality: N:1]
- `reviews.user_id` ➔ `users.id` [Cardinality: N:1]
- `reviews.product_id` ➔ `products.id` [Cardinality: N:1]
- `payments.order_id` ➔ `orders.id` [Cardinality: N:1]
- `Course.instructorId` ➔ `Customer._id` [Cardinality: N:1]
- `Enrollment.studentId` ➔ `Customer._id` [Cardinality: N:1]
- `Enrollment.courseId` ➔ `Course._id` [Cardinality: N:1]
- `Profile.userId` ➔ `User.id` [Cardinality: N:1]
- `PostTag.postId` ➔ `Post.id` [Cardinality: N:1]
- `PostTag.tagId` ➔ `Tag.id` [Cardinality: N:1]
- `posts.user_id` ➔ `users.id` [Cardinality: N:1]
- `comments.user_id` ➔ `users.id` [Cardinality: N:1]
- `comments.post_id` ➔ `posts.id` [Cardinality: N:1]
- `Organization.teams` ➔ `Team.id` [Cardinality: 1:N]
- `Member.organizationId` ➔ `Organization.id` [Cardinality: N:1]
- `Member.team_id` ➔ `Team.id` [Cardinality: N:1]
- `Project.organizationId` ➔ `Organization.id` [Cardinality: N:1]
- `Project.leadEmployeeId` ➔ `Employee.id` [Cardinality: N:1]
- `Task.projectId` ➔ `Project.id` [Cardinality: N:1]
- `Employee.departmentId` ➔ `Department.id` [Cardinality: N:1]
- `Employee.departmentId` ➔ `Department.id` [Cardinality: N:1]
- `Employee.departmentId` ➔ `Department.id` [Cardinality: N:1]
- `Team.organization_id` ➔ `Organization.id` [Cardinality: N:1]

---

### 📦 Table Models & Field Definitions

#### Table: `Account` (GRAPHQL)
- `id`: `ID!` [PRIMARY KEY, UNIQUE, NOT NULL]
- `email`: `String!` [NOT NULL]
- `username`: `String!` [NOT NULL]
- `isActive`: `Boolean!` [NOT NULL]
- `posts`: `BIGINT` [FOREIGN KEY ➔ Post.id]

#### Table: `Post` (GRAPHQL)
- `id`: `ID!` [PRIMARY KEY, UNIQUE, NOT NULL]
- `title`: `String!` [NOT NULL]
- `body`: `String!` [NOT NULL]
- `publishedAt`: `String`
- `author`: `BIGINT` [FOREIGN KEY ➔ Account.id]
- `tags`: `BIGINT` [FOREIGN KEY ➔ Tag.id]
- `id`: `ID!` [PRIMARY KEY, UNIQUE, NOT NULL]
- `title`: `String!` [NOT NULL]
- `body`: `String`
- `published`: `Boolean!` [NOT NULL]
- `comments`: `BIGINT` [FOREIGN KEY ➔ Comment.id]
- `id`: `String` [PRIMARY KEY, NOT NULL]
- `title`: `String` [NOT NULL]
- `content`: `String?`
- `published`: `Boolean` [NOT NULL]
- `authorId`: `String` [FOREIGN KEY ➔ User.id, NOT NULL]
- `createdAt`: `DateTime` [NOT NULL]

#### Table: `Tag` (GRAPHQL)
- `id`: `ID!` [PRIMARY KEY, UNIQUE, NOT NULL]
- `name`: `String!` [NOT NULL]
- `posts`: `BIGINT` [FOREIGN KEY ➔ Post.id]
- `id`: `String` [PRIMARY KEY, NOT NULL]
- `name`: `String` [UNIQUE, NOT NULL]

#### Table: `User` (MONGOOSE)
- `_id`: `ObjectId` [PRIMARY KEY, UNIQUE, NOT NULL]
- `username`: `String` [UNIQUE, NOT NULL]
- `email`: `String` [UNIQUE, NOT NULL]
- `passwordHash`: `String` [NOT NULL]
- `bio`: `String`
- `isActive`: `Boolean`
- `createdAt`: `Date`
- `id`: `ID!` [PRIMARY KEY, UNIQUE, NOT NULL]
- `name`: `String!` [NOT NULL]
- `email`: `String!` [NOT NULL]
- `createdAt`: `String!` [NOT NULL]
- `posts`: `BIGINT` [FOREIGN KEY ➔ Post.id]
- `comments`: `BIGINT` [FOREIGN KEY ➔ Comment.id]
- `id`: `String` [PRIMARY KEY, NOT NULL]
- `email`: `String` [UNIQUE, NOT NULL]
- `name`: `String?`
- `role`: `String` [NOT NULL]
- `createdAt`: `DateTime` [NOT NULL]

#### Table: `Category` (MONGOOSE)
- `_id`: `ObjectId` [PRIMARY KEY, UNIQUE, NOT NULL]
- `name`: `String` [UNIQUE, NOT NULL]
- `slug`: `String` [NOT NULL]
- `description`: `String`

#### Table: `Article` (MONGOOSE)
- `_id`: `ObjectId` [PRIMARY KEY, UNIQUE, NOT NULL]
- `title`: `String` [NOT NULL]
- `slug`: `String` [UNIQUE, NOT NULL]
- `content`: `String` [NOT NULL]
- `author`: `ObjectId` [FOREIGN KEY ➔ User._id, NOT NULL]
- `category`: `ObjectId` [FOREIGN KEY ➔ Category._id]
- `tags`: `[String]`
- `viewCount`: `Number`
- `isPublished`: `Boolean`
- `publishedAt`: `Date`

#### Table: `Comment` (MONGOOSE)
- `_id`: `ObjectId` [PRIMARY KEY, UNIQUE, NOT NULL]
- `article`: `ObjectId` [FOREIGN KEY ➔ Article._id, NOT NULL]
- `author`: `ObjectId` [FOREIGN KEY ➔ User._id, NOT NULL]
- `body`: `String` [NOT NULL]
- `createdAt`: `Date`
- `id`: `ID!` [PRIMARY KEY, UNIQUE, NOT NULL]
- `message`: `String!` [NOT NULL]
- `createdAt`: `String!` [NOT NULL]
- `post`: `BIGINT` [FOREIGN KEY ➔ Post.id]
- `id`: `String` [PRIMARY KEY, NOT NULL]
- `taskId`: `String` [FOREIGN KEY ➔ Task.id, NOT NULL]
- `authorId`: `String` [NOT NULL]
- `content`: `String` [NOT NULL]
- `createdAt`: `DateTime` [NOT NULL]

#### Table: `users` (DJANGO)
- `id`: `BIGINT` [PRIMARY KEY, UNIQUE, NOT NULL]
- `name`: `VARCHAR(150)` [NOT NULL]
- `email`: `VARCHAR(254)` [UNIQUE, NOT NULL]
- `is_staff`: `BOOLEAN` [NOT NULL]
- `created_at`: `DATETIME` [NOT NULL]
- `id`: `UUID` [PRIMARY KEY, NOT NULL]
- `email`: `VARCHAR(255)` [UNIQUE, NOT NULL]
- `full_name`: `VARCHAR(100)` [NOT NULL]
- `avatar_url`: `VARCHAR(500)`
- `role`: `VARCHAR(30)`
- `created_at`: `TIMESTAMP` [NOT NULL]
- `updated_at`: `TIMESTAMP` [NOT NULL]
- `is_active`: `BOOLEAN` [NOT NULL]
- `user_id`: `BIGINT` [FOREIGN KEY ➔ orders.id]
- `password`: `VARCHAR(255)` [NOT NULL]
- `orders`: `TEXT`
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `name`: `VARCHAR(100)` [NOT NULL]
- `email`: `VARCHAR(255)` [UNIQUE, NOT NULL]
- `password_hash`: `VARCHAR(255)` [NOT NULL]
- `avatar_url`: `VARCHAR(500)`
- `role`: `VARCHAR(20)`
- `created_at`: `TIMESTAMP`

#### Table: `categories` (DJANGO)
- `id`: `BIGINT` [PRIMARY KEY, UNIQUE, NOT NULL]
- `name`: `VARCHAR(100)` [NOT NULL]
- `slug`: `SLUGFIELD` [UNIQUE, NOT NULL]
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `name`: `VARCHAR(100)` [UNIQUE, NOT NULL]
- `slug`: `VARCHAR(100)` [UNIQUE, NOT NULL]
- `description`: `TEXT`
- `parent_id`: `INT` [FOREIGN KEY ➔ categories.id]
- `created_at`: `TIMESTAMP` [NOT NULL]
- `updated_at`: `TIMESTAMP`
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `name`: `VARCHAR(100)` [NOT NULL]
- `slug`: `VARCHAR(120)` [UNIQUE, NOT NULL]
- `description`: `TEXT`

#### Table: `products` (DJANGO)
- `id`: `BIGINT` [PRIMARY KEY, UNIQUE, NOT NULL]
- `category_id`: `BIGINT` [FOREIGN KEY ➔ categories.id, NOT NULL]
- `title`: `VARCHAR(200)` [NOT NULL]
- `price`: `DECIMAL(10,2)` [NOT NULL]
- `stock`: `INT` [NOT NULL]
- `id`: `UUID` [PRIMARY KEY, NOT NULL]
- `category_id`: `INT` [FOREIGN KEY ➔ categories.id, NOT NULL]
- `title`: `VARCHAR(255)` [NOT NULL]
- `sku`: `VARCHAR(64)` [UNIQUE, NOT NULL]
- `price`: `DECIMAL(10, 2)` [NOT NULL]
- `stock_quantity`: `INT` [NOT NULL]
- `is_published`: `BOOLEAN`
- `created_at`: `TIMESTAMP` [NOT NULL]
- `updated_at`: `TIMESTAMP`
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `category_id`: `INT` [FOREIGN KEY ➔ categories.id, NOT NULL]
- `name`: `VARCHAR(200)` [NOT NULL]
- `slug`: `VARCHAR(220)` [UNIQUE, NOT NULL]
- `price`: `DECIMAL(10, 2)` [NOT NULL]
- `stock`: `INT`
- `is_active`: `BOOLEAN`
- `created_at`: `TIMESTAMP`

#### Table: `orders` (DJANGO)
- `id`: `BIGINT` [PRIMARY KEY, UNIQUE, NOT NULL]
- `user_id`: `BIGINT` [FOREIGN KEY ➔ users.id, NOT NULL]
- `order_number`: `VARCHAR(64)` [UNIQUE, NOT NULL]
- `total_price`: `DECIMAL(10,2)` [NOT NULL]
- `created_at`: `DATETIME` [NOT NULL]
- `id`: `UUID` [PRIMARY KEY, NOT NULL]
- `user_id`: `UUID` [FOREIGN KEY ➔ users.id, NOT NULL]
- `order_number`: `VARCHAR(50)` [UNIQUE, NOT NULL]
- `status`: `VARCHAR(30)` [NOT NULL]
- `total_amount`: `DECIMAL(12, 2)` [NOT NULL]
- `shipping_address`: `TEXT` [NOT NULL]
- `created_at`: `TIMESTAMP` [NOT NULL]
- `amount`: `FLOAT`
- `updated_at`: `TIMESTAMP`
- `order_code`: `VARCHAR(50)` [UNIQUE, NOT NULL]
- `order_status`: `VARCHAR(30)`
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `user_id`: `INT` [FOREIGN KEY ➔ users.id, NOT NULL]
- `order_number`: `VARCHAR(50)` [UNIQUE, NOT NULL]
- `total_amount`: `DECIMAL(10, 2)` [NOT NULL]
- `status`: `VARCHAR(50)`
- `payment_status`: `VARCHAR(50)`
- `shipping_address`: `TEXT` [NOT NULL]
- `created_at`: `TIMESTAMP`

#### Table: `order_items` (SQL)
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `order_id`: `UUID` [FOREIGN KEY ➔ orders.id, NOT NULL]
- `product_id`: `UUID` [FOREIGN KEY ➔ products.id, NOT NULL]
- `unit_price`: `DECIMAL(10, 2)` [NOT NULL]
- `quantity`: `INT` [NOT NULL]
- `created_at`: `TIMESTAMP`
- `updated_at`: `TIMESTAMP`
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `order_id`: `INT` [FOREIGN KEY ➔ orders.id, NOT NULL]
- `product_id`: `INT` [FOREIGN KEY ➔ products.id, NOT NULL]
- `quantity`: `INT` [NOT NULL]
- `unit_price`: `DECIMAL(10, 2)` [NOT NULL]

#### Table: `reviews` (SQL)
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `product_id`: `UUID` [FOREIGN KEY ➔ products.id, NOT NULL]
- `user_id`: `UUID` [FOREIGN KEY ➔ users.id, NOT NULL]
- `rating`: `INT` [NOT NULL]
- `comment`: `TEXT`
- `created_at`: `TIMESTAMP` [NOT NULL]
- `id`: `SERIAL` [PRIMARY KEY, NOT NULL]
- `user_id`: `INT` [FOREIGN KEY ➔ users.id, NOT NULL]
- `product_id`: `INT` [FOREIGN KEY ➔ products.id, NOT NULL]
- `rating`: `INT` [NOT NULL]
- `comment`: `TEXT`
- `created_at`: `TIMESTAMP`

#### Table: `payments` (SQL)
- `id`: `UUID` [PRIMARY KEY, NOT NULL]
- `order_id`: `UUID` [FOREIGN KEY ➔ orders.id, UNIQUE, NOT NULL]
- `provider`: `VARCHAR(50)` [NOT NULL]
- `transaction_id`: `VARCHAR(100)` [NOT NULL]
- `amount`: `DECIMAL(12, 2)` [NOT NULL]
- `status`: `VARCHAR(30)` [NOT NULL]
- `paid_at`: `TIMESTAMP`

#### Table: `Customer` (MONGOOSE)
- `_id`: `ObjectId` [PRIMARY KEY, UNIQUE, NOT NULL]
- `username`: `String` [UNIQUE, NOT NULL]
- `email`: `String` [UNIQUE, NOT NULL]
- `phone`: `String`
- `isActive`: `Boolean`
- `createdAt`: `Date`

#### Table: `Course` (MONGOOSE)
- `_id`: `ObjectId` [PRIMARY KEY, UNIQUE, NOT NULL]
- `title`: `String` [NOT NULL]
- `slug`: `String` [UNIQUE, NOT NULL]
- `price`: `Number` [NOT NULL]
- `instructorId`: `ObjectId` [FOREIGN KEY ➔ Customer._id, NOT NULL]
- `description`: `String`
- `isPublished`: `Boolean`

#### Table: `Enrollment` (MONGOOSE)
- `_id`: `ObjectId` [PRIMARY KEY, UNIQUE, NOT NULL]
- `studentId`: `ObjectId` [FOREIGN KEY ➔ Customer._id, NOT NULL]
- `courseId`: `ObjectId` [FOREIGN KEY ➔ Course._id, NOT NULL]
- `enrolledAt`: `Date`
- `progress`: `Number`

#### Table: `Profile` (PRISMA)
- `id`: `String` [PRIMARY KEY, NOT NULL]
- `bio`: `String?`
- `userId`: `String` [FOREIGN KEY ➔ User.id, UNIQUE, NOT NULL]

#### Table: `PostTag` (PRISMA)
- `postId`: `String` [PRIMARY KEY, FOREIGN KEY ➔ Post.id, NOT NULL]
- `tagId`: `String` [PRIMARY KEY, FOREIGN KEY ➔ Tag.id, NOT NULL]

#### Table: `posts` (RAILS)
- `id`: `BIGINT` [PRIMARY KEY, UNIQUE, NOT NULL]
- `user_id`: `BIGINT` [FOREIGN KEY ➔ users.id, NOT NULL]
- `title`: `VARCHAR(255)` [NOT NULL]
- `body`: `TEXT`
- `published`: `BOOLEAN`
- `created_at`: `TIMESTAMP` [NOT NULL]
- `updated_at`: `TIMESTAMP` [NOT NULL]

#### Table: `comments` (RAILS)
- `id`: `BIGINT` [PRIMARY KEY, UNIQUE, NOT NULL]
- `user_id`: `BIGINT` [FOREIGN KEY ➔ users.id, NOT NULL]
- `post_id`: `BIGINT` [FOREIGN KEY ➔ posts.id, NOT NULL]
- `content`: `TEXT` [NOT NULL]
- `created_at`: `TIMESTAMP` [NOT NULL]
- `updated_at`: `TIMESTAMP` [NOT NULL]

#### Table: `Organization` (PRISMA)
- `id`: `String` [PRIMARY KEY, NOT NULL]
- `name`: `String` [NOT NULL]
- `slug`: `String` [UNIQUE, NOT NULL]
- `plan`: `String` [NOT NULL]
- `createdAt`: `DateTime` [NOT NULL]
- `updatedAt`: `DateTime` [NOT NULL]
- `id`: `string` [PRIMARY KEY, NOT NULL]
- `name`: `varchar` [NOT NULL]
- `domain`: `varchar` [UNIQUE, NOT NULL]
- `teams`: `BIGINT` [FOREIGN KEY ➔ Team.id]

#### Table: `Member` (PRISMA)
- `id`: `String` [PRIMARY KEY, NOT NULL]
- `organizationId`: `String` [FOREIGN KEY ➔ Organization.id, NOT NULL]
- `userId`: `String` [NOT NULL]
- `role`: `String` [NOT NULL]
- `joinedAt`: `DateTime` [NOT NULL]
- `id`: `string` [PRIMARY KEY, NOT NULL]
- `fullName`: `varchar` [NOT NULL]
- `email`: `varchar` [UNIQUE, NOT NULL]
- `team_id`: `UUID/Int` [FOREIGN KEY ➔ Team.id, NOT NULL]

#### Table: `Project` (PRISMA)
- `id`: `String` [PRIMARY KEY, NOT NULL]
- `organizationId`: `String` [FOREIGN KEY ➔ Organization.id, NOT NULL]
- `title`: `String` [NOT NULL]
- `description`: `String?`
- `isArchived`: `Boolean` [NOT NULL]
- `createdAt`: `DateTime` [NOT NULL]
- `id`: `INTEGER` [PRIMARY KEY, NOT NULL]
- `title`: `STRING` [NOT NULL]
- `leadEmployeeId`: `INTEGER` [FOREIGN KEY ➔ Employee.id]

#### Table: `Task` (PRISMA)
- `id`: `String` [PRIMARY KEY, NOT NULL]
- `projectId`: `String` [FOREIGN KEY ➔ Project.id, NOT NULL]
- `title`: `String` [NOT NULL]
- `status`: `String` [NOT NULL]
- `priority`: `String` [NOT NULL]
- `dueDate`: `DateTime?`

#### Table: `Department` (SEQUELIZE)
- `id`: `INTEGER` [PRIMARY KEY, NOT NULL]
- `name`: `STRING` [UNIQUE, NOT NULL]
- `budget`: `FLOAT`

#### Table: `Employee` (SEQUELIZE)
- `id`: `INTEGER` [PRIMARY KEY, NOT NULL]
- `firstName`: `STRING` [NOT NULL]
- `lastName`: `STRING` [NOT NULL]
- `email`: `STRING` [UNIQUE, NOT NULL]
- `departmentId`: `INTEGER` [FOREIGN KEY ➔ Department.id]
- `salary`: `INTEGER`

#### Table: `Team` (TYPEORM)
- `id`: `string` [PRIMARY KEY, NOT NULL]
- `title`: `varchar` [NOT NULL]
- `organization_id`: `UUID/Int` [FOREIGN KEY ➔ Organization.id, NOT NULL]

---

## 💡 AI System Instructions for Query Generation & Optimization
When assisting with this database schema:
1. Always respect Primary Keys and Foreign Key dependencies when constructing SQL JOINs or ORM queries.
2. Ensure all Foreign Key references point to valid target columns specified above.
3. Recommend appropriate indexes for frequently filtered columns and foreign key fields.
4. Maintain referential integrity and handle CASCADE rules appropriately.
