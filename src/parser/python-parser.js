/**
 * Python Schema Parser (Django Models & SQLAlchemy)
 * Parses Django models.Model and SQLAlchemy declarative Base models.
 * Pure Node.js - Zero dependencies.
 */

class PythonParser {
    static parse(content, models = {}) {
        // 1. Parse Django Models
        this.parseDjangoModels(content, models);

        // 2. Parse SQLAlchemy Models
        this.parseSQLAlchemyModels(content, models);

        return models;
    }

    static parseDjangoModels(content, models) {
        // Regex matching class ModelName(models.Model) or class ModelName(AbstractBaseUser, etc.)
        const djangoClassRegex = /class\s+([a-zA-Z0-9_]+)\s*\(\s*(?:models\.Model|[a-zA-Z0-9_.]*Model[a-zA-Z0-9_.]*)\s*\):([\s\S]*?)(?=\nclass\s|\n[a-zA-Z0-9_]|\s*$)/g;
        let match;

        while ((match = djangoClassRegex.exec(content)) !== null) {
            const className = match[1];
            const body = match[2];

            let tableName = className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
            if (tableName.endsWith('y')) tableName = tableName.slice(0, -1) + 'ies';
            else if (!tableName.endsWith('s')) tableName = tableName + 's';

            // Check for db_table in class Meta
            const metaDbTableMatch = body.match(/db_table\s*=\s*['"]([^'"]+)['"]/);
            if (metaDbTableMatch) {
                tableName = metaDbTableMatch[1];
            }

            if (!models[tableName]) {
                models[tableName] = {
                    name: tableName,
                    columns: [
                        { name: 'id', type: 'BIGINT', isPrimary: true, isUnique: true, isNullable: false }
                    ],
                    relations: [],
                    sourceType: 'django'
                };
            }

            const lines = body.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;

                // Match: field_name = models.FieldType(...)
                const fieldMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*=\s*models\.([a-zA-Z0-9_]+)\s*\(([\s\S]*)\)\s*$/);
                if (fieldMatch) {
                    const fieldName = fieldMatch[1];
                    const fieldType = fieldMatch[2];
                    const fieldArgs = fieldMatch[3];

                    const isPrimary = fieldArgs.includes('primary_key=True');
                    const isUnique = isPrimary || fieldArgs.includes('unique=True');
                    const isNullable = fieldArgs.includes('null=True');

                    if (isPrimary && fieldName !== 'id') {
                        // Replace or rename default ID
                        const defaultIdIdx = models[tableName].columns.findIndex(c => c.name === 'id' && c.isPrimary);
                        if (defaultIdIdx !== -1) {
                            models[tableName].columns.splice(defaultIdIdx, 1);
                        }
                    }

                    // Handle ForeignKey / OneToOne / ManyToMany
                    if (['ForeignKey', 'OneToOneField', 'ManyToManyField'].includes(fieldType)) {
                        // Extract target model
                        const targetMatch = fieldArgs.match(/^['"]?([a-zA-Z0-9_.]+)['"]?/);
                        if (targetMatch) {
                            const rawTarget = targetMatch[1].split('.').pop();
                            let targetTable = rawTarget.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
                            if (targetTable.endsWith('y')) targetTable = targetTable.slice(0, -1) + 'ies';
                            else if (!targetTable.endsWith('s')) targetTable = targetTable + 's';

                            const fkCol = fieldName.endsWith('_id') ? fieldName : `${fieldName}_id`;

                            const existingCol = models[tableName].columns.find(c => c.name === fkCol);
                            if (!existingCol) {
                                models[tableName].columns.push({
                                    name: fkCol,
                                    type: 'BIGINT',
                                    isPrimary,
                                    isForeign: true,
                                    isUnique,
                                    isNullable
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
                                    cardinality: fieldType === 'OneToOneField' ? '1:1' : 'N:1',
                                    relationType: fieldType === 'OneToOneField' ? 'one-to-one' : 'many-to-one'
                                });
                            }
                        }
                    } else {
                        // Standard scalar field
                        const dbType = this.mapDjangoType(fieldType, fieldArgs);
                        if (!models[tableName].columns.some(c => c.name === fieldName)) {
                            models[tableName].columns.push({
                                name: fieldName,
                                type: dbType,
                                isPrimary,
                                isForeign: false,
                                isUnique,
                                isNullable
                            });
                        }
                    }
                }
            });
        }
    }

    static parseSQLAlchemyModels(content, models) {
        // Regex matching class ModelName(Base) or class ModelName(db.Model)
        const sqlaClassRegex = /class\s+([a-zA-Z0-9_]+)\s*\(\s*(?:Base|db\.Model|[a-zA-Z0-9_.]*Model[a-zA-Z0-9_.]*)\s*\):([\s\S]*?)(?=\nclass\s|\n[a-zA-Z0-9_]|\s*$)/g;
        let match;

        while ((match = sqlaClassRegex.exec(content)) !== null) {
            const className = match[1];
            const body = match[2];

            let tableName = className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
            if (tableName.endsWith('y')) tableName = tableName.slice(0, -1) + 'ies';
            else if (!tableName.endsWith('s')) tableName = tableName + 's';

            // Check for __tablename__ = 'custom_table'
            const tableNameMatch = body.match(/__tablename__\s*=\s*['"]([^'"]+)['"]/);
            if (tableNameMatch) {
                tableName = tableNameMatch[1];
            }

            if (!models[tableName]) {
                models[tableName] = {
                    name: tableName,
                    columns: [],
                    relations: [],
                    sourceType: 'sqlalchemy'
                };
            }

            const lines = body.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;

                // Match: col_name = Column(Integer, ForeignKey('users.id'), primary_key=True)
                const colMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*=\s*(?:db\.)?Column\s*\(([\s\S]*)\)\s*$/);
                if (colMatch) {
                    const colName = colMatch[1];
                    const colArgs = colMatch[2];

                    const isPrimary = colArgs.includes('primary_key=True');
                    const isUnique = isPrimary || colArgs.includes('unique=True');
                    const isNullable = !isPrimary && !colArgs.includes('nullable=False');
                    const isFk = colArgs.includes('ForeignKey(');

                    let dbType = 'VARCHAR(255)';
                    const typeMatch = colArgs.match(/(?:db\.)?([A-Z][a-zA-Z0-9_]+)(?:\(([^)]*)\))?/);
                    if (typeMatch) {
                        dbType = this.mapSQLAlchemyType(typeMatch[1], typeMatch[2]);
                    }

                    const existingCol = models[tableName].columns.find(c => c.name === colName);
                    if (!existingCol) {
                        models[tableName].columns.push({
                            name: colName,
                            type: dbType,
                            isPrimary,
                            isForeign: isFk,
                            isUnique,
                            isNullable
                        });
                    } else if (isFk) {
                        existingCol.isForeign = true;
                    }

                    // Check for ForeignKey('table.column') in colArgs or line
                    const fkMatch = trimmed.match(/ForeignKey\s*\(\s*['"]([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)['"]\s*\)/);
                    if (fkMatch) {
                        const toTable = fkMatch[1];
                        const toCol = fkMatch[2];

                        if (!models[tableName].relations.some(r => (r.from === colName || r.fromColumn === colName) && r.toTable === toTable)) {
                            models[tableName].relations.push({
                                from: colName,
                                fromColumn: colName,
                                toTable: toTable,
                                toField: toCol,
                                toColumn: toCol,
                                cardinality: 'N:1',
                                relationType: 'many-to-one'
                            });
                        }
                    }
                }
            });
        }
    }

    static mapDjangoType(fieldType, args) {
        switch (fieldType) {
            case 'AutoField':
            case 'BigAutoField':
            case 'SmallAutoField':
                return 'BIGINT';
            case 'CharField': {
                const maxLen = args.match(/max_length\s*=\s*(\d+)/);
                return maxLen ? `VARCHAR(${maxLen[1]})` : 'VARCHAR(255)';
            }
            case 'TextField':
                return 'TEXT';
            case 'IntegerField':
            case 'PositiveIntegerField':
                return 'INT';
            case 'SmallIntegerField':
            case 'PositiveSmallIntegerField':
                return 'SMALLINT';
            case 'BigIntegerField':
            case 'PositiveBigIntegerField':
                return 'BIGINT';
            case 'FloatField':
                return 'FLOAT';
            case 'DecimalField': {
                const maxD = args.match(/max_digits\s*=\s*(\d+)/);
                const decP = args.match(/decimal_places\s*=\s*(\d+)/);
                return maxD && decP ? `DECIMAL(${maxD[1]},${decP[1]})` : 'DECIMAL(10,2)';
            }
            case 'BooleanField':
            case 'NullBooleanField':
                return 'BOOLEAN';
            case 'DateField':
                return 'DATE';
            case 'DateTimeField':
                return 'DATETIME';
            case 'TimeField':
                return 'TIME';
            case 'EmailField':
                return 'VARCHAR(254)';
            case 'UUIDField':
                return 'UUID';
            case 'JSONField':
                return 'JSON';
            case 'BinaryField':
                return 'BLOB';
            default:
                return fieldType.toUpperCase();
        }
    }

    static mapSQLAlchemyType(type, arg) {
        switch (type.toUpperCase()) {
            case 'INTEGER':
            case 'INT':
                return 'INT';
            case 'BIGINTEGER':
            case 'BIGINT':
                return 'BIGINT';
            case 'SMALLINTEGER':
            case 'SMALLINT':
                return 'SMALLINT';
            case 'STRING':
            case 'VARCHAR':
                return arg ? `VARCHAR(${arg.trim()})` : 'VARCHAR(255)';
            case 'TEXT':
                return 'TEXT';
            case 'BOOLEAN':
                return 'BOOLEAN';
            case 'FLOAT':
                return 'FLOAT';
            case 'NUMERIC':
            case 'DECIMAL':
                return arg ? `DECIMAL(${arg.trim()})` : 'DECIMAL(10,2)';
            case 'DATETIME':
            case 'TIMESTAMP':
                return 'TIMESTAMP';
            case 'DATE':
                return 'DATE';
            case 'TIME':
                return 'TIME';
            case 'UUID':
                return 'UUID';
            case 'JSON':
            case 'JSONB':
                return 'JSON';
            default:
                return type.toUpperCase();
        }
    }
}

module.exports = PythonParser;
