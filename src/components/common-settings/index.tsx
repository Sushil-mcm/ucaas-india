import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { Button } from '@/components/ui/button';
import RoleModal from './role-dialog';
import RegionalModal from './regional-dialog';
import { useCompanyPolicy, type PolicyField } from '@/lib/company-policy';
import VoiceMailConfigureModal from './voicemail-dialog';
import AutomaticCallRecordingModal from './automatic-call-recording';
import DisplayNumberModal from './display-number-dialog';
import ErrorTooltip from '@/components/custom/error-tooltip';
import BussinessHoursModal from '@/components/custom/bussiness-hours-dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import HolidaysTable from '@/components/custom/holdiays-table';
import { Weekday, WEEKLY_ORDER, WEEKLY_SCHEDULE_MAP } from '@/pages/admin-settings/users/constants';
import CampaignBussinessHoursModal from '../custom/campaign-bussiness-hours';
import moment from 'moment';
import { Switch } from '../ui/switch';

interface DaySchedule {
  open: boolean;
}

type WeeklySchedule = Partial<Record<Weekday, DaySchedule>>;

export const getWeeklyScheduleName = (obj: WeeklySchedule = {}): string =>
  WEEKLY_ORDER.filter((day) => obj[day]?.open)
    .map((day) => WEEKLY_SCHEDULE_MAP[day])
    .join(', ');

/* The banner at the top of the page says a company rule is in force; this says which
   control it is on. Without it a greyed-out button is indistinguishable from a broken
   one, and the person has no way to tell which of the two they are looking at. */
const CompanyLockNote: FC<{ show: boolean }> = ({ show }) =>
  show ? (
    <p className="text-xs text-gray-500">Set by your company, so you cannot change it here.</p>
  ) : null;

