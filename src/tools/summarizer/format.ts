import { encodeUnmatchedParentheses, getDisplayHostname } from '../urls.js';
import type { SummaryEntity, SummaryMessage } from './types.js';

/**
 * An entity as a list item: its name, linked when it has a URL, then its
 * description. A description sometimes begins with its own separator
 * ("– 828 m"), which is dropped so every item uses the same one. A separator
 * is followed by a space, which tells it apart from a minus sign ("-10 °C").
 */
function entityItem({ name, url, text }: SummaryEntity): string {
  const label = url ? `[${name}](${encodeUnmatchedParentheses(url)})` : name;
  const description = text?.trim().replace(/^[:–—-]\s+/, '');
  return description ? `${label} – ${description}` : label;
}

/**
 * Joins the parts of a summary message into markdown. Tokens are kept as
 * written, and the entities between enum_start and enum_end become a list.
 * The tokens around a list do not reliably end or begin with a line break, so
 * the list is set apart by blank lines.
 *
 * Inline references become footnote markers, with one footnote per source
 * URL listed after the summary. References often come several at a time and
 * cite the same sources repeatedly, so this keeps each URL out of the text.
 */
export function formatSummary(summary: SummaryMessage[]): string {
  let text = '';
  let ordered = false;
  let itemNumber = 0;
  // Each source URL's footnote number, in order of first reference.
  const footnotes = new Map<string, number>();

  for (const part of summary) {
    switch (part.type) {
      case 'token':
        text += part.data;
        break;
      case 'inline_reference': {
        const number = footnotes.get(part.data.url) ?? footnotes.size + 1;
        footnotes.set(part.data.url, number);
        text += `[^${number}]`;
        break;
      }
      case 'enum_start':
        ordered = part.data === 'ol';
        itemNumber = 0;
        text = `${text.trimEnd()}\n\n`;
        break;
      case 'enum_item':
        itemNumber += 1;
        text += `${ordered ? `${itemNumber}.` : '-'} ${entityItem(part.data)}\n`;
        break;
      case 'enum_end':
        text += '\n';
        break;
    }
  }

  const body = text.trim();
  if (footnotes.size === 0) return body;

  const definitions = [...footnotes].map(
    ([url, number]) =>
      `[^${number}]: [${getDisplayHostname(url)}](${encodeUnmatchedParentheses(url)})`
  );
  return `${body}\n\n${definitions.join('\n')}`;
}
