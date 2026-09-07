import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDepartmentList } from '@/services/api';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon } from '@/assets/icons/icon';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import NewDepartment from '@/pages/admin-settings/phone-systems/departments/new-department';
import { Ic } from '@/components/mcm/icons';
import { DirectoryPage, EmptyRow, SearchChip } from './page-shell';
import { capitalizeFirstLetter } from '@/lib/utils';
import './groups-glass.css';

const parseJson = (value: unknown): any => {
  try {
    return typeof value === 'string' ? JSON.parse(value || 'null') : value;
  } catch {
    return null;
  }
};

const parseMembers = (members: unknown): any[] => {
  const parsed = parseJson(members);
  return Array.isArray(parsed) ? parsed : [];
};

const Groups = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const { features } = useCompanyFeatures();
  const phoneSystem = features?.plan_features?.phone_system_action;
  const canCreateGroup = Boolean(phoneSystem?.access?.DEPARTMENT && phoneSystem?.action?.add);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ['getDepartmentList', 'directoryGroups'],
    queryFn: () => getDepartmentList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row: any) => {
      const manager = parseJson(row?.manager);
      const managerName = manager?.name || manager?.label || '';
      return [row?.name, row?.extension, managerName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [rows, search]);

  return (
    <>
      <div className="gp-groups gp-dirlist">
        <DirectoryPage
          title="Groups"
          description="Teams that answer calls together. Each group has an extension, a manager and the people in it."
          actions={
            <>
              <button type="button" className="btn ghost" onClick={() => navigate('/directory?view=people')}>
                <Ic n="users" />
                People
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const csv = [
                    ['Group', 'Manager', 'People', 'Extension'].join(','),
                    ...visible.map((row: any) => {
                      const mgr = parseJson(row?.manager);
                      const mgrName = mgr?.name || mgr?.label || '';
                      const members = parseMembers(row?.members);
                      return [row?.name || '', mgrName, members.length, row?.extension || '']
                        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                        .join(',');
                    }),
                  ].join('\n');
                  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `groups-${new Date().toISOString().slice(0, 10)}.csv`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Ic n="dl" />
                Export
              </button>
              {canCreateGroup ? (
                <button type="button" className="btn primary" onClick={() => setCreating(true)}>
                  <Ic n="plus" />
                  New group
                </button>
              ) : null}
            </>
          }
          filters={
            <>
              <SearchChip value={search} onChange={setSearch} placeholder="Search groups" />
              <span className="fchip live" style={{ marginLeft: 'auto' }}>
                <span className="num">{rows.length}</span> group{rows.length === 1 ? '' : 's'}
              </span>
            </>
          }
        >
          <table>
            <thead>
              <tr>
                <th>Group</th>
                <th>Manager</th>
                <th>People</th>
                <th>Extension</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <EmptyRow span={5} message="Loading groups…" />
              ) : visible.length ? (
                visible.map((row: any) => {
                  const manager = parseJson(row?.manager);
                  const managerName = capitalizeFirstLetter(manager?.name || manager?.label || '');
                  const members = parseMembers(row?.members);
                  return (
                    <tr key={row?.uuid} style={{ cursor: 'pointer' }} onClick={() => navigate(`/department/organization/${row?.uuid}`)}>
                      <td>
                        <span className="flex items-center gap-2.5">
                          <CustomAvatar name={row?.name} size="30" />
                          <span style={{ fontWeight: 700 }}>{row?.name || '—'}</span>
                        </span>
                      </td>
                      <td>{managerName || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                      <td><span className="tag acc num">{members.length}</span></td>
                      <td className="num">{row?.extension || '—'}</td>
                      <td>
                        <span className="mini">
                          <Ic n="chev" size={12} />
                          Open
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <EmptyRow span={5} message={rows.length ? 'No groups match that search.' : 'No Department Found'} />
              )}
            </tbody>
          </table>
        </DirectoryPage>
      </div>

      <Dialog open={creating} onOpenChange={(next) => !next && setCreating(false)}>
        <DialogContent className="gp-create-group-dialog sm:max-w-[920px]" showCloseButton={false}>
          <div className="gp-create-group-head">
            <h2>Create group</h2>
            <button type="button" aria-label="Close" className="gp-create-group-close" onClick={() => setCreating(false)}>
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <NewDepartment rowData={{}} setDrawerState={setCreating} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Groups;
