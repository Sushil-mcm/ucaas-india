import { InfoIcon } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import { handleAlert } from '@/lib/utils';
import { generatePrivateMeetingLink, getPrivateMeetingLink } from '@/services/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, CopyIcon } from 'lucide-react';
import { useState } from 'react';

const SettingsVideo = () => {
  const origin = window.location.origin;
  const [copiedLink, setCopiedLink] = useState(false);

  const { mutate: meetingLinkMutate, isPending } = useMutation({
    mutationFn: generatePrivateMeetingLink,
    onSuccess: () => {
      refetch();
    },
  });

  const { data: privateMeetingLink, refetch } = useQuery({
    queryKey: ['getPrivateLinkQueryFn'],
    queryFn: () => getPrivateMeetingLink(),
    select: (data) => data?.data?.data?.result,
  });

  return (
    <>
      {/* right content */}
      <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <div>
            <p className="text-gray-900 font-semibold text-lg">Video</p>
            <p className="text-gray-500 text-xs">
              Your camera, microphone and how you join meetings.
            </p>
          </div>
        </div>

        <div className="gap-3 flex flex-col p-3">
          <h4 className="text-gray-900 font-semibold text-lg">General</h4>
          <div className="border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] bg-white rounded-xl p-4 gap-3.5 flex flex-col h-full">
            <div className="flex flex-col gap-1.5">
              <p className="font-semibold truncate text-md text-gray-900">Personal meeting</p>
              <p className="text-gray-800 text-sm">Generate or copy the personal meeting link</p>
              {privateMeetingLink && privateMeetingLink?.meetingId ? (
                <div className="flex items-center gap-1">
                  <p className="text-gray-800 text-sm">
                    Personal meeting link:
                    <span
                      className="cursor-pointer text-primary"
                      onClick={() =>
                        window.open(
                          `${origin}/video-meet?meetCode=${privateMeetingLink?.meetingId}`,
                          '_blank',
                        )
                      }
                    >
                      {' '}
                      {origin}/video-meet?meetCode={privateMeetingLink?.meetingId}
                    </span>
                  </p>
                  <Button
                    className="hover:text-black cursor-pointer"
                    variant={'ghost'}
                    size={'sm'}
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        `${origin}/video-meet?meetCode=${privateMeetingLink?.meetingId}`,
                      );
                      setCopiedLink(true);
                      setTimeout(() => {
                        setCopiedLink(false);
                      }, 3000);
                      handleAlert({
                        text: 'Meeting link copied successfully!',
                        type: 'success',
                      });
                    }}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-5 h-5" />
                      </>
                    ) : (
                      <CopyIcon className="w-5 h-5 text-gray-500" />
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
            {!privateMeetingLink?.meetingId && (
              <>
                <div className="w-full">
                  <span className="bg-red-50 text-red-500 p-4 rounded-xl inline-flex items-center gap-2">
                    <InfoIcon className="w-5 h-5" />
                    <p className="text-sm">The private meeting link has not been generated yet</p>
                  </span>
                </div>
                <Button
                  className="w-fit"
                  variant={'outline'}
                  type="button"
                  onClick={() => meetingLinkMutate()}
                >
                  {isPending ? 'Generating...' : 'Generate'}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
      {/* right content */}
    </>
  );
};

export default SettingsVideo;
