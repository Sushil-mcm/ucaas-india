import { DragLineIcon, LandlineOutlined, MobileOutlined, Monitor, PhoneLine } from '@/assets/icons';
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
import { deskPhoneStateLabel, outsideNumberDigits, ringsToday } from '@/lib/desk-phone-device-rows';

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
            ) : device?.type === 'desk' ? (
              <PhoneLine className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
            {device?.type === 'desk' ? (
              <span className="flex flex-col">
                <span className="flex items-center gap-2">
                  {device?.option?.label || DEVICE_TYPE_NAME_CONST.desk}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      deskPhoneStateLabel(device?.state).live ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {deskPhoneStateLabel(device?.state).text}
                  </span>
                </span>
                <span className="text-xs text-gray-500">{device?.detail || DEVICE_TYPE_NAME_CONST.desk}</span>
              </span>
            ) : device?.type === 'pstn' ? (
              <span className="flex flex-col gap-1">
                <span>{DEVICE_TYPE_NAME_CONST.pstn}</span>
                <input
                  type="tel"
                  className="w-56 rounded border border-gray-300 px-2 py-1 text-sm"
                  placeholder={device?.suggested ? `e.g. ${device.suggested}` : 'Mobile or other number'}
                  value={watch(`callRules.incomingCall.deviceOptions.${objKey}.number`) || ''}
                  onChange={(e) =>
                    setValue(`callRules.incomingCall.deviceOptions.${objKey}.number`, e.target.value)
                  }
                />
                <span className="text-xs text-gray-500">
                  {outsideNumberDigits(watch(`callRules.incomingCall.deviceOptions.${objKey}.number`))
                    ? 'Rings with your other devices; press 1 on that phone to take the call.'
                    : 'Add a number to ring it. Until then this row does nothing.'}
                </span>
              </span>
            ) : (
              <span>
                {DEVICE_TYPE_NAME_CONST[device?.type as keyof typeof DEVICE_TYPE_NAME_CONST]}
              </span>
            )}
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
  /* Only rows the switch dials are listed; the stored mobile and
     outside-number rows stay in the form untouched. */
  const deviceKeys = Object.keys(deviceOptions).filter((key) => ringsToday(deviceOptions[key]));

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
