import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { handleAlert, capitalizeFirstLetter } from '@/lib/utils';
import { deviceSecurityList, logout } from '@/services/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  LucideMonitor,
  LucideShieldCheck,
  LucideTablet,
  LogOut,
  KeyRound,
  MonitorSmartphone,
} from 'lucide-react';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Input } from '@/components/ui/input';
import { SearchLine } from '@/assets/icons';
import { useState, useMemo } from 'react';
import useDebounce from '@/hooks/use-debounce';
import ChangePassword from '@/pages/change-password';
import '@/components/mcm/mcm-page.css';
import AccountPageHead from '../account-page-head';

/* The list printed the raw `navigator.userAgent` string against every row —
   ninety characters of version numbers and compatibility tokens that answer
   nothing. The question somebody is here to answer is "do I recognise this",
   and the answer is a browser and an operating system. The full string is kept
   on the row's `title`, because when it does matter, it matters exactly. */
const describeAgent = (ua?: string): string => {
  const agent = String(ua || '').trim();
  if (!agent) return 'Unknown device';

  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /OPR\/|Opera/.test(agent)
      ? 'Opera'
      : /Firefox\//.test(agent)
        ? 'Firefox'
        : /Chrome\//.test(agent)
          ? 'Chrome'
          : /Safari\//.test(agent)
            ? 'Safari'
            : '';

  const os = /Windows NT 10/.test(agent)
    ? 'Windows'
    : /Windows/.test(agent)
      ? 'Windows'
      : /iPhone|iPad|iPod/.test(agent)
        ? 'iOS'
        : /Android/.test(agent)
          ? 'Android'
          : /Mac OS X/.test(agent)
            ? 'macOS'
            : /Linux/.test(agent)
              ? 'Linux'
              : '';

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  /* Something this does not recognise — a native client, a bot, a proxy. Show
     the head of the string rather than claiming to know what it is. */
  return agent.length > 42 ? `${agent.slice(0, 42)}…` : agent;
};

