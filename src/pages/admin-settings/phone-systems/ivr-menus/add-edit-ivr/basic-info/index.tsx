import { Icon } from '@/assets/icons/icon';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetSite } from '@/hooks/common';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { generateRandomExtension } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';

const IvrBasicInfo = ({ initialData }: any) => {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const { data: siteList = [], isLoading } = useGetSite();

  const generateNewExtension = () => {
    const newExtension = generateRandomExtension();
    setValue('extension', newExtension);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 pt-1 sm:pt-2">
      <div className="flex w-full flex-col justify-between gap-4 lg:flex-row">
        <Input
          label="IVR Name"
          placeholder="Enter IVR name"
          {...register('name')}
          error={errors.name?.message}
        />

        <CustomSelect
          label={'Site'}
          options={siteList.map((item: any) => ({ label: item?.name, value: item?.uuid }))}
          handleChange={(e: ISELECTVALUE | null) => {
            setValue('site', e || null, { shouldValidate: true, shouldDirty: true });
          }}
          value={watch('site')}
          error={(errors.site?.message as string) || undefined}
          isLoading={isLoading}
        />
      </div>

      <div className="flex w-full flex-col justify-between gap-4 lg:flex-row">
        <div className="flex w-full items-end gap-2 lg:w-[49%]">
          <Input
            label="IVR Extension"
            placeholder="Enter extension"
            type="number"
            {...register('extension')}
            min={0}
            disabled={initialData?.uuid}
            error={errors.extension?.message}
          />
          {!initialData?.uuid && (
            <Button
              className="cursor-pointer flex items-center justify-center rounded-xl w-10 h-10 bg-white border border-primary hover:bg-primary hover:text-white text-primary"
              type="button"
              onClick={generateNewExtension}
            >
              <Icon name="Refresh" className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="flex w-full lg:w-[49%]">
          <Input
            label="Description"
            placeholder="Enter description"
            {...register('description')}
            error={errors.description?.message}
            maxLength={501}
          />
        </div>
      </div>
    </div>
  );
};

export default IvrBasicInfo;
