import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// ── helpers ────────────────────────────────────────────────────────────────

function getInitials(nameOrEmail?: string): string {
  if (!nameOrEmail) return 'G';
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail[0].toUpperCase();
}

function truncateId(id?: string, len = 20): string {
  if (!id) return '—';
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

const AVATAR_COLORS = [
  'from-violet-500 to-indigo-600',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
];

// ── component ──────────────────────────────────────────────────────────────

interface PendingChatRequestsDrawerProps {
  onClose: () => void;
}

const PendingChatRequestsDrawer = ({ onClose }: PendingChatRequestsDrawerProps) => {
  const { aiChatRequests, setAiChatRequests, handleAiChatAccept, handleAiChatDecline } =
    useSocketEvents();
  const { user } = useUser();
  const navigate = useNavigate();
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

  const removeRequest = (chatId: string) => {
    setAiChatRequests((prev) => prev.filter((r) => r?.chatId !== chatId));
  };

  const handleAccept = (data: any) => {
    const chatId: string = data?.chatId;
    if (!chatId || loadingIds.has(chatId)) return;

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
        data?.users,
      ],
    };

    handleAiChatAccept(payload, (response: any) => {
      setLoading(chatId, false);
      if (response?.status === 200 || response?.success) {
        toast.success('Chat request accepted!');
        removeRequest(chatId);
        navigate(`/agent-chat?chatId=${chatId}&type=active`);
        onClose();
      } else {
        toast.error(response?.message || 'Failed to accept chat request');
      }
    });
  };

  const handleDecline = (data: any) => {
    if (data?.chatId) {
      handleAiChatDecline({ chatId: data.chatId });
    }
    removeRequest(data?.chatId);
  };

  const requests = Array.isArray(aiChatRequests) ? aiChatRequests : [];

  return (
    <div className="flex flex-col h-full">
      {/* ── Drawer header ──────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 px-5 py-5 flex-shrink-0">
        <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
        <div className="pointer-events-none absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10 blur-lg" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
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
                Pending Chat Requests
              </p>
              <p className="text-white/65 text-xs mt-0.5">
                {requests.length > 0
                  ? `${requests.length} request${requests.length !== 1 ? 's' : ''} waiting`
                  : 'No pending requests'}
              </p>
            </div>
          </div>

          {requests.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-white text-xs font-semibold tabular-nums">
                {requests.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Request list ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {requests.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-primary/50"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">All caught up!</p>
            <p className="text-xs text-gray-400 mt-1">No pending AI chat requests right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((data, index) => {
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
                  className="flex flex-col gap-3 px-5 py-4 bg-white hover:bg-primary/[0.02] transition-colors duration-150"
                >
                  {/* User row */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
                    >
                      <span className="text-white text-sm font-bold">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                        {chatId && (
                          <span className="text-[11px] text-gray-400 font-mono">
                            ID: {truncateId(chatId)}
                          </span>
                        )}
                        {data?.domain && (
                          <span className="text-[11px] text-gray-400">· {data.domain}</span>
                        )}
                      </div>
                    </div>
                    {/* Live ping */}
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="destructiveOutline"
                      size="sm"
                      className="flex-1"
                      disabled={isLoading}
                      onClick={() => handleDecline(data)}
                    >
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      disabled={isLoading}
                      onClick={() => handleAccept(data)}
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
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-5 py-3 flex items-center gap-2">
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
          Requests persist across page refreshes and are removed on accept or decline.
        </p>
      </div>
    </div>
  );
};

export default PendingChatRequestsDrawer;
