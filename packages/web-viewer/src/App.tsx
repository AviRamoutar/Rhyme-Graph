import React, { useState, useCallback } from 'react';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import { Canvas } from './Canvas';

interface ManifestNode { id: string; next: string[]; }
interface Manifest { name: string; entry: string; nodes: ManifestNode[]; }

interface LoadedGraph {
  manifest: Manifest;
  nodeTitles: Map<string, string>;
}

const App: React.FC = () => {
  const [graph, setGraph] = useState<LoadedGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDirectoryUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setError(null);

    // Find manifest.yaml
    let manifestContent: string | null = null;
    const nodeTitles = new Map<string, string>();

    for (const file of Array.from(files)) {
      const path = file.webkitRelativePath || file.name;

      if (path.endsWith('manifest.yaml') && !path.includes('/implement/')) {
        // Read manifest (prefer root-level)
        if (!manifestContent || path.split('/').length < (manifestContent ? 99 : 99)) {
          manifestContent = await file.text();
        }
      }

      if (path.endsWith('node.md')) {
        const content = await file.text();
        try {
          const { data } = matter(content);
          if (data.id && data.title) {
            nodeTitles.set(data.id, data.title);
          }
        } catch { /* skip bad frontmatter */ }
      }
    }

    if (!manifestContent) {
      setError('No manifest.yaml found in the uploaded directory.');
      return;
    }

    try {
      const raw = yaml.load(manifestContent) as any;
      const manifest: Manifest = {
        name: raw.name ?? 'Unnamed',
        entry: raw.entry,
        nodes: (raw.nodes ?? []).map((n: any) => ({
          id: n.id,
          next: n.next ?? [],
        })),
      };
      setGraph({ manifest, nodeTitles });
    } catch (err: any) {
      setError(`Failed to parse manifest: ${err.message}`);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg text-fg">
      <header className="p-4 border-b border-node-border flex items-center gap-4">
        <h1 className="text-lg font-semibold">Process Graph Viewer</h1>
        <label className="bg-accent text-fg px-3 py-1 rounded text-sm cursor-pointer hover:opacity-90">
          Load process/ folder
          <input
            type="file"
            // @ts-ignore webkitdirectory is non-standard
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={handleDirectoryUpload}
          />
        </label>
        {graph && <span className="text-muted text-sm">{graph.manifest.name}</span>}
      </header>

      {error && (
        <div className="p-4 text-danger text-sm">{error}</div>
      )}

      <div className="flex-1">
        {graph ? (
          <Canvas manifest={graph.manifest} nodeTitles={graph.nodeTitles} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted">
            Upload a process/ directory to view its graph.
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
