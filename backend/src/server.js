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

const formatSecurityDetailValue = (value) => {
  if (typeof value === "object") {
    return truncateSecurityValue(JSON.stringify(value), 180);
  }

  return truncateSecurityValue(value, 180);
};

const formatSecurityDetailsForDiscord = (details = {}) => {
  const preferredKeys = [
    "ip",
    "method",
    "path",
    "origin",
    "businessId",
    "requestedBusinessId",
    "paymentId",
    "reason",
    "limiter",
    "userAgent",
  ];
  const detailLines = [];
  const renderedKeys = new Set();

  preferredKeys.forEach((key) => {
    if (details[key] === undefined) {
      return;
    }

    renderedKeys.add(key);
    detailLines.push(`- ${key}: ${formatSecurityDetailValue(details[key])}`);
  });

  Object.entries(details).forEach(([key, value]) => {
    if (renderedKeys.has(key)) {
      return;
    }

    detailLines.push(`- ${key}: ${formatSecurityDetailValue(value)}`);
  });

  return detailLines.length > 0 ? detailLines.join("\n") : "- no details";
};

const formatSecurityDiscordContent = (event) => {
  const content = [
    `**[AgendaSmart] SECURITY_EVENT ${event.severity}: ${event.type}**`,
    `Environment: ${event.environment}`,
    `Timestamp: ${event.timestamp}`,
    `Details:`,
    "```text",
    formatSecurityDetailsForDiscord(event.details),
    "```",
  ].join("\n");

  return truncateSecurityValue(content, 1900);
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
      const discordContent = formatSecurityDiscordContent(event);

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: discordContent,
          text: discordContent,
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
      resource_name: user.resource_name || null,
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
    enabled: false,
    accessTokenEnv: "MERCADOPAGO_ACCESS_TOKEN_AGENDASMART_DEMO",
    webhookSecretEnv: "MERCADOPAGO_WEBHOOK_SECRET_AGENDASMART_DEMO",
    mode: "full",
  },
};

