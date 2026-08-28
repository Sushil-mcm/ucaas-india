import CustomSelect from '@/components/custom/custom-select';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon } from '@/assets/icons/icon';
import { CALL_DISTRIBUTION_DATA, DEPARTMENT_RING_STRATEGY_DESC } from '../../constant';
import SelectedMemberList from '@/pages/admin-settings/users/department/new-department/selected-member-list';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { getRingTimeOptions, seedDeviceRingTime } from '@/lib/company-ring-time';

const RingStrategy = () => {
  const { setValue, watch } = useFormContext();
  const [watchMembers = [], watchRingStrategy] = watch(['members', 'settings.ring_strategy.value']);
  const isRingAllStrategy = watchRingStrategy?.value === 'ring-all';

  /* Same company record, same cache key as the rest of the drawer, so this
     costs no extra request. A member who has never been given a ring time
     starts on the company's number; one who has keeps what was chosen. */
  const { data: companyDefaults } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    staleTime: 5 * 60 * 1000,
  });
  const companySettings = companyDefaults?.settings;

  const getRingTimeOption = (ringTime: any) => seedDeviceRingTime(ringTime, companySettings);

  const getRingStrategyLabel = () => {
    const index = CALL_DISTRIBUTION_DATA.findIndex(
      (item) => item?.value === watch('settings.ring_strategy.value')?.value,
    );
    return index !== -1 ? CALL_DISTRIBUTION_DATA?.[index]?.label : '';
  };

  const syncRingAllMemberTimes = (ringTime: any, members = watchMembers) => {
    const nextRingTime = getRingTimeOption(ringTime);

    setValue(
      'members',
      (members || []).map((member: any) => ({
        ...member,
        ring_time: nextRingTime,
      })),
      { shouldValidate: true },
    );
  };

  const handleRingTimeChange = (value: any, index: number) => {
    const nextRingTime = getRingTimeOption(value);

    if (isRingAllStrategy) {
      syncRingAllMemberTimes(nextRingTime);
      return;
    }

    setValue(`members.${index}.ring_time`, nextRingTime, { shouldValidate: true });
  };

  const renderRingTimeSelect = (member: any, index: number) => {
    const stored = member?.ring_time ?? member?.timeout;

    return (
      <CustomSelect
        className="w-56"
        /* The list carries the company's number when it is not one of the two
           shipped choices, so a queue sitting on it is a real selection rather
           than a blank box the first click would silently rewrite. */
        options={getRingTimeOptions(companySettings, stored)}
        handleChange={(value) => handleRingTimeChange(value, index)}
        value={getRingTimeOption(stored)}
        placeholder="Select time"
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex flex-col gap-4 px-1 sm:px-3 lg:flex-row lg:items-start lg:gap-5">
        <p className="text-gray-800 text-sm">
          Set how you'd like to answer calls when conditions are met.{' '}
        </p>
        <div className="w-full lg:max-w-[300px] lg:pl-1">
          <CustomSelect
            options={CALL_DISTRIBUTION_DATA}
            handleChange={(value) => {
              setValue('settings.ring_strategy.value', value);
              if (value?.value === 'ring-all') {
                const firstMemberWithRingTime = watchMembers.find(
                  (member: any) => member?.ring_time || member?.timeout,
                );
                const firstMemberRingTime =
                  firstMemberWithRingTime?.ring_time ?? firstMemberWithRingTime?.timeout;

                syncRingAllMemberTimes(firstMemberRingTime);
              }
            }}
            placeholder={'Select ring strategy'}
            className="w-full"
            value={
              watch('settings.ring_strategy.value')?.value
                ? {
                    label: watch('settings.ring_strategy.value')?.label || getRingStrategyLabel(),
                    value: watch('settings.ring_strategy.value')?.value,
                  }
                : { label: '', value: '' }
            }
          />
          <p className="text-gray-800 text-xs mt-3">
            {DEPARTMENT_RING_STRATEGY_DESC[
              watch('settings.ring_strategy.value')
                ?.value as keyof typeof DEPARTMENT_RING_STRATEGY_DESC
            ] || ''}
          </p>
        </div>
      </div>

      <div className="w-full">
        <p className="font-semibold text-gray-900 truncate text-md mb-2">Call Queue Members</p>
        {watch('settings.ring_strategy.value')?.value === 'top-down' ? (
          <>
            <div className="w-full lg:w-2/3">
              <div className="flex flex-col gap-2 overflow-auto border border-gray-200 rounded-xl">
                <Table className="w-full text-sm text-gray-700 h-full ">
                  <TableHeader className="bg-gray-100/40 text-gray-90/80">
                    <TableRow>
                      <TableHead className="px-4 py-2 font-medium text-left "></TableHead>

                      <TableHead className="px-4 py-2 font-medium text-left ">Name</TableHead>
                      <TableHead className="px-4 py-2 font-medium text-left ">Ring For</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="bg-white w-full font-normal">
                    <SelectedMemberList
                      {...{
                        members: watchMembers,
                        setValue,
                        renderRight: renderRingTimeSelect,
                      }}
                    />
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full lg:w-2/3">
            <div className="flex flex-col gap-2 overflow-auto border border-gray-200 rounded-xl">
              <Table className="w-full text-sm text-gray-700 h-full ">
                <TableHeader className="bg-gray-100/40 text-gray-90/80">
                  <TableRow>
                    <TableHead className="px-4 py-2 font-medium text-left text-text-gray-90/80">
                      Name
                    </TableHead>
                    <TableHead className="px-4 py-2 font-medium text-left text-text-gray-90/80">
                      Ring For
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-200 bg-white w-full font-normal">
                  {watchMembers.map((data: any, index: any) => {
                    const fullName = data?.last_name
                      ? `${data?.first_name} ${data?.last_name}`
                      : data?.label;

                    return (
                      <TableRow key={`${data?.user_uuid}-${index}`} className="h-8">
                        <TableCell className="px-4 py-2 border-b">
                          <div className="flex items-center gap-3">
                            <CustomAvatar
                              name={fullName}
                              showPresence
                              extension={data?.value}
                              image={data?.profile}
                            />
                            <div className="flex flex-col w-full">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="capitalize font-medium text-sm">{fullName}</p>
                                  <p className="text-primary text-[11px]">{data?.role}</p>
                                </div>
                                <div className="flex items-center gap-1 text-gray-500 text-sm">
                                  <Icon name="Grid" className="w-4 h-4" />
                                  <span>{data?.value}</span>
                                </div>
                              </div>
                              {data?.email && (
                                <p className="text-gray-500 text-[11px] truncate">{data?.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b align-middle">
                          {renderRingTimeSelect(data, index)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RingStrategy;
