/**
 * The contract between the one shared CRM widget and each host CRM.
 *
 * The widget UI is written once. An adapter's only job is to translate a host
 * CRM's own SDK into these calls, in both directions:
 *
 *   CRM  -> widget   CrmHost  (agent clicked a number, host toggled the panel)
 *   widget -> CRM    CrmAdapter.onCall*  (so the CRM can follow the call)
 *
 * Adapters hold no telephony logic and no UI. Adding a CRM means adding one
 * file here, never touching the widget.
 */

/** A call, as the widget sees it. Mirrors a DialpadContext session. */
export type CrmCallEvent = {
  sessionId: string;
  number: string;
  name?: string;
  direction?: string;
  startedAt?: number;
  /** Lowercased session status: connecting | ringing | accepted | ended | failed */
  status?: string;
};

/** A click-to-call coming from the host CRM. */
export type CrmDialRequest = {
  number: string;
  /** Host record the click came from, when the CRM tells us. */
  recordId?: string;
  /** Host module/object name, e.g. Contacts, Leads. */
  entity?: string;
};

/** What an adapter may ask the widget to do. */
export type CrmHost = {
  dial: (request: CrmDialRequest) => void;
  setVisible: (visible: boolean) => void;
};

export interface CrmAdapter {
  readonly id: string;
  readonly label: string;

  /** Load the host SDK and subscribe. Resolves once the host is listening. */
  connect(host: CrmHost): void | Promise<void>;

  /** Softphone registration state, where the host tracks agent availability. */
  setLoggedIn?(loggedIn: boolean): void;

  onCallStarted?(event: CrmCallEvent): void;
  onCallAnswered?(event: CrmCallEvent): void;
  onCallEnded?(event: CrmCallEvent): void;

  dispose?(): void;
}
