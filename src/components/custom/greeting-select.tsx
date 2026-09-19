import { FC, useState } from 'react';
import CustomSelect from './custom-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import AddGreeting from '@/pages/greetings/add-greeting';
import { Button } from '../ui/button';
import { Play, UploadLineIcon } from '@/assets/icons';
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
  const selectedGreeting = options.find((option) => option.value === value?.value) as
    GreetingSelectValue | undefined;
  const greetingUuid = (value as GreetingSelectValue | null)?.uuid ?? selectedGreeting?.uuid;
  const recordingUrl = DEFAULT_RECORDING_UUIDS.includes(greetingUuid ?? '')
    ? `${getEnv().VITE_API_BASE_URL}/api/media/default/recording/${value?.value}`
    : `${MEDIA_URL}/${company_info?.uuid}/greeting/${value?.value}`;

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

      {/* Preview opens as its own right-side panel rather than swapping in
          over the dropdown above -- same slide-in pattern as the "Add a
          recording" drawer below, so it reads as a peek at the recording
          instead of replacing the control that opened it. Mounted only
          while open, same as that drawer, so picking a recording doesn't
          fetch its authenticated media URL until it's actually previewed. */}
      {isPlay && (
        <SideDrawer
          isOpen={isPlay}
          handleClose={() => setIsPlay(false)}
          title="Recording preview"
          isHeader
          width="22rem"
          content={<AudioPreviewPlayer src={recordingUrl} authenticated />}
        />
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
