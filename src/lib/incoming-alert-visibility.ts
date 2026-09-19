/** Keep a hidden dialer's call discoverable, without two answer panels for it. */
export function visibleIncomingAlerts<T extends { id: string }>(
  ringing: T[], activeId: string | null | undefined, dialerVisible: boolean,
): T[] {
  return ringing.filter((session) => !(dialerVisible && session.id === activeId));
}
