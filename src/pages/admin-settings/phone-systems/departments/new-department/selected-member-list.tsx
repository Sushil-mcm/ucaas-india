import { DragLineIcon } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FC, type ReactNode } from 'react';

type Member = {
  label: string;
  value: string;
  email?: string;
  role: string;
  user_uuid: string;
  extension: string;
  profile: string;
  ring_time?: any;
  timeout?: any;
};

const DraggableMember = ({
  member,
  index,
  renderRight,
}: {
  member: Member;
  index: number;
  renderRight?: (member: Member, index: number) => ReactNode;
}) => {
  const { user_uuid, label, email, role = '', value, profile = '' } = member;

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: user_uuid,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white border-b border-gray-200 h-8"
    >
      <TableCell className="w-1/12 text-center cursor-move px-4 py-2 border-r" {...listeners}>
        <DragLineIcon className="mx-auto w-3 h-3 text-gray-500" />
      </TableCell>

      <TableCell className="px-4 py-2">
        <div className="flex items-center gap-3">
          <CustomAvatar name={label} showPresence extension={value} image={profile} />
          <div className="flex flex-col w-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="capitalize font-medium text-sm">{label}</p>
                <p className="text-primary text-[11px]">{role}</p>
              </div>
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Icon name="Grid" className="w-4 h-4" />
                <span>{value}</span>
              </div>
            </div>
            {email && <p className="text-gray-500 text-[11px] truncate">{email}</p>}
          </div>
        </div>
      </TableCell>
      {renderRight && <TableCell className="px-4 py-2">{renderRight(member, index)}</TableCell>}
    </TableRow>
  );
};

const SelectedMemberList: FC<{
  members: any;
  setValue: any;
  renderRight?: (member: Member, index: number) => ReactNode;
}> = ({ members, setValue, renderRight }) => {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = members.findIndex((m: any) => m.user_uuid === active.id);
      const newIndex = members.findIndex((m: any) => m.user_uuid === over?.id);

      const newMembers = arrayMove(members, oldIndex, newIndex);
      setValue('members', newMembers);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={members?.map((m: any) => m.user_uuid)}
        strategy={verticalListSortingStrategy}
      >
        {members.map((member: Member, index: number) => (
          <DraggableMember
            key={member.user_uuid}
            member={member}
            index={index}
            renderRight={renderRight}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export default SelectedMemberList;
