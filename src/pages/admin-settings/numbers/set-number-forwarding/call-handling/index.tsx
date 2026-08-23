import { forwardActionType } from '@/services/api';
import { useQueries } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { FC } from 'react';
import Hours from './hours';
import { useUser } from '@/hooks/use-user';

const FORWARD_TYPES = ['EXTENSION', 'DEPARTMENT', 'IVR', 'QUEUE'];

interface ICallHandlingProps {
  isUser: boolean;
  features: any;
  callHandlingTabAction: string;
  handleCallHandlingTabChange: (state: string) => void;
}

const CallHandling: FC<ICallHandlingProps> = ({ isUser = false, features = null }) => {
  const { watch } = useFormContext();
  const { user } = useUser();
  const { user_info } = user;
  const SITE_UUID = watch('did_info')?.site?.value;
  const queries = useQueries({
    queries: FORWARD_TYPES.map((type) => ({
      queryKey: [`forwardActionType-call-forwarding-${type}`, SITE_UUID, type],
      queryFn: () =>
        forwardActionType({
          page: 1,
          limit: 1000,
          filters: [],
          search: '',
          site_uuid: SITE_UUID || user_info?.site_uuid,
          type,
        }),
      enabled: !!SITE_UUID || !!user_info?.site_uuid,
      select: (data: any) => data?.data?.data?.result?.rows || [],
    })),
  });

  const forwardActionTypeData = queries?.map((query) => query.data);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 mt-2">
        <div className="h-[calc(100vh_-_16.2rem)] overflow-auto template-forwarding-call-handling-scroll">
          {
            <Hours
              {...{ type: 'businessHours', isUser, result: forwardActionTypeData, features }}
            />
          }
        </div>
      </div>
    </div>
  );
};

export default CallHandling;
