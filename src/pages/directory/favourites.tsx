import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getContactList } from '@/services/api';
import CustomAvatar from '@/components/custom/custom-avatar';
import SideDrawer from '@/components/custom/side-drawer';
import '@/styles/warm-glass.css';
import SendWhatsappMessage from '@/pages/messenger/drawers/send-whatsapp-message';
import { useConsoleDialer } from '@/pages/phone/console/dial-number';
import { Ic } from '@/components/mcm/icons';
import { DirectoryPage, EmptyRow, FilterChip, SearchChip } from './page-shell';
import { usePeopleRows, type PersonRow } from './people-rows';
import { useDirectoryFavourites } from './use-directory-favourites';
import './favourites-glass.css';

/**
 * Directory ▸ Favourites — the people you keep coming back to.
 *
 * One list across both halves of the directory: colleagues you reach on an
 * extension, and outside contacts you reach on a number. They are different
 * records from different endpoints, so the row is normalised to the few things
 * a favourite is actually for — who they are, how to reach them, and the
 * actions — rather than showing two tables stacked.
 *
 * A starred record that no longer comes back from the server is simply not
 * shown. It is deliberately not un-starred: both lists are fetched with a limit,
 * so "absent from this page" does not mean "deleted", and pruning on that
 * assumption would quietly lose favourites.
 */

type FavouriteRow = {
  key: string;
  kind: 'person' | 'contact';
  id: string;
  name: string;
  image?: string;
  /** Department for a colleague, company for an outside contact. */
  org: string;
  role: string;
  /** Extension for a colleague, phone number for a contact. */
  reach: string;
  reachLabel: string;
  /** What a call should dial — an extension internally, a number externally. */
  dialTarget: string;
  phone: string;
  email: string;
  whatsapp: string;
  presence?: string;
  tone?: string;
};

const TONE_CLASS: Record<string, string> = {
  good: 'tag pos',
  busy: 'tag neg',
  warn: 'tag warn',
  idle: 'tag neu',
};

const contactName = (row: any) =>
  `${row?.name?.first || ''} ${row?.name?.last || ''}`.trim() || 'Unknown';

