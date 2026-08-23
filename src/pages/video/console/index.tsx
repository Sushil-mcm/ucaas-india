import { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { VideoIconSprite } from './icons';
import MeetingListColumn, { type MeetingSource } from './meeting-list-column';
import StageColumn from './stage-column';
import PanelColumn, { type PanelTab } from './panel-column';
import { useMeetings } from './use-meetings';
import { useVideoConsole } from './use-video-console';
import './video.css';

/**
 * MCM Unified Video — video console.
 *
 * Layout, surfaces and states follow the same "MCM Unified Console" design
 * artifact the phone console was built from: a three-zone console
 * (meetings │ stage │ intelligence panel) sharing one token set, so /phone and
 * /video read as one product rather than two apps bolted together.
 *
 * The stage runs the meeting lifecycle hub → green room → live → recap, and
 * carries the feature set people arrive expecting from Zoom, Teams, Meet and
 * Webex: a pre-join green room with device checks, background blur, noise
 * removal and auto-framing; gallery / speaker / sidebar / together layouts;
 * pin and spotlight; raise hand with a speaking queue; reactions; a waiting
 * room; breakout rooms; polls and Q&A; live captions with translation;
 * recording; and an AI companion that writes the recap, the decisions and the
 * action items.
 *
 * The meeting book is real: `use-meetings.ts` reads the same four
 * `meetingList` endpoints the old /video pages use, and `meetings-adapter.ts`
 * maps those rows onto the console's model. If every list comes back empty the
 * console falls back to `demo-data.ts` so it can still be judged, and says so
 * on the list header.
 *
 * What is NOT bound yet is the conference itself — who is muted, who has a
 * hand up, live captions, the AI recap. Those only exist inside a running
 * meeting; `use-video-console.ts` holds that state machine and marks the seams
 * where Jitsi (`@/context/jitsi-context`, `@/hooks/use-jitsi`) plugs in.
 * Until then those surfaces carry a "Demo data" chip.
 */
const VideoConsole = () => {
  const { user } = useUser();
  const selfName =
    `${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''}`.trim() || 'You';

  const { meetings, isLoading, isError, usingDemo } = useMeetings(selfName, user?.user_info?.uuid);
  const vc = useVideoConsole(meetings);
  const [source, setSource] = useState<MeetingSource>('upcoming');
  const [tab, setTab] = useState<PanelTab>('people');

  return (
    <div className="mcm-video">
      <VideoIconSprite />

      <div className="video-grid">
        <MeetingListColumn
          meetings={vc.meetings}
          isLoading={isLoading}
          isError={isError}
          usingDemo={usingDemo}
          selectedId={vc.meeting?.id || null}
          source={source}
          onSourceChange={setSource}
          onSelect={(m) => {
            vc.openMeeting(m);
            setTab(m.state === 'past' ? 'ai' : 'details');
          }}
          onJoin={(m) => {
            if (m.state === 'past') {
              vc.openMeeting(m);
              setTab('ai');
              return;
            }
            vc.join(m);
            setTab('people');
          }}
          onNew={() => {
            const room = vc.meetings.find((m) => m.pmi) || vc.meetings[0];
            if (room) {
              vc.openMeeting({ ...room, state: 'live', startsInMins: 0 });
              setTab('people');
            }
          }}
        />

        <StageColumn vc={vc} selfName={selfName} onOpenPanel={setTab} />

        <PanelColumn vc={vc} tab={tab} onTabChange={setTab} />
      </div>

      <div className={`toast${vc.toast ? ' show' : ''}`} role="status" aria-live="polite">
        {vc.toast}
      </div>
    </div>
  );
};

export default VideoConsole;
