/**
 * Answers streams interleave answer text with tagged payloads such as
 * <usage>{...}</usage>. Each tag arrives as its own delta, while answer text is
 * split across deltas at arbitrary points, so only a delta that is exactly one
 * known tag is read as markup; tags written in the answer text are kept.
 * Research mode wraps its final answer in <answer>; single-search mode streams
 * the answer directly, with <citation> tags inline.
 */

const TAG_PATTERN =
  /^<(answer|citation|usage|queries|analyzing|thinking|progress|blindspots)>([\s\S]*)<\/\1>$/;

type Tag = { name: string; payload: string };
type CitationPayload = { number?: unknown; url?: unknown; snippet?: unknown };

function parseJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/** The trimmed value if it is an http(s) URL, so links never carry other schemes. */
function webUrl(value: unknown): string | undefined {
  const url = typeof value === 'string' ? value.trim() : '';
  return /^https?:\/\//i.test(url) ? url : undefined;
}

/** Collapses whitespace so payload text stays on one markdown line. */
function inlineText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

/** The tag a delta consists of, or undefined when the delta is answer text. */
function parseTag(delta: string): Tag | undefined {
  const match = TAG_PATTERN.exec(delta);
  return match ? { name: match[1], payload: match[2].trim() } : undefined;
}

/** The last <answer> payload, unwrapped from its `{"answer": ...}` JSON. */
function lastResearchAnswer(deltas: string[]): string | undefined {
  let answer: string | undefined;

  for (const delta of deltas) {
    const tag = parseTag(delta);
    if (tag?.name !== 'answer') continue;

    const payload = parseJson<{ answer?: unknown }>(tag.payload);
    answer = typeof payload?.answer === 'string' ? payload.answer : tag.payload;
  }

  return answer;
}

/** Records a citation's footnote and returns its marker; drops citations lacking a number or web URL. */
function citationMarker(payload: string, footnotes: Map<number, string>): string {
  const { number, url, snippet }: CitationPayload = parseJson<CitationPayload>(payload) ?? {};
  const href = webUrl(url);
  if (typeof number !== 'number' || href === undefined) return '';

  const excerpt = inlineText(snippet);
  footnotes.set(
    number,
    `[^${number}]: [${hostnameOf(href)}](${href})${excerpt ? ` — ${excerpt}` : ''}`
  );
  return `[^${number}]`;
}

/** Joins the streamed text as markdown, rendering citations as footnotes. */
function formatStreamedText(deltas: string[]): string {
  const footnotes = new Map<number, string>();
  let body = '';

  for (const delta of deltas) {
    const tag = parseTag(delta);

    switch (tag?.name) {
      // <answer> only wraps research answers; anywhere else it is answer text.
      case undefined:
      case 'answer':
        body += delta;
        break;
      case 'citation':
        body += citationMarker(tag.payload, footnotes);
        break;
      // The remaining tags are metadata such as <usage>.
    }
  }

  if (footnotes.size === 0) return body;

  const definitions = [...footnotes.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, footnote]) => footnote);

  return `${body.trimEnd()}\n\n${definitions.join('\n')}`;
}

/**
 * Formats the streamed deltas as markdown, or returns null if no answer remains.
 * In research mode the last <answer> is returned as written.
 */
export function formatAnswer(deltas: string[], { research }: { research: boolean }): string | null {
  const answer = (research ? lastResearchAnswer(deltas) : undefined) ?? formatStreamedText(deltas);
  const formatted = answer.trim();
  return formatted.length > 0 ? formatted : null;
}
