import { Input } from '@/components/ui/input';
import { siteDelete, siteList } from '@/services/api';
import { useEffect, useMemo, useState } from 'react';
import CompanyDetails from './company-details';
import LocationFacts from './location-facts';
import CompanyRecord from './company-record';
import CompanySettingsCard from './company-settings-card';
import SetupGuide from '@/components/mcm/setup-guide';
import { Button } from '@/components/ui/button';
import NewSiteSteps from './new-site-steps';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { upsertSite, siteList as fetchSiteList } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { SearchLine } from '@/assets/icons';
import SideDrawer from '@/components/custom/side-drawer';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import { useCompanyFeatures } from '@/hooks/rbac';
import { Briefcase, MapPin, MapPinIcon } from 'lucide-react';
import useDebounce from '@/hooks/use-debounce';
import Loader from '@/components/custom/loader';
import { useUser } from '@/hooks/use-user';

const CompanyInfo = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebounce(search, 1000);
  const [rowData, setRowData] = useState<any>({});
  const [drawerState, setDrawerState] = useState<any>(false);
  const [drawerState2, setDrawerState2] = useState<any>(false);

  /* A location is opened from its own URL rather than only from a click, so it
     can be linked to, reloaded and sent to someone. The drawer stays — it is a
     good way to show a location — but it is no longer that location's only
     address. */
  const navigate = useNavigate();
  const { locationId } = useParams();
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const isTrial = user?.company_info?.is_trial === 'Y';
  const { features } = useCompanyFeatures();
  const siteAccess = features?.plan_features?.account_setting?.access?.SITE?.action;
  const canViewSites = Boolean(siteAccess?.view);
  const canAddSites = Boolean(siteAccess?.add);
  const canEditSites = Boolean(siteAccess?.edit);
  const canDeleteSites = Boolean(siteAccess?.delete);

  const { mutate: mutateSiteDelete, isPending } = useMutation({
    mutationKey: ['siteDelete'],
    mutationFn: siteDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteList'] });
      handleAlert({ text: 'Location deleted successfully', type: 'success' });
      setOpen(false);
    },
  });
  const { data: sites = [], isLoading: isSitesLoading } = useQuery({
    queryKey: ['siteList'],
    queryFn: () =>
      siteList({
        page: 1,
        limit: 1000,
      }),
    enabled: canViewSites,
    select: (data: any) => data?.data?.data?.result?.rows || [],
  });

  const defaultSite = useMemo(
    () => sites.find((site: any) => site?.is_default === '1') || null,
    [sites],
  );

  const filteredSites = useMemo(() => {
    const nameSearch = debouncedSearch?.trim()?.toLowerCase();
    const nonDefaultSites = sites.filter((site: any) => site?.is_default !== '1');
    if (!nameSearch) return nonDefaultSites;

    return nonDefaultSites.filter((site: any) => site?.name?.toLowerCase()?.includes(nameSearch));
  }, [sites, debouncedSearch]);

  const handleNewSite = () => {
    if (isTrial) return;

    if (!canAddSites) {
      return handleAlert({
        text: 'This feature is not available in your current plan. Please upgrade',
        type: 'error',
      });
    }
    setDrawerState2(true);
    setRowData({});
  };

  const handleViewSite = (site: any) => {
    if (!canViewSites) {
      return handleAlert({
        text: 'You do not have permission to view locations',
        type: 'error',
      });
    }
    /* Navigating opens the drawer through the effect below, so a click and a
       pasted URL take exactly the same path. */
    navigate(`/admin-settings/company/locations/${site?.uuid}`);
  };

  /* Opens the drawer for whichever location the URL names. Runs once the list
     has arrived, because the drawer needs the whole record and the URL carries
     only an id. An id that matches nothing is ignored rather than opening an
     empty drawer. */
  useEffect(() => {
    if (!locationId || !sites.length) return;
    const match = sites.find((site: any) => site?.uuid === locationId);
    if (!match) return;
    setRowData(match);
    setDrawerState(true);
  }, [locationId, sites]);

  /* Choosing the main location.
     
     Established systems treat this as a real setting; inbound calls fail when
     it is wrong; ours only ever displayed which location was marked. There is no
     dedicated endpoint, so the flag is sent through the ordinary site save.
     
     Whether the API honours an is_default it has never been sent before is not
     knowable from here, so the result is checked rather than assumed: the list is
     re-read and, if the flag did not move, the admin is told it was refused
     instead of being shown a success message for something that did not happen. */
  const { mutate: makeMainLocation, isPending: isSettingMain } = useMutation({
    mutationFn: (site: any) =>
      upsertSite({
        siteUUID: site?.uuid,
        name: site?.name,
        address: site?.address,
        country: site?.country,
        state: site?.state,
        city: site?.city,
        postal_code: site?.postal_code,
        timezone: site?.timezone,
        is_default: '1',
      }),
    onSuccess: async (_response: any, site: any) => {
      const fresh: any = await fetchSiteList({ page: 1, limit: 200 });
      const rows: any[] = fresh?.data?.data?.result?.rows || [];
      const moved = rows.find((row: any) => row?.uuid === site?.uuid)?.is_default === '1';

      queryClient.invalidateQueries({ queryKey: ['siteList'] });

      handleAlert({
        text: moved
          ? `${site?.name || 'That location'} is now your main location.`
          : 'The server did not accept the change, so your main location is unchanged. This needs a change on the API side.',
        type: moved ? 'success' : 'error',
      });
    },
    onError: () => {
      handleAlert({
        text: 'Could not change the main location. Nothing was changed.',
        type: 'error',
      });
    },
  });

  const handleEditSite = (site: any) => {
    if (isTrial || !canEditSites) return;
    setDrawerState2(true);
    setRowData(site);
  };

  const handleDeleteSite = (site: any, isDefault: boolean) => {
    if (isDefault || !canDeleteSites) return;
    setRowData(site);
    setOpen(true);
  };

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-200/15">
      <div className="flex min-h-[65px] flex-col justify-center border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-gray-900 font-semibold text-lg">Company &amp; Locations</p>
        <p className="text-gray-500 text-xs">
          Your company record and every place it operates from — address, timezone and the people
          who work there.
        </p>
      </div>
      {!canViewSites ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3 sm:px-4">
          <div className="mx-auto flex w-full max-w-[1040px] min-h-0 flex-col gap-4">
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
              <p className="text-sm font-semibold text-gray-900">
                You do not have permission to view sites
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3 sm:px-4">
          <div className="mx-auto flex w-full max-w-[1040px] min-h-0 flex-col gap-4">
            {/* Organisation before locations — the order established systems
                use, and the order the platform's own data follows: a location
                belongs to a company. */}
            {/* Above the company record: it is the thing a new admin should read
                first, and it disappears once everything is done. */}
            <SetupGuide companyInfo={user?.company_info} />

            <div id="setup-company-record" className="rounded-xl">
              <CompanyRecord companyInfo={user?.company_info} defaultSite={defaultSite} />
            </div>

            {/* Company-wide rules belong on the company screen, which is where
                established systems put them and where an admin looks. The editor
                itself stays under Phone System — one editor, one record. */}
            <CompanySettingsCard />

            {/* A location is not a label — it decides how calls behave for
                everyone assigned to it. Saying so here saves an admin working it
                out from the fields. */}
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm font-semibold text-gray-900">What a location decides</p>
              <p className="mt-1 text-xs text-gray-600">
                Add a location for each place your company works from — London, Dubai, Singapore —
                all under one billing account. For everyone assigned to it, the location sets:
              </p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
                <li className="text-xs text-gray-700">
                  <span className="font-semibold text-gray-900">The clock.</span> Opening and
                  closing times are read in the location&rsquo;s timezone.
                </li>
                <li className="text-xs text-gray-700">
                  <span className="font-semibold text-gray-900">The number shown.</span> What people
                  here display when they call out.
                </li>
                <li className="text-xs text-gray-700">
                  <span className="font-semibold text-gray-900">The address on record.</span> Used
                  when buying local numbers and for regulatory checks.
                </li>
              </ul>
            </div>
            <div id="setup-locations" className="flex items-center gap-3 rounded-xl">
              <p className="flex items-center gap-2 text-base font-semibold capitalize tracking-wide text-gray-900">
                <Briefcase className="h-4.5 w-4.5 text-primary" />
                Default location
              </p>
            </div>
            {defaultSite ? (
              <div className="rounded-xl border-t-3 border-primary bg-white shadow-sm">
                <div className="flex gap-3 p-4">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-ucass-primary-200 text-primary">
                    <Icon name="CompayIcon" className="h-6 w-6" />
                    <span className="absolute bottom-0 -right-1 h-3 w-3 rounded-full border border-white bg-green-500" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex flex-wrap items-start gap-3 border-b border-gray-200 pb-4">
                      <div className="flex min-w-[220px] flex-1 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="cursor-pointer text-left text-sm font-semibold text-primary"
                          onClick={() => handleViewSite(defaultSite)}
                        >
                          {defaultSite?.name || '---'}
                        </button>
                        <span className="rounded-sm bg-ucass-primary-200 px-2 py-1 text-xs font-semibold capitalize text-primary">
                          Main location
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">
                          Location ID:{' '}
                          {defaultSite?.site_id || defaultSite?.id || defaultSite?.uuid || '---'}
                        </p>
                        {!isTrial && canEditSites && (
                          <button
                            type="button"
                            aria-label="Edit the default location"
                            title="Edit the default location"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-500 hover:bg-primary hover:text-white"
                            onClick={() => handleEditSite(defaultSite)}
                          >
                            <Icon name="EditStrokIcon" className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <MapPinIcon className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                            Primary Address
                          </p>
                          <p className="text-sm font-medium text-gray-700">
                            {defaultSite?.address || '---'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                          Country
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          {defaultSite?.country || '---'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                          State
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          {defaultSite?.state || '---'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                          City
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          {defaultSite?.city || '---'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                          Postal Code
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          {defaultSite?.postal_code || '---'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                          Timezone
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          {defaultSite?.timezone || '---'}
                        </p>
                      </div>
                    </div>
                    <LocationFacts site={defaultSite} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
                <p className="text-sm font-semibold text-gray-900">No default location found</p>
              </div>
            )}
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex gap-2 ">
                <MapPin className="h-4.5 w-4.5 text-primary mt-0.75" />

                <div className="flex flex-col gap-0.5">
                  <p className="flex items-center gap-2 text-base font-semibold capitalize tracking-wide text-gray-900">
                    Other locations
                  </p>
                  <p className="text-xs text-gray-700 font-medium">
                    Manage the physical locations or virtual boundaries associated with your
                    account.
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="w-full sm:min-w-[240px]">
                  <Input
                    placeholder="Search sites..."
                    className="pl-10"
                    IconPosition="left-0 pl-2 inset-y-0"
                    value={search}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.startsWith(' ')) return;
                      setSearch(e.target.value);
                    }}
                    Icon={<SearchLine className=" text-gray-700" />}
                  />
                </div>
                {/* Comparing locations is a different job from reading one, and
                    it needs a table rather than a column of cards. */}
                <Button
                  className="rounded-xl"
                  variant={'outline'}
                  onClick={() => navigate('/admin-settings/company/location-management')}
                >
                  <MapPin className="mr-1 h-4 w-4" />
                  Manage all locations
                </Button>
                {!isTrial && canViewSites && canAddSites && (
                  <Button
                    className="rounded-xl"
                    variant={'outline'}
                    onClick={() => handleNewSite()}
                  >
                    <Icon name="Plus" className="mr-1 h-4 w-4" />
                    New location
                  </Button>
                )}
              </div>
            </div>
            <div className="w-full flex flex-col gap-3 pb-3">
              {isSitesLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-8">
                  <div className="flex items-center justify-center">
                    <Loader variant="blue" size="md" />
                  </div>
                </div>
              ) : !filteredSites.length ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-gray-900">No additional sites found</p>
                  <p className="text-xs text-gray-600">
                    Try a different search, or create a location.
                  </p>
                </div>
              ) : (
                filteredSites.map((site: any) => {
                  const isDefault = site?.is_default === '1';
                  const siteId = site?.site_id || site?.id || site?.uuid || '---';
                  return (
                    <div key={site?.uuid || siteId} className="rounded-xl bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ucass-primary-200 text-primary">
                            <Icon name="CompayIcon" className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="cursor-pointer text-left text-sm font-semibold leading-7 text-primary"
                                onClick={() => handleViewSite(site)}
                              >
                                {site?.name || '---'}
                              </button>
                              {isDefault && (
                                <span className="rounded-sm bg-ucass-primary-200 px-2 py-1 text-xs font-semibold capitalize text-primary">
                                  Main location
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">Location ID: {siteId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isTrial && canEditSites && !isDefault && (
                            <button
                              type="button"
                              disabled={isSettingMain}
                              title="Make this the main location"
                              className="cursor-pointer rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => makeMainLocation(site)}
                            >
                              Make main
                            </button>
                          )}
                          {!isTrial && canEditSites && (
                            <button
                              type="button"
                              aria-label={`Edit ${site?.name || 'site'}`}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-500 hover:bg-primary hover:text-white"
                              onClick={() => {
                                handleEditSite(site);
                              }}
                            >
                              <Icon name="EditStrokIcon" className="h-4 w-4" />
                            </button>
                          )}
                          {canDeleteSites && (
                            <button
                              type="button"
                              disabled={isDefault}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                isDefault
                                  ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300'
                                  : 'cursor-pointer border-red-100 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white'
                              }`}
                              onClick={() => {
                                handleDeleteSite(site, isDefault);
                              }}
                            >
                              <Icon name="TrashBin" className="h-4 w-4" />
                            </button>
                          )}
                          {!canEditSites && !canDeleteSites && (
                            <span className="text-xs font-medium text-gray-400">---</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="flex items-start gap-2">
                          <MapPinIcon className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                              Primary Address
                            </p>
                            <p className="text-sm font-medium text-gray-700">
                              {site?.address || '---'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                            Country
                          </p>
                          <p className="text-sm font-semibold text-gray-700">
                            {site?.country || '---'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                            State
                          </p>
                          <p className="text-sm font-semibold text-gray-700">
                            {site?.state || '---'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                            City
                          </p>
                          <p className="text-sm font-semibold text-gray-700">
                            {site?.city || '---'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                            Postal Code
                          </p>
                          <p className="text-sm font-semibold text-gray-700">
                            {site?.postal_code || '---'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold capitalize tracking-wide text-gray-500">
                            Timezone
                          </p>
                          <p className="text-sm font-semibold text-gray-700">
                            {site?.timezone || '---'}
                          </p>
                        </div>
                      </div>
                      <LocationFacts site={site} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      {drawerState && (
        <SideDrawer
          width="min(1040px, 84vw)"
          isOpen={drawerState}
          isTab={false}
          handleClose={() => setDrawerState(false)}
          content={<CompanyDetails data={rowData} />}
        />
      )}
      {drawerState2 && (
        <SideDrawer
          width="min(1040px, 84vw)"
          isOpen={drawerState2}
          handleClose={() => setDrawerState2(false)}
          isTab={false}
          enableResponsive
          content={<NewSiteSteps data={rowData} handleClose={() => setDrawerState2(false)} />}
        />
      )}
      <AlertConfirm
        {...{
          apiLoading: isPending,
          onConfirm: () => {
            if (!canDeleteSites) return;
            mutateSiteDelete(rowData?.uuid);
          },
          open,
          setOpen,
        }}
      />
    </section>
  );
};

export default CompanyInfo;
