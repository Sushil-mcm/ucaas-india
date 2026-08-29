import { agenticApiClient } from './axios';
import { agenticRoutes } from './routes';

export interface EngineSettings {
  isEnabled: boolean;
  defaultModelName: string;
  defaultTemperature: number;
  availableModels: string[];
}

export interface Assistant {
  id: string;
  sourceAgentId: string | null;
  name: string;
  persona: string;
  productName: string;
  isEnabled: boolean;
  modelProvider: string;
  modelName: string;
  temperature: number;
  guardrails: string[];
  guidelines: string[];
  toolIds: string[];
}

export interface AssistantUpsertPayload {
  sourceAgentId?: string;
  name: string;
  persona: string;
  productName: string;
  modelName?: string;
  temperature?: number;
  isEnabled?: boolean;
  guardrails: string[];
  guidelines: string[];
}

export const getEngineSettings = () =>
  agenticApiClient({
    method: agenticRoutes.GET_ENGINE_SETTINGS.METHOD,
    url: agenticRoutes.GET_ENGINE_SETTINGS.URL,
  });

export const updateEngineSettings = (data: Pick<EngineSettings, 'isEnabled' | 'defaultModelName' | 'defaultTemperature'>) =>
  agenticApiClient({
    method: agenticRoutes.UPDATE_ENGINE_SETTINGS.METHOD,
    url: agenticRoutes.UPDATE_ENGINE_SETTINGS.URL,
    data,
  });

export const getAssistantBySourceAgentId = (sourceAgentId: string) =>
  agenticApiClient({
    method: agenticRoutes.GET_ASSISTANT_BY_SOURCE_AGENT.METHOD,
    url: agenticRoutes.GET_ASSISTANT_BY_SOURCE_AGENT.URL,
    params: { sourceAgentId },
    hideToastOnError: true,
  } as any);

export const createAssistant = (data: AssistantUpsertPayload) =>
  agenticApiClient({
    method: agenticRoutes.CREATE_ASSISTANT.METHOD,
    url: agenticRoutes.CREATE_ASSISTANT.URL,
    data,
  });

export const updateAssistant = (id: string, data: AssistantUpsertPayload) =>
  agenticApiClient({
    method: agenticRoutes.UPDATE_ASSISTANT.METHOD,
    url: `${agenticRoutes.UPDATE_ASSISTANT.URL}/${id}`,
    data,
  });

export const deleteAssistant = (id: string) =>
  agenticApiClient({
    method: agenticRoutes.DELETE_ASSISTANT.METHOD,
    url: `${agenticRoutes.DELETE_ASSISTANT.URL}/${id}`,
    hideToastOnError: true,
  } as any);

export const chatWithAssistant = (id: string, data: { conversationId?: string; message: string }) =>
  agenticApiClient({
    method: agenticRoutes.CHAT_WITH_ASSISTANT.METHOD,
    url: `${agenticRoutes.CHAT_WITH_ASSISTANT.URL}/${id}/chat`,
    data,
  });

export const listAssistants = () =>
  agenticApiClient({
    method: agenticRoutes.LIST_ASSISTANTS.METHOD,
    url: agenticRoutes.LIST_ASSISTANTS.URL,
  });

export interface PreChatField {
  name: string;
  label: string;
  type: 'text' | 'email';
  required: boolean;
}

export interface Inbox {
  id: string;
  accountId: string;
  assistantId: string | null;
  channel: 'website';
  name: string;
  widgetToken: string;
  isEnabled: boolean;
  welcomeTitle: string;
  welcomeTagline: string;
  greetingMessage: string;
  widgetColor: string;
  avatarUrl: string | null;
  replyTimeText: string;
  launcherTitle: string;
  bubblePosition: 'left' | 'right';
  preChatFormEnabled: boolean;
  preChatFormFields: PreChatField[];
  allowedDomains: string | null;
  allowEndConversation: boolean;
  csatEnabled: boolean;
  csatMessage: string;
  businessHoursEnabled: boolean;
  businessHoursTimezone: string;
  weeklySchedule: WeeklySchedule;
  awayMessage: string;
  embedSnippet: string;
  createdAt: string;
  updatedAt: string;
}

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export interface BusinessHoursRange {
  start: string;
  end: string;
}
export type WeeklySchedule = Partial<Record<DayKey, BusinessHoursRange[]>>;

