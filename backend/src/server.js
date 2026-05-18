require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./config/database");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const configuredOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  "https://agendasmart.cl",
  "https://www.agendasmart.cl",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  ...configuredOrigins,
];

const securityAlertCooldownMs = Number(
  process.env.SECURITY_ALERT_COOLDOWN_MS || 5 * 60 * 1000
);
const lastSecurityAlertAtByKey = new Map();
const securitySeverityRank = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const getSecuritySeverityRank = (severity) => {
  return securitySeverityRank[String(severity || "").toLowerCase()] || 2;
};

const truncateSecurityValue = (value, maxLength = 300) => {
  const text = String(value || "");

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const sanitizeSecurityDetails = (details = {}) => {
  return Object.entries(details).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") {
      return acc;
    }

    if (/password|token|secret|authorization|cookie/i.test(key)) {
      acc[key] = "[redacted]";
      return acc;
    }

    if (typeof value === "object") {
      acc[key] = sanitizeSecurityDetails(value);
      return acc;
    }

    acc[key] = truncateSecurityValue(value);
    return acc;
  }, {});
};

const getRequestSecurityMeta = (req) => {
  if (!req) return {};

  return sanitizeSecurityDetails({
    ip: req.ip,
    method: req.method,
    path: req.originalUrl || req.url,
    origin: req.get("origin"),
    userAgent: req.get("user-agent"),
  });
};

const shouldSendSecurityEmail = (severity) => {
  if (process.env.SECURITY_ALERT_EMAIL_ENABLED !== "true") {
    return false;
  }

  const minSeverity = process.env.SECURITY_ALERT_EMAIL_MIN_SEVERITY || "high";

  return (
    getSecuritySeverityRank(severity) >= getSecuritySeverityRank(minSeverity)
  );
};

const formatSecurityEmailText = (event) => {
  return [
    `AgendaSmart security alert`,
    ``,
    `Type: ${event.type}`,
    `Severity: ${event.severity}`,
    `Environment: ${event.environment}`,
    `Timestamp: ${event.timestamp}`,
    ``,
    `Details:`,
    JSON.stringify(event.details, null, 2),
  ].join("\n");
};

const sendSecurityAlertEmail = async (event) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.SECURITY_ALERT_EMAIL_FROM;
  const to = (process.env.SECURITY_ALERT_EMAIL_TO || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (!resendApiKey || !from || to.length === 0) {
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `[AgendaSmart] SECURITY_EVENT ${event.severity}: ${event.type}`,
        text: formatSecurityEmailText(event),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `Error enviando email de seguridad (${response.status}): ${text.slice(
          0,
          300
        )}`
      );
    }
  } catch (error) {
    console.error("Error enviando email de seguridad:", error.message);
  }
};

const emitSecurityEvent = async ({
  type,
  severity = "medium",
  req,
  details = {},
  alertKey,
}) => {
  const safeDetails = sanitizeSecurityDetails({
    ...getRequestSecurityMeta(req),
    ...details,
  });
  const event = {
    type,
    severity,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    details: safeDetails,
  };

  console.warn("SECURITY_EVENT", JSON.stringify(event));

  const webhookUrl =
    process.env.SECURITY_ALERTS_ENABLED === "true"
      ? process.env.SECURITY_ALERT_WEBHOOK_URL
      : "";
  const sendEmail = shouldSendSecurityEmail(severity);

  if (!webhookUrl && !sendEmail) {
    return;
  }

  const dedupeKey = alertKey || `${type}:${safeDetails.ip || "unknown"}`;
  const now = Date.now();
  const lastAlertAt = lastSecurityAlertAtByKey.get(dedupeKey) || 0;

  if (now - lastAlertAt < securityAlertCooldownMs) {
    return;
  }

  lastSecurityAlertAtByKey.set(dedupeKey, now);

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `[AgendaSmart] SECURITY_EVENT ${severity}: ${type}`,
          text: `[AgendaSmart] SECURITY_EVENT ${severity}: ${type}`,
          event,
        }),
      });
    } catch (error) {
      console.error("Error enviando alerta de seguridad:", error.message);
    }
  }

  if (sendEmail) {
    await sendSecurityAlertEmail(event);
  }
};

const emitSecurityEventSoon = (event) => {
  void emitSecurityEvent(event);
};

const rateLimitMessage =
  "Demasiadas solicitudes. Intenta nuevamente en unos minutos.";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: rateLimitMessage },
  handler: (req, res) => {
    emitSecurityEventSoon({
      type: "rate_limit_exceeded",
      severity: "medium",
      req,
      details: { limiter: "general" },
    });

    return res.status(429).json({ message: rateLimitMessage });
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos de inicio de sesion. Intenta mas tarde.",
  },
  handler: (req, res) => {
    emitSecurityEventSoon({
      type: "login_rate_limit_exceeded",
      severity: "high",
      req,
      details: { limiter: "login", businessId: req.body?.businessId },
    });

    return res.status(429).json({
      message: "Demasiados intentos de inicio de sesion. Intenta mas tarde.",
    });
  },
});

const publicWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: rateLimitMessage },
  handler: (req, res) => {
    emitSecurityEventSoon({
      type: "public_write_rate_limit_exceeded",
      severity: "high",
      req,
      details: { limiter: "public_write" },
    });

    return res.status(429).json({ message: rateLimitMessage });
  },
});

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requests sin origin, por ejemplo Postman, PowerShell o health checks
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    emitSecurityEventSoon({
      type: "cors_origin_rejected",
      severity: "medium",
      details: { origin },
      alertKey: `cors:${origin}`,
    });

    return callback(new Error("Origen no permitido por CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(generalLimiter);
app.use(express.json({ limit: "25kb" }));

app.use((err, req, res, next) => {
  if (err?.message === "Origen no permitido por CORS") {
    return res.status(403).json({ message: "Origen no permitido" });
  }

  if (err?.type === "entity.too.large") {
    emitSecurityEventSoon({
      type: "request_body_too_large",
      severity: "medium",
      req,
    });

    return res.status(413).json({ message: "Solicitud demasiado grande" });
  }

  if (err instanceof SyntaxError && "body" in err) {
    emitSecurityEventSoon({
      type: "invalid_json_body",
      severity: "low",
      req,
    });

    return res.status(400).json({ message: "JSON invalido" });
  }

  return next(err);
});

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET no está configurado");
  }

  return process.env.JWT_SECRET;
};

const createAuthToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      business_id: user.business_id,
    },
    getJwtSecret(),
    { expiresIn: "12h" }
  );
};

const AUTH_COOKIE_NAME = "authToken";
const AUTH_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const shouldUseSecureCookies = () => {
  return process.env.NODE_ENV === "production" || process.env.RENDER === "true";
};

const getCookieValue = (req, name) => {
  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(name.length + 1);

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getAuthTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return getCookieValue(req, AUTH_COOKIE_NAME);
};

const getAuthCookieOptions = () => {
  const secure = shouldUseSecureCookies();

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: "/",
  };
};

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};

