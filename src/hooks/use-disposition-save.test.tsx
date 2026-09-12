/* T5 - the save behind the wrap-up: src/hooks/use-disposition-save.ts.

   The pure helpers the ended screen's timer reads (which label is ticked,
   how many wrap-up seconds are left), and the hook's save: one POST per
   session at a time, the session marked labelled and cleared, false when
   there is nothing to save or the request fails. */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DialpadSession } from '@/context/dialpad-context';
import {
  DISPOSITIONS,
  T0,
  TEST_USER,
  campaignSession,
  makeSocketManager,
} from '../../tests/vitest/dialer-fixtures';

const mocks = vi.hoisted(() => ({
  dialpad: { current: null as any },
  socket: { current: null as any },
  user: { current: null as any },
  api: {
    addDispositionInLeadContatc: vi.fn(),
    makeCallQueueAvailable: vi.fn(),
    queueDisposition: vi.fn(),
  },
}));

vi.mock('@/hooks/use-dialpad', () => ({ useDialpad: () => mocks.dialpad.current }));
vi.mock('@/hooks/use-socket-events', () => ({ useSocketEvents: () => mocks.socket.current }));
vi.mock('@/hooks/use-user', () => ({ useUser: () => mocks.user.current }));
vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...mocks.api,
}));

import {
  sessionDispositions,
  tickedDisposition,
  useDispositionSave,
  wrapupSecondsLeft,
} from './use-disposition-save';

const queueSession = (overrides: Partial<DialpadSession> = {}): DialpadSession =>
  ({
    ...campaignSession(),
    id: 'queue-session-1',
    direction: 'incoming',
    campaignMetaData: null,
    liveCallData: null,
    queueMetaData: {
      id: 'queue-1',
      response: {
        name: 'India Leads',
        settings: { wrapup_time: 20, after_call: { wrapup_prompt: 'MANDATORY_TIMEOUT' } },
        agentDisposition: [{ _id: 'q-resolved', disposition: { name: 'Resolved' } }],
      },
    },
    ...overrides,
  }) as DialpadSession;

describe('T5 helpers the timer reads', () => {
  it('tickedDisposition: the ticked, unsaved label; nothing once saved or when nothing is ticked', () => {
    expect(tickedDisposition(campaignSession())).toBeNull();
    expect(tickedDisposition(campaignSession({ dispositionId: 'disp-interested' }))).toEqual(
      DISPOSITIONS[0],
    );
    expect(
      tickedDisposition(
        campaignSession({ dispositionId: 'disp-interested', overrides: { dispositionSaved: true } }),
      ),
    ).toBeNull();
    expect(
      tickedDisposition(campaignSession({ overrides: { dispositionId: 'not-a-label' } })),
    ).toBeNull();
    expect(tickedDisposition(null)).toBeNull();
  });

  it('wrapupSecondsLeft: the campaign wrap-up counted from the hang-up, never below 0', () => {
    const session = campaignSession({ wrapupSeconds: 10 });
    expect(wrapupSecondsLeft(session, T0)).toBe(10);
    expect(wrapupSecondsLeft(session, T0 + 4_000)).toBe(6);
    expect(wrapupSecondsLeft(session, T0 + 10_000)).toBe(0);
    expect(wrapupSecondsLeft(session, T0 + 60_000)).toBe(0);
    /* A queue call reads the queue's wrap-up. */
    expect(wrapupSecondsLeft(queueSession(), T0 + 5_000)).toBe(15);
    /* No wrap-up configured: 0, so the label carries no wrap time. */
    expect(wrapupSecondsLeft(campaignSession({ wrapupSeconds: 0 }), T0)).toBe(0);
  });

  it("sessionDispositions: the campaign's labels on a campaign leg, the queue's on a queue leg", () => {
    expect(sessionDispositions(campaignSession())).toEqual(DISPOSITIONS);
    expect(sessionDispositions(queueSession()).map((item) => item._id)).toEqual(['q-resolved']);
    /* A campaign call that came through a queue is a campaign call when the
       switch says so. */
    const both = queueSession({
      campaignMetaData: campaignSession().campaignMetaData,
      headers: { 'x-forwardtype': ['CAMPAIGN'] },
    });
    expect(sessionDispositions(both)).toEqual(DISPOSITIONS);
    expect(sessionDispositions(null)).toEqual([]);
  });
});

