import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom';
import { JitsiContextProvider } from '@/context/jitsi-context';
import { lazy } from 'react';
import ProtectedRoute from './protected-route';
import { SocketEventsProvider } from '@/context/socket-events-context';
import { QUEUE_TYPE } from '@/pages/monitoring/constants';
import VideoSection from '@/pages/meetings/video-section';

const PLAN_ROUTE_RELOAD_KEY = 'billing_plan_dynamic_import_reload_at';
const DYNAMIC_IMPORT_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'Loading chunk',
  'ChunkLoadError',
];

const loadBillingPlan = async () => {
  try {
    const module = await import('@/pages/admin-settings/billing/plan');
    sessionStorage.removeItem(PLAN_ROUTE_RELOAD_KEY);
    return module;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isDynamicImportError = DYNAMIC_IMPORT_ERROR_PATTERNS.some((pattern) =>
      message.toLowerCase().includes(pattern.toLowerCase()),
    );
    const now = Date.now();
    const lastReloadAt = Number(sessionStorage.getItem(PLAN_ROUTE_RELOAD_KEY) || 0);

    if (isDynamicImportError && now - lastReloadAt >= 10000) {
      sessionStorage.setItem(PLAN_ROUTE_RELOAD_KEY, String(now));
      window.location.reload();

      // Keep the lazy component pending while the browser reloads.
      return new Promise<never>(() => {});
    }

    throw error;
  }
};

const AdminSettings = lazy(() => import('@/pages/admin-settings'));
const CompanyInfo = lazy(() => import('@/pages/admin-settings/company-info'));
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Performance = lazy(() => import('@/pages/performance'));
const Login = lazy(() => import('@/pages/login'));
const Messenger = lazy(() => import('@/pages/messenger'));
// `/phone` renders the MCM Unified Console (three-zone phone console).
// The legacy page module stays in place — components/custom/contact-call-log-content
// and the activity lists still import LogContent / initialDrawerState from it,
// and the console itself renders that same call-log content in its History tab.
const Phone = lazy(() => import('@/pages/phone/console'));
// `/video-console` renders the MCM Unified Video console — the replacement for
// the current `/video` meetings hub, parked on its own path while it is
// reviewed. Flipping `/video` over to it is a one-line change here.
const VideoConsole = lazy(() => import('@/pages/video/console'));
const NewContact = lazy(() => import('@/pages/new-contact'));
const Directory = lazy(() => import('@/pages/directory'));
const ErrorPage = lazy(() => import('@/pages/error'));
const UserDepartment = lazy(() => import('@/pages/admin-settings/users/department'));
const AllNumbers = lazy(() => import('@/pages/admin-settings/numbers/all-numbers'));
const IvrMenus = lazy(() => import('@/pages/admin-settings/phone-systems/ivr-menus'));
const Inbox = lazy(() => import('@/pages/inbox'));
const VideoMeetings = lazy(() => import('@/pages/video-meetings'));
const UpcomingMeetings = lazy(() => import('@/pages/video-meetings/upcoming-meetings'));
const PastMeetings = lazy(() => import('@/pages/video-meetings/past-meetings'));
const AllRecording = lazy(() => import('@/pages/video-meetings/recordings/all-recording'));
const MyRecording = lazy(() => import('@/pages/video-meetings/recordings/my-recording'));
const CallQueues = lazy(() => import('@/pages/admin-settings/phone-systems/call-queue'));
const Preferences = lazy(() => import('@/pages/admin-settings/phone-systems/preferences'));
const GreetingDetailsPage = lazy(() => import('@/pages/greetings'));
const GreetingContent = lazy(() => import('@/pages/greetings/greetings-content'));
const Plan = lazy(loadBillingPlan);
const Purchase = lazy(() => import('@/pages/admin-settings/billing/purchase'));
const Invoice = lazy(() => import('@/pages/admin-settings/billing/invoice'));
const Settings = lazy(() => import('@/pages/settings'));
const BasicInfoSettings = lazy(() => import('@/pages/settings/basic-info'));
const General = lazy(() =>
  import('@/pages/settings/general').then((module) => ({ default: module.General })),
);
const SettingsVideo = lazy(() => import('@/pages/settings/video'));
const IncomingCalls = lazy(() => import('@/pages/settings/phone'));
const SettingsNotification = lazy(() => import('@/pages/settings/notification'));
const Greetings = lazy(() => import('@/pages/settings/greetings'));
const Monitoring = lazy(() => import('@/pages/monitoring'));
const CallQueueMonitoring = lazy(() => import('@/pages/monitoring/call-queue'));
const DepartmentMonitoring = lazy(() => import('@/pages/monitoring/department'));
const AllUserMonitoring = lazy(() => import('@/pages/monitoring/all-users'));

