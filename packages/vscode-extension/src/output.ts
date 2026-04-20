import * as vscode from 'vscode';

let channel: vscode.OutputChannel | null = null;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('ProcessGraph');
  }
  return channel;
}

export function log(msg: string): void {
  getOutputChannel().appendLine(`[${new Date().toLocaleTimeString()}] ${msg}`);
}
