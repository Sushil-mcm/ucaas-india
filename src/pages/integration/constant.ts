import GoogleSheet from '@/assets/images/google-sheet.png';
import GoogleContact from '@/assets/images/google-contacts.png';
import McmLogo from '@/assets/images/LogoIcon.svg';
export { McmLogo };
import Hubspot from '@/assets/images/Hubspot.png';
import Pipedrive from '@/assets/images/Pipedrive.png';
import Zoho from '@/assets/images/zoho.png';
import Salesforce from '@/assets/images/Salesforce.png';
import MondayLogo from '@/assets/images/MondayLogo.png';
import Zendesk from '@/assets/images/Zendesk.jpg';
import Microsoft from '@/assets/images/Microsoft.png';
import MsTeams from '@/assets/images/MsTeams.png';
import { getEnv } from '@/lib/utils';

type MainSiteInfoWithSmallLogo = { small_logo?: unknown } | null | undefined;

export const getMcmLogoIcon = (mainSiteInfo?: MainSiteInfoWithSmallLogo): string => {
  return mainSiteInfo?.small_logo
    ? `${getEnv().VITE_API_BASE_URL}/${mainSiteInfo?.small_logo}`
    : McmLogo;
};

const AiIcon = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;

const EspoCrmIcon = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="%23FF7625"/><text x="50%25" y="54%25" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="white">E</text></svg>`;

const OdooIcon = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="%238F8F8F"/><rect width="40" height="40" rx="8" fill="%23714B67"/><text x="50%25" y="54%25" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="white">O</text></svg>`;

export const getBelongsToIcons = (
  mainSiteInfo?: MainSiteInfoWithSmallLogo,
): Record<string, string> => {
  const dynamicMcmLogo = getMcmLogoIcon(mainSiteInfo);

  return {
    HUBSPOT: Hubspot,
    ZOHO: Zoho,
    PIPEDRIVE: Pipedrive,
    GOOGLE_CONTACTS: GoogleContact,
    GOOGLE_SHEETS: GoogleSheet,
    GOOGLE: GoogleContact,
    SALESFORCE: Salesforce,
    ZENDESK: Zendesk,
    MICROSOFT365: Microsoft,
    MSTEAMS: MsTeams,
    MONDAY: MondayLogo,
    AI: AiIcon,
    ESPOCRM: EspoCrmIcon,
    ODOO: OdooIcon,
    DEFAULT: dynamicMcmLogo,
  };
};

export const belongsToIcons: Record<string, string> = getBelongsToIcons();

export const BELONGS_TO_LABELS: Record<string, string> = {
  HUBSPOT: 'HubSpot',
  ZOHO: 'Zoho',
  PIPEDRIVE: 'Pipedrive',
  GOOGLE_CONTACTS: 'Google Contacts',
  GOOGLE_SHEETS: 'Google Sheets',
  SALESFORCE: 'Salesforce',
  ZENDESK: 'Zendesk',
  MICROSOFT365: 'Microsoft 365',
  MSTEAMS: 'MS TEAMS',
  AI: 'AI',
  ESPOCRM: 'EspoCRM',
  ODOO: 'Odoo',
  DEFAULT: 'MCM',
};
export const generalSettings = [
  {
    id: 'createNewContacts',
    icon: 'ContactIcon',
    title: 'Create New Contacts',
    description: 'Add new contacts to the address book in {crmName}',
  },
  {
    id: 'contacts2WaySync',
    icon: 'Refresh',
    title: 'Contacts 2-Way Sync',
    description:
      'Contacts added and uploaded in UCAAS must synchronize in {crmName} and vice versa',
  },
  // {
  //   id: 'notesLogging',
  //   icon: 'NotebookLine',
  //   title: 'Notes Logging',
  //   description: 'Drop only notes in Call Details',
  // },
  // {
  //   id: 'phoneAsContactName',
  //   icon: 'MessageIcon',
  //   title: 'Phone Numbers as Contact Names',
  //   description: 'Create new contacts with phone numbers as their contact names',
  // },
  {
    id: 'syncCallLogs',
    icon: 'OutgoingCallStrokeIcon',
    title: 'Sync Calls',
    description: 'Log outgoing answered and unanswered calls',
  },
  // {
  //   id: 'incomingCalls',
  //   icon: 'IncomingCallStrokeIcon',
  //   title: 'Incoming Calls',
  //   description: 'Log incoming answered and unanswered calls',
  // },
  // {
  //   id: 'voicemail',
  //   icon: 'VoicemailLineIcon',
  //   title: 'Voicemail',
  //   description: 'Log voicemails',
  // },
];

