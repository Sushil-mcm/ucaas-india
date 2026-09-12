/* The calls behind the Desk Phones screen.
 *
 * Kept beside the screen rather than in services/api because the endpoints
 * are new (default-api: routers/sipDeviceRoute.ts, mounted at /api/desk-phones)
 * and not every server has them yet. The list call is a quiet probe: a 404
 * means "this server does not offer desk phones" and the screen says so,
 * instead of the interceptor's generic red toast. */

import { apiClient, type CustomAxiosRequestConfig } from '@/services/api/axios';
import { isEndpointAbsent } from '@/lib/company-settings-api';

export const DESK_PHONES_QUERY_KEY = ['admin', 'desk-phones'];

const BASE = '/api/desk-phones';

export type Vendor = 'yealink' | 'poly' | 'poly-obi' | 'cisco' | 'grandstream';

export interface DeskPhoneOwner {
  uuid: string;
  extension: string;
  name: string;
  email: string;
}

/** `unknown` means the switch could not be asked, not that the phone is bad.
 *  It exists so the list never reports a phone as fine on a guess. */
export type DeskPhoneState = 'unassigned' | 'ready' | 'registered' | 'offline' | 'unknown';
/* "user": belongs to a person. "room": a shared phone with its own extension. */
export type DeskPhoneKind = 'user' | 'room';

export interface DeskPhoneSite {
  uuid: string;
  name: string;
}

export interface DeskPhone {
  uuid: string;
  kind: DeskPhoneKind;
  mac_address: string;
  mac_display: string;
  vendor: Vendor | string;
  model: string;
  serial_number: string | null;
  label: string | null;
  site_uuid: string | null;
  site: DeskPhoneSite | null;
  owner: DeskPhoneOwner | null;
  /** The phone's own SIP login, "1000_p2". */
  sip_username: string | null;
  /** The extension that login belongs to, "1000". */
  extension: string | null;
  state: DeskPhoneState;
  /** How long it has been out of touch, in words: "18 hours". Empty when it
   *  has never been in touch, or when it is registered right now. */
  away_for: string;
  status: string;
  last_seen_at: string | null;
  last_user_agent: string | null;
  provisioned_at: string | null;
  created_at: string;
}

export interface DeskPhoneList {
  result: DeskPhone[];
  total: number;
  page: number;
  limit: number;
}

export interface RowProblem {
  row: number;
  field: string;
  message: string;
}

export interface BulkOutcome {
  added: DeskPhone[];
  rejected: RowProblem[];
  total_rows: number;
}

export interface DeskPhoneCredentials {
  device: DeskPhone;
  registration: {
    username: string | null;
    password: string;
    realm: string;
    outbound_proxy: string;
    transport: string;
    port: number;
    fallback_port: number;
    display_name: string;
  };
  provisioning: {
    username: string;
    password: string;
    url: string | null;
  };
}

export type ListOutcome = { kind: 'ok'; list: DeskPhoneList } | { kind: 'absent' };

/* The API's success envelope is { success, data: { message, result: <payload> } }
   (helpers/responseHelper.sendSuccess), so the payload sits two levels down. */
const unwrap = <T>(response: any): T =>
  response?.data?.data?.result ?? response?.data?.data ?? response?.data ?? response;
const messageOf = (response: any): string => String(response?.data?.data?.message ?? response?.data?.message ?? '');

export const listDeskPhones = async (params: {
  search?: string;
  page?: number;
  limit?: number;
  kind?: DeskPhoneKind;
}): Promise<ListOutcome> => {
  try {
    const response = await apiClient({
      method: 'POST',
      url: `${BASE}/list`,
      data: params,
      hideToastOnError: true,
    } as CustomAxiosRequestConfig);
    const list = unwrap<DeskPhoneList>(response);
    return {
      kind: 'ok',
      list: {
        result: Array.isArray(list?.result) ? list.result : [],
        total: Number(list?.total) || 0,
        page: Number(list?.page) || 1,
        limit: Number(list?.limit) || 50,
      },
    };
  } catch (error: any) {
    if (isEndpointAbsent(error)) return { kind: 'absent' };
    throw error;
  }
};

