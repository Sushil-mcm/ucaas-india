import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/assets/icons/icon';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';

const GeneralSettings = () => {
  const { user } = useUser();

  return (
    <div className="w-full min-w-0 bg-gray-200/15 flex flex-col overflow-hidden">
      <div className="flex min-h-[65px] items-center justify-between border-b border-gray-200 bg-white p-3">
        <div className="flex min-w-0 items-center gap-1 text-lg font-semibold text-gray-900">
          Data & Reporting
          <div className="shrink-0 -rotate-90 text-gray-800">
            <Icon name="ChevronIcon" className="w-5 h-5" />
          </div>
          <span className="text-primary text-md truncate">General Settings</span>
        </div>
      </div>
      <div className="w-full p-3 overflow-y-auto xs:max-h-[62vh] md:max-h-full">
        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-6">
          <div className="flex flex-col gap-1">
            <div className="text-md font-semibold">App Credentials</div>
            <div className="text-sm text-gray-500">
              Use these to access the zapier platform. Keep them private and secure.
            </div>
          </div>

          <CredentialItem
            label="API Key"
            description="Use the API Key to connect your app with zapier."
            value={user?.uuid}
          />
          <CredentialItem
            label="Client Secret"
            description="Use the client secret to get an access token when using OAuth."
            value="d6d5ed116231378022040f108c9607cd"
          />
        </div>
      </div>
    </div>
  );
};

const CredentialItem = ({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator?.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    handleAlert({ text: 'Copied successfully!', type: 'success' });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <p className="text-sm text-gray-500">{description}</p>
      <div className="flex flex-col gap-2 border p-2 sm:flex-row sm:items-center">
        <Input
          readOnly
          type={isVisible ? 'text' : 'password'}
          value={value}
          className="min-w-0 max-w-xl border-none bg-transparent p-0 font-mono text-sm"
        />
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:text-black cursor-pointer"
            onClick={handleCopy}
          >
            <Icon name={copied ? 'VerifiedCheck' : 'CopyLine'} className="w-4 h-4" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:text-black cursor-pointer"
            onClick={() => setIsVisible(!isVisible)}
          >
            <Icon name={isVisible ? 'EyeLineOff' : 'EyeLine'} className="w-4 h-4" />
            {isVisible ? 'Hide' : 'Show'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
