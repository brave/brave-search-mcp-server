#!/usr/bin/env python3
"""Main entry point for Brave Search MCP Server."""

import asyncio
import sys
import click

from brave_search_mcp.config import get_options


@click.command()
@click.option(
    "--brave-api-key",
    envvar="BRAVE_API_KEY",
    help="Brave Search API key",
)
@click.option(
    "--transport",
    type=click.Choice(["stdio", "http"]),
    default="stdio",
    envvar="BRAVE_MCP_TRANSPORT",
    help="Transport type (default: stdio)",
)
@click.option(
    "--port",
    type=int,
    default=8080,
    envvar="BRAVE_MCP_PORT",
    help="HTTP server port (default: 8080)",
)
@click.option(
    "--host",
    default="0.0.0.0",
    envvar="BRAVE_MCP_HOST",
    help="HTTP server host (default: 0.0.0.0)",
)
@click.option(
    "--logging-level",
    type=click.Choice([
        "debug",
        "info",
        "notice",
        "warning",
        "error",
        "critical",
        "alert",
        "emergency",
    ]),
    default="info",
    envvar="BRAVE_MCP_LOG_LEVEL",
    help="Logging level (default: info)",
)
@click.option(
    "--enabled-tools",
    multiple=True,
    envvar="BRAVE_MCP_ENABLED_TOOLS",
    help="Tools to enable (whitelist)",
)
@click.option(
    "--disabled-tools",
    multiple=True,
    envvar="BRAVE_MCP_DISABLED_TOOLS",
    help="Tools to disable (blacklist)",
)
def main(
    brave_api_key: str,
    transport: str,
    port: int,
    host: str,
    logging_level: str,
    enabled_tools: tuple,
    disabled_tools: tuple,
) -> None:
    """Brave Search MCP Server - Python Implementation."""
    # Validate and get options
    options = get_options(
        brave_api_key=brave_api_key,
        transport=transport,
        port=port,
        host=host,
        logging_level=logging_level,
        enabled_tools=list(enabled_tools),
        disabled_tools=list(disabled_tools),
    )

    if not options:
        click.echo("Error: Invalid configuration", err=True)
        sys.exit(1)

    # Start the appropriate transport
    if options.transport == "http":
        from brave_search_mcp.protocols.http import start as http_start

        http_start()
    else:
        from brave_search_mcp.protocols.stdio import start as stdio_start

        try:
            asyncio.run(stdio_start())
        except KeyboardInterrupt:
            click.echo("\nShutting down...")
            sys.exit(0)
        except Exception as e:
            click.echo(f"Error: {e}", err=True)
            sys.exit(1)


if __name__ == "__main__":
    main()
