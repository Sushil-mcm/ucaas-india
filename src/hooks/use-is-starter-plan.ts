import { useUser } from '@/hooks/use-user';

export const useIsStarterPlan = () => {
  const { user } = useUser();
  const planName = user?.plan_info?.dataValues?.plan_name ?? user?.plan_info?.plan_name;

  if (typeof planName !== 'string') {
    return false;
  }

  return ['starter', 'starter plan'].includes(planName.trim().toLowerCase());
};
