export const QUINCHO = Object.freeze({
  resource: "Quincho",
  service: "Quincho (20:00 a 23:30 - $20.000)",
  start: "20:00",
  end: "23:30",
  timeLabel: "20:00 a 23:30",
  durationLabel: "3 horas 30 minutos",
  durationMinutes: 210,
  price: 20000,
});

export function isGiocataQuincho(businessId, resourceOrService) {
  return businessId === "giocata" && /^quincho\b/i.test(String(resourceOrService || "").trim());
}

export function getSportsResource(service, businessId) {
  if (isGiocataQuincho(businessId, service)) return QUINCHO.resource;
  return String(service || "").match(/Cancha\s+\d+/i)?.[0] || "";
}

export function hasQuinchoBookingEnded(dateValue, now = new Date()) {
  const date = dateValue instanceof Date
    ? `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`
    : String(dateValue || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;

  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  return date < today || (date === today && `${parts.hour}:${parts.minute}` >= QUINCHO.end);
}
