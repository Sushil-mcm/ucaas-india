export const agenticRoutes = {
  GET_ENGINE_SETTINGS: {
    METHOD: 'GET',
    URL: '/api/settings',
  },
  UPDATE_ENGINE_SETTINGS: {
    METHOD: 'PUT',
    URL: '/api/settings',
  },
  GET_ASSISTANT_BY_SOURCE_AGENT: {
    METHOD: 'GET',
    URL: '/api/assistants/by-source-agent',
  },
  CREATE_ASSISTANT: {
    METHOD: 'POST',
    URL: '/api/assistants',
  },
  UPDATE_ASSISTANT: {
    METHOD: 'PUT',
    URL: '/api/assistants',
  },
  DELETE_ASSISTANT: {
    METHOD: 'DELETE',
    URL: '/api/assistants',
  },
  CHAT_WITH_ASSISTANT: {
    METHOD: 'POST',
    URL: '/api/assistants',
  },
  LIST_ASSISTANTS: {
    METHOD: 'GET',
    URL: '/api/assistants',
  },
  LIST_INBOXES: {
    METHOD: 'GET',
    URL: '/api/inboxes',
  },
  CREATE_INBOX: {
    METHOD: 'POST',
    URL: '/api/inboxes',
  },
  UPDATE_INBOX: {
    METHOD: 'PUT',
    URL: '/api/inboxes',
  },
  DELETE_INBOX: {
    METHOD: 'DELETE',
    URL: '/api/inboxes',
  },
  REGENERATE_INBOX_TOKEN: {
    METHOD: 'POST',
    URL: '/api/inboxes',
  },
  LIST_CONVERSATIONS: {
    METHOD: 'GET',
    URL: '/api/conversations',
  },
  GET_CONVERSATION_MESSAGES: {
    METHOD: 'GET',
    URL: '/api/conversations',
  },
  SEND_AGENT_MESSAGE: {
    METHOD: 'POST',
    URL: '/api/conversations',
  },
  PAUSE_AI: {
    METHOD: 'POST',
    URL: '/api/conversations',
  },
  RESUME_AI: {
    METHOD: 'POST',
    URL: '/api/conversations',
  },
  LIST_TOOLS: {
    METHOD: 'GET',
    URL: '/api/tools',
  },
  CREATE_TOOL: {
    METHOD: 'POST',
    URL: '/api/tools',
  },
  UPDATE_TOOL: {
    METHOD: 'PUT',
    URL: '/api/tools',
  },
  DELETE_TOOL: {
    METHOD: 'DELETE',
    URL: '/api/tools',
  },
  SET_ASSISTANT_TOOLS: {
    METHOD: 'PUT',
    URL: '/api/assistants',
  },
  LIST_DOCUMENTS: {
    METHOD: 'GET',
    URL: '/api/assistants',
  },
  ADD_DOCUMENT_URL: {
    METHOD: 'POST',
    URL: '/api/assistants',
  },
  UPLOAD_DOCUMENT: {
    METHOD: 'POST',
    URL: '/api/assistants',
  },
  DELETE_DOCUMENT: {
    METHOD: 'DELETE',
    URL: '/api/assistants',
  },
};
