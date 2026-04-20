import { cpSync, existsSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export function getTemplatesDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  let dir = resolve(__dirname);
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'templates');
    if (existsSync(candidate)) return candidate;
    dir = resolve(dir, '..');
  }
  throw new Error('Could not find templates directory');
}

export function listTemplates(): string[] {
  const templatesDir = getTemplatesDir();
  return readdirSync(templatesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

export function initTemplate(templateName: string, targetDir: string): void {
  const processDir = join(targetDir, 'process');
  if (existsSync(processDir)) {
    throw new Error(`process/ directory already exists in ${targetDir}`);
  }

  const templatesDir = getTemplatesDir();
  const templateDir = join(templatesDir, templateName);
  if (!existsSync(templateDir)) {
    throw new Error(`Template "${templateName}" not found. Available: ${listTemplates().join(', ')}`);
  }

  cpSync(templateDir, targetDir, { recursive: true });
}
