/** URL helpers shared by the tools' output formatters. */

/**
 * Percent-encodes a URL's parentheses if any are unmatched, so it can be used
 * in a markdown link. Matched parentheses are valid there, as in Wikipedia's
 * ".../Revolver_(Beatles_album)", but an unmatched one would end the link
 * early or stop it from forming.
 */
export function encodeUnmatchedParentheses(url: string): string {
  let depth = 0;
  for (const char of url) {
    if (char === '(') depth++;
    else if (char === ')' && --depth < 0) break;
  }
  return depth === 0 ? url : url.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/** The URL's hostname without a leading "www.", or the URL itself if it doesn't parse. */
export function getDisplayHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}
