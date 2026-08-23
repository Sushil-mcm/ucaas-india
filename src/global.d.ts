export {};

declare global {
  interface Window {
    JitsiMeetJS?: any; // if you're using the lower-level API
    stream?: any; // if you're using the lower-level API
    constraints?: any; // if you're using the lower-level API
    JitsiMeetScreenObtainer?: any; // if you're using the lower-level API
    enableNoiseSuppression?: any; // if you're using the lower-level API
  }
}

// Declare audio file imports
declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.wav' {
  const src: string;
  export default src;
}

declare module '*.ogg' {
  const src: string;
  export default src;
}