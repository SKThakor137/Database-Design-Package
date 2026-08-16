/**
 * TypeScript Interface, Type Alias, and Zod Schema Parser
 * Enables frontend projects (React, Next.js, Vue, Angular) with TypeScript interfaces or Zod schemas to generate ERDs.
 * Pure Node.js - Zero dependencies.
 */

class TSTypeParser {
    static parse(content, models = {}) {
        // 1. Parse TypeScript Interfaces: interface User { ... }
        const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+[\w\s,]+)?\s*{/g;
        let match;

        while ((match = interfaceRegex.exec(content)) !== null) {
            const modelName = match[1];
            const startBrace = interfaceRegex.lastIndex - 1;
            const body = TSTypeParser.extractBalancedBlock(content, startBrace);
            if (!body) continue;

            TSTypeParser.parseTypeBody(modelName, body, models, 'ts-interface');
        }

        // 2. Parse TypeScript Type Aliases: type User = { ... }
        const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=\s*{/g;
        while ((match = typeRegex.exec(content)) !== null) {
            const modelName = match[1];
            const startBrace = typeRegex.lastIndex - 1;
            const body = TSTypeParser.extractBalancedBlock(content, startBrace);
            if (!body) continue;

            TSTypeParser.parseTypeBody(modelName, body, models, 'ts-type');
        }

        // 3. Parse Zod Object Schemas: const UserSchema = z.object({ ... })
        const zodRegex = /(?:const|let|var)\s+(\w+)(?:Schema)?\s*=\s*(?:z\.)?object\s*\(\s*{/g;
        while ((match = zodRegex.exec(content)) !== null) {
            let modelName = match[1].replace(/Schema$/i, '');
            modelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
            const startBrace = zodRegex.lastIndex - 1;
            const body = TSTypeParser.extractBalancedBlock(content, startBrace);
            if (!body) continue;

            TSTypeParser.parseZodBody(modelName, body, models);
        }

        return models;
    }

    static parseTypeBody(modelName, body, models, sourceType) {
        if (!models[modelName]) {
            models[modelName] = {
                name: modelName,
                columns: [],
                relations: [],
                sourceType
            };
        }

        const lines = body.split('\n');
        for (const rawLine of lines) {
            const line = rawLine.trim().replace(/;$/, '').replace(/,$/, '');
            if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

            // Pattern: propName?: type or propName: type
            const fieldMatch = line.match(/^(\w+)(\??)\s*:\s*([^;]+)/);
            if (fieldMatch) {
                const propName = fieldMatch[1];
                const isOptional = fieldMatch[2] === '?';
                const rawType = fieldMatch[3].trim();

                const isArray = rawType.endsWith('[]') || rawType.startsWith('Array<');
                const baseType = rawType.replace(/\[\]$/, '').replace(/^Array<([^>]+)>$/, '$1').trim();

                const isPrimitive = ['string', 'number', 'boolean', 'Date', 'any', 'unknown', 'bigint', 'symbol', 'null', 'undefined'].includes(baseType.toLowerCase());

                const isPk = propName === 'id' || propName === '_id' || propName === `${modelName.toLowerCase()}Id`;

                if (!isPrimitive && /^[A-Z]\w+$/.test(baseType)) {
                    // It's referencing another model (e.g. posts: Post[] or user: User)
                    models[modelName].relations.push({
                        from: propName,
                        toTable: baseType,
                        toField: 'id',
                        cardinality: isArray ? '1:N' : 'N:1'
                    });
                } else if (propName.endsWith('Id') || propName.endsWith('_id')) {
                    // ID field convention e.g. userId: string -> targets User
                    const inferredTarget = propName.replace(/_?id$/i, '');
                    const capitalizedTarget = inferredTarget.charAt(0).toUpperCase() + inferredTarget.slice(1);

                    models[modelName].relations.push({
                        from: propName,
                        toTable: capitalizedTarget,
                        toField: 'id',
                        cardinality: 'N:1'
                    });

                    models[modelName].columns.push({
                        name: propName,
                        type: rawType,
                        isPrimary: false,
                        isForeign: true,
                        isNullable: isOptional,
                        isUnique: false
                    });
                } else {
                    models[modelName].columns.push({
                        name: propName,
                        type: rawType,
                        isPrimary: isPk,
                        isForeign: false,
                        isNullable: isOptional,
                        isUnique: isPk
                    });
                }
            }
        }
    }

    static parseZodBody(modelName, body, models) {
        if (!models[modelName]) {
            models[modelName] = {
                name: modelName,
                columns: [],
                relations: [],
                sourceType: 'zod'
            };
        }

        const lines = body.split('\n');
        for (const rawLine of lines) {
            const line = rawLine.trim().replace(/,$/, '');
            if (!line || line.startsWith('//')) continue;

            const match = line.match(/^(\w+)\s*:\s*z\.(\w+)(?:\([^)]*\))?([\s\S]*)$/);
            if (match) {
                const propName = match[1];
                const zodType = match[2];
                const rest = match[3] || '';

                const isOptional = rest.includes('.optional()') || rest.includes('.nullable()');
                const isPk = propName === 'id' || propName === '_id';

                if (propName.endsWith('Id') || propName.endsWith('_id')) {
                    const inferredTarget = propName.replace(/_?id$/i, '');
                    const capitalizedTarget = inferredTarget.charAt(0).toUpperCase() + inferredTarget.slice(1);

                    models[modelName].relations.push({
                        from: propName,
                        toTable: capitalizedTarget,
                        toField: 'id',
                        cardinality: 'N:1'
                    });

                    models[modelName].columns.push({
                        name: propName,
                        type: zodType,
                        isPrimary: false,
                        isForeign: true,
                        isNullable: isOptional,
                        isUnique: false
                    });
                } else {
                    models[modelName].columns.push({
                        name: propName,
                        type: zodType,
                        isPrimary: isPk,
                        isForeign: false,
                        isNullable: isOptional,
                        isUnique: isPk
                    });
                }
            }
        }
    }

    static extractBalancedBlock(text, startBraceIndex) {
        let depth = 0;
        let inString = false;
        let stringChar = '';

        for (let i = startBraceIndex; i < text.length; i++) {
            const char = text[i];

            if ((char === "'" || char === '"' || char === '`') && text[i - 1] !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (stringChar === char) {
                    inString = false;
                }
            }

            if (!inString) {
                if (char === '{') depth++;
                else if (char === '}') {
                    depth--;
                    if (depth === 0) {
                        return text.slice(startBraceIndex + 1, i);
                    }
                }
            }
        }
        return null;
    }
}

module.exports = TSTypeParser;