const Favourites = () => {
  const navigate = useNavigate();
  const { dial } = useConsoleDialer();
  const { isFavourite, toggleFavourite, count } = useDirectoryFavourites();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('All');
  const [whatsappTo, setWhatsappTo] = useState('');

  const { rows: people, isLoading: peopleLoading } = usePeopleRows();

  const { data: contacts = [], isPending: contactsLoading } = useQuery({
    /* Shares the ['getContactList'] prefix, so editing a contact refreshes
       this list too. */
    queryKey: ['getContactList', 'directoryFavourites'],
    queryFn: () => getContactList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  const rows: FavouriteRow[] = useMemo(() => {
    const fromPeople = (people as PersonRow[])
      .filter((person) => isFavourite('person', person.uuid))
      .map((person) => ({
        key: `person:${person.uuid}`,
        kind: 'person' as const,
        id: person.uuid,
        name: person.name,
        image: person.image,
        org: person.department || person.location,
        role: person.jobTitle || person.role,
        reach: person.extension,
        reachLabel: 'Extension',
        dialTarget: person.extension,
        phone: person.phone,
        email: person.email,
        whatsapp: '',
        presence: person.presence,
        tone: person.tone,
      }));

    const fromContacts = (contacts as any[])
      .filter((contact) => isFavourite('contact', contact?._id))
      .map((contact) => ({
        key: `contact:${contact?._id}`,
        kind: 'contact' as const,
        id: String(contact?._id || ''),
        name: contactName(contact),
        image: contact?.profile?.contactPic,
        org: contact?.profile?.company || contact?.company || '',
        role: contact?.title || '',
        reach: contact?.contact?.phone || '',
        reachLabel: 'Phone',
        dialTarget: contact?.contact?.phone || '',
        phone: contact?.contact?.phone || '',
        email: contact?.contact?.email || '',
        whatsapp: contact?.social?.whatsapp || contact?.contact?.phone || '',
        presence: undefined,
        tone: undefined,
      }));

    return [...fromPeople, ...fromContacts];
  }, [people, contacts, isFavourite]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (kind === 'Colleagues' && row.kind !== 'person') return false;
      if (kind === 'External' && row.kind !== 'contact') return false;
      if (!needle) return true;
      return [row.name, row.org, row.role, row.reach, row.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [rows, search, kind]);

  /* Same paging as People: a fixed 10 rows with a pager below, rather than
     an internally-scrolling list that hides how much is left. */
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [visible, currentPage],
  );

  const isLoading = peopleLoading || contactsLoading;

  /** SMS goes to the inbox composer, the same route the other lists use. */
  const sendSms = (phone?: string) =>
    navigate(`/inbox?formState=contact&number=${encodeURIComponent(phone || '')}`);

  return (
    <>
      <div className="gp-favourites">
      <DirectoryPage
        title="Favourites"
        description="The people you reach most, colleagues and outside contacts together, one click from here."
        filters={
          <>
            <FilterChip
              label="Show"
              value={kind}
              options={['All', 'Colleagues', 'External']}
              onChange={setKind}
            />
            <SearchChip value={search} onChange={setSearch} placeholder="Search favourites" />
            <span className="fchip live" style={{ marginLeft: 'auto' }}>
              <span className="num">{rows.length}</span> favourite{rows.length === 1 ? '' : 's'}
            </span>
          </>
        }
      >
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Team / Company</th>
              <th>Role</th>
              <th>Reach on</th>
              <th>Email</th>
              <th>Status</th>
              <th>Contact via</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <EmptyRow span={8} message="Loading favourites…" />
            ) : paged.length ? (
              paged.map((row) => (
                <tr key={row.key}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <CustomAvatar
                        name={row.name}
                        image={row.image}
                        type={row.kind === 'contact' ? 'contact' : undefined}
                        size="30"
                      />
                      <span style={{ fontWeight: 700 }}>{row.name}</span>
                    </span>
                  </td>
                  <td>
                    <span className={row.kind === 'person' ? 'tag acc' : 'tag neu'}>
                      {row.kind === 'person' ? 'Colleague' : 'External'}
                    </span>
                  </td>
                  <td>{row.org || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                  <td>{row.role || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                  <td className="num">
                    <span style={{ display: 'block' }}>{row.reach || '—'}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{row.reachLabel}</span>
                  </td>
                  <td>{row.email || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                  <td>
                    {row.presence ? (
                      <span className={TONE_CLASS[row.tone || 'idle'] || 'tag neu'}>
                        {row.presence}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-4)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        className="mini"
                        title={`Call ${row.name}`}
                        aria-label={`Call ${row.name}`}
                        disabled={!row.dialTarget}
                        onClick={() =>
                          row.dialTarget &&
                          dial(row.dialTarget, { forceRefreshContactInfo: true })
                        }
                      >
                        <Ic n="phone" size={12} />
                      </button>
                      <button
                        type="button"
                        className="mini"
                        title={`Send an SMS to ${row.name}`}
                        aria-label={`Send an SMS to ${row.name}`}
                        disabled={!row.phone}
                        onClick={() => sendSms(row.phone)}
                      >
                        <Ic n="chat" size={12} />
                      </button>
                      {/* WhatsApp routes off a real number, which colleagues are
                          not reachable on from here — so it is offered only for
                          external contacts. */}
                      {row.kind === 'contact' ? (
                        <button
                          type="button"
                          className="mini"
                          title={
                            row.whatsapp ? `WhatsApp ${row.name}` : `${row.name} has no WhatsApp number`
                          }
                          aria-label={`WhatsApp ${row.name}`}
                          disabled={!row.whatsapp}
                          onClick={() => setWhatsappTo(row.whatsapp)}
                        >
                          <Ic n="send" size={12} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="mini"
                        title={`${row.name}'s activity`}
                        aria-label={`${row.name}'s activity`}
                        onClick={() =>
                          row.kind === 'contact'
                            ? navigate(`/contact-activity?contactId=${row.id}`, {
                                state: { key: 'phone', value: row.phone },
                              })
                            : navigate(`/department/extension/${row.id}`)
                        }
                      >
                        <Ic n="clock" size={12} />
                      </button>
                      <button
                        type="button"
                        className="mini mcm-fav-on"
                        title={`Remove ${row.name} from favourites`}
                        aria-label={`Remove ${row.name} from favourites`}
                        onClick={() => toggleFavourite(row.kind, row.id)}
                      >
                        <Ic n="star" size={12} fill />
                      </button>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow
                span={8}
                message={
                  count
                    ? 'No favourites match those filters.'
                    : 'No favourites yet — open People or External Contacts and use the ☆ on a row to pin someone here.'
                }
              />
            )}
          </tbody>
        </table>

        {/* Pager. Reuses the app's own `.mcm-pager` classes (index.css), same
            as People's -- hidden on a single page, one inert control is
            noise. */}
        {!isLoading && pageCount > 1 ? (
          <div className="gp-favourites-pager">
            <span className="gp-favourites-pager-count">
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

      {whatsappTo ? (
        <SideDrawer
          isOpen={Boolean(whatsappTo)}
          handleClose={() => setWhatsappTo('')}
          title="Send WhatsApp message"
          content={
            <div className="mcm-warm-glass whatsapp-drawer-glass flex h-full min-h-0 w-full flex-col">
              <SendWhatsappMessage
                handleClose={() => setWhatsappTo('')}
                initialNumber={whatsappTo}
                selectClassName="whatsapp-drawer-select"
              />
            </div>
          }
        />
      ) : null}
    </>
  );
};

export default Favourites;
