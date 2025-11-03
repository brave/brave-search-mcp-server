"""Web search tool for Brave Search MCP Server."""

from typing import Any, Optional, Literal
from pydantic import BaseModel, Field
from mcp.server import Server
from mcp.types import Tool, TextContent

from brave_search_mcp.brave_api.client import issue_request
from brave_search_mcp.utils import stringify


# Input schema
class WebSearchParams(BaseModel):
    """Parameters for web search."""

    query: str = Field(
        ...,
        max_length=400,
        description="Search query (max 400 chars, 50 words)",
    )
    country: Optional[str] = Field(
        default="US",
        description="Search query country code",
    )
    search_lang: Optional[str] = Field(
        default="en",
        description="Search language preference",
    )
    ui_lang: Optional[str] = Field(
        default="en-US",
        description="UI language",
    )
    count: Optional[int] = Field(
        default=10,
        ge=1,
        le=20,
        description="Number of results (1-20, default 10)",
    )
    offset: Optional[int] = Field(
        default=0,
        ge=0,
        le=9,
        description="Pagination offset (max 9, default 0)",
    )
    safesearch: Optional[Literal["off", "moderate", "strict"]] = Field(
        default="moderate",
        description="Content filtering level",
    )
    freshness: Optional[str] = Field(
        default=None,
        description="Time filter (pd, pw, pm, py, or date range)",
    )
    text_decorations: Optional[bool] = Field(
        default=True,
        description="Include highlighting markers",
    )
    spellcheck: Optional[bool] = Field(
        default=True,
        description="Enable spell checking",
    )
    result_filter: Optional[list[str]] = Field(
        default=["web", "query"],
        description="Filter result types",
    )
    goggles: Optional[list[str]] = Field(
        default=None,
        description="Custom re-ranking definitions",
    )
    units: Optional[Literal["metric", "imperial"]] = Field(
        default=None,
        description="Measurement units",
    )
    extra_snippets: Optional[bool] = Field(
        default=None,
        description="Get additional excerpts",
    )
    summary: Optional[bool] = Field(
        default=None,
        description="Enable summary key generation",
    )


# Tool definition
name = "brave_web_search"
description = """
Performs web searches using the Brave Search API and returns comprehensive search results with rich metadata.

When to use:
    - General web searches for information, facts, or current topics
    - Location-based queries (restaurants, businesses, points of interest)
    - News searches for recent events or breaking stories
    - Finding videos, discussions, or FAQ content
    - Research requiring diverse result types (web pages, images, reviews, etc.)

Returns a JSON list of web results with title, description, and URL.

When the "results_filter" parameter is empty, JSON results may also contain FAQ, Discussions, News, and Video results.
"""


async def execute(params: dict[str, Any]) -> dict[str, Any]:
    """Execute web search."""
    # Validate params
    validated_params = WebSearchParams(**params)

    # Call Brave API
    response = await issue_request("web", validated_params.model_dump(exclude_none=True))

    # Format response
    content: list[TextContent] = []

    # Add summarizer key if present
    if "summarizer" in response and response["summarizer"]:
        content.append(
            TextContent(type="text", text=f"Summarizer key: {response['summarizer'].get('key')}")
        )

    # Add web results
    web = response.get("web")
    if not web or not web.get("results"):
        return {
            "content": [TextContent(type="text", text="No web results found")],
            "isError": True,
        }

    # Format web results
    for result in web.get("results", []):
        formatted = {
            "url": result.get("url"),
            "title": result.get("title"),
            "description": result.get("description"),
        }
        if "extra_snippets" in result:
            formatted["extra_snippets"] = result["extra_snippets"]
        content.append(TextContent(type="text", text=stringify(formatted)))

    # Add FAQ results if present
    if "faq" in response and response["faq"].get("results"):
        for result in response["faq"]["results"]:
            formatted = {
                "question": result.get("question"),
                "answer": result.get("answer"),
                "title": result.get("title"),
                "url": result.get("url"),
            }
            content.append(TextContent(type="text", text=stringify(formatted)))

    # Add news results if present
    if "news" in response and response["news"].get("results"):
        for result in response["news"]["results"]:
            formatted = {
                "url": result.get("url"),
                "title": result.get("title"),
                "description": result.get("description"),
                "source": result.get("source"),
                "age": result.get("age"),
            }
            content.append(TextContent(type="text", text=stringify(formatted)))

    # Add video results if present
    if "videos" in response and response["videos"].get("results"):
        for result in response["videos"]["results"]:
            formatted = {
                "url": result.get("url"),
                "title": result.get("title"),
                "description": result.get("description"),
                "age": result.get("age"),
            }
            if "thumbnail" in result:
                formatted["thumbnail_url"] = result["thumbnail"].get("src")
            content.append(TextContent(type="text", text=stringify(formatted)))

    return {"content": content, "isError": False}


def register(server: Server) -> None:
    """Register the web search tool with an MCP server."""

    @server.call_tool()
    async def call_tool(name_arg: str, arguments: dict[str, Any]) -> list[TextContent]:
        """Handle tool calls."""
        if name_arg == name:
            result = await execute(arguments)
            return result["content"]
        raise ValueError(f"Unknown tool: {name_arg}")
