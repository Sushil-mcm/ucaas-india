import AdamMultiligual from '../../../assets/audio/en-US-AdamMultilingual-General-Audio.wav';
import AvaMultilingual from '../../../assets/audio/en-US-AvaMultilingual-General-Audio.wav';
import AmandaMultilingual from '../../../assets/audio/en-US-AmandaMultilingual-General-Audio.wav';
import AndrewMultilingual from '../../../assets/audio/en-US-AndrewMultilingual-General-Audio.wav';
import ChristopherMultilingual from '../../../assets/audio/en-US-ChristopherMultilingual-General-Audio.wav';
import DerekMultilingual from '../../../assets/audio/en-US-DerekMultilingual-General-Audio.wav';
import NancyMultilingual from '../../../assets/audio/en-US-NancyMultilingual-General-Audio.wav';
import SteffanMultilingual from '../../../assets/audio/en-US-SteffanMultilingual-General-Audio.wav';
import AbrilSpanish from '../../../assets/audio/es-ES-Abril-General-Audio.wav';
import EliasSpanish from '../../../assets/audio/es-ES-Elias-General-Audio.wav';
import ArnauSpanish from '../../../assets/audio/es-ES-Arnau-General-Audio.wav';
import LaiaSpanish from '../../../assets/audio/es-ES-Laia-General-Audio.wav';
import EstrellaSpanish from '../../../assets/audio/es-ES-Estrella-General-Audio.wav';
import DarioSpanish from '../../../assets/audio/es-ES-Dario-General-Audio.wav';
import AaravHindi from '../../../assets/audio/hi-IN-Aarav-General-Audio.wav';
import AnanyaHindi from '../../../assets/audio/hi-IN-Ananya-General-Audio.wav';
import KavyaHindi from '../../../assets/audio/hi-IN-Kavya-General-Audio.wav';
import MadhurHindi from '../../../assets/audio/hi-IN-Madhur-General-Audio.wav';
import RehaanHindi from '../../../assets/audio/hi-IN-Rehaan-General-Audio.wav';
import AartiHindi from '../../../assets/audio/hi-IN-Aarti-General-Audio.wav';
import ArjunHindi from '../../../assets/audio/hi-IN-Arjun-General-Audio.wav';
import KunalHindi from '../../../assets/audio/hi-IN-Kunal-General-Audio.wav';
import * as yup from 'yup';
import { requiredString, requiredURL, selectFieldRequired } from '@/lib/schema';
type FieldConfig = {
  name: string;
  label: string;
  description: string;
  type: 'switch' | 'select' | 'voice' | 'checkbox';
  options?: any[];
};

export const voiceOptions = [
  { label: 'Alloy', value: 'alloy', gender: 'female', audioURL: AvaMultilingual },
  { label: 'Ash', value: 'ash', gender: 'male', audioURL: AndrewMultilingual },
  { label: 'Ballad', value: 'ballad', gender: 'male', audioURL: AmandaMultilingual },
  { label: 'Coral', value: 'coral', gender: 'female', audioURL: AdamMultiligual },
  {
    label: 'Echo',
    value: 'echo',
    gender: 'male',
    audioURL: ChristopherMultilingual,
  },
  { label: 'Sage', value: 'sage', gender: 'female', audioURL: DerekMultilingual },
  { label: 'Shimmer', value: 'shimmer', gender: 'female', audioURL: SteffanMultilingual },
  { label: 'Verse', value: 'verse', gender: 'male', audioURL: NancyMultilingual },
  // { label: 'Phoebe', value: 'en-US-PhoebeMultilingualNeural' },
];

export const spanishVoiceOptions = [
  { label: 'Alloy', value: 'alloy', gender: 'female', audioURL: AbrilSpanish },
  { label: 'Ash', value: 'ash', gender: 'male', audioURL: EliasSpanish },
  { label: 'Ballad', value: 'ballad', gender: 'male', audioURL: ArnauSpanish },
  { label: 'Coral', value: 'coral', gender: 'female', audioURL: LaiaSpanish },
  { label: 'Echo', value: 'echo', gender: 'male', audioURL: EstrellaSpanish },
  { label: 'Sage', value: 'sage', gender: 'female', audioURL: DarioSpanish },
];
export const hindiVoiceOptions = [
  { label: 'Alloy', value: 'alloy', gender: 'female', audioURL: AaravHindi },
  { label: 'Ash', value: 'ash', gender: 'male', audioURL: AnanyaHindi },
  { label: 'Ballad', value: 'ballad', gender: 'male', audioURL: KavyaHindi },
  { label: 'Coral', value: 'coral', gender: 'female', audioURL: MadhurHindi },
  { label: 'Echo', value: 'echo', gender: 'male', audioURL: RehaanHindi },
  { label: 'Sage', value: 'sage', gender: 'female', audioURL: AartiHindi },
  { label: 'Shimmer', value: 'shimmer', gender: 'female', audioURL: ArjunHindi },
  { label: 'Verse', value: 'verse', gender: 'male', audioURL: KunalHindi },
];
export const idleReminderOptions = Array.from({ length: 12 }, (_, i) => {
  const seconds = (i + 1) * 5;
  return {
    label: `${seconds} seconds`,
    value: `${seconds}`,
  };
});
export const timezoneOptions = [
  { label: 'India Standard Time (IST)', value: 'asia-kolkata' },
  { label: 'Hawaii Standard Time (HST)', value: 'pacific-honolulu' },
  { label: 'Pacific Standard Time (PST)', value: 'america-los_angeles' },
  { label: 'Mountain Standard Time (MST)', value: 'america-denver' },
  { label: 'Central Standard Time (CST)', value: 'america-chicago' },
  { label: 'Eastern Standard Time (EST)', value: 'america-new_york' },
];

