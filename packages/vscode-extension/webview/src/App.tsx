import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './graph/Canvas';
import { NodePanel } from './node/NodePanel';
import { TracePanel } from './trace/TracePanel';
import { useStore } from './store';
import { postMessage } from './vscode';

const App: React.FC = () => {
  const {
    activeTab, setActiveTab,
    setGraphData, setState, setTrace,
    setSessions, setReplay, setWarnings, setTheme,
  } = useStore();

  useEffect(() => {
    // Signal ready
    postMessage({ type: 'ready' });

    // Listen for messages from extension
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      switch (msg.type) {
        case 'graph':
          setGraphData(msg.manifest, msg.nodes, msg.subgraphs ?? []);
          break;
        case 'state':
          setState(msg.activeExplicit, msg.activePresumed, msg.trail ?? [], msg.enforcement ?? 'warn');
          break;
        case 'trace':
          setTrace(msg.entries ?? []);
          break;
        case 'sessions':
          setSessions(msg.files ?? []);
          break;
        case 'replay':
          setReplay(msg.entries ?? []);
          break;
        case 'validation':
          setWarnings(msg.warnings ?? []);
          break;
        case 'theme':
          setTheme(msg.kind ?? 'dark');
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const tabs = [
    { id: 'graph' as const, label: 'Graph' },
    { id: 'node' as const, label: 'Node' },
    { id: 'trace' as const, label: 'Trace' },
  ];

  return (
    <div className="flex flex-col h-screen bg-bg text-fg">
      {/* Tab bar */}
      <div className="flex border-b border-node-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm ${
              activeTab === tab.id
                ? 'text-fg border-b-2 border-accent'
                : 'text-muted hover:text-fg'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'graph' && (
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        )}
        {activeTab === 'node' && <NodePanel />}
        {activeTab === 'trace' && <TracePanel />}
      </div>
    </div>
  );
};

export default App;
