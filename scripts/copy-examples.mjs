import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const templates = join(root, 'templates');
const examples = join(root, 'examples');

if (!existsSync(templates)) {
  console.log('No templates/ directory yet, skipping copy-examples.');
  process.exit(0);
}

const dirs = ['swe-feature', 'research-experiment', 'incident-postmortem'];
for (const dir of dirs) {
  const src = join(templates, dir);
  const dest = join(examples, dir);
  if (existsSync(src)) {
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
    console.log(`Copied ${dir} to examples/`);
  }
}
