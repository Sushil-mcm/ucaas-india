import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { DialpadSession } from '@/context/dialpad-context';
import { getAiBaseUrl } from '@/lib/utils';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type DialpadScreenState = 'idle' | 'ringing' | 'connected' | 'ended';

type DialpadAiConversationOverviewProps = {
  session: DialpadSession | null;
  dialpadScreen: DialpadScreenState;
};

type AiConversationMessage = {
  id: string;
  role: string;
  text: string;
};

const AI_CONVERSATION_ACCORDION_VALUE = 'ai-conversation-overview';

const getHeaderFirstValue = (
  headers: DialpadSession['headers'] | null | undefined,
  headerName: string,
): string => {
  if (!headers) return '';

  const normalizedHeaderName = headerName.trim().toLowerCase();
  const matchingHeaderEntry = Object.entries(headers).find(
    ([name]) => name.trim().toLowerCase() === normalizedHeaderName,
  );
  if (!matchingHeaderEntry) return '';

  const [, values] = matchingHeaderEntry;
  if (!Array.isArray(values) || values.length === 0) return '';
  return String(values[0] || '').trim();
};

const DialpadAiConversationOverview = ({
  session,
  dialpadScreen,
}: DialpadAiConversationOverviewProps) => {
  const [accordionValue, setAccordionValue] = useState('');
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [conversationStatusCode, setConversationStatusCode] = useState<number | null>(null);
  const [conversationMessages, setConversationMessages] = useState<AiConversationMessage[]>([]);

  const aiAgentId = useMemo(
    () => getHeaderFirstValue(session?.headers, 'x-aiagentid'),
    [session?.headers],
  );
  const aiKey = useMemo(() => getHeaderFirstValue(session?.headers, 'x-aikey'), [session?.headers]);
  const aiSessionId = useMemo(
    () => getHeaderFirstValue(session?.headers, 'x-aisessionid'),
    [session?.headers],
  );
  const hasAiConversationHeaders = Boolean(aiAgentId && aiKey && aiSessionId);

  useEffect(() => {
    if (!hasAiConversationHeaders) {
      setAccordionValue('');
      return;
    }

    console.log('[DialpadAiConversationOverview] AI session headers', {
      sessionId: session?.id,
      aiAgentId,
      aiKey,
      aiSessionId,
    });
  }, [aiAgentId, aiKey, aiSessionId, hasAiConversationHeaders, session?.id]);

  useEffect(() => {
    if (!hasAiConversationHeaders) return;

    const controller = new AbortController();

    const fetchAiSessionDetails = async () => {
      setIsConversationLoading(true);
      setConversationStatusCode(null);
      setConversationMessages([]);

      try {
        const query = new URLSearchParams({
          token: aiKey,
          agentId: aiAgentId,
          sessionId: aiSessionId,
        });
        const response = await fetch(
          `${getAiBaseUrl()}/api/agent/session/get/id?${query.toString()}`,
          {
            signal: controller.signal,
          },
        );

        const responseContentType = response.headers.get('content-type') || '';
        const responsePayload = responseContentType.includes('application/json')
          ? await response.json()
          : await response.text();

        setConversationStatusCode(response.status);

        if (response.status === 200) {
          const rawMessages = Array.isArray((responsePayload as any)?.data?.messages)
            ? (responsePayload as any).data.messages
            : Array.isArray((responsePayload as any)?.messages)
              ? (responsePayload as any).messages
              : [];

          const parsedMessages: AiConversationMessage[] = rawMessages
            .map((message: any, index: number) => ({
              id: String(message?._id || `${index}-${message?.createdAt || Date.now()}`),
              role: String(message?.role || message?.type || '')
                .trim()
                .toLowerCase(),
              text: String(message?.data || message?.text || message?.message || '').trim(),
            }))
            .filter((message: AiConversationMessage) => Boolean(message.text));

          setConversationMessages(parsedMessages);
        }

        console.log('[DialpadAiConversationOverview] AI session API response', {
          ok: response.ok,
          status: response.status,
          data: responsePayload,
        });
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') return;
        setConversationStatusCode(0);
        setConversationMessages([]);
        console.error('[DialpadAiConversationOverview] Failed to fetch AI session details', error);
      } finally {
        if (!controller.signal.aborted) {
          setIsConversationLoading(false);
        }
      }
    };

    void fetchAiSessionDetails();

    return () => {
      controller.abort();
    };
  }, [aiAgentId, aiKey, aiSessionId, hasAiConversationHeaders]);

  useEffect(() => {
    if (dialpadScreen === 'idle' || dialpadScreen === 'ringing') {
      setAccordionValue('');
    }
  }, [dialpadScreen]);

  if (!hasAiConversationHeaders) {
    return null;
  }

  return (
    <div className="relative mb-2 mt-1">
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={(value) => setAccordionValue(value)}
      >
        <AccordionItem value={AI_CONVERSATION_ACCORDION_VALUE} className="relative border-0">
          <AccordionContent className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-20 max-h-[75vh] !pb-0 !pt-0">
            <div className="flex max-h-[72vh] min-h-[20rem] flex-col rounded-2xl border border-[#d6e4ff] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(17,58,112,0.16)]">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-[#1f4f8f]" />
                  <p className="truncate text-[12px] font-semibold text-[#183960]">
                    AI Conversation Details
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setAccordionValue('');
                  }}
                  className="rounded-md border border-[#dbe7ff] bg-[#f7faff] p-1 text-[#4b6792] transition hover:bg-[#edf4ff]"
                  aria-label="Close AI conversation details"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {isConversationLoading ? (
                <div className="flex min-h-[12rem] flex-1 items-center rounded-xl border border-[#e5eeff] bg-[#f8fbff] px-2.5 py-2 text-[11px] font-medium text-[#4b6792]">
                  Loading conversation...
                </div>
              ) : conversationStatusCode === 200 ? (
                <div className="max-h-[56vh] min-h-[16rem] flex-1 space-y-2 overflow-y-auto rounded-xl border border-[#e5eeff] bg-[#f8fbff] px-2.5 py-2">
                  {conversationMessages.length > 0 ? (
                    conversationMessages.map((message) => {
                      const isBotMessage = message.role === 'bot';
                      const speakerLabel = isBotMessage ? 'AI Agent' : 'User';

                      return (
                        <div
                          key={message.id}
                          className={`max-w-[88%] rounded-xl px-3 py-2 text-xs sm:text-sm ${
                            isBotMessage
                              ? 'mr-auto bg-[#f5f8ff] text-[#2d4668]'
                              : 'ml-auto bg-ucass-active-bg text-[#1d3556]'
                          }`}
                        >
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#5f7392] sm:text-[11px]">
                            {speakerLabel}
                          </p>
                          <p className="break-words leading-relaxed">{message.text}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[11px] font-medium text-[#4b6792]">
                      No conversation found for this session.
                    </div>
                  )}
                </div>
              ) : conversationStatusCode !== null ? (
                <div className="flex min-h-[12rem] flex-1 items-center rounded-xl border border-[#ffd8d8] bg-[#fff5f5] px-2.5 py-2 text-[11px] font-medium text-[#a33a3a]">
                  unable to get the conversation at this time. please try again later.
                </div>
              ) : null}
            </div>
          </AccordionContent>

          <AccordionTrigger
            variant="default"
            className="rounded-xl border border-ucass-active-bg bg-gradient-to-r from-[#f8fbff] to-[#f1f7ff] px-3 py-2 hover:no-underline"
          >
            <div className="flex w-full min-w-0 items-center justify-between gap-2 text-left">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[#1f4f8f]" />
                <p className="truncate text-[12px] font-semibold text-[#183960]">
                  This call has AI conversation
                </p>
              </div>
            </div>
          </AccordionTrigger>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default DialpadAiConversationOverview;
