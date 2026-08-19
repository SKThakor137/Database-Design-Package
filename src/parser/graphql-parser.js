/**
 * GraphQL Schema Parser (SDL)
 * Extracts GraphQL type definitions, fields, types, and model relationships.
 * Pure Node.js - Zero dependencies.
 */

class GraphQLParser {
    static parse(content, models = {}) {
        // Match: type ModelName { ... }
        const typeRegex = /type\s+(\w+)(?:\s+implements\s+[\w\s&]+)?\s*{([\s\S]*?)}/g;
        let match;

        const reservedTypes = ['Query', 'Mutation', 'Subscription'];

        while ((match = typeRegex.exec(content)) !== null) {
            const typeName = match[1];
            if (reservedTypes.includes(typeName)) continue;

            const body = match[2];

            if (!models[typeName]) {
                models[typeName] = {
                    name: typeName,
                    columns: [],
                    relations: [],
                    sourceType: 'graphql'
                };
            }

            const lines = body.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;

                const fieldMatch = trimmed.match(/^(\w+)(?:\([^)]*\))?\s*:\s*([A-Za-z0-9_!\[\]]+)/);
                if (fieldMatch) {
                    const fieldName = fieldMatch[1];
                    const rawType = fieldMatch[2];

                    const isRequired = rawType.includes('!');
                    const isArray = rawType.includes('[');
                    const baseType = rawType.replace(/[!\[\]]/g, '');

                    const isScalar = ['ID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'JSON', 'Date'].includes(baseType);
                    const isFk = fieldName !== 'id' && (fieldName.endsWith('Id') || fieldName.endsWith('_id'));

                    if (isScalar) {
                        models[typeName].columns.push({
                            name: fieldName,
                            type: rawType,
                            isPrimary: fieldName === 'id' || (baseType === 'ID' && !isFk),
                            isForeign: isFk,
                            isNullable: !isRequired,
                            isUnique: fieldName === 'id'
                        });

                        if (isFk) {
                            const target = fieldName.replace(/_?id$/i, '');
                            const targetTable = target.charAt(0).toUpperCase() + target.slice(1);
                            if (!models[typeName].relations.some(r => r.from === fieldName && r.toTable === targetTable)) {
                                models[typeName].relations.push({
                                    from: fieldName,
                                    fromColumn: fieldName,
                                    toTable: targetTable,
                                    toField: 'id',
                                    toColumn: 'id',
                                    cardinality: 'N:1'
                                });
                            }
                        }
                    } else {
                        // Object reference -> Relation
                        models[typeName].relations.push({
                            from: fieldName,
                            fromColumn: fieldName,
                            toTable: baseType,
                            toField: 'id',
                            toColumn: 'id',
                            cardinality: isArray ? '1:N' : 'N:1'
                        });
                    }
                }
            });
        }

        return models;
    }
}

module.exports = GraphQLParser;
