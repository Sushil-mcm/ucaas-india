import {
  createLeadGroup,
  getGroupContactLeadList,
  getGroupContactsById,
  updateLeadGroup,
} from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { requiredString } from '@/lib/schema';
import { LEAD_CREATE_TYPE } from '../const';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SearchLine } from '@/assets/icons';
import { Tabs } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import CreateContactNew from '../../new-contact/create-new-contact';

/* -------------------- VALIDATION -------------------- */

const schema = yup.object().shape({
  name: yup.string().when('$selectedCreateType', (val: any, schema) => {
    return val?.[0] === LEAD_CREATE_TYPE.ADD_NEW ? requiredString('Name') : schema.nullable();
  }),
});

type LeadGroupMutationData = {
  groupName: string;
  groupId?: string;
  contactIds: string[];
  leadIds: string[];
  idsToBeRemoved?: string[];
  type: 'CONTACT' | 'LEAD';
};

/* -------------------- MAIN COMPONENT -------------------- */

function CreateNewLeadGroup({
  modalState,
  setModalState,
  group,
  selectedCreateType = LEAD_CREATE_TYPE.ADD_NEW,
  selectedLeads = [],
}: any) {
  console.log(group, 'contactIdscontactIds');

  const queryClient = useQueryClient();

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>(selectedLeads);
  const [activeTab, setActiveTab] = useState('contact');

  /* -------- QUERY FOR PREFILLING -------- */
  const { data: groupContactsResponse } = useQuery({
    queryKey: ['getGroupContactLeadList', group?._id],
    queryFn: () =>
      getGroupContactLeadList({
        groupId: group?._id,
        page: 1,
        limit: 100,
      }),
    enabled: !!group?._id,
  });

  /* -------- MERGE IDS -------- */
  const mergedSelectedIds = useMemo(
    () => Array.from(new Set([...selectedContactIds, ...selectedLeadIds])),
    [selectedContactIds, selectedLeadIds],
  );

  /* -------- FORM -------- */
  const {
    watch,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '' },
    resolver: yupResolver(schema),
    context: { selectedCreateType },
    mode: 'onChange',
  });

  /* -------- MUTATIONS -------- */

  const { mutate: mutateAddGroup, isPending } = useMutation({
    mutationFn: async (data: LeadGroupMutationData) => {
      if (group?._id) {
        return updateLeadGroup({ ...data, groupId: group._id });
      }

      return createLeadGroup(data);
    },
    onSuccess: (data) => {
      if (data?.data?.success) {
        console.log(data?.data?.data, 'data?.data?.data?.message', data?.data?.data?.message);

        handleAlert({
          text: data?.data?.data?.message || '',
          type: 'success',
        });

        queryClient.invalidateQueries({ queryKey: ['getGroupList'] });
        setModalState(false);

        // if (mergedSelectedIds.length > 0) {
        //   handleAddInExistingGroup(newGroupId);
        // } else {

        // }
      }
    },
  });

  /* -------- HANDLERS -------- */

  // ✅ SAFE STATE UPDATE (no infinite loop)
  const handleSelect = useCallback((id: string, checked: boolean, isLead: boolean) => {
    const setter = isLead ? setSelectedLeadIds : setSelectedContactIds;

    setter((prev) => {
      if (checked && prev.includes(id)) return prev;
      if (!checked && !prev.includes(id)) return prev;

      return checked ? [...prev, id] : prev.filter((item) => item !== id);
    });
  }, []);

  const onSubmit = () => {
    const idsToBeRemoved: string[] = [];
    if (group?._id) {
      const originalContactIds = group.contactIds || [];
      const originalLeadIds = group.leadIds || [];

      originalContactIds.forEach((id: string) => {
        if (!selectedContactIds.includes(id)) {
          idsToBeRemoved.push(id);
        }
      });

      originalLeadIds.forEach((id: string) => {
        if (!selectedLeadIds.includes(id)) {
          idsToBeRemoved.push(id);
        }
      });
    }

    mutateAddGroup({
      groupName: watch('name'),
      ...(group?._id && { groupId: group._id }),
      contactIds: selectedContactIds,
      leadIds: selectedLeadIds,
      ...(group?._id && { idsToBeRemoved }),
      type: window?.location?.pathname === '/campaign/leads' ? 'LEAD' : 'CONTACT',
    });
  };

  /* -------- EFFECT -------- */

  useEffect(() => {
    if (group) {
      reset({ name: group.groupName });
    }
  }, [group, reset]);

  useEffect(() => {
    if (group) {
      const contactIds: string[] = [];
      const leadIds: string[] = [];

      const result = groupContactsResponse?.data?.data?.result;
      if (result) {
        const responseContactIds = result.contactIds || [];
        const responseLeadIds = result.leadIds || [];

        responseContactIds.forEach((item: any) => {
          contactIds.push(typeof item === 'string' ? item : item?._id || item);
        });
        responseLeadIds.forEach((item: any) => {
          leadIds.push(typeof item === 'string' ? item : item?._id || item);
        });
      } else {
        group?.leadIds?.forEach((item: any) => {
          leadIds.push(typeof item === 'string' ? item : item?._id || item);
        });
        group?.contactIds?.forEach((item: any) => {
          contactIds.push(typeof item === 'string' ? item : item?._id || item);
        });
      }

      setSelectedContactIds(contactIds);
      setSelectedLeadIds(leadIds);
    }
  }, [group, groupContactsResponse]);

  /* -------------------- UI -------------------- */

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent className="sm:w-1/2 md:w-1/3 w-full p-4 max-h-[99%] ">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {/* HEADER */}
          <div className="flex justify-between font-semibold">
            {group?._id ? 'Update Group' : 'Add Group'}
            {/* <div onClick={() => setModalState(false)} className="cursor-pointer">
              <CloseIcon className="w-3 h-3" />
            </div> */}
          </div>

          {/* INPUT */}
          <Input
            placeholder="Enter group name"
            {...register('name')}
            label="Group Name"
            error={errors?.name?.message}
          />

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="">
            {/* <TabsList className="flex h-12 w-full justify-start bg-transparent p-0 text-sm font-semibold text-center rounded-none border-b border-gray-200">
              <TabsTrigger
                value="contact"
                className="relative flex h-full min-w-[100px] cursor-pointer gap-1 rounded-none border-b-2 border-transparent bg-transparent px-4 font-semibold text-gray-700 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                Contact {selectedContactIds.length > 0 && `(${selectedContactIds.length})`}
              </TabsTrigger>
              <TabsTrigger
                value="leads"
                className="relative flex h-full min-w-[100px] cursor-pointer gap-1 rounded-none border-b-2 border-transparent bg-transparent px-4 font-semibold text-gray-700 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                Leads {selectedLeadIds.length > 0 && `(${selectedLeadIds.length})`}
              </TabsTrigger>
            </TabsList> */}

            {window?.location?.pathname === '/campaign/leads' ? (
              <ContactSelectionList
                isLeadList={true}
                selectedIds={selectedLeadIds}
                onSelect={(id: any, checked: any) => handleSelect(id, checked, true)}
              />
            ) : (
              <ContactSelectionList
                isLeadList={false}
                selectedIds={selectedContactIds}
                onSelect={(id: any, checked: any) => handleSelect(id, checked, false)}
              />
            )}
          </Tabs>

          {/* ACTIONS */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="text-sm font-medium text-gray-500">
              {mergedSelectedIds.length} {mergedSelectedIds.length === 1 ? 'item' : 'items'}{' '}
              selected
            </div>
            <div className="flex gap-2">
              <Button variant="transparent" type="button" onClick={() => setModalState(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- LIST COMPONENT -------------------- */

const ContactSelectionList = React.memo(({ isLeadList, selectedIds, onSelect }: any) => {
  console.log(selectedIds);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateContact, setShowCreateContact] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['getGroupContactsByIdQuery', isLeadList],
    queryFn: () =>
      getGroupContactsById({
        page: 1,
        limit: 200,
        isLeadList,
      }),
  });

  const contacts = data?.data?.data?.result?.rows || [];

  const filteredContacts = useMemo(() => {
    return contacts.filter((c: any) => {
      const name = `${c?.name?.first || ''} ${c?.name?.last || ''}`.toLowerCase();
      const phone = (c?.contact?.phone || '').toLowerCase();

      return name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm.toLowerCase());
    });
  }, [contacts, searchTerm]);
  console.log(filteredContacts, 'filteredContactsfilteredContacts');

  const isContactsEmpty = contacts.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {!isContactsEmpty && (
        <Input
          placeholder="Search contacts..."
          className="min-h-10 w-full rounded-lg pl-10"
          IconPosition="left-0 pl-2 inset-y-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          Icon={<SearchLine className="text-gray-700" />}
        />
      )}

      {!isContactsEmpty && filteredContacts.length > 0 && (
        <div className="flex items-center gap-3 p-2 border-b border-gray-100">
          <Checkbox
            checked={
              filteredContacts.every((c: any) => selectedIds.includes(c._id))
                ? true
                : filteredContacts.some((c: any) => selectedIds.includes(c._id))
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(checked) => {
              if (checked) {
                filteredContacts.forEach((c: any) => {
                  if (!selectedIds.includes(c._id)) {
                    onSelect(c._id, true);
                  }
                });
              } else {
                filteredContacts.forEach((c: any) => {
                  if (selectedIds.includes(c._id)) {
                    onSelect(c._id, false);
                  }
                });
              }
            }}
          />
          <span className="text-sm font-semibold text-gray-700">Select All</span>
        </div>
      )}

      <div className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : isContactsEmpty ? (
          <div className="flex flex-col items-center justify-center p-6 gap-4">
            <p className="text-sm text-gray-500 font-medium">
              {isLeadList ? 'No lead available' : 'No contact available'}
            </p>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowCreateContact(true);
              }}
            >
              {isLeadList ? 'Add Lead' : 'Add Contact'}
            </Button>
          </div>
        ) : (
          filteredContacts.map((contact: any) => {
            const isSelected = selectedIds.includes(contact._id);

            return (
              <div key={contact._id} className="flex items-center gap-3 p-2 cursor-pointer">
                {/* ✅ ONLY checkbox triggers update */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelect(contact._id, !!checked)}
                />

                <CustomAvatar
                  size="36"
                  name={`${contact?.name?.first} ${contact?.name?.last}`}
                  image={contact?.profile?.contactPic}
                />

                <div className="flex items-start flex-col">
                  <div>
                    {contact?.name?.first} {contact?.name?.last}
                  </div>
                  <div className="text-xs text-gray-500">
                    {contact?.contact?.number || contact?.contact?.phone || ''}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCreateContact && (
        <Dialog open={showCreateContact} onOpenChange={setShowCreateContact}>
          <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-6">
            <div className="flex justify-between font-semibold text-lg border-b pb-2">
              {isLeadList ? 'Add Lead' : 'Add Contact'}
            </div>
            <div className="flex-1 overflow-auto pr-2 mt-2" onSubmit={(e) => e.stopPropagation()}>
              <CreateContactNew
                isDisable={false}
                setIsDisable={() => void 0}
                setDrawerState={() => void 0}
                keepFormDataAfterSave={true}
                isLead={isLeadList}
                handleClose={() => setShowCreateContact(false)}
                setTabData={(data: any) => {
                  queryClient.invalidateQueries({
                    queryKey: ['getGroupContactsByIdQuery', isLeadList],
                  });
                  // Also auto-select the newly created contact/lead
                  if (data?._id) {
                    onSelect(data._id, true);
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

export default CreateNewLeadGroup;