export const languageOptions = [
  { label: 'English', value: 'english' },
  { label: 'Spanish', value: 'spanish' },
  { label: 'Hindi', value: 'hindi' },
];
export const temperatureOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];
export const maxDurationOptions = [
  { label: '3 mins', value: '3' },
  { label: '5 mins', value: '5' },
  { label: '7 mins', value: '7' },
  { label: '10 mins', value: '10' },
];
export const detailsToCollectOptions = [
  { label: 'All', value: 'all' },
  { label: 'Name', value: 'name' },
  { label: 'DOB', value: 'dob' },
  { label: 'Phone', value: 'phone' },
  { label: 'Email', value: 'email' },
  { label: 'Address', value: 'address' },
];
export const LOCKED_VALUES = ['name', 'phone'];

export const fieldConfigs: FieldConfig[] = [
  // {
  //   name: 'agentAudioRecording',
  //   label: 'Enable Recordings',
  //   description:
  //     'Enable this option to automatically record all agent calls for future playback or review.',
  //   type: 'switch',
  // },
  {
    name: 'agentTranscript',
    label: 'Enable Transcripts',
    description: 'Enable this option to generate and save text transcripts for each call.',
    type: 'switch',
  },
  // {
  //   name: 'idleReminder',
  //   label: 'Idle Reminders',
  //   description: 'Choose how and when to send reminders if the user remains idle during a session.',
  //   type: 'select',
  //   options: idleReminderOptions,
  // },
  {
    name: 'language',
    label: 'Language',
    description: 'Select the preferred language for the AI agent’s responses and voice output.',
    type: 'select',
    options: languageOptions,
  },
  // {
  //   name: 'timezone',
  //   label: 'Timezone',
  //   description:
  //     'Set the agent’s default timezone to ensure accurate scheduling and time references.',
  //   type: 'select',
  //   options: timezoneOptions,
  // },
  {
    name: 'agentVoice',
    label: 'Voice',
    description: 'Select a voice for your AI agent or choose to clone your own voice.',
    type: 'voice',
    options: voiceOptions,
  },
  {
    name: 'temperature',
    label: 'Temperature',
    description: 'Adjust how creative or consistent the AI’s responses are during calls.',
    type: 'select',
    options: temperatureOptions,
  },
  // {
  //   name: 'max_duration',
  //   label: 'Max Duration for a Session',
  //   description: 'Set the maximum time limit allowed for each AI call session.',
  //   type: 'select',
  //   options: maxDurationOptions,
  // },
  {
    name: 'detailsToCollect',
    label: 'Details to Collect',
    description:
      'Select the information or details the AI should collect from callers during a conversation.',
    type: 'checkbox',
    options: detailsToCollectOptions,
  },
];
export const createAgentInitialValues = {
  agentName: '',
  firstMessage: '',
  systemPrompt: '',
  language: { label: 'English', value: 'english' },
  timezone: { label: 'Hawaii Standard Time (HST)', value: 'pacific-honolulu' },
  agentVoice: { label: 'Alloy', value: 'alloy', audioURL: AvaMultilingual },
  temperature: { label: 'Low', value: 'low' },
  detailsToCollect: ['all', 'name', 'dob', 'phone', 'email', 'address'],
  agentAudioRecording: false,
  agentTranscript: false,
  idleReminder: { label: '15 seconds', value: 15 },
  max_duration: { label: '3 mins', value: '3' },
  widgetHeaderColor: '#171717',
  widgetBubbleBackground: '#e9e9e9',
  widgetBubbleTextColor: '#171717',
  widgetIconColor: '#171717',
  widgetSendButtonColor: '#171717',
  widgetLoaderColor: '#171717',
};
export const createAgentSchema = yup.object().shape({
  agentName: yup
    .string()
    .required('Agent name is required')
    .max(50, 'Agent name should not exceed 50 characters'),

  firstMessage: yup.string().required('First message is required'),
  systemPrompt: yup.string().required('System prompt is required'),

  language: yup.object({
    label: yup
      .string()
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Language is required'),
      }),
    value: yup
      .string()
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Language is required'),
      }),
  }),
  // timezone: yup.object({
  //   label: yup
  //     .string()
  //     .required()
  //     .when('$isSingleStep', {
  //       is: true,
  //       then: (schema) => schema.notRequired().nullable(),
  //       otherwise: (schema) => schema.required('Timezone is required'),
  //     }),
  //   value: yup
  //     .string()
  //     .required()
  //     .when('$isSingleStep', {
  //       is: true,
  //       then: (schema) => schema.notRequired().nullable(),
  //       otherwise: (schema) => schema.required('Timezone is required'),
  //     }),
  // }),
  agentVoice: yup.object({
    label: yup
      .string()
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Voice is required'),
      }),
    value: yup
      .string()
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Voice is required'),
      }),
    audioURL: yup
      .string()
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Voice is required'),
      }),
  }),
  temperature: yup.object({
    label: yup
      .string()
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Temperature is required'),
      }),
    value: yup
      .mixed<'low' | 'medium' | 'high'>()
      .oneOf(['low', 'medium', 'high'])
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Temperature is required'),
      }),
  }),
  detailsToCollect: yup
    .array(yup.string())
    .default([])
    .when('$isSingleStep', {
      is: true,
      then: (schema) => schema.notRequired(),
    }),

  agentAudioRecording: yup
    .boolean()
    .default(false)
    .when('$isSingleStep', {
      is: true,
      then: (schema) => schema.notRequired(),
    }),

  agentTranscript: yup
    .boolean()
    .default(false)
    .when('$isSingleStep', {
      is: true,
      then: (schema) => schema.notRequired(),
    }),

  idleReminder: yup.object({
    label: yup
      .string()
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Idle reminder time is required'),
      }),
    value: yup
      .number()
      .required()
      .min(5, 'Minimum is 5 seconds')
      .max(60, 'Maximum is 60 seconds')
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Idle reminder time is required'),
      }),
  }),
  max_duration: yup.object({
    label: yup
      .string()
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Max duration is required'),
      }),
    value: yup
      .mixed<'3' | '5' | '7' | '10'>()
      .oneOf(['3', '5', '7', '10'])
      .required()
      .when('$isSingleStep', {
        is: true,
        then: (schema) => schema.notRequired().nullable(),
        otherwise: (schema) => schema.required('Max duration is required'),
      }),
  }),
});

