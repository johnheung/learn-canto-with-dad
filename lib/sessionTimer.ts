import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Times a learning session from when the screen opens, counting only time with the app
 * in the foreground, so leaving it in the background doesn't inflate the log.
 */
export function useSessionTimer(): { startedAt: number; activeMs: () => number } {
  const timer = useRef({ startedAt: Date.now(), banked: 0, activeSince: Date.now() as number | null });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      const t = timer.current;
      const now = Date.now();
      if (status === 'active') {
        if (t.activeSince === null) t.activeSince = now;
      } else if (t.activeSince !== null) {
        t.banked += now - t.activeSince;
        t.activeSince = null;
      }
    });
    return () => sub.remove();
  }, []);

  return {
    startedAt: timer.current.startedAt,
    activeMs: () => {
      const t = timer.current;
      return t.banked + (t.activeSince === null ? 0 : Date.now() - t.activeSince);
    },
  };
}
