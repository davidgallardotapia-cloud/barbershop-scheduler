require("dotenv").config();

console.log("DATABASE_URL cargada:", !!process.env.DATABASE_URL);
console.log("JWT_SECRET cargado:", !!process.env.JWT_SECRET);

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const pool = require("./config/database");

const app = express();

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
    
    const statusCheck = await pool.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'appointments'
  AND column_name = 'status';
`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
      );
    `);

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS business_id VARCHAR(100);
    `);

    const hashedPassword = await bcrypt.hash("1234", 10);

const existingAdmin = await pool.query(
  "SELECT * FROM users WHERE username = $1",
  ["admin"]
);

if (existingAdmin.rows.length === 0) {
  await pool.query(
    "INSERT INTO users (username, password) VALUES ($1, $2)",
    ["admin", hashedPassword]
  );

  console.log("Usuario admin creado ✅");
} else {
  await pool.query(
    "UPDATE users SET password = $1 WHERE username = $2",
    [hashedPassword, "admin"]
  );

  console.log("Contraseña de admin actualizada ✅");
}

    console.log("Tablas creadas 🚀");
  } catch (error) {
    console.error("Error creando tablas:", error);
  }
};

app.use(cors());
app.use(express.json());

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Faltan credenciales" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    return res.json({
      message: "Login correcto",
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ message: "Error al iniciar sesión" });
  }
});

app.get("/appointments", async (req, res) => {
  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ error: "businessId requerido" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM appointments WHERE business_id = $1 ORDER BY date ASC, time ASC",
      [businessId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al obtener citas" });
  }
});

app.post("/appointments", async (req, res) => {
  const { name, phone, date, time, service, barber, businessId, status } = req.body;

  if (!name || !phone || !date || !time || !service || !barber || !businessId) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  try {
    const exists = await pool.query(
      `SELECT * FROM appointments
       WHERE date = $1 AND time = $2 AND barber = $3 AND business_id = $4`,
      [date, time, barber, businessId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        message: "Ese barbero ya tiene una cita agendada en esa fecha y hora",
      });
    }

    const result = await pool.query(
      `INSERT INTO appointments (name, phone, date, time, service, barber, business_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, phone, date, time, service, barber, businessId, status || "reservada"]
    );

    res.json({
      message: "Cita creada",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear cita" });
  }
});

app.put("/appointments/:id", async (req, res) => {
  const { id } = req.params;
  const { name, phone, date, time, service, barber, businessId, status } = req.body;

  if (!name || !phone || !date || !time || !service || !barber || !businessId) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  try {
    const exists = await pool.query(
      `SELECT * FROM appointments
       WHERE date = $1 AND time = $2 AND barber = $3 AND id <> $4 AND business_id = $5`,
      [date, time, barber, id, businessId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        message: "Ese barbero ya tiene una cita agendada en esa fecha y hora",
      });
    }

    const result = await pool.query(
      `UPDATE appointments
       SET name = $1, phone = $2, date = $3, time = $4, service = $5, barber = $6, business_id = $7, status = $8
       WHERE id = $9
       RETURNING *`,
      [name, phone, date, time, service, barber, businessId, status || "reservada", id]
    );

    res.json({
      message: "Cita actualizada correctamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar cita" });
  }
});

app.delete("/appointments/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM appointments WHERE id = $1", [id]);

    res.json({
      message: "Cita eliminada correctamente",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar cita" });
  }
});

const PORT = process.env.PORT || 10000;

createTables().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
});