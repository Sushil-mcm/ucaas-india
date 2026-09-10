// Renders one `pending_templates` entry from a playground response as its own
// chat bubble — a lead/form/button/widget action's result, shown right after the
// assistant's text reply. Ported from Chatwoot's PlaygroundTemplatePreview.vue;
// reuses the same WidgetRenderer the widget builder's live preview uses.
import { useState } from 'react';
import WidgetRenderer from './WidgetRenderer';
import { widgetNavigateURL } from './helpers/navigate-url';
import type { WidgetField, WidgetNode } from './helpers/types';

type FormItem = { name: string; label: string; type: string; required: boolean };
type CardAction = { type: 'link' | 'postback'; text: string; uri?: string; payload?: string };
type CardItem = { title?: string; description?: string; actions: CardAction[] };

export type PendingTemplate = {
  title?: string;
  content_type: 'form' | 'cards' | 'widget';
  content_attributes: {
    items?: (FormItem | CardItem)[];
    schema?: WidgetField[];
    layout?: WidgetNode[];
    prefilled_values?: { name: string; value: unknown }[];
    custom_tool_id?: number;
  };
};

const cardCls =
  'flex w-full min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800';
const primaryBtnCls =
  'flex h-9 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 no-underline dark:bg-white dark:text-gray-900';
const fieldCls =
  'rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white';

const FormPreview = ({ items }: { items: FormItem[] }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const isValid = items.every((item) => !item.required || !!values[item.name]?.trim());

  return (
    <div className={cardCls}>
      {items.map((item) => (
        <div key={item.name} className="flex flex-col gap-1">
          <label className="text-xs font-medium capitalize text-gray-900 dark:text-white">
            {item.label}
            {!item.required && <span className="ml-1 font-normal text-gray-400 dark:text-neutral-500">(optional)</span>}
          </label>
          {item.type === 'text_area' ? (
            <textarea
              rows={2}
              disabled={submitted}
              value={values[item.name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [item.name]: e.target.value }))}
              className={`${fieldCls} py-2`}
            />
          ) : (
            <input
              type={item.type === 'email' ? 'email' : 'text'}
              disabled={submitted}
              value={values[item.name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [item.name]: e.target.value }))}
              className={`${fieldCls} h-9`}
            />
          )}
        </div>
      ))}
      {!submitted ? (
        <button type="button" disabled={!isValid} onClick={() => setSubmitted(true)} className={primaryBtnCls}>
          Submit
        </button>
      ) : (
        <p className="mb-0 text-xs italic text-gray-400 dark:text-neutral-500">
          Submitted — this is a preview, nothing was actually sent.
        </p>
      )}
    </div>
  );
};

const WidgetPreview = ({
  contentAttributes,
  onPostback,
}: {
  contentAttributes: PendingTemplate['content_attributes'];
  onPostback: (message: string) => void;
}) => {
  const [submittedValues, setSubmittedValues] = useState<{ name: string; value: unknown }[]>([]);
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <WidgetRenderer
        schema={contentAttributes.schema || []}
        layout={contentAttributes.layout || []}
        prefillValues={contentAttributes.prefilled_values || []}
        submittedValues={submittedValues}
        onSubmit={(values) => setSubmittedValues(Object.entries(values).map(([name, value]) => ({ name, value })))}
        onInvokeFunction={(payload) => {
          if (payload.type === 'navigate') {
            const target = widgetNavigateURL(payload.url, payload.values, payload.valueKeys);
            if (target) window.open(target, '_blank', 'noopener,noreferrer');
            return;
          }
          if (payload.type === 'send_message') {
            onPostback(payload.message || payload.label || '');
          } else if (payload.type === 'call_tool') {
            onPostback(payload.label || '');
          }
        }}
      />
      {/* Playground has no real conversation to post a success message into —
          without this, submitting looked like nothing happened. */}
      {submittedValues.length > 0 && (
        <p className="mb-0 text-xs italic text-gray-400 dark:text-neutral-500">
          Submitted — this is a preview, nothing was actually sent.
        </p>
      )}
    </div>
  );
};

const CardsPreview = ({ items, onPostback }: { items: CardItem[]; onPostback: (message: string) => void }) => (
  <div className="flex flex-col gap-3">
    {items.map((card, i) => (
      <div key={i} className="flex w-full max-w-56 min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        {card.title && <p className="mb-0 text-sm font-semibold text-gray-900 dark:text-white">{card.title}</p>}
        {card.description && <p className="mb-0 text-xs text-gray-500 dark:text-neutral-400">{card.description}</p>}
        <div className="flex flex-col gap-1.5">
          {card.actions.map((action, ai) =>
            action.type === 'link' ? (
              <a key={ai} href={action.uri} target="_blank" rel="noopener noreferrer" className={`${primaryBtnCls} text-center`}>
                {action.text}
              </a>
            ) : (
              <button key={ai} type="button" onClick={() => onPostback(action.payload || action.text)} className={primaryBtnCls}>
                {action.text}
              </button>
            ),
          )}
        </div>
      </div>
    ))}
  </div>
);

export default function PlaygroundTemplate({
  template,
  onPostback,
}: {
  template: PendingTemplate;
  onPostback: (message: string) => void;
}) {
  const { content_type, content_attributes } = template;

  if (content_type === 'widget') {
    return <WidgetPreview contentAttributes={content_attributes} onPostback={onPostback} />;
  }

  if (content_type === 'cards') {
    return <CardsPreview items={(content_attributes.items || []) as CardItem[]} onPostback={onPostback} />;
  }

  return <FormPreview items={(content_attributes.items || []) as FormItem[]} />;
}
