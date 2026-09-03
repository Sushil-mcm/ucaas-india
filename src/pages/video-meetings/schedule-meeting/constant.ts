export const startMeetHourArr = [
  {
    id: 0,
    val: '00',
  },
  {
    id: 1,
    val: '01',
  },
  {
    id: 2,
    val: '02',
  },
  {
    id: 3,
    val: '03',
  },
  {
    id: 4,
    val: '04',
  },
  {
    id: 5,
    val: '05',
  },
  {
    id: 6,
    val: '06',
  },
  {
    id: 7,
    val: '07',
  },
  {
    id: 8,
    val: '08',
  },
  {
    id: 9,
    val: '09',
  },
  {
    id: 10,
    val: '10',
  },
  {
    id: 11,
    val: '11',
  },
  {
    id: 12,
    val: '12',
  },
  {
    id: 13,
    val: '13',
  },
  {
    id: 14,
    val: '14',
  },
  {
    id: 15,
    val: '15',
  },
  {
    id: 16,
    val: '16',
  },
  {
    id: 17,
    val: '17',
  },
  {
    id: 18,
    val: '18',
  },
  {
    id: 19,
    val: '19',
  },
  {
    id: 20,
    val: '20',
  },
  {
    id: 21,
    val: '21',
  },
  {
    id: 22,
    val: '22',
  },
  {
    id: 23,
    val: '23',
  },
];

export const startMeetMinutesArr = [
  {
    id: 1,
    val: '00',
  },
  {
    id: 2,
    val: '05',
  },
  {
    id: 3,
    val: '10',
  },
  {
    id: 4,
    val: '15',
  },
  {
    id: 5,
    val: '20',
  },
  {
    id: 6,
    val: '25',
  },
  {
    id: 7,
    val: '30',
  },
  {
    id: 8,
    val: '35',
  },
  {
    id: 9,
    val: '40',
  },
  {
    id: 10,
    val: '45',
  },
  {
    id: 11,
    val: '50',
  },
  {
    id: 12,
    val: '55',
  },
];

export const countries = [
  {
    label: 'India',
    value: 'IN',
  },
  {
    label: 'United States',
    value: 'US',
  },
];
export const durationOptions = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hr', value: 60 },
  { label: '1:30 hr', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '2:30 hr', value: 150 },
  { label: '3 hr', value: 180 },
];

export const initialValue = {
  name: '',
  meeting_date: '',
  reminder: false,
  reminder_mode: [],
  start_time: '',
  pin: '',
  need_password: 'No',
  allowHost: 'N',
  hr: '',
  mins: '',
  inviteOthers: [],
  // This build only serves India, so the country/timezone pickers are
  // hidden and the form is fixed to India's one timezone from the start.
  timezone: { label: 'Asia/Kolkata', value: 'Asia/Kolkata' },
  country_code: { label: 'India (IN)', value: 'IN' },
  members: [],
};
export const getMeetingStatus = (isActive: boolean, isFutureTime: boolean) => {
  if (isActive) {
    return { label: 'Ongoing', classes: 'bg-yellow-100 text-yellow-500' };
  }

  if (isFutureTime) {
    return { label: 'Upcoming', classes: 'bg-ucass-active-bg text-ucass-active' };
  }

  return { label: 'Completed', classes: 'bg-green-100 text-green-500' };
};
