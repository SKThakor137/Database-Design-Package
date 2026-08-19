/**
 * Mermaid ERD & Markdown Data Dictionary Renderer
 * Generates standard GitHub/GitLab compatible erDiagram markdown and tabular data dictionaries.
 * Pure Node.js - Zero dependencies.
 */

class MermaidRenderer {
    static generateMarkdown(schemaMap, options = {}) {
        const title = options.title || 'Database Schema ERD';
        const tables = Object.keys(schemaMap);

        let mermaidCode = '```mermaid\nerDiagram\n';

        // 1. Render Relationships
        const relLines = [];
        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            table.relations.forEach(rel => {
                const fromField = rel.from || rel.fromColumn;
                const toField = rel.toField || rel.toColumn || 'id';
                // Determine cardinality syntax:
                // ||--o{ (1 to Many), ||--|| (1 to 1), }o--o{ (Many to Many)
                let cardSymbol = '||--o{';
                if (rel.cardinality === '1:1') cardSymbol = '||--||';
                else if (rel.cardinality === 'N:M') cardSymbol = '}o--o{';

                relLines.push(`    ${tableName} ${cardSymbol} ${rel.toTable} : "${fromField} -> ${toField}"`);
            });
        });

        if (relLines.length > 0) {
            mermaidCode += relLines.join('\n') + '\n\n';
        }

        // 2. Render Table Entities and Column Definitions
        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            mermaidCode += `    ${tableName} {\n`;
            table.columns.forEach(col => {
                const safeType = (col.type || 'string').replace(/[^a-zA-Z0-9_]/g, '_');
                const safeName = col.name.replace(/[^a-zA-Z0-9_]/g, '_');
                const isFk = !!(col.isForeign || table.relations.some(r => (r.from || r.fromColumn) === col.name));
                let keyMarker = '';
                if (col.isPrimary && isFk) keyMarker = ' PK,FK';
                else if (col.isPrimary) keyMarker = ' PK';
                else if (isFk) keyMarker = ' FK';

                mermaidCode += `        ${safeType} ${safeName}${keyMarker}\n`;
            });
            mermaidCode += `    }\n`;
        });

        mermaidCode += '```\n\n';

        // 3. Render Markdown Data Dictionary Tables
        let dictionaryMd = `## 📖 Database Data Dictionary\n\n`;
        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            dictionaryMd += `### Table: \`${tableName}\`\n\n`;
            dictionaryMd += `| Column | Type | Constraints | Description |\n`;
            dictionaryMd += `| :--- | :--- | :--- | :--- |\n`;

            table.columns.forEach(col => {
                const isFk = !!(col.isForeign || table.relations.some(r => (r.from || r.fromColumn) === col.name));
                const constraints = [];
                if (col.isPrimary) constraints.push('`PRIMARY KEY`');
                if (isFk) constraints.push('`FOREIGN KEY`');
                if (!col.isNullable) constraints.push('`NOT NULL`');
                if (col.isUnique) constraints.push('`UNIQUE`');

                const constraintStr = constraints.length > 0 ? constraints.join(', ') : '—';
                dictionaryMd += `| \`${col.name}\` | \`${col.type}\` | ${constraintStr} | | \n`;
            });
            dictionaryMd += '\n';
        });

        return `# ${title}\n\n${mermaidCode}${dictionaryMd}`;
    }
}

module.exports = MermaidRenderer;
