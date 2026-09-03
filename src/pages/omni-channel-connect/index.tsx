import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getEnv } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import {
  MessageSquare,
  Instagram,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const OmniChannelConnect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const apiBaseUrl = getEnv().VITE_API_BASE_URL || '';
  const { user } = useUser();

  // Retrieve parameters from URL
  const status = searchParams.get('status');
  const message = searchParams.get('message');
  const initialTenantId = searchParams.get('tenantId') || '';
  const channel = searchParams.get('channel');

  // Callback parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const [error, setError] = useState<string | null>(null);

  // Callback processing states
  const [isCallbackProcessing, setIsCallbackProcessing] = useState(false);
  const [callbackStatus, setCallbackStatus] = useState<'success' | 'error' | null>(null);
  const [callbackMessage, setCallbackMessage] = useState<string | null>(null);
  const [callbackChannel, setCallbackChannel] = useState<string | null>(null);

  // Determine effectiveTenantId: url parameter -> user's company uuid
  const effectiveTenantId = initialTenantId || user?.company_info?.uuid || '';

  // Prevent duplicate callback runs
  const calledRef = useRef(false);

  // Handle automatic callback request if code & state exist in URL query params
  useEffect(() => {
    console.log(code, 'state', state, 'effectiveTenantId', effectiveTenantId);

    if (code && state && !calledRef.current) {
      calledRef.current = true;
      setIsCallbackProcessing(true);
      setError(null);

      const handleAuthCallback = async () => {
        try {
          const { facebookAuthCallback } = await import('@/services/api');
          const response = await facebookAuthCallback(code, state);

          setCallbackStatus('success');
          setCallbackMessage(
            response?.data?.message ||
              response?.data?.data?.message ||
              'Meta account has been successfully linked!',
          );

          const resChannel =
            response?.data?.data?.channel ||
            response?.data?.channel ||
            response?.data?.result?.channel ||
            searchParams.get('channel');
          console.log(resChannel, 'resChannel', response?.data);

          setCallbackChannel(resChannel);

          // const resTenantId = response?.data?.data?.tenantId || response?.data?.data?.tanentId || response?.data?.tenantId || response?.data?.tanentId || effectiveTenantId;
          // setCallbackTenantId(resTenantId);
        } catch (err: any) {
          console.error('Error during Meta onboarding callback:', err);
          setCallbackStatus('error');
          setCallbackMessage(
            err?.response?.data?.message ||
              err?.message ||
              'An error occurred while linking your Meta account.',
          );
        } finally {
          setIsCallbackProcessing(false);
        }
      };

      handleAuthCallback();
    }
  }, [code, state, searchParams, effectiveTenantId]);

  const connectChannel = (selectedChannel: 'whatsapp' | 'instagram' | 'messenger' | string) => {
    if (!effectiveTenantId) {
      setError('Please log in or verify your Tenant ID / Company UUID to proceed.');
      return;
    }
    setError(null);

    // Fallback to whatsapp if no channel is explicitly provided
    const channelToConnect = selectedChannel || 'whatsapp';

    // Redirect the browser to the API start endpoint
    window.location.href = `${apiBaseUrl}/auth/facebook/start?tenantId=${encodeURIComponent(effectiveTenantId)}&channel=${channelToConnect}`;
  };

  console.log(connectChannel);

  const displayStatus = callbackStatus || status;
  const displayMessage = callbackMessage || message;
  const displayChannel = callbackChannel || channel;

  const getChannelName = (chan: any) => {
    if (!chan) return '';
    if (typeof chan === 'string') return chan;
    return chan.name || chan.channelName || JSON.stringify(chan);
  };

  // Dynamically configure single button based on channel
  const getButtonConfig = (chan: string) => {
    switch (chan.toLowerCase()) {
      case 'whatsapp':
        return {
          text: 'Connect WhatsApp',
          className:
            'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.3)]',
          icon: (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.864-9.83.002-2.623-1.01-5.09-2.855-6.94C16.639 1.986 14.178 1.95 12.01 1.95c-5.442 0-9.866 4.414-9.87 9.831-.001 1.77.476 3.491 1.382 5.01l-.999 3.647 3.734-.972zm12.18-7.39c-.3-.15-1.782-.88-2.059-.98-.277-.1-.48-.15-.68.15-.2.3-.77.98-.94 1.18-.17.2-.35.225-.65.075-.3-.15-1.264-.467-2.407-1.485-.89-.793-1.49-1.773-1.665-2.07-.175-.3-.02-.46.13-.61.135-.13.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.68-1.64-.93-2.245-.245-.59-.49-.51-.68-.52-.175-.005-.375-.005-.575-.005-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.11 3.22 5.11 4.52.714.31 1.27.495 1.703.633.717.227 1.37.195 1.887.118.577-.085 1.782-.73 2.032-1.435.25-.705.25-1.31.175-1.435-.075-.125-.275-.2-.575-.35z" />
            </svg>
          ),
        };
      case 'instagram':
        return {
          text: 'Connect Instagram',
          className:
            'bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-[0_4px_20px_rgba(220,39,67,0.15)] hover:shadow-[0_4px_24px_rgba(220,39,67,0.3)]',
          icon: <Instagram className="h-5 w-5" />,
        };
      case 'messenger':
        return {
          text: 'Connect Messenger',
          className:
            'bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-[0_4px_20px_rgba(242,153,74,0.15)] hover:shadow-[0_4px_24px_rgba(242,153,74,0.3)]',
          icon: <MessageSquare className="h-5 w-5" />,
        };
      default:
        return {
          text: 'Connect Meta Account',
          className:
            'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white shadow-[0_4px_20px_rgba(15,23,42,0.15)] hover:shadow-[0_4px_24px_rgba(15,23,42,0.3)]',
          icon: <Sparkles className="h-5 w-5 text-amber-400" />,
        };
    }
  };
  console.log(getButtonConfig);

  // const buttonConfig = getButtonConfig(activeChannel);

  return (
    <div className="relative min-h-screen w-screen bg-white overflow-hidden flex items-center justify-center p-4 sm:p-6">
      {/* Background decoration with soft, premium light hues */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-50/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-50/60 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-purple-50/40 blur-[100px] pointer-events-none" />

      {/* Main premium Container */}
      <div className="relative w-full max-w-[520px] bg-white border border-slate-100/90 shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-10 transition-all duration-300 hover:shadow-[0_24px_60px_rgba(0,0,0,0.09)]">
        {/* Decorative Header Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-bold tracking-wider text-slate-600 uppercase shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            Meta Integration Suite
          </div>
        </div>

        {/* Branding & Titles */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Meta Account Connect
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">Channel Onboarding</p>
        </div>

        {/* Form Inputs */}
        {/* <div className="space-y-6">
          {!displayStatus && (
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">
                Select Meta Service to Connect
              </span>

              <div className="flex flex-col gap-3.5">
                <button
                  type="button"
                  onClick={() => connectChannel(activeChannel)}
                  className={`relative group w-full h-[54px] cursor-pointer flex items-center justify-between rounded-2xl px-5 py-3.5 font-bold text-[15px] transition-all duration-300 transform active:scale-[0.98] ${buttonConfig.className}`}
                >
                  <div className="flex items-center gap-3">
                    {buttonConfig.icon}
                    <span>{buttonConfig.text}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </div> */}

        {/* Validation Error Feedback */}
        {error && (
          <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm animate-fadeIn">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Callback Processing State */}
        {isCallbackProcessing && (
          <div className="mt-6 flex flex-col items-center justify-center p-8 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-orange-600 mb-4" />
            <p className="font-bold text-sm text-slate-700 text-center animate-pulse">
              Finalizing Meta Integration...
            </p>
            <p className="text-xs text-slate-500 text-center mt-1">Please keep this page open.</p>
          </div>
        )}

        {/* Dynamic Status / Feedback Panel from Redirect URL or Callback */}
        {displayStatus && !isCallbackProcessing && (
          <div className="mt-6 animate-fadeIn">
            {displayStatus === 'success' ? (
              <div className="flex flex-col gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-[14px]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-full text-white shadow-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                  </div>
                  <div>
                    <p className="font-extrabold text-emerald-900 text-base">
                      Successfully Connected!
                    </p>
                    <p className="text-emerald-700/90 text-xs font-semibold">
                      Meta channel onboarding complete.
                    </p>
                  </div>
                </div>

                <div className="border-t border-emerald-200/50 pt-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-700/80 font-bold uppercase tracking-wider text-[10px]">
                      Connected Channel
                    </span>
                    <span className="font-bold text-emerald-900 bg-emerald-100 px-3 py-0.5 rounded-full capitalize text-[11px] shadow-sm">
                      {getChannelName(displayChannel) || 'Meta Service'}
                    </span>
                  </div>

                  {/* {displayMessage && (
                    <div className="text-xs text-emerald-700/80 bg-white/80 p-3 rounded-xl border border-emerald-200/20 italic shadow-sm mt-1">
                      {displayMessage}
                    </div>
                  )} */}

                  {/* Option to navigate to settings */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/admin-settings/social-media-channels')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                      Go to Social Media Channels
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-5 rounded-2xl bg-red-50 border border-red-100 text-red-800 text-[14px]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 rounded-full text-white shadow-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                  </div>
                  <div>
                    <p className="font-extrabold text-red-900 text-base">Connection Failed</p>
                    <p className="text-red-700/90 text-xs font-semibold">Authentication failed</p>
                  </div>
                </div>

                {displayMessage && (
                  <div className="text-xs text-red-700/80 bg-white/80 p-3 rounded-xl border border-red-200/20 shadow-sm mt-1">
                    {displayMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OmniChannelConnect;