const clearAuthCookie = (res) => {
  const { maxAge, ...cookieOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
};

const mercadoPagoGatewayConfigByBusinessId = {
  "agendasmart-demo": {
    accessTokenEnv: "MERCADOPAGO_ACCESS_TOKEN_AGENDASMART_DEMO",
    webhookSecretEnv: "MERCADOPAGO_WEBHOOK_SECRET_AGENDASMART_DEMO",
    mode: "full",
  },
};

const getMercadoPagoGatewayConfig = (businessId) => {
  const config = mercadoPagoGatewayConfigByBusinessId[businessId];

  if (!config) {
    return null;
  }

  return {
    ...config,
    accessToken: process.env[config.accessTokenEnv],
    webhookSecret: process.env[config.webhookSecretEnv],
  };
};

const shouldRequireMercadoPagoWebhookSignature = () => {
  if (process.env.MERCADOPAGO_REQUIRE_WEBHOOK_SIGNATURE === "true") {
    return true;
  }

  if (process.env.MERCADOPAGO_REQUIRE_WEBHOOK_SIGNATURE === "false") {
    return false;
  }

  return (
    process.env.NODE_ENV === "production" ||
    String(process.env.API_PUBLIC_URL || "").startsWith("https://")
  );
};

const getMercadoPagoWebhookPaymentId = (req) => {
  return (
    req.query?.["data.id"] ||
    req.query?.id ||
    req.body?.data?.id ||
    req.body?.id
  );
};

const parseMercadoPagoSignature = (signatureHeader) => {
  return String(signatureHeader || "")
    .split(",")
    .reduce((acc, part) => {
      const [key, value] = part.split("=");

      if (key && value) {
        acc[key.trim()] = value.trim();
      }

      return acc;
    }, {});
};

const timingSafeEqualHex = (received, expected) => {
  try {
    const receivedBuffer = Buffer.from(String(received || ""), "hex");
    const expectedBuffer = Buffer.from(String(expected || ""), "hex");

    return (
      receivedBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    );
  } catch {
    return false;
  }
};

const isValidMercadoPagoWebhookSignature = ({ req, dataId, secret }) => {
  if (!secret || !dataId) return false;

  const xSignature = req.get("x-signature");
  const xRequestId = req.get("x-request-id");
  const { ts, v1 } = parseMercadoPagoSignature(xSignature);

  if (!xRequestId || !ts || !v1) return false;

  const signatureDataId =
    req.query?.["data.id"] && /^[a-z0-9_-]+$/i.test(String(dataId))
      ? String(dataId).toLowerCase()
      : String(dataId);
  const manifest = `id:${signatureDataId};request-id:${xRequestId};ts:${ts};`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return timingSafeEqualHex(v1, expectedSignature);
};

const isProductionLikeEnvironment = () => {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RENDER === "true" ||
    String(process.env.API_PUBLIC_URL || "").startsWith("https://")
  );
};

const validateStartupSecurityConfig = () => {
  const productionLike = isProductionLikeEnvironment();

  if (!productionLike) {
    return;
  }

  const jwtSecret = process.env.JWT_SECRET || "";

  if (
    !jwtSecret ||
    jwtSecret.length < 32 ||
    /change_me|local_dev|your_/i.test(jwtSecret)
  ) {
    emitSecurityEventSoon({
      type: "startup_insecure_jwt_secret",
      severity: "critical",
      details: {
        configured: Boolean(jwtSecret),
        length: jwtSecret.length,
      },
      alertKey: "startup:jwt_secret",
    });
  }

  const apiPublicUrl = process.env.API_PUBLIC_URL || "";

  if (!apiPublicUrl.startsWith("https://")) {
    emitSecurityEventSoon({
      type: "startup_api_public_url_not_https",
      severity: "high",
      details: {
        configured: Boolean(apiPublicUrl),
      },
      alertKey: "startup:api_public_url",
    });
  }

  if (shouldRequireMercadoPagoWebhookSignature() !== true) {
    emitSecurityEventSoon({
      type: "startup_webhook_signature_not_required",
      severity: "high",
      alertKey: "startup:mp_signature_required",
    });
  }

  Object.keys(mercadoPagoGatewayConfigByBusinessId).forEach((businessId) => {
    const gatewayConfig = getMercadoPagoGatewayConfig(businessId);

    if (!gatewayConfig?.accessToken) {
      return;
    }

    if (String(gatewayConfig.accessToken).startsWith("TEST-")) {
      emitSecurityEventSoon({
        type: "startup_mercadopago_test_token_in_production",
        severity: "high",
        details: { businessId },
        alertKey: `startup:mp_test_token:${businessId}`,
      });
    }

    if (!gatewayConfig.webhookSecret) {
      emitSecurityEventSoon({
        type: "startup_mercadopago_webhook_secret_missing",
        severity: "critical",
        details: { businessId },
        alertKey: `startup:mp_webhook_secret:${businessId}`,
      });
    }
  });
};

const getServicePrice = (serviceName) => {
  const match = String(serviceName || "").match(/\$([\d.]+)/);
  if (!match) return 0;

  return Number(match[1].replace(/\./g, ""));
};

const getPublicApiBaseUrl = (req) => {
  return (
    process.env.API_PUBLIC_URL ||
    `${req.protocol}://${req.get("host")}`.replace(/\/+$/, "")
  );
};

const getSafeReturnUrl = (value) => {
  if (!value) return "https://agendasmart.cl/agendasmart-demo";

  try {
    const url = new URL(value);

    if (allowedOrigins.includes(url.origin)) {
      return url.toString();
    }
  } catch {
    return "https://agendasmart.cl/agendasmart-demo";
  }

  return "https://agendasmart.cl/agendasmart-demo";
};

const requestMercadoPago = async ({ accessToken, path, method = "GET", body }) => {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof data === "string" ? data : data?.message || data?.error || text;
    throw new Error(`Mercado Pago respondio ${response.status}: ${detail}`);
  }

  return data;
};

const upsertMercadoPagoPayment = async ({ payment, businessId, appointmentId }) => {
  const paymentId = String(payment.id || "");
  const status = String(payment.status || "");
  const amount = Number(payment.transaction_amount || 0);

  const transactionResult = await pool.query(
    `UPDATE payment_gateway_transactions
     SET
       provider_payment_id = $1,
       provider_status = $2,
       raw_payload = $3,
       updated_at = NOW()
     WHERE business_id = $4
       AND appointment_id = $5
       AND provider = 'mercadopago'
     RETURNING payment_stage`,
    [paymentId, status, payment, businessId, appointmentId]
  );
  const paymentStage = transactionResult.rows[0]?.payment_stage || "full";

  if (status !== "approved" || amount <= 0) {
    return { status, amount, recorded: false };
  }

  const existingPayment = await pool.query(
    `SELECT id
     FROM appointment_payments
     WHERE provider = 'mercadopago'
       AND provider_payment_id = $1
     LIMIT 1`,
    [paymentId]
  );

  if (existingPayment.rows.length === 0) {
    await pool.query(
      `INSERT INTO appointment_payments (
        appointment_id,
        amount,
        method,
        payment_stage,
        receipt_url,
        notes,
        provider,
        provider_payment_id
      )
      VALUES ($1, $2, 'mercadopago', $3, $4, $5, 'mercadopago', $6)`,
      [
        appointmentId,
        amount,
        paymentStage,
        payment.transaction_details?.external_resource_url || null,
        "Pago online Mercado Pago",
        paymentId,
      ]
    );
  }

  await recalculateAppointmentPaymentStatus(appointmentId);

  return { status, amount, recorded: true };
};

