import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadGraph, validateGraph, type FileReader } from '@processgraph/shared';

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

export async function validate(root: string): Promise<number> {
  const processRoot = join(root, 'process');
  if (!existsSync(processRoot)) {
    console.error('Error: No process/ directory found in', root);
    return 1;
  }

  try {
    const graph = await loadGraph(processRoot, nodeFileReader);
    const result = validateGraph(graph);

    for (const warning of result.warnings) {
      console.warn(`Warning: ${warning}`);
    }
    for (const error of result.errors) {
      console.error(`Error: ${error}`);
    }

    if (result.errors.length > 0) {
      console.error(`\n${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
      return 1;
    }

    if (result.warnings.length > 0) {
      console.log(`\n${result.warnings.length} warning(s), 0 errors`);
    } else {
      console.log('Validation passed');
    }
    return 0;
  } catch (err: any) {
    console.error('Validation failed:', err.message);
    return 1;
  }
}
