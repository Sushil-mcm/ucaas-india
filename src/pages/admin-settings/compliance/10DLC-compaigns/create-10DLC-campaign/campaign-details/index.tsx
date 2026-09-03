// import { UploadLineIcon } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
// import { Button } from '@/components/ui/button';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getObjectLength } from '@/lib/utils';
import { getGCPLIST, getResellerList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Controller } from 'react-hook-form';
import CreateReseller from '../../../reseller/create-reseller';
import { useState } from 'react';
// import { File } from 'lucide-react';
// import { RadioGroup, RadioGroupItem } from '@radix-ui/react-radio-group';

const staticResellerOptions = [
  { label: 'No Reseller', value: 'R000000' },
  { label: 'Add New Reseller', value: 'none' },
];
const CampaignDetails = ({ formInstance }: { formInstance: any }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const {
    control,
    formState: { errors },
  } = formInstance || {};

  const { data: resellerList, isLoading: resellerLoading } = useQuery({
    queryKey: ['getResellerList'],
    queryFn: getResellerList,
    select: (data) => data?.data?.data?.result?.rows,
  });
  const { data: gcpList, isLoading: gcpLoading } = useQuery({
    queryKey: ['getGCPLIST'],
    queryFn: getGCPLIST,
    select: (data) => data?.data?.data?.result,
  });

  return (
    <div className="w-full min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
      <div className="w-full flex flex-col gap-3 border-b border-gray-200 pb-4">
        <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium ">
          Content Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-4">
          <div className="flex w-full gap-1 relative">
            <Controller
              name="usecase"
              control={control}
              render={({ field }) => (
                <Input disabled {...field} label="Use Case" error={errors?.usecase?.message} />
              )}
            />
          </div>
          <div className="flex w-full gap-1 relative">
            <Controller
              name="referenceId"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  maxLength={50}
                  label="Campaign Reference ID"
                  error={errors?.referenceId?.message}
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <Label>Campaign Description</Label>

              <div className="flex items-start">
                {errors?.description?.message && (
                  <ErrorTooltip text={errors?.description?.message} />
                )}
              </div>
            </div>

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`w-full h-full leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700
    focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none
    border border-gray-200 ${
      errors?.description?.message ? 'border-red-500 focus:border-red-500' : ''
    }`}
                  rows={2}
                  placeholder="Description"
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <Label>Call-to-Action/Message Flow Workflow</Label>

              <div className="flex items-start">
                {errors?.messageFlow?.message && (
                  <ErrorTooltip text={errors?.messageFlow?.message} />
                )}
              </div>
            </div>

            <Controller
              name="messageFlow"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`w-full h-full leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700
    focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none
    border border-gray-200 ${
      errors?.messageFlow?.message ? 'border-red-500 focus:border-red-500' : ''
    }`}
                  // className="w-full h-full  leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700 focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none border border-gray-200"
                  rows={2}
                  placeholder="Write here..."
                />
              )}
            />
          </div>
          {/* <div className="w-full">
            <Input label="Terms and Conditions Link" placeholder={''} />
          </div>
          <div className="w-full">
            <Input label="Privacy Policy Link" placeholder={''} />
          </div> */}
        </div>
      </div>
      {/* <div className="w-full flex flex-col gap-3 border-b border-gray-200 pb-4">
        <div className="w-full flex flex-col gap-1">
          <h3 className="text-gray-900 font-medium ">
            CTA (Call-to-Action), Privacy Policy and/or Terms and Condition Mutltimedia Upload
          </h3>
          <p className="text-gray-500 text-sm">
            Provides an area to upload any supporting information for opt in, call-to-action, terms
            and conditions, privacy policy, etc. Not intended for MMS sample messages.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-4">
          <div className="flex gap-4 flex-row">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-54 border-1 border-gray-200 rounded-xl cursor-pointer bg-white "
            >
              <div className="flex flex-col items-center">
                <UploadLineIcon className="w-8 h-8 text-gray-500" />

                <p className="pt-2 text-sm text-gray-900">Drop a mutltimedia file to upload</p>
                <p className="mt-2 text-sm text-gray-700">Supported Format .csv, .xlsx</p>
                <p className="mt-2 text-sm text-gray-700">Maximum upload file size: 10MB</p>
                <p className="mt-2 text-sm text-primary"></p>
              </div>

              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              />
            </label>
          </div>
          <div className=" w-full h-54 border-1  border-gray-200 rounded-xl bg-white ">
            <div className="p-3 rounded-t-xl bg-gray-100">
              <h3 className="text-gray-900 font-medium ">Multimedia File</h3>
            </div>
            <div className="w-full max-h-[158px] overflow-y-auto flex flex-col gap-1.5 p-3">
              <p className="flex items-center gap-1 text-sm">
                <File className="w-4 h-4" /> Demo
              </p>
              <p className="flex items-center gap-1 text-sm">
                <File className="w-4 h-4" /> Demo
              </p>
              <p className="flex items-center gap-1 text-sm">
                <File className="w-4 h-4" /> Demo
              </p>
            </div>
          </div>
        </div>
        <div className="w-full text-center">
          <Button variant={'primary'} type="submit">
            Add Sample Multimeida
          </Button>
        </div>
      </div> */}
      {/* <div className="w-full flex flex-col gap-3 border-b border-gray-200 pb-4">
        <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium ">Keywords</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-4">
          <div className="flex w-full gap-1 relative">
            <Input label="Opt In Keywords " placeholder={'START, YES'} />
          </div>
          <div className="flex w-full gap-1 relative">
            <Input label="Opt Out Keywords  " placeholder={'STOP, UNSUBSCRIBE  '} />
          </div>
          <div className="flex w-full gap-1 relative">
            <Input label="Help Keywords  " placeholder={'Help  '} />
          </div>
        </div>
      </div> */}
      {/* <div className="w-full flex flex-col gap-3 border-b border-gray-200 pb-4">
        <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium ">
          Auto-responses
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-4">
          <div className="flex flex-col gap-1.5 w-full">
            <Label className="text-sm leading-none font-medium">Opt In Message</Label>
            <textarea
              className="w-full h-full  leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700 focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none border border-gray-200"
              rows={3}
              placeholder="[Brand name]: Thanks for subscribing to [use case(s)]!
Reply HELP for help. Message frequency may vary. Msg&data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out."
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <Label className="text-sm leading-none font-medium">Opt Out Message</Label>
            <textarea
              className="w-full h-full  leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700 focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none border border-gray-200"
              rows={3}
              placeholder="[Brand name]: You are unsubscribed and will receive no further messages."
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <Label className="text-sm leading-none font-medium">Help Message</Label>
            <textarea
              className="w-full h-full  leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700 focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none border border-gray-200"
              rows={3}
              placeholder="[Brand name]: Please reach out to us at [website/email/toll free number] for help."
            />
          </div>
        </div>
      </div> */}
      <div className="w-full flex flex-col gap-3 border-b border-gray-200 pb-4">
        {/* <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium ">
          Sample Messages
        </h3> */}

        <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-4">
          <div className="flex flex-col gap-1.5 w-full">
            {/* <Label className="text-sm leading-none font-medium">Message 1</Label> */}

            <div className="flex items-center justify-between">
              <Label> Sample Messages</Label>

              <div className="flex items-start">
                {errors?.sample1?.message && <ErrorTooltip text={errors?.sample1?.message} />}
              </div>
            </div>

            <Controller
              name="sample1"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`w-full h-full leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700
                  focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none
                  border border-gray-200 ${
                    errors?.sample1?.message ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  // className="w-full h-full  leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700 focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none border border-gray-200"
                  rows={3}
                  placeholder="Message"
                />
              )}
            />
          </div>
          {/* <div className="flex items-center gap-1.5 w-full">
            <Button variant={'primary'} type="submit">
              Add Sample Message
            </Button>
          </div> */}
        </div>
      </div>
      {/* <div className="w-full flex flex-col gap-3 border-b border-gray-200 pb-4">
        <div className="w-full flex flex-col gap-1">
          <h3 className="text-gray-900 font-medium ">Sample Multimedia</h3>
          <p className="text-gray-500 text-sm">
            Provides an area to upload sample MMS content. Not intended for call-to-action, terms
            and conditions, or privacy policy information.
          </p>
        </div>
        <div className="grid grid-cols-2 w-full gap-4">
          <div className="flex gap-4 flex-row">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-54 border-1 border-gray-200 rounded-xl cursor-pointer bg-white "
            >
              <div className="flex flex-col items-center">
                <UploadLineIcon className="w-8 h-8 text-gray-500" />

                <p className="pt-2 text-sm text-gray-900">Drop a mutltimedia file to upload</p>
                <p className="mt-2 text-sm text-gray-700">Supported Format .csv, .xlsx</p>
                <p className="mt-2 text-sm text-gray-700">Maximum upload file size: 10MB</p>
                <p className="mt-2 text-sm text-primary"></p>
              </div>

              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              />
            </label>
          </div>
          <div className=" w-full h-54 border-1  border-gray-200 rounded-xl bg-white ">
            <div className="p-3 rounded-t-xl bg-gray-100">
              <h3 className="text-gray-900 font-medium ">Sample Multimedia File</h3>
            </div>
            <div className="w-full max-h-[158px] overflow-y-auto flex flex-col gap-1.5 p-3">
              <p className="flex items-center gap-1 text-sm">
                <File className="w-4 h-4" /> Demo
              </p>
              <p className="flex items-center gap-1 text-sm">
                <File className="w-4 h-4" /> Demo
              </p>
              <p className="flex items-center gap-1 text-sm">
                <File className="w-4 h-4" /> Demo
              </p>
            </div>
          </div>
        </div>
        <div className="w-full text-center">
          <Button variant={'primary'} type="submit">
            Add Sample Multimeida
          </Button>
        </div>
      </div> */}
      {/* <div className="w-full flex flex-col gap-3 border-b border-gray-200 pb-4">
        <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium ">
          Campaign and Content Attributes
        </h3>
        <div className="grid grid-cols-5 w-full gap-6">
          <div className="flex flex-col gap-3">
            <p className="font-medium text-gray-900 text-sm">Subscriber Opt-in</p>
            <div className="flex gap-3 relative">
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-medium text-gray-900 text-sm">Subscriber Opt-out</p>
            <div className="flex gap-3 relative">
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-medium text-gray-900 text-sm">Subscriber Opt-help</p>
            <div className="flex gap-3 relative">
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-medium text-gray-900 text-sm">Number Pooling</p>
            <div className="flex gap-3 relative">
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-medium text-gray-900 text-sm">Direct Lending or Loan Arrangement</p>
            <div className="flex gap-3 relative">
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-medium text-gray-900 text-sm">Embedded Link</p>
            <div className="flex gap-3 relative">
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-medium text-gray-900 text-sm">Embedded Phone Number</p>
            <div className="flex gap-3 relative">
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="font-medium text-gray-900 text-sm">Age-Gated Content</p>
            <div className="flex gap-3 relative">
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-medium text-gray-900 text-sm">Terms & Conditions</p>
            <div className="flex gap-3 relative">
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
              <RadioGroup className="flex flex-col gap-4 ">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="" className="cursor-pointer" />
                  <Label className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>
      </div> */}
      <div className="w-full flex flex-col gap-3 border-b border-gray-200 pb-4">
        <div className="w-full flex flex-col gap-1">
          <h3 className="text-gray-900 font-medium ">Other Responsible Parties</h3>
          <p className="text-gray-500 text-sm">
            For Sole Proprietor campaigns, if your CNP is not showing in the list, it means they are
            not enabled to receive Sole Proprietor campaigns. Please reach out to your CNP for more
            details.
          </p>
        </div>
        <div className="grid grid-cols-2 w-full gap-4">
          <div className="flex w-full gap-1 relative">
            <Controller
              name="cnp"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label="Connectivity Partner"
                  placeholder="Select"
                  value={field.value}
                  handleChange={field.onChange}
                  error={errors?.cnp?.message}
                  options={
                    getObjectLength(gcpList) &&
                    Object.entries(gcpList)?.map(([key, val]: any) => {
                      return { label: val, value: key };
                    })
                  }
                  isLoading={gcpLoading}
                />
              )}
            />

            {/* <CustomSelect label={'Connectivity Partner'} placeholder={'Select '} /> */}
          </div>
          <div className="flex w-full gap-1 relative">
            <Controller
              name="resellerId"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label="Reseller"
                  placeholder="Select"
                  value={field.value}
                  handleChange={(val) => {
                    if (val?.value === 'none') {
                      setModalOpen(true);
                      return;
                    }
                    field.onChange(val);
                  }}
                  error={errors?.resellerId?.message}
                  options={[
                    ...staticResellerOptions,
                    ...(getObjectLength(resellerList)
                      ? resellerList.map((v: any) => ({
                          label: v.companyName,
                          value: v.resellerId,
                        }))
                      : []),
                  ]}
                  isLoading={resellerLoading}
                />
              )}
            />
          </div>
        </div>
      </div>
      {/* <div className="w-full flex flex-col gap-3 border-b border-gray-200 pb-4">
        <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium ">
          Compliance links
        </h3>
        <div className="grid grid-cols-2 w-full gap-4">
          <div className="flex w-full gap-1 relative">
            <Input label="Privacy Policy " placeholder={''} />
          </div>
          <div className="flex w-full gap-1 relative">
            <Input label="Terms and Conditions " placeholder={''} />
          </div>
        </div>
      </div> */}

      {modalOpen && (
        <CreateReseller
          handleClose={() => setModalOpen(false)}
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
        />
      )}
    </div>
  );
};

export default CampaignDetails;
