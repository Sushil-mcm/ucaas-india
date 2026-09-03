import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReactNode, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import CampaignDetails from './campaign-details';
import CarrierTermsPreview from './carrier-terms-preview';
import CampaignUseCase from './campaign-use-case';
import PaymentAndConfirmation from './payment-and-confirmation';
import {
  campaignDetailSchema,
  CAMPAINGN_INITIALS,
  paymentSchema,
  TermsPreviewSchema,
  useCaseSchema,
} from '../constant';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addCampaign } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { yupResolver } from '@hookform/resolvers/yup';
import { AnyObjectSchema } from 'yup';
import AlertConfirm from '@/components/custom/alert-confirm';

export const DLC_CAMPAIGN_CONST = {
  'use-case': 'Campaign Use Case',
  terms: 'Carrier Terms Preview',
  details: 'Campaign Details',
  payment: 'Payment and Confirmation',
};

type TabKey = 'use-case' | 'terms' | 'details' | 'payment';

const tabOrder: TabKey[] = ['use-case', 'terms', 'details', 'payment'];

const nextTabMap: Record<TabKey, TabKey | null> = {
  'use-case': 'terms',
  terms: 'details',
  details: 'payment',
  payment: null,
};

const schemaLookUp: Record<TabKey, any> = {
  'use-case': useCaseSchema,
  terms: TermsPreviewSchema,
  details: campaignDetailSchema,
  payment: paymentSchema,
};

const Create10DLCCampaign = ({ setDrawerState }: { drawerState: boolean; setDrawerState: any }) => {
  const queryClient: any = useQueryClient();

  const [currentStep, setCurrentStep] = useState<TabKey>('use-case');
  const [open, setOpen] = useState(false);

  const activeSchema = useMemo(() => {
    return schemaLookUp[currentStep] as AnyObjectSchema;
  }, [currentStep]);

  const formInstance = useForm<any>({
    defaultValues: CAMPAINGN_INITIALS,
    resolver: yupResolver(activeSchema),
    mode: 'onChange',
  });

  const { handleSubmit } = formInstance;

  const stepLookUp: Record<TabKey, ReactNode> = {
    'use-case': <CampaignUseCase {...{ formInstance }} />,
    terms: <CarrierTermsPreview {...{ formInstance }} />,
    details: <CampaignDetails {...{ formInstance }} />,
    payment: <PaymentAndConfirmation {...{ formInstance }} />,
  };

  const { mutate, isPending } = useMutation({
    mutationFn: addCampaign,
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries(['getUsersDetails'], {
        exact: true,
      });
      handleAlert({
        text: data?.data?.message,
        type: 'success',
      });
      setDrawerState(false);
    },
  });

  const currentIndex = tabOrder.indexOf(currentStep);

  const goNext = async () => {
    const isValid = await formInstance.trigger();

    if (!isValid) return;

    const nextTab = nextTabMap[currentStep];

    if (nextTab) {
      setCurrentStep(nextTab);
    } else {
      setOpen(true);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentStep(tabOrder[currentIndex - 1]);
    }
  };
  const handleTabChange = async (targetTab: TabKey) => {
    const currentIndex = tabOrder.indexOf(currentStep);
    const targetIndex = tabOrder.indexOf(targetTab);

    // Allow moving backward freely
    if (targetIndex < currentIndex) {
      setCurrentStep(targetTab);
      return;
    }

    // For forward movement, validate current tab
    const isValid = await formInstance.trigger();
    if (isValid) {
      setCurrentStep(targetTab);
    }
  };

  const onSubmit = (data: any) => {
    const { brand_type, resellerId, cnp, payment_terms: _, ...rest } = data || {};
    const payload = {
      ...rest,
      brandId: brand_type?.value,
      resellerId: resellerId?.value,
      cnp: cnp?.value,
    };

    mutate(payload);
  };

  return (
    <>
      <div className="w-full h-full min-h-0 overflow-hidden flex flex-col gap-4 justify-between">
        <Tabs
          value={currentStep}
          onValueChange={(val) => handleTabChange(val as TabKey)}
          className="flex w-full min-h-0 flex-col"
        >
          <div className="w-full overflow-x-auto overflow-y-hidden border-b border-[#EEE7DD]">
            <TabsList className="flex min-w-max flex-nowrap text-sm font-semibold text-center p-0 rounded-none bg-transparent min-h-10">
              {Object.entries(DLC_CAMPAIGN_CONST).map(([key, value]) => {
                return (
                  <TabsTrigger
                    className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-3 sm:px-6 text-[#2E2D35] cursor-pointer h-full rounded-none min-w-max relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs whitespace-nowrap"
                    key={key}
                    value={key}
                  >
                    {value}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </Tabs>
        <FormProvider {...formInstance}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="h-full min-h-0 w-full flex flex-1 flex-col justify-between gap-4 overflow-hidden"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">{stepLookUp?.[currentStep]}</div>
            <div className="mt-2 shrink-0 border-t border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] pt-4 sm:mt-4">
              <div className="flex min-w-max flex-nowrap justify-start gap-2 overflow-x-auto overflow-y-hidden sm:justify-end">
                <Button
                  variant="transparent"
                  type="button"
                  onClick={() => setDrawerState(false)}
                  className="shrink-0"
                >
                  Cancel
                </Button>

                <Button
                  variant="outline"
                  type="button"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="shrink-0"
                >
                  Prev
                </Button>

                <Button
                  variant="outline"
                  type="button"
                  onClick={goNext}
                  disabled={isPending}
                  className="shrink-0"
                >
                  {currentStep === 'payment' ? 'Submit' : 'Next'}
                </Button>
              </div>
            </div>
            {/* <div className="flex justify-end gap-2">
              <Button variant={'transparent'} type="button" onClick={() => setDrawerState(false)}>
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant={'outline'}
                  type="button"
                  onClick={handlePrev}
                  disabled={currentStep === TABS_ORDER[0]}
                >
                  Prev
                </Button>
                {currentStep !== DLC_CAMPAIGN_CONST.PAYMENT_AND_CONFIRMATION && (
                  <Button variant={'outline'} type="button" onClick={handleNext}>
                    Next
                  </Button>
                )}
                {currentStep === DLC_CAMPAIGN_CONST.PAYMENT_AND_CONFIRMATION && (
                  <Button variant={'primary'} type="submit" disabled={isPending} >
                    {isPending ? 'Submiting...' : 'Submit'}
                  </Button>
                )}
              </div>
            </div> */}
          </form>
        </FormProvider>
      </div>

      <AlertConfirm
        {...{
          apiLoading: isPending,
          onConfirm: () => {
            formInstance.handleSubmit(onSubmit)();
          },
          open,
          setOpen,
          descriptionTextComp: (
            <div className=" text-md">
              Are you sure you want to proceed with creating the campaign? The amount $20 will be
              deducted from your wallet?
            </div>
          ),
        }}
      />
    </>
  );
};

export default Create10DLCCampaign;
