/**
 * schemagraph
 * Zero-dependency pure Node.js programmatic API
 */

const UniversalSchemaParser = require('./parser/universal-parser');
const SQLParser = require('./parser/sql-parser');
const PrismaParser = require('./parser/prisma-parser');
const MongooseParser = require('./parser/mongoose-parser');
const SequelizeParser = require('./parser/sequelize-parser');
const TypeORMParser = require('./parser/typeorm-parser');
const GraphQLParser = require('./parser/graphql-parser');
const TSTypeParser = require('./parser/ts-type-parser');
const LaravelParser = require('./parser/laravel-parser');
const PythonParser = require('./parser/python-parser');
const RailsParser = require('./parser/rails-parser');
const GoParser = require('./parser/go-parser');
const JPAParser = require('./parser/jpa-parser');
const LayoutEngine = require('./layout/layout-engine');
const SVGRenderer = require('./renderers/svg-renderer');
const HTMLRenderer = require('./renderers/html-renderer');
const MermaidRenderer = require('./renderers/mermaid-renderer');
const JSONRenderer = require('./renderers/json-renderer');
const DBMLRenderer = require('./renderers/dbml-renderer');
const DOTRenderer = require('./renderers/dot-renderer');
const SQLRenderer = require('./renderers/sql-renderer');
const AIRenderer = require('./renderers/ai-renderer');

/**
 * Parses a project directory or single schema file
 * @param {string} targetPath - Directory or file path
 * @param {object} options - Parser options
 * @returns {object} schemaMap
 */
function parseProject(targetPath, options = {}) {
    const parser = new UniversalSchemaParser(options);
    return parser.scanDirectory(targetPath);
}

/**
 * Generates an SVG string from a schema map
 */
function generateSVG(schemaMap, options = {}) {
    return SVGRenderer.generateSVG(schemaMap, options);
}

/**
 * Generates an interactive HTML viewer from a schema map
 */
function generateHTML(schemaMap, options = {}) {
    return HTMLRenderer.generateHTML(schemaMap, options);
}

/**
 * Generates Mermaid markdown with erDiagram and Data Dictionary
 */
function generateMarkdown(schemaMap, options = {}) {
    return MermaidRenderer.generateMarkdown(schemaMap, options);
}

/**
 * Generates structured JSON schema AST
 */
function generateJSON(schemaMap, options = {}) {
    return JSONRenderer.generateJSON(schemaMap, options);
}

/**
 * Generates DBML (Database Markup Language)
 */
function generateDBML(schemaMap, options = {}) {
    return DBMLRenderer.generateDBML(schemaMap, options);
}

/**
 * Generates Graphviz DOT string
 */
function generateDOT(schemaMap, options = {}) {
    return DOTRenderer.generateDOT(schemaMap, options);
}

/**
 * Generates standard SQL DDL
 */
function generateSQL(schemaMap, options = {}) {
    return SQLRenderer.generateSQL(schemaMap, options);
}

/**
 * Generates token-optimized AI context prompt for ChatGPT / Gemini / Claude
 */
function generateAIContext(schemaMap, options = {}) {
    return AIRenderer.generateAIContext(schemaMap, options);
}

module.exports = {
    parseProject,
    generateSVG,
    generateHTML,
    generateMarkdown,
    generateJSON,
    generateDBML,
    generateDOT,
    generateSQL,
    generateAIContext,
    // Parsers
    UniversalSchemaParser,
    SQLParser,
    PrismaParser,
    MongooseParser,
    SequelizeParser,
    TypeORMParser,
    GraphQLParser,
    TSTypeParser,
    LaravelParser,
    PythonParser,
    RailsParser,
    GoParser,
    JPAParser,
    // Layout & Renderers
    LayoutEngine,
    SVGRenderer,
    HTMLRenderer,
    MermaidRenderer,
    JSONRenderer,
    DBMLRenderer,
    DOTRenderer,
    SQLRenderer,
    AIRenderer
};
