import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decideTimeOff,
  getCoverage,
  listSchedules,
  listTimeOff,
  publishSchedules,
  requestTimeOff,
  saveSchedules,
} from '@/services/api';

/* Workforce: schedules, time off and coverage, read from campaign-api through
   the gateway. The server decides reach (an agent sees and asks only for
   themselves); these hooks only carry the questions and refresh the answers. */

const KEY = 'workforce';
const unwrap = (reply: any) => reply?.data?.data ?? reply?.data ?? reply;

export const useSchedules = (params: { date_from: string; date_to: string; user_uuids?: string[] }, enabled = true) =>
  useQuery({
    queryKey: [KEY, 'schedules', params],
    queryFn: async () => unwrap(await listSchedules(params)),
    enabled: enabled && Boolean(params.date_from && params.date_to),
    staleTime: 30 * 1000,
  });

export const useTimeOff = (params: { status?: string; user_uuid?: string } = {}) =>
  useQuery({
    queryKey: [KEY, 'timeoff', params],
    queryFn: async () => unwrap(await listTimeOff(params)),
    staleTime: 30 * 1000,
  });

export const useCoverage = (params: { date: string; timezone: string; handle_seconds?: number; occupancy?: number }, enabled = true) =>
  useQuery({
    queryKey: [KEY, 'coverage', params],
    queryFn: async () => unwrap(await getCoverage(params)),
    enabled: enabled && Boolean(params.date),
    staleTime: 60 * 1000,
  });

const useRefreshing = <T,>(call: (input: T) => Promise<any>) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: T) => unwrap(await call(input)),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [KEY] });
      /* Adherence on the agent-day report follows the schedules. */
      client.invalidateQueries({ queryKey: ['agentDay'] });
    },
  });
};

export const useSaveSchedules = () => useRefreshing(saveSchedules);
export const usePublishSchedules = () => useRefreshing(publishSchedules);
export const useRequestTimeOff = () => useRefreshing(requestTimeOff);
export const useDecideTimeOff = () => useRefreshing(decideTimeOff);
