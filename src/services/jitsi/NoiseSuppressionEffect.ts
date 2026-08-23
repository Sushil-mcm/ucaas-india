export class NoiseSuppressionEffect {
  _originalMediaTrack: any;
  _audioSource: any;
  _audioDestination: any;
  _outputMediaTrack: any;
  _audioContext!: AudioContext;
  _noiseSuppressorNode!: AudioWorkletNode;
  startEffect(audioStream: any) {
    this._originalMediaTrack = audioStream.getAudioTracks()[0];
    this._audioContext = new AudioContext();
    this._audioSource = this._audioContext.createMediaStreamSource(audioStream);
    this._audioDestination = this._audioContext.createMediaStreamDestination();
    this._outputMediaTrack = this._audioDestination.stream.getAudioTracks()[0];

    const baseUrl = `${window.location.origin}/scripts/`;
    const workletUrl = `${baseUrl}noise-suppressor-worklet.min.js`;
    // Connect the audio processing graph MediaStream -> AudioWorkletNode -> MediaStreamAudioDestinationNode
    this._audioContext.audioWorklet
      .addModule(workletUrl)
      .then(() => {
        // After the resolution of module loading, an AudioWorkletNode can be constructed.
        this._noiseSuppressorNode = new AudioWorkletNode(
          this._audioContext,
          'NoiseSuppressorWorklet',
        );
        this._audioSource.connect(this._noiseSuppressorNode).connect(this._audioDestination);
      })
      .catch((error) => {
        console.error('Error while adding audio worklet module: ', error);
      });

    // Sync the effect track muted state with the original track state.
    this._outputMediaTrack.enabled = this._originalMediaTrack.enabled;

    // We enable the audio on the original track because mute/unmute action will only affect the audio destination
    // output track from this point on.
    this._originalMediaTrack.enabled = true;

    return this._audioDestination.stream;
  }

  /**
   * Checks if the JitsiLocalTrack supports this effect.
   *
   * @param {JitsiLocalTrack} sourceLocalTrack - Track to which the effect will be applied.
   * @returns {boolean} - Returns true if this effect can run on the specified track, false otherwise.
   */
  isEnabled(sourceLocalTrack: { isAudioTrack: () => any; }) {
    // JitsiLocalTracks needs to be an audio track.
    return sourceLocalTrack.isAudioTrack();
  }

  /**
   * Clean up resources acquired by noise suppressor and rnnoise processor.
   *
   * @returns {void}
   */
  stopEffect() {
    // Sync original track muted state with effect state before removing the effect.
    this._originalMediaTrack.enabled = this._outputMediaTrack.enabled;

    // Technically after this process the Audio Worklet along with it's resources should be garbage collected,
    // however on chrome there seems to be a problem as described here:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1298955
    this._noiseSuppressorNode?.port?.close();
    this._audioDestination?.disconnect();
    this._noiseSuppressorNode?.disconnect();
    this._audioSource?.disconnect();
    this._audioContext?.close();
  }
}
