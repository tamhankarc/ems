export const IST_OFFSET_MINUTES = 330;

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toIstDate(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
}

export function getIstDateKey(date: Date = new Date()) {
  const ist = toIstDate(date);
  return formatDateParts(ist.getUTCFullYear(), ist.getUTCMonth() + 1, ist.getUTCDate());
}

export function getIstTimeParts(date: Date = new Date()) {
  const ist = toIstDate(date);
  return {
    hours: ist.getUTCHours(),
    minutes: ist.getUTCMinutes(),
    day: ist.getUTCDate(),
    month: ist.getUTCMonth() + 1,
    year: ist.getUTCFullYear(),
  };
}

export function getDayBoundsUtcFromIstDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, -IST_OFFSET_MINUTES, 0, 0));
  const endUtc = new Date(Date.UTC(year, month - 1, day + 1, 0, -IST_OFFSET_MINUTES, 0, 0));
  return { startUtc, endUtc };
}

export function getDisplayDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatTimeInIst(date: Date | string | null | undefined) {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export function formatDateInIst(date: Date | string | null | undefined) {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export function getAttendanceWorkDateKey(date: Date = new Date()) {
  const ist = toIstDate(date);
  const hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  if (hours < 8 || (hours === 8 && minutes <= 29)) {
    const prev = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - 1, 12, 0, 0));
    return formatDateParts(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
  }
  return formatDateParts(ist.getUTCFullYear(), ist.getUTCMonth() + 1, ist.getUTCDate());
}

export function isMarkInWindow(date: Date = new Date()) {
  const { hours, minutes } = getIstTimeParts(date);
  const total = hours * 60 + minutes;
  return total >= 8 * 60 + 30 && total <= 15 * 60;
}

export function isMarkOutWindow(date: Date = new Date()) {
  const { hours, minutes } = getIstTimeParts(date);
  const total = hours * 60 + minutes;
  return total >= 12 * 60 || total <= 8 * 60 + 29;
}

export function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getMonthStartUtcFromIstKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 0, -IST_OFFSET_MINUTES, 0, 0));
}

export function getMonthEndUtcExclusiveFromIstKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1, 0, -IST_OFFSET_MINUTES, 0, 0));
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1, 12, 0, 0));
  return getMonthKey(d);
}

export function clampMonthKey(monthKey: string, minMonthKey: string, maxMonthKey: string) {
  if (monthKey < minMonthKey) return minMonthKey;
  if (monthKey > maxMonthKey) return maxMonthKey;
  return monthKey;
}

export function getInitialCalendarStartMonth(joiningDate: Date | null | undefined, today: Date = new Date()) {
  const currentIst = toIstDate(today);
  const currentMonth = getMonthKey(new Date(Date.UTC(currentIst.getUTCFullYear(), currentIst.getUTCMonth(), 1, 12, 0, 0)));
  if (joiningDate) {
    const joiningIst = toIstDate(joiningDate);
    return getMonthKey(new Date(Date.UTC(joiningIst.getUTCFullYear(), joiningIst.getUTCMonth(), 1, 12, 0, 0)));
  }
  return shiftMonthKey(currentMonth, -12);
}
