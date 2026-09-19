import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import { useEffect, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronIcon } from '@/assets/icons';
import {
  CRMDisconnect,
  crmGetToken,
  CRMIsConnected,
  hubspotCRM,
  connectEspoCrm,
  connectOdoo,
} from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AlertConfirm from '@/components/custom/alert-confirm';
import { crmList, crmListProps } from '../constant';
import SideDrawer from '@/components/custom/side-drawer';
import CRMConfigration from './configration';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CRMIntegration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [drawerState, setDrawerState] = useState<boolean>(false);
  const [drawerData, setDrawerData] = useState<crmListProps>();
  const [deleteAlertModal, setDeleteAlertModal] = useState<Record<string, boolean>>({});
  const [mondaySetupModal, setMondaySetupModal] = useState<boolean>(false);
  const [espoCrmSetupModal, setEspoCrmSetupModal] = useState<boolean>(false);
  const [espoCrmInstanceUrl, setEspoCrmInstanceUrl] = useState<string>('');
  const [espoCrmApiKey, setEspoCrmApiKey] = useState<string>('');
  const [espoCrmError, setEspoCrmError] = useState<string>('');
  const [odooSetupModal, setOdooSetupModal] = useState<boolean>(false);
  const [odooInstanceUrl, setOdooInstanceUrl] = useState<string>('');
  const [odooDatabase, setOdooDatabase] = useState<string>('');
  const [odooUsername, setOdooUsername] = useState<string>('');
  const [odooApiKey, setOdooApiKey] = useState<string>('');
  const [odooError, setOdooError] = useState<string>('');
  const queryClient: any = useQueryClient();
  const activeDeleteKey = Object?.keys(deleteAlertModal)?.find((key) => deleteAlertModal[key]);

  const { data: crmIsConnectedData = [] } = useQuery({
    queryKey: ['CRMIsConnected'],
    queryFn: () => CRMIsConnected(),
    select: (data) => data?.data?.data?.result || [],
  });

  const { mutateAsync: hubspotCRMMutation } = useMutation({
    mutationKey: ['crmIntegration'],
    mutationFn: hubspotCRM,
  });

  const handleConnect = async (crm: crmListProps, bypassModal = false) => {
    const type = crm?.label?.split('-')?.[0]?.toUpperCase();

    if (crm.id === 'Monday' && !bypassModal) {
      setMondaySetupModal(true);
      return;
    }

    if (crm.id === 'EspoCRM') {
      setEspoCrmError('');
      setEspoCrmSetupModal(true);
      return;
    }

    if (crm.id === 'Odoo') {
      setOdooError('');
      setOdooSetupModal(true);
      return;
    }

    try {
      const response = await hubspotCRMMutation(type);
      const url = response?.data?.data?.result;

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to connect CRM:', error);
    }
  };

  const { mutate: mutateGetToken } = useMutation({
    mutationFn: crmGetToken,
    onSettled: () => navigate(window.location.pathname, { replace: true }),
    onSuccess: () => queryClient.invalidateQueries(['CRMIsConnected'], { exact: true }),
  });

  const { mutate: mutateDisconnect, isPending } = useMutation({
    mutationKey: ['CRMDisconnect'],
    mutationFn: CRMDisconnect,
    onSuccess: () => {
      if (activeDeleteKey) {
        setDeleteAlertModal((prev) => ({ ...prev, [activeDeleteKey]: false }));
      }
      queryClient.invalidateQueries(['CRMIsConnected']);
    },
  });

  const { mutateAsync: mutateConnectEspoCrm, isPending: isEspoCrmConnecting } = useMutation({
    mutationKey: ['connectEspoCrm'],
    mutationFn: connectEspoCrm,
    onSuccess: () => {
      setEspoCrmSetupModal(false);
      setEspoCrmInstanceUrl('');
      setEspoCrmApiKey('');
      queryClient.invalidateQueries(['CRMIsConnected']);
    },
  });

  const handleEspoCrmConnect = async () => {
    setEspoCrmError('');
    const instanceUrl = espoCrmInstanceUrl.trim();
    const apiKey = espoCrmApiKey.trim();
    if (!instanceUrl || !apiKey) {
      setEspoCrmError('Instance URL and API Key are both required.');
      return;
    }
    try {
      await mutateConnectEspoCrm({ instance_url: instanceUrl, api_key: apiKey });
    } catch (error: any) {
      setEspoCrmError(
        error?.response?.data?.error?.message || 'Could not connect to EspoCRM. Check the URL and API key.',
      );
    }
  };

  const { mutateAsync: mutateConnectOdoo, isPending: isOdooConnecting } = useMutation({
    mutationKey: ['connectOdoo'],
    mutationFn: connectOdoo,
    onSuccess: () => {
      setOdooSetupModal(false);
      setOdooInstanceUrl('');
      setOdooDatabase('');
      setOdooUsername('');
      setOdooApiKey('');
      queryClient.invalidateQueries(['CRMIsConnected']);
    },
  });

  const handleOdooConnect = async () => {
    setOdooError('');
    const instanceUrl = odooInstanceUrl.trim();
    const database = odooDatabase.trim();
    const username = odooUsername.trim();
    const apiKey = odooApiKey.trim();
    if (!instanceUrl || !database || !username || !apiKey) {
      setOdooError('Instance URL, Database, Username and API Key are all required.');
      return;
    }
    try {
      await mutateConnectOdoo({
        instance_url: instanceUrl,
        database,
        username,
        api_key: apiKey,
      });
    } catch (error: any) {
      setOdooError(
        error?.response?.data?.error?.message ||
          'Could not connect to Odoo. Check the URL, database, username and API key.',
      );
    }
  };

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      navigate(window.location.pathname, { replace: true });
      return;
    }
    if (code && state) {
      mutateGetToken({ code, type: state });
    }
  }, [searchParams]);

  const getConnectionStatus = (crmName: string) => {
    const connectedItem = crmIsConnectedData?.find((item: { type: string }) =>
      crmName?.toLowerCase()?.includes(item?.type?.toLowerCase()),
    );
    return connectedItem?.is_connected || false;
  };

  const getConnectedItem = (crmName: string) => {
    return crmIsConnectedData?.find((item: { type: string }) =>
      crmName?.toLowerCase()?.includes(item?.type?.toLowerCase()),
    );
  };

  useSetAdminPageMeta({
    description:
      'Connect the system your team already works in, so calls, contacts and activity flow both ways.',
  });

  /* The Admin head already prints this screen's name beside the sidebar's own
     title, so the block below said it a second time under an "Integration"
     eyebrow that repeats the section the nav has highlighted. The sentence is
     the only part worth keeping; it goes to the info button by the title. */
  return (
    <section className="mcm-intpage">
      <div className="mcm-intgrid">
        {crmList?.map((crm) => {
          const isConnected = getConnectionStatus(crm.id);
          console.log(isConnected, 'isConnectedisConnectedd');

          return (
            <div key={crm?.name} className="mcm-intcard">
              <div className="flex flex-col gap-5 w-full">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex shrink-0 items-center justify-center bg-[#FBE2C8]/45 rounded-lg p-3 h-16 w-16">
                      <img src={crm?.image} alt={crm?.alt} className="w-10 h-10 object-contain" />
                    </div>
                    {isConnected && (
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Icon name="MenuDots" className="h-5 rotate-90 cursor-pointer" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              setDrawerState(true);
                              setDrawerData(crm);
                            }}
                          >
                            <Icon name="EditStrokIcon" className="!w-4.5 !h-4.5" />
                            Manage
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteAlertModal({ [crm?.id]: true })}
                          >
                            <Icon name="TrashBin" className="!w-4.5 !h-4.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <h4 className="text-start font-semibold text-primary">{crm.name}</h4>
                  <p className="text-gray-700 text-sm whitespace-normal">{crm.description}</p>
                </div>
              </div>
              {!isConnected ? (
                <div
                  className="flex items-start justify-start text-primary hover:text-primary/90 cursor-pointer mt-auto"
                  onClick={() => !crm?.comingSoon && handleConnect(crm)}
                >
                  {crm?.comingSoon ? 'Coming Soon' : 'Connect'}
                  {!crm?.comingSoon && <ChevronIcon className="-rotate-90 mt-1" />}
                </div>
              ) : (
                <div className="flex w-full items-center justify-between mt-auto">
                  <Switch className="cursor-pointer" checked={isConnected} />
                  <div className="flex items-center gap-1.5 text-[11.5px] text-gray-600 bg-primary/5 px-3 py-1.5 rounded-md border border-primary/10">
                    <Icon name="InfoIcon" className="w-3.5 h-3.5 text-primary" />
                    <span>
                      <span className="font-semibold text-primary">Tip:</span> Manage settings from
                      the menu
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <AlertConfirm
          {...{
            onConfirm: () => {
              const convertToUppercase = activeDeleteKey?.toUpperCase();
              mutateDisconnect({ type: convertToUppercase });
            },
            apiLoading: isPending,
            open: !!activeDeleteKey,
            setOpen: (val) => {
              if (!val && activeDeleteKey) {
                setDeleteAlertModal((prev) => ({ ...prev, [activeDeleteKey]: false }));
              }
            },
          }}
        />
        {drawerState && (
          <SideDrawer
            isOpen={drawerState}
            title="Configurations"
            isTab={false}
            enableResponsive
            responsiveWidth="96vw"
            responsiveBreakpoint={1024}
            handleClose={() => setDrawerState(false)}
            content={<CRMConfigration drawerData={drawerData} setDrawerState={setDrawerState} />}
          />
        )}
        {mondaySetupModal && (
          <Dialog open={mondaySetupModal} onOpenChange={setMondaySetupModal}>
            <DialogContent className="max-w-md p-6 rounded-2xl border border-gray-100 bg-white shadow-2xl">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <img
                    src={crmList.find((item) => item.id === 'Monday')?.image}
                    alt="Monday"
                    className="w-10 h-10 object-contain"
                  />
                  <div className="h-6 w-px bg-slate-200" />
                  {/* <img src={McmLogo} alt="UCAAS" className="w-10 h-10 object-contain" /> */}
                </div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Monday Integration Setup
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 max-w-xs">
                  To connect monday.com, please follow these steps:
                </DialogDescription>
              </div>

              <div className="flex flex-col gap-3.5 my-6">
                <div className="flex gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                    1
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-gray-800">Install Monday App</span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      Click the install button to install the app.
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                    2
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-gray-800">
                      Authorize Connection
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      After installing, click connect to sync contacts and call logs.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    const appUrl = getConnectedItem('Monday')?.app_url;
                    if (appUrl) {
                      window.open(appUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="flex-1 flex items-center justify-center h-10 text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/10 transition-all active:scale-[0.98]"
                >
                  Step 1: Install App
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMondaySetupModal(false);
                    const crm = crmList.find((item) => item.id === 'Monday');
                    if (crm) handleConnect(crm, true);
                  }}
                  className="flex-1 flex items-center justify-center h-10 text-sm font-bold text-white bg-primary hover:bg-primary/95 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  Step 2: Connect
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {espoCrmSetupModal && (
          <Dialog open={espoCrmSetupModal} onOpenChange={setEspoCrmSetupModal}>
            <DialogContent className="max-w-md p-6 rounded-2xl border border-gray-100 bg-white shadow-2xl">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <img
                    src={crmList.find((item) => item.id === 'EspoCRM')?.image}
                    alt="EspoCRM"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Connect EspoCRM
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 max-w-xs">
                  Enter your EspoCRM instance URL and an API key from an EspoCRM API User
                  (Administration → Users → Create User, type "API User", auth method "API Key").
                </DialogDescription>
              </div>

              <div className="flex flex-col gap-4 my-6">
                <div className="flex flex-col gap-1.5 text-left">
                  <Label htmlFor="espocrm-instance-url">Instance URL</Label>
                  <Input
                    id="espocrm-instance-url"
                    placeholder="https://your-espocrm-domain.com"
                    value={espoCrmInstanceUrl}
                    onChange={(e) => setEspoCrmInstanceUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <Label htmlFor="espocrm-api-key">API Key</Label>
                  <Input
                    id="espocrm-api-key"
                    type="password"
                    placeholder="Paste your EspoCRM API key"
                    value={espoCrmApiKey}
                    onChange={(e) => setEspoCrmApiKey(e.target.value)}
                  />
                </div>
                {espoCrmError && <p className="text-xs text-red-600">{espoCrmError}</p>}
              </div>

              <button
                type="button"
                disabled={isEspoCrmConnecting}
                onClick={handleEspoCrmConnect}
                className="flex-1 w-full flex items-center justify-center h-10 text-sm font-bold text-white bg-primary hover:bg-primary/95 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {isEspoCrmConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </DialogContent>
          </Dialog>
        )}
        {odooSetupModal && (
          <Dialog open={odooSetupModal} onOpenChange={setOdooSetupModal}>
            <DialogContent className="max-w-md p-6 rounded-2xl border border-gray-100 bg-white shadow-2xl">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <img
                    src={crmList.find((item) => item.id === 'Odoo')?.image}
                    alt="Odoo"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <DialogTitle className="text-xl font-bold text-gray-900">Connect Odoo</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 max-w-xs">
                  Enter your Odoo instance URL, database name, user login, and an API key from that
                  user (My Profile → Account Security → New API Key).
                </DialogDescription>
              </div>

              <div className="flex flex-col gap-4 my-6">
                <div className="flex flex-col gap-1.5 text-left">
                  <Label htmlFor="odoo-instance-url">Instance URL</Label>
                  <Input
                    id="odoo-instance-url"
                    placeholder="https://your-odoo-domain.com"
                    value={odooInstanceUrl}
                    onChange={(e) => setOdooInstanceUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <Label htmlFor="odoo-database">Database</Label>
                  <Input
                    id="odoo-database"
                    placeholder="Your Odoo database name"
                    value={odooDatabase}
                    onChange={(e) => setOdooDatabase(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <Label htmlFor="odoo-username">Username</Label>
                  <Input
                    id="odoo-username"
                    placeholder="Your Odoo login (email)"
                    value={odooUsername}
                    onChange={(e) => setOdooUsername(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <Label htmlFor="odoo-api-key">API Key</Label>
                  <Input
                    id="odoo-api-key"
                    type="password"
                    placeholder="Paste your Odoo API key"
                    value={odooApiKey}
                    onChange={(e) => setOdooApiKey(e.target.value)}
                  />
                </div>
                {odooError && <p className="text-xs text-red-600">{odooError}</p>}
              </div>

              <button
                type="button"
                disabled={isOdooConnecting}
                onClick={handleOdooConnect}
                className="flex-1 w-full flex items-center justify-center h-10 text-sm font-bold text-white bg-primary hover:bg-primary/95 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {isOdooConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
};

export default CRMIntegration;