const SMSLogs = lazy(() => import('@/pages/reports/sms-logs'));
const Reports = lazy(() => import('@/pages/reports'));
const Departments = lazy(() => import('@/pages/departments'));
const DepartmentDetails = lazy(
  () => import('@/pages/departments/department-list/department-details'),
);
const UserDetails = lazy(() => import('@/pages/departments/users-list/user-details'));
const InUseNumbers = lazy(() => import('@/pages/admin-settings/numbers/numbers-in-use'));
const NumbersInventory = lazy(() => import('@/pages/admin-settings/numbers/numbers-inventory'));
const UserSettings = lazy(() => import('@/pages/admin-settings/templates/user-settings'));
const OutboundRates = lazy(() => import('@/pages/admin-settings/calling-rates/outbound-rates'));
const CallHandling = lazy(() => import('@/pages/admin-settings/templates/call-handling'));
const Pricing = lazy(() => import('@/pages/pricing'));
const SignUp = lazy(() => import('@/pages/signup'));
const SignUpPayment = lazy(() => import('@/pages/signup/payment'));
const PaymentSuccess = lazy(() => import('@/pages/signup/payment-success'));
const PhoneLines = lazy(() => import('@/pages/signup/phone-lines'));
const AllCallMonitoring = lazy(() => import('@/pages/monitoring/all-calls'));
const RecordingDetails = lazy(() => import('@/pages/video-meetings/recordings/recording-details'));
const ForgotPassword = lazy(() => import('@/pages/login/forget-password'));
const ResetPassword = lazy(() => import('@/pages/login/reset-password'));
const SocialMediaChannels = lazy(() => import('@/pages/admin-settings/social-media-channels'));
const Integration = lazy(() => import('@/pages/integration'));
const CRMIntegration = lazy(() => import('@/pages/integration/crm'));
const CalendarPage = lazy(() => import('@/pages/video-meetings/Calender'));
const SharedWithMe = lazy(() => import('@/pages/video-meetings/recordings/shared-wth-me'));
const Zapier = lazy(() => import('@/pages/integration/data-reporting/zapier'));
const GeneralSettings = lazy(() => import('@/pages/integration/data-reporting/general-settings'));
const UserActivity = lazy(() => import('@/pages/activity/user-activity'));
const ManageWebhook = lazy(() => import('@/pages/integration/data-reporting/manage-webhook'));
const AutoDialer = lazy(() => import('@/pages/auto-dialer'));
const PowerDialer = lazy(() => import('@/pages/auto-dialer/power-predictive'));
const CallScripts = lazy(() => import('@/pages/auto-dialer/call-scripts'));
const DispositionsList = lazy(() => import('@/pages/auto-dialer/dispositions'));
const Leads = lazy(() => import('@/pages/leads'));
const CampaignRecord = lazy(() => import('@/pages/auto-dialer/campaign/campagin-summary'));
const CampaignCallLogs = lazy(() => import('@/pages/auto-dialer/campaign/campaign-call-logs'));
const Campaign = lazy(() => import('@/pages/auto-dialer/campaign'));
const AgentRunningCampign = lazy(
  () => import('@/pages/auto-dialer/campaign/agent-running-campaign'),
);
const ConfigureAiAgent = lazy(
  () => import('@/pages/admin-settings/knowledge-base/ai-agent/configure-ai-agent'),
);
const BrowseTemplates = lazy(
  () => import('@/pages/admin-settings/knowledge-base/ai-agent/browse-templates-tabs'),
);
const AiAgent = lazy(
  () => import('@/pages/admin-settings/knowledge-base/ai-agent/ai-chatbot-agents'),
);
const CreateAgent = lazy(
  () => import('@/pages/admin-settings/knowledge-base/ai-agent/create-chatbot-agent'),
);
const CampaignLogs = lazy(() => import('@/pages/auto-dialer/campaign-logs'));
const DispositionLogs = lazy(() => import('@/pages/auto-dialer/disposition-logs'));
const Security = lazy(() => import('@/pages/settings/security'));
const RenewPlan = lazy(() => import('@/pages/login/renew-plan'));
const VerifyAccessToken = lazy(() => import('@/pages/verify-access-token'));
const NoOrganization = lazy(() => import('@/pages/no-organization'));
const InvitedMeetings = lazy(() => import('@/pages/video-meetings/invited-meetings'));
const MyCampaignListStandalone = lazy(
  () => import('@/components/running-campaign-outer/my-campaigns-list-standalone'),
);
const LeadContactLogs = lazy(() => import('@/pages/leads/lead-contact-logs'));
const OngoingMeetings = lazy(() => import('@/pages/video-meetings/ongoing-meetings'));
const KnowledgeBaseList = lazy(
  () => import('@/pages/admin-settings/knowledge-base/all-knowledge-base/know-base-list'),
);
const AllKnowledgeBase = lazy(
  () => import('@/pages/admin-settings/knowledge-base/all-knowledge-base'),
);
const AISettings = lazy(() => import('@/pages/admin-settings/knowledge-base/AI-settings'));
const Playground = lazy(() => import('@/pages/admin-settings/knowledge-base/playground'));
const AIDomain = lazy(() => import('@/pages/admin-settings/knowledge-base/domain'));
const AiReceptionist = lazy(
  () => import('@/pages/admin-settings/knowledge-base/ai-receptionist/new-ai-receptionist'),
);
const DLCCompaigns = lazy(() => import('@/pages/admin-settings/compilance/10DLC-compaigns'));
const IdentitiesAndAddressesPageLayout = lazy(
  () => import('@/pages/admin-settings/numbers/identities-and-address-page-layout'),
);
const Reseller = lazy(() => import('@/pages/admin-settings/compilance/reseller'));
const DLCBrands = lazy(() => import('@/pages/admin-settings/compilance/10DLC-brands'));
const DNC = lazy(() => import('@/pages/auto-dialer/dnc'));
const AdminHome = lazy(() => import('@/pages/admin-settings/admin-home'));
const CallCoverage = lazy(() => import('@/pages/admin-settings/call-coverage'));
const StatementOfAccount = lazy(() => import('@/pages/admin-settings/billing/statement'));
const BillingResources = lazy(() => import('@/pages/admin-settings/billing/resources'));
const BillingModules = lazy(() => import('@/pages/admin-settings/billing/modules'));
/* Admin ▸ Users reuses the Directory screens rather than keeping a second,
   older implementation of the same lists. Same components, same actions. */
