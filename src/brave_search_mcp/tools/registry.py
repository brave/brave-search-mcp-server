"""Tool registry for managing MCP tools."""

from typing import Protocol, Any
from mcp.server import Server


class MCPTool(Protocol):
    """Protocol for MCP tools."""

    name: str
    description: str

    async def execute(self, **kwargs: Any) -> dict[str, Any]:
        """Execute the tool."""
        ...

    def register(self, server: Server) -> None:
        """Register the tool with an MCP server."""
        ...


# Global registry of tools
_TOOLS: dict[str, Any] = {}


def register_tool(tool: Any) -> None:
    """Register a tool in the global registry."""
    _TOOLS[tool.name] = tool


def get_tool(name: str) -> Any:
    """Get a tool by name."""
    return _TOOLS.get(name)


def get_all_tools() -> dict[str, Any]:
    """Get all registered tools."""
    return _TOOLS.copy()


def get_all_tool_names() -> list[str]:
    """Get all registered tool names."""
    return list(_TOOLS.keys())
