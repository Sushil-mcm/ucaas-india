import { useEffect, useState } from 'react';

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PAGE_TYPE_ACCESS_KEY, POWER_DIALER_TAB_CONST } from '../constants';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CampaignList from './campaign-list';
import CreateCampaign from './add-edit-campaign';
import { useCompanyFeatures } from '@/hooks/rbac';

const PowerDialer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParams = searchParams.get('tab') || 'campaign_list';
  const [tabName, setTabs] = useState<string>(tabParams);
  const [editCampaign, setEditCampaign] = useState<any>(null);
  const { type } = useParams();
  const navigate = useNavigate();
  const { features } = useCompanyFeatures();
  const dialerFeaturesAccess = features?.plan_features?.campaign;

  useEffect(() => {
    if (!type) {
      navigate('power-dialer');
    }
  }, [type, navigate]);

  useEffect(() => {
    setEditCampaign(null);
    if (type) setTabs(POWER_DIALER_TAB_CONST.CREATE_LIST);
  }, [type]);

  useEffect(() => {
    if (!editCampaign && tabName === POWER_DIALER_TAB_CONST.EDIT_CAMPAIGN) {
      setTabs(POWER_DIALER_TAB_CONST.CREATE_CAMPAIGN);
    }
  }, [tabParams]);

  useEffect(() => {
    if (tabName && tabName !== tabParams) {
      setParams();
    }
  }, [tabName, tabParams, setSearchParams]);

  const setParams = () => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev.toString());
      newParams.set('tab', tabName);

      return newParams;
    });
  };

  const tabArray = [
    {
      id: 1,
      value: 'campaign_list',
      label: 'Campaign List',
    },
    dialerFeaturesAccess?.access?.[PAGE_TYPE_ACCESS_KEY[`${type}`]] &&
      dialerFeaturesAccess?.action?.add && {
        id: 2,
        value: editCampaign ? 'edit_campaign' : 'create_campaign',
        label: editCampaign ? `Update Campaign (${editCampaign?.name})` : 'Create Campaign',
      },
  ].filter(Boolean);

  const onEditCampaign = (props: any) => {
    setTabs(POWER_DIALER_TAB_CONST.EDIT_CAMPAIGN);
    setEditCampaign(props);
  };

  const handleTabChange = async (tab: string) => {
    setTabs(tab);
    setEditCampaign(null);
  };

  useEffect(() => {
    if (
      editCampaign &&
      !dialerFeaturesAccess?.access?.[PAGE_TYPE_ACCESS_KEY[`${type}`]] &&
      !dialerFeaturesAccess?.action?.add &&
      dialerFeaturesAccess?.access?.[PAGE_TYPE_ACCESS_KEY[`${type}`]] &&
      dialerFeaturesAccess?.action?.edit
    ) {
      tabArray.push({
        id: 2,
        value: 'edit_campaign',
        label: `Update Campaign (${editCampaign?.name})`,
      });
    }
  }, [editCampaign]);

  return (
    <section className="w-full overflow-x-auto overflow-y-hidden">
      {/* <div className="w-full bg-white p-3 flex flex-col gap-3"> */}
      <div className="w-full  flex flex-col">
        {/* <div className="border border-grey-300 p-3">
              <div className="gap-3 flex flex-col"> */}
        {/* <h5 className="font-semibold">{PAGE_TYPE_NAME[`${type}`]} </h5> */}
        {/* <p className="text-sm">
                   allows the user to make automated outgoing calls from the CallHippo dialer
                  to a list of numbers uploaded under a particular campaign
                </p>
              </div>
            </div> */}
        <Tabs value={tabName} onValueChange={handleTabChange} className="flex w-full">
          <div className="border-b border-gray-200 w-full min-h-[65px] bg-white p-3">
            <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none bg-transparent min-h-10 ">
              {tabArray.map((item: any, index: number) => (
                <TabsTrigger
                  key={index}
                  value={item?.value}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                >
                  {item?.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {(() => {
          switch (tabName) {
            // case POWER_DIALER_TAB_CONST.DATA:
            //   return <Data />;
            case POWER_DIALER_TAB_CONST.CREATE_CAMPAIGN:
            case POWER_DIALER_TAB_CONST.EDIT_CAMPAIGN:
              return <CreateCampaign {...{ editCampaign, setTabs }} />;
            case POWER_DIALER_TAB_CONST.CREATE_LIST:
              return <CampaignList {...{ onEditCampaign }} />;
            default:
              //   // return <Data />;
              return <CreateCampaign {...{ editCampaign, setTabs }} />;
          }
        })()}
      </div>
    </section>
  );
};

export default PowerDialer;
