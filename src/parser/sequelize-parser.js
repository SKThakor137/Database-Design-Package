/**
 * Sequelize ORM Schema Parser
 * Extracts sequelize.define() and Model.init() structures, field types, and associations.
 * Pure Node.js - Zero dependencies.
 */

class SequelizeParser {
    static parse(content, models = {}) {
        // 1. Match sequelize.define('ModelName', { ... }) or Model.init({ ... }, { ... })
        const defineHeaderRegex = /(?:sequelize\.define|\b(\w+)\.init)\s*\(\s*(?:['"`](\w+)['"`]\s*,\s*)?{/gi;
        let match;

        while ((match = defineHeaderRegex.exec(content)) !== null) {
            let modelName = match[2] || match[1];
            if (!modelName) continue;
            modelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);

            // Extract the matching balanced object body
            const startIndex = defineHeaderRegex.lastIndex - 1; // start at '{'
            const body = SequelizeParser.extractBalancedBlock(content, startIndex);
            if (!body) continue;

            if (!models[modelName]) {
                models[modelName] = {
                    name: modelName,
                    columns: [],
                    relations: [],
                    sourceType: 'sequelize'
                };
            }

            // Extract column properties by splitting top-level keys in the object body
            const propEntries = SequelizeParser.extractObjectProperties(body);

            for (const { key: colName, value: colDef } of propEntries) {
                const trimmedDef = colDef.trim();

                // Direct type like DataTypes.STRING or 'STRING'
                const directTypeMatch = trimmedDef.match(/^(?:DataTypes\.)?([A-Za-z0-9_()]+)$/i);
                if (directTypeMatch) {
                    models[modelName].columns.push({
                        name: colName,
                        type: directTypeMatch[1],
                        isPrimary: colName === 'id',
                        isForeign: false,
                        isNullable: true,
                        isUnique: false
                    });
                    continue;
                }

                // Object definition: { type: DataTypes.INTEGER, primaryKey: true, ... }
                const typeMatch = trimmedDef.match(/type\s*:\s*(?:DataTypes\.)?([A-Za-z0-9_()]+)/i);
                const type = typeMatch ? typeMatch[1] : 'TEXT';
                const isPk = /primaryKey\s*:\s*true/i.test(trimmedDef);
                const isNotNull = /allowNull\s*:\s*false/i.test(trimmedDef);
                const isUnique = /unique\s*:\s*true/i.test(trimmedDef);

                // Check references: references: { model: 'Category', key: 'id' }
                const refMatch = trimmedDef.match(/references\s*:\s*{\s*(?:[^}]*?\bmodel\s*:\s*['"`]?(\w+)['"`]?[\s\S]*?\bkey\s*:\s*['"`]?(\w+)['"`]?|[^}]*?\bkey\s*:\s*['"`]?(\w+)['"`]?[\s\S]*?\bmodel\s*:\s*['"`]?(\w+)['"`]?)/i);
                let isFk = false;

                if (refMatch) {
                    const targetModel = refMatch[1] || refMatch[4];
                    const targetKey = refMatch[2] || refMatch[3];
                    if (targetModel) {
                        isFk = true;
                        models[modelName].relations.push({
                            from: colName,
                            toTable: targetModel,
                            toField: targetKey || 'id',
                            cardinality: 'N:1'
                        });
                    }
                }

                models[modelName].columns.push({
                    name: colName,
                    type,
                    isPrimary: isPk,
                    isForeign: isFk,
                    isNullable: !isNotNull && !isPk,
                    isUnique
                });
            }

            // Default id if none
            if (!models[modelName].columns.some(c => c.isPrimary)) {
                models[modelName].columns.unshift({
                    name: 'id',
                    type: 'INTEGER',
                    isPrimary: true,
                    isForeign: false,
                    isNullable: false,
                    isUnique: true
                });
            }
        }

        // 2. Parse Sequelize Associations:
        // ModelA.hasMany(ModelB, { foreignKey: 'modelAId' })
        // ModelA.belongsTo(ModelB, { foreignKey: 'modelBId' })
        const assocRegex = /(\w+)\s*\.\s*(hasMany|belongsTo|hasOne|belongsToMany)\s*\(\s*(\w+)(?:\s*,\s*({[\s\S]*?}))?\s*\)/g;
        let assocMatch;

        while ((assocMatch = assocRegex.exec(content)) !== null) {
            const sourceModel = assocMatch[1];
            const relationType = assocMatch[2];
            const targetModel = assocMatch[3];
            const options = assocMatch[4] || '';

            const fkMatch = options.match(/foreignKey\s*:\s*['"`](\w+)['"`]/i);
            const fkName = fkMatch ? fkMatch[1] : `${sourceModel.toLowerCase()}Id`;

            if (models[sourceModel]) {
                if (relationType === 'belongsTo') {
                    models[sourceModel].relations.push({
                        from: fkName,
                        toTable: targetModel,
                        toField: 'id',
                        cardinality: 'N:1'
                    });
                } else if (relationType === 'hasMany') {
                    if (models[targetModel]) {
                        models[targetModel].relations.push({
                            from: fkName,
                            toTable: sourceModel,
                            toField: 'id',
                            cardinality: 'N:1'
                        });
                    }
                }
            }
        }

        return models;
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

    static extractObjectProperties(body) {
        const props = [];
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let currentKey = '';
        let currentValue = '';
        let parsingKey = true;

        for (let i = 0; i < body.length; i++) {
            const char = body[i];

            if ((char === "'" || char === '"' || char === '`') && body[i - 1] !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (stringChar === char) {
                    inString = false;
                }
            }

            if (!inString) {
                if (char === '{' || char === '(' || char === '[') depth++;
                else if (char === '}' || char === ')' || char === ']') depth--;
                else if (char === ':' && depth === 0 && parsingKey) {
                    parsingKey = false;
                    continue;
                } else if (char === ',' && depth === 0) {
                    const key = currentKey.trim().replace(/['"`]/g, '');
                    if (key && currentValue.trim()) {
                        props.push({ key, value: currentValue.trim() });
                    }
                    currentKey = '';
                    currentValue = '';
                    parsingKey = true;
                    continue;
                }
            }

            if (parsingKey) {
                currentKey += char;
            } else {
                currentValue += char;
            }
        }

        const key = currentKey.trim().replace(/['"`]/g, '');
        if (key && currentValue.trim()) {
            props.push({ key, value: currentValue.trim() });
        }

        return props;
    }
}

module.exports = SequelizeParser;
