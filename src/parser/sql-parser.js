/**
 * SQL DDL Schema Parser
 * Extracts CREATE TABLE statements, columns, types, primary keys, and foreign key relations.
 * Pure Node.js - Zero dependencies.
 */

class SQLParser {
    static parse(content, models = {}) {
        // Strip SQL comments: block comments /* ... */ and line comments -- ...
        const cleanContent = content
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/--.*$/gm, '');

        // Find CREATE TABLE statements and extract body with balanced parentheses
        const headerRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"\[]?(\w+)[`"\]]?\.)?[`"\[]?(\w+)[`"\]]?\s*\(/gi;
        let match;

        while ((match = headerRegex.exec(cleanContent)) !== null) {
            const tableName = match[2] || match[1];
            const startIndex = headerRegex.lastIndex; // Position right after '('

            // Find matching closing parenthesis
            let depth = 1;
            let endIndex = startIndex;
            let inQuote = false;
            let quoteChar = '';

            while (endIndex < cleanContent.length && depth > 0) {
                const char = cleanContent[endIndex];
                if ((char === "'" || char === '"' || char === '`') && cleanContent[endIndex - 1] !== '\\') {
                    if (!inQuote) {
                        inQuote = true;
                        quoteChar = char;
                    } else if (quoteChar === char) {
                        inQuote = false;
                    }
                } else if (!inQuote) {
                    if (char === '(') depth++;
                    else if (char === ')') depth--;
                }
                endIndex++;
            }

            if (depth === 0) {
                const body = cleanContent.slice(startIndex, endIndex - 1);
                // Advance regex search position past the table definition
                headerRegex.lastIndex = endIndex;

                if (!models[tableName]) {
                    models[tableName] = {
                        name: tableName,
                        columns: [],
                        relations: [],
                        sourceType: 'sql'
                    };
                }

                const primaryKeys = new Set();
                const foreignKeys = [];

                // Split body into comma-separated lines/clauses while respecting nested parentheses
                const clauses = SQLParser.splitClauses(body);

                for (const rawClause of clauses) {
                    const clause = rawClause.trim();
                    if (!clause) continue;

                    const upper = clause.toUpperCase();

                    // 1. Table-level PRIMARY KEY constraint: PRIMARY KEY (col1, col2)
                    const pkMatch = clause.match(/(?:CONSTRAINT\s+[`"\[]?\w+[`"\]]?\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
                    if (pkMatch) {
                        pkMatch[1].split(',').forEach(c => {
                            const cleaned = c.trim().replace(/[`"\[\]]/g, '');
                            if (cleaned) primaryKeys.add(cleaned);
                        });
                        continue;
                    }

                    // 2. Table-level FOREIGN KEY constraint: [CONSTRAINT ...] FOREIGN KEY (col) REFERENCES other_table(col)
                    const fkMatch = clause.match(/(?:CONSTRAINT\s+[`"\[]?\w+[`"\]]?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(?:[`"\[]?\w+[`"\]]?\.)?[`"\[]?(\w+)[`"\]]?\s*\(([^)]+)\)/i);
                    if (fkMatch) {
                        const fromCol = fkMatch[1].trim().replace(/[`"\[\]]/g, '');
                        const toTable = fkMatch[2].trim().replace(/[`"\[\]]/g, '');
                        const toCol = fkMatch[3].trim().replace(/[`"\[\]]/g, '');
                        foreignKeys.push({ from: fromCol, toTable, toField: toCol });
                        continue;
                    }

                    // 3. Table-level UNIQUE constraint
                    if (upper.startsWith('UNIQUE') || (upper.includes('CONSTRAINT') && upper.includes('UNIQUE'))) {
                        continue;
                    }

                    // 4. Table-level CHECK constraint or INDEX
                    if (upper.startsWith('CHECK') || upper.startsWith('KEY ') || upper.startsWith('INDEX ')) {
                        continue;
                    }

                    // 5. Standard Column Definition: col_name DATA_TYPE [CONSTRAINTS...]
                    const colMatch = clause.match(/^[`"\[]?(\w+)[`"\]]?\s+([A-Za-z0-9_]+(?:\s*\([^)]+\))?(?:\s+\[\])?)([\s\S]*)$/);
                    if (colMatch) {
                        const colName = colMatch[1];
                        const colType = colMatch[2].trim();
                        const rest = colMatch[3] || '';
                        const restUpper = rest.toUpperCase();

                        const isPk = restUpper.includes('PRIMARY KEY');
                        if (isPk) primaryKeys.add(colName);

                        const isNotNull = restUpper.includes('NOT NULL');
                        const isUnique = restUpper.includes('UNIQUE');

                        // Inline REFERENCES other_table(col)
                        const inlineRef = rest.match(/REFERENCES\s+(?:[`"\[]?\w+[`"\]]?\.)?[`"\[]?(\w+)[`"\]]?\s*(?:\(([^)]+)\))?/i);
                        if (inlineRef) {
                            const toTable = inlineRef[1].replace(/[`"\[\]]/g, '');
                            const toCol = (inlineRef[2] || 'id').replace(/[`"\[\]]/g, '');
                            foreignKeys.push({ from: colName, toTable, toField: toCol });
                        }

                        models[tableName].columns.push({
                            name: colName,
                            type: colType,
                            isPrimary: isPk,
                            isForeign: !!inlineRef,
                            isNullable: !isNotNull && !isPk,
                            isUnique: isUnique
                        });
                    }
                }

                // Apply discovered primary keys & foreign keys to column metadata
                models[tableName].columns.forEach(col => {
                    if (primaryKeys.has(col.name)) {
                        col.isPrimary = true;
                        col.isNullable = false;
                    }
                    const fk = foreignKeys.find(f => f.from === col.name);
                    if (fk) {
                        col.isForeign = true;
                    }
                });

                // Register relations
                foreignKeys.forEach(fk => {
                    models[tableName].relations.push({
                        from: fk.from,
                        toTable: fk.toTable,
                        toField: fk.toField,
                        cardinality: 'N:1'
                    });
                });
            }
        }

        return models;
    }

    /**
     * Splits SQL column clauses handling nested commas inside types like DECIMAL(10, 2)
     */
    static splitClauses(body) {
        const clauses = [];
        let current = '';
        let depth = 0;
        let inQuote = false;
        let quoteChar = '';

        for (let i = 0; i < body.length; i++) {
            const char = body[i];

            if ((char === "'" || char === '"' || char === '`') && body[i - 1] !== '\\') {
                if (!inQuote) {
                    inQuote = true;
                    quoteChar = char;
                } else if (quoteChar === char) {
                    inQuote = false;
                }
            }

            if (!inQuote) {
                if (char === '(') depth++;
                else if (char === ')') depth--;
                else if (char === ',' && depth === 0) {
                    clauses.push(current);
                    current = '';
                    continue;
                }
            }
            current += char;
        }
        if (current.trim()) clauses.push(current);
        return clauses;
    }
}

module.exports = SQLParser;
