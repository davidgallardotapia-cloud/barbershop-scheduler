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

    await pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS business_id VARCHAR(100);
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

    const hashedPassword = await bcrypt.hash("1234", 10);

    const existingAdmin = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      ["admin"]
    );

    if (existingAdmin.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (username, password, business_id) VALUES ($1, $2, $3)",
        ["admin", hashedPassword, "barberia-james"]
      );

      console.log("Usuario admin creado ✅");
    } else {
      await pool.query(
        "UPDATE users SET password = $1, business_id = $2 WHERE username = $3",
        [hashedPassword, "barberia-james", "admin"]
      );

      console.log("Contraseña de admin actualizada ✅");
    }

    console.log("Tablas creadas 🚀");
  } catch (error) {
    console.error("Error creando tablas:", error);
  }
};

const allowedOrigins = [
  "https://barbershop-scheduler-two.vercel.app",
  "http://localhost:5173",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origen no permitido por CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
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
        business_id: user.business_id,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ message: "Error al iniciar sesión" });
  }
});

app.get("/business/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM businesses WHERE slug = $1",
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener negocio:", error);
    return res.status(500).json({ error: "Error del servidor" });
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
       WHERE id = $9 AND business_id = $7
       RETURNING *`,
      [name, phone, date, time, service, barber, businessId, status || "reservada", id]
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