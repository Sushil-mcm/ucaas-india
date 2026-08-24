import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/assets/icons/icon';
import {
  deleteAIReceptionist,
  getAIReceptionistList,
  getAIAgentToken,
  updateAiReceptionist,
  allNumbersList,
  getAIAgentType,
} from '@/services/api';
import { convertDateFormateApis, getAiWidgetScriptUrl, handleAlert } from '@/lib/utils';
import {
  Briefcase,
  Grid2X2,
  Home,
  MessageSquare,
  Stethoscope,
  Pencil,
  Trash2,
  UserRound,
  Edit3,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

import { SearchLine } from '@/assets/icons';
import CreateAiReceptionist from './create-ai-receptionist';
import TableManager from '@/components/custom/table-manager';
import CustomTooltip from '@/components/custom/custom-tooltip';
import AlertConfirm from '@/components/custom/alert-confirm';
import { FORWARD_TYPES_LABEL } from '@/components/custom/forward-action-all';
import { useForm } from 'react-hook-form';
import PromptModal from './update-prompt';
import ForwardActionAllAi from './forward-action-all-ai';
import {
  useGetDepartment,
  useGetExtensions,
  useGetGreetings,
  useGetIVR,
  useGetQueueList,
} from '@/hooks/common';
import { useUser } from '@/hooks/use-user';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocation, useNavigate } from 'react-router-dom';
import { IUSERS } from '@/interfaces/extension-interface';
import NumberWithFlag from '@/components/custom/number-with-flag';
import AssignDIDNumberModal from './assign-did-number-modal';
import { useCompanyFeatures } from '@/hooks/rbac';

type BuildMode = 'scratch' | 'template';
type KnowledgeBasePreselect = { ingestionId: string; type: 'text' | 'url' | 'pdf' } | null;
const AI_RECEPTIONIST_KB_RETURN_STATE_KEY = 'ai_receptionist_kb_return_state';
const CALL_EMBED_SCRIPT_ID = 'ai-receptionist-call-widget-script';

const ICON_MAP: Record<string, any> = {
  'customer-support-chat': MessageSquare,
  'healthcare-chat': Stethoscope,
  'real-estate-chat': Home,
  'legal-services-chat': Briefcase,
  'finance-banking-chat': Briefcase,
  voice: Briefcase,
};

const getAi360WidgetKey = (agent: any) => String(agent?.widgetKey || '').trim();

const unloadAi360CallWidget = () => {
  const existing = document.getElementById(CALL_EMBED_SCRIPT_ID);
  if (existing) existing.remove();

  document.querySelectorAll('[id^="ai360-widget-call-"]').forEach((el) => el.remove());
};

const sentimentBadgeClass = (sentiment: string) => {
  if (sentiment === 'positive') return 'bg-emerald-100 text-emerald-700';
  if (sentiment === 'negative') return 'bg-red-100 text-red-700';
  if (sentiment === 'neutral') return 'bg-slate-100 text-slate-700';
  return 'bg-gray-100 text-gray-500';
};

const sentimentScoreText = (counts: any) => {
  const positive = Number(counts?.positive || 0);
  const neutral = Number(counts?.neutral || 0);
  const negative = Number(counts?.negative || 0);
  if (!positive && !neutral && !negative) return '';
  return `Positive ${positive} / Neutral ${neutral} / Negative ${negative}`;
};

