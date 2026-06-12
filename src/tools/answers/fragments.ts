import { CitationSchema, type Citation } from './schemas/output.js';

// Brave embeds two kinds of structured metadata inside delta.content chunks:
//
//  <usage>{JSON}</usage>
//    Per-request cost/token accounting, always the second-to-last chunk.
//    Mirrors the HTTP response headers. Discard; callers do not need it.
//
//  <citation>{JSON}</citation>
//    Structured citation data, present only when enable_citations: true.
//    JSON shape: { number, url, favicon, snippet?, start_index, end_index }
//    Strip from content; surface as the structured citations array instead.

const USAGE_PREFIX = '<usage>';
const CITATION_PREFIX = '<citation>';
const CITATION_SUFFIX = '</citation>';

export enum FragmentKind {
  USAGE = 'usage',
  CITATION = 'citation',
  TEXT = 'text',
}

type BraveFragment =
  | { kind: FragmentKind.USAGE }
  | { kind: FragmentKind.CITATION; data: Citation }
  | { kind: FragmentKind.TEXT };

export function classifyFragment(content: string): BraveFragment {
  if (content.startsWith(USAGE_PREFIX)) {
    return { kind: FragmentKind.USAGE };
  }

  if (content.startsWith(CITATION_PREFIX)) {
    const inner = content.endsWith(CITATION_SUFFIX)
      ? content.slice(CITATION_PREFIX.length, -CITATION_SUFFIX.length)
      : content.slice(CITATION_PREFIX.length);
    try {
      const result = CitationSchema.safeParse(JSON.parse(inner));
      if (result.success) {
        return { kind: FragmentKind.CITATION, data: result.data };
      }
    } catch {
      // Malformed citation — fall through to TEXT
    }
  }

  return { kind: FragmentKind.TEXT };
}
