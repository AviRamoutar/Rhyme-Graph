import { minimatch } from 'minimatch';
import type { TraceEntry, Node } from './schema.js';

interface ScoredNode {
  nodeId: string;
  score: number;
}

const WINDOW_SIZE = 20;
const MIN_SCORE = 2;
const AGE_DECAY = 0.5;

/**
 * Given recent trace entries and all nodes, compute a presumed-active node
 * based on path overlap with context_files globs.
 *
 * Returns the node ID with highest score >= MIN_SCORE, or null.
 */
export function inferActiveNode(
  recentEntries: TraceEntry[],
  nodes: Node[]
): string | null {
  // Take last WINDOW_SIZE relevant entries
  const relevant = recentEntries
    .filter(e =>
      e.kind === 'tool_call' ||
      e.kind === 'request_context' ||
      e.kind === 'proxy_decision'
    )
    .slice(-WINDOW_SIZE);

  if (relevant.length === 0) return null;

  // Extract paths from each entry
  function getPaths(entry: TraceEntry): string[] {
    switch (entry.kind) {
      case 'tool_call':
        return entry.paths ?? [];
      case 'request_context':
        return entry.matched;
      case 'proxy_decision':
        return [];
      default:
        return [];
    }
  }

  const scored: ScoredNode[] = [];

  for (const node of nodes) {
    const globs = node.frontmatter.context_files ?? [];
    if (globs.length === 0) continue;

    let score = 0;
    for (let i = 0; i < relevant.length; i++) {
      const entry = relevant[i];
      const paths = getPaths(entry);
      const age = relevant.length - 1 - i;

      for (const p of paths) {
        for (const g of globs) {
          if (minimatch(p, g)) {
            score += 1 - age * AGE_DECAY / relevant.length;
            break; // one match per path per node is enough
          }
        }
      }
    }

    if (score > 0) {
      scored.push({ nodeId: node.frontmatter.id, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 0 && scored[0].score >= MIN_SCORE) {
    return scored[0].nodeId;
  }

  return null;
}
