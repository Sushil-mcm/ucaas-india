import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { addBlockedNumbers, getBlockReach, getContactList, listBlockedNumbers, removeBlockedNumbers, updateContactTag } from '@/services/api';
import { useUser } from '@/hooks/use-user';
import { isAdminRole } from '@/lib/admin-scope';
import { Ic } from '@/components/mcm/icons';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import {
  BLOCK_REASONS,
  DEFAULT_BLOCK_CHOICE,
  KIND_LABELS,
  LINE_LABELS,
  SCOPE_LABELS,
  TREATMENT_DESCRIPTIONS,
  TREATMENT_LABELS,
  type BlockChoice,
  type BlockKind,
  type BlockLine,
  type BlockScope,
  type BlockTreatment,
  type BlockReach,
  type BlockableContact,
  type BlockedEntry,
  type BlockedRow,
  addRequest,
  appliesTo,
  canBlock,
  lineChoices,
  describeChoice,
  filterRows,
  planBlock,
  prettyNumber,
  rowsFromContacts,
  rowsFromEntries,
  rowsToCsv,
} from '@/lib/contact-blocking';
import { DirectoryPage, EmptyRow, SearchChip } from './page-shell';
import './list-page-glass.css';
import './blocked-glass.css';

/**
 * Directory ▸ Blocked — the numbers you have stopped hearing from.
 *
 * One list, one place to add to it. A block is a record of its own on the
 * company's block list: the number (or a prefix, or "anyone who withholds
 * their number"), what it stops, what the caller gets instead, whose numbers
 * it protects, why, and who set it. The switch reads the list on every
 * incoming call and the messaging gateway on every incoming text, and each
 * entry counts how often it has done its job.
 *
 * Contacts tagged Blocked from the contacts table are shown here too, so
 * nothing anybody blocked the old way is hidden.
 */

