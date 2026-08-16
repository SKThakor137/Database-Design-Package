/**
 * Mongoose / MongoDB Schema Parser
 * Extracts Mongoose Schema definitions, fields, types, and ref relationships.
 * Pure Node.js - Zero dependencies.
 */

class MongooseParser {
    static parse(content, models = {}) {
        // Look for schema declarations:
        // const UserSchema = new Schema({ ... }) or new mongoose.Schema({ ... })
        const schemaRegex = /(?:const|let|var)\s+(\w+)(?:Schema)?\s*=\s*(?:new\s+)?(?:mongoose\.)?Schema\s*\(\s*({[\s\S]*?})\s*(?:,\s*{[\s\S]*?})?\s*\)/gi;
        let match;

        while ((match = schemaRegex.exec(content)) !== null) {
            let modelName = match[1].replace(/Schema$/i, '');
            // Capitalize first letter
            modelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
            const schemaBody = match[2];

            if (!models[modelName]) {
                models[modelName] = {
                    name: modelName,
                    columns: [
                        { name: '_id', type: 'ObjectId', isPrimary: true, isForeign: false, isNullable: false, isUnique: true }
                    ],
                    relations: [],
                    sourceType: 'mongoose'
                };
            }

            // Extract property definitions
            // Pattern: propName: { type: ..., ref: '...' } or propName: String
            const propRegex = /(\w+)\s*:\s*(?:{\s*([^}]+)\s*}|([A-Za-z0-9_\[\]\.]+))/g;
            let propMatch;

            while ((propMatch = propRegex.exec(schemaBody)) !== null) {
                const propName = propMatch[1];
                if (propName === '_id') continue;

                const objectDef = propMatch[2];
                const shorthandDef = propMatch[3];

                if (objectDef) {
                    // Extract type
                    const typeMatch = objectDef.match(/type\s*:\s*([^,\n}]+)/i);
                    let type = typeMatch ? typeMatch[1].trim() : 'Mixed';
                    type = type.replace(/Schema\.Types\./i, '').replace(/mongoose\.Schema\.Types\./i, '');

                    // Extract ref
                    const refMatch = objectDef.match(/ref\s*:\s*['"`]([^'"`]+)['"`]/i);
                    const isRequired = /required\s*:\s*true/i.test(objectDef);
                    const isUnique = /unique\s*:\s*true/i.test(objectDef);

                    if (refMatch) {
                        const targetModel = refMatch[1].trim();
                        const isArray = type.startsWith('[') || /\[\s*type\s*:\s*.*ref\s*:\s*/i.test(objectDef);

                        models[modelName].relations.push({
                            from: propName,
                            toTable: targetModel,
                            toField: '_id',
                            cardinality: isArray ? '1:N' : 'N:1'
                        });

                        models[modelName].columns.push({
                            name: propName,
                            type: isArray ? 'ObjectId[]' : 'ObjectId',
                            isPrimary: false,
                            isForeign: true,
                            isNullable: !isRequired,
                            isUnique: isUnique
                        });
                    } else {
                        models[modelName].columns.push({
                            name: propName,
                            type: type,
                            isPrimary: false,
                            isForeign: false,
                            isNullable: !isRequired,
                            isUnique: isUnique
                        });
                    }
                } else if (shorthandDef) {
                    const cleanType = shorthandDef.replace(/Schema\.Types\./i, '').replace(/mongoose\.Schema\.Types\./i, '');
                    models[modelName].columns.push({
                        name: propName,
                        type: cleanType,
                        isPrimary: false,
                        isForeign: false,
                        isNullable: true,
                        isUnique: false
                    });
                }
            }
        }

        return models;
    }
}

module.exports = MongooseParser;
