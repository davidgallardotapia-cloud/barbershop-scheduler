const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const path = require("node:path");
const crypto = require("node:crypto");

test("reservation audit through the API in an isolated local schema", {
  skip: process.env.RUN_DB_TESTS !== "1",
  timeout: 90000,
}, async (t) => {
  const root = path.resolve(__dirname, "..");
  require("dotenv").config({ path: path.join(root, ".env") });
  const { Pool } = require("pg");
  const jwt = require("jsonwebtoken");
  const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
  const host = url?.hostname || process.env.DB_HOST;
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(host), "Integration tests require local PostgreSQL");
  const connection = url ? { connectionString: url.toString(), ssl: false } : {
    host, port: Number(process.env.DB_PORT), database: process.env.DB_NAME,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  };
  const schema = `audit_test_${crypto.randomBytes(8).toString("hex")}`;
  const pool = new Pool({ ...connection, options: `-c search_path=${schema}` });
  let server;
  let logs = "";

  try {
    await pool.query(`CREATE SCHEMA ${schema}`);
    // Pre-migration rows verify startup adds nullable audit fields without changing reservations.
    await pool.query(`CREATE TABLE appointments (
      id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, date DATE NOT NULL,
      time TIME NOT NULL, service VARCHAR(100) NOT NULL, barber VARCHAR(100) NOT NULL,
      business_id VARCHAR(100), created_by INTEGER, created_via VARCHAR(20) DEFAULT 'client'
    )`);
    await pool.query("INSERT INTO appointments (name,date,time,service,barber,business_id,created_by,created_via) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", ["Legacy QA", "2026-09-09", "20:00", "Cancha 1 (7v7 - $32.000)", "Cancha 1", "giocata", 8002, "admin"]);
    const portProbe = net.createServer();
    portProbe.listen(0, "127.0.0.1");
    await once(portProbe, "listening");
    const port = portProbe.address().port;
    await new Promise((resolve) => portProbe.close(resolve));
    const secret = crypto.randomBytes(32).toString("hex");
    const env = { ...process.env, PORT: String(port), PGOPTIONS: `-c search_path=${schema}`, JWT_SECRET: secret,
      NODE_ENV: "test", GOOGLE_SHEETS_URL: "", GOOGLE_SHEETS_SECRET: "", PLATFORM_ADMIN_PASSWORD: "",
      RESERVATIONS_EMAIL_ENABLED: "false", SECURITY_ALERT_EMAIL_ENABLED: "false", SECURITY_ALERTS_ENABLED: "false",
    };
    if (url) {
      url.searchParams.set("options", `-c search_path=${schema}`);
      env.DATABASE_URL = url.toString();
    }
    for (const key of Object.keys(env)) if (key.startsWith("SEED_PASSWORD_")) env[key] = "";
    server = spawn(process.execPath, ["src/server.js"], { cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    server.stdout.on("data", (chunk) => { logs += chunk; });
    server.stderr.on("data", (chunk) => { logs += chunk; });
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try { ready = (await fetch(`${base}/business/giocata`)).ok; } catch { /* Server is starting. */ }
      if (ready) break;
      if (server.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, `Test server failed to start: ${logs}`);
    const users = [
      { id: 8001, username: "admin_giocata", business_id: "giocata" },
      { id: 8002, username: "veronica_giocata", business_id: "giocata" },
      { id: 8003, username: "qa_urban", business_id: "barberia-james" },
    ];
    for (const user of users) await pool.query("INSERT INTO users (id,username,password,business_id) VALUES ($1,$2,$3,$4)", [user.id, user.username, "unused-test-hash", user.business_id]);
    const [admin, veronica, urban] = users.map((user) => jwt.sign(user, secret, { expiresIn: "10m" }));
    let clientAddress = "127.0.0.1";
    const request = async (route, token, body, method = body ? "POST" : "GET") => {
      const response = await fetch(`${base}${route}`, { method,
        headers: { "X-Forwarded-For": clientAddress, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, data: await response.json() };
    };
    const payload = (overrides = {}) => ({ name: "Prueba Trazabilidad", phone: "912345678", date: "2026-09-10", time: "20:00", service: "Cancha 2 (7v7 - $32.000)", barber: "Cancha 2", businessId: "giocata", totalAmount: 32000, ...overrides });
    let clientReservation;
    let ownerReservation;

    await t.test("legacy dates and creator survive migration", async () => {
      const response = await request("/admin/appointments", admin);
      assert.equal(response.status, 200);
      const legacy = response.data.find((item) => item.name === "Legacy QA");
      assert.equal(legacy.date, "2026-09-09");
      assert.equal(legacy.created_by_role, "veronica");
      assert.equal(legacy.updated_by_role, null);
      const stored = (await pool.query("SELECT created_by_role, last_action_at FROM appointments WHERE id = 1")).rows[0];
      assert.deepEqual(stored, { created_by_role: null, last_action_at: null });
    });

    await t.test("public creation cannot spoof the creator or leak audit identities", async () => {
      const response = await request("/appointments", null, payload({ created_by_role: "veronica", created_by: 8002, updated_by_role: "admin" }));
      assert.equal(response.status, 200, JSON.stringify(response.data));
      clientReservation = response.data.data;
      assert.equal(clientReservation.created_by_role, undefined);
      const row = (await pool.query("SELECT * FROM appointments WHERE id=$1", [clientReservation.id])).rows[0];
      assert.equal(row.created_by_role, "client");
      assert.equal(row.created_by_username, null);
      assert.equal(row.updated_by_role, null);
    });

    await t.test("admin and owner creations use authenticated identities", async () => {
      const a = await request("/appointments", admin, payload({ time: "21:00", created_by_role: "veronica" }));
      const v = await request("/appointments", veronica, payload({ time: "22:00" }));
      assert.equal(a.status, 200);
      assert.equal(v.status, 200);
      assert.equal(a.data.data.created_by_role, "admin");
      assert.equal(v.data.data.created_by_role, "veronica");
      assert.equal(v.data.data.created_by_username, "veronica_giocata");
      ownerReservation = v.data.data;
    });

    await t.test("edits preserve creation and record the last editor", async () => {
      const route = `/appointments/${clientReservation.id}`;
      const a = await request(route, admin, payload({ barber: "Cancha 3", service: "Cancha 3 (7v7 - $32.000)" }), "PUT");
      assert.equal(a.status, 200, JSON.stringify(a.data));
      assert.equal(a.data.data.created_by_role, "client");
      assert.equal(a.data.data.updated_by_role, "admin");
      assert.equal(a.data.data.updated_by_username, "admin_giocata");
      assert.ok(a.data.data.last_action_at);
      const v = await request(route, veronica, payload({ barber: "Cancha 3", service: "Cancha 3 (7v7 - $32.000)", status: "atendida" }), "PUT");
      assert.equal(v.status, 200);
      assert.equal(v.data.data.created_by_role, "client");
      assert.equal(v.data.data.updated_by_role, "veronica");
      const legacy = await request("/appointments/1", admin, payload({ date: "2026-09-09", barber: "Cancha 1", service: "Cancha 1 (7v7 - $32.000)" }), "PUT");
      assert.equal(legacy.data.data.created_by_role, "veronica");
      assert.equal(legacy.data.data.updated_by_role, "admin");
    });

    await t.test("conflicting and unauthorized changes do not alter the audit", async () => {
      const before = (await pool.query("SELECT * FROM appointments WHERE id=$1", [ownerReservation.id])).rows[0];
      const conflict = await request(`/appointments/${ownerReservation.id}`, admin, payload({ time: "21:00" }), "PUT");
      assert.equal(conflict.status, 400);
      assert.equal((await request(`/appointments/${ownerReservation.id}`, null, payload(), "PUT")).status, 401);
      assert.equal((await request(`/appointments/${ownerReservation.id}`, urban, payload(), "PUT")).status, 403);
      const after = (await pool.query("SELECT * FROM appointments WHERE id=$1", [ownerReservation.id])).rows[0];
      assert.deepEqual(after, before);
    });

    await t.test("monthly and quarterly series keep their author's identity on every occurrence", async () => {
      for (const [recurrenceType, token, role, barber] of [["monthly", admin, "admin", "Cancha 4"], ["quarterly", veronica, "veronica", "Cancha 5"]]) {
        const response = await request("/appointments/monthly", token, payload({ recurrenceType, barber, phone: recurrenceType === "monthly" ? "923456789" : "934567890", service: `${barber} (8v8 - $36.000)`, totalAmount: 36000 }));
        assert.equal(response.status, 200, JSON.stringify(response.data));
        assert.ok(response.data.data.length >= (recurrenceType === "monthly" ? 4 : 12));
        assert.ok(response.data.data.every((row) => row.created_by_role === role && row.created_by_username && !row.updated_by_role));
        const occurrence = response.data.data[0];
        const edit = await request(`/appointments/${occurrence.id}`, veronica, payload({
          barber, phone: occurrence.phone, date: String(occurrence.date).slice(0, 10),
          service: occurrence.service, totalAmount: 36000, notes: "Cambio en una sola fecha",
        }), "PUT");
        assert.equal(edit.status, 200);
        const series = (await pool.query("SELECT created_by_role, updated_by_role FROM appointments WHERE recurrence_group_id=$1", [occurrence.recurrence_group_id])).rows;
        assert.ok(series.every((row) => row.created_by_role === role));
        assert.equal(series.filter((row) => row.updated_by_role).length, 1);
      }
    });

    await t.test("joining as a rival records a public modification without replacing the creator", async () => {
      const created = await request("/appointments", admin, payload({ barber: "Cancha 6", service: "Cancha 6 (7v7 - $32.000)", needsOpponent: true }));
      assert.equal(created.status, 200);
      const joined = await request(`/appointments/${created.data.data.id}/opponent`, null, {
        businessId: "giocata", opponentName: "Equipo QA", opponentPhone: "945678901",
      }, "PUT");
      assert.equal(joined.status, 200, JSON.stringify(joined.data));
      const stored = (await pool.query("SELECT created_by_role, updated_by_role, last_action_at FROM appointments WHERE id=$1", [created.data.data.id])).rows[0];
      assert.equal(stored.created_by_role, "admin");
      assert.equal(stored.updated_by_role, "client");
      assert.ok(stored.last_action_at);
    });

    await t.test("other businesses keep their original behavior and public lists stay private", async () => {
      const response = await request("/appointments", urban, payload({ businessId: "barberia-james", barber: "James", service: "Corte (30 min - $10.000)" }));
      assert.equal(response.status, 200, JSON.stringify(response.data));
      assert.equal(response.data.data.created_by_role, null);
      const update = await request(`/appointments/${response.data.data.id}`, urban, payload({ businessId: "barberia-james", barber: "James", service: "Corte (30 min - $10.000)", status: "atendida" }), "PUT");
      assert.equal(update.status, 200);
      assert.equal(update.data.data.updated_by_role, null);
      const publicList = await request("/appointments?businessId=giocata");
      assert.equal(publicList.status, 200);
      assert.ok(publicList.data.every((row) => !Object.hasOwn(row, "created_by_username") && !Object.hasOwn(row, "updated_by_username") && !Object.hasOwn(row, "last_action_at")));
    });
    // A second simulated local client keeps independent suites within the real rate limit.
    clientAddress = "127.0.0.2";
    await require("./giocataQuinchoChecks")(t, { request, payload, admin, veronica, pool });
    clientAddress = "127.0.0.3";
    await require("./giocataReportsChecks")(t, { request, admin, veronica, urban, pool, jwt, secret });
    clientAddress = "127.0.0.4";
    await require("./giocataHolidayChecks")(t, { request, payload, admin, pool });
  } finally {
    if (server && server.exitCode === null) {
      const stopped = once(server, "exit");
      server.kill();
      await stopped;
    }
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await pool.end();
  }
});
