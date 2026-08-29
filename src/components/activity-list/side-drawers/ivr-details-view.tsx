import Loader from '@/components/custom/loader';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getDepartmentAndCallLogs } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { safeJSONParse } from '../constants';
import { FORWARD_TYPES_LABEL } from '@/components/custom/forward-action-all';
import { FORWARD_TYPES } from '@/constants/forwarding-consts';
import PhoneInput from 'react-phone-input-2';
import { ExtensionListView } from '@/pages/admin-settings/people/update-forwarding/call-rules/add-coworker';
// import { MEDIA_URL } from '@/lib/utils';
// import { useUser } from '@/hooks/use-user';
// import { Button } from '@/components/ui/button';
// import { CloseIcon, Play } from '@/assets/icons';
// import { useState } from 'react';

const IVRDetailsView = ({ rowData }: any) => {
  const { callID, forward_type } = rowData || {};
  // const { user } = useUser();
  // const { company_info } = user;
  // const [isPlay, setIsPlay] = useState<boolean>(false);

  const { data: departmentData = {}, isLoading: isPendingDepartmentList } = useQuery({
    queryKey: ['getDepartmentAndCallLogs', callID, forward_type],
    queryFn: () => getDepartmentAndCallLogs({ call_id: callID, type: forward_type }),
    select: (data) => data?.data?.data?.result || {},
    enabled: !!callID,
  });

  const rawIVRResult = Array.isArray(departmentData?.result)
    ? departmentData?.result?.[0] || {}
    : departmentData?.result || {};
  const ivrInfo = rawIVRResult?.ivr || rawIVRResult || {};

  const {
    name = '',
    extension = '',
    site = '{}',
    ivr_option = '{}',
    generic_keys = '{}',
  } = ivrInfo;

  const genericKeys: any = safeJSONParse(generic_keys, []);
  const IVROptions: any = safeJSONParse(ivr_option, {});
  const siteInfo: any = safeJSONParse(site, {});

  return (
    <>
      {isPendingDepartmentList ? (
        <div className="flex items-center justify-center h-full">
          <Loader variant="blue" size="sm" />
        </div>
      ) : (
        <div className="w-full flex pt-3 flex-col gap-3 h-[calc(100vh_-_6.5rem)] overflow-auto">
          <div className="bg-white p-3 border border-gray-200 rounded-xl">
            <div className="font-semibold text-gray-900 truncate text-md mb-2">Basic Info</div>
            <div className="grid grid-cols-3 gap-4 ">
              <div className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3">
                <p className="font-medium text-gray-900 text-sm">IVR Name</p>
                <p className="text-sm text-gray-500">{name}</p>
              </div>
              <div className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3">
                <p className="font-medium text-gray-900 text-sm">Location</p>
                <p className="text-sm text-gray-500">{siteInfo?.label}</p>
              </div>
              <div className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3">
                <p className="font-medium text-gray-900 text-sm">IVR Extension</p>
                <p className="text-sm text-gray-500">{extension}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 border border-gray-200 rounded-xl flex flex-col gap-2">
            <div className="font-semibold text-gray-900 truncate text-md">Manage Key Press</div>
            <div className="grid grid-cols-3 gap-4 border-t border-gray-200 pt-2">
              <div className="w-full">
                <p className="font-medium text-gray-900 text-sm">Key Press</p>
              </div>
              <div className="w-full">
                <p className="font-medium text-gray-900 text-sm">Action</p>
              </div>
              <div className="w-full">
                <p className="font-medium text-gray-900 text-sm">Value</p>
              </div>
            </div>
            {IVROptions &&
              IVROptions?.length > 0 &&
              IVROptions?.map((item: any) => {
                return (
                  <div
                    className="grid grid-cols-3 gap-4 border-t border-gray-200 pt-2"
                    key={item?.key}
                  >
                    <div className="w-full">
                      <p className="text-sm text-gray-500">{item?.key}</p>
                    </div>
                    <div className="w-full">
                      <p className="text-sm text-gray-500 uppercase">{item?.type}</p>
                    </div>
                    <div className="w-full">
                      {item?.type !== 'HANGUP' && (
                        <div className="text-sm text-gray-500">
                          {item?.label || '--'}{' '}
                          {/* {isPlay ? (
                          <div className={`flex items-center gap-2`}>
                            <audio
                              controls
                              src={`${MEDIA_URL}/${company_info?.uuid}/greeting/${item?.value}`}
                              className="w-full h-10"
                            />
                            <Button
                              type="button"
                              variant={'outline'}
                              className="w-10 h-10 min-w-10 text-red-500 text-lg font-bold border-red-500 hover:bg-red-500"
                              onClick={() => setIsPlay(false)}
                            >
                              <CloseIcon className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant={'outline'}
                            className="w-10 h-10"
                            onClick={() => setIsPlay(true)}
                          >
                            <Play className="w-5 h-5" />
                          </Button>
                        )} */}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="bg-white p-3 border border-gray-200 rounded-xl flex flex-col gap-2">
            {/* <div className="font-semibold text-gray-900 truncate text-md">Generic Key Press</div> */}
            {/* <div className="flex gap-5">
              <RadioGroup
                disabled
                defaultValue={String(genericKeys?.enabled)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="true" id="yes" />
                  <Label htmlFor="yes">Yes</Label>
                </div>

                <div className="flex items-center gap-3">
                  <RadioGroupItem value="false" id="no" />
                  <Label htmlFor="no">No</Label>
                </div>
              </RadioGroup>
            </div> */}
            {/* {genericKeys?.enabled && ( */}
            <>
              {/* <p className=" text-gray-500 truncate text-sm mt-4">
                  Customize your keyboard shortcuts and key bindings.
                </p>
                <div className="flex gap-5">
                  <RadioGroup
                    disabled
                    defaultValue={String(genericKeys?.keyboard_shortcuts)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="default" id="yes" />
                      <Label htmlFor="yes">Use Default Settings</Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="specific" id="no" />
                      <Label htmlFor="no">Specify</Label>
                    </div>
                  </RadioGroup>
                </div> */}
              {/* {(genericKeys?.press_hash || genericKeys?.press_asterisk) && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3">
                      <p className="font-medium text-gray-900 text-sm">Press #</p>
                      <p className="text-sm text-gray-500">{genericKeys?.press_hash}</p>
                    </div>
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3">
                      <p className="font-medium text-gray-900 text-sm">Press *</p>
                      <p className="text-sm text-gray-500">{genericKeys?.press_asterisk}</p>
                    </div>
                  </div>
                )} */}
              <p className=" text-gray-500 truncate text-sm mt-4">
                If caller enters no action after the prompt played 3 Times.
              </p>
              <div className="flex flex-col gap-2">
                <RadioGroup
                  disabled
                  defaultValue={String(genericKeys?.timeout_action?.status)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="HANGUP" id="yes" />
                    <Label htmlFor="yes">Disconnect the Call</Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="EXTENSION" id="no" />
                    <Label htmlFor="no">Forward to</Label>
                  </div>
                </RadioGroup>
                {genericKeys?.timeout_action?.type && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3">
                      <p className="text-sm text-gray-500">
                        {
                          FORWARD_TYPES_LABEL[
                            genericKeys?.timeout_action?.type as keyof typeof FORWARD_TYPES_LABEL
                          ]
                        }
                      </p>
                    </div>
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3">
                      {FORWARD_TYPES.PHONE === genericKeys?.timeout_action?.type ? (
                        <PhoneInput
                          country={'us'}
                          value={genericKeys?.timeout_action?.label}
                          disabled
                        />
                      ) : [FORWARD_TYPES.EXTENSION, FORWARD_TYPES.VOICEMAIL].includes(
                          genericKeys?.timeout_action?.type,
                        ) ? (
                        <>
                          <ExtensionListView option={genericKeys?.timeout_action} />
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">
                          {genericKeys?.timeout_action?.label}
                        </p>
                      )}
                      {/* <p className="text-sm text-gray-500">{genericKeys?.timeout_action?.status}</p> */}
                    </div>
                  </div>
                )}
              </div>
              <p className=" text-gray-500 truncate text-sm mt-4">
                If caller enters invalid key after prompt plays 3 times.
              </p>
              <div className="flex flex-col gap-2">
                <RadioGroup
                  disabled
                  defaultValue={String(genericKeys?.failure_action?.status)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="HANGUP" id="yes" />
                    <Label htmlFor="yes">Disconnect the Call</Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="EXTENSION" id="no" />
                    <Label htmlFor="no">Forward to</Label>
                  </div>
                </RadioGroup>
                {genericKeys?.failure_action?.type && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3">
                      <p className="text-sm text-gray-500">
                        {
                          FORWARD_TYPES_LABEL[
                            genericKeys?.failure_action?.type as keyof typeof FORWARD_TYPES_LABEL
                          ]
                        }
                      </p>
                    </div>
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3">
                      {FORWARD_TYPES.PHONE === genericKeys?.failure_action?.type ? (
                        <PhoneInput
                          country={'us'}
                          value={genericKeys?.failure_action?.label}
                          disabled
                        />
                      ) : [FORWARD_TYPES.EXTENSION, FORWARD_TYPES.VOICEMAIL].includes(
                          genericKeys?.failure_action?.type,
                        ) ? (
                        <>
                          <ExtensionListView option={genericKeys?.failure_action} />
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">
                          {genericKeys?.failure_action?.label}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
            {/* )} */}
          </div>
        </div>
      )}
    </>
  );
};

export default IVRDetailsView;
