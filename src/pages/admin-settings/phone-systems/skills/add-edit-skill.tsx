import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FC, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import { CloseIcon } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as yup from 'yup';
import { requiredString } from '@/lib/schema';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleAlert } from '@/lib/utils';
import { upsertSkill } from '@/services/api';
import CustomSelect from '@/components/custom/custom-select';
import { SKILLS_QUERY_KEY, SkillCategory, useSkillCategories } from '@/hooks/use-queue-skills';

const SkillSchema = yup.object().shape({
  name: requiredString('Name', 2, 50),
  description: yup.string().trim().max(200, 'Description can be at most 200 characters'),
  category_id: yup.string().trim().required('Choose a category'),
  code: yup.string().trim().max(16, 'A language code can be at most 16 characters'),
});

interface SkillModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  editdata?: any;
  /* Opened from a category's own "Add" link: start there. */
  defaultCategory?: SkillCategory;
}

const SkillModal: FC<SkillModalProps> = ({ modalState, setModalState, editdata, defaultCategory }) => {
  const queryClient: any = useQueryClient();
  const { rows: categories } = useSkillCategories();
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    defaultValues: { name: '', description: '', category_id: '', code: '' },
    resolver: yupResolver(SkillSchema),
    mode: 'onChange',
  });
  const categoryId = watch('category_id');
  const category = categories.find((c) => c._id === categoryId);
  const categoryOptions = categories.map((c) => ({ value: c._id, label: c.name }));

  const { mutate: mutateUpsertSkill, isPending } = useMutation({
    mutationFn: upsertSkill,
    onSuccess: () => {
      handleAlert({ text: editdata ? 'Skill updated' : 'Skill added', type: 'success' });
      queryClient.invalidateQueries([SKILLS_QUERY_KEY]);
      queryClient.invalidateQueries(['getSkillCategories']);
      setModalState(false);
    },
  });

  const onSubmit = (data: any) => {
    mutateUpsertSkill({
      name: data?.name?.trim(),
      description: data?.description?.trim() || '',
      category_id: data?.category_id || '',
      code: category?.kind === 'language' ? data?.code?.trim() || '' : '',
      ...(editdata && { uuid: editdata?._id }),
    });
  };

  useEffect(() => {
    setValue('name', editdata?.name || '');
    setValue('description', editdata?.description || '');
    setValue('code', editdata?.code || '');
  }, []);

  /* The category: the skill's own, the one the admin clicked "Add" on, or
     General - chosen as soon as the list is here, so the field is never
     blank for a reason the admin cannot see. */
  useEffect(() => {
    if (!categories.length || watch('category_id')) return;
    const wanted =
      String(editdata?.category_id || '') ||
      defaultCategory?._id ||
      categories.find((c) => c.is_default)?._id ||
      categories[0]._id;
    setValue('category_id', wanted, { shouldValidate: true });
  }, [categories]);

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent
        className="sm:w-1/2 md:w-1/4 w-full p-3 max-h-[99%] overflow-y-auto"
        showCloseButton={false}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full flex flex-col gap-3 justify-between h-full"
        >
          <div className="flex flex-col gap-1.5 text-900/80">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              {editdata ? 'Edit skill' : 'Add skill'}
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer text-gray-500 opacity-70 transition-opacity hover:opacity-100"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Something a person can handle, like Billing or Spanish, under the category it belongs
              to. Rate each person on it from the skill's People or their profile.
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5 w-full">
              <CustomSelect
                label="Category"
                options={categoryOptions}
                value={categoryOptions.find((o) => o.value === categoryId) || null}
                handleChange={(picked: any) =>
                  setValue('category_id', String(picked?.value || ''), { shouldValidate: true, shouldDirty: true })
                }
                placeholder={categoryOptions.length ? 'Choose a category' : 'Loading…'}
                error={(errors?.category_id as any)?.message}
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <Input
                type="text"
                placeholder={category?.kind === 'language' ? 'e.g. Spanish' : 'e.g. Billing'}
                label="Name"
                {...register('name')}
                error={(errors?.name as any)?.message}
                maxLength={50}
              />
            </div>
            {category?.kind === 'language' && (
              <div className="flex flex-col gap-1.5 w-full">
                <Input
                  type="text"
                  placeholder="e.g. es, fr-CA"
                  label="Language code (optional)"
                  {...register('code')}
                  error={(errors?.code as any)?.message}
                  maxLength={16}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <Label>Description (optional)</Label>
                {(errors?.description as any)?.message && (
                  <ErrorTooltip text={(errors?.description as any)?.message} />
                )}
              </div>
              <textarea
                rows={3}
                className={`border rounded-xl text-sm resize-none p-3 ${
                  errors?.description?.message
                    ? 'border-red-300 focus:border-red-300'
                    : 'border-gray-300 hover:border-primary focus:border-primary'
                } focus-visible:outline-none`}
                placeholder="What calls this skill covers"
                {...register('description')}
                maxLength={201}
              />
            </div>
          </div>
          <div className="justify-end flex gap-2">
            <Button variant={'transparent'} type="button" onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button variant={'primary'} type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SkillModal;
