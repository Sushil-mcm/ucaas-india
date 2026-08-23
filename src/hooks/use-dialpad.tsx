import { DialpadContext } from '@/context/dialpad-context';
import { useContext } from 'react';

export const useDialpad = () => useContext(DialpadContext);
