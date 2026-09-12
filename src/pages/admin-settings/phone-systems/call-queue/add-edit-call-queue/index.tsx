import { useEffect, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AFTER_CALL_DEFAULTS,
  ESCALATION_DEFAULTS,
  ROUTING_DEFAULTS,
  CALL_DISTRIBUTION_DATA,
  CALL_QUEUE_INIITAL_VALUES,
  DELAY_GREETING_DEFAULT_INTERVAL,
  TAB_CONSTANT,
  WAITING_DEFAULTS,
} from '../constant';
import { QUEUES_PATH, QUEUE_DEFAULT_TAB, queueSlugFromTab, queueTabFromSlug } from '../queue-tabs';
import { FormProvider, useForm } from 'react-hook-form';
import { upsertCallQueueSchema } from '../schema';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import BasicInformation from './basic-info';
import AddMembers from './add-members';
import GreetingNotification from './greetings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  allNumbersList,
  callForwarding,
  callQueueInfo,
  callQueueList,
  getCallScript,
  upsertCallQueue,
} from '@/services/api';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { buildQueueAttachPatch } from '@/lib/queue-numbers';
import { dedupeMembers } from '@/lib/queue-members';
import {
  generateRandomExtension,
  getHolidaysFormVal,
  getHolidaysPayload,
  getObjectLength,
  handleAlert,
} from '@/lib/utils';
import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/pages/admin-settings/numbers/set-number-forwarding/constants';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { hasStoredRingTime, seedDeviceRingTime } from '@/lib/company-ring-time';
import CommonSettingPermission from '@/components/common-settings';
import RingStrategy from './ring-strategy';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import QueueSettings from './queue-settings';
import DispositionModal from '@/pages/auto-dialer/dispositions/add-edit-dispositions';
import { callForwardingOptions } from '@/components/custom/forwarding-actions';
import '@/components/mcm/mcm-page.css';

interface AddCallQueueProps {
  drawerState: boolean;
  setDrawerState: (state: boolean) => void;
  queueDetails: any;
  /** The tab from the URL. Absent while creating, where the wizard gates forward steps. */
  tabSlug?: string;
}

const TABS_ORDER = [
  TAB_CONSTANT.BASIC_INFORMATION,
  TAB_CONSTANT.SETTINGS,
  TAB_CONSTANT.QUEUE_SETTINGS,
  TAB_CONSTANT.ADD_MEMBERS,
  TAB_CONSTANT.RING_STRATEGY,
  TAB_CONSTANT.GREETING_NOTIFICATION,
];

const schemaIndex = {
  [TAB_CONSTANT.BASIC_INFORMATION]: 0,
  [TAB_CONSTANT.SETTINGS]: 1,
  [TAB_CONSTANT.QUEUE_SETTINGS]: 2,
  [TAB_CONSTANT.GREETING_NOTIFICATION]: 3,
  [TAB_CONSTANT.RING_STRATEGY]: 5,
  [TAB_CONSTANT.ADD_MEMBERS]: 4,
};

/* A queue member's ring time is the same setting as a device's ring time — how
   long one phone rings before the call moves on — so it is read through the same
   shared reader rather than a second copy of the same matching logic that has to
   be kept in step by hand. Two near-identical local helpers used to live here and
   in ring-strategy/index.tsx; both are now `seedDeviceRingTime`.

   Hydration keeps a value only when the member actually has one. An empty member
   is deliberately left empty instead of being stamped with a fallback here,
   because the company record may still be in flight when this runs: seeding at
   the two places the value is actually read — the select and the payload — means
   the company number is used the moment it arrives, and a member who already has
   a ring time is never touched either way. That is also why no company settings
   are needed here: a stored value is returned exactly as stored, so this cannot
   depend on whether the company record has loaded yet. */
const hydrateMemberRingTime = (stored: any) =>
  hasStoredRingTime(stored) ? seedDeviceRingTime(stored, undefined) : undefined;