export const pasteURLModalInitialValues = {
  name: '',
  urls: [{ url: '' }],
};

export const pasteURLModalSchema = yup.object().shape({
  name: yup.string().trim().required('Name is required'),
  urls: yup
    .array()
    .of(
      yup.object({
        url: yup.string().url('Invalid URL').required('URL is required'),
      }),
    )
    .min(1, 'At least one URL is required')
    .max(5, 'You can add up to 5 URLs only'),
});
export const createContentModalInitialValues = {
  name: '',
  text: '',
};

export const createContentModaSchema = yup.object().shape({
  name: requiredString('Name'),
  text: yup.string().trim().required('Content is required'),
});
export const addDomainInitialValues = {
  agentId: { label: '', value: '' },
  domain: '',
};
export const addDomainSchema = yup.object().shape({
  agentId: selectFieldRequired('Agent'),
  domain: requiredURL('Domain'),
});
export const addGlobalIngestionInitial = {
  agentId: null,
};

export const addGlobalIngestionSchema = yup.object().shape({
  agentId: yup.array().min(1, 'Select atleast 1 Agent'),
});

export const uploadPDFModalInitialValues = {
  name: '',
};

export const uploadPDFModalSchema = yup.object().shape({
  name: requiredString('Name'),
  file: yup.mixed().when('$isEdit', {
    is: true,
    then: (schema) =>
      schema.test('max', 'Maximum 5 files allowed', (value: any) => !value || value.length <= 5),
    otherwise: (schema) =>
      schema
        .test('required', 'At least one PDF is required', (value: any) => value?.length > 0)
        .test('max', 'Maximum 5 files allowed', (value: any) => value?.length <= 5),
  }),
});

// export const uploadPDFModalSchema = yup.object().shape({
//   name: requiredString('Name'),

//   file: yup
//     .mixed<FileList>()
//     .required('PDF file is required')
//     .test('fileRequired', 'PDF file is required', (value) => {
//       return value && value.length > 0;
//     })
//     .test('fileType', 'Only PDF files are allowed', (value) => {
//       if (!value || value.length === 0) return true;
//       return value[0].type === 'application/pdf';
//     })
//     .test('fileSize', 'Max file size is 10MB', (value) => {
//       if (!value || value.length === 0) return true;
//       return value[0].size <= 10 * 1024 * 1024; // 10MB
//     }),
// });

export const widgetColorCustomization = [
  {
    label: 'Header Background',
    name: 'widgetHeaderColor',
  },
  {
    label: 'Bubble Background',
    name: 'widgetBubbleBackground',
  },
  {
    label: 'Bubble Text',
    name: 'widgetBubbleTextColor',
  },
  {
    label: 'Chat Icon',
    name: 'widgetIconColor',
  },
  {
    label: 'Send Button',
    name: 'widgetSendButtonColor',
  },
  {
    label: 'Loader',
    name: 'widgetLoaderColor',
  },
];
