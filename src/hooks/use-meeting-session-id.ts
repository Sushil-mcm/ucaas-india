import { useMemo } from 'react';

const MEETING_SESSION_ID_KEY = 'meeting_tab_session_id';

function generateId(): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : null;
  return uuid ?? `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Returns a stable sessionId per tab. Always prefer sessionStorage so the id persists on refresh.
 * (Checking window.opener first caused a new id on every refresh when the tab was opened via window.open.)
 */
function getOrCreateTabSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem(MEETING_SESSION_ID_KEY);
  if (id) return id;
  id = generateId();
  sessionStorage.setItem(MEETING_SESSION_ID_KEY, id);
  return id;
}

export function useMeetingSessionId(): string {
  return useMemo(getOrCreateTabSessionId, []);
}
