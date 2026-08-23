import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { dailMethodsArr, formDefaultValues, validationSchema } from './constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CustomSelect from '@/components/custom/custom-select';
import TextEditor from '@/components/custom/text-editor';
import { Label } from '@/components/ui/label';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertCallScript } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Loader from '@/components/custom/loader';

const ScriptForm = ({
  isEdit,
  data,
  handleClose,
}: {
  isEdit: boolean;
  data: any;
  handleClose: any;
}) => {
  const queryClient = useQueryClient();
  const [editorKey, setEditorKey] = useState(0);

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<any>({
    defaultValues: formDefaultValues,
    resolver: yupResolver(validationSchema),
    mode: 'onSubmit',
  });

  const { mutate, isPending } = useMutation({
    mutationKey: ['upsertCallScript'],
    mutationFn: upsertCallScript,
    onSuccess: () => {
      handleAlert({
        text: 'Call script ' + (isEdit ? 'updated' : 'created') + ' successfully!',
        type: 'success',
      });
      handleClose(false);
      queryClient.invalidateQueries({ queryKey: ['getCallScript'] });
      reset(formDefaultValues);
    },
  });

  const onSubmit = (values: any) => {
    const { content, name, dialMethod } = values || {};
    const payload = {
      uuid: isEdit ? data?.uuid || data?._id : undefined,
      script: content,
      name,
      dialMethod: dialMethod?.value,
    };
    mutate(payload);
  };

  useEffect(() => {
    if (isEdit && data) {
      const { name = '', dialMethod = '', script = [] } = data || {};
      const dialMethodObj = dailMethodsArr?.find((i) => i.value === dialMethod);
      const defaultValues = {
        name,
        dialMethod: dialMethodObj || '',
        content: script || [
          {
            type: 'paragraph',
            children: [{ text: '' }],
          },
        ],
      };
      reset(defaultValues);
      setValue('content', script);
    }
  }, [data]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEditorKey((prev) => prev + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto xl:overflow-hidden">
      <div className="h-full min-h-0">
        <div className="flex h-full min-h-0 w-full flex-col gap-4 rounded-xl bg-white">
          <form className="flex h-full min-h-0 flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Controller
              control={control}
              name={'name'}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter name"
                  label="Name"
                  error={errors?.name?.message}
                  maxLength={50}
                />
              )}
            />
            <Controller
              control={control}
              name={'dialMethod'}
              render={({ field }) => (
                <CustomSelect
                  {...field}
                  label={'Type'}
                  placeholder="Select type"
                  handleChange={(value) => field.onChange(value)}
                  options={dailMethodsArr}
                  error={errors?.dialMethod?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Content</Label>
                    {errors?.content && (
                      <div className="flex items-start">
                        {errors?.content?.message && (
                          <ErrorTooltip text={errors?.content?.message} />
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className={`flex min-h-[200px] flex-1 overflow-hidden rounded-xl border p-2 md:min-h-[250px] w-full ${
                      errors?.content?.message ? 'border-red-500' : ''
                    }`}
                  >
                    <TextEditor
                      key={editorKey}
                      initialValue={field?.value}
                      onChange={field?.onChange}
                      readOnly={false}
                      maxHeight="max-h-full w-full"
                    />
                  </div>
                </div>
              )}
            />
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-2">
              <Button type="submit" variant={'outline'} disabled={isPending} className="min-w-24">
                {isPending ? <Loader variant="blue" /> : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScriptForm;
