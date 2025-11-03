"""Configuration management for Brave Search MCP Server."""

import os
from typing import Optional, Literal
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import click

# Load environment variables
load_dotenv()

LoggingLevel = Literal[
    "debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"
]

TransportType = Literal["stdio", "http"]


class SmitheryConfig(BaseModel):
    """Configuration schema for Smithery.ai."""

    brave_api_key: str = Field(description="Your Brave Search API key")
    enabled_tools: Optional[list[str]] = Field(
        default=None,
        description="Enforces a tool whitelist (cannot be used with disabled_tools)",
    )
    disabled_tools: Optional[list[str]] = Field(
        default=None,
        description="Enforces a tool blacklist (cannot be used with enabled_tools)",
    )
    logging_level: LoggingLevel = Field(
        default="info",
        description="Desired logging level",
    )


class Configuration(BaseModel):
    """Main configuration class."""

    transport: TransportType = "stdio"
    port: int = 8080
    host: str = "0.0.0.0"
    brave_api_key: str = ""
    logging_level: LoggingLevel = "info"
    enabled_tools: list[str] = Field(default_factory=list)
    disabled_tools: list[str] = Field(default_factory=list)
    ready: bool = False


# Global state
_state = Configuration(
    transport=os.getenv("BRAVE_MCP_TRANSPORT", "stdio"),  # type: ignore
    port=int(os.getenv("BRAVE_MCP_PORT", "8080")),
    host=os.getenv("BRAVE_MCP_HOST", "0.0.0.0"),
    brave_api_key=os.getenv("BRAVE_API_KEY", ""),
    logging_level=os.getenv("BRAVE_MCP_LOG_LEVEL", "info"),  # type: ignore
    enabled_tools=[],
    disabled_tools=[],
    ready=False,
)


def is_tool_permitted_by_user(tool_name: str) -> bool:
    """Check if a tool is permitted based on user configuration."""
    if len(_state.enabled_tools) > 0:
        return tool_name in _state.enabled_tools
    return tool_name not in _state.disabled_tools


def get_options(
    brave_api_key: Optional[str] = None,
    transport: Optional[str] = None,
    port: Optional[int] = None,
    host: Optional[str] = None,
    logging_level: Optional[str] = None,
    enabled_tools: Optional[list[str]] = None,
    disabled_tools: Optional[list[str]] = None,
) -> Optional[Configuration]:
    """
    Get and validate configuration options.

    Args:
        brave_api_key: Brave Search API key
        transport: Transport type (stdio or http)
        port: Port for HTTP transport
        host: Host for HTTP transport
        logging_level: Logging level
        enabled_tools: List of tools to enable (whitelist)
        disabled_tools: List of tools to disable (blacklist)

    Returns:
        Configuration object if valid, None otherwise
    """
    global _state

    # Import here to avoid circular dependency
    from brave_search_mcp.tools.registry import get_all_tool_names

    tool_names = get_all_tool_names()

    # Use provided values or fall back to current state
    brave_api_key = brave_api_key or _state.brave_api_key
    transport = transport or _state.transport  # type: ignore
    port = port or _state.port
    host = host or _state.host
    logging_level = logging_level or _state.logging_level  # type: ignore
    enabled_tools = enabled_tools or _state.enabled_tools
    disabled_tools = disabled_tools or _state.disabled_tools

    # Validate tool inclusion configuration
    if enabled_tools and disabled_tools:
        click.echo("Error: --enabled-tools and --disabled-tools cannot be used together", err=True)
        return None

    invalid_tools = [t for t in enabled_tools + disabled_tools if t not in tool_names]
    if invalid_tools:
        click.echo(
            f"Error: Invalid tool name(s): {', '.join(invalid_tools)}. "
            f"Must be one of: {', '.join(tool_names)}",
            err=True,
        )
        return None

    # Validate transport
    if transport not in ["stdio", "http"]:
        click.echo(
            f"Error: Invalid --transport value: '{transport}'. Must be one of: stdio, http.",
            err=True,
        )
        return None

    # Validate logging level
    valid_logging_levels = [
        "debug",
        "info",
        "notice",
        "warning",
        "error",
        "critical",
        "alert",
        "emergency",
    ]
    if logging_level not in valid_logging_levels:
        click.echo(
            f"Error: Invalid --logging-level value: '{logging_level}'. "
            f"Must be one of: {', '.join(valid_logging_levels)}",
            err=True,
        )
        return None

    # Validate API key
    if not brave_api_key:
        click.echo(
            "Error: --brave-api-key is required. "
            "You can get one at https://brave.com/search/api/.",
            err=True,
        )
        return None

    # Validate HTTP-specific options
    if transport == "http":
        if port < 1 or port > 65535:
            click.echo(
                f"Error: Invalid --port value: '{port}'. "
                f"Must be a valid port number between 1 and 65535.",
                err=True,
            )
            return None

        if not host:
            click.echo("Error: --host is required for HTTP transport", err=True)
            return None

    # Update state
    _state.brave_api_key = brave_api_key
    _state.transport = transport  # type: ignore
    _state.port = port
    _state.host = host
    _state.logging_level = logging_level  # type: ignore
    _state.enabled_tools = enabled_tools
    _state.disabled_tools = disabled_tools
    _state.ready = True

    return _state


def set_options(options: SmitheryConfig) -> Configuration:
    """Set options from Smithery config."""
    global _state
    _state.brave_api_key = options.brave_api_key
    if options.enabled_tools:
        _state.enabled_tools = options.enabled_tools
    if options.disabled_tools:
        _state.disabled_tools = options.disabled_tools
    _state.logging_level = options.logging_level
    _state.ready = True
    return _state


def get_config() -> Configuration:
    """Get the current configuration state."""
    return _state
