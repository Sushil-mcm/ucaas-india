import { FC } from 'react';
import MemberSelectionModal from './member-selection-modal';

interface InviteMembersModalProps {
  isPending?: boolean;
  formInstance: any;
  modalState: any;
  setModalState: (open: any) => void;
  handleSendInvite?: () => void;
  type?: string;
}

const InviteMembersModal: FC<InviteMembersModalProps> = ({ handleSendInvite, ...props }) => (
  <MemberSelectionModal {...props} handleSubmitMembers={() => handleSendInvite?.()} />
);

export default InviteMembersModal;
