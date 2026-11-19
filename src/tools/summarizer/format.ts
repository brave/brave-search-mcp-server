import type { SummaryEntity, SummaryMessage } from './types.js';

/**
 * An entity as a list item: its name, linked when it has a URL, then its
 * description. A description sometimes begins with its own separator
 * ("– 828 m"), which is dropped so every item uses the same one.
 */
function entityItem({ name, url, text }: SummaryEntity): string {
  const label = url ? `[${name}](${url})` : name;
  const description = text?.replace(/^[\s:–—-]+/, '');
  return description ? `${label} – ${description}` : label;
}

/**
 * Joins the parts of a summary message into markdown. Tokens are kept as
 * written, inline references become ` (url)`, and the entities between
 * enum_start and enum_end become a list. The tokens around a list do not
 * reliably end or begin with a line break, so the list is set apart by blank
 * lines.
 */
export function formatSummary(summary: SummaryMessage[]): string {
  let text = '';
  let ordered = false;
  let itemNumber = 0;

  for (const part of summary) {
    switch (part.type) {
      case 'token':
        text += part.data;
        break;
      case 'inline_reference':
        text += ` (${part.data.url})`;
        break;
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

  return text.trim();
}
