import AlertConfirm from '@/components/custom/alert-confirm';
import FileCropper from '@/components/custom/file-cropper';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { requiredString } from '@/lib/schema';
import { Icon } from '@/assets/icons/icon';
import { handleAlert, MAX_FILE_SIZE, validateFileSize } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { isDemoMode } from '@/lib/demo-mode';
import { basicInitialState } from '@/pages/admin-settings/constants';
import ProfileForm, { JOB_TITLE_MAX } from './profile-form';
import '@/components/mcm/mcm-page.css';
import { mediaUploadUrl, userProfileUpdate } from '@/services/api';
import { useUserDetails, invalidateUserDetails } from '@/hooks/use-user-details';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import CustomAvatar from '@/components/custom/custom-avatar';
import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import HowCallsReachYou from './how-calls-reach-you';
import CallSetupGuide from './call-setup-guide';
import { buildProfileUpdatePayload } from './profile-update-payload';
import {
  SELF_PROFILE_QUERY_KEY,
  fetchSelfProfile,
  getSelfProfileStore,
  updateSelfProfile,
} from './profile-self-api';
import { DEFAULT_INTERFACE_LANGUAGE, PRONOUNS_MAX, cleanPronouns } from './interface-languages';

export const BasicInfoSettingSchema = yup.object().shape({
  basic: yup.object().shape({
    first_name: requiredString('First name', 2, 50),
    last_name: requiredString('Last name', 2, 50),
    /* The column is varchar(30) and the database is strict: one character
       over and the whole save fails, name and photo with it. The field stops
       typing at the limit; this catches a pasted value. */
    job_title: yup
      .string()
      .nullable()
      .max(JOB_TITLE_MAX, `Job title can be at most ${JOB_TITLE_MAX} characters`),
    /* users.pronouns is varchar(40); same strict-database reasoning. */
    pronouns: yup
      .string()
      .nullable()
      .max(PRONOUNS_MAX, `Pronouns can be at most ${PRONOUNS_MAX} characters`),
    interface_language: yup.string().nullable(),
  }),
});

