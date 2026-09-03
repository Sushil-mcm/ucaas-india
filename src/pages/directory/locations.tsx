import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ic } from '@/components/mcm/icons';
import { Icon } from '@/assets/icons/icon';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AlertConfirm from '@/components/custom/alert-confirm';
import NewSiteSteps from '@/pages/admin-settings/company/new-site-steps';
import { siteDelete, siteList } from '@/services/api';
import { useCompanyFeatures } from '@/hooks/rbac';
import { handleAlert } from '@/lib/utils';
import { DirectoryPage, EmptyRow, FilterChip, SearchChip } from './page-shell';
import { usePeopleRows } from './people-rows';
import './groups-glass.css';
import './locations-glass.css';

/**
 * Directory ▸ Locations — the organisation's sites.
 *
 * The platform calls these "sites" and already exposes full CRUD
 * (`/api/site/list`, `/api/site/upsert`, `/api/site/delete`) behind the
 * `account_setting.access.SITE` permissions. This is the same data the
 * Company Info screen manages and the same form, surfaced in Directory
 * where you look for people and places — nothing new server-side.
 */

type Site = {
  uuid?: string;
  site_id?: string;
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  timezone?: string;
  is_default?: string;
};

/* Different seed sources spell "this is the default site" differently
   ('1'/'0' vs 'Y'/'N') — normalized here rather than trusting one literal. */
const isDefaultSite = (site: Site) => {
  const value = String(site?.is_default ?? '').toLowerCase();
  return value === '1' || value === 'y' || value === 'yes' || value === 'true';
};

