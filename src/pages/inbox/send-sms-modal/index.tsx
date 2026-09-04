import { EmojiICon } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import ErrorTooltip from '@/components/custom/error-tooltip';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import useClickOutside from '@/hooks/use-click-outside';
import { useUser } from '@/hooks/use-user';
import useDebounce from '@/hooks/use-debounce';
import { mediaUploadUrl, sendSms, userSMSInfo } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EmojiPicker from 'emoji-picker-react';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

polyfillCountryFlagEmojis();
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import { formatDialSpaced } from '../format-number';
import { count } from 'sms-length';
import * as yup from 'yup';
import { checkPhoneNumberCountry, getSmsAlert, handleAlert } from '@/lib/utils';
import { getDLCStatus } from '@/services/api';
import DLCVerificationPopup from '@/components/custom/dlc-verification-popup';
import countryList from '@/lib/countries.json';
import AlertConfirm from '@/components/custom/alert-confirm';
import { FileAudio2, FileText, FileVideo2, Paperclip, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSmsRateCredits } from '@/hooks/use-sms-rate-credits';
import { useMessagingPermissions } from '@/hooks/use-messaging-permissions';

export const validationSchema = yup.object().shape({
  from: yup
    .object({
      label: yup.string().required(),
      value: yup.string().required(),
    })
    .nullable()
    .required('DID number is required')
    .test('has-value', 'DID number is required', (val) => {
      return val !== null && val !== undefined && !!val.value;
    }),
  to: yup.string().required('Phone number is required'),
  sms: yup.string().nullable(),
});

const isAllowedMMSFile = (file: File | null) => {
  if (!file) return false;
  const mimeType = String(file.type || '').toLowerCase();
  if (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('video/')
  ) {
    return true;
  }
  const lowerName = String(file.name || '').toLowerCase();
  return [
    '.gif',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.bmp',
    '.svg',
    '.mp4',
    '.mov',
    '.webm',
    '.m4v',
    '.mkv',
    '.avi',
    '.mp3',
    '.wav',
    '.m4a',
    '.aac',
    '.ogg',
    '.flac',
  ].some((ext) => lowerName.endsWith(ext));
};

const SMS_COUNT_LIMIT = 5;

const trimToSmsCountLimit = (value: string, maxMessages = SMS_COUNT_LIMIT) => {
  const normalizedValue = String(value || '');
  if (count(normalizedValue).messages <= maxMessages) return normalizedValue;

  let low = 0;
  let high = normalizedValue.length;
  let best = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = normalizedValue.slice(0, mid);
    if (count(candidate).messages <= maxMessages) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
};

