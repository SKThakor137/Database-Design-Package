const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const MCPServer = require('../src/mcp/mcp-server');

test('MCPServer initializes and responds to JSON-RPC tools/list', () => {
    const server = new MCPServer();
    let outputData = '';

    // Mock stdout
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
        outputData += chunk;
        return true;
    };

    try {
        server.handleRequest({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {}
        });

        const initResp = JSON.parse(outputData.trim());
        assert.strictEqual(initResp.result.serverInfo.name, 'schemagraph-mcp-server');

        outputData = '';
        server.handleRequest({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
        });

        const toolsResp = JSON.parse(outputData.trim());
        assert.ok(Array.isArray(toolsResp.result.tools));
        assert.strictEqual(toolsResp.result.tools.length, 3);
        assert.ok(toolsResp.result.tools.some(t => t.name === 'schemagraph_scan_schema'));
        assert.ok(toolsResp.result.tools.some(t => t.name === 'schemagraph_generate_diagram'));
        assert.ok(toolsResp.result.tools.some(t => t.name === 'schemagraph_table_details'));

        outputData = '';
        server.handleRequest({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
                name: 'schemagraph_scan_schema',
                arguments: {
                    targetPath: path.resolve(__dirname, '../examples')
                }
            }
        });

        const callResp = JSON.parse(outputData.trim());
        assert.ok(callResp.result.content[0].text.includes('Found'));
    } finally {
        process.stdout.write = originalStdoutWrite;
    }
});
