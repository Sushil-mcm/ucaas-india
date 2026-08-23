export const getScheduleHours = (schedule: any) => {
  const response = `${Object.keys(schedule)
    ?.filter((day) => schedule?.[day]?.open)
    ?.map((day) => day?.slice(0, 3)?.charAt(0)?.toUpperCase() + day?.slice(1, 3))
    ?.join(', ')}`;

  return response;
};
