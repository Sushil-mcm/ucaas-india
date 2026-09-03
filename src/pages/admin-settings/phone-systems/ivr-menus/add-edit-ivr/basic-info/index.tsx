import { Icon } from '@/assets/icons/icon';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetSite } from '@/hooks/common';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { generateRandomExtension } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';

const IvrBasicInfo = ({ initialData, onRestorePrevious, restoreRequested }: any) => {
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

  /* An IVR menu answers callers the moment it is saved - there is no draft step.
     If the last change was a mistake, this is the way back to what it said before.
     Restoring only loads the old settings into the form; nothing is written until
     Save is pressed, so the admin can see what they are putting back. */
  let previousVersion: any = null;
  try {
    const parsed =
      typeof initialData?.settings === 'string'
        ? JSON.parse(initialData.settings)
        : initialData?.settings;
    previousVersion = parsed?.previous_version || null;
  } catch {
    previousVersion = null;
  }

  const changedWhen = previousVersion?.changed_at
    ? new Date(previousVersion.changed_at).toLocaleString()
    : '';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 pt-1 sm:pt-2">
      {previousVersion && !restoreRequested && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold text-gray-900">This menu was changed</span>
            {changedWhen ? ` on ${changedWhen}` : ''}
            {previousVersion.changed_by ? ` by ${previousVersion.changed_by}` : ''}. Callers hear
            changes as soon as they are saved.
          </p>
          <Button type="button" variant="outline" onClick={onRestorePrevious}>
            Go back to the previous version
          </Button>
        </div>
      )}

      {restoreRequested && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold text-gray-900">Showing the previous version.</span>{' '}
            Nothing has been changed yet - look through the tabs, then press Save to put this back,
            or close without saving to leave the menu as it is.
          </p>
        </div>
      )}
      <div className="flex w-full flex-col justify-between gap-4 lg:flex-row">
        <Input
          label="IVR Name"
          required
          placeholder="Enter IVR name"
          {...register('name')}
          error={errors.name?.message}
        />

        <CustomSelect
          label={'Site'}
          required
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
            required
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
