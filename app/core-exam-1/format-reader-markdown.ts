/**
 * Applies presentation-only structure to the preserved canonical Markdown.
 *
 * The source corpus intentionally remains byte-for-byte unchanged. These
 * transformations only expose semantic boundaries that CommonMark would
 * otherwise collapse into a single paragraph.
 */
export function formatReaderMarkdown(
  markdown: string,
  stableKey: string,
): string {
  let formatted = markdown
    // The source frequently starts a new category on its own line with a
    // bold label (Body, Psychology, Johnson's objectives, etc.). A soft
    // Markdown break hides that distinction, so promote it to a paragraph.
    .replace(/\n(?=\*\*[^*\n]{1,90}\*\*(?:\s|\[|:))/g, "\n\n")
    // Keep compact intra-category lists readable without changing their text.
    .replace(
      /([.!?](?:\s*\[[^\]\n]+\])?) (?=\*\*[A-Z][^*\n]{1,70}:\*\*)/g,
      "$1\n\n",
    );

  const categoryTransitions = [
    "Across the chart",
    "Convergence",
    "Creation",
    "Damage clause",
    "Definitions",
    "Etiology sketch",
    "Hindrance stream",
    "Kessler's caveat",
    "Mask message",
    "Method",
    "Named methods",
    "Prerequisite stream",
    "Primary root distortion",
    "Resolution to speak",
    "Self-measuring",
    "Sequence",
    "Signs",
    "Skill one",
    "Unmet need",
  ];

  for (const label of categoryTransitions) {
    formatted = formatted.replaceAll(
      ` ${label}:`,
      `\n\n**${label}:**`,
    );
  }

  if (stableKey === "topic-09.reason-will-emotion") {
    formatted = formatted
      .replace(
        /(\[PL 43 p\.2\]\.) Perfected forms:/,
        "$1\n\n**Perfected forms:**",
      )
      .replace(
        /(\[PL 43 pp\.5–6\]\.) Ideal =/,
        "$1\n\n**Ideal =**",
      )
      .replace(
        /(\[PL 43 p\.6\]\.) \*\*Will's proper role:/,
        "$1\n\n**Will's proper role:",
      );
  }

  return markContentGlyphs(formatCitationTokens(formatted));
}

// Priority/status glyphs the source uses inline. We swap the raw emoji for
// flat, palette-toned markers at render time (see the reader's code handler)
// while leaving the stored source untouched.
export const CONTENT_GLYPHS: Record<string, { label: string; type: string }> = {
  "✅": { label: "done", type: "done" },
  "⚠": { label: "caution", type: "warn" },
  "⚪": { label: "lower priority", type: "tier-low" },
  "⬜": { label: "untiered", type: "tier-none" },
  "🔴": { label: "highest priority", type: "tier-high" },
  "🔶": { label: "highlight", type: "accent-mid" },
  "🔷": { label: "key point", type: "accent-strong" },
  "🟡": { label: "medium priority", type: "tier-mid" },
};

const CONTENT_GLYPH_PATTERN = /🔴|🟡|⚪|⬜|🔷|🔶|✅|⚠/g;

// Wrap known glyphs as inline code so the reader's code handler can replace
// them with custom markers. Drops the emoji-presentation selector first.
export function markContentGlyphs(markdown: string): string {
  // Trailing zero-width space keeps consecutive glyphs (e.g. a "\uD83D\uDD34\uD83D\uDFE1\u26AA" tier
  // cell) from merging into one code span via adjacent backtick runs.
  return markdown
    .replace(/\uFE0F/g, "")
    .replace(CONTENT_GLYPH_PATTERN, (glyph) => `\`${glyph}\`\u200B`);
}

export const CITATION_PATTERN =
  /\[((?:(?:K(?: chart)?|J|P|PL|ICE|T)\s[^\]\n]+)|(?:School\s+(?:Leaving|Merging|Enduring|Aggressive|Rigid)\s+Notes\s+[^\]\n]+)|(?:(?:register|crosswalk)\s[^\]\n]+))\]/g;

function formatCitationTokens(markdown: string): string {
  return markdown.replace(CITATION_PATTERN, (citation) => `\`${citation}\``);
}

export function formatAnswerMarkdown(markdown: string): string {
  return formatCitationTokens(markdown);
}

export function isCitationToken(value: string): boolean {
  return new RegExp(`^${CITATION_PATTERN.source}$`).test(value);
}
