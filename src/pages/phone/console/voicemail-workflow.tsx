import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { handleAlert } from '@/lib/utils';
import { getVoicemailAction, updateVoicemailAction } from '@/services/api';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { Ic } from './icons';

/**
 * What a team does with a voicemail: assign it to a person, mark it resolved,
 * leave a note.
 *
 * A voicemail on its own says only that a message was left. Without somewhere to
 * record who is dealing with it, a shared line has everyone listening to the
 * same message or nobody owning it. This is the small panel that carries that
 * state — it reads and writes the voicemail_actions row for one call.
 *
 * The whole panel is keyed by the call's uuid. If the backend voicemail-action
 * route is not live yet the read fails quietly and the panel shows its controls
 * empty rather than an error; a save then surfaces the failure honestly instead
 * of pretending it stuck.
 */
const unwrap = (res: any) => res?.data?.data?.result ?? res?.data?.result ?? null;

const nameOf = (user: any): string =>
  `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
  user?.name ||
  user?.email ||
  user?.extension ||
  'Unnamed';

const VoicemailWorkflow = ({ callUuid }: { callUuid: string }) => {
  const queryClient = useQueryClient();
  const { users } = useUsersDirectory();

  const { data: actionRes, isLoading, isError, isSuccess } = useQuery({
    queryKey: ['voicemail-action', callUuid],
    queryFn: () => getVoicemailAction(callUuid),
    enabled: !!callUuid,
    /* A missing backend route or an untouched voicemail are both "no state
       yet", not an error to shout about. */
    retry: false,
  });
  const action = unwrap(actionRes);
  /* Two different reasons the panel can be empty, told apart so the message
     matches the cause: the read failing means the feature isn't reachable
     right now (fields are locked, saving would fail the same way); the read
     succeeding with nothing back just means nobody has touched this
     voicemail yet, which is the ordinary first-time state. */
  const unavailable = isError;
  const untouched = isSuccess && !action;

  const [assignedTo, setAssignedTo] = useState('');
  const [resolved, setResolved] = useState(false);
  const [note, setNote] = useState('');

  /* Seed the controls from the stored row once it arrives. Keyed on the row's
     identity so switching to another voicemail reseeds rather than keeping the
     previous one's note on screen. */
  useEffect(() => {
    setAssignedTo(String(action?.assigned_to || ''));
    setResolved(!!action?.resolved);
    setNote(String(action?.note || ''));
  }, [action?.assigned_to, action?.resolved, action?.note, callUuid]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      updateVoicemailAction({
        call_uuid: callUuid,
        assigned_to: assignedTo || null,
        resolved,
        note: note.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voicemail-action', callUuid] });
      handleAlert({ text: 'Voicemail updated.', type: 'success' });
    },
    onError: (error: any) => {
      handleAlert({
        text:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          'Could not save. The voicemail workflow may not be enabled yet.',
        type: 'error',
      });
    },
  });

  const dirty = useMemo(
    () =>
      String(action?.assigned_to || '') !== assignedTo ||
      !!action?.resolved !== resolved ||
      String(action?.note || '') !== note.trim(),
    [action, assignedTo, resolved, note],
  );

  const resolvedByName = useMemo(() => {
    if (!action?.resolved || !action?.resolved_by) return '';
    const u = (users || []).find((x: any) => x?.uuid === action.resolved_by);
    return u ? nameOf(u) : '';
  }, [action, users]);

  return (
    <div className="leg-vm">
      <div className="leg-vm-head">
        <Ic n="vm" size={12} />
        <span className="leg-vm-title">Voicemail follow-up</span>
        {resolved ? (
          <span className="leg-vm-done">
            <Ic n="check" size={10} />
            Resolved{resolvedByName ? ` by ${resolvedByName}` : ''}
          </span>
        ) : untouched ? (
          <span className="leg-vm-hint">Not reviewed yet</span>
        ) : null}
      </div>

      {unavailable ? (
        <div className="leg-vm-warn">
          <Ic n="alert" size={12} />
          There is nothing to fetch for this voicemail right now — follow-up isn't available yet.
          Changes here won't be saved until it is.
        </div>
      ) : null}

      <div className="leg-vm-row">
        <label className="leg-vm-field">
          <span className="leg-vm-label">
            <Ic n="user" size={10} />
            Assigned to
          </span>
          <select
            className="leg-vm-select"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={isLoading || unavailable}
          >
            <option value="">Unassigned</option>
            {(users || []).map((u: any) => (
              <option key={u?.uuid} value={u?.uuid}>
                {nameOf(u)}
              </option>
            ))}
          </select>
        </label>

        <label className="leg-vm-check">
          <input
            type="checkbox"
            checked={resolved}
            onChange={(e) => setResolved(e.target.checked)}
            disabled={isLoading || unavailable}
          />
          Resolved
        </label>
      </div>

      <label className="leg-vm-field leg-vm-note">
        <span className="leg-vm-label">
          <Ic n="note" size={10} />
          Note
        </span>
        <textarea
          className="leg-vm-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isLoading || unavailable}
          rows={2}
          maxLength={2000}
          placeholder="e.g. Called back, left a message"
        />
      </label>

      <div className="leg-vm-foot">
        <button
          type="button"
          className="btn primary sm"
          onClick={() => mutate()}
          disabled={!dirty || isPending || isLoading || unavailable}
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default VoicemailWorkflow;
