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

        // Check if member already exists to avoid duplicates
        const memberExists = members.some(
          (member: IMEMBER) => member.user_uuid === newValue.user_uuid,
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
  const roleName = memberData?.role_data?.name || memberData?.role;
  const isEnabled =
    Array.isArray(members) &&
    members.some((item: any) => item?.value === memberData?.extension) &&
    ['MANAGER', 'ADMIN', 'SUB-ADMIN'].includes(roleName);

  console.log(members, 'isEnabled', isEnabled, 'memberData', memberData);
  const handleManagerChange = useCallback(() => {
    if (memberData.role === 'AGENT') return;
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
