import CustomSelect from '@/components/custom/custom-select';
import ErrorTooltip from '@/components/custom/error-tooltip';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUser } from '@/hooks/use-user';
import { cn, formatFileSize, getEnv, handleAlert } from '@/lib/utils';
import { mediaUploadUrl, sendFax } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import * as yup from 'yup';

const MAX_FAX_FILE_SIZE = 10 * 1024 * 1024;

const validationSchema = yup.object().shape({
  from: yup
    .object({
      label: yup.string().required(),
      value: yup.string().required(),
    })
    .nullable()
    .required('DID number is required'),
  to: yup.string().required('Phone number is required'),
});

const isPdfFile = (file: File) => {
  const mimeType = String(file.type || '').toLowerCase();
  const hasPdfExtension = String(file.name || '')
    .toLowerCase()
    .endsWith('.pdf');
  return hasPdfExtension && (!mimeType || mimeType === 'application/pdf');
};

const normalizePhoneNumber = (number: string) => {
  const normalizedNumber = String(number || '')
    .trim()
    .replace(/\s+/g, '');
  return normalizedNumber.startsWith('+') ? normalizedNumber : `+${normalizedNumber}`;
};

interface SendFaxModalProps {
  handleClose?: (sent?: boolean) => void;
  defaultNumber?: string;
  faxDIDOptions?: any[];
  selectedDID?: any;
  isFromDisabled?: boolean;
}

const SendFaxModal = ({
  handleClose = () => undefined,
  defaultNumber = '',
  faxDIDOptions = [],
  selectedDID,
  isFromDisabled = false,
}: SendFaxModalProps) => {
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [faxFile, setFaxFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    mode: 'onChange',
    defaultValues: {
      from: selectedDID?.value ? selectedDID : faxDIDOptions[0] || null,
      to: defaultNumber,
    },
    resolver: yupResolver(validationSchema),
  });

  const [from, to] = watch(['from', 'to']);

  useEffect(() => {
    if (from?.value) return;
    const defaultFrom = selectedDID?.value ? selectedDID : faxDIDOptions[0];
    if (defaultFrom) setValue('from', defaultFrom, { shouldValidate: true });
  }, [faxDIDOptions, from?.value, selectedDID, setValue]);

  const { mutateAsync: sendFaxMutate, isPending } = useMutation({
    mutationFn: sendFax,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faxList'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['faxToNumberList'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['getUsersDetails'], exact: false });
      handleAlert({ type: 'success', text: 'Fax sent successfully' });
      handleClose(true);
    },
    onError: ({ response }: any) => {
      handleAlert({
        type: 'error',
        text: response?.data?.error?.message || 'Failed to send fax',
      });
    },
  });

  const clearFile = () => {
    setFaxFile(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectFile = (file?: File | null) => {
    if (!file) return;

    if (!isPdfFile(file)) {
      clearFile();
      setFileError('Only PDF files are allowed');
      handleAlert({ type: 'error', text: 'Only PDF files are allowed' });
      return;
    }

    if (file.size > MAX_FAX_FILE_SIZE) {
      clearFile();
      setFileError('PDF file size must be 10MB or less');
      handleAlert({ type: 'error', text: 'PDF file size must be 10MB or less' });
      return;
    }

    setFileError('');
    setFaxFile(file);
  };

  const uploadFaxFile = async (file: File) => {
    const companyUuid = user?.company_info?.uuid || user?.company_uuid;
    if (!companyUuid) throw new Error('Company uuid not found');

    const uploadResponse = await mediaUploadUrl({
      uuid: companyUuid,
      type: 'fax',
      file_name: file.name,
    });
    const uploadResult = uploadResponse?.data?.data?.result;
    const uploadUrl = uploadResult?.url;
    const fileName = uploadResult?.file_name;

    if (!uploadUrl || !fileName) throw new Error('Failed to generate fax upload URL');

    const fileUploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
    });

    if (!fileUploadResponse.ok) throw new Error('Failed to upload PDF');
    const apiBaseUrl = String(getEnv().VITE_API_BASE_URL || '').replace(/\/+$/, '');
    if (!apiBaseUrl) throw new Error('API base URL is not configured');

    return `${apiBaseUrl}/api/media/direct/${encodeURIComponent(companyUuid)}/fax/${encodeURIComponent(fileName)}`;
  };

  const handleSendFax = async (values: any) => {
    if (isPending || isUploading) return;
    if (!faxFile) {
      setFileError('PDF file is required');
      return;
    }

    setIsUploading(true);
    try {
      const mediaUrl = await uploadFaxFile(faxFile);
      await sendFaxMutate({
        from: normalizePhoneNumber(values?.from?.value),
        to: normalizePhoneNumber(values?.to),
        mediaUrl,
        pageCount: 1,
        storePreview: true,
        previewFormat: 'pdf',
      });
    } catch (error: any) {
      if (!error?.response) {
        handleAlert({
          type: 'error',
          text: error?.message || 'Failed to upload PDF',
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitting = isPending || isUploading;
  const canSend = Boolean(from?.value && String(to || '').trim() && faxFile);

  return (
    <>
      <div className="flex min-h-11 items-center justify-between text-gray-900">
        <div className="truncate text-md font-semibold">New Fax</div>
      </div>
      <form
        className="flex min-h-0 w-full flex-1 flex-col justify-between gap-2"
        onSubmit={handleSubmit(handleSendFax)}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <CustomSelect
            label="From"
            options={faxDIDOptions}
            value={from}
            placeholder="Select DID Number"
            error={errors?.from?.message}
            handleChange={(value) => setValue('from', value, { shouldValidate: true })}
            isDisabled={isFromDisabled}
          />

          <div className="flex w-full flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>To</Label>
              {errors?.to?.message ? <ErrorTooltip text={errors.to.message} /> : null}
            </div>
            <PhoneInput
              country="in"
              onlyCountries={['in']}
              disableDropdown
              value={String(to || '')}
              onChange={(value: string) => setValue('to', value, { shouldValidate: true })}
              containerClass={`w-full ${errors?.to?.message ? 'phone-error' : ''}`}
            />
          </div>

          <div className="flex w-full flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Fax File</Label>
              {fileError ? <ErrorTooltip text={fileError} /> : null}
            </div>
            <label
              htmlFor="fax-file-upload"
              className={cn(
                'flex min-h-44 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors duration-200',
                isDragging
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:bg-gray-50',
                fileError && 'border-red-500',
              )}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragging(false);
                selectFile(event.dataTransfer.files?.[0]);
              }}
            >
              <input
                ref={fileInputRef}
                id="fax-file-upload"
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onClick={(event) => {
                  event.currentTarget.value = '';
                }}
                onChange={(event) => selectFile(event.target.files?.[0])}
              />

              {faxFile ? (
                <div className="flex w-full max-w-sm items-center gap-3 rounded-lg bg-gray-50 px-3 py-3 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{faxFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(faxFile.size)} - PDF</p>
                  </div>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-red-500"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      clearFile();
                    }}
                    aria-label="Remove PDF"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="pt-3 text-sm font-medium text-gray-900">
                    {isDragging ? 'Drop PDF here' : 'Upload PDF'}
                  </p>
                  <p className="pt-1 text-xs text-gray-500">Max file size: 10MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
          <Button
            variant="transparent"
            type="button"
            onClick={() => handleClose()}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            type="submit"
            className="w-full sm:w-auto"
            disabled={!canSend || isSubmitting}
          >
            {isSubmitting ? <Loader variant="white" size="sm" /> : 'Send Fax'}
          </Button>
        </div>
      </form>
    </>
  );
};

export default SendFaxModal;
