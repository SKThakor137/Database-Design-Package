/**
 * Laravel PHP Migration & Eloquent Model Parser
 * Parses Laravel Schema::create / Schema::table migrations and Eloquent models.
 * Pure Node.js - Zero dependencies.
 */

class LaravelParser {
    static parse(content, models = {}) {
        // 1. Parse Schema::create('table_name', function (Blueprint $table) { ... })
        const schemaCreateRegex = /Schema::(?:create|table)\s*\(\s*['"]([a-zA-Z0-9_]+)['"]\s*,\s*function\s*\([^)]*\)\s*(?:use\s*\([^)]*\)\s*)?\{([\s\S]*?)\}\s*\)\s*;/g;
        let match;

        while ((match = schemaCreateRegex.exec(content)) !== null) {
            const tableName = match[1];
            const body = match[2];

            if (!models[tableName]) {
                models[tableName] = {
                    name: tableName,
                    columns: [],
                    relations: [],
                    sourceType: 'laravel'
                };
            }

            this.parseBlueprintBody(body, models[tableName], models);
        }

        // 2. Parse standalone Eloquent Model classes
        this.parseEloquentModel(content, models);

        return models;
    }

    static parseBlueprintBody(body, model, allModels) {
        const statements = body.split(';');

        statements.forEach(stmt => {
            const trimmed = stmt.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

            // Handle special helper methods:
            // $table->timestamps()
            if (/\$table->timestamps(?:Tz)?\s*\(\s*\)/.test(trimmed)) {
                if (!model.columns.some(c => c.name === 'created_at')) {
                    model.columns.push({ name: 'created_at', type: 'TIMESTAMP', isPrimary: false, isUnique: false, isNullable: true });
                }
                if (!model.columns.some(c => c.name === 'updated_at')) {
                    model.columns.push({ name: 'updated_at', type: 'TIMESTAMP', isPrimary: false, isUnique: false, isNullable: true });
                }
                return;
            }

            // $table->softDeletes()
            if (/\$table->softDeletes(?:Tz)?\s*\(\s*\)/.test(trimmed)) {
                if (!model.columns.some(c => c.name === 'deleted_at')) {
                    model.columns.push({ name: 'deleted_at', type: 'TIMESTAMP', isPrimary: false, isUnique: false, isNullable: true });
                }
                return;
            }

            // $table->rememberToken()
            if (/\$table->rememberToken\s*\(\s*\)/.test(trimmed)) {
                if (!model.columns.some(c => c.name === 'remember_token')) {
                    model.columns.push({ name: 'remember_token', type: 'VARCHAR(100)', isPrimary: false, isUnique: false, isNullable: true });
                }
                return;
            }

            // $table->id('custom_id') or $table->id()
            const idMatch = trimmed.match(/\$table->(?:id|bigIncrements|increments|smallIncrements|tinyIncrements)\s*\(\s*(?:['"]([^'"]+)['"])?\s*\)/);
            if (idMatch) {
                const colName = idMatch[1] || 'id';
                if (!model.columns.some(c => c.name === colName)) {
                    model.columns.push({
                        name: colName,
                        type: 'BIGINT',
                        isPrimary: true,
                        isUnique: true,
                        isNullable: false
                    });
                }
                return;
            }

            // $table->uuid('id')->primary() / $table->ulid('id')
            const uuidMatch = trimmed.match(/\$table->(?:uuid|ulid)\s*\(\s*['"]([^'"]+)['"]\s*\)/);
            if (uuidMatch) {
                const colName = uuidMatch[1];
                const isPrimary = trimmed.includes('->primary()') || colName === 'id';
                if (!model.columns.some(c => c.name === colName)) {
                    model.columns.push({
                        name: colName,
                        type: 'UUID',
                        isPrimary,
                        isUnique: isPrimary || trimmed.includes('->unique()'),
                        isNullable: trimmed.includes('->nullable()')
                    });
                }
                return;
            }

            // Standard $table->type('column_name', ...)
            // e.g. $table->string('email', 255)->unique()->nullable()
            const colMatch = trimmed.match(/\$table->([a-zA-Z0-9_]+)\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*([^)]+))?\s*\)/);
            if (colMatch) {
                const method = colMatch[1];
                const colName = colMatch[2];
                const extraArg = colMatch[3];

                const isPrimary = trimmed.includes('->primary()');
                const isUnique = isPrimary || trimmed.includes('->unique()');
                const isNullable = trimmed.includes('->nullable()');

                let type = this.mapLaravelType(method, extraArg);

                // Add or update column
                const existing = model.columns.find(c => c.name === colName);
                if (!existing) {
                    model.columns.push({
                        name: colName,
                        type,
                        isPrimary,
                        isForeign: method === 'foreignId' || method === 'foreignIdFor',
                        isUnique,
                        isNullable
                    });
                } else if (method === 'foreignId' || method === 'foreignIdFor') {
                    existing.isForeign = true;
                }

                // Check for foreignId(...)->constrained(...)
                if (method === 'foreignId' || method === 'foreignIdFor') {
                    this.extractForeignConstraint(trimmed, colName, model, allModels);
                }
            }

            // Explicit foreign key definitions:
            // $table->foreign('user_id')->references('id')->on('users')
            const foreignRefMatch = trimmed.match(/\$table->foreign\s*\(\s*['"]([^'"]+)['"]\s*\)\s*->references\s*\(\s*['"]([^'"]+)['"]\s*\)\s*->on\s*\(\s*['"]([^'"]+)['"]\s*\)/);
            if (foreignRefMatch) {
                const fromCol = foreignRefMatch[1];
                const toCol = foreignRefMatch[2];
                const toTable = foreignRefMatch[3];

                this.addRelation(model, fromCol, toTable, toCol);
            }
        });
    }

    static extractForeignConstraint(stmt, colName, model, allModels) {
        // 1. $table->foreignId('user_id')->constrained('custom_table', 'custom_col')
        const constrainedCustom = stmt.match(/->constrained\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?\s*\)/);
        if (constrainedCustom) {
            const toTable = constrainedCustom[1];
            const toCol = constrainedCustom[2] || 'id';
            this.addRelation(model, colName, toTable, toCol);
            return;
        }

        // 2. $table->foreignId('user_id')->constrained() -> inferred table = plural of prefix
        if (stmt.includes('->constrained(') || stmt.includes('->constrained()')) {
            let inferredTable = colName.replace(/_id$/, '');
            if (inferredTable.endsWith('y')) {
                inferredTable = inferredTable.slice(0, -1) + 'ies';
            } else if (!inferredTable.endsWith('s')) {
                inferredTable = inferredTable + 's';
            }
            this.addRelation(model, colName, inferredTable, 'id');
            return;
        }

        // 3. $table->foreignId('user_id')->references('id')->on('users')
        const refMatch = stmt.match(/->references\s*\(\s*['"]([^'"]+)['"]\s*\)\s*->on\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (refMatch) {
            const toCol = refMatch[1];
            const toTable = refMatch[2];
            this.addRelation(model, colName, toTable, toCol);
        }
    }

    static addRelation(model, fromCol, toTable, toCol = 'id') {
        const col = model.columns.find(c => c.name === fromCol);
        if (col) {
            col.isForeign = true;
        } else {
            model.columns.push({
                name: fromCol,
                type: 'BIGINT',
                isPrimary: false,
                isForeign: true,
                isUnique: false,
                isNullable: true
            });
        }

        if (!model.relations.some(r => (r.from === fromCol || r.fromColumn === fromCol) && r.toTable === toTable)) {
            model.relations.push({
                from: fromCol,
                fromColumn: fromCol,
                toTable: toTable,
                toField: toCol,
                toColumn: toCol,
                cardinality: 'N:1',
                relationType: 'many-to-one'
            });
        }
    }

    static parseEloquentModel(content, models) {
        // Match class User extends Model
        const classMatch = content.match(/class\s+([a-zA-Z0-9_]+)\s+extends\s+(?:Model|Authenticatable)/);
        if (!classMatch) return;

        const className = classMatch[1];
        // Table name by convention is snake_case plural
        let tableName = className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
        if (tableName.endsWith('y')) {
            tableName = tableName.slice(0, -1) + 'ies';
        } else if (!tableName.endsWith('s')) {
            tableName = tableName + 's';
        }

        // Check if explicit protected $table = 'custom_table';
        const customTableMatch = content.match(/protected\s+\$table\s*=\s*['"]([^'"]+)['"]/);
        if (customTableMatch) {
            tableName = customTableMatch[1];
        }

        if (!models[tableName]) {
            models[tableName] = {
                name: tableName,
                columns: [
                    { name: 'id', type: 'BIGINT', isPrimary: true, isForeign: false, isUnique: true, isNullable: false }
                ],
                relations: [],
                sourceType: 'eloquent'
            };
        }

        // Parse relationships:
        // public function user() { return $this->belongsTo(User::class); }
        const relationRegex = /public\s+function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)[\s\S]*?return\s+\$this->(belongsTo|hasMany|hasOne|belongsToMany)\s*\(\s*([^,\)]+)(?:,\s*['"]([^'"]+)['"])?/g;
        let relMatch;

        while ((relMatch = relationRegex.exec(content)) !== null) {
            const relType = relMatch[2];
            const targetClassRaw = relMatch[3].trim().replace(/::class$/, '').replace(/['"]/g, '').split('\\').pop();
            const customFk = relMatch[4];

            let targetTable = targetClassRaw.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
            if (targetTable.endsWith('y')) targetTable = targetTable.slice(0, -1) + 'ies';
            else if (!targetTable.endsWith('s')) targetTable = targetTable + 's';

            if (relType === 'belongsTo') {
                const fkCol = customFk || `${targetClassRaw.toLowerCase()}_id`;
                const col = models[tableName].columns.find(c => c.name === fkCol);
                if (!col) {
                    models[tableName].columns.push({
                        name: fkCol,
                        type: 'BIGINT',
                        isPrimary: false,
                        isForeign: true,
                        isUnique: false,
                        isNullable: true
                    });
                } else {
                    col.isForeign = true;
                }
                this.addRelation(models[tableName], fkCol, targetTable, 'id');
            }
        }
    }

    static mapLaravelType(method, extraArg) {
        const m = method.toLowerCase();
        switch (m) {
            case 'string':
            case 'char':
                return extraArg ? `VARCHAR(${extraArg.trim()})` : 'VARCHAR(255)';
            case 'text':
                return 'TEXT';
            case 'mediumtext':
                return 'MEDIUMTEXT';
            case 'longtext':
                return 'LONGTEXT';
            case 'integer':
            case 'unsignedinteger':
                return 'INT';
            case 'tinyinteger':
            case 'unsignedtinyinteger':
                return 'TINYINT';
            case 'smallinteger':
            case 'unsignedsmallinteger':
                return 'SMALLINT';
            case 'mediuminteger':
            case 'unsignedmediuminteger':
                return 'MEDIUMINT';
            case 'biginteger':
            case 'unsignedbiginteger':
            case 'foreignid':
            case 'foreignidfor':
                return 'BIGINT';
            case 'float':
                return 'FLOAT';
            case 'double':
                return 'DOUBLE';
            case 'decimal':
            case 'unsigneddecimal':
                return extraArg ? `DECIMAL(${extraArg.trim()})` : 'DECIMAL(10,2)';
            case 'boolean':
                return 'BOOLEAN';
            case 'enum':
                return 'ENUM';
            case 'json':
            case 'jsonb':
                return 'JSON';
            case 'date':
                return 'DATE';
            case 'datetime':
            case 'datetimetz':
                return 'DATETIME';
            case 'time':
            case 'timetz':
                return 'TIME';
            case 'timestamp':
            case 'timestamptz':
                return 'TIMESTAMP';
            case 'uuid':
            case 'ulid':
                return 'UUID';
            case 'binary':
                return 'BLOB';
            default:
                return method.toUpperCase();
        }
    }
}

module.exports = LaravelParser;
