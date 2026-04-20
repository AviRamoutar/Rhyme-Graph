import { cpSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

function findTemplatesDir(): string {
  // Walk up from extension dist to find templates/
  let dir = resolve(__dirname);
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'templates');
    if (existsSync(candidate)) return candidate;
    dir = resolve(dir, '..');
  }
  throw new Error('Could not find templates directory');
}

export function initTemplate(templateName: string, targetDir: string): void {
  const processDir = join(targetDir, 'process');
  if (existsSync(processDir)) {
    throw new Error('process/ directory already exists');
  }

  const templatesDir = findTemplatesDir();
  const templateDir = join(templatesDir, templateName);
  if (!existsSync(templateDir)) {
    throw new Error(`Template "${templateName}" not found`);
  }

  cpSync(templateDir, targetDir, { recursive: true });
}
