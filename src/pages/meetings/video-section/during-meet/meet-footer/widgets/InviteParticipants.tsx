import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { Icon } from '@/assets/icons/icon';
import InviteMembersModal from '@/pages/video-meetings/send-invites/invite-members';
import InviteOthersModal from '@/pages/video-meetings/send-invites/invite-others';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { meetingDetailList, sendInvites } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';

const InviteParticipants = ({
  meetState,
  directModalType = '',
  onClose,
}: {
  meetState: any;
  directModalType?: '' | 'members' | 'others';
  onClose?: () => void;
  handleClose?: any;
}) => {
  const { user } = useUser();
  const { handleMeetInviteMember } = useSocketEvents();
  const [IsCopied, setIsCopied] = useState(false);
  const [modalState, setModalState] = useState<any>({
    meetingInfo: false,
    meetingInvites: false,
    isDelete: false,
    inviteMembers: directModalType === 'members',
    inviteOthers: directModalType === 'others',
  });

  const formInstance = useForm<any>({
    defaultValues: {
      inviteOthers: [],
      members: [],
      meeting_id: '',
    },
  });

  const { watch, setValue } = formInstance;

  useEffect(() => {
    if (!directModalType) return;
    setModalState({
      meetingInfo: false,
      meetingInvites: false,
      isDelete: false,
      inviteMembers: directModalType === 'members',
      inviteOthers: directModalType === 'others',
    });
  }, [directModalType]);

  useEffect(() => {
    if (!directModalType) return;
    if (!modalState?.inviteMembers && !modalState?.inviteOthers) {
      onClose?.();
    }
  }, [directModalType, modalState?.inviteMembers, modalState?.inviteOthers, onClose]);
  useEffect(() => {
    if (IsCopied) setTimeout(() => setIsCopied(false), 2000);
  }, [IsCopied]);

  const copyToClipBoard = (getText: string, textId: string) => {
    navigator.clipboard.writeText(getText).then(
      function () {
        if (textId === 'text-to-copy') return setIsCopied(true);
      },
      function () {
        if (textId === 'text-to-copy') return setIsCopied(false);
      },
    );
    const input = document.createElement('input');
    input.value = getText;
    input.select();
    document.execCommand('Copy');
  };

  const handleCopy = (getTxt: string) => {
    const textToCopy: any = document.getElementById(getTxt);
    copyToClipBoard(textToCopy.innerText, getTxt);
    handleAlert({ text: 'Copied successfully!', type: 'success' });
  };

  const { data: meetingDetailInfo, refetch } = useQuery({
    queryKey: ['meetingDetailInfo', meetState?.meetUniqueKey],
    queryFn: () => meetingDetailList({ meetingId: meetState?.meetUniqueKey }),
    enabled: !!meetState?.meetUniqueKey,
    select: (data) => data?.data?.data?.result,
  });
  useEffect(() => {
    if (meetingDetailInfo?.length > 0) {
      const { members = [] } = meetingDetailInfo?.[0] || {};
      const formattedMembers = members?.[0]?.user_detail?.map((member: any) => ({
        email: member?.email || '',
        name: member?.name || '',
        type: member?.type,
        user_uuid: member?.userId || '',
      }));
      setValue('members', formattedMembers || []);
    }
  }, [meetingDetailInfo]);

  const { mutate: mutateSendInvite, isPending: isPendingInvites } = useMutation({
    mutationFn: sendInvites,
    onSuccess: () => {
      setModalState({ inviteMembers: false });
      handleAlert({ text: 'Invite sent successfully', type: 'success' });
      refetch();
      setValue('inviteOthers', []);
      setValue('members', []);
    },
  });

  const handleSendInvite = async () => {
    console.log('1???');

    const isValid = await formInstance.trigger(['members', 'inviteOthers']);
    if (!isValid) return;
    const members = watch('members');
    const invitedOthers = watch('inviteOthers');
    const existingMembers =
      meetingDetailInfo?.[0]?.members?.[0]?.user_detail?.map(
        (m: any) => m?.user_uuid || m?.userId,
      ) || [];

    const formattedMeetingInfoData =
      members && members?.length > 0
        ? members?.map((obj: any) => {
            const id = obj?.user_uuid || obj?.userId || '';
            const isNewMember = !existingMembers?.includes(id);
            delete obj?.source;
            delete obj?.joinStatus;
            delete obj?._id;
            delete obj?.userId;
            return {
              ...obj,
              user_uuid: id,
              invitation_sent: isNewMember ? false : true,
            };
          })
        : [];
    const allInviteOthers = [...formattedMeetingInfoData, ...invitedOthers];
    const payload = {
      meetingId: meetState?.meetUniqueKey,
      members: invitedOthers?.length > 0 ? allInviteOthers : formattedMeetingInfoData,
    };
    console.log(payload);

    mutateSendInvite(payload);
    return;

    // Emit nats-meet-invite socket event for each NEW member (not already in meeting)
    // This triggers the ringing notification on the invited user — same as connect-web
    const newlyInvitedMembers =
      members?.filter((m: any) => {
        const id = m?.user_uuid || m?.userId || '';
        return id && !existingMembers?.includes(id);
      }) || [];
    console.log(newlyInvitedMembers, 'newlyInvitedMembers');

    for (const invitedMember of newlyInvitedMembers) {
      console.log(newlyInvitedMembers, 'newlyInvitedMembers1');
      const receiverId = invitedMember?.user_uuid || invitedMember?.userId || '';
      if (receiverId) {
        console.log(newlyInvitedMembers, 'newlyInvitedMembers2', {
          chatId: meetState?.chatId || meetState?.meetUniqueKey,
          userID: user?.uuid,
          receiverId,
          callType: 'video',
        });
        handleMeetInviteMember({
          chatId: meetState?.chatId || meetState?.meetUniqueKey,
          userID: user?.uuid,
          receiverId,
          callType: 'video',
        });

        setModalState({ inviteMembers: false });
        handleAlert({ text: 'Invite sent successfully', type: 'success' });
        refetch();
        setValue('inviteOthers', []);
        setValue('members', []);
      }
    }
  };

  useEffect(() => {
    if (meetState?.meetingInvities && meetState?.meetingInvities?.length) {
      setValue('members', meetState?.meetingInvities, { shouldValidate: true });
    }
  }, [meetState?.meetingInvities]);

  const isDirectModal = Boolean(directModalType);

  return (
    <>
      {!isDirectModal && (
        <div className="bg-white rounded-xl absolute bottom-20 px-4 pt-4 pb-5 flex flex-col items-center w-[530px] shadow-lg border border-gray-200">
          <div className="flex flex-col gap-1">
            <small className="text-gray-900">Invite Participants</small>
            <h5 className="text-primary-800 font-bold">General Meeting</h5>
            <div className="flex flex-col pt-2 gap-1.5">
              <div className="flex flex-col">
                <small>Share this link with your participants</small>
                <div className="flex items-center justify-between">
                  <small
                    className="text-gray-900 font-semibold"
                    id="text-to-copy"
                  >{`${window.location.origin}/video-meet?meetCode=${meetState?.meetUniqueKey}`}</small>
                  <Button
                    variant={'outline'}
                    className="flex items-center gap-2"
                    onClick={() => handleCopy('text-to-copy')}
                  >
                    <Copy className="w-5 h-5" />
                    <div className="text-sx">{IsCopied ? 'Copied' : 'Copy'}</div>
                  </Button>
                </div>
              </div>
              <small className="mt-1">
                Participants can also go to mycountrymobile.com and enter the following details to
                join
              </small>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <small>Meeting ID</small>
                  <small className="text-gray-900 font-semibold">
                    {meetState?.meetUniqueKey ?? ''}{' '}
                  </small>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={'outline'}
                    className="inline-flex gap-1 items-center border-primary text-primary hover:bg-primary/90 hover:text-white"
                    onClick={() => setModalState({ inviteMembers: true })}
                  >
                    <Icon name="PlusIcon" className="w-4 h-4" />
                    Invite Members
                  </Button>
                  <Button
                    variant={'outline'}
                    className="inline-flex gap-1 items-center border-primary text-primary hover:bg-primary/90 hover:text-white"
                    onClick={() => setModalState({ inviteOthers: true })}
                  >
                    <Icon name="PlusIcon" className="w-4 h-4" />
                    Invite Others
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute polygon w-5 h-5 bg-white bottom-[-10px] left-4"></div>
        </div>
      )}

      {modalState?.inviteMembers && (
        <InviteMembersModal
          modalState={modalState}
          setModalState={setModalState}
          formInstance={formInstance}
          isPending={isPendingInvites}
          handleSendInvite={handleSendInvite}
        />
      )}
      {modalState?.inviteOthers && (
        <InviteOthersModal
          modalState={modalState}
          setModalState={setModalState}
          formInstance={formInstance}
          handleSendInvite={handleSendInvite}
          isPending={isPendingInvites}
        />
      )}
    </>
  );
};

export default InviteParticipants;
