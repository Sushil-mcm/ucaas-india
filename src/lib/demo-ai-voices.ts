/**
 * Voices for the AI Receptionist builder in demo mode.
 *
 * The builder's "Voice & Persona" step reads `/api/ai/voice/list`. With no
 * backend that list comes back empty, and the component falls back to the
 * static `voiceOptions` in `admin-settings/knowledge-base/constants.tsx`.
 * Those entries carry no `multilingual` flag and no `locale`, but the step
 * opens on the Multilingual tab, which keeps only voices `isMultilingualVoice`
 * recognises — so every fallback voice is filtered out, the panel shows "No
 * voices found", and the required Voice persona field can never be satisfied.
 * The wizard cannot reach step 3.
 *
 * Answering the endpoint fixes that where the gap actually is. These rows use
 * the shape the real API returns, so the step's own filters do the rest and no
 * component code has to change.
 *
 * Every voice here is invented. The names follow the Indian cast used
 * throughout the rest of the demo data, and no audio exists behind any of them
 * — `/api/ai/voice/preview` has nothing to return, so pressing play reports
 * that rather than playing something.
 */

interface DemoVoiceSeed {
  name: string;
  gender: 'female' | 'male';
  locale: string;
  multilingual: boolean;
}

/* Eight multilingual voices, matching the count the step's banner advertises.
   The locale on a multilingual voice is only where it was recorded; the step
   reads them as language-agnostic, which is the point of the tab. */
const MULTILINGUAL: DemoVoiceSeed[] = [
  { name: 'Ava', gender: 'female', locale: 'en-US', multilingual: true },
  { name: 'Andrew', gender: 'male', locale: 'en-US', multilingual: true },
  { name: 'Aarti', gender: 'female', locale: 'hi-IN', multilingual: true },
  { name: 'Arjun', gender: 'male', locale: 'hi-IN', multilingual: true },
  { name: 'Kavya', gender: 'female', locale: 'hi-IN', multilingual: true },
  { name: 'Kunal', gender: 'male', locale: 'hi-IN', multilingual: true },
  { name: 'Emma', gender: 'female', locale: 'en-US', multilingual: true },
  { name: 'Brian', gender: 'male', locale: 'en-US', multilingual: true },
];

/* Fixed-language voices, one set per tab the step offers. Without these the
   three locale tabs would be empty even once Multilingual works, because the
   step deliberately shows fixed and multilingual voices in different tabs. */
const FIXED: DemoVoiceSeed[] = [
  { name: 'Jenny', gender: 'female', locale: 'en-US', multilingual: false },
  { name: 'Guy', gender: 'male', locale: 'en-US', multilingual: false },
  { name: 'Aria', gender: 'female', locale: 'en-US', multilingual: false },
  { name: 'Davis', gender: 'male', locale: 'en-US', multilingual: false },

  { name: 'Ananya', gender: 'female', locale: 'hi-IN', multilingual: false },
  { name: 'Aarav', gender: 'male', locale: 'hi-IN', multilingual: false },
  { name: 'Swara', gender: 'female', locale: 'hi-IN', multilingual: false },
  { name: 'Madhur', gender: 'male', locale: 'hi-IN', multilingual: false },

  { name: 'Abril', gender: 'female', locale: 'es-ES', multilingual: false },
  { name: 'Alvaro', gender: 'male', locale: 'es-ES', multilingual: false },
  { name: 'Elvira', gender: 'female', locale: 'es-ES', multilingual: false },
  { name: 'Dario', gender: 'male', locale: 'es-ES', multilingual: false },
];

const toRow = (seed: DemoVoiceSeed, index: number) => {
  /* `isMultilingualVoice` checks the explicit flag first and only then falls
     back to looking for the word in the name. Both agree here, so a voice is
     classified the same way whichever path a caller takes. */
  const shortName = `${seed.locale}-${seed.name}${seed.multilingual ? 'Multilingual' : ''}Neural`;

  return {
    uuid: `demo-voice-${String(index + 1).padStart(2, '0')}`,
    id: index + 1,
    voice_id: shortName,
    short_name: shortName,
    display_name: seed.name,
    local_name: seed.name,
    name: seed.name,
    gender: seed.gender,
    locale: seed.locale,
    voice_type: seed.multilingual ? 'Neural Multilingual' : 'Neural',
    multilingual: seed.multilingual,
    status: 'active',
  };
};

export const demoAiVoiceRows = () => [...MULTILINGUAL, ...FIXED].map(toRow);
