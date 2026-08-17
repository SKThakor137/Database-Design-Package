/**
 * Java & Kotlin JPA / Hibernate / Spring Boot Entity Parser
 * Parses @Entity, @Table, @Column, @ManyToOne, @OneToMany, and @JoinColumn.
 * Pure Node.js - Zero dependencies.
 */

class JPAParser {
    static parse(content, models = {}) {
        // Match @Entity class ClassName or @Entity data class ClassName
        if (!content.includes('@Entity')) return models;

        const classRegex = /(?:@Table\s*\(\s*name\s*=\s*['"]([^'"]+)['"]\s*\)[\s\S]*?)?(?:public\s+)?(?:data\s+)?class\s+([a-zA-Z0-9_]+)[\s\S]*?\{([\s\S]*?)\n\}/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            const customTable = match[1];
            const className = match[2];
            const body = match[3];

            let tableName = customTable || className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
            if (!customTable) {
                if (tableName.endsWith('y')) tableName = tableName.slice(0, -1) + 'ies';
                else if (!tableName.endsWith('s')) tableName = tableName + 's';
            }

            if (!models[tableName]) {
                models[tableName] = {
                    name: tableName,
                    columns: [],
                    relations: [],
                    sourceType: 'jpa'
                };
            }

            // Split into member declarations (by semicolon or newline)
            const members = body.split(';');

            members.forEach(member => {
                const trimmed = member.trim();
                if (!trimmed || trimmed.startsWith('//')) return;

                const isId = trimmed.includes('@Id') || trimmed.includes('@EmbeddedId');
                const isUnique = isId || trimmed.includes('unique = true') || trimmed.includes('unique=true');
                const isNullable = !isId && !trimmed.includes('nullable = false') && !trimmed.includes('nullable=false');

                // Check for @ManyToOne or @OneToOne with @JoinColumn
                if (trimmed.includes('@ManyToOne') || trimmed.includes('@OneToOne') || trimmed.includes('@JoinColumn')) {
                    const joinColMatch = trimmed.match(/@JoinColumn\s*\(\s*(?:name\s*=\s*['"]([^'"]+)['"])?/);
                    const typeMatch = trimmed.match(/(?:private|protected|public)?\s*([A-Z][a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)/);

                    if (typeMatch) {
                        const targetType = typeMatch[1];
                        const varName = typeMatch[2];
                        const fkCol = joinColMatch && joinColMatch[1] ? joinColMatch[1] : `${varName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}_id`;

                        let targetTable = targetType.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
                        if (targetTable.endsWith('y')) targetTable = targetTable.slice(0, -1) + 'ies';
                        else if (!targetTable.endsWith('s')) targetTable = targetTable + 's';

                        if (!models[tableName].columns.some(c => c.name === fkCol)) {
                            models[tableName].columns.push({
                                name: fkCol,
                                type: 'BIGINT',
                                isPrimary: isId,
                                isUnique,
                                isNullable
                            });
                        }

                        if (!models[tableName].relations.some(r => r.fromColumn === fkCol && r.toTable === targetTable)) {
                            models[tableName].relations.push({
                                fromColumn: fkCol,
                                toTable: targetTable,
                                toColumn: 'id',
                                relationType: trimmed.includes('@OneToOne') ? 'one-to-one' : 'many-to-one'
                            });
                        }
                        return;
                    }
                }

                // Standard column field
                // e.g. @Column(name = "full_name", length = 100) private String fullName;
                // or private Long id;
                const fieldMatch = trimmed.match(/(?:@Column\s*\([^)]*\)\s*)?(?:private|protected|public)?\s*([a-zA-Z0-9_<>, ?]+)\s+([a-zA-Z0-9_]+)\s*(?:=.*)?$/);
                if (fieldMatch) {
                    const rawType = fieldMatch[1].trim();
                    const varName = fieldMatch[2].trim();

                    // Skip collection fields like List<Order>, Set<Role>
                    if (rawType.startsWith('List<') || rawType.startsWith('Set<') || rawType.startsWith('Collection<')) {
                        return;
                    }

                    // Check custom column name in @Column(name = "...")
                    const colNameMatch = trimmed.match(/@Column\s*\([^)]*name\s*=\s*['"]([^'"]+)['"]/);
                    const lengthMatch = trimmed.match(/@Column\s*\([^)]*length\s*=\s*(\d+)/);
                    const colName = colNameMatch ? colNameMatch[1] : varName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

                    const dbType = this.mapJPAType(rawType, lengthMatch ? lengthMatch[1] : null);

                    if (!models[tableName].columns.some(c => c.name === colName)) {
                        models[tableName].columns.push({
                            name: colName,
                            type: dbType,
                            isPrimary: isId,
                            isUnique,
                            isNullable
                        });
                    }
                }
            });
        }

        return models;
    }

    static mapJPAType(javaType, length) {
        const t = javaType.toLowerCase();
        if (t.includes('long')) return 'BIGINT';
        if (t.includes('int') || t.includes('integer')) return 'INT';
        if (t.includes('short')) return 'SMALLINT';
        if (t.includes('byte')) return 'TINYINT';
        if (t.includes('boolean')) return 'BOOLEAN';
        if (t.includes('double') || t.includes('float')) return 'DOUBLE';
        if (t.includes('bigdecimal')) return 'DECIMAL(10,2)';
        if (t.includes('string')) return length ? `VARCHAR(${length})` : 'VARCHAR(255)';
        if (t.includes('instant') || t.includes('localdatetime') || t.includes('date') || t.includes('timestamp')) return 'TIMESTAMP';
        if (t.includes('localdate')) return 'DATE';
        if (t.includes('localtime')) return 'TIME';
        if (t.includes('uuid')) return 'UUID';
        return 'TEXT';
    }
}

module.exports = JPAParser;
