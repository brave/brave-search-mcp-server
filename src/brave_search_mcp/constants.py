"""Constants for Brave Search MCP Server."""

from typing import Final

# Rate limiting configuration
RATE_LIMIT: Final[dict[str, int]] = {
    "per_second": 1,
    "per_month": 15000,
}
