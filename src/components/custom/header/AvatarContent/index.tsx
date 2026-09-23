import { useUser } from '@/hooks/use-user';
import { useState } from 'react';
import {
  KeyRound,
  LogOut,
  User,
  Wallet,
  Pencil,
  Crown,
  ChevronDown,
  ChevronRight,
  Copy,
  Mail,
  Grid3X3,
  Phone,
} from 'lucide-react';
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
import { handleAlert } from '@/lib/utils';

// "ADMIN" -> "Administrator", everything else Title Cased — the raw role
// string is an API/internal value, not something meant to be shown as-is.
const formatRoleLabel = (role?: string) => {
  if (!role) return 'Member';
  if (role.toUpperCase() === 'ADMIN') return 'Administrator';
  return role
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const AvatarContent = ({ setProfileState }: any) => {
  const { user, handleRemoveUser } = useUser();
  const [showPresence, setShowPresence] = useState(false);
  const firstName = user?.user_info?.first_name || '';
  const lastName = user?.user_info?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const phone = user?.user_info?.phone ? String(user.user_info.phone) : '';
  const roleLabel = formatRoleLabel(
    user?.user_info?.custom_role_data?.name ||
      user?.user_info?.role_data?.name ||
      user?.user_info?.role,
  );

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

  const goToProfile = () => {
    navigate('/admin-settings/account/basic-info');
    setProfileState(false);
  };

  const copyValue = (value: string, label: string) => {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => handleAlert({ text: `${label} copied`, type: 'success' }))
      .catch(() => handleAlert({ text: `Could not copy ${label.toLowerCase()}`, type: 'error' }));
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

  const contactRows = [
    { icon: Mail, label: 'Email', value: user?.user_info?.email || '—' },
    { icon: Grid3X3, label: 'Extension', value: `Ext ${user?.user_info?.extension || '—'}` },
    {
      icon: Phone,
      label: 'Phone',
      value: phone ? (phone.startsWith('+') ? phone : `+${phone}`) : '—',
    },
  ];

  const menuItems = [
    {
      icon: User,
      title: 'My Profile',
      onClick: goToProfile,
    },
    {
      icon: KeyRound,
      title: 'Security & Password',
      onClick: () => setProfileState('changePassword'),
    },
    ...(features?.plan_features?.billing?.action?.view
      ? [
          {
            icon: Wallet,
            title: 'Add Funds',
            onClick: handleAddFunds,
            prefetch: '/admin-settings/billing/purchase',
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col">
      {/* Banner: a tinted header strip behind the avatar, name and role, with
          an Edit shortcut straight into the same profile page the menu item
          below opens — the two used to be the only way in, this is the
          quicker one for the most common edit. */}
      <div className="relative -mx-3 -mt-3 px-4 pt-4 pb-4 bg-ucass-primary-200/50 rounded-t-md">
        <button
          type="button"
          onClick={goToProfile}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm cursor-pointer transition-colors hover:bg-gray-50"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <div className="flex items-center gap-3">
          <CustomAvatar
            name={fullName}
            size="56"
            extension={user?.user_info?.extension}
            image={user?.user_info?.profile}
            isActivityInfo={false}
          />
          <div className="flex flex-col items-start gap-1.5 min-w-0 pr-20">
            <p className="text-[15px] font-bold leading-snug text-gray-900 dark:text-mcm-ink truncate max-w-40">
              {fullName}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-primary">
              <Crown className="w-3.5 h-3.5" />
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Availability — the same presence popover as before, now a
          full-width row that reads as "current status, tap to change"
          instead of a small chip tucked into the banner. */}
      <div className="px-1 pt-3">
        <Popover open={showPresence} onOpenChange={(val) => setShowPresence(val)}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg bg-green-50 dark:bg-mcm-surface-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-green-100/70"
            >
              <div className="w-3.5 h-3.5 shrink-0">
                {statusImageLookup[effectiveSocketStatus] ?? statusImageLookup['online']}
              </div>
              <div className="flex flex-col items-start gap-0.5 min-w-0">
                <span className="text-sm font-semibold leading-snug text-gray-900 dark:text-mcm-ink">
                  {presenceLabel}
                  {presenceNote && presenceNote !== presenceLabel ? (
                    <span className="font-normal text-gray-500 dark:text-mcm-ink-3"> · {presenceNote}</span>
                  ) : null}
                </span>
                <span className="text-xs leading-snug text-gray-500 dark:text-mcm-ink-3">
                  Set your availability status
                </span>
              </div>
              <ChevronDown className="w-4 h-4 ml-auto shrink-0 text-gray-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-1 flex flex-col gap-1" side="left" align="start">
            {presenceStatusArray.map((status) => {
              const isActive = effectiveSocketStatus === status?.value;
              return (
                <div
                  key={status.value}
                  title={isOnCall ? 'You cannot change this during a call' : status.description}
                  aria-disabled={isOnCall}
                  className={`flex items-center gap-2 w-full px-2 rounded-md transition-colors ${
                    isOnCall
                      ? 'opacity-50 cursor-not-allowed'
                      : `cursor-pointer ${isActive ? 'bg-[#fff1e0]' : 'hover:bg-[#fff1e0] dark:hover:bg-mcm-surface-3'}`
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

      {/* Contact details, each with its own copy button — the old version
          only ever showed these as read-only text, so getting the extension
          or DID into a dialer meant retyping it by hand. */}
      <div className="flex flex-col mx-1 mt-3 mb-1 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-mcm-surface-3">
        {contactRows.map(({ icon: RowIcon, label, value }, index) => (
          <div key={label}>
            {index > 0 && <DropdownMenuSeparator className="my-2.5" />}
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <RowIcon className="w-4 h-4" />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] uppercase tracking-wide leading-none text-gray-500 dark:text-mcm-ink-3">
                  {label}
                </span>
                <span className="text-sm font-medium leading-snug text-gray-900 dark:text-mcm-ink truncate max-w-44">
                  {value}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Copy ${label.toLowerCase()}`}
                title={`Copy ${label.toLowerCase()}`}
                onClick={() => copyValue(value, label)}
                className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 cursor-pointer transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-mcm-surface"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <DropdownMenuSeparator className="my-1.5" />

      <div className="flex flex-col gap-0.5 px-1 pb-1">
        {menuItems.map(({ icon: ItemIcon, title, onClick, prefetch }) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 cursor-pointer transition-colors hover:bg-ucass-primary-200/60"
            {...(prefetch ? getRoutePrefetchHandlers(prefetch) : {})}
            onClick={onClick}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ItemIcon className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-mcm-ink min-w-0 truncate">
              {title}
            </span>
            <ChevronRight className="w-4 h-4 ml-auto shrink-0 text-gray-400" />
          </div>
        ))}

        <button
          type="button"
          onClick={logoutDevice}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 cursor-pointer transition-colors bg-red-50 hover:bg-red-100"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <LogOut className="w-4 h-4" />
          </span>
          <span className="text-sm font-semibold text-red-600">Sign out</span>
          <ChevronRight className="w-4 h-4 ml-auto shrink-0 text-red-300" />
        </button>
      </div>
      <DropdownMenuSeparator className="my-1.5" />
      <p className="text-[11px] text-gray-400 dark:text-mcm-ink-3 text-right px-2 pb-0.5">v{packageJson.version}</p>
    </div>
  );
};

export default AvatarContent;
