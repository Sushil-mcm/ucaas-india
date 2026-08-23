import { CircleFadingArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useCompanyFeatures } from '@/hooks/rbac';

interface UpgradeRequiredProps {
  featureKey?: string;
  embedded?: boolean;
}

const UpgradeRequired: React.FC<UpgradeRequiredProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { features } = useCompanyFeatures();
  const hasBillingAccess = Boolean(features?.plan_features?.billing?.action?.view);
  return (
    <div
      className={`w-full flex flex-col items-center px-6 ${
        embedded
          ? 'h-full min-h-0 overflow-y-auto justify-start py-6 sm:justify-center'
          : 'h-screen justify-center'
      }`}
    >
      <div className="max-w-md w-full text-center bg-white p-10 rounded-lg border border-gray-200">
        {/* <Lock size={64} className="text-gray-400 mx-auto" /> */}
        <CircleFadingArrowUp size={50} className="text-gray-500 mx-auto" />

        <h2 className="text-lg font-semibold mt-4 text-gray-900">Upgrade to unlock this feature</h2>

        <p className="text-gray-500 mt-1">
          This feature is currently unavailable. Upgrade your plan to access it.
        </p>

        {hasBillingAccess && (
          <Button
            className="mt-6 w-full sm:w-auto"
            variant={'outline'}
            onClick={() => navigate('/admin-settings/billing/plan')}
          >
            Upgrade
          </Button>
        )}
      </div>
    </div>
  );
};

export default UpgradeRequired;
