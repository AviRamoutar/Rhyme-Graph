import yaml from 'js-yaml';
import { GraphrcSchema } from './schema.js';
import type { Graphrc } from './schema.js';

/**
 * Parse a single .graphrc file (YAML) into a partial Graphrc.
 */
export function parseGraphrc(content: string): Partial<Graphrc> {
  const raw = yaml.load(content);
  if (!raw || typeof raw !== 'object') return {};
  return raw as Partial<Graphrc>;
}

/**
 * Merge cascading overrides: user global (~/.graphrc), project (process/.graphrc),
 * personal (.graphrc). Last-writer-wins per key: personal > project > user.
 */
export function mergeGraphrc(...layers: Partial<Graphrc>[]): Graphrc {
  const merged: Record<string, unknown> = {};
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  return GraphrcSchema.parse(merged);
}

export interface GraphrcReader {
  readFile(path: string): Promise<string | null>;
}

/**
 * Load and merge .graphrc files from the three cascade locations.
 */
export async function loadGraphrc(
  homePath: string,
  projectPath: string,
  personalPath: string,
  reader: GraphrcReader
): Promise<Graphrc> {
  const layers: Partial<Graphrc>[] = [];

  for (const path of [homePath, projectPath, personalPath]) {
    const content = await reader.readFile(path);
    if (content) {
      layers.push(parseGraphrc(content));
    }
  }

  return mergeGraphrc(...layers);
}
