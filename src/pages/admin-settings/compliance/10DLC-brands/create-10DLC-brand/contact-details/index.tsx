import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UseFormReturn, Controller } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';

const ContactDetails = ({ formMethods }: { formMethods: UseFormReturn<any> }) => {
  const { control, watch } = formMethods;
  const entityType = watch('entityType');
  const isPublicProfit = entityType?.value === 'PUBLIC_PROFIT';

  return (
    <>
      <div className="flex flex-col gap-4 h-[calc(100vh_-_16rem)] overflow-auto pr-1 ten-dlc-brand-step-scroll">
        {/* Support Contact Details */}
        <h3 className="text-primary flex items-center gap-1.5 font-medium mb-1">
          Support Contact Details
        </h3>

        <div className="grid grid-cols-2 w-full gap-4 ten-dlc-brand-two-col-grid">
          {/* Support Email */}
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                label="Support Email Address *"
                placeholder="Enter support email"
                error={fieldState.error?.message}
              />
            )}
          />

          {/* Support Phone */}

          <div className="flex flex-col gap-1">
            <Label>Support Phone Number *</Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  {...field}
                  country={'us'}
                  countryCodeEditable={false}
                  // containerClass={forwardValueError ? 'phone-error' : ''}
                />
              )}
            />
          </div>
        </div>

        {/* Business Contact Details */}
        {isPublicProfit && (
          <>
            <h3 className="text-primary flex items-center gap-1.5 font-medium mt-4 mb-1">
              Business Contact Details
            </h3>

            <div className="grid grid-cols-2 w-full gap-4 ten-dlc-brand-two-col-grid">
              <Controller
                name="businessContactEmail"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1">
                    <Input
                      {...field}
                      label="Business Email Address *"
                      placeholder="Enter business contact email"
                      error={fieldState.error?.message}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Note: Common distribution addresses (like sales@company.com) and personal/free
                      email addresses are not allowed.
                    </p>
                  </div>
                )}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ContactDetails;
