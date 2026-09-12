/* Fixtures shared by the dialer component tests (T5, T6, T8 of the 10 Sep
   test tasks): a signed-in user, a socket manager that records what is
   emitted and lets a test fire a server event, and an ended campaign call
   with a wrap-up rule. Each test file still declares its own vi.mock calls
   (vitest hoists them per file); these are only the data. */
import type { DialpadSession } from '@/context/dialpad-context';
import { vi } from 'vitest';

export const T0 = new Date('2026-09-10T12:00:00Z').getTime();

export const TEST_USER = {
  uuid: 'user-1000',
  role: 'ADMIN',
  user_info: {
    first_name: 'sushil',
    last_name: 'yadav',
    email: 'sushil@example.test',
    extension: '1000',
    uuid: 'user-1000',
    domain: 'test.example.test',
  },
  company_info: { uuid: 'company-1' },
  sip_credentials: { domain: 'test.example.test' },
};

/** A socket manager double: `emit` is recorded, `on`/`off` keep handlers so a
    test can play a server event with `fire(event, payload)`. */
export const makeSocketManager = () => {
  const handlers: Record<string, Array<(payload: any) => void>> = {};
  const manager = {
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (payload: any) => void) => {
      (handlers[event] ||= []).push(handler);
    }),
    off: vi.fn((event: string, handler: (payload: any) => void) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== handler);
    }),
    fire: (event: string, payload: any) => {
      (handlers[event] || []).forEach((h) => h(payload));
    },
    handlers,
  };
  return manager;
};

export const DISPOSITIONS = [
  { _id: 'disp-interested', disposition: { name: 'Interested' } },
  { _id: 'disp-not-interested', disposition: { name: 'Not interested' } },
];

type CampaignSessionOptions = {
  wrapupMode?: string;
  wrapupSeconds?: number;
  dialMethod?: string;
  /** The label ticked but not yet saved, by id. */
  dispositionId?: string;
  overrides?: Partial<DialpadSession>;
};

/** An ended, answered campaign call whose wrap-up started at T0. */
export const campaignSession = ({
  wrapupMode = 'MANDATORY_TIMEOUT',
  wrapupSeconds = 10,
  dialMethod = 'PREVIEW',
  dispositionId,
  overrides = {},
}: CampaignSessionOptions = {}): DialpadSession => {
  const ticked = DISPOSITIONS.find((item) => item._id === dispositionId);
  return {
    id: 'session-1',
    direction: 'outgoing',
    status: 'ended',
    isOnHold: false,
    isMuted: false,
    isSpeakerOn: false,
    isRecording: false,
    hasAnswered: true,
    remoteName: 'Test Lead',
    remoteNumber: '+16059713935',
    startedAt: T0 - 40_000,
    connectedAt: T0 - 30_000,
    endedAt: T0,
    cause: 'Terminated',
    eventOriginator: 'local',
    headers: {},
    extraHeaders: [],
    queueMetaData: null,
    campaignMetaData: {
      id: 'campaign-1',
      response: {
        _id: 'campaign-1',
        name: 'Preview wrap-up test',
        dialMethod,
        dialerSetting: { wrapup_time: wrapupSeconds, wrapup_mode: wrapupMode },
        agentDisposition: DISPOSITIONS,
      },
    },
    liveCallData: {
      campaign_number_uuid: 'campaign-number-1',
      contact_uuid: 'contact-1',
      contact_name: 'Test Lead',
      sip_call_id: 'sip-call-1',
      campaign_type: dialMethod,
    },
    transcriptionHasStarted: 'stop',
    transcriptionMessages: [],
    ...(ticked
      ? { dispositionId: ticked._id, dispositionName: ticked.disposition.name }
      : {}),
    ...overrides,
  } as DialpadSession;
};
