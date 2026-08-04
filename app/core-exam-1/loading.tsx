// Route-level fallback: shows a centered loader while the topic/page's server
// data streams in, so navigation gives immediate feedback instead of a stall.
export default function CoreExamLoading() {
  return (
    <div className="ce-route-loading" role="status" aria-live="polite">
      <span className="ce-route-loading-spinner" aria-hidden="true" />
      <span className="ce-route-loading-label">Loading…</span>
    </div>
  );
}
