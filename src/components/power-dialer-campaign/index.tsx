import { useCallback, useEffect, useState } from 'react';
import SideDrawer from '../custom/side-drawer';
import PowerCampaignRunningDrawer from './running-campaign';
import { COMMON_CONST } from '@/constants/common-const';

const PowerDialerCampaign = () => {
  const [isCampaignDrawerOpen, setIsCampaignDrawerOpen] = useState<boolean>(false);
  useEffect(() => {
    window.addEventListener(COMMON_CONST.OPEN_POWER_CAMPAIGN, openPowerCampaign);
    window.addEventListener(COMMON_CONST.CLOSE_POWER_CAMPAIGN, closePowerCampaign);
    return () => {
      window.removeEventListener(COMMON_CONST.OPEN_POWER_CAMPAIGN, openPowerCampaign);
      window.removeEventListener(COMMON_CONST.CLOSE_POWER_CAMPAIGN, closePowerCampaign);
    };
  }, []);

  const closePowerCampaign = useCallback(() => {
    setIsCampaignDrawerOpen(false);
  }, []);
  const openPowerCampaign = useCallback(() => {
    setIsCampaignDrawerOpen(true);
  }, []);
  return (
    <>
      <SideDrawer
        width="80%"
        isHeader={false}
        isOpen={isCampaignDrawerOpen}
        handleClose={() => closePowerCampaign()}
        content={<PowerCampaignRunningDrawer />}
        isCloseIcon={false}
      />
    </>
  );
};

export default PowerDialerCampaign;
