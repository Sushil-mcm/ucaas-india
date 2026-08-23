export type MeetingCallType = 'audio' | 'video';

type BuildMeetJoinUrlOptions = {
    meetingCode: string;
    isMeetChat?: boolean;
    joinWithoutAv?: boolean;
    callType?: MeetingCallType;
    startWithVideo?: boolean;
};

export const buildMeetJoinUrl = ({
    meetingCode,
    isMeetChat = true,
    joinWithoutAv = true,
    callType = 'video',
    startWithVideo = callType === 'video',
}: BuildMeetJoinUrlOptions): string => {
    if (!meetingCode) {
        return '/video-meet';
    }
    const params = new URLSearchParams();
    params.set('meetingCode', meetingCode);
    params.set('isMeetChat', String(isMeetChat));
    params.set('joinWithoutAv', String(joinWithoutAv));
    params.set('isAudioOnlyCall', String(callType === 'audio'));
    if (startWithVideo) {
        params.set('startWithVideo', 'true');
    }
    return `/video-meet?${params.toString()}`;
};

export const normalizeMeetingCallType = (
    callType: string | undefined | null,
): MeetingCallType => (callType === 'audio' ? 'audio' : 'video');
