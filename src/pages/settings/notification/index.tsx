import { getUserDetails, updateUserSettings } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { NOTIFICATION_SETTINGS_INITIAL, NOTIFICATION_TYPES_LIST } from '../constant';
import { handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Icon } from '@/assets/icons/icon';
import PhoneInput from 'react-phone-input-2';
// import Breadcrumb from '@/components/custom/breadcrumb';

const SettingsNotification = () => {
  // const breadcrumbData = [{ label: 'Settings' }, { label: 'Notification' }];
  const { data: userInfoData } = useQuery({
    queryKey: ['getUserDetailsForNotification'],
    queryFn: getUserDetails,
    select: (data) => data?.data?.data?.result,
  });

  const queryClient: any = useQueryClient();
  const { setValue, watch, handleSubmit, reset } = useForm<any>({
    mode: 'all',
    defaultValues: NOTIFICATION_SETTINGS_INITIAL,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInfo'] });
      invalidateGlobalUsersDirectory(queryClient);
      handleAlert({
        text: 'Notification settings saved successfully!',
        type: 'success',
      });
    },
  });

  useEffect(() => {
    if (userInfoData) {
      reset(userInfoData?.notification_settings?.notification_settings);
    }
  }, [userInfoData]);

  const onSubmit = (data: any) => {
    const formattedData = { ...data };

    Object.keys(formattedData).forEach((key) => {
      if (formattedData[key] && typeof formattedData[key] === 'object') {
        if (formattedData[key].sms === false) {
          formattedData[key].phone = '';
        }
      }
    });

    const payload = {
      key: 'notification_settings',
      value: {
        notification_settings: {
          ...formattedData,
          forgot_password: {
            email: true,
            socket: false,
            sms: true,
            push: false,
          },
        },
      },
    };

    mutate(payload);
  };

  return (
    <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden">
      {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <p className="text-gray-900 font-semibold text-lg">Notifications</p>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="gap-3 p-3 flex flex-col justify-between h-full"
      >
        <div className="flex flex-col gap-2  overflow-y-auto pr-1">
          <h4 className="text-gray-900 font-semibold text-md">Notification Settings</h4>

          <p className="text-gray-700 text-sm mb-1">
            Manage how you receive notifications across different channels
          </p>
          <div className="w-full flex flex-col gap-3">
            {NOTIFICATION_TYPES_LIST.map((item) => (
              <div className="border border-gray-200 bg-white rounded-xl" key={item?.id}>
                <div className="w-full flex items-center gap-3 border-b border-gray-200 px-4 py-3">
                  {item?.iconType === 'circle' ? (
                    <span className={item?.iconClass}></span>
                  ) : (
                    <Icon name={item?.iconName} className={item?.iconClass} />
                  )}
                  <p className="font-semibold truncate text-md text-gray-900  ">{item?.name}</p>
                </div>
                <div className="flex xs:flex-wrap sm:flex-nowrap  justify-between gap-4 px-4 py-3 w-full">
                  {item?.settingsType?.map(({ label, value }) => {
                    return (
                      <div key={value} className="w-full flex flex-col gap-2">
                        <div
                          className={`w-full flex items-center justify-between gap-2 ${watch(`${item?.value}.${value}`) ? 'bg-ucass-primary-200/50 border-primary/15' : 'border-gray-200 bg-gray-100'}  border  rounded-md p-3`}
                        >
                          <Label className="text-gray-700 text-sm">{label}:</Label>
                          <Switch
                            disabled={item?.id === 3 && value === 'sms'}
                            className="cursor-pointer"
                            onCheckedChange={(checked) => {
                              setValue(`${item?.value}.${value}`, checked);
                              if (checked && value === 'sms' && !watch(`${item?.value}.phone`)) {
                                setValue(
                                  `${item?.value}.phone`,
                                  userInfoData?.user_info?.phone || '',
                                );
                              }
                            }}
                            checked={watch(`${item?.value}.${value}`)}
                          />
                        </div>
                        {value === 'sms' && watch(`${item?.value}.${value}`) && (
                          <div className="w-full pl-2 pr-2 pb-2">
                            <PhoneInput
                              country={'us'}
                              value={watch(`${item?.value}.phone`) || ''}
                              onChange={(value) => setValue(`${item?.value}.phone`, value)}
                            />
                            <p className="text-xs mt-1">Note: SMS notifications will be charged.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant={'outline'} type="submit" disabled={isPending}>
            {isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>
    </section>
  );
};

export default SettingsNotification;
