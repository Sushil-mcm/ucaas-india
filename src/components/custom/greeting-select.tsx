import { FC, useState } from 'react';
import CustomSelect from './custom-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import AddGreeting from '@/pages/greetings/add-greeting';
import { Button } from '../ui/button';
import { CloseIcon, Play, UploadLineIcon } from '@/assets/icons';
import { DEFAULT_RECORDING_UUIDS, getEnv, MEDIA_URL } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import ErrorTooltip from './error-tooltip';
import AudioPreviewPlayer from './audio-preview-player';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent } from '../ui/dialog';

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
  /* Which side the preview player opens on. 'right' by default, which is what
     the narrow two-column forms want (see the PopoverContent below). A screen
     that lays these out side by side passes 'bottom', where opening rightwards
     would put the player over the neighbouring card. */
  previewSide?: 'top' | 'right' | 'bottom' | 'left';
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
  previewSide = 'right',
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
            {/* Collision avoidance stays off only for the pinned-right case the
                note above describes. On any other side the panel is free to
                shift back into view, which is what a screen asking for
                'bottom' needs near the foot of the page. */}
            <PopoverContent
              align="center"
              side={previewSide}
              sideOffset={8}
              avoidCollisions={previewSide === 'right' ? false : undefined}
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

      {/* A real nested Dialog rather than SideDrawer's manual `createPortal`
          -- this opens from inside another Dialog (Edit group), and Radix's
          own scroll-lock (react-remove-scroll under the hood) coordinates a
          stack of its OWN instances correctly, allowing scroll in whichever
          one is topmost. A manually-portalled element sits outside that
          stack entirely: the outer Dialog's lock intercepts wheel/touch
          scrolling on it site-wide, while native scrollbar-thumb dragging
          (an OS-level drag, not a JS wheel event) still worked -- exactly
          the split reported. Using the app's own Dialog here participates
          in that coordination instead of fighting it. */}
      <Dialog
        open={drawerState?.addGreeting}
        onOpenChange={(next) =>
          !next && setDrawerState((prev) => ({ ...prev, addGreeting: false, greetingType: '' }))
        }
      >
        <DialogContent
          overlayClassName="bg-transparent"
          showCloseButton={false}
          className="flex max-h-[85vh] flex-col gap-4 border-0 p-0"
          style={{ width: width || 'min(480px,calc(100vw - 2rem))' }}
        >
          <div className="flex items-center justify-between gap-1.5 px-5 pt-5 pb-0 text-[#2E2D35]">
            {/* It uploads, records from the microphone, and reads typed
                text aloud. "Upload File" named one of the three. */}
            <h5 className="text-xl font-semibold">Add a recording</h5>
            <button
              type="button"
              onClick={() =>
                setDrawerState((prev) => ({ ...prev, addGreeting: false, greetingType: '' }))
              }
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#EEE7DD] bg-[rgba(251,249,246,0.88)] text-[#9A948F] shadow-sm transition-all hover:scale-110 hover:bg-[#FBE2C8]/40 hover:text-[#2E2D35] hover:shadow-md"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-5 lg:px-5">
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SelectGreeting;
