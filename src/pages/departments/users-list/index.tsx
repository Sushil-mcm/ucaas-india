import { FC, useEffect } from 'react';
import { capitalizeFirstLetter } from '@/lib/utils';
import Loader from '@/components/custom/loader';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon } from '@/assets/icons/icon';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import NotFound from '@/assets/images/not-found-img.svg';

interface UsersLeftContentProps {
  isPending: boolean;
  setTabData: any;
  ListData: any;
  tabData: any;
  activeTab: string;
  debouncedUserSearch?: any;
  setDrawerState?: any;
  setShowDetailOnMobile?: any;
  lastItemRef?: (node: HTMLLIElement | null) => void;
  isFetchingNextPage?: boolean;
}

const UsersLeftContent: FC<UsersLeftContentProps> = ({
  isPending,
  setTabData,
  ListData,
  tabData,
  activeTab,
  debouncedUserSearch,
  setDrawerState,
  setShowDetailOnMobile,
  lastItemRef,
  isFetchingNextPage,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (!ListData?.length) return;
    if (id) {
      const selectedData = ListData?.find((item: any) => item?.uuid === id);
      setTabData(selectedData);
    }
  }, [activeTab, ListData]);

  useEffect(() => {
    if (activeTab === 'extension' && ListData?.length > 0 && !id && !isPending) {
      const defaultData = ListData?.[0];
      setTabData(defaultData);
      navigate(`/department/extension/${defaultData?.uuid}`);
    }
  }, [activeTab, ListData, id, isPending]);

  return (
    <div className="flex w-full flex-col overflow-auto h-[calc(100vh_-_14.5rem)]">
      {isPending ? (
        <div className="flex items-center justify-center p-5">
          <Loader variant="blue" size="sm" />
        </div>
      ) : (
        <ul role="list" className="list-rows h-full">
          {ListData && ListData?.length > 0 ? (
            ListData?.map((item: any, index: number) => {
              const user_name = `${item?.first_name} ${item?.last_name}`;
              const isSelected = tabData?.uuid === item?.uuid;
              return (
                <li
                  key={item?.uuid}
                  ref={index === ListData.length - 1 ? lastItemRef : undefined}
                  className={`list-row ${isSelected ? 'on' : ''}`}
                  onClick={() => {
                    navigate(`extension/${item?.uuid}`);
                    setTabData(item);
                    setShowDetailOnMobile?.(true);
                  }}
                >
                  <span className="shrink-0">
                    <CustomAvatar
                      name={user_name}
                      size="36"
                      showPresence
                      extension={item?.extension}
                      image={item?.profile}
                    />
                  </span>
                  <span className="list-row-body">
                    <span className="list-row-top">
                      <span className="list-row-name capitalize">
                        {capitalizeFirstLetter(user_name) || 'Unknown User'}
                      </span>
                      <span className="list-row-meta num">
                        <Icon name="Grid" className="h-3.5 w-3.5" />
                        {item?.extension}
                      </span>
                    </span>
                    <span className="list-row-sub">
                      {item?.custom_role_data?.name || item?.role_data?.name || item?.role}
                      {item?.email ? ` · ${item.email}` : ''}
                    </span>
                  </span>
                </li>
              );
            })
          ) : !debouncedUserSearch ? (
            <div className="m-auto flex flex-col items-center justify-center border border-gray-200 rounded-xl bg-white p-10 w-fit gap-7 max-w-80">
              <div className="flex flex-col justify-center items-center gap-2">
                <Icon name="NotFound" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-gray-800 text-sm whitespace-normal">
                  There is nothing to show here yet. Start by adding some users.
                </p>
                <Button
                  type="submit"
                  className="w-fit mt-3"
                  onClick={() => setDrawerState({ addUser: true })}
                >
                  <Icon name="Plus" className="w-3 h-3" />
                  Add User
                </Button>
              </div>
            </div>
          ) : (
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
      )}
    </div>
  );
};

export default UsersLeftContent;
