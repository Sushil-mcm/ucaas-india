import { Icon } from '@/assets/icons/icon';
import TableManager from '@/components/custom/table-manager';
import { convertDateFormateApis, handleAlert } from '@/lib/utils';
import { campaignList, deleteCampaign, playPauseCampaign } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FC, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CampaignConatctsList from '../campaign-contacts-view';
import DialerAgentList from '../dialer-agents-view';
import { SearchLine } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import AlertConfirm from '@/components/custom/alert-confirm';
import { PAGE_TYPE_ACCESS_KEY, PAGE_TYPE_NAME } from '../../constants';
import useDebounce from '@/hooks/use-debounce';
import { useCompanyFeatures } from '@/hooks/rbac';
import { DIALER_TYPE } from '../../campaign/add-edit-campaign/consts';

export interface IAutoDialer {
  createdAt: string;
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  campaignStatus: string;
  totalCount: number;
  passed: number;
  failed: number;
  _id: any;
}

interface ICampaignProps {
  onEditCampaign: any;
}

const CampaignList: FC<ICampaignProps> = ({ onEditCampaign }) => {
  const [selectedCampaign, setSelectedCampaign] = useState<IAutoDialer | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<IAutoDialer | null>(null);
  const [isTotalContacts, setIsTotalContacts] = useState(false);
  const { type } = useParams();
  const queryClient: any = useQueryClient();
  const [searchedText, setSearchedText] = useState('');
  const debouncedSearch = useDebounce(searchedText || '', 1000);
  const { mutate: mutateStatus } = useMutation({
    mutationFn: playPauseCampaign,
    onSuccess: (data) => {
      if (data?.status === 200) {
        queryClient.invalidateQueries(['getCampaignList']);
      }
    },
  });
  const { features } = useCompanyFeatures();
  const dialerFeaturesAccess = features?.plan_features?.campaign;

  useEffect(() => {
    setSelectedCampaign(null);
  }, [type]);

  const onPlayPause = (props: IAutoDialer) => {
    const payload = {
      campaignId: props?._id,
      campaignStatus: props?.campaignStatus === 'PROCESSING' ? 'PAUSE' : 'PROCESSING',
    };
    mutateStatus(payload);
  };

  const { mutate: mutateDeleteCampaign, isPending: isPendingDeleteCampaign } = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({
          text: data?.data?.message || 'Campaign Deleted Successfully!',
          type: 'success',
        });
        setShowDeleteConfirmation(null);
        queryClient.invalidateQueries(['getCampaignList']);
      }
    },
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
      header: 'Campaign Name',
      accessorKey: 'name',

      cell: ({ row }: any) => (
        <div
          className="text-primary hover:text-primary/80 underline underline-offset-4 cursor-pointer"
          onClick={() => setSelectedCampaign(row?.original)}
        >
          <p>{row?.original?.name}</p>
        </div>
      ),
    },
    {
      header: 'Start Date/Time',
      accessorKey: 'startDate',
      cell: ({ row }: any) => (
        <div>
          {convertDateFormateApis(row?.original?.startDate, 'YYYY-MM-DD')}{' '}
          {row?.original?.startTime}
        </div>
      ),
    },
    {
      header: 'End Date/Time',
      accessorKey: 'endDate',
      cell: ({ row }: any) => (
        <div>
          {convertDateFormateApis(row?.original?.endDate, 'YYYY-MM-DD')} {row?.original?.endTime}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'campaignStatus',
    },
    {
      header: 'Total',
      accessorKey: 'totalCount',
      cell: ({ row }: any) => (
        <div className="flex justify-center items-center cursor-pointer">
          <div
            className="inline-flex items-center justify-center p-1 text-sm font-medium text-white bg-primary rounded-full w-5 h-5 cursor-pointer hover:bg-primary/90"
            onClick={() => {
              if (
                !dialerFeaturesAccess?.access?.[PAGE_TYPE_ACCESS_KEY[`${type}`]] &&
                !dialerFeaturesAccess?.action?.summary
              )
                return;
              setIsTotalContacts(true);
              setSelectedCampaign(row?.original);
            }}
          >
            {row?.original?.totalCount || 0}
          </div>
        </div>
      ),
      meta: {
        textAlign: 'center',
      },
    },
    {
      header: (
        <div className="flex justify-between flex-col items-center">
          <p className="text-center ">Call Status</p>
          <div className="flex justify-center pt-1 w-3/4">
            <small className="border-r border-white last:border-0 pr-2 leading-none font-normal text-center w-1/3">
              Failed
            </small>
            <small className="border-r border-white last:border-0 px-2 leading-none font-normal text-center w-1/3">
              Completed
            </small>
            <small className="border-r border-white last:border-0 pl-2 leading-none font-normal text-center w-1/3">
              Remaining
            </small>
          </div>
        </div>
      ),
      accessorKey: 'passed',
      cell: ({ row }: any) => (
        <div className="flex items-center justify-around">
          <div className="flex items-center w-3/4">
            <p className="border-r border-white last:border-0 pr-2 leading-none font-normal w-1/3 flex justify-center">
              <div className="min-w-6 min-h-6 flex items-center justify-center rounded-full bg-red-100 text-red-500">
                {row?.original?.failed || 0}
              </div>
            </p>
            <p className="border-r border-white last:border-0 px-2 leading-none font-normal w-1/3 flex justify-center">
              <div className="min-w-6 min-h-6 flex items-center justify-center rounded-full bg-green-100 text-green-500">
                {row?.original?.passed || 0}
              </div>
            </p>
            <p className="border-r border-white last:border-0 pl-2 leading-none font-normal w-1/3 flex justify-center">
              <div className="min-w-6 min-h-6 flex items-center justify-center rounded-full bg-orange-100 text-orange-500">
                {row?.original?.totalCount || 0}
              </div>
            </p>
          </div>
        </div>
      ),
    },

    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        return (
          <span className="flex gap-2 items-center">
            {dialerFeaturesAccess?.access?.[PAGE_TYPE_ACCESS_KEY[`${type}`]] &&
              dialerFeaturesAccess?.action?.pause && (
                <span
                  onClick={() => onPlayPause(row?.original)}
                  className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                >
                  <Icon
                    name={
                      row?.original?.campaignStatus === 'PROCESSING' ? 'PauseCircle' : 'PlayLine'
                    }
                    className="w-5 h-5"
                  />
                </span>
              )}
            {dialerFeaturesAccess?.access?.[PAGE_TYPE_ACCESS_KEY[`${type}`]] &&
              dialerFeaturesAccess?.action?.edit && (
                <span
                  onClick={() => onEditCampaign(row?.original)}
                  className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                >
                  <Icon name="EditStrokIcon" className="w-5 h-5" />
                </span>
              )}
            {dialerFeaturesAccess?.access?.[PAGE_TYPE_ACCESS_KEY[`${type}`]] &&
              dialerFeaturesAccess?.action?.delete && (
                <span
                  className={`${row?.original?.campaignStatus === 'PROCESSING' ? 'cursor-not-allowed' : `cursor-pointer`}  flex items-center justify-center rounded-full w-8 h-8 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white`}
                  onClick={() => {
                    if (row?.original?.campaignStatus === 'PROCESSING') return;
                    setShowDeleteConfirmation(row?.original);
                  }}
                >
                  <Icon
                    name="TrashBin"
                    className={`w-5 h-5 ${row?.original?.campaignStatus === 'PROCESSING' ? 'text-gray-400' : ''}`}
                  />
                </span>
              )}
          </span>
        );
      },
    },
  ];

  return (
    <>
      {selectedCampaign ? (
        <>
          {isTotalContacts ? (
            <CampaignConatctsList
              selectedCampaign={selectedCampaign}
              setSelectedCampaign={setSelectedCampaign}
            />
          ) : (
            <DialerAgentList
              selectedCampaign={selectedCampaign}
              setSelectedCampaign={setSelectedCampaign}
            />
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <small className="text-sm">
              Easily access and manage your all {PAGE_TYPE_NAME[`${type}`]?.toLowerCase()} campaign.
            </small>
            <div>
              <Input
                placeholder="Search"
                className="pl-10"
                IconPosition="left-0 pl-2 inset-y-0"
                Icon={<SearchLine className=" text-gray-700" />}
                onChange={(e) => setSearchedText(e.target.value)}
                value={searchedText}
              />
            </div>
          </div>
          <TableManager
            {...{
              columns,
              fetcherKey: 'getCampaignList',
              fetcherFn: campaignList,
              extraParams: {
                filters: [
                  {
                    key: 'dialMethod',
                    value: `${type == 'power-dialer' ? DIALER_TYPE.NORMAL : 'PREDICTIVE'}`,
                  },
                ],
                search: [
                  {
                    key: 'name',

                    value: debouncedSearch,
                  },
                ],
              },
            }}
          />
        </div>
      )}

      {!!showDeleteConfirmation && (
        <AlertConfirm
          {...{
            apiLoading: isPendingDeleteCampaign,
            onConfirm: () => {
              mutateDeleteCampaign(showDeleteConfirmation?._id);
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

export default CampaignList;
