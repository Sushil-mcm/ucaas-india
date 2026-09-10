import { Icon } from '@/assets/icons/icon';
import { isEndpointAbsent } from '@/lib/endpoint-availability';
import {
  AdminHeadActions,
  useSetAdminPageMeta,
} from '@/pages/admin-settings/admin-page-head';
import { Button } from '@/components/ui/button';
import { handleAlert } from '@/lib/utils';
import { deleteSkill, getSkills } from '@/services/api';
import { useMemo, useState } from 'react';
import SkillModal from './add-edit-skill';
import SkillPeopleModal from './skill-people';
import CategoriesModal from './categories-modal';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCompanyFeatures } from '@/hooks/rbac';
import { SKILLS_QUERY_KEY, SkillCategory, useSkillCategories } from '@/hooks/use-queue-skills';
import { SearchLine } from '@/assets/icons';

/* The skills catalogue, grouped under its categories.
 *
 * A skill is something a person can handle; people are rated on it (1-5
 * stars) from the skill or from their profile. A category is the heading it
 * sits under - Language, Customer service, Sales. A queue asks for one skill
 * from each category it names, and rings the best-rated free person first. */
const Skills = () => {
  useSetAdminPageMeta({
    description:
      'Skills sit under categories — Language, Customer service, Sales, whatever you call your work. Put people on a skill and rate them 1 to 5; a queue asks for one skill from each category it names and rings the best-rated free person first.',
  });

  const [pendingDelete, setPendingDelete] = useState<any>(null);
  /* Whose people are being edited, if any. */
  const [peopleFor, setPeopleFor] = useState<any>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const phoneAccess = features?.plan_features?.phone_system_action?.action;
  const canEditPeople = Boolean(phoneAccess?.edit);
  const [modalState, setModalState] = useState<{ isModalOpen: boolean; selected: any; category?: SkillCategory }>({
    isModalOpen: false,
    selected: null,
  });

  const { rows: categories, isLoading: categoriesLoading } = useSkillCategories();
  const skillsQuery = useQuery({
    queryKey: [SKILLS_QUERY_KEY, { page: 1, limit: 500, forCatalogue: true }],
    queryFn: () => getSkills({ page: 1, limit: 500 }),
    refetchOnWindowFocus: false,
  });
  const skills: any[] = useMemo(() => skillsQuery.data?.data?.data?.result?.rows || [], [skillsQuery.data]);

  /* Whether the server offers skills at all. Every /api/campaign/skills/* path
     returns 404 on this deployment today, and "Could not load skills — try
     again" reads as a fault the person could clear by retrying. It is not: the
     API is not there yet. Desk phones draws the same distinction, and the
     buttons that would write are disabled rather than left to fail. */
  const skillsAbsent = isEndpointAbsent(skillsQuery.error);

  const { mutate: mutateDeleteSkill, isPending: isDeleting } = useMutation({
    mutationFn: deleteSkill,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({ text: 'Skill deleted', type: 'success' });
        setPendingDelete(null);
        queryClient.invalidateQueries([SKILLS_QUERY_KEY]);
        queryClient.invalidateQueries(['getSkillCategories']);
      }
    },
  });

  const needle = search.trim().toLowerCase();
  const groups = useMemo(
    () =>
      categories.map((category) => ({
        category,
        skills: skills.filter(
          (skill) =>
            String(skill?.category_id || '') === category._id &&
            (!needle || String(skill?.name || '').toLowerCase().includes(needle)),
        ),
      })),
    [categories, skills, needle],
  );
  /* A skill whose category is unknown to the list (deleted under it, or not
     loaded yet) still has to be reachable. */
  const strays = useMemo(
    () =>
      skills.filter(
        (skill) =>
          !categories.some((c) => c._id === String(skill?.category_id || '')) &&
          (!needle || String(skill?.name || '').toLowerCase().includes(needle)),
      ),
    [categories, skills, needle],
  );
  const loading = categoriesLoading || skillsQuery.isLoading;

  const renderSkill = (skill: any) => {
    const count = Number(skill?.peopleCount || 0);
    return (
      <div
        key={String(skill?._id)}
        className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 border-b last:border-b-0 border-gray-100"
      >
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {skill?.name}
            {skill?.code ? <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-500">{skill.code}</span> : null}
          </div>
          {skill?.description ? <div className="text-xs text-gray-500 truncate">{skill.description}</div> : null}
        </div>
        {/* The count is the way in: an admin who sees "Nobody yet" wants to
            fix it from here, not from twenty profiles. */}
        <button
          type="button"
          onClick={() => setPeopleFor(skill)}
          className={`text-sm underline underline-offset-2 hover:text-primary whitespace-nowrap ${
            count ? 'text-gray-900' : 'text-amber-600'
          }`}
          title={canEditPeople ? 'Add or rate people on this skill' : 'See who has this skill'}
        >
          {count ? (count === 1 ? '1 person' : `${count} people`) : 'Nobody yet'}
        </button>
        <span className="flex gap-2 items-center">
          <span
            className="mcm-rowact cursor-pointer flex items-center justify-center"
            title="People"
            onClick={() => setPeopleFor(skill)}
          >
            <Icon name="UsersIcon" className="w-5 h-5" />
          </span>
          {Boolean(phoneAccess?.edit) && (
            <span
              className="mcm-rowact cursor-pointer flex items-center justify-center"
              title="Edit"
              onClick={() => setModalState({ selected: skill, isModalOpen: true })}
            >
              <Icon name="EditStrokIcon" className="w-5 h-5" />
            </span>
          )}
          {Boolean(phoneAccess?.delete ?? phoneAccess?.edit) && (
            <span
              className="mcm-rowact is-danger cursor-pointer flex items-center justify-center"
              title="Delete"
              onClick={() => setPendingDelete(skill)}
            >
              <Icon name="TrashBin" className="w-5 h-5" />
            </span>
          )}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* Upstream draws its own 65px head with the title and the explanation
          inline. This build gives every Admin screen one head from the nav
          registry, with the sentence on the info button beside it — so a title
          here would be the second copy. The buttons portal up to that head and
          search drops onto the row above the list, as on every other Admin
          screen. No background either: this area's ground is warm, and the
          `bg-gray-200/15` wash was a cool grey painted over it. */}
      <section className="w-full flex flex-col h-full">
        <AdminHeadActions>
          {Boolean(phoneAccess?.add) && (
            <>
              <Button
                variant={'outline'}
                onClick={() => setCategoriesOpen(true)}
                className="min-h-9"
                disabled={skillsAbsent}
              >
                Categories
              </Button>
              <Button
                variant={'outline'}
                onClick={() => setModalState({ selected: null, isModalOpen: true })}
                className="min-h-9"
                disabled={skillsAbsent}
              >
                Add skill
              </Button>
            </>
          )}
        </AdminHeadActions>

        <div className="w-full p-3 flex flex-col gap-3">
          <div className="mcm-listbar">
            <label className="mcm-numsearch">
              <SearchLine />
              <input
                type="search"
                placeholder="Search skills"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500 p-3">Loading skills…</div>
          ) : skillsAbsent ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This server does not offer skills yet.
            </div>
          ) : skillsQuery.isError ? (
            <div className="text-sm text-red-600 p-3">
              Could not load skills.{' '}
              <button type="button" className="underline" onClick={() => skillsQuery.refetch()}>
                Try again
              </button>
            </div>
          ) : !skills.length ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center flex flex-col items-center gap-2">
              <p className="font-medium text-gray-900">No skills yet</p>
              <p className="text-sm text-gray-600 max-w-prose">
                Add your first skill, for example Spanish under Language or Billing under Customer
                service. Then open its People and rate who can take those calls.
              </p>
            </div>
          ) : (
            <>
              {groups.map(({ category, skills: inCategory }) => (
                <div key={category._id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 truncate">{category.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded-full px-1.5">
                        {category.kind === 'language' ? 'Languages' : 'Skills'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {inCategory.length === 1 ? '1 skill' : `${inCategory.length} skills`}
                      </span>
                    </div>
                    {Boolean(phoneAccess?.add) && (
                      <button
                        type="button"
                        className="text-xs text-primary underline underline-offset-2 whitespace-nowrap"
                        onClick={() => setModalState({ selected: null, isModalOpen: true, category })}
                      >
                        Add {category.kind === 'language' ? 'language' : 'skill'}
                      </button>
                    )}
                  </div>
                  {inCategory.length ? (
                    inCategory.map(renderSkill)
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-500">
                      {needle ? 'Nothing here matches your search.' : 'Nothing here yet.'}
                    </div>
                  )}
                </div>
              ))}
              {strays.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm font-semibold text-amber-800">
                    Without a category
                  </div>
                  {strays.map(renderSkill)}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      {modalState?.isModalOpen && (
        <SkillModal
          modalState={modalState?.isModalOpen}
          setModalState={() => setModalState({ isModalOpen: false, selected: null })}
          editdata={modalState?.selected}
          defaultCategory={modalState?.category}
        />
      )}
      {categoriesOpen && <CategoriesModal onClose={() => setCategoriesOpen(false)} />}
      {!!peopleFor && (
        <SkillPeopleModal
          skill={peopleFor}
          readOnly={!canEditPeople}
          onClose={() => setPeopleFor(null)}
        />
      )}
      {!!pendingDelete && (
        <AlertConfirm
          {...{
            apiLoading: isDeleting,
            onConfirm: () => mutateDeleteSkill({ uuid: pendingDelete?._id }),
            open: !!pendingDelete,
            setOpen: () => setPendingDelete(null),
          }}
        />
      )}
    </>
  );
};

export default Skills;
