const BULLET = "-";

function isSportsBusiness(business) {
  const businessId = business?.id || business?.businessId || "";

  return ["giocata", "pinguino-club"].includes(businessId);
}

export function buildBarberWhatsappUrl({
  barberPhone,
  name,
  phone,
  date,
  time,
  service,
  barber,
  business,
  needsOpponent = false,
}) {
  const isSports = isSportsBusiness(business);

  const messageText = isSports
    ? `Nueva reserva de cancha

${BULLET} Cliente / Equipo: ${name}
${BULLET} Telefono: ${phone}

${BULLET} Fecha: ${date}
${BULLET} Hora: ${time}

${BULLET} Tipo de cancha: ${service}
${BULLET} Cancha: ${barber}${
        needsOpponent
          ? `

${BULLET} Estado: Se busca rival`
          : ""
      }`
    : `Nueva cita agendada

${BULLET} Cliente: ${name}
${BULLET} Telefono: ${phone}

${BULLET} Fecha: ${date}
${BULLET} Hora: ${time}

${BULLET} Servicio: ${service}
${BULLET} Barbero: ${barber}`;

  return `https://wa.me/${barberPhone}?text=${encodeURIComponent(messageText)}`;
}

export function buildOpponentWhatsappUrl({
  barberPhone,
  teamOneName,
  teamOnePhone,
  opponentName,
  opponentPhone,
  date,
  time,
  service,
  barber,
  business,
}) {
  const businessName = business?.name || "AgendaSmart";

  const messageText = `Rival encontrado

${BULLET} Negocio: ${businessName}

${BULLET} Equipo 1: ${teamOneName || "Por definir"}
${BULLET} Telefono equipo 1: ${teamOnePhone || "Sin telefono"}

${BULLET} Equipo 2: ${opponentName}
${BULLET} Telefono equipo 2: ${opponentPhone}

${BULLET} Fecha: ${date}
${BULLET} Hora: ${time}

${BULLET} Tipo de cancha: ${service}
${BULLET} Cancha: ${barber}

${BULLET} Estado: Partido completado`;

  return `https://wa.me/${barberPhone}?text=${encodeURIComponent(messageText)}`;
}
