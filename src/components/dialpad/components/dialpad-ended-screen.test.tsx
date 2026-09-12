/* T5 - wrap-up keeps or saves the label (finding #9).

   The campaign wrap-up ring on the ended screen reaches 0:00 and, depending
   on what the agent ticked and the campaign's rule:
     - a ticked label is saved for them (one POST, session cleared, next
       contact asked for);
     - nothing ticked + Required / Required-then-moves-on: the screen stays
       at 00:00 with "Pick an outcome..." and no Close, until a label is
       saved through the Dispositions tab;
     - nothing ticked + Optional: it closes as before;
     - the auto-save and a Save press in the same second post once.

   The ended screen and the Dispositions tab are rendered together over one
   session object, as they are in the dialer, so a tick in the tab is what
   the timer sees and a save in either clears the screen. */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DialpadSession } from '@/context/dialpad-context';
import {
  T0,
  TEST_USER,
  campaignSession,
  makeSocketManager,
} from '../../../../tests/vitest/dialer-fixtures';

const mocks = vi.hoisted(() => ({
  dialpad: { current: null as any },
  socket: { current: null as any },
  user: { current: null as any },
  api: {
    addDispositionInLeadContatc: vi.fn(),
    makeCallQueueAvailable: vi.fn(),
    queueDisposition: vi.fn(),
    createEventAndTask: vi.fn(),
    saveNoteInLeadContact: vi.fn(),
  },
}));

vi.mock('@/hooks/use-dialpad', () => ({ useDialpad: () => mocks.dialpad.current }));
vi.mock('@/hooks/use-socket-events', () => ({ useSocketEvents: () => mocks.socket.current }));
vi.mock('@/hooks/use-user', () => ({ useUser: () => mocks.user.current }));
vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...mocks.api,
}));

import DialpadEndedScreen from './dialpad-ended-screen';
import DialpadMaxiTabDispositions from './dialpad-maxi-tab-dispositions';

const HELD_HINT = 'Pick an outcome for this call and save it. The next contact waits until you do.';
const TAB_HINT = 'Wrap-up time is over. Pick an outcome and save it to finish this call.';

/* The session lives in one piece of state, as it does in the dialpad
   context; patchSession / clearSession from the mocked context write it. */
let setSessionState: (updater: (s: DialpadSession | null) => DialpadSession | null) => void;

const Harness = ({ initial }: { initial: DialpadSession }) => {
  const [session, setSession] = useState<DialpadSession | null>(initial);
  setSessionState = setSession;
  return (
    <>
      <DialpadEndedScreen
        session={session}
        onAddNotes={() => undefined}
        onCallAgain={() => undefined}
        onClose={() => undefined}
      />
      <DialpadMaxiTabDispositions activeSession={session} />
    </>
  );
};

const renderWrapup = (session: DialpadSession) => render(<Harness initial={session} />);

const installContext = () => {
  mocks.user.current = { user: TEST_USER };
  mocks.socket.current = {
    socketEventsManager: makeSocketManager(),
    liveCalls: [],
    eventLiveCallsData: [],
    usersOnlineStatus: {},
  };
  mocks.dialpad.current = {
    sessions: {},
    activeSessionId: 'session-1',
    getMatchedLiveCallBySession: vi.fn(() => null),
    ensureSessionContactInfo: vi.fn(),
    isDialpadOpen: true,
    openDialpad: vi.fn(),
    makeCall: vi.fn(),
    clearAllSessions: vi.fn(),
    clearSession: vi.fn((id: string) => {
      setSessionState((s) => (s && s.id === id ? null : s));
    }),
    patchSession: vi.fn((id: string, patch: Partial<DialpadSession>) => {
      setSessionState((s) => (s && s.id === id ? { ...s, ...patch } : s));
    }),
    setCampaignContactCards: vi.fn(),
    setActiveCampaign: vi.fn(),
  };
  mocks.api.addDispositionInLeadContatc.mockResolvedValue({ data: { data: { ok: true } } });
  mocks.api.makeCallQueueAvailable.mockResolvedValue({ data: {} });
  mocks.api.queueDisposition.mockResolvedValue({ data: {} });
};

