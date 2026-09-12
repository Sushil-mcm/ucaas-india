import type { ILIST } from '@/interfaces/api-interfaces';
import { apiClient, CustomAxiosRequestConfig } from './axios';
import { routes } from './routes';
import { getEnv, normalizeSearchText } from '@/lib/utils';

export const globalSearch = (data: { searchText: string; limit: number }) => {
  const searchText = normalizeSearchText(data.searchText);

  return apiClient({
    method: routes.GLOBAL_SEARCH.METHOD,
    url: routes.GLOBAL_SEARCH.URL,
    data: { ...data, searchText },
  });
};

export const getUserDetails = () => {
  return apiClient({
    method: routes.USER_DETAILS.METHOD,
    url: routes.USER_DETAILS.URL,
  });
};
export const login = (data: any) => {
  return apiClient({
    method: routes.LOGIN.METHOD,
    url: routes.LOGIN.URL,
    data,
  });
};
export const googleLogin = (data: any) => {
  return apiClient({
    method: routes.GOOGLE_LOGIN.METHOD,
    url: routes.GOOGLE_LOGIN.URL,
    data,
  });
};

export const forgetPassword = (data: any) => {
  return apiClient({
    method: routes.FORGET_PASSWORD.METHOD,
    url: routes.FORGET_PASSWORD.URL,
    data,
  });
};

export const newPassword = (data: any) => {
  return apiClient({
    method: routes.NEW_PASSWORD.METHOD,
    url: routes.NEW_PASSWORD.URL,
    data,
  });
};

/* Invite links for new people. inspect/accept are public (the link is the
   secret); resend/pending are administrators only. */
