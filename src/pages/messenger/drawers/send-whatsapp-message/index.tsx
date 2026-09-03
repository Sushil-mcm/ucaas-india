import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import {
  allOmniChannelsList,
  getWhatsAppChats,
  getWhatsappTemplates,
  sendWhatsAppMessage,
} from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import TemplateModal from './template-modal';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '@/components/custom/custom-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import EmojiPicker from 'emoji-picker-react';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

polyfillCountryFlagEmojis();
import { EmojiICon } from '@/assets/icons';
import useClickOutside from '@/hooks/use-click-outside';

const isValidPhoneNumber = (number: string) => {
  return /^\d{10,15}$/.test(number);
};

const getTemplateRows = (response: any): any[] => {
  const result =
    response?.data?.data?.result ??
    response?.data?.data ??
    response?.data?.result ??
    response?.data ??
    [];

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.templates)) return result.templates;

  return [];
};

const SendWhatsappMessage = ({
  handleClose,
  selectedChannelType,
  initialNumber,
  /* Additive only — default '' leaves every other caller (e.g. External
     Contacts' own WhatsApp drawer) exactly as it was; only a caller that
     wraps this in its own themed container needs to pass a class here so
     the template dropdown's `react-select` control (styled by a fixed,
     unscoped `.custom-react-select__control` rule) can be re-themed to
     match, the same way the Contact view toolbar's Group/Tag filters are. */
  selectClassName = '',
}: {
  handleClose: any;
  selectedChannelType?: any;
  initialNumber?: string;
  selectClassName?: string;
}) => {
  console.log('initialNumber', initialNumber);
  const emojiContainerRef = useRef(null);
  const [receiverNumber, setReceiverNumber] = useState(() =>
    initialNumber ? initialNumber.replace(/^\+/, '') : '',
  );
  useEffect(() => {
    if (initialNumber) {
      setReceiverNumber(initialNumber.replace(/^\+/, ''));
    }
  }, [initialNumber]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>({});
  const [isTemplate, setIsTemplate] = useState(false);
  const [radioOption, setRadioOption] = useState('template');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [textarea, setTextarea] = useState('');
  const queryClient: any = useQueryClient();
  const navigate = useNavigate();

  const { data: omniChannels = [], isLoading: isLoadingOmniChannels } = useQuery({
    queryKey: ['allOmniChannelsList'],
    queryFn: () => allOmniChannelsList(),
    select: (data: any) => data?.data?.data?.rows || [],
  });

  const whatsappChannel = useMemo(() => {
    const selectedType = String(selectedChannelType?.type || selectedChannelType?.value || '')
      .trim()
      .toLowerCase();

    if (selectedType === 'whatsapp' && selectedChannelType?.number_app_id) {
      return selectedChannelType;
    }

    return omniChannels.find(
      (channel: any) =>
        String(channel?.type || '')
          .trim()
          .toLowerCase() === 'whatsapp',
    );
  }, [omniChannels, selectedChannelType]);

  const whatsappNumber = whatsappChannel?.omni_number || '';
  const whatsappNumberAppId = String(whatsappChannel?.number_app_id || '').trim();

  const { data: getWhatsappChats = [] } = useQuery({
    queryFn: ({ queryKey }) => getWhatsAppChats(queryKey[1]),
    queryKey: ['getWhatsappChats', { did_number: whatsappNumber }],
    select: (data) => data?.data?.data?.data || [],
    enabled: Boolean(whatsappNumber),
  });

  const { data: getWhatsappTemplatesData = [], isLoading: isLoadingWhatsAppTemplates } = useQuery({
    queryFn: () => getWhatsappTemplates({ whats_app_template_id: whatsappNumberAppId }),
    queryKey: ['getWhatsappTemplates', whatsappNumberAppId],
    select: getTemplateRows,
    enabled: Boolean(whatsappNumberAppId),
  });

  useEffect(() => {
    setSelectedTemplate({});
  }, [whatsappNumberAppId]);

  const { mutate: mutateSendMessage, isPending } = useMutation({
    mutationFn: sendWhatsAppMessage,
    mutationKey: ['sendWhatsAppMessage'],
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getWhatsappChats'],
      });
      const chat = getWhatsappChats?.find((chat: any) => chat?.to === `+${receiverNumber || ''}`);
      queryClient.invalidateQueries({
        queryKey: ['getOmniChats-whatsapp'],
      });
      if (chat) {
        navigate(`/messenger?chatType=whatsapp&chatId=${chat?.chatId}`);
      }
      handleAlert({ text: 'Message send successfully', type: 'success' });
      handleClose();
    },
  });

  function handleSendMessage() {
    if (isPending) {
      return;
    }
    mutateSendMessage({
      text: radioOption === 'custom_msg' ? textarea : '',
      template_name:
        radioOption === 'custom_msg'
          ? ''
          : selectedTemplate
            ? `${selectedTemplate?.name}_${selectedTemplate?.language}`
            : '',
      components:
        radioOption === 'custom_msg' ? [] : selectedTemplate ? selectedTemplate?.components : [],
      type: 'whatsapp',
      from: whatsappNumber,
      to: `+${receiverNumber || ''}`,
      number_app_id: whatsappNumberAppId,
    });
  }

  useClickOutside({ current: [emojiContainerRef.current] }, () => setEmojiOpen(false));
  return (
    <div className="flex flex-col bg-white ">
      {/* <div className="flex flex-col gap-4 xxl:h-[calc(100vh_-_7.5rem)] xl:h-[calc(100vh_-_7.6rem)] lg:h-[calc(100vh_-_7.1rem)] md:h-[calc(100vh_-_6.9rem)] sm:h-[calc(100vh_-_6.9rem)] xs:h-[calc(100vh_-_6.9rem)] overflow-auto"> */}
      <div className="flex flex-col gap-4 h-[calc(100vh-11.5rem)] overflow-y-auto">
        <div className="flex flex-col gap-4">
          <Input label="From" value={whatsappNumber} disabled />
          <div className="flex flex-col gap-2">
            <Label>To</Label>
            <PhoneInput
              country={'us'}
              value={receiverNumber || ''}
              onChange={(val: any) => setReceiverNumber(val)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RadioGroup
              className="border border-gray-200 rounded-xl flex gap-4 p-3 min-h-10"
              value={radioOption}
              onValueChange={(value) => {
                setRadioOption(value);
                setTextarea('');
                if (!initialNumber) setReceiverNumber('');
              }}
            >
              {/* <div className="flex items-center gap-3">
                <RadioGroupItem value="custom_msg" id="custom_msg" className="cursor-pointer" />
                <Label htmlFor="custom_msg" className="cursor-pointer">
                  Custom Message
                </Label>
              </div> */}

              <div className="flex items-center gap-3">
                <RadioGroupItem value="template" id="template" className="cursor-pointer" />
                <Label htmlFor="template" className="cursor-pointer">
                  Template
                </Label>
              </div>
            </RadioGroup>
            {radioOption === 'custom_msg' ? (
              <div className={`flex items-center w-full rounded-xl border border-gray-300`}>
                <div className="flex min-h-[126px] justify-between w-full p-3 flex-col gap-2">
                  <textarea
                    name="sms"
                    id=""
                    value={String(textarea)}
                    onChange={(e) => {
                      setTextarea(e.target.value);
                    }}
                    maxLength={700}
                    placeholder="Write a message..."
                    className="border-none outline-0 text-sm resize-none placeholder:text-gray-700"
                  />
                  <div className="flex items-center gap-4">
                    <div className="relative cursor-pointer">
                      <div
                        className="absolute bottom-[-15rem] left-[5rem] emoji-container"
                        ref={emojiContainerRef}
                      >
                        <EmojiPicker
                          lazyLoadEmojis
                          className="z-[99999]"
                          open={emojiOpen}
                          onEmojiClick={(data) => {
                            setTextarea(textarea + data?.emoji);
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
                        className="relative cursor-pointer"
                      >
                        <EmojiICon className="text-gray-900 w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                {!selectedTemplate?.components && <Label>Please Select Template</Label>}
                <div className="grid w-full grid-cols-3 gap-2">
                  {isLoadingOmniChannels || isLoadingWhatsAppTemplates ? (
                    <p>Please Wait...</p>
                  ) : (
                    <div className="flex flex-column items-center gap-2">
                      <CustomSelect
                        // label={'Select Template'}
                        placeholder={
                          !whatsappNumberAppId
                            ? 'WhatsApp channel unavailable'
                            : getWhatsappTemplatesData.length
                              ? 'Select template'
                              : 'No templates available'
                        }
                        isDisabled={!whatsappNumberAppId || !getWhatsappTemplatesData.length}
                        options={getWhatsappTemplatesData.map((template: any) => ({
                          label: template?.name,
                          value: template?.id || template?.name,
                          ...template,
                        }))}
                        handleChange={(e: any) => {
                          setSelectedTemplate(e);
                        }}
                        value={selectedTemplate}
                        inputClass={selectClassName}
                      />
                      <Button
                        onClick={() => {
                          if (!selectedTemplate?.value) return;
                          setIsTemplate(true);
                        }}
                        variant={'secondary'}
                        disabled={!selectedTemplate?.value}
                      >
                        View Template
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button onClick={() => handleClose()} variant={'transparent'}>
          Cancel
        </Button>
        <Button
          onClick={() => handleSendMessage()}
          variant="outline"
          disabled={
            radioOption === 'custom_msg'
              ? !textarea || !receiverNumber || !isValidPhoneNumber(receiverNumber)
              : !selectedTemplate?.components ||
                !receiverNumber ||
                !isValidPhoneNumber(receiverNumber)
          }
        >
          {isPending ? 'Please wait' : 'Send Message'}
        </Button>
      </div>
      {isTemplate && (
        <TemplateModal
          modalState={isTemplate}
          setModalState={() => {
            // setSelectedTemplate(null);
            setIsTemplate(false);
          }}
          templateData={selectedTemplate}
        />
      )}
    </div>
  );
};

export default SendWhatsappMessage;
