import * as vscode from 'vscode';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import type { ProcessGraph, ValidationResult, TraceEntry, Graphrc } from '@processgraph/shared';
import { inferActiveNode } from '@processgraph/shared';
import { readTraceEntries, listSessions, readSessionEntries } from './traceReader.js';
import { log } from './output.js';

export class ProcessGraphPanel {
  public static currentPanel: ProcessGraphPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private workspaceRoot: string;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    workspaceRoot: string
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.workspaceRoot = workspaceRoot;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.html = this.getHtml();

    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null,
      this.disposables
    );
  }

  static createOrShow(extensionUri: vscode.Uri, workspaceRoot: string): ProcessGraphPanel {
    const column = vscode.ViewColumn.Beside;

    if (ProcessGraphPanel.currentPanel) {
      ProcessGraphPanel.currentPanel.panel.reveal(column);
      return ProcessGraphPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'processGraph',
      'Process Graph',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.file(workspaceRoot),
        ],
      }
    );

    ProcessGraphPanel.currentPanel = new ProcessGraphPanel(panel, extensionUri, workspaceRoot);
    return ProcessGraphPanel.currentPanel;
  }

  postGraph(graph: ProcessGraph, validation: ValidationResult): void {
    this.panel.webview.postMessage({
      type: 'graph',
      manifest: graph.manifest,
      nodes: graph.nodes,
      subgraphs: graph.subgraphs,
    });
    this.panel.webview.postMessage({
      type: 'validation',
      warnings: [...validation.warnings, ...validation.errors],
    });
  }

  postState(enforcement: string): void {
    const stateFile = join(this.workspaceRoot, '.process', '.state.json');
    let activeExplicit: string | null = null;
    let trail: string[] = [];

    if (existsSync(stateFile)) {
      try {
        const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
        activeExplicit = state.activeNode ?? null;
        trail = state.trail ?? [];
      } catch { /* ignore */ }
    }

    // Compute presumed active from trace
    const entries = readTraceEntries(this.workspaceRoot);
    const graphFile = join(this.workspaceRoot, 'process', 'manifest.yaml');
    let activePresumed: string | null = null;
    // We'll use the node data we've already sent; for now just infer from traces
    // The webview can do more sophisticated inference with full node data

    this.panel.webview.postMessage({
      type: 'state',
      activeExplicit,
      activePresumed,
      trail,
      enforcement,
    });
  }

  postTrace(): void {
    const entries = readTraceEntries(this.workspaceRoot);
    this.panel.webview.postMessage({ type: 'trace', entries });
  }

  postSessions(): void {
    const sessions = listSessions(this.workspaceRoot);
    this.panel.webview.postMessage({ type: 'sessions', files: sessions });
  }

  postTheme(): void {
    const kind = vscode.window.activeColorTheme.kind;
    this.panel.webview.postMessage({
      type: 'theme',
      kind: kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast
        ? 'dark' : 'light',
    });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'ready':
        log('Webview ready');
        this.postTheme();
        break;
      case 'openFile':
        if (message.filePath) {
          const uri = vscode.Uri.file(join(this.workspaceRoot, message.filePath));
          vscode.window.showTextDocument(uri);
        }
        break;
      case 'loadSession':
        if (message.file) {
          const entries = readSessionEntries(this.workspaceRoot, message.file);
          this.panel.webview.postMessage({ type: 'replay', entries });
        }
        break;
      case 'setEnforcement':
        log(`Enforcement set to: ${message.mode}`);
        break;
    }
  }

  private getHtml(): string {
    const webview = this.panel.webview;
    const mediaUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media'));
    const cspSource = webview.cspSource;

    // Check if built webview exists
    const bundlePath = join(this.extensionUri.fsPath, 'media', 'index.js');
    const cssPath = join(this.extensionUri.fsPath, 'media', 'index.css');
    const hasBundle = existsSync(bundlePath);

    if (hasBundle) {
      const scriptUri = webview.asWebviewUri(vscode.Uri.file(bundlePath));
      const styleUri = existsSync(cssPath)
        ? `<link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.file(cssPath))}">`
        : '';

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; img-src data: ${cspSource}; font-src ${cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${styleUri}
  <title>Process Graph</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
    }

    // Fallback: simple HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline';">
  <title>Process Graph</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 20px; }
  </style>
</head>
<body>
  <h2>Process Graph</h2>
  <p>Webview bundle not found. Run <code>pnpm build:webview</code> in the extension package.</p>
  <script>
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type: 'ready' });
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'graph') {
        document.body.innerHTML = '<h2>Process Graph: ' + msg.manifest.name + '</h2>'
          + '<p>Nodes: ' + msg.nodes.length + '</p>'
          + '<p>Subgraphs: ' + (msg.subgraphs?.length || 0) + '</p>'
          + '<p><em>Build the webview for full visualization.</em></p>';
      }
    });
  </script>
</body>
</html>`;
  }

  private dispose(): void {
    ProcessGraphPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) d.dispose();
  }
}
