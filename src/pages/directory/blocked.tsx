import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getContactList, updateContactTag } from '@/services/api';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomSelect from '@/components/custom/custom-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateContactNew from '@/pages/new-contact/create-new-contact';
import { Ic } from '@/components/mcm/icons';
import {
  DEFAULT_BLOCK_CHOICE,
  SCOPE_LABELS,
  TREATMENT_DESCRIPTIONS,
  TREATMENT_LABELS,
  type BlockChoice,
  type BlockLine,
  type BlockScope,
  type BlockTreatment,
  type BlockableContact,
  canBlock,
  contactName,
  describeChoice,
  planBlock,
  tagRequest,
} from '@/lib/contact-blocking';
import { DirectoryPage, EmptyRow, SearchChip } from './page-shell';
import './blocked-glass.css';

/**
 * Directory ▸ Blocked — the numbers you have stopped hearing from.
 *
 * Blocking is spread across the app today: a menu on a row of the contacts
 * table marks somebody as Blocked, and after that the block is invisible.
 * Nothing lists what is blocked, so nobody can check whether a caller they are
 * no longer hearing from was blocked on purpose or is simply not calling.
 *
 * This is that list, plus the one thing the row menu cannot do — block a number
 * you are looking at rather than a contact you have already opened. The form
 * for that lives in a dialog rather than permanently on the page: this screen's
 * job day to day is showing who is blocked, not filling in a settings form, so
 * the list is what's on screen and blocking someone is a deliberate action via
 * the button above it.
 *
 * The important honesty, and the reason the dialog's footer says so plainly:
 * marking a contact as blocked records the decision and nothing more. Nothing
 * in the call path reads it yet, so a blocked number can still ring through.
 * The screen is still worth having — the decision has to be recorded somewhere
 * before anything can act on it, and until then people deserve to know.
 */

/* Sample rows appended after any real blocked numbers, so the list always
   has enough entries to show its design properly instead of looking sparse.
   Real data always comes first and is never hidden or replaced by these.
   Their `_id`s aren't real contact ids, so toggling one only ever updates
   `statusOverride` below rather than calling the tag API. */
const DEMO_BLOCKED_NUMBERS: (BlockableContact & { _demo: true })[] = [
  {
    _id: 'demo-1',
    name: { first: 'Rahul', last: 'Sharma' },
    contact: { phone: '+91 98765 43210', email: 'rahul.sharma@example.com' },
    is_blocked: true,
    _demo: true,
  },
  {
    _id: 'demo-2',
    name: { first: 'Priya', last: 'Verma' },
    contact: { phone: '+91 91234 56789', email: 'priya.verma@example.com' },
    is_blocked: true,
    _demo: true,
  },
  {
    _id: 'demo-3',
    name: { first: 'Unknown', last: 'Caller' },
    contact: { phone: '+1 202 555 0143' },
    is_blocked: true,
    _demo: true,
  },
  {
    _id: 'demo-4',
    name: { first: 'Amit', last: 'Patel' },
    contact: { phone: '+91 90123 45678', email: 'amit.patel@example.com' },
    is_blocked: true,
    _demo: true,
  },
  {
    _id: 'demo-5',
    name: { first: 'Sara', last: 'Khan' },
    contact: { phone: '+91 88990 11223', email: 'sara.khan@example.com' },
    is_blocked: true,
    _demo: true,
  },
  {
    _id: 'demo-6',
    name: { first: 'Telemarketer' },
    contact: { phone: '+1 800 555 0192' },
    is_blocked: true,
    _demo: true,
  },
];

const LINE_OPTIONS: { label: string; value: BlockLine }[] = [
  { label: 'My line', value: 'personal' },
  { label: 'A shared line', value: 'shared' },
];

