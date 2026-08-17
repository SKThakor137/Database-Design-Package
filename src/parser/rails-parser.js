/**
 * Ruby on Rails Schema & ActiveRecord Parser
 * Parses Rails db/schema.rb, db/migrate/*.rb, and ActiveRecord models.
 * Pure Node.js - Zero dependencies.
 */

class RailsParser {
    static parse(content, models = {}) {
        // 1. Parse create_table blocks from schema.rb or migrations
        const createTableRegex = /create_table\s+["':]([a-zA-Z0-9_]+)["']?(?:,\s*[^)]*?)?\s+do\s*\|[a-zA-Z0-9_]+\|([\s\S]*?)\n\s*end/g;
        let match;

        while ((match = createTableRegex.exec(content)) !== null) {
            const tableName = match[1];
            const body = match[2];

            if (!models[tableName]) {
                models[tableName] = {
                    name: tableName,
                    columns: [
                        { name: 'id', type: 'BIGINT', isPrimary: true, isUnique: true, isNullable: false }
                    ],
                    relations: [],
                    sourceType: 'rails'
                };
            }

            const lines = body.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;

                // Handle t.references :user, foreign_key: true or t.belongs_to :user
                const refMatch = trimmed.match(/t\.(?:references|belongs_to)\s+["':]([a-zA-Z0-9_]+)["']?(?:,\s*([\s\S]*))?/);
                if (refMatch) {
                    const refTarget = refMatch[1];
                    const refArgs = refMatch[2] || '';
                    const colName = `${refTarget}_id`;

                    let targetTable = refTarget;
                    if (targetTable.endsWith('y')) targetTable = targetTable.slice(0, -1) + 'ies';
                    else if (!targetTable.endsWith('s')) targetTable = targetTable + 's';

                    const isNullable = !refArgs.includes('null: false');

                    if (!models[tableName].columns.some(c => c.name === colName)) {
                        models[tableName].columns.push({
                            name: colName,
                            type: 'BIGINT',
                            isPrimary: false,
                            isUnique: false,
                            isNullable
                        });
                    }

                    if (!models[tableName].relations.some(r => r.fromColumn === colName && r.toTable === targetTable)) {
                        models[tableName].relations.push({
                            fromColumn: colName,
                            toTable: targetTable,
                            toColumn: 'id',
                            relationType: 'many-to-one'
                        });
                    }
                    return;
                }

                // Handle t.type "col_name", ...
                // e.g. t.string "name", limit: 100, null: false
                const colMatch = trimmed.match(/t\.([a-zA-Z0-9_]+)\s+["':]([a-zA-Z0-9_]+)["']?(?:,\s*([\s\S]*))?/);
                if (colMatch) {
                    const colType = colMatch[1];
                    const colName = colMatch[2];
                    const colArgs = colMatch[3] || '';

                    if (['index', 'check_constraint'].includes(colType)) return;

                    const isNullable = !colArgs.includes('null: false');
                    const isUnique = colArgs.includes('unique: true');
                    const dbType = this.mapRailsType(colType, colArgs);

                    if (!models[tableName].columns.some(c => c.name === colName)) {
                        models[tableName].columns.push({
                            name: colName,
                            type: dbType,
                            isPrimary: colName === 'id',
                            isUnique: colName === 'id' || isUnique,
                            isNullable
                        });
                    }
                }
            });
        }

        // 2. Parse add_foreign_key "orders", "users", column: "user_id"
        const fkRegex = /add_foreign_key\s+["':]([a-zA-Z0-9_]+)["']?,\s*["':]([a-zA-Z0-9_]+)["']?(?:,\s*column:\s*["':]([a-zA-Z0-9_]+)["']?)?/g;
        let fkMatch;
        while ((fkMatch = fkRegex.exec(content)) !== null) {
            const fromTable = fkMatch[1];
            const toTable = fkMatch[2];
            const fromCol = fkMatch[3] || `${toTable.replace(/s$/, '')}_id`;

            if (models[fromTable]) {
                if (!models[fromTable].relations.some(r => r.fromColumn === fromCol && r.toTable === toTable)) {
                    models[fromTable].relations.push({
                        fromColumn: fromCol,
                        toTable: toTable,
                        toColumn: 'id',
                        relationType: 'many-to-one'
                    });
                }
            }
        }

        // 3. Parse ActiveRecord models: class User < ApplicationRecord
        this.parseActiveRecordModel(content, models);

        return models;
    }

    static parseActiveRecordModel(content, models) {
        const modelMatch = content.match(/class\s+([a-zA-Z0-9_]+)\s*<\s*(?:ApplicationRecord|ActiveRecord::Base)/);
        if (!modelMatch) return;

        const className = modelMatch[1];
        let tableName = className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
        if (tableName.endsWith('y')) tableName = tableName.slice(0, -1) + 'ies';
        else if (!tableName.endsWith('s')) tableName = tableName + 's';

        if (!models[tableName]) {
            models[tableName] = {
                name: tableName,
                columns: [
                    { name: 'id', type: 'BIGINT', isPrimary: true, isUnique: true, isNullable: false }
                ],
                relations: [],
                sourceType: 'rails-model'
            };
        }

        // Parse belongs_to :user
        const belongsToRegex = /belongs_to\s+:[a-zA-Z0-9_]+(?:,\s*class_name:\s*['"]([a-zA-Z0-9_]+)['"])?/g;
        let bMatch;
        while ((bMatch = belongsToRegex.exec(content)) !== null) {
            const fullMatch = bMatch[0];
            const targetSymbolMatch = fullMatch.match(/belongs_to\s+:([a-zA-Z0-9_]+)/);
            if (targetSymbolMatch) {
                const targetName = targetSymbolMatch[1];
                let targetTable = targetName;
                if (targetTable.endsWith('y')) targetTable = targetTable.slice(0, -1) + 'ies';
                else if (!targetTable.endsWith('s')) targetTable = targetTable + 's';

                const fkCol = `${targetName}_id`;
                if (!models[tableName].columns.some(c => c.name === fkCol)) {
                    models[tableName].columns.push({
                        name: fkCol,
                        type: 'BIGINT',
                        isPrimary: false,
                        isUnique: false,
                        isNullable: true
                    });
                }
                if (!models[tableName].relations.some(r => r.fromColumn === fkCol && r.toTable === targetTable)) {
                    models[tableName].relations.push({
                        fromColumn: fkCol,
                        toTable: targetTable,
                        toColumn: 'id',
                        relationType: 'many-to-one'
                    });
                }
            }
        }
    }

    static mapRailsType(type, args) {
        switch (type.toLowerCase()) {
            case 'string': {
                const limitMatch = args.match(/limit:\s*(\d+)/);
                return limitMatch ? `VARCHAR(${limitMatch[1]})` : 'VARCHAR(255)';
            }
            case 'text':
                return 'TEXT';
            case 'integer':
                return 'INT';
            case 'bigint':
                return 'BIGINT';
            case 'float':
                return 'FLOAT';
            case 'decimal': {
                const precMatch = args.match(/precision:\s*(\d+)/);
                const scaleMatch = args.match(/scale:\s*(\d+)/);
                return precMatch && scaleMatch ? `DECIMAL(${precMatch[1]},${scaleMatch[1]})` : 'DECIMAL(10,2)';
            }
            case 'boolean':
                return 'BOOLEAN';
            case 'datetime':
            case 'timestamp':
                return 'TIMESTAMP';
            case 'date':
                return 'DATE';
            case 'time':
                return 'TIME';
            case 'binary':
                return 'BLOB';
            case 'json':
            case 'jsonb':
                return 'JSON';
            case 'uuid':
                return 'UUID';
            default:
                return type.toUpperCase();
        }
    }
}

module.exports = RailsParser;
