import React, { useEffect, useMemo, useState } from "react";
import {
  createClinicalIndication,
  createClinicalRecord,
  getClinicalIndications,
  getClinicalRecords,
  updateClinicalRecord,
} from "../services/appointmentsService";

const clinicalIndicationTypeLabels = {
  indicaciones: "Indicaciones clinicas",
  insumos: "Insumos y cuidados",
  control: "Control y seguimiento",
  receta_simulada: "Receta simulada",
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const formatClinicalDate = (value) => {
  const date = String(value || "").slice(0, 10);

  if (!date) return "-";

  const [year, month, day] = date.split("-");

  return year && month && day ? `${day}-${month}-${year}` : date;
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const resolveAssetUrl = (value) => {
  const asset = String(value || "").trim();

  if (!asset) return "";

  try {
    return new URL(asset, window.location.origin).toString();
  } catch {
    return asset;
  }
};
const renderPrintableParagraph = (label, value) => {
  const text = String(value || "").trim();

  if (!text) return "";

  return `
    <section class="print-section">
      <h2>${escapeHtml(label)}</h2>
      <p>${escapeHtml(text).replace(/\n/g, "<br />")}</p>
    </section>`;
};

function ClinicalRecordsPanel({
  styles,
  business,
  appointments,
  currentUser,
  isMobile,
}) {
  const professionalOptions = business?.barbers || [];
  const lockedProfessionalName = String(currentUser?.resource_name || "").trim();
  const defaultProfessionalName =
    lockedProfessionalName || professionalOptions[0] || "";
  const theme = business?.theme || {};

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [recordMessage, setRecordMessage] = useState("");
  const [search, setSearch] = useState("");
  const [clinicalIndications, setClinicalIndications] = useState([]);
  const [loadingClinicalIndications, setLoadingClinicalIndications] = useState(false);
  const [savingClinicalIndication, setSavingClinicalIndication] = useState(false);
  const [clinicalIndicationMessage, setClinicalIndicationMessage] = useState("");
  const [clinicalIndicationFormOpen, setClinicalIndicationFormOpen] = useState(false);
  const [indicationDocumentType, setIndicationDocumentType] = useState("indicaciones");
  const [indicationTitle, setIndicationTitle] = useState("Indicaciones clinicas");
  const [indicationIssueDate, setIndicationIssueDate] = useState(getTodayDate);
  const [indicationReason, setIndicationReason] = useState("");
  const [indicationInstructions, setIndicationInstructions] = useState("");
  const [indicationSupplies, setIndicationSupplies] = useState("");
  const [indicationFrequency, setIndicationFrequency] = useState("");
  const [indicationNextControl, setIndicationNextControl] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientRut, setPatientRut] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [professionalName, setProfessionalName] = useState(
    defaultProfessionalName
  );
  const [visitDate, setVisitDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [clinicalBackground, setClinicalBackground] = useState("");
  const [assessment, setAssessment] = useState("");
  const [procedurePerformed, setProcedurePerformed] = useState("");
  const [indications, setIndications] = useState("");
  const [nextSteps, setNextSteps] = useState("");

  const recentAppointments = useMemo(() => {
    return Array.isArray(appointments)
      ? appointments
          .filter((appointment) => appointment?.name && appointment?.phone)
          .slice()
          .sort((first, second) => {
            const firstValue = `${String(first.date || "").slice(0, 10)} ${String(
              first.time || ""
            ).slice(0, 5)}`;
            const secondValue = `${String(second.date || "").slice(
              0,
              10
            )} ${String(second.time || "").slice(0, 5)}`;

            return secondValue.localeCompare(firstValue);
          })
          .slice(0, 30)
      : [];
  }, [appointments]);

  useEffect(() => {
    setProfessionalName(defaultProfessionalName);
  }, [defaultProfessionalName]);

  const textareaStyle = {
    ...styles.input,
    minHeight: "78px",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.45,
    marginBottom: 0,
  };

  const fieldGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: "10px",
  };

  const loadRecords = async () => {
    setLoadingRecords(true);
    setRecordMessage("");

    try {
      const response = await getClinicalRecords({
        search,
      });

      setRecords(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setRecords([]);
      setRecordMessage(
        error.response?.data?.message || "No se pudieron cargar las fichas"
      );
    } finally {
      setLoadingRecords(false);
    }
  };

  const resetClinicalIndicationForm = () => {
    setClinicalIndicationFormOpen(false);
    setClinicalIndicationMessage("");
    setIndicationDocumentType("indicaciones");
    setIndicationTitle("Indicaciones clinicas");
    setIndicationIssueDate(getTodayDate());
    setIndicationReason("");
    setIndicationInstructions("");
    setIndicationSupplies("");
    setIndicationFrequency("");
    setIndicationNextControl("");
  };

  const loadClinicalIndications = async (recordId) => {
    if (!recordId) {
      setClinicalIndications([]);
      return;
    }

    setLoadingClinicalIndications(true);
    setClinicalIndicationMessage("");

    try {
      const response = await getClinicalIndications(recordId);
      setClinicalIndications(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setClinicalIndications([]);
      setClinicalIndicationMessage(
        error.response?.data?.message ||
          "No se pudieron cargar las indicaciones clinicas"
      );
    } finally {
      setLoadingClinicalIndications(false);
    }
  };

  const handleSaveClinicalIndication = async () => {
    if (savingClinicalIndication || !editingRecordId) return;

    if (
      !indicationReason.trim() &&
      !indicationInstructions.trim() &&
      !indicationSupplies.trim() &&
      !indicationFrequency.trim() &&
      !indicationNextControl
    ) {
      setClinicalIndicationMessage(
        "Ingresa al menos una indicacion antes de generar el documento."
      );
      return;
    }

    setSavingClinicalIndication(true);
    setClinicalIndicationMessage("");

    try {
      await createClinicalIndication(editingRecordId, {
        documentType: indicationDocumentType,
        title: indicationTitle,
        issueDate: indicationIssueDate,
        diagnosisOrReason: indicationReason,
        instructions: indicationInstructions,
        supplies: indicationSupplies,
        frequencyDuration: indicationFrequency,
        nextControlDate: indicationNextControl || null,
      });

      resetClinicalIndicationForm();
      await loadClinicalIndications(editingRecordId);
      setClinicalIndicationMessage("Indicacion clinica generada correctamente.");
    } catch (error) {
      console.error(error);
      setClinicalIndicationMessage(
        error.response?.data?.message || "No se pudo generar la indicacion"
      );
    } finally {
      setSavingClinicalIndication(false);
    }
  };

  const openPrintClinicalIndication = (indication) => {
    const printableWindow = window.open("", "_blank", "width=860,height=920");

    if (!printableWindow) {
      setClinicalIndicationMessage(
        "El navegador bloqueo la ventana de impresion. Permite ventanas emergentes e intenta nuevamente."
      );
      return;
    }

    const businessName = business?.name || "AgendaSmart";
    const businessLogo = resolveAssetUrl(business?.logo || business?.image);
    const documentTitle =
      indication.title ||
      clinicalIndicationTypeLabels[indication.document_type] ||
      "Indicaciones clinicas";
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 32px; background: #f8fafc; }
    .sheet { max-width: 780px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 30px; }
    .header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 18px; }
    .brand { display: flex; gap: 14px; align-items: center; }
    .logo { width: 64px; height: 64px; border-radius: 14px; object-fit: contain; border: 1px solid #e5e7eb; }
    h1 { margin: 0; font-size: 26px; }
    .muted { color: #64748b; font-size: 14px; margin-top: 4px; }
    .meta { text-align: right; color: #475569; font-weight: 700; }
    .patient { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 22px 0; }
    .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; background: #f8fafc; }
    .label { color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .value { margin-top: 4px; font-size: 16px; font-weight: 800; }
    .print-section { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px; }
    .print-section h2 { margin: 0 0 8px; font-size: 17px; }
    .print-section p { margin: 0; line-height: 1.55; white-space: normal; }
    .signature { margin-top: 42px; display: flex; justify-content: flex-end; }
    .signature-box { width: 260px; border-top: 1px solid #111827; text-align: center; padding-top: 8px; font-weight: 800; }
    @media print { body { background: #fff; padding: 0; } .sheet { border: 0; border-radius: 0; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="header">
      <div class="brand">
        ${businessLogo ? `<img class="logo" src="${escapeHtml(businessLogo)}" />` : ""}
        <div>
          <h1>${escapeHtml(documentTitle)}</h1>
          <div class="muted">${escapeHtml(businessName)}</div>
        </div>
      </div>
      <div class="meta">
        <div>Fecha: ${escapeHtml(formatClinicalDate(indication.issue_date))}</div>
        <div>Folio: ${escapeHtml(indication.id)}</div>
      </div>
    </header>

    <section class="patient">
      <div class="box"><div class="label">Paciente</div><div class="value">${escapeHtml(indication.patient_name)}</div></div>
      <div class="box"><div class="label">RUT</div><div class="value">${escapeHtml(indication.patient_rut || "No indicado")}</div></div>
      <div class="box"><div class="label">Telefono</div><div class="value">${escapeHtml(indication.patient_phone || "No indicado")}</div></div>
      <div class="box"><div class="label">Correo</div><div class="value">${escapeHtml(indication.patient_email || "No indicado")}</div></div>
      <div class="box"><div class="label">Profesional</div><div class="value">${escapeHtml(indication.professional_name)}</div></div>
      <div class="box"><div class="label">Proximo control</div><div class="value">${escapeHtml(formatClinicalDate(indication.next_control_date))}</div></div>
    </section>

    ${renderPrintableParagraph("Motivo / diagnostico", indication.diagnosis_or_reason)}
    ${renderPrintableParagraph("Indicaciones", indication.instructions)}
    ${renderPrintableParagraph("Insumos / cuidados", indication.supplies)}
    ${renderPrintableParagraph("Frecuencia / duracion", indication.frequency_duration)}

    <footer class="signature">
      <div class="signature-box">${escapeHtml(indication.professional_name)}</div>
    </footer>
  </main>
</body>
</html>`;

    printableWindow.document.open();
    printableWindow.document.write(html);
    printableWindow.document.close();
    printableWindow.focus();
    setTimeout(() => printableWindow.print(), 350);
  };
  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingRecordId(null);
    setSelectedAppointmentId("");
    setPatientName("");
    setPatientPhone("");
    setPatientRut("");
    setPatientEmail("");
    setPatientAge("");
    setPatientAddress("");
    setProfessionalName(defaultProfessionalName);
    setVisitDate(new Date().toISOString().slice(0, 10));
    setChiefComplaint("");
    setClinicalBackground("");
    setAssessment("");
    setProcedurePerformed("");
    setIndications("");
    setNextSteps("");
    setClinicalIndications([]);
    resetClinicalIndicationForm();
  };

  const openRecordModal = () => {
    resetForm();
    setIsRecordFormOpen(true);
    setRecordMessage("");
  };

  const closeRecordModal = () => {
    setIsRecordFormOpen(false);
    resetForm();
  };

  const handleAppointmentSelect = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);

    if (!appointmentId) return;

    const appointment = recentAppointments.find(
      (item) => String(item.id) === String(appointmentId)
    );

    if (!appointment) return;

    setPatientName(appointment.name || "");
    setPatientPhone(appointment.phone || "");
    setPatientRut(appointment.client_rut || "");
    setPatientEmail(appointment.client_email || "");
    setProfessionalName(lockedProfessionalName || appointment.barber || "");
    setVisitDate(String(appointment.date || "").slice(0, 10));
    setChiefComplaint(
      appointment.service ? `Atencion agendada: ${appointment.service}` : ""
    );
  };

  const openExistingRecord = (record) => {
    setEditingRecordId(record.id);
    setSelectedAppointmentId(
      record.appointment_id ? String(record.appointment_id) : ""
    );
    setPatientName(record.patient_name || "");
    setPatientPhone(record.patient_phone || "");
    setPatientRut(record.patient_rut || "");
    setPatientEmail(record.patient_email || "");
    setPatientAge(record.patient_age ? String(record.patient_age) : "");
    setPatientAddress(record.patient_address || "");
    setProfessionalName(
      lockedProfessionalName || record.professional_name || defaultProfessionalName
    );
    setVisitDate(String(record.visit_date || "").slice(0, 10));
    setChiefComplaint(record.chief_complaint || "");
    setClinicalBackground(record.clinical_background || "");
    setAssessment(record.assessment || "");
    setProcedurePerformed(record.procedure_performed || "");
    setIndications(record.indications || "");
    setNextSteps(record.next_steps || "");
    setRecordMessage("");
    resetClinicalIndicationForm();
    void loadClinicalIndications(record.id);
    setIsRecordFormOpen(true);
  };

  const handleSaveRecord = async () => {
    if (savingRecord) return;

    if (!patientName.trim()) {
      setRecordMessage("Ingresa el nombre del paciente.");
      return;
    }

    if (!professionalName.trim()) {
      setRecordMessage("Selecciona la profesional.");
      return;
    }

    if (!visitDate) {
      setRecordMessage("Selecciona la fecha de atencion.");
      return;
    }

    setSavingRecord(true);
    setRecordMessage("");

    try {
      const payload = {
        businessId: business?.id,
        appointmentId: selectedAppointmentId || null,
        patientName,
        patientPhone,
        patientRut,
        patientEmail,
        patientAge: patientAge || null,
        patientAddress,
        professionalName,
        visitDate,
        chiefComplaint,
        clinicalBackground,
        assessment,
        procedurePerformed,
        indications,
        nextSteps,
      };

      if (editingRecordId) {
        await updateClinicalRecord(editingRecordId, payload);
      } else {
        await createClinicalRecord(payload);
      }

      setRecordMessage(
        editingRecordId
          ? "Ficha clinica actualizada correctamente."
          : "Ficha clinica guardada correctamente."
      );
      resetForm();
      setIsRecordFormOpen(false);
      await loadRecords();
    } catch (error) {
      console.error(error);
      setRecordMessage(
        error.response?.data?.message || "No se pudo guardar la ficha clinica"
      );
    } finally {
      setSavingRecord(false);
    }
  };

  const renderRecordDetails = (record) => (
    <details style={{ marginTop: "10px" }}>
      <summary
        style={{
          cursor: "pointer",
          color: theme.primaryDark || "#166534",
          fontWeight: "900",
        }}
      >
        Ver detalle de ficha
      </summary>

      {record.chief_complaint && (
        <p style={{ margin: "10px 0 0", color: "#334155" }}>
          <strong>Motivo:</strong> {record.chief_complaint}
        </p>
      )}

      {record.clinical_background && (
        <p style={{ margin: "8px 0 0", color: "#334155" }}>
          <strong>Antecedentes:</strong> {record.clinical_background}
        </p>
      )}

      {record.assessment && (
        <p style={{ margin: "8px 0 0", color: "#334155" }}>
          <strong>Evaluacion:</strong> {record.assessment}
        </p>
      )}

      {record.procedure_performed && (
        <p style={{ margin: "8px 0 0", color: "#334155" }}>
          <strong>Procedimiento:</strong> {record.procedure_performed}
        </p>
      )}

      {record.indications && (
        <p style={{ margin: "8px 0 0", color: "#334155" }}>
          <strong>Indicaciones:</strong> {record.indications}
        </p>
      )}

      {record.next_steps && (
        <p style={{ margin: "8px 0 0", color: "#334155" }}>
          <strong>Seguimiento:</strong> {record.next_steps}
        </p>
      )}
    </details>
  );

  const recordsHistory = (
    <div>
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "stretch",
          marginBottom: "12px",
        }}
      >
        <input
          style={{ ...styles.input, marginBottom: 0 }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar paciente, telefono, RUT o correo"
        />
        <button
          type="button"
          style={{ ...styles.button, ...styles.secondaryButton }}
          onClick={loadRecords}
          disabled={loadingRecords}
        >
          Buscar
        </button>
      </div>

      <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
        Historial reciente
      </h3>

      {loadingRecords ? (
        <div style={{ color: "#64748b", fontWeight: "800" }}>
          Cargando fichas...
        </div>
      ) : records.length === 0 ? (
        <div
          style={{
            border: "1px dashed #cbd5e1",
            borderRadius: "14px",
            padding: "16px",
            color: "#64748b",
            fontWeight: "800",
            backgroundColor: "#ffffff",
          }}
        >
          Aun no hay fichas registradas.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {records.map((record) => (
            <div
              key={record.id}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "14px",
                boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: "900", color: "#0f172a" }}>
                    {record.patient_name}
                  </div>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "12px",
                      fontWeight: "800",
                      marginTop: "3px",
                    }}
                  >
                    {record.professional_name} -{" "}
                    {String(record.visit_date || "").slice(0, 10)}
                  </div>
                </div>

                {record.patient_phone && (
                  <div
                    style={{
                      color: theme.primaryDark || "#166534",
                      fontWeight: "900",
                      fontSize: "13px",
                    }}
                  >
                    {record.patient_phone}
                  </div>
                )}
              </div>

              {renderRecordDetails(record)}

              <button
                type="button"
                style={{
                  ...styles.button,
                  ...styles.secondaryButton,
                  width: "100%",
                  marginTop: "12px",
                }}
                onClick={() => openExistingRecord(record)}
              >
                Completar ficha
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const clinicalIndicationsSection = editingRecordId ? (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "16px",
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: "17px" }}>
            Indicaciones clinicas
          </h4>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontWeight: 700 }}>
            Documentos emitidos para esta ficha.
          </p>
        </div>

        <button
          type="button"
          style={{
            ...styles.button,
            ...styles.secondaryButton,
            width: isMobile ? "100%" : "auto",
          }}
          onClick={() => setClinicalIndicationFormOpen((value) => !value)}
        >
          {clinicalIndicationFormOpen ? "Ocultar formulario" : "Nueva indicacion"}
        </button>
      </div>

      {clinicalIndicationMessage && (
        <p
          style={{
            ...styles.message,
            marginTop: 0,
            color: clinicalIndicationMessage.includes("correctamente")
              ? theme.primaryDark || "#166534"
              : "#991b1b",
          }}
        >
          {clinicalIndicationMessage}
        </p>
      )}

      {loadingClinicalIndications ? (
        <div style={{ color: "#64748b", fontWeight: "800" }}>
          Cargando indicaciones...
        </div>
      ) : clinicalIndications.length === 0 ? (
        <div
          style={{
            border: "1px dashed #cbd5e1",
            borderRadius: "14px",
            padding: "14px",
            color: "#64748b",
            fontWeight: "800",
            backgroundColor: "#f8fafc",
            marginBottom: clinicalIndicationFormOpen ? "14px" : 0,
          }}
        >
          Aun no hay indicaciones emitidas para esta ficha.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "10px",
            marginBottom: clinicalIndicationFormOpen ? "14px" : 0,
          }}
        >
          {clinicalIndications.map((indication) => (
            <div
              key={indication.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "14px",
                backgroundColor: "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontWeight: "900", color: "#0f172a" }}>
                    {indication.title ||
                      clinicalIndicationTypeLabels[indication.document_type] ||
                      "Indicaciones clinicas"}
                  </div>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "12px",
                      fontWeight: "800",
                      marginTop: "3px",
                    }}
                  >
                    {formatClinicalDate(indication.issue_date)} - {indication.professional_name}
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    width: isMobile ? "100%" : "auto",
                  }}
                  onClick={() => openPrintClinicalIndication(indication)}
                >
                  Imprimir / PDF
                </button>
              </div>

              {indication.instructions && (
                <p style={{ margin: "10px 0 0", color: "#334155" }}>
                  <strong>Indicaciones:</strong> {indication.instructions}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {clinicalIndicationFormOpen && (
        <div
          style={{
            borderTop: "1px solid #e2e8f0",
            paddingTop: "14px",
            display: "grid",
            gap: "10px",
          }}
        >
          <div style={fieldGridStyle}>
            <select
              style={{ ...styles.select, marginBottom: 0 }}
              value={indicationDocumentType}
              onChange={(event) => {
                const value = event.target.value;
                setIndicationDocumentType(value);
                setIndicationTitle(
                  clinicalIndicationTypeLabels[value] || "Indicaciones clinicas"
                );
              }}
            >
              <option value="indicaciones">Indicaciones clinicas</option>
              <option value="insumos">Insumos y cuidados</option>
              <option value="control">Control y seguimiento</option>
              <option value="receta_simulada">Receta simulada</option>
            </select>

            <input
              style={{ ...styles.input, marginBottom: 0 }}
              type="date"
              value={indicationIssueDate}
              onChange={(event) => setIndicationIssueDate(event.target.value)}
            />
          </div>

          <input
            style={{ ...styles.input, marginBottom: 0 }}
            value={indicationTitle}
            onChange={(event) => setIndicationTitle(event.target.value)}
            placeholder="Titulo del documento"
          />

          <textarea
            style={textareaStyle}
            value={indicationReason}
            onChange={(event) => setIndicationReason(event.target.value)}
            placeholder="Motivo, diagnostico o contexto clinico"
          />

          <textarea
            style={{ ...textareaStyle, minHeight: "110px" }}
            value={indicationInstructions}
            onChange={(event) => setIndicationInstructions(event.target.value)}
            placeholder="Indicaciones para el paciente"
          />

          <textarea
            style={textareaStyle}
            value={indicationSupplies}
            onChange={(event) => setIndicationSupplies(event.target.value)}
            placeholder="Insumos, cuidados o materiales recomendados"
          />

          <div style={fieldGridStyle}>
            <input
              style={{ ...styles.input, marginBottom: 0 }}
              value={indicationFrequency}
              onChange={(event) => setIndicationFrequency(event.target.value)}
              placeholder="Frecuencia / duracion"
            />

            <input
              style={{ ...styles.input, marginBottom: 0 }}
              type="date"
              value={indicationNextControl}
              onChange={(event) => setIndicationNextControl(event.target.value)}
            />
          </div>

          <button
            type="button"
            style={{
              ...styles.button,
              ...styles.primaryButton,
              width: "100%",
              ...(savingClinicalIndication ? styles.disabledButton : {}),
            }}
            onClick={handleSaveClinicalIndication}
            disabled={savingClinicalIndication}
          >
            {savingClinicalIndication
              ? "Generando indicacion..."
              : "Generar indicacion clinica"}
          </button>
        </div>
      )}
    </div>
  ) : (
    <div
      style={{
        border: "1px dashed #cbd5e1",
        borderRadius: "16px",
        padding: "14px",
        color: "#64748b",
        backgroundColor: "#f8fafc",
        fontWeight: "800",
      }}
    >
      Guarda o abre una ficha existente para emitir indicaciones clinicas.
    </div>
  );
  const recordForm = (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "16px",
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
      }}
    >
      <h4 style={{ margin: "0 0 12px", fontSize: "17px" }}>
        {editingRecordId ? "Completar ficha" : "Nueva ficha"}
      </h4>

      <div style={{ display: "grid", gap: "10px" }}>
        <select
          style={styles.select}
          value={selectedAppointmentId}
          onChange={(event) => handleAppointmentSelect(event.target.value)}
        >
          <option value="">Vincular reserva reciente (opcional)</option>
          {recentAppointments.map((appointment) => (
            <option key={appointment.id} value={appointment.id}>
              {String(appointment.date || "").slice(0, 10)}{" "}
              {String(appointment.time || "").slice(0, 5)} -{" "}
              {appointment.name} - {appointment.service}
            </option>
          ))}
        </select>

        <div style={fieldGridStyle}>
          <input
            style={{ ...styles.input, marginBottom: 0 }}
            value={patientName}
            onChange={(event) => setPatientName(event.target.value)}
            placeholder="Nombre paciente"
          />
          <input
            style={{ ...styles.input, marginBottom: 0 }}
            value={patientPhone}
            onChange={(event) => setPatientPhone(event.target.value)}
            placeholder="Telefono"
          />
        </div>

        <input
          style={{ ...styles.input, marginBottom: 0 }}
          value={patientEmail}
          onChange={(event) => setPatientEmail(event.target.value)}
          placeholder="Correo paciente"
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 130px",
            gap: "10px",
          }}
        >
          <input
            style={{ ...styles.input, marginBottom: 0 }}
            value={patientRut}
            onChange={(event) => setPatientRut(event.target.value)}
            placeholder="RUT opcional"
          />
          <input
            style={{ ...styles.input, marginBottom: 0 }}
            type="number"
            min="0"
            max="130"
            value={patientAge}
            onChange={(event) => setPatientAge(event.target.value)}
            placeholder="Edad"
          />
        </div>

        <input
          style={{ ...styles.input, marginBottom: 0 }}
          value={patientAddress}
          onChange={(event) => setPatientAddress(event.target.value)}
          placeholder="Direccion opcional"
        />

        <div style={fieldGridStyle}>
          {lockedProfessionalName ? (
            <select
              style={{ ...styles.select, marginBottom: 0 }}
              value={lockedProfessionalName}
              disabled
            >
              <option value={lockedProfessionalName}>
                {lockedProfessionalName}
              </option>
            </select>
          ) : (
            <select
              style={{ ...styles.select, marginBottom: 0 }}
              value={professionalName}
              onChange={(event) => setProfessionalName(event.target.value)}
            >
              <option value="">Selecciona profesional</option>
              {professionalOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          <input
            style={{ ...styles.input, marginBottom: 0 }}
            type="date"
            value={visitDate}
            onChange={(event) => setVisitDate(event.target.value)}
          />
        </div>

        <textarea
          style={textareaStyle}
          value={chiefComplaint}
          onChange={(event) => setChiefComplaint(event.target.value)}
          placeholder="Motivo de consulta"
        />

        <textarea
          style={textareaStyle}
          value={clinicalBackground}
          onChange={(event) => setClinicalBackground(event.target.value)}
          placeholder="Antecedentes relevantes"
        />

        <textarea
          style={textareaStyle}
          value={assessment}
          onChange={(event) => setAssessment(event.target.value)}
          placeholder="Evaluacion / observaciones clinicas"
        />

        <textarea
          style={textareaStyle}
          value={procedurePerformed}
          onChange={(event) => setProcedurePerformed(event.target.value)}
          placeholder="Procedimiento realizado"
        />

        <textarea
          style={textareaStyle}
          value={indications}
          onChange={(event) => setIndications(event.target.value)}
          placeholder="Indicaciones entregadas"
        />

        <textarea
          style={textareaStyle}
          value={nextSteps}
          onChange={(event) => setNextSteps(event.target.value)}
          placeholder="Proxima atencion / seguimiento"
        />

        <button
          type="button"
          style={{
            ...styles.button,
            ...styles.primaryButton,
            width: "100%",
            ...(savingRecord ? styles.disabledButton : {}),
          }}
          onClick={handleSaveRecord}
          disabled={savingRecord}
        >
          {savingRecord
            ? "Guardando ficha..."
            : editingRecordId
            ? "Actualizar ficha clinica"
            : "Guardar ficha clinica"}
        </button>

        {clinicalIndicationsSection}
      </div>
    </div>
  );

  const summaryCards = [
    ["Paciente", patientName || "Sin seleccionar"],
    ["Telefono", patientPhone || "No indicado"],
    ["Correo", patientEmail || "No indicado"],
    ["Profesional", professionalName || "Por definir"],
    ["Fecha", visitDate || "Sin fecha"],
  ];

  return (
    <>
      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div>
            <h2 style={{ ...styles.sectionTitle, marginBottom: "6px" }}>
              Fichas clinicas
            </h2>
            <p style={{ margin: 0, color: "#64748b", lineHeight: 1.45 }}>
              Simulacion inicial sin fotos ni documentos. Guarda evolucion,
              indicaciones y procedimiento asociado a una atencion.
            </p>
          </div>

          <span
            style={{
              backgroundColor: theme.primarySoft || "#f0fdf4",
              color: theme.primaryDark || "#166534",
              border: `1px solid ${theme.border || "#bbf7d0"}`,
              borderRadius: "999px",
              padding: "7px 10px",
              fontSize: "12px",
              fontWeight: "900",
            }}
          >
            Solo texto
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div style={{ color: "#64748b", fontWeight: "800" }}>
            {records.length} ficha{records.length === 1 ? "" : "s"} registrada
            {records.length === 1 ? "" : "s"}
          </div>

          <button
            type="button"
            style={{
              ...styles.button,
              ...styles.primaryButton,
              width: isMobile ? "100%" : "auto",
            }}
            onClick={openRecordModal}
          >
            Nueva ficha clinica
          </button>
        </div>

        {recordMessage && (
          <p
            style={{
              ...styles.message,
              marginTop: 0,
              color: recordMessage.includes("correctamente")
                ? theme.primaryDark || "#166534"
                : "#991b1b",
            }}
          >
            {recordMessage}
          </p>
        )}

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "16px",
            backgroundColor: "#f8fafc",
          }}
        >
          {recordsHistory}
        </div>
      </div>

      {isRecordFormOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "10px" : "24px",
            zIndex: 9999,
          }}
          onClick={closeRecordModal}
        >
          <div
            style={{
              backgroundColor: theme.cardBackground || "#ffffff",
              borderRadius: "18px",
              padding: isMobile ? "16px" : "24px",
              width: "100%",
              maxWidth: "1120px",
              maxHeight: isMobile ? "92vh" : "88vh",
              overflowY: "auto",
              boxShadow: "0 20px 70px rgba(15,23,42,0.28)",
              border: `1px solid ${theme.border || "#d1fae5"}`,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                flexWrap: "wrap",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: isMobile ? "26px" : "30px",
                    color: "#111827",
                  }}
                >
                  Ficha clinica
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "#52616b",
                    fontWeight: "700",
                    lineHeight: 1.35,
                  }}
                >
                  Registro privado de atencion, evolucion e indicaciones.
                </p>
              </div>

              <button
                type="button"
                style={{
                  ...styles.button,
                  ...styles.secondaryButton,
                  minWidth: isMobile ? "100%" : "100px",
                }}
                onClick={closeRecordModal}
              >
                X Cerrar
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              {summaryCards.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "12px",
                      fontWeight: "900",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      color: "#0f172a",
                      fontSize: "18px",
                      fontWeight: "900",
                      marginTop: "4px",
                      wordBreak: "break-word",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {recordMessage && (
              <p
                style={{
                  ...styles.message,
                  marginTop: 0,
                  color: recordMessage.includes("correctamente")
                    ? theme.primaryDark || "#166534"
                    : "#991b1b",
                }}
              >
                {recordMessage}
              </p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
                gap: "18px",
                alignItems: "start",
              }}
            >
              <div>
                <h4 style={{ margin: "0 0 12px", fontSize: "17px" }}>
                  Historial clinico
                </h4>
                {recordsHistory}
              </div>

              {recordForm}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ClinicalRecordsPanel;
