/**
 * Graphviz DOT Renderer
 * Generates standard DOT graphs with HTML-like record tables for Graphviz visualization.
 * Pure Node.js - Zero dependencies.
 */

class DOTRenderer {
    static generateDOT(schemaMap, options = {}) {
        const title = options.title || 'Database Schema';
        const tables = Object.keys(schemaMap);

        let dot = `digraph DatabaseSchema {\n`;
        dot += `  graph [rankdir=LR, pad="0.5", nodesep="0.6", ranksep="1.0", fontname="Helvetica", bgcolor="#181825"];\n`;
        dot += `  node [shape=none, fontname="Helvetica", fontsize=11, color="#313244"];\n`;
        dot += `  edge [color="#f38ba8", penwidth=1.5, arrowsize=0.8, style=dashed];\n\n`;

        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            dot += `  "${tableName}" [label=<\n`;
            dot += `    <table border="1" cellborder="0" cellspacing="0" cellpadding="5" bgcolor="#1e1e2e" style="rounded">\n`;
            dot += `      <tr><td bgcolor="#89b4fa" align="center" colspan="2"><font color="#11111b"><b>${tableName}</b></font></td></tr>\n`;

            table.columns.forEach(col => {
                const isFk = !!(col.isForeign || table.relations.some(r => (r.from || r.fromColumn) === col.name));
                let pkLabel = '';
                if (col.isPrimary && isFk) pkLabel = ' <b>[PK]</b> <i>[FK]</i>';
                else if (col.isPrimary) pkLabel = ' <b>[PK]</b>';
                else if (isFk) pkLabel = ' <i>[FK]</i>';
                dot += `      <tr><td align="left" port="${col.name}"><font color="#cdd6f4">${col.name}${pkLabel}</font></td><td align="right"><font color="#9399b2">${col.type}</font></td></tr>\n`;
            });

            dot += `    </table>\n  >];\n\n`;
        });

        // Edges
        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            table.relations.forEach(rel => {
                const fromField = rel.from || rel.fromColumn;
                const toField = rel.toField || rel.toColumn || 'id';
                dot += `  "${tableName}":"${fromField}" -> "${rel.toTable}":"${toField}";\n`;
            });
        });

        dot += `}\n`;
        return dot;
    }
}

module.exports = DOTRenderer;
