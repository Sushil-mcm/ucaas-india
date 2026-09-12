import { callForwarding } from '@/services/api';

/**
 * Pointing a company number at a campaign's team, and putting it back.
 *
 * A number's inbound rule lives in `forward_call_actions.call_handling
 * .business_hours` on the number (the routing screen writes the same key).
 * While a campaign runs, the rule can point at the campaign's own queue, so
 * anyone who calls the outgoing number back reaches the people who called
 * them. The rule that was there before is kept on the campaign
 * (`settings.inbound.previous_business_hours`) so it can be put back.
 */

export type BusinessHoursRule = Record<string, any> | null;

export const parseForwardActions = (raw: any): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const currentBusinessHoursRule = (didRow: any): BusinessHoursRule => {
  const actions = parseForwardActions(didRow?.forward_call_actions);
  const rule = actions?.call_handling?.business_hours;
  return rule && typeof rule === 'object' ? rule : null;
};

const writeBusinessHours = (didRow: any, businessHours: Record<string, any> | null) => {
  const stored = parseForwardActions(didRow?.forward_call_actions);
  const callHandling = { ...(stored?.call_handling || {}) };
  if (businessHours) callHandling.business_hours = businessHours;
  else delete callHandling.business_hours;
  return callForwarding({
    uuid: didRow?.uuid,
    forward_call_actions: { ...stored, call_handling: callHandling },
  });
};

/** Send the number's calls to the campaign's queue. */
export const routeNumberToCampaign = (
  didRow: any,
  campaign: { queue_uuid?: string | null; queue_extension?: string | null; name?: string },
) => {
  if (!didRow?.uuid) throw new Error('The number could not be found in the inventory');
  if (!campaign?.queue_uuid) throw new Error('The campaign has no queue yet');
  const previous = currentBusinessHoursRule(didRow);
  return writeBusinessHours(didRow, {
    ...(previous || {}),
    type: 'QUEUE',
    value: String(campaign.queue_uuid),
    label: campaign.name || 'Campaign team',
    name: campaign.name || 'Campaign team',
    extension: campaign.queue_extension || '',
    campaign_routed: true,
  });
};

/** Put back whatever the number did before the campaign took it. */
export const restoreNumberRouting = (didRow: any, previous: BusinessHoursRule) => {
  if (!didRow?.uuid) throw new Error('The number could not be found in the inventory');
  return writeBusinessHours(didRow, previous && Object.keys(previous).length ? previous : null);
};

/** Is this number currently pointed at this campaign's queue? */
export const numberRoutedToCampaign = (didRow: any, campaign: { queue_uuid?: string | null }) => {
  const rule = currentBusinessHoursRule(didRow);
  return Boolean(
    rule && rule.type === 'QUEUE' && campaign?.queue_uuid && String(rule.value) === String(campaign.queue_uuid),
  );
};

export const findDidRow = (inventory: any[], number: string) => {
  const digits = String(number || '').replace(/\D/g, '');
  return (inventory || []).find((row: any) => String(row?.did_number || '').replace(/\D/g, '') === digits);
};
