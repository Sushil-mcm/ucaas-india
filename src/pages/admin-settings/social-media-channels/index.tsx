/* eslint-disable no-constant-condition */
import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import { useCompanyFeatures } from '@/hooks/rbac';
import TelegramChannel from './telegram-channel';
import WhatsappChannel from './whatsapp-channel';
import InstagramChannel from './instagram-channel';
import FacebookChannel from './facebook-channel';
const SocialMediaChannels = () => {
  const { features } = useCompanyFeatures();
  const ominiChannelAccess = features?.plan_features?.omni_channel?.access || {};
  useSetAdminPageMeta({
    description:
      'The WhatsApp, Instagram, Facebook and Telegram accounts connected to this workspace. Connect your business accounts to reach customers on every platform and keep all those conversations in one place, in UCaaS Chat.',
  });

  /* No head of its own, and no cool wash over the warm ground. The Admin head
     already prints this screen's name; both sentences that were here — the one
     under the title and the banner across the top of the content — now sit on
     the info button beside it, which is where every other Admin screen keeps
     what it has to say about itself. */
  return (
    <section className="w-full flex flex-col">
      <div className="w-full p-3 flex flex-col gap-3 overflow-y-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ominiChannelAccess?.FACEBOOK ? <FacebookChannel /> : null}
          {ominiChannelAccess?.INSTAGRAM ? <InstagramChannel /> : null}
          {ominiChannelAccess?.WHATSAPP ? <WhatsappChannel /> : null}
          {/* {ominiChannelAccess?.TELEGRAM ? ( */}
          {true ? <TelegramChannel /> : null}
        </div>
      </div>
    </section>
  );
};

export default SocialMediaChannels;