const AddCallQueue: FC<AddCallQueueProps> = ({ setDrawerState, queueDetails, tabSlug }) => {
  const [modalState, setModalState] = useState<boolean>(false);
  const [schemaContext, setSchemaContext] = useState(null);
  const isEditMode = !!queueDetails?._id;
  const navigate = useNavigate();

  /* Which tab is open.
   *
   * Editing an existing queue reads the tab from the URL, so a colleague can be
   * sent straight to the tab under discussion and a reload lands back on it.
   *
   * Creating one keeps the tab in state on purpose. The create flow is a wizard:
   * `handleTabChange` refuses to move forward until the current tab validates,
   * and a URL is an open door past that check. A half-built queue reached by
   * pasting a link to the last tab would save with empty required fields. */
  const [wizardTab, setWizardTab] = useState<string>(TAB_CONSTANT.BASIC_INFORMATION);
  const tabFromUrl = queueTabFromSlug(tabSlug);
  const activeTab = isEditMode ? tabFromUrl || TAB_CONSTANT.BASIC_INFORMATION : wizardTab;

  const setActiveTab = (nextTab: string) => {
    if (!isEditMode) {
      setWizardTab(nextTab);
      return;
    }
    navigate(`${QUEUES_PATH}/${queueDetails?._id}/${queueSlugFromTab(nextTab)}`, {
      replace: true,
    });
  };

  /* A tab nobody recognises is corrected in the address bar rather than quietly
     showing the first tab, so the URL never claims to be somewhere it is not. */
  useEffect(() => {
    if (isEditMode && tabSlug && !tabFromUrl) {
      navigate(`${QUEUES_PATH}/${queueDetails?._id}/${QUEUE_DEFAULT_TAB.slug}`, { replace: true });
    }
  }, [isEditMode, tabSlug, tabFromUrl, queueDetails?._id, navigate]);
  const formInstance = useForm<any>({
    defaultValues: CALL_QUEUE_INIITAL_VALUES,
    resolver: yupResolver(upsertCallQueueSchema[schemaIndex[activeTab]] as yup.ObjectSchema<any>),
    mode: 'onChange',
    context: { schemaContext },
  });

  const { data: queueInfo, isFetched } = useQuery({
    queryKey: ['getQueueDetailInCallInEdit', queueDetails?._id],
    queryFn: () =>
      callQueueInfo({
        uuid: queueDetails?._id,
      }),
    enabled: !!queueDetails?._id,
    select: (data) => data?.data?.data?.result || {},
  });

  const { settings = {} } = queueDetails || {};

  const { data: scriptList = [] } = useQuery({
    queryKey: ['getScriptListAccToTypeForQueue'],
    /* Published scripts only: a draft is still being written. */
    queryFn: () =>
      getCallScript({ page: 1, limit: 200, filters: [{ key: 'status', value: 'published' }] }),
    select: (data) =>
      data?.data?.data?.result?.rows?.filter((item: any) => item?.dialMethod === 'QUEUE') || [],
  });

  /* The company record, read once and shared with every other company-level
     screen through the same cache key. It is only ever used to fill a ring time
     nobody has chosen, so a tenant that never set one is unaffected. */
  const { data: companyDefaults } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    staleTime: 5 * 60 * 1000,
  });
  const companySettings = companyDefaults?.settings;

  const queryClient: any = useQueryClient();
  const { socketEventsManager } = useSocketEvents();
  const { user } = useUser();
  const { watch, trigger, setValue, reset } = formInstance;
  const handleTabChange = async (nextTab: string) => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    const nextIndex = TABS_ORDER.indexOf(nextTab);

    if (nextIndex <= currentIndex) {
      setActiveTab(nextTab); // Going backward, no validation
      return;
    }

    const isValid = await trigger();
    if (isValid) {
      setActiveTab(nextTab); // Forward only if valid
    }
  };

  const handleNext = async () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    const isValid = await trigger();

    if (isValid && currentIndex < TABS_ORDER.length - 1) {
      setActiveTab(TABS_ORDER[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS_ORDER[currentIndex - 1]);
    }
  };
  useEffect(() => {
    if (!isEditMode) {
      const defaultValues = structuredClone(CALL_QUEUE_INIITAL_VALUES);
      reset({
        ...defaultValues,
        extension: generateRandomExtension(),
        settings: {
          ...defaultValues.settings,
          ring_strategy: {
            ...defaultValues.settings.ring_strategy,
            max_wait_time: {
              ...defaultValues.settings.ring_strategy.max_wait_time,
              after_max_wait_time: {
                ...defaultValues.settings.ring_strategy.max_wait_time.after_max_wait_time,
                type: {
                  label: 'Send to voicemail',
                  value: 'VOICEMAIL',
                },
                value: {
                  label: 'Select',
                  value: '',
                },
              },
            },
          },
        },
      });
      setActiveTab(TAB_CONSTANT.BASIC_INFORMATION);
    }
  }, [isEditMode, reset]);

  useEffect(() => {
    if (getObjectLength(user) && !isEditMode) {
      const { user_info = {} } = user || {};
      const obj = {
        label: user_info?.site_detail?.name,
        value: user_info?.site_uuid,
      };
      setValue('site_uuid', obj);
      setValue('settings.operational_hours.regional', user?.settings?.operational_hours?.regional);
      setValue('settings.ring_strategy.max_wait_time.after_max_wait_time.value', {
        label: 'Select',
        value: user?.user_info?.extension || '',
      });
    }
  }, [user, isEditMode, setValue]);

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  /**
   * Point the numbers chosen during create at the queue that has just been made.
   *
   * It has to happen here rather than on the numbers card, because a number
   * stores the queue's id and a queue being created has none. The save endpoint
   * returns only a message, so the new queue is found by its extension - which
   * this form generated, and which is unique within a company.
   *
   * Failure is reported but never blocks the queue itself: the queue exists and
   * is correct, and an admin told "saved" while the numbers were silently
   * dropped would have no way to know which half worked.
   */
  const attachPendingNumbers = async (pendingUuids: string[], extension: string) => {
    try {
      const queues = await callQueueList({ page: 1, limit: 1000 });
      const rows = queues?.data?.data?.result?.rows || [];
      const saved = rows.find((row: any) => String(row?.extension) === String(extension));
      if (!saved?._id) {
        handleAlert({
          text: 'The queue was saved, but its numbers were not attached. Open it and add them.',
          type: 'error',
        });
        return;
      }

      const numbers = await fetchAllPages(allNumbersList);
      const chosen = (numbers as any[]).filter((did) =>
        pendingUuids.includes(String(did?.uuid)),
      );
      const patches = chosen
        .map((did) =>
          buildQueueAttachPatch(did, {
            id: String(saved._id),
            name: String(saved.name || ''),
            extension: String(saved.extension || ''),
          }),
        )
        .filter(Boolean) as any[];

      for (const patch of patches) {
        await callForwarding(patch);
      }
      invalidateNumberLists(queryClient);
    } catch {
      handleAlert({
        text: 'The queue was saved, but its numbers were not attached. Open it and add them.',
        type: 'error',
      });
    }
  };

  const { mutate: callQueueCampaignMutate, isPending } = useMutation({
    mutationFn: upsertCallQueue,
    onSuccess: async (data) => {
      if (data.status === 200) {
        if (queueDetails?.uuid) {
          socketEventsManager?.emit('update-queue', {
            data: {
              type: 'update-queue',
              action: 'update-queue',
              value: queueDetails?.extension,
              uuid: queueDetails?.uuid,
              domain: user?.sip_credentials?.domain,
            },
          });
        }
        handleAlert({
          text: data?.data?.message || 'Call queue saved successfully!',
          type: 'success',
        });
        /* Only on create: an existing queue's numbers are written straight
           away from the card, so there is nothing held back to apply. */
        const pending: string[] = watch('pending_did_uuids') || [];
        if (!queueDetails?._id && pending.length) {
          await attachPendingNumbers(pending, String(watch('extension') || ''));
        }

        queryClient.invalidateQueries({ queryKey: ['callQueueListQueryFn'] });
        setDrawerState(false);
      }
    },
  });

  const onSubmit = () => {
    const operational_hours = watch('settings.operational_hours');
    const display_number = watch('settings.display_number');
    const recording = watch('settings.recording');
    const siteUuid = watch('site_uuid');
    const afterMaxWaitTime = watch('settings.ring_strategy.max_wait_time.after_max_wait_time');
    const greetings = watch('greetings');
    const transcription = watch('settings.transcription');
    const ai_call_monitoring = watch('settings.ai_call_monitoring');
    const wrapupTime = watch('settings.wrapup_time');
    const {
      hold = {},
      welcome = {},
      waiting = {},
      ring_tone = {},
      no_agent_available = {},
      all_agent_busy = {},
      delay = {},
    } = greetings;
    /* Every greeting slot must round-trip uuid + is_default, or a stock/default
       recording resolves to the wrong path and the player shows "Unable to load
       this recording." after a reload. Mirrors IVR's getGreetingConfig. */
    /* `uuid` and `is_default` are deliberately NOT sent.
       The queue schema validates the six named greeting slots as exactly
       {enabled, label, value} and rejects anything else, so the moment the
       greeting picker started carrying a uuid, every queue save failed with
       `"settings.media.waiting.uuid" is not allowed` - no queue could be
       created or edited at all. The `.unknown(true)` on `media` only covers
       greeting slots the schema has not been taught (delay); it does not reach
       inside the six it has.
       Checked before removing them: not one of the 64 live queues carries a
       uuid in media, the switch plays a greeting by its `value` (the file
       name), and the hydrator above already reads these back as undefined for
       every existing queue - so this is the shape queues have always had and
       nothing reads what is being dropped.
       The durable fix is the schema tolerating extra keys per slot the way it
       already tolerates extra slots; that patch is staged for campaign-api in
       backend-patches/campaign-api/patch_queue_media_slot_unknown.py. */
    const queueGreetingConfig = (slot: any) => ({
      enabled: slot?.enabled || false,
      value: slot?.value?.value || '',
      label: slot?.value?.label || '',
    });

    /* country / country_code without their display `name` — the API stores the
       code fields only. */
    const otherValues = { ...(operational_hours.regional.country || {}) };
    delete otherValues.name;
    const otherCountryCodeValues = { ...(operational_hours.regional.country_code || {}) };
    delete otherCountryCodeValues.name;
    const settings = {
      operational_hours: {
        type: operational_hours?.type,
        value: operational_hours?.value || CUSTOM_HOURS_SCHEDULE_OPTIONS,
        holidays: operational_hours?.holidays?.length
          ? getHolidaysPayload(operational_hours.holidays)
          : [],
        regional: {
          timezone: {
            label: operational_hours?.regional?.timezone?.label || '',
            value: operational_hours?.regional?.timezone?.value || '',
          },
          time_format: parseInt(operational_hours?.regional?.time_format) || 12,
          country_code: otherCountryCodeValues,
          country: otherValues,
        },
        closed_hour_action: {
          type: operational_hours?.closed_hour_action?.type?.value || 'HANGUP',
          value: operational_hours?.closed_hour_action?.value?.value || 'HANGUP',
          enabled: operational_hours?.closed_hour_action?.enabled || false,
          personal: operational_hours?.closed_hour_action?.personal || false,
          type_label: operational_hours?.closed_hour_action?.type?.label,
          label: operational_hours?.closed_hour_action?.value?.label || 'Hangup',
          value_label: operational_hours?.closed_hour_action?.value?.label,
        },
        /* Read from holidays_action, not copied from closed_hour_action. The form
           hydrates holidays_action from the saved record, but this builder
           overwrote it with the closed-hours action on every save — so any
           distinct holiday behaviour was destroyed the next time the queue was
           touched, which is why all twenty live queues hold identical closed-hours
           and holiday actions. Closed hours remains the fallback, so a queue that
           never had a separate holiday action behaves exactly as before. */
        holidays_action: {
          type:
            operational_hours?.holidays_action?.type?.value ||
            operational_hours?.closed_hour_action?.type?.value ||
            'HANGUP',
          value:
            operational_hours?.holidays_action?.value?.value ||
            operational_hours?.closed_hour_action?.value?.value ||
            'HANGUP',
          enabled:
            operational_hours?.holidays_action?.enabled ??
            operational_hours?.closed_hour_action?.enabled ??
            false,
          personal:
            operational_hours?.holidays_action?.personal ??
            operational_hours?.closed_hour_action?.personal ??
            false,
          type_label:
            operational_hours?.holidays_action?.type?.label ||
            operational_hours?.closed_hour_action?.type?.label,
          label:
            operational_hours?.holidays_action?.value?.label ||
            operational_hours?.closed_hour_action?.value?.label ||
            'Hangup',
          value_label:
            operational_hours?.holidays_action?.value?.label ||
            operational_hours?.closed_hour_action?.value?.label,
        },
      },
      wrapup_time: parseInt(wrapupTime),
      /* Agent screen capture on this queue's calls: the softphone reads it off
         the queue record when a call arrives. */
      screen_capture: watch('settings.screen_capture') === true,
      recording,
      display_number: {
        incoming: display_number?.incoming,
        masking: {
          type: display_number?.masking?.type?.value || '',
          label: display_number?.masking?.type?.label || '',
          value: display_number?.masking?.value || '',
        },
      },
      transcription: transcription,
      ai_call_monitoring: ai_call_monitoring,
      /* Sent whole. `settings` is rebuilt from this whitelist on every save
         rather than spread from what was stored, so anything missing here is
         dropped from the record — the same way a separate holiday action used
         to be destroyed on every save. */
      /* `waiting`, `after_call` and `escalation` are sent whole. The queue
         service's schema accepts all three (checked against the live bundle on
         7 Sep 2026) and tolerates keys it has not been taught, so the earlier
         "send them and the whole save fails" reason is gone. The switch acts on
         position announcements today; the rest are stored until their services
         read them. Defaults fill anything the form never touched, so an older
         queue saves the same shape as a new one. */
      waiting: {
        ...WAITING_DEFAULTS,
        ...(watch('settings.waiting') || {}),
        callback: { ...WAITING_DEFAULTS.callback, ...((watch('settings.waiting') || {}).callback || {}) },
      },
      after_call: {
        ...AFTER_CALL_DEFAULTS,
        ...(watch('settings.after_call') || {}),
        last_agent: { ...AFTER_CALL_DEFAULTS.last_agent, ...((watch('settings.after_call') || {}).last_agent || {}) },
        service_level: { ...AFTER_CALL_DEFAULTS.service_level, ...((watch('settings.after_call') || {}).service_level || {}) },
      },
      escalation: { ...ESCALATION_DEFAULTS, ...(watch('settings.escalation') || {}) },
      /* Which skills the queue asks for, and the lowest rating that counts. */
      routing: {
        ...ROUTING_DEFAULTS,
        ...(watch('settings.routing') || {}),
        required_skills: (watch('settings.routing.required_skills') || []).map(String),
      },
      ring_strategy: {
        value: watch('settings.ring_strategy.value.value'),
        leave_room_if_no_agent: watch('settings.ring_strategy.leave_room_if_no_agent') ?? true,
        max_wait_time: {
          callers: watch('settings.ring_strategy.max_wait_time.callers').value,
          queue_timeout: watch('settings.ring_strategy.max_wait_time.queue_timeout')?.toString(),
          after_max_wait_time: {
            type: afterMaxWaitTime?.type?.value,
            value: afterMaxWaitTime?.value?.value,
            name: afterMaxWaitTime?.value?.label,
            personal: afterMaxWaitTime?.personal,
          },
        },
      },
      media: {
        welcome: queueGreetingConfig(welcome),
        hold: queueGreetingConfig(hold),
        waiting: queueGreetingConfig(waiting),
        ring_tone: queueGreetingConfig(ring_tone),
        no_agent_available: queueGreetingConfig(no_agent_available),
        all_agent_busy: queueGreetingConfig(all_agent_busy),
        delay: {
          ...queueGreetingConfig(delay),
          interval_seconds: Number(delay?.interval_seconds) || DELAY_GREETING_DEFAULT_INTERVAL,
        },
      },
    };

    /* Anything the queue already had that this builder does not rebuild is carried
       through untouched.

       Every key above is written out field by field, which means a key the backend
       starts storing — or one an older queue holds and this form has no input for —
       is dropped the next time anybody presses Save. That is not hypothetical: the
       holidays_action comment above records the same shape of loss reaching all
       twenty live queues before it was caught.

       Checked against the live data when this was written: all eight stored keys are
       rebuilt, so today this changes nothing. It is here so the next key added does
       not have to be lost first to be noticed. */
    const storedSettings = (queueInfo as any)?.settings ?? {};
    const rebuiltKeys = new Set(Object.keys(settings));
    Object.keys(storedSettings).forEach((key) => {
      if (!rebuiltKeys.has(key)) {
        (settings as any)[key] = storedSettings[key];
      }
    });

    // Remove duplicates from members array before sending payload for safety
    const members =
      watch('members')?.map((m: any) => {
        const memberPayload = { ...m };
        delete memberPayload.label;
        delete memberPayload.value;
        delete memberPayload.ring_time;
        memberPayload.timeout = seedDeviceRingTime(
          m.ring_time ?? m.timeout,
          companySettings,
        ).value;
        return memberPayload;
      }) || [];
    /* Keyed on the id, falling back to the extension. Keying on the id alone
       collapsed the whole queue to one person whenever the people list came
       back under the other id spelling and every member's was blank. */
    const uniqueMembers = dedupeMembers(members);
    const manager = { ...(watch('manager') || {}) };
    delete manager.label;
    delete manager.value;
    const payload = {
      name: watch('name'),
      extension: watch('extension')?.toString() || '',
      description: watch('description'),
      site: {
        name: siteUuid?.label ?? '',
        site_uuid: siteUuid?.value ?? null,
      },
      // site_uuid: siteUuid?.value ?? null,
      settings,
      members: uniqueMembers,
      manager: manager,
      script: watch('script')?.value || '',
      agentDisposition: watch('agentDisposition')?.map(({ _id, disposition }: any) => ({
        _id,
        disposition: {
          name: disposition?.name || '',
        },
      })),
      ...(queueDetails?._id && { uuid: queueDetails._id }),
    };

    callQueueCampaignMutate(payload);
  };

  useEffect(() => {
    if (!isEditMode || !isFetched || !getObjectLength(queueInfo)) return;

    const media = queueInfo?.settings?.media;
    setValue('name', queueInfo?.name);
    setValue('extension', queueInfo?.extension);
    setValue('description', queueInfo?.description);
    setValue('settings.wrapup_time', queueInfo?.settings?.wrapup_time);
    setValue('settings.screen_capture', queueInfo?.settings?.screen_capture === true);
    setValue('site_uuid', {
      label: queueInfo?.site_uuid?.name || '',
      value: queueInfo?.site_uuid?.site_uuid || '',
    });
    // Reconstruct members with label and value for UI consistency
    const uniqueMembers = queueInfo?.members
      ? dedupeMembers(queueInfo.members).map(
          (m: any) => ({
            ...m,
            label: m.label || m.name || `${m.first_name} ${m.last_name}`,
            value: m.value || m.extension,
            ring_time: hydrateMemberRingTime(m.ring_time ?? m.timeout),
          }),
        )
      : [];
    setValue('members', uniqueMembers);

    // Reconstruct manager with label and value
    if (queueInfo?.manager) {
      setValue('manager', {
        ...queueInfo.manager,
        label:
          queueInfo.manager.label ||
          queueInfo.manager.name ||
          `${queueInfo.manager.first_name} ${queueInfo.manager.last_name}`,
        value: queueInfo.manager.value || queueInfo.manager.extension,
      });
    }

    /* Read uuid + is_default back too — see queueGreetingConfig on the save
       side. Without them a stored stock recording plays once and then fails
       with "Unable to load this recording." after a reload. */
    const hydrateGreetingSlot = (slot: any) => ({
      enabled: slot?.enabled || false,
      value: {
        label: slot?.label || '',
        value: slot?.value ?? '',
        uuid: slot?.uuid,
        is_default: slot?.is_default,
      },
    });

    setValue('greetings', {
      welcome: hydrateGreetingSlot(media?.welcome),
      hold: hydrateGreetingSlot(media?.hold),
      waiting: hydrateGreetingSlot(media?.waiting),
      ring_tone: hydrateGreetingSlot(media?.ring_tone),
      no_agent_available: hydrateGreetingSlot(media?.no_agent_available),
      all_agent_busy: hydrateGreetingSlot(media?.all_agent_busy),
      delay: {
        ...hydrateGreetingSlot(media?.delay),
        interval_seconds: Number(media?.delay?.interval_seconds) || DELAY_GREETING_DEFAULT_INTERVAL,
      },
    });
    const operational_hours = queueInfo?.settings?.operational_hours;
    const recording = queueInfo?.settings?.recording;
    const display_number = queueInfo?.settings?.display_number;
    const ring_strategy = queueInfo?.settings?.ring_strategy;
    const storedWaiting = queueInfo?.settings?.waiting;
    const storedAfterCall = queueInfo?.settings?.after_call;
    const storedEscalation = queueInfo?.settings?.escalation;
    const transcription = queueInfo?.settings?.transcription;
    const ai_call_monitoring = queueInfo?.settings?.ai_call_monitoring;
    const wrapup_time = queueInfo?.settings?.wrapup_time;

    const ringStrategyLabel = CALL_DISTRIBUTION_DATA.find(
      (item: any) => item?.value === ring_strategy?.value,
    )?.label;

    const scriptLabel = scriptList?.find((item: any) => item._id === queueInfo?.script)?.name;
    setValue('script', { label: scriptLabel || '', value: queueInfo?.script || '' });
    setValue('script_enabled', !!queueInfo?.script);

    setValue('agentDisposition', queueInfo?.agentDisposition || []);

    const settingsValues = {
      operational_hours: {
        type: operational_hours?.type || '24_hours',
        value: operational_hours?.value,
        holidays:
          operational_hours?.holidays && operational_hours?.holidays?.length
            ? getHolidaysFormVal(operational_hours?.holidays)
            : [],
        regional: {
          ...operational_hours?.regional,
          timezone: {
            label:
              operational_hours?.regional?.timezone?.label ||
              operational_hours?.regional?.timezone ||
              '',
            value:
              operational_hours?.regional?.timezone?.value ||
              operational_hours?.regional?.timezone ||
              '',
          },
          country: {
            label:
              operational_hours?.regional?.country?.label ||
              operational_hours?.regional?.country?.value ||
              operational_hours?.regional?.country ||
              '',
            value:
              operational_hours?.regional?.country?.value ||
              operational_hours?.regional?.country ||
              '',
          },
          country_code: {
            label:
              operational_hours?.regional?.country_code?.label ||
              operational_hours?.regional?.country_code?.value ||
              operational_hours?.regional?.country_code ||
              '',
            value:
              operational_hours?.regional?.country_code?.value ||
              operational_hours?.regional?.country_code ||
              '',
          },
        },
        closed_hour_action: {
          type: {
            label: operational_hours?.closed_hour_action?.type_label || '',
            value: operational_hours?.closed_hour_action?.type || '',
          },
          value: {
            label: operational_hours?.closed_hour_action?.value_label || '',
            value: operational_hours?.closed_hour_action?.value || '',
          },
          enabled: operational_hours?.closed_hour_action?.enabled,
          personal: operational_hours?.closed_hour_action?.personal,
        },
        holidays_action: {
          type: {
            label: operational_hours?.holidays_action?.type_label || '',
            value: operational_hours?.holidays_action?.type || '',
          },
          value: {
            label: operational_hours?.holidays_action?.value_label || '',
            value: operational_hours?.holidays_action?.value || '',
          },
          enabled: operational_hours?.holidays_action?.enabled,
          personal: operational_hours?.holidays_action?.personal,
        },
      },
      recording: recording,
      display_number: {
        incoming: display_number?.incoming,
        masking: {
          type: {
            label: display_number?.masking?.label || 'None',
            value: display_number?.masking?.type || 'N',
          },
          value: display_number?.masking?.value || '',
        },
      },
      ring_strategy: {
        value: { label: ringStrategyLabel || '', value: ring_strategy?.value },
        leave_room_if_no_agent: ring_strategy?.leave_room_if_no_agent ?? true,
        max_wait_time: {
          callers: {
            label: ring_strategy?.max_wait_time?.callers,
            value: ring_strategy?.max_wait_time?.callers,
          },
          queue_timeout: Number(ring_strategy?.max_wait_time?.queue_timeout || 0),

          after_max_wait_time: {
            personal: ring_strategy?.max_wait_time?.after_max_wait_time?.personal,
            name: ring_strategy?.max_wait_time?.after_max_wait_time?.name || '',
            type: {
              label:
                callForwardingOptions?.find(
                  (option) =>
                    option.value === ring_strategy?.max_wait_time?.after_max_wait_time?.type,
                )?.label || '',
              value: ring_strategy?.max_wait_time?.after_max_wait_time?.type || '',
            },
            value: {
              label: ring_strategy?.max_wait_time?.after_max_wait_time?.name || '',
              value: ring_strategy?.max_wait_time?.after_max_wait_time?.value || '',
            },
          },
        },
      },
      transcription: transcription,
      ai_call_monitoring: ai_call_monitoring,
      wrapup_time: wrapup_time,
      screen_capture: queueInfo?.settings?.screen_capture === true,
      /* Merged over the defaults rather than replacing them, so a queue saved
         before these settings existed opens with sensible values instead of
         undefined fields the inputs cannot render. */
      waiting: {
        ...WAITING_DEFAULTS,
        ...(storedWaiting || {}),
        callback: { ...WAITING_DEFAULTS.callback, ...(storedWaiting?.callback || {}) },
      },
      escalation: { ...ESCALATION_DEFAULTS, ...(storedEscalation || {}) },
      routing: { ...ROUTING_DEFAULTS, ...(queueInfo?.settings?.routing || {}) },
      after_call: {
        ...AFTER_CALL_DEFAULTS,
        ...(storedAfterCall || {}),
        last_agent: { ...AFTER_CALL_DEFAULTS.last_agent, ...(storedAfterCall?.last_agent || {}) },
        service_level: {
          ...AFTER_CALL_DEFAULTS.service_level,
          ...(storedAfterCall?.service_level || {}),
        },
      },
    };

    setValue('settings', settingsValues);
  }, [isEditMode, isFetched, queueInfo, scriptList, setValue]);
  return (
    <>
      <FormProvider {...formInstance}>
        <form
          onSubmit={formInstance.handleSubmit(onSubmit)}
          className="mcm-page mcm-userform flex h-full min-h-0 w-full flex-col justify-between gap-3 pt-2 sm:gap-4 sm:pt-3"
        >
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex min-h-0 w-full flex-1 flex-col gap-3"
          >
            <div className="w-full overflow-x-auto overflow-y-hidden border-b border-gray-200">
              <TabsList className="flex min-h-11 w-max min-w-full rounded-none p-0 text-center text-sm font-semibold">
                {Object.entries(TAB_CONSTANT).map(([key, value]) => (
                  <TabsTrigger
                    key={key}
                    value={value}
                    className="relative flex h-full shrink-0 cursor-pointer gap-1 rounded-none border-b-2 px-4 py-3 font-semibold whitespace-nowrap text-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-2xs sm:px-6"
                  >
                    {value}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value={TAB_CONSTANT.BASIC_INFORMATION} className="mt-0 min-h-0 flex-1">
              <BasicInformation {...{ queueDetails }} />
            </TabsContent>
            <TabsContent value={TAB_CONSTANT.ADD_MEMBERS} className="mt-0 min-h-0 flex-1">
              <AddMembers />
            </TabsContent>
            <TabsContent value={TAB_CONSTANT.SETTINGS} className="mt-0 min-h-0 flex-1">
              <div className="h-full min-h-0 overflow-y-auto pr-1">
                <CommonSettingPermission
                  isChooseTemplate={false}
                  customClass="h-full min-h-0"
                  data={{ settings }}
                  origin="queue"
                />
              </div>
            </TabsContent>
            <TabsContent value={TAB_CONSTANT.GREETING_NOTIFICATION} className="mt-0 min-h-0 flex-1">
              <GreetingNotification />
            </TabsContent>
            <TabsContent value={TAB_CONSTANT.RING_STRATEGY} className="mt-0 min-h-0 flex-1">
              <RingStrategy />
            </TabsContent>
            <TabsContent value={TAB_CONSTANT.QUEUE_SETTINGS} className="mt-0 min-h-0 flex-1">
              <QueueSettings {...{ scriptList, setModalState }} />
            </TabsContent>
          </Tabs>

          <div className="flex flex-nowrap items-center justify-between gap-2 border-t border-gray-200 pt-3 sm:justify-end sm:pt-4">
            <Button
              type="button"
              variant={'transparent'}
              onClick={() => setDrawerState(false)}
              className="min-w-0 flex-1 px-3 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant={'outline'}
              type="button"
              onClick={handlePrev}
              disabled={activeTab === TABS_ORDER[0]}
              className="min-w-0 flex-1 px-3 sm:flex-none"
            >
              Prev
            </Button>
            {activeTab !== TAB_CONSTANT.GREETING_NOTIFICATION && (
              <Button
                variant={'outline'}
                type="button"
                onClick={handleNext}
                className="min-w-0 flex-1 px-3 sm:flex-none"
              >
                Next
              </Button>
            )}
            {activeTab === TAB_CONSTANT.GREETING_NOTIFICATION && (
              <Button
                variant={'primary'}
                type="submit"
                disabled={isPending}
                className="min-w-0 flex-1 px-3 sm:flex-none"
              >
                {isPending ? 'Submiting...' : 'Submit'}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
      {modalState && (
        <DispositionModal modalState={modalState} setModalState={() => setModalState(false)} />
      )}
    </>
  );
};

export default AddCallQueue;
