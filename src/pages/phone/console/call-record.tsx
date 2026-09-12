import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listScreenRecordings } from '@/services/api';
import { createPortal } from 'react-dom';
import { QuickContactDrawer } from '@/components/custom/contact-number';
import { useContactForNumber } from '@/hooks/use-contact-suggestions';
import { callMoment } from '@/lib/call-time';
import { AuthenticatedAudio, AuthenticatedVideo } from '@/components/custom/authenticated-media';
import { handleDownloadFile, isExtensionNumber, MEDIA_URL } from '@/lib/utils';
import { useGetExtensions } from '@/hooks/common';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { getUserNameByExtension } from '@/lib/extension-utility';
import NumberWithFlag from '@/components/custom/number-with-flag';
import { Ic } from './icons';
import { DialNumber, useConsoleDialer } from './dial-number';
import VoicemailWorkflow from './voicemail-workflow';
import { formatDuration, initialsOf, isNumberLike, talkSeconds } from './copilot-adapter';
import type { ConsoleCallRow } from './call-list-column';
import { callOurNumber } from './call-attribution';

/**
 * A past call, rendered in the console's own language.
 *
 * Replaces the embedded `LogContent` panel: same data and the same
 * authenticated media components underneath (AuthenticatedAudio and
 * handleDownloadFile both go through the signed-URL hook), but one header
 * instead of two and no app-styled chrome inside the console. It also stops
 * the grid blow-out that squeezed the intelligence panel — this markup has no
 * large intrinsic min-width.
 */

/* The API sends `billsec`/`duration` as "HH:MM:SS" strings and only
   `billsectotal` as a number, so Number() here produced NaN and every leg read
   00:00. durationSeconds understands all three. */
/* Unanswered legs show no length: `duration` on those is ring time, not talk
   time, and printing it claims a conversation that never happened. */
const clock = (log: any) => {
  const seconds = talkSeconds(log);
  return seconds > 0 ? formatDuration(seconds) : '—';
};

export type RecordLeg = {
  id: string;
  raw: any;
  direction: 'in' | 'out' | 'miss';
  when: string;
  duration: string;
  by: string;
  viaDid: string;
  recordingUrl: string;
  transcriptUrl: string;
  /** this leg ended in a message being left, not a conversation */
  isVoicemail: boolean;
};

