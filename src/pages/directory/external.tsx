import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { getContactList } from '@/services/api';
import CustomAvatar from '@/components/custom/custom-avatar';
import SideDrawer from '@/components/custom/side-drawer';
import SendWhatsappMessage from '@/pages/messenger/drawers/send-whatsapp-message';
import { useConsoleDialer } from '@/pages/phone/console/dial-number';
import { Ic } from '@/components/mcm/icons';
import { DirectoryDrawer, DirectoryPage, EmptyRow, FilterChip, SearchChip } from './page-shell';
import './list-page-glass.css';
import { useDirectoryFavourites } from './use-directory-favourites';
import { useContactLabels } from './use-contact-labels';
import '@/styles/warm-glass.css';

/**
 * Directory ▸ External — people outside the organisation.
 *
 * The console's External view; the platform calls these Contacts. It reads the
 * existing `getContactList`, and carries the same actions the Contacts page
 * offered — call, SMS, WhatsApp, activity and edit — because a directory you
 * cannot act from is only half a directory.
 *
 * Record shape is nested and easy to get wrong: `name.first` / `name.last`,
 * `contact.phone` / `contact.email`, `profile.contactPic`, and the record id is
 * `_id`, not `uuid`.
 *
 * Labels are the one thing on this screen the platform does not store. A
 * contact carries a single tag from a fixed list of four, and the endpoint that
 * saves a contact refuses any field it does not already know, so your own words
 * for a contact are kept in this browser — see `use-contact-labels`. The drawer
 * says so where somebody adds one, rather than letting them assume otherwise.
 */

type Contact = {
  _id?: string;
  name?: { first?: string; last?: string };
  contact?: { phone?: string; email?: string; webpage?: string };
  profile?: { contactPic?: string; company?: string };
  company?: string;
  title?: string;
  /** Extensible on the server: the form writes whatever keys it is given. */
  social?: Record<string, string>;
  groupMeta?: any[];
  is_vip?: boolean;
  is_dnc?: boolean;
  is_blocked?: boolean;
  updatedAt?: string;
  createdAt?: string;
};

const fullName = (row: Contact) =>
  `${row?.name?.first || ''} ${row?.name?.last || ''}`.trim() || 'Unknown';

/** VIP / DNC / Blocked are exclusive states in the UI, most restrictive first. */
const tagOf = (row: Contact) => {
  if (row?.is_blocked) return { label: 'Blocked', cls: 'tag neg' };
  if (row?.is_dnc) return { label: 'DNC', cls: 'tag warn' };
  if (row?.is_vip) return { label: 'VIP', cls: 'tag acc' };
  return { label: 'Standard', cls: 'tag neu' };
};

