import { FC, useState } from 'react';
import CustomSelect from './custom-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import AddGreeting from '@/pages/greetings/add-greeting';
import { Button } from '../ui/button';
import { CloseIcon, Play, UploadLineIcon } from '@/assets/icons';
import { DEFAULT_RECORDING_UUIDS, getEnv, MEDIA_URL } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import ErrorTooltip from './error-tooltip';
import SideDrawer from './side-drawer';
import ReadyAudio from './ready-audio';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

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
          <Popover open={isPlay} onOpenChange={setIsPlay}>
            <PopoverTrigger asChild>
              <Button type="button" variant={'outline'} className="w-10 h-10 p-0">
                <Play className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            {/* Portalled to <body> by PopoverContent itself, so this can't be
                clipped by an ancestor's scroll container the way a plain
                absolutely-positioned card was -- `.gp-create-group-body`'s
                `overflow-y-auto` forces `overflow-x` non-visible too (CSS's
                either-axis rule), which silently clipped the previous
                version off to the right with no visible error. */}
            <PopoverContent
              align="start"
              side="right"
              className="w-72 rounded-xl border-0 bg-white p-1.5 shadow-lg"
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
              {/* Plain browser audio player rather than a custom-built one --
                  its own kebab menu already gives download and playback-speed
                  options for free. `accent-*` tints the controls Chromium
                  renders in the page's own color (play button, volume) to
                  the app's orange instead of the OS default blue. */}
              <ReadyAudio controls authenticated src={recordingUrl} className="accent-[#c96f1f]" />
            </PopoverContent>
          </Popover>
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
