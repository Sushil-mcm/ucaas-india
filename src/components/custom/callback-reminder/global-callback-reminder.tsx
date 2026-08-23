import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { calendarMeetingList, updateEventTaskStatus } from '@/services/api/index.tsx';
import { useDialpad } from '@/hooks/use-dialpad';
import { handleAlert } from '@/lib/utils.ts';
import callbackReminderSound from '@/assets/audio/new-notification.mp3';
import { CallbackReminderItem } from './callback-reminder-item';

export const GlobalCallbackReminder = () => {
  const queryClient: any = useQueryClient();
  const { makeCall } = useDialpad();
  const [closedReminders, setClosedReminders] = useState<string[]>([]);
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const dismissTimersRef = useRef<Record<string, number>>({});
  const [now, setNow] = useState(() => moment());

  useEffect(() => {
    const interval = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(interval);
  }, []);

  const todayDate = now.format('YYYY-MM-DD');

  const { data: calendarMeetingListData } = useQuery({
    queryKey: ['calendarMeetingListTodayEvents', todayDate],
    queryFn: () =>
      calendarMeetingList({
        filters: [
          { key: 'from', value: todayDate },
          { key: 'to', value: todayDate },
        ],
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const { mutate: mutateUpdateStatus } = useMutation({
    mutationFn: updateEventTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarMeetingList'] });
      queryClient.invalidateQueries({ queryKey: ['calendarMeetingListTodayEvents'] });
      queryClient.invalidateQueries({ queryKey: ['calendarMeetingListTaskList'] });
      handleAlert({ text: 'Status updated successfully', type: 'success' });
    },
  });

  const dueNotifications = useMemo(() => {
    const currentTime = now.valueOf();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const dismissedSet = new Set(closedReminders);

    const seenIds = new Set();
    return (calendarMeetingListData || [])
      .filter((task: any) => {
        if (
          !task._id ||
          seenIds.has(task._id) ||
          task.status?.toUpperCase() === 'COMPLETED' ||
          task.category?.toUpperCase() !== 'TASK' ||
          dismissedSet.has(task._id)
        )
          return false;

        seenIds.add(task._id);
        const startTime = moment(task.startTime).valueOf();
        const diff = currentTime - startTime;
        // Show if it's within 10 minutes past due
        return diff >= 0 && diff <= windowMs;
      })
      .sort((a: any, b: any) => moment(a.startTime).valueOf() - moment(b.startTime).valueOf());
  }, [calendarMeetingListData, now, closedReminders]);

  useEffect(() => {
    const newReminders = dueNotifications.filter((n: any) => !notifiedIdsRef.current.has(n._id));
    if (newReminders.length > 0) {
      newReminders.forEach((n: any) => notifiedIdsRef.current.add(n._id));
      const audio = new Audio(callbackReminderSound);
      audio.volume = 0.8;
      audio.play().catch(() => {});
    }
  }, [dueNotifications]);

  const dismissNotification = (id: string) => {
    setExitingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (dismissTimersRef.current[id]) return;

    dismissTimersRef.current[id] = window.setTimeout(() => {
      setClosedReminders((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setExitingIds((prev) => prev.filter((i) => i !== id));
      delete dismissTimersRef.current[id];
    }, 250);
  };

  useEffect(() => {
    return () => {
      Object.values(dismissTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const visibleDueNotifications = dueNotifications.slice(0, 3);

  if (visibleDueNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[2000] h-[245px] w-[360px]">
      {visibleDueNotifications.map((task: any, index: any) => (
        <CallbackReminderItem
          key={task._id}
          task={task}
          stackIndex={index}
          isExiting={exitingIds.includes(task._id)}
          onClose={() => dismissNotification(task._id)}
          onCall={(phone) => {
            if (phone) {
              mutateUpdateStatus({ eventTaskId: task._id, status: 'COMPLETED' });
              dismissNotification(task._id);
              makeCall(phone, {
                extraHeaders: [
                  `X-ContactName: ${task?.details?.contactName || ' '}`,
                  `X-CallerId: ${task?.didNumber || ''}`,
                ],
              });
            } else {
              handleAlert({ text: 'Phone number not available', type: 'error' });
            }
          }}
          onComplete={(id) => {
            mutateUpdateStatus({ eventTaskId: id, status: 'COMPLETED' });
            dismissNotification(id);
          }}
        />
      ))}
    </div>
  );
};
