# triepod-ai Fork of Brave Search MCP Server

This repository is a fork of the official [Brave Search MCP Server](https://github.com/brave/brave-search-mcp-server) maintained by [triepod-ai](https://github.com/triepod-ai).

## Upstream Repository

- **Original**: https://github.com/brave/brave-search-mcp-server
- **Fork**: https://github.com/triepod-ai/brave-search-mcp-server

## Fork Enhancements

This fork includes the following enhancements over the upstream repository:

### 1. Context Control Tips for All Tools

Added comprehensive guidance to all 6 tool descriptions to help LLMs optimize context usage:
- Recommended `count` values for different use cases
- Token efficiency recommendations
- Pagination strategies and limitations

**Commit**: `55bce08` - feat: add context control tips to all tool descriptions

### 2. Improved Pagination Parameter Documentation

Enhanced `count` and `offset` parameter descriptions with concrete examples:
- Web search: "Start with 5 for context efficiency, use 10-15 for comprehensive results"
- News search: "Start with 5-10 for breaking news, use 20 for comprehensive coverage"
- Video search: "offset=10 with count=10 gets videos 11-20"

**Commit**: `121b28b` - feat: improve pagination parameter descriptions with clear examples

### 3. Images Tool Offset Fix

Corrected documentation that incorrectly referenced offset pagination for the Images tool (which doesn't support it).

**Commit**: `f39a6dd` - fix: remove incorrect offset reference from Images tool count parameter

### 4. Docker EXPOSE Directive

Added `EXPOSE 8080` to Dockerfile for proper HTTP transport deployment.

### 5. MCP Tool Annotations

All tools include proper MCP annotations:
- `readOnlyHint: true` - Tools only read data, no modifications
- `idempotentHint: true` - Same request yields same results
- `openWorldHint: true` - Tools access external Brave Search API

## Syncing with Upstream

To sync this fork with the latest upstream changes:

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream main into local main
git checkout main
git merge upstream/main

# Push to fork
git push origin main
```

## Local Deployment Files

The following files are excluded from the repository (in `.gitignore`) as they contain local deployment configuration:
- `docker-compose.yml` - Local Docker orchestration
- `run-streamable-http.sh` - HTTP server launcher script
- `.env` - Environment variables including API keys
- `CLAUDE.md` - Local Claude Code project instructions

## License

This fork maintains the same MIT license as the upstream repository. See [LICENSE](./LICENSE) for details.

Copyright (c) 2024 Anthropic, PBC
Copyright (c) 2025 Brave Software, Inc
