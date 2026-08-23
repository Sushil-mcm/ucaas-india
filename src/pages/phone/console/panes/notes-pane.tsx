import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { addDispositionInLeadContatc, getCallQueueNotesList } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import Loader from '@/components/custom/loader';
import type { DialpadSession } from '@/context/dialpad-context';
import { Ic } from '../icons';
import { initialsOf } from '../copilot-adapter';
import type { ConsoleCallRow } from '../call-list-column';
import { DEMO_ENABLED, demoNotes } from '../demo-data';
import DemoChip from './demo-chip';

/**
 * Notes — the artifact's single timeline, on the platform's real notes API.
 *
 * Reads `getCallQueueNotesList` (by sip_call_id for a specific call, by phone
 * for the contact) and writes with `addDispositionInLeadContatc`. The payload
 * below mirrors components/notes/index.tsx — if that one changes, change this
 * too, or notes will land against the wrong source.
 *
 * When a contact has no notes at all, demo notes are shown behind a Demo chip
 * purely so the layout can be reviewed; they are never saved and disappear the
 * moment a real note exists.
 */

const toNull = (value: unknown) => {
  const s = String(value ?? '').trim();
  return s ? s : null;
};

const headerFirst = (session: DialpadSession | null | undefined, name: string) => {
  if (!session?.headers) return null;
  const wanted = name.trim().toLowerCase();
  const entry = Object.entries(session.headers).find(([k]) => k.trim().toLowerCase() === wanted);
  const values = entry?.[1];
  return Array.isArray(values) && values.length ? toNull(values[0]) : null;
};

const parseNotes = (response: any) => {
  const candidates = [
    response?.data?.data?.result?.rows,
    response?.data?.result?.rows,
    response?.data?.data?.rows,
    response?.data?.rows,
    response?.data?.data?.result,
    response?.data?.result,
    response?.data?.data,
    response?.data,
  ];
  const rows = candidates.find((item) => Array.isArray(item)) || [];
  const all = rows.flatMap((row: any) => {
    if (!row || typeof row !== 'object') return [];
    if (Array.isArray(row?.notes) && row.notes.length) return row.notes;
    return [row];
  });
  return all.sort(
    (a: any, b: any) =>
      new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime(),
  );
};

const NoteCard = ({ note }: { note: any }) => {
  const who = String(note?.name || note?.user_name || 'Someone').trim();
  const at = note?.createdAt && moment(note.createdAt).isValid() ? moment(note.createdAt) : null;
  return (
    <div className="note">
      <div className="note-head">
        <span className="note-av">{initialsOf(who) || <Ic n="user" size={11} />}</span>
        <span className="note-who">{who}</span>
        <span className="note-when num" title={at ? at.format('DD MMM YYYY, HH:mm') : ''}>
          {at ? at.format('DD MMM · HH:mm') : ''}
        </span>
      </div>
      <div className="note-body">{String(note?.note ?? note?.text ?? '')}</div>
      <div className="note-src">
        {note?.extension ? (
          <>
            <Ic n="headset" size={10} /> ext {String(note.extension)}
          </>
        ) : null}
        {at ? <span style={{ marginLeft: 'auto' }}>{at.fromNow()}</span> : null}
      </div>
    </div>
  );
};

