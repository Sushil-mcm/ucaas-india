import { FC, useState } from 'react';
import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import { useLocation, useNavigate } from 'react-router-dom';
import { deleteGreeting, deleteMedia, getGreetings } from '@/services/api';
import { Icon, IconName } from '@/assets/icons/icon';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import {
  capitalizeFirstLetter,
  DEFAULT_RECORDING_UUIDS,
  formatDate,
  formatDuration,
  formatSize,
  getEnv,
  handleAlert,
  MEDIA_URL,
} from '@/lib/utils';
import AudioModal from '@/pages/phone/audio-dialog';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AddGreeting from '../add-greeting';
import EditGreeting from '../edit-greeting';
import { SearchLine } from '@/assets/icons';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useCompanyFeatures } from '@/hooks/rbac';
import '@/components/mcm/mcm-page.css';

const GreetingContent: FC = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [recordingUrl, serRecordingUrl] = useState<any>('');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { features } = useCompanyFeatures();
  const greetingAccess = features?.plan_features?.settings?.action?.greeting || {};
  const [modalState, setModalState] = useState<any>({
    playMedia: false,
    isEdit: false,
    isDelete: false,
  });
  const [drawerState, setDrawerState] = useState<any>(false);
  const [greetingData, setGreetingData] = useState<any>(null);
  /* Slug in the URL -> the type this page renders. The plural slugs are the
     current ones; the `type-` forms are the old paths, still routed as
     redirects, and still matched here so a direct hit on one resolves to the
     right library instead of silently falling back to "all". */
  const TYPE_SLUGS: Record<string, string> = {
    voicemail: 'voicemail',
    prompts: 'prompt',
    greetings: 'greeting',
    'type-voicemail': 'voicemail',
    'type-prompt': 'prompt',
    'type-greeting': 'greeting',
  };
  /* One of the type slugs is `greetings`, and this page is also mounted at
     `/greetings`. So the last segment alone cannot say whether it is a type or
     the mount itself: at `/greetings` the answer is "all", at
     `/greetings/greetings` it is the greetings library. Strip the segment and
     look at what is left — an empty base means we were standing on the mount. */
  const trimmed = pathname.replace(/\/+$/, '');
  const lastSegment = trimmed.split('/').pop() || '';
  const candidateBase = trimmed.slice(0, trimmed.length - lastSegment.length - 1);
  const isTypeSegment = Boolean(TYPE_SLUGS[lastSegment]) && candidateBase !== '';

  const type = isTypeSegment ? TYPE_SLUGS[lastSegment] : 'all';

  /* The type routes exist under every place this page is mounted, but only the
     standalone greetings area has a sidebar linking to them — under
     My Account > Media Files they were reachable by typing a URL and no other
     way. The base is whatever precedes the type segment, so the tabs follow the
     mount wherever it is. */
  const typeBase = isTypeSegment ? candidateBase : trimmed;
  const TYPE_TABS = [
    { key: 'all', label: 'All', to: typeBase },
    { key: 'greeting', label: 'Greetings', to: `${typeBase}/greetings` },
    { key: 'prompt', label: 'Prompts', to: `${typeBase}/prompts` },
    { key: 'voicemail', label: 'Voicemail', to: `${typeBase}/voicemail` },
  ];

  /* One page serves four different libraries, so the description follows the
     type rather than saying something vague enough to cover all of them. */
  const typeBlurb: Record<string, string> = {
    greeting: 'Recordings callers hear when they reach you — welcome messages and hold music.',
    prompt: 'Recordings played inside IVR menus to tell callers what their options are.',
    voicemail:
      'Recordings played when a call goes to voicemail, before the caller leaves a message.',
    all: 'Audio this account can use for greetings, IVR prompts and voicemail.',
  };

  /* The page head above prints the title; this puts the sentence that used to
     sit under it behind that head's info button instead.

     It sits here, below BOTH `type` and `typeBlurb`, because each is a const:
     reading either from higher up the component throws "Cannot access before
     initialization" and takes the page down to the error boundary, which reads
     on screen as a 404. Moving it below `type` alone was not enough. Still
     called unconditionally on every render, which is what the rules of hooks
     require. */
  useSetAdminPageMeta({ description: typeBlurb[type] || typeBlurb.all });

  function handleOpenAudio(src: string) {
    serRecordingUrl(src);
    setModalState({ playMedia: true });
  }

  const { mutateAsync: mutateDeleteMedia, isPending: PendingMedia } = useMutation({
    mutationFn: deleteMedia,
  });
  const { mutateAsync: mutateDeleteGreeting, isPending: PendingGreeting } = useMutation({
    mutationFn: deleteGreeting,
  });

  const handleDeleteGreeting = async () => {
    try {
      const result = await mutateDeleteGreeting(greetingData?.uuid);

      /* Always `greeting`, never the row's own type. Every recording is stored
         in that one folder whatever it is called - the upload sends `greeting`
         and every playback URL in the app reads `<media>/<company>/greeting/`.
         Passing the row's type here asked the server to delete a voicemail or a
         prompt from a folder it was never in, so the audio of every one of
         those ever deleted is still sitting on the server. */
      try {
        await mutateDeleteMedia({
          uuid: user?.company_info?.uuid,
          type: 'greeting',
          file_name: greetingData?.filename,
        });
      } catch (mediaError) {
        /* The row is already gone, so the recording has left the product either
           way. A leftover file is a housekeeping problem, not something to
           report as a failed deletion - and the old code let this throw, which
           skipped the refresh and the confirmation entirely: the row vanished
           on the next load and the admin was never told anything had happened. */
        console.error('greeting row deleted, its audio file was not: ', mediaError);
      }

      await queryClient.invalidateQueries({ queryKey: ['greetingList'] });
      await queryClient.invalidateQueries({ queryKey: ['greetings'] });
      setModalState({ isDelete: false });
      setGreetingData(null);
      handleAlert({
        text: result?.data?.data?.message || 'Record deleted successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('FAILED TO DELETE GREETING: ', error);
      handleAlert({ text: 'That recording could not be deleted.', type: 'error' });
    }
  };

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Size',
      accessorKey: 'size',
      cell: ({ getValue }: any) => <div className="text-gray-600">{formatSize(getValue())}</div>,
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ getValue }: any) => (
        <div className="text-gray-600">{capitalizeFirstLetter(getValue())}</div>
      ),
    },
    {
      header: 'Duration',
      accessorKey: 'duration',
      cell: ({ getValue }: any) => (
        <div className="text-gray-600">{formatDuration(getValue())}</div>
      ),
    },
    {
      header: 'Created At',
      accessorKey: 'created_at',
      cell: ({ getValue }: any) => <div className="text-gray-600">{formatDate(getValue())}</div>,
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: (props: any) => {
        const data = props?.row?.original;
        const srcUrl = DEFAULT_RECORDING_UUIDS?.includes(data?.uuid)
          ? `${getEnv().VITE_API_BASE_URL}/api/media/default/recording/${data?.filename}`
          : `${MEDIA_URL}/${user?.company_info?.uuid}/greeting/${data?.filename}`;
        const actions = [
          {
            icon: 'PlayLine',
            onClick: () => {
              handleOpenAudio(srcUrl);
            },
            className: ' bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: 'Play',
            access: true,
          },
          greetingAccess?.edit && {
            icon: 'EditStrokIcon',
            onClick: () => {
              setGreetingData(data);
              setModalState({ isEdit: true });
            },
            className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: 'Edit',
            access: !data?.is_default,
          },
          greetingAccess?.delete && {
            icon: 'TrashBin',
            onClick: () => {
              setGreetingData(data);
              setModalState({ isDelete: true });
            },
            className: 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white',
            tooltipText: 'Delete',
            access: !data?.is_default,
          },
        ]?.filter(Boolean);
        return (
          <div className="flex items-center gap-2">
            {/* The key belonged on the mapped element, which is the tooltip,
                not on the div inside it. React warned on every render and
                reused rows by position, so deleting a file could leave the
                wrong action buttons behind. */}
            {actions?.map((action, index) => (
              <CustomTooltip key={index} text={action.tooltipText} side="top">
                <div
                  className={`${action?.access ? `cursor-pointer  ${action.className}` : 'cursor-not-allowed  bg-gray-100 text-gray-900/80'}  flex items-center justify-center rounded-full w-8 h-8 `}
                  onClick={() => {
                    if (action?.access) {
                      action.onClick();
                    }
                  }}
                >
                  <Icon
                    name={action.icon as IconName}
                    className={`w-5 h-5 ${action?.access ? '' : 'text-gray-400'}`}
                  />
                </div>
              </CustomTooltip>
            ))}
          </div>
        );
      },
    },
  ];

  /* This page is mounted twice: in the standalone media library, which has its
     own sidebar, and under My Account > Media Files. The eyebrow says which
     one you are standing in rather than claiming "My Account" in both. */
  const inAccount = pathname.includes('/account/');

  return (
    <section className="mcm-page mcm-admin mcm-acct">
      <div className="mcm-acct-body">
        {/* The four libraries as a tab strip in the body rather than a row of
            pills wedged under the title. It also used to sit inside a <p>,
            which is not valid markup for a row of buttons. */}
        <div className="ptabstrip" role="tablist">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={type === tab.key}
              onClick={() => navigate(tab.to)}
              className={type === tab.key ? 'on' : ''}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {drawerState ? (
          <div className="mcm-media-add">
            <div className="mcm-media-add-h">
              <div className="min-w-0">
                <h2 className="mcm-media-add-t">Add a media file</h2>
                <p className="mcm-media-add-d">
                  Record it here, type it out for text-to-speech, or upload audio you already have.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrawerState(false)}
                className="h-8 px-3"
                aria-label="Close"
              >
                <Icon name="CloseIcon" className="w-3 h-3" />
              </Button>
            </div>

            <AddGreeting
              drawerState={drawerState}
              setDrawerState={setDrawerState}
              greetingType={type}
            />
          </div>
        ) : (
          <>
            <TableManager
              {...{
                fetcherKey: 'greetingList',
                fetcherFn: getGreetings,
                columns,
                search,
                type,
                emptyTablePlaceholder:
                  type == 'all' ? 'No media files uploaded yet' : `No ${type} file uploaded yet`,
                descriptionEmptyTable: `Uploaded ${type} files will appear here.`,
              }}
            />
            {modalState?.playMedia && (
              <AudioModal
                modalState={modalState}
                setModalState={setModalState}
                srcUrl={recordingUrl}
                serRecordingUrl={serRecordingUrl}
              />
            )}
            {modalState?.isEdit && (
              <EditGreeting
                modalState={modalState}
                setModalState={setModalState}
                initialData={greetingData}
              />
            )}
            {modalState?.isDelete && (
              <AlertConfirm
                {...{
                  apiLoading: PendingMedia || PendingGreeting,
                  onConfirm: () => {
                    handleDeleteGreeting();
                  },
                  open: modalState,
                  setOpen: setModalState,
                }}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default GreetingContent;
