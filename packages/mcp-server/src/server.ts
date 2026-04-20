import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadGraph, type FileReader } from '@processgraph/shared';
import type { ProcessGraph } from '@processgraph/shared';
import { StateManager } from './state.js';
import { TraceWriter } from './trace.js';
import { setActiveNode } from './tools/setActiveNode.js';
import { listNodes } from './tools/listNodes.js';
import { getNode } from './tools/getNode.js';
import { requestContext } from './tools/requestContext.js';
import { flagBlocked } from './tools/flagBlocked.js';
import { completeNode } from './tools/completeNode.js';
import { logObservation } from './tools/logObservation.js';

const nodeFileReader: FileReader = {
  async readFile(path: string) {
    return readFileSync(path, 'utf-8');
  },
  async exists(path: string) {
    return existsSync(path);
  },
  async listDirs(_path: string) {
    return [];
  },
};

export async function createServer(root: string) {
  const processRoot = join(root, 'process');
  let graph: ProcessGraph = await loadGraph(processRoot, nodeFileReader);

  const state = new StateManager(root);
  const trace = new TraceWriter(root);

  const server = new McpServer({
    name: 'processgraph',
    version: '0.1.0',
  });

  async function reloadGraph() {
    try {
      graph = await loadGraph(processRoot, nodeFileReader);
    } catch {
      // keep old graph on parse errors
    }
  }

  server.tool(
    'set_active_node',
    'Set the currently active node in the process graph',
    { node_path: z.string().describe('Path or ID of the node to activate') },
    async ({ node_path }) => {
      const result = setActiveNode(state, trace, node_path);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'list_nodes',
    'List all nodes in the process graph',
    { from: z.string().optional().describe('Filter nodes starting from this ID') },
    async ({ from }) => {
      await reloadGraph();
      const result = listNodes(graph, state, from);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'get_node',
    'Get details of a specific node including resolved context files',
    {
      node_path: z.string().describe('Path or ID of the node'),
      force: z.boolean().optional().describe('Force reload'),
    },
    async ({ node_path, force }) => {
      await reloadGraph();
      const result = await getNode(graph, root, node_path, force);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'request_context',
    'Request file contents matching a glob pattern',
    { glob: z.string().describe('Glob pattern to match files') },
    async ({ glob: pattern }) => {
      const result = await requestContext(root, trace, pattern);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'flag_blocked',
    'Flag that progress is blocked and needs information',
    {
      reason: z.string().describe('Why progress is blocked'),
      suggested_info: z.string().optional().describe('What information might unblock'),
    },
    async ({ reason, suggested_info }) => {
      const result = flagBlocked(trace, reason, suggested_info);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'complete_node',
    'Mark the current active node as complete',
    { summary: z.string().describe('Summary of what was accomplished') },
    async ({ summary }) => {
      await reloadGraph();
      const result = completeNode(graph, state, trace, summary);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'log_observation',
    'Log a free-text observation to the trace',
    { text: z.string().describe('The observation text') },
    async ({ text }) => {
      const result = logObservation(trace, text);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  return server;
}
