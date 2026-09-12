import { requiredString, selectFieldRequired } from '@/lib/schema';
import { newScriptPage, normalizeScriptPages, scriptPageProblems } from '@/lib/script-pages';
import * as yup from 'yup';

export const formDefaultValues = {
  name: '',
  description: '',
  isTemplate: false,
  dialMethod: '',
  /* Draft until the admin presses Publish. A new script is not offered to a
     campaign or a queue on the strength of a first save. */
  status: 'draft' as 'draft' | 'published',
  pages: [newScriptPage([], '')],
};

export const validationSchema = yup.object().shape({
  name: requiredString('Name'),
  description: yup.string().trim().max(200, 'Keep the description under 200 characters'),
  isTemplate: yup.boolean(),
  dialMethod: selectFieldRequired('Type'),
  status: yup.string().oneOf(['draft', 'published']),
  /* The same checks the server runs (src/lib/script-pages.ts): every page
     has text, every rule points at a page that exists and names a choice the
     page offers. */
  pages: yup.array().test('pages', function (value) {
    const pages = normalizeScriptPages(value);
    if (!pages.length) return this.createError({ message: 'A script needs at least one page' });
    const problems = scriptPageProblems(pages);
    return problems.length ? this.createError({ message: problems.join(' ') }) : true;
  }),
});

export const dailMethodsArr = [
  { label: 'Preview Campaign', value: 'PREVIEW' },
  { label: 'Progressive Campaign', value: 'PROGRESSIVE' },
  { label: 'Predictive Campaign', value: 'PREDICTIVE' },
  { label: 'Queue', value: 'QUEUE' },
];

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
};
