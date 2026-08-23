import { Dispatch, SetStateAction } from 'react';

export type ContactDataType = {
  _id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  contactPic?: string;
  uuid?: string;
  first_name: string;
  last_name: string;
  avatar: File | string | null;
  company?: string;
  webpage?: string;
  street?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  notes?: string;
  title?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  whatsapp?: string;
  instagram?: string;
  telegram?: string;
  address?: any;
  social?: any;
};
type TabDataType = Record<string, any>;

export interface CreateNewContactProps {
  contactData?: any | null;
  setTabData?: (data: TabDataType) => void;
  setDrawerState?: (open: boolean) => void;
  isDisable?: boolean;
  setIsDisable?: Dispatch<SetStateAction<boolean>>;
  keepFormDataAfterSave?: boolean;
  handleClose?: () => void;
  isLead?: boolean;
  prefillPhone?: string;
  hideCancelButton?: boolean;
}

export type ContactFormValues = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: { label: string; value: string } | null;
  dob: string;
  avatar: File | string | null;
  company?: string;
  webpage?: string;
  title?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  whatsapp?: string;
  instagram?: string;
  telegram?: string;
  street?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: any;
  notes?: string;
  belongsTo: any;
};

export interface ContactListProps {
  setTabData: (contact: ContactDataType) => void;
  contactListData: ContactDataType[];
  isPending: boolean;
  tabData: any;
  setDrawerState: any;
  drawerState: any;
  refetch?: any;
  isFetching?: any;
  isRefetching?: any;
  isDisable?: boolean;
  setIsDisable?: any;
}

export interface ContactOutletContext {
  tabData: any;
  setTabData: any;
  totalContactList: any;
}
