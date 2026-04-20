#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'path';
import { initTemplate, listTemplates } from './init.js';
import { validate } from './validate.js';
import { replay } from './replay.js';

const program = new Command();

program
  .name('processgraph')
  .description('Process Graph CLI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a process graph from a template')
  .option('--template <name>', 'Template name')
  .option('--list', 'List available templates')
  .action((opts) => {
    if (opts.list) {
      const templates = listTemplates();
      console.log('Available templates:');
      for (const t of templates) {
        console.log(`  - ${t}`);
      }
      return;
    }
    if (!opts.template) {
      console.error('Error: --template <name> is required. Use --list to see available templates.');
      process.exit(1);
    }
    try {
      initTemplate(opts.template, process.cwd());
      console.log(`Initialized from template "${opts.template}"`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a process graph')
  .option('--root <path>', 'Root directory', process.cwd())
  .action(async (opts) => {
    const code = await validate(resolve(opts.root));
    process.exit(code);
  });

program
  .command('replay')
  .description('Replay a trace file')
  .argument('<trace-file>', 'Path to the JSONL trace file')
  .action((traceFile) => {
    replay(resolve(traceFile));
  });

program.parse();
