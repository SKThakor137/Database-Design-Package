/**
 * TypeORM / TypeScript ORM Schema Parser
 * Extracts @Entity(), @Column(), @PrimaryGeneratedColumn(), @ManyToOne(), @OneToMany(), etc.
 * Pure Node.js - Zero dependencies.
 */

class TypeORMParser {
    static parse(content, models = {}) {
        // Check if content has TypeORM decorators
        if (!content.includes('@Entity') && !content.includes('@Column')) {
            return models;
        }

        // Match entity class header: @Entity(...) class User {
        const classHeaderRegex = /@Entity\s*(?:\([^)]*\))?\s*(?:export\s+)?(?:default\s+)?class\s+(\w+)[^{]*{/g;
        let match;

        while ((match = classHeaderRegex.exec(content)) !== null) {
            const modelName = match[1];
            const startBraceIndex = classHeaderRegex.lastIndex - 1;
            const classBody = TypeORMParser.extractBalancedBlock(content, startBraceIndex);
            if (!classBody) continue;

            if (!models[modelName]) {
                models[modelName] = {
                    name: modelName,
                    columns: [],
                    relations: [],
                    sourceType: 'typeorm'
                };
            }

            // Extract property decorators & definitions
            const lines = classBody.split('\n');
            let pendingDecorator = '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('//')) continue;

                if (trimmed.startsWith('@')) {
                    pendingDecorator += ' ' + trimmed;
                    continue;
                }

                // Property line: propName!: string; or propName?: number;
                const propMatch = trimmed.match(/^(\w+)[\?!]?\s*:\s*([A-Za-z0-9_<>\[\]]+)/);
                if (propMatch) {
                    const propName = propMatch[1];
                    const propType = propMatch[2];
                    const fullContext = pendingDecorator + ' ' + trimmed;

                    const isPk = fullContext.includes('@PrimaryColumn') || fullContext.includes('@PrimaryGeneratedColumn');
                    const isOptional = trimmed.includes('?:') || fullContext.includes('nullable: true');
                    const isUnique = fullContext.includes('unique: true');

                    // Check relations: @ManyToOne(() => Target, target => target.prop)
                    const relMatch = fullContext.match(/@(ManyToOne|OneToMany|OneToOne|ManyToMany)\s*\(\s*(?:\(\)\s*=>\s*)?(\w+)/);
                    if (relMatch) {
                        const relKind = relMatch[1];
                        const targetEntity = relMatch[2];
                        const joinColMatch = fullContext.match(/@JoinColumn\s*\(\s*(?:{\s*name\s*:\s*['"`](\w+)['"`]\s*})?/);
                        const fkColName = joinColMatch && joinColMatch[1] ? joinColMatch[1] : (relKind === 'ManyToOne' || relKind === 'OneToOne' ? `${propName}Id` : propName);

                        models[modelName].relations.push({
                            from: fkColName,
                            fromColumn: fkColName,
                            toTable: targetEntity,
                            toField: 'id',
                            toColumn: 'id',
                            cardinality: relKind === 'ManyToOne' ? 'N:1' : relKind === 'OneToMany' ? '1:N' : '1:1',
                            relationType: relKind === 'ManyToOne' ? 'many-to-one' : relKind === 'OneToMany' ? 'one-to-many' : 'one-to-one'
                        });

                        if (relKind === 'ManyToOne' || relKind === 'OneToOne' || fullContext.includes('@JoinColumn')) {
                            const existingCol = models[modelName].columns.find(c => c.name === fkColName);
                            if (!existingCol) {
                                models[modelName].columns.push({
                                    name: fkColName,
                                    type: 'UUID/Int',
                                    isPrimary: false,
                                    isForeign: true,
                                    isNullable: isOptional,
                                    isUnique: isUnique
                                });
                            } else {
                                existingCol.isForeign = true;
                            }
                        }
                    } else {
                        // Extract DB column type if specified: @Column({ type: 'varchar', length: 100 })
                        const colTypeMatch = fullContext.match(/type\s*:\s*['"`](\w+)['"`]/);
                        const finalType = colTypeMatch ? colTypeMatch[1] : propType;

                        models[modelName].columns.push({
                            name: propName,
                            type: finalType,
                            isPrimary: isPk,
                            isForeign: false,
                            isNullable: isOptional,
                            isUnique: isUnique
                        });
                    }

                    pendingDecorator = '';
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
}

module.exports = TypeORMParser;
