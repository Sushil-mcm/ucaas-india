import { useEffect, useMemo, useState } from 'react';
import { formatFileSize, getEnv, SESSION_NAME } from '@/lib/utils';
import CustomTooltip from '@/components/custom/custom-tooltip';
import NotFound from '@/assets/images/not-found-img.svg';
import {
  ArrowUpDown,
  Check,
  Download,
  FileText,
  FileVideo2,
  Loader2,
  MessageCircle,
  MoreVertical,
  Play,
  Search,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/hooks/use-user';
import { useSearchParams } from 'react-router-dom';

type SortKey =
  'modified_desc' | 'modified_asc' | 'size_desc' | 'size_asc' | 'name_asc' | 'name_desc';

interface RecordingListingTableProps {
  records: any[];
  isLoading: boolean;
  onPlay: (record: any) => void;
  onChat?: (record: any) => void;
  onShare?: (record: any) => void;
  canOpenChat?: (record: any) => boolean;
  canShare?: (record: any) => boolean;
  onFilteredCountChange?: (count: number) => void;
  emptyTitle: string;
  emptyDescription: string;
}

const formatModifiedDate = (dateValue?: string) => {
  if (!dateValue) return '--';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatRecordingDuration = (value?: number | string) => {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) return '--';
  const totalSeconds = Math.round(duration);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getExtension = (filename?: string) => {
  if (!filename || !filename.includes('.')) return '';
  return filename.split('.').pop()?.toLowerCase() || '';
};

const getFlatMeetingMembers = (record: any): any[] => {
  const rawMembers = record?.meeting?.members;
  if (!Array.isArray(rawMembers)) return [];

  return rawMembers.flatMap((memberGroup: any) => {
    if (Array.isArray(memberGroup)) return memberGroup;
    if (Array.isArray(memberGroup?.user_detail)) return memberGroup.user_detail;
    return [memberGroup];
  });
};

const getOwnerLabel = (record: any) => {
  const sharedBy = record?.videoSharedBy;
  if (sharedBy && typeof sharedBy === 'object') {
    const fullName = `${sharedBy?.firstName || ''} ${sharedBy?.lastName || ''}`.trim();
    return fullName || sharedBy?.email || 'Shared user';
  }

  const flatMembers = getFlatMeetingMembers(record);
  if (flatMembers.length) {
    const creator = flatMembers.find((member: any) => member?.userId === record?.createdById);
    if (creator?.name) return creator.name;
    if (creator?.email) return creator.email;
  }

  return 'You';
};

const getFileTypeLabel = (extension: string) => {
  if (extension === 'mp4' || extension === 'mov' || extension === 'webm' || extension === 'mkv') {
    return 'video';
  }
  if (extension === 'pdf') return 'pdf';
  if (extension === 'csv') return 'csv';
  return 'other';
};

const getMemberNames = (record: any): string[] => {
  const rawMembers = record?.meeting?.members;
  if (!Array.isArray(rawMembers)) return [];
  const names: string[] = [];
  rawMembers.forEach((member: any) => {
    const fallbackName = member?.type === 'GUEST' ? member?.name + ' (Guest)' : member?.name || '';
    if (fallbackName && typeof fallbackName === 'string') names.push(fallbackName.trim());
  });

  return Array.from(names.filter(Boolean));
};

const isSharedRecording = (record: any): boolean => {
  if (Array.isArray(record?.sharedVideoReceiverIds) && record.sharedVideoReceiverIds.length > 0) {
    return true;
  }
  if (record?.videoSharedBy && typeof record.videoSharedBy === 'object') {
    return true;
  }
  return false;
};

const isSharedWithCurrentUserNonAdmin = (record: any, user: any): boolean => {
  const currentUserUuid = String(user?.user_info?.uuid || user?.uuid || '').trim();
  const currentUserEmail = String(user?.user_info?.email || user?.email || '')
    .trim()
    .toLowerCase();

  if (!currentUserUuid && !currentUserEmail) return false;

  const matchedMember = getFlatMeetingMembers(record).find((member: any) => {
    const memberUserId = String(member?.userId || member?.user_uuid || member?.uuid || '').trim();
    const memberEmail = String(member?.email || '')
      .trim()
      .toLowerCase();

    return (
      (currentUserUuid && memberUserId === currentUserUuid) ||
      (currentUserEmail && memberEmail === currentUserEmail)
    );
  });

  if (!matchedMember) return false;
  return (
    String(matchedMember?.type || '')
      .trim()
      .toUpperCase() !== 'ADMIN'
  );
};

const RecordingListingTable = ({
  records,
  isLoading,
  onPlay,
  onChat,
  onShare,
  canShare,
  canOpenChat,
  onFilteredCountChange,
  emptyTitle,
  emptyDescription,
}: RecordingListingTableProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamValue = searchParams.get('search') || '';
  const [searchText, setSearchText] = useState(searchParamValue);
  const [sortBy, setSortBy] = useState<SortKey>('modified_desc');

  useEffect(() => {
    setSearchText(searchParamValue);
  }, [searchParamValue]);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('search', value);
        else next.delete('search');
        return next;
      },
      { replace: true },
    );
  };
  const [videosOnly, setVideosOnly] = useState(false);
  const [sharedOnly, setSharedOnly] = useState(false);
  const [largeFilesOnly, setLargeFilesOnly] = useState(false);
  const [downloadingRecordId, setDownloadingRecordId] = useState('');

  const { user: userInfo } = useUser();
  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: 'modified_desc', label: 'Modified (Newest)' },
    { key: 'modified_asc', label: 'Modified (Oldest)' },
    { key: 'size_desc', label: 'Size (Largest)' },
    { key: 'size_asc', label: 'Size (Smallest)' },
    { key: 'name_asc', label: 'Name (A-Z)' },
    { key: 'name_desc', label: 'Name (Z-A)' },
  ];

  const normalizedRecords = useMemo(
    () =>
      (records || []).map((record) => {
        const extension = getExtension(record?.name);
        const fileType = getFileTypeLabel(extension);
        return {
          ...record,
          displayName: record?.meetName || record?.name || 'Untitled recording',
          meetingName: record?.meeting?.name || '',
          extension,
          fileType,
          ownerLabel: getOwnerLabel(record),
          modifiedLabel: formatModifiedDate(record?.createdAt),
          sizeBytes: Number(record?.recordingSize ?? record?.fileSize ?? 0),
          durationLabel: formatRecordingDuration(record?.recordingDuration),
          memberNames: getMemberNames(record),
          isShared: isSharedRecording(record),
          isSharedWithMeNonAdmin: isSharedWithCurrentUserNonAdmin(record, userInfo),
        };
      }),
    [records, userInfo],
  );

  const filteredRecords = useMemo(() => {
    const searchValue = searchText.trim().toLowerCase();
    const largeSizeThreshold = 100 * 1024 * 1024;
    const filtered = normalizedRecords.filter((record) => {
      const searchableText =
        `${record.displayName} ${record.meetingName || ''} ${record.ownerLabel} ${record.meetingId || ''} ${(record.memberNames || []).join(' ')}`.toLowerCase();
      if (searchValue && !searchableText.includes(searchValue)) return false;
      if (videosOnly && record.fileType !== 'video') return false;
      if (sharedOnly && !record?.isShared) return false;
      if (largeFilesOnly && record.sizeBytes < largeSizeThreshold) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'modified_asc':
          return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
        case 'size_desc':
          return b.sizeBytes - a.sizeBytes;
        case 'size_asc':
          return a.sizeBytes - b.sizeBytes;
        case 'name_asc':
          return a.displayName.localeCompare(b.displayName);
        case 'name_desc':
          return b.displayName.localeCompare(a.displayName);
        case 'modified_desc':
        default:
          return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
      }
    });
  }, [normalizedRecords, searchText, sortBy, videosOnly, sharedOnly, largeFilesOnly]);

  useEffect(() => {
    onFilteredCountChange?.(filteredRecords.length);
  }, [filteredRecords.length, onFilteredCountChange]);

  const handleDownloadRecording = async (record: any) => {
    const recordId = String(record?._id || '');
    if (!recordId || downloadingRecordId === recordId) return;

    const companyUuid = userInfo?.company_info?.uuid || '';
    const fileName = record?.name || '';
    if (!companyUuid || !fileName) return;

    const mediaUrl = `${getEnv().VITE_API_BASE_URL}/api/media/${companyUuid}/video_recording/${encodeURIComponent(fileName)}`;
    setDownloadingRecordId(recordId);
    try {
      const accessToken = localStorage.getItem(SESSION_NAME) || '';
      const response = await fetch(mediaUrl, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(link.href);
      link.remove();
    } catch (error) {
      console.error('Failed to download recording:', error);
    } finally {
      setDownloadingRecordId('');
    }
  };

  const renderMembersBadge = (record: any) => {
    if (!(record?.memberNames?.length > 0)) return <span className="text-[#94a3b8]">--</span>;

    return (
      <CustomTooltip
        side="top"
        className="bg-black text-white border-black max-w-[260px]"
        text={
          <div className="min-w-[170px]">
            <p className="mb-1 text-sm font-semibold">{record.memberNames.length} Members</p>
            <div className="max-h-40 overflow-y-auto pr-1">
              {record.memberNames.map((name: string, index: number) => (
                <p
                  key={`${name}-${index}`}
                  className="border-t border-white/25 py-0.5 text-xs first:border-t-0"
                >
                  {name}
                </p>
              ))}
            </div>
          </div>
        }
      >
        <button
          type="button"
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #E78B50, #D9652E)' }}
        >
          {record.memberNames.length}
        </button>
      </CustomTooltip>
    );
  };

  const renderActionsMenu = (record: any) => {
    const isDownloading = downloadingRecordId === record?._id;
    const canShareAction = Boolean(canShare?.(record) && onShare);
    const canOpenChatAction = Boolean(canOpenChat?.(record) && onChat);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/70 bg-white/50 backdrop-blur-md text-[#64748b] hover:bg-white/80"
            aria-label="Recording actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 border border-[#d7dbe2]">
          <DropdownMenuItem
            onClick={() => handleDownloadRecording(record)}
            disabled={isDownloading}
            className="cursor-pointer"
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? 'Downloading...' : 'Download'}
          </DropdownMenuItem>
          {canShareAction ? (
            <DropdownMenuItem onClick={() => onShare?.(record)} className="cursor-pointer">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
          ) : null}
          {canOpenChatAction ? (
            <DropdownMenuItem onClick={() => onChat?.(record)} className="cursor-pointer">
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => onPlay(record)} className="cursor-pointer">
            <Play className="mr-2 h-4 w-4" />
            Play
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="flex min-h-[calc(100svh-320px)] max-h-[calc(100svh-180px)] flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/45 backdrop-blur-xl shadow-[0_4px_20px_rgba(154,52,18,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
      <div className="flex flex-col gap-3 border-b border-white/60 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="relative w-full sm:max-w-[380px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={searchText}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search recordings..."
            className="h-10 w-full rounded-xl border border-white/80 bg-white/70 backdrop-blur-md pl-9 pr-3 text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:ring-[3px] focus:ring-[#E78B50]/20 focus:border-[#E78B50]/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-white/60 backdrop-blur-md text-[#64748b] hover:bg-white/85"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border border-[#d7dbe2]">
              <DropdownMenuLabel>Filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={videosOnly}
                onCheckedChange={(value) => setVideosOnly(Boolean(value))}
                className="!pl-2 pr-8 text-sm text-[#334155] data-[state=checked]:font-medium [&>span]:left-auto [&>span]:right-2 [&>span]:size-3 [&_svg]:text-[#B5642F]"
              >
                Videos only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sharedOnly}
                onCheckedChange={(value) => setSharedOnly(Boolean(value))}
                className="!pl-2 pr-8 text-sm text-[#334155] data-[state=checked]:font-medium [&>span]:left-auto [&>span]:right-2 [&>span]:size-3 [&_svg]:text-[#B5642F]"
              >
                Shared only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={largeFilesOnly}
                onCheckedChange={(value) => setLargeFilesOnly(Boolean(value))}
                className="!pl-2 pr-8 text-sm text-[#334155] data-[state=checked]:font-medium [&>span]:left-auto [&>span]:right-2 [&>span]:size-3 [&_svg]:text-[#B5642F]"
              >
                Large files (&gt; 100 MB)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-white/60 backdrop-blur-md text-[#64748b] hover:bg-white/85"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border border-[#d7dbe2]">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => setSortBy(option.key)}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{option.label}</span>
                  {sortBy === option.key ? (
                    <Check className="h-4 w-4" style={{ color: '#B5642F' }} />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(0,2.8fr)_0.95fr_1fr_0.95fr_0.7fr_56px] gap-4 border-b border-white/60 bg-white/20 px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#8a6a55] sm:grid">
        <div>Name</div>
        <div>Size</div>
        <div>Recorded On</div>
        <div>Owner</div>
        <div>Members</div>
        <div className="text-center">Actions</div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-sm text-[#64748b]">
            Loading recordings...
          </div>
        ) : filteredRecords.length ? (
          <>
            <div className="flex flex-col gap-3 p-3 sm:hidden">
              {filteredRecords.map((record) => (
                <div
                  key={record?._id}
                  className="rounded-xl border border-white/70 bg-white/50 backdrop-blur-md p-3 shadow-[0_2px_10px_rgba(154,52,18,0.05)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E78B50]/10 text-[#B5642F]">
                        {record.fileType === 'video' ? (
                          <FileVideo2 className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="block max-w-full truncate text-sm font-semibold text-[#0f172a]"
                          title={record?.meeting?.name ?? record.displayName}
                        >
                          {record?.meeting?.name ?? record.displayName}
                        </p>
                        <div className="flex min-w-0 items-center gap-1 text-xs text-[#64748b]">
                          <p className="truncate min-w-0">
                            {record.durationLabel !== '--' ? `${record.durationLabel} - ` : ''}
                            <span className="break-all">{record.meetingId || 'Meeting'}</span>
                          </p>
                          {record?.isSharedWithMeNonAdmin ? (
                            <CustomTooltip text="Shared with you" side="top">
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E78B50]/10 text-[#B5642F]">
                                <Share2 className="h-3 w-3" />
                              </span>
                            </CustomTooltip>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {renderActionsMenu(record)}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="min-w-0">
                      <p className="text-[#64748b]">Size</p>
                      <p className="truncate font-medium text-[#0f172a]">
                        {formatFileSize(record?.recordingSize || record.sizeBytes || 0)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#64748b]">Recorded On</p>
                      <p className="truncate font-medium text-[#0f172a]">{record.modifiedLabel}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#64748b]">Owner</p>
                      <p className="truncate font-medium text-[#0f172a]">{record.ownerLabel}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#64748b]">Members</p>
                      <div className="pt-0.5">{renderMembersBadge(record)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:flex sm:flex-col">
              {filteredRecords.map((record) => (
                <div
                  key={record?._id}
                  className="grid grid-cols-[minmax(0,2.8fr)_0.95fr_1fr_0.95fr_0.7fr_56px] items-center gap-4 border-b border-white/50 px-5 py-4 transition-colors last:border-b-0 hover:bg-white/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E78B50]/10 text-[#B5642F]">
                      {record.fileType === 'video' ? (
                        <FileVideo2 className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="block max-w-full truncate text-base font-medium text-[#0f172a]"
                        title={record?.meeting?.name ?? record.displayName}
                      >
                        {record?.meeting?.name ?? record.displayName}
                      </p>
                      <div className="flex min-w-0 items-center gap-1 text-xs text-[#64748b]">
                        <p className="truncate min-w-0">
                          {record.durationLabel !== '--' ? `${record.durationLabel} - ` : ''}
                          {record.meetingId || 'Meeting'}
                        </p>
                        {record?.isSharedWithMeNonAdmin ? (
                          <CustomTooltip text="Shared with you" side="top">
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E78B50]/10 text-[#B5642F]">
                              <Share2 className="h-3 w-3" />
                            </span>
                          </CustomTooltip>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 text-sm text-[#475569]">
                    {formatFileSize(record?.recordingSize || record.sizeBytes || 0)}
                  </div>
                  <div className="min-w-0 text-sm text-[#475569]">{record.modifiedLabel}</div>
                  <div className="min-w-0 text-sm text-[#0f172a]">{record.ownerLabel}</div>
                  <div className="text-sm text-[#0f172a] ml-4">{renderMembersBadge(record)}</div>
                  <div className="flex items-center justify-center">
                    {renderActionsMenu(record)}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-8">
            {records.length ? (
              <>
                <p className="text-base font-medium text-[#0f172a]">No matching results</p>
                <p className="text-sm text-[#64748b]">Try changing search text or filters.</p>
              </>
            ) : (
              <>
                <img src={NotFound} alt="NotFound" className="w-24 min-w-24" />
                <p className="text-base font-medium text-[#0f172a]">{emptyTitle}</p>
                <p className="text-sm text-[#64748b]">{emptyDescription}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingListingTable;
