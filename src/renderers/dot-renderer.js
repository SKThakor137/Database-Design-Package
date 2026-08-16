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
                const pkLabel = col.isPrimary ? ' <b>[PK]</b>' : col.isForeign ? ' <i>[FK]</i>' : '';
                dot += `      <tr><td align="left" port="${col.name}"><font color="#cdd6f4">${col.name}${pkLabel}</font></td><td align="right"><font color="#9399b2">${col.type}</font></td></tr>\n`;
            });

            dot += `    </table>\n  >];\n\n`;
        });

        // Edges
        tables.forEach(tableName => {
            const table = schemaMap[tableName];
            table.relations.forEach(rel => {
                dot += `  "${tableName}":"${rel.from}" -> "${rel.toTable}":"${rel.toField}";\n`;
            });
        });

        dot += `}\n`;
        return dot;
    }
}

module.exports = DOTRenderer;
