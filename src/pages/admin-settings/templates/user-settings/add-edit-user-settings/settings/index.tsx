import { FC, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useCompanyFeatures } from '@/hooks/rbac';
import { Switch } from '@/components/ui/switch';
import VoiceMailConfigureModal from './voicemail-dialog';
import AutomaticCallRecordingModal from './automatic-call-recording';
import DisplayNumberModal from './display-number-dialog';
import ErrorTooltip from '@/components/custom/error-tooltip';
import BussinessHoursModal from '@/components/custom/bussiness-hours-dialog';
import { Weekday, WEEKLY_ORDER, WEEKLY_SCHEDULE_MAP } from '@/pages/admin-settings/users/constants';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import RegionalModal from '@/components/common-settings/regional-dialog';

interface DaySchedule {
  open: boolean;
}

type WeeklySchedule = Partial<Record<Weekday, DaySchedule>>;

const getWeeklyScheduleName = (obj: WeeklySchedule = {}): string =>
  WEEKLY_ORDER.filter((day) => obj[day]?.open)
    .map((day) => WEEKLY_SCHEDULE_MAP[day])
    .join(', ');

const SettingPermission: FC<any> = ({ data }) => {
  const { features } = useCompanyFeatures();
  const [bussinessHourError, setBussinessHourEror] = useState<string | null>('');
  const [initialRegionalSettings, setInitialRegionalSettings] = useState<any>(null);

  const [modalState, setModalState] = useState({
    regionalModal: false,
    voicemailModal: false,
    bussinessHoursModal: false,
    automaticRecordingModal: false,
    displayNumberModal: false,
  });

  const {
    watch,
    register,
    setValue,
    formState: { errors },
  } = useFormContext();
  const {
    operational_hours = {},
    recording = {},
    display_number = {},
    // voicemail_pin = {},
  } = watch('settings');

  const openModal = (key: keyof typeof modalState) => {
    setModalState((prev) => ({ ...prev, [key]: true }));
  };

  const closeModal = (key: keyof typeof modalState) => {
    setModalState((prev) => ({ ...prev, [key]: false }));
  };

  useEffect(() => {
    if (modalState?.regionalModal) {
      const currentValues = JSON.parse(
        JSON.stringify(watch('settings.operational_hours.regional')),
      );
      setInitialRegionalSettings(currentValues);
    }
  }, [modalState?.regionalModal]);

  console.log(watch('settings.operational_hours.regional'), 'check');

  return (
    <>
      <div className="h-[calc(100vh_-_15rem)] overflow-auto flex flex-col gap-4 user-settings-template-settings">
        <div className="flex flex-col gap-4 mt-2 w-1/4 user-settings-template-settings-name-wrap">
          <Input
            label="Name"
            {...register('name')}
            error={errors?.name?.message}
            placeholder="Enter template name"
          />
        </div>
        <div className="grid grid-cols-1 gap-3">
          {/* <div className="flex flex-col gap-2 "> */}
          <div className="flex flex-col gap-2 bg-white justify-between  w-full  border border-gray-200 p-4 rounded-xl ">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <p
                  className={`font-semibold truncate text-md ${(errors.settings as any)?.operational_hours?.regional ? 'text-red' : 'text-gray-900'}`}
                >
                  Regional Settings
                </p>
                {(errors.settings as any)?.operational_hours?.regional && (
                  <ErrorTooltip text="Regional settings is required" />
                )}
              </div>
              <Button
                type="button"
                variant={'outline'}
                className="text-primary"
                onClick={() => openModal('regionalModal')}
              >
                Select
              </Button>
            </div>
            <p className="text-gray-800 truncate text-sm ">
              {' '}
              {operational_hours?.regional?.country?.value &&
              operational_hours?.regional?.timezone?.value
                ? `${operational_hours?.regional?.timezone?.value}, ${operational_hours?.regional?.country?.value}`
                : 'Regional settings are not configured.'}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                onCheckedChange={(checked: boolean) => {
                  setValue('settings.operational_hours.regional.override', checked);
                }}
                checked={watch('settings.operational_hours.regional.override')}
              />
              <Label className="text-gray-500">Override regional settings</Label>
            </div>
          </div>
          {/* <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <p className={`font-semibold truncate text-md text-gray-900`}>Voicemail Settings</p>
              </div>
              <Button
                type="button"
                variant={'transparent'}
                className="text-primary"
                onClick={() => openModal('voicemailModal')}
              >
                Select
              </Button>
            </div>
            <p className="text-gray-800 truncate text-sm bg-gray-100 p-3 rounded-lg">
              {voicemail_pin?.users?.length
                ? voicemail_pin.users
                    .map((item: ISELECTVALUE) => {
                      const label = item?.label || '';
                      return label.includes('/') ? label.split('/')[0] : label;
                    })
                    .join(', ')
                : 'Voicemail settings are not configured.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                onCheckedChange={(checked: boolean) => {
                  setValue('settings.voicemail_pin.override', checked);
                }}
                checked={watch('settings.voicemail_pin.override')}
              />
              <Label className="text-gray-500">Override voicemail settings</Label>
            </div>
          </div> */}
          <div className="flex flex-col gap-2 bg-white justify-between  w-full  border border-gray-200 p-4 rounded-xl ">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <p className={`font-semibold truncate text-md text-gray-900`}>Business Hours</p>
              </div>
              <Button
                type="button"
                variant={'outline'}
                className="text-primary"
                onClick={() => openModal('bussinessHoursModal')}
              >
                Select
              </Button>
            </div>
            <p className="text-gray-800 truncate text-sm ">
              {' '}
              {bussinessHourError
                ? bussinessHourError
                : operational_hours?.type == '24_hours'
                  ? '24 Hours, all times'
                  : getWeeklyScheduleName(operational_hours?.value)}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                onCheckedChange={(checked: boolean) => {
                  setValue('settings.operational_hours.override', checked);
                }}
                checked={watch('settings.operational_hours.override')}
              />
              <Label className="text-gray-500">Override date and time</Label>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white justify-between  w-full  border border-gray-200 p-4 rounded-xl ">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1">
                <p className={`font-semibold truncate text-md text-gray-900`}>
                  Automatic & On Demand Call Recording
                </p>
              </div>

              <Button
                type="button"
                variant={'outline'}
                className="text-primary"
                onClick={() => openModal('automaticRecordingModal')}
              >
                Select
              </Button>
            </div>
            <p className="text-gray-800 truncate text-sm ">
              {recording?.automatic?.enabled || recording?.on_demand?.enabled
                ? `${recording?.automatic?.enabled ? 'Automatic' : ''} ${recording?.automatic?.enabled && recording?.on_demand?.enabled ? '&' : ''} ${recording?.on_demand?.enabled ? 'On Demand' : ''} call recording is enabled.`
                : 'Automatic & on demand call recording is disabled.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                onCheckedChange={(checked: boolean) => {
                  setValue('settings.recording.override', checked);
                }}
                checked={watch('settings.recording.override')}
              />
              <Label className="text-gray-500">Override call recording</Label>
            </div>
          </div>

          {features?.plan_features?.advance_call_management?.access?.TRANSCRIPTION && (
            <>
              <div className="flex flex-col gap-2 bg-white justify-between  w-full  border border-gray-200 p-4 rounded-xl">
                <div className="flex items-center justify-between gap-3.5 w-full">
                  <div className="flex flex-col gap-1.5">
                    <p className="font-semibold truncate text-md text-gray-900">
                      Automatic Transcription
                    </p>
                    <p className="text-gray-800 truncate text-sm">
                      Automatic transcription is{' '}
                      {watch('settings.transcription.enabled') ? 'enabled' : 'disabled'}.
                    </p>
                  </div>
                  <Switch
                    checked={watch('settings.transcription.enabled')}
                    onCheckedChange={(checked) => {
                      setValue('settings.transcription.enabled', checked);
                      if (!checked) {
                        setValue('settings.ai_call_monitoring.enabled', false);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    onCheckedChange={(checked: boolean) => {
                      setValue('settings.transcription.override', checked);
                    }}
                    checked={watch('settings.transcription.override')}
                  />
                  <Label className="text-gray-500">Override transcription</Label>
                </div>
              </div>
              <div className="flex flex-col gap-2 bg-white justify-between  w-full  border border-gray-200 p-4 rounded-xl">
                <div className="flex items-center justify-between gap-3.5 w-full">
                  <div className="flex flex-col gap-1.5">
                    <p className="font-semibold truncate text-md text-gray-900">
                      AI Call Monitoring
                    </p>
                    <p className="text-gray-800 truncate text-sm">
                      When enabled transcripts will be automatically triggered.
                    </p>
                  </div>
                  <Switch
                    checked={watch('settings.ai_call_monitoring.enabled')}
                    onCheckedChange={(checked) => {
                      setValue('settings.ai_call_monitoring.enabled', checked);
                      if (checked) {
                        setValue('settings.transcription.enabled', true);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    onCheckedChange={(checked: boolean) => {
                      setValue('settings.ai_call_monitoring.override', checked);
                    }}
                    checked={watch('settings.ai_call_monitoring.override')}
                  />
                  <Label className="text-gray-500">Override AI call monitoring</Label>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2 bg-white justify-between  w-full  border border-gray-200  p-4 rounded-xl ">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <p className={`font-semibold truncate text-md text-gray-900`}>Display Number</p>
                {(errors?.settings as any)?.display_number?.masking?.value?.message && (
                  <ErrorTooltip
                    text={(errors?.settings as any)?.display_number?.masking?.value?.message}
                  />
                )}
              </div>
              <Button
                type="button"
                variant={'outline'}
                className="text-primary"
                onClick={() => openModal('displayNumberModal')}
              >
                Select
              </Button>
            </div>
            <p className="text-gray-800 truncate text-sm ">
              {display_number?.masking?.type?.value === 'N'
                ? 'Display number is not configured'
                : `Masking is ${display_number?.masking?.type?.label?.toLowerCase()} with ${display_number?.masking?.value} `}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                onCheckedChange={(checked: boolean) => {
                  setValue('settings.display_number.override', checked);
                }}
                checked={watch('settings.display_number.override')}
              />
              <Label className="text-gray-500">Override display number</Label>
            </div>
          </div>
        </div>
      </div>

      {modalState?.regionalModal && (
        <RegionalModal
          modalState={modalState?.regionalModal}
          setModalState={() => closeModal('regionalModal')}
          initialRegionalSettings={initialRegionalSettings}
          data={data}
        />
      )}
      {modalState?.voicemailModal && (
        <VoiceMailConfigureModal
          modalState={modalState?.voicemailModal}
          setModalState={() => closeModal('voicemailModal')}
        />
      )}
      {modalState?.bussinessHoursModal && (
        <BussinessHoursModal
          modalState={modalState?.bussinessHoursModal}
          setModalState={() => closeModal('bussinessHoursModal')}
          setError={(value) => setBussinessHourEror(value)}
        />
      )}
      {modalState?.automaticRecordingModal && (
        <AutomaticCallRecordingModal
          modalState={modalState?.automaticRecordingModal}
          setModalState={() => closeModal('automaticRecordingModal')}
        />
      )}
      {modalState?.displayNumberModal && (
        <DisplayNumberModal
          modalState={modalState?.displayNumberModal}
          setModalState={() => closeModal('displayNumberModal')}
        />
      )}
    </>
  );
};

export default SettingPermission;
