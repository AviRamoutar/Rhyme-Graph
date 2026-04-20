#!/usr/bin/env node
import { resolve } from 'path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const args = process.argv.slice(2);
let root = process.cwd();

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root' && args[i + 1]) {
    root = resolve(args[i + 1]);
    i++;
  }
}

async function main() {
  const server = await createServer(root);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Failed to start processgraph MCP server:', err);
  process.exit(1);
});
