export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateKey(isoDate: string) {
  return formatDateKey(new Date(isoDate));
}

export function getDateRange(windowDays: number, baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  return {
    start,
    end: addDays(start, windowDays),
  };
}

export function getDateWindowKeys(windowDays: number, baseDate = new Date()) {
  const { start } = getDateRange(windowDays, baseDate);
  return Array.from({ length: windowDays }, (_, index) => formatDateKey(addDays(start, index)));
}
