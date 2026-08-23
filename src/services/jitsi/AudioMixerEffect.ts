export class AudioMixerEffect {
  _mixAudio: any;
  jitsiInstance: any;
  private _originalStream: any;
  private _originalTrack: any;
  private _audioMixer: any;
  private _mixedMediaStream: any;
  _mixedMediaTrack: any;
  constructor(mixAudio: any, JitsiMeetJS: any) {
    if (mixAudio.getType() !== 'audio') {
      throw new Error(
        'AudioMixerEffect only supports audio JitsiLocalTracks; effect will not work!',
      );
    }
    this._mixAudio = mixAudio;
    this.jitsiInstance = JitsiMeetJS;
  }

  isEnabled(sourceLocalTrack: any) {
    return sourceLocalTrack.isAudioTrack() && this._mixAudio.isAudioTrack();
  }

  startEffect(audioStream: any) {
    this._originalStream = audioStream;
    this._originalTrack = audioStream.getTracks()[0];

    this._audioMixer = this.jitsiInstance.createAudioMixer();
    this._audioMixer.addMediaStream(this._mixAudio.getOriginalStream());
    this._audioMixer.addMediaStream(this._originalStream);

    this._mixedMediaStream = this._audioMixer.start();
    this._mixedMediaTrack = this._mixedMediaStream.getTracks()[0];

    return this._mixedMediaStream;
  }

  stopEffect() {
    this._audioMixer.reset();
  }

  setMuted(muted: boolean) {
    this._originalTrack.enabled = !muted;
  }

  isMuted() {
    return !this._originalTrack.enabled;
  }
}