const Security = () => {
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [selectedUserExtension, setSelectedUserExtension] = useState<string>('');
  /* The change-password dialog was written and then never mounted anywhere, so
     there has been no way to change a password from inside the console. */
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const debouncedSearch = useDebounce(search || '', 1000);

  const {
    data: loggedInUsers = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['deviceSecurityList', debouncedSearch, selectedUserExtension],
    queryFn: () =>
      deviceSecurityList({
        search: debouncedSearch,
        filter: selectedUserExtension ? [{ key: 'extension', value: [selectedUserExtension] }] : [],
      }),
    select: (data) => {
      const result = data?.data?.data?.result || [];
      // Sort to show current device first
      return result.sort((a: any, b: any) => {
        if (user?.device_token === a?.uuid) return -1;
        if (user?.device_token === b?.uuid) return 1;
        return 0;
      });
    },
  });

  /* This page is titled "your password, and every device signed in as you", and
     that is what it should show.

     It used to say the server did not check who you were targeting. That is no
     longer true, and the note is kept accurate on purpose: the three server-side
     gaps behind it are all closed and live as of 29 August 2026.
       - logout() gives a non-privileged caller `undefined` for the target, so it
         falls back to their own uuid, and the payload cannot smuggle one past it.
       - getDeviceSecurities scopes to the caller's company, and to the caller's
         own uuid unless they are an ADMIN.
       - logOutUser now refuses a target outside the admin's own company.

     The filter below stays regardless. Ending someone else's session is an
     administrative act and belongs on an admin screen, not on a page about your
     own account — so this page shows you your own devices whatever your role. */
  const currentUserUuid = `${user?.uuid || user?.user_info?.uuid || ''}`.trim();

  const ownDevices = useMemo(
    () =>
      currentUserUuid
        ? loggedInUsers.filter((item: any) => `${item?.user_uuid || ''}`.trim() === currentUserUuid)
        : loggedInUsers,
    [loggedInUsers, currentUserUuid],
  );

  const { mutate: logoutMutate, isPending: isSigningOut } = useMutation({
    mutationFn: logout,
    onSuccess: (data) => {
      handleAlert({ text: data?.data?.data?.message, type: 'success' });
      setSelectedUserExtension('');

      refetch();
    },
  });

  const logoutDevice = (type: string = 'single', item: any) => {
    const payload = {
      type,
      device_securities: item?.uuid ? [item?.uuid] : [],
      user_uuid: item?.user_uuid || currentUserUuid,
    };
    logoutMutate(payload);
  };

  const handleLogoutAll = () => {
    if (!currentUserUuid) return;
    logoutDevice('all', { user_uuid: currentUserUuid });
  };

  const handleLogoutExcept = () => {
    if (!currentUserUuid) return;
    logoutDevice('except_himself', { user_uuid: currentUserUuid });
  };

  const deviceCount = ownDevices?.length || 0;
  /* Only meaningful once something has loaded: an empty list during the first
     fetch is not "no other devices", it is "not known yet". */
  const otherCount = ownDevices.filter((item: any) => user?.device_token !== item?.uuid).length;
  const isSearching = Boolean(debouncedSearch.trim());

  return (
    <section className="mcm-page mcm-admin mcm-acct">
      <AccountPageHead
        title="Security & Privacy"
        about="Your password, and every device currently signed in as you."
      >
        {!isLoading && !isSearching && deviceCount > 0 && (
          <div className="mcm-acct-note">
            <MonitorSmartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {deviceCount} {deviceCount === 1 ? 'device is' : 'devices are'} signed in as you
              {otherCount > 0 ? `, ${otherCount} besides this one.` : '.'}
            </span>
          </div>
        )}
      </AccountPageHead>

      <div className="mcm-acct-body">
        <div className="mcm-acct-narrow">
          <div className="mcm-seccards">
            <article className="mcm-seccard">
              <span className="mcm-seccard-ico" aria-hidden="true">
                <KeyRound className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="mcm-seccard-t">Password</h2>
                <p className="mcm-seccard-d">
                  Change the password you sign in with. You will need your current one. Everything
                  already signed in stays signed in — use the device list below to end those.
                </p>
              </div>
              <div className="mcm-seccard-act">
                <Button variant="outline" onClick={() => setIsChangePasswordOpen(true)}>
                  Change password
                </Button>
              </div>
            </article>

            <article className="mcm-seccard is-risk">
              <span className="mcm-seccard-ico" aria-hidden="true">
                <LogOut className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="mcm-seccard-t">Sign out everywhere</h2>
                <p className="mcm-seccard-d">
                  Ends every session signed in as you — useful if you have lost a phone or used a
                  shared computer. To sign someone else out, an administrator does that from Users.
                </p>
              </div>
              <div className="mcm-seccard-act">
                <Button
                  variant="destructiveOutline"
                  onClick={handleLogoutExcept}
                  disabled={!currentUserUuid || isSigningOut || otherCount === 0}
                  className="whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out my other devices
                </Button>
                <Button
                  variant="destructiveOutline"
                  onClick={handleLogoutAll}
                  disabled={!currentUserUuid || isSigningOut}
                  className="whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out everywhere
                </Button>
              </div>
            </article>
          </div>

          <section className="mcm-devices">
            <header className="mcm-devices-h">
              <div className="min-w-0">
                <h2 className="mcm-devices-t">Where you are signed in</h2>
                <p className="mcm-devices-d">
                  Sign out of anything you do not recognise, or anything on a computer you no longer
                  have.
                </p>
              </div>
              <Input
                placeholder="Search devices"
                className="max-w-64 pl-10"
                IconPosition="left-0 pl-2 inset-y-0"
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.startsWith(' ')) return;
                  setSearch(e.target.value);
                }}
                Icon={<SearchLine className="text-[#2E2D35]" />}
              />
            </header>

            {/* Three skeleton rows in the shape of the list, rather than a
                spinner in the middle of an empty box: the page keeps its
                layout instead of collapsing and snapping back. */}
            {isLoading ? (
              <div className="mcm-devices-list" aria-busy="true">
                {[0, 1, 2].map((n) => (
                  <div className="mcm-device is-skeleton" key={n}>
                    <span className="mcm-skel mcm-skel-av" />
                    <div className="mcm-device-main">
                      <span className="mcm-skel mcm-skel-l" style={{ width: '38%' }} />
                      <span className="mcm-skel mcm-skel-l" style={{ width: '56%' }} />
                      <span className="mcm-skel mcm-skel-l" style={{ width: '30%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : deviceCount === 0 ? (
              /* Both empty cases, said apart: a search that matched nothing is
                 not the same answer as being signed in nowhere else. */
              <div className="mcm-devices-empty">
                <MonitorSmartphone className="h-6 w-6" aria-hidden="true" />
                <p className="mcm-devices-empty-t">
                  {isSearching ? 'No device matches that' : 'No sessions to show'}
                </p>
                <p className="mcm-devices-empty-d">
                  {isSearching
                    ? 'Try part of a browser name, an operating system or an IP address.'
                    : 'Sign in from another browser or the mobile app and it will be listed here.'}
                </p>
              </div>
            ) : (
              <div className="mcm-devices-list">
                {ownDevices.map((item: any) => {
                  const isCurrent = user?.device_token === item?.uuid;
                  const name =
                    capitalizeFirstLetter(
                      `${item?.user_detail?.first_name || ''} ${item?.user_detail?.last_name || ''}`.trim(),
                    ) || 'Unknown user';
                  return (
                    /* Keyed on the session uuid. This list had no key at all,
                       so signing one device out made React reuse the row above
                       it and the wrong device appeared to disappear. */
                    <article
                      className={`mcm-device${isCurrent ? ' is-current' : ''}`}
                      key={item?.uuid || `${item?.ip_address}-${item?.user_agent}`}
                    >
                      <div className="mcm-device-id">
                        <CustomAvatar
                          name={name}
                          showPresence={false}
                          size="40"
                          image={item?.user_detail?.profile}
                          extension={item?.user_detail?.extension}
                        />
                        <span className="mcm-device-kind" aria-hidden="true">
                          {item?.device_type === 'W' ? (
                            <LucideMonitor className="w-4 h-4" />
                          ) : (
                            <LucideTablet className="w-4 h-4" />
                          )}
                        </span>
                      </div>

                      <div className="mcm-device-main">
                        <p className="mcm-device-n" title={item?.user_agent || undefined}>
                          {describeAgent(item?.user_agent)}
                        </p>
                        <p className="mcm-device-m">
                          {name}
                          {item?.user_detail?.email ? ` · ${item.user_detail.email}` : ''}
                        </p>
                        <p className="mcm-device-ip">
                          IP {item?.ip_address || 'not recorded'}
                          {item?.device_type === 'W' ? ' · Desktop' : ' · Mobile'}
                        </p>
                      </div>

                      <div className="mcm-device-act">
                        {isCurrent ? (
                          <span className="mcm-device-here">
                            <LucideShieldCheck className="w-4 h-4" aria-hidden="true" />
                            This device
                          </span>
                        ) : (
                          <Button
                            variant={'outline'}
                            onClick={() => logoutDevice('single', item)}
                            disabled={isSigningOut}
                            className="justify-center"
                          >
                            Sign out
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
      <ChangePassword modalState={isChangePasswordOpen} setModalState={setIsChangePasswordOpen} />
    </section>
  );
};

export default Security;
