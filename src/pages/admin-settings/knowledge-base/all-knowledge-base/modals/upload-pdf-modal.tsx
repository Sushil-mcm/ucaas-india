import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CloseIcon, UploadLineIcon } from '@/assets/icons';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { uploadPDFModalInitialValues, uploadPDFModalSchema } from '../../constants';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadIngestPdf } from '@/services/api';
import { formatFileSize, handleAlert } from '@/lib/utils';
import Loader from '@/components/custom/loader';
import { useEffect, useState } from 'react';
import { iconObj } from '../know-base-list';
import { Input } from '@/components/ui/input';

interface AddUploadPDFModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  group?: any;
  selectedCreateType?: string;
  selectedLeads?: string[];
  goToConfigurePage?: (payload: Record<string, any>) => void;
  rowData?: { isEdit: boolean; formData: any };
  origin?: string;
  onSuccess?: (payload?: { ingestionIdCreated?: string; type?: 'pdf' }) => void;
}

function UploadPdfModal({
  modalState,
  setModalState,
  rowData,
  origin = '',
  onSuccess = () => {},
  goToConfigurePage = () => {},
}: AddUploadPDFModalProps) {
  const queryClient: any = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const { isEdit = false, formData = {} } = rowData || {};
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    defaultValues: { ...uploadPDFModalInitialValues, file: [] },
    resolver: yupResolver(uploadPDFModalSchema),
    context: { isEdit },
    mode: 'onSubmit',
  });
  const fileList: File[] = watch('file') || [];
  const isMaxReached = fileList?.length + existingFiles?.length >= 5;

  const { mutate: mutateIngestPdf, isPending: ingestLoading } = useMutation({
    mutationFn: uploadIngestPdf,
    mutationKey: ['uploadIngestPdf'],
    onSuccess: (data) => {
      if (isEdit || origin === 'create_agent') {
        queryClient.invalidateQueries({
          queryKey: ['AIUserKnowledgeBase'],
          exact: false,
        });
      }
      goToConfigurePage({
        ingestionIdCreated: data?.data?.ingestionId,
        sourceType: 'pdf',
      });
      handleAlert({
        text: data?.data?.data?.message || 'PDF uploaded successfully.',
        type: 'success',
      });
      setLoading(false);
      setModalState(false);
      onSuccess({
        ingestionIdCreated: data?.data?.ingestionId,
        type: 'pdf',
      });
    },
    onError: (error: any) => {
      setLoading(false);
      handleAlert({
        text: error?.response?.data?.error || 'Something went wrong!',
        type: 'error',
      });
    },
  });

  useEffect(() => {
    if (!isEdit || !formData) return;

    setValue('name', formData?.name || '');
    setExistingFiles(formData?.files || []);
  }, [isEdit, formData, setValue]);

  const onSubmit = async (values: any) => {
    try {
      setLoading(true);

      const ingestPayload = new FormData();
      ingestPayload.append('name', values?.name || '');
      ingestPayload.append('agentId', values?.agentId || formData?.agentId || '');
      ingestPayload.append('socketId', values?.socketId || formData?.socketId || '');

      if (isEdit && formData?.ingestionId) {
        ingestPayload.append('ingestionId', formData.ingestionId);
      }

      existingFiles.forEach((file) => ingestPayload.append('existingFiles[]', file));
      fileList.forEach((file) => ingestPayload.append('files', file));

      mutateIngestPdf(ingestPayload);
    } catch (error: any) {
      setLoading(false);
      handleAlert({
        text: error?.message || 'PDF submission failed',
        type: 'error',
      });
      console.error('PDF submission failed:', error);
    }
  };

  const removeExistingFile = (index: number) => {
    setExistingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    const updatedFiles = [...fileList];
    updatedFiles.splice(index, 1);
    setValue('file', updatedFiles);
  };
  const isLoading = [ingestLoading, loading].some((v) => v);
  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-4/6 lg:w-3/6 xl:w-2/6 p-3 max-h-[99%] " showCloseButton={false}>
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
          className="w-full flex flex-col gap-3 justify-between h-full"
        >
          <div className="flex flex-col gap-1.5 text-900/80">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              Upload PDF File
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="w-full max-h-[calc(100vh-12rem)]  flex flex-col gap-3 pr-1 overflow-y-auto mt-4">
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter name"
                  label="Name"
                  error={errors?.name?.message}
                />
              )}
            />
            <div className="flex flex-col gap-1 relative mb-3">
              <div className="text-sm font-medium">Existing Files</div>
              {existingFiles?.length > 0 && (
                <div className="flex flex-col gap-2">
                  {existingFiles?.map((file, index) => (
                    <div
                      key={file}
                      className="flex items-center justify-between gap-2 p-2 border rounded-md bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        {iconObj['pdf']}
                        <p className="text-sm truncate max-w-[340px]">{file}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExistingFile(index)}
                        className="text-gray-500 hover:text-red-500 cursor-pointer"
                      >
                        <CloseIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1 justify-end absolute bottom-[-20px] right-0">
                <div className="text-xs text-gray-500 flex">
                  {fileList?.length + existingFiles?.length}/5
                </div>
                {errors?.file && <ErrorTooltip text={errors?.file?.message} />}
              </div>
            </div>
            <div className="w-full flex flex-col gap-1.5">
              <div className="flex gap-4 flex-row">
                <label
                  htmlFor={isMaxReached ? undefined : 'file-upload'}
                  className={`flex flex-col items-center justify-center w-full h-44 border border-dashed rounded-xl
    ${isMaxReached ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}
    ${errors?.file ? 'border-red-500' : 'border-gray-300'}
  `}
                >
                  <div className="flex flex-col items-center text-gray-500">
                    <div className="p-3 bg-gray-100 text-gray-700 rounded-md">
                      <UploadLineIcon className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-gray-500">Accepted formats: PDF</p>
                    <p className="mt-2 text-xs text-gray-500">Max: 10MB</p>
                  </div>

                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf"
                    className="hidden"
                    disabled={isMaxReached}
                    onChange={(e) => {
                      const selectedFiles = Array.from(e.target.files || []);
                      if (!selectedFiles?.length) return;
                      const remainingSlots = 5 - existingFiles?.length - fileList?.length;
                      if (selectedFiles?.length > remainingSlots) {
                        handleAlert({
                          text: `Only ${remainingSlots} file(s) were added. Maximum 5 files allowed.`,
                          type: 'warning',
                        });
                      }

                      const filesToAdd = selectedFiles.slice(0, remainingSlots);

                      setValue('file', [...fileList, ...filesToAdd], {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  />
                </label>
              </div>
            </div>
            {fileList?.length > 0 && (
              <div className="flex flex-col gap-2 w-full">
                {fileList?.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-2 border rounded-md bg-gray-50 w-full"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {iconObj['pdf']}
                      <p className="text-sm truncate max-w-[280px] ">{file?.name}</p>
                      <div className="text-xs text-gray-500">({formatFileSize(file?.size)})</div>
                      {isEdit && existingFiles && (
                        <div className="text-xs py-1 px-2 border border-green-300 bg-green-50 text-green-600 rounded-sm">
                          New
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-gray-500 hover:text-red-500 cursor-pointer"
                    >
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="justify-end flex gap-2">
            <Button
              variant={'transparent'}
              type="button"
              onClick={() => setModalState(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button variant={'primary'} type="submit" disabled={isLoading}>
              {isLoading && <Loader variant="blue" />}Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default UploadPdfModal;
