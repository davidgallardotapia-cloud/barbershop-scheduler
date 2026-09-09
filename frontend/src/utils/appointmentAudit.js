const actors = {
  client: {
    label: "Cliente", shortLabel: "C",
    background: "#f0fdf4", border: "#86efac", color: "#166534",
  },
  admin: {
    label: "Administrador", shortLabel: "A",
    background: "#e0f2fe", border: "#7dd3fc", color: "#075985",
  },
  veronica: {
    label: "Verónica Erler", shortLabel: "V",
    background: "#fffbeb", border: "#fcd34d", color: "#92400e",
  },
};

export const getAppointmentAudit = (appointment) => {
  const enabled = appointment?.business_id === "giocata";
  const fallbackRole =
    appointment?.created_by || appointment?.created_by_admin || appointment?.created_via === "admin"
      ? "admin"
      : "client";
  const creator = actors[enabled ? appointment?.created_by_role : null] || actors[fallbackRole];
  const modifier = enabled ? actors[appointment?.updated_by_role] : null;
  const timestamp = appointment?.last_action_at ? new Date(appointment.last_action_at) : null;
  const modifiedAt = timestamp && !Number.isNaN(timestamp.getTime())
    ? timestamp.toLocaleString("es-CL", {
        timeZone: "America/Santiago",
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  return { creator, modifier, modifiedAt };
};

export const getBookingOriginInfo = (appointment) => {
  const { creator, modifier, modifiedAt } = getAppointmentAudit(appointment);
  const title = `Creada por ${creator.label}`;
  return {
    ...(modifier || creator),
    shortLabel: modifier ? `M(${modifier.shortLabel})` : creator.shortLabel,
    title: modifier
      ? `${title}. Última modificación: ${modifier.label}${modifiedAt ? `, ${modifiedAt}` : ""}`
      : title,
  };
};
