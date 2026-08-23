import { CloseIcon, Grid } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/hooks/use-user';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { ModalProps } from '@/interfaces/common-interface';
import { capitalizeFirstLetter } from '@/lib/utils';
import { forwardActionType } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

interface IMEMBER {
  first_name: string;
  last_name: string;
  uuid: string;
  extension: string;
}

export const ExtensionListViewForVoiceMail = ({ option }: any) => {
  const label = option?.label || '';
  const hasSlash = label.includes(' / ');
  const name = hasSlash ? label.split(' / ')[0] : label;
  const extension = hasSlash ? label.split(' / ')[1] : '';

  return (
    <div className="flex w-full items-center justify-between">
      <div>{name}</div>
      <div className="flex items-center">
        <Grid className="w-4 h-4" />
        {extension}
      </div>
    </div>
  );
};

const VoiceMailConfigureModal: FC<ModalProps> = ({ modalState, setModalState, data }) => {
  const { settings = {} } = data || {};
  const { user } = useUser();
  const { watch, setValue } = useFormContext();

  const SITE_UUID = watch('basic.site.value') || user?.user_info?.site_uuid;
  const watchVoicemailSettings = watch('settings.voicemail_pin');

  const { data: membersList = [] } = useQuery({
    queryKey: ['getForwardingActionType'],
    queryFn: () =>
      forwardActionType({
        page: 1,
        limit: 1000,
        filters: [],
        search: '',
        site_uuid: SITE_UUID,
        type: 'EXTENSION',
      }),
    select: (data) => data?.data?.data?.result?.rows,
  });
  const handleCancel = () => {
    setValue('settings.voicemail_pin.value', settings?.voicemail_pin?.value || '');
    setValue('settings.voicemail_pin.users', settings?.voicemail_pin?.users || []);
    setValue(
      'settings.voicemail_pin.voicemail_to_text',
      settings?.voicemail_pin?.voicemail_to_text || 'NO',
    );
    setModalState(false);
  };
  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-1/4 p-3 max-h-[99%] overflow-y-auto" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Voicemail Settings
            <div
              onClick={handleCancel}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>

        <DialogDescription>
          <p className="text-gray-900 text-sm mb-1 font-semibold">Shared Voicemail</p>
          <p className="text-gray-700 text-sm">
            Select co recipients who will receive voicemail notification and will be abe to check
            your voicemail messages
          </p>
        </DialogDescription>

        <CustomSelect
          options={membersList?.map((item: IMEMBER) => ({
            label: `${capitalizeFirstLetter(item?.first_name)} ${item?.last_name} / ${item?.extension}`,
            value: item?.uuid,
          }))}
          handleChange={(e: ISELECTVALUE | null) => {
            setValue('settings.voicemail_pin.users', e, {
              shouldValidate: true,
            });
          }}
          isMulti={true}
          value={watchVoicemailSettings?.users}
          inputClass="team_chat"
          FormatOptionLabel={ExtensionListViewForVoiceMail}
        />
        <div className="flex items-center justify-between">
          <Label htmlFor="voicemail_to_text">Voicemail to text</Label>
          <Switch
            className="cursor-pointer"
            onCheckedChange={(checked) => {
              setValue('settings.voicemail_pin.voicemail_to_text', checked ? 'YES' : 'NO');
            }}
            checked={watch('settings.voicemail_pin.voicemail_to_text') === 'YES'}
          />
        </div>
        <DialogFooter>
          <div className="justify-end flex gap-2">
            <Button variant={'transparent'} type="button" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant={'outline'} type="button" onClick={() => setModalState(false)}>
              Submit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceMailConfigureModal;