export const inspectInvite = (data: { token: string }) => {
  return apiClient({
    method: routes.INVITE_INSPECT.METHOD,
    url: routes.INVITE_INSPECT.URL,
    data,
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};

export const acceptInvite = (data: { token: string; password: string }) => {
  return apiClient({
    method: routes.INVITE_ACCEPT.METHOD,
    url: routes.INVITE_ACCEPT.URL,
    data,
  });
};

export const resendInvite = (data: { user_uuid: string }) => {
  return apiClient({
    method: routes.INVITE_RESEND.METHOD,
    url: routes.INVITE_RESEND.URL,
    data,
  });
};

export const pendingInvites = () => {
  return apiClient({
    method: routes.INVITE_PENDING.METHOD,
    url: routes.INVITE_PENDING.URL,
    data: {},
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};

//Billing
export const billingList = (data: any) => {
  return apiClient({
    method: routes.BILLING_LIST.METHOD,
    url: routes.BILLING_LIST.URL,
    data,
  });
};

// Admin Setting

//site
export const siteList = (data: any) => {
  return apiClient({
    method: routes.SITE_LIST.METHOD,
    url: routes.SITE_LIST.URL,
    data,
  });
};
export const upsertSite = (data: any) => {
  const { siteUUID, ...rest } = data;
  return apiClient({
    method: routes.UPSERT_SITE.METHOD,
    url: siteUUID ? `${routes.UPSERT_SITE.URL}/${siteUUID}` : routes.UPSERT_SITE.URL,
    data: { ...rest },
  });
};

export const siteDelete = (id: any) => {
  return apiClient({
    method: routes.SITE_DELETE.METHOD,
    url: `${routes.SITE_DELETE.URL}/${id}`,
  });
};

export const getContactList = (data: any) => {
  const sanitizedData = { ...(data || {}) };
  const search = normalizeSearchText(sanitizedData.search);

  if (search) {
    sanitizedData.search = search;
  } else {
    delete sanitizedData.search;
  }

  return apiClient({
    method: routes.CONTACT_LIST.METHOD,
    url: routes.CONTACT_LIST.URL,
    data: sanitizedData,
  });
};
export const getContactDetail = (data: any) => {
  return apiClient({
    method: routes.CONTACT_DETAIL.METHOD,
    url: routes.CONTACT_DETAIL.URL,
    data,
  });
};

export const addContact = (data: any) => {
  return apiClient({
    method: routes.ADD_CONTACT.METHOD,
    url: routes.ADD_CONTACT.URL,
    data,
  });
};

export const upsertContact = (data: any) => {
  return apiClient({
    method: routes.UPSERT_CONTACT.METHOD,
    url: routes.UPSERT_CONTACT.URL,
    data,
  });
};

/* One more number on a saved contact, and taking one off again. */
export const addContactPhone = (data: { contact_id: string; phone: string; label?: string }) => {
  return apiClient({
    method: routes.CONTACT_PHONE_ADD.METHOD,
    url: routes.CONTACT_PHONE_ADD.URL,
    data,
  });
};
export const removeContactPhone = (data: { contact_id: string; phone: string }) => {
  return apiClient({
    method: routes.CONTACT_PHONE_REMOVE.METHOD,
    url: routes.CONTACT_PHONE_REMOVE.URL,
    data,
  });
};
export const bulkUpsertContact = (data: any) => {
  return apiClient({
    method: routes.BULK_UPSERT_CONTACT.METHOD,
    url: routes.BULK_UPSERT_CONTACT.URL,
    data,
  });
};

/* Takes a flat list of `{ name, phone, email, external_id }` and matches each
   one on the number, so the same address book can be brought in repeatedly
   without making a second copy of everybody. */
export const syncContacts = (data: {
  name: string;
  phone: string;
  email?: string;
  external_id?: string;
}[]) => {
  return apiClient({
    method: routes.SYNC_CONTACTS.METHOD,
    url: routes.SYNC_CONTACTS.URL,
    data,
  });
};

export const deleteContact = (data: any) => {
  return apiClient({
    method: routes.DELETE_CONTACT.METHOD,
    url: routes.DELETE_CONTACT.URL,
    data,
  });
};
export const fetchContact = async (data?: any) => {
  /* Every current caller reads the result as a number-keyed lookup map, not
     a page of results, so a small page would silently drop contacts past it.
     The contact service caps a page at 200 and answers 422 above that, so
     ask for the first page and then the remaining pages, and hand back one
     response carrying every row. A caller that names its own page or limit
     gets exactly that page. */
  const PAGE_SIZE = 200;
  const MAX_PAGES = 25;
  const base = { page: 1, limit: PAGE_SIZE, ...(data || {}) };
  const request = (page: number) =>
    apiClient({
      method: routes.FETCH_CONTACT.METHOD,
      url: routes.FETCH_CONTACT.URL,
      data: { ...base, page },
    });
  const first: any = await request(base.page);
  if (data?.page || data?.limit) return first;
  const result = first?.data?.data?.result;
  const totalPages = Math.min(Number(result?.totalPages) || 1, MAX_PAGES);
  if (totalPages <= 1) return first;
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => request(i + 2)),
  );
  const rows = [
    ...(result?.rows || []),
    ...rest.flatMap((r: any) => r?.data?.data?.result?.rows || []),
  ];
  return {
    ...first,
    data: { ...first.data, data: { ...first.data.data, result: { ...result, rows } } },
  };
};

export const contactActivityList = (data: any) => {
  return apiClient({
    method: routes.CONTACT_ACTIVITY.METHOD,
    url: routes.CONTACT_ACTIVITY.URL,
    data,
  });
};

export const updateContactTag = (data: { contact_uuid: string[]; tag: string }) => {
  return apiClient({
    method: routes.CONTACT_TAG_UPDATE.METHOD,
    url: routes.CONTACT_TAG_UPDATE.URL,
    data,
  });
};

/* The block list: numbers, prefixes and anonymous callers a company or a
   person has stopped hearing from. See src/lib/contact-blocking.ts. */
export const listBlockedNumbers = (data: { search?: string; line?: 'company' | 'personal' | 'all'; page?: number; limit?: number }) =>
  apiClient({ method: routes.BLOCKED_LIST.METHOD, url: routes.BLOCKED_LIST.URL, data });

export const addBlockedNumbers = (data: {
  numbers?: string[];
  kind?: 'number' | 'prefix' | 'anonymous';
  scope?: 'calls' | 'messages' | 'both';
  treatment?: 'reject' | 'voicemail' | 'spam';
  line?: 'company' | 'personal' | 'shared';
  dids?: string[];
  label?: string;
  reason?: string;
  note?: string;
  source?: string;
  country?: string;
}) => apiClient({ method: routes.BLOCKED_ADD.METHOD, url: routes.BLOCKED_ADD.URL, data });

/* Sign-up provisioning, read with the token the sign-up handed back. */
/* Both are shown in-card by the get-started screen, so the client's own error
   toast is off; a 401 here is the sign-up token, not a session. */
export const getSignupStatus = (token: string) =>
  apiClient({ method: routes.SIGNUP_STATUS.METHOD, url: routes.SIGNUP_STATUS.URL, headers: { Authorization: `Bearer ${token}` }, hideToastOnError: true, allowUnauthorized: true } as CustomAxiosRequestConfig);
export const retrySignupProvision = (token: string) =>
  apiClient({ method: routes.SIGNUP_PROVISION_RETRY.METHOD, url: routes.SIGNUP_PROVISION_RETRY.URL, data: {}, headers: { Authorization: `Bearer ${token}` }, hideToastOnError: true, allowUnauthorized: true } as CustomAxiosRequestConfig);

/* Which numbers the signed-in person may block a caller on. */
export const getBlockReach = () =>
  apiClient({ method: routes.BLOCKED_REACH.METHOD, url: routes.BLOCKED_REACH.URL, data: {} });

export const updateBlockedNumber = (data: {
  id: string;
  scope?: 'calls' | 'messages' | 'both';
  treatment?: 'reject' | 'voicemail' | 'spam';
  label?: string;
  reason?: string;
  note?: string;
}) => apiClient({ method: routes.BLOCKED_UPDATE.METHOD, url: routes.BLOCKED_UPDATE.URL, data });

export const removeBlockedNumbers = (data: { ids: string[] }) =>
  apiClient({ method: routes.BLOCKED_REMOVE.METHOD, url: routes.BLOCKED_REMOVE.URL, data });

export const mediaUploadUrl = (data: any) => {
  return apiClient({
    method: routes.MEDIA_UPLOAD_URL.METHOD,
    url: routes.MEDIA_UPLOAD_URL.URL,
    data,
  });
};

export const getUserList = (data?: any) => {
  return apiClient({
    method: routes.USER_LIST.METHOD,
    url: routes.USER_LIST.URL,
    data,
  });
};
export const getCampaignAgentActivity = (data?: any) => {
  return apiClient({
    method: routes.CAMPAIGN_AGENT_ACTIVITY.METHOD,
    url: routes.CAMPAIGN_AGENT_ACTIVITY.URL,
    data,
  });
};
export const getCampaignActivity = (data?: any) => {
  return apiClient({
    method: routes.CAMPAIGN_ACTIVITY.METHOD,
    url: routes.CAMPAIGN_ACTIVITY.URL,
    data,
  });
};

export const getRoleList = (admin_display = false) => {
  return apiClient({
    method: routes.ROLE_LIST.METHOD,
    url: routes.ROLE_LIST.URL,
    data: { admin_display },
  });
};

export const getTemplateList = (data: ILIST) => {
  return apiClient({
    method: routes.TEMPLATE_LIST.METHOD,
    url: routes.TEMPLATE_LIST.URL,
    data,
  });
};
export const getContactInfo = (data: any) => {
  return apiClient({
    method: routes.PHONE_INFO.METHOD,
    url: routes.PHONE_INFO.URL,
    data,
  });
};
export const getExtensionInfo = (data: any) => {
  return apiClient({
    method: routes.PHONE_INFO_EXT.METHOD,
    url: routes.PHONE_INFO_EXT.URL,
    data,
  });
};
export const getContactInfoV1 = (data: any) => {
  return apiClient({
    method: routes.PHONE_INFO_V1.METHOD,
    url: routes.PHONE_INFO_V1.URL,
    data,
  });
};

// Greetings List
export const getGreetings = (data = {}) => {
  return apiClient({
    method: routes.GREETING_LIST.METHOD,
    url: routes.GREETING_LIST.URL,
    data,
  });
};

// Greetings List
export const getAssignDidList = (data: any) => {
  return apiClient({
    method: routes.ASSIGNED_DIDS.METHOD,
    url: routes.ASSIGNED_DIDS.URL,
    data,
  });
};

//user - department
export const getDepartmentList = (data: any) => {
  return apiClient({
    method: routes.DEPARTMENT_LIST.METHOD,
    url: routes.DEPARTMENT_LIST.URL,
    data,
  });
};
export const getDepartmentAndCallLogs = (data: any) => {
  return apiClient({
    method: routes.GET_DEPARTMENT_AND_CALL_LOGS.METHOD,
    url: routes.GET_DEPARTMENT_AND_CALL_LOGS.URL,
    data,
  });
};

export const createDeparment = (data: any) => {
  const { uuid, ...restData } = data;
  const url = uuid ? `${routes.CREATE_DEPARTMENT.URL}/${uuid}` : routes.CREATE_DEPARTMENT.URL;

  return apiClient({
    method: routes.CREATE_DEPARTMENT.METHOD,
    url: url,
    data: restData,
  });
};

export const deleteDepartment = (uuid: any) => {
  return apiClient({
    method: routes.DELETE_DEPARTMENT.METHOD,
    url: `${routes.DELETE_DEPARTMENT.URL}/${uuid}`,
  });
};

//user-role

export const userRolesList = (data: any) => {
  return apiClient({
    method: routes.ROLES_LIST.METHOD,
    url: routes.ROLES_LIST.URL,
    data,
  });
};
export const campaignNameList = (data: any) => {
  return apiClient({
    method: routes.CAMPAIGN_NAME_LIST.METHOD,
    url: routes.CAMPAIGN_NAME_LIST.URL,
    data,
  });
};

//number - all
export const allNumbersList = (data?: any) => {
  return apiClient({
    method: routes.ALL_NUMBERS_LIST.METHOD,
    url: routes.ALL_NUMBERS_LIST.URL,
    data,
  });
};

/* Query params, not a body: this endpoint is a GET. company_uuid is required
   and the server rejects one that does not match the caller's own. */
export const releasedNumbersList = (data?: any) => {
  return apiClient({
    method: routes.RELEASED_NUMBERS_LIST.METHOD,
    url: routes.RELEASED_NUMBERS_LIST.URL,
    params: data,
  });
};

export const dashboardStats = (data: any) => {
  return apiClient({
    method: routes.DASHBOARD_STATS.METHOD,
    url: routes.DASHBOARD_STATS.URL,
    data,
  });
};

export const forwardActionType = (data: any) => {
  return apiClient({
    method: routes.FORWARDING_ACTION_TYPE.METHOD,
    url: routes.FORWARDING_ACTION_TYPE.URL,
    data,
  });
};

export const callList = (data: any) => {
  return apiClient({
    method: routes.CALL_LIST.METHOD,
    url: routes.CALL_LIST.URL,
    data,
  });
};
export const fetchPhone = (data?: any) => {
  return apiClient({
    method: routes.FETCH_ALL_PHONE.METHOD,
    url: routes.FETCH_ALL_PHONE.URL,
    data,
  });
};
export const localCallList = (data: any) => {
  return apiClient({
    method: routes.LOCAL_CALL_LIST.METHOD,
    url: routes.LOCAL_CALL_LIST.URL,
    data,
  });
};

export const callInboundList = (data: any) => {
  return apiClient({
    method: routes.CALL_INBOUND_LIST.METHOD,
    url: routes.CALL_INBOUND_LIST.URL,
    data,
  });
};

export const callVolumeList = (data: any) => {
  return apiClient({
    method: routes.CALL_VOLUME_LIST.METHOD,
    url: routes.CALL_VOLUME_LIST.URL,
    data,
  });
};

export const callReportAgentList = (data: any) => {
  return apiClient({
    method: routes.CALL_REPORT_AGENT_LIST.METHOD,
    url: routes.CALL_REPORT_AGENT_LIST.URL,
    data,
  });
};

export const callLogQueueList = (data: any) => {
  return apiClient({
    method: routes.CALL_LOG_QUEUE_LIST.METHOD,
    url: routes.CALL_LOG_QUEUE_LIST.URL,
    data,
  });
};

export const callQueueSeries = (data: any) => {
  return apiClient({
    method: routes.CALL_QUEUE_SERIES.METHOD,
    url: routes.CALL_QUEUE_SERIES.URL,
    data,
  });
};

export const callLogQueueReportList = (data: any) => {
  return apiClient({
    method: routes.CALL_LOG_QUEUE_REPORT_DETAIL.METHOD,
    url: routes.CALL_LOG_QUEUE_REPORT_DETAIL.URL,
    data,
  });
};

export const callLogAnalyticsData = (data: any) => {
  return apiClient({
    method: routes.CALL_LOG_ANALYTICS_DATA.METHOD,
    url: routes.CALL_LOG_ANALYTICS_DATA.URL,
    data,
  });
};

export const callListById = (data: any) => {
  const { sipcall_id, ...rest } = data;

  return apiClient({
    method: routes.CALL_LIST_BY_ID.METHOD,
    url: `${routes.CALL_LIST_BY_ID.URL}/${sipcall_id}`,
    data: { ...rest },
  });
};

// Update Member Forwarding
export const updateMemberForwading = (data: any) => {
  const { userID, ...rest } = data;
  return apiClient({
    method: routes.UPDATE_MEMBER.METHOD,
    url: `${routes.UPDATE_MEMBER.URL}/${userID}`,
    data: { ...rest },
  });
};

export const countryList = (config?: CustomAxiosRequestConfig) => {
  return apiClient({
    ...config,
    method: routes.COUNTRY_LIST.METHOD,
    url: routes.COUNTRY_LIST.URL,
  });
};
export const getDidCountryList = (data: any) => {
  return apiClient({
    method: routes.DID_COUNTRY_LIST.METHOD,
    url: routes.DID_COUNTRY_LIST.URL,
    data,
  });
};

export const didGroupTypes = (country_iso: any, config?: CustomAxiosRequestConfig) => {
  const requestConfig: CustomAxiosRequestConfig = {
    ...config,
    method: routes.DID_GROUP_TYPES.METHOD,
    url: routes.DID_GROUP_TYPES.URL,
    params: { country_iso },
  };

  return apiClient(requestConfig);
};

export const didRegionList = (data: any, config?: CustomAxiosRequestConfig) => {
  return apiClient({
    ...config,
    method: routes.DID_REGION_LIST.METHOD,
    url: routes.DID_REGION_LIST.URL,
    data,
  });
};

export const getAreaCode = (country_id: any, region_id: any) => {
  return apiClient({
    method: routes.GET_AREA_CODE.METHOD,
    url: routes.GET_AREA_CODE.URL,
    params: { country_id, region_id },
  });
};

export const getDidPrefixes = (data: any, config?: CustomAxiosRequestConfig) => {
  return apiClient({
    ...config,
    method: routes.DID_PREFIXES.METHOD,
    url: routes.DID_PREFIXES.URL,
    data,
  });
};
export const getDidGroup = (data: any, config?: CustomAxiosRequestConfig) => {
  return apiClient({
    ...config,
    method: routes.DID_GROUP.METHOD,
    url: routes.DID_GROUP.URL,
    data,
  });
};
export const getAvailableDid = (data: any, config?: CustomAxiosRequestConfig) => {
  return apiClient({
    ...config,
    method: routes.DID_AVAILABLE.METHOD,
    url: `${routes.DID_AVAILABLE.URL}`,
    data,
  });
};
export const listIndiaInventory = (data: any = {}) => {
  return apiClient({
    method: routes.DID_INVENTORY_INDIA.METHOD,
    url: routes.DID_INVENTORY_INDIA.URL,
    data,
  });
};
export const claimIndiaInventoryNumber = (data: { did_number: string }) => {
  return apiClient({
    method: routes.DID_INVENTORY_INDIA_CLAIM.METHOD,
    url: routes.DID_INVENTORY_INDIA_CLAIM.URL,
    data,
  });
};
/* Numbers from our own stock. `source` comes back "inventory" or "empty"; an
   empty shelf is not an error, it is the signal to fall back to the carrier. */
export const getInventoryAvailable = (data: any, config?: CustomAxiosRequestConfig) =>
  apiClient({ ...config, method: routes.DID_INVENTORY_AVAILABLE.METHOD, url: routes.DID_INVENTORY_AVAILABLE.URL, data });

export const getInventoryOptions = (params: any, config?: CustomAxiosRequestConfig) =>
  apiClient({ ...config, method: routes.DID_INVENTORY_OPTIONS.METHOD, url: routes.DID_INVENTORY_OPTIONS.URL, params });

/* Reserve the one number the customer picked, for the length of the checkout. */
export const holdInventoryNumber = (data: any) =>
  apiClient({ method: routes.DID_INVENTORY_HOLD.METHOD, url: routes.DID_INVENTORY_HOLD.URL, data });

export const releaseInventoryHold = (data: any) =>
  apiClient({ method: routes.DID_INVENTORY_RELEASE.METHOD, url: routes.DID_INVENTORY_RELEASE.URL, data });

export const claimInventoryNumber = (data: any) =>
  apiClient({ method: routes.DID_INVENTORY_CLAIM.METHOD, url: routes.DID_INVENTORY_CLAIM.URL, data });

export const getFaxDidCountryList = (data: any) => {
  return apiClient({
    method: routes.FAX_DID_COUNTRY_LIST.METHOD,
    url: routes.FAX_DID_COUNTRY_LIST.URL,
    data,
  });
};
export const getFaxAvailableDid = (data: any) => {
  return apiClient({
    method: routes.FAX_DID_AVAILABLE.METHOD,
    url: routes.FAX_DID_AVAILABLE.URL,
    data,
  });
};
export const reserveFaxDidNumber = (data: { did_number: string }) => {
  return apiClient({
    method: routes.FAX_RESERVE_DID_NUMBER.METHOD,
    url: routes.FAX_RESERVE_DID_NUMBER.URL,
    data,
  });
};
export const buyFaxDidNumbers = (data: any) => {
  return apiClient({
    method: routes.FAX_BUY_DID_NUMBERS.METHOD,
    url: routes.FAX_BUY_DID_NUMBERS.URL,
    data,
  });
};
export const getDIDBillingDetails = (data: any) => {
  return apiClient({
    method: routes.DID_BILLING_DETAILS.METHOD,
    url: `${routes.DID_BILLING_DETAILS.URL}`,
    data,
  });
};
export const billingStorage = (data: any) => {
  return apiClient({
    method: routes.BILLING_STORAGE.METHOD,
    url: `${routes.BILLING_STORAGE.URL}`,
    data,
  });
};
export const buyExtraStorage = (data: any) => {
  return apiClient({
    method: routes.BUY_EXTRA_STORAGE.METHOD,
    url: `${routes.BUY_EXTRA_STORAGE.URL}`,
    data,
  });
};
export const getProratedCost = (data: any) => {
  return apiClient({
    method: routes.GET_PRORATED_COST.METHOD,
    url: `${routes.GET_PRORATED_COST.URL}`,
    data,
  });
};
export function reserveDid(data: any): ReturnType<typeof apiClient>;
export function reserveDid(
  data: any,
  config: CustomAxiosRequestConfig,
): ReturnType<typeof apiClient>;
export function reserveDid(data: any, config?: CustomAxiosRequestConfig) {
  return apiClient({
    ...config,
    method: routes.RESERVE_DID.METHOD,
    url: `${routes.RESERVE_DID.URL}`,
    data,
  });
}
export function reserveDidQuantity(data: any): ReturnType<typeof apiClient>;
export function reserveDidQuantity(
  data: any,
  config: CustomAxiosRequestConfig,
): ReturnType<typeof apiClient>;
export function reserveDidQuantity(data: any, config?: CustomAxiosRequestConfig) {
  return apiClient({
    ...config,
    method: routes.RESERVE_DID_QUANTITY.METHOD,
    url: `${routes.RESERVE_DID_QUANTITY.URL}`,
    data,
  });
}

export const cardList = (data?: any) => {
  return apiClient({
    method: routes.CARDS_LIST.METHOD,
    url: routes.CARDS_LIST.URL,
    data,
  });
};

export const addCard = (data: any) => {
  return apiClient({
    method: routes.ADD_CARD.METHOD,
    url: routes.ADD_CARD.URL,
    data,
  });
};

export const didCreateOrder = (data: any) => {
  return apiClient({
    method: routes.DID_CREATE_ORDER.METHOD,
    url: routes.DID_CREATE_ORDER.URL,
    data,
  });
};
export const didCompleteProcess = (data: any) => {
  return apiClient({
    method: routes.DID_COMPLETE_PROCESS.METHOD,
    url: routes.DID_COMPLETE_PROCESS.URL,
    data,
  });
};
export const userUpdateStatus = (data: any) => {
  return apiClient({
    method: routes.USER_UPDATE_STATUS.METHOD,
    url: routes.USER_UPDATE_STATUS.URL,
    data,
  });
};
export const userMeetingFeedback = (data: any) => {
  return apiClient({
    method: routes.MEETING_USER_FEEDBACK.METHOD,
    url: routes.MEETING_USER_FEEDBACK.URL,
    data,
  });
};
// IVR List
export const ivrList = (data: ILIST) => {
  return apiClient({
    method: routes.IVR_LIST.METHOD,
    url: routes.IVR_LIST.URL,
    data,
  });
};
export const smsListViaDID = (data: any) => {
  return apiClient({
    method: routes.SMS_DID_LIST.METHOD,
    url: routes.SMS_DID_LIST.URL,
    data,
  });
};

//video meetings
export const joinMeeting = (data: any) => {
  return apiClient({
    method: routes.JOIN_MEETING.METHOD,
    url: routes.JOIN_MEETING.URL,
    data,
  });
};
export const createMeeting = (data: any) => {
  return apiClient({
    method: routes.CREATE_MEETING.METHOD,
    url: routes.CREATE_MEETING.URL,
    data,
  });
};
// CALENDAR API'S
export const createEventAndTask = (data: any) => {
  return apiClient({
    method: routes.CREATE_EVENT_AND_TASK.METHOD,
    url: routes.CREATE_EVENT_AND_TASK.URL,
    data,
  });
};
export const getEventAndTaskDetails = ({ eventTaskId }: { eventTaskId: string }) => {
  return apiClient({
    method: routes.GET_EVENT_AND_TASK_DETAILS.METHOD,
    url: `${routes.GET_EVENT_AND_TASK_DETAILS.URL}/${eventTaskId}`,
  });
};
export const deleteEventAndTask = (data: object) => {
  return apiClient({
    method: routes.DELETE_EVENT_AND_TASK.METHOD,
    url: routes.DELETE_EVENT_AND_TASK.URL,
    data,
  });
};
export const updateEventTaskStatus = (data: { eventTaskId: string; status: string }) => {
  return apiClient({
    method: routes.UPDATE_EVENT_TASK_STATUS.METHOD,
    url: routes.UPDATE_EVENT_TASK_STATUS.URL,
    data,
  });
};
export const assignMembers = (data: { eventTaskId: string; members: any[] }) => {
  return apiClient({
    method: routes.ASSIGN_MEMBERS.METHOD,
    url: routes.ASSIGN_MEMBERS.URL,
    data,
  });
};

export const upsertIVR = (data: any) => {
  return apiClient({
    method: routes.UPSERT_IVR.METHOD,
    url: routes.UPSERT_IVR.URL,
    data,
  });
};
// ********************************************
// Call Queue List
export const callQueueList = (data: ILIST) => {
  const sanitizedFilters = (data.filters || []).filter((filter) => filter.value !== '');
  const sanitizedSearch = data.search?.trim() || undefined;
  const sanitizedData = {
    ...data,
    filters: sanitizedFilters,
    ...(sanitizedSearch ? { search: sanitizedSearch } : {}),
  };

  return apiClient({
    method: routes.CALL_QUEUE_LIST.METHOD,
    url: routes.CALL_QUEUE_LIST.URL,
    data: sanitizedData,
  });
};

// export const useFetchContact = (data?: any) => {
//   return useQuery({
//     queryKey: ['fetchContact', data],
//     queryFn: () => fetchContact(data),
//     select: (data) => data?.data?.data?.result?.rows || data?.data?.data?.result || [],
//   });
// };

export const getSMSList = (data: any) => {
  return apiClient({
    method: routes.GET_SMS_LIST.METHOD,
    url: routes.GET_SMS_LIST.URL,
    data,
  });
};

export const sendSms = (data: any) => {
  return apiClient({
    method: routes.SEND_SMS.METHOD,
    url: routes.SEND_SMS.URL,
    data,
  });
};
export const sendFax = (data: any) => {
  return apiClient({
    method: routes.SEND_FAX.METHOD,
    url: routes.SEND_FAX.URL,
    data,
  });
};
export const getFaxAssignedDidNumbers = (data: any) => {
  return apiClient({
    method: routes.FAX_ASSIGNED_DID_NUMBERS.METHOD,
    url: routes.FAX_ASSIGNED_DID_NUMBERS.URL,
    data,
  });
};
export const faxToNumberList = (data: any) => {
  return apiClient({
    method: routes.FAX_TO_NUMBER_LIST.METHOD,
    url: routes.FAX_TO_NUMBER_LIST.URL,
    data,
  });
};
export const getFaxList = (data: any) => {
  return apiClient({
    method: routes.FAX_LIST.METHOD,
    url: routes.FAX_LIST.URL,
    data,
  });
};
export const userSMSInfo = (data?: any) => {
  return apiClient({
    method: routes.USER_SMS_INFO.METHOD,
    url: routes.USER_SMS_INFO.URL,
    data,
  });
};

export const endMeeting = (data: any) => {
  return apiClient({
    method: routes.END_MEETING.METHOD,
    url: routes.END_MEETING.URL,
    data,
  });
};

export const meetingList = (data: any) => {
  return apiClient({
    method: routes.MEETING_LIST.METHOD,
    url: routes.MEETING_LIST.URL,
    data,
  });
};
export const calendarMeetingList = (data: object) => {
  return apiClient({
    method: routes.CALENDAR_MEETING_LIST.METHOD,
    url: routes.CALENDAR_MEETING_LIST.URL,
    data,
  });
};
export const syncWithGoogleAndOutlook = (data: any) => {
  return apiClient({
    method: routes.SYNC_WITH_GOOGLE_AND_OUTLOOK.METHOD,
    url: routes.SYNC_WITH_GOOGLE_AND_OUTLOOK.URL,
    data,
  });
};
export const saveAccessToken = (data: any) => {
  return apiClient({
    method: routes.SAVE_CALENDAR_ACCESS_TOKEN.METHOD,
    url: routes.SAVE_CALENDAR_ACCESS_TOKEN.URL,
    data,
  });
};
export const disconnectWithGoogleAndOutlook = (data: any) => {
  return apiClient({
    method: routes.DISCONNECT_WITH_GOOGLE_AND_OUTLOOK.METHOD,
    url: routes.DISCONNECT_WITH_GOOGLE_AND_OUTLOOK.URL,
    data,
  });
};
export const getCalendarAccessToken = () => {
  return apiClient({
    method: routes.GET_CALENDAR_ACCESS_TOKEN.METHOD,
    url: routes.GET_CALENDAR_ACCESS_TOKEN.URL,
  });
};

export const meetingDetailList = ({ meetingId }: any) => {
  return apiClient({
    method: routes.MEETING_DETAIL_INFO.METHOD,
    url: `${routes.MEETING_DETAIL_INFO.URL}/${meetingId}`,
  });
};

export const meetingDelete = (meetingId: any) => {
  return apiClient({
    method: routes.DELETE_MEETING.METHOD,
    url: `${routes.DELETE_MEETING.URL}/${meetingId}`,
  });
};

export const validateMeet = (values: any) => {
  const config: CustomAxiosRequestConfig = {
    method: routes.VALIDATE_MEETING.METHOD,
    url: routes.VALIDATE_MEETING.URL,
    data: values,
    hideToastOnError: true,
  };
  return apiClient(config);
};
export const validateMeetingPassword = (values: { meetingId: string; password: string }) => {
  const config: CustomAxiosRequestConfig = {
    method: routes.VALIDATE_MEETING_PASSWORD.METHOD,
    url: routes.VALIDATE_MEETING_PASSWORD.URL,
    data: values,
    hideToastOnError: true,
  };
  return apiClient(config);
};
export const guestLogin = (values: any) => {
  const config: CustomAxiosRequestConfig = {
    method: routes.GUEST_LOGIN.METHOD,
    url: routes.GUEST_LOGIN.URL,
    data: values,
    hideToastOnError: true,
  };
  return apiClient(config);
};
export const decodeHash = (data: any) => {
  return apiClient({
    method: routes.HASH_DECODE.METHOD,
    url: routes.HASH_DECODE.URL,
    data,
  });
};
export const sendInvites = (data: any) => {
  return apiClient({
    method: routes.SEND_INVITE.METHOD,
    url: routes.SEND_INVITE.URL,
    data,
  });
};

export const recordingList = (data: any) => {
  return apiClient({
    method: routes.RECORDING_LIST.METHOD,
    url: routes.RECORDING_LIST.URL,
    data,
  });
};

export const addMember = (id: any) => {
  return apiClient({
    method: routes.ADD_MEMBER.METHOD,
    url: `${routes.ADD_MEMBER.URL}`,
    data: id,
  });
};

export const upsertCallQueue = (data: any) => {
  return apiClient({
    method: routes.CREATE_CALL_QUEUE.METHOD,
    url: routes.CREATE_CALL_QUEUE.URL,
    data,
  });
};

// CAMPAIGN
export const campaignList = (data?: object) => {
  return apiClient({
    method: routes.CAMPAIGN_LIST.METHOD,
    url: routes.CAMPAIGN_LIST.URL,
    data,
  });
};

export const dropdownList = (data?: object) => {
  return apiClient({
    method: routes.DROPDOWN_LIST.METHOD,
    url: routes.DROPDOWN_LIST.URL,
    data,
  });
};

export const playPauseCampaign = (data: any) => {
  return apiClient({
    method: routes.UPDATE_CAMPAIGN_STATUS.METHOD,
    url: routes.UPDATE_CAMPAIGN_STATUS.URL,
    data,
  });
};
export const upsertCampaignJoin = (data: any) => {
  return apiClient({
    method: routes.CAMPAIGN_JOIN_UPSERT.METHOD,
    url: routes.CAMPAIGN_JOIN_UPSERT.URL,
    data: {
      ...data,
      status: data?.status || 'stop',
    },
  });
};

export const campaignUserList = (data: any) => {
  return apiClient({
    method: routes.CAMPAIGN_USER_LIST.METHOD,
    url: routes.CAMPAIGN_USER_LIST.URL,
    data,
  });
};

export const getCampaignDetail = (data: { campaignId: string }) => {
  return apiClient({
    method: routes.CAMPAIGN_DETAIL.METHOD,
    url: routes.CAMPAIGN_DETAIL.URL,
    data,
  });
};

export const getTwilioVoiceToken = () => {
  return apiClient({
    method: routes.TWILIO_VOICE_TOKEN.METHOD,
    url: routes.TWILIO_VOICE_TOKEN.URL,
    data: {},
  });
};

export const campaignAnalytics = (data: { campaignId: string }) => {
  return apiClient({
    method: routes.CAMPAIGN_ANALYTICS.METHOD,
    url: routes.CAMPAIGN_ANALYTICS.URL,
    data,
  });
};

export const deleteCampaign = (id: string) => {
  return apiClient({
    method: routes.DELETE_CAMPAIGN.METHOD,
    url: routes.DELETE_CAMPAIGN.URL,
    data: {
      campaignId: id,
    },
  });
};

export const getGroupList = (data?: ILIST) => {
  const sanitizedData = { ...(data || {}) };
  const search = normalizeSearchText(sanitizedData.search);

  if (search) {
    sanitizedData.search = search;
  } else {
    delete sanitizedData.search;
  }

  return apiClient({
    method: routes.GROUP_LIST.METHOD,
    url: routes.GROUP_LIST.URL,
    data: sanitizedData,
  });
};

export const createCampaign = (data: any) => {
  return apiClient({
    method: routes.CREATE_CAMPAIGN.METHOD,
    url: routes.CREATE_CAMPAIGN.URL,
    data,
  });
};

export const deleteGreeting = (id: string) => {
  return apiClient({
    method: routes.DELETE_GREETING.METHOD,
    url: routes.DELETE_GREETING.URL,
    data: { uuid: id },
  });
};

export const deleteMedia = (data: any) => {
  return apiClient({
    method: routes.DELETE_MEDIA.METHOD,
    url: routes.DELETE_MEDIA.URL,
    data,
  });
};
// Lead Group
export const createLeadGroup = (data: { groupName: string }) => {
  return apiClient({
    method: routes.CREATE_LEAD_GROUP.METHOD,
    url: routes.CREATE_LEAD_GROUP.URL,
    data,
  });
};

export const createGreeting = (data: any) => {
  return apiClient({
    method: routes.CREATE_GREETING.METHOD,
    url: routes.CREATE_GREETING.URL,
    data,
  });
};
export const updateGreeting = (data: any) => {
  return apiClient({
    method: routes.UPDATE_GREETING.METHOD,
    url: routes.UPDATE_GREETING.URL,
    data,
  });
};

export const textToSpeech = (data: any) => {
  return apiClient({
    method: routes.TEXT_TO_SPEECH.METHOD,
    url: routes.TEXT_TO_SPEECH.URL,
    data,
  });
};

export const getGreetingVoiceList = (data: { locale: string }) => {
  return apiClient({
    method: routes.GREETING_VOICE_LIST.METHOD,
    url: routes.GREETING_VOICE_LIST.URL,
    data,
  });
};
export const updateLeadGroup = (data: { groupName: string; groupId: string }) => {
  return apiClient({
    method: routes.UPDATE_LEAD_GROUP.METHOD,
    url: routes.UPDATE_LEAD_GROUP.URL,
    data,
  });
};

export const deleteLeadGroup = (data: { groupId: string; type?: 'CONTACT' | 'LEAD' }) => {
  return apiClient({
    method: routes.DELETE_LEAD_GROUP.METHOD,
    url: routes.DELETE_LEAD_GROUP.URL,
    data,
  });
};

export const addContactInGroup = (data: any) => {
  return apiClient({
    method: routes.ADD_LEAD_CONTACT.METHOD,
    url: routes.ADD_LEAD_CONTACT.URL,
    data,
  });
};

export const updateContactInGroup = (data: any) => {
  return apiClient({
    method: routes.UPDATE_CONTACT.METHOD,
    url: routes.UPDATE_CONTACT.URL,
    data,
  });
};

export const deleteContactInGroup = (data: any) => {
  return apiClient({
    method: routes.DELETE_LEAD_CONTACT.METHOD,
    url: routes.DELETE_LEAD_CONTACT.URL,
    data,
  });
};

export const getGroupInfoById = (data: any) => {
  return apiClient({
    method: routes.GROUP_INFO.METHOD,
    url: routes.GROUP_INFO.URL,
    data,
  });
};

// DNC
export const getDNCComplaintsList = (data: any) => {
  return apiClient({
    method: routes.GET_DNC_COMPLAINTS.METHOD,
    url: routes.GET_DNC_COMPLAINTS.URL,
    data,
  });
};

export const getGroupContactsById = (data: any) => {
  const sanitizedData = { ...(data || {}) };
  const search = normalizeSearchText(sanitizedData.search);

  if (search) {
    sanitizedData.search = search;
  } else {
    delete sanitizedData.search;
  }

  return apiClient({
    method: routes.CONTACT_LIST.METHOD,
    url: routes.CONTACT_LIST.URL,
    data: {
      page: sanitizedData.page || 1,
      limit: sanitizedData.limit || 25,
      isLeadList: true,
      ...sanitizedData,
    },
  });
};

export const getGroupContactLeadList = (data: any) => {
  const sanitizedData = { ...(data || {}) };
  const search = normalizeSearchText(sanitizedData.search);

  if (search) {
    sanitizedData.search = search;
  } else {
    delete sanitizedData.search;
  }

  return apiClient({
    method: routes.GROUP_CONTACT_LEAD_LIST.METHOD,
    url: routes.GROUP_CONTACT_LEAD_LIST.URL,
    data: sanitizedData,
  });
};

export const uploadContactInLead = (data: any) => {
  const formData = new FormData();

  // Append each groupId item individually
  formData.append('belongsTo', data.belongsTo);
  formData.append('type', data.type);

  formData.append('file', data.file);
  if (data.countryPrefix) {
    formData.append('countryPrefix', data.countryPrefix);
    formData.append('strictCountryCode', data.strictCountryCode);
  }

  return apiClient({
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    },
    method: routes.UPLOAD_CONTACT.METHOD,
    url: routes.UPLOAD_CONTACT.URL,
    data: formData,
    /* The upload dialog shows the server's answer itself, row by row; a toast
       on top of that would say the same thing twice, in less detail. */
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};

export const exportContact = (data: {
  groupId: string;
  format?: string;
  type?: 'CONTACT' | 'LEAD';
}) => {
  return apiClient({
    method: routes.EXPORT_CONTACT.METHOD,
    url: routes.EXPORT_CONTACT.URL,
    params: data,
    ...(data.format === 'xlsx' || data.format === 'xls' ? { responseType: 'arraybuffer' } : {}),
  });
};

export const uploadDncCampaign = (data: any) => {
  const formData = new FormData();

  formData.append('file', data.file);
  if (data.countryPrefix) {
    formData.append('countryPrefix', data.countryPrefix);
    formData.append('strictCountryCode', data.strictCountryCode);
  }

  return apiClient({
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    },
    method: routes.UPLOAD_DNC_CAMPAIGN.METHOD,
    url: routes.UPLOAD_DNC_CAMPAIGN.URL,
    data: formData,
  });
};

// User Profile Update
export const userProfileUpdate = (data: any) => {
  const { uuid, ...restData } = data;
  const url = uuid ? `${routes.USER_PROFILE_UPDATE.URL}/${uuid}` : routes.USER_PROFILE_UPDATE.URL;
  return apiClient({
    method: routes.USER_PROFILE_UPDATE.METHOD,
    url,
    data: restData,
  });
};

export const updateUserSettings = (data: any) => {
  return apiClient({
    method: routes.UPDATE_USER_SETTINGS.METHOD,
    url: routes.UPDATE_USER_SETTINGS.URL,
    data,
  });
};
export const generatePrivateMeetingLink = () => {
  return apiClient({
    method: routes.GENERATE_PRIVATE_MEETING_LINK.METHOD,
    url: routes.GENERATE_PRIVATE_MEETING_LINK.URL,
    data: {},
  });
};

export const getPrivateMeetingLink = () => {
  const config: CustomAxiosRequestConfig = {
    method: routes.GET_PRIVATE_MEETING_LINK.METHOD,
    url: routes.GET_PRIVATE_MEETING_LINK.URL,
    data: {},
    hideToastOnError: true,
  };
  return apiClient(config);
};

export const validateUser = (data: any) => {
  const config: CustomAxiosRequestConfig = {
    method: routes.VALIDATE_USER.METHOD,
    url: routes.VALIDATE_USER.URL,
    data,
    hideToastOnError: true,
  };
  return apiClient(config);
};

export const addFund = (data: any) => {
  return apiClient({
    method: routes.ADD_FUND.METHOD,
    url: routes.ADD_FUND.URL,
    data,
  });
};

export const upsertCallHandlingTemplate = ({ templateUUID = null, ...rest }) => {
  const URL = templateUUID
    ? `${routes.UPSERT_CALL_HANDLING_TEMPLATE.URL}/${templateUUID}`
    : routes.UPSERT_CALL_HANDLING_TEMPLATE.URL;
  return apiClient({
    method: routes.UPSERT_CALL_HANDLING_TEMPLATE.METHOD,
    url: URL,
    data: { ...rest },
  });
};

export const callForwarding = (data: any) => {
  return apiClient({
    method: routes.CALL_FORWARDING.METHOD,
    url: routes.CALL_FORWARDING.URL,
    data,
  });
};

/* Write a durable label into the number's did_name column. Returns a 404 until
   the PATCH /api/did/:uuid route is bound on the API; the caller falls back to
   the call-handling-blob write (callForwarding) in that case, so a label is
   never lost while the backend catches up. */
export const updateDidLabel = ({ uuid, did_name }: { uuid: string; did_name: string }) => {
  return apiClient({
    method: routes.UPDATE_DID_LABEL.METHOD,
    url: `${routes.UPDATE_DID_LABEL.URL}/${uuid}`,
    data: { did_name },
  });
};

/* Voicemail workflow — who owns a message, whether it is resolved, and its note.
   Keyed by the call's uuid. */
export const getVoicemailAction = (callUuid: string) => {
  return apiClient({
    method: routes.VOICEMAIL_ACTION_GET.METHOD,
    url: `${routes.VOICEMAIL_ACTION_GET.URL}/${callUuid}`,
    /* One of these fires per voicemail row, so on a tenant where the route
       isn't live yet a call list becomes a wall of toasts. The caller already
       treats a failed read as "no state yet", not an error - see
       voicemail-workflow.tsx. */
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};

export const updateVoicemailAction = (data: {
  call_uuid: string;
  assigned_to?: string | null;
  resolved?: boolean;
  note?: string | null;
}) => {
  return apiClient({
    method: routes.VOICEMAIL_ACTION_SET.METHOD,
    url: routes.VOICEMAIL_ACTION_SET.URL,
    data,
  });
};

export const getCallHandlingList = (data: any) => {
  return apiClient({
    method: routes.CALL_HANDLING_LIST.METHOD,
    url: routes.CALL_HANDLING_LIST.URL,
    data,
  });
};
export const autoPurchasePlan = (data: any) => {
  return apiClient({
    method: routes.AUTO_PURCHASE_PLAN.METHOD,
    url: routes.AUTO_PURCHASE_PLAN.URL,
    data,
  });
};
export const updateLowBalanceSettings = (data: any) => {
  return apiClient({
    method: routes.UPDATE_LOW_BALANCE_SETTINGS.METHOD,
    url: routes.UPDATE_LOW_BALANCE_SETTINGS.URL,
    data,
  });
};

export const deleteCard = (data: any) => {
  return apiClient({
    method: routes.DELETE_CARD.METHOD,
    url: routes.DELETE_CARD.URL,
    data,
  });
};
export const setDefaultCard = (data: any) => {
  return apiClient({
    method: routes.SET_DEFAULT_CARD.METHOD,
    url: routes.SET_DEFAULT_CARD.URL,
    data,
  });
};

// Assign DID

export const assignDIDNumber = (data: any) => {
  const { uuid, ...rest } = data;
  return apiClient({
    method: routes.ASSIGN_DID_NUMBER.METHOD,
    url: `${routes.ASSIGN_DID_NUMBER.URL}/${uuid}`,
    data: { ...rest },
  });
};
export const removeAssignNumber = (data: any) => {
  return apiClient({
    method: routes.REMOVE_ASSIGN.METHOD,
    url: routes.REMOVE_ASSIGN.URL,
    data,
  });
};
export const getInvoice = (data: any) => {
  return apiClient({
    method: routes.GET_INVOICE.METHOD,
    url: routes.GET_INVOICE.URL,
    data,
  });
};
export const getInvoiceDetails = (uuid: string) => {
  return apiClient({
    method: routes.GET_INVOICE_DETAILS.METHOD,
    url: `${routes.GET_INVOICE_DETAILS.URL}/${uuid}`,
  });
};

export const deleteInvoice = (id: string) => {
  return apiClient({
    method: routes.DELETE_INVOICE.METHOD,
    url: `${routes.DELETE_INVOICE.URL}/${id}`,
  });
};

export const getSmsLogList = (data: any) => {
  return apiClient({
    method: routes.SMS_LOG_LIST.METHOD,
    url: routes.SMS_LOG_LIST.URL,
    data,
  });
};

export const deleteCallQueue = (uuid: string) => {
  return apiClient({
    method: routes.DELETE_CALL_QUEUE.METHOD,
    url: routes.DELETE_CALL_QUEUE.URL,
    data: {
      uuid,
    },
  });
};

export const deleteIvr = (data: any) => {
  return apiClient({
    method: routes.IVR_DELETE.METHOD,
    url: routes.IVR_DELETE.URL,
    data,
  });
};

// Monitoring
export const getCallQueueList = (data: any) => {
  return apiClient({
    method: routes.MONITORING_QUEUE_LIST.METHOD,
    url: routes.MONITORING_QUEUE_LIST.URL,
    data,
  });
};

export const smsLogGraph = (data: any) => {
  return apiClient({
    method: routes.SMS_LOG_GRAPH.METHOD,
    url: routes.SMS_LOG_GRAPH.URL,
    data,
  });
};

export const deleteMember = (id: any) => {
  return apiClient({
    method: routes.DELETE_MEMBER.METHOD,
    url: `${routes.DELETE_MEMBER.URL}/${id}`,
  });
};

/* Person states. See routes.tsx beside PERSON_SUSPEND for what each one is. */
export const suspendMember = (id: string) => {
  return apiClient({
    method: routes.PERSON_SUSPEND.METHOD,
    url: `${routes.PERSON_SUSPEND.URL}/${id}`,
  });
};

export const signOutEverywhere = (id: string) => {
  return apiClient({
    method: routes.PERSON_SIGN_OUT.METHOD,
    url: `${routes.PERSON_SIGN_OUT.URL}/${id}`,
  });
};
export const reactivateMember = (id: string) => {
  return apiClient({
    method: routes.PERSON_REACTIVATE.METHOD,
    url: `${routes.PERSON_REACTIVATE.URL}/${id}`,
  });
};

export const getPersonStates = () => {
  return apiClient({
    method: routes.PERSON_STATES.METHOD,
    url: routes.PERSON_STATES.URL,
  });
};

/* Admin scope. See routes.tsx beside PERSON_SCOPE_SET. */
export const setPersonScope = (
  id: string,
  scope: { level: string; location_uuids: string[]; group_uuids: string[] },
) => {
  return apiClient({
    method: routes.PERSON_SCOPE_SET.METHOD,
    url: `${routes.PERSON_SCOPE_SET.URL}/${id}`,
    data: scope,
  });
};

export const getPersonScopes = () => {
  return apiClient({
    method: routes.PERSON_SCOPES.METHOD,
    url: routes.PERSON_SCOPES.URL,
  });
};

export const listDeletedMembers = () => {
  return apiClient({
    method: routes.LIST_DELETED_MEMBERS.METHOD,
    url: routes.LIST_DELETED_MEMBERS.URL,
  });
};

export const restoreMember = (id: string) => {
  return apiClient({
    method: routes.RESTORE_MEMBER.METHOD,
    url: `${routes.RESTORE_MEMBER.URL}/${id}`,
  });
};

export const getPlans = () => {
  return apiClient({
    method: routes.GET_PLANS.METHOD,
    url: routes.GET_PLANS.URL,
  });
};

export const getPlanInfo = (uuid: string) => {
  return apiClient({
    method: routes.GET_PLAN_INFO.METHOD,
    url: `${routes.GET_PLAN_INFO.URL}/${uuid}`,
  });
};

export const checkPlanRates = (data: any) => {
  return apiClient({
    method: routes.CHECK_PLAN_RATES.METHOD,
    url: routes.CHECK_PLAN_RATES.URL,
    data,
  });
};

export const getSmsRate = (data: { segment: number; phone: string; alpha2code: string }) => {
  return apiClient({
    method: routes.GET_SMS_RATE.METHOD,
    url: routes.GET_SMS_RATE.URL,
    data,
  });
};

export const upgradeRequestPlan = (data: any) => {
  return apiClient({
    method: routes.UPGRADE_REQUEST_PLAN.METHOD,
    url: routes.UPGRADE_REQUEST_PLAN.URL,
    data,
  });
};
export const cancelUpgradeRequestPlan = (data: any) => {
  return apiClient({
    method: routes.CANCEL_UPGRADE_REQUEST_PLAN.METHOD,
    url: `${routes.CANCEL_UPGRADE_REQUEST_PLAN.URL}/${data?.plan_uuid}`,
  });
};

export const upgradeTrialPlan = (data: any) => {
  return apiClient({
    method: routes.UPGRADE_TRIAL_PLAN.METHOD,
    url: routes.UPGRADE_TRIAL_PLAN.URL,
    data,
  });
};
export const paymentCharge = (data: any) => {
  return apiClient({
    method: routes.PAYMENT_CHARGE.METHOD,
    url: routes.PAYMENT_CHARGE.URL,
    data,
  });
};

export const getOmniChats = (data: any) => {
  return apiClient({
    method: routes.GET_OMNI_CHATS.METHOD,
    url: routes.GET_OMNI_CHATS.URL,
    data,
  });
};

export const getMonitorDepartmentList = () => {
  return apiClient({
    method: routes.MONITOR_DEPARTMENT_LIST.METHOD,
    url: routes.MONITOR_DEPARTMENT_LIST.URL,
  });
};

// Remove Fowarding
export const removeForwarding = (data: any) => {
  return apiClient({
    method: routes.REMOVE_FORWARDING.METHOD,
    url: routes.REMOVE_FORWARDING.URL,
    data,
  });
};
export const callingRatesList = (data: any) => {
  return apiClient({
    method: routes.CALLING_RATES_LIST.METHOD,
    url: routes.CALLING_RATES_LIST.URL,
    data,
  });
};

/* Removes forwarding only. Despite the name it does NOT give the number back —
   it unwires the forwarding and any IVR menus in our own database and stops.
   Use releaseDidToCarrier below to actually hand a number back. */
export const releaseForwarding = (didNumber: string) => {
  return apiClient({
    method: routes.RELEASE_FORWARDING.METHOD,
    url: `${routes.RELEASE_FORWARDING.URL}/${didNumber}`,
  });
};

/* Hands the number back to the carrier and stops it being billed.
   Server side this looks the number up at the carrier, sends the termination,
   and only then marks it deleted here. Irreversible: once terminated the number
   is gone and may be issued to someone else. */
export const releaseDidToCarrier = (didNumber: string) => {
  return apiClient({
    method: routes.RELEASE_DID_TO_CARRIER.METHOD,
    url: `${routes.RELEASE_DID_TO_CARRIER.URL}/${didNumber}`,
  });
};

// User Template
export const upsertTemplate = ({ uuid = '', ...data }) => {
  return apiClient({
    method: routes.UPSERT_TEMPLATE.METHOD,
    url: uuid ? `${routes.UPSERT_TEMPLATE.URL}/${uuid}` : routes.UPSERT_TEMPLATE.URL,
    data: { ...data },
  });
};

export const templateList = (data: any) => {
  return apiClient({
    method: routes.TEMPLATE_LIST.METHOD,
    url: routes.TEMPLATE_LIST.URL,
    data,
  });
};

// Company settings, per section. The toast is left to src/lib/company-defaults.ts:
// a 404 from `list` is how it learns the server has not got this API yet, and
// that must be silent; a real failure it reports itself, in the same words the
// interceptor would have used.
export const listCompanySettings = () => {
  const config: CustomAxiosRequestConfig = {
    method: routes.COMPANY_SETTINGS_LIST.METHOD,
    url: routes.COMPANY_SETTINGS_LIST.URL,
    data: {},
    hideToastOnError: true,
  };
  return apiClient(config);
};

/* Scheduled reports. The list is read on a screen that may be opened by someone
   whose plan or role has never had the API, so `list` and `types` stay quiet on
   error and the page shows its own empty state; a save must speak up. */
const scheduleCall = (route: { METHOD: string; URL: string }, data: any, quiet = false) => {
  const config: CustomAxiosRequestConfig = {
    method: route.METHOD,
    url: route.URL,
    data,
    ...(quiet ? { hideToastOnError: true } : {}),
  };
  return apiClient(config);
};

export const listReportScheduleTypes = () => scheduleCall(routes.REPORT_SCHEDULE_TYPES, {}, true);
export const listReportSchedules = () => scheduleCall(routes.REPORT_SCHEDULE_LIST, {}, true);
export const createReportSchedule = (data: any) => scheduleCall(routes.REPORT_SCHEDULE_CREATE, data);
export const updateReportSchedule = (data: any) => scheduleCall(routes.REPORT_SCHEDULE_UPDATE, data);
export const toggleReportSchedule = (data: { uuid: string; enabled: boolean }) =>
  scheduleCall(routes.REPORT_SCHEDULE_TOGGLE, data);
export const deleteReportSchedule = (data: { uuid: string }) =>
  scheduleCall(routes.REPORT_SCHEDULE_DELETE, data);
export const runReportScheduleNow = (data: { uuid: string }) =>
  scheduleCall(routes.REPORT_SCHEDULE_RUN_NOW, data);

export const getCompanySettingsSection = (data: { section: string }) => {
  const config: CustomAxiosRequestConfig = {
    method: routes.COMPANY_SETTINGS_GET.METHOD,
    url: routes.COMPANY_SETTINGS_GET.URL,
    data,
    hideToastOnError: true,
  };
  return apiClient(config);
};

export const saveCompanySettingsSection = (data: {
  section: string;
  settings: any;
  version?: number;
}) => {
  const config: CustomAxiosRequestConfig = {
    method: routes.COMPANY_SETTINGS_SAVE.METHOD,
    url: routes.COMPANY_SETTINGS_SAVE.URL,
    data,
    hideToastOnError: true,
  };
  return apiClient(config);
};

export const getCompanySettingsHistory = (data: { section: string; limit?: number }) => {
  const config: CustomAxiosRequestConfig = {
    method: routes.COMPANY_SETTINGS_HISTORY.METHOD,
    url: routes.COMPANY_SETTINGS_HISTORY.URL,
    data,
    hideToastOnError: true,
  };
  return apiClient(config);
};
export const templateDelete = (id: any) => {
  return apiClient({
    method: routes.TEMPLATE_DELETE.METHOD,
    url: `${routes.TEMPLATE_DELETE.URL}/${id}`,
  });
};

// Delete Call Handling Template

export const deleteCallHandlingTemplate = (data: string) => {
  return apiClient({
    method: routes.DELETE_CALL_HANDLING_TEMPLATE.METHOD,
    url: `${routes.DELETE_CALL_HANDLING_TEMPLATE.URL}${data}`,
  });
};
export const assignNumber = (data: any) => {
  return apiClient({
    method: routes.ASSIGN_NUMBER.METHOD,
    url: routes.ASSIGN_NUMBER.URL,
    data,
  });
};

export const getCompanyInfo = (uuid: string) => {
  return apiClient({
    method: routes.COMPANY_INFO.METHOD,
    url: `${routes.COMPANY_INFO.URL}/${uuid}`,
  });
};

/* Only the fields being changed are sent. Sequelize's static update strips
   undefined values before writing, so omitting plan_features and allow_country
   leaves them untouched rather than blanking them — checked against the version
   installed on the server (6.37.8, lib/model.js line 1906) because the
   controller builds its update object with those keys always present. */
export const upsertCompany = (data: {
  uuid: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}) => {
  return apiClient({
    method: routes.COMPANY_UPSERT.METHOD,
    url: routes.COMPANY_UPSERT.URL,
    data,
    /* This route sits under /api/admin. If the deployment gates it to platform
       staff, a customer admin gets a 401 — which must read as "not permitted"
       and not end their session. Pressing Save should never log you out. */
    allowUnauthorized: true,
    hideToastOnError: true,
  } as any);
};

/* The company's own record through the tenant-scoped endpoint. Both calls are
   quiet on error because lib/company-self.ts decides what the user is told: a
   404 from the read means the server has not got this endpoint yet and must be
   silent, while a real failure must say so. A 401 here is a genuine session
   problem and is left to the interceptor. */
export const fetchCompanySelf = () => {
  const config: CustomAxiosRequestConfig = {
    method: routes.COMPANY_SELF.METHOD,
    url: routes.COMPANY_SELF.URL,
    data: {},
    hideToastOnError: true,
  };
  return apiClient(config);
};

export const updateCompanySelf = (data: {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}) => {
  const config: CustomAxiosRequestConfig = {
    method: routes.COMPANY_SELF_UPDATE.METHOD,
    url: routes.COMPANY_SELF_UPDATE.URL,
    data,
    hideToastOnError: true,
  };
  return apiClient(config);
};

export const changePassword = (data: any) => {
  return apiClient({
    method: routes.CHANGE_PASSWORD.METHOD,
    url: routes.CHANGE_PASSWORD.URL,
    data,
  });
};
export const assignNumberUser = (params: any) => {
  return apiClient({
    method: routes.ASSIGN_NUMBER_USER.METHOD,
    url: `${routes.ASSIGN_NUMBER_USER.URL}/${params?.user_uuid}`,
    data: {
      did_number: params?.did_number,
      ...(params?.type ? { type: params?.type } : {}),
    },
  });
};

//sign up

export const signup = (data: any, config: any = {}) => {
  return apiClient({
    method: routes.SIGNUP.METHOD,
    url: routes.SIGNUP.URL,
    data,
    ...config,
  });
};
export const signupOnTrial = (data: any, config: any = {}) => {
  return apiClient({
    method: routes.SIGNUP_ON_TRIAL.METHOD,
    url: routes.SIGNUP_ON_TRIAL.URL,
    data,
    ...config,
  });
};
export const sendOtp = (data: any) => {
  return apiClient({
    method: routes.SEND_OTP.METHOD,
    url: routes.SEND_OTP.URL,
    data,
  });
};

export const sendOtpForSignUP = (data: any) => {
  return apiClient({
    method: routes.SEND_OTP_FOR_SIGNUP.METHOD,
    url: routes.SEND_OTP_FOR_SIGNUP.URL,
    data,
  });
};

export const verifyOtp = (data: any) => {
  return apiClient({
    method: routes.VERIFY_OTP.METHOD,
    url: routes.VERIFY_OTP.URL,
    data,
  });
};
export const requestCustomizePlan = (data: object) => {
  return apiClient({
    method: routes.REQUEST_CUSTOMIZE_PLAN.METHOD,
    url: routes.REQUEST_CUSTOMIZE_PLAN.URL,
    data,
  });
};

export const validateAccount = (data: any) => {
  return apiClient({
    method: routes.ACCOUNT.METHOD,
    url: routes.ACCOUNT.URL,
    data,
  });
};

/* The get-started flow shows every failure inside its card, so these ask the
   client not to toast. The plain versions above keep their one-argument shape
   because react-query hands them a context as a second argument. */
const quiet = (call: { METHOD: string; URL: string }) => (data: any) =>
  apiClient({ method: call.METHOD, url: call.URL, data, hideToastOnError: true } as CustomAxiosRequestConfig);
export const validateAccountQuiet = quiet(routes.ACCOUNT);
export const sendOtpForSignUPQuiet = quiet(routes.SEND_OTP_FOR_SIGNUP);
export const verifyOtpQuiet = quiet(routes.VERIFY_OTP);
export const getTaxesAndFeesQuiet = quiet(routes.GET_TAXES_AND_FEES);

export const callRateDetail = (params: any) => {
  return apiClient({
    method: routes.CALL_RATE_DETAIL.METHOD,
    url: `${routes.CALL_RATE_DETAIL.URL}`,
    data: params,
  });
};

export function buyVirtualDID(data: any): ReturnType<typeof apiClient>;
export function buyVirtualDID(
  data: any,
  config: CustomAxiosRequestConfig,
): ReturnType<typeof apiClient>;
export function buyVirtualDID(data: any, config?: CustomAxiosRequestConfig) {
  return apiClient({
    ...config,
    method: routes.BUY_VIRTUAL_DID.METHOD,
    url: routes.BUY_VIRTUAL_DID.URL,
    data,
  });
}

export const initialPlanPayment = (data: any) => {
  return apiClient({
    method: routes.INITIAL_PLAN_PAYMENT.METHOD,
    url: routes.INITIAL_PLAN_PAYMENT.URL,
    data,
  });
};

export const getParticularUserDetail = (params: any) => {
  return apiClient({
    method: routes.PARTICULAR_USER_DETAIL.METHOD,
    url: `${routes.PARTICULAR_USER_DETAIL.URL}/${params?.uuid}`,
  });
};

// Upsert Custom Role
export const upsertCustomRole = (data: any) => {
  return apiClient({
    method: routes.UPSERT_CUSTOM_ROLE.METHOD,
    url: routes.UPSERT_CUSTOM_ROLE.URL,
    data,
  });
};

export const assignRoleBulkUsers = (data: { role_uuid: string; users: string[] }) => {
  return apiClient({
    method: routes.ASSIGN_ROLE_BULK_USERS.METHOD,
    url: routes.ASSIGN_ROLE_BULK_USERS.URL,
    data,
  });
};

export const deleteCustomRole = (uuid: string) => {
  return apiClient({
    method: routes.DELETE_CUSTOM_ROLE.METHOD,
    url: routes.DELETE_CUSTOM_ROLE.URL + uuid,
    data: {},
  });
};

export const crmGetToken = (data: any) => {
  return apiClient({
    method: routes.CRM_GET_TOKEN.METHOD,
    url: routes.CRM_GET_TOKEN.URL,
    data,
  });
};

export const hubspotCRM = (data: any) => {
  return apiClient({
    method: routes.HUB_SPOT_AUTH.METHOD,
    url: `${routes.HUB_SPOT_AUTH.URL}?type=${data}`,
  });
};
export const CRMIsConnected = () => {
  return apiClient({
    method: routes.CRM_HUBSPOT_IS_CONNECTED.METHOD,
    url: routes.CRM_HUBSPOT_IS_CONNECTED.URL,
  });
};
export const CRMDisconnect = (data: any) => {
  return apiClient({
    method: routes.CRM_HUBSPOT_DISCONNECT.METHOD,
    url: routes.CRM_HUBSPOT_DISCONNECT.URL,
    data,
  });
};
export const connectEspoCrm = (data: { instance_url: string; api_key: string }) => {
  return apiClient({
    method: routes.CRM_ESPOCRM_CONNECT.METHOD,
    url: routes.CRM_ESPOCRM_CONNECT.URL,
    data,
  });
};
export const connectOdoo = (data: {
  instance_url: string;
  database: string;
  username: string;
  api_key: string;
}) => {
  return apiClient({
    method: routes.CRM_ODOO_CONNECT.METHOD,
    url: routes.CRM_ODOO_CONNECT.URL,
    data,
  });
};
export const saveCRMSettings = (data: any) => {
  return apiClient({
    method: routes.SAVE_CRM_SETTINGS.METHOD,
    url: routes.SAVE_CRM_SETTINGS.URL,
    data,
  });
};
export const getCRMSettings = (data: any) => {
  return apiClient({
    method: routes.GET_CRM_SETTINGS.METHOD,
    url: `${routes.GET_CRM_SETTINGS.URL}?type=${data}`,
  });
};
// Update User DID
export const updateUserDID = (data: any) => {
  return apiClient({
    method: routes.UPDATE_USER_DID.METHOD,
    url: routes.UPDATE_USER_DID.URL,
    data,
  });
};

//Call Script
export const getCallScript = (data?: any) => {
  return apiClient({
    method: routes.CALL_SCRIPT_LIST.METHOD,
    url: routes.CALL_SCRIPT_LIST.URL,
    data,
  });
};

export const getCallScriptDetail = (data: { scriptId: string }) => {
  return apiClient({
    method: routes.GET_CALL_SCRIPT_DETAIL.METHOD,
    url: routes.GET_CALL_SCRIPT_DETAIL.URL,
    data,
  });
};

export const upsertCallScript = (data: any) => {
  return apiClient({
    method: routes.UPSERT_CALL_SCRIPT.METHOD,
    url: routes.UPSERT_CALL_SCRIPT.URL,
    data,
  });
};

export const getScriptAnswersReport = (data: {
  scriptId: string;
  from?: string;
  to?: string;
  campaignId?: string;
  queueUuid?: string;
  text_limit?: number;
}) => {
  return apiClient({
    method: routes.SCRIPT_ANSWERS_REPORT.METHOD,
    url: routes.SCRIPT_ANSWERS_REPORT.URL,
    data,
  });
};

export const deleteCallScript = (data: any) => {
  return apiClient({
    method: routes.CALL_SCRIPT_DELETE.METHOD,
    url: routes.CALL_SCRIPT_DELETE.URL,
    data,
  });
};

// Dispositions
/* The calling hours and abandoned-call limit for one country, read from the
   same module the dialer enforces. The screen must never keep its own copy of
   these numbers, or it could tell somebody they are safe when they are not. */
export const getCallingRules = (country: string) => {
  return apiClient({
    method: routes.CAMPAIGN_CALLING_RULES.METHOD,
    url: `${routes.CAMPAIGN_CALLING_RULES.URL}?country=${encodeURIComponent(country || '')}`,
  });
};

/**
 * The live dialer board for one campaign.
 *
 * A 404 is an ANSWER here, not a failure: either the campaign is not running,
 * or this deployment's campaign-api predates the route. Both mean "there is no
 * board", which the page already handles by showing the stored record — so the
 * global error toast is suppressed rather than shouting on every page load.
 */
export const getCampaignLiveSnapshot = (data: { campaignId: string }) => {
  return apiClient({
    method: routes.CAMPAIGN_LIVE_SNAPSHOT.METHOD,
    url: routes.CAMPAIGN_LIVE_SNAPSHOT.URL,
    data,
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};

/**
 * Skill coverage for one campaign: leads grouped by the skill they name, how
 * many people on the team hold each, and how many leads nobody can take.
 * A 404 is an answer (the server predates the route), not a failure; the
 * card says so instead of toasting.
 */
export const getCampaignSkillCoverage = (data: { campaignId: string }) => {
  return apiClient({
    method: routes.CAMPAIGN_SKILL_COVERAGE.METHOD,
    url: `${routes.CAMPAIGN_SKILL_COVERAGE.URL}/${encodeURIComponent(data.campaignId)}/skill-coverage`,
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};

export const getDispositions = (data: any) => {
  return apiClient({
    method: routes.DISPOSITION_LIST.METHOD,
    url: routes.DISPOSITION_LIST.URL,
    data,
  });
};

export const upsertDispositions = (data: any) => {
  return apiClient({
    method: routes.DISPOSITION_UPSERT.METHOD,
    url: routes.DISPOSITION_UPSERT.URL,
    data,
  });
};
export const deleteReposition = (data: any) => {
  return apiClient({
    method: routes.DISPOSITION_DELETE.METHOD,
    url: routes.DISPOSITION_DELETE.URL,
    data,
  });
};
/* Agent screen recordings */
export const saveScreenRecording = (data: any) => {
  return apiClient({
    method: routes.SCREEN_RECORDING_SAVE.METHOD,
    url: routes.SCREEN_RECORDING_SAVE.URL,
    data,
  });
};
export const listScreenRecordings = (data: { call_uuids: string[]; extension?: string; from?: string; to?: string }) => {
  return apiClient({
    method: routes.SCREEN_RECORDING_LIST.METHOD,
    url: routes.SCREEN_RECORDING_LIST.URL,
    data,
  });
};
/* Coaching teams */
export const listCoachingTeams = (data: { search?: string; page?: number; limit?: number }) => {
  return apiClient({
    method: routes.COACHING_TEAM_LIST.METHOD,
    url: routes.COACHING_TEAM_LIST.URL,
    data,
  });
};
export const myCoachingTeams = () => {
  return apiClient({
    method: routes.COACHING_TEAM_MINE.METHOD,
    url: routes.COACHING_TEAM_MINE.URL,
  });
};
export const saveCoachingTeam = (data: any) => {
  return apiClient({
    method: routes.COACHING_TEAM_SAVE.METHOD,
    url: routes.COACHING_TEAM_SAVE.URL,
    data,
  });
};
export const deleteCoachingTeam = (uuid: string) => {
  return apiClient({
    method: routes.COACHING_TEAM_DELETE.METHOD,
    url: `${routes.COACHING_TEAM_DELETE.URL}/${uuid}`,
  });
};
export const getSkills = (data: any) => {
  return apiClient({
    method: routes.SKILL_LIST.METHOD,
    url: routes.SKILL_LIST.URL,
    data,
  });
};
export const upsertSkill = (data: any) => {
  return apiClient({
    method: routes.SKILL_UPSERT.METHOD,
    url: routes.SKILL_UPSERT.URL,
    data,
  });
};
export const deleteSkill = (data: any) => {
  return apiClient({
    method: routes.SKILL_DELETE.METHOD,
    url: routes.SKILL_DELETE.URL,
    data,
  });
};
export const getUserSkills = (data: any) => {
  return apiClient({
    method: routes.USER_SKILLS_GET.METHOD,
    url: routes.USER_SKILLS_GET.URL,
    data,
  });
};
export const setUserSkills = (data: any) => {
  return apiClient({
    method: routes.USER_SKILLS_SET.METHOD,
    url: routes.USER_SKILLS_SET.URL,
    data,
  });
};
/* One skill's roster: who holds it and at how many stars. The same rows the
   profile tab writes, read and written from the skill's side. */
export const getSkillPeople = (data: any) => {
  return apiClient({
    method: routes.SKILL_PEOPLE_GET.METHOD,
    url: routes.SKILL_PEOPLE_GET.URL,
    data,
  });
};

export const setSkillPeople = (data: any) => {
  return apiClient({
    method: routes.SKILL_PEOPLE_SET.METHOD,
    url: routes.SKILL_PEOPLE_SET.URL,
    data,
  });
};

export const getUsersSkills = (data: any) => {
  return apiClient({
    method: routes.USERS_SKILLS_GET.METHOD,
    url: routes.USERS_SKILLS_GET.URL,
    data,
  });
};

/* Skill categories: the headings skills sit under (Language, Sales...). */
/* The duty axis: start / break / end shift, or ready again, for oneself or
   (managers) for somebody else; and everyone's duty on the company's queues. */
export const setAgentDuty = (data: {
  action: 'start' | 'break' | 'end' | 'ready';
  user_uuid?: string;
  reason_id?: string;
  reason?: string;
}) => {
  return apiClient({
    method: routes.AGENT_DUTY.METHOD,
    url: routes.AGENT_DUTY.URL,
    data,
  });
};

export const listAgentDuty = (data: { user_uuids?: string[] }) => {
  return apiClient({
    method: routes.AGENT_DUTY_LIST.METHOD,
    url: routes.AGENT_DUTY_LIST.URL,
    data,
  });
};

/* Agent-day reports, read from the duty history. Dates are calendar days in
   `timezone`; an agent gets their own day only, whatever they ask for. */
export interface AgentDayParams {
  date_from: string;
  date_to: string;
  timezone: string;
  user_uuids?: string[];
  queue_uuid?: string;
  campaign_id?: string;
  allowances?: Record<string, number>;
}
const agentDayCall = (route: { METHOD: string; URL: string }, data: AgentDayParams) =>
  apiClient({ method: route.METHOD, url: route.URL, data });
export const getAgentDaySummary = (data: AgentDayParams) => agentDayCall(routes.AGENT_DAY_SUMMARY, data);
export const getAgentDayIntervals = (data: AgentDayParams) => agentDayCall(routes.AGENT_DAY_INTERVALS, data);
export const getAgentDayBreaks = (data: AgentDayParams) => agentDayCall(routes.AGENT_DAY_BREAKS, data);
export const getAgentDayPreview = (data: AgentDayParams) => agentDayCall(routes.AGENT_DAY_PREVIEW, data);
/* Workforce: schedules, time off and coverage (campaign-api behind the gateway). */
const workforceCall = (route: { METHOD: string; URL: string }, data: Record<string, unknown>) => apiClient({ method: route.METHOD, url: route.URL, data });
export const listSchedules = (data: { date_from: string; date_to: string; user_uuids?: string[] }) => workforceCall(routes.WORKFORCE_SCHEDULE_LIST, data);
export const saveSchedules = (data: { timezone: string; publish?: boolean; rows: Array<{ user_uuid: string; date: string; blocks: Array<{ start: string; end: string; code: string; label?: string }> }> }) => workforceCall(routes.WORKFORCE_SCHEDULE_SAVE, data);
export const publishSchedules = (data: { date_from: string; date_to: string; user_uuids?: string[] }) => workforceCall(routes.WORKFORCE_SCHEDULE_PUBLISH, data);
export const listTimeOff = (data: { status?: string; user_uuid?: string }) => workforceCall(routes.WORKFORCE_TIMEOFF_LIST, data);
export const requestTimeOff = (data: { code: string; date_from: string; date_to: string; note?: string; user_uuid?: string }) => workforceCall(routes.WORKFORCE_TIMEOFF_REQUEST, data);
export const decideTimeOff = (data: { id: string; decision: 'approved' | 'declined'; note?: string; timezone?: string }) => workforceCall(routes.WORKFORCE_TIMEOFF_DECIDE, data);
export const getCoverage = (data: { date: string; timezone: string; handle_seconds?: number; occupancy?: number }) => workforceCall(routes.WORKFORCE_COVERAGE, data);

export const getSkillCategories = (data: any) => {
  return apiClient({
    method: routes.SKILL_CATEGORY_LIST.METHOD,
    url: routes.SKILL_CATEGORY_LIST.URL,
    data,
  });
};

export const upsertSkillCategory = (data: any) => {
  return apiClient({
    method: routes.SKILL_CATEGORY_UPSERT.METHOD,
    url: routes.SKILL_CATEGORY_UPSERT.URL,
    data,
  });
};

export const deleteSkillCategory = (data: any) => {
  return apiClient({
    method: routes.SKILL_CATEGORY_DELETE.METHOD,
    url: routes.SKILL_CATEGORY_DELETE.URL,
    data,
  });
};

// Running Campign
export const getRunningCampaigns = () => {
  return apiClient({
    method: routes.RUNNING_CAMPIGN_LIST.METHOD,
    url: routes.RUNNING_CAMPIGN_LIST.URL,
    data: {},
  });
};

export const validateCampaignLeadAssignment = (data?: object) => {
  return apiClient({
    method: routes.CAMPAIGN_VALIDATE_LEAD_ASSIGNMENT.METHOD,
    url: routes.CAMPAIGN_VALIDATE_LEAD_ASSIGNMENT.URL,
    data,
  });
};

export const getRunningCampaignsContacts = (data: any) => {
  return apiClient({
    method: routes.RUNNING_CAMPIGN_CONTACTS.METHOD,
    url: routes.RUNNING_CAMPIGN_CONTACTS.URL,
    data,
  });
};

export const addDispositionInLeadContatc = (data: any) => {
  return apiClient({
    method: routes.ADD_DISPOSITION_FOR_LEAD.METHOD,
    url: routes.ADD_DISPOSITION_FOR_LEAD.URL,
    data,
  });
};

export const saveNoteInLeadContact = (data: any) => {
  return apiClient({
    method: routes.ADD_NOTE_DISPOSITION_FOR_LEAD.METHOD,
    url: routes.ADD_NOTE_DISPOSITION_FOR_LEAD.URL,
    data,
  });
};

/** Abandon rate per campaign per day and calls per number per day, for the regulator. */
export const getCampaignComplianceReport = (data: {
  from?: string;
  to?: string;
  timezone?: string;
  campaignId?: string;
  abandonCapPercent?: number;
}) => {
  return apiClient({
    method: routes.CAMPAIGN_COMPLIANCE_REPORT.METHOD,
    url: routes.CAMPAIGN_COMPLIANCE_REPORT.URL,
    data,
  });
};

export const getCampaignSummary = (data: any) => {
  return apiClient({
    method: routes.CAMPAIGN_SUMMARY.METHOD,
    url: routes.CAMPAIGN_SUMMARY.URL,
    data,
  });
};
export const getContactCampaignActivty = (data: any) => {
  return apiClient({
    method: routes.CONATCT_CAMPAIGN_ACTIVITY_LIST.METHOD,
    url: routes.CONATCT_CAMPAIGN_ACTIVITY_LIST.URL,
    data,
  });
};
export const getCampaignActivtyLogs = (data: any) => {
  return apiClient({
    method: routes.CAMPAIGN_CALL_LOGS.METHOD,
    url: routes.CAMPAIGN_CALL_LOGS.URL,
    data,
  });
};

export const getCampaignRetryCallLogs = (data?: object) => {
  return apiClient({
    method: routes.CAMPAIGN_RETRY_CALL_LOG.METHOD,
    url: routes.CAMPAIGN_RETRY_CALL_LOG.URL,
    data,
  });
};

export const getAllNotes = (data: any) => {
  return apiClient({
    method: routes.GET_ALL_NOTES.METHOD,
    url: routes.GET_ALL_NOTES.URL,
    data,
  });
};

export const getCallQueueNotesList = (data: {
  phone?: string | null;
  sipCallId?: string | null;
}) => {
  return apiClient({
    method: routes.CALL_QUEUE_NOTES_LIST.METHOD,
    url: routes.CALL_QUEUE_NOTES_LIST.URL,
    data,
  });
};

export const addLeadInExistingGroup = (data: {
  groupIds: Array<string>;
  contactId: Array<string>;
}) => {
  return apiClient({
    method: routes.ADD_LEAD_IN_EXISTING_GROUP.METHOD,
    url: routes.ADD_LEAD_IN_EXISTING_GROUP.URL,
    data,
  });
};
export const getUserBasedDepartment = (payload?: any) => {
  return apiClient({
    method: routes.USER_BASED_DEPARTMENT_LIST.METHOD,
    url: routes.USER_BASED_DEPARTMENT_LIST.URL,
    data: payload,
  });
};
export const getCallQueueInvolvements = (payload?: any) => {
  return apiClient({
    method: routes.CALLQUEUE_INVOLVEMENT.METHOD,
    url: routes.CALLQUEUE_INVOLVEMENT.URL,
    data: payload,
  });
};
/* In-queue callbacks: everyone holding a place to be called back (optionally
   one queue), and a supervisor withdrawing one by id. */
export const callQueueCallbacksList = (payload?: { queue_uuid?: string }) => {
  return apiClient({
    method: routes.CALL_QUEUE_CALLBACKS_LIST.METHOD,
    url: routes.CALL_QUEUE_CALLBACKS_LIST.URL,
    data: payload || {},
  });
};
export const callQueueCallbackCancel = (payload: { id: string }) => {
  return apiClient({
    method: routes.CALL_QUEUE_CALLBACKS_CANCEL.METHOD,
    url: routes.CALL_QUEUE_CALLBACKS_CANCEL.URL,
    data: payload,
  });
};
export const makeCallQueueAvailable = (data: object) => {
  return apiClient({
    method: routes.MAKE_CALLQUEUE_AVAILABLE.METHOD,
    url: routes.MAKE_CALLQUEUE_AVAILABLE.URL,
    data,
  });
};
export const getUserBasedCampaign = (payload?: any) => {
  return apiClient({
    method: routes.USER_BASED_CAMPAIGNS_LIST.METHOD,
    url: routes.USER_BASED_CAMPAIGNS_LIST.URL,
    data: payload,
  });
};

export const getCampaignDispositionSummary = (data: any) => {
  return apiClient({
    method: routes.CAMPAIGN_DISPOSITION_SUMMARY.METHOD,
    url: routes.CAMPAIGN_DISPOSITION_SUMMARY.URL,
    data,
  });
};
export const getDispositionLogsSummary = (data?: object) => {
  return apiClient({
    method: routes.DISPOSITION_LOGS_SUMMARY.METHOD,
    url: routes.DISPOSITION_LOGS_SUMMARY.URL,
    data,
  });
};
export const getDispositionLogSingleSummary = (data?: object) => {
  return apiClient({
    method: routes.DISPOSITION_LOG_SINGAL_SUMMARY.METHOD,
    url: routes.DISPOSITION_LOG_SINGAL_SUMMARY.URL,
    data,
  });
};

export const getWhatsappTemplates = (data: { whats_app_template_id: string }) => {
  return apiClient({
    method: routes.GET_WHATSAPP_TEMPLATE.METHOD,
    url: routes.GET_WHATSAPP_TEMPLATE.URL,
    data,
  });
};

export const sendWhatsAppMessage = (data: any) => {
  return apiClient({
    method: routes.SEND_WHATSAPP_MESSAGE.METHOD,
    url: routes.SEND_WHATSAPP_MESSAGE.URL,
    data,
  });
};

export const getWhatsAppChats = (data: any) => {
  return apiClient({
    method: routes.GET_WHATSAPP_CHATS.METHOD,
    url: routes.GET_WHATSAPP_CHATS.URL,
    data,
  });
};

export const getWhatsAppMessages = (data: any) => {
  return apiClient({
    method: routes.GET_WHATSAPP_MESSAGES.METHOD,
    url: routes.GET_WHATSAPP_MESSAGES.URL,
    data,
  });
};

export const purchaseLicenses = (data: any) => {
  return apiClient({
    method: routes.LICENSE_PURCHASE.METHOD,
    url: routes.LICENSE_PURCHASE.URL,
    data,
  });
};

export const allOmniChannelsList = (
  data: { page: number; limit: number } = { page: 1, limit: 25 },
) => {
  return apiClient({
    method: routes.ALL_OMNI_CHANNELS_LIST.METHOD,
    url: routes.ALL_OMNI_CHANNELS_LIST.URL,
    data,
  });
};

export const getLicenseUserList = (data?: any) => {
  return apiClient({
    method: routes.LICENSE_USER_LIST.METHOD,
    url: routes.LICENSE_USER_LIST.URL,
    data,
  });
};

export const revokeLicense = (data: any) => {
  return apiClient({
    method: routes.REVOKE_LICENSE.METHOD,
    url: routes.REVOKE_LICENSE.URL,
    data,
  });
};
export const shareRecording = (data: any) => {
  return apiClient({
    method: routes.SHARE_RECORDING.METHOD,
    url: routes.SHARE_RECORDING.URL,
    data,
  });
};

export const addRunningCampaignEvent = (data: any) => {
  return apiClient({
    method: routes.ADD_RUNNING_CAMPAIGN_EVENT.METHOD,
    url: routes.ADD_RUNNING_CAMPAIGN_EVENT.URL,
    data,
  });
};
export const getCampaignActivityRecords = (data: any) => {
  return apiClient({
    method: routes.GET_CAMPAIGN_ACTIVITY_RECORDS.METHOD,
    url: routes.GET_CAMPAIGN_ACTIVITY_RECORDS.URL,
    data,
  });
};
export const getCampaignAgentActivityRecords = (data: any) => {
  return apiClient({
    method: routes.GET_CAMPAIGN_AGENT_ACTIVITY_RECORDS.METHOD,
    url: routes.GET_CAMPAIGN_AGENT_ACTIVITY_RECORDS.URL,
    data,
  });
};

export const videoDashboardStats = (data: any) => {
  return apiClient({
    method: routes.VIDEO_DASHBOARD_STATS.METHOD,
    url: routes.VIDEO_DASHBOARD_STATS.URL,
    data,
  });
};

// Device Security
export const deviceSecurityList = (data: object) => {
  return apiClient({
    method: routes.DEVICE_SECURITY.METHOD,
    url: routes.DEVICE_SECURITY.URL,
    data,
  });
};

export const logout = (data: any) => {
  return apiClient({
    method: routes.LOGOUT.METHOD,
    url: routes.LOGOUT.URL,
    data,
  });
};

export const renewPlan = (data: any) => {
  return apiClient({
    method: routes.RENEW_PLAN.METHOD,
    url: routes.RENEW_PLAN.URL,
    data,
  });
};

// AI AGENTS

export const getAttachedAgentsList = (data?: object) => {
  return apiClient({
    method: routes.GET_AI_AGENT_ATTACHED_LIST.METHOD,
    url: routes.GET_AI_AGENT_ATTACHED_LIST.URL,
    data,
  });
};
export const AIUserKnowledgeBase = (data?: object) => {
  return apiClient({
    method: routes.AI_USER_KNOWLEDGE_BASE.METHOD,
    url: routes.AI_USER_KNOWLEDGE_BASE.URL,
    data,
  });
};
export const siteCrawl = (data: { site_url: string }) => {
  return apiClient({
    method: routes.SITE_CRAWL.METHOD,
    url: routes.SITE_CRAWL.URL,
    data,
  });
};
export type SummarizeKnowledgeBasePayload = {
  crawl_url?: string[];
  url?: string[];
  text?: string[];
  pdf?: string[];
  reviewSessionId?: string;
};
export type GenerateKnowledgeBaseFaqPayload = {
  crawl_url?: string[];
  url?: string[];
  text?: string[];
};
const getAIPortalBaseURL = () => `${getEnv()?.VITE_AI_URL}/`;

export const getSummaryUploadPdfUrl = (data?: object) => {
  return apiClient({
    baseURL: getAIPortalBaseURL(),
    method: routes.GET_SUMMARY_UPLOAD_PDF_URL.METHOD,
    url: routes.GET_SUMMARY_UPLOAD_PDF_URL.URL,
    data,
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};

export const uploadSummaryPdfFiles = async (files: globalThis.File[]) => {
  if (!files.length) return [];

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file, file.name));

  const response = await apiClient({
    baseURL: getEnv().VITE_API_BASE_URL,
    method: routes.AI_KNOWLEDGE_BASE_REVIEW_PDF_TEXT.METHOD,
    url: routes.AI_KNOWLEDGE_BASE_REVIEW_PDF_TEXT.URL,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
  const pdf = response?.data?.data?.pdf || response?.data?.pdf || [];

  return Array.isArray(pdf) ? pdf.map((item) => String(item || '').trim()).filter(Boolean) : [];
};
export const summarizeKnowledgeBase = (data: SummarizeKnowledgeBasePayload) => {
  const config: CustomAxiosRequestConfig = {
    baseURL: getEnv().VITE_API_BASE_URL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    method: routes.AI_SUMMARIZE_KNOWLEDGE_BASE.METHOD,
    url: routes.AI_SUMMARIZE_KNOWLEDGE_BASE.URL,
    data: {
      crawl_url: data.crawl_url ?? [],
      url: data.url ?? [],
      text: data.text ?? [],
      pdf: data.pdf ?? [],
      reviewSessionId: data.reviewSessionId,
    },
    hideToastOnError: true,
  };

  return apiClient(config);
};
export const startKnowledgeBaseReviewJob = (data: SummarizeKnowledgeBasePayload) => {
  return apiClient({
    baseURL: getEnv().VITE_API_BASE_URL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    method: routes.AI_KNOWLEDGE_BASE_REVIEW_JOB.METHOD,
    url: routes.AI_KNOWLEDGE_BASE_REVIEW_JOB.URL,
    data: {
      crawl_url: data.crawl_url ?? [],
      url: data.url ?? [],
      text: data.text ?? [],
      pdf: data.pdf ?? [],
      reviewSessionId: data.reviewSessionId,
    },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};
export const cleanupKnowledgeBaseReviewJobs = (jobIds: string[]) => {
  return apiClient({
    baseURL: getEnv().VITE_API_BASE_URL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    method: routes.AI_KNOWLEDGE_BASE_REVIEW_JOB_CLEANUP.METHOD,
    url: routes.AI_KNOWLEDGE_BASE_REVIEW_JOB_CLEANUP.URL,
    data: { jobIds },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};
export const getKnowledgeBaseReviewJob = (jobId: string) => {
  return apiClient({
    baseURL: getEnv().VITE_API_BASE_URL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    method: routes.AI_KNOWLEDGE_BASE_REVIEW_JOB_STATUS.METHOD,
    url: routes.AI_KNOWLEDGE_BASE_REVIEW_JOB_STATUS.URL,
    data: { jobId },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};
export const generateKnowledgeBaseFaq = (data: GenerateKnowledgeBaseFaqPayload) => {
  return apiClient({
    method: routes.AI_GENERATE_KNOWLEDGE_BASE_FAQ.METHOD,
    url: routes.AI_GENERATE_KNOWLEDGE_BASE_FAQ.URL,
    data: {
      crawl_url: data.crawl_url ?? [],
      url: data.url ?? [],
      text: data.text ?? [],
    },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};
export const createAIAgent = (data: any) => {
  return apiClient({
    method: routes.AI_AGENT_CREATE.METHOD,
    url: routes.AI_AGENT_CREATE.URL,
    data,
  });
};
export const createAIAgentDraft = (data: any) => {
  return apiClient({
    method: routes.AI_AGENT_DRAFT_CREATE.METHOD,
    url: routes.AI_AGENT_DRAFT_CREATE.URL,
    data,
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};
export const createAiReceptionist = (data: any) => {
  return apiClient({
    method: routes.CREATE_AI_RECEPTIONIST.METHOD,
    url: routes.CREATE_AI_RECEPTIONIST.URL,
    data,
  });
};
export const createAiReceptionistDraft = (data: any) => {
  return apiClient({
    method: routes.CREATE_AI_RECEPTIONIST_DRAFT.METHOD,
    url: routes.CREATE_AI_RECEPTIONIST_DRAFT.URL,
    data,
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
};
export const updateAIAgent = (data: any) => {
  return apiClient({
    method: routes.AI_AGENT_UPDATE.METHOD,
    url: routes.AI_AGENT_UPDATE.URL,
    data,
  });
};
export const updateAiReceptionist = (data: any) => {
  return apiClient({
    method: routes.UPDATE_AI_RECEPTIONIST.METHOD,
    url: routes.UPDATE_AI_RECEPTIONIST.URL,
    data,
  });
};
export const getAgentList = (data?: any) => {
  return apiClient({
    method: routes.GET_URL_TYPE_LIST.METHOD,
    url: routes.GET_URL_TYPE_LIST.URL,
    data,
  });
};
export const getChatAgentList = (data?: any) => {
  return apiClient({
    method: routes.GET_URL_TYPE_CHAT_AGENT_LIST.METHOD,
    url: routes.GET_URL_TYPE_CHAT_AGENT_LIST.URL,
    data,
  });
};
export const getChatAgentMetrics = (data?: any) => {
  return apiClient({
    method: routes.GET_CHAT_AGENT_METRICS.METHOD,
    url: routes.GET_CHAT_AGENT_METRICS.URL,
    data,
  });
};
export const updateAgentStatus = (data: {
  agentType: 'voice' | 'chat';
  agentId: string;
  status: 'active' | 'inactive';
}) => {
  return apiClient({
    method: routes.AI_AGENT_STATUS_UPDATE.METHOD,
    url: routes.AI_AGENT_STATUS_UPDATE.URL,
    data,
  });
};
export const getAIReceptionistList = (data?: any) => {
  return apiClient({
    method: routes.GET_AI_RECEPTIONIST_LIST.METHOD,
    url: routes.GET_AI_RECEPTIONIST_LIST.URL,
    data,
  });
};
export const getAIReceptionistMetrics = (data?: any) => {
  return apiClient({
    method: routes.GET_AI_RECEPTIONIST_METRICS.METHOD,
    url: routes.GET_AI_RECEPTIONIST_METRICS.URL,
    data,
  });
};
export const getReceptionistAnalytics = (data: {
  startDate: string;
  endDate: string;
  agentId?: string;
  timezone?: string;
}) => {
  return apiClient({
    method: routes.GET_RECEPTIONIST_ANALYTICS.METHOD,
    url: routes.GET_RECEPTIONIST_ANALYTICS.URL,
    data,
  });
};
export const getChatAgentAnalytics = (data: {
  startDate: string;
  endDate: string;
  agentId?: string;
  timezone?: string;
}) => {
  return apiClient({
    method: routes.GET_CHAT_AGENT_ANALYTICS.METHOD,
    url: routes.GET_CHAT_AGENT_ANALYTICS.URL,
    data,
  });
};
export const addReceptionistDid = (data: any) => {
  return apiClient({
    method: routes.ADD_RECEPTIONIST_DID.METHOD,
    url: routes.ADD_RECEPTIONIST_DID.URL,
    data,
  });
};
export const getAIVoiceList = (data?: any) => {
  return apiClient({
    method: routes.AI_VOICE_LIST.METHOD,
    url: routes.AI_VOICE_LIST.URL,
    data,
  });
};
export const getAIVoicePreview = (data: { short_name: string }) => {
  return apiClient({
    method: routes.AI_VOICE_PREVIEW.METHOD,
    url: routes.AI_VOICE_PREVIEW.URL,
    data,
  });
};
export const userIngestURL = (data?: any) => {
  return apiClient({
    method: routes.AI_USER_INGEST_URL.METHOD,
    url: routes.AI_USER_INGEST_URL.URL,
    data,
  });
};
export const userAddContent = (data?: any) => {
  return apiClient({
    method: routes.AI_USER_ADD_CONTENT.METHOD,
    url: routes.AI_USER_ADD_CONTENT.URL,
    data,
  });
};
export const getAIAgentToken = () => {
  return Promise.resolve({
    data: {
      data: {
        result: {
          tokenId: '',
        },
      },
    },
  });
};
export const getAIAgentType = (data: any = {}) => {
  return apiClient({
    method: routes.AI_AGENT_TYPE.METHOD,
    url: routes.AI_AGENT_TYPE.URL,
    data,
  });
};
export const getAIAgentKnowledgeBase = (data: object) => {
  return apiClient({
    method: routes.AI_AGENT_GET_KNOWLEDGE_BASE.METHOD,
    url: routes.AI_AGENT_GET_KNOWLEDGE_BASE.URL,
    data,
  });
};
export const deleteAIAgentKnowledgeBase = (data: object) => {
  return apiClient({
    method: routes.DELETE_AI_AGENT_KNOWLEDGE_BASE.METHOD,
    url: routes.DELETE_AI_AGENT_KNOWLEDGE_BASE.URL,
    data,
  });
};
export const deleteAIAgent = (data: object) => {
  return apiClient({
    method: routes.AI_AGENT_DELETE.METHOD,
    url: routes.AI_AGENT_DELETE.URL,
    data,
  });
};
export const deleteAIReceptionist = (data: object) => {
  return apiClient({
    method: routes.DELETE_AI_RECEPTIONIST.METHOD,
    url: routes.DELETE_AI_RECEPTIONIST.URL,
    data,
  });
};
export const getAIDomainList = (data: object) => {
  return apiClient({
    method: routes.GET_AI_DOMAIN_LIST.METHOD,
    url: routes.GET_AI_DOMAIN_LIST.URL,
    data,
  });
};
export const addAIDomain = (data: object) => {
  return apiClient({
    method: routes.AI_ADD_DOMAIN.METHOD,
    url: routes.AI_ADD_DOMAIN.URL,
    data,
  });
};
export const addGlobalIngestion = (data: object) => {
  return apiClient({
    method: routes.ADD_GLOBAL_INGESTION.METHOD,
    url: routes.ADD_GLOBAL_INGESTION.URL,
    data,
  });
};
export const addGlobalKnowledgeBase = (data: object) => {
  return apiClient({
    baseURL: getAIPortalBaseURL(),
    method: routes.ADD_GLOBAL_KNOWLEDGE_BASE.METHOD,
    // url: routes.ADD_GLOBAL_KNOWLEDGE_BASE.URL,
    url: 'api/multi/ingest/attach',
    data,
  });
};
export const getMultipleAttachedAgentsList = (data: any) => {
  return apiClient({
    baseURL: getAIPortalBaseURL(),
    method: 'GET',
    url: `api/ingest/attached/list?token=${data?.token}&ingestionId=${data?.ingestionId}`,
    data,
  });
};
export const deleteAIDomain = (data: object) => {
  return apiClient({
    method: routes.AI_DOMAIN_DELETE.METHOD,
    url: routes.AI_DOMAIN_DELETE.URL,
    data,
  });
};
export const AISettingConfig = (data: object) => {
  return apiClient({
    method: routes.AI_SETTINGS.METHOD,
    url: routes.AI_SETTINGS.URL,
    data,
  });
};
export const getAISettingConfig = () => {
  return apiClient({
    method: routes.GET_AI_SETTINGS.METHOD,
    url: routes.GET_AI_SETTINGS.URL,
  });
};

/* Ask for a rewritten version of a draft message.
 *
 * `mode` is one of polish | formalize | elaborate | shorten | custom, and
 * `instruction` is only read for `custom`. The reply is text and nothing else
 * happens: the server never sends a message, so the caller decides whether the
 * suggestion is used at all. The company is taken from the session server-side
 * rather than sent from here - it selects which brand's AI key is spent. */
/* Fire-and-forget: a rating must never interrupt what someone was doing, so
   the caller does not await it and the server always answers 200. */
export const rateMessageRewrite = (data: { rating: 'up' | 'down'; mode: string }) => {
  return apiClient({
    method: routes.AI_MESSAGE_REWRITE_FEEDBACK.METHOD,
    url: routes.AI_MESSAGE_REWRITE_FEEDBACK.URL,
    data,
  });
};

export const rewriteMessageDraft = (data: {
  text: string;
  mode: 'polish' | 'formalize' | 'elaborate' | 'shorten' | 'custom';
  instruction?: string;
}) => {
  return apiClient({
    method: routes.AI_MESSAGE_REWRITE.METHOD,
    url: routes.AI_MESSAGE_REWRITE.URL,
    data,
  });
};

/* Both send the messages already loaded in the open conversation - nothing
   is fetched server-side and nothing is stored once the response returns. */
export const summarizeConversation = (data: { messages: { sender: string; text: string }[] }) => {
  return apiClient({
    method: routes.AI_CONVERSATION_SUMMARIZE.METHOD,
    url: routes.AI_CONVERSATION_SUMMARIZE.URL,
    data,
  });
};

export const askAboutConversation = (data: {
  messages: { sender: string; text: string }[];
  question: string;
}) => {
  return apiClient({
    method: routes.AI_CONVERSATION_ASK.METHOD,
    url: routes.AI_CONVERSATION_ASK.URL,
    data,
  });
};

/* `draft` is what the person has typed so far. Sent, every suggestion comes
   back continuing it rather than replacing it. */
export const suggestReplies = (data: {
  messages: { sender: string; text: string }[];
  draft?: string;
}) => {
  return apiClient({
    method: routes.AI_CONVERSATION_SUGGEST_REPLIES.METHOD,
    url: routes.AI_CONVERSATION_SUGGEST_REPLIES.URL,
    data,
  });
};

export interface CallRecap {
  call_uuid: string;
  summary: string;
  action_items: string[];
  purpose: string;
  outcome: string;
  keywords: string[];
  intent: string;
  /* Model's read of overall tone, computed once from the full transcript -
     not a live, per-second measurement. Null until a recap exists. */
  sentiment: { positive: number; neutral: number; negative: number } | null;
  edited: boolean;
  generated_at: string | null;
  unavailable_reason?: string | null;
}

/* Generates (or returns an already-generated) recap. `force` regenerates even
   when one is stored - the only way to overwrite an edited recap. */
export const generateCallRecap = (data: {
  call_uuid: string;
  transcript_file?: string | null;
  force?: boolean;
}) => {
  return apiClient({
    method: routes.AI_CALL_RECAP.METHOD,
    url: routes.AI_CALL_RECAP.URL,
    data,
  });
};

/* Reads a stored recap without calling the model, so a list can show what
   exists at no cost. */
export const getCallRecap = (data: { call_uuid: string }) => {
  return apiClient({
    method: routes.AI_CALL_RECAP_GET.METHOD,
    url: routes.AI_CALL_RECAP_GET.URL,
    data,
  });
};

export const updateCallRecap = (data: {
  call_uuid: string;
  summary?: string;
  action_items?: string[];
  purpose?: string;
  outcome?: string;
}) => {
  return apiClient({
    method: routes.AI_CALL_RECAP_UPDATE.METHOD,
    url: routes.AI_CALL_RECAP_UPDATE.URL,
    data,
  });
};

export const getUploadPdfUrl = (data?: object) => {
  return apiClient({
    baseURL: getAIPortalBaseURL(),
    method: routes.GET_UPLOAD_PDF_URL.METHOD,
    url: routes.GET_UPLOAD_PDF_URL.URL,
    data,
  });
};
export const uploadIngestPdf = (data?: object) => {
  return apiClient({
    method: routes.UPLOAD_INGEST_PDF.METHOD,
    url: routes.UPLOAD_INGEST_PDF.URL,
    data,
    ...(typeof FormData !== 'undefined' && data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {}),
  });
};
export const downloadPdf = (data?: object) => {
  return apiClient({
    baseURL: getAIPortalBaseURL(),
    method: routes.DOWNLOAD_PDF.METHOD,
    url: routes.DOWNLOAD_PDF.URL,
    data,
  });
};
export const getAgentLists = ({ token }: any) => {
  return apiClient({
    baseURL: getAIPortalBaseURL(),
    method: routes.GET_AGENT_LIST.METHOD,
    url: `${routes.GET_AGENT_LIST.URL}/list?token=${token}`,
  });
};
export const getAgentBillingList = () => {
  return apiClient({
    // baseURL: getAIPortalBaseURL(),
    method: 'POST',
    url: '/api/ai/agent/billing/list',
  });
};
export const getSessionList = ({ agentId, channel, page, limit, callUuid }: any) => {
  return apiClient({
    method: routes.GET_SESSION_LIST.METHOD,
    url: `${routes.GET_SESSION_LIST.URL}/list`,
    data: { agentId, channel, page, limit, callUuid },
  });
};
export const getSessionChat = ({ agentId, sessionId }: any) => {
  return apiClient({
    method: routes.GET_SESSION_CHAT.METHOD,
    url: routes.GET_SESSION_CHAT.URL,
    data: { agentId, sessionId },
  });
};

// --- WebRTC Voice APIs (AI portal) ---

export const createWebRTCVoiceSession = (data: object) => {
  return apiClient({
    baseURL: getAIPortalBaseURL(),
    method: 'POST',
    url: 'api/voice/webrtc/session',
    data,
  });
};

export const reportWebRTCVoiceUsage = (data: object) => {
  return apiClient({
    baseURL: getAIPortalBaseURL(),
    method: 'POST',
    url: 'api/voice/webrtc/usage',
    data,
  });
};

export const finalizeAgentSession = (
  data: object,
  requestConfig: CustomAxiosRequestConfig = {},
) => {
  return apiClient({
    ...requestConfig,
    baseURL: getAIPortalBaseURL(),
    method: 'POST',
    url: 'api/agent/session/finalize',
    data,
  });
};

export const fetchRealtimeKnowledgeContext = (data: object) => {
  return apiClient({
    baseURL: getAIPortalBaseURL(),
    method: 'POST',
    url: 'api/agent/realtime/knowledge',
    data,
  });
};

// My Plan Details
export const getMyPlanDetails = (data?: any) => {
  return apiClient({
    method: routes.MY_PLAN_DETAILS.METHOD,
    url: routes.MY_PLAN_DETAILS.URL,
    data,
  });
};
// CREATE IDENTITY
export const getIdentityRequirements = () => {
  return apiClient({
    method: routes.GET_IDENTITY_REQUIREMENTS.METHOD,
    url: routes.GET_IDENTITY_REQUIREMENTS.URL,
  });
};
export const getIdentityProofType = (data: object) => {
  return apiClient({
    method: routes.GET_IDENTITY_PROOF_TYPE.METHOD,
    url: routes.GET_IDENTITY_PROOF_TYPE.URL,
    data,
  });
};
export const getIdentitySupportingDocumentTemplate = () => {
  return apiClient({
    method: routes.GET_IDENTITY_SUPPORTING_DOCUMENT_TEMPLATE.METHOD,
    url: routes.GET_IDENTITY_SUPPORTING_DOCUMENT_TEMPLATE.URL,
  });
};
export const getIdentityList = (data?: object) => {
  return apiClient({
    method: routes.GET_IDENTITY_LIST.METHOD,
    url: routes.GET_IDENTITY_LIST.URL,
    data,
  });
};
export const createIdentity = (data: object) => {
  return apiClient({
    method: routes.CREATE_IDENTITY.METHOD,
    url: routes.CREATE_IDENTITY.URL,
    data,
  });
};
export const updateIdentity = (data: object) => {
  return apiClient({
    method: routes.UPDATE_IDENTITY.METHOD,
    url: routes.UPDATE_IDENTITY.URL,
    data,
  });
};
export const deleteIdentity = (data: any) => {
  return apiClient({
    method: routes.DELETE_IDENTITY.METHOD,
    url: `${routes.DELETE_IDENTITY.URL}/${data?.identity_id}`,
  });
};
export const uploadIdentityProof = (data: object) => {
  return apiClient({
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    method: routes.UPLOAD_IDENTITY_PROOF.METHOD,
    url: routes.UPLOAD_IDENTITY_PROOF.URL,
    data,
  });
};
export const getVerificationList = (data: any) => {
  return apiClient({
    method: routes.GET_VERIFICATION_LIST.METHOD,
    url: routes.GET_VERIFICATION_LIST.URL,
    data,
  });
};
export const uploadIdentitySupportingDocuments = (data: object) => {
  return apiClient({
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    method: routes.UPLOAD_IDENTITY_SUPPORTING_DOCUMENTS.METHOD,
    url: routes.UPLOAD_IDENTITY_SUPPORTING_DOCUMENTS.URL,
    data,
  });
};
export const getAddressesList = (data?: object) => {
  return apiClient({
    method: routes.GET_ADDRESS_LIST.METHOD,
    url: routes.GET_ADDRESS_LIST.URL,
    data,
  });
};
export const createAddress = (data: object) => {
  return apiClient({
    method: routes.CREATE_ADDRESS.METHOD,
    url: routes.CREATE_ADDRESS.URL,
    data,
  });
};
export const updateAddress = (data: object) => {
  return apiClient({
    method: routes.UPDATE_ADDRESS.METHOD,
    url: routes.UPDATE_ADDRESS.URL,
    data,
  });
};
export const deleteAddress = (data: any) => {
  return apiClient({
    method: routes.DELETE_ADDRESS.METHOD,
    url: `${routes.DELETE_ADDRESS.URL}/${data?.address_id}`,
  });
};
export const uploadAddressProof = (data: object) => {
  return apiClient({
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    method: routes.UPLOAD_ADDRESS_PROOF.METHOD,
    url: routes.UPLOAD_ADDRESS_PROOF.URL,
    data,
  });
};
export const didAssign = (data: object) => {
  return apiClient({
    method: routes.DID_ASSIGN.METHOD,
    url: routes.DID_ASSIGN.URL,
    data,
  });
};
export const deleteUploadedFile = (data: any) => {
  const { proof_id, type } = data || {};
  return apiClient({
    method: routes.DELETE_UPLOADED_FILE.METHOD,
    url: `${routes.DELETE_UPLOADED_FILE.URL}/${proof_id}/${type}`,
  });
};

export const getAISettingToken = (data?: any) => {
  void data;
  return Promise.resolve({
    data: {
      data: {
        result: {
          tokenId: '',
        },
      },
    },
  });
};

export const getDLCStatus = (data?: any) => {
  return apiClient({
    method: routes.GET_DLC_STATUS.METHOD,
    url: routes.GET_DLC_STATUS.URL,
    data: data,
  });
};
// 10DLC
export const brandCreate = (data?: any) => {
  return apiClient({
    method: routes.BRAND_CREATE.METHOD,
    url: routes.BRAND_CREATE.URL,
    data,
  });
};
export const getBrandList = (data?: any) => {
  return apiClient({
    method: routes.BRAND_LIST.METHOD,
    url: routes.BRAND_LIST.URL,
    data,
  });
};
export const brandDelete = (data?: any) => {
  return apiClient({
    method: routes.BRAND_DELETE.METHOD,
    url: routes.BRAND_DELETE.URL,
    data,
  });
};

//reseller
export const resellerCreate = (data?: any) => {
  return apiClient({
    method: routes.RESELLER_CREATE.METHOD,
    url: routes.RESELLER_CREATE.URL,
    data,
  });
};
export const getResellerList = (data?: any) => {
  return apiClient({
    method: routes.RESELLER_LIST.METHOD,
    url: routes.RESELLER_LIST.URL,
    data,
  });
};
export const resellerDelete = (data?: any) => {
  return apiClient({
    method: routes.RESELLER_DELETE.METHOD,
    url: routes.RESELLER_DELETE.URL,
    data,
  });
};

export const getUseCaseList = (data?: any) => {
  return apiClient({
    method: routes.USE_CASE_LIST.METHOD,
    url: routes.USE_CASE_LIST.URL,
    data,
  });
};

export const addCampaign = (data?: any) => {
  return apiClient({
    method: routes.ADD_CAMPAIGN.METHOD,
    url: routes.ADD_CAMPAIGN.URL,
    data,
  });
};

export const campaign10DLCList = (data?: any) => {
  return apiClient({
    method: routes.CAMPAIGN_10DLC.METHOD,
    url: routes.CAMPAIGN_10DLC.URL,
    data,
  });
};

export const campaignDelete = (data?: any) => {
  return apiClient({
    method: routes.CAMPAIGN_DELETE.METHOD,
    url: routes.CAMPAIGN_DELETE.URL,
    data,
  });
};

export const getTermsPreview = (data?: any) => {
  return apiClient({
    method: routes.TERMS_PREVIEW_LIST.METHOD,
    url: routes.TERMS_PREVIEW_LIST.URL,
    data,
  });
};
export const getGCPLIST = (data?: any) => {
  return apiClient({
    method: routes.GCP_LIST.METHOD,
    url: routes.GCP_LIST.URL,
    data,
  });
};
// SOCIAL MEDIA CHANNELS
export const integrateSocialMediaChannel = (data?: any) => {
  return apiClient({
    method: routes.INTEGRATE_SOCIAL_MEDIA_CHANNEL.METHOD,
    url: routes.INTEGRATE_SOCIAL_MEDIA_CHANNEL.URL,
    data,
  });
};
export const getSocialMediaChannelList = (data?: any) => {
  return apiClient({
    method: routes.GET_SOCIAL_MEDIA_CHANNEL_LIST.METHOD,
    url: routes.GET_SOCIAL_MEDIA_CHANNEL_LIST.URL,
    data,
  });
};
export const deleteOmniChannel = (data: { uuid: string }) => {
  return apiClient({
    method: routes.OMNI_DELETE.METHOD,
    url: routes.OMNI_DELETE.URL,
    data,
  });
};

export const getNumbersCount = (data?: any) => {
  return apiClient({
    method: routes.GET_NUMBERS_COUNT.METHOD,
    url: routes.GET_NUMBERS_COUNT.URL,
    data,
  });
};

export const getTaxesAndFees = (data?: object) => {
  return apiClient({
    method: routes.GET_TAXES_AND_FEES.METHOD,
    url: routes.GET_TAXES_AND_FEES.URL,
    data,
  });
};

export const addDncCampaign = (data?: object) => {
  return apiClient({
    method: routes.ADD_DNC_CAMPAIGN.METHOD,
    url: routes.ADD_DNC_CAMPAIGN.URL,
    data,
  });
};

export const getDncCampaign = (data?: object) => {
  return apiClient({
    method: routes.DNC_CAMPAIGN_LIST.METHOD,
    url: routes.DNC_CAMPAIGN_LIST.URL,
    data,
  });
};

export const deleteDncCampaign = (data?: object) => {
  return apiClient({
    method: routes.DNC_CAMPAIGN_LIST_DELETE.METHOD,
    url: routes.DNC_CAMPAIGN_LIST_DELETE.URL,
    data,
  });
};

export const startStopRecording = (data?: object) => {
  return apiClient({
    method: routes.START_STOP_RECORDING.METHOD,
    url: routes.START_STOP_RECORDING.URL,
    data,
  });
};

export const getMeetingDetails = ({ meetingId }: { meetingId: string }) => {
  return apiClient({
    method: routes.MEETING_DETAILS.METHOD,
    url: routes.MEETING_DETAILS.URL + `/${meetingId}`,
  });
};

export const getMainSiteInfo = (data: { domain: string }, config?: CustomAxiosRequestConfig) => {
  return apiClient({
    method: routes.MAIN_SITE_INFO.METHOD,
    url: routes.MAIN_SITE_INFO.URL,
    data,
    ...config,
  });
};

export const leaveMeeting = (data: any) => {
  return apiClient({
    method: routes.LEAVE_MEETING.METHOD,
    url: routes.LEAVE_MEETING.URL,
    data,
  });
};

export const createChannel = (data: any) => {
  return apiClient({
    method: routes.CREATE_CHANNEL.METHOD,
    url: routes.CREATE_CHANNEL.URL,
    data,
  });
};

export const updateChannel = (data: any) => {
  return apiClient({
    method: routes.UPDATE_CHANNEL.METHOD,
    url: routes.UPDATE_CHANNEL.URL,
    data,
  });
};

export const callQueueInfo = (data?: object) => {
  return apiClient({
    method: routes.CALL_QUEUE_DETAIL.METHOD,
    url: routes.CALL_QUEUE_DETAIL.URL,
    data,
  });
};

export const queueDisposition = (data: any) => {
  return apiClient({
    method: routes.CALL_QUEUE_DISPOSITION.METHOD,
    url: routes.CALL_QUEUE_DISPOSITION.URL,
    data,
  });
};

export const facebookAuthStart = (channel: string, tenantId?: string) => {
  const url = tenantId
    ? `${routes.FACEBOOK_AUTH_START.URL}?channel=${channel}&tenantId=${tenantId}`
    : `${routes.FACEBOOK_AUTH_START.URL}?channel=${channel}`;
  return apiClient({
    method: routes.FACEBOOK_AUTH_START.METHOD,
    url,
  });
};

export const facebookAuthCallback = (code: string, state: string) => {
  return apiClient({
    method: routes.FACEBOOK_AUTH_CALLBACK.METHOD,
    url: `${routes.FACEBOOK_AUTH_CALLBACK.URL}?code=${code}&state=${state}`,
  });
};

export const changeOmniStatus = (data: { uuid: string; status: 0 | 1 }) => {
  return apiClient({
    method: routes.OMNI_CHANGE_STATUS.METHOD,
    url: routes.OMNI_CHANGE_STATUS.URL,
    data,
  });
};

/* Queue alerts. `rules` and `history` are read on a screen a supervisor may
   open before the server has this API, so they stay quiet on error and the
   page shows its own empty state; a save must speak up. */
export const listQueueAlertRules = () => {
  const config: CustomAxiosRequestConfig = {
    method: routes.QUEUE_ALERT_RULES.METHOD,
    url: routes.QUEUE_ALERT_RULES.URL,
    data: {},
    hideToastOnError: true,
  };
  return apiClient(config);
};

export const saveQueueAlertRules = (data: { rules: any[]; version?: number }) => {
  return apiClient({
    method: routes.QUEUE_ALERT_SAVE.METHOD,
    url: routes.QUEUE_ALERT_SAVE.URL,
    data,
  });
};

export const listQueueAlertHistory = (data: { limit?: number; rule_id?: string } = {}) => {
  const config: CustomAxiosRequestConfig = {
    method: routes.QUEUE_ALERT_HISTORY.METHOD,
    url: routes.QUEUE_ALERT_HISTORY.URL,
    data,
    hideToastOnError: true,
  };
  return apiClient(config);
};
