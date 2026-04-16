export function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDateToInput(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatHourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function addDays(dateObj, days) {
  const d = new Date(dateObj);
  d.setDate(d.getDate() + days);
  return d;
}

export function sameDate(dateString, dateObj) {
  if (!dateString || !dateObj) return false;
  const normalizedDate = String(dateString).slice(0, 10);
  return normalizedDate === formatDateToInput(dateObj);
}

export function isPastSlot(day, hour) {
  const now = new Date();
  const slotDate = new Date(day);

  if (typeof hour === "string") {
    const [h, m] = hour.split(":").map(Number);
    slotDate.setHours(h, m || 0, 0, 0);
  } else {
    slotDate.setHours(hour, 0, 0, 0);
  }

  return slotDate < now;
}

export function isPastDayOnly(day) {
  const slotDate = new Date(day);
  slotDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return slotDate < today;
}

export function isSunday(day) {
  const dateObj = day instanceof Date ? day : new Date(day);
  return dateObj.getDay() === 0;
}