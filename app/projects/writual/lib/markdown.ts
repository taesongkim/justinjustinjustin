// ─── Minimal Markdown Parser for Writual ───────────────
// Converts a subset of CommonMark to HTML for live preview.
// Supported: # ## ### headers, - bullets (nested), 1. numbered lists,
// --- dividers, > blockquotes, **bold**, *italic*

export function parseMarkdown(text: string): string {
  const lines = text.split('\n');
  const html: string[] = [];
  let inList: ('ul' | 'ol')[] = [];

  function closeListsTo(depth: number) {
    while (inList.length > depth) {
      html.push(`</${inList.pop()}>`);
    }
  }

  function closeLists() {
    closeListsTo(0);
  }

  function inlineFormat(line: string): string {
    // Bold: **text**
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text* (bold already replaced, so remaining single * are italic)
    line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return line;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // Horizontal rule
    if (/^---+\s*$/.test(raw)) {
      closeLists();
      html.push('<hr class="md-hr" />');
      continue;
    }

    // Headers
    const headerMatch = raw.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      closeLists();
      const level = headerMatch[1].length;
      html.push(`<h${level} class="md-h${level}">${inlineFormat(headerMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    const quoteMatch = raw.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      closeLists();
      html.push(`<blockquote class="md-blockquote">${inlineFormat(quoteMatch[1])}</blockquote>`);
      continue;
    }

    // Bullet list item: detect indent level
    const bulletMatch = raw.match(/^(\s*)-\s+(.+)$/);
    if (bulletMatch) {
      const indent = Math.floor(bulletMatch[1].length / 2);
      const depth = indent + 1;
      // Open/close lists to match depth
      while (inList.length < depth) {
        html.push('<ul class="md-ul">');
        inList.push('ul');
      }
      closeListsTo(depth);
      html.push(`<li class="md-li">${inlineFormat(bulletMatch[2])}</li>`);
      continue;
    }

    // Numbered list item
    const numMatch = raw.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numMatch) {
      const indent = Math.floor(numMatch[1].length / 2);
      const depth = indent + 1;
      while (inList.length < depth) {
        html.push('<ol class="md-ol">');
        inList.push('ol');
      }
      closeListsTo(depth);
      html.push(`<li class="md-li">${inlineFormat(numMatch[2])}</li>`);
      continue;
    }

    // Plain line
    closeLists();
    if (raw.trim() === '') {
      html.push('<br />');
    } else {
      html.push(`<p class="md-p">${inlineFormat(raw)}</p>`);
    }
  }

  closeLists();
  return html.join('\n');
}

// ─── Keyboard shortcut helpers ─────────────────────────

export interface TextareaAction {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Wrap selected text with prefix/suffix (e.g. **bold**).
 * If no selection, insert prefix+suffix and place cursor between them.
 */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string
): TextareaAction {
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  // If already wrapped, unwrap
  if (
    before.endsWith(prefix) &&
    after.startsWith(suffix)
  ) {
    return {
      value: before.slice(0, -prefix.length) + selected + after.slice(suffix.length),
      selectionStart: start - prefix.length,
      selectionEnd: end - prefix.length,
    };
  }

  // If selection itself is wrapped, unwrap
  if (selected.startsWith(prefix) && selected.endsWith(suffix)) {
    const inner = selected.slice(prefix.length, -suffix.length);
    return {
      value: before + inner + after,
      selectionStart: start,
      selectionEnd: start + inner.length,
    };
  }

  // Wrap
  return {
    value: before + prefix + selected + suffix + after,
    selectionStart: start + prefix.length,
    selectionEnd: end + prefix.length,
  };
}

/**
 * Insert a line prefix (e.g. # , - , > ) at the start of the current line.
 * If the line already has this prefix, remove it (toggle).
 */
export function toggleLinePrefix(
  value: string,
  cursorPos: number,
  prefix: string
): TextareaAction {
  // Find the start of current line
  const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1;
  const lineEnd = value.indexOf('\n', cursorPos);
  const actualEnd = lineEnd === -1 ? value.length : lineEnd;
  const line = value.slice(lineStart, actualEnd);

  if (line.startsWith(prefix)) {
    // Remove prefix
    const newValue = value.slice(0, lineStart) + line.slice(prefix.length) + value.slice(actualEnd);
    return {
      value: newValue,
      selectionStart: Math.max(lineStart, cursorPos - prefix.length),
      selectionEnd: Math.max(lineStart, cursorPos - prefix.length),
    };
  } else {
    // Add prefix
    const newValue = value.slice(0, lineStart) + prefix + line + value.slice(actualEnd);
    return {
      value: newValue,
      selectionStart: cursorPos + prefix.length,
      selectionEnd: cursorPos + prefix.length,
    };
  }
}
