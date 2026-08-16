/**
 * Universal Schema Parser
 * Recursively scans workspace directories and orchestrates schema parsing across:
 * - Backend: SQL, Prisma, Mongoose, Sequelize, TypeORM, GraphQL
 * - Frontend / Fullstack: TypeScript Interfaces, Types, and Zod Schemas
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

class UniversalSchemaParser {
    constructor(options = {}) {
        this.options = {
            exclude: options.exclude || ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache'],
            ...options
        };
        this.models = {};
    }

    scanDirectory(targetPath) {
        const stats = fs.statSync(targetPath);

        if (stats.isFile()) {
            this.parseFile(targetPath);
            return this.models;
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

        return this.models;
    }

    parseFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const supportedExts = ['.sql', '.prisma', '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs', '.graphql', '.gql', '.json'];

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
