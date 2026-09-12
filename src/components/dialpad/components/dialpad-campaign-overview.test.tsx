/* T6 - leaving the campaign page no longer puts the agent On Break
   (finding #10).

   On a server-dialled campaign the workspace listens for beforeunload and
   pagehide. It used to POST /api/call-queue/agent/status {On Break, Idle}
   with a keepalive fetch, so a reload or a link out flipped the person's
   duty. Now it sends the campaign join ledger's DELETE on the open socket
   (what the Leave button sends) and leaves duty alone. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_USER, makeSocketManager } from '../../../../tests/vitest/dialer-fixtures';

const mocks = vi.hoisted(() => ({
  dialpad: { current: null as any },
  socket: { current: null as any },
  user: { current: null as any },
  duty: { current: null as any },
  api: {
    getCampaignDetail: vi.fn(),
    getDispositions: vi.fn(),
    makeCallQueueAvailable: vi.fn(),
    validateCampaignLeadAssignment: vi.fn(),
  },
}));

vi.mock('@/hooks/use-dialpad', () => ({ useDialpad: () => mocks.dialpad.current }));
vi.mock('@/hooks/use-socket-events', () => ({ useSocketEvents: () => mocks.socket.current }));
vi.mock('@/hooks/use-user', () => ({ useUser: () => mocks.user.current }));
vi.mock('@/hooks/use-agent-duty', () => ({ useAgentDuty: () => mocks.duty.current }));
vi.mock('@/hooks/use-campaign-timers', async () => {
  const lib = await import('@/lib/campaign-timers');
  return { useCampaignTimers: () => ({ timers: lib.normaliseCampaignTimers(undefined) }) };
});
vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...mocks.api,
}));

import DialpadCampaignOverview from './dialpad-campaign-overview';

const AGENT_STATUS_URL = '/api/call-queue/agent/status';

const campaign = (dialMethod: string) => ({
  _id: 'campaign-1',
  name: `${dialMethod} leaving test`,
  dialMethod,
  companyId: 'company-1',
  campaignStatus: 'PROCESSING',
  declineDispositions: [],
  agentDisposition: [],
  dialerSetting: { wrapup_time: 10, wait_after_call: 5 },
});

const installContext = (dialMethod: string) => {
  mocks.user.current = { user: TEST_USER };
  mocks.socket.current = {
    socketEventsManager: makeSocketManager(),
    ongoingCampaignActivity: null,
    setOngoingCampaignActivity: vi.fn(),
  };
  mocks.duty.current = {
    mine: { user_uuid: 'user-1000', duty: 'on_duty', reason: '', reason_id: '', since: 1, pending: null },
    byUser: {},
    myUuid: 'user-1000',
    setDuty: vi.fn(),
    isSaving: false,
  };
  mocks.dialpad.current = {
    makeCall: vi.fn(),
    setCampaignContactCards: vi.fn(),
    openDialpad: vi.fn(),
    closeDialpad: vi.fn(),
    clearAllSessions: vi.fn(),
    isDialpadOpen: true,
    sessions: {},
    activeSessionId: null,
    isRegistered: true,
    activeCampaign: campaign(dialMethod),
    setActiveCampaign: vi.fn(),
    startCampaignClearingTimer: vi.fn(),
    setJoinedCampaignId: vi.fn(),
  };
  mocks.api.getCampaignDetail.mockResolvedValue({ data: { data: { result: campaign(dialMethod) } } });
  mocks.api.getDispositions.mockResolvedValue({ data: { data: { result: { rows: [] } } } });
  mocks.api.makeCallQueueAvailable.mockResolvedValue({ data: {} });
  mocks.api.validateCampaignLeadAssignment.mockResolvedValue({ data: {} });
};

const Providers = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const renderWorkspace = () =>
  render(
    <Providers>
      <DialpadCampaignOverview campaignContactCards={[]} dialpadScreen="idle" fullPage />
    </Providers>,
  );

const leaveEmits = () =>
  mocks.socket.current.socketEventsManager.emit.mock.calls.filter(
    ([event, payload]: [string, any]) =>
      event === 'campaign-event-logs' && payload?.eventType === 'DELETE',
  );

const onBreakWrites = () =>
  mocks.api.makeCallQueueAvailable.mock.calls.filter(
    ([payload]: [any]) => String(payload?.status || '') === 'On Break',
  );

const fetchesTo = (path: string) =>
  (globalThis.fetch as any).mock.calls.filter(([url]: [unknown]) => String(url).includes(path));

describe('T6 leaving the campaign workspace', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}'))));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('beforeunload on a predictive campaign sends the join-ledger leave and no On Break', () => {
    installContext('PREDICTIVE');
    renderWorkspace();
    expect(leaveEmits()).toHaveLength(0);

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    /* The leave, exactly as the Leave button sends it. */
    expect(leaveEmits()).toHaveLength(1);
    expect(leaveEmits()[0][1]).toEqual({
      campaignDetail: {
        campaignName: 'PREDICTIVE leaving test',
        campaignId: 'campaign-1',
        companyId: 'company-1',
      },
      eventType: 'DELETE',
      userDetail: expect.objectContaining({
        user_uuid: 'user-1000',
        extension: '1000',
        company_uuid: 'company-1',
      }),
    });
    /* No duty change by any path: not the old keepalive fetch, not the api client. */
    expect(fetchesTo(AGENT_STATUS_URL)).toHaveLength(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(onBreakWrites()).toHaveLength(0);
    /* The "leave this page?" prompt stays. */
    expect(event.defaultPrevented).toBe(true);
  });

  it('pagehide after beforeunload does not send the leave twice', () => {
    installContext('PREDICTIVE');
    renderWorkspace();
    window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    window.dispatchEvent(new Event('pagehide'));
    expect(leaveEmits()).toHaveLength(1);
    expect(onBreakWrites()).toHaveLength(0);
    expect(fetchesTo(AGENT_STATUS_URL)).toHaveLength(0);
  });

  it('pagehide on its own (a closed tab) sends the leave', () => {
    installContext('PROGRESSIVE');
    renderWorkspace();
    window.dispatchEvent(new Event('pagehide'));
    expect(leaveEmits()).toHaveLength(1);
    expect(leaveEmits()[0][1].campaignDetail.campaignId).toBe('campaign-1');
    expect(onBreakWrites()).toHaveLength(0);
  });

  it('the listeners are taken down with the workspace', () => {
    installContext('PREDICTIVE');
    const { unmount } = renderWorkspace();
    unmount();
    window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    expect(leaveEmits()).toHaveLength(0);
  });

  it('a preview campaign (browser-dialled) has no unload handler at all', () => {
    installContext('PREVIEW');
    renderWorkspace();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(leaveEmits()).toHaveLength(0);
    expect(event.defaultPrevented).toBe(false);
    expect(onBreakWrites()).toHaveLength(0);
  });
});
