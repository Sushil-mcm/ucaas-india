import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomSelect from '@/components/custom/custom-select';
import TableManager from '@/components/custom/table-manager';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { forwardActionType, getUsersSkills } from '@/services/api';
import { ColumnDef } from '@tanstack/react-table';
import { FC, useState, useMemo, useCallback, memo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Search } from 'lucide-react';
import useDebounce from '@/hooks/use-debounce';
import { DIALER_TYPE } from '../consts';
import { useUser } from '@/hooks/use-user';
import StarRating from '@/components/custom/star-rating';
import {
  queueSkillFit,
  queueSkillStage,
  readRouting,
  useMembersSkills,
  useSkillsCatalogue,
  type RatedSkill,
} from '@/hooks/use-queue-skills';
import { effectiveRows, failingRows } from '@/lib/queue-requirements';
import TeamSkillRequirements from './team-skill-requirements';

/* The skills a person has been rated on, best first, the same rows the
   queue member list and the People drawer show. A supervisor building a
   team for a project needs to see who speaks the language or knows the
   product before ticking them, not after the first call. */
const MemberSkillsCell = memo(({ rated, highlight }: { rated?: RatedSkill[]; highlight?: string }) => {
  const list = [...(rated || [])]
    .filter((r) => Number(r?.stars) > 0)
    .sort((a, b) => Number(b.stars) - Number(a.stars) || String(a.name).localeCompare(String(b.name)));
  if (!list.length) return <span className="text-xs text-gray-400">No skills rated</span>;
  const shown = highlight
    ? [...list.filter((r) => String(r.skill_id) === highlight), ...list.filter((r) => String(r.skill_id) !== highlight)]
    : list;
  return (
    <div className="flex flex-col gap-0.5">
      {shown.slice(0, 3).map((r) => (
        <span
          key={String(r.skill_id)}
          className={`flex items-center gap-1.5 text-xs ${String(r.skill_id) === highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
        >
          <StarRating value={Number(r.stars) || 0} readOnly label={String(r.name || 'Skill')} />
          {r.name}
        </span>
      ))}
      {shown.length > 3 && <span className="text-[11px] text-gray-400">and {shown.length - 3} more</span>}
    </div>
  );
});
MemberSkillsCell.displayName = 'MemberSkillsCell';

const ANY_SKILL = { label: 'Any skill', value: '' };

/* How well a person fits the campaign's requirement rows, in the words the
   picker would use: 2 meets every row at its bar, 1 holds every row's skills
   at one star or more, 0 does not. Same rule as the queue Members tab. */
const FIT_LABEL: Record<0 | 1 | 2, string> = {
  2: 'Meets every row',
  1: 'At one star',
  0: 'Does not meet',
};
const FIT_CLASS: Record<0 | 1 | 2, string> = {
  2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  1: 'bg-amber-50 text-amber-700 border-amber-200',
  0: 'bg-gray-100 text-gray-500 border-gray-200',
};

const FitChip = memo(({ rated, routing }: { rated?: RatedSkill[]; routing: any }) => {
  const rows = effectiveRows(routing);
  if (!rows.length) return null;
  const stage = queueSkillStage(rated, routing);
  const failing = stage === 2 ? [] : failingRows(rated, rows);
  const title =
    stage === 2
      ? 'Holds every row at the stars it asks for'
      : `Short on: ${failing.map((r) => r.category_name || r.skill_ids.join(', ')).join(', ') || 'a row'}`;
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${FIT_CLASS[stage]}`}
    >
      {FIT_LABEL[stage]}
    </span>
  );
});
FitChip.displayName = 'FitChip';

/* The people list, then their ratings, then only the people who hold the
   chosen skill, best rated first — and, when the campaign has requirement
   rows and asks for "best rated first", the people who fit them best at the
   top. One fetcher so the table refetches when the skill or the rows change
   and the count in the header stays honest. */
const fetchTeamRows = async (payload: any) => {
  const { skill_id, routing_key, ...params } = payload || {};
  const response = await forwardActionType(params);
  const skill = String(skill_id || '');
  let routing: any = null;
  try {
    routing = routing_key ? readRouting(JSON.parse(String(routing_key))) : null;
  } catch {
    routing = null;
  }
  const rankByFit = Boolean(routing && effectiveRows(routing).length && routing.order === 'best_first');
  if (!skill && !rankByFit) return response;
  const rows: any[] = response?.data?.data?.result?.rows || [];
  const ids = Array.from(new Set(rows.map((row) => String(row?.uuid || '')).filter(Boolean)));
  if (!ids.length) return response;
  const skillsResponse = await getUsersSkills({ user_uuids: ids });
  const byUser: Record<string, RatedSkill[]> = skillsResponse?.data?.data?.users || {};
  const ratedOf = (row: any) => byUser[String(row?.uuid || '')] || [];
  const starsOf = (row: any) =>
    Number(ratedOf(row).find((r) => String(r.skill_id) === skill)?.stars) || 0;
  const stageOf = (row: any) => (rankByFit ? queueSkillStage(ratedOf(row), routing) : 0);
  const fitOf = (row: any) => (rankByFit ? queueSkillFit(ratedOf(row), routing) : 0);
  const kept = (skill ? rows.filter((row) => starsOf(row) > 0) : [...rows]).sort(
    (a, b) => stageOf(b) - stageOf(a) || fitOf(b) - fitOf(a) || starsOf(b) - starsOf(a),
  );
  return {
    ...response,
    data: {
      ...response?.data,
      data: {
        ...response?.data?.data,
        result: { ...response?.data?.data?.result, rows: kept, total: kept.length },
      },
    },
  };
};

interface IMEMBER {
  first_name: string;
  last_name: string;
  label: string;
  extension: string;
  value: string;
  email: string;
  role: string;
  domain?: string;
  uuid: string;
  user_uuid: string;
  custom_role_data: { name: string };
  role_data: { name: string };
  profile?: string;
}

// Checkbox cell component with internal form subscription
const MemberCheckboxCell = ({ memberData }: { memberData: IMEMBER }) => {
  const { user } = useUser();
  const defaultDomain = user?.sip_credentials?.domain || '';
  const { control, setValue, clearErrors, watch, getValues } = useFormContext();
  const members = useWatch({ control, name: 'members', defaultValue: [] });
  const isChecked =
    Array.isArray(members) && members.some((item: any) => item?.value === memberData?.extension);

  const handleCheckChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        const extensionValue = memberData?.extension ? memberData?.extension : memberData?.value;
        const newValue = {
          label: memberData?.last_name
            ? `${memberData?.first_name} ${memberData?.last_name}`
            : memberData?.label,
          value: extensionValue,
          first_name: memberData?.first_name || '',
          last_name: memberData?.last_name || '',
          extension: extensionValue || '',
          email: memberData?.email,
          role:
            memberData?.custom_role_data?.name || memberData?.role_data?.name || memberData?.role,
          domain: memberData?.domain || defaultDomain || '',
          user_uuid: memberData?.user_uuid || memberData?.uuid || '',
        };
        /* Read at the moment of the click, not from the render that drew this
           row. Each row closed over the list as it stood when it last rendered,
           so the second agent ticked was added to a list that still had nobody
           in it and the first disappeared - one agent per campaign, with nothing
           on screen to explain it. Same bug the call queue member list had. */
        const live = getValues('members') || [];
        if (!live.some((m: IMEMBER) => m?.value === newValue.value)) {
          setValue('members', [...live, newValue], { shouldValidate: true });
        }
        clearErrors('members');
      } else {
        const filteredMembers = (getValues('members') || []).filter(
          (el: IMEMBER) => el.value !== memberData.extension,
        );
        setValue('members', filteredMembers, { shouldValidate: true });
        const currentManager = watch('manager');
        if (memberData.extension === currentManager?.value) {
          setValue('manager', { value: '' });
          clearErrors('manager');
        }
      }
    },
    [memberData, setValue, clearErrors, watch, getValues, defaultDomain],
  );

  return (
    <div className="flex justify-center text-primary hover:text-primary/80 underline underline-offset-4 text-center">
      <Checkbox checked={isChecked} onCheckedChange={handleCheckChange} />
    </div>
  );
};

