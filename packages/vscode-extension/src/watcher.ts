import * as chokidar from 'chokidar';
import { join } from 'path';
import { log } from './output.js';

export interface WatcherCallbacks {
  onGraphChange: () => void;
  onStateChange: () => void;
  onTraceChange: () => void;
  onSessionsChange: () => void;
  onGraphrcChange: () => void;
}

export function createWatchers(
  workspaceRoot: string,
  callbacks: WatcherCallbacks
): chokidar.FSWatcher[] {
  const watchers: chokidar.FSWatcher[] = [];
  const debounce = (fn: () => void, ms = 150) => {
    let timer: NodeJS.Timeout;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  };

  // process/** (md + manifest.yaml)
  const graphWatcher = chokidar.watch(
    [join(workspaceRoot, 'process/**/*.md'), join(workspaceRoot, 'process/**/manifest.yaml')],
    { ignoreInitial: true }
  );
  graphWatcher.on('all', debounce(() => {
    log('Graph files changed');
    callbacks.onGraphChange();
  }));
  watchers.push(graphWatcher);

  // .process/.state.json
  const stateWatcher = chokidar.watch(
    join(workspaceRoot, '.process/.state.json'),
    { ignoreInitial: true }
  );
  stateWatcher.on('all', debounce(() => {
    log('State changed');
    callbacks.onStateChange();
  }));
  watchers.push(stateWatcher);

  // .traces/current.jsonl
  const traceWatcher = chokidar.watch(
    join(workspaceRoot, '.traces/current.jsonl'),
    { ignoreInitial: true }
  );
  traceWatcher.on('all', debounce(() => {
    callbacks.onTraceChange();
  }));
  watchers.push(traceWatcher);

  // .traces/*.jsonl (other sessions)
  const sessionsWatcher = chokidar.watch(
    join(workspaceRoot, '.traces/*.jsonl'),
    { ignoreInitial: true }
  );
  sessionsWatcher.on('all', debounce(() => {
    callbacks.onSessionsChange();
  }));
  watchers.push(sessionsWatcher);

  // .graphrc files
  const graphrcWatcher = chokidar.watch(
    [
      join(workspaceRoot, '.graphrc'),
      join(workspaceRoot, 'process/.graphrc'),
    ],
    { ignoreInitial: true }
  );
  graphrcWatcher.on('all', debounce(() => {
    log('Graphrc changed');
    callbacks.onGraphrcChange();
  }));
  watchers.push(graphrcWatcher);

  return watchers;
}