export type InboxUpsertPayload = Partial<
  Omit<Inbox, 'id' | 'accountId' | 'channel' | 'widgetToken' | 'embedSnippet' | 'createdAt' | 'updatedAt'>
> & { name: string };

export const listInboxes = () =>
  agenticApiClient({
    method: agenticRoutes.LIST_INBOXES.METHOD,
    url: agenticRoutes.LIST_INBOXES.URL,
  });

export const getInbox = (id: string) =>
  agenticApiClient({
    method: agenticRoutes.LIST_INBOXES.METHOD,
    url: `${agenticRoutes.LIST_INBOXES.URL}/${id}`,
  });

export const createInbox = (data: InboxUpsertPayload) =>
  agenticApiClient({
    method: agenticRoutes.CREATE_INBOX.METHOD,
    url: agenticRoutes.CREATE_INBOX.URL,
    data,
  });

export const updateInbox = (id: string, data: Partial<InboxUpsertPayload>) =>
  agenticApiClient({
    method: agenticRoutes.UPDATE_INBOX.METHOD,
    url: `${agenticRoutes.UPDATE_INBOX.URL}/${id}`,
    data,
  });

export const deleteInbox = (id: string) =>
  agenticApiClient({
    method: agenticRoutes.DELETE_INBOX.METHOD,
    url: `${agenticRoutes.DELETE_INBOX.URL}/${id}`,
    hideToastOnError: true,
  } as any);

export const regenerateInboxToken = (id: string) =>
  agenticApiClient({
    method: agenticRoutes.REGENERATE_INBOX_TOKEN.METHOD,
    url: `${agenticRoutes.REGENERATE_INBOX_TOKEN.URL}/${id}/regenerate-token`,
  });

export interface AgentMessage {
  id: string;
  conversationId: string;
  role: 'system' | 'user' | 'assistant' | 'agent' | 'tool';
  content: string;
  createdAt: string;
}

export interface WebsiteConversation {
  id: string;
  inboxId: string | null;
  assistantId: string;
  channel: string;
  contactName: string | null;
  contactEmail: string | null;
  aiPaused: boolean;
  startedAt: string;
  lastMessageAt: string;
  inboxName: string | null;
}

export const listConversations = (inboxId?: string) =>
  agenticApiClient({
    method: agenticRoutes.LIST_CONVERSATIONS.METHOD,
    url: agenticRoutes.LIST_CONVERSATIONS.URL,
    params: inboxId ? { inboxId } : undefined,
  });

export const getConversationMessages = (id: string) =>
  agenticApiClient({
    method: agenticRoutes.GET_CONVERSATION_MESSAGES.METHOD,
    url: `${agenticRoutes.GET_CONVERSATION_MESSAGES.URL}/${id}/messages`,
  });

export const sendAgentMessage = (id: string, content: string) =>
  agenticApiClient({
    method: agenticRoutes.SEND_AGENT_MESSAGE.METHOD,
    url: `${agenticRoutes.SEND_AGENT_MESSAGE.URL}/${id}/messages`,
    data: { content },
  });

export const pauseConversationAi = (id: string) =>
  agenticApiClient({
    method: agenticRoutes.PAUSE_AI.METHOD,
    url: `${agenticRoutes.PAUSE_AI.URL}/${id}/pause-ai`,
  });

