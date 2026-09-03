import { CloseIcon } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ModalProps } from '@/interfaces/common-interface';
import { AuthenticatedAudio } from '@/components/custom/authenticated-media';

import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

export const automaticRecordArr = [
  { value: 'all', label: 'All' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
];
const AutomaticCallRecordingModal: FC<ModalProps> = ({
  modalState,
  setModalState,
  data,
  origin,
}) => {
  const { settings = {} } = data || {};
  const { watch, setValue } = useFormContext();
  const handlecancel = () => {
    setValue('settings.recording', settings?.recording || {});
    setModalState(false);
  };
  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent
        className="sm:w-1/2 md:w-1/3  p-3 max-h-[99%] overflow-y-auto"
        showCloseButton={false}
      >
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Automatic & On Demand Call Recording
            <div
              onClick={handlecancel}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>

        <div className="flex flex-col border border-gray-200 rounded-xl">
          <div
            className={`flex justify-between p-3 cursor-pointer ${watch('settings.recording.automatic.enabled') ? 'items-start' : 'items-center'}`}
          >
            <div className="flex flex-col gap-3">
              <p className="font-semibold text-md text-gray-900">Automatic Call Recording</p>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <Label>Enable Automatic Call Recording</Label>
                  <Switch
                    onCheckedChange={(checked) => {
                      setValue('settings.recording.automatic', {
                        enabled: checked,
                        value: 'all',
                        label: 'All',
                        recording_on: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34333.mp3',
                      });
                    }}
                    value={watch('settings.recording.automatic.enabled')}
                    checked={watch('settings.recording.automatic.enabled')}
                  />
                </div>
                {watch('settings.recording.automatic.enabled') && origin !== 'department' && (
                  <CustomSelect
                    label={'Recording Direction'}
                    options={automaticRecordArr.map(({ value, label }) => ({ value, label }))}
                    value={watch('settings.recording.automatic')}
                    handleChange={(value) => {
                      setValue('settings.recording.automatic.value', value.value);
                      setValue('settings.recording.automatic.label', value.label);
                    }}
                  />
                )}
              </div>
              <p className="text-gray-900 text-sm">
                Turn on this feature to automatically record all calls made to a particular user or
                group extension.The recording will be accessible in your call log.{' '}
              </p>
              <div className="flex flex-col gap-3 mt-2">
                <Label>Call Recording Announcement</Label>
                <AuthenticatedAudio
                  controls
                  src={"/recording-announcement.mp3?v=2"}
                  className="w-full h-10"
                />
              </div>
            </div>
          </div>

          <hr className="text-gray-200 w-full" />

          <div
            className={`flex justify-between p-3 cursor-pointer ${watch('settings.recording.on_demand.enabled') ? 'items-start' : 'items-center'}`}
          >
            <div className="flex flex-col gap-3 w-full">
              <p className="font-semibold text-md text-gray-900">On-demand Call Recording</p>
              <div className="flex items-center gap-2">
                <Switch
                  onCheckedChange={(checked) => {
                    setValue('settings.recording.on_demand', {
                      enabled: checked,
                      recording_on: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34331.mp3',
                      recording_Off: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34332.mp3',
                    });
                  }}
                  value={watch('settings.recording.on_demand.enabled')}
                  checked={watch('settings.recording.on_demand.enabled')}
                />
              </div>
              <p className="text-gray-900 text-sm">
                Enable your users to record call at any time on a phone dial pad.
              </p>
              <div className="flex flex-col gap-1.5 w-full">
                <Label>Announcement on Start</Label>
                <AuthenticatedAudio
                  controls
                  src={"/recording-on-demand-start.mp3?v=2"}
                  className="w-full h-10"
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <Label>Announcement on Stop</Label>
                <AuthenticatedAudio
                  controls
                  src={"/recording-on-demand-stop.mp3?v=2"}
                  className="w-full h-10"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="justify-end flex gap-2">
            <Button type="button" variant={'transparent'} onClick={handlecancel}>
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

export default AutomaticCallRecordingModal;
