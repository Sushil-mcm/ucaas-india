/* Turning the company's override flags into an actual lock.
 *
 * Each setting in the company record carries an `override` flag meaning "a person
 * may change this one on their own phone". Until now nothing read it: the personal
 * settings page stripped `override` out before saving and decided editability from
 * job title alone — an admin could change everything, everyone else could change
 * nothing. That is the wrong shape. "Anyone may pick their ringtone, nobody may
 * turn off call recording" was impossible to express.
 *
 * This reads the flags and answers one question per field: may this person change
 * it. Two rules keep it safe to switch on:
 *
 *   - It applies only on someone's own settings page. Every other screen using the
 *     shared editor is an admin configuring a number, department, IVR or queue, and
 *     locking those would be nonsense.
 *   - With no company record saved, it defers entirely to the old behaviour. A
 *     tenant that has never opened the company page sees no change at all, rather
 *     than every field silently locking because absent flags read as false.
 */

import { useQuery } from '@tanstack/react-query';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';

/* The settings a company rule can be set on, and where the flag sits in the
   stored record. Keys are the names callers use; paths are what the company page
   writes. Anything absent from this map is not governed and stays editable. */
export const POLICY_FIELDS = {
  voicemail: 'voicemail_pin.override',
  recording: 'recording.override',
  transcription: 'transcription.override',
  ai_call_monitoring: 'ai_call_monitoring.override',
  display_number: 'display_number.override',
  business_hours: 'operational_hours.override',
  regional: 'operational_hours.regional.override',
  role: 'role.override',
} as const;

export type PolicyField = keyof typeof POLICY_FIELDS;

const readPath = (source: any, path: string): any =>
  path.split('.').reduce((value, key) => (value == null ? value : value[key]), source);

export interface CompanyPolicy {
  /* True once a company record exists and its flags are governing this page. */
  isActive: boolean;
  isLoading: boolean;
  /* Whether the person may change this field on their own phone. */
  allows: (field: PolicyField) => boolean;
}

export const useCompanyPolicy = ({ enabled }: { enabled: boolean }): CompanyPolicy => {
  const { data, isLoading } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    enabled,
    /* The company rule changes rarely and is read on every settings page load, so
       it is kept for a few minutes rather than refetched each time. */
    staleTime: 5 * 60 * 1000,
  });

  const settings = data?.settings;
  const isActive = enabled && !isLoading && !!data?.uuid && !!settings;

  return {
    isActive,
    isLoading: enabled && isLoading,
    allows: (field: PolicyField) => {
      if (!isActive) return true;
      return readPath(settings, POLICY_FIELDS[field]) === true;
    },
  };
};
