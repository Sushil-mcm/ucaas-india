/*eslint-disable @typescript-eslint/ban-ts-comment */
//@ts-nocheck
import { useEffect } from 'react';
import MicRecorder from 'mic-recorder-to-mp3';

type RecorderProps = {
  getAudioBlob?: (metaData: { buffer: any; blob: any }) => void;
};

const Recorder = ({ getAudioBlob = () => null }: RecorderProps) => {
  const mediaRecorder = new MicRecorder({ bitRate: 128 });
  useEffect(() => {
    getMicrophone();
    return () => stopMicrophone();
  }, []);

  const getMicrophone = async () => {
    try {
      mediaRecorder
        .start()
        .then()
        .catch((e) => {
          console.error(e);
        });
    } catch (err) {
      return err;
    }
  };

  const stopMicrophone = async () => {
    mediaRecorder
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        getAudioBlob({ buffer, blob });
      })
      .catch((e) => {
        alert('We could not retrieve your message');
        console.error(e);
      });
  };

  return <div></div>;
};

export default Recorder;
