import { requiredAllString, requiredString } from '@/lib/schema';
import * as yup from 'yup';

export const telegramChannelInitialValues = {
  username: '',
  token: '',
};
export const telegramChannelSchema = yup.object().shape({
  username: requiredString('Username'),
  token: requiredAllString('Token'),
});
