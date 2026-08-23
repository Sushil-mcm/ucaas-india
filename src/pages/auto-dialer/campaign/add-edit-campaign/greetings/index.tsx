import { GreetingItem, useGetGreetings } from '@/hooks/common';
import CommonGreetingNotification from '@/components/common-greetings';

const GreetingNotification = () => {
  const { greetingList } = useGetGreetings();

  const optionsData: Record<string, GreetingItem[]> = {
    hold: greetingList,
  };

  const mediaOptionsGreetingNotifications: {
    name: string;
    placeholder: string;
    label: string;
  }[] = [
    {
      name: 'hold',
      placeholder: 'On Hold Music',
      label: 'On hold music',
    },
  ];

  return (
    <CommonGreetingNotification
      {...{ mediaOptionsGreetingNotifications, optionsData }}
      customClass="h-[calc(100vh_-_22.5rem)]"
    />
  );
};

export default GreetingNotification;
