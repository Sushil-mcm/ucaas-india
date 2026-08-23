import { FC, useState } from 'react';
import { useLocation } from 'react-router-dom';
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

const GreetingContent: FC = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [recordingUrl, serRecordingUrl] = useState<any>('');
  const { pathname } = useLocation();
  const { features } = useCompanyFeatures();
  const greetingAccess = features?.plan_features?.settings?.action?.greeting || {};
  const [modalState, setModalState] = useState<any>({
    playMedia: false,
    isEdit: false,
    isDelete: false,
  });
  const [drawerState, setDrawerState] = useState<any>(false);
  const [greetingData, setGreetingData] = useState<any>(null);
  const type =
    ['voicemail', 'prompt', 'greeting']?.find((t) => pathname?.includes(`type-${t}`)) || 'all';

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
      await mutateDeleteMedia({
        uuid: user?.company_info?.uuid,
        type: greetingData?.type,
        file_name: greetingData?.filename,
      });
      await queryClient.invalidateQueries({ queryKey: ['greetingList'] });
      setModalState({ isDelete: false });
      setGreetingData(null);
      handleAlert({
        text: result?.data?.data?.message || 'Record deleted successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('FAILED TO ADD GREETING: ', error);
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
            {actions?.map((action, index) => (
              <CustomTooltip text={action.tooltipText} side="top">
                <div
                  key={index}
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

  return (
    // <section className="w-full overflow-auto max-h-[calc(100vh-64px)] ">
    <section className="w-full overflow-auto  ">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
          Media Files{' '}
          <div className="-rotate-90 text-gray-800">
            <Icon name="ChevronIcon" className="w-5 h-5" />
          </div>
          <span className="text-primary text-md">{capitalizeFirstLetter(type)}</span>
        </p>
        <div className="flex gap-2 filters">
          <Input
            placeholder="Search"
            className="pl-10 w-full min-h-9 rounded-lg"
            IconPosition="left-0 pl-2 inset-y-0"
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith(' ')) return;
              setSearch(e.target.value);
            }}
            Icon={<SearchLine className=" text-gray-700" />}
          />
          {greetingAccess?.add && !drawerState && (
            <Button
              className="min-h-9"
              type="button"
              variant={'outline'}
              onClick={() => setDrawerState(true)}
            >
              <Icon name="Plus" className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
      </div>
      {drawerState ? (
        <div className="w-full flex justify-center py-6 px-4 bg-gray-50/50 ">
          <div className=" w-full max-w-[800px] bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add Media File</h2>
                <p className="text-sm text-gray-500 mt-1">Create or upload a new audio file</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrawerState(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-8 px-3"
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
        </div>
      ) : (
        <div className="w-full p-3 flex flex-col gap-2">
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
          {/* {drawerState && (
          <SideDrawer
            isOpen={drawerState}
            title="Upload File"
            handleClose={() => setDrawerState(false)}
            width="500px"
            isHeader
            content={
              <AddGreeting
                drawerState={drawerState}
                setDrawerState={setDrawerState}
                greetingType={type}
              />
            }
          />
        )} */}
        </div>
      )}
    </section>
  );
};

export default GreetingContent;
