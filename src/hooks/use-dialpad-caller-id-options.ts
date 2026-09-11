import { useMemo } from 'react';
import { isGroupCallerIdOption } from '@/hooks/use-group-caller-id-options';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useGetAssignedDIDNumbers } from './common';
import { useUser } from './use-user';
import type { CallerIdOption } from '@/components/dialpad/types';
import { updateUserDID } from '@/services/api';
import { TWILIO_CALLER_ID_OPTION } from '@/lib/twilio-voice-device';
/* india-caller-ids.ts's INDIA_CALLER_ID_OPTIONS (a hardcoded stand-in list of
   5 numbers, +918037683127..131) used to be merged in here, by that file's
   own design, "until these are assigned as DIDs [and] arrive from the API on
   their own". They now do - 127/128/131 are real assigned DIDs, 129/130 sit
   in the unclaimed inventory (see [[ucaas-in-calling-outage-11sep]]) - so the
   hardcoded list was just duplicating real entries and leaking unassigned
   inventory numbers into every person's caller-ID picker. Removed 11 Sep
   2026; the source file is left in place (unused) rather than deleted. */

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

/**
 * Comparison key for matching a stored caller ID against an assigned number.
 *
 * Deliberately more forgiving than `normalizeDidNumber`, which keeps the '+'.
 * The same number is written both ways in different places — '+12568081010'
 * here, '12568081010' there — and an exact comparison silently failed to match,
 * dropping the caller ID to whichever number happened to be first in the
 * assigned list. The person then places calls from a number they never chose,
 * with nothing on screen explaining why.
 */
const callerIdMatchKey = (value?: string | null) => (value || '').replace(/\D/g, '');

/** True when two numbers are the same, allowing for a missing country code. */
const sameNumber = (left?: string | null, right?: string | null) => {
  const a = callerIdMatchKey(left);
  const b = callerIdMatchKey(right);
  if (!a || !b) return false;
  if (a === b) return true;
  /* '2568081010' and '12568081010' are the same number written with and
     without the country code. Require a decent overlap so short extensions
     cannot accidentally match a long DID. */
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= 7 && longer.endsWith(shorter);
};

/**
 * True for the account's US numbers, which are no longer offered as caller IDs
 * now that outbound runs on the Indian trunk.
 *
 * Decided from the number first, not from `did_country`. That field is absent
 * on some assigned DIDs and `toCallerIdOptions` defaults the missing ones to
 * 'US', so trusting the label alone would hide a non-US DID that simply arrived
 * without a country. A +1 number is unambiguous however it is written; the
 * country check only covers the bare ten-digit form, where the label is the
 * one signal there is. An Indian number is twelve digits and matches neither.
 */
const isUnitedStatesOption = (option: CallerIdOption) => {
  const digits = callerIdMatchKey(option.number);
  if (digits.length === 11 && digits.startsWith('1')) return true;
  return digits.length === 10 && option.country?.toUpperCase() === 'US';
};

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

  const { callerIdOptions, defaultCallerIdOption, isCallerIdFallback } = useMemo(() => {
    /* US numbers are dropped rather than never built, so the console warning
       below still reports what the account actually holds. */
    const assignedOptions = toCallerIdOptions(assignedDIDList as AssignedDid[]).filter(
      (option) => !isUnitedStatesOption(option),
    );
    const noCallerIdOption: CallerIdOption = {
      ...EMPTY_CALLER_ID_OPTION,
      country: user?.countryInfo?.alpha2code || 'US',
    };
    const userCallerId = user?.user_info?.caller_id;
    const matchedCallerIdOption = userCallerId
      ? assignedOptions.find((option) => sameNumber(option.number, userCallerId)) || null
      : null;

    /* Falling through to the first assigned number is a real behaviour change
       for the person making the call, so say so rather than doing it quietly.
       Both cases warn: a stored value that matches nothing, and no stored value
       at all — the second is easy to miss precisely because nothing looks wrong. */
    if (!matchedCallerIdOption && assignedOptions.length) {
      console.warn(
        userCallerId
          ? `[caller-id] stored caller_id "${userCallerId}" matches none of the assigned numbers ` +
              `(${assignedOptions.map((o) => o.number).join(', ')}); using the first instead.`
          : '[caller-id] no caller_id is set on this account; using the first assigned number. ' +
              'Pick one from the dialpad to make it stick.',
      );
    }

    if (matchedCallerIdOption) {
      return {
        callerIdOptions: assignedOptions,
        defaultCallerIdOption: matchedCallerIdOption,
        isCallerIdFallback: false,
      };
    }

    if (assignedOptions.length === 0) {
      /* No number assigned (or every one was a filtered-out US number) - the
         account genuinely has nothing to call from yet. Get one from Admin >
         Numbers > Add Number rather than silently defaulting to a shared
         placeholder number. */
      return {
        callerIdOptions: [noCallerIdOption],
        defaultCallerIdOption: noCallerIdOption,
        isCallerIdFallback: false,
      };
    }

    return {
      callerIdOptions: assignedOptions,
      defaultCallerIdOption: assignedOptions[0],
      /* Nothing on this account chose this number — it is simply first in the
         list. Surfaces in the UI so a wrong outbound number is visible before
         the call rather than after it. */
      isCallerIdFallback: true,
    };
  }, [assignedDIDList, user?.countryInfo?.alpha2code, user?.user_info?.caller_id]);

  return {
    callerIdOptions,
    defaultCallerIdOption,
    isCallerIdFallback,
    isCallerIdLoading: isLoading,
    isCallerIdUpdating,
    updateCallerIdSelection: async (option: CallerIdOption) => {
      if (!option || option.id === EMPTY_CALLER_ID_OPTION.id) return;
      /* A shared group number is for one call, never someone's saved default.
         The dialer already skips this call for those, but the guard lives here
         too so a future caller cannot persist one by accident. */
      if (isGroupCallerIdOption(option)) return;
      /* Not an assigned DID — nothing to persist as the account's default. */
      if (option.id === TWILIO_CALLER_ID_OPTION.id) return;
      await mutateCallerId({ caller_id: normalizeDidNumber(option.number) });
    },
  };
};
