import CustomAvatar from '@/components/custom/custom-avatar';
import { ChevronIcon, Grid } from '../../../../assets/icons';
import { Button } from '@/components/ui/button';

const DepartmentDetails = ({ tabData = {}, handleBack = () => {} }: any) => {
  const { members = '[]', manager = '{}' } = tabData;

  let departmentMembers = [];
  let managerInfo: any = {};

  try {
    departmentMembers =
      tabData && members
        ? typeof members === 'string'
          ? JSON.parse(members || '[]')
          : members || []
        : [];
    managerInfo =
      tabData && manager
        ? typeof manager === 'string'
          ? JSON.parse(manager || '{}')
          : manager || {}
        : {};
  } catch (error) {
    console.error('Error parsing members:', error);
  }

  const imageSrcUrl = '';
  return (
    <>
      {tabData?.uuid && (
        <div className="w-full p-3 flex flex-col gap-3">
          <div className="flex items-center w-full px-3 h-16 gap-2 rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
            <div className="relative">
              {tabData?.profile ? (
                <div className="w-10 h-10 p-1 rounded-full bg-gray-500 flex items-center justify-center">
                  <img
                    src={imageSrcUrl}
                    alt="Img"
                    className="w-full h-full rounded-full relative flex items-center justify-center text-white font-semibold object-contain"
                  />
                </div>
              ) : (
                <CustomAvatar name={tabData?.name || ''} />
              )}
            </div>
            <div className="flex items-center justify-between w-[calc(100%_-_3rem)]">
              <div className="flex flex-col">
                <p className="font-semibold text-[#2E2D35] truncate text-md">
                  {tabData?.name || ''}
                </p>
                <p className="text-[#2E2D35] truncate text-sm">{managerInfo?.label || ''}</p>
              </div>
            </div>

            <Button variant={'outline'} className="gap-1" onClick={handleBack}>
              <ChevronIcon className="rotate-90 w-5 h-5" />
              Back
            </Button>
          </div>
          <div className="flex flex-col gap-3 h-[calc(100vh_-_14.3rem)] overflow-auto">
            <div className="border border-[rgba(225,200,165,0.9)] rounded-xl p-3 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-[#2E2D35] text-md">Description</p>
                <p className="text-[#2E2D35] text-sm">
                  {tabData?.description || 'No description provided '}
                </p>
              </div>
            </div>
            <div className="border border-[rgba(225,200,165,0.9)] rounded-xl p-3 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
              <p className="font-semibold text-[#2E2D35] truncate text-md">Manager</p>
              <p className="text-[#2E2D35] truncate text-sm capitalize">
                {managerInfo?.label || ''}
              </p>
            </div>
            <div className="border border-[rgba(225,200,165,0.9)] rounded-xl p-3 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-[#2E2D35] truncate text-md mb-2">Members</p>
                <div className="w-full flex flex-col gap-3">
                  {departmentMembers.length > 0 ? (
                    departmentMembers.map((member: any) => {
                      return (
                        <div
                          className="flex items-center justify-between border border-[#EEE7DD] bg-[#FBE2C8]/40 rounded-xl w-full p-3 gap-1 "
                          key={member?.uuid}
                        >
                          <CustomAvatar name={member?.label || ''} />
                          <div className="flex flex-col w-[calc(100%_-_3.5rem)]">
                            <div className="flex items-center justify-between gap-2">
                              <p className="capitalize text-md truncate">{member?.label || ''}</p>
                              <div className="flex gap-1">
                                <Grid className="w-4 h-4 text-[#9A948F]" />
                                <div className="text-[#9A948F] truncate text-xs">
                                  {member?.extension || member?.value || ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <small className="text-[#9A948F] truncate text-sm">
                                {member?.email || ''}
                              </small>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p>No members found in this departments</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DepartmentDetails;
