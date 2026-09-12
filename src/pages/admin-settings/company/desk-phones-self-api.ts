/* The calls behind "set up your own desk phone".
 *
 * Kept in its own file, beside the company Desk phones screen that owns the
 * switch, rather than in the shared desk-phones-api.ts: that file is being
 * edited by another piece of work and the shared services/api index is off
 * limits. Two endpoints on default-api (routers/sipDeviceRoute.ts):
 *
 *   POST /api/desk-phones/mine       the caller's phones, plus
 *                                    `self_setup_allowed` - whether the company
 *                                    lets people add their own
 *   POST /api/desk-phones/mine/add   add one, owned by the caller; 403 when the
 *                                    company switch is off
 *
 * A server without the endpoint (404) reads as "not offered", never as an
 * error toast. */

import { apiClient, type CustomAxiosRequestConfig } from '@/services/api/axios';
import { isEndpointAbsent } from '@/lib/company-settings-api';
import type { DeskPhone } from '@/pages/admin-settings/people/desk-phones/desk-phones-api';

const BASE = '/api/desk-phones';

export const MY_DESK_PHONES_RULE_QUERY_KEY = ['me', 'desk-phones', 'with-rule'];

export interface MyDeskPhones {
  phones: DeskPhone[];
  /** True only when the server says so; an older server that does not answer
      the question is treated as "no", which is what it enforces. */
  selfSetupAllowed: boolean;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

export const listMyDeskPhonesWithRule = async (): Promise<
  { kind: 'ok'; value: MyDeskPhones } | { kind: 'absent' }
> => {
  try {
    const body = unwrap(
      await apiClient({
        method: 'POST',
        url: `${BASE}/mine`,
        data: {},
        hideToastOnError: true,
      } as CustomAxiosRequestConfig),
    );
    return {
      kind: 'ok',
      value: {
        phones: Array.isArray(body?.result) ? body.result : [],
        selfSetupAllowed: body?.self_setup_allowed === true,
      },
    };
  } catch (error) {
    if (isEndpointAbsent(error)) return { kind: 'absent' };
    throw error;
  }
};

export interface AddMyDeskPhoneInput {
  mac_address: string;
  vendor: string;
  model: string;
  label?: string;
  serial_number?: string;
}

export const addMyDeskPhone = async (input: AddMyDeskPhoneInput): Promise<DeskPhone> =>
  unwrap(
    await apiClient({
      method: 'POST',
      url: `${BASE}/mine/add`,
      data: input,
      hideToastOnError: true,
    } as CustomAxiosRequestConfig),
  );
