/**
 * JSON Schema Map Renderer
 * Outputs clean structured JSON representation of the database schema and relations.
 * Pure Node.js - Zero dependencies.
 */

class JSONRenderer {
    static generateJSON(schemaMap, options = {}) {
        const tables = Object.keys(schemaMap);
        const totalColumns = tables.reduce((sum, t) => sum + schemaMap[t].columns.length, 0);
        const totalRelations = tables.reduce((sum, t) => sum + schemaMap[t].relations.length, 0);

        const output = {
            generator: 'schemagraph-core',
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            metadata: {
                title: options.title || 'Database Schema Graph',
                totalTables: tables.length,
                totalColumns,
                totalRelations
            },
            tables: schemaMap
        };

        return JSON.stringify(output, null, 2);
    }
}

module.exports = JSONRenderer;
