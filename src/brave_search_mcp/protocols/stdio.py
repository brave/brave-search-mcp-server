"""STDIO transport for MCP server."""

import asyncio
from mcp.server.stdio import stdio_server

from brave_search_mcp.server import create_mcp_server


async def start() -> None:
    """Start the MCP server with STDIO transport."""
    server = create_mcp_server()

    # Run the server using stdio transport
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )
