import { useState, useEffect, useRef, useCallback } from 'react';

// ─── useTimer ───────────────────────────────────────────
// Starts counting when `running` is true. Returns elapsed seconds.

export function useTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    if (startRef.current === null) {
      startRef.current = Date.now() - elapsed * 1000;
    }

    const tick = () => {
      if (startRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    };

    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    startRef.current = null;
    setElapsed(0);
  }, []);

  return { elapsed, reset };
}

// ─── useCopyToClipboard ─────────────────────────────────

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('[writual] Failed to copy');
    }
  }, []);

  return { copied, copy };
}
