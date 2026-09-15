import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { addBlockedNumbers, getBlockReach, getContactList, listBlockedNumbers, removeBlockedNumbers, updateContactTag } from '@/services/api';
import { useUser } from '@/hooks/use-user';
import { isAdminRole } from '@/lib/admin-scope';
import { Ic } from '@/components/mcm/icons';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomSelect from '@/components/custom/custom-select';
import {
  DEFAULT_BLOCK_CHOICE,
  LINE_LABELS,
  SCOPE_LABELS,
  TREATMENT_DESCRIPTIONS,
  TREATMENT_LABELS,
  type BlockChoice,
  type BlockScope,
  type BlockTreatment,
  type BlockReach,
  type BlockableContact,
  type BlockedEntry,
  type BlockedRow,
  addRequest,
  canBlock,
  lineChoices,
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
    <>
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
          <button type="button" className="btn primary" onClick={() => setShowAdd(true)}>
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
      <table>
        <thead>
          <tr>
            <th>Contact</th>
            <th>Number</th>
            <th>Email</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {isPending ? (
            <EmptyRow span={5} message="Loading blocked numbers…" />
          ) : isError ? (
            <EmptyRow span={5} message="The block list could not be loaded. Try again in a moment." />
          ) : visible.length ? (
            visible.map((row) => (
              <tr key={row.key}>
                <td>
                  <span className="flex items-center gap-2.5">
                    <CustomAvatar name={row.title} type="contact" size="30" />
                    <span style={{ fontWeight: 700 }}>{row.title}</span>
                  </span>
                </td>
                <td className="num">{row.number ? prettyNumber(row.number) : '—'}</td>
                <td><span style={{ color: 'var(--ink-4)' }}>—</span></td>
                <td>
                  <span className="tag acc">Blocked</span>
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
                    <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>—</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow
              span={5}
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent
          className="gp-create-group-dialog gp-block-dialog sm:max-w-[620px]"
          showCloseButton={false}
        >
          <div className="gp-create-group-head">
            <h2>Block a number</h2>
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={() => setShowAdd(false)}
            >
              <Ic n="x" size={14} />
            </button>
          </div>
          <div className="gp-create-group-body gp-block-body">
            <p className="gp-block-intro">
              Blocking covers calls, faxes and messages from that number.
            </p>

            <label className="gp-block-field">
              <span className="gp-block-label">Number</span>
              <input
                className="gp-block-input"
                value={choice.numbers}
                onChange={(event) => set('numbers', event.target.value)}
                placeholder="+44 20 7946 0000"
                inputMode="tel"
                aria-label="Number to block"
              />
              <span className="gp-block-hint">
                Type it the way it was shown to you. A number without a country code is read as {country}.
              </span>
            </label>

            <label className="gp-block-field">
              <span className="gp-block-label">What to stop</span>
              <CustomSelect
                value={{ label: SCOPE_LABELS[choice.scope], value: choice.scope }}
                options={(Object.keys(SCOPE_LABELS) as BlockScope[]).map((key) => ({
                  label: SCOPE_LABELS[key],
                  value: key,
                }))}
                handleChange={(option: any) => set('scope', option.value)}
                inputClass="gp-block-select"
              />
              <span className="gp-block-hint">Blocking calls blocks faxes too — same line.</span>
            </label>

            {choice.scope !== 'messages' ? (
              <label className="gp-block-field">
                <span className="gp-block-label">What the caller gets</span>
                <CustomSelect
                  value={{ label: TREATMENT_LABELS[choice.treatment], value: choice.treatment }}
                  options={(Object.keys(TREATMENT_LABELS) as BlockTreatment[]).map((key) => ({
                    label: TREATMENT_LABELS[key],
                    value: key,
                  }))}
                  handleChange={(option: any) => set('treatment', option.value)}
                  inputClass="gp-block-select"
                />
                <span className="gp-block-hint">{TREATMENT_DESCRIPTIONS[choice.treatment]}</span>
              </label>
            ) : null}

            <label className="gp-block-field">
              <span className="gp-block-label">Whose line</span>
              <CustomSelect
                value={{ label: LINE_LABELS[choice.line], value: choice.line }}
                options={lines.map((key) => ({
                  label: LINE_LABELS[key],
                  value: key,
                }))}
                handleChange={(option: any) => set('line', option.value)}
                inputClass="gp-block-select"
              />
              <span className="gp-block-hint">
                A shared line has to be blocked for everyone who answers it.
              </span>
            </label>

            <p className="gp-block-note">
              Coming soon — recorded against the contact only, nothing in the call path reads it
              yet, so a blocked number can still ring through.
            </p>
          </div>
          <div className="gp-block-foot">
            <button type="button" className="gp-block-cancel" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="gp-block-submit"
              disabled={!typed || !canBlock(plan) || busy}
              onClick={() => {
                add(addRequest(choice, plan, country));
                setShowAdd(false);
              }}
            >
              <Ic n="shield" />
              Block this number
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Blocked;
