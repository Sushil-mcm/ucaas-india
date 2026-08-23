import { OrganizationContext } from '@/context/organization-context';
import { useContext } from 'react';

export const useOrganization = () => useContext(OrganizationContext);
