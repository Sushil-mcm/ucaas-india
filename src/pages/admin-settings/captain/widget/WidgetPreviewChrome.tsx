// The header/body chrome around a widget preview — mirrors the real chat
// widget's floating panel ("chat bubble") or its full-page standalone view
// ("agent page"). Ported from Chatwoot's WidgetPreviewChrome.vue.

import { Bot, X } from 'lucide-react';
import type { ReactNode } from 'react';

export default function WidgetPreviewChrome({
  title,
  fullBleed = false,
  children,
}: {
  title?: string;
  fullBleed?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted ${
        fullBleed ? 'h-full w-full rounded-none' : 'h-[560px] w-[380px] rounded-2xl shadow-xl'
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 dark:border-border px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-muted">
          <Bot className="size-4 text-gray-500 dark:text-muted-foreground" />
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-foreground">{title}</p>
        <X className="size-4 shrink-0 text-gray-400 dark:text-muted-foreground" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}
