const CONTENT_KINDS = new Set([
  "chart",
  "chart_row",
  "claim",
  "definition",
  "reference_entry",
  "section",
  "source_excerpt",
  "table",
]);

const titleCase = (value: string) =>
  value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export function labelForContentStableKey(
  stableKey: string,
  pageStableKey: string,
) {
  if (stableKey === pageStableKey) return "Page status";

  const remainder = stableKey.startsWith(`${pageStableKey}.`)
    ? stableKey.slice(pageStableKey.length + 1)
    : stableKey;
  const segments = remainder.split(".");
  const kind = CONTENT_KINDS.has(segments[0]) ? segments[0] : null;

  let label: string | undefined;
  if (kind === "claim") {
    label = segments[2] ?? segments[1];
  } else if (kind === "section") {
    label = segments[1];
  } else if (
    kind === "chart_row" ||
    kind === "reference_entry" ||
    kind === "table"
  ) {
    label = segments.at(-1);
  } else {
    label = segments.at(-1);
  }

  return titleCase(label || "Canonical content");
}
