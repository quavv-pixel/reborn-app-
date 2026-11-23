// React hook: batches rapid storage writes into one every 500ms.
import { useRef } from 'react';

// ---- generic debounced multi-key storage writer ---------------------------
export function useDebouncedStorage(delay = 500) {
  const timers = useRef({});
  return (key, value) => {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      window.storage.set(key, JSON.stringify(value)).catch(() => {});
    }, delay);
  };
}
