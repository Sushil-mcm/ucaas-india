import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import TableManager from '@/components/custom/table-manager';
import { SettingCard } from '@/components/mcm/setting-card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { forwardActionType } from '@/services/api';
import { ColumnDef } from '@tanstack/react-table';
import { FC, useState, useMemo, memo, useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import useDebounce from '@/hooks/use-debounce';
import { SearchLine } from '@/assets/icons';

interface IMEMBER {
  first_name: string;
  last_name: string;
  label: string;
  extension: string;
  value: string;
  email: string;
  role: string;
  uuid: string;
  user_uuid: string;
  custom_role_data: { name: string };
  role_data: { name: string };
  skills: any;
  profile?: string;
}

/* One reading of a person's role.
 *
 * There were three. The name cell showed `custom_role_data ?? role_data ?? role`,
 * the manager radio decided whether to enable itself from `role_data ?? role`,
 * and the click handler checked the raw `role` on its own. So somebody whose
 * role comes from a custom role — which is what the list actually displays —
 * could be shown as MANAGER and still never be selectable as one: the radio read
 * a different field and stayed disabled forever.
 *
 * The list and the rule now read the same field, so what an admin sees is what
 * the form acts on. */
const roleOf = (member: IMEMBER): string =>
  member?.custom_role_data?.name || member?.role_data?.name || member?.role || '';

/* Who may be the manager of a queue. Agents answer calls; they do not own the
   queue. */
const MANAGER_ROLES = ['MANAGER', 'ADMIN', 'SUB-ADMIN', 'SUPER-ADMIN'];
const canManage = (member: IMEMBER): boolean =>
  MANAGER_ROLES.includes(roleOf(member).toUpperCase());

/* How well somebody handles this queue's work, 0 to 100.
 *
 * Per queue, not per person: somebody can be the strongest on billing and the
 * weakest on support, and one number per person could not say that.
 *
 * Everybody starts at 100, so a queue that rates nobody behaves exactly as it
 * does today. That default is deliberate - starting at 0 would mean rating one
 * person silently sidelined everybody else, and the first admin to try the
 * feature would break their own queue.
 *
 * Only editable for somebody already in the queue. Rating a person you have not
 * added is a setting with nowhere to live. */
const MemberRatingCell = ({ memberData }: { memberData: IMEMBER }) => {
  const { control, setValue } = useFormContext();
  const members = useWatch({ control, name: 'members', defaultValue: [] });
  const index = Array.isArray(members)
    ? members.findIndex((m: any) => m?.value === memberData?.extension)
    : -1;

  if (index < 0) {
    return <span className="text-xs text-gray-400">&mdash;</span>;
  }

  const rating = members[index]?.rating ?? 100;

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        max={100}
        value={rating}
        className="h-9 w-20"
        onChange={(event) => {
          const raw = event.target.value;
          /* Clamped rather than refused: an admin typing 150 means "as high as
             it goes", and an error message for that would be pedantic. */
          const next = raw === '' ? 100 : Math.min(100, Math.max(0, Number(raw) || 0));
          const copy = [...members];
          copy[index] = { ...copy[index], rating: next };
          setValue('members', copy, { shouldValidate: false });
        }}
      />
    </div>
  );
};

// Checkbox cell component with internal form subscription and logic
const MemberCheckboxCell = ({ memberData }: { memberData: IMEMBER }) => {
  const { control, setValue, clearErrors } = useFormContext();
  const members = useWatch({ control, name: 'members', defaultValue: [] });
  const manager = useWatch({ control, name: 'manager', defaultValue: { value: '' } });
  const isChecked =
    Array.isArray(members) && members.some((item: any) => item?.value === memberData?.extension);

  const handleCheckChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        const newValue = {
          label: memberData?.last_name
            ? `${memberData?.first_name} ${memberData?.last_name}`
            : memberData?.label,
          value: memberData?.extension ? memberData?.extension : memberData?.value,
          email: memberData?.email,
          extension: memberData?.extension,
          skills: memberData?.skills,
          name: memberData?.last_name
            ? `${memberData?.first_name} ${memberData?.last_name}`
            : memberData?.label,
          role:
            memberData?.custom_role_data?.name || memberData?.role_data?.name || memberData?.role,
          user_uuid: memberData?.uuid,
        };

        /* Matched on the extension, which is the field every other check in
           this file already uses and the one that is always present. Matching
           on the id alone meant that if a row ever arrived without one, the
           first member added would have `user_uuid: undefined`, every later one
           would compare undefined to undefined, and the tick would be silently
           swallowed — one member addable, and no error to explain it. */
        const memberExists = members.some(
          (member: IMEMBER) =>
            member.value === newValue.value ||
            (!!newValue.user_uuid && member.user_uuid === newValue.user_uuid),
        );

        if (!memberExists) {
          setValue('members', [...members, newValue], { shouldValidate: true });
          clearErrors('members');
        }
      } else {
        const filteredMembers = members.filter((el: IMEMBER) => el.value !== memberData.extension);
        setValue('members', filteredMembers, { shouldValidate: true });
        if (memberData.extension === manager?.value) {
          setValue('manager', { value: '' });
          clearErrors('manager');
        }
      }
    },
    [memberData, members, manager, setValue, clearErrors],
  );

  return (
    <div className="flex justify-center text-primary hover:text-primary/80 underline underline-offset-4 text-center">
      <Checkbox checked={isChecked} onCheckedChange={handleCheckChange} />
    </div>
  );
};

