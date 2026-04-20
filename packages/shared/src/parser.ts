import matter from 'gray-matter';
import yaml from 'js-yaml';
import { ManifestSchema, NodeFrontmatterSchema } from './schema.js';
import type { Manifest, Node } from './schema.js';

/**
 * Parse a manifest.yaml string into a validated Manifest.
 */
export function parseManifest(content: string): Manifest {
  const raw = yaml.load(content);
  return ManifestSchema.parse(raw);
}

/**
 * Parse a node markdown file into a Node object.
 * filePath is the relative path from the process root.
 * parentPath is the parent node's path if this is inside a subgraph.
 */
export function parseNode(
  content: string,
  filePath: string,
  parentPath: string | null = null
): Node {
  const { data, content: body } = matter(content);
  const frontmatter = NodeFrontmatterSchema.parse(data);
  return { frontmatter, body: body.trim(), filePath, parentPath };
}

/**
 * Parse a manifest.yaml from raw YAML without zod validation (for browser use).
 */
export function parseManifestRaw(content: string): unknown {
  return yaml.load(content);
}
