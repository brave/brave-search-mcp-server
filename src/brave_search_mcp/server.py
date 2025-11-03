"""MCP Server implementation for Brave Search."""

from typing import Optional
from mcp.server import Server
from mcp.types import ServerCapabilities, LoggingCapabilities, ToolsCapabilities

from brave_search_mcp import __version__
from brave_search_mcp.config import SmitheryConfig, set_options, is_tool_permitted_by_user
from brave_search_mcp.tools import web
from brave_search_mcp.tools.registry import register_tool


# Register all tools
register_tool(web)


def create_mcp_server(config: Optional[SmitheryConfig] = None) -> Server:
    """
    Create and configure an MCP server instance.

    Args:
        config: Optional Smithery configuration

    Returns:
        Configured MCP Server instance
    """
    if config:
        set_options(config)

    # Create server
    server = Server(
        name="brave-search-mcp-server",
        version=__version__,
    )

    # Register capabilities
    @server.list_tools()
    async def list_tools():
        """List available tools."""
        tools = []

        # Web search tool
        if is_tool_permitted_by_user(web.name):
            tools.append({
                "name": web.name,
                "description": web.description,
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query (max 400 chars, 50 words)",
                        },
                        "country": {
                            "type": "string",
                            "description": "Search query country code",
                            "default": "US",
                        },
                        "search_lang": {
                            "type": "string",
                            "description": "Search language preference",
                            "default": "en",
                        },
                        "count": {
                            "type": "integer",
                            "description": "Number of results (1-20)",
                            "default": 10,
                            "minimum": 1,
                            "maximum": 20,
                        },
                        "safesearch": {
                            "type": "string",
                            "enum": ["off", "moderate", "strict"],
                            "description": "Content filtering level",
                            "default": "moderate",
                        },
                        "summary": {
                            "type": "boolean",
                            "description": "Enable summary key generation",
                        },
                    },
                    "required": ["query"],
                },
            })

        return tools

    # Register tool handler
    web.register(server)

    return server