MemberCheckboxCell.displayName = 'MemberCheckboxCell';

// Manager radio cell component with internal form subscription and logic
const ManagerRadioCell = ({ memberData }: { memberData: IMEMBER }) => {
  const { control, setValue, clearErrors } = useFormContext();
  const members = useWatch({ control, name: 'members', defaultValue: [] });

  const manager = useWatch({ control, name: 'manager', defaultValue: { value: '' } });
  const isTicked =
    Array.isArray(members) && members.some((item: any) => item?.value === memberData?.extension);
  const isEnabled = isTicked && canManage(memberData);
  const handleManagerChange = useCallback(() => {
    if (!canManage(memberData)) return;
    const managerVal = {
      value: memberData?.extension ? memberData?.extension : memberData?.value,
      extension: memberData?.extension,
      skills: memberData?.skills,
      label: memberData?.last_name
        ? `${memberData?.first_name} ${memberData?.last_name}`
        : `${memberData?.label}`,
      name: memberData?.last_name
        ? `${memberData?.first_name} ${memberData?.last_name}`
        : memberData?.label,
      email: memberData?.email,
      role: memberData?.custom_role_data?.name || memberData?.role_data?.name || memberData?.role,
      user_uuid: memberData?.uuid,
    };
    setValue('manager', managerVal);
    clearErrors('manager');
  }, [memberData, setValue, clearErrors]);

  return (
    <div className="flex ">
      <RadioGroup value={manager?.value} onValueChange={handleManagerChange}>
        <div className="flex w-full">
          <RadioGroupItem disabled={!isEnabled} value={memberData?.extension} id="yes" />
        </div>
      </RadioGroup>
    </div>
  );
};

ManagerRadioCell.displayName = 'ManagerRadioCell';

// Memoized name cell component
const MemberNameCell = memo(({ data }: { data: IMEMBER }) => {
  const fullName = `${data?.first_name}${data?.last_name ? ` ${data?.last_name}` : ''}`;
  return (
    <div className="flex items-center gap-2  w-2xs">
      <div className="flex ">
        <CustomAvatar
          name={fullName}
          showPresence
          extension={data?.extension}
          image={data?.profile}
        />
      </div>
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between  gap-2">
          <div className="flex flex-col items-start ">
            <p className="capitalize">{fullName}</p>
            <small className="text-primary text-[10px]">
              {data?.custom_role_data?.name || data?.role_data?.name || data?.role}
            </small>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Icon name="Grid" className="w-4 h-4 " />
            <div>{data?.extension}</div>
          </div>
        </div>
        <p className="text-gray-500 flex justify-between">
          <div>{data?.email}</div>
        </p>
      </div>
    </div>
  );
});

MemberNameCell.displayName = 'MemberNameCell';

