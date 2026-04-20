import * as vscode from 'vscode';
import { existsSync } from 'fs';
import { join } from 'path';
import { ProcessGraphPanel } from './panel.js';
import { loadAndValidate } from './graphLoader.js';
import { log } from './output.js';

export function registerCommands(
  context: vscode.ExtensionContext,
  workspaceRoot: string,
  getEnforcement: () => string,
  setEnforcement: (mode: string) => void
): void {
  // Open Panel
  context.subscriptions.push(
    vscode.commands.registerCommand('processGraph.open', async () => {
      const panel = ProcessGraphPanel.createOrShow(context.extensionUri, workspaceRoot);
      const result = await loadAndValidate(workspaceRoot);
      if (result) {
        panel.postGraph(result.graph, result.validation);
        panel.postState(getEnforcement());
        panel.postTrace();
        panel.postSessions();
      }
    })
  );

  // Init from template
  context.subscriptions.push(
    vscode.commands.registerCommand('processGraph.init', async () => {
      const processDir = join(workspaceRoot, 'process');
      if (existsSync(processDir)) {
        vscode.window.showWarningMessage('process/ directory already exists');
        return;
      }

      const templates = ['swe-feature', 'research-experiment', 'incident-postmortem'];
      const picked = await vscode.window.showQuickPick(templates, {
        placeHolder: 'Select a template',
      });

      if (picked) {
        try {
          // Use the CLI init function
          const { initTemplate } = await import('./initHelper.js');
          initTemplate(picked, workspaceRoot);
          vscode.window.showInformationMessage(`Initialized from template "${picked}"`);
        } catch (err: any) {
          vscode.window.showErrorMessage(`Init failed: ${err.message}`);
        }
      }
    })
  );

  // Validate
  context.subscriptions.push(
    vscode.commands.registerCommand('processGraph.validate', async () => {
      const result = await loadAndValidate(workspaceRoot);
      if (!result) {
        vscode.window.showErrorMessage('No process/ directory found');
        return;
      }
      const { validation } = result;
      if (validation.errors.length > 0) {
        vscode.window.showErrorMessage(
          `Validation: ${validation.errors.length} error(s), ${validation.warnings.length} warning(s)`
        );
      } else if (validation.warnings.length > 0) {
        vscode.window.showWarningMessage(
          `Validation: ${validation.warnings.length} warning(s)`
        );
      } else {
        vscode.window.showInformationMessage('Validation passed');
      }
    })
  );

  // Toggle enforcement
  context.subscriptions.push(
    vscode.commands.registerCommand('processGraph.toggleEnforcement', () => {
      const modes = ['off', 'warn', 'block'];
      const current = getEnforcement();
      const nextIndex = (modes.indexOf(current) + 1) % modes.length;
      const next = modes[nextIndex];
      setEnforcement(next);
      log(`Enforcement toggled to: ${next}`);
      vscode.window.showInformationMessage(`Enforcement: ${next}`);

      if (ProcessGraphPanel.currentPanel) {
        ProcessGraphPanel.currentPanel.postState(next);
      }
    })
  );
}
