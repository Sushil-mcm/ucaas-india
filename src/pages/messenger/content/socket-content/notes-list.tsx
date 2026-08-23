import { useEffect, useState } from 'react';
import { ArrowLeft, NotebookPenIcon, PlusIcon } from 'lucide-react';
import moment from 'moment';
import TextEditor from '@/components/custom/text-editor';
import { Button } from '@/components/ui/button';
import { EditStrokIcon, TrashBin } from '@/assets/icons';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useUser } from '@/hooks/use-user';
import { useSearchParamManager } from '@/hooks/use-search-params';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useCompanyFeatures } from '@/hooks/rbac';
import CustomTooltip from '@/components/custom/custom-tooltip';

const defaultEditorValue = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

const NotesList = ({ selectedChat, setActiveState }: any) => {
  const [addNotes, setAddNotes] = useState(false);
  const [currentNote, setCurrentNote] = useState<any>({ title: '', content: [] });
  const isEdit = currentNote?._id ? true : false;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [deleteAlertModal, setDeleteAlertModal] = useState<any>(null);
  const { features } = useCompanyFeatures();
  const chatAccess = features?.plan_features?.chat?.action || {};
  const { getParam } = useSearchParamManager();
  const noteId: any = getParam('noteId');

  const { handleCreateNote, notesList, getNotesByChatId, handleDeleteNote, handleUpdateNote } =
    useSocketEvents();

  const currentChatNotes =
    notesList?.filter((item) => item?.chatId === selectedChat?.chatId)?.[0]?.notes || [];

  const { user } = useUser();

  const otherUserData = selectedChat?.users?.find((item: any) => item?.uuid !== user?.uuid);

  const handleSave = () => {
    if (!currentNote?.title && !currentNote?.content) return;

    if (isEdit) {
      handleUpdateNote({
        noteId: currentNote?._id,
        senderId: user?.uuid,
        receiverId: selectedChat?.isGroupChat
          ? selectedChat?.users
              ?.map((item: any) => item?.uuid)
              ?.filter((item: any) => item !== user?.uuid)
          : [otherUserData?.uuid],
        title: currentNote?.title,
        noteData: currentNote?.content,
      });
      setCurrentNote(null);
      setAddNotes(false);
    } else {
      handleCreateNote({
        chatId: selectedChat?.chatId,
        creatorId: user?.uuid,
        receiverId: selectedChat?.isGroupChat
          ? selectedChat?.users
              ?.map((item: any) => item?.uuid)
              ?.filter((item: any) => item !== user?.uuid)
          : [otherUserData?.uuid],
        title: currentNote?.title,
        noteData: currentNote?.content,
      });
      setCurrentNote(null);
      setAddNotes(false);
    }
  };

  const handleEdit = (note: any) => {
    setCurrentNote({ content: note?.noteData, ...note });
    setAddNotes(true);
  };

  useEffect(() => {
    if (selectedChat?.chatId && user?.uuid) {
      if (!notesList?.map((v: any) => v?.chatId).includes(selectedChat?.chatId)) {
        getNotesByChatId({ chatId: selectedChat?.chatId, senderId: user?.uuid });
      }
    }
  }, [selectedChat?.chatId, user?.uuid]);

  return (
    <div className="w-full flex flex-col h-full bg-[var(--color-bg-gray-50)] overflow-hidden">
      <div className="w-full shrink-0 px-4 bg-white flex items-center justify-between border-b min-h-[56px] lg:min-h-[65px] border-b-gray-200">
        <div className="cursor-pointer" onClick={() => setActiveState('message')}>
          <div className="flex gap-2 items-center">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm lg:text-base font-semibold text-gray-900">Notes</h3>
          </div>
        </div>
        {chatAccess?.create_note && (
          <div
            className="cursor-pointer w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-primary hover:text-white"
            onClick={() => {
              setAddNotes(true);
              setCurrentNote({ title: 'Untitled Note', content: defaultEditorValue });
            }}
          >
            <CustomTooltip text="Add Note">
              <PlusIcon className="w-5 h-5" />
            </CustomTooltip>
          </div>
        )}
      </div>

      {addNotes && (
        <div className="flex-1 w-full bg-white lg:bg-[var(--color-bg-gray-50)] p-4 flex flex-col min-h-0 overflow-hidden">
          <div className="w-full h-full flex flex-col justify-between bg-white rounded-xl pb-3">
            <div className="w-full flex flex-col gap-2 ">
              {isEditingTitle ? (
                <div className="flex flex-col gap-1 border-b border-gray-200 relative">
                  <input
                    autoFocus
                    className="text-sm font-semibold border-b border-gray-300 focus:border-gray-200 rounded-lg outline-none px-4 py-2 h-10 rounded-none border-t-none border-r-none border-l-none"
                    value={currentNote?.title}
                    maxLength={100}
                    onChange={(e) =>
                      setCurrentNote((prev: any) => ({ ...prev, title: e.target.value }))
                    }
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setIsEditingTitle(false);
                      }
                    }}
                  />
                  <span className="text-xs text-gray-400 absolute right-2 bottom-3">
                    {currentNote?.title?.length ?? 0}/100
                  </span>
                </div>
              ) : (
                <h2
                  className="text-md font-semibold cursor-pointer border-b border-gray-200 h-10 min-h-10 px-4 flex items-center text-sm text-primary text-ellipsis overflow-hidden whitespace-nowrap"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {currentNote?.title || 'Untitled Note'}
                </h2>
              )}
              <div className="w-full px-4">
                <TextEditor
                  initialValue={currentNote?.content || defaultEditorValue}
                  onChange={(val: any) =>
                    setCurrentNote((prev: any) => ({ ...prev, content: val }))
                  }
                  readOnly={false}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-3">
              <Button
                variant="transparent"
                onClick={() => {
                  setAddNotes(false);
                  setCurrentNote(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="outline" onClick={() => handleSave()}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!addNotes ? (
        currentChatNotes?.length > 0 ? (
          <div className="flex-1 w-full bg-white lg:bg-[var(--color-bg-gray-50)] p-4 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                {currentChatNotes?.map((note: any) => {
                  return (
                    <div
                      key={JSON.stringify(note)}
                      className={`flex flex-col gap-2 p-3 border rounded-sm   ${noteId === note?._id ? 'bg-yellow-50' : 'bg-white hover:bg-ucass-active-bg'} `}
                    >
                      <div className="flex gap-2 justify-between items-center">
                        <div className="flex gap-2 items-start w-[calc(100%-70px)]">
                          <div className="mt-0.5">
                            <NotebookPenIcon className="w-5 min-w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {note?.title}
                            </h3>
                          </div>
                        </div>
                        {note?.creatorId === user?.uuid ? (
                          <div className="flex gap-2">
                            <div
                              onClick={() => handleEdit(note)}
                              className="cursor-pointer w-7 h-7 rounded-full flex items-center justify-center bg-ucass-primary-200 text-primary hover:bg-primary hover:text-white"
                            >
                              <EditStrokIcon className="w-4 h-4" />
                            </div>
                            <div
                              onClick={() => setDeleteAlertModal(note)}
                              className="cursor-pointer w-7 h-7 rounded-full flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-500 hover:text-white"
                            >
                              <TrashBin className="w-4 h-4" />
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="text-sm">
                        {note?.noteData && <TextEditor initialValue={note?.noteData} readOnly />}
                      </div>
                      <span className="text-[11px] text-gray-500 truncate mt-0.5 justify-end w-full">
                        By{' '}
                        {(() => {
                          const creator = selectedChat?.users?.find(
                            (u: any) => u.uuid === note?.creatorId,
                          );
                          if (creator) {
                            return (
                              `${creator.first_name || ''} ${creator.last_name || ''}`.trim() ||
                              creator.name ||
                              'Unknown'
                            );
                          }
                          return 'Unknown';
                        })()}{' '}
                        • {moment(note?.createdAt).format('DD MMM YYYY')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full bg-[var(--color-bg-gray-50)] p-3 flex items-center justify-center min-h-0 overflow-hidden">
            <div className="flex flex-col justify-center items-center gap-2 py-5 h-full w-full mx-auto">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <NotebookPenIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-base font-semibold text-gray-900">No notes yet</p>
              <p className="text-sm text-center text-gray-500 max-w-xs">
                Create your first note to share with the team.
              </p>
            </div>
          </div>
        )
      ) : null}

      <AlertConfirm
        {...{
          onConfirm: () => {
            handleDeleteNote({
              noteId: deleteAlertModal?._id,
              senderId: user?.uuid,
              receiverId: deleteAlertModal?.receiverId,
              chatId: selectedChat?.chatId,
            });
            setDeleteAlertModal(null);
          },
          open: deleteAlertModal,
          setOpen: setDeleteAlertModal,
          descriptionTextComp: (
            <div className=" text-md">Are you sure, you want to delete this note?</div>
          ),
        }}
      />
    </div>
  );
};

export default NotesList;
