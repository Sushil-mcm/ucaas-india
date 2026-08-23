import { useState } from 'react';
import UploadPdfModal from './modals/upload-pdf-modal';
import BlankFileModal from './modals/create-content-modal';
import PasteUrlModal from './modals/paste-url-modal';
import { AttachLine, FileBlankIcon, UploadLineIcon } from '@/assets/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, GlobeIcon } from 'lucide-react';
import AttachGlobalKnowledgeBase from './modals/attach-global-knowledge';

function AllKnowledgeBase() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as {
    returnTo?: string;
    returnToStep?: number;
    returnToState?: Record<string, any>;
  };
  const shouldReturnToReceptionist =
    navState.returnTo === '/admin-settings/knowledge/ai-receptionist';
  const shouldReturnToConfigureAiAgent =
    navState.returnTo === '/admin-settings/knowledge/configure-ai-agent';
  const shouldHideAttachGlobalKnowledge =
    shouldReturnToReceptionist || shouldReturnToConfigureAiAgent;

  const handleSuccessNavigation = (payload?: {
    ingestionIdCreated?: string;
    type?: 'text' | 'url' | 'pdf';
  }) => {
    if (shouldReturnToReceptionist) {
      const persistedReturnState = navState.returnToState || {};
      navigate('/admin-settings/knowledge/ai-receptionist', {
        state: {
          ...persistedReturnState,
          returnToState: persistedReturnState,
          openCreateReceptionist: true,
          returnToStep: Number.isFinite(navState.returnToStep) ? Number(navState.returnToStep) : 2,
          preselectKnowledgeBase:
            payload?.ingestionIdCreated && payload?.type
              ? {
                  ingestionId: payload.ingestionIdCreated,
                  type: payload.type,
                }
              : undefined,
        },
      });
      return;
    }
    if (shouldReturnToConfigureAiAgent) {
      navigate('/admin-settings/knowledge/configure-ai-agent', {
        state: {
          ...(navState.returnToState || {}),
          openConfigureAiAgent: true,
          returnToStep: Number.isFinite(navState.returnToStep) ? Number(navState.returnToStep) : 1,
          preselectKnowledgeBase:
            payload?.ingestionIdCreated && payload?.type
              ? {
                  ingestionId: payload.ingestionIdCreated,
                  type: payload.type,
                }
              : undefined,
        },
      });
      return;
    }
    navigate('/admin-settings/knowledge/all-knowledge');
  };

  const handleBackNavigation = () => {
    if (shouldReturnToReceptionist) {
      const persistedReturnState = navState.returnToState || {};
      navigate('/admin-settings/knowledge/ai-receptionist', {
        state: {
          ...persistedReturnState,
          returnToState: persistedReturnState,
          openCreateReceptionist: true,
          returnToStep: Number.isFinite(navState.returnToStep) ? Number(navState.returnToStep) : 2,
        },
      });
      return;
    }
    if (shouldReturnToConfigureAiAgent) {
      navigate('/admin-settings/knowledge/configure-ai-agent', {
        state: {
          ...(navState.returnToState || {}),
          openConfigureAiAgent: true,
          returnToStep: Number.isFinite(navState.returnToStep) ? Number(navState.returnToStep) : 1,
        },
      });
      return;
    }
    navigate(-1);
  };
  // const { state } = useLocation();
  // const { rowData = {} } = state || {};

  const [actions, setActions] = useState({
    uploadPdfFile: false,
    blankDocument: false,
    pasteUrl: false,
    attachGlobalKB: false,
  });

  // useEffect(() => {
  //   if (rowData?.form === 'content') {
  //     setActions((prev) => ({
  //       ...prev,
  //       blankDocument: true,
  //     }));
  //   }
  // }, [rowData?.form]);

  return (
    <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden">
      <div className="flex  flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <div className="flex gap-2 items-center cursor-pointer" onClick={handleBackNavigation}>
          <ArrowLeft className="w-6 h-5" />
          <h3 className="font-semibold text-gray-900">Add Knowledge Base</h3>
        </div>
      </div>
      <div className="w-full p-3 flex flex-col items-center gap-3 overflow-y-auto">
        <div className="w-full h-[calc(100vh-2rem)] max-w-[90%] flex items-center justify-center flex-col gap-3">
          <h4 className="text-gray-900 font-semibold text-2xl">Add Knowledge Base</h4>
          <h5 className="text-gray-700 font-medium text-sm">
            You can upload PDFs, create documents, or link web pages.
          </h5>
          <div
            className={`w-full grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              shouldHideAttachGlobalKnowledge ? 'xl:grid-cols-3' : 'xl:grid-cols-4'
            }`}
          >
            <div
              className="flex flex-col gap-3 items-center justify-center bg-white rounded-xl p-4 border border-gray-200 min-h-56 cursor-pointer"
              onClick={() =>
                setActions((prev) => ({
                  ...prev,
                  uploadPdfFile: true,
                }))
              }
            >
              <span className="p-1 w-12 h-12 flex items-center justify-center bg-ucass-primary-200 text-primary rounded-md">
                <UploadLineIcon className="w-6 h-6" />
              </span>
              <h4 className="text-gray-900 font-semibold text-md text-center">Upload PDF File</h4>
              <p className="text-gray-500 font-normal text-sm text-center">
                Directly upload your file with the required information.
              </p>
            </div>
            <div
              className="flex flex-col gap-3 items-center justify-center bg-white rounded-xl p-4 border border-gray-200 min-h-56 cursor-pointer"
              onClick={() =>
                setActions((prev) => ({
                  ...prev,
                  blankDocument: true,
                }))
              }
            >
              <span className="p-1 w-12 h-12 flex items-center justify-center bg-ucass-primary-200 text-primary rounded-md">
                <FileBlankIcon className="w-6 h-6" />
              </span>
              <h4 className="text-gray-900 font-semibold text-md text-center"> Create Content</h4>
              <p className="text-gray-500 font-normal text-sm text-center">
                Manually add the information to a blank document.
              </p>
            </div>
            <div
              className="flex flex-col gap-3 items-center justify-center bg-white rounded-xl p-4 border border-gray-200 min-h-56 cursor-pointer"
              onClick={() =>
                setActions((prev) => ({
                  ...prev,
                  pasteUrl: true,
                }))
              }
            >
              <span className="p-1 w-12 h-12 flex items-center justify-center bg-ucass-primary-200 text-primary rounded-md">
                <AttachLine className="w-6 h-6 rotate-45" />
              </span>
              <h4 className="text-gray-900 font-semibold text-md text-center"> Get From URL</h4>
              <p className="text-gray-500 font-normal text-sm text-center">
                Scan information from URL link to document or website.
              </p>
            </div>
            {!shouldHideAttachGlobalKnowledge && (
              <div
                className="flex flex-col gap-3 items-center justify-center bg-white rounded-xl p-4 border border-gray-200 min-h-56 cursor-pointer"
                onClick={() =>
                  setActions((prev) => ({
                    ...prev,
                    attachGlobalKB: true,
                  }))
                }
              >
                <span className="p-1 w-12 h-12 flex items-center justify-center bg-ucass-primary-200 text-primary rounded-md">
                  <GlobeIcon className="w-6 h-6" />
                </span>
                <h4 className="text-gray-900 font-semibold text-md text-center">
                  Attach Global Knowledge Base
                </h4>
                <p className="text-gray-500 font-normal text-sm text-center">
                  Connect predefined global knowledge sources to your agent.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {actions.uploadPdfFile && (
        <UploadPdfModal
          modalState={actions.uploadPdfFile}
          onSuccess={handleSuccessNavigation}
          setModalState={(val) =>
            setActions((prev) => ({
              ...prev,
              uploadPdfFile: val,
            }))
          }
        />
      )}
      {actions.blankDocument && (
        <BlankFileModal
          modalState={actions.blankDocument}
          onSuccess={handleSuccessNavigation}
          setModalState={(val) =>
            setActions((prev) => ({
              ...prev,
              blankDocument: val,
            }))
          }
        />
      )}
      {actions.pasteUrl && (
        <PasteUrlModal
          modalState={actions.pasteUrl}
          onSuccess={handleSuccessNavigation}
          setModalState={(val) =>
            setActions((prev) => ({
              ...prev,
              pasteUrl: val,
            }))
          }
        />
      )}
      {actions.attachGlobalKB && (
        <AttachGlobalKnowledgeBase
          modalState={actions.attachGlobalKB}
          onSuccess={handleSuccessNavigation}
          setModalState={(val) =>
            setActions((prev) => ({
              ...prev,
              attachGlobalKB: val,
            }))
          }
        />
      )}
    </section>
  );
}

export default AllKnowledgeBase;
