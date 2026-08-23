import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getObjectLength } from '@/lib/utils';
import { getTermsPreview } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import TermsModal from './term.modal';
import { UseFormReturn } from 'react-hook-form';

const CarrierTermsPreview = ({ formInstance }: { formInstance: UseFormReturn<any> }) => {
  const {
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = formInstance || {};

  const { usecase } = watch();
  const selectedMnoIds = watch('mnoIds') || [];
  const [open, setOpen] = useState(false);

  const handleMnoToggle = (key: string) => {
    const numericKey = Number(key);

    const current: number[] = getValues('mnoIds') || [];

    const updated = current.includes(numericKey)
      ? current.filter((id) => id !== numericKey)
      : [...current, numericKey];

    setValue('mnoIds', updated, { shouldValidate: true });
  };

  const { data: previewData } = useQuery({
    queryKey: ['getTermsPreview', usecase],
    queryFn: () =>
      getTermsPreview({
        //  brand_type?.value,
        brandId: 'BX0DJX9',
        usecase: usecase,
      }),
    select: (data) => data?.data?.data?.result?.mnoMetadata,
    enabled: Boolean(usecase),
  });

  useEffect(() => {
    if (getObjectLength(previewData)) {
      const ids = Object.keys(previewData)?.map(Number);
      setValue('mnoIds', ids, { shouldValidate: true });
      setOpen(true);
    }
  }, [previewData, setValue]);

  return (
    <div className="flex min-h-0 flex-col gap-2 w-full overflow-y-auto pr-1">
      <h3 className="text-gray-900 font-semibold text-md">Carrier Terms Preview</h3>
      <p className="text-gray-500 text-sm">
        The below list shows campaign qualification results and terms for each MNO.
      </p>
      <div className="w-full grid overflow-x-auto gap-2 mt-1">
        {errors?.mnoIds?.message ? (
          <div className="text-red-500">{errors?.mnoIds?.message as any}</div>
        ) : null}

        {getObjectLength(previewData) &&
          Object.entries(previewData)?.map(([key, item]: any) => {
            return (
              <div className="flex w-full flex-col lg:flex-row" key={key}>
                <div className="bg-gray-100 border border-b-0 lg:border-b lg:border-r-0 border-gray-200 p-4 rounded-t-lg lg:rounded-t-none lg:rounded-l-lg lg:h-full lg:min-w-[172px]">
                  <div className="flex items-center gap-2 whitespace-nowrap h-full">
                    <Checkbox
                      checked={selectedMnoIds?.includes(Number(key))}
                      onCheckedChange={() => handleMnoToggle(key)}
                    />
                    <Label>{item?.mno || ''}</Label>
                  </div>
                </div>
                <div className="border border-gray-200 p-4 rounded-b-lg lg:rounded-b-none lg:rounded-r-lg w-full grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                  <div className="flex items-center flex-col gap-1 text-center">
                    <h3 className="text-gray-900 font-medium text-sm">Qualify</h3>
                    <p className="text-gray-500 text-sm">{item?.qualify ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex items-center flex-col gap-1 text-center">
                    <h3 className="text-gray-900 font-medium text-sm">MNO Review</h3>
                    <p className="text-gray-500 text-sm">{item?.mnoReview ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex items-center flex-col gap-1 text-center">
                    <h3 className="text-gray-900 font-medium text-sm">TPM Scope</h3>
                    <p className="text-gray-500 text-sm">{item?.tpmScope ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex items-center flex-col gap-1 text-center">
                    <h3 className="text-gray-900 font-medium text-sm">SMS TPM</h3>
                    <p className="text-gray-500 text-sm">{item?.tpm ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex items-center flex-col gap-1 text-center">
                    <h3 className="text-gray-900 font-medium text-sm">MMS TPM</h3>
                    <p className="text-gray-500 text-sm">{item?.mmsTpm ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex items-center flex-col gap-1 text-center">
                    <h3 className="text-gray-900 font-medium text-sm">Message Class</h3>
                    <p className="text-gray-500 text-sm">{item?.msgClass !== 'N' ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            );
          })}

        {/* <div className="flex items-center w-full">
          <div className="bg-gray-100 border border-r-0 border-gray-200 p-4 rounded-l-lg h-full min-w-[172px]">
            <div className="flex items-center gap-2 whitespace-nowrap h-full">
              <Checkbox />
              <Label>T-Mobile</Label>
            </div>
          </div>
          <div className="border border-l-0 border-gray-200 p-4 rounded-r-lg w-full flex items-center justify-around gap-1  whitespace-nowrap ">
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Qualify</h3>
              <p className="text-gray-500 text-sm">{item?.mnoSupport ? "Yes" : "No"}</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MNO Review</h3>
              <p className="text-gray-500 text-sm">{item?.mnoSupport ? "Yes" : "No"}</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Brand Tier</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Brand Daily Cap</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MMS TPM</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Message Class</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
          </div>
        </div>

        <div className="flex items-center w-full">
          <div className="bg-gray-100 border border-r-0 border-gray-200 p-4 rounded-l-lg h-full min-w-[172px]">
            <div className="flex items-center gap-2 whitespace-nowrap h-full">
              <Checkbox />
              <Label>Verizon Wireless</Label>
            </div>
          </div>
          <div className="border border-l-0 border-gray-200 p-4 rounded-r-lg w-full flex items-center justify-around gap-1  whitespace-nowrap ">
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Qualify</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MNO Review</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">TPM Scope</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">SMS TPM</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MMS TPM</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Message Class</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
          </div>
        </div>

        <div className="flex items-center w-full">
          <div className="bg-gray-100 border border-r-0 border-gray-200 p-4 rounded-l-lg h-full min-w-[172px]">
            <div className="flex items-center gap-2 whitespace-nowrap h-full">
              <Checkbox />
              <Label>US Cellular</Label>
            </div>
          </div>
          <div className="border border-l-0 border-gray-200 p-4 rounded-r-lg w-full flex items-center justify-around gap-1  whitespace-nowrap ">
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Qualify</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MNO Review</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">TPM Scope</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">SMS TPM</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MMS TPM</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Message Class</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
          </div>
        </div>

        <div className="flex items-center w-full">
          <div className="bg-gray-100 border border-r-0 border-gray-200 p-4 rounded-l-lg h-full min-w-[172px]">
            <div className="flex items-center gap-2 whitespace-nowrap h-full">
              <Checkbox />
              <Label>ClearSKY</Label>
            </div>
          </div>
          <div className="border border-l-0 border-gray-200 p-4 rounded-r-lg w-full flex items-center justify-around gap-1  whitespace-nowrap ">
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Qualify</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MNO Review</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">TPM Scope</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">SMS TPM</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MMS TPM</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Message Class</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
          </div>
        </div>

        <div className="flex items-center w-full">
          <div className="bg-gray-100 border border-r-0 border-gray-200 p-4 rounded-l-lg h-full min-w-[172px]">
            <div className="flex items-center gap-2 whitespace-nowrap h-full">
              <Checkbox />
              <Label>Interop</Label>
            </div>
          </div>
          <div className="border border-l-0 border-gray-200 p-4 rounded-r-lg w-full flex items-center justify-around gap-1  whitespace-nowrap ">
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Qualify</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MNO Review</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">TPM Scope</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">SMS TPM</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">MMS TPM</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
            <div className="flex items-center flex-col gap-1">
              <h3 className="text-gray-900 font-medium text-sm">Message Class</h3>
              <p className="text-gray-500 text-sm">Yes</p>
            </div>
          </div>
        </div> */}
      </div>
      {/* <TableManager
        {...{
          columns,
          showPagination: false,
          customClass: 'h-full',
        }}
      /> */}

      <TermsModal
        {...{
          apiLoading: false,
          onConfirm: () => {
            setOpen(false);
          },
          confirmBtnText: 'OK',
          open,
          setOpen,
        }}
      />
    </div>
  );
};

export default CarrierTermsPreview;
