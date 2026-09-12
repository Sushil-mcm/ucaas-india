/* The four starting points a new call script can begin from.
 *
 * A blank one, and three written for how this platform actually takes calls:
 * a queue greeting, a preview-campaign opener and a callback. Each is written
 * with the placeholders from src/lib/script-variables.ts already in place, so
 * the first script a customer makes greets people by name on day one and
 * shows what the placeholders are for. They are content, not database rows:
 * templates a customer saves themselves come from the list endpoint with
 * isTemplate set, and the chooser shows both. */
import { asToken } from '@/lib/script-variables';

export interface StartingTemplate {
  key: string;
  name: string;
  description: string;
  dialMethod: 'PREVIEW' | 'PROGRESSIVE' | 'PREDICTIVE' | 'QUEUE';
  /* The rich-text nodes the editor stores: page one. */
  script: any[];
  /* The whole script as pages, when it has more than one. Page one's body
     is `script` above, so the two never disagree. */
  pages?: any[];
}

const p = (...runs: Array<string | { text: string; bold?: boolean }>) => ({
  type: 'paragraph',
  children: runs.map((run) => (typeof run === 'string' ? { text: run } : run)),
});
const bullets = (...items: string[]) => ({
  type: 'bulleted-list',
  children: items.map((text) => ({ type: 'list-item', children: [{ text }] })),
});

/* Page one of the preview opener, shared by `script` and `pages`. */
const PREVIEW_OPENING = [
  p({ text: 'Opening', bold: true }),
  p(
    `Hello, may I speak with ${asToken('Customer.FirstName')}? `,
    `This is ${asToken('Agent.Name')} calling from ${asToken('Company.Name')} about ${asToken('Campaign.Name')}.`,
  ),
  p({ text: 'Check it is a good time', bold: true }),
  p('Is now a good time for two minutes? If not, when would suit you better?'),
];

export const STARTING_TEMPLATES: StartingTemplate[] = [
  {
    key: 'blank',
    name: 'Blank',
    description: 'An empty page. Write it your way.',
    dialMethod: 'PREVIEW',
    script: [p('')],
  },
  {
    key: 'inbound-queue',
    name: 'Inbound queue greeting',
    description: 'For a call that came in through a queue. Names the queue and the agent.',
    dialMethod: 'QUEUE',
    script: [
      p({ text: 'Greeting', bold: true }),
      p(
        `Thank you for calling ${asToken('Company.Name')}, ${asToken('Queue.Name')}. `,
        `My name is ${asToken('Agent.FirstName')}. How can I help you today?`,
      ),
      p({ text: 'Confirm who you are speaking to', bold: true }),
      p(`Before we go on, could I take your name and the best number to reach you on? I have ${asToken('Customer.Number')} on this call.`),
      p({ text: 'Close', bold: true }),
      p(`Is there anything else I can help with? Thank you for calling ${asToken('Company.Name')}.`),
    ],
  },
  {
    key: 'preview-campaign',
    name: 'Preview campaign opener',
    description:
      'For an outbound call where the agent sees the lead first. Three pages: the opening asks whether it is a good time and branches.',
    dialMethod: 'PREVIEW',
    script: PREVIEW_OPENING,
    pages: [
      {
        id: 'opening',
        title: 'Opening',
        body: PREVIEW_OPENING,
        choices: ['Good time', 'Not now'],
        rules: [
          { on: 'choice', value: 'Good time', page: 'reason' },
          { on: 'choice', value: 'Not now', page: 'later' },
        ],
      },
      {
        id: 'reason',
        title: 'The reason for the call',
        body: [
          p('State the reason in one sentence, then stop and let them answer.'),
          p({ text: 'Close', bold: true }),
          bullets(
            `Confirm the next step and who will do it.`,
            `Confirm the number we should use: ${asToken('Customer.Number')}.`,
            `Thank them by name: "Thank you, ${asToken('Customer.FirstName')}."`,
          ),
        ],
        choices: [],
        rules: [],
      },
      {
        id: 'later',
        title: 'Another time',
        body: [
          p(`No problem. When would suit you better? I will call ${asToken('Customer.Number')} then.`),
          p(`Thank you, ${asToken('Customer.FirstName')}. Speak soon.`),
        ],
        choices: [],
        rules: [],
      },
    ],
  },
  {
    key: 'callback',
    name: 'Callback',
    description: 'For returning a call someone asked for. Says who is calling and why.',
    dialMethod: 'PREVIEW',
    script: [
      p({ text: 'Opening', bold: true }),
      p(
        `Hello, this is ${asToken('Agent.Name')} calling from ${asToken('Company.Name')}. `,
        `I am returning a call from ${asToken('Customer.Name')}, who asked us to call back on this number. Are they available?`,
      ),
      p({ text: 'If it is them', bold: true }),
      p('Thank them for their patience, then ask how you can help.'),
      p({ text: 'If it is not them', bold: true }),
      p(`Ask for a good time to try again, and confirm the number: ${asToken('Customer.Number')}.`),
    ],
  },
];
