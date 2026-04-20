import type { ProcessGraph, Manifest, Node, Subgraph } from './schema.js';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function collectAllNodeIds(graph: ProcessGraph): Set<string> {
  const ids = new Set<string>();
  for (const mn of graph.manifest.nodes) {
    ids.add(mn.id);
  }
  for (const sub of graph.subgraphs) {
    for (const mn of sub.manifest.nodes) {
      ids.add(`${sub.parentNodeId}/${mn.id}`);
    }
  }
  return ids;
}

function validateManifestEntry(manifest: Manifest, prefix: string, result: ValidationResult) {
  const nodeIds = new Set(manifest.nodes.map(n => n.id));
  if (!nodeIds.has(manifest.entry)) {
    result.errors.push(
      `${prefix}manifest.entry "${manifest.entry}" not found in nodes`
    );
  }
}

function validateDanglingEdges(manifest: Manifest, prefix: string, result: ValidationResult) {
  const nodeIds = new Set(manifest.nodes.map(n => n.id));
  for (const mn of manifest.nodes) {
    for (const next of mn.next) {
      if (!nodeIds.has(next)) {
        result.errors.push(
          `${prefix}node "${mn.id}" has edge to non-existent node "${next}"`
        );
      }
    }
  }
}

function validateFilenameIdMismatch(nodes: Node[], result: ValidationResult) {
  for (const node of nodes) {
    const parts = node.filePath.split('/');
    // The directory name is the second-to-last part (e.g., "understand" in "understand/node.md")
    const dirName = parts[parts.length - 2];
    if (dirName && dirName !== node.frontmatter.id) {
      result.warnings.push(
        `Node file "${node.filePath}" directory "${dirName}" does not match frontmatter id "${node.frontmatter.id}"`
      );
    }
  }
}

function validateNoInboundEdges(manifest: Manifest, prefix: string, result: ValidationResult) {
  const targets = new Set<string>();
  for (const mn of manifest.nodes) {
    for (const next of mn.next) {
      targets.add(next);
    }
  }
  for (const mn of manifest.nodes) {
    if (mn.id !== manifest.entry && !targets.has(mn.id)) {
      result.warnings.push(
        `${prefix}node "${mn.id}" has no inbound edges and is not the entry node`
      );
    }
  }
}

function validateTerminalNodes(manifest: Manifest, prefix: string, result: ValidationResult) {
  for (const mn of manifest.nodes) {
    if (mn.next.length === 0) {
      result.warnings.push(`${prefix}node "${mn.id}" is terminal (no outbound edges)`);
    }
  }
}

function validateToolsMismatch(graph: ProcessGraph, result: ValidationResult) {
  for (const sub of graph.subgraphs) {
    const parentNode = graph.nodes.find(n => n.frontmatter.id === sub.parentNodeId);
    if (!parentNode || !parentNode.frontmatter.tools_required) continue;

    const parentTools = new Set(parentNode.frontmatter.tools_required);
    const childToolsUnion = new Set<string>();
    for (const child of sub.nodes) {
      if (child.frontmatter.tools_required) {
        for (const t of child.frontmatter.tools_required) {
          childToolsUnion.add(t);
        }
      }
    }

    for (const pt of parentTools) {
      if (!childToolsUnion.has(pt)) {
        result.warnings.push(
          `Parent node "${sub.parentNodeId}" requires tool "${pt}" not found in any child node`
        );
      }
    }
  }
}

function validateSubgraphIdCollision(graph: ProcessGraph, result: ValidationResult) {
  const rootIds = new Set(graph.manifest.nodes.map(n => n.id));
  for (const sub of graph.subgraphs) {
    for (const mn of sub.manifest.nodes) {
      if (rootIds.has(mn.id)) {
        result.warnings.push(
          `Subgraph node id "${mn.id}" in "${sub.parentNodeId}" collides with root-level node id`
        );
      }
    }
  }
}

/**
 * Context file validation requires a file system checker.
 * Returns globs that match zero files.
 */
export interface GlobChecker {
  matchGlob(pattern: string): Promise<string[]>;
}

export async function validateContextFiles(
  nodes: Node[],
  checker: GlobChecker,
  result: ValidationResult
): Promise<void> {
  for (const node of nodes) {
    if (!node.frontmatter.context_files) continue;
    for (const pattern of node.frontmatter.context_files) {
      const matches = await checker.matchGlob(pattern);
      if (matches.length === 0) {
        result.warnings.push(
          `Node "${node.frontmatter.id}" context_files pattern "${pattern}" matches zero files`
        );
      }
    }
  }
}

export function validateGraph(graph: ProcessGraph): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };

  // Root manifest
  validateManifestEntry(graph.manifest, '', result);
  validateDanglingEdges(graph.manifest, '', result);
  validateNoInboundEdges(graph.manifest, '', result);
  validateTerminalNodes(graph.manifest, '', result);

  // Subgraph manifests
  for (const sub of graph.subgraphs) {
    const prefix = `subgraph "${sub.parentNodeId}": `;
    validateManifestEntry(sub.manifest, prefix, result);
    validateDanglingEdges(sub.manifest, prefix, result);
    validateNoInboundEdges(sub.manifest, prefix, result);
    validateTerminalNodes(sub.manifest, prefix, result);
  }

  // All nodes
  const allNodes = [...graph.nodes, ...graph.subgraphs.flatMap(s => s.nodes)];
  validateFilenameIdMismatch(allNodes, result);
  validateToolsMismatch(graph, result);
  validateSubgraphIdCollision(graph, result);

  return result;
}
