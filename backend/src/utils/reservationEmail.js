function getReservationReplyTo(businessId, defaultReplyTo = null) {
  return businessId === "giocata"
    ? "complejogiocata@gmail.com"
    : defaultReplyTo;
}

module.exports = { getReservationReplyTo };
