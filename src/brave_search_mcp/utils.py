"""Utility functions for Brave Search MCP Server."""

import json
import time
from typing import Any
from brave_search_mcp.constants import RATE_LIMIT


class RateLimitTracker:
    """Track and enforce rate limits."""

    def __init__(self) -> None:
        self.request_count = {"second": 0, "month": 0, "last_reset": time.time()}

    def check_rate_limit(self) -> None:
        """Check if rate limit has been exceeded."""
        now = time.time()
        if now - self.request_count["last_reset"] > 1.0:
            self.request_count["second"] = 0
            self.request_count["last_reset"] = now

        if (
            self.request_count["second"] >= RATE_LIMIT["per_second"]
            or self.request_count["month"] >= RATE_LIMIT["per_month"]
        ):
            raise Exception("Rate limit exceeded")

        self.request_count["second"] += 1
        self.request_count["month"] += 1


# Global rate limit tracker instance
_rate_limiter = RateLimitTracker()


def check_rate_limit() -> None:
    """Check the global rate limit."""
    _rate_limiter.check_rate_limit()


def stringify(data: Any, pretty: bool = False) -> str:
    """Convert data to JSON string."""
    if pretty:
        return json.dumps(data, indent=2, ensure_ascii=False)
    return json.dumps(data, ensure_ascii=False)
