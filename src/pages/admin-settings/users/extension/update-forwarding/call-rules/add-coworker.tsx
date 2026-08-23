import { CloseIcon, Grid } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import useDebounce from '@/hooks/use-debounce';
import { usePaginatedUsers } from '@/hooks/use-paginated-users';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';

export const ExtensionListView = ({ option }: any) => {
  console.log(option, 'optionoption');

  const { showExtension = true } = option || {};
  return (
    <div className="flex w-full items-center justify-between">
      <div>{option?.label}</div>
      {showExtension && (
        <div className="flex items-center">
          <Grid className="w-4 h-4 " />
          {option?.value}
        </div>
      )}
    </div>
  );
};

interface RoleModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  onSubmit: () => void;
  selectedObjKey: string | null;
  user_extension: string | null;
}

interface IExtension {
  first_name: string;
  last_name: string;
  extension: string;
}
const AddCoworkerModal: FC<RoleModalProps> = ({
  modalState,
  setModalState,
  onSubmit,
  selectedObjKey,
  user_extension,
}) => {
  const { watch, setValue } = useFormContext();
  const [extensionSearch, setExtensionSearch] = useState('');
  const debouncedExtensionSearch = useDebounce(extensionSearch, 300);
  const {
    users: extensionList,
    fetchNextPage,
    hasNextPage = false,
    isFetchingNextPage,
    isLoading,
  } = usePaginatedUsers({
    search: debouncedExtensionSearch,
    enabled: modalState,
    queryKey: ['addCoworkerUsers'],
  });

  const extensionData = extensionList
    ?.filter((el: IExtension) => el.extension !== user_extension)
    .map((extension: IExtension) => ({
      label: `${extension?.first_name}${extension?.last_name ? ` ${extension?.last_name}` : ''}`,
      value: extension?.extension,
      name: `${extension?.first_name}${extension?.last_name ? ` ${extension?.last_name}` : ''}`,
    }));

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-1/4 p-3 max-h-[99%] overflow-y-auto" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Add Coworker
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <CustomSelect
          isMulti
          options={extensionData}
          handleChange={(selectedOptions: ISELECTVALUE[] | null) => {
            setValue(
              'callRules.incomingCall.extension',
              selectedOptions?.map((opt) => ({
                label: opt.label?.split(' (')[0] || 'Select',
                value: opt.value || '',
              })) || [],
              { shouldValidate: true },
            );
          }}
          value={watch('callRules.incomingCall.extension') || []}
          inputClass="team_chat"
          FormatOptionLabel={ExtensionListView}
          isLoading={isLoading || isFetchingNextPage}
          onInputChange={setExtensionSearch}
          onMenuScrollToBottom={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
        />

        <DialogFooter>
          <div className="justify-end flex gap-2">
            <Button type="button" variant={'transparent'} onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button variant={'outline'} type="button" onClick={() => onSubmit()}>
              {selectedObjKey ? 'Update' : 'Add'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCoworkerModal;
