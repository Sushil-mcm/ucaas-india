import { requiredString, selectFieldRequired } from '@/lib/schema';
import * as yup from 'yup';

export const formDefaultValues = {
  name: '',
  dialMethod: '',
  content: [
    {
      type: 'paragraph',
      children: [{ text: '' }],
    },
  ],
};

export const validationSchema = yup.object().shape({
  name: requiredString('Name'),
  dialMethod: selectFieldRequired('Type'),
  content: yup.array().test('not-empty', 'Content is required', (value) => {
    if (!value || value?.length === 0) return false;
    const text = value
      ?.map((node) => node?.children?.map((child: any) => child.text).join(''))
      .join('');
    const text2 = value
      ?.map((node) =>
        node?.children
          ?.map((child: any) => child?.children?.map((child: any) => child.text))
          .join(''),
      )
      .join('');

    return text.trim().length > 0 || text2.trim().length > 0;
  }),
});

export const dailMethodsArr = [
  { label: 'Preview Campaign', value: 'PREVIEW' },
  { label: 'Progressive Campaign', value: 'PROGRESSIVE' },
  { label: 'Predictive Campaign', value: 'PREDICTIVE' },
  { label: 'Queue', value: 'QUEUE' },
];