const External = () => {
  const navigate = useNavigate();
  const { dial } = useConsoleDialer();
  const { isFavourite, toggleFavourite } = useDirectoryFavourites();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('All');
  const [label, setLabel] = useState('All');
  const [open, setOpen] = useState<Contact | null>(null);
  const [whatsappTo, setWhatsappTo] = useState<string>('');
  const [newLabel, setNewLabel] = useState('');
  const labels = useContactLabels();

  const { data: rows = [], isPending } = useQuery({
    /* create-new-contact invalidates ['getContactList']; sharing that prefix is
       what makes a new or edited contact show up here. */
    queryKey: ['getContactList', 'directoryExternal'],
    queryFn: () => getContactList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  /* Labels live in this browser, so a contact deleted on another device would
     otherwise leave its labels in the filter list for ever. Cleared against
     whatever the page has just loaded. */
  useEffect(() => {
    if (!rows.length) return;
    labels.pruneTo(rows.map((row: Contact) => String(row?._id || '')).filter(Boolean));
  }, [rows, labels]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row: Contact) => {
      if (tag !== 'All' && tagOf(row).label !== tag) return false;
      if (label !== 'All' && !labels.matches(row?._id, label)) return false;
      if (!needle) return true;
      /* Search covers labels as well as the record, because a label is only
         worth applying if it is a way of finding the contact again. */
      if (labels.matches(row?._id, needle) && labels.labelsOf(row?._id).length) return true;
      return [
        fullName(row),
        row?.contact?.phone,
        row?.contact?.email,
        row?.profile?.company || row?.company,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [rows, search, tag, label, labels]);

  /**
   * WhatsApp routes off the number, so it can be initiated outbound from here.
   * Instagram and Telegram cannot: the messenger lists only inbound threads and
   * matches them by `chatId`, never by handle, so a link into the channel would
   * land on whichever conversation happens to be first — someone else's. Their
   * handles therefore open the profile instead, which always resolves.
   */
  const whatsappNumberOf = (row: Contact) => row?.social?.whatsapp || row?.contact?.phone || '';

  /** Public profile URL for a stored handle, or '' when the key isn't one we map. */
  const profileUrl = (key: string, value: string) => {
    const handle = String(value || '')
      .trim()
      .replace(/^@/, '');
    if (!handle) return '';
    if (/^https?:\/\//i.test(handle)) return handle;
    const host: Record<string, string> = {
      instagram: 'https://instagram.com/',
      telegram: 'https://t.me/',
      twitter: 'https://x.com/',
      facebook: 'https://facebook.com/',
      linkedin: 'https://linkedin.com/in/',
    };
    return host[key] ? `${host[key]}${handle}` : '';
  };

  /** SMS goes to the inbox composer, the same route the Contacts page used. */
  const sendSms = (phone?: string) =>
    navigate(`/inbox?formState=contact&number=${encodeURIComponent(phone || '')}`);

  return (
    <>
      <div className="gp-dirlist">
        <DirectoryPage
          title="External Contacts"
          description="People outside the organisation — who they work for, how to reach them, and every channel you can use."
          actions={
            <button type="button" className="btn primary" onClick={() => navigate('/contact')}>
              <Ic n="plus" />
              New contact
            </button>
          }
          filters={
            <>
              <FilterChip
                label="Tag"
                value={tag}
                options={['All', 'VIP', 'DNC', 'Blocked', 'Standard']}
                onChange={setTag}
              />
              <FilterChip
                label="Label"
                value={label}
                options={['All', ...labels.index.map((entry) => entry.label)]}
                onChange={setLabel}
              />
              <SearchChip
                value={search}
                onChange={setSearch}
                placeholder="Search contacts and labels"
              />
              <span className="fchip live" style={{ marginLeft: 'auto' }}>
                <span className="num">{rows.length}</span> contacts
              </span>
            </>
          }
        >
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Organisation</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Groups</th>
                <th>Labels</th>
                <th>Tag</th>
                <th>Updated</th>
                <th>Contact via</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <EmptyRow span={10} message="Loading contacts…" />
              ) : visible.length ? (
                visible.map((row: Contact) => {
                  const name = fullName(row);
                  const phone = row?.contact?.phone || '';
                  /* The platform stores the label as `groupName`, sometimes nested
                     under `id`. Reading `name` returned nothing, so every contact
                     showed no groups. De-duplicated by `_id` the same way the
                     Contacts table does. */
                  const groups = Array.isArray(row?.groupMeta)
                    ? Array.from(
                        new Map(row.groupMeta.map((group: any) => [group?._id, group])).values(),
                      )
                        .map((group: any) => group?.groupName || group?.id?.groupName)
                        .filter(Boolean)
                    : [];
                  const updated = row?.updatedAt || row?.createdAt;
                  const badge = tagOf(row);

                  return (
                    <tr
                      key={row?._id || phone}
                      onClick={() => setOpen(row)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span className="flex items-center gap-2.5">
                          <CustomAvatar
                            name={name}
                            image={row?.profile?.contactPic}
                            type="contact"
                            size="30"
                          />
                          <span style={{ minWidth: 0 }}>
                            <span style={{ fontWeight: 700, display: 'block' }}>{name}</span>
                            {row?.contact?.webpage ? (
                              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                                {row.contact.webpage}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </td>
                      {/* The contact form writes company into `profile`; the
                          top-level key is only a fallback on some responses. */}
                      <td>
                        {row?.profile?.company || row?.company || (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      <td>{row?.title || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                      <td className="num">{phone || '—'}</td>
                      <td>
                        {row?.contact?.email || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                      </td>
                      <td>
                        {groups.length ? (
                          groups.join(', ')
                        ) : (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      {/* The label matching the search leads, so a contact found
                          by one of six labels shows the reason it was found. */}
                      <td>
                        {labels.labelsOf(row?._id).length ? (
                          <span className="flex flex-wrap items-center gap-1">
                            {labels
                              .ranked(row?._id, label !== 'All' ? label : search)
                              .slice(0, 3)
                              .map((entry) => (
                                <span className="tag neu" key={entry}>
                                  {entry}
                                </span>
                              ))}
                            {labels.labelsOf(row?._id).length > 3 ? (
                              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                                +{labels.labelsOf(row?._id).length - 3}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={badge.cls}>{badge.label}</span>
                      </td>
                      <td className="num">
                        {updated && moment(updated).isValid() ? (
                          moment(updated).format('DD MMM YYYY')
                        ) : (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      {/* Bubble phase, not capture: stopping the click during
                          capture prevented it ever reaching these buttons, so
                          none of the actions fired. Here the button handles the
                          click first, then the row is stopped from opening. */}
                      <td onClick={(event) => event.stopPropagation()}>
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            className="mini"
                            title={`Call ${name}`}
                            aria-label={`Call ${name}`}
                            disabled={!phone}
                            onClick={() => phone && dial(phone)}
                          >
                            <Ic n="phone" size={12} />
                          </button>
                          <button
                            type="button"
                            className="mini"
                            title={`Send an SMS to ${name}`}
                            aria-label={`Send an SMS to ${name}`}
                            disabled={!phone}
                            onClick={() => sendSms(phone)}
                          >
                            <Ic n="chat" size={12} />
                          </button>
                          <button
                            type="button"
                            className="mini"
                            title={
                              whatsappNumberOf(row)
                                ? `WhatsApp ${name}`
                                : `${name} has no WhatsApp number`
                            }
                            aria-label={`WhatsApp ${name}`}
                            disabled={!whatsappNumberOf(row)}
                            onClick={() => setWhatsappTo(whatsappNumberOf(row))}
                          >
                            <Ic n="send" size={12} />
                          </button>
                          <button
                            type="button"
                            className="mini"
                            title={`${name}'s activity`}
                            aria-label={`${name}'s activity`}
                            onClick={() =>
                              navigate(`/contact-activity?contactId=${row?._id}`, {
                                state: { key: 'phone', value: phone },
                              })
                            }
                          >
                            <Ic n="clock" size={12} />
                          </button>
                          <button
                            type="button"
                            className={`mini${isFavourite('contact', row?._id) ? ' mcm-fav-on' : ''}`}
                            title={
                              isFavourite('contact', row?._id)
                                ? `Remove ${name} from favourites`
                                : `Add ${name} to favourites`
                            }
                            aria-label={
                              isFavourite('contact', row?._id)
                                ? `Remove ${name} from favourites`
                                : `Add ${name} to favourites`
                            }
                            aria-pressed={isFavourite('contact', row?._id)}
                            onClick={() => toggleFavourite('contact', row?._id)}
                          >
                            <Ic n="star" size={12} fill={isFavourite('contact', row?._id)} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <EmptyRow
                  span={10}
                  message={rows.length ? 'No contacts match those filters.' : 'No contacts yet.'}
                />
              )}
            </tbody>
          </table>

          {rows.length ? (
            <div className="mcm-tblfoot">
              Showing {visible.length} of {rows.length} contact{rows.length === 1 ? '' : 's'}
            </div>
          ) : null}

          {open ? (
            <DirectoryDrawer
              title={fullName(open)}
              onClose={() => setOpen(null)}
              footer={
                <>
                  <button type="button" className="btn ghost" onClick={() => setOpen(null)}>
                    Close
                  </button>
                  <button type="button" className="btn primary" onClick={() => navigate('/contact')}>
                    <Ic n="user" />
                    Edit contact
                  </button>
                </>
              }
            >
              <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                <CustomAvatar
                  name={fullName(open)}
                  image={open?.profile?.contactPic}
                  type="contact"
                  size="44"
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{fullName(open)}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {open?.title || open?.profile?.company || open?.company || 'Contact'}
                  </div>
                </div>
                <span className={tagOf(open).cls} style={{ marginLeft: 'auto' }}>
                  {tagOf(open).label}
                </span>
              </div>

              <div className="kv">
                <span className="k">Phone</span>
                <span className="v num">{open?.contact?.phone || '—'}</span>
              </div>
              <div className="kv">
                <span className="k">Email</span>
                <span className="v">{open?.contact?.email || '—'}</span>
              </div>
              <div className="kv">
                <span className="k">Company</span>
                <span className="v">{open?.profile?.company || open?.company || '—'}</span>
              </div>
              <div className="kv">
                <span className="k">Website</span>
                <span className="v">{open?.contact?.webpage || '—'}</span>
              </div>

              {/* `social` is an open map on the server — the contact form already
                  writes back whatever keys it receives — so every handle stored
                  against this contact is listed, not just the three the form
                  happens to render inputs for. */}
              {Object.entries(open?.social || {})
                .filter(([, value]) => Boolean(value))
                .map(([key, value]) => {
                  const url = profileUrl(key, String(value));
                  return (
                    <div className="kv" key={key}>
                      <span className="k" style={{ textTransform: 'capitalize' }}>
                        {key}
                      </span>
                      <span className="v">
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            {String(value)}
                          </a>
                        ) : (
                          String(value)
                        )}
                      </span>
                    </div>
                  );
                })}
              {Object.values(open?.social || {}).every((value) => !value) ? (
                <div className="kv">
                  <span className="k">Social</span>
                  <span className="v">—</span>
                </div>
              ) : null}

              {/* Labels sit above the actions because they are the part of this
                  panel somebody edits, and the actions are the part they press
                  once and leave. */}
              <div style={{ marginTop: 14 }}>
                <div
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6 }}
                >
                  Labels
                </div>
                <div className="flex flex-wrap items-center gap-1" style={{ marginBottom: 8 }}>
                  {labels.labelsOf(open?._id).length ? (
                    labels.labelsOf(open?._id).map((entry) => (
                      <span className="tag neu" key={entry}>
                        {entry}
                        <button
                          type="button"
                          onClick={() => labels.remove(String(open?._id), entry)}
                          title={`Remove the label “${entry}”`}
                          aria-label={`Remove the label ${entry}`}
                          style={{ marginLeft: 4, lineHeight: 1 }}
                        >
                          <Ic n="x" size={10} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>None yet.</span>
                  )}
                </div>

                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    labels.add(String(open?._id), newLabel);
                    setNewLabel('');
                  }}
                >
                  <input
                    className="mcm-field"
                    value={newLabel}
                    onChange={(event) => setNewLabel(event.target.value)}
                    placeholder="Add a label"
                    aria-label="Add a label"
                    list="mcm-label-suggestions"
                  />
                  {/* Suggests labels already in use, so the same idea does not end
                      up spelled three ways and split across three filters. */}
                  <datalist id="mcm-label-suggestions">
                    {labels.index.map((entry) => (
                      <option key={entry.label} value={entry.label} />
                    ))}
                  </datalist>
                  <button type="submit" className="mini solid" disabled={!newLabel.trim()}>
                    <Ic n="plus" size={12} />
                    Add
                  </button>
                </form>

                {labels
                  .check(String(open?._id), newLabel)
                  .filter(() => newLabel.trim().length > 0)
                  .map((problem) => (
                    <p
                      key={problem.message}
                      style={{
                        fontSize: 11,
                        margin: '6px 0 0',
                        color: problem.blocking ? 'var(--crit)' : 'var(--ink-4)',
                      }}
                    >
                      {problem.message}
                    </p>
                  ))}

                <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '8px 0 0' }}>
                  Labels are yours and are kept in this browser. They do not reach the contact
                  record, so they will not follow you to another device or appear for anyone
                  else on your team.
                </p>
              </div>

              <div className="ac-acts" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="mini solid"
                  disabled={!open?.contact?.phone}
                  onClick={() => open?.contact?.phone && dial(open.contact.phone)}
                >
                  <Ic n="phone" size={12} />
                  Call
                </button>
                <button
                  type="button"
                  className="mini"
                  disabled={!open?.contact?.phone}
                  onClick={() => sendSms(open?.contact?.phone)}
                >
                  <Ic n="chat" size={12} />
                  SMS
                </button>
                <button
                  type="button"
                  className="mini"
                  disabled={!open?.contact?.phone}
                  onClick={() => setWhatsappTo(open?.contact?.phone || '')}
                >
                  <Ic n="send" size={12} />
                  WhatsApp
                </button>
                <button
                  type="button"
                  className="mini"
                  onClick={() =>
                    navigate(`/contact-activity?contactId=${open?._id}`, {
                      state: { key: 'phone', value: open?.contact?.phone || '' },
                    })
                  }
                >
                  <Ic n="clock" size={12} />
                  Activity
                </button>
              </div>
            </DirectoryDrawer>
          ) : null}
        </DirectoryPage>
      </div>

      {whatsappTo ? (
        <SideDrawer
          isOpen={Boolean(whatsappTo)}
          handleClose={() => setWhatsappTo('')}
          isHeader
          width="500px"
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
          content={
            <SendWhatsappMessage handleClose={() => setWhatsappTo('')} initialNumber={whatsappTo} />
          }
        />
      ) : null}
    </>
  );
};

export default External;
