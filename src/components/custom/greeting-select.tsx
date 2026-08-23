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

interface IGREETINGPROPS {
  options: ISELECTVALUE[];
  onChangeMedia: (e: ISELECTVALUE | null) => void;
  isShowUpload: boolean;
  name: string;
  value: ISELECTVALUE | null;
  errors: string;
  audioCustomClass?: string;
  selectCustomClass?: string;
  selectCustomClassSecond?: string;
  isRefetchable?: boolean;
  refetch?: () => void;
  onGreetingUploadStart?: () => void;
  onGreetingUploadSuccess?: () => void;
  width?: string;
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
  audioCustomClass = '',
  selectCustomClass = '',
  selectCustomClassSecond = '',
  width = '',
  isRefetchable = true,
  refetch = () => {},
  onGreetingUploadStart = () => {},
  onGreetingUploadSuccess = () => {},
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
      {isPlay ? (
        <div className={`flex items-center gap-2 ${audioCustomClass}`}>
          <ReadyAudio controls authenticated src={recordingUrl} />
          <Button
            type="button"
            variant={'outline'}
            className="w-10 h-10 min-w-10 text-red-500 text-lg font-bold border-red-500 hover:bg-red-500"
            onClick={() => setIsPlay(false)}
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
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
              className="w-10 h-10"
              onClick={() => setIsPlay(true)}
            >
              <Play className="w-5 h-5" />
            </Button>
          )}
          {isShowUpload && !isPlay && !value?.value && (
            <Button
              variant={'outline'}
              type="button"
              className="w-10 h-10"
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
      )}

      {drawerState?.addGreeting && (
        <SideDrawer
          width={width}
          isOpen={drawerState?.addGreeting}
          title="Upload File"
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
              isRefetchable={isRefetchable}
            />
          }
        />
      )}
    </>
  );
};

export default SelectGreeting;
