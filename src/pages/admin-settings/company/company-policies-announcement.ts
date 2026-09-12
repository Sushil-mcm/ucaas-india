/* The recording notice, from wording to audio.
 *
 * The switch plays a notice at the start of every recorded call. Until 9 Sep
 * 2026 it was always the stock file; the wording an admin typed on Company >
 * Policies was stored and read by nothing. Now the switch reads
 * `company_policies.call_recording.announcement_file` and plays that file when
 * it can fetch it (dialplan `company_recording_notice_actions`), falling back to
 * the stock notice. This module makes that file: the same text-to-speech service
 * the Greetings screen uses, uploaded to the same place the switch fetches
 * greetings from (`<company>/greeting/<file>`), plus a row in the media library
 * so the audio can be found, played and deleted like any other prompt.
 *
 * It is a function, not a hook, so the screen can await it from a click.
 */

import {
  createGreeting,
  getGreetingVoiceList,
  mediaUploadUrl,
  textToSpeech,
} from '@/services/api';
import { convertBase64ToBlob } from '@/lib/utils';

export interface MakeAnnouncementInput {
  text: string;
  /* The company's prompt language, e.g. "en-US"; the voice is chosen from it. */
  locale: string;
  companyUuid?: string | null;
}

export interface MadeAnnouncement {
  file_name: string;
  voice: string;
}

/* The voices the service lists for a locale, reduced to one: a plain neural
   voice for that locale when there is one, otherwise the first voice offered.
   The Greetings screen lets a person pick; here nobody is choosing, so the
   choice has to be sensible on its own. */
export const pickVoice = (response: any, locale: string): string | null => {
  const voices =
    response?.data?.data?.voices ||
    response?.data?.data?.result?.voices ||
    response?.data?.data?.result?.rows ||
    response?.data?.data?.result ||
    [];
  if (!Array.isArray(voices) || !voices.length) return null;

  const idOf = (voice: any): string =>
    String(
      voice?.short_name || voice?.ShortName || voice?.voice_name || voice?.value || voice?.name || '',
    ).trim();
  const wanted = String(locale || '').toLowerCase();
  const ids = voices.map(idOf).filter(Boolean);
  const ofLocale = ids.filter((id) => id.toLowerCase().startsWith(wanted));
  const neural = ofLocale.find((id) => /neural$/i.test(id));

  return neural || ofLocale[0] || ids[0] || null;
};

/* How long the clip runs, for the library row. A failure to decode is not a
   failure to make the notice, so it answers 0 rather than throwing. */
const durationOf = async (blob: Blob): Promise<number> => {
  if (typeof AudioContext === 'undefined') return 0;
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    return Math.ceil(decoded.duration);
  } catch {
    return 0;
  } finally {
    await context.close().catch(() => undefined);
  }
};

export const makeAnnouncementAudio = async ({
  text,
  locale,
  companyUuid,
}: MakeAnnouncementInput): Promise<MadeAnnouncement> => {
  const wording = String(text || '').trim();
  if (!wording) throw new Error('Type the wording first.');
  if (!companyUuid) throw new Error('Your company could not be identified. Reload and try again.');

  const voice = pickVoice(await getGreetingVoiceList({ locale }), locale);
  if (!voice) {
    throw new Error(
      `No voice is available for ${locale}. Choose another prompt language above and try again.`,
    );
  }

  const spoken = await textToSpeech({ text: wording, locale, short_name: voice });
  const base64 = spoken?.data?.data?.result;
  if (!base64 || typeof base64 !== 'string') throw new Error('The voice service returned no audio.');
  const blob: Blob = convertBase64ToBlob(base64);

  /* Filed under `greeting` on purpose: it is the one folder the switch fetches
     from (queue_media.fetch_greeting reads <company>/greeting/<file>). The name
     carries no path and one extension, which is what the switch's safe_name()
     insists on before it will fetch anything. */
  const upload = await mediaUploadUrl({
    uuid: companyUuid,
    type: 'greeting',
    file_name: `recording-notice-${Date.now()}.mp3`,
  });
  const target = upload?.data?.data?.result || {};
  if (!target?.url || !target?.file_name) {
    throw new Error('Storage did not give a place to put the audio.');
  }

  const put = await fetch(target.url, { method: 'PUT', body: blob });
  if (!put.ok) throw new Error('Storage refused the audio.');

  /* The library row is a convenience - the switch reads the file, not the row.
     If the row cannot be written the notice still works, so this never fails
     the whole operation. */
  try {
    await createGreeting({
      name: 'Recording notice',
      filename: target.file_name,
      size: blob.size || 0,
      duration: await durationOf(blob),
      type: 'prompt',
      is_default: false,
    });
  } catch (error) {
    console.warn('Recording notice: audio stored, library row not written.', error);
  }

  return { file_name: String(target.file_name), voice };
};
