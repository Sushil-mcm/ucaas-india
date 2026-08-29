import { CloseIcon, SearchLine } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomSelect from '@/components/custom/custom-select';
import NumberWithFlag from '@/components/custom/number-with-flag';
import TableManager from '@/components/custom/table-manager';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { ModalProps } from '@/interfaces/common-interface';
import { handleAlert } from '@/lib/utils';
import { allNumbersList, assignDIDNumber, getUserList } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { FC, useState } from 'react';

interface IAssignDID {
  uuid: string;
  role_data: { name: string };
  did_number: any;
  phone: string;
  caller_id: string;
}

interface IDID {
  did_number: string;
  uuid: string;
}

interface IAsiignDIDProps extends ModalProps {
  selectedDidNumber: any;
}

const AssignDIDNumber: FC<IAsiignDIDProps> = ({ modalState, setModalState, selectedDidNumber }) => {
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<IAssignDID | null>(null);
  const [didNumber, setDIDNumber] = useState<ISELECTVALUE | null>({
    label: selectedDidNumber?.did_number || '',
    value: selectedDidNumber?.did_number || '',
  });
  const queryClient: any = useQueryClient();

  const { data: DIDUnassignList = [] } = useQuery({
    queryKey: ['numbersInventoryTable'],
    queryFn: () => allNumbersList({ type: 'inventory' }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const { mutate: mutateAssignNumber, isPending: isPendingAssignNumber } = useMutation({
    mutationFn: assignDIDNumber,
    onSuccess: (data: any) => {
      invalidateNumberLists(queryClient);
      handleAlert({
        text: data?.data?.data?.message || 'DID Assigned Successfully.',
        type: 'success',
      });
      setModalState(false);
    },
  });

  const columns: ColumnDef<IAssignDID>[] = [
    {
      header: 'Select',
      accessorKey: 'created_at',
      cell: ({ row }) => {
        return (
          <div className="flex justify-center cursor-pointer">
            <RadioGroup value={selected?.uuid} onValueChange={() => setSelected(row?.original)}>
              <div className="flex items-center gap-3">
                <RadioGroupItem value={row?.original?.uuid} id="yes" />
              </div>
            </RadioGroup>
          </div>
        );
      },
    },

    {
      header: 'User Details',
      accessorKey: 'first_name',
      cell: ({ row }: any) => {
        const data = row?.original;
        const fullName = `${data?.first_name}${data?.last_name ? ` ${data?.last_name}` : ''}`;
        return (
          <div className="flex items-center gap-2 w-full">
            <div className="flex ">
              <CustomAvatar
                name={fullName}
                showPresence
                extension={data?.extension}
                image={data?.profile}
              />
            </div>
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between  gap-2">
                <div className="flex flex-col items-start ">
                  <p className="capitalize">{fullName}</p>
                  <small className="text-primary text-[10px]">
                    {data?.custom_role_data?.name || data?.role_data?.name || data?.role}
                  </small>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Icon name="Grid" className="w-4 h-4 " />
                  <div>{data?.extension}</div>
                </div>
              </div>
              <p className="text-gray-500 flex justify-between">
                <div>{data?.email}</div>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Phone',
      accessorKey: 'phone',
      cell: ({ getValue }) => <NumberWithFlag number={getValue()} />,
    },
    {
      header: 'Caller Id',
      accessorKey: 'caller_id',
      cell: ({ getValue, row }) => {
        const data: any = row?.original || {};
        if (data?.assigned_did && data?.assigned_did?.length > 1) {
          return (
            <CustomSelect
              className="max-w-40"
              options={data?.assigned_did?.map((v: any) => ({
                label: v?.did_number,
                value: v?.did_number,
              }))}
              value={{ value: getValue(), label: getValue() }}
            />
          );
        } else {
          return <NumberWithFlag number={getValue()} />;
        }
      },
    },
    {
      header: 'Site',
      accessorKey: 'site',
      cell: ({ row }: any) => row?.original?.site?.name || '---',
    },
  ];
  const handleSubmit = () => {
    if (selected?.uuid) {
      mutateAssignNumber({ uuid: selected?.uuid, did_number: didNumber?.value });
    }
  };
  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="min-w-3/5 w-fit p-3" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Assign Number
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex justify-between  gap-2 items-end">
            <div className="flex flex-col  gap-1">
              <Label className="mb-1">You have selected this DID:</Label>
              <div>
                <CustomSelect
                  options={
                    DIDUnassignList?.length > 0 &&
                    DIDUnassignList?.map((item: IDID) => ({
                      id: item?.uuid,
                      label: item?.did_number,
                      value: item?.did_number,
                    }))
                  }
                  handleChange={(e: ISELECTVALUE | null) => {
                    setDIDNumber(e);
                  }}
                  value={didNumber}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Search"
                className="pl-10 w-full"
                IconPosition="left-0 pl-2 inset-y-0"
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.startsWith(' ')) return;
                  setSearch(e.target.value);
                }}
                Icon={<SearchLine className=" text-gray-700" />}
              />{' '}
            </div>
          </div>
          <div className="flex flex-col gap-2 h-[calc(100vh_-_19rem)] overflow-auto">
            <TableManager
              {...{
                columns,
                fetcherKey: 'getUserListQueryFn',
                fetcherFn: getUserList,
                showPagination: true,
                search,
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <div className="justify-end flex gap-2">
            <Button type="button" variant={'transparent'} onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button
              variant={'outline'}
              type="button"
              disabled={!selected?.uuid}
              onClick={() => handleSubmit()}
            >
              {isPendingAssignNumber ? 'Submiting...' : 'Submit'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDIDNumber;
