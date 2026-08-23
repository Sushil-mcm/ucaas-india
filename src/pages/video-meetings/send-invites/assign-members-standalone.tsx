import { FC } from 'react';
import MemberSelectionModal from './member-selection-modal';

interface AssignMembersStandaloneModalProps {
  isPending?: boolean;
  formInstance: any;
  modalState: any;
  setModalState: (open: any) => void;
  handleSendInvite?: (members: any[]) => void;
  type?: string;
}

const AssignMembersStandaloneModal: FC<AssignMembersStandaloneModalProps> = ({
  handleSendInvite,
  ...props
}) => (
  <MemberSelectionModal {...props} handleSubmitMembers={(members) => handleSendInvite?.(members)} />
);

export default AssignMembersStandaloneModal;
