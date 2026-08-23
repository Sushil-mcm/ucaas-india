import { CampaignContext } from '@/context/campaign-context';
import { useContext } from 'react';

export const useCampaign = () => useContext(CampaignContext);
