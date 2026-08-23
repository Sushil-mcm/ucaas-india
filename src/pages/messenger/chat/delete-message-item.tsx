import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { deleteEventAndTask, meetingDelete } from '@/services/api';

const DeleteMessageItem = ({
  msgObj,
  currentChat,
  handleClose = () => null,
}: {
  msgObj: any;
  currentChat: any;
  handleClose: () => void;
}) => {
  const { handleDeleteMessage } = useSocketEvents();
  const [isLoading, setIsLoading] = useState(false);

  const deleteMessageHandler = async () => {
    console.log('yesss', msgObj?.messageType, msgObj?.event, 'msgObj', msgObj);

    try {
      if (!handleDeleteMessage || typeof handleDeleteMessage !== 'function') {
        console.warn('handleDeleteMessage is not available');
        return;
      }

      setIsLoading(true);
      if (msgObj?.messageType === 'event' && msgObj?.event?.meetingId) {
        await meetingDelete(msgObj.event.meetingId);
      }

      if (msgObj?.messageType === 'task' && msgObj?.task?.taskId) {
        await deleteEventAndTask({ eventTaskId: msgObj.task.taskId });
      }

      const chatId = currentChat?.chatId || '';
      handleDeleteMessage(msgObj, chatId);
      handleClose();
    } catch (error) {
      console.error('Error in deleteMessageHandler:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Message</DialogTitle>
          <DialogDescription>Are you sure you want to delete this message?</DialogDescription>
        </DialogHeader>

        <div className="w-full flex gap-2 mt-2 justify-center flex-1 px-4">
          <Button type="button" className="min-w-40" variant={'secondary'} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="min-w-40"
            onClick={deleteMessageHandler}
            variant="destructive"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteMessageItem;
