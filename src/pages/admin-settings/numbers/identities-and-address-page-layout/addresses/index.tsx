import { Icon, IconName } from '@/assets/icons/icon';
import CustomTooltip from '@/components/custom/custom-tooltip';
import SideDrawer from '@/components/custom/side-drawer';
import TableManager from '@/components/custom/table-manager';
import { deleteAddress, getAddressesList, updateAddress, uploadAddressProof } from '@/services/api';
import { useState } from 'react';
import CreateNewAddress from './create-new-address';
import AlertConfirm from '@/components/custom/alert-confirm';
import { Button } from '@/components/ui/button';
import Loader from '@/components/custom/loader';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addressUpdateSchema, initialState } from '../../all-numbers/constants';
import { yupResolver } from '@hookform/resolvers/yup';

const Addresses = ({ search }: { search: string }) => {
  const [rowData, setRowData] = useState<any>(null);
  const [drawerState, setDrawerState] = useState({
    editAddress: false,
  });
  const [modalState, setModalState] = useState({
    deleteAddress: false,
  });
  const queryClient: any = useQueryClient();
  const handleDrawerClose = () => {
    setDrawerState((prev) => ({ ...prev, editAddress: false }));
    setRowData(null);
  };
  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, deleteAddress: false }));
    setRowData(null);
  };
  const formInstance = useForm<any>({
    // defaultValues: initialAddressState,
    defaultValues: initialState,
    resolver: yupResolver(addressUpdateSchema),
    mode: 'onChange',
  });
  const { handleSubmit, getValues } = formInstance;
  const { mutate: mutateUpload, isPending: isUploadProofPending } = useMutation({
    mutationKey: ['uploadAddressProof'],
    mutationFn: uploadAddressProof,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getAddressesList'],
      });
    },
  });
  const { mutate: mutateUpdateAddress, isPending: isUpdateAddressPending } = useMutation({
    mutationKey: ['updateAddress'],
    mutationFn: updateAddress,
    onSuccess: () => {
      const addressId = rowData?.formData?.address_id;
      const identityId = rowData?.formData?.identity_id;
      const files = getValues('addressProofs') || [];

      const proofFiles = files?.filter((item: any) => item?.file instanceof File);
      if (proofFiles?.length > 0) {
        const formData = new FormData();
        proofFiles?.forEach((item: any) => {
          formData.append('identity_address_proof', item?.file);
          formData.append('proof_type_id[]', item?.proof_type_id?.value);
        });
        formData.append('type', 'address');
        formData.append('address_id', addressId);
        formData.append('identity_id', identityId);
        mutateUpload(formData);
      }
      queryClient.invalidateQueries({
        queryKey: ['getAddressesList'],
      });
      handleDrawerClose();
    },
  });

  const isLoading = [isUpdateAddressPending, isUploadProofPending].some((v) => v);
  const { mutateAsync: mutateDeleteAddress, isPending: isDeleteAddressPending } = useMutation({
    mutationKey: ['deleteAddress'],
    mutationFn: deleteAddress,
    onSuccess: () => {
      handleModalClose();
      queryClient.invalidateQueries({
        queryKey: ['getAddressesList'],
      });
    },
  });

  const columns = [
    {
      header: 'Country/Region',
      accessorKey: 'address.country',
      cell: ({ row }: any) => {
        const { country = '', state = '' } = row?.original?.address || {};
        const name = `${country}/${state}`;
        return name;
      },
    },
    {
      header: 'City',
      accessorKey: 'address.city',
    },
    {
      header: 'Postal Code',
      accessorKey: 'address.zipcode',
    },
    {
      header: 'Address',
      accessorKey: 'address.address',
    },
    {
      header: 'Proofs',
      accessorKey: 'address_proof',
      cell: ({ row }: any) => {
        const proofsArr = row?.original?.address_proof || [];
        return proofsArr?.length || 0;
      },
    },
    {
      header: 'Description',
      accessorKey: 'address.description',
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: (props: any) => {
        const data = props?.row?.original;
        if (data?.is_primary) return;
        const actions = [
          {
            icon: 'EditStrokIcon',
            onClick: () => {
              setRowData({ isEdit: true, formData: data });
              setDrawerState((prev) => ({ ...prev, editAddress: true }));
            },
            className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: 'Edit',
          },
          {
            icon: 'TrashBin',
            onClick: () => {
              setRowData({ isEdit: true, formData: data });
              setModalState((prev) => ({ ...prev, deleteAddress: true }));
            },
            className: 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white',
            tooltipText: 'Delete',
          },
        ];

        return (
          <div className="flex items-center gap-2">
            {actions?.map((action, index) => (
              <CustomTooltip text={action.tooltipText} side="top">
                <div
                  key={index}
                  className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 ${action.className}`}
                  onClick={() => {
                    action.onClick();
                  }}
                >
                  <Icon name={action.icon as IconName} className="w-5 h-5" />
                </div>
              </CustomTooltip>
            ))}
          </div>
        );
      },
    },
  ];

  const onSubmit = ({
    // requirements_type,
    // requirements_country,
    // number_type,
    address_state,
    addressDescription,
    country,
    addressProofs,
    ...rest
  }: {
    requirements_type?: string;
    requirements_country?: string;
    number_type?: string;
    country?: any;
    address_state?: string;
    addressDescription?: string;
    addressProofs?: any;
    rest?: object;
  }) => {
    const payload = {
      ...rest,
      identity_id: rowData?.isEdit ? rowData?.formData?.identity_id : rowData?.formData?.id,
      address_id: rowData?.isEdit ? rowData?.formData?.address_id : rowData?.formData?.id,
      country: country?.value,
      state: address_state,
      description: addressDescription,
      proofs: addressProofs,
      ...(rowData?.isEdit && { uuid: rowData?.id }),
    };
    mutateUpdateAddress(payload);
  };
  return (
    <div>
      <div className="w-ful p-3 flex flex-col gap-2">
        <TableManager
          {...{
            columns,
            search,
            fetcherKey: 'getAddressesList',
            fetcherFn: getAddressesList,
            emptyTablePlaceholder: 'No addresses yet',
            descriptionEmptyTable:
              'Service addresses are created while buying a number that requires one. Any you add during that flow appear here.',
          }}
        />
      </div>
      {drawerState.editAddress && (
        <SideDrawer
          width="min(1040px, 84vw)"
          title="Edit Address"
          isOpen={drawerState.editAddress}
          isTab={false}
          handleClose={handleDrawerClose}
          content={
            <form onSubmit={handleSubmit(onSubmit)}>
              <CreateNewAddress rowData={rowData} formInstance={formInstance} />
              <div className="flex justify-end gap-2">
                <Button type="button" onClick={handleDrawerClose} variant="transparent">
                  Cancel
                </Button>
                <Button disabled={isLoading} variant="outline" type="submit" className="min-w-32">
                  {isLoading && <Loader variant="blue" />}Update
                </Button>
              </div>
            </form>
          }
        />
      )}
      {modalState?.deleteAddress && (
        <AlertConfirm
          {...{
            apiLoading: isDeleteAddressPending,
            onConfirm: () => {
              mutateDeleteAddress({ address_id: rowData?.formData?.address_id });
            },
            open: modalState?.deleteAddress,
            setOpen: () => handleModalClose(),
          }}
        />
      )}
    </div>
  );
};

export default Addresses;
