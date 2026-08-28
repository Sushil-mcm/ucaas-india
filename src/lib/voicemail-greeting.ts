import {
  createGreeting,
  mediaUploadUrl,
  textToSpeech,
  updateMemberForwading,
} from '@/services/api';
import { convertBase64ToBlob } from '@/lib/utils';

/**
 * Personalised voicemail greetings, generated rather than recorded.
 *
 * A caller who reaches a mailbox with no greeting hears a bare tone and has no
 * idea who they reached — which is barely better than the silence we started
 * from. Recording one per person does not scale, so each is synthesised from
 * the person's own name.
 *
 * The pipeline is the one the Media Files screen already uses, in the same
 * order, because each step depends on the last: synthesise the audio, ask for
 * an upload URL, measure the clip, PUT the bytes, then register the greeting.
 * Registering before the upload lands would leave a greeting pointing at a file
 * that is not there.
 */

export const DEFAULT_LOCALE = 'en-US';

/**
 * What the caller hears.
 *
 * Names the person rather than the number: "the voicemail of Umar Ansari" tells
 * a caller they reached the right person, where a read-out number only tells
 * them they dialled what they dialled.
 */
export const voicemailScriptFor = (name: string, company?: string) =>
  company
    ? `You have reached the voicemail of ${name} from ${company}. Please leave your name, number and a short message after the tone, and your call will be returned.`
    : `You have reached the voicemail of ${name}. Please leave your name, number and a short message after the tone, and your call will be returned.`;

/** The greeting's name in Media Files, and how an existing one is recognised. */
export const voicemailGreetingName = (name: string) => `Voicemail — ${name}`;

/** Decoding is the only way to get a duration the platform will accept. */
const durationOf = async (file: File): Promise<number> => {
  const objectUrl = URL.createObjectURL(file);
  const context = new AudioContext();
  try {
    const response = await fetch(objectUrl);
    const buffer = await response.arrayBuffer();
    const decoded = await context.decodeAudioData(buffer);
    return Math.ceil(decoded.duration);
  } catch {
    /* A duration of 0 is rejected, and a wrong one only affects the listing —
       so fall back to something plausible rather than failing the whole run. */
    return 8;
  } finally {
    URL.revokeObjectURL(objectUrl);
    await context.close().catch(() => undefined);
  }
};

export type GeneratedGreeting = {
  name: string;
  filename: string;
  duration: number;
};

/**
 * Creates one personalised voicemail greeting and returns what was registered.
 *
 * Throws on the first failed step rather than continuing, so a caller running
 * this over many people can report exactly who failed and why.
 */
export const generateVoicemailGreeting = async ({
  personName,
  companyName,
  companyUuid,
  locale = DEFAULT_LOCALE,
  voice = '',
}: {
  personName: string;
  companyName?: string;
  companyUuid: string;
  locale?: string;
  voice?: string;
}): Promise<GeneratedGreeting> => {
  const speech = await textToSpeech({
    text: voicemailScriptFor(personName, companyName),
    locale,
    short_name: voice,
  });

  const base64 = (speech as any)?.data?.data?.result;
  if (!base64) throw new Error('Text-to-speech returned no audio');

  const file = new File([convertBase64ToBlob(base64)], 'audio.mp3', { type: 'audio/mpeg' });

  const upload = await mediaUploadUrl({
    uuid: companyUuid,
    type: 'greeting',
    file_name: file.name,
  });

  const target = (upload as any)?.data?.data?.result;
  if (!target?.url || !target?.file_name) throw new Error('No upload URL was issued');

  const duration = await durationOf(file);

  const put = await fetch(target.url, { method: 'PUT', body: file });
  if (put.status !== 200) throw new Error(`Upload failed (${put.status})`);

  const greetingName = voicemailGreetingName(personName);

  await createGreeting({
    name: greetingName.slice(0, 50),
    filename: target.file_name,
    size: file.size,
    duration,
    type: 'voicemail',
    /* Never the tenant default: these are per-person, and one person's greeting
       becoming everyone's would be worse than having none. */
    is_default: false,
  });

  return { name: greetingName, filename: target.file_name, duration };
};

/** Stored JSON columns arrive as strings on some responses and objects on others. */
const asObject = (value: unknown): any => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value) || '{}');
  } catch {
    return {};
  }
};

/**
 * Attaches a greeting to a person's voicemail slot.
 *
 * `/api/user/update` replaces the whole user record — there is no endpoint that
 * patches one field for someone else — so every other value is read off the
 * person and written straight back. That is the safe form of a full-record
 * write: the payload is the server's own data with exactly one slot changed,
 * not a payload assembled from assumptions about what the record contains.
 *
 * A greeting is referenced by `filename`, not by uuid — that is what the
 * greeting picker stores and what the platform resolves.
 */
export const assignVoicemailGreeting = async (
  person: any,
  greeting: { name: string; filename: string },
) => {
  const existingGreetings = asObject(person?.greetings);
  const roleId = person?.custom_role_uuid || person?.role_uuid;
  const siteUuid = person?.site_uuid || person?.site?.uuid;

  return updateMemberForwading({
    first_name: person?.first_name,
    last_name: person?.last_name,
    job_title: person?.job_title,
    /* Omitted when absent rather than sent empty. Writing this field back in a
       different format than it was stored breaks the match against the assigned
       numbers, and the dialpad then silently falls back to the first DID — the
       person places calls from a number they never picked. */
    ...(person?.caller_id ? { caller_id: person.caller_id } : {}),
    /* Omitted rather than sent empty: a blank here would read as "clear the
       site", not "we could not resolve it". */
    ...(siteUuid ? { site_uuid: siteUuid } : {}),
    call_forwarding: asObject(person?.call_forwarding),
    ...(person?.custom_role_uuid ? { custom_role_uuid: roleId } : { role_uuid: roleId }),
    greetings: {
      ...existingGreetings,
      voicemail: {
        enabled: true,
        label: greeting.name,
        value: greeting.filename,
      },
    },
    settings: asObject(person?.settings),
    uuid: person?.uuid,
    userID: person?.uuid,
  });
};
