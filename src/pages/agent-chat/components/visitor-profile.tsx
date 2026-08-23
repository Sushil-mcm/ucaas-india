import { CircleCheck, Globe, Info, Mail, MapPin, Phone, PhoneCall, UserRound } from 'lucide-react';
import { useDialpad } from '@/hooks/use-dialpad';

import { type ReactNode } from 'react';

type VisitorProfileProps = {
  activeChatId?: string;
  chat?: any;
  currentUserId?: string;
  asDrawerContent?: boolean;
};

type VisitorTicket = {
  label: string;
  status: string;
  date: string;
};

type VisitorProfileData = {
  name: string;
  image: string;
  domain: string;
  visitorType: string;
  email: string;
  phone: string;
  location: string;
  device: string;
  ipAddress: string;
  page: string;
  id?: string;
  pastTickets: VisitorTicket[];
};

const getFirstValidText = (...values: any[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const getChatUserName = (chatUser: any) => {
  if (!chatUser) return '';
  return (
    getFirstValidText(chatUser?.name) ||
    `${chatUser?.first_name || ''} ${chatUser?.last_name || ''}`.trim()
  );
};

const getChatProfileUser = (chat: any, currentUserId?: string) => {
  const rawUsers = chat?.users;
  const users = Array.isArray(rawUsers) ? rawUsers : rawUsers ? [rawUsers] : [];
  const me = users.find((chatUser: any) => chatUser?.uuid === currentUserId);
  const otherUser = users.find((chatUser: any) => chatUser?.uuid !== currentUserId);

  return otherUser || me || null;
};

const formatMonthDay = (dateValue: any): string => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isAbsoluteImage = (value: string) =>
  value.startsWith('http://') ||
  value.startsWith('https://') ||
  value.startsWith('data:') ||
  value.startsWith('blob:');

const getInitials = (name: string) => {
  const segments = `${name || ''}`.trim().split(/\s+/).filter(Boolean);
  if (!segments.length) return '';
  const first = segments[0]?.charAt(0)?.toUpperCase() || '';
  const second = segments[1]?.charAt(0)?.toUpperCase() || '';
  return `${first}${second || ''}`;
};

const normalizePastTickets = (chat: any): VisitorTicket[] => {
  const rawTickets = Array.isArray(chat?.metaData?.pastTickets)
    ? chat.metaData.pastTickets
    : Array.isArray(chat?.metaData?.tickets)
      ? chat.metaData.tickets
      : [];

  const normalizedFromArray = rawTickets
    .map((ticket: any) => {
      const ticketId = getFirstValidText(ticket?.id, ticket?.ticketId, ticket?.label);
      const ticketState = getFirstValidText(ticket?.status, ticket?.state);
      const label = ticketId
        ? `${ticketId}${ticketState ? ` - ${ticketState}` : ''}`
        : getFirstValidText(ticket?.label);
      const status = ticketState
        ? `${ticketState.charAt(0).toUpperCase()}${ticketState.slice(1).toLowerCase()}`
        : getFirstValidText(ticket?.description, ticket?.subtitle);
      const date =
        formatMonthDay(ticket?.date || ticket?.createdAt || ticket?.updatedAt) ||
        getFirstValidText(ticket?.dateLabel);

      if (!label && !status && !date) return null;
      return {
        label: label || '',
        status: status || '',
        date: date || '',
      };
    })
    .filter(Boolean) as VisitorTicket[];

  if (normalizedFromArray.length) return normalizedFromArray;

  const lastTicketId = getFirstValidText(
    chat?.metaData?.lastTicket?.id,
    chat?.metaData?.ticket?.id,
    chat?.metaData?.ticketId,
  );
  const lastTicketState = getFirstValidText(
    chat?.metaData?.lastTicket?.status,
    chat?.metaData?.status,
  );
  const lastTicketLabel = lastTicketId
    ? `${lastTicketId}${lastTicketState ? ` - ${lastTicketState}` : ''}`
    : '';
  const lastTicketStatus = lastTicketState
    ? `${lastTicketState.charAt(0).toUpperCase()}${lastTicketState.slice(1).toLowerCase()}`
    : '';
  const lastTicketDate = formatMonthDay(
    chat?.metaData?.lastTicket?.date || chat?.updatedAt || chat?.createdAt,
  );

  if (lastTicketLabel || lastTicketStatus || lastTicketDate) {
    return [
      {
        label: lastTicketLabel || '',
        status: lastTicketStatus || '',
        date: lastTicketDate || '',
      },
    ];
  }

  return [];
};

const getVisitorProfileData = (chat: any, currentUserId?: string): VisitorProfileData => {
  const profileUser = getChatProfileUser(chat, currentUserId);

  const name =
    getFirstValidText(
      profileUser?.data?.name,
      getChatUserName(profileUser),
      chat?.name,
      chat?.metaData?.visitorName,
    ) || 'Unknown Visitor';
  const domain = getFirstValidText(
    chat?.metaData?.domain,
    chat?.metaData?.website,
    chat?.metaData?.sourceDomain,
    chat?.metaData?.source,
  );
  const visitorType = getFirstValidText(chat?.metaData?.visitorType, chat?.metaData?.sourceLabel);
  const email = getFirstValidText(
    profileUser?.data?.email,
    profileUser?.email,
    chat?.metaData?.email,
    chat?.metaData?.visitorEmail,
  );
  const phone = getFirstValidText(
    profileUser?.data?.phone,
    profileUser?.phone,
    profileUser?.phone_number,
    chat?.metaData?.phone,
    chat?.metaData?.visitorPhone,
  );
  const city = getFirstValidText(
    chat?.metaData?.city,
    chat?.metaData?.location?.city,
    profileUser?.city,
  );
  const country = getFirstValidText(
    chat?.metaData?.country,
    chat?.metaData?.location?.country,
    profileUser?.country,
  );
  const address = getFirstValidText(profileUser?.data?.address, profileUser?.address);
  const location = address || [city, country].filter(Boolean).join(', ');
  const device = getFirstValidText(
    [profileUser?.data?.os_version, profileUser?.data?.browser_version].filter(Boolean).join(' - '),
    profileUser?.data?.device_type,
    chat?.metaData?.session?.device,
    chat?.metaData?.device,
    chat?.metaData?.browser,
  );
  const ipAddress = getFirstValidText(
    profileUser?.data?.ip_address,
    chat?.metaData?.session?.ipAddress,
    chat?.metaData?.ipAddress,
    chat?.metaData?.ip,
  );
  const page = getFirstValidText(
    profileUser?.data?.page,
    chat?.metaData?.session?.page,
    chat?.metaData?.page,
    chat?.metaData?.path,
  );
  const image = getFirstValidText(profileUser?.profile, chat?.avatar);
  const pastTickets = normalizePastTickets(chat);

  return {
    name,
    image,
    domain,
    visitorType,
    email,
    phone,
    location,
    device,
    ipAddress,
    page,
    id: profileUser?._id || profileUser?.uuid,
    pastTickets,
  };
};

const SectionTitle = ({ title }: { title: string }) => (
  <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
    <span>{title}</span>
    <Info className="h-3.5 w-3.5 text-muted-foreground" />
  </div>
);

const ProfileRow = ({
  icon,
  value,
  isMuted = false,
  action,
}: {
  icon: ReactNode;
  value: string;
  isMuted?: boolean;
  action?: ReactNode;
}) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
        {icon}
      </div>
      <div
        className={`${isMuted ? 'italic text-muted-foreground' : 'text-foreground'} text-[15px] font-medium`}
      >
        {value}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

const SessionRow = ({
  label,
  value,
  isPage = false,
}: {
  label: string;
  value: string;
  isPage?: boolean;
}) => (
  <div className="space-y-1">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div
      className={`text-[13px] font-semibold leading-relaxed break-all ${
        isPage ? 'text-ucass-active hover:underline cursor-pointer' : 'text-foreground'
      }`}
    >
      {value}
    </div>
  </div>
);

const VisitorProfile = ({
  activeChatId = '',
  chat,
  currentUserId,
  asDrawerContent = false,
}: VisitorProfileProps) => {
  const { makeCall } = useDialpad();

  const emptyState = (
    <div className="flex h-full items-center justify-center px-8 text-center">
      <div className="max-w-[250px]">
        <UserRound className="mx-auto mb-5 h-11 w-11 text-muted-foreground" strokeWidth={1.9} />
        <p className="text-[13px] font-normal text-muted-foreground">
          Select a contact to view their profile and session details.
        </p>
      </div>
    </div>
  );

  if (!activeChatId || !chat) {
    if (asDrawerContent) {
      return <div className="h-full bg-white">{emptyState}</div>;
    }
    return (
      <aside className="hidden h-full min-w-[21rem] max-w-[21rem] border-l border-border bg-white lg:block">
        {emptyState}
      </aside>
    );
  }

  const profileData = getVisitorProfileData(chat, currentUserId);
  console.log(profileData, 'profileData');

  const getPath = (url: string) => {
    try {
      if (!url) return '';
      const pathname = new URL(url).pathname;
      console.log(pathname, 'pathname');

      return pathname === '/' ? '/home' : pathname;
    } catch {
      return '';
    }
  };

  const initials = getInitials(profileData.name);
  const shouldShowImage = Boolean(profileData.image) && isAbsoluteImage(profileData.image);
  const profileContent = (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-border px-6 py-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[36px] font-semibold tracking-wide text-muted-foreground">
            {shouldShowImage ? (
              <img
                src={profileData.image}
                className="h-full w-full object-cover"
                alt={profileData.name}
              />
            ) : initials ? (
              initials
            ) : (
              <UserRound className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
            {profileData?.name || 'Unknown Visitor'}
          </h2>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {profileData.page && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ucass-active/20 bg-ucass-active-bg px-3 py-1 text-xs font-semibold text-ucass-active">
                <Globe className="h-3.5 w-3.5" />
                {profileData?.page?.replace(/^https?:\/\//, '').split('/')[0]}
              </span>
            )}
            {/* {profileData.visitorType && ( */}
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              {profileData?.visitorType || 'Website Visitor'}
            </span>
            {/* )} */}
          </div>
        </div>
      </div>

      <div className="space-y-8 px-6 py-6">
        <section className="space-y-4">
          <SectionTitle title="Contact Profile" />
          <ProfileRow
            icon={<Mail className="h-4 w-4" />}
            value={profileData.email || 'Not provided'}
            isMuted={!profileData.email}
          />
          <ProfileRow
            icon={<Phone className="h-4 w-4" />}
            value={profileData.phone || 'Not provided'}
            isMuted={!profileData.phone}
            action={
              profileData.phone ? (
                <button
                  onClick={() => {
                    makeCall(`+${profileData.phone}`, {
                      size: 'mini',
                      extraHeaders: [
                        profileData.name ? `X-ContactName: ${profileData.name}` : '',
                        profileData.id ? `X-ContactUuid: ${profileData.id}` : '',
                      ].filter(Boolean) as string[],
                    });
                  }}
                  className=" cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-ucass-active-bg text-primary transition-colors hover:bg-primary hover:text-white"
                  title="Call Visitor"
                >
                  <PhoneCall className="h-4 w-4" />
                </button>
              ) : null
            }
          />

          <ProfileRow
            icon={<MapPin className="h-4 w-4" />}
            value={profileData.location || 'Not provided'}
            isMuted={!profileData.location}
          />
        </section>

        {(profileData.device || profileData.ipAddress || profileData.page) && (
          <section className="space-y-4">
            <SectionTitle title="Active Session" />
            <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-sm space-y-5">
              {profileData.device && <SessionRow label="Device" value={profileData.device} />}
              {profileData.ipAddress && (
                <SessionRow label="IP Address" value={profileData.ipAddress} />
              )}
              {profileData.page && (
                <SessionRow label="Page" value={getPath(profileData.page)} isPage />
              )}
            </div>
          </section>
        )}

        {profileData.pastTickets && (
          <section className="space-y-4 pb-6">
            <SectionTitle title="Past Tickets" />
            <div className="space-y-3">
              {profileData.pastTickets.length > 0 ? (
                profileData.pastTickets.map((ticket, index) => (
                  <div
                    key={`${ticket.label}-${ticket.date}-${index}`}
                    className="rounded-2xl border border-border bg-white p-4 shadow-sm hover:border-ucass-active/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground">
                        {ticket.label || '#1234 - Resolved'}
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground shrink-0">
                        {ticket.date || 'Oct 12'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
                      <CircleCheck className="h-4 w-4" />
                      <span>{ticket.status || 'Successfully closed'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                  <p className="text-[13px] text-muted-foreground">No past tickets found</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );

  if (asDrawerContent) {
    return <div className="h-full bg-white">{profileContent}</div>;
  }
  return (
    <aside className="hidden h-full min-w-[21rem] max-w-[21rem] border-l border-border bg-white lg:block">
      {profileContent}
    </aside>
  );
};

export default VisitorProfile;
