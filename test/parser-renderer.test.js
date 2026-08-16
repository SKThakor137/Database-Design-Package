/**
 * Automated Unit & Integration Tests for schemagraph-core
 * Uses native node:test and node:assert (Zero external test dependencies)
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const {
    UniversalSchemaParser,
    SQLParser,
    PrismaParser,
    MongooseParser,
    GraphQLParser,
    LayoutEngine,
    SVGRenderer,
    HTMLRenderer,
    MermaidRenderer,
    JSONRenderer,
    DBMLRenderer,
    DOTRenderer,
    SQLRenderer,
    parseProject
} = require('../src/index');

describe('schemagraph-core Test Suite', () => {

    test('SQLParser parses tables, primary keys, and foreign keys', () => {
        const sqlContent = `
            CREATE TABLE users (
                id UUID PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                age INT
            );
            CREATE TABLE posts (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id),
                title VARCHAR(200)
            );
        `;
        const models = SQLParser.parse(sqlContent);
        assert.ok(models.users, 'users table should exist');
        assert.ok(models.posts, 'posts table should exist');

        assert.strictEqual(models.users.columns.length, 3);
        const idCol = models.users.columns.find(c => c.name === 'id');
        assert.strictEqual(idCol.isPrimary, true);

        assert.strictEqual(models.posts.relations.length, 1);
        assert.strictEqual(models.posts.relations[0].toTable, 'users');
        assert.strictEqual(models.posts.relations[0].from, 'user_id');
    });

    test('PrismaParser parses models and @relation annotations', () => {
        const prismaContent = `
            model User {
                id    String  @id @default(uuid())
                email String  @unique
                posts Post[]
            }
            model Post {
                id       String @id @default(uuid())
                authorId String
                author   User   @relation(fields: [authorId], references: [id])
            }
        `;
        const models = PrismaParser.parse(prismaContent);
        assert.ok(models.User);
        assert.ok(models.Post);
        assert.strictEqual(models.Post.relations.length, 1);
        assert.strictEqual(models.Post.relations[0].toTable, 'User');
        assert.strictEqual(models.Post.relations[0].from, 'authorId');
    });

    test('MongooseParser parses schemas and ref fields', () => {
        const mongooseContent = `
            const UserSchema = new Schema({
                name: String,
                email: { type: String, required: true }
            });
            const PostSchema = new Schema({
                title: String,
                author: { type: Schema.Types.ObjectId, ref: 'User' }
            });
        `;
        const models = MongooseParser.parse(mongooseContent);
        assert.ok(models.User);
        assert.ok(models.Post);
        assert.strictEqual(models.Post.relations.length, 1);
        assert.strictEqual(models.Post.relations[0].toTable, 'User');
    });

    test('GraphQLParser parses types and references', () => {
        const gqlContent = `
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
        const models = GraphQLParser.parse(gqlContent);
        assert.ok(models.User);
        assert.ok(models.Post);
        assert.strictEqual(models.Post.relations.length, 1);
        assert.strictEqual(models.Post.relations[0].toTable, 'User');
    });

    test('LayoutEngine computes positions and connector paths', () => {
        const schemaMap = {
            users: {
                columns: [{ name: 'id', type: 'UUID', isPrimary: true }],
                relations: []
            },
            orders: {
                columns: [
                    { name: 'id', type: 'UUID', isPrimary: true },
                    { name: 'user_id', type: 'UUID', isForeign: true }
                ],
                relations: [{ from: 'user_id', toTable: 'users', toField: 'id' }]
            }
        };
        const layout = LayoutEngine.computeLayout(schemaMap);
        assert.ok(layout.positions.users);
        assert.ok(layout.positions.orders);
        assert.strictEqual(layout.connectors.length, 1);
        assert.ok(layout.connectors[0].pathData.startsWith('M '));
    });

    test('SVGRenderer produces valid responsive SVG', () => {
        const schemaMap = {
            users: {
                columns: [{ name: 'id', type: 'UUID', isPrimary: true, isForeign: false }],
                relations: []
            }
        };
        const svg = SVGRenderer.generateSVG(schemaMap, { theme: 'catppuccin' });
        assert.ok(svg.startsWith('<svg'));
        assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
        assert.ok(svg.includes('viewBox='));
        assert.ok(svg.includes('users'));
        assert.ok(svg.endsWith('</svg>'));
    });

    test('HTMLRenderer produces complete self-contained HTML', () => {
        const schemaMap = {
            users: {
                columns: [{ name: 'id', type: 'UUID', isPrimary: true, isForeign: false }],
                relations: []
            }
        };
        const html = HTMLRenderer.generateHTML(schemaMap, { title: 'Test ERD' });
        assert.ok(html.includes('<!DOCTYPE html>'));
        assert.ok(html.includes('<title>Test ERD - schemagraph-core</title>'));
        assert.ok(html.includes('exportSVG()'));
        assert.ok(html.includes('exportPNG()'));
    });

    test('MermaidRenderer produces valid erDiagram markdown', () => {
        const schemaMap = {
            users: {
                columns: [{ name: 'id', type: 'UUID', isPrimary: true, isForeign: false }],
                relations: []
            },
            orders: {
                columns: [{ name: 'id', type: 'UUID', isPrimary: true, isForeign: false }, { name: 'user_id', type: 'UUID', isForeign: true }],
                relations: [{ from: 'user_id', toTable: 'users', toField: 'id', cardinality: 'N:1' }]
            }
        };
        const md = MermaidRenderer.generateMarkdown(schemaMap);
        assert.ok(md.includes('erDiagram'));
        assert.ok(md.includes('orders ||--o{ users : "user_id -> id"'));
        assert.ok(md.includes('## 📖 Database Data Dictionary'));
    });

    test('JSON, DBML, DOT, and SQL renderers execute correctly', () => {
        const schemaMap = {
            users: {
                columns: [{ name: 'id', type: 'INT', isPrimary: true, isNullable: false, isUnique: true }],
                relations: []
            }
        };
        const json = JSONRenderer.generateJSON(schemaMap);
        const parsedJson = JSON.parse(json);
        assert.strictEqual(parsedJson.metadata.totalTables, 1);

        const dbml = DBMLRenderer.generateDBML(schemaMap);
        assert.ok(dbml.includes('Table users {'));

        const dot = DOTRenderer.generateDOT(schemaMap);
        assert.ok(dot.includes('digraph DatabaseSchema {'));

        const sql = SQLRenderer.generateSQL(schemaMap);
        assert.ok(sql.includes('CREATE TABLE users ('));
    });

    test('End-to-End parseProject scans directory correctly', () => {
        const examplesPath = path.resolve(__dirname, '../examples');
        const schemaMap = parseProject(examplesPath);
        const tableNames = Object.keys(schemaMap);
        assert.ok(tableNames.length >= 5, `Found ${tableNames.length} tables from examples`);
        assert.ok(tableNames.includes('users') || tableNames.includes('Organization'));
    });
});
