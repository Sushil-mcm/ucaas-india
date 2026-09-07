import AlertConfirm from '@/components/custom/alert-confirm';
import FileCropper from '@/components/custom/file-cropper';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { useCompanyFeatures } from '@/hooks/rbac';
import { requiredString } from '@/lib/schema';
import { Icon } from '@/assets/icons/icon';
import { handleAlert, MAX_FILE_SIZE, validateFileSize } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { isDemoMode } from '@/lib/demo-mode';
import { basicInitialState } from '@/pages/admin-settings/constants';
import BasicInformation from '@/pages/admin-settings/people/update-forwarding/basic-information';
import '@/components/mcm/mcm-page.css';
import { getUserDetails, mediaUploadUrl, userProfileUpdate } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import CustomAvatar from '@/components/custom/custom-avatar';
import AccountPageHead from '../account-page-head';
import HowCallsReachYou from './how-calls-reach-you';
import CallSetupGuide from './call-setup-guide';
import { buildProfileUpdatePayload } from './profile-update-payload';

export const BasicInfoSettingSchema = yup.object().shape({
  basic: yup.object().shape({
    first_name: requiredString('First name', 2, 50),
    last_name: requiredString('Last name', 2, 50),
    job_title: yup.string().trim().required('Fill a job title'),
    site: yup.object().shape({
      value: yup.string().trim().required('Select a location'),
    }),
  }),
});

