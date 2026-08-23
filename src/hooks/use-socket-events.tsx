import { SocketEvents } from '@/context/socket-events-context';
import { useContext } from 'react';

export const useSocketEvents = () => useContext(SocketEvents);
