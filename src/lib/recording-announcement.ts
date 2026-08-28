/* Checking a call-recording announcement before it goes live.
 *
 * established systems documents the strictest rule of the platforms we follow, and it is the
 * one admins get wrong most often. A recording announcement has to say TWO
 * things, not one:
 *
 *   1. that the call is being recorded, transcribed or monitored, and
 *   2. that a THIRD PARTY may be the one doing it.
 *
 * The classic failure is "This call may be recorded for quality purposes". It
 * covers the first half and misses the second, and compliance guidance rejects it. That
 * exact sentence is the reason this file exists.
 *
 * Two more documented facts shape what the UI should say around this field:
 *
 *   - When office-wide automatic recording is switched on, established systems plays no
 *     recording greeting at all. Uploading a lovely announcement changes
 *     nothing; the people on the calls have to say it out loud. A company in
 *     that state needs a different warning from one recording line by line.
 *   - For inbound Department / Contact Centre calls with AI or transcription
 *     turned on, the announcement is not optional.
 *
 * This is a wording heuristic, not legal advice, and it only encodes the usual
 * documented rule. Local law may demand more (two-party consent states, GDPR
 * notices), and nothing here is a promise that an announcement is lawful.
 *
 * BIAS, ON PURPOSE: this check would rather fail a good announcement than pass
 * a bad one. A false fail costs an admin thirty seconds of rewording. A false
 * pass ships a non-compliant greeting to real callers while the admin believes
 * it was checked. So the phrase lists stay literal, negated wording ("this call
 * is not recorded") never counts as evidence, and anything genuinely ambiguous
 * fails with an explanation rather than being cleverly rescued.
 */

/** The two halves an announcement must contain. */
export type AnnouncementHalf = 'recording' | 'third_party';

export type RecordingAnnouncementCheck = {
  valid: boolean;
  /** Which halves are absent. Empty when the wording passes. */
  missing: AnnouncementHalf[];
  /** Plain English an admin can act on. Never a legal guarantee. */
  reason: string;
};

/* Wording that counts as "we are recording".
   Literal verb forms only — no stemming, so that nothing matches by accident. */
export const RECORDING_PHRASES: readonly string[] = [
  'recorded',
  'recording',
  'recordings',
  'record this call',
  'record your call',
  'record calls',
  'transcribed',
  'transcribing',
  'transcription',
  'transcript',
  'transcripts',
  'monitored',
  'monitoring',
  'listened to',
  'listening in',
  'listen in on this call',
];

/* Wording that counts as "someone other than us may be doing it".
   The vaguer words are kept in a possessive or article form ("our partner", not
   a bare "partner") so that an unrelated sentence about a partner or a supplier
   cannot pass this half on its own. */
export const THIRD_PARTY_PHRASES: readonly string[] = [
  'third party',
  'third parties',
  'third party provider',
  'third party service',
  'on our behalf',
  'acting on our behalf',
  'service provider',
  'service providers',
  'external provider',
  'external providers',
  'outside provider',
  'another company',
  'other companies',
  'external company',
  'external companies',
  'vendor',
  'vendors',
  'subcontractor',
  'subcontractors',
  'our partner',
  'our partners',
  'a partner',
  'trusted partner',
  'trusted partners',
  'business partner',
  'business partners',
  'partner company',
  'partner companies',
  'our supplier',
  'our suppliers',
];

/* Words that flip the meaning of whatever follows them. Checked in a short
   window before a match, so "this call is not recorded" earns no credit. */
const NEGATORS: readonly string[] = [
  'not',
  'no',
  'never',
  'nor',
  'neither',
  'without',
  "isn't",
  "aren't",
  "won't",
  "don't",
  "doesn't",
  "can't",
  'cannot',
];

/** How far back a negator still counts, in words. */
const NEGATION_WINDOW = 4;

/* Lower-cased, punctuation flattened to spaces, padded with a space at each end
   so that a phrase can be matched whole rather than inside a longer word.
   Apostrophes survive so that "won't" stays recognisable as a negator. */
