# Assumptions Log

Decisions and ambiguities resolved during build.

## Root Setup
- Using pnpm 8+ with workspaces
- ES2022 target with bundler module resolution throughout
- Node >= 18 required for native fetch and fs/promises

## Shared Package
- gray-matter used for frontmatter parsing (browser-compatible with Vite bundling, eval warning accepted)
- minimatch v9 for glob matching in inference
- Token estimation: 1 token ≈ 4 bytes (rough heuristic, not exact)
- FileReader interface abstracts fs access so graph.ts works in both Node and browser

## MCP Server
- @modelcontextprotocol/sdk v1.12+ used (McpServer API, stdio transport)
- State stored in .process/.state.json with atomic write (temp+rename)
- Trace rotation at 5MB to .traces/archive/ with ISO timestamp filenames
- `glob` npm package used for context file resolution (not minimatch)

## MCP Proxy
- Proxy spawns upstream MCP servers as child processes via StdioClientTransport
- Gate check reads .state.json on every tool call (no caching — ensures freshness)
- Audit log separate from main trace (proxy.jsonl vs current.jsonl)

## Templates
- swe-feature has a subgraph under implement/ with its own manifest.yaml
- Subgraph node "implement" collides with root-level "implement" — accepted as a valid warning, not an error
- Terminal nodes (ship, refactor) are warnings, not errors

## VS Code Extension
- Webview uses separate npm install (not in pnpm workspace) for React/Vite tooling
- CSP policy: default-src 'none', script/style/img/font from cspSource, 'unsafe-inline' for styles
- retainContextWhenHidden=true for panel persistence
- chokidar v3 used for file watching (v4 ESM-only may conflict with extension CJS requirements)

## Web Viewer
- Uses gray-matter directly in browser (eval warning from Vite accepted)
- webkitdirectory attribute for directory upload (non-standard but widely supported)
- Read-only: no state, tracing, or MCP integration

## Cascading .graphrc
- Merge order: user global (~/.graphrc) → project (process/.graphrc) → personal (.graphrc)
- Last-writer-wins per key (personal > project > user)
- Personal .graphrc is gitignored