const reconcileMercadoPagoPayment = async ({ paymentId, fallbackBusinessId }) => {
  const businessIds = fallbackBusinessId
    ? [fallbackBusinessId]
    : Object.keys(mercadoPagoGatewayConfigByBusinessId);

  for (const businessId of businessIds) {
    const gatewayConfig = getMercadoPagoGatewayConfig(businessId);

    if (!gatewayConfig?.accessToken) continue;

    try {
      const payment = await requestMercadoPago({
        accessToken: gatewayConfig.accessToken,
        path: `/v1/payments/${paymentId}`,
      });

      const [externalBusinessId, rawAppointmentId] = String(
        payment.external_reference || ""
      ).split(":");
      const appointmentId = Number(rawAppointmentId);

      if (!appointmentId || externalBusinessId !== businessId) {
        continue;
      }

      return upsertMercadoPagoPayment({
        payment,
        businessId,
        appointmentId,
      });
    } catch (error) {
      console.error("No se pudo conciliar pago Mercado Pago:", error.message);
    }
  }

  return { status: "not_found", amount: 0, recorded: false };
};

const syncGoogleSheets = async (payload) => {
  const googleSheetsUrl = process.env.GOOGLE_SHEETS_URL;
  const googleSheetsSecret = process.env.GOOGLE_SHEETS_SECRET;

  if (!googleSheetsUrl) {
    console.warn("GOOGLE_SHEETS_URL no configurado; se omite sincronizacion.");
    return { skipped: true };
  }

  const response = await fetch(googleSheetsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      ...payload,
      secret: googleSheetsSecret || undefined,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Google Sheets respondio ${response.status}: ${text.slice(0, 200)}`
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Google Sheets respondio texto no JSON: ${text.slice(0, 500)}`
    );
  }

  if (data?.result === "error") {
    throw new Error(data.message || "Google Sheets respondio con error");
  }

  return data;
};

const syncGoogleSheetsInBackground = (payload, context) => {
  syncGoogleSheets(payload)
    .then((data) => {
      console.log("Google Sheets sincronizado:", {
        context,
        mode: data?.mode,
        result: data?.result,
        sync_status: data?.sync_status,
      });
    })
    .catch((error) => {
      console.error(`Error sincronizando Google Sheets (${context}):`, error);
    });
};

const formatDateForSheets = (value) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value || "").slice(0, 10);
};

const formatTimeForSheets = (value) => {
  return String(value || "").slice(0, 5);
};

const buildAppointmentSheetsPayload = (appointment) => {
  return {
    id: appointment.id,
    date: formatDateForSheets(appointment.date),
    time: formatTimeForSheets(appointment.time),
    name: appointment.name,
    phone: appointment.phone,
    barber: appointment.barber,
    service: appointment.service,
    status: appointment.status || "reservada",
    businessId: appointment.business_id,
  };
};

const buildPaymentSheetsPayload = ({
  type,
  appointment,
  payment,
  syncStatus,
}) => {
  return {
    type,
    payment_id: payment.id || "",
    appointment_id: appointment.id || "",
    businessId: appointment.business_id || "",
    fecha_reserva: formatDateForSheets(appointment.date),
    hora_reserva: formatTimeForSheets(appointment.time),
    cliente: appointment.name || "",
    recurso: appointment.barber || "",
    servicio: appointment.service || "",
    monto_pago: Number(payment.amount || 0),
    metodo_pago: payment.method || "",
    tipo_pago: payment.payment_stage || "",
    fecha_pago: payment.created_at || new Date(),
    observacion: payment.notes || "",
    sync_status: syncStatus,
  };
};

const requireAuth = (req, res, next) => {
  const token = getAuthTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      message: "Token requerido. Inicia sesión nuevamente.",
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;

    const requestedBusinessId = req.body?.businessId || req.query?.businessId;

    if (
      requestedBusinessId &&
      decoded.business_id &&
      requestedBusinessId !== decoded.business_id
    ) {
      return res.status(403).json({
        message: "No tienes permiso para modificar este negocio",
      });
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado. Inicia sesión nuevamente.",
    });
  }
};

const optionalAuth = (req, res, next) => {
  const token = getAuthTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Token invalido o expirado. Inicia sesion nuevamente.",
    });
  }
};

const normalizeChilePhone = (rawPhone) => {
  const digits = String(rawPhone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("569") && digits.length === 11) {
    return digits;
  }

  if (digits.startsWith("56") && digits.length === 11) {
    return digits;
  }

  if (digits.startsWith("9") && digits.length === 9) {
    return `56${digits}`;
  }

  if (digits.length === 8) {
    return `569${digits}`;
  }

  return digits;
};

const isValidChileMobilePhone = (rawPhone) => {
  const normalized = normalizeChilePhone(rawPhone);
  return /^569\d{8}$/.test(normalized);
};

const parseDateOnly = (dateString) => {
  const [year, month, day] = String(dateString || "")
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isValidDateOnlyString = (value) => {
  const text = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }

  const parsedDate = parseDateOnly(text);

  return Boolean(parsedDate) && formatDateOnly(parsedDate) === text;
};

const getAppointmentDateRange = (query) => {
  const startDate = String(query.startDate || "").trim();
  const endDate = String(query.endDate || "").trim();

  if (startDate && !isValidDateOnlyString(startDate)) {
    return { error: "startDate debe tener formato YYYY-MM-DD" };
  }

  if (endDate && !isValidDateOnlyString(endDate)) {
    return { error: "endDate debe tener formato YYYY-MM-DD" };
  }

  if (startDate && endDate && startDate > endDate) {
    return { error: "startDate no puede ser posterior a endDate" };
  }

  return {
    startDate: startDate || null,
    endDate: endDate || null,
  };
};

const buildAppointmentDateFilter = (businessId, dateRange) => {
  const conditions = ["business_id = $1"];
  const values = [businessId];

  if (dateRange.startDate) {
    values.push(dateRange.startDate);
    conditions.push(`date >= $${values.length}`);
  }

  if (dateRange.endDate) {
    values.push(dateRange.endDate);
    conditions.push(`date <= $${values.length}`);
  }

  return {
    whereClause: conditions.join(" AND "),
    values,
  };
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const addMonthsClamped = (date, months) => {
  const targetMonthIndex = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    targetYear,
    targetMonth + 1,
    0,
    12,
    0,
    0,
    0
  ).getDate();

  const targetDay = Math.min(date.getDate(), lastDayOfTargetMonth);

  return new Date(targetYear, targetMonth, targetDay, 12, 0, 0, 0);
};

const buildMonthlyReservationDates = (startDateString) => {
  const startDate = parseDateOnly(startDateString);

  if (!startDate) {
    return [];
  }

  const endDate = addMonthsClamped(startDate, 1);
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(formatDateOnly(currentDate));
    currentDate = addDays(currentDate, 7);
  }

  return dates;
};

const toPublicAppointment = (appointment) => {
  return {
    id: appointment.id,
    date: appointment.date,
    time: appointment.time,
    service: appointment.service,
    barber: appointment.barber,
    status: appointment.status,
    business_id: appointment.business_id,
    needs_opponent: Boolean(appointment.needs_opponent),
    recurrence_group_id: appointment.recurrence_group_id,
    recurrence_type: appointment.recurrence_type,
    recurrence_index: appointment.recurrence_index,
  };
};


