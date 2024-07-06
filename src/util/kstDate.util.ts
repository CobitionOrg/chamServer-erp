const offset = 9 * 60 * 60 * 1000;

export const getDayStartAndEnd = (date: string) => {
  const gmtDate = new Date(date);
  const kstDate = new Date(gmtDate.getTime() + offset);

  const startDate = new Date(kstDate.getTime());
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(kstDate.getTime());
  endDate.setUTCHours(23, 59, 59, 999);

  return { startDate, endDate };
};

export const getStartOfToday = () => {
  const gmtDate = new Date();
  const kstDate = new Date(gmtDate.getTime() + offset);

  const startDate = new Date(kstDate.getTime());
  startDate.setUTCHours(0, 0, 0, 0);

  return startDate;
};

export const getCurrentDateAndTime = () => {
  const gmtDate = new Date();
  const kstDate = new Date(gmtDate.getTime() + offset);

  return kstDate;
};

export const checkTardy = (date: Date) => {
  const startHour = date.getUTCHours();
  const startMin = date.getUTCMinutes();
  if (startHour < 9) {
    return false;
  } else if (startHour === 9) {
    return startMin !== 0;
  } else {
    return true;
  }
};

export const getCurrentMonth = () => {
  const gmtDate = new Date();
  const kstDate = new Date(gmtDate.getTime() + offset);

  return kstDate.getUTCMonth() + 1;
}