import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Info } from 'lucide-react';
import Loader from '@/components/custom/loader';
import { getCallScript, getScriptAnswersReport } from '@/services/api';
import { downloadCsv } from '@/lib/csv-download';
import {
  CSV_HEAD,
  KIND_LABEL,
  numberText,
  pctText,
  rangeToIso,
  reportCsvRows,
  reportNote,
  sampleMeta,
  type ReportQuestion,
  type ScriptAnswersReport,
} from '@/lib/script-answers-report';
import PerfStatCard from '../stat-card';

/**
 * Script answers.
 *
 * A call script can ask the agent questions - a box to tick, a choice from a
 * list, a number, a line of text - and the answers are saved with the call.
 * This screen reads them back for one script over the page's date range:
 * per question, how many calls answered and what they said. Counted on the
 * server from every call that had the script open, not from a page of rows.
 */

const ALL = '__all__';

const selectStyle = {
  height: 30,
  maxWidth: 280,
  padding: '0 8px',
  fontSize: 12.5,
  fontWeight: 600,
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  cursor: 'pointer',
} as const;

const Bars = ({ question }: { question: ReportQuestion }) => {
  const options = question.options ?? [];
  const top = Math.max(1, ...options.map((option) => option.count));
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {options.map((option) => (
        <div
          key={option.value}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 220px) 1fr 90px', gap: 10, alignItems: 'center' }}
        >
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: option.in_script ? 'var(--ink)' : 'var(--ink-3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={option.in_script ? option.value : `${option.value} - no longer offered by the script`}
          >
            {option.value}
            {!option.in_script && (
              <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 500, color: 'var(--ink-4)' }}>
                no longer offered
              </span>
            )}
          </span>
          <div
            style={{
              height: 14,
              borderRadius: 7,
              background: 'var(--surface-2)',
              overflow: 'hidden',
            }}
            aria-hidden
          >
            <div
              style={{
                width: `${Math.round((option.count / top) * 100)}%`,
                minWidth: option.count ? 4 : 0,
                height: '100%',
                borderRadius: 7,
                background: option.in_script ? 'var(--accent)' : 'var(--ink-4)',
                transition: 'width .2s',
              }}
            />
          </div>
          <span className="num" style={{ fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
            <strong style={{ color: 'var(--ink)' }}>{option.count}</strong>{' '}
            <span style={{ color: 'var(--ink-4)' }}>{pctText(option.percent_of_answered)}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

const NumberTiles = ({ question }: { question: ReportQuestion }) => {
  const stats = question.number;
  const tiles: Array<[string, string]> = [
    ['Lowest', numberText(stats?.min ?? null)],
    ['Average', numberText(stats?.avg ?? null)],
    ['Highest', numberText(stats?.max ?? null)],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(90px, 160px))', gap: 8 }}>
      {tiles.map(([label, value]) => (
        <div
          key={label}
          style={{
            padding: '8px 10px',
            borderRadius: 'var(--r)',
            border: '1px solid var(--line-2)',
            background: 'var(--surface-2)',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
            {label}
          </div>
          <div className="num" style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{value}</div>
        </div>
      ))}
    </div>
  );
};

const TextList = ({ question }: { question: ReportQuestion }) => {
  const samples = question.text?.samples ?? [];
  const total = question.text?.total ?? 0;
  if (!samples.length) {
    return <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-4)' }}>Nothing written yet.</p>;
  }
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {total > samples.length && (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-4)' }}>
          The latest {samples.length} of {total} answers.
        </p>
      )}
      {samples.map((sample, index) => (
        <div
          key={`${sample.call_id || index}-${index}`}
          style={{
            padding: '8px 10px',
            borderRadius: 'var(--r)',
            border: '1px solid var(--line-2)',
            background: 'var(--surface-2)',
          }}
        >
          <div style={{ fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {sample.text}
          </div>
          {sampleMeta(sample) && (
            <div style={{ marginTop: 3, fontSize: 11, color: 'var(--ink-4)' }}>{sampleMeta(sample)}</div>
          )}
        </div>
      ))}
    </div>
  );
};

const QuestionCard = ({ question, calls }: { question: ReportQuestion; calls: number }) => (
  <div
    style={{
      padding: '12px 14px',
      borderRadius: 'var(--r-lg)',
      border: '1px solid var(--line)',
      background: 'var(--surface)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>{question.label}</span>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-4)',
          padding: '1px 7px',
          borderRadius: 999,
          border: '1px solid var(--line)',
        }}
      >
        {KIND_LABEL[question.kind]}
      </span>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
        Answered on <strong style={{ color: 'var(--ink)' }}>{question.answered}</strong> of {calls}{' '}
        {calls === 1 ? 'call' : 'calls'} ({pctText(question.answer_rate_percent)})
      </span>
    </div>
    {question.kind === 'number' ? (
      <NumberTiles question={question} />
    ) : question.kind === 'text' ? (
      <TextList question={question} />
    ) : (
      <Bars question={question} />
    )}
  </div>
);

const ScriptAnswersReportScreen = ({
  selectedRange,
  initialScriptId = '',
}: {
  selectedRange: { from: string; to: string };
  initialScriptId?: string;
}) => {
  const [scriptId, setScriptId] = useState(initialScriptId);
  const [via, setVia] = useState<string>(ALL);

  /* A link from the script list names the script; honour it if it changes. */
  useEffect(() => {
    if (initialScriptId) setScriptId(initialScriptId);
  }, [initialScriptId]);

  const { data: scripts = [], isPending: isScriptsPending } = useQuery({
    queryKey: ['scriptAnswersReportScripts'],
    queryFn: () =>
      getCallScript({ page: 1, limit: 200, filters: [{ key: 'isTemplate', value: false }] }),
    select: (res: any) => (res?.data?.data?.result?.rows || []) as Array<{ _id: string; name: string; status?: string }>,
  });

  /* With nothing picked yet, the first script is as good a start as any. */
  useEffect(() => {
    if (!scriptId && scripts.length) setScriptId(String(scripts[0]._id));
  }, [scriptId, scripts]);

  const iso = useMemo(() => rangeToIso(selectedRange), [selectedRange]);
  const holderFilter = via === ALL ? {} : { campaignId: via, queueUuid: via };

  const { data: report, isPending, isError, error, isFetching } = useQuery<ScriptAnswersReport | null>({
    queryKey: ['scriptAnswersReport', scriptId, iso?.from, iso?.to, via],
    queryFn: async () => {
      const res = await getScriptAnswersReport({
        scriptId,
        from: iso?.from,
        to: iso?.to,
        text_limit: 25,
        ...holderFilter,
      });
      return (res?.data?.data?.result as ScriptAnswersReport | undefined) ?? null;
    },
    enabled: Boolean(scriptId && iso),
    staleTime: 10000,
    retry: false,
  });

  /* The picker only offers what the report says uses the script; a pick that
     no longer applies (another script chosen) falls back to everything. */
  const holders = report?.holders ?? [];
  useEffect(() => {
    if (via !== ALL && report && !holders.some((holder) => holder.id === via)) setVia(ALL);
  }, [via, report, holders]);

  const status = (error as any)?.response?.status;
  const unavailable = isError && (status === 404 || status === 502 || status === 503);
  const serverMessage = String((error as any)?.response?.data?.error?.message || '').trim();

  const exportCsv = () => {
    if (!report) return;
    const name = `script-answers_${(report.script.name || report.script.id).replace(/\s+/g, '-')}_${selectedRange.from}_${selectedRange.to}`;
    downloadCsv(name, CSV_HEAD, reportCsvRows(report));
  };

  const pickedScript = scripts.find((script) => String(script._id) === scriptId);

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Script Answers</h3>
        <span className="pc-right" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          {selectedRange.from} – {selectedRange.to}
          {report ? ` · ${report.calls_with_script} ${report.calls_with_script === 1 ? 'call' : 'calls'}` : ''}
        </span>
      </div>
      <div className="pc-body tight">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
          <select
            value={scriptId}
            onChange={(event) => {
              setScriptId(event.target.value);
              setVia(ALL);
            }}
            aria-label="Script"
            style={selectStyle}
            disabled={isScriptsPending}
          >
            {!scripts.length && <option value="">{isScriptsPending ? 'Loading scripts…' : 'No scripts yet'}</option>}
            {scripts.map((script) => (
              <option key={script._id} value={String(script._id)}>
                {script.name}
                {String(script.status || '').toLowerCase() === 'draft' ? ' (draft)' : ''}
              </option>
            ))}
          </select>

          <select value={via} onChange={(event) => setVia(event.target.value)} aria-label="Campaign or queue" style={selectStyle}>
            <option value={ALL}>Everywhere it is used ({holders.length})</option>
            {holders.map((holder) => (
              <option key={holder.id} value={holder.id}>
                {holder.type === 'campaign' ? 'Campaign' : 'Queue'}: {holder.name || holder.id}
              </option>
            ))}
          </select>

          {isFetching && !isPending && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Updating…</span>}

          <span style={{ flex: 1 }} />

          <button
            type="button"
            className="btn ghost sm"
            onClick={exportCsv}
            disabled={!report || !report.questions.length}
            style={{ opacity: report && report.questions.length ? 1 : 0.5 }}
          >
            <Download style={{ width: 14, height: 14 }} />
            Export CSV
          </button>
        </div>

        {report && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 7,
              margin: '0 0 10px',
              padding: '9px 12px',
              borderRadius: 'var(--r)',
              border: '1px solid var(--accent-edge)',
              background: 'var(--accent-wash)',
              color: 'var(--accent-ink)',
              fontSize: 11.5,
              lineHeight: 1.5,
            }}
          >
            <Info style={{ width: 14, height: 14, flex: 'none', marginTop: 1 }} />
            <span>{reportNote(report)}</span>
          </div>
        )}

        {!scriptId && !isScriptsPending ? (
          <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--ink-3)' }}>
            There are no call scripts yet. Add one under Call Scripts, put a question in it, and the
            answers will show here.
          </p>
        ) : isPending && scriptId ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader variant="blue" size="md" />
          </div>
        ) : unavailable ? (
          <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--crit)' }}>
            The script answers report is not available on this server yet. The other reports still
            work.
          </p>
        ) : isError ? (
          <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--crit)' }}>
            {serverMessage || "This report couldn't be loaded for this range. Try a different date range."}
          </p>
        ) : !report ? null : (
          <>
            <div className="grid4" style={{ marginBottom: 12 }}>
              <PerfStatCard label="Calls with this script" value={String(report.calls_with_script)} />
              <PerfStatCard label="Calls with an answer" value={String(report.calls_with_answers)} />
              <PerfStatCard
                label="Answer rate"
                value={pctText(report.answer_rate_percent)}
                tone={
                  report.answer_rate_percent === null
                    ? 'default'
                    : report.answer_rate_percent >= 80
                      ? 'success'
                      : report.answer_rate_percent < 40
                        ? 'warning'
                        : 'default'
                }
              />
              <PerfStatCard
                label="Questions asked"
                value={String(report.questions.length)}
                sub={pickedScript?.name || report.script.name || undefined}
              />
            </div>

            {!report.questions.length ? (
              <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--ink-3)' }}>
                This script asks no questions. Open it under Call Scripts and use "Insert a question"
                to add one; answers show here from the next call.
              </p>
            ) : !report.calls_with_script ? (
              <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--ink-3)' }}>
                No calls used this script in this range. Widen the date filter above, or pick another
                script.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {report.questions.map((question) => (
                  <QuestionCard key={question.key} question={question} calls={report.calls_with_script} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScriptAnswersReportScreen;
