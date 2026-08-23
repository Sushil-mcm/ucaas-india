import { useNavigate } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';

interface BreadCumsType {
  breadcrumbs: { label: string }[];
  extraInfo?: string;
  fontSize?: string;
}

const Breadcrumb = ({ breadcrumbs, extraInfo = '' }: BreadCumsType) => {
  const navigate = useNavigate();

  const handleNavigate = (path?: string) => {
    if (path) navigate(path);
  };

  return (
    <div className="border border-gray-200 bg-gray-100 p-3 rounded-xl">
      <div className={`flex ${extraInfo ? 'justify-between' : ''}`} aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          {breadcrumbs?.map((breadcrumb: any, index) => (
            <li key={index}>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <div className="-rotate-90 text-gray-800">
                    <Icon name="ChevronIcon" className="w-5 h-5" />
                  </div>
                )}
                <div
                  className={`inline-flex items-center ${
                    index === breadcrumbs.length - 1
                      ? 'font-semibold text-sm text-primary cursor-pointer hover:text-primary/90'
                      : 'font-medium text-sm text-gray-900 cursor-pointer hover:text-gray-900/90'
                  }`}
                >
                  {breadcrumb.path ? (
                    <p onClick={() => handleNavigate(breadcrumb.path)} className="cursor-pointer">
                      {breadcrumb.label}
                    </p>
                  ) : (
                    <p>{breadcrumb.label}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
        {extraInfo && <span>{extraInfo}</span>}
      </div>
    </div>
  );
};

export default Breadcrumb;
