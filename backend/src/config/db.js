// src/config/db.js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: Number(process.env.DB_PORT) || 5432,
  ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool PostgreSQL:", err.message);
});

export async function connectDB() {
  const { rows } = await pool.query("SELECT NOW()");
  console.log("Conectado a PostgreSQL:", rows[0].now);
}