const normalise = (text: string): string =>
  ` ${text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

const isNegated = (before: string): boolean => {
  const words = before.trim().split(' ').filter(Boolean).slice(-NEGATION_WINDOW);
  return words.some((word) => NEGATORS.includes(word));
};

/* True when the phrase appears at least once without a negator in front of it. */
const mentions = (haystack: string, phrase: string): boolean => {
  const needle = normalise(phrase);
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return false;
    if (!isNegated(haystack.slice(0, at + 1))) return true;
    from = at + 1;
  }
};

const EXAMPLE_WORDING =
  'This call may be recorded or transcribed by us, or by a third party acting on our behalf.';

/**
 * Check one announcement's wording against the two-part rule.
 *
 * Both halves have to be present. "This call may be recorded for quality
 * purposes" fails, because nothing in it tells the caller that a company other
 * than ours might be listening.
 */
export const validateRecordingAnnouncement = (text: string): RecordingAnnouncementCheck => {
  const haystack = normalise(text ?? '');
  const missing: AnnouncementHalf[] = [];

  if (haystack.trim().length === 0) {
    return {
      valid: false,
      missing: ['recording', 'third_party'],
      reason: `There is nothing here to check yet. A recording announcement has to tell callers two things: that the call may be recorded or transcribed, and that another company may be doing it. For example: "${EXAMPLE_WORDING}"`,
    };
  }

  if (!RECORDING_PHRASES.some((phrase) => mentions(haystack, phrase))) {
    missing.push('recording');
  }
  if (!THIRD_PARTY_PHRASES.some((phrase) => mentions(haystack, phrase))) {
    missing.push('third_party');
  }

  if (missing.length === 0) {
    return {
      valid: true,
      missing,
      reason:
        'This wording mentions both that the call may be recorded or transcribed and that a third party may be involved, which is what established systems asks for. This is an automatic wording check only, so please also make sure it matches the rules where you and your callers are.',
    };
  }

  const bothMissing = missing.length === 2;
  const problem = bothMissing
    ? 'This wording does not say that the call may be recorded or transcribed, and it does not say that another company may be doing it.'
    : missing[0] === 'recording'
      ? 'This wording mentions a third party, but it never tells callers that the call may be recorded, transcribed or monitored.'
      : 'This wording tells callers the call may be recorded, but it does not say that another company — a third party working for us — may be doing the recording. established systems turns down announcements that stop there, which is why "This call may be recorded for quality purposes" is not enough on its own.';

  return {
    valid: false,
    missing,
    reason: `${problem} Try wording such as: "${EXAMPLE_WORDING}"`,
  };
};

export type RecordingAnnouncementExample = {
  /** Stable key for lists and copy buttons. */
  id: string;
  /** What kind of company or line this suits. */
  label: string;
  text: string;
};

/** Wording an admin can copy as-is. Every one of these passes the check above. */
export const COMPLIANT_RECORDING_ANNOUNCEMENTS: readonly RecordingAnnouncementExample[] = [
  {
    id: 'short',
    label: 'Short and general',
    text: 'This call may be recorded or transcribed by us, or by a third party acting on our behalf.',
  },
  {
    id: 'quality',
    label: 'Quality and training',
    text: 'For quality and training, this call may be recorded and transcribed by us or by a third party service provider working on our behalf.',
  },
  {
    id: 'ai',
    label: 'AI notes or transcription in use',
    text: 'To help us take notes, this call may be recorded, transcribed and monitored by us and by third party providers acting on our behalf.',
  },
  {
    id: 'support',
    label: 'Support or contact centre',
    text: 'Before we begin: this call may be recorded or transcribed, either by our team or by a third party we work with, so that we can support you better.',
  },
];

/** What the company has switched on, as far as this warning cares. */
export type RecordingAnnouncementContext = {
  /** Office-wide automatic recording. When true, no greeting is played at all. */
  officeWideAutomaticRecording: boolean;
  /** AI features or transcription are on for this line. */
  aiOrTranscriptionEnabled: boolean;
  /** This is an inbound Department or Contact Centre line rather than a personal one. */
  inboundDepartmentOrContactCentre: boolean;
};

export type RecordingAnnouncementAdvice = {
  /** Whether callers will actually hear the uploaded announcement. */
  greetingPlays: boolean;
  /** Whether an announcement is required, by greeting or by voice. */
  required: boolean;
  /** One sentence for the UI, or null when there is nothing to warn about. */
  warning: string | null;
};

/**
 * What to tell the admin around the announcement field.
 *
 * The office-wide case is the surprising one: the setting is on, recording is
 * happening, and yet nothing is announced to the caller — so the warning has to
 * push the announcement onto the people taking the calls instead of the greeting
 * box.
 */
export const recordingAnnouncementAdvice = (
  context: RecordingAnnouncementContext,
): RecordingAnnouncementAdvice => {
  const required =
    context.officeWideAutomaticRecording ||
    (context.inboundDepartmentOrContactCentre && context.aiOrTranscriptionEnabled);

  if (context.officeWideAutomaticRecording) {
    return {
      greetingPlays: false,
      required: true,
      warning:
        'Automatic recording is on for the whole office, so no recording greeting is played to callers. Everyone taking calls has to say out loud that the call may be recorded or transcribed, and that a third party may be doing it.',
    };
  }

  if (required) {
    return {
      greetingPlays: true,
      required: true,
      warning:
        'This line uses AI or transcription on inbound calls, so an announcement is required. Callers must be told that the call may be recorded or transcribed and that a third party may be doing it.',
    };
  }

  return { greetingPlays: true, required: false, warning: null };
};