const BasicInfoSettings = () => {
  useSetAdminPageMeta({ description: 'Your name, job title and location as colleagues see them in the directory, alongside the numbers that reach you.' });

  const [image, setImage] = useState<any>(null);
  const [fileName, setFileName] = useState<any>(null);
  const [modalState, setModalState] = useState(false);
  const [loader, setLoader] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const cropperUploadRef = useRef<any>(null);
  const queryClient: any = useQueryClient();

  const methods = useForm<any>({
    mode: 'all',
    defaultValues: { basic: basicInitialState },
    resolver: yupResolver(BasicInfoSettingSchema),
  });

  const { handleSubmit, setValue, watch } = methods;

  const { data: userInfoData, isPending: PendingUserData } = useUserDetails();

  /* Pronouns and interface language live on the new five-field endpoint;
     /api/user/info does not return them. `null` here means the server has no
     such endpoint, and the form is told so. Quiet probe: a missing endpoint
     is a state, not an error. */
  const { data: selfProfile, isPending: PendingSelfProfile } = useQuery({
    queryKey: SELF_PROFILE_QUERY_KEY,
    queryFn: fetchSelfProfile,
    retry: false,
  });
  const selfProfileAvailable: boolean | null = PendingSelfProfile ? null : selfProfile !== null;

  const afterSave = (message: string) => {
    handleAlert({ text: message, type: 'success' });
    invalidateUserDetails(queryClient);
    queryClient.invalidateQueries({ queryKey: SELF_PROFILE_QUERY_KEY });
    invalidateGlobalUsersDirectory(queryClient);
    setLoader(false);
  };

  /* The old whole-record write. Still the only way to save the photo, and the
     only way to save anything on a server without the five-field endpoint. */
  const { mutateAsync: mutateProfileUpdate, isPending: PendingProfileUpdate } = useMutation({
    mutationFn: userProfileUpdate,
  });

  const { mutateAsync: mutateSelfUpdate, isPending: PendingSelfUpdate } = useMutation({
    mutationFn: updateSelfProfile,
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
        pronouns: selfProfile?.pronouns || '',
        interface_language: selfProfile?.interface_language || DEFAULT_INTERFACE_LANGUAGE,
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
          /* Presigned S3 PUT answers 204 (or 200) on success — `.ok` covers the
             whole 2xx range; `=== 200` treated a good upload as a silent no-op. */
          if (uploadFileResponse.ok) {
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

  /* Two saves, chosen by what the server offers and what changed.

     Server with /api/profile/update-self: the five fields go there (own row,
     no role, no email, nothing else touched). The photo is not one of the
     five, so a changed photo still goes through the old whole-record write -
     only when it changed, because that write resends the entire record.

     Server without it: the old write carries name and job title as before,
     and the page says pronouns and language were not saved rather than
     letting them vanish quietly. */
  const onSubmit = async () => {
    const basic = {
      first_name: watch('basic.first_name'),
      last_name: watch('basic.last_name'),
      job_title: watch('basic.job_title'),
    };
    const pronouns = cleanPronouns(watch('basic.pronouns'));
    const interfaceLanguage = String(
      watch('basic.interface_language') || DEFAULT_INTERFACE_LANGUAGE,
    );
    const uploadedProfile = watch('profile');
    const photoChanged = !!uploadedProfile || isImageRemoved;

    const legacyPayload = buildProfileUpdatePayload({
      userInfoData,
      basic,
      uploadedProfile,
      isImageRemoved,
    });

    try {
      const outcome =
        getSelfProfileStore() === 'absent'
          ? ({ kind: 'absent' } as const)
          : await mutateSelfUpdate({
              ...basic,
              pronouns: pronouns || null,
              interface_language: interfaceLanguage,
            });

      if (outcome.kind === 'saved') {
        if (photoChanged) await mutateProfileUpdate(legacyPayload);
        afterSave(outcome.message);
        return;
      }

      const legacy: any = await mutateProfileUpdate(legacyPayload);
      afterSave(legacy?.data?.message || 'Profile updated successfully!');
      if (pronouns || interfaceLanguage !== DEFAULT_INTERFACE_LANGUAGE) {
        handleAlert({
          text: 'Name and job title saved. Pronouns and language are not saved on this server yet.',
          type: 'warning',
        });
      }
    } catch {
      /* The request layer has already shown the server's message. */
      setLoader(false);
    }
  };

  useEffect(() => {
    applyUserToForm(userInfoData?.user_info);
  }, [userInfoData, selfProfile]);

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
                    <ProfileForm selfProfile={selfProfileAvailable} />
                    {/* Always shown once there is something to save. This is the
                        person's own name, title and photo, and saving those is
                        theirs to do. The bar used to hide behind the People-admin
                        permission (account_setting.USER.action.edit), which is the
                        key that gates editing OTHER people - so anyone without it
                        saw a form with no way to save it. */}
                    {hasUnsavedChanges && (
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
                          disabled={PendingProfileUpdate || PendingSelfUpdate}
                        >
                          Discard
                        </button>
                        <Button
                          variant={'primary'}
                          type="submit"
                          disabled={PendingProfileUpdate || PendingSelfUpdate}
                          /* The `.mcm-page button` reset a few sections up (there
                             for icon-only ghost buttons) strips this button's
                             background/text-color classes since it has higher
                             specificity than a plain Tailwind utility class —
                             `!` forces these to win regardless. */
                          className="!bg-primary !text-white !border-primary hover:!bg-primary/90 min-w-[128px] justify-center"
                        >
                          {PendingProfileUpdate || PendingSelfUpdate ? (
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
                {/* Reads the extension and location off `user_info` and fetches
                    the person's own assigned numbers itself. */}
                <HowCallsReachYou userInfo={userInfoData?.user_info} />
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
