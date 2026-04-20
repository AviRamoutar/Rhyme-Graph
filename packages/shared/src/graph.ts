import { parseManifest, parseNode } from './parser.js';
import type { Manifest, Node, Edge, Subgraph, ProcessGraph } from './schema.js';

export interface FileReader {
  readFile(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  listDirs(path: string): Promise<string[]>;
}

function buildEdges(manifest: Manifest, prefix: string): Edge[] {
  const edges: Edge[] = [];
  for (const mn of manifest.nodes) {
    const sourceId = prefix ? `${prefix}/${mn.id}` : mn.id;
    for (const next of mn.next) {
      const targetId = prefix ? `${prefix}/${next}` : next;
      edges.push({ source: sourceId, target: targetId });
    }
  }
  return edges;
}

function join(...parts: string[]): string {
  return parts.filter(Boolean).join('/');
}

async function loadSubgraph(
  reader: FileReader,
  processRoot: string,
  parentNodeId: string,
  parentPath: string
): Promise<Subgraph | null> {
  const subManifestPath = join(processRoot, parentPath, 'manifest.yaml');
  if (!(await reader.exists(subManifestPath))) return null;

  const subManifestContent = await reader.readFile(subManifestPath);
  const subManifest = parseManifest(subManifestContent);

  const nodes: Node[] = [];
  for (const mn of subManifest.nodes) {
    const nodePath = join(parentPath, mn.id, 'node.md');
    const fullPath = join(processRoot, nodePath);
    if (await reader.exists(fullPath)) {
      const content = await reader.readFile(fullPath);
      nodes.push(parseNode(content, nodePath, parentPath));
    }
  }

  const edges = buildEdges(subManifest, parentNodeId);
  return { parentNodeId, manifest: subManifest, nodes, edges };
}

/**
 * Load a full process graph from a process/ directory.
 * reader abstracts file system access so this works in Node and browser.
 */
export async function loadGraph(
  processRoot: string,
  reader: FileReader
): Promise<ProcessGraph> {
  const manifestPath = join(processRoot, 'manifest.yaml');
  const manifestContent = await reader.readFile(manifestPath);
  const manifest = parseManifest(manifestContent);

  const nodes: Node[] = [];
  const subgraphs: Subgraph[] = [];

  for (const mn of manifest.nodes) {
    const nodeMdPath = join(mn.id, 'node.md');
    const fullNodePath = join(processRoot, nodeMdPath);

    if (await reader.exists(fullNodePath)) {
      const content = await reader.readFile(fullNodePath);
      nodes.push(parseNode(content, nodeMdPath));
    }

    // Check for subgraph
    const sub = await loadSubgraph(reader, processRoot, mn.id, mn.id);
    if (sub) {
      subgraphs.push(sub);
    }
  }

  const edges = buildEdges(manifest, '');

  return { manifest, nodes, edges, subgraphs };
}
