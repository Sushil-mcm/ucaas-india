import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FORWARD_TYPES } from '@/constants/forwarding-consts';
import { useUser } from '@/hooks/use-user';
import { Button } from '../ui/button';
import { CloseIcon, Play } from '@/assets/icons';
import { useState } from 'react';
import { MEDIA_URL } from '@/lib/utils';
import ReadyAudio from './ready-audio';

const HolidaysTable = ({ holidays = [], width = 'full' }: { holidays: any[]; width?: string }) => {
  const { user } = useUser();
  const { user_info, company_info } = user || {};
  const [playingAudioState, setPlayingAudioState] = useState<any>({
    index: null,
    audioId: null,
  });

  const getForwardedToValue = (holiday: any, index: number) => {
    const typeValue = typeof holiday?.type === 'object' ? holiday?.type?.value : holiday?.type;
    const valueVal = typeof holiday?.value === 'object' ? holiday?.value?.value : holiday?.value;
    const valueLabel =
      typeof holiday?.value === 'object' ? holiday?.value?.label : holiday?.name || holiday?.value;

    if (typeValue === FORWARD_TYPES.VOICEMAIL) {
      return valueVal === user_info?.extension ? 'My Voicemail' : valueVal;
    }
    if (typeValue === FORWARD_TYPES.MESSAGE) {
      return (
        <>
          {playingAudioState?.audioId &&
          valueVal === playingAudioState.audioId &&
          index === playingAudioState.index ? (
            <div className={`flex items-center gap-2 `}>
              <ReadyAudio
                controls
                authenticated
                src={`${MEDIA_URL}/${company_info?.uuid}/greeting/${playingAudioState.audioId}`}
              />
              <Button
                type="button"
                variant={'outline'}
                className="text-red-500 text-lg font-bold w-10 h-10 border-red-500 hover:bg-red-500"
                onClick={() => setPlayingAudioState({ index: null, audioId: null })}
              >
                <CloseIcon className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className={`flex items-center gap-2`}>
              {valueLabel}
              {valueVal && (
                <Button
                  type="button"
                  variant={'outline'}
                  className="w-10 h-10"
                  onClick={() => setPlayingAudioState({ index: index, audioId: valueVal })}
                >
                  <Play className="w-5 h-5" />
                </Button>
              )}
            </div>
          )}
        </>
      );
    }
    if (typeValue === FORWARD_TYPES.HANGUP) {
      return '---';
    }

    return valueLabel;
  };
  return (
    <div className={`w-${width}`}>
      <div className="flex flex-col gap-2 overflow-auto border border-gray-200 rounded-xl">
        <Table className="w-full text-sm text-gray-700 h-full ">
          <TableHeader className="bg-gray-100/40 text-gray-90/80">
            <TableRow>
              <TableHead className="px-4 py-2 font-medium text-left text-text-gray-90/80">
                Name
              </TableHead>
              <TableHead className="px-4 py-2 font-medium text-left text-text-gray-90/80">
                From Date
              </TableHead>
              <TableHead className="px-4 py-2 font-medium text-left text-text-gray-90/80">
                To Date
              </TableHead>
              <TableHead className="px-4 py-2 font-medium text-left text-text-gray-90/80">
                Forward Type
              </TableHead>
              <TableHead className="px-4 py-2 font-medium text-left text-text-gray-90/80">
                Forward To
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-200 bg-white w-full font-normal">
            {holidays.map((data: any, index: any) => {
              const displayType =
                typeof data?.type === 'object'
                  ? data?.type?.label || data?.type?.value
                  : data?.type_label || data?.type;
              return (
                <TableRow key={`${data?.user_uuid}-${index}`} className="h-8">
                  <TableCell className="px-4 py-2 border-b">{data?.title}</TableCell>
                  <TableCell className="px-4 py-2 border-b">{data?.from}</TableCell>
                  <TableCell className="px-4 py-2 border-b">{data?.to}</TableCell>
                  <TableCell className="px-4 py-2 border-b">{displayType}</TableCell>
                  <TableCell className="px-4 py-2 border-b">
                    {getForwardedToValue(data, index)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default HolidaysTable;
