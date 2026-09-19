import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IdCard } from 'lucide-react';
import { Link } from 'react-router-dom';

import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import {
  buildPersonProfileFieldsPayload,
  missingRequired,
  readFieldDefinitions,
  readFieldValues,
} from '@/lib/person-profile-fields';
import { handleAlert } from '@/lib/utils';
import { updateMemberForwading } from '@/services/api';

/* Fill in one person's custom profile fields.
 *
 * The shape is defined once, in Company > Profile fields. This tab is where an
 * admin fills the values in for a person.
 *
 * SAVED ON ITS OWN, like the Skills tab next door, and for the same reason: it
 * keeps this feature out of the main form's submit path. That path assembles a
 * large payload from many tabs, and `/api/user/update` replaces the whole
 * record — a mistake there does not produce a wrong profile field, it deletes
 * somebody's voicemail greeting. The payload here is built by
 * `buildPersonProfileFieldsPayload`, which is pure, tested, and echoes every
 * other value on the record back untouched.
 *
 * Scope is deliberate and set by the owner: an ADMIN fills these in. They do not
 * appear in the directory and a person does not edit their own. Anything wider
 * is a decision about publishing staff data, not an implementation detail.
 */

interface ProfileFieldsTabProps {
  /** The person record the panel was hydrated from. Echoed back on save. */
  person: any;
  personName?: string;
}

const ProfileFieldsTab = ({ person, personName }: ProfileFieldsTabProps) => {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  const { data: companyDefaults = null, isLoading } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    refetchOnWindowFocus: false,
  });

  const definitions = useMemo(
    () => readFieldDefinitions(companyDefaults?.settings),
    [companyDefaults],
  );

  /* Re-seed whenever the record changes underneath, so opening a second person
     never shows the first person's answers. */
  const savedValues = useMemo(() => readFieldValues(person), [person]);
  useEffect(() => {
    setValues(savedValues);
    setTouched(false);
  }, [savedValues]);

  const stillMissing = missingRequired(definitions, values);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (payload: Record<string, any>) => updateMemberForwading(payload),
    onSuccess: () => {
      handleAlert({ text: 'Profile fields saved', type: 'success' });
      setTouched(false);
      /* The whole person is invalidated, not just this tab: forwarding,
         greetings and holidays read the same record, and a stale copy is how a
         later save is built on data that has already moved. */
      queryClient.invalidateQueries({ queryKey: ['getUserList'] });
      queryClient.invalidateQueries({ queryKey: ['userTemplateList'] });
    },
    onError: (error: any) => {
      handleAlert({
        text: error?.response?.data?.message || 'Could not save the profile fields',
        type: 'error',
      });
    },
  });

  const onSave = () => {
    if (stillMissing.length) {
      handleAlert({
        text: `Still needed: ${stillMissing.map((f) => f.label || 'a field').join(', ')}`,
        type: 'error',
      });
      return;
    }
    save(buildPersonProfileFieldsPayload({ person, values }));
  };

  if (isLoading) return <Loader />;

  /* No definitions yet is not an error — it is the ordinary state of a company
     that has not set any up. Say where they are set rather than showing an
     empty panel that looks broken. */
  if (!definitions.length) {
    return (
      <div className="mcm-empty flex flex-col items-start gap-2 p-6">
        <IdCard className="h-5 w-5 opacity-60" />
        <p className="text-sm font-semibold">No profile fields have been set up yet.</p>
        <p className="mcm-field-note">
          Extra details like Employee ID or Start date are defined once for the whole company,
          then filled in here for each person.
        </p>
        <Link className="mcm-link text-sm" to="/admin-settings/company/profile-fields">
          Set them up in Company &rsaquo; Profile fields
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-1 pr-2">
      <p className="mcm-field-note">
        Extra details kept on {personName || 'this person'}&rsquo;s record. The list is defined in{' '}
        <Link className="mcm-link" to="/admin-settings/company/profile-fields">
          Company &rsaquo; Profile fields
        </Link>
        . These are visible to administrators here; they do not appear in the company directory.
      </p>

      {definitions.map((field) => {
        const value = values[field.id] ?? '';
        const isMissing = field.required && !value.trim();

        return (
          <div key={field.id} className="flex flex-col gap-1">
            <Label htmlFor={`pf-${field.id}`}>
              {field.label || 'Untitled field'}
              {field.required ? <span className="text-red-600"> *</span> : null}
            </Label>

            {field.type === 'choice' ? (
              <CustomSelect
                placeholder="Select"
                options={field.choices.map((choice) => ({ label: choice, value: choice }))}
                value={value ? { label: value, value } : null}
                handleChange={(option: any) => {
                  setValues((prev) => ({ ...prev, [field.id]: option?.value || '' }));
                  setTouched(true);
                }}
              />
            ) : (
              <Input
                id={`pf-${field.id}`}
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={value}
                onChange={(event) => {
                  setValues((prev) => ({ ...prev, [field.id]: event.target.value }));
                  setTouched(true);
                }}
              />
            )}

            {isMissing ? (
              <span className="text-xs text-red-600">This one is required.</span>
            ) : null}
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" onClick={onSave} disabled={isPending || !touched}>
          {isPending ? 'Saving…' : 'Save profile fields'}
        </Button>
        {touched ? <span className="mcm-field-note">Not saved yet.</span> : null}
      </div>
    </div>
  );
};

export default ProfileFieldsTab;
