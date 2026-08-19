#!/usr/bin/env node

/**
 * SchemaGraph Model Context Protocol (MCP) Executable
 * Run with: npx schemagraph-mcp
 */

const MCPServer = require('../src/mcp/mcp-server');

const server = new MCPServer();
server.start();
