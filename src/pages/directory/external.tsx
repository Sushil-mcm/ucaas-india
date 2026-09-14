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
import UploadContacts from '@/pages/leads/upload-contacts.tsx/index.tsx';
import ExportContacts from '@/pages/leads/export-contacts.tsx/index.tsx';
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
  const canAddContact = Boolean(contactActions?.add);
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
    updateContacts: boolean;
    exportContacts: boolean;
  }>({
    addContact: false,
    selectedContact: null,
    addLead: false,
    selectedGroup: null,
    updateContacts: false,
    exportContacts: false,
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
          <div className="flex items-center gap-2">
            {canAddContact && (
              <>
                <button
                  type="button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid #f2994a', background: 'transparent', color: '#f2994a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setDrawerState((prev) => ({ ...prev, updateContacts: true }))}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f2994a'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f2994a'; }}
                >
                  <Icon name="UploadLineIcon" className="w-4 h-4" />
                  Upload
                </button>
                <button
                  type="button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid #f2994a', background: 'transparent', color: '#f2994a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setDrawerState((prev) => ({ ...prev, exportContacts: true }))}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f2994a'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f2994a'; }}
                >
                  <Icon name="DownloadLine" className="w-4 h-4" />
                  Export
                </button>
              </>
            )}
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
          </div>
        }
        filters={
          <div className="gp-contact-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 12px' }}>
                <Tabs
                  value={tabName}
                  onValueChange={handleTabChange}
                  className="flex"
                >
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
                </Tabs>

                <Button
                  onClick={() => login()}
                  variant="outline"
                  className="gp-sync-btn h-9 min-h-9 rounded-lg border-primary bg-white font-medium text-primary shadow-sm"
                >
                  Sync With Google
                </Button>

                  <div className="gp-contact-search-wrap" style={{ flex: '1 1 120px', minWidth: 120 }}>
                    <Input
                      placeholder="Search"
                      className="gp-contact-search h-9 min-h-9 w-full rounded-lg border-[rgba(225,200,165,0.9)] bg-white/70 pl-10 shadow-sm focus:shadow"
                      IconPosition="left-0 pl-3 inset-y-0"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      Icon={<SearchLine className="gp-contact-search-icon text-[#8a7a67] w-4 h-4" />}
                    />
                  </div>
                  {tabName === CONTACT_TABS_CONST.CONTACT_LIST && (
                    <>
                      <div style={{ width: 160 }}>
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
                      <div style={{ width: 140 }}>
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
            showRecordRange
          />
        ) : (
          <AllNewContactsList
            setDrawerState={setDrawerState}
            setShowDeleteConfirmation={canDeleteContact ? setShowDeleteConfirmation : () => void 0}
            payloadExtraParams={payloadExtraParams}
            tableWrapperClassName="gp-contact-table"
            splitStickyHeader
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

      <UploadContacts
        drawerState={drawerState.updateContacts}
        setDrawerState={(val: boolean) => setDrawerState((prev) => ({ ...prev, updateContacts: val }))}
      />
      <ExportContacts
        drawerState={drawerState.exportContacts}
        setDrawerState={(val: boolean) => setDrawerState((prev) => ({ ...prev, exportContacts: val }))}
      />

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
