type MediaStreamLike = {
  getTracks?: () => MediaStreamTrack[];
};

const addMediaStreamTracks = (
  nativeTracks: Set<MediaStreamTrack>,
  stream: MediaStreamLike | null | undefined,
) => {
  try {
    stream?.getTracks?.().forEach((track) => nativeTracks.add(track));
  } catch {
    // A partially disposed Jitsi stream can throw while its tracks are read.
  }
};

export const getNativeTracksFromJitsiTrack = (jitsiTrack: any): Set<MediaStreamTrack> => {
  const nativeTracks = new Set<MediaStreamTrack>();
  if (!jitsiTrack) return nativeTracks;

  try {
    const directTrack = jitsiTrack.track || jitsiTrack.getTrack?.();
    if (directTrack?.stop) nativeTracks.add(directTrack);
  } catch {
    // A disposed Jitsi track may reject access to its native track.
  }

  addMediaStreamTracks(nativeTracks, jitsiTrack.stream);
  addMediaStreamTracks(nativeTracks, jitsiTrack._stream);

  try {
    addMediaStreamTracks(nativeTracks, jitsiTrack.getOriginalStream?.());
  } catch {
    // Some Jitsi track implementations do not expose an original stream.
  }

  return nativeTracks;
};

export const stopMediaStream = (stream: MediaStreamLike | null | undefined) => {
  try {
    stream?.getTracks?.().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Stopping an already-ended native track is harmless.
      }
    });
  } catch {
    // Ignore streams that were already torn down by the browser/Jitsi.
  }
};

export const stopAndDisposeJitsiTrack = async (jitsiTrack: any) => {
  if (!jitsiTrack) return;

  getNativeTracksFromJitsiTrack(jitsiTrack).forEach((track) => {
    try {
      track.stop();
    } catch {
      // The same local track can be referenced by state and the conference.
    }
  });

  try {
    await jitsiTrack.dispose?.();
  } catch {
    // Jitsi rejects disposal when another leave path disposed the track first.
  }
};

export const detachOwnedMediaElements = (nativeTracks: Iterable<MediaStreamTrack>) => {
  if (typeof document === 'undefined' || typeof MediaStream === 'undefined') return;

  const ownedTracks = new Set(nativeTracks);
  const ownedTrackIds = new Set(
    Array.from(ownedTracks)
      .map((track) => track?.id)
      .filter(Boolean),
  );

  document.querySelectorAll<HTMLMediaElement>('video, audio').forEach((element) => {
    const stream = element.srcObject;
    if (!(stream instanceof MediaStream)) return;

    const streamTracks = stream.getTracks();
    const containsOwnedTrack = streamTracks.some(
      (track) => ownedTracks.has(track) || (track.id && ownedTrackIds.has(track.id)),
    );
    if (!containsOwnedTrack) return;

    streamTracks.forEach((track) => {
      if (ownedTracks.has(track) || (track.id && ownedTrackIds.has(track.id))) {
        try {
          stream.removeTrack(track);
        } catch {
          // The track may already have been detached by Jitsi.
        }
      }
    });

    if (stream.getTracks().length === 0) {
      element.srcObject = null;
    }
  });
};