const DirectoryPeople = lazy(() => import('@/pages/directory/people'));
const DirectoryGroups = lazy(() => import('@/pages/directory/groups'));
const DirectoryRoles = lazy(() => import('@/pages/directory/roles'));
const AiBotSession = lazy(() => import('@/pages/admin-settings/knowledge-base/ai-bot-session'));
const CallHistory = lazy(() => import('@/pages/reports/call-logs/call-history'));
const LocalCallList = lazy(() => import('@/pages/reports/call-logs/local-call-list'));
const CallRecording = lazy(() => import('@/pages/reports/call-logs/call-recording'));
const Voicemail = lazy(() => import('@/pages/reports/call-logs/voicemail'));
const CallVolume = lazy(() => import('@/pages/reports/call-logs/call-volumn'));
const QueueCallLogs = lazy(() => import('@/pages/reports/call-logs/queue'));
const Inbound = lazy(() => import('@/pages/reports/call-logs/inbound'));
const Outbound = lazy(() => import('@/pages/reports/call-logs/outbound'));
const ActivityCallLogs = lazy(() => import('@/pages/reports/call-logs/activity'));
const AgentReports = lazy(() => import('@/pages/reports/call-logs/agentReports'));
const CallAnalytics = lazy(() => import('@/pages/reports/analytics'));
const ContactActivity = lazy(() => import('@/pages/new-contact/contact-activity'));
const AgentChatMessenger = lazy(() => import('@/pages/agent-chat'));
const OmniChannelConnect = lazy(() => import('@/pages/omni-channel-connect'));

const AuthProvider = lazy(() => import('@/auth/auth-provider'));
const AuthRemover = lazy(() => import('@/auth/auth-remover'));
const AuthLayout = lazy(() => import('@/layout/auth-layout'));
const PlanPendingGuard = lazy(() => import('@/auth/plan-pending-guard'));

