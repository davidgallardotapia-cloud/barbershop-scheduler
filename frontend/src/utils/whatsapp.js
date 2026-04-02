export function buildBarberWhatsappUrl({
  barberPhone,
  name,
  phone,
  date,
  time,
  service,
  barber,
}) {
  const messageText = `Nueva cita agendada 💈

👤 Cliente: ${name}
📞 Teléfono: ${phone}

📅 Fecha: ${date}
⏰ Hora: ${time}

✂️ Servicio: ${service}
👨‍🔧 Barbero: ${barber}`;

  return `https://wa.me/${barberPhone}?text=${encodeURIComponent(messageText)}`;
}