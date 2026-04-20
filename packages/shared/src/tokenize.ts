/**
 * Approximate token count from byte count.
 * Rough heuristic: 1 token ≈ 4 bytes for English text.
 */
export function bytesToTokens(bytes: number): number {
  return Math.ceil(bytes / 4);
}

/**
 * Get context size tier for UI display.
 */
export function contextTier(tokens: number): 'green' | 'yellow' | 'red' {
  if (tokens > 50_000) return 'red';
  if (tokens > 10_000) return 'yellow';
  return 'green';
}
