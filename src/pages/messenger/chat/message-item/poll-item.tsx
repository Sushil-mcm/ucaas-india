import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // UUIDs of users who voted
}

export interface PollData {
  question: string;
  options: PollOption[];
  isMultipleChoice: boolean;
}

interface PollItemProps {
  poll: PollData;
  isMine: boolean;
  onVote?: (optionId: string) => void;
}

const PollItem: React.FC<PollItemProps> = ({ poll, isMine, onVote }) => {
  const { user } = useUser();
  const userId = user?.uuid || user?.guest_info?.uuid || '';
  const [isViewVotesOpen, setIsViewVotesOpen] = useState(false);
  const { users } = useUsersDirectory();

  const getUserDetails = (uuid: string) => {
    if (uuid === userId) {
      const name =
        `${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''}`.trim() ||
        user?.guest_info?.name ||
        user?.name ||
        'You';
      const profile = user?.profile || user?.user_info?.profile || '';
      const extension = user?.extension || user?.user_info?.extension || '';
      return { name, profile, extension };
    }
    const found = users?.find((u: any) => u?.uuid === uuid);
    if (found) {
      const name =
        `${found.first_name || ''} ${found.last_name || ''}`.trim() || found.name || 'Unknown User';
      const profile = found.profile || '';
      const extension = found.extension || '';
      return { name, profile, extension };
    }
    return { name: 'Unknown User', profile: '', extension: '' };
  };

  const totalVotes = useMemo(() => {
    const allVotes = poll.options.flatMap((opt) => opt.votes || []);
    return new Set(allVotes).size || 0;
  }, [poll.options]);

  const getOptionPercentage = (votes: string[]) => {
    if (totalVotes === 0) return 0;
    return Math.round(((votes?.length || 0) / totalVotes) * 100);
  };

  if (!poll || !poll.question || !Array.isArray(poll.options)) {
    return <div className="p-3 text-sm text-red-500 italic">Invalid poll data</div>;
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-col w-full max-w-[320px] rounded-lg overflow-hidden',
          isMine ? 'bg-transparent text-black' : 'bg-white text-black',
        )}
      >
        <div className="p-3 pb-2">
          <h3 className="font-semibold text-[15px] leading-tight mb-1">{poll.question}</h3>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
            {poll.isMultipleChoice ? 'Select one or more' : 'Select one'} • {totalVotes}{' '}
            {totalVotes === 1 ? 'vote' : 'votes'}
          </p>
        </div>

        <div className="flex flex-col gap-2 p-3 pt-1">
          {poll.options.map((option) => {
            const isVotedByMe = option.votes?.includes(userId || '');
            const percentage = getOptionPercentage(option.votes || []);

            return (
              <button
                key={option.id}
                disabled={!onVote}
                onClick={() => onVote?.(option.id)}
                className={cn(
                  'relative group w-full text-left rounded-md transition-all duration-200 overflow-hidden border border-gray-100',
                  onVote ? 'cursor-pointer hover:border-primary/30' : 'cursor-default',
                )}
              >
                {/* Progress Bar Background */}
                {totalVotes > 0 && (
                  <div
                    className={cn(
                      'absolute left-0 top-0 h-full transition-all duration-500 ease-out',
                      isVotedByMe ? 'bg-primary/20' : 'bg-gray-100',
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between p-2.5 gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isVotedByMe && (
                      <div className="bg-primary text-white rounded-full p-0.5 shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                    <span
                      className={cn(
                        'text-[13px] truncate',
                        isVotedByMe ? 'font-semibold text-primary' : 'text-gray-700',
                      )}
                    >
                      {option.text}
                    </span>
                  </div>

                  {totalVotes > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* <span className="text-[11px] font-bold text-gray-600">{percentage}%</span> */}
                      <span className="text-[10px] text-gray-400">
                        ({option.votes?.length || 0})
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-3 pb-3 pt-1 border-t border-gray-100 flex justify-center">
          <button
            type="button"
            onClick={() => setIsViewVotesOpen(true)}
            className="text-primary text-[13px] font-semibold hover:underline transition-all w-full text-center py-1.5"
          >
            View votes
          </button>
        </div>
      </div>

      <Dialog open={isViewVotesOpen} onOpenChange={setIsViewVotesOpen}>
        <DialogContent className="w-[90vw] sm:max-w-[425px] bg-white rounded-xl shadow-2xl p-0 overflow-hidden flex flex-col max-h-[80vh] min-w-0">
          <DialogHeader className="p-6 pb-2 shrink-0 border-b border-gray-100 min-w-0">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2 min-w-0">
              <Check size={18} className="text-primary shrink-0" />
              <span className="truncate">Poll Results</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar min-w-0">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Question
              </span>
              <h4 className="text-base font-bold text-gray-800 leading-tight break-words whitespace-pre-wrap">
                {poll.question}
              </h4>
            </div>

            <div className="space-y-5 min-w-0">
              {poll.options.map((option) => {
                const votesList = option.votes || [];
                return (
                  <div key={option.id} className="space-y-2.5 min-w-0">
                    {/* Option Header */}
                    <div className="flex justify-between items-center bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 gap-3 min-w-0">
                      <span className="font-semibold text-[13px] text-gray-800 break-words whitespace-pre-wrap min-w-0 flex-1">
                        {option.text}
                      </span>
                      <span className="shrink-0 bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        {votesList.length} {votesList.length === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>

                    {/* Voters List */}
                    {votesList.length > 0 ? (
                      <div className="space-y-2 pl-2 min-w-0">
                        {votesList.map((voterUuid) => {
                          const details = getUserDetails(voterUuid);
                          return (
                            <div
                              key={voterUuid}
                              className="flex items-center gap-3 py-1 px-1.5 rounded-md hover:bg-gray-50 transition-colors min-w-0"
                            >
                              <span className="shrink-0">
                                <CustomAvatar
                                  name={details.name}
                                  size="28"
                                  image={details.profile}
                                />
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-medium text-gray-700 truncate">
                                  {details.name}
                                </span>
                                {details.extension && (
                                  <span className="text-[10px] text-gray-400">
                                    Ext: {details.extension}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400 italic pl-3">No votes yet</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PollItem;