const NotesPane = ({
  session,
  selectedCall,
}: {
  session: DialpadSession | null;
  selectedCall?: ConsoleCallRow | null;
}) => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const phone = String(session?.remoteNumber || selectedCall?.number || '').trim();
  const sipCallId =
    toNull(session?.liveCallData?.sip_call_id) ??
    headerFirst(session, 'x-cid') ??
    headerFirst(session, 'call-id') ??
    toNull(selectedCall?.raw?.sipcall_id) ??
    null;
  const contactId =
    toNull(session?.liveCallData?.contact_uuid) ??
    headerFirst(session, 'x-contactuuid') ??
    toNull(session?.contactInfo?._id) ??
    (selectedCall?.contactId ? String(selectedCall.contactId) : null);

  const queryKey = ['console-notes', sipCallId || '', phone || ''];

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getCallQueueNotesList(sipCallId ? { sipCallId, phone } : ({ phone } as any)),
    select: parseNotes,
    enabled: Boolean(phone || sipCallId),
    refetchOnWindowFocus: false,
  });

  const { mutate: saveNote, isPending: isSaving } = useMutation({
    mutationFn: addDispositionInLeadContatc,
    onSuccess: (data: any) => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey });
      handleAlert({ text: data?.data?.message || 'Note added', type: 'success' });
    },
    onError: () => handleAlert({ text: 'Could not save the note', type: 'error' }),
  });

  const handleSave = () => {
    const text = draft.trim();
    if (!text) return;

    // mirrors components/notes/index.tsx — keep the two in step
    const queueId = toNull(session?.queueMetaData?.id);
    const campaignId = toNull(session?.campaignMetaData?.id);
    const forwardType = String(session?.liveCallData?.forward_type || '')
      .trim()
      .toUpperCase();
    const campaignType = String(session?.liveCallData?.campaign_type || '')
      .trim()
      .toUpperCase();
    const isQueue = Boolean(
      queueId || (forwardType === 'QUEUE' && session?.liveCallData?.forward_value),
    );
    const isCampaign = Boolean(campaignId || forwardType === 'CAMPAIGN' || campaignType);
    const source = !sipCallId ? 'CONTACT' : isCampaign ? 'LEAD' : isQueue ? 'QUEUE' : 'CALL';

    const serviceDetail =
      source === 'LEAD'
        ? {
            name: toNull(session?.campaignMetaData?.response?.name),
            type: toNull(session?.liveCallData?.campaign_type) ?? 'CAMPAIGN',
            uuid: campaignId,
          }
        : source === 'QUEUE'
          ? { name: toNull(session?.queueMetaData?.response?.name), type: 'QUEUE', uuid: queueId }
          : { name: null, type: null, uuid: null };

    saveNote({
      note: {
        note: text,
        name: toNull(`${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''}`),
        extension: toNull(user?.user_info?.extension),
        user_uuid: toNull(user?.uuid),
        createdAt: moment().utc().format(),
      },
      contactId,
      contactName:
        toNull(session?.liveCallData?.contact_name) ??
        toNull(
          `${session?.contactInfo?.name?.first || ''} ${session?.contactInfo?.name?.last || ''}`,
        ) ??
        toNull(selectedCall?.name),
      contactPhone: phone,
      sipCallId,
      source,
      serviceDetail,
      wrap_time_sec: null,
      campaignNumberId:
        toNull(session?.liveCallData?.campaign_number_uuid) ??
        headerFirst(session, 'x-campaignnumberuuid'),
      queueUuid: source === 'QUEUE' ? queueId : null,
    });
  };

  // "New" = written on the call in front of you. "Earlier" = everything else
  // this contact has accumulated. Both come from the same endpoint.
  const { current, earlier } = useMemo(() => {
    const list = notes as any[];
    if (!sipCallId) return { current: [] as any[], earlier: list };
    const same = (n: any) =>
      String(n?.sipcallId || n?.sipCallId || '').trim() === String(sipCallId).trim();
    return { current: list.filter(same), earlier: list.filter((n) => !same(n)) };
  }, [notes, sipCallId]);

  const showDemo = DEMO_ENABLED && !isLoading && !notes.length && Boolean(phone);
  const placeholders = useMemo(() => (showDemo ? demoNotes(phone) : []), [showDemo, phone]);

  if (!phone && !sipCallId) {
    return (
      <div className="pscroll">
        <div className="empty">
          <Ic n="note" size={30} />
          <p>Pick a call on the left, or start one, to read and write its notes.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pscroll">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="eyebrow">Notes</span>
          <span className="tag acc">{notes.length}</span>
          <span className="src live" style={{ marginLeft: 'auto' }}>
            {sipCallId ? 'This call' : 'This contact'}
          </span>
        </div>

        {isLoading ? (
          <div className="empty" style={{ padding: '24px 0' }}>
            <Loader />
          </div>
        ) : null}

        {current.length ? (
          <>
            <div className="notes-sec">
              <span className="eyebrow">On this call</span>
              <span className="tag pos">{current.length}</span>
            </div>
            {current.map((n: any, i: number) => (
              <NoteCard note={n} key={String(n?._id || n?.id || `cur-${i}`)} />
            ))}
          </>
        ) : null}

        {earlier.length ? (
          <>
            <div className="notes-sec">
              <span className="eyebrow">{sipCallId ? 'Earlier notes' : 'All notes'}</span>
              <span className="tag neu">{earlier.length}</span>
              <span className="src" style={{ marginLeft: 'auto' }}>
                this contact
              </span>
            </div>
            {earlier.map((n: any, i: number) => (
              <NoteCard note={n} key={String(n?._id || n?.id || `old-${i}`)} />
            ))}
          </>
        ) : null}

        {showDemo ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
              <span className="eyebrow">Example notes</span>
              <DemoChip />
            </div>
            {placeholders.map((n) => (
              <div
                className={`note ${n.pinned ? 'pinned' : ''} ${n.ai ? 'ai-note' : ''}`}
                key={n.id}
              >
                <div className="note-head">
                  <span className={`note-av ${n.ai ? 'ai' : ''}`}>
                    {n.ai ? <Ic n="spark" size={11} fill /> : n.initials}
                  </span>
                  <span className="note-who">{n.who}</span>
                  {n.pinned ? (
                    <span className="tag warn">
                      <Ic n="pin" size={9} /> Pinned
                    </span>
                  ) : null}
                  <span className="note-when num">{n.when}</span>
                </div>
                <div className="note-body">{n.body}</div>
                {n.src ? (
                  <div className="note-src">
                    <Ic n="spark" size={10} fill /> {n.src}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="demo-foot">
              This contact has no saved notes yet. The two above are placeholders showing the layout
              — they are not stored anywhere and vanish once a real note is written.
            </div>
          </>
        ) : null}

        {!isLoading && !notes.length && !showDemo ? (
          <div className="empty" style={{ padding: '24px 0' }}>
            <Ic n="note" size={28} />
            <p>No notes on this yet. Write the first one below.</p>
          </div>
        ) : null}
      </div>

      {/* composer — writes through the platform's notes endpoint */}
      <div className="askdock">
        <div className="askrow">
          <textarea
            rows={1}
            placeholder="Write a note about this call…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
              }
            }}
          />
          <button
            type="button"
            className="sendbtn note-send"
            aria-label="Save note"
            disabled={!draft.trim() || isSaving}
            onClick={handleSave}
          >
            <Ic n={isSaving ? 'clock' : 'check'} size={17} />
          </button>
        </div>
        <div className="note-hint">
          Saved against {sipCallId ? 'this call' : 'this contact'} · ⌘/Ctrl + Enter
        </div>
      </div>
    </>
  );
};

export default NotesPane;
