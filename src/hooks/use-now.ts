import { useEffect, useState } from 'react';

/* The current time, re-read every `tickMs`. Anything that shows a clock or a
   "3 min ago" reads `now` from here instead of calling Date.now() in render,
   so it keeps moving after the data stops. Tables can tick slowly (15s is
   plenty for minute-level words); a clock ticks every second. */
export const useNow = (tickMs = 1000): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), Math.max(250, tickMs));
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
};
