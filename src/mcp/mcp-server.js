/**
 * SchemaGraph Model Context Protocol (MCP) Server
 * Exposes SchemaGraph tools to Antigravity, Cursor, Claude Desktop, and other AI coding assistants.
 * Pure Node.js - Zero dependencies.
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');

const {
    parseProject,
    generateSVG,
    generateHTML,
    generateMarkdown,
    generateJSON,
    generateDBML,
    generateDOT,
    generateSQL,
    generateAIContext
} = require('../index');

const TOOLS = [
    {
        name: 'schemagraph_scan_schema',
        description: 'Scans a project workspace and discovers all database models, columns (PK/FK), and relational dependencies across any framework (Laravel, Django, Rails, Go GORM, Spring JPA, Prisma, Mongoose, Sequelize, TypeORM, GraphQL, SQL).',
        inputSchema: {
            type: 'object',
            properties: {
                targetPath: {
                    type: 'string',
                    description: 'Path to directory or schema file to scan. Defaults to current working directory.'
                }
            }
        }
    },
    {
        name: 'schemagraph_generate_diagram',
        description: 'Generates database visual diagrams (Interactive HTML, SVG), documentation (Mermaid Markdown, DBML), SQL DDL, or AI prompt context.',
        inputSchema: {
            type: 'object',
            properties: {
                targetPath: {
                    type: 'string',
                    description: 'Path to directory or schema file to scan.'
                },
                format: {
                    type: 'string',
                    enum: ['html', 'svg', 'md', 'dbml', 'sql', 'json', 'dot', 'ai', 'all'],
                    description: 'Export format to generate.'
                },
                outputPath: {
                    type: 'string',
                    description: 'Optional directory path where generated files should be saved.'
                },
                theme: {
                    type: 'string',
                    enum: ['catppuccin', 'dark', 'light'],
                    description: 'Visual theme for SVG/HTML.'
                }
            },
            required: ['format']
        }
    },
    {
        name: 'schemagraph_table_details',
        description: 'Retrieves complete column definitions, constraints, and incoming/outgoing foreign key relationships for a specific database table.',
        inputSchema: {
            type: 'object',
            properties: {
                targetPath: {
                    type: 'string',
                    description: 'Path to directory or schema file to scan.'
                },
                tableName: {
                    type: 'string',
                    description: 'Name of the table or model to inspect.'
                }
            },
            required: ['tableName']
        }
    }
];

class MCPServer {
    constructor() {
        this.rl = null;
    }

    start() {
        if (!this.rl) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: false
            });
        }
        this.rl.on('line', (line) => {
            if (!line.trim()) return;
            try {
                const request = JSON.parse(line);
                this.handleRequest(request);
            } catch (err) {
                this.sendError(null, -32700, 'Parse error: Invalid JSON');
            }
        });
    }

    close() {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
    }

    handleRequest(req) {
        const { id, method, params } = req;

        switch (method) {
            case 'initialize':
                this.sendResponse(id, {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {}
                    },
                    serverInfo: {
                        name: 'schemagraph-mcp-server',
                        version: '1.4.2'
                    }
                });
                break;

            case 'notifications/initialized':
                // Client confirmed initialization
                break;

            case 'ping':
                this.sendResponse(id, {});
                break;

            case 'tools/list':
                this.sendResponse(id, { tools: TOOLS });
                break;

            case 'tools/call':
                this.handleToolCall(id, params);
                break;

            default:
                if (id !== undefined) {
                    this.sendError(id, -32601, `Method not found: ${method}`);
                }
                break;
        }
    }

    handleToolCall(id, params) {
        if (!params || !params.name) {
            this.sendError(id, -32602, 'Invalid params: Missing tool name');
            return;
        }

        const args = params.arguments || {};
        const targetPath = path.resolve(args.targetPath || process.cwd());

        try {
            switch (params.name) {
                case 'schemagraph_scan_schema': {
                    const schemaMap = parseProject(targetPath);
                    const tables = Object.keys(schemaMap);
                    const totalCols = tables.reduce((acc, t) => acc + schemaMap[t].columns.length, 0);
                    const totalRels = tables.reduce((acc, t) => acc + schemaMap[t].relations.length, 0);

                    const result = {
                        summary: `Found ${tables.length} models, ${totalCols} columns, and ${totalRels} relationships.`,
                        tables: tables,
                        schema: schemaMap
                    };

                    this.sendResponse(id, {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                    });
                    break;
                }

                case 'schemagraph_generate_diagram': {
                    const schemaMap = parseProject(targetPath);
                    const format = args.format;
                    const theme = args.theme || 'catppuccin';
                    const outputPath = args.outputPath ? path.resolve(args.outputPath) : null;
                    const title = `${path.basename(targetPath)} Schema Topology`;

                    let outputText = '';

                    switch (format) {
                        case 'html':
                            outputText = generateHTML(schemaMap, { title, theme });
                            break;
                        case 'svg':
                            outputText = generateSVG(schemaMap, { title, theme });
                            break;
                        case 'md':
                            outputText = generateMarkdown(schemaMap, { title });
                            break;
                        case 'dbml':
                            outputText = generateDBML(schemaMap, { title });
                            break;
                        case 'sql':
                            outputText = generateSQL(schemaMap, { title });
                            break;
                        case 'json':
                            outputText = generateJSON(schemaMap);
                            break;
                        case 'dot':
                            outputText = generateDOT(schemaMap, { title });
                            break;
                        case 'ai':
                            outputText = generateAIContext(schemaMap, { title });
                            break;
                        case 'all':
                            if (outputPath) {
                                if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
                                fs.writeFileSync(path.join(outputPath, 'database-design.html'), generateHTML(schemaMap, { title, theme }));
                                fs.writeFileSync(path.join(outputPath, 'database-design.svg'), generateSVG(schemaMap, { title, theme }));
                                fs.writeFileSync(path.join(outputPath, 'database-design.dbml'), generateDBML(schemaMap, { title }));
                                fs.writeFileSync(path.join(outputPath, 'database-design.sql'), generateSQL(schemaMap, { title }));
                                fs.writeFileSync(path.join(outputPath, 'database-design.md'), generateMarkdown(schemaMap, { title }));
                                fs.writeFileSync(path.join(outputPath, 'database-design.json'), generateJSON(schemaMap));
                                fs.writeFileSync(path.join(outputPath, 'database-design.dot'), generateDOT(schemaMap, { title }));
                                fs.writeFileSync(path.join(outputPath, 'database-schema-ai-prompt.md'), generateAIContext(schemaMap, { title }));
                                outputText = `Successfully generated all 8 schema formats in: ${outputPath}`;
                            } else {
                                outputText = `Generated all formats for ${Object.keys(schemaMap).length} tables. Please specify outputPath to save files.`;
                            }
                            break;
                    }

                    if (outputPath && format !== 'all') {
                        if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
                        const fileName = `database-design.${format === 'ai' ? 'md' : format}`;
                        fs.writeFileSync(path.join(outputPath, fileName), outputText);
                        outputText = `Saved ${format.toUpperCase()} to: ${path.join(outputPath, fileName)}`;
                    }

                    this.sendResponse(id, {
                        content: [{ type: 'text', text: outputText }]
                    });
                    break;
                }

                case 'schemagraph_table_details': {
                    const schemaMap = parseProject(targetPath);
                    const tableName = args.tableName;
                    const table = schemaMap[tableName];

                    if (!table) {
                        this.sendResponse(id, {
                            content: [{ type: 'text', text: `Table '${tableName}' not found in scanned models.` }]
                        });
                        return;
                    }

                    // Find incoming relationships from other tables
                    const incoming = [];
                    Object.keys(schemaMap).forEach(otherName => {
                        if (otherName === tableName) return;
                        schemaMap[otherName].relations.forEach(r => {
                            if (r.toTable === tableName) {
                                incoming.push({
                                    fromTable: otherName,
                                    fromColumn: r.from || r.fromColumn,
                                    toColumn: r.toField || r.toColumn || 'id',
                                    cardinality: r.cardinality || 'N:1'
                                });
                            }
                        });
                    });

                    const details = {
                        table: tableName,
                        sourceType: table.sourceType || 'TABLE',
                        columns: table.columns,
                        outgoingRelations: table.relations,
                        incomingRelations: incoming
                    };

                    this.sendResponse(id, {
                        content: [{ type: 'text', text: JSON.stringify(details, null, 2) }]
                    });
                    break;
                }

                default:
                    this.sendError(id, -32601, `Unknown tool: ${params.name}`);
                    break;
            }
        } catch (err) {
            this.sendError(id, -32000, `SchemaGraph Tool Execution Error: ${err.message}`);
        }
    }

    sendResponse(id, result) {
        const response = {
            jsonrpc: '2.0',
            id,
            result
        };
        process.stdout.write(JSON.stringify(response) + '\n');
    }

    sendError(id, code, message) {
        const response = {
            jsonrpc: '2.0',
            id,
            error: {
                code,
                message
            }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
    }
}

module.exports = MCPServer;
