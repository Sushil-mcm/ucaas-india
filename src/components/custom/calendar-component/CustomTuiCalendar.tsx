import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import TuiCalendar, { TZDate } from 'tui-calendar';
import moment from 'moment';
import './styles.css';
import { Button } from '@/components/ui/button';
import { CalendarProps, CalendarRef, SYNC_BUTTON_LABELS } from './constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  disconnectWithGoogleAndOutlook,
  getCalendarAccessToken,
  syncWithGoogleAndOutlook,
} from '@/services/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import AlertConfirm from '../alert-confirm';
import { capitalizeFirstLetter } from '@/lib/utils';
import { calendarFilterType } from '@/pages/video-meetings/Calender/constants';
import { useUser } from '@/hooks/use-user';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

const CustomTuiCalendar = forwardRef<CalendarRef, CalendarProps>(
  (
    {
      // height = '760px',
      calendars = [],
      schedules = [],
      suppressNextCreationRef,
      showFilters = false,
      showMenu = false,
      onBeforeCreateSchedule = () => false,
      onBeforeUpdateSchedule = () => false,
      onBeforeDeleteSchedule = () => false,
      handleCategoryFilter = () => false,
      category,
      onRangeChange,
      onCurrentDateChange,
      useInternalDetailsPopup = true,
      onScheduleClick,
      ...rest
    },
    ref,
  ) => {
    const objectRef = ref as React.RefObject<CalendarRef>;
    const calendarInstRef = useRef<any | null>(null);
    const tuiRef = useRef<HTMLDivElement | any>(null);
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [renderRange, setRenderRange] = useState('');
    const [workweek, setWorkweek] = useState(true);
    const [type, setType] = useState('Monthly');
    const [filterSchedules, setFilterSchedules] = useState(schedules);
    const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [syncButtonClicked, setSyncButtonClicked] = useState<string | null>(null);
    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const { user } = useUser();
    const userId = user?.user_info?.uuid || '';

    const queryClient: any = useQueryClient();
    const handleCopy = () => {
      if (selectedSchedule?.body) {
        navigator.clipboard.writeText(selectedSchedule?.body);
        setCopiedLink(true);

        setTimeout(() => {
          setCopiedLink(false);
        }, 3000);
      }
    };
    const handleScheduleClick = (schedule: any, mouseEvent: MouseEvent) => {
      setSelectedSchedule(schedule);
      setPopoverPosition({ x: mouseEvent.pageX, y: mouseEvent.pageY });
    };
    const getScheduleDate = (value: any) => {
      if (!value) return null;
      if (typeof value?.toDate === 'function') return value.toDate();
      return value instanceof Date ? value : new Date(value);
    };
    const openScheduleDetails = (schedule: any) => {
      if (!schedule) return;
      const instance = calendarInstRef.current;
      const normalizedSchedule =
        instance?.getSchedule?.(schedule.id, schedule.calendarId) || schedule;
      const container = tuiRef.current as HTMLDivElement | null;
      const rect = container?.getBoundingClientRect();
      const x = rect ? rect.left + window.scrollX + rect.width * 0.6 : window.scrollX + 300;
      const y = rect ? rect.top + window.scrollY + 160 : window.scrollY + 200;

      setSelectedSchedule(normalizedSchedule);
      setPopoverPosition({ x, y });
    };
    const { data: accessToken = {}, isLoading } = useQuery({
      queryKey: ['getCalendarAccessToken'],
      queryFn: () => getCalendarAccessToken(),
      select: (data) => data?.data?.data?.result || {},
    });
    const { google: googleAccessToken = false, outlook: outlookAccessToken = false } =
      accessToken || {};

    const { mutate: mutateDisconnect, isPending } = useMutation({
      mutationKey: ['disconnectWithGoogleAndOutlook'],
      mutationFn: disconnectWithGoogleAndOutlook,
      onSuccess: () => {
        setSyncButtonClicked(null);
        setOpenConfirmModal(false);
        queryClient.invalidateQueries(['getCalendarAccessToken'], { exact: true });
      },
    });
    const { mutateAsync: syncWith } = useMutation({
      mutationKey: ['syncWithGoogleAndOutlook'],
      mutationFn: syncWithGoogleAndOutlook,
      onSettled: () => setSyncButtonClicked(null),
    });

    useImperativeHandle(ref, () => ({
      getAlert() {
        alert('getAlert from Child');
      },
      suppressNextCreation() {
        suppressNextCreationRef.current = true;
      },
      createSchedule,
      updateSchedule,
      deleteSchedule,
      openScheduleDetails,
      setCurrentDate,
      refreshCalendar,
    }));

    useEffect(() => {
      const container = tuiRef.current;
      if (!container) return;

      if (!calendarInstRef.current) {
        const instance = new TuiCalendar(container, {
          useDetailPopup: false,
          useCreationPopup: false,
          defaultView: 'month',
          taskView: false,
          scheduleView: ['time'],
          calendars,
          template: {
            /* A dot, the title, and the time beneath it. */
            time: (schedule) => {
              const startDate = (schedule?.start as TZDate).toDate();
              const endDate = (schedule?.end as TZDate)?.toDate();
              const title = schedule?.title;
              const startTime = moment(startDate).format('hh:mm A');
              const endTime =
                schedule?.raw?.category === 'EVENT' && endDate
                  ? ` - ${moment(endDate).format('hh:mm A')}`
                  : '';

              return `
                      <div class="flex flex-col leading-[1.2] gap-[2px]">
                        <span class="font-semibold text-[13px] truncate block max-w-[180px]">${title}</span>
                        <span class="text-[9px]">${startTime}${endTime}</span>
                      </div>
                    `;
            },
            popupDetailDate: (isAllDay, start, end) => {
              const startDate = (start as TZDate).toDate();
              const endDate = (end as TZDate).toDate();
              const isSameDate = moment(startDate).isSame(endDate);
              const endFormat = (isSameDate ? '' : 'YYYY/MM/DD ') + 'HH:mm';
              return isAllDay
                ? `${moment(startDate).format('YYYY/MM/DD')}${isSameDate ? '' : ' - ' + moment(endDate).format('YYYY/MM/DD')}`
                : `${moment(startDate).format('YYYY/MM/DD HH:mm')} - ${moment(endDate).format(endFormat)}`;
            },
            popupDetailBody: (schedule) => {
              const link = schedule.body ?? '#';
              return `Join: <a href="${link}" target="_blank" rel="noopener noreferrer" style="color: blue; font-size:11px;">${link}</a>`;
            },
          },
          ...rest,
        });

        calendarInstRef.current = instance;

        instance.on('beforeCreateSchedule', onBeforeCreateSchedule);
        instance.on('beforeUpdateSchedule', onBeforeUpdateSchedule);
        instance.on('beforeDeleteSchedule', onBeforeDeleteSchedule);
        instance.on('clickSchedule', (event: any) => {
          const { schedule, event: mouseEvent } = event;
          if (useInternalDetailsPopup) {
            handleScheduleClick(schedule, mouseEvent);
          }
          if (typeof onScheduleClick === 'function') {
            onScheduleClick({ schedule, mouseEvent });
          }
        });
        instance.on('clickDayname', (event: any) => {
          if (instance.getViewName() === 'week') {
            instance.setDate(new Date(event.date));
            instance.changeView('day', true);
          }
        });
      }
    }, []);
    useEffect(() => {
      const instance = calendarInstRef.current;
      if (!instance) return;

      instance.clear();
      instance.createSchedules(schedules, true);
      instance.render();
      setRenderRangeText();
    }, [schedules]);
    useEffect(() => {
      return () => {
        if (calendarInstRef.current) {
          calendarInstRef.current.destroy();
          calendarInstRef.current = null;
        }
      };
    }, []);
    useEffect(() => {
      document.addEventListener('click', handleClick, false);
      return () => {
        document.removeEventListener('click', handleClick, false);
      };
    });

    const handleClick = (e: any) => {
      if (wrapperRef.current?.contains(e.target)) {
        return;
      }
      setOpen(false);
    };

    function currentCalendarDate(format: string) {
      const currentDate = moment([
        calendarInstRef.current.getDate().getFullYear(),
        calendarInstRef.current.getDate().getMonth(),
        calendarInstRef.current.getDate().getDate(),
      ]);

      return currentDate.format(format);
    }

    const setRenderRangeText = () => {
      const instance = calendarInstRef.current;
      if (!instance) return;
      const options = calendarInstRef.current.getOptions();
      const viewName = calendarInstRef.current.getViewName();
      let from = '';
      let to = '';
      const html = [];
      if (viewName === 'day') {
        const date = currentCalendarDate('YYYY-MM-DD');
        html.push(date);
        from = to = date;
      } else if (
        viewName === 'month' &&
        (!options.month.visibleWeeksCount || options.month.visibleWeeksCount > 4)
      ) {
        const date = currentCalendarDate('YYYY-MM');
        html.push(date);
        const start = instance.getDateRangeStart();
        const end = instance.getDateRangeEnd();
        from = moment(start.getTime()).format('YYYY-MM-DD');
        to = moment(end.getTime()).format('YYYY-MM-DD');
      } else {
        const start = instance.getDateRangeStart();
        const end = instance.getDateRangeEnd();
        from = moment(start.getTime()).format('YYYY-MM-DD');
        to = moment(end.getTime()).format('YYYY-MM-DD');
        html.push(from);
        html.push(' ~ ');
        html.push(to);
      }
      setRenderRange(html.join(''));
      if (typeof onRangeChange === 'function') {
        onRangeChange({ from, to });
      }
      if (typeof onCurrentDateChange === 'function') {
        onCurrentDateChange(currentCalendarDate('YYYY-MM-DD'));
      }
    };

    function createSchedule(schedule: any) {
      calendarInstRef.current.createSchedules([schedule]);
      const cloneFilterSchedules = [...filterSchedules];
      setFilterSchedules(() => [...cloneFilterSchedules, schedule]);
    }

    function updateSchedule(schedule: any, changes: any) {
      calendarInstRef.current.updateSchedule(schedule.id, schedule.calendarId, changes);
      const cloneFilterSchedules = [...filterSchedules];
      setFilterSchedules(() =>
        cloneFilterSchedules.map((item) => {
          if (item.id === schedule.id) {
            return { ...item, ...changes };
          }
          return item;
        }),
      );
    }

    function deleteSchedule(schedule: any) {
      calendarInstRef.current.deleteSchedule(schedule.id, schedule.calendarId);
      const cloneFilterSchedules = [...filterSchedules];
      setFilterSchedules(() => cloneFilterSchedules.filter((item) => item.id !== schedule.id));
    }
    function setCurrentDate(date: Date) {
      if (!calendarInstRef.current) return;
      calendarInstRef.current.setDate(date);
      setRenderRangeText();
    }
    function refreshCalendar() {
      if (!calendarInstRef.current) return;
      calendarInstRef.current.render();
      setRenderRangeText();
    }

    const handleOutlookOAuthPopup = async (type: string) => {
      setSyncButtonClicked(type);
      if (type === SYNC_BUTTON_LABELS.GOOGLE.google && googleAccessToken) {
        setOpenConfirmModal(true);
        return;
      }
      if (type === SYNC_BUTTON_LABELS.OUTLOOK.outlook && outlookAccessToken) {
        setOpenConfirmModal(true);
        return;
      }
      const response = await syncWith({ type: type });
      const url = response?.data?.data?.result?.[0]?.result;
      if (url) {
        window.location.href = url;
      }
    };
    const validAttendees = Array.isArray(selectedSchedule?.attendees)
      ? selectedSchedule?.attendees?.filter(
          (email: string): email is string => typeof email === 'string' && email.trim() !== '',
        )
      : [];

    const selectedScheduleEndDate = getScheduleDate(selectedSchedule?.end);
    const selectedScheduleStartDate = getScheduleDate(selectedSchedule?.start);
    const isExpired =
      selectedScheduleEndDate !== null ? moment(selectedScheduleEndDate).isBefore(moment()) : false;

    return (
      <div className="w-full">
        <div className="flex flex-col gap-2 p-3">
          <div className="flex justify-between items-center flex-col sm:flex-row">
            <div className="flex items-center gap-4 flex-wrap">
              {showMenu && (
                <div>
                  <span
                    ref={wrapperRef}
                    style={{ marginRight: '4px' }}
                    className={`dropdown ${open && 'open'}`}
                  >
                    <button
                      id="dropdownMenu-calendarType"
                      className="btn btn-default btn-sm dropdown-toggle"
                      type="button"
                      data-toggle="dropdown"
                      aria-haspopup="true"
                      aria-expanded={open}
                      onClick={() => setOpen(!open)}
                    >
                      <i
                        id="calendarTypeIcon"
                        className="calendar-icon ic_view_week"
                        style={{ marginRight: '4px' }}
                      />
                      <span id="calendarTypeName">{type}</span>&nbsp;
                      <i className="calendar-icon tui-full-calendar-dropdown-arrow" />
                    </button>
                    <ul
                      className="dropdown-menu !rounded-xl !border-primary"
                      role="menu"
                      aria-labelledby="dropdownMenu-calendarType"
                    >
                      <li role="presentation">
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            calendarInstRef.current.changeView('day', true);
                            setType('Daily');
                            setOpen(false);
                            setRenderRangeText();
                          }}
                          className="dropdown-menu-title"
                          role="menuitem"
                          data-action="toggle-daily"
                        >
                          <i className="calendar-icon ic_view_day" />
                          Daily
                        </div>
                      </li>
                      <li role="presentation">
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            calendarInstRef.current.changeView('week', true);
                            setType('Weekly');
                            setOpen(false);
                            setRenderRangeText();
                          }}
                          className="dropdown-menu-title"
                          role="menuitem"
                          data-action="toggle-weekly"
                        >
                          <i className="calendar-icon ic_view_week" />
                          Weekly
                        </div>
                      </li>
                      <li role="presentation">
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            calendarInstRef.current.setOptions(
                              { month: { visibleWeeksCount: 6 } },
                              true,
                            ); // or null
                            calendarInstRef.current.changeView('month', true);
                            setType('Month');
                            setOpen(false);
                            setRenderRangeText();
                          }}
                          className="dropdown-menu-title"
                          role="menuitem"
                          data-action="toggle-monthly"
                        >
                          <i className="calendar-icon ic_view_month" />
                          Month
                        </div>
                      </li>

                      <li role="presentation" className="dropdown-divider" />
                      <li role="presentation">
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            calendarInstRef.current.setOptions({ month: { workweek } }, true);
                            calendarInstRef.current.setOptions({ week: { workweek } }, true);
                            calendarInstRef.current.changeView(
                              calendarInstRef.current.getViewName(),
                              true,
                            );
                            setWorkweek(!workweek);
                            setOpen(false);
                          }}
                          role="menuitem"
                          data-action="toggle-workweek"
                        >
                          <input
                            type="checkbox"
                            className="tui-full-calendar-checkbox-square"
                            checked={workweek}
                            onChange={() => {}}
                          />
                          <span className="checkbox-title" />
                          Show weekends
                        </div>
                      </li>
                    </ul>
                  </span>

                  <span id="menu-navi">
                    <button
                      type="button"
                      className="btn btn-default btn-sm move-today"
                      style={{ marginRight: '4px' }}
                      data-action="move-today"
                      onClick={() => {
                        calendarInstRef.current.today();
                        setRenderRangeText();
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="btn btn-default btn-sm move-day"
                      style={{ marginRight: '4px' }}
                      data-action="move-prev"
                      onClick={() => {
                        calendarInstRef.current.prev();
                        setRenderRangeText();
                      }}
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                      {/* <i className="calendar-icon ic-arrow-line-left" data-action="move-prev" /> */}
                    </button>
                    <button
                      type="button"
                      className="btn btn-default btn-sm move-day"
                      style={{ marginRight: '4px' }}
                      data-action="move-next"
                      onClick={() => {
                        calendarInstRef.current.next();
                        setRenderRangeText();
                      }}
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                      {/* <i className="calendar-icon ic-arrow-line-right" data-action="move-next" /> */}
                    </button>
                  </span>
                  <span id="renderRange" className="render-range ">
                    {renderRange}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 items-center xs:mt-1 mt-0">
              <Button
                size={'sm'}
                variant={'outline'}
                className="rounded-xl border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all font-semibold px-4 shadow-sm"
                disabled={isLoading || syncButtonClicked === SYNC_BUTTON_LABELS?.GOOGLE?.google}
                onClick={() => handleOutlookOAuthPopup(SYNC_BUTTON_LABELS?.GOOGLE?.google)}
              >
                <Icon name="GoogleIcon" className="w-4 h-4" />
                {isLoading || syncButtonClicked === SYNC_BUTTON_LABELS.GOOGLE.google
                  ? SYNC_BUTTON_LABELS?.GOOGLE?.loading
                  : googleAccessToken
                    ? SYNC_BUTTON_LABELS?.GOOGLE?.disconnect
                    : SYNC_BUTTON_LABELS?.GOOGLE?.syncWithGoogle}
              </Button>
              <Button
                size={'sm'}
                variant={'outline'}
                className="rounded-xl border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all font-semibold px-4 shadow-sm"
                disabled={isLoading || syncButtonClicked === SYNC_BUTTON_LABELS?.OUTLOOK?.outlook}
                onClick={() => handleOutlookOAuthPopup(SYNC_BUTTON_LABELS?.OUTLOOK?.outlook)}
              >
                <Icon name="OutlookIcon" className="w-5 h-5" />
                {isLoading || syncButtonClicked === SYNC_BUTTON_LABELS?.OUTLOOK?.outlook
                  ? SYNC_BUTTON_LABELS?.OUTLOOK?.loading
                  : outlookAccessToken
                    ? SYNC_BUTTON_LABELS?.OUTLOOK?.disconnect
                    : SYNC_BUTTON_LABELS?.OUTLOOK?.syncWithOutlook}
              </Button>
            </div>
          </div>
          <div className="flex justify-end w-full items-center">
            {showFilters && (
              <div className="lnb-calendars-d1">
                {calendars?.map((element) => {
                  const name = element?.name;
                  const isChecked = category === name;
                  return (
                    <div key={element?.id} className="lnb-calendars-item">
                      <label>
                        <input
                          type="checkbox"
                          name="meetingFilter"
                          className="tui-full-calendar-checkbox-round"
                          value={name}
                          checked={isChecked}
                          onChange={() => handleCategoryFilter(name as calendarFilterType)}
                        />
                        <span
                          style={{
                            borderColor: element?.bgColor,
                            backgroundColor: isChecked ? element?.bgColor : 'transparent',
                          }}
                        />
                        <span>{capitalizeFirstLetter(element?.name)}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div
          ref={tuiRef}
          className="mcm-calshell min-h-[calc(100vh-240px)] overflow-visible md:min-h-[calc(100vh-220px)] lg:min-h-[calc(100vh-190px)] lg:max-h-[calc(100vh-244px)] lg:overflow-auto"
        />
        {useInternalDetailsPopup && selectedSchedule && popoverPosition && (
          <Popover
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                objectRef?.current?.suppressNextCreation();
                setSelectedSchedule(null);
              }
            }}
          >
            <PopoverTrigger asChild>
              <span
                style={{ position: 'absolute', left: popoverPosition.x, top: popoverPosition.y }}
              />
            </PopoverTrigger>
            <PopoverContent
              side="left"
              align="center"
              className="w-[350px] p-0 border-t-4 rounded-lg shadow-md z-[1010]"
              style={{ borderTopColor: selectedSchedule?.borderColor }}
            >
              <div className="flex flex-col gap-2 p-3">
                <h4 className="font-semibold">{selectedSchedule?.title}</h4>
                <div className="flex items-center gap-1">
                  <div className="w-5">
                    <Icon name="TimerIcon" className="w-5 h-5" />
                  </div>
                  <p className="text-sm">
                    {selectedScheduleStartDate
                      ? moment(selectedScheduleStartDate).format('YYYY/MM/DD HH:mm')
                      : '-'}
                    {selectedSchedule?.raw?.category === 'EVENT' &&
                      selectedScheduleEndDate &&
                      ` - ${moment(selectedScheduleEndDate).format('YYYY/MM/DD HH:mm')}`}
                  </p>
                </div>

                {validAttendees?.length > 0 && (
                  <div className="flex items-start gap-1">
                    <div className="w-5">
                      <Icon name="UsersGroup" className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex flex-wrap gap-1 text-xs">
                      {validAttendees?.map((email: string, index: number) => (
                        <span
                          key={index}
                          className="bg-gray-200 px-1.5 py-1 rounded text-foreground"
                        >
                          {email.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Icon name="CategoryIcon" className="w-5" />
                  <p
                    style={{ backgroundColor: selectedSchedule?.bgColor }}
                    className="text-xs text-white p-1 rounded-sm "
                  >
                    {capitalizeFirstLetter(selectedSchedule?.raw?.category || '')}
                  </p>
                </div>
                {selectedSchedule?.body && selectedSchedule?.calendarId === '2' && !isExpired && (
                  <div className="flex items-center gap-1">
                    <div className="w-5 flex justify-center">
                      <Icon name="VideocameraAdd" className="w-4 h-4" />
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <Link to={selectedSchedule?.body} target="_blank">
                        <Button variant={'outline'} size={'sm'} className="w-fit  rounded-full">
                          Join Meet
                        </Button>
                      </Link>
                      <Button
                        variant={'ghost'}
                        size={'sm'}
                        className="hover:text-black cursor-pointer"
                        onClick={handleCopy}
                      >
                        {copiedLink ? (
                          <>
                            Copied{' '}
                            <Icon name="CheckMarkIcon" className="w-4 h-4 text-emerald-600" />
                          </>
                        ) : (
                          <>Copy</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                {selectedSchedule?.raw?.reminderMode?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-5">
                      <Icon name="Bell" className="w-4 h-4" />
                    </div>
                    <span className="text-xs">
                      {Array.isArray(selectedSchedule?.raw?.reminderMode)
                        ? selectedSchedule?.raw?.reminderMode
                            .map((item: string) => capitalizeFirstLetter(item || ''))
                            .join(', ')
                        : capitalizeFirstLetter(selectedSchedule?.raw?.reminderMode || '')}
                    </span>
                  </div>
                )}

                {selectedSchedule?.raw?.description && (
                  <div className="flex items-start gap-1">
                    <div className="w-5">
                      <Icon name="DescriptionIcon" className="w-4 h-4" />
                    </div>
                    <div className="text-xs">{selectedSchedule?.raw?.description}</div>
                  </div>
                )}
                {selectedSchedule?.raw?.createdById === userId && (
                  <div className="flex justify-between pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-sm hover:text-black cursor-pointer"
                      onClick={() => {
                        onBeforeUpdateSchedule({ schedule: selectedSchedule });
                        setSelectedSchedule(null);
                      }}
                      disabled={isExpired}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-sm"
                      onClick={() => {
                        onBeforeDeleteSchedule({ schedule: selectedSchedule });
                        setSelectedSchedule(null);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <AlertConfirm
          {...{
            apiLoading: isPending,
            open: openConfirmModal,
            setOpen: setOpenConfirmModal,
            onCancel: () => setSyncButtonClicked(null),
            onConfirm: () => mutateDisconnect({ type: syncButtonClicked }),
            descriptionTextComp: `Are you sure, you want to disconnect with ${syncButtonClicked ?? ''}?`,
          }}
        />
      </div>
    );
  },
);

export default CustomTuiCalendar;