const SendSMSModal = ({ handleClose = () => null, defaultNumber, selectedDID }: any) => {
  const { user } = useUser();
  const emojiContainerRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // const { setParam } = useSearchParamManager();
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [showDLCPopup, setShowDLCPopup] = useState(false);
  const [countryCode, seCountryCode] = useState('');
  const [sendMsgAlert, setSendMsgAlert] = useState<boolean>(false);
  const [mmsFile, setMmsFile] = useState<File | null>(null);
  const [mmsPreviewUrl, setMmsPreviewUrl] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const allDIDNumbers = useMemo(() => user?.assigned_did || [], [user?.assigned_did]);
  const [country, setCountry] = useState<string>('');
  // const totalFunds = user?.company_info?.amount ? `$${user?.company_info?.amount}` : '00.00';
  const [dlsStatus, setDlsStatus] = useState(null);
  const { canSendTo } = useMessagingPermissions();
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    mode: 'onChange',
    defaultValues: {
      from: null,
      to: defaultNumber,
      sms: '',
    },
    resolver: yupResolver(validationSchema),
  });

  const [from, sms = '', to] = watch(['from', 'sms', 'to']);
  const debouncedTo = useDebounce(to, 500);
  const isMMSMode = !!mmsFile;
  // const trimmedSms = String(sms || '').trim();
  const smsCountData = count((sms as string) || '');
  useEffect(() => {
    if (!mmsFile) {
      setMmsPreviewUrl('');
      return;
    }
    if (!String(mmsFile?.type || '').startsWith('image/')) {
      setMmsPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(mmsFile);
    setMmsPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [mmsFile]);
  useEffect(() => {
    if (to && to?.length > 0 && countryList && countryList?.length > 0) {
      const { countryCode = '' } = checkPhoneNumberCountry(to);
      seCountryCode(countryCode);

      const temp = countryList?.find((item: any) => item?.isoCode === countryCode)?.name || '';
      if (temp) {
        setCountry(temp);
      }
    }
  }, [to]);

  const { mutate: dlcStatus } = useMutation({
    mutationKey: ['getDLCStatus'],
    mutationFn: getDLCStatus,
    onSuccess: (data) => {
      setDlsStatus(data?.data?.data?.result?.verified);
    },
  });
  const { data: smsInfoData = [], refetch } = useQuery({
    queryKey: ['userSMSInfo', debouncedTo],
    queryFn: () =>
      userSMSInfo({
        filter: {
          key: 'DIALPREFIX',
          value: debouncedTo?.trim().replace(/\s+/g, ''),
        },
      }),
    select: (data) => data?.data?.data?.result || {},
    enabled: !!debouncedTo && debouncedTo?.length > 8,
  });

  const { allow_country = [], sms_rates = [], sms: freeSms = 0, sms_used = 0 } = smsInfoData || {};
  const isSmsFree =
    allow_country?.some(({ country_code_iso2 }: any) => country_code_iso2 === countryCode) &&
    freeSms > sms_used;
  const freeSmsLeft = isSmsFree ? freeSms - sms_used : 0;
  const totalSmsCharges = Number(sms_rates?.rate || 0) * smsCountData.messages;
  const balanceAmount = Number(user?.company_info?.amount || 0);
  const chargeableSmsCount = Math.max(smsCountData.messages - freeSmsLeft, 0);
  const smsRate = Number(sms_rates?.rate || 0);
  const chargeableAmount = chargeableSmsCount * smsRate;
  const { credits: smsCredits } = useSmsRateCredits({
    segment: smsCountData.messages,
    phone: debouncedTo,
    alpha2code: countryCode,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  console.log(searchParams, 'searchParamssearchParams');

  const { mutateAsync: sendSMSMutate, isPending } = useMutation({
    mutationFn: sendSms,
    onSuccess: (data) => {
      refetch();
      const chatId = data?.data?.data?.result?.chatId;
      console.log(from?.value, 'from?.value 77===============', chatId, 'chatId');

      setSearchParams({ did_number: from?.value, chatId: data?.data?.data?.result?.chatId });
      queryClient.invalidateQueries({ queryKey: ['getSMSList'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['smsListViaDID'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['getUsersDetails'], exact: false });
      handleAlert({
        type: 'success',
        text: isMMSMode ? (
          'MMS sent successfully'
        ) : (
          <>
            Remaining SMS: {Math.max(0, freeSms - (sms_used + (smsCountData?.messages || 0)))}
            <br />
            SMS Charges: ${chargeableAmount.toFixed(2)}
          </>
        ),
      });
      handleClose(true);
    },
    onError: ({ response }: any) => {
      setSendMsgAlert(false);
      handleAlert({
        type: 'error',
        text: response?.data?.error?.message || 'Something went wrong',
      });
    },
  });

  const uploadMMSAttachment = async (file: File) => {
    const companyUuid = user?.company_info?.uuid || user?.company_uuid;
    if (!companyUuid) throw new Error('Company uuid not found');

    const uploadRes = await mediaUploadUrl({
      uuid: companyUuid,
      type: 'mms',
      file_name: file?.name,
    });
    const mediaUrl = uploadRes?.data?.data?.result?.url;
    const filename = uploadRes?.data?.data?.result?.file_name;
    if (!mediaUrl || !filename) throw new Error('Failed to generate media upload url');

    const uploadFileResponse = await fetch(mediaUrl, {
      method: 'PUT',
      body: file,
    });
    if (!uploadFileResponse.ok) throw new Error('Failed to upload media file');

    return { mediaUrl, filename };
  };

  async function handleSendMessage(values: any) {
    if (isPending || isSending) return;

    const fromNumber = values?.from?.value || '';
    const toNumber = values?.to || '';
    const normalizedText = String(values?.sms || '').trim();
    // Check if the receiver number is USA or international
    const toNumberFormatted = toNumber.startsWith('+') ? toNumber : `+${toNumber}`;
    const { isUSA } = checkPhoneNumberCountry(toNumberFormatted);

    // Check if DLC verification is required for US numbers
    if (isUSA && dlsStatus === false) {
      setShowDLCPopup(true);
      return;
    }

    /* Company messaging rules, after the registration check so a blocked number
       is refused once rather than twice. */
    const messagingCheck = canSendTo(toNumberFormatted, { dlcVerified: dlsStatus });
    if (!messagingCheck.allowed) {
      handleAlert({ type: 'error', text: messagingCheck.message || 'Texting is switched off.' });
      return;
    }
    if (messagingCheck.warning) {
      handleAlert({ type: 'warning', text: messagingCheck.warning });
    }
    if (!normalizedText && !mmsFile) {
      handleAlert({ type: 'error', text: 'Message or media attachment is required' });
      return;
    }

    const payload: any = {
      from: fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`,
      to: toNumberFormatted?.trim().replace(/\s+/g, ''),
      text: values?.sms || '',
      isMMS: isMMSMode,
    };

    setIsSending(true);
    try {
      if (isMMSMode && mmsFile) {
        const uploaded = await uploadMMSAttachment(mmsFile);
        payload.mediaUrl = uploaded.mediaUrl;
        payload.filename = uploaded.filename;
      }

      await sendSMSMutate(payload);
    } catch (error: any) {
      if (!error?.response) {
        handleAlert({
          type: 'error',
          text: error?.message || 'Failed to upload MMS attachment',
        });
      }
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    const isPlusOne = String(to || '')
      .replace(/^\+/, '')
      .startsWith('1');
    if (country && (isPlusOne || countryCode === 'US' || countryCode === 'CA')) {
      dlcStatus({ country });
    }
  }, [country]);

  useEffect(() => {
    if (selectedDID) {
      /* Formatted here too. The selected number arrives from the page, where
         its label was built as the raw digits, so leaving it alone showed a
         spaced list over an unspaced selection. */
      setValue('from', {
        label: formatDialSpaced(selectedDID?.label || selectedDID?.value),
        value: selectedDID?.value,
      });
    }
  }, [selectedDID]);

  useClickOutside({ current: [emojiContainerRef.current] }, () => setEmojiOpen(false));

  return (
    <>
      <div className="flex flex-col text-gray-900">
        <div className="font-semibold truncate text-md flex items-center justify-between  min-h-11 ">
          New Message
        </div>
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-2 justify-between">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <CustomSelect
            label="Choose a DID to send message"
            options={
              allDIDNumbers && allDIDNumbers?.length > 0
                ? allDIDNumbers.map((number: any) => ({
                    /* Spaced for reading; `value` keeps the raw number, which
                       is what everything downstream compares against. */
                    label: formatDialSpaced(number?.did_number),
                    value: number?.did_number,
                  }))
                : []
            }
            value={from}
            handleChange={(e) => {
              setValue('from', e, { shouldValidate: true });
            }}
            placeholder="Select DID Number"
            error={errors?.from?.message}
          />
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <Label>Send message to</Label>
              {errors?.to?.message && <ErrorTooltip text={errors?.to?.message || ''} />}
            </div>
            <div className="flex w-full gap-1">
              {/* India only. The account's numbers are Indian and messages go
                  to Indian numbers, so the full country list was 200-odd
                  entries deep to reach the one that is always right -- and it
                  defaulted to +1, which is never the answer here. */}
              <PhoneInput
                country="in"
                onlyCountries={['in']}
                disableDropdown
                value={String(to) || ''}
                onChange={(value: string) => {
                  setValue('to', value, {
                    shouldValidate: true,
                  });
                }}
                containerClass={`w-full ${errors?.to?.message ? 'phone-error' : ''}`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <Label>Message</Label>
                <div className="flex justify-end">
                  {errors?.sms?.message && <ErrorTooltip text={errors?.sms?.message || ''} />}
                </div>
              </div>
              <div
                className={`flex items-center w-full rounded-xl ${errors?.sms?.message ? 'border border-red-500' : 'border border-gray-300'}`}
              >
                <div className="flex min-h-[126px] w-full flex-col justify-between gap-2 p-3">
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-2">
                      <p className="text-sm leading-normal font-medium">
                        Chars Used -{' '}
                        <span className="text-gray-500 font-normal">{smsCountData.length}</span>
                      </p>
                      <p className="text-sm leading-normal font-medium">
                        Chars in SMS -{' '}
                        <span className="text-gray-500 font-normal">
                          {smsCountData.characterPerMessage}
                        </span>
                      </p>
                    </span>
                    <p className="text-sm leading-normal font-medium">
                      SMS Count (max 5):{' '}
                      <span className="text-gray-500 font-normal">{smsCountData.messages}</span>
                    </p>
                  </div>
                  <textarea
                    name="sms"
                    id=""
                    value={String(sms)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/^\s+/, ''); // remove leading spaces
                      const limitedValue = trimToSmsCountLimit(value);
                      setValue('sms', limitedValue, { shouldValidate: true });
                    }}
                    maxLength={700}
                    placeholder="Write a message..."
                    className="min-h-[120px] border-none text-sm outline-0 resize-none placeholder:text-gray-700 sm:min-h-[140px]"
                  />
                  <div className="flex min-h-6 flex-wrap items-center gap-3">
                    <div className="relative cursor-pointer">
                      <div
                        className="emoji-container absolute bottom-[2.5rem] !left-0 z-20 max-w-[calc(100vw-3rem)] sm:left-auto sm:right-0 sm:max-w-none"
                        ref={emojiContainerRef}
                      >
                        <EmojiPicker
                          lazyLoadEmojis
                          className="z-[99999] max-h-86 max-w-76"
                          open={emojiOpen}
                          onEmojiClick={(data) => {
                            const limitedValue = trimToSmsCountLimit(
                              `${sms || ''}${data?.emoji || ''}`,
                            );
                            setValue('sms', limitedValue, { shouldValidate: true });
                            setEmojiOpen(false);
                          }}
                        />
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEmojiOpen((prev) => !prev);
                        }}
                        className="relative cursor-pointer w-6 h-6 flex items-center justify-center"
                      >
                        <EmojiICon className="text-gray-900 w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,audio/*,video/*"
                        className="hidden"
                        onClick={(e) => {
                          (e.target as HTMLInputElement).value = '';
                        }}
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0] || null;
                          if (selectedFile && !isAllowedMMSFile(selectedFile)) {
                            handleAlert({
                              type: 'error',
                              text: 'Only image, audio, or video files are allowed',
                            });
                            setMmsFile(null);
                            (e.target as HTMLInputElement).value = '';
                            return;
                          }
                          setMmsFile(selectedFile);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="relative cursor-pointer w-6 h-6 flex items-center justify-center shrink-0"
                      >
                        <Paperclip className="text-gray-900 w-5 h-5" />
                      </button>
                      {!mmsFile ? (
                        <p className="max-w-full text-xs leading-none text-gray-600 sm:max-w-[200px]">
                          Attach media file (optional)
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              {mmsFile ? (
                <div className="w-full flex items-center pt-1">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                    {mmsPreviewUrl ? (
                      <img
                        src={mmsPreviewUrl}
                        alt={mmsFile?.name || 'attachment'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        {String(mmsFile?.type || '').startsWith('video/') ? (
                          <FileVideo2 className="w-6 h-6 text-gray-500" />
                        ) : String(mmsFile?.type || '').startsWith('audio/') ? (
                          <FileAudio2 className="w-6 h-6 text-gray-500" />
                        ) : (
                          <FileText className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 border border-white text-white flex items-center justify-center"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMmsFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : null}
              {!isMMSMode ? (
                <p className="text-xs">
                  SMS Charges: <span className="text-red-500">${smsCredits.toFixed(2)}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {/* <p>{!sms ? 'Maximum length: 180 characters' : `${String(sms).length}/180`}</p> */}
        <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
          <Button
            variant="transparent"
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            type="button"
            className="w-full sm:w-auto"
            onClick={() => {
              handleSubmit((values) => {
                const normalizedText = String(values?.sms || '').trim();
                if (!normalizedText && !mmsFile) {
                  handleAlert({ type: 'error', text: 'Message or media attachment is required' });
                  return;
                }
                if (!isMMSMode && smsCountData.messages > freeSmsLeft) {
                  setSendMsgAlert(true);
                } else {
                  handleSendMessage(values);
                }
              })();
            }}
            disabled={isPending || isSending}
          >
            {isPending || isSending ? (
              <div className="flex items-center justify-center p-5">
                <Loader variant="white" size="sm" />
              </div>
            ) : (
              'Send'
            )}
          </Button>
        </div>
      </div>
      <DLCVerificationPopup open={showDLCPopup} setOpen={setShowDLCPopup} />
      {!isMMSMode && sendMsgAlert && (
        <AlertConfirm
          open={sendMsgAlert}
          setOpen={setSendMsgAlert}
          onConfirm={handleSubmit(handleSendMessage)}
          descriptionTextComp={getSmsAlert({
            freeSmsLeft,
            smsCount: smsCountData.messages,
            balanceAmount,
            totalSmsCharges,
          })}
          apiLoading={isPending || isSending}
          showButton={!(balanceAmount <= 0)}
          headerText={balanceAmount <= 0 ? 'Alert' : 'Confirm'}
        />
      )}
    </>
  );
};

export default SendSMSModal;
