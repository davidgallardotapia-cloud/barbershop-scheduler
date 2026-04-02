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
  slotDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (slotDate < today) {
    return true;
  }

  if (slotDate > today) {
    return false;
  }

  return hour < now.getHours();
}

export function isPastDayOnly(day) {
  const slotDate = new Date(day);
  slotDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return slotDate < today;
}