const getMercadoPagoGatewayConfig = (businessId, options = {}) => {
  const config = mercadoPagoGatewayConfigByBusinessId[businessId];
  const includeDisabled = Boolean(options.includeDisabled);

  if (!config || (config.enabled === false && !includeDisabled)) {
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

const getServicePrices = (serviceName) => {
  return Array.from(String(serviceName || "").matchAll(/\$([\d.]+)/g))
    .map((match) => Number(match[1].replace(/\./g, "")))
    .filter((price) => Number.isFinite(price) && price > 0);
};

const getServicePrice = (serviceName) => {
  const prices = getServicePrices(serviceName);

  return prices.length > 0 ? prices[prices.length - 1] : 0;
};

const getAppointmentTotalAmount = (appointment) => {
  const servicePrices = getServicePrices(appointment?.service);
  const customServicePrice =
    servicePrices.length > 1 ? servicePrices[servicePrices.length - 1] : 0;
  const storedTotal = Number(appointment?.total_amount || 0);

  if (customServicePrice > 0) {
    return customServicePrice;
  }

  if (storedTotal > 0) {
    return storedTotal;
  }

  return servicePrices.length > 0 ? servicePrices[0] : 0;
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

const professionalSessionBusinessIds = new Set([
  "centro-ama",
  "odontologia-demo",
  "eu-curaciones-avanzadas",
]);

const clinicalRecordsBusinessIds = new Set([
  "centro-ama",
  "odontologia-demo",
  "eu-curaciones-avanzadas",
]);

const supportsProfessionalSessions = (businessId) => {
  return professionalSessionBusinessIds.has(String(businessId || "").trim());
};

const supportsClinicalRecords = (businessId) => {
  return clinicalRecordsBusinessIds.has(String(businessId || "").trim());
};

const getUserResourceName = (user, businessId = "") => {
  const resourceName = String(user?.resource_name || "").trim();

  if (!resourceName) {
    return "";
  }

  if (businessId && !supportsProfessionalSessions(businessId)) {
    return "";
  }

  return resourceName;
};

const userCanAccessResource = (user, resourceName, businessId) => {
  const userResourceName = getUserResourceName(user, businessId);

  if (!userResourceName) {
    return true;
  }

  return userResourceName === String(resourceName || "").trim();
};

const requireUserResourceAccess = (req, res, resourceName, businessId) => {
  if (userCanAccessResource(req.user, resourceName, businessId)) {
    return true;
  }

  res.status(403).json({
    message: "No tienes permiso para gestionar reservas de otra profesional",
  });

  return false;
};

const getScopedAppointmentById = async ({ appointmentId, businessId, user }) => {
  const conditions = ["id = $1", "business_id = $2"];
  const values = [appointmentId, businessId];
  const userResourceName = getUserResourceName(user, businessId);

  if (userResourceName) {
    values.push(userResourceName);
    conditions.push(`barber = $${values.length}`);
  }

  return pool.query(
    `SELECT *
     FROM appointments
     WHERE ${conditions.join(" AND ")}
     LIMIT 1`,
    values
  );
};

const normalizeClinicalText = (value, maxLength = 3000) => {
  const text = String(value || "").trim();

  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const normalizeClinicalDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value || "").slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const normalizeClinicalAge = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const parsedAge = Number(value);

  if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 130) {
    return null;
  }

  return parsedAge;
};

const normalizeEmail = (value) => {
  const email = String(value || "").trim().toLowerCase();

  if (!email) return "";

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};

const createClinicalAuditLog = async ({
  businessId,
  userId,
  action,
  entityType,
  entityId,
  details = {},
}) => {
  try {
    await pool.query(
      `INSERT INTO clinical_audit_logs (
        business_id,
        user_id,
        action,
        entity_type,
        entity_id,
        details
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        businessId,
        userId || null,
        action,
        entityType,
        entityId || null,
        details,
      ]
    );
  } catch (error) {
    console.error("Error registrando auditoria clinica:", error.message);
  }
};

const toPublicClinicalRecord = (record) => ({
  id: record.id,
  business_id: record.business_id,
  patient_id: record.patient_id,
  appointment_id: record.appointment_id,
  professional_name: record.professional_name,
  visit_date: record.visit_date,
  chief_complaint: record.chief_complaint,
  clinical_background: record.clinical_background,
  assessment: record.assessment,
  procedure_performed: record.procedure_performed,
  indications: record.indications,
  next_steps: record.next_steps,
  created_at: record.created_at,
  updated_at: record.updated_at,
  patient_name: record.patient_name,
  patient_phone: record.patient_phone,
  patient_rut: record.patient_rut,
  patient_email: record.patient_email,
  patient_age: record.patient_age,
  patient_address: record.patient_address,
});

const clinicalIndicationTypes = new Set([
  "indicaciones",
  "insumos",
  "control",
  "receta_simulada",
]);

const normalizeClinicalIndicationType = (value) => {
  const type = String(value || "").trim();

  return clinicalIndicationTypes.has(type) ? type : "indicaciones";
};

const toPublicClinicalIndication = (indication) => ({
  id: indication.id,
  business_id: indication.business_id,
  clinical_record_id: indication.clinical_record_id,
  appointment_id: indication.appointment_id,
  patient_id: indication.patient_id,
  professional_name: indication.professional_name,
  issue_date: indication.issue_date,
  document_type: indication.document_type,
  title: indication.title,
  diagnosis_or_reason: indication.diagnosis_or_reason,
  instructions: indication.instructions,
  supplies: indication.supplies,
  frequency_duration: indication.frequency_duration,
  next_control_date: indication.next_control_date,
  status: indication.status,
  created_at: indication.created_at,
  updated_at: indication.updated_at,
  patient_name: indication.patient_name,
  patient_phone: indication.patient_phone,
  patient_rut: indication.patient_rut,
  patient_email: indication.patient_email,
  patient_age: indication.patient_age,
  patient_address: indication.patient_address,
});

const getScopedClinicalRecordById = async ({ recordId, businessId, user }) => {
  const conditions = ["records.id = $1", "records.business_id = $2"];
  const values = [recordId, businessId];
  const userResourceName = getUserResourceName(user, businessId);

  if (userResourceName) {
    values.push(userResourceName);
    conditions.push(`records.professional_name = $${values.length}`);
  }

  return pool.query(
    `SELECT
      records.*,
      patients.full_name AS patient_name,
      patients.phone AS patient_phone,
      patients.rut AS patient_rut,
      patients.email AS patient_email,
      patients.age AS patient_age,
      patients.address AS patient_address
     FROM clinical_records AS records
     INNER JOIN clinical_patients AS patients
       ON patients.id = records.patient_id
     WHERE ${conditions.join(" AND ")}
     LIMIT 1`,
    values
  );
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

const createClinicalDraftForAppointment = async ({
  businessId,
  appointment,
  userId,
}) => {
  if (!supportsClinicalRecords(businessId) || !appointment?.id) {
    return null;
  }

  const patientFields = {
    name: normalizeClinicalText(appointment.name, 160),
    phone:
      normalizeChilePhone(appointment.phone) ||
      normalizeClinicalText(appointment.phone, 30),
    rut: normalizeClinicalText(appointment.client_rut, 30) || null,
    email: normalizeEmail(appointment.client_email) || null,
  };
  const professionalName = normalizeClinicalText(appointment.barber, 100);
  const visitDate = normalizeClinicalDate(appointment.date);

  if (!patientFields.name || !professionalName || !visitDate) {
    return null;
  }

  let patient = null;
  const reusableValues = [businessId];
  const matchConditions = [];

  if (patientFields.rut) {
    reusableValues.push(patientFields.rut);
    matchConditions.push(`LOWER(rut) = LOWER($${reusableValues.length})`);
  }

  if (patientFields.phone) {
    reusableValues.push(patientFields.phone);
    matchConditions.push(`phone = $${reusableValues.length}`);
  }

  if (patientFields.email) {
    reusableValues.push(patientFields.email);
    matchConditions.push(`LOWER(email) = LOWER($${reusableValues.length})`);
  }

  if (matchConditions.length > 0) {
    const patientResult = await pool.query(
      `SELECT *
       FROM clinical_patients
       WHERE business_id = $1
         AND (${matchConditions.join(" OR ")})
       ORDER BY updated_at DESC
       LIMIT 1`,
      reusableValues
    );

    patient = patientResult.rows[0] || null;
  }

  if (patient) {
    const updatedPatient = await pool.query(
      `UPDATE clinical_patients
       SET
         full_name = $1,
         phone = $2,
         rut = COALESCE($3, rut),
         email = COALESCE($4, email),
         updated_at = NOW()
       WHERE id = $5 AND business_id = $6
       RETURNING *`,
      [
        patientFields.name,
        patientFields.phone || null,
        patientFields.rut,
        patientFields.email,
        patient.id,
        businessId,
      ]
    );

    patient = updatedPatient.rows[0];
  } else {
    const createdPatient = await pool.query(
      `INSERT INTO clinical_patients (
        business_id,
        full_name,
        phone,
        rut,
        email,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        businessId,
        patientFields.name,
        patientFields.phone || null,
        patientFields.rut,
        patientFields.email,
        userId || null,
      ]
    );

    patient = createdPatient.rows[0];
  }

  const existingRecord = await pool.query(
    `SELECT *
     FROM clinical_records
     WHERE business_id = $1 AND appointment_id = $2
     LIMIT 1`,
    [businessId, appointment.id]
  );

  if (existingRecord.rows.length > 0) {
    const updatedRecord = await pool.query(
      `UPDATE clinical_records
       SET
         patient_id = $1,
         professional_name = $2,
         visit_date = $3,
         updated_at = NOW()
       WHERE id = $4 AND business_id = $5
       RETURNING *`,
      [
        patient.id,
        professionalName,
        visitDate,
        existingRecord.rows[0].id,
        businessId,
      ]
    );

    return {
      ...updatedRecord.rows[0],
      patient_name: patient.full_name,
      patient_phone: patient.phone,
      patient_rut: patient.rut,
      patient_email: patient.email,
      patient_age: patient.age,
      patient_address: patient.address,
    };
  }

  const recordResult = await pool.query(
    `INSERT INTO clinical_records (
      business_id,
      patient_id,
      appointment_id,
      professional_name,
      visit_date,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      businessId,
      patient.id,
      appointment.id,
      professionalName,
      visitDate,
      userId || null,
    ]
  );
  const record = {
    ...recordResult.rows[0],
    patient_name: patient.full_name,
    patient_phone: patient.phone,
    patient_rut: patient.rut,
    patient_email: patient.email,
    patient_age: patient.age,
    patient_address: patient.address,
  };

  await createClinicalAuditLog({
    businessId,
    userId,
    action: "clinical_record_precreated",
    entityType: "clinical_records",
    entityId: record.id,
    details: {
      patientId: patient.id,
      appointmentId: appointment.id,
      professionalName,
    },
  });

  return record;
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

const getScheduleBlockDateRange = (query) => {
  return getAppointmentDateRange(query);
};

const normalizeDateOnlyValue = (value) => {
  if (value instanceof Date) {
    return formatDateOnly(value);
  }

  return String(value || "").slice(0, 10);
};

const buildAppointmentDateFilter = (businessId, dateRange, options = {}) => {
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

  if (options.resourceName) {
    values.push(options.resourceName);
    conditions.push(`barber = $${values.length}`);
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

const durationAwareBusinessIds = new Set(["odontologia-demo"]);
const durationAwareSlotIntervalMinutes = 15;

const timeToMinutes = (timeValue) => {
  const text = String(timeValue || "").slice(0, 5);
  const [hoursPart, minutesPart = "0"] = text.split(":");
  const parsedHours = Number(hoursPart);
  const parsedMinutes = Number(minutesPart);

  if (
    Number.isNaN(parsedHours) ||
    Number.isNaN(parsedMinutes) ||
    parsedHours < 0 ||
    parsedMinutes < 0
  ) {
    return null;
  }

  return parsedHours * 60 + parsedMinutes;
};

const parseServiceDurationMinutes = (serviceName) => {
  const match = String(serviceName || "").match(/(\d+)\s*min/i);
  return match ? Number(match[1]) : null;
};

const getDurationAwareAppointmentMinutes = (serviceName) => {
  return parseServiceDurationMinutes(serviceName) || durationAwareSlotIntervalMinutes;
};

const getAppointmentDurationMinutesForBusiness = (businessId, serviceName) => {
  return durationAwareBusinessIds.has(businessId)
    ? getDurationAwareAppointmentMinutes(serviceName)
    : 30;
};

const rangesOverlap = (startA, endA, startB, endB) => {
  if ([startA, endA, startB, endB].some((value) => value === null)) {
    return false;
  }

  return startA < endB && startB < endA;
};

const getScheduleBlockTimeRangeMinutes = (block) => {
  if (Boolean(block?.all_day)) {
    return { startMinutes: 0, endMinutes: 24 * 60 };
  }

  return {
    startMinutes: timeToMinutes(block?.start_time),
    endMinutes: timeToMinutes(block?.end_time),
  };
};

const scheduleBlockOverlapsAppointment = ({
  block,
  date,
  startMinutes,
  endMinutes,
}) => {
  const appointmentDate = normalizeDateOnlyValue(date);
  const blockStartDate = normalizeDateOnlyValue(block?.start_date);
  const blockEndDate = normalizeDateOnlyValue(block?.end_date);

  if (
    !appointmentDate ||
    !blockStartDate ||
    !blockEndDate ||
    appointmentDate < blockStartDate ||
    appointmentDate > blockEndDate
  ) {
    return false;
  }

  if (Boolean(block?.all_day)) {
    return true;
  }

  const { startMinutes: blockStartMinutes, endMinutes: blockEndMinutes } =
    getScheduleBlockTimeRangeMinutes(block);

  return rangesOverlap(
    startMinutes,
    endMinutes,
    blockStartMinutes,
    blockEndMinutes
  );
};

const getOverlappingScheduleBlocks = async ({
  businessId,
  barber,
  date,
  time,
  service,
}) => {
  const startMinutes = timeToMinutes(time);
  const durationMinutes = getAppointmentDurationMinutesForBusiness(
    businessId,
    service
  );
  const endMinutes =
    startMinutes === null ? null : startMinutes + durationMinutes;

  if (startMinutes === null || endMinutes === null) {
    return [];
  }

  const result = await pool.query(
    `SELECT *
     FROM schedule_blocks
     WHERE business_id = $1
       AND barber = $2
       AND start_date <= $3
       AND end_date >= $3`,
    [businessId, barber, date]
  );

  return result.rows.filter((block) =>
    scheduleBlockOverlapsAppointment({
      block,
      date,
      startMinutes,
      endMinutes,
    })
  );
};

const appointmentOverlapsScheduleBlock = ({ appointment, block, businessId }) => {
  const appointmentStartMinutes = timeToMinutes(appointment?.time);
  const appointmentEndMinutes =
    appointmentStartMinutes === null
      ? null
      : appointmentStartMinutes +
        getAppointmentDurationMinutesForBusiness(
          businessId,
          appointment?.service
        );

  return scheduleBlockOverlapsAppointment({
    block,
    date: appointment?.date,
    startMinutes: appointmentStartMinutes,
    endMinutes: appointmentEndMinutes,
  });
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
    created_by_admin: Boolean(
      appointment.created_by_admin ||
        appointment.created_by ||
        appointment.created_via === "admin"
    ),
  };
};

const toPublicScheduleBlock = (block, options = {}) => {
  const includeReason = Boolean(options.includeReason);

  return {
    id: block.id,
    business_id: block.business_id,
    barber: block.barber,
    start_date: normalizeDateOnlyValue(block.start_date),
    end_date: normalizeDateOnlyValue(block.end_date),
    start_time: block.start_time ? String(block.start_time).slice(0, 5) : null,
    end_time: block.end_time ? String(block.end_time).slice(0, 5) : null,
    all_day: Boolean(block.all_day),
    ...(includeReason ? { reason: block.reason || "" } : {}),
  };
};

const toPublicWaitlistEntry = (entry) => {
  return {
    id: entry.id,
    business_id: entry.business_id,
    name: entry.name || "",
    phone: entry.phone || "",
    date: normalizeDateOnlyValue(entry.date),
    time: entry.time ? String(entry.time).slice(0, 5) : "",
    service: entry.service || "",
    barber: entry.barber || "",
    status: entry.status || "pendiente",
    notes: entry.notes || "",
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  };
};

const validWaitlistStatuses = new Set([
  "pendiente",
  "contactado",
  "convertido",
  "descartado",
]);


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
  const totalAmount = getAppointmentTotalAmount(appointment);
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

const seedUserIfConfigured = async ({
  username,
  businessId,
  passwordEnv,
  resourceName,
}) => {
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

    if (resourceName && existingUser.rows[0].resource_name !== resourceName) {
      await pool.query(
        "UPDATE users SET resource_name = $1 WHERE username = $2",
        [resourceName, username]
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
    "INSERT INTO users (username, password, business_id, resource_name) VALUES ($1, $2, $3, $4)",
    [username, hashedPassword, businessId, resourceName || null]
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
      ADD COLUMN IF NOT EXISTS client_rut VARCHAR(30);
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS client_email VARCHAR(160);
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
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS created_by INTEGER;
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS created_via VARCHAR(20) NOT NULL DEFAULT 'client'
        CHECK (created_via IN ('client', 'admin'));
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
      CREATE TABLE IF NOT EXISTS schedule_blocks (
        id SERIAL PRIMARY KEY,
        business_id VARCHAR(100) NOT NULL,
        barber VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        all_day BOOLEAN DEFAULT FALSE,
        reason TEXT,
        created_by INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
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
      CREATE INDEX IF NOT EXISTS idx_schedule_blocks_business_barber_dates
      ON schedule_blocks (business_id, barber, start_date, end_date);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist_entries (
        id SERIAL PRIMARY KEY,
        business_id VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        service VARCHAR(160) NOT NULL,
        barber VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pendiente'
          CHECK (status IN ('pendiente', 'contactado', 'convertido', 'descartado')),
        notes TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_entries_business_date
      ON waitlist_entries (business_id, date, time);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_entries_business_status
      ON waitlist_entries (business_id, status);
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
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS resource_name VARCHAR(100);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinical_patients (
        id SERIAL PRIMARY KEY,
        business_id VARCHAR(100) NOT NULL,
        full_name VARCHAR(160) NOT NULL,
        phone VARCHAR(30),
        rut VARCHAR(30),
        email VARCHAR(160),
        age INTEGER CHECK (age IS NULL OR (age >= 0 AND age <= 130)),
        address TEXT,
        created_by INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_clinical_patients_user
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    await pool.query(`
      ALTER TABLE clinical_patients
      ADD COLUMN IF NOT EXISTS email VARCHAR(160);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinical_records (
        id SERIAL PRIMARY KEY,
        business_id VARCHAR(100) NOT NULL,
        patient_id INTEGER NOT NULL,
        appointment_id INTEGER,
        professional_name VARCHAR(100) NOT NULL,
        visit_date DATE NOT NULL,
        chief_complaint TEXT,
        clinical_background TEXT,
        assessment TEXT,
        procedure_performed TEXT,
        indications TEXT,
        next_steps TEXT,
        created_by INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_clinical_records_patient
          FOREIGN KEY (patient_id)
          REFERENCES clinical_patients(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_clinical_records_appointment
          FOREIGN KEY (appointment_id)
          REFERENCES appointments(id)
          ON DELETE SET NULL,
        CONSTRAINT fk_clinical_records_user
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinical_indications (
        id SERIAL PRIMARY KEY,
        business_id VARCHAR(100) NOT NULL,
        clinical_record_id INTEGER NOT NULL,
        appointment_id INTEGER,
        patient_id INTEGER NOT NULL,
        professional_name VARCHAR(100) NOT NULL,
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        document_type VARCHAR(40) NOT NULL DEFAULT 'indicaciones'
          CHECK (document_type IN ('indicaciones', 'insumos', 'control', 'receta_simulada')),
        title VARCHAR(120) NOT NULL DEFAULT 'Indicaciones clinicas',
        diagnosis_or_reason TEXT,
        instructions TEXT,
        supplies TEXT,
        frequency_duration TEXT,
        next_control_date DATE,
        status VARCHAR(30) NOT NULL DEFAULT 'issued'
          CHECK (status IN ('draft', 'issued', 'voided')),
        created_by INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_clinical_indications_record
          FOREIGN KEY (clinical_record_id)
          REFERENCES clinical_records(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_clinical_indications_appointment
          FOREIGN KEY (appointment_id)
          REFERENCES appointments(id)
          ON DELETE SET NULL,
        CONSTRAINT fk_clinical_indications_patient
          FOREIGN KEY (patient_id)
          REFERENCES clinical_patients(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_clinical_indications_user
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinical_audit_logs (
        id SERIAL PRIMARY KEY,
        business_id VARCHAR(100) NOT NULL,
        user_id INTEGER,
        action VARCHAR(80) NOT NULL,
        entity_type VARCHAR(80) NOT NULL,
        entity_id INTEGER,
        details JSONB,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_clinical_audit_logs_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clinical_patients_business_name
      ON clinical_patients (business_id, full_name);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clinical_patients_business_email
      ON clinical_patients (business_id, email);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clinical_records_business_visit
      ON clinical_records (business_id, visit_date DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clinical_records_business_professional
      ON clinical_records (business_id, professional_name, visit_date DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clinical_indications_record_created
      ON clinical_indications (business_id, clinical_record_id, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clinical_indications_professional_date
      ON clinical_indications (business_id, professional_name, issue_date DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clinical_audit_logs_business_created
      ON clinical_audit_logs (business_id, created_at DESC);
    `);

    await pool.query(`
      ALTER TABLE schedule_blocks
      DROP CONSTRAINT IF EXISTS fk_schedule_blocks_user;
    `);

    await pool.query(`
      ALTER TABLE schedule_blocks
      ADD CONSTRAINT fk_schedule_blocks_user
      FOREIGN KEY (created_by)
      REFERENCES users(id)
      ON DELETE SET NULL;
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
      VALUES ('odontologia-demo', 'Clinica Dental Demo', 'odontologia-demo')
      ON CONFLICT (id) DO NOTHING;
    `);

    await pool.query(`
      UPDATE businesses
      SET name = 'Clinica Dental Demo', slug = 'odontologia-demo'
      WHERE id = 'odontologia-demo';
    `);

    await pool.query(`
      INSERT INTO businesses (id, name, slug)
      VALUES ('centro-ama', 'Centro AMA Salud Integral', 'centro-ama')
      ON CONFLICT (id) DO NOTHING;
    `);

    await pool.query(`
      UPDATE businesses
      SET name = 'Centro AMA Salud Integral', slug = 'centro-ama'
      WHERE id = 'centro-ama';
    `);

    await pool.query(`
      INSERT INTO businesses (id, name, slug)
      VALUES ('eu-curaciones-avanzadas', 'Regencura', 'regencura')
      ON CONFLICT (id) DO NOTHING;
    `);

    await pool.query(`
      UPDATE businesses
      SET name = 'Regencura', slug = 'regencura'
      WHERE id = 'eu-curaciones-avanzadas';
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
      username: "odontologia_demo",
      businessId: "odontologia-demo",
      passwordEnv: "SEED_PASSWORD_ODONTOLOGIA_DEMO",
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

    await seedUserIfConfigured({
      username: "admin_centroama",
      businessId: "centro-ama",
      passwordEnv: "SEED_PASSWORD_CENTRO_AMA",
    });

    await seedUserIfConfigured({
      username: "leslie_bustos",
      businessId: "eu-curaciones-avanzadas",
      passwordEnv: "SEED_PASSWORD_CURACIONES_AVANZADAS",
      resourceName: "Leslie Bustos Fernandez",
    });

    await seedUserIfConfigured({
      username: "antonia_centroama",
      businessId: "centro-ama",
      passwordEnv: "SEED_PASSWORD_CENTRO_AMA_ANTONIA",
      resourceName: "Antonia Marin Ardiles",
    });

    await seedUserIfConfigured({
      username: "ignacia_centroama",
      businessId: "centro-ama",
      passwordEnv: "SEED_PASSWORD_CENTRO_AMA_IGNACIA",
      resourceName: "Ignacia Marin Ardiles",
    });

    await seedUserIfConfigured({
      username: "mariajose_centroama",
      businessId: "centro-ama",
      passwordEnv: "SEED_PASSWORD_CENTRO_AMA_MARIAJOSE",
      resourceName: "Maria Jose Rojas",
    });

    console.log("Tablas verificadas/creadas correctamente");
  } catch (error) {
    console.error("Error creando tablas:", error);
  }
};

app.get("/", async (_req, res) => {
  res.json({ ok: true, message: "Backend AgendaSmart operativo" });
});

app.get("/schedule-blocks", async (req, res) => {
  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ message: "businessId requerido" });
  }

  const dateRange = getScheduleBlockDateRange(req.query);

  if (dateRange.error) {
    return res.status(400).json({ message: dateRange.error });
  }

  const conditions = ["business_id = $1"];
  const values = [businessId];

  if (dateRange.startDate) {
    values.push(dateRange.startDate);
    conditions.push(`end_date >= $${values.length}`);
  }

  if (dateRange.endDate) {
    values.push(dateRange.endDate);
    conditions.push(`start_date <= $${values.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT id, business_id, barber, start_date, end_date, start_time, end_time, all_day
       FROM schedule_blocks
       WHERE ${conditions.join(" AND ")}
       ORDER BY start_date ASC, start_time ASC NULLS FIRST, barber ASC`,
      values
    );

    return res.json(result.rows.map((block) => toPublicScheduleBlock(block)));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cargar bloqueos" });
  }
});

app.get("/admin/schedule-blocks", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({ message: "Usuario sin negocio asignado" });
  }

  const dateRange = getScheduleBlockDateRange(req.query);

  if (dateRange.error) {
    return res.status(400).json({ message: dateRange.error });
  }

  const conditions = ["business_id = $1"];
  const values = [businessId];
  const userResourceName = getUserResourceName(req.user, businessId);

  if (dateRange.startDate) {
    values.push(dateRange.startDate);
    conditions.push(`end_date >= $${values.length}`);
  }

  if (dateRange.endDate) {
    values.push(dateRange.endDate);
    conditions.push(`start_date <= $${values.length}`);
  }

  if (userResourceName) {
    values.push(userResourceName);
    conditions.push(`barber = $${values.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM schedule_blocks
       WHERE ${conditions.join(" AND ")}
       ORDER BY start_date ASC, start_time ASC NULLS FIRST, barber ASC`,
      values
    );

    return res.json(
      result.rows.map((block) =>
        toPublicScheduleBlock(block, { includeReason: true })
      )
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cargar bloqueos" });
  }
});

app.post("/schedule-blocks", requireAuth, async (req, res) => {
  const {
    businessId,
    barber,
    startDate,
    endDate,
    startTime,
    endTime,
    allDay,
    reason,
  } = req.body || {};

  if (!businessId || !barber || !startDate) {
    return res.status(400).json({
      message: "businessId, profesional y fecha de inicio son requeridos",
    });
  }

  if (req.user?.business_id && req.user.business_id !== businessId) {
    return res.status(403).json({
      message: "No tienes permiso para modificar este negocio",
    });
  }

  if (!requireUserResourceAccess(req, res, barber, businessId)) {
    return;
  }

  const finalEndDate = endDate || startDate;
  const finalAllDay = Boolean(allDay);

  if (
    !isValidDateOnlyString(startDate) ||
    !isValidDateOnlyString(finalEndDate)
  ) {
    return res.status(400).json({
      message: "Las fechas deben tener formato YYYY-MM-DD",
    });
  }

  if (startDate > finalEndDate) {
    return res.status(400).json({
      message: "La fecha final no puede ser anterior a la fecha inicial",
    });
  }

  let normalizedStartTime = null;
  let normalizedEndTime = null;

  if (!finalAllDay) {
    normalizedStartTime = String(startTime || "").slice(0, 5);
    normalizedEndTime = String(endTime || "").slice(0, 5);

    const startMinutes = timeToMinutes(normalizedStartTime);
    const endMinutes = timeToMinutes(normalizedEndTime);

    if (
      startMinutes === null ||
      endMinutes === null ||
      startMinutes >= endMinutes
    ) {
      return res.status(400).json({
        message: "Indica una hora de inicio y termino valida",
      });
    }
  }

  const candidateBlock = {
    start_date: startDate,
    end_date: finalEndDate,
    start_time: normalizedStartTime,
    end_time: normalizedEndTime,
    all_day: finalAllDay,
  };

  try {
    const existingAppointments = await pool.query(
      `SELECT id, date, time, service, name
       FROM appointments
       WHERE business_id = $1
         AND barber = $2
         AND date >= $3
         AND date <= $4`,
      [businessId, barber, startDate, finalEndDate]
    );

    const conflictingAppointment = existingAppointments.rows.find(
      (appointment) =>
        appointmentOverlapsScheduleBlock({
          appointment,
          block: candidateBlock,
          businessId,
        })
    );

    if (conflictingAppointment) {
      return res.status(400).json({
        message:
          "No se puede bloquear ese tramo porque ya existe una reserva asignada",
      });
    }

    const result = await pool.query(
      `INSERT INTO schedule_blocks (
        business_id,
        barber,
        start_date,
        end_date,
        start_time,
        end_time,
        all_day,
        reason,
        created_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        businessId,
        barber,
        startDate,
        finalEndDate,
        normalizedStartTime,
        normalizedEndTime,
        finalAllDay,
        reason || null,
        req.user?.id || null,
      ]
    );

    return res.status(201).json({
      message: "Bloqueo creado correctamente",
      data: toPublicScheduleBlock(result.rows[0], { includeReason: true }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al crear bloqueo" });
  }
});

app.delete("/schedule-blocks/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ message: "businessId requerido" });
  }

  if (req.user?.business_id && req.user.business_id !== businessId) {
    return res.status(403).json({
      message: "No tienes permiso para modificar este negocio",
    });
  }

  try {
    const values = [id, businessId];
    const conditions = ["id = $1", "business_id = $2"];
    const userResourceName = getUserResourceName(req.user, businessId);

    if (userResourceName) {
      values.push(userResourceName);
      conditions.push(`barber = $${values.length}`);
    }

    const result = await pool.query(
      `DELETE FROM schedule_blocks
       WHERE ${conditions.join(" AND ")}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Bloqueo no encontrado o no pertenece a esta profesional",
      });
    }

    return res.json({
      message: "Bloqueo eliminado correctamente",
      data: toPublicScheduleBlock(result.rows[0], { includeReason: true }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al eliminar bloqueo" });
  }
});

app.get("/admin/client-suggestions", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({ message: "Usuario sin negocio asociado" });
  }

  const rawSearch = String(req.query.search || "").trim();
  const normalizedSearch = rawSearch.toLowerCase();

  if (normalizedSearch.length < 2) {
    return res.json([]);
  }

  const searchDigits = rawSearch.replace(/\D/g, "");
  const values = [businessId, `%${normalizedSearch}%`];
  const conditions = [
    "LOWER(name) LIKE $2",
    "LOWER(COALESCE(client_email, '')) LIKE $2",
    "LOWER(COALESCE(client_rut, '')) LIKE $2",
  ];

  if (searchDigits.length >= 3) {
    values.push(`%${searchDigits}%`);
    conditions.push(
      `REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE $${values.length}`
    );
  }

  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (client_key)
        client_key,
        name,
        phone,
        client_rut,
        client_email,
        last_date,
        last_time,
        reservations_count
       FROM (
        SELECT
          CASE
            WHEN REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') <> ''
              THEN REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g')
            ELSE LOWER(TRIM(name))
          END AS client_key,
          TRIM(name) AS name,
          COALESCE(phone, '') AS phone,
          COALESCE(client_rut, '') AS client_rut,
          COALESCE(client_email, '') AS client_email,
          date AS last_date,
          time AS last_time,
          COUNT(*) OVER (
            PARTITION BY CASE
              WHEN REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') <> ''
                THEN REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g')
              ELSE LOWER(TRIM(name))
            END
          ) AS reservations_count
        FROM appointments
        WHERE business_id = $1
          AND TRIM(COALESCE(name, '')) <> ''
          AND (${conditions.join(" OR ")})
       ) AS clients
       WHERE client_key <> ''
       ORDER BY client_key, last_date DESC, last_time DESC
       LIMIT 8`,
      values
    );

    return res.json(
      result.rows.map((row) => ({
        name: row.name || "",
        phone: row.phone || "",
        clientRut: row.client_rut || "",
        clientEmail: row.client_email || "",
        lastDate: row.last_date || null,
        lastTime: row.last_time || null,
        reservationsCount: Number(row.reservations_count || 0),
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al buscar clientes" });
  }
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

    const appointmentFilter = buildAppointmentDateFilter(businessId, dateRange, {
      resourceName: getUserResourceName(req.user, businessId),
    });

    const result = await pool.query(
      `SELECT
        appointments.*,
        COALESCE(payment_totals.total_paid, 0) AS total_paid,
        COALESCE(payment_totals.transferencia_paid, 0) AS transferencia_paid,
        COALESCE(payment_totals.debito_paid, 0) AS debito_paid,
        COALESCE(payment_totals.efectivo_paid, 0) AS efectivo_paid
       FROM appointments
       LEFT JOIN (
         SELECT
           appointment_id,
           SUM(amount) AS total_paid,
           SUM(CASE WHEN method = 'transferencia' THEN amount ELSE 0 END) AS transferencia_paid,
           SUM(CASE WHEN method = 'debito' THEN amount ELSE 0 END) AS debito_paid,
           SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END) AS efectivo_paid
         FROM appointment_payments
         GROUP BY appointment_id
       ) AS payment_totals ON payment_totals.appointment_id = appointments.id
       WHERE ${appointmentFilter.whereClause}
       ORDER BY appointments.date ASC, appointments.time ASC`,
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

app.get("/admin/waitlist", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({ message: "Usuario sin negocio asociado" });
  }

  const date = String(req.query.date || "").trim();
  const startDate = String(req.query.startDate || "").trim();
  const endDate = String(req.query.endDate || "").trim();
  const status = String(req.query.status || "").trim();
  const conditions = ["business_id = $1"];
  const values = [businessId];

  if (date) {
    values.push(date);
    conditions.push(`date = $${values.length}`);
  } else {
    if (startDate) {
      values.push(startDate);
      conditions.push(`date >= $${values.length}`);
    }

    if (endDate) {
      values.push(endDate);
      conditions.push(`date <= $${values.length}`);
    }
  }

  if (status) {
    if (!validWaitlistStatuses.has(status)) {
      return res.status(400).json({ message: "Estado de lista de espera invalido" });
    }

    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  const userResourceName = getUserResourceName(req.user, businessId);

  if (userResourceName) {
    values.push(userResourceName);
    conditions.push(`barber = $${values.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM waitlist_entries
       WHERE ${conditions.join(" AND ")}
       ORDER BY date ASC, time ASC, created_at ASC`,
      values
    );

    return res.json(result.rows.map(toPublicWaitlistEntry));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener lista de espera" });
  }
});

app.post("/waitlist", requireAuth, async (req, res) => {
  const { name, phone, date, time, service, barber, businessId, notes } = req.body;
  const authenticatedBusinessId = req.user?.business_id;

  if (!authenticatedBusinessId) {
    return res.status(403).json({ message: "Usuario sin negocio asociado" });
  }

  if (!name || !phone || !date || !time || !service || !barber || !businessId) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  if (businessId !== authenticatedBusinessId) {
    return res.status(403).json({ message: "No autorizado para este negocio" });
  }

  const isAdminRequest = Boolean(req.user?.business_id);

  if (isAdminRequest && req.user.business_id !== businessId) {
    return res.status(403).json({ message: "No tienes permiso para modificar este negocio" });
  }

  if (isAdminRequest && !requireUserResourceAccess(req, res, barber, businessId)) {
    return;
  }

  if (!isValidChileMobilePhone(phone)) {
    return res.status(400).json({ message: "Ingresa un celular chileno valido" });
  }

  const normalizedPhone = normalizeChilePhone(phone);

  try {
    const result = await pool.query(
      `INSERT INTO waitlist_entries (
        business_id, name, phone, date, time, service, barber, notes
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        businessId,
        String(name).trim(),
        normalizedPhone,
        date,
        time,
        String(service).trim(),
        String(barber).trim(),
        notes ? String(notes).trim() : null,
      ]
    );

    return res.json({
      message: "Te agregamos a la lista de espera",
      data: toPublicWaitlistEntry(result.rows[0]),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al crear lista de espera" });
  }
});

app.put("/waitlist/:id", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!businessId) {
    return res.status(403).json({ message: "Usuario sin negocio asociado" });
  }

  if (!validWaitlistStatuses.has(String(status || ""))) {
    return res.status(400).json({ message: "Estado de lista de espera invalido" });
  }

  try {
    const existing = await pool.query(
      "SELECT * FROM waitlist_entries WHERE id = $1 AND business_id = $2 LIMIT 1",
      [id, businessId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    if (!requireUserResourceAccess(req, res, existing.rows[0].barber, businessId)) {
      return;
    }

    const result = await pool.query(
      `UPDATE waitlist_entries
       SET status = $1,
           notes = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $3 AND business_id = $4
       RETURNING *`,
      [status, notes === undefined ? null : String(notes || "").trim(), id, businessId]
    );

    return res.json({
      message: "Lista de espera actualizada",
      data: toPublicWaitlistEntry(result.rows[0]),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al actualizar lista de espera" });
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
        recurrence_index,
        (created_by IS NOT NULL OR created_via = 'admin') AS created_by_admin
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
      token,
      user: {
        id: user.id,
        username: user.username,
        business_id: user.business_id,
        resource_name: user.resource_name || null,
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

app.get("/clinical-records", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({ message: "Usuario sin negocio asociado" });
  }

  if (!supportsClinicalRecords(businessId)) {
    return res.status(403).json({
      message: "Las fichas clinicas no estan habilitadas para este negocio",
    });
  }

  const conditions = ["records.business_id = $1"];
  const values = [businessId];
  const userResourceName = getUserResourceName(req.user, businessId);
  const search = normalizeClinicalText(req.query.search, 120);

  if (userResourceName) {
    values.push(userResourceName);
    conditions.push(`records.professional_name = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      patients.full_name ILIKE $${values.length}
      OR COALESCE(patients.phone, '') ILIKE $${values.length}
      OR COALESCE(patients.rut, '') ILIKE $${values.length}
      OR COALESCE(patients.email, '') ILIKE $${values.length}
      OR records.professional_name ILIKE $${values.length}
    )`);
  }

  values.push(Math.min(Number(req.query.limit || 80) || 80, 120));
  const limitPlaceholder = `$${values.length}`;

  try {
    const result = await pool.query(
      `SELECT
        records.*,
        patients.full_name AS patient_name,
        patients.phone AS patient_phone,
        patients.rut AS patient_rut,
        patients.email AS patient_email,
        patients.age AS patient_age,
        patients.address AS patient_address
       FROM clinical_records AS records
       INNER JOIN clinical_patients AS patients
         ON patients.id = records.patient_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY records.visit_date DESC, records.created_at DESC
       LIMIT ${limitPlaceholder}`,
      values
    );

    await createClinicalAuditLog({
      businessId,
      userId: req.user?.id,
      action: "clinical_records_viewed",
      entityType: "clinical_records",
      details: {
        search: search ? "[filtered]" : "",
        count: result.rows.length,
        professionalName: userResourceName || "all",
      },
    });

    return res.json(result.rows.map(toPublicClinicalRecord));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cargar fichas clinicas" });
  }
});

app.post("/clinical-records", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({ message: "Usuario sin negocio asociado" });
  }

  if (!supportsClinicalRecords(businessId)) {
    return res.status(403).json({
      message: "Las fichas clinicas no estan habilitadas para este negocio",
    });
  }

  const {
    patientId,
    patientName,
    patientPhone,
    patientRut,
    patientEmail,
    patientAge,
    patientAddress,
    appointmentId,
    professionalName,
    visitDate,
    chiefComplaint,
    clinicalBackground,
    assessment,
    procedurePerformed,
    indications,
    nextSteps,
  } = req.body || {};
  const userResourceName = getUserResourceName(req.user, businessId);
  const normalizedAppointmentId = appointmentId ? Number(appointmentId) : null;

  let linkedAppointment = null;

  try {
    if (normalizedAppointmentId) {
      const appointmentResult = await getScopedAppointmentById({
        appointmentId: normalizedAppointmentId,
        businessId,
        user: req.user,
      });

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          message: "Reserva no encontrada o no pertenece a este negocio",
        });
      }

      linkedAppointment = appointmentResult.rows[0];
    }

    const resolvedProfessionalName = normalizeClinicalText(
      userResourceName ||
        professionalName ||
        linkedAppointment?.barber ||
        "",
      100
    );
    const resolvedPatientName = normalizeClinicalText(
      patientName || linkedAppointment?.name || "",
      160
    );
    const resolvedPatientPhone =
      normalizeChilePhone(patientPhone || linkedAppointment?.phone || "") ||
      normalizeClinicalText(patientPhone || linkedAppointment?.phone || "", 30);
    const resolvedPatientEmail = normalizeEmail(
      patientEmail || linkedAppointment?.client_email || ""
    );
    const resolvedVisitDate =
      normalizeClinicalDate(visitDate) ||
      normalizeClinicalDate(linkedAppointment?.date) ||
      normalizeClinicalDate(new Date().toISOString());

    if (!resolvedPatientName) {
      return res.status(400).json({ message: "Nombre de paciente requerido" });
    }

    if (!resolvedProfessionalName) {
      return res.status(400).json({ message: "Profesional requerido" });
    }

    if (!userCanAccessResource(req.user, resolvedProfessionalName, businessId)) {
      return res.status(403).json({
        message: "No tienes permiso para crear fichas de otra profesional",
      });
    }

    const patientFields = {
      name: resolvedPatientName,
      phone: resolvedPatientPhone || null,
      rut:
        normalizeClinicalText(patientRut || linkedAppointment?.client_rut, 30) ||
        null,
      email: resolvedPatientEmail || null,
      age: normalizeClinicalAge(patientAge),
      address: normalizeClinicalText(patientAddress, 400) || null,
    };
    let patient = null;
    const normalizedPatientId = patientId ? Number(patientId) : null;

    if (normalizedPatientId) {
      const patientResult = await pool.query(
        `SELECT *
         FROM clinical_patients
         WHERE id = $1 AND business_id = $2
         LIMIT 1`,
        [normalizedPatientId, businessId]
      );

      patient = patientResult.rows[0] || null;
    }

    if (!patient && (patientFields.rut || patientFields.phone || patientFields.email)) {
      const reusableConditions = ["business_id = $1"];
      const reusableValues = [businessId];
      const matchConditions = [];

      if (patientFields.rut) {
        reusableValues.push(patientFields.rut);
        matchConditions.push(`LOWER(rut) = LOWER($${reusableValues.length})`);
      }

      if (patientFields.phone) {
        reusableValues.push(patientFields.phone);
        matchConditions.push(`phone = $${reusableValues.length}`);
      }

      if (patientFields.email) {
        reusableValues.push(patientFields.email);
        matchConditions.push(`LOWER(email) = LOWER($${reusableValues.length})`);
      }

      if (matchConditions.length > 0) {
        const patientResult = await pool.query(
          `SELECT *
           FROM clinical_patients
           WHERE ${reusableConditions.join(" AND ")}
             AND (${matchConditions.join(" OR ")})
           ORDER BY updated_at DESC
           LIMIT 1`,
          reusableValues
        );

        patient = patientResult.rows[0] || null;
      }
    }

    if (patient) {
      const updatedPatient = await pool.query(
        `UPDATE clinical_patients
         SET
           full_name = $1,
           phone = $2,
           rut = $3,
           email = $4,
           age = $5,
           address = $6,
           updated_at = NOW()
         WHERE id = $7 AND business_id = $8
         RETURNING *`,
        [
          patientFields.name,
          patientFields.phone,
          patientFields.rut,
          patientFields.email,
          patientFields.age,
          patientFields.address,
          patient.id,
          businessId,
        ]
      );

      patient = updatedPatient.rows[0];
    } else {
      const createdPatient = await pool.query(
        `INSERT INTO clinical_patients (
          business_id,
          full_name,
          phone,
          rut,
          email,
          age,
          address,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          businessId,
          patientFields.name,
          patientFields.phone,
          patientFields.rut,
          patientFields.email,
          patientFields.age,
          patientFields.address,
          req.user?.id || null,
        ]
      );

      patient = createdPatient.rows[0];
    }

    const recordResult = await pool.query(
      `INSERT INTO clinical_records (
        business_id,
        patient_id,
        appointment_id,
        professional_name,
        visit_date,
        chief_complaint,
        clinical_background,
        assessment,
        procedure_performed,
        indications,
        next_steps,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        businessId,
        patient.id,
        normalizedAppointmentId || null,
        resolvedProfessionalName,
        resolvedVisitDate,
        normalizeClinicalText(chiefComplaint),
        normalizeClinicalText(clinicalBackground),
        normalizeClinicalText(assessment),
        normalizeClinicalText(procedurePerformed),
        normalizeClinicalText(indications),
        normalizeClinicalText(nextSteps),
        req.user?.id || null,
      ]
    );
    const record = {
      ...recordResult.rows[0],
      patient_name: patient.full_name,
      patient_phone: patient.phone,
      patient_rut: patient.rut,
      patient_email: patient.email,
      patient_age: patient.age,
      patient_address: patient.address,
    };

    await createClinicalAuditLog({
      businessId,
      userId: req.user?.id,
      action: "clinical_record_created",
      entityType: "clinical_records",
      entityId: record.id,
      details: {
        patientId: patient.id,
        appointmentId: normalizedAppointmentId || null,
        professionalName: resolvedProfessionalName,
      },
    });

    return res.status(201).json({
      message: "Ficha clinica creada correctamente",
      data: toPublicClinicalRecord(record),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al guardar ficha clinica" });
  }
});

app.put("/clinical-records/:id", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;
  const recordId = Number(req.params.id);

  if (!businessId) {
    return res.status(403).json({ message: "Usuario sin negocio asociado" });
  }

  if (!supportsClinicalRecords(businessId)) {
    return res.status(403).json({
      message: "Las fichas clinicas no estan habilitadas para este negocio",
    });
  }

  if (!Number.isInteger(recordId) || recordId <= 0) {
    return res.status(400).json({ message: "Ficha invalida" });
  }

  const {
    patientName,
    patientPhone,
    patientRut,
    patientEmail,
    patientAge,
    patientAddress,
    appointmentId,
    professionalName,
    visitDate,
    chiefComplaint,
    clinicalBackground,
    assessment,
    procedurePerformed,
    indications,
    nextSteps,
  } = req.body || {};
  const userResourceName = getUserResourceName(req.user, businessId);
  const normalizedAppointmentId =
    appointmentId === "" || appointmentId === null || typeof appointmentId === "undefined"
      ? null
      : Number(appointmentId);

  if (
    normalizedAppointmentId !== null &&
    (!Number.isInteger(normalizedAppointmentId) || normalizedAppointmentId <= 0)
  ) {
    return res.status(400).json({ message: "Reserva invalida" });
  }

  let linkedAppointment = null;

  try {
    const currentRecordResult = await pool.query(
      `SELECT
        records.*,
        patients.full_name AS patient_name,
        patients.phone AS patient_phone,
        patients.rut AS patient_rut,
        patients.email AS patient_email,
        patients.age AS patient_age,
        patients.address AS patient_address
       FROM clinical_records AS records
       INNER JOIN clinical_patients AS patients
         ON patients.id = records.patient_id
       WHERE records.id = $1 AND records.business_id = $2
       LIMIT 1`,
      [recordId, businessId]
    );

    if (currentRecordResult.rows.length === 0) {
      return res.status(404).json({ message: "Ficha no encontrada" });
    }

    const currentRecord = currentRecordResult.rows[0];

    if (
      !userCanAccessResource(
        req.user,
        currentRecord.professional_name,
        businessId
      )
    ) {
      return res.status(403).json({
        message: "No tienes permiso para editar esta ficha",
      });
    }

    if (normalizedAppointmentId) {
      const appointmentResult = await getScopedAppointmentById({
        appointmentId: normalizedAppointmentId,
        businessId,
        user: req.user,
      });

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          message: "Reserva no encontrada o no pertenece a este negocio",
        });
      }

      linkedAppointment = appointmentResult.rows[0];
    }

    const resolvedProfessionalName = normalizeClinicalText(
      userResourceName ||
        professionalName ||
        linkedAppointment?.barber ||
        currentRecord.professional_name,
      100
    );
    const resolvedPatientName = normalizeClinicalText(
      patientName ?? linkedAppointment?.name ?? currentRecord.patient_name,
      160
    );
    const rawPatientPhone =
      patientPhone ?? linkedAppointment?.phone ?? currentRecord.patient_phone;
    const resolvedPatientPhone =
      normalizeChilePhone(rawPatientPhone) ||
      normalizeClinicalText(rawPatientPhone, 30);
    const resolvedPatientEmail = normalizeEmail(
      patientEmail ?? linkedAppointment?.client_email ?? currentRecord.patient_email
    );
    const resolvedPatientRut =
      normalizeClinicalText(
        patientRut ?? linkedAppointment?.client_rut ?? currentRecord.patient_rut,
        30
      ) || null;
    const resolvedPatientAge = normalizeClinicalAge(
      patientAge ?? currentRecord.patient_age
    );
    const resolvedPatientAddress =
      normalizeClinicalText(patientAddress ?? currentRecord.patient_address, 400) ||
      null;
    const resolvedVisitDate =
      normalizeClinicalDate(visitDate) ||
      normalizeClinicalDate(linkedAppointment?.date) ||
      normalizeClinicalDate(currentRecord.visit_date) ||
      normalizeClinicalDate(new Date().toISOString());

    if (!resolvedPatientName) {
      return res.status(400).json({ message: "Nombre de paciente requerido" });
    }

    if (!resolvedProfessionalName) {
      return res.status(400).json({ message: "Profesional requerido" });
    }

    if (!userCanAccessResource(req.user, resolvedProfessionalName, businessId)) {
      return res.status(403).json({
        message: "No tienes permiso para editar fichas de otra profesional",
      });
    }

    const updatedPatient = await pool.query(
      `UPDATE clinical_patients
       SET
         full_name = $1,
         phone = $2,
         rut = $3,
         email = $4,
         age = $5,
         address = $6,
         updated_at = NOW()
       WHERE id = $7 AND business_id = $8
       RETURNING *`,
      [
        resolvedPatientName,
        resolvedPatientPhone || null,
        resolvedPatientRut,
        resolvedPatientEmail || null,
        resolvedPatientAge,
        resolvedPatientAddress,
        currentRecord.patient_id,
        businessId,
      ]
    );

    const patient = updatedPatient.rows[0];
    const updatedRecord = await pool.query(
      `UPDATE clinical_records
       SET
         appointment_id = $1,
         professional_name = $2,
         visit_date = $3,
         chief_complaint = $4,
         clinical_background = $5,
         assessment = $6,
         procedure_performed = $7,
         indications = $8,
         next_steps = $9,
         updated_at = NOW()
       WHERE id = $10 AND business_id = $11
       RETURNING *`,
      [
        normalizedAppointmentId || currentRecord.appointment_id || null,
        resolvedProfessionalName,
        resolvedVisitDate,
        normalizeClinicalText(chiefComplaint),
        normalizeClinicalText(clinicalBackground),
        normalizeClinicalText(assessment),
        normalizeClinicalText(procedurePerformed),
        normalizeClinicalText(indications),
        normalizeClinicalText(nextSteps),
        recordId,
        businessId,
      ]
    );
    const record = {
      ...updatedRecord.rows[0],
      patient_name: patient.full_name,
      patient_phone: patient.phone,
      patient_rut: patient.rut,
      patient_email: patient.email,
      patient_age: patient.age,
      patient_address: patient.address,
    };

    await createClinicalAuditLog({
      businessId,
      userId: req.user?.id,
      action: "clinical_record_updated",
      entityType: "clinical_records",
      entityId: record.id,
      details: {
        patientId: patient.id,
        appointmentId: record.appointment_id || null,
        professionalName: resolvedProfessionalName,
      },
    });

    return res.json({
      message: "Ficha clinica actualizada correctamente",
      data: toPublicClinicalRecord(record),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al actualizar ficha clinica" });
  }
});

app.get("/clinical-records/:id/indications", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;
  const recordId = Number(req.params.id);

  if (!businessId) {
    return res.status(403).json({ message: "Usuario sin negocio asociado" });
  }

  if (!supportsClinicalRecords(businessId)) {
    return res.status(403).json({
      message: "Las fichas clinicas no estan habilitadas para este negocio",
    });
  }

  if (!Number.isInteger(recordId) || recordId <= 0) {
    return res.status(400).json({ message: "Ficha invalida" });
  }

  try {
    const recordResult = await getScopedClinicalRecordById({
      recordId,
      businessId,
      user: req.user,
    });

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ message: "Ficha no encontrada" });
    }

    const record = recordResult.rows[0];
    const result = await pool.query(
      `SELECT
        indications.*,
        patients.full_name AS patient_name,
        patients.phone AS patient_phone,
        patients.rut AS patient_rut,
        patients.email AS patient_email,
        patients.age AS patient_age,
        patients.address AS patient_address
       FROM clinical_indications AS indications
       INNER JOIN clinical_patients AS patients
         ON patients.id = indications.patient_id
       WHERE indications.business_id = $1
         AND indications.clinical_record_id = $2
       ORDER BY indications.issue_date DESC, indications.created_at DESC`,
      [businessId, record.id]
    );

    await createClinicalAuditLog({
      businessId,
      userId: req.user?.id,
      action: "clinical_indications_viewed",
      entityType: "clinical_indications",
      entityId: record.id,
      details: {
        clinicalRecordId: record.id,
        count: result.rows.length,
      },
    });

    return res.json(result.rows.map(toPublicClinicalIndication));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al cargar indicaciones clinicas",
    });
  }
});

