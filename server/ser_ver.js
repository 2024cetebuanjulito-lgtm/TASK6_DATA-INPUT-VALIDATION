require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

app.post('/api/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    const [rows] = await pool.execute(
      `SELECT e.employee_id, e.employee_code, e.first_name,
              e.last_name, e.role, l.password_hash
       FROM employee e
       JOIN login l ON l.employee_id = e.employee_id
       WHERE e.employee_code = ?`,
      [employeeId]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: 'Invalid employee ID or password'
      });
    }

    const employee = rows[0];
    const validPassword = await bcrypt.compare(
      password,
      employee.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        message: 'Invalid employee ID or password'
      });
    }

    res.json({
      employee: {
        id: employee.employee_code,
        first: employee.first_name,
        last: employee.last_name,
        role: employee.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Backend running at http://localhost:${process.env.PORT}`);
});