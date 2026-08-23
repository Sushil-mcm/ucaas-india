export interface CalendarProps {
  height?: string;
  calendars: Array<{
    id: string;
    color?: any;
    name: string;
    bgColor?: string;
    dragBgColor?: string;
    borderColor?: string;
  }>;
  handleCategoryFilter: (category: string) => void;
  category: string;
  schedules: any[];
  showFilters?: boolean;
  showMenu?: boolean;
  createText?: string;
  onBeforeCreateSchedule?: (event: any) => void;
  onBeforeUpdateSchedule?: (event: any) => void;
  onBeforeDeleteSchedule?: (event: any) => void;
  onRangeChange?: (range: { from: string; to: string }) => void;
  onCurrentDateChange?: (date: string) => void;
  suppressNextCreationRef: React.MutableRefObject<boolean>;
  useInternalDetailsPopup?: boolean;
  onScheduleClick?: (data: { schedule: any; mouseEvent?: MouseEvent }) => void;
}
export interface CalendarRef {
  getAlert: () => void;
  createSchedule: (schedule: any) => void;
  updateSchedule: (schedule: any, changes: Partial<any>) => void;
  deleteSchedule: (schedule: any) => void;
  suppressNextCreation: () => void;
  openScheduleDetails: (schedule: any) => void;
  setCurrentDate: (date: Date) => void;
  refreshCalendar: () => void;
}

export const SYNC_BUTTON_LABELS = {
  GOOGLE: {
    loading: 'Loading...',
    disconnect: 'Disconnect Google',
    syncWithGoogle: 'Sync with Google',
    google: 'google',
  },
  OUTLOOK: {
    loading: 'Loading...',
    disconnect: 'Disconnect Outlook',
    syncWithOutlook: 'Sync with Outlook',
    outlook: 'outlook',
  },
};
