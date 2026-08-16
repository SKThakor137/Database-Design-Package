/**
 * Prisma Schema Parser
 * Parses Prisma schema models, scalar fields, relations, enums, and composite keys.
 * Pure Node.js - Zero dependencies.
 */

class PrismaParser {
    static parse(content, models = {}) {
        // Match models: model ModelName { ... }
        const modelRegex = /model\s+(\w+)\s*{([\s\S]*?)}/g;
        let match;

        // First pass: collect model definitions
        while ((match = modelRegex.exec(content)) !== null) {
            const tableName = match[1];
            const body = match[2];

            if (!models[tableName]) {
                models[tableName] = {
                    name: tableName,
                    columns: [],
                    relations: [],
                    sourceType: 'prisma'
                };
            }

            const lines = body.split('\n');
            const compositePks = new Set();
            const compositeUniques = new Set();

            // Check for block attributes @@id, @@unique
            lines.forEach(line => {
                const trimmed = line.trim();
                const idMatch = trimmed.match(/@@id\(\[([^\]]+)\]\)/);
                if (idMatch) {
                    idMatch[1].split(',').forEach(c => compositePks.add(c.trim()));
                }
                const uqMatch = trimmed.match(/@@unique\(\[([^\]]+)\]\)/);
                if (uqMatch) {
                    uqMatch[1].split(',').forEach(c => compositeUniques.add(c.trim()));
                }
            });

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) return;

                const parts = trimmed.split(/\s+/);
                if (parts.length < 2) return;

                const colName = parts[0];
                const rawType = parts[1];

                const isOptional = rawType.endsWith('?');
                const isArray = rawType.endsWith('[]');
                const baseType = rawType.replace(/[?\[\]]/g, '');

                const isId = trimmed.includes('@id') || compositePks.has(colName);
                const isUnique = trimmed.includes('@unique') || compositeUniques.has(colName);

                // Handle relation fields
                if (trimmed.includes('@relation')) {
                    const refMatch = trimmed.match(/@relation\s*\(([^)]+)\)/);
                    if (refMatch) {
                        const relArgs = refMatch[1];
                        const fieldsMatch = relArgs.match(/fields:\s*\[([^\]]+)\]/);
                        const referencesMatch = relArgs.match(/references:\s*\[([^\]]+)\]/);

                        if (fieldsMatch && referencesMatch) {
                            const fromField = fieldsMatch[1].split(',')[0].trim();
                            const toField = referencesMatch[1].split(',')[0].trim();

                            models[tableName].relations.push({
                                from: fromField,
                                toTable: baseType,
                                toField: toField,
                                cardinality: isArray ? '1:N' : 'N:1'
                            });
                        }
                    }
                } else if (!PrismaParser.isScalarType(baseType) && !isArray) {
                    // Implicit relation field without @relation tag (could be the reverse side of 1:1 or N:1)
                    // We don't necessarily push as scalar column if it's an entity type
                }

                // If it is a scalar database column or explicitly has an @id / @default / @map
                const isScalar = PrismaParser.isScalarType(baseType) || trimmed.includes('@id') || trimmed.includes('@default') || trimmed.includes('@db.');

                if (isScalar) {
                    models[tableName].columns.push({
                        name: colName,
                        type: rawType,
                        isPrimary: isId,
                        isForeign: false,
                        isNullable: isOptional,
                        isUnique: isUnique
                    });
                }
            });
        }

        // Post-process: mark columns that participate as foreign keys
        Object.keys(models).forEach(tableName => {
            const table = models[tableName];
            table.relations.forEach(rel => {
                const col = table.columns.find(c => c.name === rel.from);
                if (col) {
                    col.isForeign = true;
                }
            });
        });

        return models;
    }

    static isScalarType(type) {
        const scalars = ['String', 'Boolean', 'Int', 'BigInt', 'Float', 'Decimal', 'DateTime', 'Json', 'Bytes', 'UUID'];
        return scalars.includes(type);
    }
}

module.exports = PrismaParser;