const Blocked = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [number, setNumber] = useState('');
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [scope, setScope] = useState<BlockScope>(DEFAULT_BLOCK_CHOICE.scope);
  const [treatment, setTreatment] = useState<BlockTreatment>(DEFAULT_BLOCK_CHOICE.treatment);
  const [line, setLine] = useState<BlockLine>(DEFAULT_BLOCK_CHOICE.line);

  /* Two reads of the same list. The blocked one is filtered on the server, which
     seeds the grid below; the whole book is what a typed number is matched
     against, because the number you want to block is usually already saved. */
  const { data: blocked = [], isPending } = useQuery({
    queryKey: ['getContactList', 'directoryBlocked'],
    queryFn: () =>
      getContactList({ page: 1, limit: 200, filters: [{ key: 'tag', value: 'BLOCK' }] }),
    select: (res: any) => (res?.data?.data?.result?.rows || []) as BlockableContact[],
  });

  const { data: everyone = [] } = useQuery({
    queryKey: ['getContactList', 'directoryBlockedLookup'],
    queryFn: () => getContactList({ page: 1, limit: 200 }),
    select: (res: any) => (res?.data?.data?.result?.rows || []) as BlockableContact[],
  });

  /* The grid's own copy of who's blocked, keyed by contact id (falling back
     to phone for the demo rows, which have no real id). Unblocking someone
     is meant to flip their card in place — tag switches to "Unblocked", the
     button switches to "Block" — rather than the row vanishing the moment
     the server confirms it. Since the `blocked` query above is filtered to
     tag=BLOCK, a plain refetch after unblocking would drop the row entirely;
     this state is what keeps it on screen so the toggle is visible. Seeded
     once from the query (real rows) plus the demo rows, then only ever
     updated locally by `toggleBlock` — a second admin blocking/unblocking
     elsewhere won't live-update this screen, which is fine for what is
     already a "coming soon" feature. */
  const [rows, setRows] = useState<(BlockableContact & { _demo?: boolean })[] | null>(null);
  const [statusOverride, setStatusOverride] = useState<Record<string, 'BLOCK' | 'STANDARD'>>({});

  useEffect(() => {
    if (rows === null && !isPending) {
      setRows([...blocked, ...DEMO_BLOCKED_NUMBERS]);
    }
  }, [isPending, blocked, rows]);

  const rowKey = (row: BlockableContact) => row?._id || row?.contact?.phone || '';

  const { mutate: setTag, isPending: isSaving } = useMutation({
    mutationFn: updateContactTag,
    onSuccess: () => {
      /* Every contact list in the app shares this prefix, so toggling here
         also corrects the tag shown on the contacts table and the directory. */
      queryClient.invalidateQueries({ queryKey: ['getContactList'] });
      queryClient.invalidateQueries({ queryKey: ['newContactListQuery'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'That did not save. Try again.'),
  });

  const choice: BlockChoice = { number, scope, treatment, line };
  const plan = useMemo(() => planBlock(choice, everyone), [number, scope, treatment, line, everyone]);
  const typed = number.trim().length > 0;

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const base = rows ?? [];
    if (!needle) return base;
    return base.filter((row) =>
      [contactName(row), row?.contact?.phone, row?.contact?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [rows, search]);

  /* Same paging as People: a fixed 10 rows with a pager below, rather than
     every blocked number rendered at once with nothing to page through. */
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [visible, currentPage],
  );

  const blockedCount = useMemo(
    () => (rows ?? []).filter((row) => (statusOverride[rowKey(row)] ?? 'BLOCK') === 'BLOCK').length,
    [rows, statusOverride],
  );

  const block = () => {
    if (!canBlock(plan)) return;
    setTag(tagRequest(plan.targets, 'BLOCK'), {
      onSuccess: () => {
        toast.success(`${plan.targets.length === 1 ? 'That number is' : 'Those numbers are'} blocked.`);
        setStatusOverride((prev) => {
          const next = { ...prev };
          for (const target of plan.targets) next[rowKey(target)] = 'BLOCK';
          return next;
        });
        /* A freshly-blocked contact may not be in `rows` yet (it wasn't
           tagged BLOCK when the grid was seeded) — add it so the card
           appears immediately instead of only after a page reload. */
        setRows((prev) => {
          const existing = new Set((prev ?? []).map(rowKey));
          const additions = plan.targets.filter((target) => !existing.has(rowKey(target)));
          return [...(prev ?? []), ...additions];
        });
        setNumber('');
        setBlockFormOpen(false);
      },
    });
  };

  const toggleBlock = (row: BlockableContact & { _demo?: boolean }) => {
    const key = rowKey(row);
    const currentlyBlocked = (statusOverride[key] ?? 'BLOCK') === 'BLOCK';
    const nextTag: 'BLOCK' | 'STANDARD' = currentlyBlocked ? 'STANDARD' : 'BLOCK';
    const applyLocally = () => {
      setStatusOverride((prev) => ({ ...prev, [key]: nextTag }));
      toast.success(
        `${contactName(row) || 'That number'} is ${currentlyBlocked ? 'unblocked' : 'blocked'}.`,
      );
    };
    /* Demo rows have no real contact id, so there's nothing for the API to
       tag — toggle the card's own state directly instead of calling it. */
    if (row._demo) {
      applyLocally();
      return;
    }
    setTag(tagRequest([row], nextTag), { onSuccess: applyLocally });
  };

  return (
    <>
      <div className="gp-blocked">
      <DirectoryPage
        title="Blocked Numbers"
        description="Everyone you have stopped hearing from, and one place to block someone new."
        actions={
          <button type="button" className="btn primary" onClick={() => setBlockFormOpen(true)}>
            <Ic n="shield" />
            Block a number
          </button>
        }
        filters={
          <>
            <SearchChip value={search} onChange={setSearch} placeholder="Search blocked numbers" />
            <span className="fchip live" style={{ marginLeft: 'auto' }}>
              <span className="num">{blockedCount}</span> blocked
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
            {isPending || rows === null ? (
              <EmptyRow span={5} message="Loading blocked numbers…" />
            ) : paged.length ? (
              paged.map((row) => {
                const key = rowKey(row);
                const name = contactName(row) || 'Unknown';
                const isDemo = Boolean((row as { _demo?: boolean })._demo);
                const isBlocked = (statusOverride[key] ?? 'BLOCK') === 'BLOCK';
                return (
                  <tr key={key}>
                    <td>
                      <span className="flex items-center gap-2.5">
                        <CustomAvatar name={name} type="contact" size="30" />
                        <span style={{ fontWeight: 700 }}>{name}</span>
                        {isDemo ? <span className="tag neu">Demo</span> : null}
                      </span>
                    </td>
                    <td className="num">{row?.contact?.phone || '—'}</td>
                    <td>{row?.contact?.email || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                    <td>
                      <span className={`tag ${isBlocked ? 'acc' : 'neu'}`}>
                        {isBlocked ? 'Blocked' : 'Unblocked'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="mini"
                        disabled={isSaving}
                        title={isBlocked ? `Unblock ${name}` : `Block ${name}`}
                        aria-label={isBlocked ? `Unblock ${name}` : `Block ${name}`}
                        onClick={() => toggleBlock(row)}
                      >
                        <Ic n={isBlocked ? 'check' : 'shield'} size={12} />
                        {isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow
                span={5}
                message={
                  (rows ?? []).length
                    ? 'No blocked numbers match that search.'
                    : 'Nobody is blocked yet. Numbers you block will show up here.'
                }
              />
            )}
          </tbody>
        </table>

        {/* Pager. Reuses the app's own `.mcm-pager` classes (index.css), same
            as People's -- hidden on a single page, one inert control is
            noise. */}
        {!isPending && pageCount > 1 ? (
          <div className="gp-blocked-pager">
            <span className="gp-blocked-pager-count">
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, visible.length)} of {visible.length}
            </span>
            <div className="mcm-pager flex items-center">
              <button
                type="button"
                className="mcm-pager-btn"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                &#8249;
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  className={`mcm-pager-page${number === currentPage ? ' is-current' : ''}`}
                  onClick={() => setPage(number)}
                  aria-current={number === currentPage ? 'page' : undefined}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                className="mcm-pager-btn"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === pageCount}
                aria-label="Next page"
              >
                &#8250;
              </button>
            </div>
          </div>
        ) : null}
      </DirectoryPage>
      </div>

      <Dialog open={blockFormOpen} onOpenChange={setBlockFormOpen}>
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
              onClick={() => setBlockFormOpen(false)}
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
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="+44 20 7946 0000"
                inputMode="tel"
                aria-label="Number to block"
              />
              <span className="gp-block-hint">Has to be saved as a contact first.</span>
            </label>

            <label className="gp-block-field">
              <span className="gp-block-label">What to stop</span>
              <CustomSelect
                value={{ label: SCOPE_LABELS[scope], value: scope }}
                options={(Object.keys(SCOPE_LABELS) as BlockScope[]).map((key) => ({
                  label: SCOPE_LABELS[key],
                  value: key,
                }))}
                handleChange={(option: any) => setScope(option.value)}
                inputClass="gp-block-select"
              />
              <span className="gp-block-hint">Blocking calls blocks faxes too — same line.</span>
            </label>

            <label className="gp-block-field">
              <span className="gp-block-label">What the caller gets</span>
              <CustomSelect
                value={{ label: TREATMENT_LABELS[treatment], value: treatment }}
                options={(Object.keys(TREATMENT_LABELS) as BlockTreatment[]).map((key) => ({
                  label: TREATMENT_LABELS[key],
                  value: key,
                }))}
                handleChange={(option: any) => setTreatment(option.value)}
                inputClass="gp-block-select"
              />
              <span className="gp-block-hint">{TREATMENT_DESCRIPTIONS[treatment]}</span>
            </label>

            <label className="gp-block-field">
              <span className="gp-block-label">Whose line</span>
              <CustomSelect
                value={LINE_OPTIONS.find((option) => option.value === line)}
                options={LINE_OPTIONS}
                handleChange={(option: any) => setLine(option.value)}
                inputClass="gp-block-select"
              />
              <span className="gp-block-hint">
                A shared line has to be blocked for everyone who answers it.
              </span>
            </label>

            {typed ? (
              <div className="gp-block-summary">
                <p>{describeChoice(choice)}</p>
                {plan.problems.map((problem) => (
                  <p key={problem.message} className={problem.blocking ? 'is-blocking' : 'is-warning'}>
                    {problem.message}
                  </p>
                ))}
                {plan.notStored.length ? (
                  <p className="is-muted">
                    Recorded on this screen but not saved with the contact:{' '}
                    {plan.notStored.join(', ')}.
                  </p>
                ) : null}
              </div>
            ) : null}

            <p className="gp-block-note">
              Coming soon — recorded against the contact only, nothing in the call path reads it
              yet, so a blocked number can still ring through.
            </p>
          </div>
          <div className="gp-block-foot">
            <button type="button" className="gp-block-cancel" onClick={() => setBlockFormOpen(false)}>
              Cancel
            </button>
            {typed && plan.needsContact ? (
              <button
                type="button"
                className="gp-block-secondary"
                onClick={() => setAddingContact(true)}
              >
                Save as a contact
              </button>
            ) : null}
            <button
              type="button"
              className="gp-block-submit"
              disabled={!typed || !canBlock(plan) || isSaving}
              onClick={block}
            >
              <Ic n="shield" />
              Block this number
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addingContact} onOpenChange={setAddingContact}>
        <DialogContent className="max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <CreateContactNew
            isDisable={false}
            keepFormDataAfterSave
            isLead={false}
            prefillPhone={number.trim()}
            handleClose={() => setAddingContact(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Blocked;
