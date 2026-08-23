import React, { useState } from 'react';
import moment from 'moment';
import { Calendar, CheckCircle2, Clock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canEditMeeting, cn, formatTime } from '@/lib/utils';
import SideDrawer from '@/components/custom/side-drawer';
import ScheduleEventModal from '@/pages/video-meetings/Calender/Modal/ScheduleEventModal';
import { SCHEDULEMEETING } from '@/pages/video-meetings/Calender/constants';
import { useUser } from '@/hooks/use-user';
import { useCompanyFeatures } from '@/hooks/rbac';

interface TaskItemProps {
  task: {
    taskId?: string;
    _id?: string;
    eventTaskId?: string;
    name?: string;
    startTime?: string;
    startTimeLocal?: string;
    timezone?: string;
    description?: string;
    status?: string;
    createdById?: string;
    mode?: string;
  };
  isMine: boolean;
  currentChat: any;
  msgObj: any;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isMine, currentChat, msgObj }) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const { user } = useUser();
  const { features } = useCompanyFeatures();
  const videAccess = features?.plan_features?.video?.action || {};

  if (!task) return null;

  const formattedDate = task?.startTime ? moment(task.startTime).format('ddd, MMM D, YYYY') : '-';
  const formattedTime = task?.startTime ? formatTime(task.startTime) : '-';
  const taskId = task?.taskId || task?.eventTaskId || task?._id || '';
  const isTaskOwner = (task?.createdById || msgObj?.senderId) === user?.uuid;
  const canShowEditTaskButton =
    canEditMeeting(task?.startTimeLocal || task?.startTime || '') &&
    isTaskOwner &&
    task?.mode !== 'CHAT' &&
    videAccess?.edit;

  const scheduleForEdit = taskId
    ? {
        _id: taskId,
        category: 'TASK',
        raw: {
          _id: taskId,
          category: 'TASK',
        },
      }
    : null;

  return (
    <div
      className={cn(
        'max-w-[300px] rounded-2xl overflow-hidden border shadow-sm transition-all hover:shadow-md',
        isMine ? 'bg-white border-ucass-active-bg' : 'bg-white border-gray-100',
      )}
    >
      <div
        className={cn(
          'px-4 py-3 flex items-center gap-3',
          isMine ? 'bg-ucass-active-bg/50' : 'bg-gray-50/50',
        )}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            isMine
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-gray-200 text-gray-600',
          )}
        >
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-[15px] font-bold text-gray-900 truncate uppercase tracking-tight">
            Task
          </h4>
          {/* <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Action Item</p> */}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-gray-800 leading-tight">
            {task?.name || 'Untitled Task'}
          </h3>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Globe className="w-3 h-3" />
            <span className="text-[11px] font-medium">{task?.timezone || 'No Timezone'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Date</p>
              <p className="text-[12px] font-semibold text-gray-700 truncate">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 group bg-white">
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Time</p>
              <p className="text-[12px] font-semibold text-gray-700 truncate">{formattedTime}</p>
            </div>
          </div>
        </div>
      </div>

      {canShowEditTaskButton && scheduleForEdit ? (
        <div className="px-4 pb-4 pt-1">
          <Button
            onClick={() => setIsTaskModalOpen(true)}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            Edit Task
          </Button>
        </div>
      ) : null}

      {isTaskModalOpen && scheduleForEdit ? (
        <SideDrawer
          isOpen={isTaskModalOpen}
          title="Update Task"
          handleClose={() => setIsTaskModalOpen(false)}
          content={
            <ScheduleEventModal
              schedule={scheduleForEdit as any}
              source="CHAT"
              startDate={null as any}
              handleClose={() => setIsTaskModalOpen(false)}
              isEdit={true}
              category={SCHEDULEMEETING.task}
              currentChat={currentChat}
              msgObj={msgObj}
            />
          }
          isHeader={true}
          width="45%"
        />
      ) : null}
    </div>
  );
};

export default TaskItem;
