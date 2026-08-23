import moment, { Moment } from 'moment';

export const _getDates = (
  _start: string | Date | Moment,
  _end: string | Date | Moment,
  _include: string[] | null = null,
): { _date_arr: string[]; _days: string[] } => {
  const _date_arr: string[] = [];
  const _days: string[] = [];
  const _curr = moment(_start); // keep as const
  const _endMoment = moment(_end);

  while (_curr <= _endMoment) {
    const _myDate = _curr.format('YYYY-MM-DD');
    const _myDay = _curr.format('dddd').toLowerCase();
    _days.push(_myDay);

    if (Array.isArray(_include) && _include.includes(_myDay)) {
      _date_arr.push(_myDate);
    } else if (!_include) {
      _date_arr.push(_myDate);
    }

    _curr.add(1, 'days'); // mutate _curr directly
  }

  return { _date_arr, _days };
};
