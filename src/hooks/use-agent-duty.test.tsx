/* T8 - the header duty clock does not restart on a call (finding #16).

   The chip (src/components/custom/header/duty-control.tsx) shows
   clock(now - mine.since) from useAgentDuty(). The server's `since` is the
   newest last_status_change over the person's queue rows, and the picker
   stamps that on every call start and end, so each call moved `since`.
   Commit ade7856 / a411a0f: a refreshed row with the same duty, reason and
   pending change as the row before keeps the earlier start; a real change
   (a different duty, reason or pending change - including one arriving on
   the agent-duty-update broadcast) starts a new period. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentDuty } from '@/lib/agent-duty';
import { TEST_USER, makeSocketManager } from '../../tests/vitest/dialer-fixtures';

const mocks = vi.hoisted(() => ({
  socket: { current: null as any },
  user: { current: null as any },
  api: { listAgentDuty: vi.fn(), setAgentDuty: vi.fn() },
  settings: { getSection: vi.fn() },
}));

vi.mock('@/hooks/use-socket-events', () => ({ useSocketEvents: () => mocks.socket.current }));
vi.mock('@/hooks/use-user', () => ({ useUser: () => mocks.user.current }));
vi.mock('@/lib/company-settings-api', () => mocks.settings);
vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...mocks.api,
}));

import { useAgentDuty } from './use-agent-duty';

const SHIFT_START = 1_789_000_000; // epoch seconds

const row = (over: Partial<AgentDuty> = {}): AgentDuty => ({
  user_uuid: 'user-1000',
  extension: '1000',
  name: 'sushil yadav',
  duty: 'on_duty',
  on_call: false,
  reason: '',
  reason_id: '',
  since: SHIFT_START,
  pending: null,
  no_answer_count: 0,
  max_no_answer: 3,
  missed_too_many: false,
  queues: 2,
  ...over,
});

const listResponse = (...rows: AgentDuty[]) => ({ data: { data: { rows } } });

const Providers = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const renderDuty = () => renderHook(() => useAgentDuty(), { wrapper: Providers });

/** The next list request answers with these rows; re-read the list (the
    60 s timed refresh, or a window focus) and wait for the hook to see it. */
const refreshWith = async (
  result: { current: ReturnType<typeof useAgentDuty> },
  ...rows: AgentDuty[]
) => {
  const response = listResponse(...rows);
  mocks.api.listAgentDuty.mockResolvedValueOnce(response);
  await act(async () => {
    await result.current.refetch();
  });
  await waitFor(() => expect(result.current.data?.data?.data?.rows).toEqual(rows));
};

describe('T8 duty clock guard', () => {
  beforeEach(() => {
    mocks.user.current = { user: TEST_USER };
    mocks.socket.current = { socketEventsManager: makeSocketManager() };
    mocks.settings.getSection.mockResolvedValue(null);
    mocks.api.listAgentDuty.mockResolvedValue(listResponse(row()));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the shift start from the list', async () => {
    const { result } = renderDuty();
    await waitFor(() => expect(result.current.mine?.since).toBe(SHIFT_START));
    expect(result.current.mine?.duty).toBe('on_duty');
  });

  it('a call moving the server since (same duty) keeps the earlier start', async () => {
    const { result } = renderDuty();
    await waitFor(() => expect(result.current.mine?.since).toBe(SHIFT_START));

    /* call-start stamped the row 25 minutes later */
    await refreshWith(result, row({ since: SHIFT_START + 1500, on_call: true }));
    expect(result.current.mine?.since).toBe(SHIFT_START);
    expect(result.current.mine?.on_call).toBe(true);

    /* call-end stamped it again */
    await refreshWith(result, row({ since: SHIFT_START + 1560, on_call: false }));
    expect(result.current.mine?.since).toBe(SHIFT_START);
    expect(result.current.mine?.on_call).toBe(false);
  });

  it('a real duty change resets the start, and the new period is then kept in turn', async () => {
    const { result } = renderDuty();
    await waitFor(() => expect(result.current.mine?.since).toBe(SHIFT_START));

    /* Break at +1 h. */
    const breakAt = SHIFT_START + 3600;
    await refreshWith(
      result,
      row({ duty: 'on_break', reason: 'Lunch', reason_id: 'lunch', since: breakAt }),
    );
    expect(result.current.mine?.since).toBe(breakAt);
    expect(result.current.mine?.duty).toBe('on_break');

    /* Still on the same break, server since moved: kept. */
    await refreshWith(
      result,
      row({ duty: 'on_break', reason: 'Lunch', reason_id: 'lunch', since: breakAt + 300 }),
    );
    expect(result.current.mine?.since).toBe(breakAt);

    /* A different break reason is a new period. */
    await refreshWith(
      result,
      row({ duty: 'on_break', reason: 'Meeting', reason_id: 'meeting', since: breakAt + 600 }),
    );
    expect(result.current.mine?.since).toBe(breakAt + 600);

    /* Back on duty: a new period, at the server's time. */
    await refreshWith(result, row({ since: breakAt + 900 }));
    expect(result.current.mine?.since).toBe(breakAt + 900);
    expect(result.current.mine?.duty).toBe('on_duty');
  });

  it('a pending change asked for during a call is a new period; the call ending is not', async () => {
    const { result } = renderDuty();
    await waitFor(() => expect(result.current.mine?.since).toBe(SHIFT_START));

    const pending = { duty: 'on_break' as const, reason: 'Lunch', reason_id: 'lunch', source: 'agent' };
    await refreshWith(result, row({ since: SHIFT_START + 100, on_call: true, pending }));
    expect(result.current.mine?.since).toBe(SHIFT_START + 100);

    await refreshWith(result, row({ since: SHIFT_START + 160, on_call: true, pending }));
    expect(result.current.mine?.since).toBe(SHIFT_START + 100);
  });

  it('the server broadcast of a duty change (agent-duty-update) resets the start', async () => {
    const { result } = renderDuty();
    await waitFor(() => expect(result.current.mine?.since).toBe(SHIFT_START));

    await refreshWith(result, row({ since: SHIFT_START + 1500 }));
    expect(result.current.mine?.since).toBe(SHIFT_START);

    act(() => {
      mocks.socket.current.socketEventsManager.fire(
        'agent-duty-update',
        row({ duty: 'off_duty', since: SHIFT_START + 7200 }),
      );
    });
    expect(result.current.mine?.duty).toBe('off_duty');
    expect(result.current.mine?.since).toBe(SHIFT_START + 7200);
  });

  it('a server since that goes backwards is taken as it is (never held past the server)', async () => {
    const { result } = renderDuty();
    await waitFor(() => expect(result.current.mine?.since).toBe(SHIFT_START));
    await refreshWith(result, row({ since: SHIFT_START - 600 }));
    expect(result.current.mine?.since).toBe(SHIFT_START - 600);
  });

  it('the guard is per person: another agent on a call keeps their own start', async () => {
    const other = row({ user_uuid: 'user-1001', extension: '1001', name: 'Other', since: SHIFT_START + 10 });
    mocks.api.listAgentDuty.mockResolvedValue(listResponse(row(), other));
    const { result } = renderDuty();
    await waitFor(() => expect(result.current.byUser['user-1001']?.since).toBe(SHIFT_START + 10));

    await refreshWith(result, row({ since: SHIFT_START + 900 }), { ...other, since: SHIFT_START + 950 });
    expect(result.current.byUser['user-1000'].since).toBe(SHIFT_START);
    expect(result.current.byUser['user-1001'].since).toBe(SHIFT_START + 10);
  });
});
