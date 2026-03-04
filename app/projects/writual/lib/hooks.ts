import { useState, useEffect, useRef, useCallback } from 'react';

// ─── useTimer ───────────────────────────────────────────
// Starts counting when `running` is true. Returns elapsed in milliseconds.

export function useTimer(running: boolean) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    if (startRef.current === null) {
      startRef.current = Date.now() - elapsedMs;
    }

    const tick = () => {
      if (startRef.current !== null) {
        setElapsedMs(Date.now() - startRef.current);
      }
    };

    const id = setInterval(tick, 47);
    return () => clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    startRef.current = null;
    setElapsedMs(0);
  }, []);

  return { elapsedMs, reset };
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
