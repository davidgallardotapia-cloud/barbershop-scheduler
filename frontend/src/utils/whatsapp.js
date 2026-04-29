const ICONS = {
  barber: "\u{1F488}", // 💈
  person: "\u{1F464}", // 👤
  phone: "\u{1F4DE}", // 📞
  calendar: "\u{1F4C5}", // 📅
  clock: "\u{23F0}", // ⏰
  scissors: "\u{2702}\uFE0F", // ✂️
  worker: "\u{1F468}\u200D\u{1F527}", // 👨‍🔧
  soccer: "\u{26BD}", // ⚽
  pin: "\u{1F4CD}", // 📍
  search: "\u{1F50E}", // 🔎
  check: "\u{2705}", // ✅
};

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
    ? `Nueva reserva de cancha ${ICONS.soccer}

${ICONS.person} Cliente / Equipo: ${name}
${ICONS.phone} Teléfono: ${phone}

${ICONS.calendar} Fecha: ${date}
${ICONS.clock} Hora: ${time}

${ICONS.soccer} Tipo de cancha: ${service}
${ICONS.pin} Cancha: ${barber}${
        needsOpponent
          ? `

${ICONS.search} Estado: Se busca rival`
          : ""
      }`
    : `Nueva cita agendada ${ICONS.barber}

${ICONS.person} Cliente: ${name}
${ICONS.phone} Teléfono: ${phone}

${ICONS.calendar} Fecha: ${date}
${ICONS.clock} Hora: ${time}

${ICONS.scissors} Servicio: ${service}
${ICONS.worker} Barbero: ${barber}`;

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

  const messageText = `Rival encontrado ${ICONS.soccer}

${ICONS.pin} Negocio: ${businessName}

${ICONS.person} Equipo 1: ${teamOneName || "Por definir"}
${ICONS.phone} Teléfono equipo 1: ${teamOnePhone || "Sin teléfono"}

${ICONS.person} Equipo 2: ${opponentName}
${ICONS.phone} Teléfono equipo 2: ${opponentPhone}

${ICONS.calendar} Fecha: ${date}
${ICONS.clock} Hora: ${time}

${ICONS.soccer} Tipo de cancha: ${service}
${ICONS.pin} Cancha: ${barber}

${ICONS.check} Estado: Partido completado`;

  return `https://wa.me/${barberPhone}?text=${encodeURIComponent(messageText)}`;
}