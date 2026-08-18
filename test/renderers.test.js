const test = require('node:test');
const assert = require('node:assert');
const SVGRenderer = require('../src/renderers/svg-renderer');
const HTMLRenderer = require('../src/renderers/html-renderer');
const MermaidRenderer = require('../src/renderers/mermaid-renderer');
const JSONRenderer = require('../src/renderers/json-renderer');
const DBMLRenderer = require('../src/renderers/dbml-renderer');
const DOTRenderer = require('../src/renderers/dot-renderer');
const SQLRenderer = require('../src/renderers/sql-renderer');
const AIRenderer = require('../src/renderers/ai-renderer');

const mockSchemaMap = {
    User: {
        name: 'User',
        sourceType: 'sql',
        columns: [
            { name: 'id', type: 'INT', isPrimary: true, isForeign: false, isNullable: false, isUnique: true },
            { name: 'email', type: 'VARCHAR(255)', isPrimary: false, isForeign: false, isNullable: false, isUnique: true }
        ],
        relations: []
    },
    Post: {
        name: 'Post',
        sourceType: 'sql',
        columns: [
            { name: 'id', type: 'INT', isPrimary: true, isForeign: false, isNullable: false, isUnique: true },
            { name: 'title', type: 'VARCHAR(255)', isPrimary: false, isForeign: false, isNullable: false, isUnique: false },
            { name: 'user_id', type: 'INT', isPrimary: false, isForeign: true, isNullable: false, isUnique: false }
        ],
        relations: [
            { from: 'user_id', toTable: 'User', toField: 'id', cardinality: 'N:1' }
        ]
    }
};

test('SVGRenderer generates valid XML SVG with themes and nodes', () => {
    const svg = SVGRenderer.generateSVG(mockSchemaMap, { theme: 'catppuccin', title: 'Test Schema' });
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.includes('Test Schema'));
    assert.ok(svg.includes('User'));
    assert.ok(svg.includes('Post'));
    assert.ok(svg.includes('PK'));
    assert.ok(svg.includes('FK'));
});

test('HTMLRenderer generates full standalone HTML page', () => {
    const html = HTMLRenderer.generateHTML(mockSchemaMap, { title: 'Test Explorer' });
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('Test Explorer'));
    assert.ok(html.includes('<svg'));
    assert.ok(html.includes('canvas-container'));
    assert.ok(html.includes('sidebar-drawer'));
    assert.ok(html.includes('toggleSidebarDrawer'));
    assert.ok(html.includes('zoom-presets-menu'));
    assert.ok(html.includes('insp-outgoing-list'));
    assert.ok(html.includes('insp-incoming-list'));
});

test('MermaidRenderer generates erDiagram markdown block and tables', () => {
    const md = MermaidRenderer.generateMarkdown(mockSchemaMap);
    assert.ok(md.includes('```mermaid'));
    assert.ok(md.includes('erDiagram'));
    assert.ok(md.includes('Post ||--o{ User'));
    assert.ok(md.includes('### Table: `User`'));
});

test('JSONRenderer produces valid JSON AST', () => {
    const jsonStr = JSONRenderer.generateJSON(mockSchemaMap);
    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.metadata.totalTables, 2);
    assert.strictEqual(parsed.metadata.totalRelations, 1);
});

test('DBMLRenderer produces dbdiagram.io compatible code', () => {
    const dbml = DBMLRenderer.generateDBML(mockSchemaMap);
    assert.ok(dbml.includes('Table User {'));
    assert.ok(dbml.includes('Table Post {'));
    assert.ok(dbml.includes('Ref: Post.user_id > User.id'));
});

test('DOTRenderer generates Graphviz digraph', () => {
    const dot = DOTRenderer.generateDOT(mockSchemaMap);
    assert.ok(dot.includes('digraph DatabaseSchema {'));
    assert.ok(dot.includes('"Post":"user_id" -> "User":"id"'));
});

test('SQLRenderer generates standard SQL DDL with FKs', () => {
    const sql = SQLRenderer.generateSQL(mockSchemaMap);
    assert.ok(sql.includes('CREATE TABLE User'));
    assert.ok(sql.includes('CREATE TABLE Post'));
    assert.ok(sql.includes('FOREIGN KEY (user_id) REFERENCES User(id)'));
});

test('AIRenderer generates token-optimized LLM context prompt', () => {
    const ai = AIRenderer.generateAIContext(mockSchemaMap);
    assert.ok(ai.includes('Database Architecture Summary'));
    assert.ok(ai.includes('`Post.user_id` ➔ `User.id`'));
    assert.ok(ai.includes('Table: `User`'));
    assert.ok(ai.includes('PRIMARY KEY'));
    assert.ok(ai.includes('AI System Instructions'));
});

