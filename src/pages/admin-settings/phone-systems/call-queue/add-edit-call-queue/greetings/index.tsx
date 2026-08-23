import { GreetingItem, useGetGreetings } from '@/hooks/common';
import CommonGreetingNotification from '@/components/common-greetings';
import { useFormContext } from 'react-hook-form';

const GreetingNotification = () => {
  const { greetingList } = useGetGreetings();

  const { watch } = useFormContext();

  const optionsData: Record<string, GreetingItem[]> = {
    welcome: greetingList,
    waiting: greetingList,
    hold: greetingList,
    ring_tone: greetingList,
    no_agent_available: greetingList,
    all_agent_busy: greetingList,
  };

  const mediaOptionsGreetingNotifications: {
    name: string;
    placeholder: string;
    label: string;
  }[] = [
    {
      name: 'welcome',
      placeholder: 'Business hour',
      label: 'Business hour',
    },
    {
      name: 'hold',
      placeholder: 'On Hold Music',
      label: 'On hold music',
    },
    {
      name: 'ring_tone',
      placeholder: 'Ring Tone',
      label: 'Ring tone',
    },
    {
      name: 'waiting',
      placeholder: 'Waiting',
      label: 'Waiting | No agent available | All agent busy',
    },
    // {
    //   name: 'no_agent_available',
    //   placeholder: 'No Agent Available',
    //   label: 'No agent available',
    // },
    // {
    //   name: 'all_agent_busy',
    //   placeholder: 'All Agent Busy',
    //   label: 'All agent busy',
    // },
  ];

  if (watch('settings.operational_hours.type') === 'weekly') {
    mediaOptionsGreetingNotifications.push({
      name: 'waiting',
      placeholder: 'After hour',
      label: 'After hour',
    });
  }

  return (
    <CommonGreetingNotification
      {...{ mediaOptionsGreetingNotifications, optionsData }}
      customClass="h-full min-h-0 pr-1"
    />
  );
};

export default GreetingNotification;
