import { create } from 'zustand';

interface ManifestNode {
  id: string;
  next: string[];
}

interface Manifest {
  name: string;
  entry: string;
  nodes: ManifestNode[];
}

interface NodeFrontmatter {
  id: string;
  title: string;
  preconditions?: string[];
  context_files?: string[];
  tools_required?: string[];
  success_criteria?: string;
}

interface ProcessNode {
  frontmatter: NodeFrontmatter;
  body: string;
  filePath: string;
  parentPath: string | null;
}

interface Edge {
  source: string;
  target: string;
}

interface Subgraph {
  parentNodeId: string;
  manifest: Manifest;
  nodes: ProcessNode[];
  edges: Edge[];
}

interface TraceEntry {
  ts: string;
  kind: string;
  [key: string]: any;
}

interface SessionInfo {
  name: string;
  ts: string;
  count: number;
}

interface AppState {
  // Graph data
  manifest: Manifest | null;
  nodes: ProcessNode[];
  subgraphs: Subgraph[];

  // State
  activeExplicit: string | null;
  activePresumed: string | null;
  trail: string[];
  enforcement: string;

  // Trace
  traceEntries: TraceEntry[];
  sessions: SessionInfo[];
  replayEntries: TraceEntry[];

  // Validation
  warnings: string[];

  // UI
  activeTab: 'graph' | 'node' | 'trace';
  selectedNodeId: string | null;
  zoomedSubgraph: string | null;
  ghostTrailOn: boolean;
  theme: 'dark' | 'light';

  // Actions
  setGraphData: (manifest: Manifest, nodes: ProcessNode[], subgraphs: Subgraph[]) => void;
  setState: (activeExplicit: string | null, activePresumed: string | null, trail: string[], enforcement: string) => void;
  setTrace: (entries: TraceEntry[]) => void;
  setSessions: (sessions: SessionInfo[]) => void;
  setReplay: (entries: TraceEntry[]) => void;
  setWarnings: (warnings: string[]) => void;
  setActiveTab: (tab: 'graph' | 'node' | 'trace') => void;
  selectNode: (nodeId: string | null) => void;
  zoomInto: (nodeId: string | null) => void;
  toggleGhostTrail: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useStore = create<AppState>((set) => ({
  manifest: null,
  nodes: [],
  subgraphs: [],
  activeExplicit: null,
  activePresumed: null,
  trail: [],
  enforcement: 'warn',
  traceEntries: [],
  sessions: [],
  replayEntries: [],
  warnings: [],
  activeTab: 'graph',
  selectedNodeId: null,
  zoomedSubgraph: null,
  ghostTrailOn: false,
  theme: 'dark',

  setGraphData: (manifest, nodes, subgraphs) => set({ manifest, nodes, subgraphs }),
  setState: (activeExplicit, activePresumed, trail, enforcement) =>
    set({ activeExplicit, activePresumed, trail, enforcement }),
  setTrace: (entries) => set({ traceEntries: entries }),
  setSessions: (sessions) => set({ sessions }),
  setReplay: (entries) => set({ replayEntries: entries }),
  setWarnings: (warnings) => set({ warnings }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId, activeTab: nodeId ? 'node' : 'graph' }),
  zoomInto: (nodeId) => set({ zoomedSubgraph: nodeId }),
  toggleGhostTrail: () => set((s) => ({ ghostTrailOn: !s.ghostTrailOn })),
  setTheme: (theme) => set({ theme }),
}));

export type { Manifest, ProcessNode, Subgraph, TraceEntry, SessionInfo, NodeFrontmatter, Edge };
