import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import ForwardActionAll from '@/components/custom/forward-action-all';
import useIvrExternalForwarding from '@/hooks/use-ivr-external-forwarding';

const GenericKey = () => {

  /* Hides the outside-number option when the company has switched off menu
     forwarding. A menu already pointed at an outside number keeps working and
     still shows its number — only the choice is withdrawn. */
  const { hiddenForwardTypes } = useIvrExternalForwarding();
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const watchGeneric = watch('generic');

  return (
    <>
      <div className="gap-2 flex flex-col">
        <p className={`text-gray-800  text-sm`}>
          If caller enters no action after the prompt played 3 Times.
        </p>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex w-full rounded-xl border border-gray-200 p-3">
            <RadioGroup
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
              value={watch('generic.timeout_action.status')}
              onValueChange={(value) => {
                setValue('generic.timeout_action.status', value);
                setValue('generic.timeout_action.type', {
                  label: value === 'EXTENSION' ? 'Send to Voicemail' : '',
                  value: value === 'EXTENSION' ? 'VOICEMAIL' : '',
                });

                setValue('generic.timeout_action.value', {
                  label: '',
                  value: '',
                });
              }}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="HANGUP" id="yes" />
                <Label htmlFor="yes">Disconnect the Call</Label>
              </div>
              <p className="text-gray-800  text-sm">or</p>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="EXTENSION" id="no" />
                <Label htmlFor="no">Forward to</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex w-full items-center gap-4">
            {watchGeneric?.timeout_action?.status === 'EXTENSION' && (
              <ForwardActionAll
                {...{
                  setValue,
                  watch,
                  forwardType: 'generic.timeout_action.type',
                  forwardValue: 'generic.timeout_action.value',
                  forwardValueError: (errors?.generic as any)?.timeout_action?.value?.value
                    ?.message,
                  notInclude: ['IVR', ...hiddenForwardTypes],
                  forwardTypeClass: 'w-full lg:w-3/5',
                  forwardValueClass: 'w-full lg:w-3/5',
                  forwardTypeLabel: 'Forward type',
                  forwardValueLabel: 'Forward value',
                  selectCustomClassSecond: 'w-full',
                }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <p className={`text-gray-800 text-sm`}>
          If caller enters invalid key after prompt plays 3 times.
        </p>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex w-full rounded-xl border border-gray-200 p-3">
            <RadioGroup
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
              value={watch('generic.failure_action.status')}
              onValueChange={(value) => {
                setValue('generic.failure_action.status', value);
                setValue('generic.failure_action.type', {
                  label: value === 'EXTENSION' ? 'Send to Voicemail' : '',
                  value: value === 'EXTENSION' ? 'VOICEMAIL' : '',
                });

                setValue('generic.failure_action.value', {
                  label: '',
                  value: '',
                });
              }}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="HANGUP" id="yes" />
                <Label htmlFor="yes">Disconnect the Call</Label>
              </div>
              <p className="text-gray-800 text-sm">or</p>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="EXTENSION" id="no" />
                <Label htmlFor="no">Forward to</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex w-full items-center gap-4">
            {watchGeneric?.failure_action?.status === 'EXTENSION' && (
              <ForwardActionAll
                {...{
                  setValue,
                  watch,
                  forwardType: 'generic.failure_action.type',
                  forwardValue: 'generic.failure_action.value',
                  forwardValueError: (errors?.generic as any)?.failure_action?.value?.value
                    ?.message,
                  notInclude: ['IVR', ...hiddenForwardTypes],
                  forwardTypeClass: 'w-full lg:w-3/5',
                  forwardValueClass: 'w-full lg:w-3/5',
                  forwardTypeLabel: 'Forward type',
                  forwardValueLabel: 'Forward value',
                  selectCustomClassSecond: 'w-full',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* <div className="flex flex-col border border-gray-200 rounded-xl">
        <div className="flex flex-col gap-2 p-3">
          <h5 className="font-semibold  text-md text-gray-900"> Generic Key Press</h5>
          <div className="flex gap-5">
            <RadioGroup
              className="flex gap-4"
              value={watch('generic.enabled')?.toString()}
              onValueChange={(value) => {
                setValue('generic', {
                  enabled: value === 'true',
                  keyboard_shortcuts: 'default',
                  press_hash: {
                    label: 'Return to Previous Menu',
                    value: 'Return to Previous Menu',
                  },
                  press_asterisk: { label: 'Repeat Menu Greeting', value: 'Repeat Menu Greeting' },
                  timeout_action: {
                    status: 'HANGUP',
                    type: {},
                    value: {},
                  },
                  failure_action: {
                    status: 'HANGUP',
                    type: {},
                    value: {},
                  },
                });
              }}
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
          </div>

          <div className="flex flex-col gap-2 ">
            {watchGeneric?.enabled && (
              <>
                <div className=" gap-12 flex flex-col">
                  <div className="gap-2 flex flex-col py-4 px-3 pl-0">
                    <div className="flex flex-col gap-2">
                      <p className="text-gray-800  text-sm">
                        Customize your keyboard shortcuts and key bindings.
                      </p>
                    </div>
                    <div className=" flex w-fit border border-gray-200 rounded-xl p-3 gap-4">
                      <div className="flex gap-2">
                        <RadioGroup
                          className="flex gap-4"
                          value={watch('generic.keyboard_shortcuts')?.toString()}
                          onValueChange={(value) => {
                            if (value === 'default') {
                              setValue('generic', {
                                ...watch('generic'),
                                keyboard_shortcuts: 'default',
                                press_hash: {
                                  label: 'Return to Previous Menu',
                                  value: 'Return to Previous Menu',
                                },
                                press_asterisk: {
                                  label: 'Repeat Menu Greeting',
                                  value: 'Repeat Menu Greeting',
                                },
                              });
                            } else if (value === 'specific') {
                              setValue('generic', {
                                ...watch('generic'),
                                keyboard_shortcuts: 'specific',
                                press_hash: null,
                                press_asterisk: null,
                              });
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value="default" id="yes" />
                            <Label htmlFor="yes">Use Default Settings</Label>
                          </div>
                          <p className="text-gray-800  text-sm">or</p>
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value="specific" id="no" />
                            <Label htmlFor="no">Specify</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="w-full flex items-center gap-3 mt-3">
                      <div className="flex gap-4 w-11/12">
                        <div className="flex w-3/5 gap-1 relative">
                          <CustomSelect
                            label={'Press #'}
                            options={KEYBOARD_SHORTCUTS}
                            handleChange={(e: ISELECTVALUE | null) => {
                              setValue('generic.press_hash', e);
                              if (e?.value === 'Repeat Menu Greeting') {
                                setValue('generic.press_asterisk', {
                                  label: 'Return to Previous Menu',
                                  value: 'Return to Previous Menu',
                                });
                              } else if (e?.value === 'Return to Previous Menu') {
                                setValue('generic.press_asterisk', {
                                  label: 'Repeat Menu Greeting',
                                  value: 'Repeat Menu Greeting',
                                });
                              }
                            }}
                            value={watch(`generic.press_hash`) || {}}
                            className="border-primary rounded-l-none"
                          />
                        </div>
                        <div className="flex w-3/5 gap-1 relative">
                          <CustomSelect
                            label={'Press *'}
                            options={KEYBOARD_SHORTCUTS}
                            handleChange={(e: ISELECTVALUE | null) => {
                              setValue('generic.press_asterisk', e);
                              if (e?.value === 'Repeat Menu Greeting') {
                                setValue('generic.press_hash', {
                                  label: 'Return to Previous Menu',
                                  value: 'Return to Previous Menu',
                                });
                              } else if (e?.value === 'Return to Previous Menu') {
                                setValue('generic.press_hash', {
                                  label: 'Repeat Menu Greeting',
                                  value: 'Repeat Menu Greeting',
                                });
                              }
                            }}
                            value={watch(`generic.press_asterisk`) || {}}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div> */}
    </>
  );
};

export default GenericKey;
