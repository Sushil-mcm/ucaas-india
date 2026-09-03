import CustomSelect from '@/components/custom/custom-select';
import { Input } from '@/components/ui/input';
import { useGetSite } from '@/hooks/common';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { INITIAL_TYPE_CONSTANT } from '../constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { getCallHandlingList } from '@/services/api';

interface DidInfoProps {
  initialData: any;
  selectedTemplate: any;
  setSelectedTemplate: (state: any) => void;
  initialType: string | null;
}

const DIDInfo: FC<DidInfoProps> = ({
  initialData = {},
  selectedTemplate,
  setSelectedTemplate,
  initialType,
}) => {
  const { data: dataSiteList = [] } = useGetSite();
  const { data: templateList } = useQuery({
    queryKey: ['getCallHandlingListQuery'],
    queryFn: getCallHandlingList,
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const {
    setValue,
    watch,
    formState: { errors },
    register,
  } = useFormContext();
  const [isSelectTemplate, setIsSelectTemplate] = useState(false);
  const handleTemplateChange = (e: ISELECTVALUE | null) => {
    const tempIndex = templateList.findIndex((item: { uuid: string }) => item.uuid === e?.value);
    if (tempIndex != -1) setSelectedTemplate(templateList[tempIndex]);
  };

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh_-_15rem)] overflow-auto template-forwarding-did-info">
      <div className="flex flex-col gap-4 mt-2">
        <div className="w-full flex items-center gap-3">
          <div className="flex gap-4 w-full template-forwarding-did-info-fields">
            <div className="flex w-full gap-1 relative">
              <Input
                label="Name"
                required
                placeholder="Enter name"
                {...register('did_info.did_name')}
                error={(errors?.did_info as any)?.did_name?.message}
              />
            </div>
            <div className="flex w-full gap-1 relative">
              <CustomSelect
                label={'Site'}
                required
                options={dataSiteList.map((site: { name: string; uuid: string }) => ({
                  label: site?.name,
                  value: site?.uuid,
                }))}
                handleChange={(e: ISELECTVALUE | null) => {
                  setValue(`did_info.site`, e || { label: '', value: '' }, {
                    shouldValidate: true,
                  });
                }}
                value={watch('did_info.site')}
                error={(errors?.did_info as any)?.site?.value?.message}
              />
            </div>
          </div>
        </div>
        <div className="w-full flex items-center gap-3">
          <div className="flex gap-4 w-full template-forwarding-did-info-fields">
            <div className="flex w-full gap-1 relative">
              <Input
                label="Location"
                placeholder="Enter location"
                value={initialData?.did_country}
                disabled
                error={(errors?.did_info as any)?.did_country?.message}
              />
            </div>

            <div className="flex  w-full gap-1 relative">
              <Input
                label="Number type"
                placeholder="Enter number type"
                value={initialData?.did_type === 'L' ? 'Local' : 'Toll Free'}
                disabled
              />
            </div>
          </div>
        </div>
        {initialData?.did_type === 'L' && (
          <div className="w-full flex items-center gap-3">
            <div className="flex gap-4 w-full template-forwarding-did-info-fields">
              <div className="flex w-full gap-1 relative">
                <Input
                  label="State/Province"
                  placeholder="Enter state"
                  value={initialData?.did_state || ''}
                  disabled
                />
              </div>
              <div className="flex w-full gap-1 relative">
                <Input
                  label="Area Code"
                  placeholder="Enter state"
                  value={initialData?.did_city || ''}
                  disabled
                />
              </div>
            </div>
          </div>
        )}

        {initialType === INITIAL_TYPE_CONSTANT.SELECT_TEMPLATE && (
          <div className="flex gap-5 px-3 min-h-10  items-center template-forwarding-did-info-template-row">
            <div className="flex gap-2">
              <Checkbox
                className="cursor-pointer"
                onCheckedChange={(checked: boolean) => {
                  setIsSelectTemplate(checked);
                  setSelectedTemplate(null);
                }}
                checked={isSelectTemplate}
              />
              <Label>Choose Template</Label>
            </div>
            <div className="w-1/3 template-forwarding-did-info-template-select">
              {isSelectTemplate && (
                <CustomSelect
                  options={templateList?.map((item: any) => ({
                    label: item?.name,
                    value: item?.uuid,
                    forwardActions: JSON.parse(item?.forward_call_actions || '{}'),
                  }))}
                  handleChange={(e: ISELECTVALUE | null) => {
                    handleTemplateChange(e);
                  }}
                  value={{
                    label: selectedTemplate?.name,
                    value: selectedTemplate?.uuid,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DIDInfo;
