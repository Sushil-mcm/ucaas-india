import CommonGreetingNotification from '@/components/common-greetings';
import { GreetingItem, useGetGreetings } from '@/hooks/common';

const Media = () => {
  const { greetingList = [], voicemailList = [] } = useGetGreetings();

  const optionsData: Record<string, GreetingItem[]> = {
    welcome: greetingList,
    hold: greetingList,
    voicemail: voicemailList,
  };

  const mediaOptionsGreetingNotifications = [
    {
      name: 'welcome',
      placeholder: 'Welcome',
      label: 'welcome',
      icon: 'MessageStrokIcon',
      iconClass: 'h-5 w-5 text-primary',
    },
    {
      name: 'hold',
      placeholder: 'On Hold Music',
      label: 'on hold music',
      icon: 'HoldMusicIcon',
      iconClass: 'h-5 w-5 text-orange-500',
    },
  ].filter(Boolean);

  return (
    <CommonGreetingNotification
      {...{ mediaOptionsGreetingNotifications, optionsData, formParentKey: 'media' }}
    />
  );
};

export default Media;
