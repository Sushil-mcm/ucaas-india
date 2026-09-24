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
      /* One row, three zones: what the skill is, who holds it, what you can
         do to it. They used to be a truncating name, an underlined link and
         a row of icon buttons - three different kinds of control, none of
         them lining up with the row above. */
      <div key={String(skill?._id)} className="mcm-skillrow">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-[#2E2D35]">{skill?.name}</span>
            {skill?.code ? <span className="mcm-skill-code">{skill.code}</span> : null}
          </div>
          {skill?.description ? (
            <div className="mt-0.5 truncate text-xs text-[#9A948F]">{skill.description}</div>
          ) : null}
        </div>

        {/* The count is the way in: an admin who sees "Nobody yet" wants to
            fix it from here, not from twenty profiles. A chip rather than an
            underlined word, so it reads as the button it has always been. */}
        <button
          type="button"
          onClick={() => setPeopleFor(skill)}
          className={`mcm-skill-people${count ? '' : ' is-empty'}`}
          title={canEditPeople ? 'Add or rate people on this skill' : 'See who has this skill'}
        >
          <Icon name="UsersIcon" className="h-3.5 w-3.5" />
          {count ? (count === 1 ? '1 person' : `${count} people`) : 'Nobody yet'}
        </button>

        <span className="mcm-numacts">
          {Boolean(phoneAccess?.edit) && (
            <span
              className="mcm-rowact cursor-pointer flex items-center justify-center"
              title="Edit"
              onClick={() => setModalState({ selected: skill, isModalOpen: true })}
            >
              <Icon name="EditStrokIcon" className="w-4 h-4" />
            </span>
          )}
          {Boolean(phoneAccess?.delete ?? phoneAccess?.edit) && (
            <span
              className="mcm-rowact is-danger cursor-pointer flex items-center justify-center"
              title="Delete"
              onClick={() => setPendingDelete(skill)}
            >
              <Icon name="TrashBin" className="w-4 h-4" />
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
          {/* Search sits with the two buttons on the head's own line rather
              than alone on a strip below it: one control on a whole row of
              its own left the list starting a long way down, and the row had
              no left edge to line up with anything. */}
          <label className="mcm-numsearch mcm-headsearch">
            <SearchLine />
            <input
              type="search"
              placeholder="Search skills"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
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
                <section key={category._id} className="mcm-skillcard">
                  <header className="mcm-skillcard-h">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <h2 className="truncate text-sm font-bold text-[#2E2D35]">{category.name}</h2>
                      <span className="mcm-skill-kind">
                        {category.kind === 'language' ? 'Languages' : 'Skills'}
                      </span>
                      <span className="text-xs text-[#9A948F]">
                        {inCategory.length === 1 ? '1 skill' : `${inCategory.length} skills`}
                      </span>
                    </div>
                    {/* A button, not an underlined word. It does the same job
                        as "Add skill" in the head and should look like it. */}
                    {Boolean(phoneAccess?.add) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => setModalState({ selected: null, isModalOpen: true, category })}
                      >
                        Add {category.kind === 'language' ? 'language' : 'skill'}
                      </Button>
                    )}
                  </header>
                  {inCategory.length ? (
                    inCategory.map(renderSkill)
                  ) : (
                    <p className="mcm-skill-empty">
                      {needle ? 'Nothing here matches your search.' : 'Nothing here yet.'}
                    </p>
                  )}
                </section>
              ))}
              {strays.length > 0 && (
                <section className="mcm-skillcard is-stray">
                  <header className="mcm-skillcard-h">
                    <h2 className="text-sm font-bold text-[#92400E]">Without a category</h2>
                  </header>
                  {strays.map(renderSkill)}
                </section>
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