const SelectAllHeader = ({ currentMembers }: { currentMembers: IMEMBER[] }) => {
  const { control, setValue, clearErrors, getValues } = useFormContext();
  const members = useWatch({ control, name: 'members', defaultValue: [] });

  const isAllChecked = useMemo(() => {
    if (!currentMembers || currentMembers.length === 0) return false;
    return currentMembers.every((member) => members.some((m: any) => m.value === member.extension));
  }, [currentMembers, members]);

  const isIndeterminate = useMemo(() => {
    if (!currentMembers || currentMembers.length === 0) return false;
    const checkedCount = currentMembers.filter((member) =>
      members.some((m: any) => m.value === member.extension),
    ).length;
    return checkedCount > 0 && checkedCount < currentMembers.length;
  }, [currentMembers, members]);

  const handleSelectAllChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        const newMembers = [...members];
        currentMembers.forEach((member) => {
          const extension = member.extension || member.value || '';
          if (!newMembers.some((m: any) => m.value === extension)) {
            newMembers.push({
              label: member?.last_name
                ? `${member?.first_name} ${member?.last_name}`
                : member?.label,
              value: extension,
              email: member?.email,
              extension: member?.extension,
              skills: member?.skills,
              name: member?.last_name
                ? `${member?.first_name} ${member?.last_name}`
                : member?.label,
              role: member?.custom_role_data?.name || member?.role_data?.name || member?.role,
              user_uuid: member?.uuid,
            });
          }
        });
        setValue('members', newMembers, { shouldValidate: true });
        clearErrors('members');
      } else {
        const currentExtensions = currentMembers.map((m) => m.extension);
        const filteredMembers = members.filter((m: any) => !currentExtensions.includes(m.value));
        setValue('members', filteredMembers, { shouldValidate: true });

        const manager = getValues('manager');
        if (manager && currentExtensions.includes(manager.value)) {
          setValue('manager', { value: '' });
          clearErrors('manager');
        }
      }
    },
    [currentMembers, members, setValue, clearErrors, getValues],
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold text-gray-500"></span>
      <div className="flex justify-center text-primary">
        <Checkbox
          checked={isAllChecked ? true : isIndeterminate ? 'indeterminate' : false}
          onCheckedChange={handleSelectAllChange}
        />
      </div>
    </div>
  );
};

const AddMembers: FC = () => {
  const {
    watch,
    formState: { errors },
  } = useFormContext();

  const selectedSite = watch('site_uuid')?.value;
  const [searchKey, setSearchKey] = useState('');
  const debouncedSearchKey = useDebounce(searchKey, 500);
  const [currentMembers, setCurrentMembers] = useState<IMEMBER[]>([]);

  const handleSuccess = useCallback((tbldata: any) => {
    const rows = tbldata?.data?.data?.result?.rows || [];
    setCurrentMembers(rows);
  }, []);

  const columns: ColumnDef<IMEMBER>[] = useMemo(
    () => [
      {
        header: () => <SelectAllHeader currentMembers={currentMembers} />,
        id: 'action',
        accessorKey: 'company_uuid',
        cell: ({ row }) => <MemberCheckboxCell memberData={row?.original} />,
      },
      {
        header: 'Manager',
        accessorKey: 'status',
        cell: ({ row }) => <ManagerRadioCell memberData={row?.original} />,
      },
      {
        header: 'Name',
        accessorKey: 'first_name',
        cell: ({ row }: any) => <MemberNameCell data={row?.original} />,
      },
      {
        header: 'Rating',
        id: 'rating',
        accessorKey: 'rating',
        cell: ({ row }: any) => <MemberRatingCell memberData={row?.original} />,
      },
    ],
    [currentMembers],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
      <SettingCard
        title="Who this queue rings"
        description="Tick the people who should take these calls, and mark one as the manager. Only people at the location chosen on Basic info are listed."
        aside={
          <div className="relative w-full min-w-[15rem] max-w-sm">
            <Input
              type="text"
              placeholder="Search by name, email or extension"
              IconPosition="left-0 pl-2 inset-y-0"
              value={searchKey}
              Icon={<SearchLine className="text-gray-700" />}
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith(' ')) return;
                setSearchKey(e.target.value);
              }}
              className="w-full pl-10"
            />
          </div>
        }
      >
        {/* Errors sit inside the card rather than floating above the tab, so it is
            obvious which thing is complaining. */}
        {(errors?.members || errors?.manager) && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            {errors?.members ? (
              <p className="text-xs text-red-700">{(errors?.members as any)?.message}</p>
            ) : null}
            {errors?.manager ? (
              <p className="text-xs text-red-700">{(errors?.manager as any)?.value?.message}</p>
            ) : null}
          </div>
        )}

        <div className="py-3">
          <TableManager
            {...{
              emptyTablePlaceholder: 'Nobody at this location',
              descriptionEmptyTable:
                'Only people at the location chosen on Basic info are listed. Change the location, or add people first.',
              columns,
              fetcherKey: 'forwardActionType',
              fetcherFn: forwardActionType,
              onSuccess: handleSuccess,
              extraParams: {
                site_uuid: selectedSite,
                type: 'EXTENSION',
                search: debouncedSearchKey,
              },
              customClass: 'min-h-[18rem]',
            }}
          />
        </div>
      </SettingCard>
    </div>
  );
};

export default AddMembers;
