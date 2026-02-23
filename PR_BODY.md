# feat: add proxy configuration support

This PR adds support for configuring a custom proxy URL for API requests.

## Changes

### New Features
- Add `BRAVE_PROXY_URL` environment variable support
- Add `--proxy-url` CLI option for runtime configuration
- Support HTTP, HTTPS, SOCKS4, and SOCKS5 proxy protocols

### Technical Details
- Added `proxy-agent` dependency for proxy support
- Updated configuration schema to include proxy options
- Modified `BraveAPI/index.ts` to use configured proxy

### Documentation
- Added proxy configuration section to README
- Documented all proxy types and usage examples

## Usage

**Environment Variable:**
```bash
export BRAVE_PROXY_URL="http://127.0.0.1:7890"
```

**CLI Option:**
```bash
node dist/index.js --brave-api-key YOUR_API_KEY --proxy-url "http://127.0.0.1:7890"
```

**Docker:**
```json
{
  "mcpServers": {
    "brave-search": {
      "env": {
        "BRAVE_PROXY_URL": "http://127.0.0.1:7890"
      }
    }
  }
}
```
