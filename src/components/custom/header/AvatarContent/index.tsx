import { useUser } from '@/hooks/use-user';
import { useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import { KeyRound, LogOut, User, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useMyPresence, presenceQualifier } from '@/hooks/use-my-presence';
import { useMyPresenceControl } from '@/hooks/use-presence-control';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { presenceStatusArray, statusImageLookup } from '../constants';
import CustomAvatar from '../../custom-avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import packageJson from '../../../../../package.json';
import { useMutation } from '@tanstack/react-query';
import { logout } from '@/services/api';
import { getRoutePrefetchHandlers } from '@/router/route-prefetch';

const AvatarContent = ({ setProfileState }: any) => {
  const { user, handleRemoveUser } = useUser();
  const [showPresence, setShowPresence] = useState(false);
  const firstName = user?.user_info?.first_name || '';
  const lastName = user?.user_info?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const phone = user?.user_info?.phone ? String(user.user_info.phone) : '';

  const { disconnectSocket } = useSocketEvents();
  const navigate = useNavigate();
  const { features } = useCompanyFeatures();
  // Resolved in one place so the header chip and this menu always agree.
  const { status: effectiveSocketStatus, label: presenceLabel } = useMyPresence();

  /* Presence writes go through the shared control rather than a second copy of
     the same logic. The copy that used to live here carried neither `greetings`
     nor `settings`, and `/api/user/update` treats a missing field as a cleared
     one - so every status change from this menu, which is the most used
     presence control in the product, silently erased the person's voicemail
     greeting and their personal settings. The shared hook carries both, sends
     the real on-call flag instead of a hard-coded false, and declines to write
     while a call is up. */
  const { setMyPresence, isOnCall } = useMyPresenceControl();
  const presenceNote = presenceQualifier(effectiveSocketStatus, { onCall: isOnCall });

  const handleStatusChange = async (status: string) => {
    if (effectiveSocketStatus === status || isOnCall) return;
    setMyPresence(status);
    setShowPresence(false);
    setProfileState(false);
  };

  const handleAddFunds = () => {
    navigate('/admin-settings/billing/purchase');
    setProfileState(false);
  };

  const { mutate: logoutMutate } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Disconnect socket first to prevent any socket events from firing
      disconnectSocket();
      // Small delay to ensure socket cleanup completes before clearing user data
      setTimeout(() => {
        handleRemoveUser();
      }, 100);
    },
  });

  const logoutDevice = async () => {
    const payload = {
      type: 'single',
      device_securities: [user?.device_token],
      user_uuid: user?.uuid,
    };
    logoutMutate(payload);
  };
  const menuItemClass =
    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-700 dark:text-mcm-ink-2 cursor-pointer transition-colors hover:bg-ucass-primary-200 hover:text-primary';

  return (
    <div className="flex flex-col">
      {/* Banner: a tinted header strip behind the avatar, name and email
          centered, so this reads as a profile card rather than a plain
          stacked list. */}
      <div className="flex flex-col items-center gap-2 -mx-3 -mt-3 px-4 pt-5 pb-4 bg-ucass-primary-200/50 rounded-t-md">
        <CustomAvatar
          name={fullName}
          size="72"
          extension={user?.user_info?.extension}
          image={user?.user_info?.profile}
          isActivityInfo={false}
        />
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-mcm-ink truncate max-w-56">{fullName}</p>
          <p className="text-xs text-gray-500 dark:text-mcm-ink-3 truncate max-w-56">{user?.user_info?.email || ''}</p>
        </div>

        <Popover open={showPresence} onOpenChange={(val) => setShowPresence(val)}>
          <PopoverTrigger>
            <span className="cursor-pointer flex gap-1.5 items-center rounded-full bg-white/80 dark:bg-mcm-surface-3/80 px-2.5 py-1 border border-white dark:border-mcm-line shadow-sm">
              <div className="w-3.5 h-3.5">
                {statusImageLookup[effectiveSocketStatus] ?? statusImageLookup['online']}
              </div>
              {/* The label, not the stored value. This printed the raw
                  "online"/"busy" with a capitalize class, so the chip and the
                  menu directly below it named the same state differently.
                  On a call is shown alongside it rather than instead of it:
                  the declared state has not changed and comes back when the
                  call ends, so hiding it would misreport what is stored. */}
              <div className="text-xs font-medium text-gray-700 dark:text-mcm-ink-2">{presenceLabel}</div>
              {presenceNote && presenceNote !== presenceLabel ? (
                <span className="text-xs text-gray-500 dark:text-mcm-ink-3">· {presenceNote}</span>
              ) : null}
            </span>
          </PopoverTrigger>
          <PopoverContent className="p-1 flex flex-col gap-1" side="left" align="start">
            {presenceStatusArray.map((status) => {
              const isActive = effectiveSocketStatus === status?.value;
              return (
                <div
                  key={status.value}
                  title={isOnCall ? 'You cannot change this during a call' : status.description}
                  aria-disabled={isOnCall}
                  className={`flex items-center gap-2 w-full px-2 rounded-md ${
                    isOnCall
                      ? 'opacity-50 cursor-not-allowed'
                      : `cursor-pointer ${isActive ? 'bg-ucass-active-bg' : 'hover:bg-gray-200 dark:hover:bg-mcm-surface-3'}`
                  }`}
                  onClick={() => handleStatusChange(status.value)}
                >
                  <div className="w-4 h-4">{statusImageLookup[status.value]}</div>
                  <div className="p-2 ">
                    <div className="text-sm">{status.title}</div>
                    <div className="text-xs">{status.description}</div>
                  </div>
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      {/* Contact details. Email gets its own full-width row — splitting it
          into a two-column grid with phone left it truncating after just a
          few characters. Extension and phone (when there is one) share a
          row since both are short. */}
      <div className="flex flex-col gap-2 px-3 pt-3 pb-1 text-xs text-gray-600 dark:text-mcm-ink-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon name="LetterLine" className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-mcm-ink-3" />
          <span className="truncate">{user?.user_info?.email || '—'}</span>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon name="Grid" className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-mcm-ink-3" />
            <span className="truncate">Ext {user?.user_info?.extension}</span>
          </div>
          {/* Always shown, even with no number yet — this fills in once a
              real backend supplies user_info.phone. */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon name="PhoneLine" className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-mcm-ink-3" />
            <span className="truncate">
              {phone ? (phone.startsWith('+') ? phone : `+${phone}`) : '—'}
            </span>
          </div>
        </div>
      </div>

      <DropdownMenuSeparator className="my-2" />

      <div className="flex flex-col gap-0.5 px-1 pb-1">
        <div
          className={menuItemClass}
          {...getRoutePrefetchHandlers('/admin-settings/account/basic-info')}
          onClick={() => {
            navigate('/admin-settings/account/basic-info');
            setProfileState(false);
          }}
        >
          <User className="w-4 h-4" />
          My Profile
        </div>
        <div
          className={menuItemClass}
          onClick={(val) => setProfileState(val ? 'changePassword' : null)}
        >
          <KeyRound className="w-4 h-4" />
          Change Password
        </div>
        {features?.plan_features?.billing?.action?.view && (
          <div
            className={menuItemClass}
            {...getRoutePrefetchHandlers('/admin-settings/billing/purchase')}
            onClick={handleAddFunds}
          >
            <Wallet className="w-4 h-4" />
            Add Funds
          </div>
        )}
        <button
          onClick={() => {
            logoutDevice();
          }}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 cursor-pointer transition-colors hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
      <DropdownMenuSeparator className="my-1" />
      <p className="text-[11px] text-gray-400 dark:text-mcm-ink-3 text-right px-2 pb-1">v{packageJson.version}</p>
    </div>
  );
};

export default AvatarContent;
