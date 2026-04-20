import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';
import { loadGraphrc, type Graphrc, GraphrcSchema } from '@processgraph/shared';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { checkGate } from './gate.js';
import { AuditLogger } from './audit.js';

interface UpstreamTool {
  name: string;
  description?: string;
  inputSchema?: any;
  clientIndex: number;
}

export async function createProxy(root: string, upstreamCmds: string[]) {
  // Load graphrc
  const graphrcReader = {
    async readFile(path: string): Promise<string | null> {
      try { return readFileSync(path, 'utf-8'); } catch { return null; }
    },
  };

  let graphrc = await loadGraphrc(
    join(homedir(), '.graphrc'),
    join(root, 'process', '.graphrc'),
    join(root, '.graphrc'),
    graphrcReader
  );

  const audit = new AuditLogger(root);

  // Spawn upstream MCP clients
  const clients: Client[] = [];
  const allTools: UpstreamTool[] = [];

  for (let i = 0; i < upstreamCmds.length; i++) {
    const parts = upstreamCmds[i].split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    const transport = new StdioClientTransport({ command, args });
    const client = new Client({ name: `proxy-client-${i}`, version: '0.1.0' });
    await client.connect(transport);
    clients.push(client);

    // List tools from upstream
    const toolList = await client.listTools();
    for (const tool of toolList.tools) {
      allTools.push({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        clientIndex: i,
      });
    }
  }

  // Create proxy server
  const server = new McpServer({
    name: 'processgraph-proxy',
    version: '0.1.0',
  });

  // Register each upstream tool
  for (const tool of allTools) {
    server.tool(
      tool.name,
      tool.description ?? '',
      // Accept any arguments
      {},
      async (args: any) => {
        const gateResult = await checkGate(root, tool.name, graphrc);
        audit.log({
          tool: tool.name,
          allowed: gateResult.allowed,
          activeNode: gateResult.activeNode,
          reason: gateResult.reason,
        });

        if (!gateResult.allowed) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ error: gateResult.reason }),
            }],
            isError: true,
          };
        }

        // Forward to upstream
        const client = clients[tool.clientIndex];
        const result = await client.callTool({ name: tool.name, arguments: args });
        return result as any;
      }
    );
  }

  return { server, clients };
}
