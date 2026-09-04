import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { AdminPage } from '@/pages/admin-settings/page-shell';
import AlertConfirm from '@/components/custom/alert-confirm';
import Loader from '@/components/custom/loader';
import { handleAlert } from '@/lib/utils';
import { sipTrunkDelete, sipTrunkList } from '@/services/api';
import TrunkForm from './trunk-form';

/**
 * Where calls come from and go to.
 *
 * On an India-only platform the operator does not buy numbers through this
 * product — a +91 range is issued to a licensed Indian carrier and reaches this
 * switch over a SIP trunk the operator sets up with that carrier. This screen is
 * that connection: the carrier's host, how it authenticates, and whether it is
 * currently registered.
 *
 * There was no screen for it before, because the wholesale integration owned
 * both ends and nobody had to name the carrier. Removing that integration makes
 * the trunk the thing the whole product rests on, so it gets a page rather than
 * an environment variable somebody edits over SSH.
 */

const REGISTRATION_LABEL: Record<string, string> = {
  REGED: 'Registered',
  REGISTERED: 'Registered',
  TRYING: 'Connecting',
  FAILED: 'Failed',
  NOREG: 'No registration',
  UNREGED: 'Not registered',
};

const StatusPill = ({ state }: { state?: string }) => {
  const key = String(state || '').toUpperCase();
  const label = REGISTRATION_LABEL[key] || 'Unknown';
  const good = key === 'REGED' || key === 'REGISTERED';
  const bad = key === 'FAILED' || key === 'NOREG' || key === 'UNREGED';
  const tone = good
    ? 'bg-green-50 text-green-700'
    : bad
      ? 'bg-red-50 text-red-700'
      : 'bg-gray-100 text-gray-600';
  return <span className={`rounded-sm px-2 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>;
};

const SipTrunks = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const { data: trunks = [], isLoading } = useQuery({
    queryKey: ['sip-trunk-list'],
    queryFn: () => sipTrunkList({}),
    select: (data: any) => {
      const result = data?.data?.data?.result ?? data?.data?.result;
      return Array.isArray(result?.rows) ? result.rows : Array.isArray(result) ? result : [];
    },
  });

  const { mutate: removeTrunk, isPending: isDeleting } = useMutation({
    mutationFn: sipTrunkDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-trunk-list'] });
      handleAlert({ text: 'Trunk removed.', type: 'success' });
      setConfirmDelete(null);
    },
  });

  return (
    <>
      <AdminPage
      hideHead
        section="Numbers"
        title="SIP trunks"
        description="The connection to your carrier. Your +91 numbers arrive over this, and outbound calls leave through it."
        actions={
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-3 h-3" />
            Add trunk
          </button>
        }
      >
        {isLoading ? (
          <div className="flex w-full justify-center py-10">
            <Loader />
          </div>
        ) : !trunks.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-gray-900">No trunk configured yet</p>
            <p className="max-w-prose text-sm text-gray-600">
              Until a trunk is connected, calls cannot reach this platform or leave it. Add the SIP
              details your carrier gave you — host, username and password — then register the
              numbers they assigned you under All numbers.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Host</th>
                <th>Username</th>
                <th>Registration</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {trunks.map((trunk: any) => (
                <tr key={trunk?.uuid}>
                  <td>{trunk?.name || '—'}</td>
                  <td className="font-mono text-xs">
                    {trunk?.host}
                    {trunk?.port ? `:${trunk.port}` : ''}
                  </td>
                  <td className="font-mono text-xs">{trunk?.username || '—'}</td>
                  <td>
                    <StatusPill state={trunk?.registration_state} />
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setEditing(trunk);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setConfirmDelete(trunk)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminPage>

      {formOpen && (
        <TrunkForm
          trunk={editing}
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {confirmDelete && (
        <AlertConfirm
          {...{
            open: Boolean(confirmDelete),
            setOpen: () => setConfirmDelete(null),
            isLoading: isDeleting,
            headerText: 'Remove this trunk?',
            descriptionTextComp: (
              <div className="text-sm">
                Calls will stop arriving on every number that comes in over{' '}
                <span className="font-semibold">{confirmDelete?.name || confirmDelete?.host}</span>,
                and outbound calls routed through it will fail. The numbers themselves stay on the
                account.
              </div>
            ),
            onConfirm: () => removeTrunk({ uuid: confirmDelete?.uuid }),
          }}
        />
      )}
    </>
  );
};

export default SipTrunks;