MemberCheckboxCell.displayName = 'MemberCheckboxCell';

// Memoized name cell component
const MemberNameCell = memo(({ data }: { data: IMEMBER }) => {
  const fullName = `${data?.first_name}${data?.last_name ? ` ${data?.last_name}` : ''}`;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex ">
        <CustomAvatar
          name={fullName}
          showPresence
          extension={data?.extension}
          image={data?.profile}
        />
      </div>
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between  gap-2">
          <div className="flex flex-col items-start ">
            <p className="capitalize">{fullName}</p>
            <small className="text-primary text-[10px]">
              {data?.custom_role_data?.name || data?.role_data?.name || data?.role}
            </small>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Icon name="Grid" className="w-4 h-4 " />
            <div>{data?.extension}</div>
          </div>
        </div>
        <p className="text-gray-500 flex justify-between">
          <div>{data?.email}</div>
        </p>
      </div>
    </div>
  );
});

MemberNameCell.displayName = 'MemberNameCell';

const SelectAllHeader = ({ currentMembers }: { currentMembers: IMEMBER[] }) => {
  const { user } = useUser();
  const defaultDomain = user?.sip_credentials?.domain || '';
  const { control, setValue, clearErrors, getValues } = useFormContext();
  const members = useWatch({ control, name: 'members', defaultValue: [] });

  const isAllChecked = useMemo(() => {
    if (!currentMembers || currentMembers.length === 0) return false;
    return currentMembers.every((member) =>
      (members || []).some((m: any) => m.value === member.extension),
    );
  }, [currentMembers, members]);

  const isIndeterminate = useMemo(() => {
    if (!currentMembers || currentMembers.length === 0) return false;
    const checkedCount = currentMembers.filter((member) =>
      (members || []).some((m: any) => m.value === member.extension),
    ).length;
    return checkedCount > 0 && checkedCount < currentMembers.length;
  }, [currentMembers, members]);

  const handleSelectAllChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        /* Live, for the same reason each row is: building from a remembered
           list is what made this screen hold one agent. */
        const newMembers = [...(getValues('members') || [])];
        currentMembers.forEach((member) => {
          const extensionValue = member.extension || member.value || '';
          if (!newMembers.some((m: any) => m.value === extensionValue)) {
            newMembers.push({
              label: member?.last_name
                ? `${member?.first_name} ${member?.last_name}`
                : member?.label,
              value: extensionValue,
              first_name: member?.first_name || '',
              last_name: member?.last_name || '',
              extension: extensionValue || '',
              email: member?.email,
              role: member?.custom_role_data?.name || member?.role_data?.name || member?.role,
              domain: member?.domain || defaultDomain || '',
              user_uuid: member?.user_uuid || member?.uuid || '',
            });
          }
        });
        setValue('members', newMembers, { shouldValidate: true });
        clearErrors('members');
      } else {
        const currentExtensions = currentMembers.map((m) => m.extension);
        const filteredMembers = (getValues('members') || []).filter(
          (m: any) => !currentExtensions.includes(m.value),
        );
        setValue('members', filteredMembers, { shouldValidate: true });

        const manager = getValues('manager');
        if (manager && currentExtensions.includes(manager.value)) {
          setValue('manager', { value: '' });
          clearErrors('manager');
        }
      }
    },
    [currentMembers, members, setValue, clearErrors, getValues, defaultDomain],
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold text-gray-500">Members</span>
      <div className="flex justify-center text-primary">
        <Checkbox
          checked={isAllChecked ? true : isIndeterminate ? 'indeterminate' : false}
          onCheckedChange={handleSelectAllChange}
        />
      </div>
    </div>
  );
};