export interface CRMConfigurationProps {
  drawerData: crmListProps | undefined;
  setDrawerState: (state: boolean) => void;
}
export type CRMConfigurationForm = {
  createNewContacts: boolean;
  contacts2WaySync: boolean;
  notesLogging: boolean;
  phoneAsContactName: boolean;
  syncCallLogs: boolean;
  incomingCalls: boolean;
  voicemail: boolean;
};
export const CRMConfigurationInitialValues = {
  createNewContacts: false,
  contacts2WaySync: false,
  notesLogging: false,
  phoneAsContactName: false,
  syncCallLogs: false,
  incomingCalls: false,
  voicemail: false,
};
export interface crmListProps {
  name: string;
  label: string;
  image: string;
  alt: string;
  description: string;
  comingSoon: boolean;
  id: string;
}

export const crmList: crmListProps[] = [
  {
    name: 'HubSpot',
    label: 'hubspot-crm',
    image: Hubspot,
    alt: 'HubSpot',
    description: 'Enable the flow of contact and activity.',
    comingSoon: false,
    id: 'HubSpot',
  },
  {
    name: 'Zoho',
    label: 'zoho-crm',
    image: Zoho,
    alt: 'Zoho',
    description: 'Connect with Zoho CRM to sync contacts and automate communication flows.',
    comingSoon: false,
    id: 'Zoho',
  },
  {
    name: 'Pipedrive',
    label: 'pipedrive-crm',
    image: Pipedrive,
    alt: 'Pipedrive',
    description: 'Get your Pipedrive CRM and other insights.',
    comingSoon: false,
    id: 'Pipedrive',
  },

  {
    name: 'SalesForce',
    label: 'salesforce-crm',
    image: Salesforce,
    alt: 'SalesForce',
    description: 'Enhance CRM functionality and improve overall business telephony operations.',
    comingSoon: false,
    id: 'SalesForce',
  },
  {
    name: 'Zendesk',
    label: 'zendesk-crm',
    image: Zendesk,
    alt: 'Zendesk',
    description:
      'Integrate Zendesk to manage customer support tickets and communication seamlessly.',
    comingSoon: true,
    id: 'Zendesk',
  },
  {
    name: 'Microsoft 365',
    label: 'microsoft365-crm',
    image: Microsoft,
    alt: 'Microsoft 365',
    description:
      'Connect with Microsoft 365 to sync contacts and streamline your productivity workflows.',
    comingSoon: true,
    id: 'Microsoft',
  },
  {
    name: 'MS Teams',
    label: 'MS_TEAMS',
    image: MsTeams,
    alt: 'MS Teams',
    description:
      'Enhance collaboration by integrating MS Teams for unified communication and team management.',
    comingSoon: false,
    id: 'MS_TEAMS',
  },
  {
    name: 'Monday',
    label: 'monday-crm',
    image: MondayLogo,
    alt: 'Monday',
    description:
      'Integrate Monday.com to streamline your workflows and manage customer interactions efficiently.',
    comingSoon: false,
    id: 'Monday',
  },
  {
    name: 'EspoCRM',
    label: 'espocrm-crm',
    image: EspoCrmIcon,
    alt: 'EspoCRM',
    description:
      'Connect your self-hosted, open-source EspoCRM to sync contacts and log calls — free, no per-user fees.',
    comingSoon: false,
    id: 'EspoCRM',
  },
  {
    name: 'Odoo',
    label: 'odoo-crm',
    image: OdooIcon,
    alt: 'Odoo',
    description:
      'Connect your self-hosted, open-source Odoo CRM to sync contacts and log calls — free Community edition, no per-user fees.',
    comingSoon: false,
    id: 'Odoo',
  },
];
