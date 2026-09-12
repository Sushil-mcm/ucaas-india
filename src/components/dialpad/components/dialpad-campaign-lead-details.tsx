import { useMemo } from 'react';
import type { DialpadSession } from '@/context/dialpad-context';
import { answersToRows } from '@/lib/script-inputs';
import { formatPhoneNumber } from '@/lib/utils';

/**
 * The lead an agent is calling, laid out to be READ.
 *
 * The campaign dialer used to put the "create a contact" form here, so an agent
 * looking at a lead the campaign already knows was shown empty boxes saying
 * "Enter email" and "Enter company" next to a banner naming that same person.
 * The question an agent has on a campaign call is "who is this and what do I
 * know about them", and a form is the wrong shape of answer to it.
 *
 * So the campaign tab shows the stored record instead. Anything the lead does
 * not carry is simply left out rather than drawn as an empty field - a missing
 * email should read as "we do not have one", not as a box waiting to be filled.
 *
 * The normal dialer still gets the form. Saving a caller you do not yet know as
 * a contact is exactly right there, and nothing about that path changes.
 */

type LeadLike = Record<string, any> | null | undefined;

type DialpadCampaignLeadDetailsProps = {
  lead: LeadLike;
  activeSession: DialpadSession | null;
};

/**
 * A stored value as readable text.
 *
 * The campaign record does not hold flat strings everywhere: `disposition` is
 * an object whose label lives on its own `disposition` key, and `notes` is an
 * array of entries. A plain String() on either produced "[object Object]" on
 * screen - which is exactly what shipped, and is worse than showing nothing.
 */
const text = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map(text).filter(Boolean).join(' · ');
  }
  if (typeof value === 'object') {
    /* Every label-bearing key this record family uses, best first. */
    for (const key of ['disposition', 'note', 'label', 'name', 'title', 'value']) {
      const inner = (value as Record<string, any>)[key];
      if (inner !== null && inner !== undefined && typeof inner !== 'object') {
        const asText = text(inner);
        if (asText) return asText;
      }
    }
    return '';
  }
  return String(value).trim();
};

/* "No Disposition" is the model's default for "nobody has set one" - it is an
   absence, and printing it as an outcome states something that never happened. */
const meaningfulOutcome = (value: string) =>
  value && value.toLowerCase() !== 'no disposition' ? value : '';

