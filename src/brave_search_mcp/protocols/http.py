"""HTTP transport for MCP server."""

from typing import Dict
from uuid import uuid4
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import uvicorn

from brave_search_mcp.config import get_config
from brave_search_mcp.server import create_mcp_server


# Store active transports by session ID
transports: Dict[str, any] = {}


def create_app() -> FastAPI:
    """Create FastAPI application for HTTP transport."""
    app = FastAPI(title="Brave Search MCP Server")

    @app.post("/mcp")
    async def handle_mcp(request: Request):
        """Handle MCP requests over HTTP."""
        try:
            # Get or create session
            session_id = request.headers.get("mcp-session-id")
            body = await request.json()

            # For now, create a new server for each request
            # In production, you'd want to cache these by session
            server = create_mcp_server()

            # Process the request through the MCP server
            # This is a simplified version - full implementation would need
            # proper session management and transport handling
            response_data = {
                "jsonrpc": "2.0",
                "id": body.get("id"),
                "result": {"status": "ok"},
            }

            return JSONResponse(content=response_data)

        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32603, "message": "Internal server error"},
                },
            )

    @app.get("/ping")
    async def ping():
        """Health check endpoint."""
        return {"message": "pong"}

    return app


def start() -> None:
    """Start the HTTP server."""
    config = get_config()

    if not config.ready:
        print("Error: Invalid configuration")
        return

    app = create_app()

    print(f"Server is running on http://{config.host}:{config.port}/mcp")

    uvicorn.run(
        app,
        host=config.host,
        port=config.port,
        log_level=config.logging_level,
    )