const CommonSettingPermission: FC<any> = ({
  data,
  isEditable = true,
  isShowRole = false,
  isShowVoicemail = false,
  IS_ADMIN,
  customClass = 'md:h-[calc(100vh_-_15rem)]',
  isCampaignHours = false,
  isBussinessHours = true,
  origin,
  isAdminAccount = false,
  selectedUserExt = null,
}) => {
  /* Company rules govern a person editing their own phone, and nothing else. The
     other screens using this editor are an admin configuring a number, department,
     IVR or queue, where a lock meant for staff would make no sense. */
  const isOwnSettingsPage = origin === 'general_settings';
  const companyPolicy = useCompanyPolicy({ enabled: isOwnSettingsPage });

  /* `isEditable` stays in charge everywhere the company rule does not reach —
     including a tenant that has never saved one, so nothing changes for them. */
  const canEditField = (field: PolicyField): boolean => {
    if (!isOwnSettingsPage || !companyPolicy.isActive) return isEditable;
    return companyPolicy.allows(field);
  };

  /* Greyed out *because of the company rule*, which is the only case worth explaining
     at the control. A screen that renders this editor read-only for its own reasons
     says so in its own words, and should not borrow this wording. */
  const isCompanyLocked = (field: PolicyField): boolean =>
    isOwnSettingsPage && companyPolicy.isActive && !canEditField(field);

  /* Only the settings this screen actually shows count, so the notice does not
     appear because of a locked field that lives on a different page. */
  /* `transcription` and `ai_call_monitoring` are stored as {enabled, override}
     but were plain booleans in older records, so both shapes are in the data.
     Read as-is, an object is always truthy — which is why a setting saved as
     {"enabled": false} displayed as switched on, and why turning one on appeared
     to turn the other on too: it had been showing on all along. */
  const readToggle = (path: string): boolean => {
    const value = watch(path);
    return typeof value === 'object' && value !== null ? !!value.enabled : !!value;
  };

  /* Writes back in whatever shape the value already had, so flipping a switch on
     a record that carries an override flag does not flatten it to a bare boolean
     and drop the company's rule with it. */
  const writeToggle = (path: string, checked: boolean): void => {
    const current = watch(path);
    setValue(
      path,
      typeof current === 'object' && current !== null ? { ...current, enabled: checked } : checked,
    );
  };

  const shownPolicyFields: PolicyField[] = [
    'regional',
    'recording',
    'transcription',
    'ai_call_monitoring',
    'display_number',
    ...(isShowVoicemail ? (['voicemail'] as PolicyField[]) : []),
    /* Business hours is a governed field like the rest; it was simply missing here,
       so a company that locked it got no notice and no greyed-out control. */
    ...(isBussinessHours ? (['business_hours'] as PolicyField[]) : []),
  ];
  const hasCompanyLockedFields = shownPolicyFields.some((field) => !canEditField(field));

  const isUpdatingAdmin =
    ['ADMIN'].includes(data?.role_data?.name) || ['ADMIN'].includes(data?.role);
  const [bussinessHourError, setBussinessHourEror] = useState<string | null>('');
  const [initialRegionalSettings, setInitialRegionalSettings] = useState<any>(null);

  const [modalState, setModalState] = useState({
    roleModal: false,
    regionalModal: false,
    voicemailModal: false,
    bussinessHoursModal: false,
    automaticRecordingModal: false,
    displayNumberModal: false,
  });

  const { features } = useCompanyFeatures();

  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();
  const {
    operational_hours = {},
    recording = {},
    display_number = {},
    voicemail_pin = {},
  } = watch('settings');

  const startDate = watch('startDate') ? moment(watch('startDate')) : null;
  const endDate = watch('endDate') ? moment(watch('endDate')) : null;

  const openModal = (key: keyof typeof modalState) => {
    setModalState((prev) => ({ ...prev, [key]: true }));
  };

  const closeModal = (key: keyof typeof modalState) => {
    setModalState((prev) => ({ ...prev, [key]: false }));
  };

  const getCampampaignDays = () => {
    const days = operational_hours?.value || {};
    return Object.keys(days)
      .filter((day) => isDayWithinRange(day))
      .map((day) => WEEKLY_SCHEDULE_MAP[day as Weekday])
      .join(', ');
  };

  const isDayWithinRange = (day: string) => {
    if (!startDate || !endDate) return true; // if no range, don’t block

    const dayIndex = moment().day(day).day(); // mon=1 ... sun=0

    const checkDay = (current: moment.Moment): boolean =>
      current.isAfter(endDate, 'day')
        ? false
        : current.day() === dayIndex || checkDay(current.clone().add(1, 'day'));

    return checkDay(startDate.clone());
  };

  return (
    <>
      <div className={`flex flex-col gap-4 ${customClass}  pr-1`}>
        {/* A greyed-out control with no reason given reads as broken. This says who
            locked it and where it is changed, so the answer is on the page rather
            than in a support ticket. Shown only when something is actually locked. */}
        {isOwnSettingsPage && companyPolicy.isActive && hasCompanyLockedFields && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            Some settings below are greyed out because they are set for everyone by your company. An
            administrator can change them under <strong>Phone System → Preferences</strong>.
          </div>
        )}
        <div className="grid grid-cols-1 gap-3">
          {/* {IS_ADMIN ? ( */}
          {isShowRole && (
            <div className="flex bg-white justify-between gap-3.5 w-full border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] p-4 rounded-xl">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <p
                    className={`font-semibold truncate text-md text-gray-900 ${(errors.settings as any)?.role?.value?.message ? 'text-red' : 'text-gray-900'}`}
                  >
                    Role
                  </p>
                  {(errors.settings as any)?.role?.value?.message && (
                    <ErrorTooltip text={(errors.settings as any)?.role?.value?.message} />
                  )}
                </div>
                <p className="text-gray-800 truncate text-sm">
                  {isUpdatingAdmin
                    ? data?.role_data?.name || data?.role
                    : watch('settings.role.label')}
                </p>
              </div>
              {!isUpdatingAdmin && IS_ADMIN && !isAdminAccount ? (
                <Button
                  type="button"
                  variant={'outline'}
                  className="w-16"
                  onClick={() => openModal('roleModal')}
                >
                  Select
                </Button>
              ) : null}
            </div>
          )}
          <div className="flex bg-white justify-between gap-3.5 w-full  border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] p-4 rounded-xl">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <p
                  className={`font-semibold truncate text-md ${(errors.settings as any)?.operational_hours?.regional ? 'text-red' : 'text-gray-900'}`}
                >
                  Regional Settings
                </p>
                {(errors.settings as any)?.operational_hours?.regional && (
                  <ErrorTooltip text="Regional settings are required" />
                )}
              </div>
              <p className="text-gray-800 truncate text-sm">
                {' '}
                {operational_hours?.regional?.country?.value &&
                operational_hours?.regional?.timezone?.value
                  ? `${operational_hours?.regional?.timezone?.value}, ${operational_hours?.regional?.country?.value}`
                  : ''}
                {/* : 'Regional settings are not configured.'} */}
              </p>
              <CompanyLockNote show={isCompanyLocked('regional')} />
            </div>
            <Button
              type="button"
              className="w-16"
              variant={'outline'}
              disabled={!canEditField('regional')}
              onClick={() => {
                if (!canEditField('regional')) return;
                const currentValues = JSON.parse(
                  JSON.stringify(watch('settings.operational_hours.regional')),
                );
                setInitialRegionalSettings(currentValues);
                openModal('regionalModal');
              }}
            >
              Select
            </Button>
          </div>
          {isShowVoicemail && (
            <div className="flex bg-white justify-between gap-3.5 w-full  border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] p-4 rounded-xl">
              <div className="flex flex-col gap-1.5">
                <p className="font-semibold truncate text-md">Voicemail Settings</p>
                <p className="text-gray-800 truncate text-sm">
                  {voicemail_pin?.users?.length
                    ? voicemail_pin.users
                        .map((item: ISELECTVALUE) => {
                          const label = item?.label || '';
                          return label.includes('/') ? label.split('/')[0] : label;
                        })
                        .join(', ')
                    : 'Voicemail settings are not configured.'}
                </p>
                <CompanyLockNote show={isCompanyLocked('voicemail')} />
              </div>
              <Button
                type="button"
                className="w-16"
                variant={'outline'}
                onClick={() => {
                  if (!canEditField('voicemail')) return;
                  openModal('voicemailModal');
                }}
                disabled={!canEditField('voicemail')}
              >
                Select
              </Button>
            </div>
          )}
          {isBussinessHours ? (
            <div className="flex bg-white justify-between gap-3.5 w-full  border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] p-4 rounded-xl">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <p className="font-semibold truncate text-md">
                    {isCampaignHours ? 'Campaign Hours' : 'Business Hours'}
                  </p>
                  {(errors?.settings as any)?.operational_hours?.closed_hour_action?.value
                    ?.value && (
                    <ErrorTooltip
                      text={
                        (errors?.settings as any)?.operational_hours?.closed_hour_action?.value
                          ?.value?.message
                      }
                    />
                  )}
                </div>
                {isCampaignHours ? (
                  <p className="text-primary truncate text-sm">
                    {' '}
                    {bussinessHourError
                      ? bussinessHourError
                      : getCampampaignDays() || 'No days selected'}
                  </p>
                ) : (
                  <p className="text-primary truncate text-sm">
                    {' '}
                    {bussinessHourError
                      ? bussinessHourError
                      : operational_hours?.type == '24_hours'
                        ? '24 Hours, all times'
                        : getWeeklyScheduleName(operational_hours?.value)}
                  </p>
                )}
                <CompanyLockNote show={isCompanyLocked('business_hours')} />
              </div>
              <Button
                type="button"
                className="w-16"
                variant={'outline'}
                onClick={() => {
                  if (!canEditField('business_hours')) return;
                  openModal('bussinessHoursModal');
                }}
                disabled={!canEditField('business_hours')}
              >
                Select
              </Button>
            </div>
          ) : null}

          {features?.plan_features?.advance_call_management?.access?.RECORDING &&
            !isCampaignHours && (
              <div className="flex flex-col sm:flex-row bg-white justify-between gap-3.5 w-full  border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] p-4 rounded-xl">
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold truncate text-md">
                    Automatic & On Demand Call Recording
                  </p>
                  <p className="text-gray-800 truncate text-sm">
                    {recording?.automatic?.enabled || recording?.on_demand?.enabled
                      ? `${recording?.automatic?.enabled ? 'Automatic' : ''} ${recording?.automatic?.enabled && recording?.on_demand?.enabled ? '&' : ''} ${recording?.on_demand?.enabled ? 'On Demand' : ''} call recording is enabled.`
                      : 'Automatic & on demand call recording is disabled.'}
                  </p>
                  <CompanyLockNote show={isCompanyLocked('recording')} />
                </div>
                <Button
                  type="button"
                  className="w-16"
                  variant={'outline'}
                  onClick={() => {
                    if (!canEditField('recording')) return;
                    openModal('automaticRecordingModal');
                  }}
                  disabled={!canEditField('recording')}
                >
                  Select
                </Button>
              </div>
            )}
          {features?.plan_features?.advance_call_management?.access?.TRANSCRIPTION && (
            <>
              <div className="flex bg-white justify-between gap-3.5 w-full  border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] p-4 rounded-xl">
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold truncate text-md">Automatic Transcription</p>
                  <p className="text-gray-800 truncate text-sm">
                    Automatic transcription is{' '}
                    {readToggle('settings.transcription') ? 'enabled' : 'disabled'}.
                  </p>
                  <CompanyLockNote show={isCompanyLocked('transcription')} />
                </div>
                <Switch
                  checked={readToggle('settings.transcription')}
                  disabled={!canEditField('transcription')}
                  onCheckedChange={(checked) => {
                    if (!canEditField('transcription')) return;
                    writeToggle('settings.transcription', checked);
                    /* AI monitoring reads the transcript, so it cannot stay on
                       once transcription is off. */
                    if (!checked) {
                      writeToggle('settings.ai_call_monitoring', false);
                    }
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row bg-white justify-between gap-3.5 w-full  border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] p-4 rounded-xl">
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold truncate text-md">AI Call Monitoring</p>
                  <p className="text-gray-800 truncate text-sm">
                    When enabled transcripts will be automatically triggered.
                    {/* AI Call Monitoring is{' '}
                    {watch('settings.ai_call_monitoring') ? 'enabled' : 'disabled'}. */}
                  </p>
                  <CompanyLockNote show={isCompanyLocked('ai_call_monitoring')} />
                </div>
                <Switch
                  checked={readToggle('settings.ai_call_monitoring')}
                  disabled={!canEditField('ai_call_monitoring')}
                  onCheckedChange={(checked) => {
                    if (!canEditField('ai_call_monitoring')) return;
                    writeToggle('settings.ai_call_monitoring', checked);
                    /* Monitoring has nothing to read without a transcript, so
                       switching it on switches transcription on with it. */
                    if (checked) {
                      writeToggle('settings.transcription', true);
                    }
                  }}
                />
              </div>
            </>
          )}
          {!isCampaignHours && (
            <div className="flex bg-white justify-between gap-3.5 w-full  border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] p-4 rounded-xl">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <p className="font-semibold truncate text-md">Display Number</p>
                  {(errors?.settings as any)?.display_number?.masking?.value?.message && (
                    <ErrorTooltip
                      text={(errors?.settings as any)?.display_number?.masking?.value?.message}
                    />
                  )}
                </div>

                <p className="text-gray-800 truncate text-sm">
                  {display_number?.masking?.type?.value === 'N'
                    ? 'Display number is not configured'
                    : `Masking is ${display_number?.masking?.type?.label?.toLowerCase()} with ${display_number?.masking?.value} `}
                </p>
                <CompanyLockNote show={isCompanyLocked('display_number')} />
              </div>
              <Button
                type="button"
                className="w-16"
                variant={'outline'}
                onClick={() => {
                  if (!canEditField('display_number')) return;
                  openModal('displayNumberModal');
                }}
                disabled={!canEditField('display_number')}
              >
                Select
              </Button>
            </div>
          )}
        </div>

        {operational_hours?.holidays?.length && !isCampaignHours ? (
          <div className="flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <h5 className="font-semibold text-gray-900 text-md my-2">Custom Days</h5>
              {(errors?.settings as any)?.operational_hours?.holidays?.length && (
                <div className="flex justify-end">
                  <ErrorTooltip text={'Please fill all fields'} />
                </div>
              )}
            </div>
            <HolidaysTable holidays={operational_hours?.holidays} />{' '}
          </div>
        ) : null}
      </div>

      {modalState?.roleModal && (
        <RoleModal
          modalState={modalState?.roleModal}
          setModalState={() => closeModal('roleModal')}
          data={data}
        />
      )}
      <RegionalModal
        modalState={modalState?.regionalModal}
        setModalState={(val) => {
          if (val) {
            openModal('regionalModal');
          } else {
            closeModal('regionalModal');
          }
        }}
        initialRegionalSettings={initialRegionalSettings}
        data={data}
      />
      {modalState?.voicemailModal && (
        <VoiceMailConfigureModal
          modalState={modalState?.voicemailModal}
          setModalState={() => closeModal('voicemailModal')}
          data={data}
        />
      )}
      {modalState?.bussinessHoursModal && !isCampaignHours && (
        <BussinessHoursModal
          modalState={modalState?.bussinessHoursModal}
          setModalState={() => closeModal('bussinessHoursModal')}
          setError={(value) => setBussinessHourEror(value)}
          data={data}
          selectedUserExt={selectedUserExt}
        />
      )}
      {modalState?.bussinessHoursModal && isCampaignHours && (
        <CampaignBussinessHoursModal
          modalState={modalState?.bussinessHoursModal}
          setModalState={() => closeModal('bussinessHoursModal')}
          setError={(value) => setBussinessHourEror(value)}
          data={data}
        />
      )}
      {modalState?.automaticRecordingModal && (
        <AutomaticCallRecordingModal
          modalState={modalState?.automaticRecordingModal}
          setModalState={() => closeModal('automaticRecordingModal')}
          data={data}
          origin={origin}
        />
      )}
      {modalState?.displayNumberModal && (
        <DisplayNumberModal
          modalState={modalState?.displayNumberModal}
          setModalState={() => closeModal('displayNumberModal')}
          data={data}
        />
      )}
    </>
  );
};

export default CommonSettingPermission;
