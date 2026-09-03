import CustomSelect from '@/components/custom/custom-select';
import { Input } from '@/components/ui/input';
import { FC, useMemo } from 'react';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { useFormContext } from 'react-hook-form';
import { getBelongsToIcons } from '@/pages/integration/constant';
import { useOrganization } from '@/hooks/use-organisation';
const LeadGroupOptionView = ({ option, context }: any) => {
  const isMenu = context === 'menu';
  if (!isMenu) {
    return <span className="truncate">{option?.label}</span>;
  }
  return (
    <div className="flex w-full items-center justify-between pr-1 text-[13px]">
      <span className="truncate">{option?.label}</span>
      <span className="text-xs text-gray-500 font-normal whitespace-nowrap pl-4">
        {option?.leadCount ?? 0} leads
      </span>
    </div>
  );
};

const BasicInformation: FC<any> = ({
  dataSiteList,
  groupList,
  inventoryNumberList,
  campaignStatus,
}) => {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();
  const selectedGroupIds = watch('groupId');
  const { mainSiteInfo } = useOrganization();
  const belongsToIcons = getBelongsToIcons(mainSiteInfo);
  const leadGroupOptions = useMemo(() => {
    if (!groupList?.length) return [];

    return groupList
      ?.filter((item: any) => String(item?.generatedBy || '').toUpperCase() !== 'SYSTEM')
      ?.map((item: any) => {
        const groupName = item?.groupName || item?.name || '';
        // const iconUrl = belongsToIcons[groupName.toUpperCase()] || belongsToIcons['DEFAULT'] || '';
        return {
          label: groupName,
          value: item?._id,
          leadCount: item?.leadCount ?? 0,
          // iconUrl,
          // // icon: iconUrl ? (
          // //   <img
          // //     src={iconUrl}
          // //     alt={groupName || 'Group'}
          // //     className="w-4 h-4 rounded-full object-contain"
          // //   />
          // // ) : null,
        };
      });
  }, [groupList, belongsToIcons]);

  const selectedLeadGroups = useMemo(() => {
    if (!Array.isArray(selectedGroupIds)) return selectedGroupIds;

    return selectedGroupIds?.map((selectedGroup: any) => {
      const matchedOption = leadGroupOptions?.find(
        (option: any) => String(option?.value || '') === String(selectedGroup?.value || ''),
      );
      if (matchedOption) return matchedOption;

      const groupName = selectedGroup?.label || '';
      const iconUrl = belongsToIcons[groupName.toUpperCase()] || belongsToIcons['DEFAULT'] || '';
      return {
        ...selectedGroup,
        iconUrl,
        icon: iconUrl ? (
          <img
            src={iconUrl}
            alt={groupName || 'Group'}
            className="w-4 h-4 rounded-full object-contain"
          />
        ) : null,
      };
    });
  }, [selectedGroupIds, leadGroupOptions, belongsToIcons]);

  return (
    <div className="flex lg:h-[calc(100vh_-_22.5rem)] flex-col gap-6 overflow-auto pr-1">
      <div className="flex w-full flex-col gap-6 md:flex-row">
        <div className="flex flex-col gap-1.5 w-full">
          <Input
            label="Name"
            required
            placeholder="Enter campaign name"
            {...register('name')}
            error={(errors as any)?.name?.message}
            maxLength={50}
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full">
          <CustomSelect
            label={'Site'}
            required
            placeholder="Select Option"
            isDisabled={campaignStatus !== '' && campaignStatus !== 'NEW'}
            options={dataSiteList?.map((site: { name: string; uuid: string }) => ({
              label: site?.name,
              value: site?.uuid,
            }))}
            handleChange={(e: ISELECTVALUE | null) => {
              setValue(`siteId`, e || { label: '', value: '' }, { shouldValidate: true });
            }}
            value={watch('siteId')}
            error={(errors as any)?.siteId?.value?.message}
            menuPlacement="auto"
          />
        </div>
      </div>
      <div className="flex w-full flex-col gap-6 md:flex-row">
        <div className="flex flex-col gap-1.5 w-full">
          <CustomSelect
            placeholder="Select Option"
            label={'Select Caller IDs'}
            isDisabled={campaignStatus !== '' && campaignStatus !== 'NEW'}
            options={
              inventoryNumberList?.length > 0
                ? inventoryNumberList
                    .filter((item: { User: any }) => !item?.User)
                    .map((item: { did_number: string; uuid: string }) => ({
                      label: item?.did_number?.startsWith('+')
                        ? item?.did_number
                        : `+${item?.did_number}`,
                      value: item?.did_number,
                    }))
                : []
            }
            handleChange={(e: ISELECTVALUE | null) => {
              setValue('callerId', e, { shouldValidate: true });
            }}
            inputClass="team_chat"
            value={watch('callerId')}
            isMulti={true}
            error={(errors as any)?.callerId?.message}
            menuPlacement="auto"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full">
          <CustomSelect
            placeholder="Select Option"
            label={'Leads'}
            isDisabled={campaignStatus !== '' && campaignStatus !== 'NEW'}
            options={leadGroupOptions}
            handleChange={(e: ISELECTVALUE | null) => {
              setValue('groupId', e, { shouldValidate: true });
            }}
            value={selectedLeadGroups}
            isMulti={true}
            inputClass="team_chat"
            error={(errors as any)?.groupId?.message}
            menuPlacement="auto"
            FormatOptionLabel={LeadGroupOptionView}
          />
        </div>
      </div>
      <div className="flex w-full flex-col gap-6 md:flex-row">
        <div className="flex flex-col gap-1.5 w-full">
          <Input
            label="Description"
            placeholder="Enter campaign description"
            {...register('description')}
            error={(errors as any)?.description?.message}
            maxLength={501}
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full"></div>
      </div>
    </div>
  );
};

export default BasicInformation;
