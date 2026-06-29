type FormatAnswersContentOptions = {
  enable_research?: boolean;
  enable_citations?: boolean;
  enable_entities?: boolean;
};

type FormatAnswersContentResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'incomplete_research' | 'empty' };

type EnumItemPayload = {
  uuid?: string;
  original_tokens?: string;
  citations?: Record<string, unknown>;
  name?: string;
  href?: string;
};

type CitationPayload = {
  start_index?: number;
  end_index?: number;
  number?: number;
  url?: string;
  favicon?: string;
  snippet?: string;
};

const USAGE_BLOCK_PATTERN = /<usage>[\s\S]*?<\/usage>/g;
const CITATION_CAPTURE_PATTERN = /<citation>([\s\S]*?)<\/citation>/g;
const ENUM_ITEM_CAPTURE_PATTERN = /<enum_item>([\s\S]*?)<\/enum_item>/g;
const ENUM_LIST_CONTAINER_CAPTURE_PATTERN =
  /<enum_start>([\s\S]*?)<\/enum_start>([\s\S]*?)<enum_end>[\s\S]*?<\/enum_end>/g;
const ANSWER_CAPTURE_PATTERN = /<answer>([\s\S]*?)<\/answer>/g;

function citationLinkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function formatCitationFootnote(citation: CitationPayload): string {
  const number = citation.number;
  const url = citation.url?.trim();
  if (number === undefined || !url) return '';

  const label = citationLinkLabel(url);
  const snippet = citation.snippet?.trim();
  const snippetSuffix = snippet ? ` — ${snippet}` : '';
  return `[^${number}]: [${label}](${url})${snippetSuffix}`;
}

/**
 * Performs an in-place replacement of citation blocks with markdown footnote markers. Returns an object containing the modified body text and an optional array of markdown footnote definitions. If no citations were present in the text, the citations property will be undefined.
 */
export function replaceCitationBlocks(text: string): { body: string; citations?: string[] } {
  const citationMap = new Map<number, CitationPayload>();

  const body = text.replace(CITATION_CAPTURE_PATTERN, (_match, inner: string) => {
    const trimmed = inner.trim();
    if (trimmed.length === 0) return '';

    try {
      const parsed = JSON.parse(trimmed) as CitationPayload;
      if (typeof parsed.number !== 'number' || !Number.isFinite(parsed.number)) {
        return '';
      }

      citationMap.set(parsed.number, parsed);
      return `[^${parsed.number}]`;
    } catch {
      return '';
    }
  });

  if (citationMap.size === 0) return { body: body.trimEnd(), citations: undefined };

  const citations = [...citationMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, citation]) => formatCitationFootnote(citation))
    .filter((line) => line.length > 0);

  return { body: body.trimEnd(), citations };
}

function formatEnumItemInner(inner: string, listType: 'ul' | 'ol' = 'ul', index = 1): string {
  const trimmed = inner.trim();
  if (trimmed.length === 0) return '';

  try {
    const parsed = JSON.parse(trimmed) as EnumItemPayload;
    const label = parsed.original_tokens?.trim() || parsed.name?.trim();
    if (!label) return '';

    let content = label;
    if (parsed.href) {
      const href = parsed.href.trim();
      if (/^https?:\/\//i.test(href)) {
        content = `[${label}](${href})`;
      }
    }

    const marker = listType === 'ol' ? `${index}. ` : '* ';
    return `${marker}${content}`;
  } catch {
    return '';
  }
}

function formatEnumListItems(itemsText: string, listType: 'ul' | 'ol'): string {
  const lines: string[] = [];
  let index = 1;

  for (const match of itemsText.matchAll(ENUM_ITEM_CAPTURE_PATTERN)) {
    const line = formatEnumItemInner(match[1], listType, index);
    if (line.length === 0) continue;

    lines.push(line);
    if (listType === 'ol') {
      index++;
    }
  }

  if (lines.length === 0) return '';

  return `\n${lines.join('\n')}`;
}

/**
 * Performs an in-place replacement of enum list containers and standalone enum_item blocks with markdown list items. Returns the modified text.
 */
export function replaceEnumItemBlocks(text: string): string {
  // First, replace all enum list containers with the formatted list items
  let result = text.replace(
    ENUM_LIST_CONTAINER_CAPTURE_PATTERN,
    (_match, listTypeRaw: string, itemsText: string) => {
      const listType = listTypeRaw.trim() === 'ol' ? 'ol' : 'ul';
      return formatEnumListItems(itemsText, listType);
    }
  );

  // Then, replace all standalone enum_item blocks with the formatted list items
  result = result.replace(ENUM_ITEM_CAPTURE_PATTERN, (_match, inner: string) => {
    const formatted = formatEnumItemInner(inner);
    return formatted.length > 0 ? `\n${formatted}` : '';
  });

  return result;
}

export function extractResearchAnswer(text: string): string | null {
  const blocks: string[] = [];

  for (const match of text.matchAll(ANSWER_CAPTURE_PATTERN)) {
    blocks.push(match[1]);
  }

  if (blocks.length === 0) return null;

  const inner = blocks.pop()?.trim();
  if (inner === undefined || inner.length === 0) return null;

  try {
    const parsed = JSON.parse(inner) as { answer?: string };
    if (typeof parsed.answer === 'string' && parsed.answer.length > 0) {
      return parsed.answer;
    }
  } catch {
    // Unable to parse as JSON. Return as-is at end of function.
  }

  return inner;
}

function normalizeAnswerText(text: string, options: FormatAnswersContentOptions): string {
  let normalized = text.replace(USAGE_BLOCK_PATTERN, '');

  if (options.enable_entities) {
    normalized = replaceEnumItemBlocks(normalized);
  }

  if (options.enable_citations) {
    const { body, citations } = replaceCitationBlocks(normalized);
    normalized = body;
    citations?.forEach((citation) => {
      normalized += `\n\n${citation}`;
    });
  }

  return normalized.trim();
}

export function formatAnswersContent(
  raw: string,
  options: FormatAnswersContentOptions = {}
): FormatAnswersContentResult {
  if (options.enable_research) {
    const answer = extractResearchAnswer(raw);
    if (!answer) {
      return { ok: false, reason: 'incomplete_research' };
    }

    const text = normalizeAnswerText(answer, options);
    if (text.length === 0) {
      return { ok: false, reason: 'empty' };
    }

    return { ok: true, text };
  }

  const text = normalizeAnswerText(raw, options);
  if (text.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  return { ok: true, text };
}

export const INCOMPLETE_RESEARCH_MESSAGE =
  'Research did not complete with a synthesized answer. Try lowering research_maximum_number_of_iterations or increasing research_maximum_number_of_seconds.';
