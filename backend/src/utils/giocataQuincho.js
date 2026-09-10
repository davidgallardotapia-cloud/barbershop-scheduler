const QUINCHO = Object.freeze({
  resource: "Quincho",
  service: "Quincho (20:00 a 23:30 - $20.000)",
  start: "20:00",
  end: "23:30",
  durationMinutes: 210,
  price: 20000,
  uniqueIndex: "idx_giocata_quincho_one_per_day",
});

function isGiocataQuincho(businessId, resource) {
  return businessId === "giocata" && String(resource || "").trim().toLowerCase() === "quincho";
}

function validateQuinchoBooking({ businessId, barber, service, time, needsOpponent, opponentName, opponentPhone }) {
  if (businessId !== "giocata") return "";
  const mentionsQuincho = isGiocataQuincho(businessId, barber) || /^quincho\b/i.test(String(service || "").trim());
  if (!mentionsQuincho) return "";
  if (barber !== QUINCHO.resource || service !== QUINCHO.service) {
    return "Selecciona el servicio Quincho de $20.000 y su recurso correspondiente.";
  }
  if (![QUINCHO.start, `${QUINCHO.start}:00`].includes(time)) {
    return "El quincho se reserva en un bloque completo de 20:00 a 23:30.";
  }
  if (needsOpponent || opponentName || opponentPhone) {
    return "La reserva del quincho no admite rival.";
  }
  return "";
}

function isQuinchoConflict(error) {
  return error?.code === "23505" && error?.constraint === QUINCHO.uniqueIndex;
}

module.exports = { QUINCHO, isGiocataQuincho, validateQuinchoBooking, isQuinchoConflict };
