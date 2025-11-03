"""Type definitions for Brave Search API."""

from typing import TypedDict, Any, Literal


class RateLimitMeta(TypedDict):
    """Rate limit metadata."""

    plan: str
    rate_limit: int
    rate_current: int
    quota_limit: int
    quota_current: int
    component: Literal["rate_limiter"]


class RateLimitError(TypedDict):
    """Rate limit error details."""

    id: str
    status: int
    code: Literal["RATE_LIMITED"]
    detail: str
    meta: RateLimitMeta


class RateLimitErrorResponse(TypedDict):
    """Rate limit error response."""

    type: Literal["ErrorResponse"]
    error: RateLimitError
    time: int


# Endpoint type mapping will be defined in each tool module
EndpointName = Literal["web", "images", "videos", "news", "localPois", "localDescriptions", "summarizer"]