describe('T5 useDispositionSave().save', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.user.current = { user: TEST_USER };
    mocks.socket.current = { socketEventsManager: makeSocketManager() };
    mocks.dialpad.current = {
      isDialpadOpen: true,
      openDialpad: vi.fn(),
      clearSession: vi.fn(),
      patchSession: vi.fn(),
      setCampaignContactCards: vi.fn(),
      setActiveCampaign: vi.fn(),
    };
    mocks.api.addDispositionInLeadContatc.mockResolvedValue({ data: {} });
    mocks.api.makeCallQueueAvailable.mockResolvedValue({ data: {} });
    mocks.api.queueDisposition.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves a campaign label: one POST, session marked labelled and cleared, next contact asked for', async () => {
    const { result } = renderHook(() => useDispositionSave());
    let saved = false;
    await act(async () => {
      saved = await result.current.save(campaignSession(), DISPOSITIONS[0]);
    });
    expect(saved).toBe(true);
    expect(mocks.api.addDispositionInLeadContatc).toHaveBeenCalledTimes(1);
    expect(mocks.api.addDispositionInLeadContatc.mock.calls[0][0]).toMatchObject({
      source: 'LEAD',
      contactId: 'contact-1',
      campaignNumberId: 'campaign-number-1',
      disposition: { disposition: 'Interested', _id: 'disp-interested' },
    });
    expect(mocks.dialpad.current.patchSession).toHaveBeenCalledWith('session-1', {
      dispositionSaved: true,
    });
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledWith('session-1');
    expect(mocks.dialpad.current.setCampaignContactCards).toHaveBeenCalledWith([]);
    expect(result.current.isSaving).toBe(false);
  });

  it('a server-dialled campaign goes back to Available for the next call', async () => {
    const { result } = renderHook(() => useDispositionSave());
    await act(async () => {
      await result.current.save(campaignSession({ dialMethod: 'PREDICTIVE' }), DISPOSITIONS[0]);
    });
    expect(mocks.socket.current.socketEventsManager.emit).toHaveBeenCalledWith(
      'campaign-system-events',
      expect.objectContaining({
        body: expect.objectContaining({ campaignId: 'campaign-1', user_uuid: 'user-1000' }),
      }),
      expect.any(Function),
    );
    expect(mocks.api.makeCallQueueAvailable).toHaveBeenCalledWith({
      campaign_uuid: 'campaign-1',
      status: 'Available',
      state: 'Waiting',
    });
  });

  it('saves a queue label and puts the agent back to Available on that queue', async () => {
    const { result } = renderHook(() => useDispositionSave());
    let saved = false;
    await act(async () => {
      saved = await result.current.save(queueSession(), {
        _id: 'q-resolved',
        disposition: { name: 'Resolved' },
      });
    });
    expect(saved).toBe(true);
    expect(mocks.api.queueDisposition).toHaveBeenCalledTimes(1);
    expect(mocks.api.queueDisposition.mock.calls[0][0]).toMatchObject({
      source: 'QUEUE',
      queueUuid: 'queue-1',
      disposition: { disposition: 'Resolved' },
    });
    expect(mocks.api.makeCallQueueAvailable).toHaveBeenCalledWith({
      queue_uuid: 'queue-1',
      status: 'Available',
      state: 'Waiting',
    });
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledWith('queue-session-1');
  });

  it('guards a double save: a second call for the same session while one is in flight posts nothing', async () => {
    let finishPost: (value: unknown) => void = () => undefined;
    mocks.api.addDispositionInLeadContatc.mockImplementation(
      () => new Promise((resolve) => (finishPost = resolve)),
    );
    const { result } = renderHook(() => useDispositionSave());
    const session = campaignSession();

    let first: Promise<boolean> = Promise.resolve(false);
    let second = true;
    await act(async () => {
      first = result.current.save(session, DISPOSITIONS[0]);
      second = await result.current.save(session, DISPOSITIONS[0]);
    });
    expect(second).toBe(false);
    expect(mocks.api.addDispositionInLeadContatc).toHaveBeenCalledTimes(1);

    let firstResult = false;
    await act(async () => {
      finishPost({ data: {} });
      firstResult = await first;
    });
    expect(firstResult).toBe(true);
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledTimes(1);

    /* Once it is over the same session may be saved again (a retry after a failure). */
    mocks.api.addDispositionInLeadContatc.mockResolvedValue({ data: {} });
    let third = false;
    await act(async () => {
      third = await result.current.save(session, DISPOSITIONS[0]);
    });
    expect(third).toBe(true);
    expect(mocks.api.addDispositionInLeadContatc).toHaveBeenCalledTimes(2);
  });

  it('returns false and posts nothing without a label, a session, or a queue/campaign', async () => {
    const { result } = renderHook(() => useDispositionSave());
    let outcomes: boolean[] = [];
    await act(async () => {
      outcomes = [
        await result.current.save(null, DISPOSITIONS[0]),
        await result.current.save(campaignSession(), null),
        await result.current.save(
          campaignSession({ overrides: { campaignMetaData: null, liveCallData: null } }),
          DISPOSITIONS[0],
        ),
      ];
    });
    expect(outcomes).toEqual([false, false, false]);
    expect(mocks.api.addDispositionInLeadContatc).not.toHaveBeenCalled();
    expect(mocks.api.queueDisposition).not.toHaveBeenCalled();
    expect(mocks.dialpad.current.clearSession).not.toHaveBeenCalled();
  });

  it('returns false when the request fails, leaving the session for a retry', async () => {
    mocks.api.addDispositionInLeadContatc.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useDispositionSave());
    let saved = true;
    await act(async () => {
      saved = await result.current.save(campaignSession(), DISPOSITIONS[0]);
    });
    expect(saved).toBe(false);
    expect(mocks.dialpad.current.patchSession).not.toHaveBeenCalledWith('session-1', {
      dispositionSaved: true,
    });
    expect(mocks.dialpad.current.clearSession).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it('will not save over an unanswered required script question', async () => {
    const { result } = renderHook(() => useDispositionSave());
    const session = campaignSession({
      overrides: {
        scriptInputs: [{ key: 'reason', label: 'Reason for call', type: 'text', required: true }],
        scriptAnswers: {},
      },
    });
    let saved = true;
    await act(async () => {
      saved = await result.current.save(session, DISPOSITIONS[0]);
    });
    expect(saved).toBe(false);
    expect(mocks.api.addDispositionInLeadContatc).not.toHaveBeenCalled();
    expect(result.current.answerProblems.length).toBeGreaterThan(0);
  });
});