const recalculateAppointmentPaymentStatus = async (appointmentId) => {
  const appointmentResult = await pool.query(
    "SELECT * FROM appointments WHERE id = $1",
    [appointmentId]
  );

  if (appointmentResult.rows.length === 0) {
    return null;
  }

  const appointment = appointmentResult.rows[0];

  const totalsResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_paid
     FROM appointment_payments
     WHERE appointment_id = $1`,
    [appointmentId]
  );

  const totalPaid = Number(totalsResult.rows[0].total_paid || 0);
  const totalAmount = Number(appointment.total_amount || 0);
  const requiredDepositAmount = Number(
    appointment.required_deposit_amount || 0
  );
  const depositRequired = Boolean(appointment.deposit_required);

  let nextPaymentStatus = "unpaid";

  if (depositRequired) {
    if (totalPaid <= 0 || totalPaid < requiredDepositAmount) {
      nextPaymentStatus = "deposit_pending";
    } else if (totalPaid === requiredDepositAmount) {
      nextPaymentStatus = "deposit_paid";
    } else if (totalPaid > requiredDepositAmount && totalPaid < totalAmount) {
      nextPaymentStatus = "partially_paid";
    } else if (totalPaid >= totalAmount && totalAmount > 0) {
      nextPaymentStatus = "paid";
    }
  } else {
    if (totalPaid <= 0) {
      nextPaymentStatus = "unpaid";
    } else if (totalPaid < totalAmount) {
      nextPaymentStatus = "partially_paid";
    } else if (totalPaid >= totalAmount && totalAmount > 0) {
      nextPaymentStatus = "paid";
    }
  }

  await pool.query(
    `UPDATE appointments
     SET payment_status = $1
     WHERE id = $2`,
    [nextPaymentStatus, appointmentId]
  );

  return {
    paymentStatus: nextPaymentStatus,
    totalPaid,
    totalAmount,
  };
};

const seedUserIfConfigured = async ({ username, businessId, passwordEnv }) => {
  const existingUser = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );

  if (existingUser.rows.length > 0) {
    if (!existingUser.rows[0].business_id) {
      await pool.query(
        "UPDATE users SET business_id = $1 WHERE username = $2",
        [businessId, username]
      );
    }

    return;
  }

  const seedPassword = process.env[passwordEnv];

  if (!seedPassword) {
    return;
  }

  if (seedPassword.length < 10) {
    console.warn(
      `No se creo el usuario ${username}: ${passwordEnv} debe tener al menos 10 caracteres.`
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(seedPassword, 12);

  await pool.query(
    "INSERT INTO users (username, password, business_id) VALUES ($1, $2, $3)",
    [username, hashedPassword, businessId]
  );
};

const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        service VARCHAR(100) NOT NULL,
        barber VARCHAR(100) NOT NULL
      );
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'reservada';
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS business_id VARCHAR(100);
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0;
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE;
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS required_deposit_amount NUMERIC(10,2) DEFAULT 0;
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'unpaid';
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS deposit_receipt_url TEXT;
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS needs_opponent BOOLEAN DEFAULT FALSE;
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS opponent_name VARCHAR(100);
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS opponent_phone VARCHAR(30);
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS recurrence_group_id VARCHAR(120);
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(30);
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS recurrence_index INTEGER;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointment_payments (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER NOT NULL,
        amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
        method VARCHAR(30) NOT NULL CHECK (method IN ('transferencia', 'efectivo', 'debito')),
        payment_stage VARCHAR(30) NOT NULL CHECK (payment_stage IN ('deposit', 'balance', 'full')),
        receipt_url TEXT,
        notes TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_appointment_payments_appointment
          FOREIGN KEY (appointment_id)
          REFERENCES appointments(id)
          ON DELETE CASCADE
      );
    `);

    await pool.query(`
      ALTER TABLE appointment_payments
      DROP CONSTRAINT IF EXISTS appointment_payments_method_check;
    `);

    await pool.query(`
      ALTER TABLE appointment_payments
      ADD CONSTRAINT appointment_payments_method_check
      CHECK (method IN ('transferencia', 'efectivo', 'debito', 'mercadopago'));
    `);

    await pool.query(`
      ALTER TABLE appointment_payments
      ADD COLUMN IF NOT EXISTS provider VARCHAR(30);
    `);

    await pool.query(`
      ALTER TABLE appointment_payments
      ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(120);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_gateway_transactions (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER NOT NULL,
        business_id VARCHAR(100) NOT NULL,
        provider VARCHAR(30) NOT NULL,
        provider_preference_id VARCHAR(120),
        provider_payment_id VARCHAR(120),
        provider_status VARCHAR(50),
        amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
        payment_stage VARCHAR(30) NOT NULL CHECK (payment_stage IN ('deposit', 'balance', 'full')),
        checkout_url TEXT,
        raw_payload JSONB,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_payment_gateway_transactions_appointment
          FOREIGN KEY (appointment_id)
          REFERENCES appointments(id)
          ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_business_date_time
      ON appointments (business_id, date, time);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_business_barber_date_time
      ON appointments (business_id, barber, date, time);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_appointment_payments_appointment_id
      ON appointment_payments (appointment_id);
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_payments_provider_payment
      ON appointment_payments (provider, provider_payment_id)
      WHERE provider_payment_id IS NOT NULL;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_gateway_transactions_business_appointment
      ON payment_gateway_transactions (business_id, appointment_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_gateway_transactions_payment_id
      ON payment_gateway_transactions (provider, provider_payment_id);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
      );
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS business_id VARCHAR(100);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        slug VARCHAR(255) UNIQUE
      );
    `);

    await pool.query(`
      INSERT INTO businesses (id, name, slug)
      VALUES ('barberia-james', 'Urban District Barber', 'urban-district-barber')
      ON CONFLICT (id) DO NOTHING;
    `);

    await pool.query(`
      UPDATE businesses
      SET name = 'Urban District Barber', slug = 'urban-district-barber'
      WHERE id = 'barberia-james';
    `);

    await pool.query(`
      INSERT INTO businesses (id, name, slug)
      VALUES ('barberia-junior', 'Barbería Junior', 'barberia-junior')
      ON CONFLICT (id) DO NOTHING;
    `);

    await pool.query(`
      UPDATE businesses
      SET name = 'Barbería Junior', slug = 'barberia-junior'
      WHERE id = 'barberia-junior';
    `);

    await pool.query(`
      INSERT INTO businesses (id, name, slug)
      VALUES ('agendasmart-demo', 'AgendaSmart Demo', 'agendasmart-demo')
      ON CONFLICT (id) DO NOTHING;
    `);

    await pool.query(`
      UPDATE businesses
      SET name = 'AgendaSmart Demo', slug = 'agendasmart-demo'
      WHERE id = 'agendasmart-demo';
    `);

    await pool.query(`
      INSERT INTO businesses (id, name, slug)
      VALUES ('giocata', 'Centro Deportivo La Giocata', 'giocata')
      ON CONFLICT (id) DO NOTHING;
    `);

    await pool.query(`
      UPDATE businesses
      SET name = 'Centro Deportivo La Giocata', slug = 'giocata'
      WHERE id = 'giocata';
    `);

    await pool.query(`
      INSERT INTO businesses (id, name, slug)
      VALUES ('pinguino-club', 'Pingüino Club', 'pinguino-club')
      ON CONFLICT (id) DO NOTHING;
    `);

    await pool.query(`
      UPDATE businesses
      SET name = 'Pingüino Club', slug = 'pinguino-club'
      WHERE id = 'pinguino-club';
    `);

    await seedUserIfConfigured({
      username: "james",
      businessId: "barberia-james",
      passwordEnv: "SEED_PASSWORD_JAMES",
    });

    await seedUserIfConfigured({
      username: "junior",
      businessId: "barberia-junior",
      passwordEnv: "SEED_PASSWORD_JUNIOR",
    });

    await seedUserIfConfigured({
      username: "demo",
      businessId: "agendasmart-demo",
      passwordEnv: "SEED_PASSWORD_DEMO",
    });

    await seedUserIfConfigured({
      username: "giocata",
      businessId: "giocata",
      passwordEnv: "SEED_PASSWORD_GIOCATA",
    });

    await seedUserIfConfigured({
      username: "admin_pinguino",
      businessId: "pinguino-club",
      passwordEnv: "SEED_PASSWORD_PINGUINO",
    });

    console.log("Tablas verificadas/creadas correctamente");
  } catch (error) {
    console.error("Error creando tablas:", error);
  }
};