/** A stored date as something a person can read, or nothing at all. */
const readableDate = (value: any) => {
  const raw = text(value);
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Seconds as m:ss. The campaign record stores talk time as a plain number. */
const readableDuration = (value: any) => {
  const seconds = Number(text(value));
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

/* Stored statuses are SCREAMING_SNAKE. Nobody says "ATTEMPT_LIMIT_EXHAUSTED". */
const STATUS_WORDS: Record<string, string> = {
  SCHEDULED: 'Waiting to be called',
  IN_PROCESS: 'Being called now',
  COMPLETED: 'Call finished',
  CALLBACK_SCHEDULED: 'Callback arranged',
  ATTEMPT_LIMIT_EXHAUSTED: 'No attempts left',
  NO_CONSENT: 'Held — no consent recorded',
};

const readableStatus = (value: any) => {
  const raw = text(value).toUpperCase();
  if (!raw) return '';
  if (STATUS_WORDS[raw]) return STATUS_WORDS[raw];
  return raw.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5 border-b border-ucass-active-bg/70 py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-3">
    <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] text-[#7d90ab] sm:w-[132px]">
      {label}
    </p>
    <p className="min-w-0 break-words text-[13px] text-[#1b2b45]">{value}</p>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-3 first:mt-0">
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396]">{title}</p>
    <div className="mt-1 rounded-xl border border-ucass-active-bg bg-white px-3 py-1">
      {children}
    </div>
  </section>
);

const DialpadCampaignLeadDetails = ({ lead, activeSession }: DialpadCampaignLeadDetailsProps) => {
  const record: Record<string, any> = useMemo(() => (lead && typeof lead === 'object' ? lead : {}), [lead]);

  const name = text(record.contactName) || text(record.name);
  const rawNumber = text(record.contactNumber) || text(activeSession?.remoteNumber);
  const number = rawNumber ? formatPhoneNumber(rawNumber) || rawNumber : '';

  /* Only rows we actually have. An empty value never becomes an empty box. */
  const about = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];
    const push = (label: string, value: string) => {
      if (value) rows.push({ label, value });
    };
    push('Email', text(record.contactEmail));
    push('Number type', text(record.contactNumberType));
    push('Company', text(record.company) || text(record.organisation) || text(record.organization));
    push('Source', text(record.source));
    push('Called from', text(record.didNumber) ? formatPhoneNumber(text(record.didNumber)) || text(record.didNumber) : '');
    return rows;
  }, [record]);

  const progress = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];
    const push = (label: string, value: string) => {
      if (value) rows.push({ label, value });
    };
    push('Status', readableStatus(record.requestStatus));
    push('Outcome', meaningfulOutcome(text(record.disposition)) || meaningfulOutcome(text(record.systemDisposition)));

    const total = Number(text(record.totalCallAttempts));
    const left = Number(text(record.remainingCallAttempts));
    if (Number.isFinite(total) && total > 0) {
      push(
        'Attempts',
        Number.isFinite(left) ? `${total} made, ${Math.max(0, left)} left` : `${total} made`,
      );
    }
    /* A lead somebody skipped is handed straight on to another agent, and used
       to arrive looking untouched - the next person had no way to know it had
       been passed over, or why.
       The field is `lastSkipStatus`, NOT `callDeclinedByAgent`: that second one
       is declared on the model and is empty on all 86 live leads, while 17 of
       them carry lastSkipStatus. Reading the declared-but-unused field would
       have drawn a row that never appears.
       Who skipped it is deliberately not claimed - the record keeps no
       lastSkipBy - so this says what happened, not who did it. */
    if (String(text(record.lastSkipStatus)).toUpperCase() === 'SKIPPED') {
      const why =
        meaningfulOutcome(text(record.lastSkipDispositionName)) || text(record.lastSkipNote);
      push('Skipped', why ? `Passed over — ${why}` : 'Passed over by an agent');
    }
    push('Last call', readableDate(record.callEndTime));
    push('Talk time', readableDuration(record.billSec) || readableDuration(record.duration));
    push('Due', readableDate(record.startExecutionDate));
    return rows;
  }, [record]);

  const noteEntries = useMemo(() => {
    const raw = Array.isArray(record.notes) ? record.notes : [];
    return raw
      .map((entry: any) => ({
        body: text(entry?.note) || text(entry),
        who: text(entry?.name),
      }))
      .filter((entry: { body: string }) => Boolean(entry.body));
  }, [record.notes]);
  const singleNote = text(record.note);
  const isDnc = record.isDnc === true || text(record.isDnc) === '1';

  /* What earlier calls filled into the script's questions, kept on the lead.
     Read-only here: answers are given on a call, in the script itself. */
  const scriptAnswerRows = useMemo(() => answersToRows(record.script_answers), [record.script_answers]);

  const hasAnything = Boolean(
    name ||
      number ||
      about.length ||
      progress.length ||
      noteEntries.length ||
      singleNote ||
      scriptAnswerRows.length,
  );

  if (!hasAnything) {
    return (
      <p className="mt-2 text-[13px] text-[#6c809e]">
        This lead carries no stored details beyond the number being dialled.
      </p>
    );
  }

  return (
    <div className="mt-2">
      {/* Who, first and largest: it is the question the agent actually has. */}
      <div className="rounded-xl border border-ucass-active-bg bg-[#f7f9fc] px-3 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-[15px] font-semibold text-[#17385e]">{name || 'Unnamed lead'}</p>
          {isDnc ? (
            <span className="rounded-full bg-[#fbe7e5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#bf3025]">
              Do not call
            </span>
          ) : null}
        </div>
        {number ? <p className="mt-0.5 text-[13px] text-[#49668f]">{number}</p> : null}
      </div>

      {about.length ? (
        <Section title="Details">
          {about.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
        </Section>
      ) : null}

      {progress.length ? (
        <Section title="On this campaign">
          {progress.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
        </Section>
      ) : null}

      {scriptAnswerRows.length ? (
        <Section title="Script answers">
          {scriptAnswerRows.map((row) => (
            <Row key={row.key} label={row.label} value={row.text} />
          ))}
        </Section>
      ) : null}

      {noteEntries.length || singleNote ? (
        <Section title="Notes">
          {noteEntries.map((entry, index) => (
            <div
              key={`${entry.who}-${index}`}
              className="border-b border-ucass-active-bg/70 py-2 last:border-b-0"
            >
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1b2b45]">
                {entry.body}
              </p>
              {entry.who ? (
                <p className="mt-1 text-[11px] text-[#7d90ab]">{entry.who}</p>
              ) : null}
            </div>
          ))}
          {!noteEntries.length && singleNote ? (
            <p className="whitespace-pre-wrap py-2 text-[13px] leading-relaxed text-[#1b2b45]">
              {singleNote}
            </p>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
};

export default DialpadCampaignLeadDetails;
