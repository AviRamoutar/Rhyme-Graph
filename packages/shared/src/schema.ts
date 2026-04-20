import { z } from 'zod';

// ── Manifest ──
export const ManifestNodeSchema = z.object({
  id: z.string(),
  next: z.array(z.string()).default([]),
});

export const ManifestSchema = z.object({
  name: z.string(),
  entry: z.string(),
  nodes: z.array(ManifestNodeSchema),
});

export type ManifestNode = z.infer<typeof ManifestNodeSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;

// ── Node Frontmatter ──
export const NodeFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string(),
  preconditions: z.array(z.string()).optional(),
  context_files: z.array(z.string()).optional(),
  tools_required: z.array(z.string()).optional(),
  success_criteria: z.string().optional(),
});

export type NodeFrontmatter = z.infer<typeof NodeFrontmatterSchema>;

// ── Node ──
export interface Node {
  frontmatter: NodeFrontmatter;
  body: string;
  filePath: string;
  parentPath: string | null;
}

// ── Trace Entry ──
export const TraceEntrySchema = z.discriminatedUnion('kind', [
  z.object({
    ts: z.string(),
    kind: z.literal('set_active_node'),
    node: z.string(),
    previous: z.string().nullable(),
  }),
  z.object({
    ts: z.string(),
    kind: z.literal('request_context'),
    glob: z.string(),
    matched: z.array(z.string()),
    totalBytes: z.number(),
  }),
  z.object({
    ts: z.string(),
    kind: z.literal('flag_blocked'),
    reason: z.string(),
    suggested_info: z.string().optional(),
  }),
  z.object({
    ts: z.string(),
    kind: z.literal('complete_node'),
    node: z.string(),
    summary: z.string(),
    next_options: z.array(z.object({ id: z.string(), title: z.string(), path: z.string() })),
  }),
  z.object({
    ts: z.string(),
    kind: z.literal('log_observation'),
    text: z.string(),
  }),
  z.object({
    ts: z.string(),
    kind: z.literal('tool_call'),
    tool: z.string(),
    paths: z.array(z.string()).optional(),
  }),
  z.object({
    ts: z.string(),
    kind: z.literal('proxy_decision'),
    tool: z.string(),
    allowed: z.boolean(),
    activeNode: z.string().nullable(),
    reason: z.string().optional(),
  }),
]);

export type TraceEntry = z.infer<typeof TraceEntrySchema>;

// ── Graphrc ──
export const GraphrcSchema = z.object({
  stuck_threshold_minutes: z.number().default(5),
  ghost_trail_default: z.boolean().default(false),
  enforcement: z.enum(['off', 'warn', 'block']).default('warn'),
  ignore_tools: z.array(z.string()).default([]),
});

export type Graphrc = z.infer<typeof GraphrcSchema>;

// ── Edge (derived) ──
export interface Edge {
  source: string;
  target: string;
}

// ── Subgraph ──
export interface Subgraph {
  parentNodeId: string;
  manifest: Manifest;
  nodes: Node[];
  edges: Edge[];
}

// ── Full graph ──
export interface ProcessGraph {
  manifest: Manifest;
  nodes: Node[];
  edges: Edge[];
  subgraphs: Subgraph[];
}
