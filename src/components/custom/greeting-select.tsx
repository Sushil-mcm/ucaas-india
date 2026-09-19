import { FC, useEffect, useRef, useState } from 'react';
import CustomSelect from './custom-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import AddGreeting from '@/pages/greetings/add-greeting';
import { Button } from '../ui/button';
import { CloseIcon, Play, UploadLineIcon } from '@/assets/icons';
import { DEFAULT_RECORDING_UUIDS, getEnv, MEDIA_URL } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import ErrorTooltip from './error-tooltip';
import SideDrawer from './side-drawer';
import AudioPreviewPlayer from './audio-preview-player';

interface IGREETINGPROPS {
  options: ISELECTVALUE[];
  onChangeMedia: (e: ISELECTVALUE | null) => void;
  isShowUpload: boolean;
  name: string;
  value: ISELECTVALUE | null;
  errors: string;
  selectCustomClass?: string;
  selectCustomClassSecond?: string;
  isRefetchable?: boolean;
  refetch?: () => void;
  onGreetingUploadStart?: () => void;
  onGreetingUploadSuccess?: () => void;
  width?: string;
  /* Keeps the add button available after a recording has been chosen, and
     selects whatever gets made. Off by default: the forms that embed this
     control - IVR keys, queue settings, a person's phone tab - lay it out in a
     narrow column where a third button next to the dropdown and the play button
     wraps the row. Screens with room ask for it. */
  alwaysAllowAdd?: boolean;
}

interface GreetingSelectValue extends ISELECTVALUE {
  uuid?: string;
}

const SelectGreeting: FC<IGREETINGPROPS> = ({
  options,
  onChangeMedia,
  isShowUpload,
  name,
  value,
  errors,
  selectCustomClass = '',
  selectCustomClassSecond = '',
  width = '',
  isRefetchable = true,
  refetch = () => {},
  onGreetingUploadStart = () => {},
  onGreetingUploadSuccess = () => {},
  alwaysAllowAdd = false,
}) => {
  const { user } = useUser();
  const { company_info } = user;
  const [isPlay, setIsPlay] = useState<boolean>(false);
  const [drawerState, setDrawerState] = useState({
    addGreeting: false,
    greetingType: '',
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const selectedGreeting = options.find((option) => option.value === value?.value) as
    GreetingSelectValue | undefined;
  const greetingUuid = (value as GreetingSelectValue | null)?.uuid ?? selectedGreeting?.uuid;
  const recordingUrl = DEFAULT_RECORDING_UUIDS.includes(greetingUuid ?? '')
    ? `${getEnv().VITE_API_BASE_URL}/api/media/default/recording/${value?.value}`
    : `${MEDIA_URL}/${company_info?.uuid}/greeting/${value?.value}`;

  // A full slide-in side panel read as too heavy for a quick preview -- this
  // is a small card anchored right next to the row it opened from, closing
  // the moment a click lands outside it.
  useEffect(() => {
    if (!isPlay) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
        setIsPlay(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPlay]);

  return (
    <>
      <div className={`flex gap-2 relative ${selectCustomClass}`}>
        <div className={`relative ${selectCustomClassSecond}`}>
          {errors && (
            <div className="flex justify-end absolute right-0 top-[-18px]">
              <ErrorTooltip text={errors} />
            </div>
          )}
          <CustomSelect
            options={options}
            handleChange={(e: ISELECTVALUE | null) => {
              onChangeMedia(e || { label: '', value: '' });
            }}
            value={value}
            isClearable={true}
          />
        </div>
        {value?.value && (
          <Button
            type="button"
            variant={'outline'}
            className="w-10 h-10 p-0"
            onClick={() => setIsPlay(true)}
          >
            <Play className="w-5 h-5" />
          </Button>
        )}
        {/* Without `alwaysAllowAdd` this disappeared the moment a recording
            was chosen, so the only way to add a second one was to clear the
            first - on a screen whose whole job is choosing recordings. */}
        {isShowUpload && (alwaysAllowAdd || !value?.value) && (
          <Button
            variant={'outline'}
            type="button"
            className="w-10 h-10 p-0"
            onClick={() => {
              onGreetingUploadStart();
              setDrawerState({
                addGreeting: true,
                greetingType: name,
              });
            }}
          >
            <UploadLineIcon className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Preview opens as a small card anchored to the right of the row it
          was opened from -- same level as the dropdown, not a separate
          full-height panel -- and closes on an outside click. Mounted only
          while open so picking a recording doesn't fetch its authenticated
          media URL until it's actually previewed. */}
      {isPlay && (
        <div
          ref={previewRef}
          className="absolute left-full top-0 z-20 ml-2 w-72 rounded-xl border-0 bg-white p-1.5 shadow-lg"
        >
          <div className="flex items-center justify-between px-1.5 pb-1.5 pt-0.5">
            <span className="text-[13px] font-semibold text-[#2E2D35]">Recording preview</span>
            <button
              type="button"
              onClick={() => setIsPlay(false)}
              aria-label="Close"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#9A948F] transition-colors hover:bg-[#FBE2C8]/40 hover:text-[#2E2D35]"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          </div>
          <AudioPreviewPlayer src={recordingUrl} authenticated />
        </div>
      )}

      {drawerState?.addGreeting && (
        <SideDrawer
          width={width}
          isOpen={drawerState?.addGreeting}
          /* It uploads, records from the microphone, and reads typed text
             aloud. "Upload File" named one of the three. */
          title="Add a recording"
          handleClose={() =>
            setDrawerState((prev) => ({ ...prev, addGreeting: false, greetingType: '' }))
          }
          isHeader
          content={
            <AddGreeting
              drawerState={drawerState?.addGreeting}
              setDrawerState={(val) =>
                setDrawerState((prev) => ({ ...prev, addGreeting: val, greetingType: '' }))
              }
              greetingType={name}
              refetch={() => {
                refetch();
                onGreetingUploadSuccess();
              }}
              /* Straight into the slot it was made for. The drawer was opened
                 from this dropdown to fill it, so leaving the admin to find the
                 new recording in the list afterwards is a step with no purpose. */
              onCreated={alwaysAllowAdd ? (greeting) => onChangeMedia(greeting) : undefined}
              isRefetchable={isRefetchable}
            />
          }
        />
      )}
    </>
  );
};

export default SelectGreeting;
