# Brave Search MCP Server

An MCP server implementation that integrates the Brave Search API, providing comprehensive search capabilities including web search, local business search, place search, image search, video search, news search, LLM context, and AI-powered summarization. This project supports both STDIO and HTTP transports, with STDIO as the default mode.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/brave/brave-search-mcp-server)

## Migration

### 1.x to 2.x

#### Default transport now STDIO

To follow established MCP conventions, the server now defaults to STDIO. If you would like to continue using HTTP, you will need to set the `BRAVE_MCP_TRANSPORT` environment variable to `http`, or provide the runtime argument `--transport http` when launching the server.

#### Response structure of `brave_image_search`

Version 1.x of the MCP server would return base64-encoded image data along with image URLs. This dramatically slowed down the response, as well as consumed unnecessarily context in the session. Version 2.x removes the base64-encoded data, and returns a response object that more closely reflects the original Brave Search API response. The updated output schema is defined in [`src/tools/images/schemas/output.ts`](https://github.com/brave/brave-search-mcp-server/blob/main/src/tools/images/schemas/output.ts).

## Tools

### Web Search (`brave_web_search`)
Performs comprehensive web searches with rich result types and advanced filtering options.

**Parameters:**
- `query` (string, required): Search terms (max 400 chars, 50 words)
- `country` (string, optional): Country code (default: "US")
- `search_lang` (string, optional): Search language (default: "en")
- `ui_lang` (string, optional): UI language (default: "en-US")
- `count` (number, optional): Results per page (1-20, default: 10)
- `offset` (number, optional): Pagination offset (max 9, default: 0)
- `safesearch` (string, optional): Content filtering ("off", "moderate", "strict", default: "moderate")
- `freshness` (string, optional): Time filter ("pd", "pw", "pm", "py", or date range)
- `text_decorations` (boolean, optional): Include highlighting markers (default: true)
- `spellcheck` (boolean, optional): Enable spell checking (default: true)
- `result_filter` (array, optional): Filter result types (default: ["web", "query"])
- `goggles` (array, optional): Custom re-ranking definitions
- `units` (string, optional): Measurement units ("metric" or "imperial")
- `extra_snippets` (boolean, optional): Get additional excerpts (Pro plans only)
- `summary` (boolean, optional): Enable summary key generation for AI summarization

### Local Search (`brave_local_search`)
Searches for local businesses and places with detailed information including ratings, hours, and AI-generated descriptions.

**Parameters:**
- Same as `brave_web_search` with automatic location filtering
- Automatically includes "web" and "locations" in result_filter

**Note:** Requires Pro plan for full local search capabilities. Falls back to web search otherwise.

### Video Search (`brave_video_search`)
Searches for videos with comprehensive metadata and thumbnail information.

**Parameters:**
- `query` (string, required): Search terms (max 400 chars, 50 words)
- `country` (string, optional): Country code (default: "US")
- `search_lang` (string, optional): Search language (default: "en")
- `ui_lang` (string, optional): UI language (default: "en-US")
- `count` (number, optional): Results per page (1-50, default: 20)
- `offset` (number, optional): Pagination offset (max 9, default: 0)
- `spellcheck` (boolean, optional): Enable spell checking (default: true)
- `safesearch` (string, optional): Content filtering ("off", "moderate", "strict", default: "moderate")
- `freshness` (string, optional): Time filter ("pd", "pw", "pm", "py", or date range)

### Image Search (`brave_image_search`)
Searches for images with automatic fetching and base64 encoding for direct display.

**Parameters:**
- `query` (string, required): Search terms (max 400 chars, 50 words)
- `country` (string, optional): Country code (default: "US")
- `search_lang` (string, optional): Search language (default: "en")
- `count` (number, optional): Results per page (1-200, default: 50)
- `safesearch` (string, optional): Content filtering ("off", "strict", default: "strict")
- `spellcheck` (boolean, optional): Enable spell checking (default: true)

### News Search (`brave_news_search`)
Searches for current news articles with freshness controls and breaking news indicators.

**Parameters:**
- `query` (string, required): Search terms (max 400 chars, 50 words)
- `country` (string, optional): Country code (default: "US")
- `search_lang` (string, optional): Search language (default: "en")
- `ui_lang` (string, optional): UI language (default: "en-US")
- `count` (number, optional): Results per page (1-50, default: 20)
- `offset` (number, optional): Pagination offset (max 9, default: 0)
- `spellcheck` (boolean, optional): Enable spell checking (default: true)
- `safesearch` (string, optional): Content filtering ("off", "moderate", "strict", default: "moderate")
- `freshness` (string, optional): Time filter (default: "pd" for last 24 hours)
- `extra_snippets` (boolean, optional): Get additional excerpts (Pro plans only)
- `goggles` (array, optional): Custom re-ranking definitions

### Summarizer Search (`brave_summarizer`)
Generates AI-powered summaries from web search results using Brave's summarization API.

**Parameters:**
- `key` (string, required): Summary key from web search results (use `summary: true` in web search)
- `entity_info` (boolean, optional): Include entity information (default: false)
- `inline_references` (boolean, optional): Add source URL references (default: false)

**Usage:** First perform a web search with `summary: true`, then use the returned summary key with this tool.

### Place Search (`brave_place_search`)
Searches for points of interest (POIs) in a specified geographic area using Brave's Place Search API. Returns rich, structured place data including name, address, opening hours, contact info, ratings, photos, categories, and timezone.

**Parameters:**
- `query` (string, optional): Query string used to refine the POI search (max 400 chars, 50 words). When omitted, returns general points of interest in the supplied area.
- `latitude` (number, optional): Latitude of the search center (-90 to 90). Typically paired with `longitude`.
- `longitude` (number, optional): Longitude of the search center (-180 to 180). Typically paired with `latitude`.
- `location` (string, optional): Location string used as an alternative to `latitude`/`longitude`. For US locations prefer the form `<city> <state> <country name>` (e.g., `san francisco ca united states`); for non-US locations use `<city> <country name>` (e.g., `tokyo japan`).
- `radius` (number, optional): Search radius around the supplied coordinates, in meters. If omitted, the search is performed globally.
- `count` (number, optional): Number of results to return (1-50, default 20).
- `country` (string, optional): Two-letter country code (default `US`).
- `search_lang` (string, optional): Search language (default `en`).
- `ui_lang` (string, optional): UI language (default `en-US`).
- `units` (string, optional): Distance units (`metric` or `imperial`, default `metric`).
- `safesearch` (string, optional): Safe search level (`off`, `moderate`, `strict`, default `strict`).
- `spellcheck` (boolean, optional): Whether to spellcheck the query (default `true`).
- `geoloc` (string, optional): Optional geolocation token used to refine results.

**Optional request headers:**
- `api-version` (string, optional): Brave API version (`YYYY-MM-DD`)
- `accept` (string, optional): Response media type (`application/json` or `*/*`)
- `cache-control` (string, optional): Use `no-cache` to request fresh content
- `user-agent` (string, optional): User agent originating the request

### LLM Context (`brave_llm_context`)
Retrieves pre-extracted web content optimized for AI agents, LLM grounding, and RAG pipelines.

**Parameters:**
- `query` (string, required): Search query (max 400 chars, 50 words)
- `country` (string, optional): Search country code
- `search_lang` (string, optional): Search language code
- `count` (number, optional): Maximum number of search results considered (1-50)
- `spellcheck` (boolean, optional): Enable spell checking
- `maximum_number_of_urls` (number, optional): Maximum number of URLs to include (1-50)
- `maximum_number_of_tokens` (number, optional): Approximate maximum number of context tokens (1024-32768)
- `maximum_number_of_snippets` (number, optional): Maximum number of snippets to include (1-256)
- `context_threshold_mode` (string, optional): Threshold mode ("disabled", "strict", "lenient", "balanced")
- `maximum_number_of_tokens_per_url` (number, optional): Maximum tokens per URL (512-8192)
- `maximum_number_of_snippets_per_url` (number, optional): Maximum snippets per URL (1-100)
- `goggles` (string or array, optional): Goggle URL or definition for custom re-ranking
- `freshness` (string, optional): Time filter ("pd", "pw", "pm", "py", or date range)
- `enable_local` (boolean, optional): Enable local recall
- `enable_source_metadata` (boolean, optional): Include source metadata enrichment

**Optional request headers:**
- `x-loc-lat` (number, optional): Client latitude (-90 to 90)
- `x-loc-long` (number, optional): Client longitude (-180 to 180)
- `x-loc-city` (string, optional): Client city name
- `x-loc-state` (string, optional): Client state or region code
- `x-loc-state-name` (string, optional): Client state or region name
- `x-loc-country` (string, optional): Client country code
- `x-loc-postal-code` (string, optional): Client postal code
- `api-version` (string, optional): Brave API version (`YYYY-MM-DD`)
- `accept` (string, optional): Response media type ("application/json" or "*/*")
- `cache-control` (string, optional): Use `no-cache` to request fresh content
- `user-agent` (string, optional): User agent originating the request

## Configuration

### Getting an API Key

1. Sign up for a [Brave Search API account](https://brave.com/search/api/)
2. Choose a plan:
    - **Search**: The real-time search data your chatbots & agents need to generate answers. Complete search results (URLs, text, news, images, and more), with additional LLM context optimized for AI.
    - **Answers**: Summarized, completed answers to any question. Answers grounded on a single search or multiple searches for better accuracy & reduced hallucinations.
3. Generate your API key from the [developer dashboard](https://api-dashboard.search.brave.com/app/keys)

### Environment Variables

The server supports the following environment variables:

- `BRAVE_API_KEY`: Your Brave Search API key (required)
- `BRAVE_MCP_TRANSPORT`: Transport mode ("http" or "stdio", default: "stdio")
- `BRAVE_MCP_PORT`: HTTP server port (default: 8000)
- `BRAVE_MCP_HOST`: HTTP server host (default: "0.0.0.0")
- `BRAVE_MCP_LOG_LEVEL`: Desired logging level("debug", "info", "notice", "warning", "error", "critical", "alert", or "emergency", default: "info")
- `BRAVE_MCP_ENABLED_TOOLS`: When used, specifies a space-separated whitelist for supported tools
- `BRAVE_MCP_DISABLED_TOOLS`: When used, specifies a space-separated blacklist for supported tools
- `BRAVE_MCP_STATELESS`: HTTP stateless mode (default: "true").  When running on Amazon Bedrock Agentcore, set to "true".

### Command Line Options

```bash
node dist/index.js [options]

Options:
  --brave-api-key <string>    Brave API key
  --transport <stdio|http>    Transport type (default: stdio)
  --port <number>             HTTP server port (default: 8080)
  --host <string>             HTTP server host (default: 0.0.0.0)
  --logging-level <string>    Desired logging level (one of _debug_, _info_, _notice_, _warning_, _error_, _critical_, _alert_, or _emergency_)
  --enabled-tools             Tools whitelist (only the specified tools will be enabled)
  --disabled-tools            Tools blacklist (included tools will be disabled)
  --stateless  <boolean>      HTTP Stateless flag
```

## Installation

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### Docker

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "BRAVE_API_KEY", "docker.io/mcp/brave-search"],
      "env": {
        "BRAVE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

#### NPX

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@brave/brave-search-mcp-server", "--transport", "http"],
      "env": {
        "BRAVE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Usage with VS Code

For quick installation, use the one-click installation buttons below:

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=brave-search&inputs=%5B%7B%22password%22%3Atrue%2C%22id%22%3A%22brave-api-key%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Brave+Search+API+Key%22%7D%5D&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40brave%2Fbrave-search-mcp-server%22%2C%22--transport%22%2C%22stdio%22%5D%2C%22env%22%3A%7B%22BRAVE_API_KEY%22%3A%22%24%7Binput%3Abrave-api-key%7D%22%7D%7D) [![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-NPM-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=brave-search&inputs=%5B%7B%22password%22%3Atrue%2C%22id%22%3A%22brave-api-key%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Brave+Search+API+Key%22%7D%5D&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40brave%2Fbrave-search-mcp-server%22%2C%22--transport%22%2C%22stdio%22%5D%2C%22env%22%3A%7B%22BRAVE_API_KEY%22%3A%22%24%7Binput%3Abrave-api-key%7D%22%7D%7D&quality=insiders)  
[![Install with Docker in VS Code](https://img.shields.io/badge/VS_Code-Docker-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=brave-search&inputs=%5B%7B%22password%22%3Atrue%2C%22id%22%3A%22brave-api-key%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Brave+Search+API+Key%22%7D%5D&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22-i%22%2C%22--rm%22%2C%22-e%22%2C%22BRAVE_API_KEY%22%2C%22mcp%2Fbrave-search%22%5D%2C%22env%22%3A%7B%22BRAVE_API_KEY%22%3A%22%24%7Binput%3Abrave-api-key%7D%22%7D%7D) [![Install with Docker in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Docker-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=brave-search&inputs=%5B%7B%22password%22%3Atrue%2C%22id%22%3A%22brave-api-key%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Brave+Search+API+Key%22%7D%5D&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22-i%22%2C%22--rm%22%2C%22-e%22%2C%22BRAVE_API_KEY%22%2C%22mcp%2Fbrave-search%22%5D%2C%22env%22%3A%7B%22BRAVE_API_KEY%22%3A%22%24%7Binput%3Abrave-api-key%7D%22%7D%7D&quality=insiders)

For manual installation, add the following to your User Settings (JSON) or `.vscode/mcp.json`:

#### Docker

```json
{
  "inputs": [
    {
      "password": true,
      "id": "brave-api-key",
      "type": "promptString",
      "description": "Brave Search API Key",
    }
  ],
  "servers": {
    "brave-search": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "BRAVE_API_KEY", "mcp/brave-search"],
      "env": {
        "BRAVE_API_KEY": "${input:brave-api-key}"
      }
    }
  }
}
```

#### NPX

```json
{
  "inputs": [
    {
      "password": true,
      "id": "brave-api-key",
      "type": "promptString",
      "description": "Brave Search API Key",
    }
  ],
  "servers": {
    "brave-search-mcp-server": {
      "command": "npx",
      "args": ["-y", "@brave/brave-search-mcp-server", "--transport", "stdio"],
      "env": {
        "BRAVE_API_KEY": "${input:brave-api-key}"
      }
    }
  }
}
```

## Build

### Docker

```bash
docker build -t mcp/brave-search:latest .
```

### Local Build

```bash
npm install
npm run build
```

## Development

### Prerequisites

- Node.js 22.x or higher
- npm
- Brave Search API key

### Setup

1. Clone the repository:
```bash
git clone https://github.com/brave/brave-search-mcp-server.git
cd brave-search-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Testing via Claude Desktop

Add a reference to your local build in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "brave-search-dev": {
      "command": "node",
      "args": ["C:\\GitHub\\brave-search-mcp-server\\dist\\index.js"], // Verify your path
      "env": {
        "BRAVE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Testing via MCP Inspector

1. Build and start the server:
```bash
npm run build
node dist/index.js
```

2. In another terminal, start the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

STDIO is the default mode. For HTTP mode testing, add `--transport http` to the arguments in the Inspector UI.

### Available Scripts

- `npm run build`: Build the TypeScript project
- `npm run watch`: Watch for changes and rebuild
- `npm run format`: Format code with Prettier
- `npm run format:check`: Check code formatting
- `npm run prepare`: Format and build (runs automatically on npm install)

- `npm run inspector`: Launch an instance of MCP Inspector
- `npm run inspector:stdio`: Launch a instance of MCP Inspector, configured for STDIO

### Docker Compose

For local development with Docker:

```bash
docker-compose up --build
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
