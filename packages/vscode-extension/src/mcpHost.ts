import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { log } from './output.js';

let mcpProcess: ChildProcess | null = null;
let proxyProcess: ChildProcess | null = null;

export function spawnMcpServer(workspaceRoot: string): ChildProcess | null {
  const serverPath = join(__dirname, '..', '..', 'mcp-server', 'dist', 'index.js');

  try {
    mcpProcess = spawn('node', [serverPath, '--root', workspaceRoot], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: workspaceRoot,
    });

    mcpProcess.stderr?.on('data', (data: Buffer) => {
      log(`MCP server: ${data.toString().trim()}`);
    });

    mcpProcess.on('exit', (code) => {
      log(`MCP server exited with code ${code}`);
      mcpProcess = null;
    });

    // Write endpoint file
    const processDir = join(workspaceRoot, '.process');
    mkdirSync(processDir, { recursive: true });
    writeFileSync(join(processDir, '.mcp-endpoint'), 'stdio');

    log('MCP server spawned');
    return mcpProcess;
  } catch (err: any) {
    log(`Failed to spawn MCP server: ${err.message}`);
    return null;
  }
}

export function spawnProxy(workspaceRoot: string): ChildProcess | null {
  const proxyPath = join(__dirname, '..', '..', 'mcp-proxy', 'dist', 'index.js');
  const serverPath = join(__dirname, '..', '..', 'mcp-server', 'dist', 'index.js');

  try {
    proxyProcess = spawn('node', [
      proxyPath,
      '--root', workspaceRoot,
      '--upstream', `node ${serverPath} --root ${workspaceRoot}`,
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: workspaceRoot,
    });

    proxyProcess.stderr?.on('data', (data: Buffer) => {
      log(`Proxy: ${data.toString().trim()}`);
    });

    proxyProcess.on('exit', (code) => {
      log(`Proxy exited with code ${code}`);
      proxyProcess = null;
    });

    log('Proxy spawned');
    return proxyProcess;
  } catch (err: any) {
    log(`Failed to spawn proxy: ${err.message}`);
    return null;
  }
}

export function killProcesses(): void {
  mcpProcess?.kill();
  proxyProcess?.kill();
  mcpProcess = null;
  proxyProcess = null;
}
