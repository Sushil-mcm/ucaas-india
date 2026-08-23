import CommonGreetingNotification from '@/components/common-greetings';
import { GreetingItem, useGetGreetings } from '@/hooks/common';

const Media = () => {
  const { greetingList, promptList } = useGetGreetings();

  const optionsData: Record<string, GreetingItem[]> = {
    menu: promptList,
    welcome: greetingList,
    invalid: greetingList,
  };

  const mediaOptionsGreetingNotifications = [
    {
      name: 'menu',
      placeholder: 'Menu IVR',
      label: 'Menu IVR',
      icon: 'HoldMusicIcon',
      iconClass: 'h-5 w-5 text-orange-500',
      disabled: true,
    },
    {
      name: 'welcome',
      placeholder: 'Welcome',
      label: 'welcome',
      icon: 'MessageStrokIcon',
      iconClass: 'h-5 w-5 text-primary',
    },

    {
      name: 'invalid',
      placeholder: 'Invalid',
      label: 'invalid',
      icon: 'VoicemailborderIcon',
      iconClass: 'h-5 w-5 text-green-500',
    },
  ] as {
    name: string;
    placeholder: string;
    label: string;
    icon: any;
    iconClass: string;
    disabled?: boolean;
  }[];

  return (
    <CommonGreetingNotification
      {...{ mediaOptionsGreetingNotifications, optionsData }}
      customClass="h-full min-h-0 pr-1"
    />
  );
};

export default Media;
