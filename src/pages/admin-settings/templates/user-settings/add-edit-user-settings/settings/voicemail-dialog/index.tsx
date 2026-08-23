import { CloseIcon } from '@/assets/icons';
import { ExtensionListViewForVoiceMail } from '@/components/common-settings/voicemail-dialog';
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

const VoiceMailConfigureModal: FC<ModalProps> = ({ modalState, setModalState }) => {
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

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-1/4 p-3" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Voicemail Settings
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>

        <DialogDescription>
          <p className="text-gray-900 text-sm">
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
            onCheckedChange={(checked) => {
              setValue('settings.voicemail_pin.voicemail_to_text', checked ? 'YES' : 'NO');
            }}
            checked={watch('settings.voicemail_pin.voicemail_to_text') === 'YES'}
          />
        </div>
        <DialogFooter>
          <div className="justify-end flex gap-2">
            <Button type="button" variant={'transparent'} onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button type="button" variant={'outline'} onClick={() => setModalState(false)}>
              Submit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceMailConfigureModal;
