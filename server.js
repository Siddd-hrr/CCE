//server.js

require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ===== JWT secret =====
const SECRET = process.env.JWT_SECRET || "fallbacksecret";

// ===== MySQL pool =====
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "attendance_app",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/* ===========================
   AUTH MIDDLEWARE (JWT verify)
=========================== */
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
}

/* ===========================
   ROLE CHECK MIDDLEWARE
=========================== */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
}

/* ===========================
   AUTH ROUTES
=========================== */

// Register: default role = 'teacher' (HOD can later upgrade via DB)
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ ok: false, message: "Email and password required" });

  const hashed = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, 'teacher')",
      [email, hashed]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, message: "User already exists" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [email]);
  const user = rows[0];
  if (!user) return res.status(404).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

// Who am I (for role-aware UI)
app.get("/api/me", authMiddleware, async (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// Re-verify on sensitive page open (password check without new token)
app.post("/api/reverify", authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: "Password required" });

  const [rows] = await pool.query("SELECT * FROM users WHERE id=?", [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: "Verification failed" });

  // success, just return ok. (Client decides what to do next)
  res.json({ ok: true });
});

/* ===========================
   STUDENT ROUTES
=========================== */

// Everyone (HOD + Teacher) can view
app.get("/api/students", authMiddleware, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM students ORDER BY roll ASC");
  res.json(rows);
});

// Only HOD can create students
app.post("/api/students", authMiddleware, requireRole("hod"), async (req, res) => {
  const { roll, name, class: className, section, mobile } = req.body;
  if (!roll || !name) return res.status(400).json({ message: "roll and name are required" });

  try {
    const [result] = await pool.query(
      "INSERT INTO students (roll, name, class, section, mobile) VALUES (?, ?, ?, ?, ?)",
      [roll, name, className || "", section || "", mobile || ""]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(400).json({ message: "Roll already exists" });
  }
});

// Only HOD can delete students
app.delete("/api/students/:id", authMiddleware, requireRole("hod"), async (req, res) => {
  await pool.query("DELETE FROM students WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

/* ===========================
   ATTENDANCE ROUTES
=========================== */

// Teachers + HOD can mark attendance
app.post("/api/attendance", authMiddleware, requireRole("hod", "teacher"), async (req, res) => {
  const { studentId, date, status } = req.body;
  if (!studentId || !date || !status)
    return res.status(400).json({ message: "studentId, date, status required" });

  await pool.query(
    "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status=?",
    [studentId, date, status, status]
  );
  res.json({ ok: true });
});

// Everyone (HOD + Teacher) can view attendance
app.get("/api/attendance/:month/:year", authMiddleware, async (req, res) => {
  const { month, year } = req.params;
  const [rows] = await pool.query(
    `SELECT s.id as student_id, s.roll, s.name, s.class, s.section, a.date, a.status 
     FROM attendance a 
     JOIN students s ON a.student_id = s.id 
     WHERE MONTH(a.date)=? AND YEAR(a.date)=?
     ORDER BY a.date ASC`,
    [month, year]
  );
  res.json(rows);
});

/* ===========================
   DASHBOARD STATS (read-only)
=========================== */
app.get("/api/stats/:month/:year", authMiddleware, async (req, res) => {
  const { month, year } = req.params;
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) as count 
     FROM attendance 
     WHERE MONTH(date)=? AND YEAR(date)=? 
     GROUP BY status`,
    [month, year]
  );
  res.json(rows);
});

/* ===========================
   START SERVER
=========================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(✅ Server running on http://localhost:${PORT});
});