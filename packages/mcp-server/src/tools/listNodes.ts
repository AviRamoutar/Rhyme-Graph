import type { ProcessGraph } from '@processgraph/shared';
import type { StateManager } from '../state.js';

interface ListedNode {
  id: string;
  title: string;
  path: string;
  reachable: boolean;
}

function getReachable(graph: ProcessGraph): Set<string> {
  const reachable = new Set<string>();
  const queue = [graph.manifest.entry];
  const nodeMap = new Map(graph.manifest.nodes.map(n => [n.id, n]));

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const mn = nodeMap.get(id);
    if (mn) {
      for (const next of mn.next) queue.push(next);
    }
  }

  // Also traverse subgraphs
  for (const sub of graph.subgraphs) {
    const subQueue = [sub.manifest.entry];
    const subMap = new Map(sub.manifest.nodes.map(n => [n.id, n]));
    while (subQueue.length > 0) {
      const id = subQueue.shift()!;
      const fullId = `${sub.parentNodeId}/${id}`;
      if (reachable.has(fullId)) continue;
      reachable.add(fullId);
      const mn = subMap.get(id);
      if (mn) {
        for (const next of mn.next) subQueue.push(next);
      }
    }
  }

  return reachable;
}

export function listNodes(
  graph: ProcessGraph,
  state: StateManager,
  from?: string
): { nodes: ListedNode[]; current: string | null } {
  const reachable = getReachable(graph);
  const result: ListedNode[] = [];

  // Root-level nodes
  for (const node of graph.nodes) {
    if (from && node.frontmatter.id !== from) continue;
    result.push({
      id: node.frontmatter.id,
      title: node.frontmatter.title,
      path: node.filePath,
      reachable: reachable.has(node.frontmatter.id),
    });
  }

  // Subgraph nodes
  for (const sub of graph.subgraphs) {
    for (const node of sub.nodes) {
      const fullId = `${sub.parentNodeId}/${node.frontmatter.id}`;
      if (from && !fullId.startsWith(from)) continue;
      result.push({
        id: fullId,
        title: node.frontmatter.title,
        path: node.filePath,
        reachable: reachable.has(fullId),
      });
    }
  }

  return { nodes: result, current: state.getActiveNode() };
}
