import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAIAgentToken, userIngestURL } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { pasteURLModalInitialValues, pasteURLModalSchema } from '../../constants';
import Loader from '@/components/custom/loader';
import { handleAlert } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface AddGroupLeadModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  group?: any;
  selectedCreateType?: string;
  selectedLeads?: string[];
  rowData?: any;
  origin?: string;
  onSuccess?: (payload?: { ingestionIdCreated?: string; type?: 'url' }) => void;
}

function PasteUrlModal({
  modalState,
  setModalState,
  rowData,
  origin = '',
  onSuccess = () => {},
}: AddGroupLeadModalProps) {
  const { isEdit = false, formData = {} } = rowData || {};
  const queryClient: any = useQueryClient();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<any>({
    defaultValues: pasteURLModalInitialValues,
    resolver: yupResolver(pasteURLModalSchema),
    mode: 'onSubmit',
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'urls',
  });
  useEffect(() => {
    if (isEdit && formData) {
      reset({
        name: formData?.name || '',
        urls:
          formData?.urls?.length > 0
            ? formData?.urls?.map((url: string) => ({ url }))
            : [{ url: '' }],
      });
    }
  }, [isEdit, formData, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: userIngestURL,
    mutationKey: ['userIngestURL'],
    onSuccess: (data) => {
      if (isEdit || origin === 'create_agent') {
        queryClient.invalidateQueries({
          queryKey: ['AIUserKnowledgeBase'],
          exact: false,
        });
      }
      handleAlert({
        text: data?.data?.data?.message || 'URL added successfully.',
        type: 'success',
      });
      setModalState(false);
      onSuccess({
        ingestionIdCreated: data?.data?.ingestionId,
        type: 'url',
      });
    },
    onError: (error: any) => {
      handleAlert({
        text: error?.response?.data?.error || 'Failed to add URL.',
        type: 'error',
      });
    },
  });

  const { mutateAsync: mutateGetToken, isPending: isPendingGetToken } = useMutation({
    mutationFn: getAIAgentToken,
    mutationKey: ['getAIAgentToken'],
  });

  const onSubmit = async (values: any) => {
    const response = await mutateGetToken();
    const tokenId = response?.data?.data?.result?.tokenId;
    if (tokenId) {
      const payload = {
        name: values.name,
        urls: values.urls.map((item: { url: string }) => item?.url),
        scope: 'global',
        token: tokenId,
        ingestionId: isEdit ? formData?.ingestionId : undefined,
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
              Get from URL
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col gap-3">
            <h5 className="text-gray-500 font-medium text-sm">
              Scan information from URL link to document or website.
            </h5>
            <Controller
              control={control}
              name={'name'}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter name"
                  label="Name"
                  error={errors?.name?.message}
                />
              )}
            />

            {fields?.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-center">
                <Controller
                  control={control}
                  name={`urls.${index}.url`}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label={`URL ${index + 1}`}
                      placeholder="https://example.com"
                      error={(errors?.urls as any)?.[index]?.url?.message}
                    />
                  )}
                />

                {fields.length > 1 && index !== 0 && (
                  <Button
                    type="button"
                    variant="transparent"
                    className="mt-6"
                    onClick={() => remove(index)}
                  >
                    <X size={18} />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              disabled={fields.length >= 5}
              className="w-fit"
              onClick={() => append({ url: '' })}
            >
              + Add URL
            </Button>
            <div className="flex items-center gap-1">
              <p className="text-xs text-gray-500">You can add up to 5 URLs only</p>
              <span className="text-xs text-gray-500">({fields?.length} / 5)</span>
            </div>
          </div>
          <div className="justify-end flex gap-2">
            <Button variant={'transparent'} type="button" onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button
              disabled={isPendingGetToken || isPending}
              variant={'outline'}
              type="button"
              onClick={handleSubmit(onSubmit)}
            >
              {(isPendingGetToken || isPending) && <Loader variant="blue" />}
              {isEdit ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PasteUrlModal;
