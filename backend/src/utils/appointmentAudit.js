const getAppointmentActor = (user, businessId) => {
  if (!user || user.business_id !== businessId) {
    return { role: "client", username: null };
  }

  const username = String(user.username || "").trim();
  return {
    role:
      businessId === "giocata" && username.toLowerCase() === "veronica_giocata"
        ? "veronica"
        : "admin",
    username: username || null,
  };
};

const withAppointmentCreator = (appointment) => {
  const { creator_username, ...result } = appointment;
  if (result.business_id !== "giocata" || result.created_by_role) return result;

  // Older reservations only have the creator's user ID or the admin/client flag.
  const actor = creator_username
    ? getAppointmentActor(
        { username: creator_username, business_id: result.business_id },
        result.business_id
      )
    : {
        role: result.created_by || result.created_via === "admin" ? "admin" : "client",
        username: null,
      };
  return {
    ...result,
    created_by_role: actor.role,
    created_by_username: actor.username,
  };
};

module.exports = { getAppointmentActor, withAppointmentCreator };
