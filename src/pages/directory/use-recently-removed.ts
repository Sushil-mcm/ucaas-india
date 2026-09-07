import { useState, useCallback } from 'react';

const KEY = 'ucaas:recently-removed-people';
const TTL = 72 * 60 * 60 * 1000;

export type RemovedEntry = {
  uuid: string;
  name: string;
  role: string;
  extension: string;
  removedAt: number;
};

const read = (): RemovedEntry[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    const now = Date.now();
    const ok = raw.filter((e: any) => now - e.removedAt < TTL);
    if (ok.length !== raw.length) localStorage.setItem(KEY, JSON.stringify(ok));
    return ok;
  } catch { return []; }
};

export const useRecentlyRemoved = () => {
  const [show, setShow] = useState(false);
  const [v, setV] = useState(0);
  const entries = show ? read() : [];
  const track = useCallback((p: { uuid: string; name: string; role: string; extension: string }) => {
    const list = read();
    list.unshift({ ...p, removedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list));
    setV((n) => n + 1);
  }, []);
  return { show, setShow, entries, track, v };
};