app.get("/", async (_req, res) => {
  res.json({ ok: true, message: "Backend AgendaSmart operativo" });
});

app.get("/admin/appointments", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({
      message: "Usuario sin negocio asociado",
    });
  }

  try {
    const dateRange = getAppointmentDateRange(req.query);

    if (dateRange.error) {
      return res.status(400).json({ message: dateRange.error });
    }

    const appointmentFilter = buildAppointmentDateFilter(businessId, dateRange);

    const result = await pool.query(
      `SELECT *
       FROM appointments
       WHERE ${appointmentFilter.whereClause}
       ORDER BY date ASC, time ASC`,
      appointmentFilter.values
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener reservas admin",
    });
  }
});

app.get("/appointments", async (req, res) => {
  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ message: "businessId requerido" });
  }

  try {
    const dateRange = getAppointmentDateRange(req.query);

    if (dateRange.error) {
      return res.status(400).json({ message: dateRange.error });
    }

    const appointmentFilter = buildAppointmentDateFilter(businessId, dateRange);

    const result = await pool.query(
      `SELECT
        id,
        date,
        time,
        service,
        barber,
        status,
        business_id,
        needs_opponent,
        recurrence_group_id,
        recurrence_type,
        recurrence_index
       FROM appointments
       WHERE ${appointmentFilter.whereClause}
       ORDER BY date ASC, time ASC`,
      appointmentFilter.values
    );

    return res.json(result.rows.map(toPublicAppointment));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener citas" });
  }
});

app.get("/business/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM businesses WHERE slug = $1 LIMIT 1",
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Negocio no encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener negocio" });
  }
});

app.post("/login", loginLimiter, async (req, res) => {
  const { username, password, businessId } = req.body;

  if (!username || !password) {
    emitSecurityEventSoon({
      type: "login_missing_credentials",
      severity: "low",
      req,
      details: {
        businessId,
        hasUsername: Boolean(username),
        hasPassword: Boolean(password),
      },
    });

    return res.status(400).json({ message: "Faltan credenciales" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 LIMIT 1",
      [username]
    );

    if (result.rows.length === 0) {
      emitSecurityEventSoon({
        type: "login_failed",
        severity: "medium",
        req,
        details: {
          businessId,
          reason: "invalid_credentials",
          usernameProvided: true,
        },
      });

      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      emitSecurityEventSoon({
        type: "login_failed",
        severity: "medium",
        req,
        details: {
          businessId,
          reason: "invalid_credentials",
          usernameProvided: true,
        },
      });

      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    if (businessId && user.business_id && user.business_id !== businessId) {
      emitSecurityEventSoon({
        type: "login_business_mismatch",
        severity: "high",
        req,
        details: {
          requestedBusinessId: businessId,
          userBusinessId: user.business_id,
        },
      });

      return res.status(403).json({
        message: "Este usuario no pertenece a este negocio",
      });
    }

    const token = createAuthToken(user);
    setAuthCookie(res, token);

    return res.json({
      message: "Login correcto",
      user: {
        id: user.id,
        username: user.username,
        business_id: user.business_id,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al iniciar sesión" });
  }
});

app.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ message: "Sesion cerrada" });
});

app.post("/integrations/google-sheets/sync", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const businessId = payload.businessId || req.user?.business_id;

  if (!businessId) {
    return res.status(400).json({ message: "businessId requerido" });
  }

  if (req.user?.business_id && req.user.business_id !== businessId) {
    return res.status(403).json({
      message: "No tienes permiso para sincronizar este negocio",
    });
  }

  try {
    const data = await syncGoogleSheets({
      ...payload,
      businessId,
    });

    return res.json({
      message: "Sincronizado con Google Sheets",
      data,
    });
  } catch (error) {
    console.error("Error sincronizando Google Sheets:", error);
    return res.status(502).json({
      message: "No se pudo sincronizar Google Sheets",
    });
  }
});

