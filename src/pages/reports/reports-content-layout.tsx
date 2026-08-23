import { useLocation } from 'react-router-dom';

export const ReportsPageLayout = ({
  children,
  filters,
}: {
  children: React.ReactNode;
  filters?: React.ReactNode;
}) => {
  const { pathname } = useLocation();
  const pathSegments = pathname.split('/').filter(Boolean);
  const activePage = pathSegments[pathSegments.length - 1]?.toLowerCase();

  const formatTitle = (str: string) => {
    if (str.toLowerCase() === 'sms-log') return 'SMS log';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-200/15">
      <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex min-w-0 shrink-0 items-center gap-1 text-lg font-semibold text-gray-900">
            <span className="text-primary text-md">{formatTitle(activePage || '')}</span>
          </p>
          {filters && (
            <div className="w-full min-w-0 lg:w-auto [&_.filters>*]:min-w-0 [&_.filters>button]:h-9 [&_.filters>button]:w-9 [&_.filters>button]:shrink-0 [&_.filters]:flex [&_.filters]:w-full [&_.filters]:flex-wrap [&_.filters]:items-center [&_.filters]:gap-2 lg:[&_.filters]:justify-end">
              {filters}
            </div>
          )}
        </div>
      </div>
      {children}
    </section>
  );
};

export default ReportsPageLayout;
