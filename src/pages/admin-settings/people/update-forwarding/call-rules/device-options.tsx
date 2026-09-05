import { DragLineIcon, LandlineOutlined, MobileOutlined, Monitor } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import { Switch } from '@/components/ui/switch';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FC } from 'react';
import { DEVICE_TYPE_NAME_CONST } from '../../../constants';

const SortableItem: FC<any> = ({
  id,
  objKey,
  device,
  ringingOptions,
  setValue,
  user_extension,
  watch,
  //   handleEditDevice,
  //   incomingCall,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex min-w-[720px] items-center justify-between border-b border-gray-200 p-2 nth-3:border-b-0"
    >
      <p className="w-1/5 font-medium text-sm flex justify-center cursor-pointer" {...listeners}>
        <DragLineIcon className="w-2 h-2" />
      </p>
      <p className="w-full font-medium text-sm">
        <Switch
          className="cursor-pointer"
          onCheckedChange={(checked: boolean) => {
            setValue(`callRules.incomingCall.deviceOptions.${objKey}.status`, checked);
            if (!checked) {
              setValue(`callRules.incomingCall.deviceOptions.${objKey}.value`, {
                label: '6 times / 30 secs',
                value: '30',
              });
              if (objKey === 'phone') {
                setValue(`callRules.incomingCall.deviceOptions.${objKey}.phone`, '');
              }
            }
          }}
          /* Coerced: `checked={undefined}` makes Radix treat the switch as
             uncontrolled, after which it keeps its own state and stops
             agreeing with the form. */
          checked={!!watch(`callRules.incomingCall.deviceOptions.${objKey}.status`)}
        />
      </p>
      <p className="w-full font-medium text-sm">
        {device?.option?.value === user_extension ? (
          <div className="flex items-center gap-3">
            {device?.type === 'mobile' ? (
              <MobileOutlined className="w-5 h-5" />
            ) : device?.type === 'pstn' ? (
              <LandlineOutlined className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
            <span>
              {DEVICE_TYPE_NAME_CONST[device?.type as keyof typeof DEVICE_TYPE_NAME_CONST]}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* <FaRegUser className="text-xl" /> */}
            <div className="flex flex-col">
              <span className="capitalize font-bold">{objKey}</span>
              <span className="flex items-center gap-2">({device?.option?.value || ''})</span>
            </div>
          </div>
        )}
      </p>
      <p className="w-full font-medium text-sm">
        {device?.status && (
          <CustomSelect
            className="w-64"
            options={ringingOptions}
            handleChange={(e: ISELECTVALUE | null) => {
              setValue(`callRules.incomingCall.deviceOptions.${objKey}.value`, e);
            }}
            value={device?.value}
          />
        )}
      </p>
      <p className="w-1/5 font-medium text-sm">&nbsp;</p>
      {/* <p className="w-1/4">
        {objKey !== 'web' && (
          <div className="flex items-center gap-3">
            <span className="cursor-pointer" onClick={() => handleEditDevice(objKey)}>
              <Pen />
            </span>
            <span
              className="cursor-pointer"
              onClick={() => {
                // const clone = { ...device };
                const newDevices = { ...incomingCall.deviceOptions };
                delete newDevices[objKey];
                setValue('callRules.incomingCall.deviceOptions', newDevices);
              }}
            >
              <TrashBin />
            </span>
          </div>
        )}
      </p> */}
    </div>
  );
};

type DeviceOptionsMap = Record<string, { [key: string]: any }>;

const DeviceOptionsList: FC<any> = ({
  incomingCall,
  setValue,
  RINGING_OPTIONS,
  handleEditDevice,
  user_extension,
  watch,
}) => {
  const sensors = useSensors(useSensor(PointerSensor));

  const reorder = (
    list: DeviceOptionsMap,
    startIndex: number,
    endIndex: number,
  ): DeviceOptionsMap => {
    const entriesArray = Object.entries(list);
    const [removed] = entriesArray.splice(startIndex, 1);
    entriesArray.splice(endIndex, 0, removed);

    const updatedArray = entriesArray.map(([key, value], index) => [
      key,
      { ...value, order: index + 1 },
    ]);

    return Object.fromEntries(updatedArray);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const keys = Object.keys(incomingCall.deviceOptions);
    const oldIndex = keys.indexOf(active.id as string);
    const newIndex = keys.indexOf(over.id as string);

    const reordered = reorder(incomingCall.deviceOptions, oldIndex, newIndex);

    setValue(`callRules.incomingCall.deviceOptions`, reordered, {
      shouldValidate: true,
    });
  };

  const deviceOptions = incomingCall?.deviceOptions || {};
  const deviceKeys = Object.keys(deviceOptions);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={deviceKeys} strategy={verticalListSortingStrategy}>
        {deviceKeys.map((key) => (
          <SortableItem
            key={key}
            id={key}
            objKey={key}
            device={deviceOptions[key]}
            setValue={setValue}
            ringingOptions={RINGING_OPTIONS}
            handleEditDevice={handleEditDevice}
            user_extension={user_extension}
            watch={watch}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export default DeviceOptionsList;
