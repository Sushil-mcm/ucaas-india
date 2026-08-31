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
import { Weekday, WEEKLY_ORDER, WEEKLY_SCHEDULE_MAP } from '@/pages/admin-settings/constants';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Input } from '@/components/ui/input';
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

  /* One row per company rule. Each says what it decides, shows what it is set to
     now, and carries its own "may people change this" switch.

     `override` is the stored key and reads as jargon on a screen a customer uses.
     What it actually decides is whether a person may change that one setting on
     their own phone, so that is what each row says instead. */
  const OverrideRow = ({ path, what }: { path: string; what: string }) => (
    <SettingRow
      label="Let people change this themselves"
      description={`Off, everybody keeps the company ${what}. On, a person may change it on their own phone.`}
      control={
        <Switch
          checked={!!watch(path)}
          onCheckedChange={(checked: boolean) => setValue(path, checked)}
        />
      }
    />
  );

  return (
    <>
      <div className="user-settings-template-settings flex h-[calc(100vh_-_15rem)] flex-col gap-4 overflow-auto">
        <div className="user-settings-template-settings-name-wrap mt-2 w-full max-w-sm">
          <Input
            label="Name"
            {...register('name')}
            error={errors?.name?.message}
            placeholder="Enter template name"
          />
        </div>

        <SettingCard
          title="Where this company works"
          status="active"
          note="The time zone here is what opening hours are judged against on every incoming call."
          description="The country and clock everything else is measured against - opening hours, holidays, and the times shown in reports."
          aside={
            <Button type="button" variant="outline" onClick={() => openModal('regionalModal')}>
              Change
            </Button>
          }
        >
          <SettingRow
            label="Country and time zone"
            description={
              operational_hours?.regional?.country?.value &&
              operational_hours?.regional?.timezone?.value
                ? `${operational_hours?.regional?.timezone?.value}, ${operational_hours?.regional?.country?.value}`
                : 'Not set yet. Nothing that depends on the clock will behave predictably until it is.'
            }
            control={
              (errors.settings as any)?.operational_hours?.regional ? (
                <ErrorTooltip text="Regional settings is required" />
              ) : null
            }
          />
          <OverrideRow
            path="settings.operational_hours.regional.override"
            what="country and time zone"
          />
        </SettingCard>

        <SettingCard
          title="When you are open"
          status="active"
          note="Outside these hours, a number that rings a person goes to their voicemail instead of ringing an empty desk. Numbers pointed at a menu or a queue are not diverted yet — those still ring through at any hour."
          description="Calls outside these hours are handled differently - that is what the closed-hours action on your numbers and queues points at."
          aside={
            <Button
              type="button"
              variant="outline"
              onClick={() => openModal('bussinessHoursModal')}
            >
              Change
            </Button>
          }
        >
          <SettingRow
            label="Opening hours"
            description={
              bussinessHourError
                ? bussinessHourError
                : operational_hours?.type == '24_hours'
                  ? 'Open 24 hours, every day. Nothing is ever treated as out of hours.'
                  : getWeeklyScheduleName(operational_hours?.value) || 'Set per weekday.'
            }
          />
          <OverrideRow path="settings.operational_hours.override" what="opening hours" />
        </SettingCard>

        <SettingCard
          title="Call recording"
          status="coming-soon"
          note="Saved, but nothing is being recorded and nothing has been. Across 5,987 calls no recording has ever been made — this has not yet been built rather than having stopped working, so there is nothing missing from your account to recover."
          description="Whether calls are recorded automatically, or only when somebody chooses to start recording."
          aside={
            <Button
              type="button"
              variant="outline"
              onClick={() => openModal('automaticRecordingModal')}
            >
              Change
            </Button>
          }
        >
          <SettingRow
            label="What gets recorded"
            description={
              recording?.automatic?.enabled || recording?.on_demand?.enabled
                ? `${recording?.automatic?.enabled ? 'Every call is recorded automatically.' : ''} ${recording?.on_demand?.enabled ? 'People can start a recording during a call.' : ''}`.trim()
                : 'Nothing is recorded.'
            }
          />
          <OverrideRow path="settings.recording.override" what="recording setting" />
        </SettingCard>

        {features?.plan_features?.advance_call_management?.access?.TRANSCRIPTION && (
          <>
            <SettingCard
              title="Transcription"
              status="coming-soon"
              note="Saved, and nothing writes calls out as text yet."
              description="Writing calls out as text so they can be read and searched rather than listened to."
            >
              <SettingRow
                label="Write calls out as text"
                description="Applies to recorded calls. Turning this off also turns off call monitoring below, which depends on it."
                control={
                  <Switch
                    checked={watch('settings.transcription.enabled')}
                    onCheckedChange={(checked) => {
                      setValue('settings.transcription.enabled', checked);
                      if (!checked) {
                        setValue('settings.ai_call_monitoring.enabled', false);
                      }
                    }}
                  />
                }
              />
              <OverrideRow path="settings.transcription.override" what="transcription setting" />
            </SettingCard>

            <SettingCard
              title="Call monitoring"
              status="coming-soon"
              note="Saved, and no transcript is being looked through yet."
              description="Reading the transcripts to flag calls worth a supervisor's attention."
            >
              <SettingRow
                label="Look through transcripts automatically"
                description="Needs transcription switched on above, since there is nothing to read without it."
                control={
                  <Switch
                    checked={watch('settings.ai_call_monitoring.enabled')}
                    disabled={!watch('settings.transcription.enabled')}
                    onCheckedChange={(checked) =>
                      setValue('settings.ai_call_monitoring.enabled', checked)
                    }
                  />
                }
              />
              <OverrideRow
                path="settings.ai_call_monitoring.override"
                what="call monitoring setting"
              />
            </SettingCard>
          </>
        )}

        <SettingCard
          title="The number people see"
          status="active"
          note="This one does reach the call: it is the number shown on the other person's phone."
          description="What shows on the other person's phone when somebody here calls out."
          aside={
            <Button type="button" variant="outline" onClick={() => openModal('displayNumberModal')}>
              Change
            </Button>
          }
        >
          <SettingRow
            label="Outgoing caller ID"
            description={
              display_number?.masking?.type?.value === 'N'
                ? 'Not set. Calls go out showing whatever the line itself is set to.'
                : `${display_number?.masking?.type?.label} - ${display_number?.masking?.value}`
            }
            control={
              (errors?.settings as any)?.display_number?.masking?.value?.message ? (
                <ErrorTooltip
                  text={(errors?.settings as any)?.display_number?.masking?.value?.message}
                />
              ) : null
            }
          />
          <OverrideRow path="settings.display_number.override" what="caller ID" />
        </SettingCard>
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
