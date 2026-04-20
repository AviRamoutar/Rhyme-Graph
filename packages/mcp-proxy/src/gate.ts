import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadGraph, type FileReader, type Graphrc } from '@processgraph/shared';

const nodeFileReader: FileReader = {
  async readFile(path: string) { return readFileSync(path, 'utf-8'); },
  async exists(path: string) { return existsSync(path); },
  async listDirs() { return []; },
};

interface GateResult {
  allowed: boolean;
  reason?: string;
  activeNode: string | null;
}

export async function checkGate(
  root: string,
  toolName: string,
  graphrc: Graphrc
): Promise<GateResult> {
  // Read active node from state
  const stateFile = join(root, '.process', '.state.json');
  let activeNode: string | null = null;

  if (existsSync(stateFile)) {
    try {
      const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
      activeNode = state.activeNode ?? null;
    } catch {
      // no state
    }
  }

  // If enforcement is off, always allow
  if (graphrc.enforcement === 'off') {
    return { allowed: true, activeNode };
  }

  // If tool is in ignore list, always allow
  if (graphrc.ignore_tools.includes(toolName)) {
    return { allowed: true, activeNode };
  }

  // If no active node, allow (can't enforce without context)
  if (!activeNode) {
    return { allowed: true, activeNode, reason: 'no active node set' };
  }

  // Load graph and find the node's tools_required
  try {
    const processRoot = join(root, 'process');
    const graph = await loadGraph(processRoot, nodeFileReader);
    const allNodes = [
      ...graph.nodes,
      ...graph.subgraphs.flatMap(s => s.nodes),
    ];

    const node = allNodes.find(n => {
      const fullId = n.parentPath
        ? `${n.parentPath}/${n.frontmatter.id}`
        : n.frontmatter.id;
      return fullId === activeNode || n.frontmatter.id === activeNode;
    });

    if (!node || !node.frontmatter.tools_required) {
      return { allowed: true, activeNode, reason: 'node has no tools_required' };
    }

    const allowed = node.frontmatter.tools_required.includes(toolName);
    if (!allowed && graphrc.enforcement === 'block') {
      return {
        allowed: false,
        activeNode,
        reason: `tool "${toolName}" not in tools_required for node "${activeNode}"`,
      };
    }

    // warn mode: allow but flag
    return {
      allowed: true,
      activeNode,
      reason: allowed ? undefined : `tool "${toolName}" not in tools_required for node "${activeNode}" (warn mode)`,
    };
  } catch {
    return { allowed: true, activeNode, reason: 'could not load graph for enforcement' };
  }
}