export const router = createBrowserRouter([
  {
    path: '/no-organization',
    element: <NoOrganization />,
    id: 'no-organization',
  },
  {
    path: '/403',
    element: <ErrorPage text="Access Denied! You do not have permission to access this page. 😔" />,
    id: 'forbidden',
  },
  {
    path: '/',
    element: (
      <AuthRemover>
        <Outlet />
      </AuthRemover>
    ),
    errorElement: <ErrorPage text="Error Occurred 😔" />,
    children: [
      {
        index: true,
        element: <Login />,
        id: 'login',
      },
      {
        path: 'verify-access-token',
        element: <VerifyAccessToken />,
        id: 'verify-access-token',
      },
      {
        path: 'pricing',
        element: <Pricing />,
        id: 'pricing',
      },
      {
        path: 'sign-up',
        element: <SignUp />,
        id: 'sign-up',
      },
      {
        path: 'payment',
        element: <SignUpPayment />,
        id: 'payment',
      },
      {
        path: 'payment-success',
        element: <PaymentSuccess />,
        id: 'payment-success',
      },
      {
        path: 'phone-lines',
        element: <PhoneLines />,
        id: 'phone-lines',
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: 'reset-password',
        element: <ResetPassword />,
      },
      {
        path: 'renew-plan',
        element: <RenewPlan />,
      },
    ],
  },
  {
    path: '/phone-lines-auth',
    element: (
      <AuthProvider>
        <PhoneLines />
      </AuthProvider>
    ),
    id: 'phone-lines-authenticated',
  },
  {
    path: '/',
    element: (
      <PlanPendingGuard>
        <AuthProvider>
          <SocketEventsProvider>
            <JitsiContextProvider>
              <AuthLayout />
            </JitsiContextProvider>
          </SocketEventsProvider>
        </AuthProvider>
      </PlanPendingGuard>
    ),
    errorElement: <ErrorPage text="Error Occurred 😔" />,
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
        id: 'Dashboard',
      },
      {
        path: 'performance',
        element: <Performance />,
        id: 'Performance',
      },
      {
        path: 'phone',
        element: <Phone />,
        id: 'Phone',
      },
      {
        path: 'video-console',
        element: (
          <ProtectedRoute
            element={<VideoConsole />}
            guard={{
              feature: 'video.IS_SHOW',
              permission: 'video.action.view',
            }}
          />
        ),
        id: 'VideoConsole',
      },
      {
        path: 'messenger',
        element: (
          <ProtectedRoute
            element={<Messenger />}
            guard={{
              feature: 'chat.IS_SHOW',
              permission: 'chat.action.view',
            }}
          />
        ),
        id: 'messenger',
      },
      {
        path: 'agent-chat',
        element: (
          <ProtectedRoute
            element={<AgentChatMessenger />}
            guard={{
              feature: 'ai.IS_SHOW',
              permission: 'ai.action.agent.view',
            }}
          />
        ),
        id: 'agent-chat',
      },
      {
        path: 'video',
        element: (
          <ProtectedRoute
            element={<VideoMeetings />}
            guard={{
              feature: 'video.IS_SHOW',
              permission: 'video.action.view',
            }}
          />
        ),
        id: 'meetings',
        children: [
          {
            index: true,
            element: <UpcomingMeetings />,
          },
          {
            path: 'ongoing-meetings',
            element: <OngoingMeetings />,
          },
          {
            path: 'invited-meetings',
            element: <InvitedMeetings />,
          },
          {
            path: 'past-meetings',
            element: <PastMeetings />,
          },
          {
            path: 'recordings',
            children: [
              {
                path: 'all',
                element: (
                  <ProtectedRoute
                    element={<AllRecording />}
                    guard={{
                      feature: 'video.access.RECORDING',
                      permission: 'video.access.RECORDING',
                    }}
                  />
                ),
              },
              {
                path: 'my',
                element: (
                  <ProtectedRoute
                    element={<MyRecording />}
                    guard={{
                      feature: 'video.access.RECORDING',
                      permission: 'video.access.RECORDING',
                    }}
                  />
                ),
              },
              {
                path: 'shared-with-me',
                element: (
                  <ProtectedRoute
                    element={<SharedWithMe />}
                    guard={{
                      feature: 'video.access.RECORDING',
                      permission: 'video.access.RECORDING',
                    }}
                  />
                ),
              },
            ],
          },
        ],
      },
      {
        // Directory is the console's grouping of People, Groups, Locations,
        // External and Favourites. The individual platform routes below stay
        // reachable so existing links keep working.
        path: 'directory',
        element: <Directory />,
        id: 'directory',
      },
      {
        path: 'contact',
        element: (
          <ProtectedRoute
            element={<NewContact />}
            guard={{
              feature: 'contact.IS_SHOW',
              permission: 'contact.action.view',
            }}
          />
        ),
        id: 'contact',
      },
      {
        path: 'contact-activity',
        element: (
          <ProtectedRoute
            element={<ContactActivity />}
            guard={{
              feature: 'contact.IS_SHOW',
              permission: 'contact.action.view',
            }}
          />
        ),
        id: 'contact-activity',
      },
      {
        path: 'department',
        element: <Departments />,
        children: [
          {
            path: 'extension',
            element: (
              <ProtectedRoute
                element={<UserDetails />}
                guard={{
                  permission: 'account_setting.access.USER.action.view',
                }}
              />
            ),
            children: [
              {
                index: true,
                path: ':id',
                element: <UserDetails />,
              },
            ],
          },
          {
            path: 'organization',
            children: [
              {
                path: ':id',
                element: (
                  <ProtectedRoute
                    element={<DepartmentDetails />}
                    guard={{
                      feature: 'phone_system_action.access.DEPARTMENT',
                      permission: 'phone_system_action.action.view',
                    }}
                  />
                ),
              },
            ],
          },
        ],
      },
      {
        path: 'admin-settings',
        element: <AdminSettings />,
        id: 'admin-settings',
        children: [
          {
            index: true,
            /* Admin opens on its own landing page now, rather than bouncing to
               whichever screen the person happened to have access to. */
            element: <AdminHome />,
            id: 'company-info-1',
          },
          {
            path: 'company-info',
            id: 'company-info',
            element: (
              <ProtectedRoute
                element={<CompanyInfo />}
                guard={{
                  permission: 'account_setting.access.SITE.action.view',
                }}
              />
            ),
          },
          {
            /* Company-wide phone rules, reachable under Company where an admin
               looks for them. Same component as /admin-settings/phone/preferences,
               which is kept so existing links and bookmarks still resolve. */
            path: 'company-info/rules',
            element: (
              <ProtectedRoute
                element={<Preferences />}
                guard={{
                  permission: 'account_setting.access.SITE.action.view',
                }}
              />
            ),
          },
          {
            /* Integrations are set up once for the whole account, so they belong
               with the other administered settings rather than as a top-level
               destination of their own. */
            path: 'integration',
            id: 'admin-integration',
            /* Guarded at the parent, the way the top-level `/integration` twin
               below already is. Without an element of its own this subtree fell
               through to a bare Outlet, so every integration screen under Admin
               was reachable on a plan the sidebar hides the section for. */
            element: (
              <ProtectedRoute
                element={<Outlet />}
                guard={{
                  feature: 'integration.IS_SHOW',
                  permission: 'integration.action.view',
                }}
              />
            ),
            children: [
              { index: true, element: <CRMIntegration /> },
              { path: 'crm', element: <CRMIntegration /> },
              {
                path: 'data-reporting',
                element: <Outlet />,
                children: [
                  { index: true, element: <GeneralSettings /> },
                  { path: 'zapier', element: <Zapier /> },
                  { path: 'manage-webhook', element: <ManageWebhook /> },
                  { path: 'general-settings', element: <GeneralSettings /> },
                ],
              },
            ],
          },
          {
            /* The signed-in person's own settings. They used to be a separate
               top-level area with its own sidebar, reachable only from the
               avatar menu — which put personal settings and company settings in
               two different places. Nested here, they render inside the Admin
               shell alongside everything else you administer. */
            path: 'account',
            id: 'account',
            children: [
              { path: 'basic-info', element: <BasicInfoSettings /> },
              { path: 'general', element: <General /> },
              { path: 'phone', element: <ProtectedRoute element={<IncomingCalls />} /> },
              { path: 'notification', element: <SettingsNotification /> },
              {
                path: 'greetings',
                element: (
                  <ProtectedRoute
                    element={<Greetings />}
                    guard={{ permission: 'settings.action.greeting.view' }}
                  />
                ),
              },
              {
                path: 'media',
                element: <Outlet />,
                children: [
                  { index: true, element: <GreetingContent /> },
                  { path: 'type-greeting', element: <GreetingContent /> },
                  { path: 'type-prompt', element: <GreetingContent /> },
                  { path: 'type-voicemail', element: <GreetingContent /> },
                ],
              },
              { path: 'security', element: <Security /> },
            ],
          },
          {
            path: 'users',
            id: 'users',
            children: [
              {
                path: 'extension',
                element: (
                  <ProtectedRoute
                    element={<DirectoryPeople />}
                    guard={{
                      permission: 'account_setting.access.USER.action.view',
                    }}
                  />
                ),
                id: 'extension',
              },
              {
                path: 'role',
                element: <ProtectedRoute element={<DirectoryRoles />} />,
                id: 'role',
              },
              {
                path: 'department',
                element: (
                  <ProtectedRoute
                    element={<DirectoryGroups />}
                    guard={{
                      feature: 'phone_system_action.access.DEPARTMENT',
                      permission: 'phone_system_action.action.view',
                    }}
                  />
                ),
                id: 'department',
              },
            ],
          },
          {
            path: 'numbers',
            id: 'numbers',
            children: [
              {
                path: 'coverage',
                id: 'numbers-coverage',
                element: <CallCoverage />,
              },
              {
                path: 'all',
                id: 'all',
                element: (
                  <ProtectedRoute
                    element={<AllNumbers />}
                    guard={{
                      permission: 'virtual_numbers.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'in-use',
                id: 'in-use',
                element: (
                  <ProtectedRoute
                    element={<InUseNumbers />}
                    guard={{
                      permission: 'virtual_numbers.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'identities',
                id: 'identities',
                element: (
                  <ProtectedRoute
                    element={<IdentitiesAndAddressesPageLayout />}
                    guard={{
                      permission: 'virtual_numbers.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'addresses',
                id: 'addresses',
                element: (
                  <ProtectedRoute
                    element={<IdentitiesAndAddressesPageLayout />}
                    guard={{
                      permission: 'virtual_numbers.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'verifications',
                id: 'verifications',
                element: (
                  <ProtectedRoute
                    element={<IdentitiesAndAddressesPageLayout />}
                    guard={{
                      permission: 'virtual_numbers.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'inventory',
                id: 'inventory',
                element: (
                  <ProtectedRoute
                    element={<NumbersInventory />}
                    guard={{
                      permission: 'virtual_numbers.action.view',
                    }}
                  />
                ),
              },
            ],
          },
          {
            path: 'phone',
            id: 'phone',
            children: [
              {
                path: 'preferences',
                element: (
                  <ProtectedRoute
                    element={<Preferences />}
                    guard={{
                      feature: 'phone_system_action.IS_SHOW',
                      permission: 'phone_system_action.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'ivr-menus',
                id: 'ivr-menus',
                element: (
                  <ProtectedRoute
                    element={<IvrMenus />}
                    guard={{
                      feature: 'phone_system_action.access.IVR',
                      permission: 'phone_system_action.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'call-queue',
                element: (
                  <ProtectedRoute
                    element={<CallQueues />}
                    guard={{
                      feature: 'phone_system_action.access.QUEUE',
                      permission: 'phone_system_action.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'shared-line',
                element: (
                  <ProtectedRoute
                    element={<UserDepartment />}
                    guard={{
                      feature: 'phone_system_action.access.DEPARTMENT',
                      permission: 'phone_system_action.action.view',
                    }}
                  />
                ),
              },
            ],
          },

          {
            path: 'knowledge',
            id: 'knowledge',
            children: [
              {
                path: 'all-knowledge',
                id: 'all-knowledge',
                element: (
                  <ProtectedRoute
                    element={<KnowledgeBaseList />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.action.knowledge_base.view',
                    }}
                  />
                ),
              },
              {
                path: 'all-knowledge-base',
                id: 'all-knowledge-base',
                element: (
                  <ProtectedRoute
                    element={<AllKnowledgeBase />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.action.knowledge_base.view',
                    }}
                  />
                ),
              },
              {
                path: 'ai-agent',
                element: (
                  <ProtectedRoute
                    element={<AiAgent />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.action.agent.view',
                    }}
                  />
                ),
              },
              {
                path: 'ai-settings',
                element: (
                  <ProtectedRoute
                    element={<AISettings />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.IS_SHOW',
                    }}
                  />
                ),
              },
              {
                path: 'playground',
                element: (
                  <ProtectedRoute
                    element={<Playground />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.IS_SHOW',
                    }}
                  />
                ),
              },
              {
                path: 'ai-bot-session',
                element: (
                  <ProtectedRoute
                    element={<AiBotSession />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.IS_SHOW',
                    }}
                  />
                ),
              },
              {
                path: 'ai-receptionist',
                element: (
                  <ProtectedRoute
                    element={<AiReceptionist />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.IS_SHOW',
                    }}
                  />
                ),
              },
              {
                path: 'domain',
                element: (
                  <ProtectedRoute
                    element={<AIDomain />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.action.domain.view',
                    }}
                  />
                ),
              },
              {
                path: 'create-agent',
                element: (
                  <ProtectedRoute
                    element={<CreateAgent />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.action.agent.view',
                    }}
                  />
                ),
              },

              {
                path: 'browse-templates',
                element: (
                  <ProtectedRoute
                    element={<BrowseTemplates />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.action.agent.view',
                    }}
                  />
                ),
              },
              {
                path: 'configure-ai-agent',
                element: (
                  <ProtectedRoute
                    element={<ConfigureAiAgent />}
                    guard={{
                      feature: 'ai.IS_SHOW',
                      permission: 'ai.action.agent.view',
                    }}
                  />
                ),
              },
            ],
          },
          {
            path: 'social-media-channels',
            element: (
              <ProtectedRoute
                element={<SocialMediaChannels />}
                guard={{
                  feature: 'omni_channel.IS_SHOW',
                  permission: 'omni_channel.action.view',
                }}
              />
            ),
          },
          {
            path: 'billing',
            id: 'billing',
            children: [
              {
                path: 'plan',
                id: 'plan',
                element: (
                  <ProtectedRoute
                    element={<Plan />}
                    guard={{
                      feature: 'billing.IS_SHOW',
                      permission: 'billing.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'purchase',
                id: 'purchase',
                element: (
                  <ProtectedRoute
                    element={<Purchase />}
                    trialRestricted
                    guard={{
                      feature: 'billing.IS_SHOW',
                      permission: 'billing.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'statement',
                element: <StatementOfAccount />,
                id: 'billing-statement',
              },
              {
                path: 'resources',
                element: <BillingResources />,
                id: 'billing-resources',
              },
              {
                path: 'modules',
                element: <BillingModules />,
                id: 'billing-modules',
              },
              {
                path: 'invoices',
                id: 'invoices',
                element: (
                  <ProtectedRoute
                    element={<Invoice />}
                    guard={{
                      feature: 'billing.IS_SHOW',
                      permission: 'billing.action.view',
                    }}
                  />
                ),
              },
            ],
          },
          {
            path: 'compliance',
            id: 'compliance',
            children: [
              {
                path: 'brands',
                id: 'brands',
                element: <ProtectedRoute element={<DLCBrands />} trialRestricted />,
              },
              {
                path: 'brands/campaigns',
                id: 'brands/campaigns',
                element: <ProtectedRoute element={<DLCCompaigns />} trialRestricted />,
              },
              {
                path: 'brands/reseller',
                id: 'brands/reseller',
                element: <ProtectedRoute element={<Reseller />} trialRestricted />,
              },
            ],
          },
          {
            path: 'templates',
            children: [
              {
                index: true,
                path: 'user-settings',
                element: <ProtectedRoute element={<UserSettings />} />,
              },
              {
                path: 'call-handling',
                element: (
                  <ProtectedRoute
                    element={<CallHandling />}
                    guard={{
                      feature: 'phone_system_action.access.DEPARTMENT',
                      permission: 'phone_system_action.action.view',
                    }}
                  />
                ),
              },
            ],
          },
          {
            path: 'calling-rates',
            id: 'calling-rates',
            children: [
              {
                index: true,
                path: 'outbound-rates',
                id: 'outbound-rates',
                element: (
                  <ProtectedRoute
                    element={<OutboundRates />}
                    guard={{
                      feature: 'calling_rates.IS_SHOW',
                      permission: 'calling_rates.action.view',
                    }}
                  />
                ),
              },
            ],
          },
        ],
      },
      {
        path: 'campaign',
        element: <AutoDialer />,
        children: [
          {
            path: 'all-campaigns',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: (
                  <ProtectedRoute
                    element={<Campaign />}
                    guard={{
                      feature: 'campaign.IS_SHOW',
                      permission: 'campaign.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'compaign-record',
                element: (
                  <ProtectedRoute
                    element={<CampaignRecord />}
                    guard={{
                      feature: 'campaign.IS_SHOW',
                      permission: 'campaign.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'compaign-call-logs',
                element: (
                  <ProtectedRoute
                    element={<CampaignCallLogs />}
                    guard={{
                      feature: 'campaign.IS_SHOW',
                      permission: 'campaign.action.view',
                    }}
                  />
                ),
              },
            ],
          },
          {
            path: 'call-scripts',
            id: 'call-scripts',
            element: (
              <ProtectedRoute
                element={<CallScripts />}
                guard={{
                  feature: 'campaign.IS_SHOW',
                  permission: 'campaign.action.view',
                }}
              />
            ),
          },
          {
            path: 'leads',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: (
                  <ProtectedRoute
                    element={<Leads />}
                    guard={{
                      feature: 'campaign.IS_SHOW',
                      permission: 'campaign.action.view',
                    }}
                  />
                ),
              },
              {
                path: 'contact-logs',
                element: (
                  <ProtectedRoute
                    element={<LeadContactLogs />}
                    guard={{
                      feature: 'campaign.IS_SHOW',
                      permission: 'campaign.action.view',
                    }}
                  />
                ),
              },
            ],
          },
          {
            path: 'logs',
            element: (
              <ProtectedRoute
                element={<CampaignLogs />}
                guard={{
                  feature: 'campaign.IS_SHOW',
                  permission: 'campaign.action.view',
                }}
              />
            ),
          },
          {
            path: 'disposition-logs',
            element: (
              <ProtectedRoute
                element={<DispositionLogs />}
                guard={{
                  feature: 'campaign.IS_SHOW',
                  permission: 'campaign.action.view',
                }}
              />
            ),
          },
          {
            path: 'dispositions',
            element: (
              <ProtectedRoute
                element={<DispositionsList />}
                guard={{
                  feature: 'campaign.IS_SHOW',
                  permission: 'campaign.action.view',
                }}
              />
            ),
          },
          {
            /* Every sibling campaign route passes a guard; this one did not, and
               ProtectedRoute returns the element unconditionally when `guard` is
               undefined. So /campaign/<anything> rendered the dialer while
               bypassing both the plan-feature check and the view permission. */
            path: ':type?',
            element: (
              <ProtectedRoute
                element={<PowerDialer />}
                guard={{
                  feature: 'campaign.IS_SHOW',
                  permission: 'campaign.action.view',
                }}
              />
            ),
          },
          {
            path: 'dnc',
            element: (
              <ProtectedRoute
                element={<DNC />}
                guard={{
                  feature: 'campaign.IS_SHOW',
                  permission: 'campaign.action.view',
                }}
              />
            ),
          },
        ],
      },

      {
        path: 'settings',
        element: <Settings />,
        children: [
          {
            path: 'basic-info',
            element: <BasicInfoSettings />,
          },
          {
            path: 'general',
            element: <General />,
          },
          {
            path: 'video',
            element: (
              <ProtectedRoute
                element={<SettingsVideo />}
                guard={{
                  feature: 'video.IS_SHOW',
                  permission: 'video.action.view',
                }}
              />
            ),
          },
          {
            path: 'phone',
            element: <ProtectedRoute element={<IncomingCalls />} />,
          },
          {
            path: 'notification',
            element: <SettingsNotification />,
          },
          {
            path: 'greetings',
            element: (
              <ProtectedRoute
                element={<Greetings />}
                guard={{
                  permission: 'settings.action.greeting.view',
                }}
              />
            ),
          },
          {
            path: 'media',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <GreetingContent />,
              },
              {
                path: 'type-greeting',
                element: <GreetingContent />,
              },
              {
                path: 'type-prompt',
                element: <GreetingContent />,
              },
              {
                path: 'type-voicemail',
                element: <GreetingContent />,
              },
            ],
          },
          {
            path: 'security',
            element: <Security />,
          },
        ],
      },
      {
        path: 'inbox',
        element: <ProtectedRoute element={<Inbox />} />,
        id: 'inbox',
      },
      {
        path: 'greetings',
        element: <GreetingDetailsPage />,
        children: [
          {
            index: true,
            element: <GreetingContent />,
          },
          {
            path: 'type-greeting',
            element: <GreetingContent />,
          },
          {
            path: 'type-prompt',
            element: <GreetingContent />,
          },
          {
            path: 'type-voicemail',
            element: <GreetingContent />,
          },
        ],
      },
      {
        path: 'monitoring',
        element: (
          <ProtectedRoute
            element={<Monitoring />}
            guard={{
              permission: 'monitoring.action.view',
            }}
          />
        ),
        children: [
          {
            path: 'call-queue',
            element: (
              <ProtectedRoute
                element={<CallQueueMonitoring queueType={QUEUE_TYPE.queue} />}
                guard={{
                  feature: 'phone_system_action.access.QUEUE',
                  permission: 'phone_system_action.action.view',
                }}
              />
            ),
          },
          {
            path: 'campaign',
            element: (
              <ProtectedRoute
                element={<CallQueueMonitoring queueType={QUEUE_TYPE.campaign} />}
                guard={{
                  feature: 'campaign.IS_SHOW',
                  permission: 'campaign.action.view',
                }}
              />
            ),
          },
          {
            path: 'department',
            element: (
              <ProtectedRoute
                element={<DepartmentMonitoring />}
                guard={{
                  feature: 'phone_system_action.access.DEPARTMENT',
                  permission: 'phone_system_action.action.view',
                }}
              />
            ),
          },
          {
            path: 'all-extensions',
            element: (
              <ProtectedRoute
                element={<AllUserMonitoring />}
                guard={{
                  permission: 'monitoring.action.view',
                }}
              />
            ),
          },
          {
            path: 'all-calls',
            element: (
              <ProtectedRoute
                element={<AllCallMonitoring />}
                guard={{
                  permission: 'monitoring.action.view',
                }}
              />
            ),
          },
        ],
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute
            element={<Reports />}
            guard={{
              feature: 'reports.IS_SHOW',
              permission: 'reports.IS_SHOW',
            }}
          />
        ),
        children: [
          {
            index: true,
            element: <Navigate to="call-history" replace />,
          },
          {
            path: 'call-history',
            element: <ProtectedRoute element={<CallHistory />} />,
          },
          {
            path: 'local-call-list',
            element: <ProtectedRoute element={<LocalCallList />} />,
          },
          {
            path: 'call-recording',
            element: (
              <ProtectedRoute
                element={<CallRecording />}
                guard={{
                  feature: 'reports.IS_SHOW',
                  permission: 'reports.action.call_recording_listen',
                }}
              />
            ),
          },
          {
            path: 'voicemail',
            element: <ProtectedRoute element={<Voicemail />} />,
          },
          {
            path: 'call-volume',
            element: <ProtectedRoute element={<CallVolume />} />,
          },
          {
            path: 'queue',
            element: <ProtectedRoute element={<QueueCallLogs />} />,
          },
          {
            path: 'inbound',
            element: <ProtectedRoute element={<Inbound />} />,
          },
          {
            path: 'outbound',
            element: <ProtectedRoute element={<Outbound />} />,
          },
          {
            path: 'activity',
            element: <ProtectedRoute element={<ActivityCallLogs />} />,
          },
          {
            path: 'agent-reports',
            element: <ProtectedRoute element={<AgentReports />} />,
          },
          {
            path: 'sms-log',
            element: (
              <ProtectedRoute
                element={<SMSLogs />}
                guard={{
                  feature: 'reports.IS_SHOW',
                  permission: 'reports.action.sms',
                }}
              />
            ),
          },
          {
            path: 'analytics',
            element: <ProtectedRoute element={<CallAnalytics />} />,
          },
        ],
      },
      {
        path: 'integration',
        element: (
          <ProtectedRoute
            element={<Integration />}
            guard={{
              feature: 'integration.IS_SHOW',
              permission: 'integration.action.view',
            }}
          />
        ),
        children: [
          {
            index: true,
            element: <CRMIntegration />,
          },
          {
            path: 'data-reporting',
            children: [
              {
                path: 'zapier',
                element: <Zapier />,
              },
              {
                path: 'manage-webhook',
                element: <ManageWebhook />,
              },
              {
                path: 'general-settings',
                element: <GeneralSettings />,
              },
            ],
          },
        ],
      },
      {
        path: 'activity/:id',
        element: <UserActivity />,
        id: 'UserActivity',
      },
      // {
      //   path: 'activity',
      //   element: <Outlet />,
      //   children: [
      //     {
      //       index: true,
      //       element: <Activity />,
      //       id: 'Activity',
      //     },
      //     {
      //       path: ':id',
      //       element: <UserActivity />,
      //       id: 'UserActivity',
      //     },
      //   ],
      // },
      {
        path: 'running-campaign',
        element: <AgentRunningCampign />,
      },
      {
        path: 'my-campaigns',
        element: <MyCampaignListStandalone />,
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
    ],
  },
  {
    path: 'recording-details',
    element: <RecordingDetails />,
    id: 'recording-details',
  },
  {
    path: 'omni-channel-connect',
    element: (
      <PlanPendingGuard>
        <AuthProvider>
          <SocketEventsProvider>
            <AuthLayout />
          </SocketEventsProvider>
        </AuthProvider>
      </PlanPendingGuard>
    ),
    id: 'omni-channel-connect',
    children: [
      {
        path: '',
        element: <AdminSettings />,
        children: [
          {
            index: true,
            element: <OmniChannelConnect />,
          },
        ],
      },
    ],
  },
  {
    path: 'video-meet',
    element: (
      <SocketEventsProvider>
        <JitsiContextProvider>
          <VideoSection />
        </JitsiContextProvider>
      </SocketEventsProvider>
    ),
    id: 'video-meet',
  },
  {
    path: '*',
    element: <ErrorPage text="Page Not Found! 😔" />,
  },
]);