const Locations = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All');
  const [open, setOpen] = useState<Site | null>(null);
  const [editing, setEditing] = useState<Site | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Site | null>(null);

  const { features } = useCompanyFeatures();
  const siteAccess = features?.plan_features?.account_setting?.access?.SITE?.action;
  const canView = Boolean(siteAccess?.view);
  const canAdd = Boolean(siteAccess?.add);
  const canEdit = Boolean(siteAccess?.edit);
  const canDelete = Boolean(siteAccess?.delete);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['siteList'],
    queryFn: () => siteList({ page: 1, limit: 1000 }),
    enabled: canView,
    select: (data: any) => data?.data?.data?.result?.rows || [],
  });

  /* People already carry their site name, so the roster answers "who works
     here" without another request. */
  const { rows: people } = usePeopleRows();
  const headcount = useMemo(() => {
    const counts: Record<string, number> = {};
    people.forEach((person) => {
      if (person.location && person.location !== '—') {
        counts[person.location] = (counts[person.location] || 0) + 1;
      }
    });
    return counts;
  }, [people]);

  const { mutate: removeSite, isPending: isDeleting } = useMutation({
    mutationKey: ['siteDelete'],
    mutationFn: siteDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteList'] });
      queryClient.invalidateQueries({ queryKey: ['useGetSite'] });
      handleAlert({ text: 'Location deleted successfully', type: 'success' });
      setDeleting(null);
    },
  });

  const countries = useMemo(() => {
    const found = new Set<string>();
    sites.forEach((site: Site) => site?.country && found.add(site.country));
    return ['All', ...Array.from(found).sort()];
  }, [sites]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sites.filter((site: Site) => {
      if (country !== 'All' && site?.country !== country) return false;
      if (!needle) return true;
      return [site?.name, site?.city, site?.state, site?.country, site?.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [sites, search, country]);

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['siteList'] });
    queryClient.invalidateQueries({ queryKey: ['useGetSite'] });
  };

  if (!canView) {
    return (
      <div className="gp-locations">
        <DirectoryPage title="Locations" description="The sites your organisation operates from.">
          <table>
            <tbody>
              <EmptyRow span={1} message="You do not have permission to view locations." />
            </tbody>
          </table>
        </DirectoryPage>
      </div>
    );
  }

  return (
    <>
      <div className="gp-locations">
      <DirectoryPage
        title="Locations"
        description="The sites your organisation operates from — address, timezone and who works there."
        actions={
          canAdd ? (
            <button type="button" className="btn primary" onClick={() => setCreating(true)}>
              <Ic n="plus" />
              New location
            </button>
          ) : null
        }
        filters={
          <>
            <FilterChip label="Country" value={country} options={countries} onChange={setCountry} />
            <SearchChip value={search} onChange={setSearch} placeholder="Search locations" />
            <span className="fchip live" style={{ marginLeft: 'auto' }}>
              {visible.length} of {sites.length}
            </span>
          </>
        }
      >
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Address</th>
              <th>City / State</th>
              <th>Country</th>
              <th>Timezone</th>
              <th>People</th>
              <th className="gp-loc-actions-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <EmptyRow span={7} message="Loading locations…" />
            ) : visible.length ? (
              visible.map((site: Site) => (
                <tr key={site?.uuid || site?.site_id} onClick={() => setOpen(site)}>
                  <td>
                    <div className="list-row-name">
                      {site?.name || '—'}
                      {isDefaultSite(site) ? (
                        <span className="tag acc" style={{ marginLeft: 8 }}>
                          Default
                        </span>
                      ) : null}
                    </div>
                    <div className="list-row-sub">{site?.postal_code || '—'}</div>
                  </td>
                  <td>{site?.address || '—'}</td>
                  <td>{[site?.city, site?.state].filter(Boolean).join(', ') || '—'}</td>
                  <td>{site?.country || '—'}</td>
                  <td>
                    <span className="mono">{site?.timezone || '—'}</span>
                  </td>
                  <td>{headcount[site?.name || ''] || 0}</td>
                  <td className="gp-loc-actions-cell" onClick={(event) => event.stopPropagation()}>
                    <span className="flex items-center gap-2 gp-loc-actions">
                      {canEdit ? (
                        <button
                          type="button"
                          className="mini"
                          title={`Edit ${site?.name || 'location'}`}
                          aria-label={`Edit ${site?.name || 'location'}`}
                          onClick={() => setEditing(site)}
                        >
                          <Ic n="sliders" size={16} />
                        </button>
                      ) : null}
                      {/* The default site anchors numbers and users, so the
                          platform does not allow removing it. */}
                      {canDelete && !isDefaultSite(site) ? (
                        <button
                          type="button"
                          className="mini"
                          title={`Delete ${site?.name || 'location'}`}
                          aria-label={`Delete ${site?.name || 'location'}`}
                          onClick={() => setDeleting(site)}
                        >
                          <Ic n="trash" size={16} />
                        </button>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow
                span={7}
                message={sites.length ? 'No locations match those filters.' : 'No locations yet.'}
              />
            )}
          </tbody>
        </table>

      </DirectoryPage>
      </div>

      <Dialog open={Boolean(open)} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="gp-loc-dialog sm:max-w-[560px]" showCloseButton={false}>
          <div className="gp-create-group-head">
            <h2>{open?.name || 'Location'}</h2>
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={() => setOpen(null)}
            >
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-loc-fields">
            <div className="gp-loc-field">
              <span className="gp-loc-field-l">Address</span>
              <span className="gp-loc-field-v">{open?.address || '—'}</span>
            </div>
            <div className="gp-loc-field">
              <span className="gp-loc-field-l">City</span>
              <span className="gp-loc-field-v">{open?.city || '—'}</span>
            </div>
            <div className="gp-loc-field">
              <span className="gp-loc-field-l">State</span>
              <span className="gp-loc-field-v">{open?.state || '—'}</span>
            </div>
            <div className="gp-loc-field">
              <span className="gp-loc-field-l">Country</span>
              <span className="gp-loc-field-v">{open?.country || '—'}</span>
            </div>
            <div className="gp-loc-field">
              <span className="gp-loc-field-l">Postal code</span>
              <span className="gp-loc-field-v">{open?.postal_code || '—'}</span>
            </div>
            <div className="gp-loc-field">
              <span className="gp-loc-field-l">Timezone</span>
              <span className="gp-loc-field-v">{open?.timezone || '—'}</span>
            </div>
            <div className="gp-loc-field">
              <span className="gp-loc-field-l">People</span>
              <span className="gp-loc-field-v">{headcount[open?.name || ''] || 0}</span>
            </div>
          </div>
          <div className="gp-loc-dialog-actions">
            <button type="button" className="gp-loc-dialog-close" onClick={() => setOpen(null)}>
              Close
            </button>
            {canEdit ? (
              <button
                type="button"
                className="gp-loc-dialog-edit"
                onClick={() => {
                  setEditing(open);
                  setOpen(null);
                }}
              >
                <Ic n="sliders" />
                Edit
              </button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* The platform's own site form — `data` empty means create. */}
      <Dialog open={creating || Boolean(editing)} onOpenChange={(next) => !next && closeForm()}>
        <DialogContent className="gp-create-group-dialog sm:max-w-[860px]" showCloseButton={false}>
          <div className="gp-create-group-head">
            <h2>{editing ? `Update location (${editing?.name || ''})` : 'New location'}</h2>
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={closeForm}
            >
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <NewSiteSteps data={editing || {}} handleClose={closeForm} />
          </div>
        </DialogContent>
      </Dialog>

      <AlertConfirm
        {...{
          apiLoading: isDeleting,
          open: Boolean(deleting),
          setOpen: (value: boolean) => !value && setDeleting(null),
          /* Rows may be keyed by site_id when uuid is absent; guarding on uuid
             alone made Delete do nothing at all, with no error shown. */
          onConfirm: () => {
            const id = deleting?.uuid || deleting?.site_id || deleting?.id;
            if (!id) {
              handleAlert({ text: 'This location has no id to delete.', type: 'error' });
              setDeleting(null);
              return;
            }
            removeSite(id);
          },
          onCancel: () => setDeleting(null),
          onClose: () => setDeleting(null),
          confirmBtnText: 'Delete',
          closeBtnText: 'Cancel',
          descriptionTextComp: (
            <div className="text-md">
              Delete <strong>{deleting?.name}</strong>? People and numbers assigned to this location
              will need to be moved.
            </div>
          ),
        }}
      />
    </>
  );
};

export default Locations;
