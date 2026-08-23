import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { CloseIcon } from '@/assets/icons';

interface AIChatRequestModalProps {
  requests: any[];
  isOpen: boolean;
  onDismiss: () => void;
  onClose: (chatId: string) => void;
  onAccept: (data: any) => void;
  onReject: (data: any) => void;
}

const AGENT_CHAT_REQUEST_ACCEPTED_EVENT = 'agent-chat:request-accepted';

// Derive initials from name or email
function getInitials(nameOrEmail?: string): string {
  if (!nameOrEmail) return 'G';
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail[0].toUpperCase();
}

// Colour palette cycling for avatars
const AVATAR_COLORS = [
  'from-violet-500 to-indigo-600',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
];

const AIChatRequestModal = ({
  requests,
  isOpen,
  onDismiss,
  onClose,
  onAccept,
  onReject,
}: AIChatRequestModalProps) => {
  const { handleAiChatAccept } = useSocketEvents();
  const { user } = useUser();
  const navigate = useNavigate();

  // Track per-chatId loading state
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const setLoading = (chatId: string, value: boolean) => {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(chatId);
      } else {
        next.delete(chatId);
      }
      return next;
    });
  };

  const pendingRequests = (requests?.filter((req: any) => req?.status === 'pending') || []).sort(
    (a: any, b: any) => {
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    },
  );

  const handleAcceptClick = (data: any) => {
    const guestUser = data?.users;
    const chatId = data?.chatId;
    if (loadingIds.has(chatId)) return;

    setLoading(chatId, true);

    const payload = {
      chatId,
      company_uuid: user?.company_info?.uuid,
      domain: user?.sip_credentials?.domain || '',
      token: data?.token,
      users: [
        {
          uuid: user?.uuid,
          name: `${user?.first_name || user?.user_info?.first_name || ''} ${user?.last_name || user?.user_info?.last_name || ''}`.trim(),
          email: user?.email || user?.user_info?.email,
          extension: user?.extension || user?.user_info?.extension,
        },
        guestUser,
      ],
    };

    handleAiChatAccept(payload, (response: any) => {
      setLoading(chatId, false);
      if (response?.status === 200 || response?.success) {
        toast.success('Chat request accepted!');
        window.dispatchEvent(
          new CustomEvent(AGENT_CHAT_REQUEST_ACCEPTED_EVENT, {
            detail: { chatId, type: 'active' },
          }),
        );
        onDismiss();
        navigate(`/agent-chat?chatId=${chatId}&type=active`);
        onAccept(data);
        onClose(chatId);
      } else {
        toast.error(response?.message || 'Failed to accept chat request');
      }
    });
  };

  const handleRejectClick = (data: any) => {
    onReject(data);
    onClose(data?.chatId);
  };

  if (!isOpen || pendingRequests.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-bottom-8 fade-in duration-300">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 px-5 py-4">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
        <div className="pointer-events-none absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10 blur-lg" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Bot icon */}
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.539.924A13.484 13.484 0 0112 17.25a13.484 13.484 0 01-6.261-1.326L4.2 15m15.6 0-1.74 2.61a2.25 2.25 0 01-1.874 1.005H7.814a2.25 2.25 0 01-1.874-1.005L4.2 15"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">
                Incoming Chat Request
              </p>
              <p className="text-white/65 text-xs mt-0.5">
                {/* {pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''}  */}
                waiting for response
              </p>
            </div>
          </div>

          {/* Right side: count badge + close button */}
          <div className="flex items-center gap-2">
            {/* Live count badge */}
            {/* <div className="flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-white text-xs font-semibold tabular-nums">{pendingRequests.length}</span>
            </div> */}

            {/* Close / Dismiss button */}
            <button
              onClick={onDismiss}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-colors duration-150 flex-shrink-0"
              title="Dismiss (requests still pending)"
            >
              <CloseIcon className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Request list ────────────────────────────────────── */}
      <div
        className="bg-gray-50 divide-y divide-gray-100 overflow-y-auto"
        style={{ maxHeight: '420px' }}
      >
        {pendingRequests?.slice(0, 1)?.map((data, index) => {
          const chatId: string = data?.chatId ?? '';
          const guestUser = data?.users;
          const displayName: string =
            guestUser?.name || guestUser?.email || guestUser?.phone || 'Guest User';
          const initials = getInitials(displayName);
          const avatarGradient = AVATAR_COLORS[index % AVATAR_COLORS.length];
          const isLoading = loadingIds.has(chatId);

          return (
            <div
              key={chatId || index}
              className="group flex flex-col gap-3 px-5 py-4 bg-white hover:bg-primary/[0.02] transition-colors duration-150"
            >
              {/* User row */}
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
                >
                  <span className="text-white text-sm font-bold">{initials}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 mt-0.5">
                    {guestUser?.email && (
                      <span className="text-[11px] text-gray-400 font-mono truncate">
                        {guestUser.email}
                      </span>
                    )}
                    {guestUser?.phone && (
                      <span className="text-[11px] text-gray-400 font-mono truncate">
                        {guestUser.phone}
                      </span>
                    )}
                    {data?.domain && (
                      <span className="text-[11px] text-gray-400 truncate">· {data.domain}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="destructiveOutline"
                  size="sm"
                  className="flex-1"
                  disabled={isLoading}
                  onClick={() => handleRejectClick(data)}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Decline
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  disabled={isLoading}
                  onClick={() => handleAcceptClick(data)}
                >
                  {isLoading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                        />
                      </svg>
                      Accepting…
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      Accept
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer note ─────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-100 px-5 py-2.5 flex items-center gap-2">
        <svg
          className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-[11px] text-gray-400">
          Dismissing hides the popup — request remain accessible via the agent chat.
        </p>
      </div>
    </div>
  );
};

export default AIChatRequestModal;
