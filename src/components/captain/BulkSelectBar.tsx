import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

type BulkSelectBarProps<T extends { id: string }> = {
  items: T[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onSelectAllLabel?: (count: number, allSelected: boolean) => string;
  selectedCountLabel?: (count: number) => string;
  deleteLabel?: string;
  onDelete: () => void;
  isDeleting?: boolean;
};

export function BulkSelectBar<T extends { id: string }>({
  items,
  selectedIds,
  onSelectionChange,
  onSelectAllLabel,
  selectedCountLabel,
  deleteLabel = 'Delete',
  onDelete,
  isDeleting = false,
}: BulkSelectBarProps<T>) {
  const visibleItemIds = useMemo(() => items.map((item) => item.id), [items]);
  const visibleItemCount = visibleItemIds.length;
  const selectedVisibleCount = useMemo(
    () => visibleItemIds.filter((id) => selectedIds.has(id)).length,
    [visibleItemIds, selectedIds],
  );
  const hasSelected = selectedIds.size > 0;
  const isIndeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleItemCount;
  const allSelected = visibleItemCount > 0 && selectedVisibleCount === visibleItemCount;

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (!visibleItemCount) return;

    const updatedSelection = new Set(selectedIds);
    if (checked === true) {
      visibleItemIds.forEach((id) => updatedSelection.add(id));
    } else {
      visibleItemIds.forEach((id) => updatedSelection.delete(id));
    }
    onSelectionChange(updatedSelection);
  };

  const selectAllText = onSelectAllLabel
    ? onSelectAllLabel(visibleItemCount, allSelected)
    : allSelected
      ? `Unselect all (${visibleItemCount})`
      : `Select all (${visibleItemCount})`;

  const selectedCountText = selectedCountLabel
    ? selectedCountLabel(selectedIds.size)
    : `${selectedIds.size} selected`;

  if (!hasSelected) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Checkbox
            checked={allSelected ? true : isIndeterminate ? 'indeterminate' : false}
            onCheckedChange={handleSelectAllChange}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {selectAllText}
          </span>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {selectedCountText}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="destructiveOutline"
          size="sm"
          disabled={isDeleting}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          {isDeleting ? 'Deleting...' : deleteLabel}
        </Button>
      </div>
    </div>
  );
}
