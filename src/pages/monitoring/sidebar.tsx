import { CallQueue, DepartmentIcon1, DialerIcon, PhoneIcon, UsersGroup } from '@/assets/icons';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { user_info } = user;
  const IS_ADMIN = user_info?.role === 'ADMIN';
  const { features } = useCompanyFeatures();

  const phoneSystem = features?.plan_features?.phone_system_action || {};
  const phoneSystemAccess = phoneSystem?.access || {};
  const phoneSystemActions = phoneSystem?.action || {};

  const campaignAcess = features?.plan_features?.campaign;

  const tabsList = [
    {
      id: 1,
      name: 'All Calls',
      icon: <PhoneIcon className="w-4 h-4" />,
      path: 'all-calls',
      enabled: phoneSystem?.IS_SHOW,
      visible: phoneSystemActions?.view,
    },
    {
      id: 2,
      name: 'All Extensions',
      icon: <UsersGroup className="w-5 h-5" />,
      path: 'all-extensions',
      enabled: phoneSystem?.IS_SHOW,
      visible: phoneSystemActions?.view,
    },
    {
      id: 3,
      name: 'Groups',
      icon: <DepartmentIcon1 className="w-4.5 h-4.5" />,
      path: 'department',
      enabled: phoneSystem?.IS_SHOW && phoneSystemAccess?.DEPARTMENT,
      visible: phoneSystemActions?.view,
    },
    {
      id: 4,
      name: 'Call Queue',
      icon: <CallQueue className="w-4.5 h-4.5" />,
      path: 'call-queue',
      enabled: phoneSystem?.IS_SHOW && phoneSystemAccess?.QUEUE,
      visible: phoneSystemActions?.view,
    },
    {
      id: 5,
      name: 'Campaign',
      icon: <DialerIcon className="w-4 h-4" />,
      path: 'campaign',
      enabled: campaignAcess?.IS_SHOW,
      visible: campaignAcess?.action?.view,
    },
  ]
    ?.filter(Boolean)
    ?.filter((item) => {
      if (IS_ADMIN) return true;
      return item?.visible !== false;
    });

  return (
    <div className="flex md:flex-col w-full sm:h-full overflow-auto">
      {/* `mcm-adminnav` is the console's shared side-nav treatment: no rules
          between rows, 38px rows, and emphasis only on the page you are on.
          Without it these rows were 56px bands separated by dividers — the
          same shape as the "Monitoring" heading above them, so the heading
          read as the first item of the list rather than its label. */}
      <ul
        role="list"
        className="mcm-adminnav mcm-subnav divide-y divide-gray-200 h-full flex flex-row md:flex-col"
      >
        {tabsList?.map((item: any) => {
          const isEnabled = item?.enabled !== false;

          return (
            <li
              key={item?.id}
              onClick={() => {
                if (!isEnabled || !item?.path) return;
                navigate(item.path);
              }}
            >
              <div
                className={`flex relative items-center w-full px-3 min-h-14 h-14 gap-2 cursor-pointer ${pathname.includes(item?.path) ? 'text-primary bg-ucass-primary-200/50 border-r-primary border-r-2' : 'text-gray-900/80'}  ${!isEnabled ? 'opacity-60' : ''}`}
              >
                {item?.icon}
                <p className="font-medium truncate text-sm">{item?.name}</p>
                {!isEnabled && (
                  <span
                    className={`absolute top-1 right-1 text-xs ${!isEnabled ? 'opacity-60' : ''}`}
                  >
                    🔒
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Sidebar;
