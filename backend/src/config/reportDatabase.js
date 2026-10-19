const { Pool } = require("pg");
const pool = require("./database");

// Same database, but never borrow the operational pool's connections for reporting.
const reportPool = new Pool({
  ...pool.options,
  password: pool.options.password,
  max: 1,
  min: 0,
  connectionTimeoutMillis: 500,
  idleTimeoutMillis: 10000,
  application_name: "agendasmart-reports",
});
reportPool.on("error", () => console.error("La conexion de reportes se interrumpio."));

module.exports = reportPool;
