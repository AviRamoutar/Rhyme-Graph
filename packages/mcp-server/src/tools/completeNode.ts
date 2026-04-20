import type { ProcessGraph } from '@processgraph/shared';
import type { StateManager } from '../state.js';
import type { TraceWriter } from '../trace.js';

interface NextOption {
  id: string;
  title: string;
  path: string;
}

export function completeNode(
  graph: ProcessGraph,
  state: StateManager,
  trace: TraceWriter,
  summary: string
): { next_options: NextOption[] } | { error: string } {
  const activeNode = state.getActiveNode();
  if (!activeNode) {
    return { error: 'No active node to complete' };
  }

  // Find the manifest node to get next edges
  let nextIds: string[] = [];

  // Check root manifest
  const rootMn = graph.manifest.nodes.find(n => n.id === activeNode);
  if (rootMn) {
    nextIds = rootMn.next;
  } else {
    // Check subgraphs
    for (const sub of graph.subgraphs) {
      const subMn = sub.manifest.nodes.find(
        n => `${sub.parentNodeId}/${n.id}` === activeNode || n.id === activeNode
      );
      if (subMn) {
        nextIds = subMn.next.map(id =>
          activeNode.includes('/') ? `${sub.parentNodeId}/${id}` : id
        );
        break;
      }
    }
  }

  // Resolve next options
  const allNodes = [
    ...graph.nodes,
    ...graph.subgraphs.flatMap(s =>
      s.nodes.map(n => ({
        ...n,
        fullId: `${s.parentNodeId}/${n.frontmatter.id}`,
      }))
    ),
  ];

  const nextOptions: NextOption[] = nextIds.map(id => {
    const node = allNodes.find(
      (n: any) => n.frontmatter.id === id || n.fullId === id
    );
    return {
      id,
      title: node?.frontmatter.title ?? id,
      path: node?.filePath ?? `${id}/node.md`,
    };
  });

  state.completeNode(activeNode);

  trace.append({
    ts: new Date().toISOString(),
    kind: 'complete_node',
    node: activeNode,
    summary,
    next_options: nextOptions,
  });

  return { next_options: nextOptions };
}
