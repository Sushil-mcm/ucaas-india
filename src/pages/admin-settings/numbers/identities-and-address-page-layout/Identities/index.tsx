import { Icon, IconName } from '@/assets/icons/icon';
import CustomTooltip from '@/components/custom/custom-tooltip';
import SideDrawer from '@/components/custom/side-drawer';
import TableManager from '@/components/custom/table-manager';
import {
  deleteIdentity,
  getIdentityList,
  updateIdentity,
  uploadIdentityProof,
  uploadIdentitySupportingDocuments,
} from '@/services/api';
import { useState } from 'react';
import CreateIdentity from '../../all-numbers/add-number-2/create-identity';
import { yupResolver } from '@hookform/resolvers/yup';
import { identitiesUpdateSchema, initialState } from '../../all-numbers/constants';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { parsePhoneNumber } from 'libphonenumber-js/max';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Loader from '@/components/custom/loader';
import { handleAlert } from '@/lib/utils';
import AlertConfirm from '@/components/custom/alert-confirm';

const Identities = ({ search }: { search: string }) => {
  const [drawerState, setDrawerState] = useState({
    editIdentity: false,
  });
  const [modalState, setModalState] = useState({
    deleteIdentity: false,
  });
  const [rowData, setRowData] = useState<any>(null);
  const formInstance = useForm<any>({
    defaultValues: initialState,
    resolver: yupResolver(identitiesUpdateSchema),
    // context: { schemaContext },
    mode: 'onChange',
  });
  const handleDrawerClose = () => {
    setDrawerState((prev) => ({ ...prev, editIdentity: false }));
    setRowData(null);
  };
  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, deleteIdentity: false }));
    setRowData(null);
  };

  const { handleSubmit, getValues } = formInstance;
  // const proofs = useWatch({ name: 'proofs', control }) || [];
  const queryClient: any = useQueryClient();

  const { mutateAsync: mutateUploadProofs, isPending: isUploadProofPending } = useMutation({
    mutationKey: ['uploadIdentityProof'],
    mutationFn: uploadIdentityProof,
  });

  const { mutateAsync: mutateUploadSupportingDocs, isPending: isUploadSupportingDocuments } =
    useMutation({
      mutationKey: ['uploadIdentitySupportingDocuments'],
      mutationFn: uploadIdentitySupportingDocuments,
    });

  const { mutate: mutateUpdateIdentity, isPending: isUpdateIdentityPending } = useMutation({
    mutationKey: ['updateIdentity'],
    mutationFn: updateIdentity,

    onSuccess: async (data) => {
      const identityId = rowData?.formData?.identity_id || '';

      const files = getValues('proofs') || [];
      const supportingDocs = getValues('supporting_documents') || [];

      const proofFiles = files.filter((item: any) => item?.file instanceof File);
      const supportingDocFiles = supportingDocs.filter((item: any) => item?.file instanceof File);

      const uploadTasks: Promise<any>[] = [];
      if (proofFiles.length > 0) {
        const formData = new FormData();

        proofFiles.forEach((item: any) => {
          formData.append('identity_proof', item.file);
          formData.append('proof_type_id[]', item.proof_type_id?.value);
        });

        formData.append('identity_id', identityId);
        formData.append('type', 'identity');
        uploadTasks.push(mutateUploadProofs(formData));
      }
      if (supportingDocFiles.length > 0) {
        const formData = new FormData();
        supportingDocFiles.forEach((item: any) => {
          formData.append('identity_supporting_document', item.file);
          formData.append(
            'supporting_document_template_id[]',
            item.supporting_document_template_id?.value,
          );
        });

        formData.append('identity_id', identityId);
        formData.append('type', 'supporting_document');
        uploadTasks.push(mutateUploadSupportingDocs(formData));
      }

      try {
        if (uploadTasks.length > 0) {
          await Promise.all(uploadTasks);
        }
        handleAlert({
          text: data?.data?.data?.message || 'Identity updated successfully!',
          type: 'success',
        });
        queryClient.invalidateQueries({
          queryKey: ['getIdentityList'],
        });
        setDrawerState((prev) => ({ ...prev, editIdentity: false }));
      } catch (err) {
      }
    },
  });

  const { mutateAsync: mutateDeleteIdentity, isPending: isDeleteIdentityPending } = useMutation({
    mutationKey: ['deleteIdentity'],
    mutationFn: deleteIdentity,
    onSuccess: () => {
      handleModalClose();
      queryClient.invalidateQueries({
        queryKey: ['getIdentityList'],
      });
    },
  });

  const isLoading = [
    isUpdateIdentityPending,
    isUploadProofPending,
    isUploadSupportingDocuments,
  ].some((v) => v);

  const columns = [
    {
      header: 'Name',
      accessorKey: 'identity',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        const name = `${data?.identity?.firstname || ''} ${data?.identity?.lastname || ''}`;
        return name;
      },
    },
    {
      header: 'Type',
      accessorKey: 'identity_type',
    },
    {
      header: 'Phone Number',
      accessorKey: 'exp_year',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        const phone = `${data?.identity?.prefix || ''} ${data?.identity?.phone || ''}`;
        return phone;
      },
    },
    {
      header: 'Address',
      accessorKey: 'address_count',
    },
    {
      header: 'Proofs',
      accessorKey: 'proof_count',
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
              setDrawerState((prev) => ({ ...prev, editIdentity: true }));
            },
            className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: 'Edit',
          },
          {
            icon: 'TrashBin',
            onClick: () => {
              setRowData({ isEdit: true, formData: data });
              setModalState((prev) => ({ ...prev, deleteIdentity: true }));
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

  const onSubmit = (values: any) => {
    const {
      type,
      company_name,
      company_registration_number,
      vat_number,
      website,
      firstname,
      lastname,
      email,
      phone,
      tax_id,
      id_number,
      country,
      birth_place,
      day,
      month,
      year,
      description,
      requirements_type,
      requirements_country,
      number_type,
    } = values || {};
    const identityId = rowData?.formData?.identity_id || '';
    const parsedNumber = parsePhoneNumber(phone.startsWith('+') ? phone : `+${phone}`);
    const paddedDay = String(day).padStart(2, '0');
    const isBirthDateValid = year && month && paddedDay && ![year, month, paddedDay].includes('--');
    const payload = {
      type: type?.value,
      company_name,
      company_registration_number,
      vat_number,
      website,
      firstname,
      lastname,
      email,
      prefix: `+${parsedNumber?.countryCallingCode}`,
      phone: parsedNumber?.nationalNumber,
      tax_id,
      id_number,
      country: country?.value,
      birth_place: birth_place?.value,
      birth_date: isBirthDateValid ? `${year}-${month?.value}-${paddedDay}` : '',
      description,
      requirements_type: requirements_type?.value,
      requirements_country,
      number_type,
      uuid: identityId,
    };
    mutateUpdateIdentity(payload);
  };

  return (
    <div>
      <div className="w-ful p-3 flex flex-col gap-2">
        <TableManager
          {...{
            columns,
            search,
            fetcherKey: 'getIdentityList',
            fetcherFn: getIdentityList,
            emptyTablePlaceholder: 'No identities yet',
            descriptionEmptyTable:
              'Identities are created while buying a number that requires verification. Any you register during that flow appear here.',
          }}
        />
      </div>
      {drawerState.editIdentity && (
        <SideDrawer
          width="min(1040px, 84vw)"
          title="Edit Identity"
          isOpen={drawerState.editIdentity}
          isTab={false}
          handleClose={handleDrawerClose}
          content={
            <form onSubmit={handleSubmit(onSubmit)}>
              <CreateIdentity
                rowData={rowData}
                className="h-[calc(100vh-11rem)]"
                handleClose={handleDrawerClose}
                formInstance={formInstance}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" onClick={handleDrawerClose} variant={'transparent'}>
                  Cancel
                </Button>
                <Button disabled={isLoading} variant={'primary'} type="submit" className="min-w-32">
                  {isLoading && <Loader variant="blue" />}Update
                </Button>
              </div>
            </form>
          }
        />
      )}
      {modalState?.deleteIdentity && (
        <AlertConfirm
          {...{
            apiLoading: isDeleteIdentityPending,
            onConfirm: () => {
              mutateDeleteIdentity({ identity_id: rowData?.formData?.identity_id });
            },
            open: modalState?.deleteIdentity,
            setOpen: () => handleModalClose(),
          }}
        />
      )}
    </div>
  );
};

export default Identities;