const CallRecord = ({
  row,
  onBack,
  onOpenTranscript,
  onSelectLeg,
}: {
  row: ConsoleCallRow;
  onBack: () => void;
  onOpenTranscript: (leg: any) => void;
  /** Which call in this group the right-hand panel should describe. */
  onSelectLeg?: (leg: RecordLeg | null) => void;
}) => {
  const { user } = useUser();
  const { features } = useCompanyFeatures();
  const { dial } = useConsoleDialer();
  const contactFor = useContactForNumber();
  const savedContact = row.number ? contactFor(row.number) : null;
  const [contactOpen, setContactOpen] = useState(false);
  const { data: extensionList } = useGetExtensions({
    page: 1,
    limit: 1000,
    filters: [],
    search: '',
  });
  const [playingId, setPlayingId] = useState<string | null>(null);
  /* Opening a leg's transcript used to give no indication of WHICH leg the
     right-hand panel was describing, once a call had more than one. */
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);

  /* One place to record the choice, so the row, the keyboard and all four
     action buttons agree — and so the panel on the right describes THIS call
     rather than the whole group it belongs to. */
  const selectLeg = (leg: RecordLeg) => {
    setSelectedLegId(leg.id);
    onSelectLeg?.(leg);
  };
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  const companyUuid = String(user?.company_info?.uuid || '').trim();
  const reportsActionAccess = features?.plan_features?.reports?.action;
  const canListen = Boolean(reportsActionAccess?.call_recording_listen);
  const canTranscribe = Boolean(
    features?.plan_features?.advance_call_management?.access?.TRANSCRIPTION,
  );

  const legs: RecordLeg[] = useMemo(() => {
    const source = row.logData?.acc_logs?.length ? row.logData.acc_logs : [row.raw];
    return source.filter(Boolean).map((log: any, i: number) => {
      const direction = String(log?.direction || '').trim();
      const isOutbound = direction === 'Outbound';
      const isMissed =
        direction === 'Missed' || String(log?.hangup_cause || '').toUpperCase() === 'NO_ANSWER';
      const recordingFile = String(log?.recording_file_url ?? '').trim();
      const transcriptFile = String(log?.transcript_file ?? '').trim();
      const selectedUser = extensionList?.find(
        (ex: any) => String(ex?.extension ?? '') === String(log?.extension ?? ''),
      );
      /* `log.extension` is always whoever PLACED the call, on every leg - so
         resolving "by" from it named the same person on both an outbound and
         an inbound leg of the same internal conversation (e.g. "Called by
         sushil yadav" then "Received by Neel Sahani" back to back, reading as
         two different people). `contact_name` is already the other party
         relative to whoever is viewing (fixed server-side in
         CallListRepository.formatPhoneCallRow), so it takes priority; the
         extension lookup stays as a fallback for rows without it. */
      const by =
        String(log?.contact_name || '').trim() ||
        (selectedUser
          ? `${selectedUser?.first_name || ''} ${selectedUser?.last_name || ''}`.trim()
          : '') ||
        getUserNameByExtension(extensionList as any, String(log?.extension ?? '')) ||
        String(log?.caller_id_name || '').trim() ||
        '—';
      const start = String(log?.start_stamp ?? '').trim();

      return {
        /* `uuid` identifies the call, not the leg, so sibling legs shared an
           id: pressing play matched every one of them and mounted several
           autoplaying players on the same file (and React saw duplicate keys).
           The row index makes each leg's id its own. */
        id: `${String(log?.uuid || log?.sipcall_id || log?.xml_cdr_uuid || 'leg')}#${i}`,
        raw: log,
        direction: isMissed ? 'miss' : isOutbound ? 'out' : 'in',
        when:
          start && callMoment(start).isValid()
            ? callMoment(start).format('DD MMM, h:mm A')
            : '—',
        duration: clock(log),
        by,
        /* Same resolver the side panels use: `via_did` is empty on every
           inbound row, so the leg showed no number at all. */
        viaDid: callOurNumber(log),
        recordingUrl:
          recordingFile && companyUuid
            ? `${MEDIA_URL}/${companyUuid}/recording/${recordingFile}`
            : '',
        transcriptUrl:
          transcriptFile && companyUuid
            ? `${MEDIA_URL}/${companyUuid}/recording/${transcriptFile}`
            : '',
        /* 1/0 from the API, the same column the reports read, so compared
           loosely rather than with ===. */
        isVoicemail:
          log?.is_voicemail === true || log?.is_voicemail === 1 || log?.is_voicemail === '1',
      };
    });
  }, [row, extensionList, companyUuid]);

  /* Agent screen recordings (10 Sep 2026): stored in their own table keyed by
     the call id the agent's browser had (the switch's X-cid, which is the
     row's sipcall_id), so every id a leg carries is asked for. Empty means
     nothing was captured for these legs. */
  const legCallIds = useMemo(
    () =>
      Array.from(
        new Set(
          legs.flatMap((leg) =>
            [leg.raw?.sipcall_id, leg.raw?.xml_cdr_uuid, leg.raw?.uuid, leg.raw?.b_leg_uuid]
              .map((v) => String(v || '').trim())
              .filter(Boolean),
          ),
        ),
      ),
    [legs],
  );
  const screenQuery = useQuery({
    queryKey: ['screenRecordings', legCallIds],
    queryFn: () => listScreenRecordings({ call_uuids: legCallIds }),
    enabled: legCallIds.length > 0,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const screenByCallId: Record<string, any[]> = screenQuery.data?.data?.data?.result || {};
  const screenFor = (leg: RecordLeg) => {
    for (const id of [leg.raw?.sipcall_id, leg.raw?.xml_cdr_uuid, leg.raw?.uuid, leg.raw?.b_leg_uuid]) {
      const hit = screenByCallId[String(id || '').trim()];
      if (Array.isArray(hit) && hit.length) return hit[0];
    }
    return null;
  };
  const [screenOpenId, setScreenOpenId] = useState<string | null>(null);

  return (
    <>
      {/* ---- one header ---- */}
      <div className="card record-head">
        <button type="button" className="btn ghost sm" onClick={onBack}>
          <Ic n="chev" size={13} className="flip" />
          Dialer
        </button>
        <div className="caller-av record-av">
          {initialsOf(savedContact?.name || row.name) || <Ic n="user" size={18} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="record-name">
            {/* The live contact book wins over the row's snapshot, so a
                contact saved from this screen renames it at once. */}
            {savedContact?.name ? (
              savedContact.name
            ) : isNumberLike(row.name) ? (
              <NumberWithFlag number={row.name} className="num" />
            ) : (
              row.name
            )}
            {row.contactId || savedContact ? <span className="tag acc">Contact</span> : null}
          </div>
          <div className="record-sub num">
            {/* The heading above is already the number when nobody is saved
                under it, so repeating it here said the same thing twice and
                never said the useful part -- that this caller is not in the
                contact book. Same wording as the list row. */}
            {!savedContact?.name && isNumberLike(row.name) ? (
              <span style={{ color: 'var(--ink-4)' }}>Not in contacts</span>
            ) : (
              <DialNumber number={row.number}>
                <NumberWithFlag number={row.number} />
              </DialNumber>
            )}
            <span style={{ color: 'var(--ink-4)' }}>
              {' '}
              · {legs.length} {legs.length === 1 ? 'call' : 'calls'}
            </span>
          </div>
        </div>
        {/* Save the person from the phone itself, the way a mobile does. */}
        {row.number && !isExtensionNumber(row.number) ? (
          <button
            type="button"
            className="btn ghost"
            title={savedContact ? 'Edit contact' : 'Add to contacts'}
            onClick={() => setContactOpen(true)}
          >
            <Ic n="user" size={14} />
            {savedContact ? 'Edit contact' : 'Add to contacts'}
          </button>
        ) : null}
        <button
          type="button"
          className="btn primary"
          disabled={!row.number}
          onClick={() => dial(row.number)}
        >
          <Ic n="phone" />
          Call
        </button>
      </div>
      {contactOpen
        ? createPortal(
            <QuickContactDrawer
              number={row.number}
              contactId={savedContact?.id || null}
              onClose={() => setContactOpen(false)}
            />,
            document.body,
          )
        : null}

      {/* ---- legs ---- */}
      <div className="card record-legs">
        {legs.map((leg) => {
          const playing = playingId === leg.id;
          const selected = selectedLegId === leg.id;
          return (
            <div className={`leg ${playing ? 'open' : ''} ${selected ? 'on' : ''}`} key={leg.id}>
              <div
                className="leg-row"
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => selectLeg(leg)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectLeg(leg);
                  }
                }}
              >
                <div className={`cr-av ${leg.direction === 'miss' ? 'miss' : leg.direction}`}>
                  <Ic
                    n={
                      leg.direction === 'out'
                        ? 'arrow-out'
                        : leg.direction === 'miss'
                          ? 'miss'
                          : 'arrow-in'
                    }
                    size={14}
                  />
                </div>

                <div className="leg-main">
                  <div className="leg-top">
                    <span className="leg-by">
                      {leg.direction === 'out' ? 'Called by' : 'Received by'}{' '}
                      <strong>{leg.by}</strong>
                    </span>
                  </div>
                  {/* The timestamp sits with the rest of the metadata rather
                      than on the name's line, which was squeezing the agent
                      name down to "Called by Umar A…". */}
                  <div className="leg-meta">
                    <span className="leg-when num">{leg.when}</span>
                    {leg.viaDid ? (
                      <span>
                        via <NumberWithFlag number={leg.viaDid} className="num" />
                      </span>
                    ) : null}
                    <span className="num">{leg.duration}</span>
                    {/* One badge, matching the list on the left: a voicemail
                        IS a recording, so saying both was saying the same
                        thing twice. This panel showed neither before - a leg
                        that went to voicemail was indistinguishable from one
                        that was simply answered and recorded. */}
                    {leg.isVoicemail ? (
                      <span className="tag warn">Voicemail</span>
                    ) : leg.recordingUrl ? (
                      <span className="tag acc">Recorded</span>
                    ) : null}
                    {leg.transcriptUrl ? <span className="tag ai">Transcript</span> : null}
                    {screenFor(leg) ? <span className="tag acc">Screen</span> : null}
                  </div>
                </div>

                <div className="leg-acts">
                  {screenFor(leg) && companyUuid ? (
                    <button
                      type="button"
                      className={`legbtn play ${screenOpenId === leg.id ? 'on' : ''}`}
                      title={
                        !canListen
                          ? 'You do not have access to recordings'
                          : screenOpenId === leg.id
                            ? 'Hide screen recording'
                            : 'Watch the screen recording'
                      }
                      disabled={!canListen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setScreenOpenId(screenOpenId === leg.id ? null : leg.id);
                      }}
                    >
                      <Ic n="play" size={14} />
                      <span style={{ marginLeft: 4, fontSize: 11 }}>Screen</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`legbtn play ${playing ? 'on' : ''}`}
                    title={
                      !leg.recordingUrl
                        ? 'No recording'
                        : !canListen
                          ? 'Your plan does not allow listening'
                          : playing
                            ? 'Hide player'
                            : 'Play recording'
                    }
                    disabled={!leg.recordingUrl || !canListen}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectLeg(leg);
                      setPlayingId(playing ? null : leg.id);
                    }}
                  >
                    <Ic n={playing ? 'pause' : 'play'} size={14} />
                  </button>
                  <button
                    type="button"
                    className="legbtn dl"
                    title={leg.recordingUrl ? 'Download recording' : 'No recording'}
                    disabled={!leg.recordingUrl || downloading[leg.id]}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectLeg(leg);
                      handleDownloadFile({
                        fileUrl: leg.recordingUrl,
                        name: `${row.name || row.number}-${leg.when}`,
                        setLoading: (value: any) =>
                          setDownloading((prev) => ({
                            ...prev,
                            [leg.id]: typeof value === 'function' ? value(prev[leg.id]) : value,
                          })),
                      });
                    }}
                  >
                    <Ic n="dl" size={14} />
                  </button>
                  <button
                    type="button"
                    className="legbtn ai"
                    title={
                      !leg.transcriptUrl
                        ? 'No transcript stored'
                        : !canTranscribe
                          ? 'Transcription is not on your plan'
                          : 'Open transcript'
                    }
                    disabled={!leg.transcriptUrl || !canTranscribe}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectLeg(leg);
                      onOpenTranscript(leg.raw);
                    }}
                  >
                    <Ic n="transcript" size={14} />
                  </button>
                  <button
                    type="button"
                    className="legbtn call"
                    title={`Call ${row.number}`}
                    disabled={!row.number}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectLeg(leg);
                      dial(row.number);
                    }}
                  >
                    <Ic n="phone" size={14} />
                  </button>
                </div>
              </div>

              {playing && leg.recordingUrl ? (
                <div className="leg-audio">
                  <AuthenticatedAudio src={leg.recordingUrl} controls autoPlay preload="metadata" />
                </div>
              ) : null}

              {screenOpenId === leg.id && screenFor(leg) && companyUuid ? (
                <div className="leg-audio">
                  <AuthenticatedVideo
                    src={`${MEDIA_URL}/${companyUuid}/recording/${screenFor(leg).file_name}`}
                    controls
                    autoPlay
                    preload="metadata"
                    style={{ width: '100%', maxHeight: 360, background: '#000', borderRadius: 8 }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
                    Screen of extension {screenFor(leg).extension || '—'} ·{' '}
                    {Math.round(Number(screenFor(leg).duration_seconds) || 0)} s ·{' '}
                    {screenFor(leg).source === 'coaching' ? 'coaching team' : 'queue'} rule
                  </p>
                </div>
              ) : null}

              {/* A voicemail is a message someone still has to act on: assign it,
                  note the follow-up, mark it resolved. Shown only on the leg that
                  actually left a message, keyed by that call's own uuid. */}
              {leg.isVoicemail
                ? (() => {
                    const vmCallUuid = String(
                      leg.raw?.uuid || leg.raw?.sipcall_id || leg.raw?.xml_cdr_uuid || '',
                    ).trim();
                    return vmCallUuid ? <VoicemailWorkflow callUuid={vmCallUuid} /> : null;
                  })()
                : null}
            </div>
          );
        })}

        {!legs.length ? (
          <div className="empty" style={{ padding: '30px 0' }}>
            <Ic n="list" size={28} />
            <p>No call legs recorded for this entry.</p>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default CallRecord;
