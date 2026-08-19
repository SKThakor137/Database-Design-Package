/**
 * Universal Schema Parser
 * Recursively scans workspace directories and orchestrates schema parsing across:
 * - PHP / Laravel: Migration files and Eloquent models (.php)
 * - Python: Django models & SQLAlchemy (.py)
 * - Ruby: Ruby on Rails schema.rb & migrations (.rb)
 * - Go: Go structs and GORM tags (.go)
 * - Java / Kotlin: JPA / Hibernate / Spring Boot entities (.java, .kt)
 * - Node.js: SQL, Prisma, Mongoose, Sequelize, TypeORM, GraphQL (.sql, .prisma, .graphql, .gql)
 * - Frontend / Fullstack: TypeScript Interfaces, Types, and Zod Schemas (.ts, .tsx, .js)
 * Pure Node.js - Zero dependencies.
 */

const fs = require('fs');
const path = require('path');
const SQLParser = require('./sql-parser');
const PrismaParser = require('./prisma-parser');
const MongooseParser = require('./mongoose-parser');
const SequelizeParser = require('./sequelize-parser');
const TypeORMParser = require('./typeorm-parser');
const GraphQLParser = require('./graphql-parser');
const TSTypeParser = require('./ts-type-parser');
const LaravelParser = require('./laravel-parser');
const PythonParser = require('./python-parser');
const RailsParser = require('./rails-parser');
const GoParser = require('./go-parser');
const JPAParser = require('./jpa-parser');

class UniversalSchemaParser {
    constructor(options = {}) {
        this.options = {
            exclude: options.exclude || ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', 'vendor', '__pycache__', '.venv', 'venv', 'target'],
            ...options
        };
        this.models = {};
    }

    scanDirectory(targetPath) {
        const stats = fs.statSync(targetPath);

        if (stats.isFile()) {
            this.parseFile(targetPath);
            return UniversalSchemaParser.normalizeSchema(this.models);
        }

        const entries = fs.readdirSync(targetPath, { withFileTypes: true });

        for (const entry of entries) {
            const name = entry.name;
            if (this.options.exclude.some(ex => name === ex || name.startsWith('.'))) {
                continue;
            }

            const fullPath = path.join(targetPath, name);

            if (entry.isDirectory()) {
                this.scanDirectory(fullPath);
            } else if (entry.isFile()) {
                this.parseFile(fullPath);
            }
        }

        return UniversalSchemaParser.normalizeSchema(this.models);
    }

    static normalizeSchema(models) {
        if (!models || typeof models !== 'object') return models;

        Object.keys(models).forEach(tableName => {
            const table = models[tableName];
            if (!table) return;

            if (!Array.isArray(table.columns)) table.columns = [];
            if (!Array.isArray(table.relations)) table.relations = [];

            // Standardize relations
            table.relations.forEach(rel => {
                const from = rel.from || rel.fromColumn;
                const toField = rel.toField || rel.toColumn || 'id';
                rel.from = from;
                rel.toField = toField;
                if (!rel.cardinality) {
                    rel.cardinality = rel.relationType === 'one-to-one' ? '1:1' : rel.relationType === 'one-to-many' ? '1:N' : 'N:1';
                }

                // If column exists, mark isForeign: true
                if (from) {
                    const col = table.columns.find(c => c.name === from);
                    if (col) {
                        col.isForeign = true;
                    } else {
                        table.columns.push({
                            name: from,
                            type: 'BIGINT',
                            isPrimary: false,
                            isForeign: true,
                            isNullable: true,
                            isUnique: false
                        });
                    }
                }
            });

            // Mark any column as foreign key if it is present in relations
            table.columns.forEach(col => {
                if (col.isForeign === undefined) {
                    col.isForeign = table.relations.some(r => (r.from === col.name || r.fromColumn === col.name));
                } else if (table.relations.some(r => (r.from === col.name || r.fromColumn === col.name))) {
                    col.isForeign = true;
                }
            });
        });

        return models;
    }

    parseFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const supportedExts = [
            '.sql', '.prisma', '.graphql', '.gql', '.json',
            '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs',
            '.php', '.py', '.rb', '.go', '.java', '.kt'
        ];

        if (!supportedExts.includes(ext)) {
            return;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');

            if (ext === '.sql') {
                SQLParser.parse(content, this.models);
            } else if (ext === '.prisma') {
                PrismaParser.parse(content, this.models);
            } else if (ext === '.graphql' || ext === '.gql') {
                GraphQLParser.parse(content, this.models);
            } else if (ext === '.php') {
                // PHP Laravel migrations & Eloquent models
                LaravelParser.parse(content, this.models);
            } else if (ext === '.py') {
                // Python Django models & SQLAlchemy
                PythonParser.parse(content, this.models);
            } else if (ext === '.rb') {
                // Ruby on Rails schema & ActiveRecord
                RailsParser.parse(content, this.models);
            } else if (ext === '.go') {
                // Go structs and GORM
                GoParser.parse(content, this.models);
            } else if (ext === '.java' || ext === '.kt') {
                // Java & Kotlin Spring Boot JPA / Hibernate
                JPAParser.parse(content, this.models);
            } else if (['.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs'].includes(ext)) {
                // Determine ORM / Framework by content signature
                if (content.includes('@Entity') || content.includes('@Column')) {
                    TypeORMParser.parse(content, this.models);
                }
                if (content.includes('Schema') || content.includes('mongoose')) {
                    MongooseParser.parse(content, this.models);
                }
                if (content.includes('sequelize') || content.includes('DataTypes')) {
                    SequelizeParser.parse(content, this.models);
                }
                // Frontend / Fullstack TypeScript interfaces, types & Zod schemas
                if (content.includes('interface ') || content.includes('type ') || content.includes('z.object')) {
                    TSTypeParser.parse(content, this.models);
                }
            }
        } catch (err) {
            // Silently ignore or collect parse errors for unparseable individual files
        }
    }
}

module.exports = UniversalSchemaParser;