app.post("/clinical-records/:id/indications", requireAuth, async (req, res) => {
  const businessId = req.user?.business_id;
  const recordId = Number(req.params.id);

  if (!businessId) {
    return res.status(403).json({ message: "Usuario sin negocio asociado" });
  }

  if (!supportsClinicalRecords(businessId)) {
    return res.status(403).json({
      message: "Las fichas clinicas no estan habilitadas para este negocio",
    });
  }

  if (!Number.isInteger(recordId) || recordId <= 0) {
    return res.status(400).json({ message: "Ficha invalida" });
  }

  const {
    documentType,
    title,
    issueDate,
    diagnosisOrReason,
    instructions,
    supplies,
    frequencyDuration,
    nextControlDate,
  } = req.body || {};

  try {
    const recordResult = await getScopedClinicalRecordById({
      recordId,
      businessId,
      user: req.user,
    });

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ message: "Ficha no encontrada" });
    }

    const record = recordResult.rows[0];
    const normalizedTitle =
      normalizeClinicalText(title, 120) || "Indicaciones clinicas";
    const normalizedDiagnosis = normalizeClinicalText(diagnosisOrReason);
    const normalizedInstructions = normalizeClinicalText(instructions);
    const normalizedSupplies = normalizeClinicalText(supplies);
    const normalizedFrequency = normalizeClinicalText(frequencyDuration, 500);
    const normalizedNextControlDate = normalizeClinicalDate(nextControlDate);
    const normalizedIssueDate =
      normalizeClinicalDate(issueDate) || normalizeClinicalDate(new Date());

    if (
      !normalizedDiagnosis &&
      !normalizedInstructions &&
      !normalizedSupplies &&
      !normalizedFrequency &&
      !normalizedNextControlDate
    ) {
      return res.status(400).json({
        message: "Ingresa al menos una indicacion clinica",
      });
    }

    const indicationResult = await pool.query(
      `INSERT INTO clinical_indications (
        business_id,
        clinical_record_id,
        appointment_id,
        patient_id,
        professional_name,
        issue_date,
        document_type,
        title,
        diagnosis_or_reason,
        instructions,
        supplies,
        frequency_duration,
        next_control_date,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'issued', $14)
      RETURNING *`,
      [
        businessId,
        record.id,
        record.appointment_id || null,
        record.patient_id,
        record.professional_name,
        normalizedIssueDate,
        normalizeClinicalIndicationType(documentType),
        normalizedTitle,
        normalizedDiagnosis,
        normalizedInstructions,
        normalizedSupplies,
        normalizedFrequency,
        normalizedNextControlDate,
        req.user?.id || null,
      ]
    );
    const indication = {
      ...indicationResult.rows[0],
      patient_name: record.patient_name,
      patient_phone: record.patient_phone,
      patient_rut: record.patient_rut,
      patient_email: record.patient_email,
      patient_age: record.patient_age,
      patient_address: record.patient_address,
    };

    await createClinicalAuditLog({
      businessId,
      userId: req.user?.id,
      action: "clinical_indication_created",
      entityType: "clinical_indications",
      entityId: indication.id,
      details: {
        clinicalRecordId: record.id,
        patientId: record.patient_id,
        appointmentId: record.appointment_id || null,
        professionalName: record.professional_name,
        documentType: indication.document_type,
      },
    });

    return res.status(201).json({
      message: "Indicacion clinica generada correctamente",
      data: toPublicClinicalIndication(indication),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al generar indicacion clinica",
    });
  }
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
    clientRut,
    clientEmail,
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
  const clinicalBusiness = supportsClinicalRecords(businessId);

  if (isAdminRequest && req.user.business_id !== businessId) {
    return res.status(403).json({
      message: "No tienes permiso para modificar este negocio",
    });
  }

  if (isAdminRequest && !requireUserResourceAccess(req, res, barber, businessId)) {
    return;
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
  const normalizedClientRut = clinicalBusiness
    ? normalizeClinicalText(clientRut, 30)
    : null;
  const normalizedClientEmail = clinicalBusiness
    ? normalizeEmail(clientEmail)
    : null;

  if (clinicalBusiness && (!normalizedClientRut || !normalizedClientEmail)) {
    return res.status(400).json({
      message: "Ingresa RUT y correo del paciente",
    });
  }

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
  const finalOpponentName = isAdminRequest ? opponentName || null : null;
  const finalCreatedBy = isAdminRequest ? req.user?.id || null : null;
  const finalCreatedVia = isAdminRequest ? "admin" : "client";
  const finalNeedsOpponent =
    isAdminRequest &&
    Boolean(needsOpponent) &&
    !finalOpponentName &&
    !normalizedOpponentPhone;

  try {
    const overlappingScheduleBlocks = await getOverlappingScheduleBlocks({
      businessId,
      barber,
      date,
      time,
      service,
    });

    if (overlappingScheduleBlocks.length > 0) {
      return res.status(400).json({
        message: "Ese horario esta bloqueado para ese recurso",
      });
    }

    if (durationAwareBusinessIds.has(businessId)) {
      const candidateStartMinutes = timeToMinutes(time);
      const candidateDurationMinutes = getDurationAwareAppointmentMinutes(service);
      const candidateEndMinutes =
        candidateStartMinutes === null
          ? null
          : candidateStartMinutes + candidateDurationMinutes;

      if (candidateStartMinutes === null || candidateEndMinutes === null) {
        return res.status(400).json({
          message: "Horario invalido",
        });
      }

      const existingAppointments = await pool.query(
        `SELECT id, time, service FROM appointments
         WHERE date = $1 AND barber = $2 AND business_id = $3`,
        [date, barber, businessId]
      );

      const hasOverlap = existingAppointments.rows.some((appointment) => {
        const appointmentStartMinutes = timeToMinutes(appointment.time);
        const appointmentEndMinutes =
          appointmentStartMinutes === null
            ? null
            : appointmentStartMinutes +
              getDurationAwareAppointmentMinutes(appointment.service);

        return rangesOverlap(
          candidateStartMinutes,
          candidateEndMinutes,
          appointmentStartMinutes,
          appointmentEndMinutes
        );
      });

      if (hasOverlap) {
        return res.status(400).json({
          message: "Ese tramo ya esta reservado para ese recurso",
        });
      }
    }

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
        client_rut,
        client_email,
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
        created_by,
        created_via
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [
        name,
        normalizedPhone,
        date,
        time,
        service,
        barber,
        businessId,
        normalizedClientRut,
        normalizedClientEmail,
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
        finalCreatedBy,
        finalCreatedVia,
      ]
    );

    const createdAppointment = result.rows[0];

    if (clinicalBusiness) {
      try {
        await createClinicalDraftForAppointment({
          businessId,
          appointment: createdAppointment,
          userId: req.user?.id || null,
        });
      } catch (clinicalError) {
        console.error(
          "Error creando preficha clinica:",
          clinicalError.message
        );
      }
    }

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
    clientRut,
    clientEmail,
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

  if (!requireUserResourceAccess(req, res, barber, businessId)) {
    return;
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
  const clinicalBusiness = supportsClinicalRecords(businessId);
  const normalizedClientRut = clinicalBusiness
    ? normalizeClinicalText(clientRut, 30) || null
    : null;
  const normalizedClientEmail = clinicalBusiness
    ? normalizeEmail(clientEmail) || null
    : null;

  if (clinicalBusiness && clientEmail && !normalizedClientEmail) {
    return res.status(400).json({
      message: "Ingresa un correo valido para el paciente",
    });
  }

  const normalizedOpponentPhone = opponentPhone
    ? normalizeChilePhone(opponentPhone)
    : null;
  const finalOpponentName = opponentName || null;
  const finalNeedsOpponent =
    Boolean(needsOpponent) && !finalOpponentName && !normalizedOpponentPhone;
  const finalCreatedBy = req.user?.id || null;
  const finalCreatedVia = "admin";

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

    const scheduleBlocks = await client.query(
      `SELECT *
       FROM schedule_blocks
       WHERE business_id = $1
         AND barber = $2
         AND start_date <= $3
         AND end_date >= $4
       ORDER BY start_date ASC, start_time ASC NULLS FIRST`,
      [
        businessId,
        barber,
        monthlyDates[monthlyDates.length - 1],
        monthlyDates[0],
      ]
    );

    const blockedDates = monthlyDates.filter((monthlyDate) =>
      scheduleBlocks.rows.some((block) =>
        appointmentOverlapsScheduleBlock({
          appointment: {
            date: monthlyDate,
            time,
            service,
          },
          block,
          businessId,
        })
      )
    );

    if (blockedDates.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "No se pudo crear la reserva mensual. Hay horarios bloqueados.",
        conflicts: blockedDates.map((blockedDate) => ({
          date: blockedDate,
          time,
          barber,
          reason: "blocked",
        })),
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
          created_by,
          created_via,
          recurrence_group_id,
          recurrence_type,
          recurrence_index
        )
         VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
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
          finalNeedsOpponent,
          finalOpponentName,
          normalizedOpponentPhone,
          finalCreatedBy,
          finalCreatedVia,
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
    clientRut,
    clientEmail,
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

  if (!requireUserResourceAccess(req, res, barber, businessId)) {
    return;
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
  const clinicalBusiness = supportsClinicalRecords(businessId);
  const normalizedClientRut = clinicalBusiness
    ? normalizeClinicalText(clientRut, 30) || null
    : null;
  const normalizedClientEmail = clinicalBusiness
    ? normalizeEmail(clientEmail) || null
    : null;

  if (clinicalBusiness && clientEmail && !normalizedClientEmail) {
    return res.status(400).json({
      message: "Ingresa un correo valido para el paciente",
    });
  }

  const normalizedOpponentPhone = opponentPhone
    ? normalizeChilePhone(opponentPhone)
    : null;
  const finalOpponentName = opponentName || null;
  const finalNeedsOpponent =
    Boolean(needsOpponent) && !finalOpponentName && !normalizedOpponentPhone;

  try {
    const scopedAppointmentResult = await getScopedAppointmentById({
      appointmentId: id,
      businessId,
      user: req.user,
    });

    if (scopedAppointmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Cita no encontrada o no pertenece a esta profesional",
      });
    }

    const overlappingScheduleBlocks = await getOverlappingScheduleBlocks({
      businessId,
      barber,
      date,
      time,
      service,
    });

    if (overlappingScheduleBlocks.length > 0) {
      return res.status(400).json({
        message: "Ese horario esta bloqueado para ese recurso",
      });
    }

    if (durationAwareBusinessIds.has(businessId)) {
      const candidateStartMinutes = timeToMinutes(time);
      const candidateDurationMinutes = getDurationAwareAppointmentMinutes(service);
      const candidateEndMinutes =
        candidateStartMinutes === null
          ? null
          : candidateStartMinutes + candidateDurationMinutes;

      if (candidateStartMinutes === null || candidateEndMinutes === null) {
        return res.status(400).json({
          message: "Horario invalido",
        });
      }

      const existingAppointments = await pool.query(
        `SELECT id, time, service FROM appointments
         WHERE date = $1 AND barber = $2 AND business_id = $3 AND id <> $4`,
        [date, barber, businessId, id]
      );

      const hasOverlap = existingAppointments.rows.some((appointment) => {
        const appointmentStartMinutes = timeToMinutes(appointment.time);
        const appointmentEndMinutes =
          appointmentStartMinutes === null
            ? null
            : appointmentStartMinutes +
              getDurationAwareAppointmentMinutes(appointment.service);

        return rangesOverlap(
          candidateStartMinutes,
          candidateEndMinutes,
          appointmentStartMinutes,
          appointmentEndMinutes
        );
      });

      if (hasOverlap) {
        return res.status(400).json({
          message: "Ese tramo ya esta reservado para ese recurso",
        });
      }
    }

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
         client_rut = $8,
         client_email = $9,
         status = $10,
         total_amount = $11,
         deposit_required = $12,
         required_deposit_amount = $13,
         payment_status = $14,
         deposit_receipt_url = $15,
         notes = $16,
         needs_opponent = $17,
         opponent_name = $18,
         opponent_phone = $19
       WHERE id = $20 AND business_id = $7
       RETURNING *`,
      [
        name,
        normalizedPhone,
        date,
        time,
        service,
        barber,
        businessId,
        normalizedClientRut,
        normalizedClientEmail,
        status || "reservada",
        totalAmount || 0,
        depositRequired ?? false,
        requiredDepositAmount || 0,
        paymentStatus || (depositRequired ? "deposit_pending" : "unpaid"),
        depositReceiptUrl || null,
        notes || null,
        finalNeedsOpponent,
        finalOpponentName,
        normalizedOpponentPhone,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Cita no encontrada o no pertenece a este negocio",
      });
    }

    if (clinicalBusiness) {
      try {
        await createClinicalDraftForAppointment({
          businessId,
          appointment: result.rows[0],
          userId: req.user?.id || null,
        });
      } catch (clinicalError) {
        console.error(
          "Error actualizando preficha clinica:",
          clinicalError.message
        );
      }
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
    const totalAmount = getAppointmentTotalAmount(appointment);

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
      ...getMercadoPagoGatewayConfig(businessId, { includeDisabled: true }),
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
    const appointmentResult = await getScopedAppointmentById({
      appointmentId: id,
      businessId,
      user: req.user,
    });

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
    const appointmentResult = await getScopedAppointmentById({
      appointmentId: id,
      businessId,
      user: req.user,
    });

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
    const appointmentResult = await getScopedAppointmentById({
      appointmentId,
      businessId,
      user: req.user,
    });

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
    const appointmentResult = await getScopedAppointmentById({
      appointmentId,
      businessId,
      user: req.user,
    });

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
    const conditions = ["id = $1", "business_id = $2"];
    const values = [id, businessId];
    const userResourceName = getUserResourceName(req.user, businessId);

    if (userResourceName) {
      values.push(userResourceName);
      conditions.push(`barber = $${values.length}`);
    }

    const result = await pool.query(
      `DELETE FROM appointments
       WHERE ${conditions.join(" AND ")}
       RETURNING *`,
      values
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




