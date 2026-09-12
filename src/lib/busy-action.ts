/* "When you're already on a call" - the person's call-waiting choice.
 *
 * Stored on the person's call_forwarding record as `busy_action`, the same
 * {enabled, type, value, ...} block every other rule there uses (forward_calls,
 * incoming_calls.failure_action). Off (or absent) means call waiting: a second
 * call rings the person's devices as a second call, which is what every device
 * did before this existed. On means the switch sends the second call to the
 * chosen destination instead - the person's own voicemail unless they picked
 * something else.
 *
 * Read by the router (dialplan_service.py person_call_plan, rule 3.5) against
 * the switch's live channels, so a conversation on a desk phone counts as much
 * as one in the browser. Both editors of the record - Settings > My Phone and
 * People > call handling - go through these two functions so they cannot drift.
 */

export interface BusyActionStored {
  enabled?: boolean;
  type?: string;
  type_label?: string;
  value?: string;
  value_label?: string;
  name?: string;
  personal?: boolean;
}

export interface BusyActionForm {
  enabled: boolean;
  type: { label: string; value: string };
  value: { label: string; value: string; name?: string };
  personal: boolean;
}

/* The form state for a stored block. Nothing stored reads as call waiting with
   the person's own voicemail preselected, so switching it on needs no further
   choice to be valid. */
export const readBusyActionForm = (
  stored: BusyActionStored | null | undefined,
  ownExtension: string,
): BusyActionForm => ({
  enabled: stored?.enabled === true,
  type: {
    label: stored?.type_label || 'Send to Voicemail',
    value: stored?.type || 'VOICEMAIL',
  },
  value: {
    label: stored?.value_label || 'Select',
    value: stored?.value || ownExtension,
  },
  personal: stored?.personal ?? true,
});

/* The stored block for the form state. Mirrors how failure_action is built on
   both pages: a personal voicemail choice stores the person's own extension and
   name, anything else stores what was picked. */
export const buildBusyActionPayload = (
  form: BusyActionForm | null | undefined,
  selectedUser: { name: string; extension: string },
): BusyActionStored => {
  const isOwnVoicemail = form?.type?.value === 'VOICEMAIL' && Boolean(form?.personal);
  return {
    enabled: form?.enabled === true,
    type: form?.type?.value || 'VOICEMAIL',
    type_label: form?.type?.label || 'Send to Voicemail',
    value_label: form?.value?.label || 'Select',
    value: isOwnVoicemail ? selectedUser.extension : form?.value?.value || '',
    name: isOwnVoicemail ? selectedUser.name : form?.value?.name || selectedUser.name,
    personal: Boolean(form?.personal),
  };
};

/* One line for the summary strip. */
export const describeBusyAction = (form: BusyActionForm | null | undefined): string => {
  if (!form?.enabled) return 'a second call rings you as call waiting';
  const type = String(form.type?.value || 'VOICEMAIL').toUpperCase();
  if (type === 'VOICEMAIL') return `a second call goes to ${form.personal ? 'your' : 'the chosen'} voicemail`;
  if (type === 'HANGUP') return 'a second call is ended';
  const target = form.value?.label && form.value.label !== 'Select' ? form.value.label : form.value?.value || '';
  return `a second call goes to ${target || String(form.type?.label || type).toLowerCase()}`;
};
