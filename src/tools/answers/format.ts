export type FormatAnswersContentOptions = {
  enable_research?: boolean;
  enable_citations?: boolean;
};

export type FormatAnswersContentResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'incomplete_research' | 'empty' };

const TAGGED_BLOCK_PATTERN = (tag: string) =>
  new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, 'g');

export function stripTaggedBlocks(text: string, tag: string): string {
  return text.replace(TAGGED_BLOCK_PATTERN(tag), '');
}

export function extractTaggedBlocks(text: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

export function extractResearchAnswer(text: string): string | null {
  const blocks = extractTaggedBlocks(text, 'answer');
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

export function formatAnswersContent(
  raw: string,
  options: FormatAnswersContentOptions = {}
): FormatAnswersContentResult {
  if (options.enable_research) {
    const answer = extractResearchAnswer(raw);
    if (!answer) {
      return { ok: false, reason: 'incomplete_research' };
    }
    return { ok: true, text: answer };
  }

  let text = stripTaggedBlocks(raw, 'usage');

  if (options.enable_citations) {
    text = stripTaggedBlocks(text, 'citation');
  }

  text = text.trim();
  if (text.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  return { ok: true, text };
}

export const INCOMPLETE_RESEARCH_MESSAGE =
  'Research did not complete with a synthesized answer. Try lowering research_maximum_number_of_iterations or increasing research_maximum_number_of_seconds.';