const BasicInfoSettings = () => {
  const [image, setImage] = useState<any>(null);
  const [fileName, setFileName] = useState<any>(null);
  const [modalState, setModalState] = useState(false);
  const [loader, setLoader] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const cropperUploadRef = useRef<any>(null);
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const basicInfoAccess =
    features?.plan_features?.account_setting?.USER?.action ||
    features?.plan_features?.account_setting?.access?.USER?.action;

  const methods = useForm<any>({
    mode: 'all',
    defaultValues: { basic: basicInitialState },
    resolver: yupResolver(BasicInfoSettingSchema),
  });

  const { handleSubmit, setValue, watch } = methods;

  const { data: userInfoData, isPending: PendingUserData } = useQuery({
    queryKey: ['getUserDetailsQueryFn'],
    queryFn: getUserDetails,
    select: (data) => data?.data?.data?.result,
  });

  const { mutate: mutateProfileUpdate, isPending: PendingProfileUpdate } = useMutation({
    mutationFn: userProfileUpdate,
    onSuccess: (data: any) => {
      handleAlert({
        text: data?.data?.message || 'Profile updated successfully!',
        type: 'success',
      });
      queryClient.invalidateQueries(['getUsersDetails', 'getUserDetailsQueryFn'], {
        exact: true,
      });
      invalidateGlobalUsersDirectory(queryClient);
      setLoader(false);
    },
  });

  const handleChangeFile = (e: any) => {
    const file = e.target?.files?.[0];
    const fileSizeValid = validateFileSize(MAX_FILE_SIZE, file);
    if (!fileSizeValid) return;
    if (!file) return alert('something went wrong');
    if (!file?.type.startsWith('image/')) {
      return handleAlert({
        text: 'File type is invalid. Only jpg, jpeg and png file types are accepted.',
        type: 'error',
      });
    }
    setFileName(file?.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setLoader(false);
    };
    reader.readAsDataURL(e.target.files[0]);
    setModalState(true);
  };
  const handleRemoveImage = () => {
    setImagePreview('');
    setValue('profile', '');
    setIsImageRemoved(true);
    setRemoveConfirmOpen(false);
  };

  /* One place that turns a fetched record into form values, used both when
     the record first arrives and when Discard throws away edits — so the two
     can never drift apart. `reset` rather than `setValue` because it also
     re-baselines the form: without that, `isDirty` stays true and the
     unsaved-changes bar never goes away. */
  const applyUserToForm = (user: any) => {
    if (!user) return;
    methods.reset({
      basic: {
        email: user.email || '',
        site: {
          label: user.site_detail?.name || 'Select',
          value: user.site_uuid || '',
        },
        extension: user.extension ?? '',
        phone: user.phone ?? '',
        caller_id: user.caller_id ?? '',
        job_title: user.job_title ?? '',
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
      },
      /* Root-level, not under `basic` — this is the key the upload flow and
         the save payload both read. */
      profile: user.profile ?? '',
    });
    setIsImageRemoved(false);
    setImagePreview(null);
  };

  const handleDiscardChanges = () => applyUserToForm(userInfoData?.user_info);

  const { mutateAsync: uploadMediaMutate, isPending: uploadMediaLoad } = useMutation({
    mutationFn: mediaUploadUrl,
  });

  const handleUpload = async () => {
    if (loader) return;
    if (!cropperUploadRef?.current) return;
    const blobUrl = cropperUploadRef?.current?.getCropData();
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });

    setImagePreview(blobUrl);
    if (file) {
      /* Demo mode has no real object storage to hand back a presigned URL,
         so the upload/PUT round trip below has nothing to talk to — it used
         to fail silently and leave the crop dialog stuck open with no
         feedback. The cropped image is already right here in the browser,
         so demo mode just uses it directly instead of a network round trip
         that can never succeed. */
      if (isDemoMode()) {
        setValue('profile', blobUrl);
        setIsImageRemoved(false);
        setModalState(false);
        return;
      }
      try {
        const uploadMediaResponse = await uploadMediaMutate({
          uuid: userInfoData?.company_info?.uuid,
          type: 'profile',
          file_name: file?.name,
        });
        const result = uploadMediaResponse?.data?.data?.result;
        if (result?.file_name && result?.url) {
          setLoader(true);
          const { url = '', file_name = '' } = result || {};
          const uploadFileResponse = await fetch(url, {
            method: 'PUT',
            body: file,
          });
          if (uploadFileResponse.status === 200) {
            setValue('profile', file_name);
            /* A new picture undoes an earlier removal in the same session —
               without this the save would still send the removal. */
            setIsImageRemoved(false);
            setModalState(false);
          }
        } else {
          handleAlert({
            text: 'Could not upload the image. Please try again.',
            type: 'error',
          });
          setLoader(false);
        }
      } catch (error) {
        console.log(error);
        setLoader(false);
      }
    }
  };

  const onSubmit = () => {
    mutateProfileUpdate(
      buildProfileUpdatePayload({
        userInfoData,
        basic: {
          first_name: watch('basic.first_name'),
          last_name: watch('basic.last_name'),
          job_title: watch('basic.job_title'),
          site_uuid: watch('basic.site')?.value,
        },
        uploadedProfile: watch('profile'),
        isImageRemoved,
      }),
    );
  };

  useEffect(() => {
    applyUserToForm(userInfoData?.user_info);
  }, [userInfoData]);

  const info = userInfoData?.user_info;
  const hasPhoto = Boolean(imagePreview || watch('profile'));

  /* Read the live form, not the fetched record. The header is a preview of
     what saving would publish to the directory, so typing a new name or job
     title has to move it — reading `userInfoData` instead left it showing
     the old values until a save round-tripped, which reads as the page
     ignoring your input. Falls back to the record for the fields this form
     does not own (extension, email, location). */
  const watchedFirst = watch('basic.first_name');
  const watchedLast = watch('basic.last_name');
  const watchedJobTitle = watch('basic.job_title');
  const watchedSite = watch('basic.site');

  const fullName =
    `${watchedFirst ?? info?.first_name ?? ''} ${watchedLast ?? info?.last_name ?? ''}`.trim();
  const jobTitle = (watchedJobTitle ?? info?.job_title ?? '').trim();
  const siteName = (watchedSite?.label && watchedSite.label !== 'Select'
    ? watchedSite.label
    : info?.site_detail?.name || ''
  ).trim();

  /* The save bar only appears once there is something to save. A bar that
     is always there is a permanent strip of chrome over the content, and it
     cannot tell you whether you have pending edits — which is the one thing
     it is well placed to say. Photo changes live outside the form state, so
     they are counted separately. */
  const hasUnsavedChanges =
    methods.formState.isDirty || Boolean(imagePreview) || isImageRemoved;

  return (
    <>
      {/* `.mcm-page` is what the form sections below are styled against
          (`.mcm-fsec`, `.mcm-fgrid`, `.mcm-field`), so it wraps the page
          rather than a div in the middle of it. It used to be applied with
          a ten-property inline style undoing its own layout and font rules;
          `.mcm-profile` sets what this page actually wants instead. */}
      <section className="mcm-page mcm-admin mcm-acct">
        <AccountPageHead
          title="Profile"
          about="Your name, job title and location as colleagues see them in the directory, alongside the numbers that reach you."
        />

        {PendingUserData ? (
          <div className="flex items-center justify-center p-5">
            <Loader variant="blue" size="sm" />
          </div>
        ) : (
          <div className="mcm-acct-body">
            <div className="mcm-profile-grid">
              <main className="mcm-profile-main">
                {/* Who this record is, before any form field: photo, name,
                    job title, and the two facts that identify a person on a
                    phone system. */}
                <div className="mcm-profile-id">
                  <label htmlFor="file-upload" className="mcm-profile-photo">
                    {hasPhoto ? (
                      <img
                        src={imagePreview || watch('profile')}
                        alt={fullName ? `${fullName}, profile photo` : 'Your profile photo'}
                        width={88}
                        height={88}
                        loading="lazy"
                      />
                    ) : (
                      <CustomAvatar
                        size="88"
                        name={fullName}
                        showPresence={false}
                        extension={info?.extension}
                        image={isImageRemoved ? null : imagePreview || watch('profile') || info?.profile}
                        isActivityInfo={false}
                      />
                    )}
                    <span className="mcm-profile-photo-scrim">
                      <Icon name="EditIcon" className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleChangeFile}
                    />
                  </label>

                  <div className="mcm-profile-id-main">
                    <h2 className="mcm-profile-id-name">{fullName || 'Your profile'}</h2>
                    <p className={`mcm-profile-id-role ${jobTitle ? '' : 'is-empty'}`}>
                      {jobTitle || 'No job title set'}
                    </p>

                    <div className="mcm-profile-id-facts">
                      <div className="mcm-profile-fact">
                        <span className="mcm-profile-fact-k">Extension</span>
                        <span className="mcm-profile-fact-v">{info?.extension || '—'}</span>
                      </div>
                      <div className="mcm-profile-fact">
                        <span className="mcm-profile-fact-k">Location</span>
                        <span className={`mcm-profile-fact-v ${siteName ? '' : 'is-empty'}`}>
                          {siteName || 'Not set'}
                        </span>
                      </div>
                      <div className="mcm-profile-fact">
                        <span className="mcm-profile-fact-k">Email</span>
                        <span className="mcm-profile-fact-v">{info?.email || '—'}</span>
                      </div>
                    </div>

                    <div className="mcm-profile-photo-actions">
                      <label htmlFor="file-upload" className="is-upload">
                        {hasPhoto ? 'Change photo' : 'Upload a photo'}
                      </label>
                      {hasPhoto && (
                        <button
                          type="button"
                          onClick={() => setRemoveConfirmOpen(true)}
                          className="is-remove"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="mcm-profile-photo-hint">JPG or PNG, around 400×400px.</p>
                  </div>
                </div>

                <FormProvider {...methods}>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <BasicInformation
                      isChooseTemplate={false}
                      isSiteDisabled={false}
                      customClass=""
                    />
                    {basicInfoAccess?.edit && hasUnsavedChanges && (
                      <div className="mcm-savebar" role="status">
                        <span className="mcm-savebar-dot" aria-hidden="true" />
                        <span className="mcm-savebar-text">
                          Unsaved changes
                          <span className="mcm-savebar-sub">
                            These appear in the directory and on caller ID.
                          </span>
                        </span>
                        <button
                          type="button"
                          className="mcm-savebar-discard"
                          onClick={handleDiscardChanges}
                          disabled={PendingProfileUpdate}
                        >
                          Discard
                        </button>
                        <Button
                          variant={'primary'}
                          type="submit"
                          disabled={PendingProfileUpdate}
                          /* The `.mcm-page button` reset a few sections up (there
                             for icon-only ghost buttons) strips this button's
                             background/text-color classes since it has higher
                             specificity than a plain Tailwind utility class —
                             `!` forces these to win regardless. */
                          className="!bg-primary !text-white !border-primary hover:!bg-primary/90 min-w-[128px] justify-center"
                        >
                          {PendingProfileUpdate ? (
                            <span className="flex items-center gap-2">
                              <Loader variant="white" size="sm" />
                              Saving…
                            </span>
                          ) : (
                            'Save changes'
                          )}
                        </Button>
                      </div>
                    )}
                  </form>
                </FormProvider>
              </main>

              {/* What the system already knows, kept beside the form rather
                  than above and below it. Only the name/extension/location
                  live under `user_info`; the call rules, settings and
                  greetings are its siblings at the response root. */}
              <aside className="mcm-profile-aside">
                <HowCallsReachYou
                  userInfo={userInfoData?.user_info}
                  callForwarding={userInfoData?.call_forwarding}
                  settings={userInfoData?.settings}
                  greetings={userInfoData?.greetings}
                />
                <CallSetupGuide userInfo={userInfoData} />
              </aside>
            </div>
          </div>
        )}
        <AlertConfirm
          open={removeConfirmOpen}
          setOpen={setRemoveConfirmOpen}
          headerText="Remove profile picture"
          descriptionTextComp={
            <div className="text-md">
              Are you sure you want to remove your profile picture?
            </div>
          }
          closeBtnText="No"
          confirmBtnText="Yes"
          onConfirm={handleRemoveImage}
          onCancel={() => setRemoveConfirmOpen(false)}
        />
        {modalState && (
          <FileCropper
            {...{
              image,
              handleUpload,
              modalState,
              setModalState,
              uploadMediaLoad,
              setLoader,
              loader,
            }}
            ref={cropperUploadRef}
          />
        )}
      </section>
    </>
  );
};

export default BasicInfoSettings;
