import { UseFormReturn } from 'react-hook-form';
import clsx from 'clsx';
import { BRAND_RELATIONSHIP_OPTIONS } from '../../constant';

const BrandRelationship = ({ formMethods }: { formMethods: UseFormReturn<any> }) => {
  const { setValue, watch } = formMethods;

  const selected = watch('brandRelationship');
  const entityType = watch('entityType');
  const isSoleProprietor = entityType?.value === 'SOLE_PROPRIETOR';

  if (isSoleProprietor) {
    return (
      <div className="flex flex-col gap-2 h-[calc(100vh_-_16rem)] overflow-auto pr-1 items-center justify-center ten-dlc-brand-step-scroll">
        <p className="text-gray-500">
          Brand Relationship is not required for Sole Proprietor entities.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh_-_16rem)] overflow-auto pr-1 ten-dlc-brand-step-scroll">
      <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 ten-dlc-brand-relationship-grid">
        {BRAND_RELATIONSHIP_OPTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = selected === item.key;

          return (
            <div
              key={item.key}
              onClick={() => setValue('brandRelationship', item.key)}
              className={clsx(
                'cursor-pointer p-3 flex flex-col gap-2 rounded-lg items-center bg-white hover:bg-gray-50 border',
                isActive ? 'border-primary shadow-sm' : 'border-gray-200 hover:border-primary',
              )}
            >
              <span
                className={clsx(
                  'w-12 min-w-12 h-12 p-2 rounded-full border flex items-center justify-center',
                  isActive
                    ? 'border-primary text-primary bg-ucass-primary-200'
                    : 'border-gray-300 text-primary bg-gray-100',
                )}
              >
                <Icon className="w-6 h-6" />
              </span>

              <h3 className="font-medium text-base text-center">{item.title}</h3>

              <p className="text-sm text-gray-500 text-center">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BrandRelationship;
