import React from 'react';
import { useStore } from '../store';
import { postMessage } from '../vscode';

export const NodePanel: React.FC = () => {
  const { nodes, subgraphs, selectedNodeId, enforcement } = useStore();

  if (!selectedNodeId) {
    return (
      <div className="p-4 text-muted text-sm">
        Select a node on the graph to view its details.
      </div>
    );
  }

  const allNodes = [...nodes, ...subgraphs.flatMap(s => s.nodes)];
  const node = allNodes.find(n => {
    const fullId = n.parentPath
      ? `${n.parentPath}/${n.frontmatter.id}`
      : n.frontmatter.id;
    return fullId === selectedNodeId || n.frontmatter.id === selectedNodeId;
  });

  if (!node) {
    return (
      <div className="p-4 text-muted text-sm">
        Node "{selectedNodeId}" not found.
      </div>
    );
  }

  const fm = node.frontmatter;

  // Simple token estimation
  const contextFiles = fm.context_files ?? [];
  // We don't have actual byte counts in the webview, show the patterns
  const totalTokensEstimate = 0; // Would need resolved data from extension

  const enforcementTooltip = (tool: string) => {
    switch (enforcement) {
      case 'block': return `Enforcement: BLOCK — tool calls to "${tool}" will be denied if not in this node`;
      case 'warn': return `Enforcement: WARN — tool calls to "${tool}" will be logged if not in this node`;
      default: return `Enforcement: OFF`;
    }
  };

  return (
    <div className="p-4 overflow-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-fg font-semibold">{fm.title}</h2>
        <button
          className="bg-node-bg border border-node-border rounded px-3 py-1 text-xs text-accent hover:border-accent"
          onClick={() => postMessage({ type: 'openFile', filePath: node.filePath })}
        >
          Edit in Editor
        </button>
      </div>

      {/* Frontmatter table */}
      <table className="w-full text-xs mb-4">
        <tbody>
          <tr className="border-b border-node-border">
            <td className="py-1 text-muted w-32">ID</td>
            <td className="py-1 text-fg">{fm.id}</td>
          </tr>
          {fm.success_criteria && (
            <tr className="border-b border-node-border">
              <td className="py-1 text-muted">Success Criteria</td>
              <td className="py-1 text-fg">{fm.success_criteria}</td>
            </tr>
          )}
          {fm.preconditions && fm.preconditions.length > 0 && (
            <tr className="border-b border-node-border">
              <td className="py-1 text-muted">Preconditions</td>
              <td className="py-1 text-fg">{fm.preconditions.join(', ')}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Context files */}
      {contextFiles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm text-muted mb-2">Context Files</h3>
          <div className="space-y-1">
            {contextFiles.map((pattern, i) => (
              <div
                key={i}
                className="text-xs text-accent cursor-pointer hover:underline"
                onClick={() => postMessage({ type: 'openFile', filePath: pattern })}
              >
                {pattern}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tools required */}
      {fm.tools_required && fm.tools_required.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm text-muted mb-2">Tools Required</h3>
          <div className="flex flex-wrap gap-1">
            {fm.tools_required.map((tool, i) => (
              <span
                key={i}
                className="bg-node-bg border border-node-border rounded px-2 py-0.5 text-xs text-fg"
                title={enforcementTooltip(tool)}
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Body (rendered as plain text for now) */}
      <div className="mt-4 text-sm text-fg whitespace-pre-wrap leading-relaxed">
        {node.body}
      </div>
    </div>
  );
};
