import * as vscode from 'vscode';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadGraphrc, type Graphrc } from '@processgraph/shared';
import { ProcessGraphPanel } from './panel.js';
import { loadAndValidate } from './graphLoader.js';
import { createWatchers } from './watcher.js';
import { spawnMcpServer, spawnProxy, killProcesses } from './mcpHost.js';
import { registerCommands } from './commands.js';
import { log, getOutputChannel } from './output.js';
import { homedir } from 'os';

let watchers: ReturnType<typeof createWatchers> = [];

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const hasProcess = existsSync(join(workspaceRoot, 'process', 'manifest.yaml'));

  log('Process Graph extension activated');

  // Load graphrc
  const graphrcReader = {
    async readFile(path: string): Promise<string | null> {
      try { return readFileSync(path, 'utf-8'); } catch { return null; }
    },
  };

  let graphrc: Graphrc;
  try {
    graphrc = await loadGraphrc(
      join(homedir(), '.graphrc'),
      join(workspaceRoot, 'process', '.graphrc'),
      join(workspaceRoot, '.graphrc'),
      graphrcReader
    );
  } catch {
    graphrc = { stuck_threshold_minutes: 5, ghost_trail_default: false, enforcement: 'warn', ignore_tools: [] };
  }

  let enforcement = graphrc.enforcement;

  // Register commands
  registerCommands(
    context,
    workspaceRoot,
    () => enforcement,
    (mode) => { enforcement = mode as any; }
  );

  if (!hasProcess) {
    log('No process/manifest.yaml found, waiting for init');
    return;
  }

  // Spawn MCP server
  if (enforcement !== 'off') {
    spawnProxy(workspaceRoot);
  } else {
    spawnMcpServer(workspaceRoot);
  }

  // Set up watchers
  watchers = createWatchers(workspaceRoot, {
    onGraphChange: async () => {
      const result = await loadAndValidate(workspaceRoot);
      if (result && ProcessGraphPanel.currentPanel) {
        ProcessGraphPanel.currentPanel.postGraph(result.graph, result.validation);
      }
    },
    onStateChange: () => {
      if (ProcessGraphPanel.currentPanel) {
        ProcessGraphPanel.currentPanel.postState(enforcement);
      }
    },
    onTraceChange: () => {
      if (ProcessGraphPanel.currentPanel) {
        ProcessGraphPanel.currentPanel.postTrace();
      }
    },
    onSessionsChange: () => {
      if (ProcessGraphPanel.currentPanel) {
        ProcessGraphPanel.currentPanel.postSessions();
      }
    },
    onGraphrcChange: async () => {
      try {
        graphrc = await loadGraphrc(
          join(homedir(), '.graphrc'),
          join(workspaceRoot, 'process', '.graphrc'),
          join(workspaceRoot, '.graphrc'),
          graphrcReader
        );
        enforcement = graphrc.enforcement;
        if (ProcessGraphPanel.currentPanel) {
          ProcessGraphPanel.currentPanel.postState(enforcement);
        }
      } catch { /* ignore */ }
    },
  });

  // Listen for theme changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(() => {
      if (ProcessGraphPanel.currentPanel) {
        ProcessGraphPanel.currentPanel.postTheme();
      }
    })
  );

  context.subscriptions.push({ dispose: () => { killProcesses(); } });
}

export function deactivate() {
  killProcesses();
  for (const w of watchers) {
    w.close();
  }
  watchers = [];
}