/** Runs the wrap-up ring down to 0:00 and lets the handler's promises settle. */
const runTimerOut = async (seconds = 10) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(seconds * 1000 + 50);
  });
};

const dispositionPosts = () => mocks.api.addDispositionInLeadContatc.mock.calls;
const heldPatches = () =>
  mocks.dialpad.current.patchSession.mock.calls.filter(
    ([, patch]: [string, Partial<DialpadSession>]) => patch?.wrapupHeld === true,
  );

describe('T5 campaign wrap-up at 0:00', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    installContext();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the campaign ring counting down from the wrap-up seconds', () => {
    renderWrapup(campaignSession({ wrapupSeconds: 10 }));
    expect(screen.getByText('Campaign Wrap-up Time')).toBeTruthy();
    expect(screen.getByText('00:10')).toBeTruthy();
  });

  it('Run A: a ticked label is saved when the ring reaches 0:00 (Required, then moves on)', async () => {
    renderWrapup(
      campaignSession({ wrapupMode: 'MANDATORY_TIMEOUT', dispositionId: 'disp-interested' }),
    );
    expect(dispositionPosts()).toHaveLength(0);

    await runTimerOut(10);

    expect(dispositionPosts()).toHaveLength(1);
    const [payload] = dispositionPosts()[0];
    expect(payload).toMatchObject({
      source: 'LEAD',
      contactId: 'contact-1',
      campaignNumberId: 'campaign-number-1',
      sipCallId: 'sip-call-1',
      wrap_time_sec: 0,
      disposition: { disposition: 'Interested', _id: 'disp-interested', extension: '1000' },
      serviceDetail: { uuid: 'campaign-1', type: 'PREVIEW', name: 'Preview wrap-up test' },
    });
    /* The session is marked labelled, cleared, and the next contact asked for. */
    expect(mocks.dialpad.current.patchSession).toHaveBeenCalledWith('session-1', {
      dispositionSaved: true,
    });
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledWith('session-1');
    expect(mocks.dialpad.current.setCampaignContactCards).toHaveBeenCalledWith([]);
    /* Not held: the label was there. */
    expect(heldPatches()).toHaveLength(0);
    expect(screen.queryByText(HELD_HINT)).toBeNull();
  });

  it('Run A on a Required rule too: the ticked label is saved under every mode', async () => {
    renderWrapup(campaignSession({ wrapupMode: 'MANDATORY', dispositionId: 'disp-not-interested' }));
    await runTimerOut(10);
    expect(dispositionPosts()).toHaveLength(1);
    expect(dispositionPosts()[0][0].disposition.disposition).toBe('Not interested');
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledWith('session-1');
  });

  it.each(['MANDATORY_TIMEOUT', 'MANDATORY'])(
    'Run B: nothing ticked under %s holds the screen at 00:00 with the hint and no Close',
    async (mode) => {
      renderWrapup(campaignSession({ wrapupMode: mode }));
      expect(screen.queryByText(HELD_HINT)).toBeNull();

      await runTimerOut(10);

      /* Held: nothing posted, nothing cleared, the session flagged. */
      expect(dispositionPosts()).toHaveLength(0);
      expect(mocks.dialpad.current.clearSession).not.toHaveBeenCalled();
      expect(heldPatches()).toHaveLength(1);
      expect(heldPatches()[0][0]).toBe('session-1');

      /* What the agent sees: the ring at 00:00, the hint, no Close button. */
      expect(screen.getByText('00:00')).toBeTruthy();
      expect(screen.getByText(HELD_HINT)).toBeTruthy();
      expect(screen.getByText(TAB_HINT)).toBeTruthy();
      expect(screen.queryByRole('button', { name: /close/i })).toBeNull();

      /* Ten more seconds change nothing: the hold does not time out. */
      await runTimerOut(10);
      expect(dispositionPosts()).toHaveLength(0);
      expect(screen.getByText(HELD_HINT)).toBeTruthy();
      expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
    },
  );

  it('Run B, then a save: ticking a label and pressing Save posts it once and closes the screen', async () => {
    renderWrapup(campaignSession({ wrapupMode: 'MANDATORY_TIMEOUT' }));
    await runTimerOut(10);
    expect(screen.getByText(HELD_HINT)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Interested'));
    /* The tick is written to the session at once, so the timer could save it. */
    expect(mocks.dialpad.current.patchSession).toHaveBeenCalledWith('session-1', {
      dispositionName: 'Interested',
      dispositionId: 'disp-interested',
    });
    const saveButton = screen.getByRole('button', { name: /^save$/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(saveButton);
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(dispositionPosts()).toHaveLength(1);
    expect(dispositionPosts()[0][0].disposition.disposition).toBe('Interested');
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledTimes(1);
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledWith('session-1');
    /* The ended screen is gone with the session. */
    expect(screen.queryByText(HELD_HINT)).toBeNull();
    expect(screen.queryByText('Campaign Wrap-up Time')).toBeNull();
  });

  it('Run C: nothing ticked under Optional closes at 0:00 as before', async () => {
    renderWrapup(campaignSession({ wrapupMode: 'OPTIONAL' }));
    await runTimerOut(10);

    expect(dispositionPosts()).toHaveLength(0);
    expect(heldPatches()).toHaveLength(0);
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledWith('session-1');
    /* Preview: the next contact is asked for by emptying the cards. */
    expect(mocks.dialpad.current.setCampaignContactCards).toHaveBeenCalledWith([]);
    expect(screen.queryByText(HELD_HINT)).toBeNull();
  });

  it('nothing ticked under Required-and-forced-closed also closes: only the two Required rules hold', async () => {
    renderWrapup(campaignSession({ wrapupMode: 'MANDATORY_FORCED_TIMEOUT' }));
    await runTimerOut(10);
    expect(heldPatches()).toHaveLength(0);
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledWith('session-1');
  });

  it('a double save is guarded: the auto-save and a Save press in the same second post once', async () => {
    let finishPost: (value: unknown) => void = () => undefined;
    mocks.api.addDispositionInLeadContatc.mockImplementation(
      () => new Promise((resolve) => (finishPost = resolve)),
    );
    renderWrapup(
      campaignSession({ wrapupMode: 'MANDATORY_TIMEOUT', dispositionId: 'disp-interested' }),
    );

    /* 0:00 - the auto-save has posted and is waiting for the server. */
    await runTimerOut(10);
    expect(dispositionPosts()).toHaveLength(1);
    expect(mocks.dialpad.current.clearSession).not.toHaveBeenCalled();

    /* The agent presses Save on the tab meanwhile. */
    const saveButton = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(saveButton);
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(dispositionPosts()).toHaveLength(1);

    /* The server answers: one clear, one next contact. */
    await act(async () => {
      finishPost({ data: { data: { ok: true } } });
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(dispositionPosts()).toHaveLength(1);
    expect(mocks.dialpad.current.clearSession).toHaveBeenCalledTimes(1);
  });

  it('a save that fails at 0:00 falls back to the hold rather than dropping the label', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.api.addDispositionInLeadContatc.mockRejectedValue(new Error('500'));
    renderWrapup(
      campaignSession({ wrapupMode: 'MANDATORY_TIMEOUT', dispositionId: 'disp-interested' }),
    );
    await runTimerOut(10);

    expect(dispositionPosts()).toHaveLength(1);
    expect(mocks.dialpad.current.clearSession).not.toHaveBeenCalled();
    expect(heldPatches()).toHaveLength(1);
    expect(screen.getByText(HELD_HINT)).toBeTruthy();
    /* The tick is still there for the agent to press Save on. */
    const saveButton = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });
});
