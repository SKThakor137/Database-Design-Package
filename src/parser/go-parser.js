/**
 * Go Struct & GORM Schema Parser
 * Parses Go structs, gorm tags, primary keys, and foreignKey associations.
 * Pure Node.js - Zero dependencies.
 */

class GoParser {
    static parse(content, models = {}) {
        // Match type StructName struct { ... }
        const structRegex = /type\s+([a-zA-Z0-9_]+)\s+struct\s*\{([\s\S]*?)\}/g;
        let match;

        while ((match = structRegex.exec(content)) !== null) {
            const structName = match[1];
            const body = match[2];

            let tableName = structName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
            if (tableName.endsWith('y')) tableName = tableName.slice(0, -1) + 'ies';
            else if (!tableName.endsWith('s')) tableName = tableName + 's';

            if (!models[tableName]) {
                models[tableName] = {
                    name: tableName,
                    columns: [],
                    relations: [],
                    sourceType: 'gorm'
                };
            }

            const lines = body.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('//')) return;

                // Handle embedded gorm.Model
                if (trimmed === 'gorm.Model') {
                    if (!models[tableName].columns.some(c => c.name === 'id')) {
                        models[tableName].columns.push({ name: 'id', type: 'BIGINT', isPrimary: true, isUnique: true, isNullable: false });
                    }
                    if (!models[tableName].columns.some(c => c.name === 'created_at')) {
                        models[tableName].columns.push({ name: 'created_at', type: 'TIMESTAMP', isPrimary: false, isUnique: false, isNullable: true });
                    }
                    if (!models[tableName].columns.some(c => c.name === 'updated_at')) {
                        models[tableName].columns.push({ name: 'updated_at', type: 'TIMESTAMP', isPrimary: false, isUnique: false, isNullable: true });
                    }
                    if (!models[tableName].columns.some(c => c.name === 'deleted_at')) {
                        models[tableName].columns.push({ name: 'deleted_at', type: 'TIMESTAMP', isPrimary: false, isUnique: false, isNullable: true });
                    }
                    return;
                }

                // Match: FieldName FieldType `tags...`
                const fieldMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s+([*\[\]a-zA-Z0-9_.]+)(?:\s+`([^`]+)`)?/);
                if (fieldMatch) {
                    const fieldName = fieldMatch[1];
                    const fieldType = fieldMatch[2];
                    const tagString = fieldMatch[3] || '';

                    // Check for gorm tags
                    const isPrimary = fieldName === 'ID' || tagString.includes('primaryKey') || tagString.includes('primary_key');
                    const isUnique = isPrimary || tagString.includes('unique') || tagString.includes('uniqueIndex');
                    const isNullable = fieldType.startsWith('*') || tagString.includes('null');

                    // Check if relationship field:
                    // e.g. User User `gorm:"foreignKey:UserID"` or Orders []Order
                    const foreignKeyTagMatch = tagString.match(/foreignKey:([a-zA-Z0-9_]+)/);
                    if (foreignKeyTagMatch) {
                        const fkCol = foreignKeyTagMatch[1].replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
                        const rawTarget = fieldType.replace(/[*\[\]]/g, '').split('.').pop();
                        let targetTable = rawTarget.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
                        if (targetTable.endsWith('y')) targetTable = targetTable.slice(0, -1) + 'ies';
                        else if (!targetTable.endsWith('s')) targetTable = targetTable + 's';

                        const existingCol = models[tableName].columns.find(c => c.name === fkCol);
                        if (!existingCol) {
                            models[tableName].columns.push({
                                name: fkCol,
                                type: 'BIGINT',
                                isPrimary: false,
                                isForeign: true,
                                isUnique: false,
                                isNullable: true
                            });
                        } else {
                            existingCol.isForeign = true;
                        }

                        if (!models[tableName].relations.some(r => (r.from === fkCol || r.fromColumn === fkCol) && r.toTable === targetTable)) {
                            models[tableName].relations.push({
                                from: fkCol,
                                fromColumn: fkCol,
                                toTable: targetTable,
                                toField: 'id',
                                toColumn: 'id',
                                cardinality: 'N:1',
                                relationType: 'many-to-one'
                            });
                        }
                        return;
                    }

                    // Check if field is a relation by ID naming convention (e.g. UserID uint)
                    if (fieldName.endsWith('ID') && fieldName !== 'ID') {
                        const colName = fieldName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
                        const rawTarget = fieldName.slice(0, -2);
                        let targetTable = rawTarget.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
                        if (targetTable.endsWith('y')) targetTable = targetTable.slice(0, -1) + 'ies';
                        else if (!targetTable.endsWith('s')) targetTable = targetTable + 's';

                        const existingCol = models[tableName].columns.find(c => c.name === colName);
                        if (!existingCol) {
                            models[tableName].columns.push({
                                name: colName,
                                type: 'BIGINT',
                                isPrimary: false,
                                isForeign: true,
                                isUnique: false,
                                isNullable
                            });
                        } else {
                            existingCol.isForeign = true;
                        }

                        if (!models[tableName].relations.some(r => (r.from === colName || r.fromColumn === colName) && r.toTable === targetTable)) {
                            models[tableName].relations.push({
                                from: colName,
                                fromColumn: colName,
                                toTable: targetTable,
                                toField: 'id',
                                toColumn: 'id',
                                cardinality: 'N:1',
                                relationType: 'many-to-one'
                            });
                        }
                        return;
                    }

                    // Skip complex slices/maps that represent relations
                    if (fieldType.startsWith('[]') || fieldType.startsWith('map[')) {
                        return;
                    }

                    const colName = fieldName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
                    const dbType = this.mapGoType(fieldType, tagString);

                    if (!models[tableName].columns.some(c => c.name === colName)) {
                        models[tableName].columns.push({
                            name: colName,
                            type: dbType,
                            isPrimary,
                            isForeign: false,
                            isUnique,
                            isNullable
                        });
                    }
                }
            });
        }

        return models;
    }

    static mapGoType(goType, tags) {
        const t = goType.replace(/^\*/, '');
        switch (t) {
            case 'uint':
            case 'uint64':
            case 'int64':
                return 'BIGINT';
            case 'int':
            case 'int32':
            case 'uint32':
                return 'INT';
            case 'int16':
            case 'uint16':
                return 'SMALLINT';
            case 'int8':
            case 'uint8':
            case 'byte':
                return 'TINYINT';
            case 'string': {
                const sizeMatch = tags.match(/size:(\d+)/);
                return sizeMatch ? `VARCHAR(${sizeMatch[1]})` : 'VARCHAR(255)';
            }
            case 'bool':
                return 'BOOLEAN';
            case 'float32':
            case 'float64':
                return 'FLOAT';
            case 'time.Time':
                return 'TIMESTAMP';
            case 'uuid.UUID':
                return 'UUID';
            default:
                return 'TEXT';
        }
    }
}

module.exports = GoParser;
