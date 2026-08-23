import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { useJitsi } from '@/hooks/use-jitsi';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import { userMeetingFeedback } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PostMeetLayout = () => {
  const { isMeetingEnded, userName, userEmail } = useJitsi();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [isSubmit, setIsSubmit] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const meetingId = searchParams?.get('meetCode') || '';
  const { user } = useUser();
  const postMeetingRedirectPath = user?.isGuest && !user?.uuid ? '/' : '/dashboard';

  const { mutate, isPending } = useMutation({
    mutationFn: userMeetingFeedback,
    mutationKey: ['userMeetingFeedback'],
    onSuccess: () => setIsSubmit(true),
  });

  const getReasonMessage = () => {
    const reason = isMeetingEnded?.reason;
    switch (reason) {
      case 'ALL':
        return 'Host has ended the meeting.';
      case 'ENDED':
        return 'Meeting has been over.';
      case 'SINGLE':
        return 'You have been removed from the meeting by host.';
      default:
        return reason;
    }
  };
  const handleSubmit = () => {
    const guestName = user?.guest_info?.name || userName;
    const guestEmail = user?.guest_info?.email || userEmail;
    const payload = {
      name: user?.uuid ? user?.user_info?.first_name + ' ' + user?.user_info?.last_name : guestName,
      email: user?.uuid ? user?.user_info?.email : guestEmail,
      feedback: comment,
      meetingId,
      rating,
    };
    mutate(payload);
  };
  return (
    <div className=" w-full h-screen overflow-y-auto p-4">
      <div className="w-full h-full flex justify-center items-center flex-col gap-2">
        <h5 className="text-xl font-semibold">Your meeting has ended !</h5>
        {isMeetingEnded?.reason && <div className="text-md font-medium">{getReasonMessage()}</div>}
        <p className="text-center text-sm text-gray-700 italic">
          Your valuable insights are important. Kindly share your rating
          <br /> and provide any additional feedback.
        </p>
        {!isSubmit ? (
          <>
            <div className="flex gap-3 my-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <Star
                  key={num}
                  onClick={() => setRating(num)}
                  className={`w-7 h-7 cursor-pointer transition-all ${
                    num <= rating
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-muted-foreground hover:fill-yellow-500 hover:text-yellow-500'
                  }`}
                />
              ))}
            </div>
            <div className="w-full max-w-[480px]">
              <textarea
                placeholder="Write feedback..."
                rows={4}
                value={comment}
                maxLength={500}
                onChange={(e) => {
                  const value = e?.target?.value;
                  if (value?.length >= 500) {
                    handleAlert({
                      type: 'error',
                      text: 'Feedback must not exceed 500 characters.',
                    });
                  } else {
                    setComment(value);
                  }
                }}
                className={`border w-full border-gray-300 rounded-xl text-sm p-3 hover:border-primary focus:border-primary focus-visible:border-primary focus-visible:outline-none`}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant={'transparent'} onClick={() => navigate(postMeetingRedirectPath)}>
                Skip
              </Button>
              <Button
                variant={'outline'}
                disabled={isPending || comment?.length < 1}
                onClick={handleSubmit}
              >
                {isPending ? <Loader variant="blue" /> : 'Submit'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h5 className="text-md">Thanks for your feedback.</h5>
            <Button variant={'outline'} onClick={() => navigate(postMeetingRedirectPath)}>
              Go Back to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PostMeetLayout;