export const resumeConversationAi = (id: string) =>
  agenticApiClient({
    method: agenticRoutes.RESUME_AI.METHOD,
    url: `${agenticRoutes.RESUME_AI.URL}/${id}/resume-ai`,
  });

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description?: string;
  required: boolean;
}

export interface AgenticTool {
  id: string;
  accountId: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT';
  url: string;
  headers: Record<string, string>;
  parameters: ToolParameter[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ToolUpsertPayload = Partial<
  Omit<AgenticTool, 'id' | 'accountId' | 'createdAt' | 'updatedAt'>
> & { name: string; description: string; method: AgenticTool['method']; url: string };

export const listTools = () =>
  agenticApiClient({
    method: agenticRoutes.LIST_TOOLS.METHOD,
    url: agenticRoutes.LIST_TOOLS.URL,
  });

export const createTool = (data: ToolUpsertPayload) =>
  agenticApiClient({
    method: agenticRoutes.CREATE_TOOL.METHOD,
    url: agenticRoutes.CREATE_TOOL.URL,
    data,
  });

export const updateTool = (id: string, data: Partial<ToolUpsertPayload>) =>
  agenticApiClient({
    method: agenticRoutes.UPDATE_TOOL.METHOD,
    url: `${agenticRoutes.UPDATE_TOOL.URL}/${id}`,
    data,
  });

export const deleteTool = (id: string) =>
  agenticApiClient({
    method: agenticRoutes.DELETE_TOOL.METHOD,
    url: `${agenticRoutes.DELETE_TOOL.URL}/${id}`,
    hideToastOnError: true,
  } as any);

export const setAssistantTools = (assistantId: string, toolIds: string[]) =>
  agenticApiClient({
    method: agenticRoutes.SET_ASSISTANT_TOOLS.METHOD,
    url: `${agenticRoutes.SET_ASSISTANT_TOOLS.URL}/${assistantId}/tools`,
    data: { toolIds },
  });

export interface KnowledgeDocument {
  id: string;
  assistantId: string;
  sourceType: 'url' | 'pdf';
  sourceUrl: string | null;
  fileName: string | null;
  status: 'processing' | 'ready' | 'failed';
  errorMessage: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export const listDocuments = (assistantId: string) =>
  agenticApiClient({
    method: agenticRoutes.LIST_DOCUMENTS.METHOD,
    url: `${agenticRoutes.LIST_DOCUMENTS.URL}/${assistantId}/documents`,
  });

export const addDocumentFromUrl = (assistantId: string, url: string) =>
  agenticApiClient({
    method: agenticRoutes.ADD_DOCUMENT_URL.METHOD,
    url: `${agenticRoutes.ADD_DOCUMENT_URL.URL}/${assistantId}/documents/url`,
    data: { url },
  });

// Bypasses the shared agenticApiClient instance — it fixes Content-Type to
// application/json at creation, and overriding that per-request to let the
// browser set a correct multipart boundary is unreliable across axios
// versions. Auth headers are duplicated from axios.tsx's interceptor by hand.
export const uploadDocumentPdf = async (assistantId: string, file: File) => {
  const { getEnv, SESSION_NAME } = await import('@/lib/utils');
  const formData = new FormData();
  formData.append('file', file);

  const accessToken = localStorage.getItem(SESSION_NAME) || '';
  const orgId = localStorage.getItem('org_uuid') || '';

  const response = await fetch(`${getEnv().VITE_AGENTIC_API_URL}/api/assistants/${assistantId}/documents/upload`, {
    method: 'POST',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(orgId ? { 'X-ORG-ID': orgId } : {}),
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data?.error?.message || 'Upload failed'), { response: { data } });
  return { data };
};

export const deleteDocument = (assistantId: string, documentId: string) =>
  agenticApiClient({
    method: agenticRoutes.DELETE_DOCUMENT.METHOD,
    url: `${agenticRoutes.DELETE_DOCUMENT.URL}/${assistantId}/documents/${documentId}`,
    hideToastOnError: true,
  } as any);