app.post("/appointments", publicWriteLimiter, optionalAuth, async (req, res) => {
  const {
    name,
    phone,
    date,
    time,
    service,
    barber,
    businessId,
    status,
    totalAmount,
    depositRequired,
    requiredDepositAmount,
    paymentStatus,
    depositReceiptUrl,
    notes,
    needsOpponent,
    opponentName,
    opponentPhone,
  } = req.body;

  if (!name || !phone || !date || !time || !service || !barber || !businessId) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  const isAdminRequest = Boolean(req.user?.business_id);

  if (isAdminRequest && req.user.business_id !== businessId) {
    return res.status(403).json({
      message: "No tienes permiso para modificar este negocio",
    });
  }

  if (!isValidChileMobilePhone(phone)) {
    return res.status(400).json({
      message: "Ingresa un celular chileno válido",
    });
  }

  if (opponentPhone && !isValidChileMobilePhone(opponentPhone)) {
    return res.status(400).json({
      message: "Ingresa un celular chileno válido para el rival",
    });
  }

  const normalizedPhone = normalizeChilePhone(phone);
  const normalizedOpponentPhone = isAdminRequest && opponentPhone
    ? normalizeChilePhone(opponentPhone)
    : null;
  const finalStatus = isAdminRequest ? status || "reservada" : "reservada";
  const finalTotalAmount = isAdminRequest ? totalAmount || 0 : 0;
  const finalDepositRequired = isAdminRequest
    ? depositRequired ?? false
    : false;
  const finalRequiredDepositAmount = isAdminRequest
    ? requiredDepositAmount || 0
    : 0;
  const finalPaymentStatus = isAdminRequest
    ? paymentStatus || (depositRequired ? "deposit_pending" : "unpaid")
    : "unpaid";
  const finalDepositReceiptUrl = isAdminRequest
    ? depositReceiptUrl || null
    : null;
  const finalNotes = isAdminRequest ? notes || null : null;
  const finalNeedsOpponent = isAdminRequest ? needsOpponent ?? false : false;
  const finalOpponentName = isAdminRequest ? opponentName || null : null;

  try {
    const exists = await pool.query(
      `SELECT * FROM appointments
       WHERE date = $1 AND time = $2 AND barber = $3 AND business_id = $4`,
      [date, time, barber, businessId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        message: "Ese horario ya está reservado para ese recurso",
      });
    }

    const result = await pool.query(
      `INSERT INTO appointments (
        name,
        phone,
        date,
        time,
        service,
        barber,
        business_id,
        status,
        total_amount,
        deposit_required,
        required_deposit_amount,
        payment_status,
        deposit_receipt_url,
        notes,
        needs_opponent,
        opponent_name,
        opponent_phone
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        name,
        normalizedPhone,
        date,
        time,
        service,
        barber,
        businessId,
        finalStatus,
        finalTotalAmount,
        finalDepositRequired,
        finalRequiredDepositAmount,
        finalPaymentStatus,
        finalDepositReceiptUrl,
        finalNotes,
        finalNeedsOpponent,
        finalOpponentName,
        normalizedOpponentPhone,
      ]
    );

    const createdAppointment = result.rows[0];

    if (!isAdminRequest) {
      syncGoogleSheetsInBackground(
        buildAppointmentSheetsPayload(createdAppointment),
        "reserva_publica"
      );
    }

    return res.json({
      message: "Cita creada",
      data: isAdminRequest
        ? createdAppointment
        : toPublicAppointment(createdAppointment),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al crear cita" });
  }
});


app.post("/appointments/monthly", requireAuth, async (req, res) => {
  const {
    name,
    phone,
    date,
    time,
    service,
    barber,
    businessId,
    status,
    totalAmount,
    depositRequired,
    requiredDepositAmount,
    paymentStatus,
    depositReceiptUrl,
    notes,
    needsOpponent,
    opponentName,
    opponentPhone,
  } = req.body;

  if (!name || !phone || !date || !time || !service || !barber || !businessId) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  if (!isValidChileMobilePhone(phone)) {
    return res.status(400).json({
      message: "Ingresa un celular chileno válido",
    });
  }

  if (opponentPhone && !isValidChileMobilePhone(opponentPhone)) {
    return res.status(400).json({
      message: "Ingresa un celular chileno válido para el rival",
    });
  }

  const monthlyDates = buildMonthlyReservationDates(date);

  if (monthlyDates.length === 0) {
    return res.status(400).json({
      message: "Fecha inválida para crear reserva mensual",
    });
  }

  const normalizedPhone = normalizeChilePhone(phone);
  const normalizedOpponentPhone = opponentPhone
    ? normalizeChilePhone(opponentPhone)
    : null;

  const recurringGroupId = `monthly-${businessId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const finalNotes = notes
    ? `${notes} | Reserva mensual`
    : "Reserva mensual";

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const conflicts = await client.query(
      `SELECT
         id,
         name,
         date::text AS date,
         time::text AS time,
         service,
         barber,
         status
       FROM appointments
       WHERE business_id = $1
         AND barber = $2
         AND time = $3
         AND date = ANY($4::date[])
       ORDER BY date ASC, time ASC`,
      [businessId, barber, time, monthlyDates]
    );

    if (conflicts.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "No se pudo crear la reserva mensual. Hay horarios ocupados.",
        conflicts: conflicts.rows,
      });
    }

    const createdAppointments = [];

    for (let index = 0; index < monthlyDates.length; index += 1) {
      const monthlyDate = monthlyDates[index];

      const result = await client.query(
        `INSERT INTO appointments (
          name,
          phone,
          date,
          time,
          service,
          barber,
          business_id,
          status,
          total_amount,
          deposit_required,
          required_deposit_amount,
          payment_status,
          deposit_receipt_url,
          notes,
          needs_opponent,
          opponent_name,
          opponent_phone,
          recurrence_group_id,
          recurrence_type,
          recurrence_index
        )
         VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
         RETURNING *`,
        [
          name,
          normalizedPhone,
          monthlyDate,
          time,
          service,
          barber,
          businessId,
          status || "reservada",
          totalAmount || 0,
          depositRequired ?? false,
          requiredDepositAmount || 0,
          paymentStatus || (depositRequired ? "deposit_pending" : "unpaid"),
          depositReceiptUrl || null,
          finalNotes,
          needsOpponent ?? false,
          opponentName || null,
          normalizedOpponentPhone,
          recurringGroupId,
          "monthly",
          index + 1,
        ]
      );

      createdAppointments.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return res.json({
      message: "Reserva mensual creada correctamente",
      recurrenceGroupId: recurringGroupId,
      totalCreated: createdAppointments.length,
      dates: monthlyDates,
      data: createdAppointments,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    return res.status(500).json({
      message: "Error al crear reserva mensual",
    });
  } finally {
    client.release();
  }
});

app.put("/appointments/:id/opponent", publicWriteLimiter, async (req, res) => {
  const { id } = req.params;
  const { businessId, opponentName, opponentPhone } = req.body;

  if (!businessId || !opponentName || !opponentPhone) {
    return res.status(400).json({
      message: "Faltan datos para sumarse como rival",
    });
  }

  if (!isValidChileMobilePhone(opponentPhone)) {
    return res.status(400).json({
      message: "Ingresa un celular chileno válido para el rival",
    });
  }

  const normalizedOpponentPhone = normalizeChilePhone(opponentPhone);

  try {
    const appointmentResult = await pool.query(
      `SELECT *
       FROM appointments
       WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Reserva no encontrada o no pertenece a este negocio",
      });
    }

    const appointment = appointmentResult.rows[0];

    if (!appointment.needs_opponent) {
      return res.status(400).json({
        message: "Esta reserva no está buscando rival",
      });
    }

    if (appointment.opponent_name || appointment.opponent_phone) {
      return res.status(400).json({
        message: "Este partido ya tiene rival registrado",
      });
    }

    const result = await pool.query(
      `UPDATE appointments
       SET
         needs_opponent = false,
         opponent_name = $1,
         opponent_phone = $2
       WHERE id = $3 AND business_id = $4
       RETURNING *`,
      [opponentName, normalizedOpponentPhone, id, businessId]
    );

    const updatedAppointment = result.rows[0];
    syncGoogleSheetsInBackground(
      buildAppointmentSheetsPayload(updatedAppointment),
      "rival_publico"
    );

    return res.json({
      message: "Rival registrado correctamente",
      data: toPublicAppointment(updatedAppointment),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al registrar rival",
    });
  }
});

app.put("/appointments/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    phone,
    date,
    time,
    service,
    barber,
    businessId,
    status,
    totalAmount,
    depositRequired,
    requiredDepositAmount,
    paymentStatus,
    depositReceiptUrl,
    notes,
    needsOpponent,
    opponentName,
    opponentPhone,
  } = req.body;

  if (!name || !phone || !date || !time || !service || !barber || !businessId) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  if (!isValidChileMobilePhone(phone)) {
    return res.status(400).json({
      message: "Ingresa un celular chileno válido",
    });
  }

  if (opponentPhone && !isValidChileMobilePhone(opponentPhone)) {
    return res.status(400).json({
      message: "Ingresa un celular chileno válido para el rival",
    });
  }

  const normalizedPhone = normalizeChilePhone(phone);
  const normalizedOpponentPhone = opponentPhone
    ? normalizeChilePhone(opponentPhone)
    : null;

  try {
    const exists = await pool.query(
      `SELECT * FROM appointments
       WHERE date = $1 AND time = $2 AND barber = $3 AND id <> $4 AND business_id = $5`,
      [date, time, barber, id, businessId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        message: "Ese horario ya está reservado para ese recurso",
      });
    }

    const result = await pool.query(
      `UPDATE appointments
       SET
         name = $1,
         phone = $2,
         date = $3,
         time = $4,
         service = $5,
         barber = $6,
         business_id = $7,
         status = $8,
         total_amount = $9,
         deposit_required = $10,
         required_deposit_amount = $11,
         payment_status = $12,
         deposit_receipt_url = $13,
         notes = $14,
         needs_opponent = $15,
         opponent_name = $16,
         opponent_phone = $17
       WHERE id = $18 AND business_id = $7
       RETURNING *`,
      [
        name,
        normalizedPhone,
        date,
        time,
        service,
        barber,
        businessId,
        status || "reservada",
        totalAmount || 0,
        depositRequired ?? false,
        requiredDepositAmount || 0,
        paymentStatus || (depositRequired ? "deposit_pending" : "unpaid"),
        depositReceiptUrl || null,
        notes || null,
        needsOpponent ?? false,
        opponentName || null,
        normalizedOpponentPhone,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Cita no encontrada o no pertenece a este negocio",
      });
    }

    return res.json({
      message: "Cita actualizada correctamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al actualizar cita" });
  }
});

console.log("REGISTERING GET /appointments/:id/payments");
console.log("REGISTERING POST /appointments/:id/payments");
console.log("REGISTERING PUT /appointments/:appointmentId/payments/:paymentId");
console.log("REGISTERING DELETE /appointments/:appointmentId/payments/:paymentId");

app.post("/payments/mercadopago/preferences", publicWriteLimiter, async (req, res) => {
  const { appointmentId, businessId, returnUrl } = req.body || {};

  if (!appointmentId || !businessId) {
    return res.status(400).json({
      message: "appointmentId y businessId son requeridos",
    });
  }

  const gatewayConfig = getMercadoPagoGatewayConfig(businessId);

  if (!gatewayConfig) {
    emitSecurityEventSoon({
      type: "mercadopago_preference_business_not_enabled",
      severity: "medium",
      req,
      details: { businessId },
    });

    return res.status(403).json({
      message: "Mercado Pago no esta habilitado para este negocio",
    });
  }

  if (!gatewayConfig.accessToken) {
    emitSecurityEventSoon({
      type: "mercadopago_preference_access_token_missing",
      severity: "high",
      req,
      details: { businessId },
      alertKey: `mp_token_missing:${businessId}`,
    });

    return res.status(503).json({
      message:
        "Mercado Pago esta configurado para este negocio, pero falta el access token en Render",
    });
  }

  try {
    const appointmentResult = await pool.query(
      "SELECT * FROM appointments WHERE id = $1 AND business_id = $2",
      [appointmentId, businessId]
    );

    if (appointmentResult.rows.length === 0) {
      emitSecurityEventSoon({
        type: "mercadopago_preference_appointment_not_found",
        severity: "medium",
        req,
        details: { businessId, appointmentId },
      });

      return res.status(404).json({
        message: "Reserva no encontrada o no pertenece a este negocio",
      });
    }

    const appointment = appointmentResult.rows[0];
    const totalAmount =
      Number(appointment.total_amount || 0) ||
      Number(getServicePrice(appointment.service) || 0);

    if (totalAmount <= 0) {
      emitSecurityEventSoon({
        type: "mercadopago_preference_invalid_amount",
        severity: "medium",
        req,
        details: {
          businessId,
          appointmentId,
          service: appointment.service,
        },
      });

      return res.status(400).json({
        message: "La reserva no tiene un monto valido para pago online",
      });
    }

    const paymentStage = gatewayConfig.mode === "deposit" ? "deposit" : "full";
    const amount =
      paymentStage === "deposit"
        ? Math.round(totalAmount * 0.5)
        : Math.round(totalAmount);

    const apiBaseUrl = getPublicApiBaseUrl(req);
    const usesHttpsPublicUrl = apiBaseUrl.startsWith("https://");
    const notificationUrl = usesHttpsPublicUrl
      ? `${apiBaseUrl}/payments/mercadopago/webhook`
      : undefined;
    const safeReturnUrl = getSafeReturnUrl(returnUrl);
    const returnParams = new URLSearchParams({
      appointmentId: String(appointment.id),
      businessId,
      returnUrl: safeReturnUrl,
    });

    const preference = await requestMercadoPago({
      accessToken: gatewayConfig.accessToken,
      path: "/checkout/preferences",
      method: "POST",
      body: {
        items: [
          {
            title: appointment.service,
            quantity: 1,
            currency_id: "CLP",
            unit_price: amount,
          },
        ],
        payer: {
          name: appointment.name,
        },
        external_reference: `${businessId}:${appointment.id}`,
        metadata: {
          business_id: businessId,
          appointment_id: appointment.id,
          payment_stage: paymentStage,
        },
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        ...(usesHttpsPublicUrl
          ? {
              back_urls: {
                success: `${apiBaseUrl}/payments/mercadopago/return/success?${returnParams.toString()}`,
                failure: `${apiBaseUrl}/payments/mercadopago/return/failure?${returnParams.toString()}`,
                pending: `${apiBaseUrl}/payments/mercadopago/return/pending?${returnParams.toString()}`,
              },
              auto_return: "approved",
            }
          : {}),
      },
    });
    const checkoutUrl = String(gatewayConfig.accessToken || "").startsWith("TEST-")
      ? preference.sandbox_init_point || preference.init_point
      : preference.init_point || preference.sandbox_init_point;

    await pool.query(
      `UPDATE appointments
       SET
         total_amount = $1,
         deposit_required = $2,
         required_deposit_amount = $3,
         payment_status = $4
       WHERE id = $5 AND business_id = $6`,
      [
        totalAmount,
        paymentStage === "deposit",
        paymentStage === "deposit" ? amount : 0,
        paymentStage === "deposit" ? "deposit_pending" : "unpaid",
        appointment.id,
        businessId,
      ]
    );

    await pool.query(
      `INSERT INTO payment_gateway_transactions (
        appointment_id,
        business_id,
        provider,
        provider_preference_id,
        provider_status,
        amount,
        payment_stage,
        checkout_url,
        raw_payload
      )
      VALUES ($1, $2, 'mercadopago', $3, $4, $5, $6, $7, $8)`,
      [
        appointment.id,
        businessId,
        preference.id || null,
        "created",
        amount,
        paymentStage,
        checkoutUrl || null,
        preference,
      ]
    );

    return res.json({
      provider: "mercadopago",
      preferenceId: preference.id,
      checkoutUrl,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      amount,
      paymentStage,
    });
  } catch (error) {
    console.error("Error creando preferencia Mercado Pago:", error);
    emitSecurityEventSoon({
      type: "mercadopago_preference_creation_failed",
      severity: "high",
      req,
      details: {
        businessId,
        appointmentId,
        error: error.message,
      },
    });

    return res.status(500).json({
      message: "Error al iniciar pago con Mercado Pago",
      detail:
        process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

app.get("/payments/mercadopago/return/:result", async (req, res) => {
  const { result } = req.params;
  const {
    appointmentId,
    businessId,
    payment_id: paymentId,
    collection_id: collectionId,
  } = req.query;
  const safeReturnUrl = getSafeReturnUrl(req.query.returnUrl);
  const resolvedPaymentId = paymentId || collectionId;

  if (resolvedPaymentId) {
    await reconcileMercadoPagoPayment({
      paymentId: resolvedPaymentId,
      fallbackBusinessId: businessId,
    });
  }

  const redirectUrl = new URL(safeReturnUrl);
  redirectUrl.searchParams.set("payment_result", result);

  if (appointmentId) {
    redirectUrl.searchParams.set("payment_appointment_id", appointmentId);
  }

  return res.redirect(302, redirectUrl.toString());
});

app.post("/payments/mercadopago/webhook", async (req, res) => {
  const paymentId = getMercadoPagoWebhookPaymentId(req);

  if (!paymentId) {
    emitSecurityEventSoon({
      type: "mercadopago_webhook_without_payment_id",
      severity: "low",
      req,
    });

    return res.status(200).json({ ok: true });
  }

  const gatewayConfigs = Object.keys(mercadoPagoGatewayConfigByBusinessId).map(
    (businessId) => ({
      businessId,
      ...getMercadoPagoGatewayConfig(businessId),
    })
  );
  const configsWithWebhookSecret = gatewayConfigs.filter(
    (config) => Boolean(config.webhookSecret)
  );
  const requiresSignature = shouldRequireMercadoPagoWebhookSignature();

  if (configsWithWebhookSecret.length > 0 || requiresSignature) {
    if (configsWithWebhookSecret.length === 0) {
      console.error(
        "Mercado Pago webhook recibido, pero falta configurar webhook secret"
      );
      emitSecurityEventSoon({
        type: "mercadopago_webhook_secret_missing",
        severity: "critical",
        req,
        details: { paymentId },
        alertKey: "mp_webhook_secret_missing",
      });

      return res.status(503).json({ ok: false });
    }

    const verifiedConfig = configsWithWebhookSecret.find((config) =>
      isValidMercadoPagoWebhookSignature({
        req,
        dataId: paymentId,
        secret: config.webhookSecret,
      })
    );

    if (!verifiedConfig) {
      console.warn("Mercado Pago webhook rechazado por firma invalida");
      emitSecurityEventSoon({
        type: "mercadopago_webhook_invalid_signature",
        severity: "critical",
        req,
        details: { paymentId },
      });

      return res.status(401).json({ ok: false });
    }

    await reconcileMercadoPagoPayment({
      paymentId,
      fallbackBusinessId: verifiedConfig.businessId,
    });

    return res.status(200).json({ ok: true });
  }

  await reconcileMercadoPagoPayment({ paymentId });

  return res.status(200).json({ ok: true });
});

app.post("/appointments/:id/payments", requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    amount,
    method,
    paymentStage,
    receiptUrl,
    notes,
    businessId,
  } = req.body;

  if (!businessId) {
    return res.status(400).json({ message: "businessId requerido" });
  }

  if (amount == null || !method || !paymentStage) {
    return res.status(400).json({
      message: "Faltan campos obligatorios del pago",
    });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({
      message: "El monto del pago debe ser mayor a 0",
    });
  }

  if (!["transferencia", "efectivo", "debito"].includes(method)) {
    return res.status(400).json({
      message: "Método de pago no válido",
    });
  }

  if (!["deposit", "balance", "full"].includes(paymentStage)) {
    return res.status(400).json({
      message: "Etapa de pago no válida",
    });
  }

  try {
    const appointmentResult = await pool.query(
      "SELECT * FROM appointments WHERE id = $1 AND business_id = $2",
      [id, businessId]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Reserva no encontrada o no pertenece a este negocio",
      });
    }

    const appointment = appointmentResult.rows[0];

    const paymentResult = await pool.query(
      `INSERT INTO appointment_payments (
        appointment_id,
        amount,
        method,
        payment_stage,
        receipt_url,
        notes
      )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        amount,
        method,
        paymentStage,
        receiptUrl || null,
        notes || null,
      ]
    );

    const paymentSummary = await recalculateAppointmentPaymentStatus(id);
    const createdPayment = paymentResult.rows[0];

    syncGoogleSheetsInBackground(
      buildPaymentSheetsPayload({
        type: "payment",
        appointment,
        payment: createdPayment,
        syncStatus: "created",
      }),
      "pago_creado"
    );

    return res.json({
      message: "Pago registrado correctamente",
      data: createdPayment,
      paymentStatus: paymentSummary?.paymentStatus,
      totalPaid: paymentSummary?.totalPaid,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al registrar pago" });
  }
});

app.get("/appointments/:id/payments", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ message: "businessId requerido" });
  }

  try {
    const appointmentResult = await pool.query(
      "SELECT * FROM appointments WHERE id = $1 AND business_id = $2",
      [id, businessId]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Reserva no encontrada o no pertenece a este negocio",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM appointment_payments
       WHERE appointment_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener pagos" });
  }
});

