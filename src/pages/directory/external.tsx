import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteContact, deleteLeadGroup, getContactList, syncContacts } from '@/services/api';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import {
  describeSyncPlan,
  planContactSync,
  syncPayload,
  syncWouldChangeAnything,
} from '@/lib/contact-sync';
import { useGoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import '@/styles/warm-glass.css';
import './groups-glass.css';
import './external-glass.css';
import SendWhatsappMessage from '@/pages/messenger/drawers/send-whatsapp-message';
import { Icon } from '@/assets/icons/icon';
import { SearchLine } from '@/assets/icons';
import { DirectoryPage } from './page-shell';
import AllNewContactsList from '@/pages/new-contact/all-contacts-list';
import CreateContactNew from '@/pages/new-contact/create-new-contact';
import NotesWidget from '@/components/notes';
import AlertConfirm from '@/components/custom/alert-confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomSelect from '@/components/custom/custom-select';
import LeadsGroupList from '@/pages/leads/lead-group-list';
import CreateNewLeadGroup from '@/pages/leads/add-group-lead-modal';
import LeadContactLogs from '@/pages/leads/lead-contact-logs';
import { CONTACT_TABS_CONST, LEAD_CREATE_TYPE } from '@/pages/leads/const';
import { handleAlert } from '@/lib/utils';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useGetGroupList } from '@/hooks/common';
import useDebounce from '@/hooks/use-debounce';
import { useUser } from '@/hooks/use-user';

/**
 * Directory ▸ External — people outside the organisation.
 *
 * The header (title, description, "New contact") is this page's own; the
 * toolbar and list below it are the platform's own Contacts screen
 * (`new-contact`) — Contact view/Contact Group tabs, Google Sync, and the
 * real contacts table with bulk delete, group assignment and tag toggles —
 * reused wholesale rather than rebuilt a second time. The trade-off: the
 * free-text "Labels" this page used to keep in the browser lived entirely
 * in the custom detail popup that came with the old table, and has no
 * equivalent here.
 */

const TAG_FILTER_VALUE: Record<string, string> = {
  VIP: 'VIP',
  DNC: 'DNC',
  BLOCK: 'Blocked',
  STANDARD: 'Standard',
};

