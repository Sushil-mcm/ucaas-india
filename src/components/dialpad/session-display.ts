import type { DialpadSession } from '@/context/dialpad-context';
import { isServerDialed } from '@/lib/campaign-dial-mode';
import { callDisplayName } from '@/lib/campaign-call-display';

export const getMonitoringCallLabel = (numberValue: string): string | null => {
  const normalizedNumber = String(numberValue || '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
  if (!normalizedNumber) return null;

  const normalizedUserPart = normalizedNumber
    .replace(/^sip:/i, '')
    .split('@')[0]
    .replace(/_web$/i, '');

  if (normalizedUserPart.startsWith('*87') || normalizedUserPart === 'listen') return 'Listen';
  if (
    normalizedUserPart.startsWith('*86') ||
    normalizedUserPart === 'whisper' ||
    normalizedUserPart === 'wishper'
  ) {
    return 'Whisper';
  }
  if (normalizedUserPart.startsWith('*88') || normalizedUserPart === 'barge') return 'Barge';
  if (normalizedUserPart.startsWith('*89') || normalizedUserPart === 'intercept') {
    return 'Intercept';
  }

  return null;
};

export const getHeaderFirstValue = (
  headers: DialpadSession['headers'] | undefined,
  headerName: string,
): string => {
  if (!headers) return '';

  const normalizedHeaderName = headerName.trim().toLowerCase();
  const matchingHeaderEntry = Object.entries(headers).find(
    ([name]) => name.trim().toLowerCase() === normalizedHeaderName,
  );
  if (!matchingHeaderEntry) return '';

  const [, values] = matchingHeaderEntry;
  if (!Array.isArray(values) || values.length === 0) return '';
  return String(values[0] || '').trim();
};

const getExtraHeaderFirstValue = (
  extraHeaders: DialpadSession['extraHeaders'] | undefined,
  headerName: string,
): string => {
  if (!Array.isArray(extraHeaders)) return '';

  const normalizedHeaderName = headerName.trim().toLowerCase();
  const matchingHeader = extraHeaders.find((header) => {
    const separatorIndex = String(header || '').indexOf(':');
    if (separatorIndex <= 0) return false;

    const currentHeaderName = header.slice(0, separatorIndex).trim().toLowerCase();
    return currentHeaderName === normalizedHeaderName;
  });
  if (!matchingHeader) return '';

  const separatorIndex = matchingHeader.indexOf(':');
  return matchingHeader.slice(separatorIndex + 1).trim();
};

const getSessionHeaderFirstValue = (
  session: DialpadSession | null | undefined,
  headerName: string,
): string =>
  getHeaderFirstValue(session?.headers, headerName) ||
  getExtraHeaderFirstValue(session?.extraHeaders, headerName);

const decodeHeaderValue = (value: string, treatPlusAsSpace = false): string => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';

  const valueToDecode = treatPlusAsSpace ? normalizedValue.replace(/\+/g, '%20') : normalizedValue;
  try {
    return decodeURIComponent(valueToDecode).trim();
  } catch {
    return normalizedValue;
  }
};

export const getDialpadSessionDisplayInfo = (session: DialpadSession | null | undefined) => {
  const isConferenceSession = Boolean(session?.conferenceData);
  const baseContactNumber = session?.remoteNumber || session?.extension || '-';
  const displayNumberFromHeader = decodeHeaderValue(
    getSessionHeaderFirstValue(session, 'x-displaynumber'),
  );
  const monitoringCallLabel = getMonitoringCallLabel(baseContactNumber);
  const isMonitoringCall = Boolean(monitoringCallLabel);

  const liveForwardType = String(session?.liveCallData?.forward_type || '')
    .trim()
    .toUpperCase();
  const liveCampaignType = String(session?.liveCallData?.campaign_type || '')
    .trim()
    .toUpperCase();
  const campaignIdFromSession = String(session?.campaignMetaData?.id || '').trim();
  const campaignDialMethod = String(
    session?.campaignMetaData?.response?.dialMethod ||
      session?.liveCallData?.campaign_type ||
      getSessionHeaderFirstValue(session, 'x-campaigntype') ||
      '',
  )
    .trim()
    .toUpperCase();
  /* A browser-dialled preview call carries the campaign only in the headers
     the dialer itself added (X-CampaignUuid and friends): no metadata fetch
     has run yet when the card first draws, and there is no live-call row for
     it either. Read the header too, or a preview call is not a campaign call
     until later - which is exactly when the wrong name was on the card. */
  const campaignIdFromHeader = getSessionHeaderFirstValue(session, 'x-campaignuuid');
  const isCampaignCall = Boolean(
    campaignIdFromSession || campaignIdFromHeader || liveForwardType === 'CAMPAIGN' || liveCampaignType,
  );
  const isPredictiveCampaignCall = isCampaignCall && isServerDialed(campaignDialMethod);
  /* The lead's name as the campaign offered it. The dialer writes it on the
     INVITE for a call it places itself, and the switch echoes it back on a
     call it placed for the agent, so the same header serves both. The live
     call row (contact_name) is the fallback for a server-dialled call whose
     headers were not carried through. */
  const leadName =
    decodeHeaderValue(getSessionHeaderFirstValue(session, 'x-contactname'), true) ||
    (isCampaignCall ? String(session?.liveCallData?.contact_name || '').trim() : '');
  const predictiveHeaderContactNumber = decodeHeaderValue(
    getSessionHeaderFirstValue(session, 'x-contactnumber'),
  );
  const contactNumber =
    displayNumberFromHeader ||
    (isPredictiveCampaignCall && predictiveHeaderContactNumber
      ? predictiveHeaderContactNumber
      : baseContactNumber);

  const sessionContactInfo = session?.contactInfo;
  const firstName =
    sessionContactInfo?.first_name ||
    sessionContactInfo?.firstName ||
    sessionContactInfo?.name?.first;
  const lastName =
    sessionContactInfo?.last_name || sessionContactInfo?.lastName || sessionContactInfo?.name?.last;
  const mergedName = `${firstName || ''} ${lastName || ''}`.trim();
  const directName =
    typeof sessionContactInfo?.name === 'string' ? sessionContactInfo.name.trim() : '';
  /* On a campaign call the lead comes first and the saved contact's name is
     a second line when it differs (src/lib/campaign-call-display.ts). The
     lead name used to count only on a server-dialled call, so a preview call
     showed whichever contact the number happened to match - "Plumber Test"
     on the card while the lead card beside it said "Loopback Test IVR". */
  const named = callDisplayName({
    isCampaignCall,
    leadName,
    savedContactName: mergedName || directName,
  });
  const contactName = isConferenceSession ? 'Conference Call' : monitoringCallLabel || named.primary;
  const savedContactName = isConferenceSession || monitoringCallLabel ? '' : named.secondary;

  return {
    contactName,
    /* The contact's saved name when the card is showing a lead's name instead. */
    savedContactName,
    contactNumber,
    isConferenceSession,
    isMonitoringCall,
  };
};
