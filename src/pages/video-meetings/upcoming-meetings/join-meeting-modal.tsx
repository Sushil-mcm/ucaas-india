import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { validateMeet } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import { handleAlert } from '@/lib/utils';
import { CloseIcon } from '@/assets/icons';
import { useState } from 'react';
import Loader from '@/components/custom/loader';
interface IJoinMeeting {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  formInstance?: any;
}
const JoinMeetingModal = ({ modalState, setModalState, formInstance }: IJoinMeeting) => {
  const [localValue, setLocalValue] = useState('');

  const { mutate: mutateValidateMeet, isPending } = useMutation({
    mutationFn: validateMeet,
    mutationKey: ['validateMeeting'],
    onSuccess: async (data: any) => {
      const { meetingId } = data?.data?.data?.result || {};
      window.open(`/video-meet?meetCode=${meetingId}`);
      setModalState(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error?.message === 'Meeting does not exist.';
      if (errorMessage) {
        handleAlert({ text: error.response.data?.error?.message, type: 'error' });
      } else {
        window.open(`/video-meet?meetCode=${localValue}`);
      }
    },
  });

  const handleJoinMeet = () => {
    if (!localValue.trim()) return;
    mutateValidateMeet({ meetingId: localValue });

    if (formInstance) {
      formInstance.setValue('meeting_id', localValue);
      setTimeout(() => formInstance.setValue('meeting_id', ''), 500);
    }
  };
  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent
        className="sm:w-1/2 md:w-1/4 p-3 max-h-[99%] overflow-y-auto"
        showCloseButton={false}
      >
        <div className="flex flex-col gap-1.5  text-900/80 ">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Join A Meeting
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>

        <DialogDescription>
          <div className="flex flex-col bg-white">
            <div className="flex flex-col gap-4">
              <Input
                placeholder="Enter meeting ID"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                maxLength={120}
              />
              {/* <Input
                label={'Meeting ID'}
                {...register('meeting_id')}
                placeholder="Enter meeting ID"
                // value={watch('meeting_id')}
                // onChange={(e) => setValue('meeting_id', e.target.value, { shouldValidate: true })}
              /> */}
            </div>
          </div>
        </DialogDescription>
        <div className="flex justify-end gap-2 w-full">
          <Button variant={'transparent'} onClick={() => setModalState(false)} type="button">
            Cancel
          </Button>
          <Button
            variant={'outline'}
            type="submit"
            onClick={handleJoinMeet}
            disabled={isPending || localValue == ''}
          >
            {isPending && <Loader variant="blue" />} Join
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinMeetingModal;
