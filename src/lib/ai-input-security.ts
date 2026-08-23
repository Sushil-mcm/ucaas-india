const HTML_TAGS = /<[^>]*>/g;
const ANGLE_BRACKETS = /[<>]/g;
const TEMPLATE_EXPRESSIONS = /\{\{[\s\S]*?\}\}|\$\{[\s\S]*?\}/g;
const TEMPLATE_DELIMITERS = /\{\{|\}\}|\$\{/g;
const ENVIRONMENT_REFERENCES = /\b(?:process|import\.meta|deno)\s*\.\s*env\b/gi;
const PATH_TRAVERSAL_SEGMENTS = /(?:\.\.[/\\])+/g;
const SQL_COMMENTS = /--|\/\*|\*\//g;
const DESTRUCTIVE_SQL_STATEMENTS =
  /\b(?:drop|alter|truncate)\s+(?:table|database)\b|\bdelete\s+from\b|\binsert\s+into\b|\bunion\s+select\b/gi;

const limitLength = (value: string, maxLength?: number) =>
  maxLength && maxLength > 0 ? value.slice(0, maxLength) : value;

const removeUnsafeControlCharacters = (value: string) =>
  Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint === 9 || codePoint === 10 || codePoint === 13 || codePoint >= 32;
    })
    .filter((character) => character.codePointAt(0) !== 127)
    .join('');

/**
 * Normalizes values that are stored and rendered as plain text by the AI tools UI.
 * React escapes these values on render; removing markup here also prevents raw HTML
 * from being persisted by the create and update flows.
 */
export const sanitizeAiPlainText = (value: unknown, maxLength?: number): string => {
  const sanitized = removeUnsafeControlCharacters(String(value ?? ''))
    .replace(HTML_TAGS, ' ')
    .replace(ANGLE_BRACKETS, '');

  return limitLength(sanitized, maxLength);
};

/**
 * Applies the plain-text rules plus defense-in-depth filtering for values sent to
 * the AI instruction pipeline. Server-side parameterization and sandboxing are
 * still required; this prevents the known report payloads from leaving the UI.
 */
export const sanitizeAiPromptText = (value: unknown, maxLength?: number): string => {
  const sanitized = sanitizeAiPlainText(value)
    .replace(TEMPLATE_EXPRESSIONS, '')
    .replace(TEMPLATE_DELIMITERS, '')
    .replace(ENVIRONMENT_REFERENCES, 'environment')
    .replace(PATH_TRAVERSAL_SEGMENTS, '')
    .replace(SQL_COMMENTS, ' ')
    .replace(DESTRUCTIVE_SQL_STATEMENTS, '');

  return limitLength(sanitized, maxLength);
};

export const sanitizeAiSearchText = (value: unknown, maxLength = 100): string =>
  sanitizeAiPlainText(value, maxLength).replace(/[\r\n\t]+/g, ' ');

const sanitizeKnownFields = (source: Record<string, any>, promptFields: string[] = []) => {
  const result = { ...source };
  const plainTextFields = [
    'agentName',
    'name',
    'company',
    'companyBrand',
    'company_name',
    'description',
    'shortDescription',
    'short_description',
    'firstMessage',
    'first_message',
    'welcomeMessage',
    'greetingText',
    'role',
    'roleUseCase',
  ];

  plainTextFields.forEach((key) => {
    if (key in result) result[key] = sanitizeAiPlainText(result[key]);
  });
  promptFields.forEach((key) => {
    if (key in result) result[key] = sanitizeAiPromptText(result[key]);
  });
  if (Array.isArray(result.customGreetings)) {
    result.customGreetings = result.customGreetings.map((value: unknown) =>
      sanitizeAiPlainText(value),
    );
  }

  return result;
};

/** Sanitizes the known AI form fields when a partial editor resubmits an existing record. */
export const sanitizeAiAgentUpdateRecord = <T extends Record<string, any>>(record: T): T => {
  const sanitized = sanitizeKnownFields(record, ['systemPrompt', 'system_prompt']);
  const actionsKey = record.forward_call_actions
    ? 'forward_call_actions'
    : record.forwardCallActions
      ? 'forwardCallActions'
      : '';

  if (!actionsKey) return sanitized as T;

  const actions = { ...record[actionsKey] };
  const chatBuilder = actions.chatbot_builder;
  if (chatBuilder && typeof chatBuilder === 'object') {
    actions.chatbot_builder = {
      ...chatBuilder,
      brain: sanitizeKnownFields(chatBuilder.brain || {}, ['systemPrompt']),
    };
  }

  const receptionistBuilder = actions.receptionist_builder;
  if (receptionistBuilder && typeof receptionistBuilder === 'object') {
    actions.receptionist_builder = {
      ...receptionistBuilder,
      basics: sanitizeKnownFields(receptionistBuilder.basics || {}, ['systemPrompt']),
      greeting: sanitizeKnownFields(receptionistBuilder.greeting || {}),
    };
  }

  return { ...sanitized, [actionsKey]: actions } as T;
};
