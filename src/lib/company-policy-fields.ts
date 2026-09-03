/* The settings a company rule can be set on, and where the flag sits in the
   stored record. Keys are the names callers use; paths are what the company page
   writes. Anything absent from this map is not governed and stays editable.

   Split out from `company-policy.ts` on purpose: that module and
   `company-rule-flags.ts` import from each other (policy calls `readRuleFlags`,
   flags read `POLICY_FIELDS` back), and `company-rule-flags.ts` uses
   `POLICY_FIELDS` at module top level (`Object.keys(POLICY_FIELDS)` for
   `RULE_FIELDS`). Whichever of the two modules a page happened to import
   first decided who won that race — losing meant reading `POLICY_FIELDS`
   before `company-policy.ts` had reached its own `const` line, a
   `ReferenceError` that only some import orders ever hit. This is the
   dependency-free leaf both sides now read from, so neither has to win. */
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
