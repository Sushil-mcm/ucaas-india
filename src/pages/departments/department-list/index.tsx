import { FC, useEffect } from 'react';
import CustomAvatar from '@/components/custom/custom-avatar';
import Loader from '@/components/custom/loader';
import { capitalizeFirstLetter } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';
import NotFound from '@/assets/images/not-found-img.svg';
import { Icon } from '@/assets/icons/icon';

interface DepartmentLeftContentProps {
  isPending: boolean;
  setTabData: any;
  departmentData: any;
  tabData: any;
  activeTab: string;
  debouncedDepartmentSearch?: any;
  setDrawerState?: any;
  setShowDetailOnMobile?: any;
  lastItemRef?: (node: HTMLLIElement | null) => void;
  isFetchingNextPage?: boolean;
}

const DepartmentLeftContent: FC<DepartmentLeftContentProps> = ({
  departmentData,
  isPending,
  setTabData,
  tabData,
  activeTab,
  setShowDetailOnMobile,
  lastItemRef,
  isFetchingNextPage,

  // debouncedDepartmentSearch,
  // setDrawerState,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const imageSrcUrl = '';

  useEffect(() => {
    if (!departmentData?.length) {
      setTabData({});
      return;
    }
    if (id) {
      const selectedData = departmentData?.find((item: any) => item?.uuid === id);
      setTabData(selectedData);
    }
  }, [activeTab, departmentData]);

  useEffect(() => {
    if (
      activeTab === 'organization' &&
      departmentData &&
      departmentData?.length > 0 &&
      !id &&
      !isPending
    ) {
      const defaultData = departmentData?.[0];
      console.log('defaultData', defaultData);
      setTabData(defaultData);
      navigate(`/department/organization/${defaultData?.uuid}`);
    }
  }, [activeTab, departmentData, id, isPending]);

  return (
    <div className="flex w-full flex-col overflow-auto h-[calc(100vh_-_14.5rem)]">
      <ul role="list" className="list-rows h-full">
        {isPending ? (
          <div className="flex items-center justify-center p-5">
            <Loader variant="blue" size="sm" />
          </div>
        ) : departmentData && departmentData?.length > 0 ? (
          departmentData?.map((item: any, index: number) => {
            const { members = '[]', manager = '' } = item;
            const isSelected = tabData?.uuid === item?.uuid;
            let departmentMembers = [];
            let managerInfo: any = {};
            try {
              departmentMembers = members
                ? typeof members === 'string'
                  ? JSON.parse(members || '[]')
                  : members || []
                : [];
              managerInfo = manager
                ? typeof manager === 'string'
                  ? JSON.parse(manager || '{}')
                  : manager || {}
                : {};
            } catch (error) {
              console.error('Error parsing members:', error);
            }
            return (
              <li
                key={item?.uuid}
                ref={index === departmentData.length - 1 ? lastItemRef : undefined}
                className={`list-row ${isSelected ? 'on' : ''}`}
                onClick={() => {
                  navigate(`organization/${item?.uuid}`);
                  setTabData(item);
                  setShowDetailOnMobile?.(true);
                }}
              >
                <div className="flex min-w-0 items-center w-full gap-2">
                  <div className="relative shrink-0">
                    <>
                      {item?.profile ? (
                        <img
                          src={`${imageSrcUrl}${item?.profile}`}
                          alt="Img"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <CustomAvatar name={item?.name} size="36" />
                      )}
                    </>
                  </div>
                  <div className="flex min-w-0 flex-col justify-between text-sm w-[calc(100%_-_3rem)] gap-1">
                    <div className="flex min-w-0 justify-between gap-2">
                      <p className="list-row-name truncate">{item?.name || '--'}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="list-row-meta num">
                          <Icon name="Grid" className="h-3.5 w-3.5" />
                          {item?.extension || '--'}
                        </span>
                        <span className="tag acc num">
                          {departmentMembers ? departmentMembers?.length : 0}
                        </span>
                      </div>
                    </div>

                    {item?.manager && (
                      <>
                        <div className="flex min-w-0 items-center gap-1">
                          <p className="shrink-0 text-gray-800 truncate text-xs">{'Manager'} :</p>
                          <p className="text-gray-500 flex min-w-0 items-center gap-0.5 truncate text-xs">
                            {capitalizeFirstLetter(managerInfo?.label) || ''}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })
        ) : (
          // !debouncedDepartmentSearch ? (
          //   <div className="m-auto flex flex-col items-center justify-center border border-gray-200 rounded-lg bg-white p-10 w-fit gap-7 max-w-80">
          //     <div className="flex flex-col justify-center items-center gap-2">
          //       <Icon name="NotFound" />
          //     </div>
          //     <div className="flex flex-col items-center gap-2">
          //       <p className="text-gray-800 text-sm whitespace-normal">
          //         There is nothing to show here yet. Start by creating some departments.gdf
          //       </p>
          //       <Button
          //         type="submit"
          //         className="w-fit mt-3"
          //         onClick={() => setDrawerState({ createDepartment: true })}
          //       >
          //         <Icon name="Plus" className="w-3 h-3" />
          //         Create Department
          //       </Button>
          //     </div>
          //   </div>
          // ) :
          <div className="flex justify-center items-center w-full h-full">
            <div className="flex flex-col justify-center items-center gap-1 py-5 h-full w-full mx-auto">
              <img src={NotFound} alt="BusyImage" className="min-w-28 w-28" />
              <p className="text-sm font-medium text-gray-900">No Department Found</p>
            </div>
          </div>
        )}
        {isFetchingNextPage ? (
          <li className="flex items-center justify-center p-3">
            <Loader variant="blue" size="sm" />
          </li>
        ) : null}
      </ul>
    </div>
  );
};

export default DepartmentLeftContent;
