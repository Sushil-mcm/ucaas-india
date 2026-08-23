import { useEffect, useState } from 'react';

/**
 * Tells you when the tab is running an old build.
 *
 * This is a single-page app: moving between screens is client-side routing, so
 * `index.html` is fetched once when the tab opens and never again. A tab left
 * open keeps running whichever build it started with — indefinitely — while the
 * server has moved on. The symptom is a screen that "did not update", which
 * looks exactly like a deploy that failed.
 *
 * `main.tsx` already reloads when a *chunk* fails to load, but that only fires
 * if the old build asks for a file that has since been pruned. A tab whose
 * chunks are all still cached never trips it. This closes that gap by comparing
 * the entry script the server is serving against the one this tab loaded.
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** The entry bundle this tab is actually running. */
const loadedEntry = () => {
  const tag = document.querySelector<HTMLScriptElement>(
    'script[type="module"][src*="/assets/index-"]',
  );
  return tag?.src.split('/').pop() || '';
};

const servedEntry = async () => {
  const response = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return '';
  const html = await response.text();
  return html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1] || '';
};

const NewBuildNotice = () => {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const mine = loadedEntry();
    /* In dev there is no hashed entry to compare against. */
    if (!mine) return;

    let cancelled = false;

    const check = async () => {
      if (cancelled || document.hidden) return;
      try {
        const current = await servedEntry();
        if (!cancelled && current && current !== mine) setStale(true);
      } catch {
        /* Offline or a blip — say nothing and try again next time. */
      }
    };

    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    window.addEventListener('focus', check);
    check();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (!stale) return null;

  return (
    <div className="mcm-newbuild" role="status">
      <span>A newer version is available.</span>
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
};

export default NewBuildNotice;
