import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type NodeMouseHandler,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { layoutGraph, NODE_WIDTH, NODE_HEIGHT } from './layout';
import { GhostTrail } from './GhostTrail';
import { ReplayOverlay } from './ReplayOverlay';
import { useStore } from '../store';
import { postMessage } from '../vscode';

interface NodeData {
  label: string;
  status: 'idle' | 'active' | 'completed' | 'blocked' | 'presumed';
  hasSubgraph: boolean;
  blockCount?: number;
  [key: string]: unknown;
}

const statusIcons: Record<string, string> = {
  idle: '\u25CB',     // ○
  active: '\u25CF',   // ●
  completed: '\u2713', // ✓
  blocked: '\u2717',  // ✗
  presumed: '\u25D0', // ◐
};

const statusColors: Record<string, string> = {
  idle: '#8b8680',
  active: '#3a8580',
  completed: '#4a9',
  blocked: '#c44536',
  presumed: '#3a8580',
};

function ProcessNodeComponent({ data }: { data: NodeData }) {
  const borderStyle = data.status === 'active'
    ? '2px solid #3a8580'
    : data.status === 'presumed'
    ? '2px dotted #3a8580'
    : '1px solid #2a3038';

  const glow = data.status === 'active'
    ? '0 0 8px rgba(58, 133, 128, 0.4)'
    : 'none';

  return (
    <div
      style={{
        background: '#1a1f26',
        border: borderStyle,
        borderRadius: 8,
        padding: '8px 12px',
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: glow,
        cursor: data.hasSubgraph ? 'pointer' : 'default',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#8b8680' }} />
      <span style={{ color: statusColors[data.status], fontSize: 14 }}>
        {statusIcons[data.status]}
      </span>
      <span style={{ color: '#e6e1cf', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.label}
      </span>
      {data.hasSubgraph && (
        <span style={{ color: '#8b8680', fontSize: 10 }}>▶</span>
      )}
      {(data.blockCount ?? 0) > 0 && (
        <span style={{
          background: '#c44536',
          color: '#fff',
          fontSize: 9,
          padding: '1px 4px',
          borderRadius: 8,
        }}>
          {data.blockCount}
        </span>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#8b8680' }} />
    </div>
  );
}

const nodeTypes = { process: ProcessNodeComponent };

export const Canvas: React.FC = () => {
  const {
    manifest, nodes, subgraphs,
    activeExplicit, activePresumed, trail,
    ghostTrailOn, zoomedSubgraph, replayEntries,
    traceEntries, enforcement, sessions,
    selectNode, zoomInto, toggleGhostTrail, warnings,
  } = useStore();

  const subgraphIds = useMemo(() => new Set(subgraphs.map(s => s.parentNodeId)), [subgraphs]);

  // Determine which nodes/edges to show
  const { flowNodes, flowEdges } = useMemo(() => {
    if (!manifest) return { flowNodes: [], flowEdges: [] };

    let displayNodes: FlowNode<NodeData>[];
    let displayEdges: FlowEdge[];

    // Count blocked entries per node from trace
    const blockCounts = new Map<string, number>();
    for (const entry of traceEntries) {
      if (entry.kind === 'flag_blocked') {
        const active = activeExplicit;
        if (active) blockCounts.set(active, (blockCounts.get(active) ?? 0) + 1);
      }
    }

    if (zoomedSubgraph) {
      const sub = subgraphs.find(s => s.parentNodeId === zoomedSubgraph);
      if (!sub) return { flowNodes: [], flowEdges: [] };

      displayNodes = sub.manifest.nodes.map((mn) => {
        const fullId = `${sub.parentNodeId}/${mn.id}`;
        const node = sub.nodes.find(n => n.frontmatter.id === mn.id);
        let status: NodeData['status'] = 'idle';
        if (activeExplicit === fullId) status = 'active';
        else if (activePresumed === fullId) status = 'presumed';

        return {
          id: fullId,
          type: 'process',
          position: { x: 0, y: 0 },
          data: {
            label: node?.frontmatter.title ?? mn.id,
            status,
            hasSubgraph: false,
            blockCount: blockCounts.get(fullId) ?? 0,
          },
        };
      });

      displayEdges = sub.edges.map((e, i) => ({
        id: `sub-edge-${i}`,
        source: e.source,
        target: e.target,
        style: { stroke: '#8b8680' },
      }));
    } else {
      displayNodes = manifest.nodes.map((mn) => {
        const node = nodes.find(n => n.frontmatter.id === mn.id);
        let status: NodeData['status'] = 'idle';
        if (activeExplicit === mn.id) status = 'active';
        else if (activePresumed === mn.id) status = 'presumed';

        return {
          id: mn.id,
          type: 'process',
          position: { x: 0, y: 0 },
          data: {
            label: node?.frontmatter.title ?? mn.id,
            status,
            hasSubgraph: subgraphIds.has(mn.id),
            blockCount: blockCounts.get(mn.id) ?? 0,
          },
        };
      });

      displayEdges = manifest.nodes.flatMap((mn, _i) =>
        mn.next.map((target, j) => ({
          id: `edge-${mn.id}-${target}-${j}`,
          source: mn.id,
          target,
          style: { stroke: '#8b8680' },
        }))
      );
    }

    const layouted = layoutGraph(displayNodes, displayEdges);
    return { flowNodes: layouted.nodes as FlowNode<NodeData>[], flowEdges: layouted.edges };
  }, [manifest, nodes, subgraphs, activeExplicit, activePresumed, zoomedSubgraph, traceEntries]);

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const n of flowNodes) {
      map.set(n.id, { x: n.position.x, y: n.position.y, width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    return map;
  }, [flowNodes]);

  const onNodeClick: NodeMouseHandler<FlowNode<NodeData>> = useCallback((_event, node) => {
    selectNode(node.id);
  }, [selectNode]);

  const onNodeDoubleClick: NodeMouseHandler<FlowNode<NodeData>> = useCallback((_event, node) => {
    if (node.data.hasSubgraph) {
      zoomInto(node.id);
      postMessage({ type: 'zoomInto', nodePath: node.id });
    }
  }, [zoomInto]);

  const handleLoadSession = useCallback((file: string) => {
    postMessage({ type: 'loadSession', file });
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        {zoomedSubgraph && (
          <button
            className="bg-node-bg border border-node-border rounded px-2 py-1 text-xs text-fg hover:border-accent"
            onClick={() => { zoomInto(null); postMessage({ type: 'breadcrumbUp' }); }}
          >
            root {'\u203A'} {zoomedSubgraph}
          </button>
        )}
        <button
          className={`border rounded px-2 py-1 text-xs ${ghostTrailOn ? 'bg-accent text-fg border-accent' : 'bg-node-bg text-muted border-node-border hover:border-accent'}`}
          onClick={toggleGhostTrail}
        >
          Ghost Trail
        </button>
        {sessions.length > 0 && (
          <select
            className="bg-node-bg border border-node-border rounded px-2 py-1 text-xs text-fg"
            defaultValue=""
            onChange={(e) => e.target.value && handleLoadSession(e.target.value)}
          >
            <option value="">Replay Session...</option>
            {sessions.map(s => (
              <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
            ))}
          </select>
        )}
        <span className={`border rounded px-2 py-1 text-xs ${
          enforcement === 'block' ? 'bg-danger text-fg border-danger' :
          enforcement === 'warn' ? 'bg-warn text-bg border-warn' :
          'bg-node-bg text-muted border-node-border'
        }`}>
          Enforcement: {enforcement}
        </span>
      </div>

      {/* Warnings banner */}
      {warnings.length > 0 && (
        <div className="absolute top-12 left-2 right-2 z-10 bg-warn/20 border border-warn rounded p-2 text-xs text-warn max-h-20 overflow-auto">
          {warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2a3038" gap={20} />
        <Controls />
      </ReactFlow>

      {ghostTrailOn && <GhostTrail trail={trail} nodePositions={nodePositions} />}
      {replayEntries.length > 0 && <ReplayOverlay entries={replayEntries} nodePositions={nodePositions} />}
    </div>
  );
};