const AgentsList: FC<any> = ({ scriptList = [], dialMethod = DIALER_TYPE.PREVIEW }) => {
  const {
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();
  const selectedScript = watch('script');
  const selectedSite = watch('siteId')?.value;
  const [searchKey, setSearchKey] = useState('');
  const debouncedSearchKey = useDebounce(searchKey, 500);
  const [currentMembers, setCurrentMembers] = useState<IMEMBER[]>([]);
  const [skillFilter, setSkillFilter] = useState<ISELECTVALUE>(ANY_SKILL);
  const { options: skillOptions } = useSkillsCatalogue();
  const { byUser: peopleSkills } = useMembersSkills(currentMembers.map((m) => m?.uuid));
  /* The campaign's requirement rows, read once per change of the block, so
     the Fit column and the table's order follow what the rows above say. */
  const routingRaw = watch('routing') || {};
  const routingKey = JSON.stringify(routingRaw);
  const routing = useMemo(() => readRouting(routingRaw), [routingKey]);
  const hasRequirementRows = effectiveRows(routing).length > 0;
  const skillFilterOptions = useMemo(
    () => [
      ANY_SKILL,
      ...skillOptions.map((skill) => ({
        label: skill.category_name ? `${skill.label} · ${skill.category_name}` : skill.label,
        value: skill.value,
      })),
    ],
    [skillOptions],
  );

  const handleSuccess = useCallback((tbldata: any) => {
    const rows = tbldata?.data?.data?.result?.rows || [];
    setCurrentMembers(rows);
  }, []);

  const columns: ColumnDef<IMEMBER>[] = useMemo(
    () => [
      {
        header: () => <SelectAllHeader currentMembers={currentMembers} />,
        id: 'action',
        accessorKey: 'company_uuid',
        cell: ({ row }) => {
          return <MemberCheckboxCell memberData={row?.original} />;
        },
      },

      {
        header: 'Name',
        accessorKey: 'first_name',
        cell: ({ row }: any) => {
          return <MemberNameCell data={row?.original} />;
        },
      },
      {
        header: 'Skills',
        id: 'skills',
        accessorKey: 'uuid',
        cell: ({ row }: any) => (
          <MemberSkillsCell
            rated={peopleSkills[String(row?.original?.uuid || '')]}
            highlight={String(skillFilter?.value || '') || undefined}
          />
        ),
      },
      ...(hasRequirementRows
        ? [
            {
              header: 'Fit',
              id: 'fit',
              accessorKey: 'user_uuid',
              cell: ({ row }: any) => (
                <FitChip rated={peopleSkills[String(row?.original?.uuid || '')]} routing={routing} />
              ),
            } as ColumnDef<IMEMBER>,
          ]
        : []),
    ],
    [currentMembers, peopleSkills, skillFilter?.value, hasRequirementRows, routing],
  );
  /* Every script the company has, the ones written for this dial mode first.
     Filtering to the mode alone left the menu empty for any mode nobody had
     written a script for yet, with no word about why. */
  const scriptOptions = useMemo(() => {
    const rows = Array.isArray(scriptList) ? scriptList : [];
    /* Only scripts written for this dial mode, the way the queue editor only
       offers queue scripts. Offering the rest "in brackets" let a preview
       campaign be saved with a queue script. */
    return rows
      .filter((item: any) => !item?.dialMethod || item?.dialMethod === dialMethod)
      .map((script: any) => ({ label: script?.name, value: script?._id }));
  }, [scriptList, dialMethod]);
  return (
    <div className="flex h-[calc(100vh_-_22.5rem)] flex-col overflow-auto">
      <div className="w-full mb-4">
        <TeamSkillRequirements dialMethod={dialMethod} />
      </div>
      <div className="w-full">
        <div className="w-full flex flex-row items-end gap-6 flex-wrap ">
          {dialMethod === DIALER_TYPE.PREVIEW && (
            <div className="flex items-center gap-3 pb-1">
              <h3 className="text-gray-900 font-semibold text-sm whitespace-nowrap" title="Agents may skip a lead without calling it">
                Allow skipping a lead
              </h3>
              <Switch
                onCheckedChange={(checked) => {
                  setValue('allowSkipping', checked);
                }}
                checked={watch('allowSkipping')}
              />
            </div>
          )}
          {dialMethod === DIALER_TYPE.PREVIEW && (
            <div className="flex items-center gap-3 pb-1">
              <h3
                className="text-gray-900 font-semibold text-sm whitespace-nowrap"
                title="A lead whose contact names an owning agent is shown only to that agent. Leads with no owner go to anyone."
              >
                Keep leads with their owner
              </h3>
              <Switch
                onCheckedChange={(checked) => {
                  setValue('agentOwnedRecords', checked);
                }}
                checked={Boolean(watch('agentOwnedRecords'))}
              />
            </div>
          )}

          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex items-center gap-3 pb-1">
              <h3 className="text-gray-900 font-semibold text-sm whitespace-nowrap" title="Show the team a script to read during the call">
                Show a script on calls
              </h3>
              <Switch
                onCheckedChange={(checked) => {
                  setValue('agentScripting', checked);
                }}
                checked={watch('agentScripting')}
              />
            </div>
            {watch('agentScripting') && scriptOptions.length === 0 && (
              <p className="text-xs text-amber-700 pb-2">
                No call scripts yet. Write one under Campaign, Call Scripts, then pick it here.
              </p>
            )}
            {watch('agentScripting') && scriptOptions.length > 0 && (
              <div className="w-[200px] sm:w-[240px]">
                <CustomSelect
                  className="w-full"
                  placeholder="Choose a script"
                  label=""
                  options={scriptOptions}
                  handleChange={(e: ISELECTVALUE | null) => {
                    setValue(`script`, e || { label: '', value: '' }, { shouldValidate: true });
                  }}
                  error={(errors as any)?.script?.value?.message ?? errors?.script?.message}
                  value={selectedScript?.value ? selectedScript : null}
                  menuPlacement="auto"
                />
              </div>
            )}
          </div>

          {/* Skill filter and search on the right side */}
          <div className="flex items-end gap-3 ml-auto flex-wrap">
            <div className="w-[200px] sm:w-[230px]" title="Only people rated on this skill, best rated first">
              <CustomSelect
                className="w-full"
                placeholder="Any skill"
                label=""
                options={skillFilterOptions}
                value={skillFilter}
                handleChange={(e: ISELECTVALUE | null) => setSkillFilter(e || ANY_SKILL)}
                menuPlacement="auto"
              />
            </div>
            <div className="relative w-full max-w-sm pb-0.5">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, email, or extension..."
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </div>
        </div>
        {skillFilter?.value ? (
          <p className="mt-2 text-xs text-gray-500">
            Showing only people rated on this skill, best rated first. People already ticked stay on the team even when hidden by the filter.
          </p>
        ) : null}
      </div>
      {(errors?.members as any)?.message && (
        <div className="flex gap-2 mt-2 mb-1">
          {errors?.members && (
            <p className="text-red-500 text-sm font-medium">{(errors?.members as any)?.message} </p>
          )}
        </div>
      )}

      <div className="mt-3 flex-grow">
        <TableManager
          {...{
            columns,
            fetcherKey: 'campaignTeamRows',
            fetcherFn: fetchTeamRows,
            onSuccess: handleSuccess,
            extraParams: {
              site_uuid: selectedSite,
              type: 'EXTENSION',
              page: 1,
              limit: 999,
              search: debouncedSearchKey,
              skill_id: String(skillFilter?.value || ''),
              /* Only the parts that change the order, so a keystroke in a row
                 that changes nothing does not refetch the table. */
              routing_key: hasRequirementRows
                ? JSON.stringify({ requirements: routing.requirements, order: routing.order })
                : '',
            },
            showPagination: false,
          }}
        />
      </div>
    </div>
  );
};

export default AgentsList;
