import NotesWidget from '@/components/notes';

const NotesView = ({
  contactId,
  sipcall_id,
  customClass = 'h-[calc(100vh_-_145px)]',
  readOnly = false,
  initialNotes = [],
  drawerCallData,
}: {
  contactId?: string;
  sipcall_id?: string;
  customClass?: string;
  readOnly?: boolean;
  initialNotes?: any[];
  drawerCallData?: any;
}) => {
  return (
    <NotesWidget
      contactId={contactId ?? null}
      sipCallId={sipcall_id}
      customClass={customClass}
      sipCallIdMode={true}
      readOnly={readOnly}
      initialNotes={initialNotes}
      drawerCallData={drawerCallData}
    />
  );
};

export default NotesView;
