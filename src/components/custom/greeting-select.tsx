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
            {/* A plain themed button rather than the shared `Button`'s
                `outline` variant -- that variant flips text to white on
                hover, and the `Play` icon (a filled circle+triangle glyph)
                is colored entirely via `currentColor`, so if the
                background hover style doesn't win here (composed through
                Popover's `asChild`/Slot), the icon goes white-on-white and
                disappears. Keeping the icon color fixed and only tinting
                the background can't reproduce that. */}
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary text-primary transition-colors hover:bg-primary/10"
              >
                <Play className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            {/* Portalled to <body> by PopoverContent itself, so this can't be
                clipped by an ancestor's scroll container the way a plain
                absolutely-positioned card was -- `.gp-create-group-body`'s
                `overflow-y-auto` forces `overflow-x` non-visible too (CSS's
                either-axis rule), which silently clipped an earlier version
                off to the right with no visible error.

                `avoidCollisions={false}`: with it on, Radix flips/shifts
                the panel to whichever side still has room, which in this
                narrow two-column step looked fine for one greeting row and
                landed above/overlapping the row below for the other --
                same trigger, inconsistent placement. Pinning it to the
                right at a fixed offset makes every row behave the same. */}
            <PopoverContent
              align="center"
              side="right"
              sideOffset={8}
              avoidCollisions={false}
              className="w-[300px] rounded-xl border-0 bg-white p-1 shadow-lg"
            >
              <AudioPreviewPlayer
                src={recordingUrl}
                authenticated
                onClose={() => setIsPlay(false)}
              />
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
