import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';

/**
 * The placeholder Captain ▸ Scenarios and Captain ▸ Settings both render.
 *
 * It printed the screen's name in the middle of the page, a second copy of what
 * the Admin head says at the top — and said nothing the head could not. The
 * name goes; what is left is the one sentence that is actually news, and the
 * head carries the same sentence on its info button so it reads the same as
 * every other Admin screen.
 */
const CaptainComingSoon = ({ title }: { title: string }) => {
  useSetAdminPageMeta({ description: `${title} is not built yet.` });

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
      <div className="text-sm text-gray-500">This section is coming soon.</div>
    </div>
  );
};

export default CaptainComingSoon;
