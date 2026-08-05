// Reusable inline "saving…" indicator with animated dots — for the gap between
// submitting content and the saved result rendering in its place.
export function SavingIndicator({ label }: { label: string }) {
  return (
    <p className="ce-saving" role="status" aria-live="polite">
      {label}
      <span className="ce-saving-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </p>
  );
}