app.put("/appointments/:appointmentId/payments/:paymentId", requireAuth, async (req, res) => {
  const { appointmentId, paymentId } = req.params;
  const {
    amount,
    method,
    paymentStage,
    receiptUrl,
    notes,
    businessId,
  } = req.body;

  if (!businessId) {
    return res.status(400).json({ message: "businessId requerido" });
  }

  if (amount == null || !method || !paymentStage) {
    return res.status(400).json({
      message: "Faltan campos obligatorios del pago",
    });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({
      message: "El monto del pago debe ser mayor a 0",
    });
  }

  if (!["transferencia", "efectivo", "debito"].includes(method)) {
    return res.status(400).json({
      message: "Método de pago no válido",
    });
  }

  if (!["deposit", "balance", "full"].includes(paymentStage)) {
    return res.status(400).json({
      message: "Etapa de pago no válida",
    });
  }

  try {
    const appointmentResult = await pool.query(
      "SELECT * FROM appointments WHERE id = $1 AND business_id = $2",
      [appointmentId, businessId]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Reserva no encontrada o no pertenece a este negocio",
      });
    }

    const appointment = appointmentResult.rows[0];

    const paymentExists = await pool.query(
      `SELECT *
       FROM appointment_payments
       WHERE id = $1 AND appointment_id = $2`,
      [paymentId, appointmentId]
    );

    if (paymentExists.rows.length === 0) {
      return res.status(404).json({
        message: "Pago no encontrado para esta reserva",
      });
    }

    const updatedPayment = await pool.query(
      `UPDATE appointment_payments
       SET
         amount = $1,
         method = $2,
         payment_stage = $3,
         receipt_url = $4,
         notes = $5
       WHERE id = $6 AND appointment_id = $7
       RETURNING *`,
      [
        amount,
        method,
        paymentStage,
        receiptUrl || null,
        notes || null,
        paymentId,
        appointmentId,
      ]
    );

    const paymentSummary = await recalculateAppointmentPaymentStatus(
      appointmentId
    );
    const payment = updatedPayment.rows[0];

    syncGoogleSheetsInBackground(
      buildPaymentSheetsPayload({
        type: "payment_update",
        appointment,
        payment,
        syncStatus: "updated",
      }),
      "pago_actualizado"
    );

    return res.json({
      message: "Pago actualizado correctamente",
      data: payment,
      paymentStatus: paymentSummary?.paymentStatus,
      totalPaid: paymentSummary?.totalPaid,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al actualizar pago" });
  }
});

