import { readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import type { ProcessGraph, NodeFrontmatter } from '@processgraph/shared';

interface ResolvedFile {
  path: string;
  bytes: number;
}

interface GetNodeResult {
  frontmatter: NodeFrontmatter;
  body: string;
  resolved_context_files: ResolvedFile[];
}

export async function getNode(
  graph: ProcessGraph,
  root: string,
  nodePath: string,
  _force?: boolean
): Promise<GetNodeResult | { error: string }> {
  // Find the node
  const allNodes = [
    ...graph.nodes,
    ...graph.subgraphs.flatMap(s => s.nodes),
  ];

  const node = allNodes.find(n => n.filePath === nodePath || n.frontmatter.id === nodePath);
  if (!node) {
    // Try with subgraph prefix matching
    const byPath = allNodes.find(n => {
      const fullId = n.parentPath
        ? `${n.parentPath}/${n.frontmatter.id}`
        : n.frontmatter.id;
      return fullId === nodePath;
    });
    if (!byPath) {
      return { error: `Node not found: ${nodePath}` };
    }
    return resolveNode(byPath, root);
  }

  return resolveNode(node, root);
}

async function resolveNode(
  node: { frontmatter: NodeFrontmatter; body: string },
  root: string
): Promise<GetNodeResult> {
  const resolved: ResolvedFile[] = [];

  if (node.frontmatter.context_files) {
    for (const pattern of node.frontmatter.context_files) {
      try {
        const matches = await glob(pattern, { cwd: root, nodir: true });
        for (const m of matches) {
          const fullPath = join(root, m);
          if (existsSync(fullPath)) {
            const stats = statSync(fullPath);
            resolved.push({ path: m, bytes: stats.size });
          }
        }
      } catch {
        // skip invalid globs
      }
    }
  }

  return {
    frontmatter: node.frontmatter,
    body: node.body,
    resolved_context_files: resolved,
  };
}
