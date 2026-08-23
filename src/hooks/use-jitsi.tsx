import { JitsiContext } from '@/context/jitsi-context';
import { useContext } from 'react';

export const useJitsi = () => useContext(JitsiContext);
