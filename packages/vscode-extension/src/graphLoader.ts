import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadGraph, validateGraph, type FileReader, type ProcessGraph, type ValidationResult } from '@processgraph/shared';
import { log } from './output.js';

const nodeFileReader: FileReader = {
  async readFile(path: string) {
    return readFileSync(path, 'utf-8');
  },
  async exists(path: string) {
    return existsSync(path);
  },
  async listDirs() {
    return [];
  },
};

export async function loadAndValidate(workspaceRoot: string): Promise<{
  graph: ProcessGraph;
  validation: ValidationResult;
} | null> {
  const processRoot = join(workspaceRoot, 'process');
  if (!existsSync(join(processRoot, 'manifest.yaml'))) {
    return null;
  }

  try {
    const graph = await loadGraph(processRoot, nodeFileReader);
    const validation = validateGraph(graph);

    for (const w of validation.warnings) {
      log(`Warning: ${w}`);
    }
    for (const e of validation.errors) {
      log(`Error: ${e}`);
    }

    return { graph, validation };
  } catch (err: any) {
    log(`Failed to load graph: ${err.message}`);
    return null;
  }
}
