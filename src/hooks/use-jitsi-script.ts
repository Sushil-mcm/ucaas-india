import { useEffect, useState } from 'react';

const JITSI_SCRIPT_SRC = `${window.location.origin}/scripts/lib-jitsi-meet.min.js`;

export default function useJitsiScript() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [state, setState] = useState<any>({
    JitsiConnectionEvents: {},
    JitsiTrackEvents: {},
    JitsiConferenceEvents: {},
    JitsiConnectionQualityEvents: {},
    JitsiRecordingConstants: {},
  });
  useEffect(() => {
    // Check if already loaded
    if (window.JitsiMeetJS) {
      setIsLoaded(true);
      return;
    }
    // Avoid multiple inserts
    const existingScript = document.querySelector(`script[src="${JITSI_SCRIPT_SRC}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }
    // Create and insert the script
    const script = document.createElement('script');
    script.src = JITSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (isLoaded && window.JitsiMeetJS) {
      const JitsiConnectionEvents = window.JitsiMeetJS.events.connection;
      const JitsiTrackEvents = window.JitsiMeetJS.events.track;
      const JitsiConferenceEvents = window.JitsiMeetJS.events.conference;
      const JitsiConnectionQualityEvents = window.JitsiMeetJS.events.connectionQuality;
      const JitsiRecordingConstants = window.JitsiMeetJS.constants.recording;
      setState({
        JitsiConferenceEvents,
        JitsiConnectionEvents,
        JitsiConnectionQualityEvents,
        JitsiRecordingConstants,
        JitsiTrackEvents,
      });
    }
  }, [isLoaded]);

  const {
    JitsiConferenceEvents,
    JitsiConnectionEvents,
    JitsiConnectionQualityEvents,
    JitsiRecordingConstants,
    JitsiTrackEvents,
  } = state;
  return {
    isLoaded,
    JitsiConnectionEvents,
    JitsiTrackEvents,
    JitsiConferenceEvents,
    JitsiConnectionQualityEvents,
    JitsiRecordingConstants,
  };
}