const fmtWhen = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const Blocked = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [choice, setChoice] = useState<BlockChoice>({ numbers: '', ...DEFAULT_BLOCK_CHOICE });
  const set = <K extends keyof BlockChoice>(key: K, value: BlockChoice[K]) =>
    setChoice((prev) => ({ ...prev, [key]: value }));

  const roleText = String(user?.role?.name || (typeof user?.role === 'string' ? user.role : '') || '');
  const isAdmin = isAdminRole(roleText.toUpperCase() as any);
  const myUuid = String(user?.uuid || '');
  /* A number typed without a country code is read in the country of the
     person's own caller ID: a US company types 415 555 1212, not +1. */
  const myCallerId = String(user?.user_info?.caller_id || user?.caller_id || '').trim();
  const country = useMemo(() => {
    const parsed = parsePhoneNumberFromString(myCallerId);
    return parsed?.country || 'US';
  }, [myCallerId]);
  const ownNumbers = useMemo(() => (myCallerId ? [myCallerId] : []), [myCallerId]);

  const { data: entries = [], isPending, isError } = useQuery({
    queryKey: ['blockedNumbers', 'all'],
    queryFn: () => listBlockedNumbers({ line: 'all', limit: 1000 }),
    select: (res: any) => (res?.data?.data?.rows || []) as BlockedEntry[],
  });

  /* What this person may block for: their own numbers, the lines they run, or
     the whole company. The server derives it from the role and the numbers. */
  const { data: reach = null } = useQuery({
    queryKey: ['blockReach'],
    queryFn: getBlockReach,
    select: (res: any) => (res?.data?.data || null) as BlockReach | null,
  });

  const { data: taggedContacts = [] } = useQuery({
    queryKey: ['getContactList', 'directoryBlocked'],
    queryFn: () =>
      getContactList({ page: 1, limit: 200, filters: [{ key: 'tag', value: 'BLOCK' }] }),
    select: (res: any) => (res?.data?.data?.result?.rows || []) as BlockableContact[],
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['blockedNumbers'] });
    queryClient.invalidateQueries({ queryKey: ['getContactList'] });
    queryClient.invalidateQueries({ queryKey: ['newContactListQuery'] });
  };
  const fail = (error: any) =>
    toast.error(
      error?.response?.data?.error?.message || error?.response?.data?.message || 'That did not save. Try again.',
    );

  const { mutate: add, isPending: isAdding } = useMutation({
    mutationFn: addBlockedNumbers,
    onSuccess: (res: any) => {
      const data = res?.data?.data || {};
      const added = data?.added?.length || 0;
      const rejected: { number: string; reason: string }[] = data?.rejected || [];
      if (added) toast.success(added === 1 ? 'Blocked.' : `${added} numbers blocked.`);
      rejected.forEach((item) => toast.warn(`${item.number}: ${item.reason}`));
      if (!added && data?.already?.length) toast.info('Already blocked.');
      refresh();
      setChoice((prev) => ({ ...prev, numbers: '', label: '', note: '' }));
    },
    onError: fail,
  });

  const { mutate: remove, isPending: isRemoving } = useMutation({
    mutationFn: removeBlockedNumbers,
    onSuccess: () => {
      toast.success('Unblocked.');
      refresh();
    },
    onError: fail,
  });

  const { mutate: untag, isPending: isUntagging } = useMutation({
    mutationFn: updateContactTag,
    onSuccess: () => {
      toast.success('Unblocked.');
      refresh();
    },
    onError: fail,
  });

  const plan = useMemo(() => planBlock(choice, entries, ownNumbers, reach), [choice, entries, ownNumbers, reach]);
  const lines = lineChoices(reach);
  const toggleLine = (number: string) =>
    set('dids', choice.dids.includes(number) ? choice.dids.filter((d) => d !== number) : [...choice.dids, number]);
  const typed = choice.kind === 'anonymous' || choice.numbers.trim().length > 0;

  const rows = useMemo<BlockedRow[]>(
    () => [...rowsFromEntries(entries, myUuid, isAdmin), ...rowsFromContacts(taggedContacts, isAdmin)],
    [entries, taggedContacts, myUuid, isAdmin],
  );
  const visible = useMemo(() => filterRows(rows, search), [rows, search]);
  const stopped = rows.reduce((sum, row) => sum + row.hits, 0);

  const exportCsv = () => {
    const blob = new Blob([rowsToCsv(visible)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blocked-numbers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const unblock = (row: BlockedRow) => {
    if (row.id) remove({ ids: [row.id] });
    else if (row.contactId) untag({ contact_uuid: [row.contactId], tag: 'STANDARD' });
  };

  const busy = isAdding || isRemoving || isUntagging;

  return (
    <div className="gp-blocked">
    <div className="gp-dirlist">
    <DirectoryPage
      title="Blocked Numbers"
      description="Everyone you have stopped hearing from, and one place to block someone new."
      actions={
        <span className="flex items-center gap-2">
          <button type="button" className="btn ghost" onClick={exportCsv} disabled={!visible.length}>
            Export
          </button>
          <button type="button" className="btn primary" onClick={() => setShowAdd((v) => !v)}>
            <Ic n="shield" size={14} />
            Block a number
          </button>
        </span>
      }
      filters={
        <>
          <SearchChip value={search} onChange={setSearch} placeholder="Search by number, name, reason or who" />
          <span className="fchip live" style={{ marginLeft: 'auto' }}>
            <span className="num">{rows.length}</span> blocked
          </span>
          <span className="fchip">
            <span className="num">{stopped}</span> calls and texts stopped
          </span>
        </>
      }
    >
      {showAdd ? (
        <div style={{ padding: 14 }}>
          <SettingCard
            title="Block a number"
            description="Read on every incoming call by the phone system and on every incoming text by the messaging service."
            icon={<Ic n="shield" size={16} />}
            status="active"
            note={
              <>
                Emergency numbers, short codes and your own numbers cannot be blocked. A block on
                your numbers stops that caller reaching you; a block for the company stops them
                reaching any number the company owns and takes an admin. Texts from a blocked
                sender are never delivered, whatever the caller is set to hear.
              </>
            }
          >
            <SettingRow
              label="Who to block"
              description="A single number, several at once, everyone from an area or country, or callers who hide their number."
              control={
                <select
                  className="mcm-field"
                  value={choice.kind}
                  onChange={(event) => set('kind', event.target.value as BlockKind)}
                  aria-label="Who to block"
                >
                  {(Object.keys(KIND_LABELS) as BlockKind[]).map((key) => (
                    <option key={key} value={key}>
                      {KIND_LABELS[key]}
                    </option>
                  ))}
                </select>
              }
            />

            {choice.kind !== 'anonymous' ? (
              <SettingRow
                label={choice.kind === 'prefix' ? 'Prefix' : 'Number'}
                description={
                  choice.kind === 'prefix'
                    ? 'The country code and, usually, the area code: +1 415 stops every San Francisco number, +44 every UK number.'
                    : `Type it the way it was shown to you. Paste several separated by commas or new lines. A number without a country code is read as ${country}.`
                }
                control={
                  choice.kind === 'prefix' ? (
                    <input
                      className="mcm-field"
                      value={choice.numbers}
                      onChange={(event) => set('numbers', event.target.value)}
                      placeholder="+1 415"
                      inputMode="tel"
                      aria-label="Prefix to block"
                    />
                  ) : (
                    <textarea
                      className="mcm-field"
                      rows={2}
                      value={choice.numbers}
                      onChange={(event) => set('numbers', event.target.value)}
                      placeholder="+1 415 555 1212"
                      aria-label="Number to block"
                    />
                  )
                }
              />
            ) : null}

            <SettingRow
              label="What to stop"
              description="Blocking calls blocks faxes too — they arrive over the same line."
              control={
                <select
                  className="mcm-field"
                  value={choice.scope}
                  onChange={(event) => set('scope', event.target.value as BlockScope)}
                  aria-label="What to stop"
                >
                  {(Object.keys(SCOPE_LABELS) as BlockScope[]).map((key) => (
                    <option key={key} value={key}>
                      {SCOPE_LABELS[key]}
                    </option>
                  ))}
                </select>
              }
            />

            {choice.scope !== 'messages' ? (
              <SettingRow
                label="What the caller gets"
                description={TREATMENT_DESCRIPTIONS[choice.treatment]}
                control={
                  <select
                    className="mcm-field"
                    value={choice.treatment}
                    onChange={(event) => set('treatment', event.target.value as BlockTreatment)}
                    aria-label="What the caller gets"
                  >
                    {(Object.keys(TREATMENT_LABELS) as BlockTreatment[]).map((key) => (
                      <option key={key} value={key}>
                        {TREATMENT_LABELS[key]}
                      </option>
                    ))}
                  </select>
                }
              />
            ) : null}

            <SettingRow
              label="Whose numbers"
              description={reach?.message || 'Your own numbers, or the lines you run, or the whole company - whichever your role reaches.'}
              control={
                <select
                  className="mcm-field"
                  value={choice.line}
                  onChange={(event) => set('line', event.target.value as BlockLine)}
                  aria-label="Whose numbers"
                >
                  {lines.map((key) => (
                    <option key={key} value={key}>
                      {LINE_LABELS[key]}
                    </option>
                  ))}
                </select>
              }
            />

            {choice.line === 'shared' && reach?.lines?.length ? (
              <SettingRow
                label="Which lines"
                description="The block applies only to calls and texts arriving on the lines you tick."
              >
                <div className="flex flex-col gap-1.5" role="group" aria-label="Which lines">
                  {reach.lines.map((line) => (
                    <label key={line.number} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={choice.dids.includes(line.number)}
                        onChange={() => toggleLine(line.number)}
                      />
                      <span className="num">{prettyNumber(line.number)}</span>
                      {line.label ? <span style={{ color: 'var(--ink-3)' }}>{line.label}</span> : null}
                    </label>
                  ))}
                </div>
              </SettingRow>
            ) : null}

            <SettingRow
              label="Reason"
              description="Why — so the list still makes sense in six months."
              control={
                <select
                  className="mcm-field"
                  value={choice.reason}
                  onChange={(event) => set('reason', event.target.value)}
                  aria-label="Reason"
                >
                  <option value="">Not given</option>
                  {BLOCK_REASONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              }
            />

            <SettingRow
              label="Label and note"
              description="A name for the list, and anything worth remembering."
              control={
                <span className="flex flex-col gap-2">
                  <input
                    className="mcm-field"
                    value={choice.label}
                    onChange={(event) => set('label', event.target.value)}
                    placeholder="Roof repair scam"
                    aria-label="Label"
                    maxLength={120}
                  />
                  <input
                    className="mcm-field"
                    value={choice.note}
                    onChange={(event) => set('note', event.target.value)}
                    placeholder="Called four times on Monday"
                    aria-label="Note"
                    maxLength={500}
                  />
                </span>
              }
            />

            {typed ? (
              <div className="mcm-setrow mcm-setrow-stack">
                <div className="mcm-setrow-full">
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 8px' }}>
                    {describeChoice(choice)}
                  </p>
                  {plan.problems.map((problem) => (
                    <p
                      key={problem.message}
                      style={{
                        fontSize: 12,
                        margin: '0 0 6px',
                        color: problem.blocking ? 'var(--crit)' : 'var(--ink-3)',
                      }}
                    >
                      {problem.message}
                    </p>
                  ))}
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn primary"
                      disabled={!canBlock(plan) || busy}
                      onClick={() => add(addRequest(choice, plan, country))}
                    >
                      <Ic n="shield" />
                      {choice.kind === 'anonymous'
                        ? 'Block anonymous callers'
                        : plan.numbers.length > 1
                          ? `Block ${plan.numbers.length} numbers`
                          : 'Block this number'}
                    </button>
                    <button type="button" className="btn ghost" onClick={() => setShowAdd(false)}>
                      Close
                    </button>
                  </span>
                </div>
              </div>
            ) : null}
          </SettingCard>
        </div>
      ) : null}

      <table>
        <thead>
          <tr>
            <th>Blocked</th>
            <th>Stops</th>
            <th>Caller gets</th>
            <th>Applies to</th>
            <th>Reason</th>
            <th>Blocked by</th>
            <th>Stopped</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {isPending ? (
            <EmptyRow span={8} message="Loading blocked numbers…" />
          ) : isError ? (
            <EmptyRow span={8} message="The block list could not be loaded. Try again in a moment." />
          ) : visible.length ? (
            visible.map((row) => (
              <tr key={row.key}>
                <td>
                  <span style={{ fontWeight: 700 }}>{row.title}</span>
                  {row.number && row.title !== prettyNumber(row.number) ? (
                    <div className="num" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {prettyNumber(row.number)}
                    </div>
                  ) : null}
                  {row.note ? (
                    <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{row.note}</div>
                  ) : null}
                </td>
                <td>{SCOPE_LABELS[row.scope]}</td>
                <td>{row.scope === 'messages' ? '—' : TREATMENT_LABELS[row.treatment]}</td>
                <td>
                  <span
                    className={`tag ${row.line === 'company' ? 'neg' : ''}`}
                    title={row.line === 'shared' ? row.dids.map(prettyNumber).join(', ') : undefined}
                  >
                    {appliesTo(row)}
                  </span>
                </td>
                <td>{row.reason || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                <td>
                  {row.blockedBy || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  {row.blockedAt ? (
                    <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{fmtWhen(row.blockedAt)}</div>
                  ) : null}
                </td>
                <td>
                  {row.kind === 'contact' ? (
                    <span style={{ color: 'var(--ink-4)' }}>—</span>
                  ) : (
                    <>
                      <span className="num">{row.hits}</span>
                      {row.lastHit ? (
                        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>last {fmtWhen(row.lastHit)}</div>
                      ) : null}
                    </>
                  )}
                </td>
                <td>
                  {row.mine ? (
                    <button
                      type="button"
                      className="mini"
                      disabled={busy}
                      title={`Unblock ${row.title}`}
                      aria-label={`Unblock ${row.title}`}
                      onClick={() => unblock(row)}
                    >
                      <Ic n="check" size={12} />
                      Unblock
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Not yours to remove</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow
              span={8}
              message={
                rows.length
                  ? 'No blocked numbers match that search.'
                  : 'Nobody is blocked. Numbers you block will be listed here.'
              }
            />
          )}
        </tbody>
      </table>
    </DirectoryPage>
    </div>
    </div>
  );
};

export default Blocked;