const ExternalInner = () => {
  const queryClient = useQueryClient();
  const { features } = useCompanyFeatures();
  const contactFeature = features?.plan_features?.contact || {};
  const contactActions = contactFeature?.action || {};
  const canViewContact = Boolean(contactFeature?.IS_SHOW && contactActions?.view);
  const canEditContact = Boolean(contactActions?.edit);
  const canDeleteContact = Boolean(contactActions?.delete);

  const [tabName, setTabName] = useState<string>(CONTACT_TABS_CONST.CONTACT_LIST);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupLabel, setSelectedGroupLabel] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedGroupForContactLogs, setSelectedGroupForContactLogs] = useState<any>(null);
  const { data: groupList = [] } = useGetGroupList({
    type: 'CONTACT',
    generatedBy: null,
    displayType: 'dropdown',
  });

  const [drawerState, setDrawerState] = useState<{
    addContact: boolean;
    selectedContact: any;
    addLead: boolean;
    selectedGroup: any;
  }>({
    addContact: false,
    selectedContact: null,
    addLead: false,
    selectedGroup: null,
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<any>(null);
  const [notesContact, setNotesContact] = useState<any>(null);
  const [whatsappTo, setWhatsappTo] = useState<string>('');
  const [confirmModelState, setConfirmState] = useState<{
    isModal: boolean;
    selectedGroupId: string;
  }>({ isModal: false, selectedGroupId: '' });

  const { mutate: mutateDeleteContact, isPending: isPendingDeleteContact } = useMutation({
    mutationFn: deleteContact,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({
          text: data?.data?.data?.message || 'Contact deleted successfully!',
          type: 'success',
        });
        setShowDeleteConfirmation(null);
        queryClient.invalidateQueries({ queryKey: ['getContactList'] });
      }
    },
  });

  const { mutate: mutateDeleteGroup, isPending: isPendingDeleteGroup } = useMutation({
    mutationFn: deleteLeadGroup,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({
          text: data?.data?.data?.message || 'Contact group deleted successfully!',
          type: 'success',
        });
        setConfirmState({ isModal: false, selectedGroupId: '' });
        queryClient.invalidateQueries({ queryKey: ['getGroupListQuery'] });
      }
    },
  });

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    onSuccess: async (tokenResponse) => {
      try {
        let connections: any[] = [];
        let nextPageToken = '';
        let hasNextPage = true;

        while (hasNextPage) {
          const url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=2000&requestSyncToken=false${
            nextPageToken ? `&pageToken=${nextPageToken}` : ''
          }`;
          const res = await fetch(url, {
            method: 'GET',
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          if (!res.ok) throw new Error(`Google API responded with status ${res.status}`);
          const pageData = await res.json();
          if (pageData.connections) connections = [...connections, ...pageData.connections];
          nextPageToken = pageData.nextPageToken || '';
          hasNextPage = !!nextPageToken;
        }

        const fromGoogle = connections.map((conn: any) => {
          const nameObj = conn.names?.[0] || {};
          return {
            name:
              `${nameObj.givenName || nameObj.displayName || ''} ${nameObj.familyName || ''}`.trim(),
            phone: conn.phoneNumbers?.[0]?.canonicalForm || conn.phoneNumbers?.[0]?.value || '',
            email: conn.emailAddresses?.[0]?.value || '',
            externalId: conn.resourceName || '',
          };
        });

        const stored = await fetchAllPages(getContactList);
        const plan = planContactSync(fromGoogle, stored);

        if (!syncWouldChangeAnything(plan)) {
          handleAlert({ text: describeSyncPlan(plan), type: 'info' });
          return;
        }

        await syncContacts(syncPayload(plan));
        handleAlert({ text: describeSyncPlan(plan), type: 'success' });
        queryClient.invalidateQueries({ queryKey: ['getContactList'] });
      } catch (err) {
        handleAlert({
          text: `Failed to import contacts: ${err instanceof Error ? err.message : String(err)}`,
          type: 'error',
        });
      }
    },
    onError: (errorResponse) => {
      handleAlert({
        text: `Google Login Failed! Error: ${JSON.stringify(errorResponse)}`,
        type: 'error',
      });
    },
  });

  const payloadExtraParams: any = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(selectedGroupId ? { groupId: selectedGroupId } : {}),
    ...(selectedTag ? { filters: [{ key: 'tag', value: selectedTag }] } : {}),
  };

  const handleTabChange = (value: string) => {
    setTabName(value);
    setSelectedGroupId(null);
    setSelectedTag(null);
    if (value !== CONTACT_TABS_CONST.CONTACT_GROUP_LIST) {
      setSelectedGroupForContactLogs(null);
    }
  };

  const addActionLabel =
    tabName === CONTACT_TABS_CONST.CONTACT_GROUP_LIST ? 'Add Group' : 'Add Contact';

  return (
    <>
      <div className="gp-external">
      <DirectoryPage
        title="External Contacts"
        description="People outside the organisation — who they work for, how to reach them, and every channel you can use."
        actions={
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              tabName === CONTACT_TABS_CONST.CONTACT_GROUP_LIST
                ? setDrawerState((prev) => ({ ...prev, addLead: true, selectedGroup: null }))
                : setDrawerState((prev) => ({ ...prev, addContact: true, selectedContact: null }))
            }
          >
            <Icon name="Plus" className="h-3 w-3" />
            {addActionLabel}
          </button>
        }
        beforeTable={
          <div className="gp-contact-toolbar border-b border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
            <div className="flex flex-col gap-3 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="w-full shrink-0 overflow-x-auto lg:w-auto lg:min-w-0 lg:shrink lg:flex-1">
                <Tabs
                  value={tabName}
                  onValueChange={handleTabChange}
                  className="flex w-max min-w-full lg:min-w-0"
                >
                  <div className="h-full min-w-max">
                    <TabsList
                      className="gap-1 rounded-lg border border-[rgba(225,200,165,0.7)] bg-[rgba(255,255,255,0.55)] p-1"
                      style={{ margin: 0 }}
                    >
                      <TabsTrigger value={CONTACT_TABS_CONST.CONTACT_LIST}>
                        <span className="whitespace-nowrap">{CONTACT_TABS_CONST.CONTACT_LIST}</span>
                      </TabsTrigger>
                      <TabsTrigger value={CONTACT_TABS_CONST.CONTACT_GROUP_LIST}>
                        <span className="whitespace-nowrap">
                          {CONTACT_TABS_CONST.CONTACT_GROUP_LIST}
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </Tabs>
              </div>

              <div className="flex w-full flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-end sm:pb-0 lg:w-auto lg:min-w-0 lg:flex-none lg:pb-0">
                <Button
                  onClick={() => login()}
                  variant="outline"
                  className="gp-sync-btn h-9 min-h-9 w-full rounded-lg border-primary bg-white font-medium text-primary shadow-sm sm:w-auto"
                >
                  Sync With Google
                </Button>

                <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:w-auto lg:min-w-0 lg:flex-nowrap">
                  <div className="gp-contact-search-wrap">
                    <Input
                      placeholder="Search"
                      className="gp-contact-search h-9 min-h-9 w-full rounded-lg border-[rgba(225,200,165,0.9)] bg-white/70 pl-10 shadow-sm focus:shadow sm:min-w-[6rem] lg:min-w-[18rem] xl:min-w-[24rem]"
                      IconPosition="left-0 pl-3 inset-y-0"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      Icon={<SearchLine className="gp-contact-search-icon text-[#8a7a67] w-4 h-4" />}
                    />
                  </div>
                  {tabName === CONTACT_TABS_CONST.CONTACT_LIST && (
                    <>
                      <div className="w-full sm:w-44">
                        <CustomSelect
                          isClearable
                          placeholder="Group"
                          options={groupList?.map((group: any) => ({
                            label: group.groupName || group.name || '',
                            value: group._id,
                          }))}
                          handleChange={(e: any) => {
                            setSelectedGroupId(e ? e.value : null);
                            setSelectedGroupLabel(e ? e.label : null);
                          }}
                          value={
                            selectedGroupId
                              ? { label: selectedGroupLabel || '', value: selectedGroupId }
                              : null
                          }
                          inputClass="contact-toolbar-select"
                        />
                      </div>
                      <div className="w-full sm:w-40">
                        <CustomSelect
                          isClearable
                          placeholder="Tag"
                          options={[
                            { label: 'Standard', value: 'STANDARD' },
                            { label: 'VIP', value: 'VIP' },
                            { label: 'Blocked', value: 'BLOCK' },
                            { label: 'DNC', value: 'DNC' },
                          ]}
                          handleChange={(e: any) => setSelectedTag(e ? e.value : null)}
                          value={
                            selectedTag
                              ? { label: TAG_FILTER_VALUE[selectedTag] || selectedTag, value: selectedTag }
                              : null
                          }
                          inputClass="contact-toolbar-select"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        }
      >
        {selectedGroupForContactLogs ? (
          <LeadContactLogs
            groupData={selectedGroupForContactLogs}
            onBack={() => setSelectedGroupForContactLogs(null)}
            setDrawerState={setDrawerState}
            setShowDeleteConfirmation={canDeleteContact ? setShowDeleteConfirmation : () => void 0}
            contextType="new-contact"
          />
        ) : tabName === CONTACT_TABS_CONST.CONTACT_GROUP_LIST ? (
          <LeadsGroupList
            setConfirmState={setConfirmState}
            setDrawerState={setDrawerState}
            isLead={false}
            permissionAccess={{ canEdit: canEditContact, canDelete: canDeleteContact }}
            onOpenContactLogs={(group: any) => setSelectedGroupForContactLogs(group)}
            search={debouncedSearch}
            tableWrapperClassName="gp-contact-table"
            splitStickyHeader
            fixedPageRows={10}
            showRecordRange
          />
        ) : (
          <AllNewContactsList
            setDrawerState={setDrawerState}
            setShowDeleteConfirmation={canDeleteContact ? setShowDeleteConfirmation : () => void 0}
            payloadExtraParams={payloadExtraParams}
            tableWrapperClassName="gp-contact-table"
            splitStickyHeader
            fixedPageRows={10}
            showRecordRange
            avatarSize="38"
            permissionAccess={{
              canView: canViewContact,
              canEdit: canEditContact,
              canDelete: canDeleteContact,
            }}
            handleNotesOpen={(contact: any) => setNotesContact(contact)}
            handleWhatsappOpen={(contact: any) =>
              setWhatsappTo(contact?.social?.whatsapp || contact?.contact?.phone || '')
            }
          />
        )}
      </DirectoryPage>
      </div>

      <AlertConfirm
        apiLoading={isPendingDeleteGroup}
        onConfirm={() =>
          mutateDeleteGroup({ groupId: confirmModelState?.selectedGroupId, type: 'CONTACT' })
        }
        open={confirmModelState?.isModal}
        setOpen={() => setConfirmState({ isModal: false, selectedGroupId: '' })}
      />

      <Dialog
        open={drawerState.addContact}
        onOpenChange={(next) =>
          !next && setDrawerState((prev) => ({ ...prev, addContact: false, selectedContact: null }))
        }
      >
        <DialogContent
          className="gp-create-group-dialog gp-contact-form-dialog sm:max-w-[820px]"
          showCloseButton={false}
        >
          <div className="gp-create-group-head">
            <h2>
              {drawerState.selectedContact
                ? `Update Contact (${drawerState.selectedContact?.name?.first || ''} ${drawerState.selectedContact?.name?.last || ''})`
                : 'Add Contact'}
            </h2>
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={() =>
                setDrawerState((prev) => ({ ...prev, addContact: false, selectedContact: null }))
              }
            >
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <CreateContactNew
              contactData={drawerState.selectedContact}
              isDisable={false}
              setIsDisable={() => void 0}
              setDrawerState={() => void 0}
              keepFormDataAfterSave
              isLead={false}
              largeAvatar
              handleClose={() =>
                setDrawerState((prev) => ({ ...prev, addContact: false, selectedContact: null }))
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      {drawerState.addLead ? (
        <CreateNewLeadGroup
          group={drawerState?.selectedGroup}
          selectedCreateType={LEAD_CREATE_TYPE.ADD_NEW}
          onAddInExistingGroup={() => void 0}
          selectedLeads={[]}
          modalState={drawerState.addLead}
          setModalState={() =>
            setDrawerState((prev) => ({ ...prev, addLead: false, selectedGroup: null }))
          }
        />
      ) : null}

      <Dialog open={Boolean(notesContact)} onOpenChange={(next) => !next && setNotesContact(null)}>
        <DialogContent
          className="gp-create-group-dialog gp-notes-dialog sm:max-w-[520px]"
          showCloseButton={false}
        >
          <div className="gp-create-group-head">
            <h2>
              Contact Notes
              {notesContact
                ? ` (${notesContact?.name?.first || ''} ${notesContact?.name?.last || ''})`
                : ''}
            </h2>
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={() => setNotesContact(null)}
            >
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <NotesWidget
              customClass="h-[60vh]"
              extraPayload={{ phone: notesContact?.contact?.phone }}
              contactId={notesContact?._id || ''}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(whatsappTo)} onOpenChange={(next) => !next && setWhatsappTo('')}>
        <DialogContent
          className="gp-create-group-dialog gp-whatsapp-dialog sm:max-w-[480px]"
          showCloseButton={false}
        >
          <div className="gp-create-group-head">
            <h2>Send WhatsApp Message</h2>
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={() => setWhatsappTo('')}
            >
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <div className="mcm-warm-glass whatsapp-drawer-glass flex w-full flex-col">
              <SendWhatsappMessage
                handleClose={() => setWhatsappTo('')}
                initialNumber={whatsappTo}
                selectClassName="whatsapp-drawer-select"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {canDeleteContact && showDeleteConfirmation ? (
        <AlertConfirm
          apiLoading={isPendingDeleteContact}
          open={Boolean(showDeleteConfirmation)}
          setOpen={() => setShowDeleteConfirmation(null)}
          onConfirm={() => mutateDeleteContact({ contact_uuid: [showDeleteConfirmation?._id] })}
          descriptionTextComp={
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Icon name="TrashBin" className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-center text-[#9A948F]">
                Delete{' '}
                {`${showDeleteConfirmation?.name?.first || ''} ${showDeleteConfirmation?.name?.last || ''}`.trim() ||
                  'this contact'}
                ? This action cannot be undone.
              </p>
            </div>
          }
        />
      ) : null}
    </>
  );
};

const External = () => {
  const { user } = useUser();
  const DEFAULT_CLIENT_ID =
    '285675733526-2rrr5cskrljog7f9s6ndm85198d5es29.apps.googleusercontent.com';
  const googleClientId = user?.google_client_id || DEFAULT_CLIENT_ID;

  return (
    <GoogleOAuthProvider key={googleClientId} clientId={googleClientId}>
      <ExternalInner />
    </GoogleOAuthProvider>
  );
};

export default External;
