export type FormatAnswersContentOptions = {
  enable_research?: boolean;
  enable_citations?: boolean;
  enable_entities?: boolean;
};

export type FormatAnswersContentResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'incomplete_research' | 'empty' };

const USAGE_BLOCK_PATTERN = /<usage>[\s\S]*?<\/usage>/g;
const CITATION_BLOCK_PATTERN = /<citation>[\s\S]*?<\/citation>/g;
const ENUM_ITEM_CAPTURE_PATTERN = /<enum_item>([\s\S]*?)<\/enum_item>/g;
const ENUM_START_BLOCK_PATTERN = /<enum_start>[\s\S]*?<\/enum_start>/g;
const ENUM_END_BLOCK_PATTERN = /<enum_end>[\s\S]*?<\/enum_end>/g;
const ANSWER_CAPTURE_PATTERN = /<answer>([\s\S]*?)<\/answer>/g;

type EnumItemPayload = {
  original_tokens?: string;
  name?: string;
  href?: string;
};

export function stripUsageBlocks(text: string): string {
  return text.replace(USAGE_BLOCK_PATTERN, '');
}

export function stripCitationBlocks(text: string): string {
  return text.replace(CITATION_BLOCK_PATTERN, '');
}

export function stripEnumListMarkerBlocks(text: string): string {
  return text.replace(ENUM_START_BLOCK_PATTERN, '').replace(ENUM_END_BLOCK_PATTERN, '');
}

function formatEnumItemInner(inner: string): string {
  const trimmed = inner.trim();
  if (trimmed.length === 0) return '';

  try {
    const parsed = JSON.parse(trimmed) as EnumItemPayload;
    const label = parsed.original_tokens?.trim() || parsed.name?.trim();
    if (!label) return '';

    if (parsed.href) {
      return `* [${label}](${parsed.href})`;
    }
    return `* ${label}`;
  } catch {
    return '';
  }
}

export function replaceEnumItemBlocks(text: string): string {
  return text.replace(ENUM_ITEM_CAPTURE_PATTERN, (_match, inner: string) => {
    const formatted = formatEnumItemInner(inner);
    return formatted.length > 0 ? `\n${formatted}` : '';
  });
}

export function extractAnswerBlocks(text: string): string[] {
  const blocks: string[] = [];

  for (const match of text.matchAll(ANSWER_CAPTURE_PATTERN)) {
    blocks.push(match[1]);
  }

  return blocks;
}

export function extractResearchAnswer(text: string): string | null {
  const blocks = extractAnswerBlocks(text);
  if (blocks.length === 0) return null;

  const inner = blocks[blocks.length - 1].trim();
  if (inner.length === 0) return null;

  try {
    const parsed = JSON.parse(inner) as { answer?: string };
    if (typeof parsed.answer === 'string' && parsed.answer.length > 0) {
      return parsed.answer;
    }
  } catch {
    return inner;
  }

  return null;
}

function normalizeAnswerText(text: string, options: FormatAnswersContentOptions): string {
  let normalized = stripUsageBlocks(text);

  if (options.enable_entities) {
    normalized = replaceEnumItemBlocks(normalized);
    normalized = stripEnumListMarkerBlocks(normalized);
  }

  if (options.enable_citations) {
    normalized = stripCitationBlocks(normalized);
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
