import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

// Assistant replies come back as Markdown (numbered lists of records, bold field
// labels, links). Render it the same way the messenger AI-assist panel does —
// react-markdown + gfm + breaks, HTML disabled — so every surface that shows an
// assistant/agent reply (Playground, the toolkit test panel, conversation
// threads) matches the reference Floatchat dashboard, which renders assistant
// messages through markdown-it. User/visitor messages stay literal.
const mdPlugins = [remarkGfm, remarkBreaks];

const mdClassName = [
  'text-sm leading-relaxed break-words',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
  '[&_p]:mb-2',
  // Headings: kept modest since these render inside a chat bubble, not an
  // article — a full h1 scale would blow out the bubble width.
  '[&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-[15px] [&_h1]:font-bold',
  '[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-[14.5px] [&_h2]:font-bold',
  '[&_h3]:mb-1.5 [&_h3]:mt-2.5 [&_h3]:text-sm [&_h3]:font-bold',
  '[&_h4]:mb-1.5 [&_h4]:mt-2 [&_h4]:text-sm [&_h4]:font-semibold',
  '[&_h5]:mb-1 [&_h5]:mt-2 [&_h5]:text-sm [&_h5]:font-semibold',
  '[&_h6]:mb-1 [&_h6]:mt-2 [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:opacity-80',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:mb-1 [&_li>p]:mb-0.5',
  // Task lists (GFM `- [ ] foo`): drop the bullet, align the checkbox with text.
  '[&_li.task-list-item]:ml-[-1.25rem] [&_li.task-list-item]:list-none',
  '[&_li.task-list-item_input]:mr-1.5 [&_li.task-list-item_input]:translate-y-[1px]',
  '[&_strong]:font-semibold',
  '[&_em]:italic',
  '[&_del]:line-through [&_del]:opacity-70',
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 dark:[&_blockquote]:border-gray-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:opacity-80',
  '[&_hr]:my-3 [&_hr]:border-gray-200 dark:[&_hr]:border-gray-700',
  '[&_code]:rounded [&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px]',
  '[&_pre]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-50 dark:[&_pre]:bg-gray-800 [&_pre]:p-2',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_table]:my-2 [&_table]:border-collapse [&_table]:text-xs',
  '[&_th]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-600 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
  '[&_td]:border [&_td]:border-gray-200 dark:[&_td]:border-gray-700 [&_td]:px-2 [&_td]:py-1',
  '[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg',
].join(' ');

const mdComponents: Components = {
  a: ({ node, ...props }) => {
    void node;
    return (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all transition-colors"
      />
    );
  },
  // GFM task-list checkboxes render read-only — these are a snapshot of the
  // assistant's reply, not an interactive form.
  input: ({ node, ...props }) => {
    void node;
    return <input {...props} disabled className="align-middle accent-primary" />;
  },
};

export const FormattedMessage = ({ content, isUser }: { content: string; isUser: boolean }) => {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }
  return (
    <div className={mdClassName}>
      <ReactMarkdown remarkPlugins={mdPlugins} components={mdComponents} skipHtml>
        {content || ''}
      </ReactMarkdown>
    </div>
  );
};

export default FormattedMessage;
