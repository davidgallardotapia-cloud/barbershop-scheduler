const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./config/database');
require('dotenv').config();

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
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
      );
    `);

const existingAdmin = await pool.query(
  "SELECT * FROM users WHERE username = $1",
  ["admin"]
);

if (existingAdmin.rows.length === 0) {
  const hashedPassword = await bcrypt.hash("1234", 10);

  await pool.query(
    "INSERT INTO users (username, password) VALUES ($1, $2)",
    ["admin", hashedPassword]
  );

  console.log("Usuario admin creado ✅");
}
    
    console.log("Tablas creadas 🚀");
  } catch (error) {
    console.error("Error creando tablas:", error);
  }
};

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando 🔥');
});

// Obtener citas
app.get('/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM appointments ORDER BY date, time'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener citas' });
  }
});

// Crear cita
app.post('/appointments', async (req, res) => {
  const { name, date, time, service, barber } = req.body;

  try {
    const exists = await pool.query(
      `SELECT * FROM appointments
       WHERE date = $1 AND time = $2 AND barber = $3`,
      [date, time, barber]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        message: 'Ese barbero ya tiene una cita agendada en esa fecha y hora'
      });
    }

    const result = await pool.query(
      `INSERT INTO appointments (name, date, time, service, barber)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, date, time, service, barber]
    );

    res.json({
      message: 'Cita creada',
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear cita' });
  }
});

const PORT = process.env.PORT || 5000;

app.delete('/appointments/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM appointments WHERE id = $1', [id]);

    res.json({
      message: 'Cita eliminada correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar cita' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos',
      });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos',
      });
    }

    return res.json({
      success: true,
      message: 'Login correcto',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await createTables();
});