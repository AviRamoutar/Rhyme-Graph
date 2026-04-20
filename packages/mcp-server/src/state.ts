import { writeFileSync, readFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';

export interface ServerState {
  activeNode: string | null;
  trail: string[];
  completedNodes: string[];
}

const DEFAULT_STATE: ServerState = {
  activeNode: null,
  trail: [],
  completedNodes: [],
};

export class StateManager {
  private state: ServerState;
  private stateDir: string;
  private stateFile: string;

  constructor(private root: string) {
    this.stateDir = join(root, '.process');
    this.stateFile = join(this.stateDir, '.state.json');
    mkdirSync(this.stateDir, { recursive: true });

    if (existsSync(this.stateFile)) {
      try {
        this.state = JSON.parse(readFileSync(this.stateFile, 'utf-8'));
      } catch {
        this.state = { ...DEFAULT_STATE };
      }
    } else {
      this.state = { ...DEFAULT_STATE };
    }
  }

  get(): ServerState {
    return this.state;
  }

  getActiveNode(): string | null {
    return this.state.activeNode;
  }

  setActiveNode(nodePath: string): string | null {
    const previous = this.state.activeNode;
    this.state.activeNode = nodePath;
    this.state.trail.push(nodePath);
    this.persist();
    return previous;
  }

  completeNode(nodeId: string): void {
    if (!this.state.completedNodes.includes(nodeId)) {
      this.state.completedNodes.push(nodeId);
    }
    if (this.state.activeNode === nodeId) {
      this.state.activeNode = null;
    }
    this.persist();
  }

  getTrail(): string[] {
    return this.state.trail;
  }

  private persist(): void {
    const tmp = this.stateFile + '.tmp';
    writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    renameSync(tmp, this.stateFile);
  }
}