app.delete("/appointments/:appointmentId/payments/:paymentId", requireAuth, async (req, res) => {
  const { appointmentId, paymentId } = req.params;
  const businessId = req.query.businessId || req.body?.businessId;

  if (!businessId) {
    return res.status(400).json({ message: "businessId requerido" });
  }

  try {
    const appointmentResult = await pool.query(
      "SELECT * FROM appointments WHERE id = $1 AND business_id = $2",
      [appointmentId, businessId]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Reserva no encontrada o no pertenece a este negocio",
      });
    }

    const appointment = appointmentResult.rows[0];

    const deletedPayment = await pool.query(
      `DELETE FROM appointment_payments
       WHERE id = $1 AND appointment_id = $2
       RETURNING *`,
      [paymentId, appointmentId]
    );

    if (deletedPayment.rows.length === 0) {
      return res.status(404).json({
        message: "Pago no encontrado para esta reserva",
      });
    }

    const paymentSummary = await recalculateAppointmentPaymentStatus(
      appointmentId
    );
    const payment = deletedPayment.rows[0];

    syncGoogleSheetsInBackground(
      buildPaymentSheetsPayload({
        type: "payment_delete",
        appointment,
        payment,
        syncStatus: "deleted",
      }),
      "pago_eliminado"
    );

    return res.json({
      message: "Pago eliminado correctamente",
      data: payment,
      paymentStatus: paymentSummary?.paymentStatus,
      totalPaid: paymentSummary?.totalPaid,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al eliminar pago" });
  }
});

app.delete("/appointments/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ message: "businessId requerido" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM appointments WHERE id = $1 AND business_id = $2 RETURNING *",
      [id, businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Cita no encontrada o no pertenece a este negocio",
      });
    }

    return res.json({
      message: "Cita eliminada correctamente",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al eliminar cita" });
  }
});

const PORT = process.env.PORT || 10000;

validateStartupSecurityConfig();

createTables().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
});
