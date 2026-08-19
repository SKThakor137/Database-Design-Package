const test = require('node:test');
const assert = require('node:assert');
const SQLParser = require('../src/parser/sql-parser');
const PrismaParser = require('../src/parser/prisma-parser');
const MongooseParser = require('../src/parser/mongoose-parser');
const SequelizeParser = require('../src/parser/sequelize-parser');
const TypeORMParser = require('../src/parser/typeorm-parser');
const GraphQLParser = require('../src/parser/graphql-parser');
const UniversalSchemaParser = require('../src/parser/universal-parser');

test('SQLParser parses CREATE TABLE and FOREIGN KEY constraints', () => {
    const sql = `
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(100)
        );

        CREATE TABLE orders (
            id INT PRIMARY KEY,
            user_id INT NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `;

    const models = SQLParser.parse(sql);

    assert.ok(models.users);
    assert.strictEqual(models.users.columns.length, 3);
    assert.strictEqual(models.users.columns.find(c => c.name === 'id').isPrimary, true);
    assert.strictEqual(models.users.columns.find(c => c.name === 'email').isUnique, true);

    assert.ok(models.orders);
    assert.strictEqual(models.orders.columns.find(c => c.name === 'user_id').isForeign, true);
    assert.strictEqual(models.orders.relations.length, 1);
    assert.strictEqual(models.orders.relations[0].toTable, 'users');
    assert.strictEqual(models.orders.relations[0].toField, 'id');
});

test('PrismaParser parses models and @relation attributes', () => {
    const prisma = `
        model User {
            id    String @id @default(uuid())
            email String @unique
            posts Post[]
        }

        model Post {
            id       String @id @default(uuid())
            title    String
            authorId String
            author   User   @relation(fields: [authorId], references: [id])
        }
    `;

    const models = PrismaParser.parse(prisma);

    assert.ok(models.User);
    assert.ok(models.Post);
    assert.strictEqual(models.User.columns.find(c => c.name === 'id').isPrimary, true);
    assert.strictEqual(models.Post.relations.length, 1);
    assert.strictEqual(models.Post.relations[0].toTable, 'User');
    assert.strictEqual(models.Post.relations[0].from, 'authorId');
});

test('MongooseParser parses Schemas and ref fields', () => {
    const mongooseCode = `
        const UserSchema = new Schema({
            username: { type: String, required: true, unique: true },
            email: String
        });

        const PostSchema = new mongoose.Schema({
            title: { type: String, required: true },
            authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
        });
    `;

    const models = MongooseParser.parse(mongooseCode);

    assert.ok(models.User);
    assert.ok(models.Post);
    assert.strictEqual(models.User.columns.find(c => c.name === '_id').isPrimary, true);
    assert.strictEqual(models.Post.relations.length, 1);
    assert.strictEqual(models.Post.relations[0].toTable, 'User');
});

test('SequelizeParser parses sequelize.define and associations', () => {
    const sequelizeCode = `
        const Category = sequelize.define('Category', {
            id: { type: DataTypes.INTEGER, primaryKey: true },
            name: { type: DataTypes.STRING, allowNull: false }
        });

        const Product = sequelize.define('Product', {
            id: { type: DataTypes.INTEGER, primaryKey: true },
            title: DataTypes.STRING,
            categoryId: {
                type: DataTypes.INTEGER,
                references: { model: 'Category', key: 'id' }
            }
        });
    `;

    const models = SequelizeParser.parse(sequelizeCode);

    assert.ok(models.Category);
    assert.ok(models.Product);
    assert.strictEqual(models.Product.relations.length, 1);
    assert.strictEqual(models.Product.relations[0].toTable, 'Category');
    assert.strictEqual(models.Product.columns.find(c => c.name === 'categoryId').isForeign, true);
});

test('TypeORMParser parses @Entity and decorators', () => {
    const tsCode = `
        @Entity('users')
        export class User {
            @PrimaryGeneratedColumn('uuid')
            id: string;

            @Column({ type: 'varchar', unique: true })
            email: string;
        }

        @Entity('profiles')
        export class Profile {
            @PrimaryGeneratedColumn()
            id: number;

            @Column()
            bio: string;

            @ManyToOne(() => User)
            @JoinColumn({ name: 'user_id' })
            user: User;
        }
    `;

    const models = TypeORMParser.parse(tsCode);

    assert.ok(models.User);
    assert.ok(models.Profile);
    assert.strictEqual(models.Profile.relations.length, 1);
    assert.strictEqual(models.Profile.relations[0].toTable, 'User');
    assert.strictEqual(models.Profile.relations[0].from, 'user_id');
    assert.strictEqual(models.Profile.columns.find(c => c.name === 'user_id').isForeign, true);
});

test('GraphQLParser parses SDL types and relations', () => {
    const gql = `
        type User {
            id: ID!
            name: String!
            posts: [Post!]!
        }

        type Post {
            id: ID!
            title: String!
            author: User!
        }
    `;

    const models = GraphQLParser.parse(gql);

    assert.ok(models.User);
    assert.ok(models.Post);
    assert.strictEqual(models.User.columns.find(c => c.name === 'id').isPrimary, true);
    assert.strictEqual(models.Post.relations.length, 1);
    assert.strictEqual(models.Post.relations[0].toTable, 'User');
});

test('TSTypeParser parses TypeScript interfaces, types, and Zod schemas', () => {
    const TSTypeParser = require('../src/parser/ts-type-parser');
    const tsCode = `
        export interface Customer {
            id: string;
            name: string;
            email: string;
            orders?: Order[];
        }

        export type Order = {
            id: string;
            customerId: string;
            total: number;
        };

        const ProductSchema = z.object({
            id: z.string(),
            title: z.string(),
            price: z.number(),
            categoryId: z.string().optional()
        });
    `;

    const models = TSTypeParser.parse(tsCode);

    assert.ok(models.Customer);
    assert.ok(models.Order);
    assert.ok(models.Product);
    assert.strictEqual(models.Customer.relations[0].toTable, 'Order');
    assert.strictEqual(models.Order.relations[0].toTable, 'Customer');
    assert.strictEqual(models.Product.relations[0].toTable, 'Category');
    assert.strictEqual(models.Order.columns.find(c => c.name === 'customerId').isForeign, true);
    assert.strictEqual(models.Product.columns.find(c => c.name === 'categoryId').isForeign, true);
});

