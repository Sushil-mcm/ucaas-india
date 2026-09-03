import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Info } from 'lucide-react';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useCompanyFeatures } from '@/hooks/rbac';
import { adminSettingArr, canShowItem } from './sidebar';

/**
 * The one heading every Admin screen gets.
 *
 * Admin screens used to write their own: some rendered a title and a line of
 * description inside their content padding, most rendered nothing at all, and
 * none of them lined up with "Admin Hub" in the sidebar beside them. The head
 * is rendered once by the Admin shell instead, in a bar the same height as the
 * sidebar's own title bar, so the two titles sit on one line on every screen.
 *
 * The title comes from `adminSettingArr` — the same registry the nav and the
 * landing page read — so a screen cannot end up with a heading that disagrees
 * with the link that got you there. A page supplies anything the registry
 * cannot know (its description, its own actions, a title the registry has no
 * entry for) through `useSetAdminPageMeta`.
 */

export type AdminPageMeta = {
  /** Overrides the registry title. For screens the nav has no entry for. */
  title?: string;
  /** Shown in the info tooltip beside the title, never inline. */
  description?: ReactNode;
  /** Rendered at the right of the bar — search, a primary button. */
  actions?: ReactNode;
};

const AdminPageMetaContext = createContext<{
  meta: AdminPageMeta;
  setMeta: (meta: AdminPageMeta) => void;
  /* The head's right-hand slot, handed out so a screen can render into it. */
  actionsSlot: HTMLElement | null;
  setActionsSlot: (node: HTMLElement | null) => void;
}>({ meta: {}, setMeta: () => {}, actionsSlot: null, setActionsSlot: () => {} });

export const AdminPageMetaProvider = ({ children }: { children: ReactNode }) => {
  const [meta, setMeta] = useState<AdminPageMeta>({});
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
  const value = useMemo(
    () => ({ meta, setMeta, actionsSlot, setActionsSlot }),
    [meta, actionsSlot],
  );
  return <AdminPageMetaContext.Provider value={value}>{children}</AdminPageMetaContext.Provider>;
};

/**
 * Renders its children into the head's right-hand side, from inside the screen
 * that owns them.
 *
 * A portal rather than another field on the meta above, because anything with
 * state — the landing page's search box — has to re-render as the person types.
 * The meta is written from an effect that deliberately ignores `actions` (JSX
 * is a new object every render, so depending on it loops), which would leave a
 * controlled input frozen on its first value. Through a portal the input stays
 * part of its own screen's tree and simply renders somewhere else.
 */
export const AdminHeadActions = ({ children }: { children: ReactNode }) => {
  const { actionsSlot } = useContext(AdminPageMetaContext);
  if (!actionsSlot) return null;
  return createPortal(children, actionsSlot);
};

/**
 * Called by a screen to hand its description and actions to the shared head.
 *
 * The meta is cleared on unmount so a screen that supplies none does not
 * inherit the last one's — which is what would otherwise happen, since the
 * head outlives every screen under it.
 */
export const useSetAdminPageMeta = (meta: AdminPageMeta) => {
  const { setMeta } = useContext(AdminPageMetaContext);
  const { title, description, actions } = meta;

  useEffect(() => {
    setMeta({ title, description, actions });
    return () => setMeta({});
    // `actions` is deliberately NOT a dependency. It is JSX, so it is a new
    // object on every render of the screen; depending on it would set state,
    // re-render, produce new JSX and set state again — an endless loop. The
    // title and description are the fields that actually change meaning, and
    // the actions captured alongside them are the current ones.
  }, [title, description, setMeta]);
};

/** Flattens the registry to `path -> title`, longest path first so a nested
    route matches its own entry rather than its section's. */
const useScreenTitles = () => {
  const { features, user_info } = useCompanyFeatures();
  const isAdmin = user_info?.role === 'ADMIN';

  return useMemo(() => {
    if (!user_info) return [] as { path: string; title: string; section: string }[];
    const rows: { path: string; title: string; section: string }[] = [];
    adminSettingArr(features, isAdmin)
      .filter((section: any) => canShowItem(section, isAdmin))
      .forEach((section: any) => {
        (section?.children || [])
          .filter((child: any) => child && canShowItem(child, isAdmin))
          .forEach((child: any) => {
            if (child?.path && child?.title) {
              rows.push({ path: child.path, title: child.title, section: section.title });
            }
          });
      });
    return rows.sort((a, b) => b.path.length - a.path.length);
  }, [features, isAdmin, user_info]);
};

export const AdminPageHead = () => {
  const { pathname } = useLocation();
  const { meta, setActionsSlot } = useContext(AdminPageMetaContext);
  const screens = useScreenTitles();

  const registryTitle = useMemo(() => {
    const match = screens.find(
      (row) => pathname === row.path || pathname.startsWith(`${row.path}/`),
    );
    return match?.title || '';
  }, [pathname, screens]);

  const title = meta.title || registryTitle;

  /* Nothing worth showing yet — a screen the registry has no entry for that
     has not supplied a title either. Rendering an empty bar would push every
     page down by 65px for no reason. */
  if (!title) return null;

  return (
    <div className="mcm-adminhead">
      <div className="mcm-adminhead-title">
        <h1>{title}</h1>
        {meta.description ? (
          <CustomTooltip text={meta.description} side="bottom" className="max-w-xs">
            <button
              type="button"
              className="mcm-adminhead-info"
              aria-label={`About ${title}`}
              /* A button rather than a bare icon: the description is the only
                 place some of these screens explain what they do, and a
                 keyboard user has to be able to reach it. */
            >
              <Info size={15} aria-hidden="true" />
            </button>
          </CustomTooltip>
        ) : null}
      </div>
      <div className="mcm-adminhead-actions">
        {meta.actions}
        {/* Always mounted, so a screen's portal has somewhere to land. Empty it
            collapses to nothing, since the row is a flex box with no padding. */}
        <div ref={setActionsSlot} className="mcm-adminhead-slot" />
      </div>
    </div>
  );
};

export default AdminPageHead;