export const deskPhoneCatalogue = async (): Promise<{ vendors: Vendor[]; models: Record<Vendor, string[]> }> => {
  const response = await apiClient({
    method: 'GET',
    url: `${BASE}/catalogue`,
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
  return unwrap(response);
};

export interface AddDeskPhoneInput {
  mac_address: string;
  vendor: Vendor | string;
  model: string;
  serial_number?: string;
  owner?: string;
  label?: string;
  /* Room phones only: their own extension and where they stand. */
  room_extension?: string;
  site_uuid?: string;
}

export const addDeskPhone = async (input: AddDeskPhoneInput): Promise<DeskPhone> =>
  unwrap(await apiClient({ method: 'POST', url: `${BASE}/add`, data: input, hideToastOnError: true } as CustomAxiosRequestConfig));

export const bulkAddDeskPhones = async (text: string): Promise<{ message: string; outcome: BulkOutcome }> => {
  const response: any = await apiClient({
    method: 'POST',
    url: `${BASE}/bulk-add`,
    data: { text },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
  return { message: messageOf(response), outcome: unwrap<BulkOutcome>(response) };
};

export const updateDeskPhone = async (
  patch: { uuid: string } & Partial<
    Pick<AddDeskPhoneInput, 'label' | 'owner' | 'model' | 'serial_number' | 'room_extension' | 'site_uuid'>
  >,
): Promise<DeskPhone> =>
  unwrap(await apiClient({ method: 'POST', url: `${BASE}/update`, data: patch, hideToastOnError: true } as CustomAxiosRequestConfig));

export const deskPhoneCredentials = async (uuid: string): Promise<DeskPhoneCredentials> =>
  unwrap(await apiClient({ method: 'POST', url: `${BASE}/credentials`, data: { uuid }, hideToastOnError: true } as CustomAxiosRequestConfig));

/* The signed-in person's own phones: any role, own rows only. */
export const MY_DESK_PHONES_QUERY_KEY = ['me', 'desk-phones'];

export const listMyDeskPhones = async (): Promise<{ kind: 'ok'; phones: DeskPhone[] } | { kind: 'absent' }> => {
  try {
    const response = await apiClient({
      method: 'POST',
      url: `${BASE}/mine`,
      data: {},
      hideToastOnError: true,
    } as CustomAxiosRequestConfig);
    const list = unwrap<{ result: DeskPhone[] }>(response);
    return { kind: 'ok', phones: Array.isArray(list?.result) ? list.result : [] };
  } catch (error: any) {
    if (isEndpointAbsent(error)) return { kind: 'absent' };
    throw error;
  }
};

export const myDeskPhoneCredentials = async (uuid: string): Promise<DeskPhoneCredentials> =>
  unwrap(await apiClient({ method: 'POST', url: `${BASE}/mine/credentials`, data: { uuid }, hideToastOnError: true } as CustomAxiosRequestConfig));

export const rotateDeskPhoneSecret = async (uuid: string): Promise<void> => {
  await apiClient({ method: 'POST', url: `${BASE}/rotate-secret`, data: { uuid } });
};

export const removeDeskPhone = async (uuid: string): Promise<void> => {
  await apiClient({ method: 'POST', url: `${BASE}/remove`, data: { uuid } });
};

/* Same columns the server's template.csv carries, built here so the download
   works without a round trip. */
/* The columns the server reads, in its order (BULK_COLUMNS), with one row of
   each kind: a phone named by its owner's email, one named by their
   extension, and a room phone with an extension of its own. Keep in step with
   BULK_TEMPLATE_CSV in the API - the same file is both the download and the
   example shown in the box, so they cannot drift apart. */
export const TEMPLATE_CSV =
  'mac_address,vendor,model,serial_number,owner,label,site,room_extension\n' +
  '805ec0a1b2c3,yealink,T46U,,alice@example.com,Alice desk,Head office,\n' +
  '0004f2aa11bb,poly,VVX450,,1042,Bob desk,Head office,\n' +
  '64167f001122,poly,VVX450,,,Reception,Head office,2001\n';

/* What a failed call should say. The interceptor was told to stay quiet, so
   the screen carries the words itself. */
export const describeError = (error: any, fallback = 'Something went wrong. Try again.'): string => {
  const serverMessage = error?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  const status = Number(error?.response?.status);
  if (!Number.isFinite(status)) return 'Could not reach the server. Check your connection and try again.';
  return `${fallback} (${status})`;
};

/* Problems the server attaches to a refused add: { problems: [...] }. */
export const problemsOf = (error: any): RowProblem[] => {
  const list = error?.response?.data?.data?.problems;
  return Array.isArray(list) ? list : [];
};
