#!/usr/bin/env node
import { resolve } from 'path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createProxy } from './proxy.js';

const args = process.argv.slice(2);
let root = process.cwd();
const upstreamCmds: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root' && args[i + 1]) {
    root = resolve(args[i + 1]);
    i++;
  } else if (args[i] === '--upstream' && args[i + 1]) {
    upstreamCmds.push(args[i + 1]);
    i++;
  }
}

if (upstreamCmds.length === 0) {
  console.error('Error: at least one --upstream "<cmd> <args>..." is required');
  process.exit(1);
}

async function main() {
  const { server } = await createProxy(root, upstreamCmds);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Failed to start processgraph proxy:', err);
  process.exit(1);
});
