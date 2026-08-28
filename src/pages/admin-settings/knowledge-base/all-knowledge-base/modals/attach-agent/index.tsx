import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addGlobalIngestion, getAgentList, getAIAgentToken } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import Loader from '@/components/custom/loader';
import { getObjectLength, handleAlert } from '@/lib/utils';
import CustomSelect from '@/components/custom/custom-select';
import { addGlobalIngestionInitial, addGlobalIngestionSchema } from '../../../constants';
import { useEffect } from 'react';

interface AddGroupLeadModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  data: any;
}

function AttachAgent({ modalState, setModalState, data }: AddGroupLeadModalProps) {
  const queryClient: any = useQueryClient();

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<any>({
    defaultValues: addGlobalIngestionInitial,
    resolver: yupResolver(addGlobalIngestionSchema),
    mode: 'onSubmit',
  });

  const { data: typeListData = [] } = useQuery({
    queryKey: ['getAgentList'],
    queryFn: () => getAgentList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });
  const { mutate, isPending } = useMutation({
    mutationFn: addGlobalIngestion,
    mutationKey: ['addGlobalIngestion'],
    onSuccess: (data) => {
      queryClient.invalidateQueries(['AIUserKnowledgeBase']);
      setModalState(false);
      handleAlert({
        text: data?.data?.data?.message || 'Domain added successfully.',
        type: 'success',
      });
    },
  });

  const { mutateAsync: mutateGetToken, isPending: isPendingGetToken } = useMutation({
    mutationFn: getAIAgentToken,
    mutationKey: ['getAIAgentToken'],
  });

  const chatAgents =
    (typeListData || [])
      ?.filter((agent: any) => agent?.agentType === 'chat')
      ?.map((agent: any) => ({
        label: agent?.agentName,
        value: agent?._id,
      })) || [];

  useEffect(() => {
    if (getObjectLength(data)) {
      const { name = '' } = data || {};
      setValue('name', name);
    }
  }, [data]);

  const onSubmit = async (values: any) => {
    const response = await mutateGetToken();
    const tokenId = response?.data?.data?.result?.tokenId;
    if (tokenId) {
      const payload = {
        token: tokenId || '',
        ingestionId: data?.ingestionId || '',
        agentId: values?.agentId?.value,
      };
      mutate(payload);
    }
  };

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-1/3 p-3  max-h-[99%] overflow-y-auto" showCloseButton={false}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full flex flex-col gap-3 justify-between h-full"
        >
          <div className="flex flex-col gap-1.5  text-900/80 ">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              Attach Global Ingestion
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col gap-3">
            <Controller
              control={control}
              name={'name'}
              render={({ field }) => <Input {...field} label="Name" disabled />}
            />
            <Controller
              control={control}
              name={'agentId'}
              render={({ field }) => (
                <CustomSelect
                  {...field}
                  label={'Agent'}
                  placeholder="Select agent"
                  handleChange={(value) => field.onChange(value)}
                  options={chatAgents || []}
                  error={errors?.agentId?.message}
                />
              )}
            />
          </div>
          <div className="justify-end flex gap-2">
            <Button variant={'transparent'} type="button" onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button disabled={isPendingGetToken || isPending} variant={'primary'} type="submit">
              {(isPendingGetToken || isPending) && <Loader variant="blue" />}Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AttachAgent;
