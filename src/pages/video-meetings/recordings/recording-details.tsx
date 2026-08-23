import {
  MaximizeLine,
  NotesMinimalistic,
  PipLine,
  PlayCircleLine,
  VolumeLoudLine,
  VolumeLoudOff,
} from '@/assets/icons';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/hooks/use-user';
import { cn, formatRecordingTime } from '@/lib/utils';
import { meetingDetailList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { PauseCircle, PenSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthenticatedVideo } from '@/components/custom/authenticated-media';
import { fetchAuthenticatedMedia } from '@/hooks/use-authenticated-media';

const RecordingDetails = () => {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const videoContainerRef = useRef(null);
  const videoRef = useRef<any>(null);
  const meetingCode = searchParams.get('meetingCode');
  const recordingId = searchParams.get('id');

  const { data: meetingDetailInfo = {}, isLoading: meetingInfoLoad } = useQuery({
    queryKey: ['meetingDetailInfo', meetingCode],
    queryFn: ({ queryKey }) => meetingDetailList({ meetingId: queryKey[1] }),
    enabled: !!meetingCode,
    select: (data) => data?.data?.data?.result?.[0] || {},
  });

  const recordingData = meetingDetailInfo?.video_recordings?.find(
    (recording: any) => recording?._id === recordingId,
  );

  // Fetch transcript data
  const { data: transcriptData = null, isLoading: transcriptLoading } = useQuery({
    queryKey: ['transcriptData', meetingDetailInfo?.fileUrl],
    queryFn: async () => {
      if (!meetingDetailInfo?.fileUrl) return null;
      const response = await fetchAuthenticatedMedia(meetingDetailInfo.fileUrl);
      if (!response.ok) throw new Error(`Failed to fetch transcript: ${response.status}`);
      return response.json();
    },
    enabled: !!meetingDetailInfo?.fileUrl,
  });

  const joinedParticipants = meetingDetailInfo?.members?.[0]?.user_detail?.filter(
    (participant: any) => participant.joinStatus === 'YES',
  );

  const duration = Number(recordingData?.recordingDuration || 0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onFullScreenChange = () => {
      const fsElement = document.fullscreenElement;
      setIsFullScreen(!!fsElement);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    document.addEventListener('fullscreenchange', onFullScreenChange);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      document.removeEventListener('fullscreenchange', onFullScreenChange);
    };
  }, [videoRef.current]);

  const toggleFullScreen = () => {
    const element: any = videoContainerRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().then(() => setIsFullScreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullScreen(false));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const toggleVolume = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted((prev) => !prev);
    }
  };

  const togglePictureInPicture = async () => {
    if (videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (error) {
        console.error('Failed to toggle Picture-in-Picture', error);
      }
    }
  };

  if (meetingInfoLoad) {
    return (
      <div className="w-screen min-h-screen bg-white ">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2  bg-white ">
          <div className="flex items-center justify-center p-5">
            <Loader variant="blue" size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full flex h-full">
        <div className="fixed w-full h-16 z-1">
          <header className="bg-primary px-3 py-2 flex items-center h-full">
            <nav className="flex justify-between w-full" aria-label="Global">
              <div className="gap-2 flex items-center">
                <CustomAvatar
                  name={`${user?.user_info?.first_name} ${user?.user_info?.last_name}`}
                  size="40"
                />
                <div className="flex flex-col gap-0.5">
                  <p className="font-semibold text-white text-md">
                    {`${user?.user_info?.first_name} ${user?.user_info?.last_name}`}
                  </p>
                </div>
              </div>
            </nav>
          </header>
        </div>
        <div className="flex flex-col min-h-full w-full pt-16 h-full">
          <div className="p-3 flex flex-col gap-3">
            <div className="flex items-center w-full px-3 h-16 gap-2 bg-gray-100 rounded-xl border border-gray-200">
              <div className="flex flex-col">
                <h5 className="font-semibold text-gray-900 truncate text-md">
                  {meetingDetailInfo?.name || 'Instant Meeting'}
                </h5>
              </div>
            </div>
            <div className="flex h-[calc(100vh_-_10.2rem)] gap-4">
              <div className="w-2/4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col">
                    <div
                      ref={videoContainerRef}
                      className={cn(
                        'overflow-hidden rounded-xl bg-black w-full aspect-video px-3 flex items-center justify-center relative text-white',
                        isFullScreen &&
                          'fixed top-0 left-0 w-screen h-screen z-50 aspect-auto px-0',
                      )}
                    >
                      <AuthenticatedVideo
                        ref={videoRef}
                        controls={false}
                        src={recordingData?.fileUrl}
                        className="max-w-full max-h-full h-full object-contain"
                      />
                      <div className="absolute top-0 lef-0 border-b border-gray-600 w-full py-2 px-4">
                        <div className="flex items-center gap-2">
                          <h6 className="flex items-center gap-1">
                            [<span className="w-1.5 h-1.5 bg-red-500 rounded-full">&nbsp;</span>
                            REC ]
                          </h6>
                          <small>{formatRecordingTime(videoRef.current?.duration || 0)}</small>
                        </div>
                      </div>
                      <div className="absolute bottom-0 lef-0 w-full py-2 px-4  bg-black/70 text-white">
                        <div
                          className="h-1 bg-gray-600 rounded cursor-pointer relative group mb-2"
                          onClick={handleSeek}
                        >
                          {duration > 0 && (
                            <div
                              className="h-1 bg-red-500 absolute bottom-0 left-0"
                              style={{ width: `${(currentTime / duration) * 100}%` }}
                            />
                          )}

                          <div className="absolute top-[-2px] left-0 w-full h-4">
                            <div
                              className="w-2.5 h-2.5 rounded-full bg-white absolute"
                              style={{
                                left: `${(currentTime / duration) * 100}%`,
                                transform: 'translateX(-50%)',
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div onClick={togglePlayback} className="cursor-pointer">
                              {playing ? <PauseCircle /> : <PlayCircleLine className="w-6 h-6" />}
                            </div>
                            <div onClick={toggleVolume} className="cursor-pointer">
                              {muted ? (
                                <VolumeLoudOff className="w-6 h-6" />
                              ) : (
                                <VolumeLoudLine className="w-6 h-6" />
                              )}
                            </div>
                            <p className="font-light">
                              {formatRecordingTime(currentTime)} / {formatRecordingTime(duration)}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div onClick={togglePictureInPicture} className="cursor-pointer">
                              <PipLine className="w-6 h-6" />
                            </div>
                            <div onClick={toggleFullScreen} className="cursor-pointer">
                              <MaximizeLine className="w-6 h-6" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-2/4 bg-white p-10">
                <div className="flex flex-col gap-3">
                  <Tabs defaultValue={'Perticipents'} className="flex w-full">
                    <div className="border-b border-gray-200 w-full">
                      <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none min-h-10 ">
                        <TabsTrigger
                          className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs "
                          value={'Perticipents'}
                        >
                          Participents
                        </TabsTrigger>
                        <TabsTrigger
                          className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs "
                          value={'Transcript'}
                        >
                          Transcript
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value={'Perticipents'}>
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <div className="flex gap-2.5 flex-col">
                          <div className="flex items-center gap-3.5">
                            <CustomAvatar name={meetingDetailInfo?.hostName} size="40" />
                            <div className="flex items-center gap-1">
                              <h5 className="font-semibold text-gray-900 truncate text-md">
                                {meetingDetailInfo?.hostName}
                              </h5>
                              <div className="capitalize">(Host)</div>
                            </div>
                          </div>
                          {joinedParticipants?.map((participant: any) => {
                            const isGuest = participant?.type === 'GUEST';
                            const isNameExist = participant?.name !== 'Guest';
                            return (
                              <div className="flex items-center gap-3.5">
                                <CustomAvatar
                                  name={
                                    isGuest
                                      ? isNameExist
                                        ? participant?.name
                                        : 'U'
                                      : participant?.name
                                  }
                                  size="40"
                                />

                                <div className="flex items-center gap-1">
                                  <h5 className="font-semibold text-black">
                                    {isGuest
                                      ? isNameExist
                                        ? participant?.name
                                        : 'Unknown'
                                      : participant?.name || ''}
                                  </h5>
                                  <div className="capitalize">
                                    ({participant?.type?.toLowerCase()})
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value={'Summary'}>
                      <Summary />
                    </TabsContent>
                    <TabsContent value={'Transcript'}>
                      <Transcript transcriptData={transcriptData} isLoading={transcriptLoading} />
                    </TabsContent>
                    <TabsContent value={'Sentiments'}>
                      <Sentiments />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecordingDetails;

const Summary = () => {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col">
        <div className="p-4 flex items-center justify-between hover:bg-gray">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-5">
                  <h5 className="font-semibold text-black">Keywords</h5>
                  <small>Auto generated</small>
                </div>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center rounded-full bg-white px-4 py-2 font-medium ring-1 ring-inset ring-white">
                    <p>Technology</p>
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white px-4 py-2 font-medium ring-1 ring-inset ring-white">
                    <p>Trends</p>
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white px-4 py-2 font-medium ring-1 ring-inset ring-white">
                    <p>Techniques</p>
                  </span>
                </div>
              </div>
              <div className="flex gap-2.5">
                <a href="javascript:void(0)">
                  <PenSquare className="text-primary hover:text-primary/80" />
                </a>
                <a href="javascript:void(0)">
                  <NotesMinimalistic className="text-primary hover:text-primary/80" />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between hover:bg-gray">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-5">
                  <h5 className="font-semibold text-black">Summary</h5>
                  <small>Auto generated</small>
                </div>
                <p className="mb-2">
                  Join us for an an exciting demo focused on the world of accessories!
                </p>
              </div>
              <div className="flex gap-2.5">
                <a href="javascript:void(0)">
                  <PenSquare className="text-primary hover:text-primary/80" />
                </a>
                <a href="javascript:void(0)">
                  <NotesMinimalistic className="text-primary hover:text-primary/80" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <CustomSelect placeholder="Add Meeting Insights" />
      </div>
    </div>
  );
};

const Transcript = ({ transcriptData, isLoading }: { transcriptData: any; isLoading: boolean }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter events to get only transcript items (SPEECH events)
  const transcriptEvents = transcriptData?.events?.filter((event: any) => event.transcript) || [];

  // Filter based on search query
  const filteredTranscripts = transcriptEvents.filter((event: any) => {
    const text = event.transcript?.[0]?.text?.toLowerCase() || '';
    const participantName = event.participant?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return text.includes(query) || participantName.includes(query);
  });

  // Format timestamp to minutes:seconds
  const formatTimestamp = (timestamp: number) => {
    const startTime = new Date(transcriptData?.start_time).getTime();
    const seconds = Math.floor((timestamp - startTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Download transcript as text file
  // const handleDownload = () => {
  //   if (!transcriptEvents.length) return;

  //   const transcriptText = transcriptEvents
  //     .map((event: any) => {
  //       const name = event.participant?.name || 'Unknown';
  //       const time = formatTimestamp(event.timestamp);
  //       const text = event.transcript?.[0]?.text || '';
  //       return `[${time}] ${name}: ${text}`;
  //     })
  //     .join('\n\n');

  //   const blob = new Blob([transcriptText], { type: 'text/plain' });
  //   const url = URL.createObjectURL(blob);
  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.download = `transcript-${new Date().toISOString()}.txt`;
  //   link.click();
  //   URL.revokeObjectURL(url);
  // };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader variant="blue" size="md" />
      </div>
    );
  }

  if (!transcriptData || !transcriptEvents?.length) {
    return (
      <div className="flex items-center justify-center p-10">
        <p className="text-gray-500">No transcript available for this recording</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {/* <div
          className="border border-gray-300 rounded-xl w-9 h-9 bg-white flex items-center justify-center text-black hover:text-black/80 cursor-pointer"
          onClick={handleDownload}
        >
          <Download className="w-5" />
        </div> */}
      </div>
      <div className="flex flex-col max-h-[calc(100vh-24rem)] overflow-y-auto">
        {filteredTranscripts.length === 0 ? (
          <div className="flex items-center justify-center p-10">
            <p className="text-gray-500">No results found</p>
          </div>
        ) : (
          filteredTranscripts.map((event: any, index: number) => {
            const participantName = event.participant?.name || 'Unknown';
            const transcriptText = event.transcript?.[0]?.text || '';
            const timestamp = formatTimestamp(event.timestamp);
            // const confidence = event.transcript?.[0]?.confidence || 0;

            return (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-gray">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="gap-2.5 flex items-center">
                        <CustomAvatar name={participantName} size="32" />
                        <div className="flex flex-col gap-0.5">
                          <h5 className="font-semibold text-black">{participantName}</h5>
                          {/* {confidence < 0.5 && (
                            <small className="text-yellow-600">Low confidence</small>
                          )} */}
                        </div>
                      </div>
                      <small>{timestamp}</small>
                    </div>
                    <p className="mb-2 ml-10">{transcriptText}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const Sentiments = () => {
  return <>Sentiments</>;
};
