/**
 * AI Context & LLM Prompt Renderer
 * Formats database schemas into token-optimized Markdown prompts
 * specifically engineered for ingestion by ChatGPT, Gemini, Claude, DeepSeek, and Cursor.
 * Pure Node.js - Zero dependencies.
 */

class AIRenderer {
    static generateAIContext(schemaMap, options = {}) {
        const title = options.title || 'Database Schema Architecture Context';
        const tables = Object.keys(schemaMap);
        const totalCols = tables.reduce((acc, t) => acc + schemaMap[t].columns.length, 0);
        const totalRels = tables.reduce((acc, t) => acc + schemaMap[t].relations.length, 0);

        let out = `# 🤖 ${title}\n\n`;
        out += `> **Metadata**: ${tables.length} Models | ${totalCols} Columns | ${totalRels} Relational Constraints\n`;
        out += `> **Optimized For**: ChatGPT, Google Gemini, Anthropic Claude, Cursor AI, GitHub Copilot\n\n`;
        out += `## 📋 Database Architecture Summary\n`;
        out += `This document contains the complete normalized schema topology, primary keys, data types, and relational foreign key constraints.\n\n`;

        out += `### 🗄️ Relational Dependency Graph\n`;
        let hasRels = false;
        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            table.relations.forEach(rel => {
                hasRels = true;
                const fromField = rel.from || rel.fromColumn;
                const toField = rel.toField || rel.toColumn || 'id';
                const card = rel.cardinality || 'N:1';
                out += `- \`${tableName}.${fromField}\` ➔ \`${rel.toTable}.${toField}\` [Cardinality: ${card}]\n`;
            });
        });
        if (!hasRels) {
            out += `- *No explicit foreign key relationships detected.*\n`;
        }
        out += `\n---\n\n`;

        out += `### 📦 Table Models & Field Definitions\n\n`;

        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            const srcType = (table.sourceType || 'TABLE').toUpperCase();
            out += `#### Table: \`${tableName}\` (${srcType})\n`;

            // List columns with PK/FK annotations
            table.columns.forEach(col => {
                const flags = [];
                if (col.isPrimary) flags.push('PRIMARY KEY');
                const rel = table.relations.find(r => (r.from === col.name || r.fromColumn === col.name));
                const isFk = !!(col.isForeign || rel);
                if (isFk) {
                    const toTable = rel ? rel.toTable : '';
                    const toField = rel ? (rel.toField || rel.toColumn || 'id') : '';
                    flags.push(rel ? `FOREIGN KEY ➔ ${toTable}.${toField}` : 'FOREIGN KEY');
                }
                if (col.isUnique) flags.push('UNIQUE');
                if (!col.isNullable) flags.push('NOT NULL');

                const flagsStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
                out += `- \`${col.name}\`: \`${col.type || 'any'}\`${flagsStr}\n`;
            });

            out += `\n`;
        });

        out += `---\n\n`;
        out += `## 💡 AI System Instructions for Query Generation & Optimization\n`;
        out += `When assisting with this database schema:\n`;
        out += `1. Always respect Primary Keys and Foreign Key dependencies when constructing SQL JOINs or ORM queries.\n`;
        out += `2. Ensure all Foreign Key references point to valid target columns specified above.\n`;
        out += `3. Recommend appropriate indexes for frequently filtered columns and foreign key fields.\n`;
        out += `4. Maintain referential integrity and handle CASCADE rules appropriately.\n`;

        return out;
    }
}

module.exports = AIRenderer;
