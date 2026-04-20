# Process Graph

A VS Code extension and toolchain that gives AI agents a structured process graph to follow — visualizing nodes, edges, active state, and trace history in real time.

## Quickstart

```bash
pnpm install
pnpm -r build
# Open examples/swe-feature in VS Code, press F5
```

## Screenshot Placeholders

- **Graph tab**: React Flow canvas with dagre LR layout, active node highlighting
- **Node tab**: Markdown body, frontmatter table, context file links
- **Trace tab**: Reverse-chronological log with filter chips

## MCP Tool Reference

| Tool | Description |
|---|---|
| `set_active_node` | Set the currently active node |
| `list_nodes` | List all nodes with reachability |
| `get_node` | Get node details + resolved context files |
| `request_context` | Read files matching a glob |
| `flag_blocked` | Flag that progress is blocked |
| `complete_node` | Mark current node complete, get next options |
| `log_observation` | Log free-text to the trace |

## Claude Code Config

Without proxy:
```json
{
  "mcpServers": {
    "processgraph": {
      "command": "node",
      "args": ["<path>/packages/mcp-server/dist/index.js", "--root", "."]
    }
  }
}
```

With enforcement proxy:
```json
{
  "mcpServers": {
    "processgraph": {
      "command": "node",
      "args": [
        "<path>/packages/mcp-proxy/dist/index.js",
        "--root", ".",
        "--upstream", "node <path>/packages/mcp-server/dist/index.js --root ."
      ]
    }
  }
}
```

## Enforcement Modes

- **off**: No tool gating, everything forwarded
- **warn**: Tools not in `tools_required` are forwarded but logged with a warning
- **block**: Tools not in `tools_required` are denied with an error

Configured via cascading `.graphrc` files (YAML): `~/.graphrc` (user), `process/.graphrc` (project), `.graphrc` (personal, gitignored). Last-writer-wins per key.

## CLI

```bash
processgraph init --template swe-feature    # Initialize from template
processgraph init --list                     # List templates
processgraph validate [--root <path>]        # Validate graph
processgraph replay <trace.jsonl>            # Replay a trace file
```

## Web Viewer

```bash
cd packages/web-viewer
npx vite dev
```

Open in browser, click "Load process/ folder" to upload a directory.

## Feature Map

| Feature | v0 | v1 | v2 |
|---|---|---|---|
| Graph visualization | x | x | x |
| MCP server (7 tools) | x | x | x |
| File watchers | | x | x |
| Ghost trail | | x | x |
| Passive inference | | x | x |
| Subgraph zoom | | | x |
| Enforcement proxy | | | x |
| Multi-session replay | | | x |
| Web viewer | | | x |
| Template registry | | | x |

## Disclaimers

- This is not a graph editor — nodes are authored as markdown files
- `tools_required` enforcement depends on the proxy being configured and enforcement mode set to `warn` or `block`

## Roadmap (out of scope for current build)

- Graph editing UI
- Remote MCP transport (SSE/WebSocket)
- Multi-agent coordination
- Custom node types / plugins
- CI integration for validation
