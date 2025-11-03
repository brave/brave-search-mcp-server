# Brave Search MCP Server - Python Implementation

This is a Python port of the Brave Search MCP Server. It provides the same functionality as the TypeScript version but implemented in Python.

## Features

- ✅ Web Search (`brave_web_search`)
- ✅ STDIO and HTTP transports
- ✅ Full MCP protocol support
- ✅ Docker support
- 🚧 Additional tools (images, videos, news, local, summarizer) - Coming soon

## Requirements

- Python 3.10 or higher
- pip
- Brave Search API key

## Installation

### From Source

1. Clone the repository:
```bash
git clone https://github.com/brave/brave-search-mcp-server.git
cd brave-search-mcp-server
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install the package:
```bash
pip install -e .
```

### Using pip (when published)

```bash
pip install brave-search-mcp-server
```

## Usage

### Command Line

```bash
# STDIO mode (default)
python -m brave_search_mcp.main --brave-api-key YOUR_API_KEY

# HTTP mode
python -m brave_search_mcp.main --brave-api-key YOUR_API_KEY --transport http --port 8080
```

### Environment Variables

Create a `.env` file:

```bash
BRAVE_API_KEY=your_api_key_here
BRAVE_MCP_TRANSPORT=stdio
BRAVE_MCP_PORT=8080
BRAVE_MCP_HOST=0.0.0.0
BRAVE_MCP_LOG_LEVEL=info
```

Then run:

```bash
python -m brave_search_mcp.main
```

### Docker

Build the Docker image:

```bash
docker build -f Dockerfile.python -t brave-search-mcp-python .
```

Run with Docker:

```bash
docker run -e BRAVE_API_KEY=your_api_key_here brave-search-mcp-python
```

Or use docker-compose:

```bash
BRAVE_API_KEY=your_api_key_here docker-compose -f docker-compose.python.yml up
```

## Configuration

### Command Line Options

```bash
python -m brave_search_mcp.main --help

Options:
  --brave-api-key TEXT            Brave Search API key
  --transport [stdio|http]        Transport type (default: stdio)
  --port INTEGER                  HTTP server port (default: 8080)
  --host TEXT                     HTTP server host (default: 0.0.0.0)
  --logging-level [debug|info|notice|warning|error|critical|alert|emergency]
                                  Logging level (default: info)
  --enabled-tools TEXT            Tools to enable (whitelist)
  --disabled-tools TEXT           Tools to disable (blacklist)
  --help                          Show this message and exit
```

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### Python with venv

```json
{
  "mcpServers": {
    "brave-search-python": {
      "command": "/path/to/venv/bin/python",
      "args": ["-m", "brave_search_mcp.main"],
      "env": {
        "BRAVE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

#### Python with Docker

```json
{
  "mcpServers": {
    "brave-search-python": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "BRAVE_API_KEY", "brave-search-mcp-python"],
      "env": {
        "BRAVE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

## Development

### Setup Development Environment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install development dependencies
pip install -r requirements.txt
pip install -e .
```

### Code Formatting

```bash
# Format code
black src/

# Lint code
ruff check src/

# Type checking
mypy src/
```

### Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=brave_search_mcp
```

## Project Structure

```
src/brave_search_mcp/
├── __init__.py          # Package initialization
├── main.py              # Entry point
├── config.py            # Configuration management
├── constants.py         # Constants
├── utils.py             # Utility functions
├── server.py            # MCP server core
├── brave_api/           # Brave API client
│   ├── __init__.py
│   ├── client.py
│   └── types.py
├── tools/               # MCP tools
│   ├── __init__.py
│   ├── registry.py      # Tool registry
│   └── web.py          # Web search tool
└── protocols/           # Transport protocols
    ├── __init__.py
    ├── stdio.py         # STDIO transport
    └── http.py          # HTTP transport
```

## Differences from TypeScript Version

1. **Type System**: Uses Pydantic for runtime validation instead of Zod
2. **HTTP Framework**: Uses FastAPI instead of Express
3. **CLI Framework**: Uses Click instead of Commander
4. **Async**: Uses asyncio instead of native promises
5. **Package Management**: Uses pip/pyproject.toml instead of npm/package.json

## Roadmap

- [x] Core MCP server implementation
- [x] Web search tool
- [x] STDIO transport
- [x] HTTP transport
- [x] Docker support
- [ ] Image search tool
- [ ] Video search tool
- [ ] News search tool
- [ ] Local search tool
- [ ] Summarizer tool
- [ ] Comprehensive tests
- [ ] PyPI publication

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Original TypeScript implementation by Brave Software, Inc.
- Model Context Protocol by Anthropic
