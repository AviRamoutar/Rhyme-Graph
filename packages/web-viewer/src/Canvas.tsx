import React, { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type Node as FlowNode,
  type Edge as FlowEdge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

interface ManifestNode { id: string; next: string[]; }
interface Manifest { name: string; entry: string; nodes: ManifestNode[]; }
interface NodeData { label: string; [key: string]: unknown; }

function layout(nodes: FlowNode[], edges: FlowEdge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 140, nodesep: 60 });
  for (const n of nodes) g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  return {
    nodes: nodes.map(n => {
      const p = g.node(n.id);
      return { ...n, position: { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 } };
    }),
    edges,
  };
}

function NodeComponent({ data }: { data: NodeData }) {
  return (
    <div style={{
      background: '#1a1f26', border: '1px solid #2a3038', borderRadius: 8,
      padding: '8px 12px', width: NODE_WIDTH, height: NODE_HEIGHT,
      display: 'flex', alignItems: 'center',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#8b8680' }} />
      <span style={{ color: '#e6e1cf', fontSize: 12 }}>{data.label}</span>
      <Handle type="source" position={Position.Right} style={{ background: '#8b8680' }} />
    </div>
  );
}

const nodeTypes = { process: NodeComponent };

interface CanvasProps {
  manifest: Manifest;
  nodeTitles: Map<string, string>;
}

export const Canvas: React.FC<CanvasProps> = ({ manifest, nodeTitles }) => {
  const { nodes, edges } = useMemo(() => {
    const flowNodes: FlowNode<NodeData>[] = manifest.nodes.map(mn => ({
      id: mn.id,
      type: 'process',
      position: { x: 0, y: 0 },
      data: { label: nodeTitles.get(mn.id) ?? mn.id },
    }));
    const flowEdges: FlowEdge[] = manifest.nodes.flatMap(mn =>
      mn.next.map((t, j) => ({ id: `${mn.id}-${t}-${j}`, source: mn.id, target: t }))
    );
    return layout(flowNodes, flowEdges);
  }, [manifest, nodeTitles]);

  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#2a3038" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
};
