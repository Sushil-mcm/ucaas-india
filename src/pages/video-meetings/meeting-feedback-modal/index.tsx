import CustomAvatar from '@/components/custom/custom-avatar';
import { formatMeetingDate } from '@/lib/utils';
import { Star } from 'lucide-react';
export interface IUserFeedback {
  name: string;
  email: string;
  rating: number;
  feedback: string;
  created_at: string;
}

interface MeetingMembersProps {
  feedback: IUserFeedback[];
}

const MeetingFeedback = ({ feedback = [] }: MeetingMembersProps) => {
  return (
    <div className="flex flex-col gap-2 max-h-[calc(100vh-8.5rem)] overflow-y-auto pr-1">
      {feedback?.map((item) => {
        const formatedDate = formatMeetingDate(item?.created_at || '');
        return (
          <div className="flex flex-col gap-1 border rounded-lg p-2" key={item?.email}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1">
                <CustomAvatar name={item?.name} />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="text-gray-900 text-sm font-medium">{item?.name}</div>
                    <div className="flex items-center gap-0.5">
                      <span className="bg-gray-600 w-1 h-1 rounded-full"></span>
                      <div className="flex gap-0.5 items-center text-xs">
                        {formatedDate?.day}
                        <span>{formatedDate?.month}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">{item?.email}</div>
                </div>
              </div>
              <div className="flex items-center mt-0.5">
                {[1, 2, 3, 4, 5].map((num) => (
                  <Star
                    key={num}
                    className={`w-4 h-4 ${
                      num <= item?.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="text-gray-800 text-sm text-wrap wrap-break-word">{item?.feedback}</div>
          </div>
        );
      })}
    </div>
  );
};

export default MeetingFeedback;
