import { Button } from '@/components/ui/button';
import StartFrom from './start-from';
import { convertDateFormateApis, getObjectLength, handleAlert } from '@/lib/utils';
import { useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import TableManager from '@/components/custom/table-manager';
import { deleteCallScript, getCallScript, upsertCallScript } from '@/services/api';
import { isPublished, pagesOf } from '@/lib/script-pages';
import SideDrawer from '@/components/custom/side-drawer';
import ScriptForm from './add-edit-script';
import { BarChart3, EyeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABEL, dailMethodsArr } from './constants';

import OverviewScript from './overview-script';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AlertConfirm from '@/components/custom/alert-confirm';

const CallScripts = () => {
  const { features } = useCompanyFeatures();
  const scriptAccess = features?.plan_features?.campaign?.action || {};
  const navigate = useNavigate();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<any>(null);
  const queryClient: any = useQueryClient();
  const [drawerState, setDrawerState] = useState<{ isModalOpen: boolean; selectedCampaign: any }>({
    isModalOpen: false,
    selectedCampaign: null,
  });
  const [modalState, setModalState] = useState<{ isModalOpen: boolean; selectedCampaign: any }>({
    isModalOpen: false,
    selectedCampaign: null,
  });
  /* Scripts and templates share one store; the screen shows one or the other. */
  const [view, setView] = useState<'scripts' | 'templates'>('scripts');
  const [startFromOpen, setStartFromOpen] = useState(false);
  /* A new script begins from something: the form opens with this filled in. */
  const [starter, setStarter] = useState<any>(null);

  const { mutate: mutateDeleteScript, isPending: isPendingDeleteScript } = useMutation({
    mutationFn: deleteCallScript,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({
          text: data?.data?.message || 'Call script deleted successfully!',
          type: 'success',
        });
        setShowDeleteConfirmation(null);
        queryClient.invalidateQueries({ queryKey: ['getCallScript'] });
        queryClient.invalidateQueries({ queryKey: [`getCallScript-${view}`] });
      }
    },
  });

  /* Publish / Unpublish from the list: the same save route, with the row's
     own content and the new status. The server refuses an unpublish while a
     campaign or a queue still points at the script, and says which. */
  const { mutate: mutateStatus, isPending: isPendingStatus } = useMutation({
    mutationFn: upsertCallScript,
    onSuccess: (_data, variables: any) => {
      handleAlert({
        text: variables?.status === 'published' ? 'Script published.' : 'Script unpublished.',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['getCallScript'] });
      queryClient.invalidateQueries({ queryKey: [`getCallScript-${view}`] });
    },
  });
  const setStatus = (row: any, status: 'draft' | 'published') =>
    mutateStatus({
      uuid: row?._id,
      name: row?.name,
      dialMethod: row?.dialMethod,
      description: row?.description || '',
      isTemplate: Boolean(row?.isTemplate),
      script: row?.script || [],
      ...(Array.isArray(row?.pages) && row.pages.length ? { pages: row.pages } : {}),
      status,
    });

  const columns: any = [
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{convertDateFormateApis(data?.createdAt, 'MMM D, YYYY')}</div>;
      },
    },
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Type',
      accessorKey: 'dialMethod',
      cell: ({ getValue }: any) => {
        return <div>{dailMethodsArr?.find((i) => i.value === getValue())?.label}</div>;
      },
    },

    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => {
        const published = isPublished(row?.original);
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {published ? STATUS_LABEL.published : STATUS_LABEL.draft}
          </span>
        );
      },
    },
    {
      header: 'Content',
      accessorKey: 'description',
      cell: ({ row }: any) => {
        const pageCount = pagesOf(row?.original).length;
        return (
          <div className="flex flex-col gap-0.5">
            {row?.original?.description ? (
              <span className="text-gray-600 text-xs">{row.original.description}</span>
            ) : null}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">{pageCount === 1 ? '1 page' : `${pageCount} pages`}</span>
              <div
                className="flex items-center gap-1 text-primary cursor-pointer"
                onClick={() => {
                  setModalState({ selectedCampaign: row?.original, isModalOpen: true });
                }}
              >
                <EyeIcon className="h-4 w-4" /> Preview
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row?.original;
        const published = isPublished(data);
        return (
          <span className="flex gap-2 items-center">
            {scriptAccess?.edit && !data?.isTemplate && (
              <button
                type="button"
                disabled={isPendingStatus}
                onClick={() => setStatus(data, published ? 'draft' : 'published')}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  published
                    ? 'border-gray-200 text-gray-700 hover:bg-gray-100'
                    : 'border-primary text-primary hover:bg-primary hover:text-white'
                } disabled:opacity-50`}
              >
                {published ? 'Unpublish' : 'Publish'}
              </button>
            )}
            {!data?.isTemplate && (
              /* The answers agents recorded against this script's questions,
                 in Performance › Reports, over the date range chosen there. */
              <button
                type="button"
                title="See the answers agents recorded against this script's questions"
                aria-label="Answers"
                className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                onClick={() =>
                  navigate(
                    `/performance?view=reports&report=script-answers&script=${encodeURIComponent(String(data?._id || ''))}`,
                  )
                }
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
            {scriptAccess?.edit && (
              <span
                className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white`}
                onClick={() => {
                  setDrawerState({ selectedCampaign: row?.original, isModalOpen: true });
                }}
              >
                <Icon name="EditStrokIcon" className={`w-5 h-5 `} />
              </span>
            )}
            <span
              className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white`}
              onClick={() => {
                setShowDeleteConfirmation(data?._id);
              }}
            >
              <Icon name="TrashBin" className={`w-5 h-5 `} />
            </span>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden  h-full">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <div className="flex items-center gap-4">
            <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
              {view === 'templates' ? 'Script Templates' : 'Call Script'}
            </p>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(['scripts', 'templates'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1 ${view === v ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  {v === 'scripts' ? 'Scripts' : 'Templates'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 filters">
            {scriptAccess?.add && (
              <Button
                variant={'outline'}
                className="min-h-9"
                onClick={() => setStartFromOpen(true)}
              >
                {view === 'templates' ? 'New template' : 'Add Call Script'}
              </Button>
            )}
          </div>
        </div>
        <div className="w-full  p-3 flex flex-col gap-2 ">
          <TableManager
            {...{
              columns,
              fetcherKey: `getCallScript-${view}`,
              extraParams: { filters: [{ key: 'isTemplate', value: view === 'templates' }] },
              emptyTablePlaceholder:
                view === 'templates'
                  ? 'No templates yet'
                  : 'No call scripts yet',
              descriptionEmptyTable:
                view === 'templates'
                  ? 'Tick “Save as a template” on any script, or start one from the built-in set.'
                  : 'Start from a built-in template and change the wording to yours.',
              fetcherFn: getCallScript,
            }}
          />
        </div>
      </section>

      {drawerState?.isModalOpen && (
        <SideDrawer
          width="min(760px, 96vw)"
          isOpen={drawerState.isModalOpen}
          title={
            getObjectLength(drawerState.selectedCampaign)
              ? `Update Call Script (${drawerState.selectedCampaign?.name || ''})`
              : 'Create Call Script'
          }
          handleClose={() =>
            setDrawerState({
              isModalOpen: false,
              selectedCampaign: null,
            })
          }
          isTab={false}
          content={
            <div className="mx-auto h-full w-full max-w-full ">
              <ScriptForm
                isEdit={getObjectLength(drawerState.selectedCampaign)}
                data={drawerState.selectedCampaign || starter}
                startAsTemplate={view === 'templates'}
                handleClose={() =>
                  setDrawerState({
                    isModalOpen: false,
                    selectedCampaign: null,
                  })
                }
              />
            </div>
          }
        />
      )}

      <StartFrom
        open={startFromOpen}
        onClose={() => setStartFromOpen(false)}
        onPick={(start) => {
          setStarter(start);
          setStartFromOpen(false);
          setDrawerState({ isModalOpen: true, selectedCampaign: null });
        }}
      />
      {modalState?.isModalOpen && (
        <OverviewScript modalState={modalState} setModalState={setModalState} />
      )}
      {!!showDeleteConfirmation && (
        <AlertConfirm
          {...{
            apiLoading: isPendingDeleteScript,
            onConfirm: () => {
              mutateDeleteScript({ uuid: showDeleteConfirmation });
            },
            open: !!showDeleteConfirmation,
            setOpen: () => {
              setShowDeleteConfirmation(null);
            },
          }}
        />
      )}
    </>
  );
};

export default CallScripts;