const ForwardTypeCell = ({ data, onUpdate, optionsData, userExtension }: any) => {
  const originalBusinessHours = data.forward_call_actions?.call_handling?.business_hours || {};
  const originalType = originalBusinessHours.type || 'VOICEMAIL';
  const originalTypeLabel =
    (originalType && FORWARD_TYPES_LABEL[originalType as keyof typeof FORWARD_TYPES_LABEL]) ||
    originalType;
  const showForwardToForType = (type?: string) => type !== 'HANGUP';
  const getForwardValueFieldLabel = (type?: string) => {
    switch (type) {
      case 'GREETING':
        return 'Announcement';
      case 'EXTENSION':
        return 'Extension';
      case 'VOICEMAIL':
        return 'Voicemail';
      case 'DEPARTMENT':
        return 'Group';
      case 'IVR':
        return 'IVR';
      case 'QUEUE':
        return 'Queue';
      case 'PHONE':
        return 'Phone Number';
      default:
        return 'Forward To';
    }
  };
  const extensionList = optionsData?.extensionList || [];
  const greetingList = optionsData?.greetingList || [];
  const departmentList = optionsData?.departmentList || [];
  const IVRList = optionsData?.IVRList || [];
  const queueList = optionsData?.queueList || [];

  const getResolvedForwardValueLabel = useCallback(
    (type: string, value: any, isPersonal?: boolean) => {
      const rawValue = String(value || '').trim();
      if (!rawValue) return '';

      if (type === 'VOICEMAIL' && isPersonal) return 'My Voicemail';

      if (type === 'EXTENSION' || type === 'VOICEMAIL') {
        const matched = Array.isArray(extensionList)
          ? extensionList.find((ext: any) => {
              const extNo = String(ext?.extension || '').trim();
              const extUuid = String(ext?.uuid || '').trim();
              const extUserUuid = String(ext?.user_uuid || ext?.userId || '').trim();
              return rawValue === extNo || rawValue === extUuid || rawValue === extUserUuid;
            })
          : null;
        if (matched) {
          return `${matched?.first_name || ''}${matched?.last_name ? ` ${matched.last_name}` : ''}`.trim();
        }

        const looksLikeUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            rawValue,
          );
        if (!looksLikeUuid) return rawValue;
      }

      if (type === 'GREETING') {
        const matched = Array.isArray(greetingList)
          ? greetingList.find((g: any) => String(g?.filename || '') === rawValue)
          : null;
        return matched?.name || '';
      }

      if (type === 'DEPARTMENT') {
        const matched = Array.isArray(departmentList)
          ? departmentList.find((d: any) => String(d?.uuid || '') === rawValue)
          : null;
        return matched?.name || '';
      }

      if (type === 'IVR') {
        const matched = Array.isArray(IVRList)
          ? IVRList.find((i: any) => String(i?.uuid || '') === rawValue)
          : null;
        return matched?.name || '';
      }

      if (type === 'QUEUE') {
        const matched = Array.isArray(queueList)
          ? queueList.find((q: any) =>
              [q?.uuid, q?._id, q?.id].map((id) => String(id || '')).includes(rawValue),
            )
          : null;
        return matched?.name || '';
      }

      if (type === 'PHONE') return rawValue;

      return '';
    },
    [extensionList, greetingList, departmentList, IVRList, queueList],
  );

  const resolvedOriginalValueLabel = useMemo(
    () =>
      getResolvedForwardValueLabel(
        originalType,
        originalBusinessHours.value,
        originalBusinessHours.personal,
      ),
    [
      getResolvedForwardValueLabel,
      originalType,
      originalBusinessHours.value,
      originalBusinessHours.personal,
    ],
  );
  const isGenericOriginalLabel =
    !originalBusinessHours.label ||
    originalBusinessHours.label === 'Select' ||
    originalBusinessHours.label === originalTypeLabel;
  const initialForwardValueLabel = originalBusinessHours.personal
    ? 'My Voicemail'
    : isGenericOriginalLabel
      ? resolvedOriginalValueLabel
      : originalBusinessHours.label;
  const originalValueLabel = showForwardToForType(originalType)
    ? originalBusinessHours.personal
      ? 'My Voicemail'
      : isGenericOriginalLabel
        ? resolvedOriginalValueLabel || '-'
        : originalBusinessHours.label
    : '-';

  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const {
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      forwardState: {
        type: {
          label: originalTypeLabel,
          value: originalType,
        },
        value: {
          label: initialForwardValueLabel || 'Select',
          value: originalBusinessHours.value || '',
        },
        personal: originalBusinessHours.personal ?? false,
      },
    },
  });

  useEffect(() => {
    if (!isUpdating) {
      reset({
        forwardState: {
          type: {
            label: originalTypeLabel,
            value: originalType,
          },
          value: {
            label: initialForwardValueLabel || 'Select',
            value: originalBusinessHours.value || '',
          },
          personal: originalBusinessHours.personal ?? false,
        },
      });
    }
  }, [JSON.stringify(originalBusinessHours), isUpdating, initialForwardValueLabel]);

  const watchAll = watch();
  const currentValues = watchAll.forwardState || {};
  const hasChanged =
    currentValues.type?.value !== originalType ||
    currentValues.value?.value !== (originalBusinessHours.value || '') ||
    currentValues.personal !== (originalBusinessHours.personal ?? false);

  const handleUpdateClick = () => {
    const formValues = getValues('forwardState');
    const selectedType = formValues.type.value;
    const shouldShowForwardTo = showForwardToForType(selectedType);
    const businessHours = {
      type: selectedType,
      value: shouldShowForwardTo ? formValues.value.value : '',
      label: shouldShowForwardTo
        ? formValues.value.label || formValues.type.label
        : formValues.type.label,
      personal: formValues.personal,
    };
    setIsUpdating(true);
    onUpdate(data, businessHours, (success: boolean) => {
      setIsUpdating(false);
      if (success) {
        setIsEditModalOpen(false);
      } else {
        reset();
      }
    });
  };

  const selectedTypeLabel =
    currentValues.type?.label ||
    FORWARD_TYPES_LABEL[currentValues.type?.value as keyof typeof FORWARD_TYPES_LABEL] ||
    originalTypeLabel;
  const shouldShowForwardTo = showForwardToForType(currentValues.type?.value || originalType);
  const summaryShouldShowForwardTo = showForwardToForType(originalType);
  const forwardValueFieldLabel = getForwardValueFieldLabel(originalType);
  const resolvedCurrentValueLabel = getResolvedForwardValueLabel(
    currentValues.type?.value || originalType,
    currentValues.value?.value,
    currentValues.personal,
  );
  const currentLabel = currentValues.value?.label;
  const isGenericCurrentLabel =
    !currentLabel || currentLabel === 'Select' || currentLabel === selectedTypeLabel;
  const selectedValueLabel = shouldShowForwardTo
    ? currentValues.type?.value === 'VOICEMAIL' && currentValues.personal
      ? 'My Voicemail'
      : !isGenericCurrentLabel
        ? currentLabel
        : resolvedCurrentValueLabel || originalValueLabel
    : '-';

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className={`min-w-0 ${summaryShouldShowForwardTo ? '' : 'flex-1'}`}>
            <p className="text-xs xxl:text-sm text-gray-500">Forward Type</p>
            <p className="truncate text-xs xxl:text-sm font-medium text-gray-900">
              {originalTypeLabel}
            </p>
          </div>
          {showForwardToForType(originalType) && (
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{forwardValueFieldLabel}</p>
              <p className="truncate text-xs xxl:text-sm font-medium text-gray-900">
                {originalValueLabel}
              </p>
            </div>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          if (!open && isUpdating) return;
          setIsEditModalOpen(open);
          if (!open) reset();
        }}
      >
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Forwarding Destination</DialogTitle>
          </DialogHeader>
          <div className="pt-1">
            <ForwardActionAllAi
              watch={watch}
              setValue={setValue}
              forwardType="forwardState.type"
              forwardValue="forwardState.value"
              enableVoicemailChoice={true}
              voicemailPersonalField="forwardState.personal"
              optionsData={optionsData}
              userExtension={userExtension}
              forwardTypeError={(errors as any)?.forwardState?.type?.message || ''}
              forwardValueError={(errors as any)?.forwardState?.value?.message || ''}
              forwardTypeClass="w-full"
              forwardValueClass="w-full"
              selectCustomClassSecond="w-full"
            />
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Selected</p>
              <p className="text-sm font-medium text-gray-900">
                {shouldShowForwardTo
                  ? `${selectedTypeLabel} - ${selectedValueLabel}`
                  : selectedTypeLabel}
              </p>
            </div>
          </div>
          <DialogFooter className="sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                reset();
                setIsEditModalOpen(false);
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdateClick} disabled={isUpdating || !hasChanged}>
              {isUpdating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AiReceptionist = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<
    'list' | 'build-choice' | 'template-choice' | 'create-scratch'
  >('list');
  console.log(activeView, 'activeeee');

  const [selectedBuildMode, setSelectedBuildMode] = useState<BuildMode | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const { features } = useCompanyFeatures();
  const agentAccess = features?.plan_features?.ai?.action?.agent;
  const [initialReceptionistStep, setInitialReceptionistStep] = useState(0);
  const [preselectKnowledgeBase, setPreselectKnowledgeBase] =
    useState<KnowledgeBasePreselect>(null);
  const [receptionistDraft, setReceptionistDraft] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false);

  const [deleteAgent, setDeleteAgent] = useState<any>(null);
  const queryClient: any = useQueryClient();

  const { data: agentTypeData } = useQuery({
    queryKey: ['getAIAgentType'],
    queryFn: () => getAIAgentType({ type: 'voice' }),
    enabled: activeView !== 'list',
  });

  const dynamicTemplateOptions = useMemo(() => {
    const rawApiData = agentTypeData?.data?.result || agentTypeData?.data || [];
    return rawApiData.map((item: any) => ({
      id: item.value,
      name: item.label,
      description: item.welcome_greeting,
      icon: ICON_MAP[item.value] || Briefcase,
    }));
  }, [agentTypeData]);

  const { data: extensionList = [] } = useGetExtensions({
    page: 1,
    limit: 1000,
    filters: [],
    search: '',
  });
  const { greetingList = [] } = useGetGreetings({ displayType: 'dropdown' });
  const { data: departmentList = [] } = useGetDepartment({ displayType: 'dropdown' });
  const { data: IVRList = [] } = useGetIVR({ displayType: 'dropdown' });
  const { data: queueList = [] } = useGetQueueList({ displayType: 'dropdown' });

  const forwardingOptionsData = useMemo(
    () => ({
      extensionList,
      greetingList,
      departmentList,
      IVRList,
      queueList,
    }),
    [extensionList, greetingList, departmentList, IVRList, queueList],
  );

  useEffect(() => {
    const navState = (location.state || {}) as {
      openCreateReceptionist?: boolean;
      returnToStep?: number;
      preselectKnowledgeBase?: { ingestionId?: string; type?: 'text' | 'url' | 'pdf' };
      returnToState?: Record<string, any>;
      editData?: any;
      selectedBuildMode?: BuildMode;
      selectedTemplateName?: string;
      selectedTemplateId?: string;
      receptionistDraft?: any;
    };

    if (navState.openCreateReceptionist) {
      let returnState: Record<string, any> = navState.returnToState || {};
      const hasReturnState = Object.keys(returnState).length > 0;
      const hasFlattenedState =
        navState.receptionistDraft ||
        navState.editData ||
        navState.selectedBuildMode ||
        navState.selectedTemplateName ||
        navState.selectedTemplateId;

      if (!hasReturnState && hasFlattenedState) {
        returnState = navState;
      }

      if (!hasReturnState && !hasFlattenedState) {
        try {
          const cached = window.sessionStorage.getItem(AI_RECEPTIONIST_KB_RETURN_STATE_KEY);
          if (cached) {
            returnState = JSON.parse(cached);
          }
        } catch (error) {
          console.warn('Unable to read cached AI Receptionist return state.', error);
        }
      }

      setEditData(returnState.editData ?? null);
      setSelectedBuildMode((returnState.selectedBuildMode as BuildMode) || 'scratch');
      setSelectedTemplateName(returnState.selectedTemplateName || '');
      setSelectedTemplateId(returnState.selectedTemplateId || '');
      setReceptionistDraft(returnState.receptionistDraft || null);
      setInitialReceptionistStep(
        Number.isFinite(navState.returnToStep) ? Number(navState.returnToStep) : 2,
      );
      if (navState.preselectKnowledgeBase?.ingestionId && navState.preselectKnowledgeBase?.type) {
        setPreselectKnowledgeBase({
          ingestionId: String(navState.preselectKnowledgeBase.ingestionId),
          type: navState.preselectKnowledgeBase.type,
        });
      } else {
        setPreselectKnowledgeBase(null);
      }
      setActiveView('create-scratch');
      try {
        window.sessionStorage.removeItem(AI_RECEPTIONIST_KB_RETURN_STATE_KEY);
      } catch (error) {
        console.warn('Unable to clear cached AI Receptionist return state.', error);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const { data: numbersData } = useQuery({
    queryKey: ['allNumbersList', { perPage: 1000, page: 1, filters: [] }],
    queryFn: () => allNumbersList({ perPage: 1000, page: 1, filters: [] }),
  });

  const numberOptions = useMemo(() => {
    const numbers = numbersData?.data?.data?.result?.rows || [];
    const options = numbers.map((num: any) => ({
      label: num.did_number,
      value: num.uuid,
      is_assigned: !!(num.forward_call_actions || num.User),
    }));

    return [{ label: 'Not assigned', value: '' }, ...options];
  }, [numbersData]);

  const availableNumberOptions = useMemo(() => {
    return numberOptions.filter((opt: any) => opt.value === '' || !opt.is_assigned);
  }, [numberOptions]);

  console.log('availableNumberOptions', availableNumberOptions);

  const { mutate: mutateDeleteAgent, isPending: isDeletePending } = useMutation({
    mutationKey: ['deleteAIReceptionist'],
    mutationFn: deleteAIReceptionist,
    onSuccess: ({ data }: any) => {
      setDeleteAgent(null);
      queryClient.invalidateQueries(['getAIReceptionistList'], { exact: true });
      handleAlert({
        text: data?.data?.message || 'Agent deleted successfully!',
        type: 'success',
      });
    },
  });

  const { mutateAsync: fetchToken, isPending: isPendingToken } = useMutation({
    mutationFn: getAIAgentToken,
    mutationKey: ['getAIAgentToken'],
  });

  const { mutate: mutateUpdateAgent } = useMutation({
    mutationFn: updateAiReceptionist,
    onSuccess: () => {
      queryClient.invalidateQueries(['getAIReceptionistList']);
      handleAlert({ text: 'Updated successfully!', type: 'success' });
    },
    onError: (err: any) => {
      console.error('Failed to update:', err);
      handleAlert({ text: 'Failed to update.', type: 'error' });
    },
  });

  const handleInlineUpdate = useCallback(
    async (rowOriginal: any, businessHours: any, onStatus?: (success: boolean) => void) => {
      let token = '';
      try {
        const tokenRes = await fetchToken();
        token = tokenRes?.data?.data?.result?.tokenId || '';
      } catch (error) {
        console.error('Failed to fetch token:', error);
      }

      const payload = {
        ...rowOriginal,
        agentId: rowOriginal.agent_uuid || rowOriginal.id,
        token,
        forward_call_actions: {
          ...(rowOriginal.forward_call_actions || {}),
          call_handling: {
            ...(rowOriginal.forward_call_actions?.call_handling || {}),
            business_hours: {
              ...businessHours,
            },
          },
        },
      };
      const {
        agent_uuid,
        uuid,
        did_uuid,
        company_uuid,
        created_at,
        updated_at,
        useMessageExactly,
        ...upadedData
      } = payload;
      console.warn(
        'agent_uuid',
        did_uuid,
        agent_uuid,
        uuid,
        company_uuid,
        created_at,
        useMessageExactly,
        updated_at,
      );

      mutateUpdateAgent(upadedData, {
        onSuccess: () => {
          onStatus?.(true);
        },
        onError: () => {
          onStatus?.(false);
        },
      });
    },
    [fetchToken, mutateUpdateAgent],
  );

  const handleStatusUpdate = useCallback(
    async (rowOriginal: any, newStatus: string) => {
      let token = '';
      try {
        const tokenRes = await fetchToken();
        token = tokenRes?.data?.data?.result?.tokenId || '';
      } catch (error) {
        console.error('Failed to fetch token:', error);
      }

      const payload = {
        ...rowOriginal,
        agentId: rowOriginal.agent_uuid || rowOriginal.id,
        token,
        status: newStatus,
      };
      const {
        agent_uuid,
        uuid,
        did_uuid,
        company_uuid,
        created_at,
        updated_at,
        useMessageExactly,
        ...upadedData
      } = payload;
      void agent_uuid;
      void uuid;
      void did_uuid;
      void company_uuid;
      void created_at;
      void updated_at;
      void useMessageExactly;

      mutateUpdateAgent(upadedData);
    },
    [fetchToken, mutateUpdateAgent],
  );

  const handleUpdatePrompt = useCallback(
    async (rowOriginal: any, newPrompt: string, onDone: () => void) => {
      setIsUpdatingPrompt(true);
      let token = '';
      try {
        const tokenRes = await fetchToken();
        token = tokenRes?.data?.data?.result?.tokenId || '';
      } catch (error) {
        console.error('Failed to fetch token:', error);
      }

      const payload = {
        ...rowOriginal,
        agentId: rowOriginal.agent_uuid || rowOriginal.id,
        token,
        systemPrompt: newPrompt,
      };

      const {
        agent_uuid,
        uuid,
        did_uuid,
        company_uuid,
        created_at,
        useMessageExactly,
        ...upadedData
      } = payload;
      console.log(agent_uuid, uuid, did_uuid, company_uuid, created_at, useMessageExactly);

      mutateUpdateAgent(upadedData, {
        onSuccess: () => {
          onDone();
          setIsUpdatingPrompt(false);
        },
        onError: () => {
          onDone();
          setIsUpdatingPrompt(false);
        },
      });
    },
    [fetchToken, mutateUpdateAgent],
  );
  const [selectedUser, setSelectedUser] = useState<IUSERS | null>(null);
  const [drawerState, setDrawerState] = useState<any>({
    addUser: false,
    updateForwarding: false,
    assignUser: false,
    removeAssignUser: false,
    changeRole: false,
  });
  const openDrawer = (key: any) => {
    setDrawerState((prev: any) => ({ ...prev, [key]: true }));
  };
  const [showMultipleAssignModal, setShowMultipleAssignModal] = useState(false);
  const [multipleAssignUsers, setMultipleAssignUsers] = useState<any[]>([]);
  console.log(multipleAssignUsers, showMultipleAssignModal);

  useEffect(() => {
    return () => {
      unloadAi360CallWidget();
    };
  }, []);

  const handleTestTalkClick = useCallback((agent: any) => {
    const widgetKey = getAi360WidgetKey(agent);

    if (!widgetKey) {
      handleAlert({ text: 'Widget key is missing for this agent.', type: 'error' });
      return;
    }

    unloadAi360CallWidget();

    const widgetScriptSrc = getAiWidgetScriptUrl();
    if (!widgetScriptSrc) {
      handleAlert({ text: 'AI widget URL is missing.', type: 'error' });
      return;
    }

    const script = document.createElement('script');
    script.id = CALL_EMBED_SCRIPT_ID;
    script.src = widgetScriptSrc;
    script.setAttribute('data-widget-mode', 'call');
    script.setAttribute('data-widget-key', widgetKey);
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-label', 'Need Help?');
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      setTimeout(() => {
        const widgetId = `ai360-widget-call-${widgetKey.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        document.getElementById(widgetId)?.querySelector('button')?.click();
      }, 0);
    };
    script.onerror = () => {
      unloadAi360CallWidget();
      handleAlert({ text: 'Failed to load call widget. Please try again.', type: 'error' });
    };

    document.body.appendChild(script);
  }, []);

  const columns = useMemo(
    () => [
      {
        header: 'AI Receptionist Name',
        accessorKey: 'agentName',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100  font-semibold text-gray-600">
              {row.original.agentName?.substring(0, 2).toUpperCase()}
            </div>
            <p className=" font-semibold text-primary">{row.original.agentName}</p>
          </div>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: any) => {
          const data = row.original || {};
          const rawStatus = String(data.status || data.agentStatus || 'inactive').toLowerCase();
          const isLive = rawStatus === 'live';
          const isDraft = Boolean(data?.forward_call_actions?.receptionist_builder?.draft);

          const handleStatusChange = (newStatus: string) => {
            if (newStatus === rawStatus) return;
            handleStatusUpdate(data, newStatus);
          };

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 text-xs font-semibold cursor-pointer outline-none transition-colors duration-200 hover:bg-gray-100/80 text-gray-700"
                  style={
                    isLive
                      ? {
                          backgroundColor: '#ecfdf5',
                          borderColor: '#a7f3d0',
                          color: '#047857',
                        }
                      : isDraft
                        ? {
                            backgroundColor: '#fffbeb',
                            borderColor: '#fde68a',
                            color: '#b45309',
                          }
                        : undefined
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: isLive ? '#10b981' : isDraft ? '#f59e0b' : '#94a3b8',
                    }}
                  />
                  <span>{isLive ? 'Live' : isDraft ? 'Draft' : 'Paused'}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[140px] bg-white border border-gray-200 shadow-lg rounded-xl p-1 z-50 animate-none"
              >
                <DropdownMenuItem
                  onClick={() => handleStatusChange('live')}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium cursor-pointer rounded-lg hover:bg-gray-50 text-gray-900"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Live</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange('inactive')}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium cursor-pointer rounded-lg hover:bg-gray-50 text-gray-900"
                >
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>Paused</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
      {
        header: 'Sentiment',
        accessorKey: 'avg_sentiment',
        cell: ({ row }: any) => {
          const data = row.original || {};
          const calls = Number(data.sentiment_calls || 0);
          const label = String(data.sentiment_label || '')
            .trim()
            .toLowerCase();
          const score = Number(data.avg_sentiment || 0);
          const counts = sentimentScoreText(data.sentiment_counts);

          if (!calls) {
            return (
              <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500">
                Not analyzed
              </span>
            );
          }

          return (
            <div className="flex flex-col gap-1">
              <span
                title={counts}
                className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-bold capitalize ${sentimentBadgeClass(label)}`}
              >
                {label || 'neutral'} · {score.toFixed(1)}
              </span>
              <span className="text-[11px] font-medium text-slate-400">{calls} calls</span>
            </div>
          );
        },
      },
      {
        header: 'Caller Id',
        accessorKey: 'caller_id',
        cell: ({ row }) => {
          const data: any = row?.original || {};
          const assignedDID = data?.did_uuid?.[0]?.did_number || '';
          if (!assignedDID) {
            return (
              <p
                className="text-primary cursor-pointer"
                onClick={() => {
                  openDrawer('assignUser');
                  setSelectedUser({ ...data, user_uuid: data?.user_uuid || data?.uuid });
                }}
              >
                Assign Caller Id
              </p>
            );
          }

          return <NumberWithFlag number={assignedDID} />;
        },
      },
      // {
      //   header: 'DID Count',
      //   accessorKey: 'did_uuid',
      //   cell: ({ row }: any) => (
      //     <div className="flex items-center gap-3">
      //       <div
      //         className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ucass-active-bg text-xs font-semibold text-ucass-active hover:bg-ucass-active-bg transition-colors border border-ucass-active-bg"
      //         onClick={() => {
      //           setSelectedDidList(row.original.did_uuid || []);
      //           setSelectedAgentName(row.original.agentName || '');
      //           setDidListModalOpen(true);
      //         }}
      //       >
      //         {row.original.did_uuid?.length || 0}
      //       </div>
      //     </div>
      //   ),
      // },
      // {
      //   header: 'Numbers',
      //   accessorKey: 'number',
      //   cell: ({ row }: any) => {
      //     const rowOriginal = row.original;
      //     const assignedValue =
      //       rowOriginal.did_uuid || rowOriginal.number_uuid || rowOriginal.number || '';
      //     let selectedOption = numberOptions.find((opt: any) => opt.value === assignedValue);

      //     // Fallback: If not found by UUID/value, try finding by phone number string in the full numbers result
      //     if (!selectedOption && assignedValue) {
      //       const foundNum = (numbersData?.data?.data?.result?.rows || []).find(
      //         (n: any) => n.did_number === assignedValue || n.uuid === assignedValue,
      //       );
      //       if (foundNum) {
      //         selectedOption = { label: foundNum.did_number, value: foundNum.uuid };
      //       }
      //     }

      //     if (!selectedOption) {
      //       selectedOption = { label: 'Not assigned', value: '' };
      //     }

      //     const handleNumberChange = (val: any) => {
      //       const payload = {
      //         agentId: rowOriginal.agent_uuid || rowOriginal.id,
      //         did_uuid: val.value,
      //         forward_call_actions: rowOriginal.forward_call_actions || {
      //           condition: {
      //             operational_hours: {
      //               type: '24_hours',
      //               regional: {},
      //               value: {},
      //               holidays: [],
      //             },
      //             recording: {
      //               on_demand: { enabled: true },
      //               automatic: { enabled: true, label: 'All', value: 'all' },
      //             },
      //             display_number: {
      //               incoming: { label: 'Yes', value: true },
      //               masking: { type: 'N', value: '', label: 'None' },
      //               show_number_if_blocked: 'NO',
      //             },
      //             caller_id: [],
      //           },
      //           call_handling: {
      //             business_hours: {
      //               type: 'VOICEMAIL',
      //               value: '',
      //               label: 'Voicemail',
      //             },
      //           },
      //           media: {
      //             welcome: { enabled: false, value: '' },
      //             hold: { enabled: false, value: '' },
      //             voicemail: { enabled: false, value: '' },
      //           },
      //           transcription: true,
      //           temperature: 'low',
      //           detailsToCollect: ['name', 'phone'],
      //         },
      //       };
      //       if (val.value) {
      //         assignNumber(payload);
      //       }
      //     };

      //     return (
      //       <div className="min-w-[150px]">
      //         <CustomSelect
      //           options={availableNumberOptions}
      //           value={selectedOption}
      //           handleChange={handleNumberChange}
      //           isLoading={isLoadingNumbers}
      //           placeholder="Assign Number"
      //         />
      //       </div>
      //     );
      //   },
      // },
      {
        header: 'Forward After AI',
        accessorKey: 'forwardType',
        cell: ({ row }: any) => (
          <ForwardTypeCell
            data={row.original}
            onUpdate={handleInlineUpdate}
            optionsData={forwardingOptionsData}
            userExtension={user?.user_info?.extension || ''}
          />
        ),
      },
      {
        header: 'Last Updated',
        accessorKey: 'updatedAt',
        cell: ({ row }: any) => {
          const date = row?.original?.updatedAt || row?.original?.updated_at;
          return date ? (
            <span className="text-xs xxl:text-sm font-medium text-gray-600">
              {convertDateFormateApis(date, 'DD/MM/YYYY hh:mm A')}
            </span>
          ) : (
            <div className="text-center font-medium text-gray-600">---</div>
          );
        },
      },
      {
        header: 'Actions',
        accessorKey: 'action',
        cell: ({ row }: any) => {
          const data = row?.original;
          const isDeleted = row?.original?.deletedAt || row?.original?.deleted_at;
          const actions = isDeleted
            ? []
            : [
                {
                  tooltipText: 'Test Talk',
                  onClick: () => {
                    handleTestTalkClick(data);
                  },
                  className:
                    'flex h-8 cursor-pointer w-8 items-center justify-center rounded-full bg-ucass-active-bg text-ucass-active/80 hover:bg-ucass-active hover:text-white',
                  icon: <Icon name="PhoneCalling" className="h-5 w-5" />,
                },
                agentAccess?.edit && {
                  tooltipText: 'Edit Prompt',
                  onClick: () => {
                    setEditData(data);
                    setPromptModalOpen(true);
                  },
                  className:
                    'flex h-8 cursor-pointer w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:border-primary hover:text-primary',
                  icon: <MessageSquare className="h-4 w-4" />,
                },
                agentAccess?.edit && {
                  tooltipText: 'Edit',
                  onClick: () => {
                    setEditData(data);
                    setReceptionistDraft(null);
                    setInitialReceptionistStep(0);
                    setPreselectKnowledgeBase(null);
                    setActiveView('create-scratch');
                  },
                  className:
                    'flex h-8 cursor-pointer w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:border-primary hover:text-primary',
                  icon: <Pencil className="h-4 w-4" />,
                },
                agentAccess?.delete && {
                  tooltipText: 'Delete',
                  onClick: () => setDeleteAgent(data),
                  className:
                    'flex h-8 cursor-pointer w-8 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-100',
                  icon: <Trash2 className="h-4 w-4" />,
                },
              ].filter(Boolean);

          return isDeleted ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[12px] font-normal text-ucass-red select-none">
              Marked Deleted
            </span>
          ) : (
            <div className="flex items-center gap-2">
              {actions.map((action: any, index: number) => (
                <CustomTooltip key={index} text={action.tooltipText} side="top">
                  <button type="button" onClick={action.onClick} className={action.className}>
                    {action.icon}
                  </button>
                </CustomTooltip>
              ))}
            </div>
          );
        },
      },
    ],
    [
      handleInlineUpdate,
      handleStatusUpdate,
      numberOptions,
      forwardingOptionsData,
      user?.user_info?.extension,
      agentAccess,
      handleTestTalkClick,
    ],
  );
  return (
    <>
      <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <div className="text-gray-900 font-semibold text-lg flex items-center gap-2">
            <div>
              <div className="flex items-center gap-1">
                AI Tools
                <div className="-rotate-90 text-gray-800">
                  <Icon name="ChevronIcon" className="w-5 h-5" />
                </div>
                <span className="text-primary text-md">AI Receptionist</span>
              </div>
              <p className="text-gray-500 text-xs font-medium">
                An AI that answers calls, understands what the caller wants, and routes them.
              </p>
            </div>
            {!!editData && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20 shadow-sm">
                Edit Mode
              </span>
            )}
          </div>
          {activeView === 'list' ? (
            <div className="flex gap-2 filters">
              <Input
                placeholder="Search"
                className="pl-10 w-full min-h-9 rounded-lg"
                IconPosition="left-0 pl-2 inset-y-0 text-gray-700"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                Icon={<SearchLine />}
              />
              {agentAccess?.add && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditData(null);
                    setReceptionistDraft(null);
                    setSelectedBuildMode(null);
                    setActiveView('build-choice');
                  }}
                  className="min-h-9"
                >
                  <Icon name="Plus" className="w-3 h-3" />
                  Create AI Receptionist
                </Button>
              )}
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (editData) {
                  setEditData(null);
                  setReceptionistDraft(null);
                  setSelectedBuildMode(null);
                  setSelectedTemplateName('');
                  setSelectedTemplateId('');
                  setActiveView('list');
                  return;
                }
                if (activeView === 'create-scratch' && selectedBuildMode === 'template') {
                  setActiveView('template-choice');
                  return;
                }
                if (activeView === 'create-scratch' || activeView === 'template-choice') {
                  setActiveView('build-choice');
                  return;
                }
                setSelectedBuildMode(null);
                setSelectedTemplateName('');
                setSelectedTemplateId('');
                setReceptionistDraft(null);
                setActiveView('list');
              }}
            >
              Back
            </Button>
          )}
        </div>

        <div className="w-full h-full p-3 pt-0 flex flex-col gap-2 overflow-auto">
          {activeView === 'list' && (
            <div className="w-full h-full pt-3 flex flex-col gap-2 overflow-auto">
              <TableManager
                fetcherKey="getAIReceptionistList"
                fetcherFn={getAIReceptionistList}
                columns={columns}
                search={search}
                clientSideSearch={true}
                // extraParams={{ type: 'receptionist' }}
              />
            </div>
          )}

          {activeView === 'build-choice' && (
            <div className="flex justify-center items-center h-full rounded-2xl  p-6 md:p-8">
              <div className="mx-auto max-w-[760px]">
                <h3 className="text-center text-2xl font-semibold text-[#091A3A]">
                  How would you like to build your AI Receptionist?
                </h3>
                <p className="mx-auto mt-2 max-w-[620px] text-center text-sm text-[#667085]">
                  Select an initial framework for your voice assistant. You can customize behavior,
                  tone, and call routing in the next steps.
                </p>

                <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReceptionistDraft(null);
                      setSelectedBuildMode('scratch');
                      setSelectedTemplateName('');
                      setInitialReceptionistStep(0);
                      setPreselectKnowledgeBase(null);
                      setActiveView('create-scratch');
                    }}
                    className={`group rounded-2xl border bg-white p-6 text-left shadow-[0_2px_6px_rgba(16,24,40,0.04)] transition-colors ${
                      selectedBuildMode === 'scratch'
                        ? 'border-primary ring-2 ring-primary/10'
                        : 'border-[#D0D5DD] hover:border-primary hover:bg-ucass-active-bg'
                    }`}
                  >
                    <span
                      className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                        selectedBuildMode === 'scratch'
                          ? 'bg-primary text-white'
                          : 'bg-[#EAECF0] text-[#0F172A] group-hover:bg-primary group-hover:text-white'
                      }`}
                    >
                      <UserRound className="h-6 w-6" />
                    </span>
                    <h4 className="text-lg font-semibold text-[#091A3A]">Start From Scratch</h4>
                    <p className="mt-3 text-sm leading-6 text-[#667085]">
                      Design a custom AI receptionist from the ground up, selecting voice,
                      configuring routing, and writing greetings manually.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReceptionistDraft(null);
                      setSelectedBuildMode('template');
                      setActiveView('template-choice');
                    }}
                    className={`group rounded-2xl border bg-white p-6 text-left shadow-[0_2px_6px_rgba(16,24,40,0.04)] transition-colors ${
                      selectedBuildMode === 'template'
                        ? 'border-primary ring-2 ring-primary/10'
                        : 'border-[#D0D5DD] hover:border-primary hover:bg-ucass-active-bg'
                    }`}
                  >
                    <span
                      className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                        selectedBuildMode === 'template'
                          ? 'bg-primary text-white'
                          : 'bg-[#EAECF0] text-[#0F172A] group-hover:bg-primary group-hover:text-white'
                      }`}
                    >
                      <Grid2X2 className="h-6 w-6" />
                    </span>
                    <h4 className="text-lg font-semibold text-[#091A3A]">Use a Template</h4>
                    <p className="mt-3 text-sm leading-6 text-[#667085]">
                      Start instantly with a pre-configured voice assistant tailored for industry
                      use-cases.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'template-choice' && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {dynamicTemplateOptions?.length
                  ? dynamicTemplateOptions?.map((template: any) => {
                      const TemplateIcon = template.icon;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => {
                            setReceptionistDraft(null);
                            setSelectedBuildMode('template');
                            setSelectedTemplateName(template.name);
                            setSelectedTemplateId(template.id);
                            setInitialReceptionistStep(0);
                            setPreselectKnowledgeBase(null);
                            setActiveView('create-scratch');
                          }}
                          className="group rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary hover:bg-ucass-active-bg"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAECF0] text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                              <TemplateIcon className="h-4 w-4" />
                            </span>
                            <div className="flex min-w-0 flex-col">
                              <h4 className="text-base font-semibold text-[#091A3A]">
                                {template.name}
                              </h4>
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-[#667085]">
                            {template.description}
                          </p>
                        </button>
                      );
                    })
                  : null}
              </div>
            </div>
          )}

          {activeView === 'create-scratch' && (
            <div className="mt-5">
              <CreateAiReceptionist
                initialData={editData}
                initialStep={initialReceptionistStep}
                preselectKnowledgeBase={preselectKnowledgeBase}
                initialTemplateName={
                  selectedBuildMode === 'template' ? selectedTemplateName : undefined
                }
                initialTopicId={selectedBuildMode === 'template' ? selectedTemplateId : undefined}
                onClose={() => {
                  setEditData(null);
                  setReceptionistDraft(null);
                  setSelectedBuildMode(null);
                  setSelectedTemplateName('');
                  setInitialReceptionistStep(0);
                  setPreselectKnowledgeBase(null);
                  setActiveView('list');
                }}
                initialDraft={receptionistDraft}
              />
            </div>
          )}
        </div>
      </section>

      <AlertConfirm
        open={Boolean(deleteAgent)}
        setOpen={() => setDeleteAgent(null)}
        headerText="Delete AI Receptionist"
        descriptionTextComp={
          <div className="text-md">
            Are you sure you want to delete <b>{deleteAgent?.agentName}</b>? This action cannot be
            undone.
          </div>
        }
        confirmBtnText="Delete"
        onConfirm={async () => {
          const tokenResponse = await fetchToken();
          const tokenId = tokenResponse?.data?.data?.result?.tokenId;
          mutateDeleteAgent({ agentId: deleteAgent?.agent_uuid, token: tokenId });
        }}
        onCancel={() => setDeleteAgent(null)}
        apiLoading={isDeletePending || isPendingToken}
      />

      <AssignDIDNumberModal
        open={drawerState.assignUser}
        userData={selectedUser}
        onOpenMultipleAssignModal={(users) => {
          setMultipleAssignUsers(users || []);
          setShowMultipleAssignModal(true);
        }}
        onClose={() => {
          setDrawerState((prev: any) => ({ ...prev, assignUser: false }));
          setSelectedUser(null);
        }}
      />
      <PromptModal
        open={promptModalOpen}
        setOpen={setPromptModalOpen}
        data={editData}
        onUpdate={handleUpdatePrompt}
        isUpdating={isUpdatingPrompt}
      />
    </>
  );
};

export default AiReceptionist;
