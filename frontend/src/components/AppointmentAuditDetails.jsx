import React from "react";
import { getAppointmentAudit } from "../utils/appointmentAudit";

export default function AppointmentAuditDetails({ appointment }) {
  if (appointment?.business_id !== "giocata") return null;

  const { creator, modifier, modifiedAt } = getAppointmentAudit(appointment);
  return (
    <div
      style={{
        marginBottom: "16px",
        paddingBottom: "12px",
        borderBottom: "1px solid #e5e7eb",
        fontSize: "13px",
        lineHeight: 1.6,
        color: "#475569",
        overflowWrap: "anywhere",
      }}
    >
      <div>
        Creada por: <strong>{creator.label} ({creator.shortLabel})</strong>
        {appointment.created_by_username && (
          <span> · {appointment.created_by_username}</span>
        )}
      </div>
      {modifier && (
        <div>
          Última modificación: <strong>{modifier.label} (M({modifier.shortLabel}))</strong>
          {appointment.updated_by_username && (
            <span> · {appointment.updated_by_username}</span>
          )}
          {modifiedAt && <span> · {modifiedAt}</span>}
        </div>
      )}
    </div>
  );
}
