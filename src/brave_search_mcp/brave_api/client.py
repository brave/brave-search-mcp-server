"""Brave Search API client."""

import httpx
from typing import Any, Optional
from urllib.parse import urlencode
from brave_search_mcp.config import get_config
from brave_search_mcp.utils import stringify
from brave_search_mcp.brave_api.types import EndpointName


# Mapping of endpoint names to API paths
ENDPOINT_PATHS: dict[str, str] = {
    "images": "/res/v1/images/search",
    "localPois": "/res/v1/local/pois",
    "localDescriptions": "/res/v1/local/descriptions",
    "news": "/res/v1/news/search",
    "videos": "/res/v1/videos/search",
    "web": "/res/v1/web/search",
    "summarizer": "/res/v1/summarizer/search",
}


def get_default_request_headers() -> dict[str, str]:
    """Get default HTTP headers for API requests."""
    config = get_config()
    return {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": config.brave_api_key,
    }


def is_valid_goggle_url(url: str) -> bool:
    """Validate that a goggle URL uses HTTPS."""
    try:
        from urllib.parse import urlparse

        return urlparse(url).scheme == "https"
    except Exception:
        return False


async def issue_request(
    endpoint: EndpointName,
    parameters: dict[str, Any],
    request_headers: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    """
    Issue a request to the Brave Search API.

    Args:
        endpoint: The API endpoint to call
        parameters: Query parameters for the request
        request_headers: Optional custom headers

    Returns:
        The API response as a dictionary

    Raises:
        Exception: If the API request fails
    """
    # Determine URL and setup parameters
    base_url = "https://api.search.brave.com"
    path = ENDPOINT_PATHS[endpoint]
    url = f"{base_url}{path}"

    query_params: list[tuple[str, str]] = []

    # Build query parameters
    for key, value in parameters.items():
        # Handle 'ids' parameter for local endpoints (can appear multiple times)
        if endpoint in ["localPois", "localDescriptions"]:
            if key == "ids":
                if isinstance(value, list) and len(value) > 0:
                    for id_val in value:
                        query_params.append((key, str(id_val)))
                elif isinstance(value, str):
                    query_params.append((key, value))
                continue

        # Handle result_filter parameter
        if key == "result_filter":
            # Handle special behavior of 'summary' parameter
            if parameters.get("summary") is True:
                query_params.append((key, "summarizer"))
            elif isinstance(value, list) and len(value) > 0:
                query_params.append((key, ",".join(value)))
            continue

        # Handle goggles parameter(s)
        if key == "goggles":
            if isinstance(value, str):
                query_params.append((key, value))
            elif isinstance(value, list):
                for goggle_url in value:
                    if is_valid_goggle_url(goggle_url):
                        query_params.append((key, goggle_url))
            continue

        # Handle regular parameters
        if value is not None:
            param_key = "q" if key == "query" else key
            query_params.append((param_key, str(value)))

    # Prepare headers
    headers = {**get_default_request_headers(), **(request_headers or {})}

    # Issue request
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=query_params, headers=headers)

        # Handle errors
        if not response.is_success:
            error_message = f"{response.status_code} {response.reason_phrase}"

            try:
                response_body = response.json()
                error_message += f"\n{stringify(response_body, pretty=True)}"
            except Exception:
                error_message += f"\n{response.text}"

            raise Exception(error_message)

        # Return response
        return response.json()


# Synchronous wrapper for backwards compatibility
def issue_request_sync(
    endpoint: EndpointName,
    parameters: dict[str, Any],
    request_headers: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    """Synchronous wrapper for issue_request."""
    import asyncio

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(issue_request(endpoint, parameters, request_headers))
