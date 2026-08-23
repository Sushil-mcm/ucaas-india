import SideDrawer from '@/components/custom/side-drawer';
import TextEditor from '@/components/custom/text-editor';

const OverviewScript = ({ modalState, setModalState }: { modalState: any; setModalState: any }) => {
  return (
    <SideDrawer
      isOpen={modalState?.isModalOpen}
      width="25%"
      title="Script Overview"
      isHeader={true}
      handleClose={() => setModalState({ isModalOpen: false, selectedCampaign: null })}
      content={
        <TextEditor
          key={modalState.selectedCampaign?.script}
          initialValue={
            modalState.selectedCampaign?.script || [
              {
                type: 'paragraph',
                children: [{ text: '' }],
              },
            ]
          }
          readOnly={true}
          // maxHeight={'10px'}
          maxHeight={'max-h-[calc(100vh_-_14.1rem)]'}
        />
      }
    />
  );
};

export default OverviewScript;
