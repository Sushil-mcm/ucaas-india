import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changePassword } from '@/services/api';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { yupResolver } from '@hookform/resolvers/yup';
import { Icon } from '@/assets/icons/icon';
import { handleAlert } from '@/lib/utils';
import { changePasswordSchema } from './schema';
import Loader from '@/components/custom/loader';

const ChangePassword = ({ modalState, setModalState }: any) => {
  const [showPassword, setShowPassword] = useState<any>({
    old_password: false,
    new_password: false,
    confirm_password: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
    resolver: yupResolver(changePasswordSchema),
  });

  const { mutate: changePasswordMutate, isPending } = useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
      handleAlert({ text: data?.data?.data?.message, type: 'success' });
      setModalState(false);
    },
  });

  const handleFormSubmit = (data: any) => {
    changePasswordMutate(data);
  };

  const togglePasswordVisibility = (field: any) => {
    setShowPassword((prev: any) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent className="w-1/4 p-3" showCloseButton={false}>
        <DialogHeader>Change Password</DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(handleFormSubmit)}>
          <Input
            onIconClick={() => togglePasswordVisibility('old_password')}
            Icon={showPassword?.old_password ? <Icon name="EyeLineOff" /> : <Icon name="EyeLine" />}
            placeholder="Enter old password"
            label="Old Password"
            required
            type={showPassword?.old_password ? 'text' : 'password'}
            {...register('old_password')}
            error={errors?.old_password?.message}
          />
          <Input
            onIconClick={() => togglePasswordVisibility('new_password')}
            Icon={showPassword?.new_password ? <Icon name="EyeLineOff" /> : <Icon name="EyeLine" />}
            placeholder="Enter new password"
            label="New Password"
            required
            type={showPassword?.new_password ? 'text' : 'password'}
            {...register('new_password')}
            error={errors?.new_password?.message}
          />
          <Input
            onIconClick={() => togglePasswordVisibility('confirm_password')}
            Icon={
              showPassword?.confirm_password ? <Icon name="EyeLineOff" /> : <Icon name="EyeLine" />
            }
            placeholder="Enter confirm password"
            label="Confirm Password"
            required
            type={showPassword?.confirm_password ? 'text' : 'password'}
            {...register('confirm_password')}
            error={errors?.confirm_password?.message}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant={'outline'} onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <div className="flex items-center justify-center p-5">
                  <Loader variant="blue" size="sm" />
                </div>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePassword;
