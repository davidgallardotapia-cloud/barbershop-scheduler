require("dotenv").config();

console.log("DATABASE_URL cargada:", !!process.env.DATABASE_URL);
console.log("JWT_SECRET cargado:", !!process.env.JWT_SECRET);

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const pool = require("./config/database");

const app = express();

console.log("PAYMENTS BACKEND VERSION OK");

app.use(cors());
app.use(express.json());

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

    const jamesUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      ["james"]
    );

    if (jamesUser.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("1234", 10);
      await pool.query(
        "INSERT INTO users (username, password, business_id) VALUES ($1, $2, $3)",
        ["james", hashedPassword, "barberia-james"]
      );
    } else if (!jamesUser.rows[0].business_id) {
      await pool.query(
        "UPDATE users SET business_id = $1 WHERE username = $2",
        ["barberia-james", "james"]
      );
    }

    const juniorUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      ["junior"]
    );

    if (juniorUser.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("1314", 10);
      await pool.query(
        "INSERT INTO users (username, password, business_id) VALUES ($1, $2, $3)",
        ["junior", hashedPassword, "barberia-junior"]
      );
    } else if (!juniorUser.rows[0].business_id) {
      await pool.query(
        "UPDATE users SET business_id = $1 WHERE username = $2",
        ["barberia-junior", "junior"]
      );
    }

    const demoUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      ["demo"]
    );

    if (demoUser.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("1234", 10);
      await pool.query(
        "INSERT INTO users (username, password, business_id) VALUES ($1, $2, $3)",
        ["demo", hashedPassword, "agendasmart-demo"]
      );
    } else if (!demoUser.rows[0].business_id) {
      await pool.query(
        "UPDATE users SET business_id = $1 WHERE username = $2",
        ["agendasmart-demo", "demo"]
      );
    }

    const giocataUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      ["giocata"]
    );

    if (giocataUser.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("1234", 10);
      await pool.query(
        "INSERT INTO users (username, password, business_id) VALUES ($1, $2, $3)",
        ["giocata", hashedPassword, "giocata"]
      );
    } else if (!giocataUser.rows[0].business_id) {
      await pool.query(
        "UPDATE users SET business_id = $1 WHERE username = $2",
        ["giocata", "giocata"]
      );
    }

    const pinguinoUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      ["admin_pinguino"]
    );

    if (pinguinoUser.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("1234", 10);
      await pool.query(
        "INSERT INTO users (username, password, business_id) VALUES ($1, $2, $3)",
        ["admin_pinguino", hashedPassword, "pinguino-club"]
      );
    } else if (!pinguinoUser.rows[0].business_id) {
      await pool.query(
        "UPDATE users SET business_id = $1 WHERE username = $2",
        ["pinguino-club", "admin_pinguino"]
      );
    }

    console.log("Tablas verificadas/creadas correctamente");
  } catch (error) {
    console.error("Error creando tablas:", error);
  }
};

app.get("/", async (_req, res) => {
  res.json({ ok: true, message: "Backend AgendaSmart operativo" });
});

app.get("/appointments", async (req, res) => {
  const { businessId } = req.query;

  try {
    let result;

    if (businessId) {
      result = await pool.query(
        "SELECT * FROM appointments WHERE business_id = $1 ORDER BY date ASC, time ASC",
        [businessId]
      );
    } else {
      result = await pool.query(
        "SELECT * FROM appointments ORDER BY date ASC, time ASC"
      );
    }

    return res.json(result.rows);
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

app.post("/login", async (req, res) => {
  const { username, password, businessId } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Faltan credenciales" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 LIMIT 1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    if (businessId && user.business_id && user.business_id !== businessId) {
      return res.status(403).json({
        message: "Este usuario no pertenece a este negocio",
      });
    }

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

app.post("/appointments", async (req, res) => {
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
      ]
    );

    return res.json({
      message: "Cita creada",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al crear cita" });
  }
});

app.put("/appointments/:id", async (req, res) => {
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

app.post("/appointments/:id/payments", async (req, res) => {
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

    return res.json({
      message: "Pago registrado correctamente",
      data: paymentResult.rows[0],
      paymentStatus: paymentSummary?.paymentStatus,
      totalPaid: paymentSummary?.totalPaid,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al registrar pago" });
  }
});

app.get("/appointments/:id/payments", async (req, res) => {
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

app.put("/appointments/:appointmentId/payments/:paymentId", async (req, res) => {
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

    return res.json({
      message: "Pago actualizado correctamente",
      data: updatedPayment.rows[0],
      paymentStatus: paymentSummary?.paymentStatus,
      totalPaid: paymentSummary?.totalPaid,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al actualizar pago" });
  }
});

app.delete("/appointments/:appointmentId/payments/:paymentId", async (req, res) => {
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

    return res.json({
      message: "Pago eliminado correctamente",
      data: deletedPayment.rows[0],
      paymentStatus: paymentSummary?.paymentStatus,
      totalPaid: paymentSummary?.totalPaid,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al eliminar pago" });
  }
});

app.delete("/appointments/:id", async (req, res) => {
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

createTables().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
});