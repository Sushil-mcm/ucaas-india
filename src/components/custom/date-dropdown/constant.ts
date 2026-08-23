import moment from 'moment';

export const handleDate = (value: any, customDate: any = {}, timeRange: any = {}) => {
  const todayDate = moment().format('YYYY-MM-DD');
  const yesterdayDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
  switch (value) {
    case 'Today':
      return {
        from: moment(todayDate, 'YYYY-MM-DD').format('YYYY-MM-DD'),
        to: moment(todayDate, 'YYYY-MM-DD').format('YYYY-MM-DD'),
      };

    case 'Yesterday':
      return {
        from: moment(yesterdayDate, 'YYYY-MM-DD').format('YYYY-MM-DD'),
        to: moment(yesterdayDate, 'YYYY-MM-DD').format('YYYY-MM-DD'),
      };

    case 'Last 7 Days':
      return {
        from: moment().subtract(7, 'days').startOf('day').format('YYYY-MM-DD'),
        to: moment().endOf('day').format('YYYY-MM-DD'),
      };

    case 'Last 30 Days':
      return {
        from: moment().subtract(30, 'days').startOf('day').format('YYYY-MM-DD'),
        to: moment().endOf('day').format('YYYY-MM-DD'),
      };

    case 'This Month':
      return {
        from: moment().startOf('month').format('YYYY-MM-DD'),
        to: moment().endOf('month').format('YYYY-MM-DD'),
      };

    case 'Last Month':
      return {
        from: moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
        to: moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
      };

    case 'Custom':
      return {
        from: customDate?.from
          ? moment(`${moment(customDate.from).format('YYYY-MM-DD')}`, 'YYYY-MM-DD').format(
              'YYYY-MM-DD',
            )
          : '',
        to: customDate?.to
          ? moment(`${moment(customDate.to).format('YYYY-MM-DD')}`, 'YYYY-MM-DD').format(
              'YYYY-MM-DD',
            )
          : '',
      };

    case 'Custom Date/Time':
      return {
        from: customDate?.from
          ? moment(
              `${moment(customDate.from).format('YYYY-MM-DD')} ${timeRange.from}`,
              'YYYY-MM-DD',
            ).format('YYYY-MM-DD')
          : '',
        to: customDate?.to
          ? moment(
              `${moment(customDate.to).format('YYYY-MM-DD')} ${timeRange.to}`,
              'YYYY-MM-DD',
            ).format('YYYY-MM-DD')
          : '',
      };

    default:
      return { from: '', to: '' };
  }
};

export const DateFilterTypes = [
  { label: 'Today', value: 'Today' },
  { label: 'Yesterday', value: 'Yesterday' },
  { label: 'Last 7 Days', value: 'Last 7 Days' },
  { label: 'Last 30 Days', value: 'Last 30 Days' },
  { label: 'This Month', value: 'This Month' },
  { label: 'Last Month', value: 'Last Month' },
  { label: 'Date Range', value: 'Custom' },
];

export const DateFilterTypes2 = [
  { label: 'Today', value: 'Today' },
  { label: 'Yesterday', value: 'Yesterday' },
  { label: 'Last 7 Days', value: 'Last 7 Days' },
  { label: 'This Month', value: 'This Month' },
  { label: 'Date Range', value: 'Custom' },
];

export const dropdownInitialVal = {
  value: handleDate(''),
  date_type: '',
  dateOptions: DateFilterTypes,
};

export const dropdownCallInitialVal = {
  value: handleDate('Last 7 Days'),
  date_type: 'Last 7 Days',
  dateOptions: DateFilterTypes,
};

export const dropdownCallInitialValForCustom = {
  value: handleDate('Last 7 Days'),
  date_type: 'Last 7 Days',
  dateOptions: DateFilterTypes2,
};
