import { Bell } from '@/assets/icons';
import ucaasLogo from '@/assets/images/ucaas-logo.png';
import { useUser } from '@/hooks/use-user';
import { useDialpad } from '@/hooks/use-dialpad';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomAvatar from '../custom-avatar';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocketEvents } from '@/hooks/use-socket-events';
import SideDrawer from '../side-drawer';
import ChangePassword from '@/pages/change-password';
import CustomTooltip from '../custom-tooltip';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useMyPresence } from '@/hooks/use-my-presence';
import AvatarContent from './AvatarContent';
import NotificationContent from './NotificationContent';
import GlobalSearch from './GlobalSearch';
import AreaNav from '@/components/custom/area-nav';
import ThemeToggle from '@/components/custom/theme-toggle';
import PendingChatRequestsDrawer from './PendingChatRequestsDrawer';
import { ChevronDown, Menu, Wallet, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn, SESSION_NAME } from '@/lib/utils';
import { DASHBOARDCONST } from '@/pages/dashboard/constant';
import AlertConfirm from '../alert-confirm';
import { toast } from 'react-toastify';
import { getRoutePrefetchHandlers, prefetchRoute } from '@/router/route-prefetch';

const Header = () => {
  const { user, handleRemoveUser } = useUser();
  const queryClient = useQueryClient();
  const { status: myPresenceStatus } = useMyPresence();
  const {
    activeCampaign,
    setActiveCampaign,
    setCampaignContactCards,
    campaignClearingSecondsLeft,
    sessions,
  } = useDialpad();
  const {
    unreadCount = 0,
    userLogoutData,
    disconnectSocket,
    socketEventsManager,
  } = useSocketEvents();

  const [notificationState, setNotificationState] = useState<any>(false);
  const [pendingChatState, setPendingChatState] = useState<boolean>(false);
  const [forceLogoutOpen, setForceLogoutOpen] = useState(false);
  const [profileState, setProfileState] = useState<
    'profile' | 'changePassword' | 'notification' | null
  >(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [walletUpdatedAmount, setWalletUpdatedAmount] = useState<number | null>(null);
  const navigate = useNavigate();
  const { pathname = '' } = useLocation();
  const companyAmount = user?.company_info?.amount;
  const totalFunds =
    companyAmount !== null && companyAmount !== undefined ? `$${companyAmount}` : '00.00';
  const resolvedFundsDisplay =
    walletUpdatedAmount !== null && walletUpdatedAmount !== undefined
      ? `$${walletUpdatedAmount}`
      : totalFunds;
  const role =
    user?.user_info?.custom_role_data?.name ||
    user?.user_info?.role_data?.name ||
    user?.user_info?.role ||
    'User';
  const hasActiveCampaign = Boolean(activeCampaign && Object.keys(activeCampaign).length);
  const activeCampaignName = String(activeCampaign?.name || '').trim() || 'Campaign Running';
  const isCampaignClearing = campaignClearingSecondsLeft > 0;
  const campaignSystemEventsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnyActiveDialpadSession = useMemo(
    () =>
      Object.values(sessions || {}).some((sessionItem: any) => {
        const sessionStatus = String(sessionItem?.status || '').toLowerCase();
        return sessionStatus && !['ended', 'failed'].includes(sessionStatus);
      }),
    [sessions],
  );
  const hasAnyActiveDialpadSessionRef = useRef(hasAnyActiveDialpadSession);

  const { features } = useCompanyFeatures();
  const addFundsRoute = '/admin-settings/billing/purchase';

  const navigateToLazyRoute = useCallback(
    (route?: string) => {
      if (!route) return;

      prefetchRoute(route);
      navigate(route, { flushSync: true });
      setIsMobileMenuOpen(false);
    },
    [navigate],
  );

  const getHeaderRouteHandlers = useCallback(
    (route?: string) => ({
      ...getRoutePrefetchHandlers(route),
      onClick: () => navigateToLazyRoute(route),
    }),
    [navigateToLazyRoute],
  );

  const clearCampaignSystemEventsInterval = useCallback(() => {
    if (campaignSystemEventsIntervalRef.current) {
      clearInterval(campaignSystemEventsIntervalRef.current);
      campaignSystemEventsIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    hasAnyActiveDialpadSessionRef.current = hasAnyActiveDialpadSession;
  }, [hasAnyActiveDialpadSession]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const logoutUuid = userLogoutData?.uuid;
    const deviceToken = user?.device_token;

    if (!logoutUuid || !deviceToken) return;

    if (logoutUuid === deviceToken) {
      if (typeof window !== 'undefined') {
        (window as any).isSessionTerminated = true;
      }
      toast.dismiss();
      disconnectSocket();
      localStorage.removeItem(SESSION_NAME);
      localStorage.removeItem(DASHBOARDCONST?.dashboardType);
      setForceLogoutOpen(true);
    }
  }, [userLogoutData, user, disconnectSocket]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (typeof window !== 'undefined') {
        (window as any).isSessionTerminated = true;
      }
      toast.dismiss();
      setForceLogoutOpen(true);
    };

    window.addEventListener('unauthorized-session', handleUnauthorized);
    return () => {
      window.removeEventListener('unauthorized-session', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const campaignId = String(
      activeCampaign?._id || activeCampaign?.campaignId || activeCampaign?.id || '',
    ).trim();
    const campaignDialMethod = String(
      activeCampaign?.dialMethod || activeCampaign?.campaignType || '',
    )
      .trim()
      .toUpperCase();
    const isPredictiveCampaign = campaignDialMethod.includes('PREDICTIVE');
    const campaignStatus = String(
      activeCampaign?.manualStatus ||
        activeCampaign?.campaignStatus ||
        activeCampaign?.status ||
        '',
    )
      .trim()
      .toUpperCase();
    const isCampaignEnded = [
      'COMPLETED',
      'COMPLETE',
      'PAUSE',
      'ENDED',
      'STOPPED',
      'CANCELLED',
    ].includes(campaignStatus);

    clearCampaignSystemEventsInterval();

    if (campaignId && isCampaignEnded) {
      return;
    }

    if (!campaignId || !isPredictiveCampaign || !socketEventsManager) {
      return;
    }

    const userDetail = {
      first_name: String(user?.user_info?.first_name || user?.first_name || '').trim(),
      last_name: String(user?.user_info?.last_name || user?.last_name || '').trim(),
      email: String(user?.user_info?.email || user?.email || '').trim(),
      extension: String(user?.user_info?.extension || '').trim(),
      user_uuid: String(user?.uuid || '').trim(),
      company_uuid: String(user?.company_info?.uuid || user?.company_uuid || '').trim(),
      domain: String(user?.sip_credentials?.domain || user?.user_info?.domain || '').trim(),
      role: String(user?.role || user?.user_info?.role || '').trim(),
      caller_id: String(user?.user_info?.caller_id || user?.caller_id || '').trim(),
    };

    if (!userDetail.user_uuid) return;

    const queue = String(activeCampaign?.queue || '').trim();
    const emitCampaignSystemEvents = () => {
      if (hasAnyActiveDialpadSessionRef.current) {
        return;
      }

      socketEventsManager.emit(
        'campaign-system-events',
        {
          body: {
            campaignId,
            queue,
            user_uuid: userDetail.user_uuid,
            userDetail,
          },
        },
        (response: any) => {
          const firstLevel = Array.isArray(response) ? response[0] : null;
          const eventPayload = Array.isArray(firstLevel) ? firstLevel[0] : firstLevel;
          const campaignStatusFromEvent = String(eventPayload?.campaignStatus || '')
            .trim()
            .toUpperCase();

          if (['COMPLETED', 'COMPLETE', 'PAUSE'].includes(campaignStatusFromEvent)) {
            clearCampaignSystemEventsInterval();
            setCampaignContactCards([]);
            setActiveCampaign((prev: any) => ({
              ...(prev || {}),
              manualStatus: campaignStatusFromEvent,
            }));
          }
        },
      );
    };

    emitCampaignSystemEvents();
    campaignSystemEventsIntervalRef.current = setInterval(emitCampaignSystemEvents, 30000);

    return () => {
      clearCampaignSystemEventsInterval();
    };
  }, [
    activeCampaign?._id,
    activeCampaign?.campaignId,
    activeCampaign?.dialMethod,
    activeCampaign?.id,
    activeCampaign?.manualStatus,
    activeCampaign?.campaignStatus,
    socketEventsManager,
    user,
    setActiveCampaign,
    setCampaignContactCards,
    clearCampaignSystemEventsInterval,
  ]);

  useEffect(() => {
    return () => {
      clearCampaignSystemEventsInterval();
    };
  }, [clearCampaignSystemEventsInterval]);

  useEffect(() => {
    if (socketEventsManager) {
      const handleWalletUpdated = (data: any) => {
        queryClient.invalidateQueries({ queryKey: ['callListingLog'] });
        const nextAmount = Number(data?.amount);
        if (!Number.isFinite(nextAmount)) return;
        setWalletUpdatedAmount(nextAmount);
      };

      socketEventsManager.on('wallet-updated', handleWalletUpdated);

      return () => {
        socketEventsManager.off('wallet-updated', handleWalletUpdated);
      };
    }
  }, [queryClient, socketEventsManager]);

  return (
    <>
      <div className="fixed left-0 top-0 z-30 h-16 w-full">
        {/* `border-gray-200`, not `border-white/50`: the old rule was white
            on a white bar sitting above white page content, so the header had
            no visible bottom edge and merged into whatever was beneath it.

            `h-16` rather than `min-h-16` because the wrapper above is a fixed
            64px and page content is offset by `pt-16` (64px) — `min-h-16`
            plus this 1px border made the bar 65px, so it painted over the
            first row of the content below. Border-box keeps the border
            inside the 64px. */}
        <header
          /* Upstream's px-4/py-2.5 padding, but keeping `h-16` over
             `min-h-16` and a visible `border-gray-200` over
             `border-white/50` — see the note above the tag. */
          className="h-16 text-gray-900/80 border-b border-gray-200 px-4 py-2.5"
          style={{
            background: 'rgba(255, 255, 255, 0.78)',
            backdropFilter: 'blur(12px) saturate(160%)',
            WebkitBackdropFilter: 'blur(12px) saturate(160%)',
          }}
        >
          <nav
            className="flex w-full flex-col gap-3 md:flex-row md:items-center md:gap-2"
            aria-label="Global"
          >
            <div className="mcm-brandbar hidden md:order-1 md:flex md:items-center md:gap-3">
              <a
                href="/dashboard"
                onClick={(event) => {
                  event.preventDefault();
                  navigate('/dashboard');
                }}
                className="mcm-brand"
                aria-label="Go to Home"
              >
                {/* The customer's own mark. When they have not uploaded one we
                    show their initial rather than falling back to the vendor's
                    logo — this bar belongs to whoever is running the console. */}
                <span className="mcm-brand-mark">
                  <img src={ucaasLogo} alt="" />
                </span>
              </a>
              <AreaNav />
            </div>
            <div className="flex w-full items-center gap-2 text-gray-900/80 md:order-2 md:w-auto relative">
              {hasActiveCampaign && (
                <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                  </span>
                  <span className="max-w-[180px] truncate text-xs font-semibold text-emerald-700">
                    {activeCampaignName}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Running
                  </span>
                </div>
              )}
              {isCampaignClearing && (
                <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 absolute min-w-0 top-0 left-0 z-10">
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span className="max-w-[440px] text-xs font-medium leading-4 text-amber-700">
                    Clearing up the campaign, calls can come up until next 30 seconds.
                  </span>
                </div>
              )}
              <div className="flex flex-1 items-center justify-start ">
                <GlobalSearch />
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition-colors hover:bg-ucass-primary-200 hover:text-primary md:hidden"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                aria-label={isMobileMenuOpen ? 'Close header menu' : 'Open header menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-header-actions mobile-header-wallet-profile"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4.5 h-4.5" />
                ) : (
                  <Menu className="w-4.5 h-4.5" />
                )}
              </button>
            </div>
            <div
              id="mobile-header-actions"
              className={`${isMobileMenuOpen ? 'flex' : 'hidden'} w-full flex-wrap gap-2 items-center border-t border-gray-200 pt-3 md:order-3 md:flex md:w-auto md:flex-nowrap md:border-t-0 md:pt-0`}
            >
              {/* Tasks, Calendar, My Campaigns, Activity and Monitoring moved
                  into the Performance area rail — the bar keeps only
                  notifications and account controls now. */}
              {/* The WebRTC and presence chips lived here. Registration state is
                  already on the dialer button beside this, and presence is on the
                  avatar menu — two more always-on chips just crowded the bar. */}
              {/* The dialer button lived here. Calls are placed from
                  Activity ▸ Phone; the header keeps only notifications and
                  account controls. */}
              <div className="inline-flex items-center justify-center font-medium">
                <CustomTooltip text={'Notification'} side="bottom">
                  <span
                    className="cursor-pointer relative bg-white/70 border border-white/70 shadow-sm flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg hover:bg-ucass-primary-200 hover:border-ucass-primary-100 hover:text-primary"
                    onClick={() => {
                      setNotificationState(true);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {unreadCount ? (
                      <span className="bg-primary absolute text-white font-normal me-2  rounded-full -top-[4px] left-[20px] border-white border-2 text-xs px-1 min-w-5 min-h-5 flex items-center justify-center">
                        {unreadCount && unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    ) : null}
                    <Bell className="w-4.5 h-4.5" />
                  </span>
                </CustomTooltip>
              </div>

              {/* The gear lived here. Personal settings are now Admin ▸ My
                  Account, and the avatar menu still links straight to them. */}
            </div>
            <div className="hidden md:order-4 md:flex md:items-center">
              <ThemeToggle />
            </div>
            <div
              id="mobile-header-wallet-profile"
              className={`${isMobileMenuOpen ? 'flex' : 'hidden'} w-full flex-wrap items-center gap-3 border-t border-gray-200 pt-3 md:order-5 md:ml-auto md:flex md:w-auto md:flex-nowrap md:justify-end md:border-t-0 md:pt-0`}
            >
              {/* Wallet / Add Funds */}
              {features?.plan_features?.billing?.action?.view ? (
                <div className="flex items-center">
                  <CustomTooltip text={'Add Funds'} side="bottom">
                    <div
                      className="flex items-center gap-2 px-3 h-9 bg-gray-100 hover:bg-ucass-primary-200  rounded-lg cursor-pointer"
                      {...getHeaderRouteHandlers(addFundsRoute)}
                    >
                      <Wallet className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-[14px] text-primary font-medium">
                        {resolvedFundsDisplay}
                      </span>
                    </div>
                  </CustomTooltip>
                </div>
              ) : null}

              {/* User Profile */}
              <div className="flex items-center rounded-xl">
                <Popover
                  open={profileState === 'profile'}
                  onOpenChange={(val) => setProfileState(val ? 'profile' : null)}
                >
                  <PopoverTrigger
                    className={cn(
                      'cursor-pointer flex items-center gap-2 h-10 pl-1 pr-2 rounded-xl border transition-colors',
                      'bg-white/70 border-white/70 shadow-sm hover:bg-ucass-primary-200 hover:border-ucass-primary-100',
                      profileState === 'profile' && 'bg-ucass-primary-200 border-ucass-primary-100',
                    )}
                  >
                    <CustomAvatar
                      name={`${user?.user_info?.first_name} ${user?.user_info?.last_name || ''}`}
                      showPresence
                      extension={user?.user_info?.extension}
                      image={user?.user_info?.profile}
                      isActivityInfo={false}
                      size="32"
                      presenceOverride={myPresenceStatus}
                    />
                    <div className="hidden lg:flex flex-col items-start text-left min-w-0 max-w-[110px]">
                      <h4 className="w-full truncate text-[12px] font-bold text-gray-900 leading-tight">
                        {`Hi, ${user?.user_info?.first_name} ${user?.user_info?.last_name || ''}`}
                      </h4>
                      <div className="w-full truncate text-[10px] text-primary font-semibold uppercase tracking-widest">
                        {role}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200',
                        profileState === 'profile' && 'rotate-180',
                      )}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3 mt-2 mr-2 shadow-xl ring-1 ring-black/5">
                    <AvatarContent setProfileState={setProfileState} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </nav>
        </header>

        {/* Always mounted, unlike the other SideDrawers here — the slide
            transition needs the panel already sitting off-screen
            (translate-x-full) before isOpen flips true, so there is
            something to animate FROM. Conditionally mounting it (the old
            `notificationState && <SideDrawer/>` pattern) meant it only
            ever existed already fully open, so open and close both just
            snapped instead of sliding. NotificationContent renders its own
            close button (see isCloseIcon below), so it also gets `isOpen`
            directly — being permanently mounted now, it can't rely on
            mount-time effects to know when it has actually become visible. */}
        <SideDrawer
          isOpen={notificationState}
          handleClose={() => setNotificationState(false)}
          content={
            <NotificationContent
              isOpen={notificationState}
              setNotificationState={setNotificationState}
            />
          }
          isHeader={true}
          width="30%"
          isCloseIcon={false}
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
        />
        {pendingChatState && (
          <SideDrawer
            isOpen={pendingChatState}
            handleClose={() => setPendingChatState(false)}
            content={<PendingChatRequestsDrawer onClose={() => setPendingChatState(false)} />}
            isHeader={false}
            width="30%"
          />
        )}
        {profileState === 'changePassword' && (
          <ChangePassword setModalState={setProfileState} modalState={profileState} />
        )}
        <AlertConfirm
          onConfirm={() => {}}
          open={forceLogoutOpen}
          setOpen={() => {}}
          headerText="Session Terminated"
          singleButton={true}
          singleButtonText="Okay"
          singleButtonHandler={() => {
            sessionStorage.clear();
            localStorage.clear();
            handleRemoveUser();
          }}
          descriptionTextComp={
            <div className="text-md py-2 text-gray-700">
              Your session has been terminated or has expired. Please click Okay to log in again.
            </div>
          }
        />
      </div>
    </>
  );
};

export default Header;
