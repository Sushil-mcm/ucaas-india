import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useGetAssignedDIDNumbers } from './common';
import { useUser } from './use-user';
import type { CallerIdOption } from '@/components/dialpad/types';
import { updateUserDID } from '@/services/api';

type AssignedDid = {
  uuid?: string;
  did_number?: string;
  did_country?: string;
};

const toCallerIdOptions = (assignedDIDList: AssignedDid[]): CallerIdOption[] =>
  assignedDIDList
    .filter((item) => item?.did_number && item?.uuid)
    .map((item, index) => ({
      id: item.uuid as string,
      label: index === 0 ? 'Main DID' : `DID ${index + 1}`,
      country: (item.did_country || 'US').toUpperCase(),
      number: item.did_number as string,
    }));

const normalizeDidNumber = (value?: string | null) => (value || '').replace(/[^\d+]/g, '');

const EMPTY_CALLER_ID_OPTION: CallerIdOption = {
  id: 'no-caller-id',
  label: 'Caller ID',
  country: 'US',
  number: 'No caller id',
};

const getCallerIdErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') return 'Failed to update Caller ID';
  return (
    (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
    'Failed to update Caller ID'
  );
};

export const useDialpadCallerIdOptions = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: assignedDIDList = [], isLoading } = useGetAssignedDIDNumbers();

  const { mutateAsync: mutateCallerId, isPending: isCallerIdUpdating } = useMutation({
    mutationFn: updateUserDID,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getUsersDetails'] });
      toast.success('Caller ID updated successfully');
    },
    onError: (error) => {
      toast.error(getCallerIdErrorMessage(error));
    },
  });

  const { callerIdOptions, defaultCallerIdOption } = useMemo(() => {
    const assignedOptions = toCallerIdOptions(assignedDIDList as AssignedDid[]);
    const noCallerIdOption: CallerIdOption = {
      ...EMPTY_CALLER_ID_OPTION,
      country: user?.countryInfo?.alpha2code || 'US',
    };
    const userCallerId = user?.user_info?.caller_id;
    const normalizedUserCallerId = normalizeDidNumber(userCallerId);
    const matchedCallerIdOption = normalizedUserCallerId
      ? assignedOptions.find(
          (option) => normalizeDidNumber(option.number) === normalizedUserCallerId,
        ) || null
      : null;

    if (matchedCallerIdOption) {
      return {
        callerIdOptions: assignedOptions,
        defaultCallerIdOption: matchedCallerIdOption,
      };
    }

    if (assignedOptions.length === 0) {
      return {
        callerIdOptions: [noCallerIdOption],
        defaultCallerIdOption: noCallerIdOption,
      };
    }

    return {
      callerIdOptions: assignedOptions,
      defaultCallerIdOption: assignedOptions[0],
    };
  }, [assignedDIDList, user?.countryInfo?.alpha2code, user?.user_info?.caller_id]);

  return {
    callerIdOptions,
    defaultCallerIdOption,
    isCallerIdLoading: isLoading,
    isCallerIdUpdating,
    updateCallerIdSelection: async (option: CallerIdOption) => {
      if (!option || option.id === EMPTY_CALLER_ID_OPTION.id) return;
      await mutateCallerId({ caller_id: normalizeDidNumber(option.number) });
    },
  };
};
