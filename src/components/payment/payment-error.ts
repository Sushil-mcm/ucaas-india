export const DEFAULT_PAYMENT_ERROR_MESSAGE =
  'Payment could not be completed. Please try again or use a different payment method.';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : null;

const getMessage = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const message = value.trim();
  return message || null;
};

const getNestedRecord = (record: UnknownRecord | null, key: string): UnknownRecord | null =>
  asRecord(record?.[key]);

export const getPaymentErrorMessage = (error: unknown): string => {
  const directMessage = getMessage(error);
  if (directMessage) return directMessage;

  const root = asRecord(error);
  if (!root) return DEFAULT_PAYMENT_ERROR_MESSAGE;

  const nestedError = getNestedRecord(root, 'error');
  const nestedErrorPaymentIntent =
    getNestedRecord(nestedError, 'payment_intent') || getNestedRecord(nestedError, 'paymentIntent');
  const paymentIntent =
    getNestedRecord(root, 'payment_intent') ||
    getNestedRecord(root, 'paymentIntent') ||
    nestedErrorPaymentIntent;
  const lastPaymentError =
    getNestedRecord(root, 'last_payment_error') ||
    getNestedRecord(paymentIntent, 'last_payment_error') ||
    getNestedRecord(nestedError, 'last_payment_error');
  const responseData = getNestedRecord(getNestedRecord(root, 'response'), 'data');
  const responseError = getNestedRecord(responseData, 'error');
  const data = getNestedRecord(root, 'data');
  const dataError = getNestedRecord(data, 'error');

  const messageCandidates = [
    lastPaymentError?.message,
    root.message,
    nestedError?.message,
    responseError?.message,
    responseData?.message,
    dataError?.message,
    data?.message,
  ];

  for (const candidate of messageCandidates) {
    const message = getMessage(candidate);
    if (message) return message;
  }

  const status = getMessage(root.status) || getMessage(paymentIntent?.status);
  if (status === 'requires_action') {
    return 'Payment authentication was not completed. Please try again.';
  }
  if (status === 'requires_payment_method') {
    return 'The payment method was declined. Please try another payment method.';
  }
  if (status === 'canceled') {
    return 'The payment was canceled. Please try again.';
  }
  if (status === 'processing') {
    return 'Your payment is still processing. Please check its status before trying again.';
  }

  return DEFAULT_PAYMENT_ERROR_MESSAGE;
};
