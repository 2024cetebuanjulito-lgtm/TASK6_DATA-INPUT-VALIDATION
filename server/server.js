const fs = require('fs');
const path = require('path');

const envPath = process.env.DOTENV_CONFIG_PATH ||
  (fs.existsSync(path.join(__dirname, '.env'))
    ? path.join(__dirname, '.env')
    : path.join(__dirname, 'API.env'));
require('dotenv').config({ path: envPath });

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'web_app',
  waitForConnections: true,
  connectionLimit: 10
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: process.env.DB_NAME || 'web_app' });
  } catch (error) {
    console.error(error.message);
    res.status(503).json({ ok: false, message: 'Database connection failed.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const employeeId = String(req.body.employeeId || '').trim().toUpperCase();
    const password = String(req.body.password || '');

    if (!employeeId || !password) {
      return res.status(400).json({ message: 'Employee ID and password are required.' });
    }

    const [rows] = await pool.execute(
      `SELECT e.employee_id, e.employee_code, e.first_name,
              e.last_name, e.contact, e.email, e.role, l.password_hash
       FROM employee e
       JOIN login l ON l.employee_id = e.employee_id
       WHERE e.employee_code = ?`,
      [employeeId]
    );

    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: 'Employee ID or password is incorrect.' });
    }

    const employee = rows[0];
    res.json({
      employee: {
        id: employee.employee_code,
        first: employee.first_name,
        last: employee.last_name,
        contact: employee.contact,
        email: employee.email,
        role: employee.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Check the API and MySQL connection.' });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.employee_code AS id, e.first_name AS first,
              e.last_name AS last, e.contact, e.email, e.role
       FROM employee e
       ORDER BY e.employee_id`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load employees.' });
  }
});

app.post('/api/employees', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const first = String(req.body.first || '').trim();
    const last = String(req.body.last || '').trim();
    const contact = String(req.body.contact || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = String(req.body.role || '');
    const password = String(req.body.password || '');

    if (!first || !last || !email || !password || !['Buyer', 'Checker', 'Classifier'].includes(role)) {
      return res.status(400).json({ message: 'Complete all employee fields.' });
    }

    await connection.beginTransaction();
    const [next] = await connection.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code, 5) AS UNSIGNED)), 0) + 1 AS number
       FROM employee WHERE employee_code LIKE 'EMP-%'`
    );
    const employeeCode = `EMP-${String(next[0].number).padStart(4, '0')}`;
    const [employee] = await connection.execute(
      `INSERT INTO employee (employee_code, first_name, last_name, contact, email, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employeeCode, first, last, contact, email, role]
    );
    const passwordHash = await bcrypt.hash(password, 12);
    await connection.execute(
      'INSERT INTO login (employee_id, password_hash) VALUES (?, ?)',
      [employee.insertId, passwordHash]
    );
    await connection.commit();
    res.status(201).json({ id: employeeCode, first, last, contact, email, role });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    const duplicate = error.code === 'ER_DUP_ENTRY';
    res.status(duplicate ? 409 : 500).json({
      message: duplicate ? 'That email or employee already exists.' : 'Could not create employee.'
    });
  } finally {
    connection.release();
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM employee WHERE employee_code = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Employee not found.' });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not delete employee.' });
  }
});

app.get('/api/classifier-records', async (req, res) => {
  try {
    const status = req.query.status;
    const params = [];
    let query = `SELECT id, product_name AS productName, box_size AS boxSize,
                        quantity, fish_class AS fishClass, status,
                        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS createdAt,
                        DATE_FORMAT(submitted_at, '%Y-%m-%d %H:%i') AS submittedAt
                 FROM classifier_records`;
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load classifier records.' });
  }
});

app.post('/api/classifier-records', async (req, res) => {
  try {
    const id = `CR-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const productName = String(req.body.productName || '').trim();
    const boxSize = String(req.body.boxSize || '');
    const quantity = Number(req.body.quantity);
    const fishClass = String(req.body.fishClass || '');
    if (!productName || !['Small', 'Medium', 'Big'].includes(boxSize) ||
        !Number.isInteger(quantity) || quantity < 1 || !['A', 'B', 'C', 'Mixed'].includes(fishClass)) {
      return res.status(400).json({ message: 'Enter a valid product, box size, quantity, and class.' });
    }
    await pool.execute(
      `INSERT INTO classifier_records (id, product_name, box_size, quantity, fish_class)
       VALUES (?, ?, ?, ?, ?)`,
      [id, productName, boxSize, quantity, fishClass]
    );
    res.status(201).json({ id, productName, boxSize, quantity, fishClass, status: 'Draft' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not create classifier record.' });
  }
});

app.post('/api/classifier-records/:id/submit', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE classifier_records SET status = 'Submitted', submitted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'Draft'`,
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Draft record not found.' });
    res.json({ id: req.params.id, status: 'Submitted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not submit classifier record.' });
  }
});

app.post('/api/classifier-records/:id/process', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE classifier_records SET status = 'Processed'
       WHERE id = ? AND status = 'Submitted'`,
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Submitted record not found.' });
    res.json({ id: req.params.id, status: 'Processed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not process classifier record.' });
  }
});

app.delete('/api/classifier-records/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM classifier_records WHERE id = ?',
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Record not found.' });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not delete classifier record.' });
  }
});

app.get('/api/buy-supply', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, DATE_FORMAT(record_date, '%Y-%m-%d') AS date,
              box_size AS size, units, price, total, status, fish_class AS cls
       FROM buy_supply ORDER BY record_date DESC, created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load buyer supplies.' });
  }
});

app.post('/api/buy-supply', async (req, res) => {
  try {
    const id = `BS-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const size = String(req.body.size || '');
    const units = Number(req.body.units);
    const price = Number(req.body.price);
    if (!['Small', 'Medium', 'Big'].includes(size) || !Number.isInteger(units) || units < 1 || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: 'Enter a valid box size, units, and price.' });
    }
    const total = units * price;
    await pool.execute(
      `INSERT INTO buy_supply (id, record_date, box_size, units, price, total)
       VALUES (?, CURRENT_DATE, ?, ?, ?, ?)`,
      [id, size, units, price, total]
    );
    res.status(201).json({ id, date: new Date().toISOString().slice(0, 10), size, units, price, total, status: 'Unclassified', cls: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not save buyer supply.' });
  }
});

app.delete('/api/buy-supply/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM buy_supply WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Buyer supply not found.' });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not delete buyer supply.' });
  }
});

const recordConfig = {
  'ops-exp': {
    table: 'ops_exp',
    select: `id, DATE_FORMAT(record_date, '%Y-%m-%d') AS date, category AS cat, amount, purpose`,
    fields: ['cat', 'amount', 'purpose']
  },
  'sale-rec': {
    table: 'sale_rec',
    select: `id, DATE_FORMAT(record_date, '%Y-%m-%d') AS date, product_name AS name, fish_class AS cls, quantity AS qty, price`,
    fields: ['name', 'cls', 'qty', 'price']
  },
  'los-rec': {
    table: 'los_rec',
    select: `id, DATE_FORMAT(record_date, '%Y-%m-%d') AS date, product_name AS name, quantity AS qty, cost, reason`,
    fields: ['name', 'qty', 'cost', 'reason']
  }
};

for (const [route, config] of Object.entries(recordConfig)) {
  app.get(`/api/${route}`, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT ${config.select} FROM ${config.table} ORDER BY record_date DESC, created_at DESC`);
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: `Could not load ${config.table}.` });
    }
  });

  app.delete(`/api/${route}/:id`, async (req, res) => {
    try {
      const [result] = await pool.execute(`DELETE FROM ${config.table} WHERE id = ?`, [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ message: 'Record not found.' });
      res.status(204).end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Could not delete record.' });
    }
  });
}

app.post('/api/ops-exp', async (req, res) => {
  try {
    const id = `OE-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const category = String(req.body.cat || '');
    const amount = Number(req.body.amount);
    const purpose = String(req.body.purpose || '').trim();
    if (!['Labor', 'Salt', 'Cellophane', 'Ice', 'Fuel', 'Maintenance'].includes(category) || !Number.isFinite(amount) || amount < 0 || !purpose) {
      return res.status(400).json({ message: 'Enter a valid expense type, amount, and purpose.' });
    }
    await pool.execute(`INSERT INTO ops_exp (id, record_date, category, amount, purpose) VALUES (?, CURRENT_DATE, ?, ?, ?)`, [id, category, amount, purpose]);
    res.status(201).json({ id, date: new Date().toISOString().slice(0, 10), cat: category, amount, purpose });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not save operational expense.' });
  }
});

app.post('/api/sale-rec', async (req, res) => {
  try {
    const id = `SR-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const name = String(req.body.name || '').trim();
    const cls = String(req.body.cls || '');
    const qty = Number(req.body.qty);
    const price = Number(req.body.price);
    if (!name || !['A', 'B', 'C', 'Mixed'].includes(cls) || !Number.isInteger(qty) || qty < 1 || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: 'Enter a valid sale product, class, quantity, and price.' });
    }
    await pool.execute(`INSERT INTO sale_rec (id, record_date, product_name, fish_class, quantity, price) VALUES (?, CURRENT_DATE, ?, ?, ?, ?)`, [id, name, cls, qty, price]);
    res.status(201).json({ id, date: new Date().toISOString().slice(0, 10), name, cls, qty, price });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not save sales record.' });
  }
});

app.post('/api/los-rec', async (req, res) => {
  try {
    const id = `LR-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const name = String(req.body.name || '').trim();
    const qty = Number(req.body.qty);
    const cost = Number(req.body.cost);
    const reason = String(req.body.reason || '').trim();
    if (!name || !Number.isInteger(qty) || qty < 1 || !Number.isFinite(cost) || cost < 0 || !reason) {
      return res.status(400).json({ message: 'Enter a valid loss product, quantity, cost, and reason.' });
    }
    await pool.execute(`INSERT INTO los_rec (id, record_date, product_name, quantity, cost, reason) VALUES (?, CURRENT_DATE, ?, ?, ?, ?)`, [id, name, qty, cost, reason]);
    res.status(201).json({ id, date: new Date().toISOString().slice(0, 10), name, qty, cost, reason });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not save loss record.' });
  }
});

app.get('/api/ai-check/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, result_class AS cls, confidence AS conf,
              eyes_score AS Eyes, skin_score AS Skin,
              scales_score AS Scales, color_score AS Color,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS checkedAt
       FROM ai_check ORDER BY created_at DESC LIMIT 1`
    );
    if (!rows.length) return res.json(null);
    const row = rows[0];
    res.json({ id: row.id, cls: row.cls, conf: Number(row.conf), checkedAt: row.checkedAt, cues: { Eyes: Number(row.Eyes), Skin: Number(row.Skin), Scales: Number(row.Scales), Color: Number(row.Color) } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load the latest AI result.' });
  }
});

app.post('/api/ai-check', async (req, res) => {
  try {
    const result = req.body || {};
    const cues = result.cues || {};
    const id = `AI-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    if (!['A', 'B', 'C'].includes(result.cls) || !Number.isFinite(Number(result.conf)) ||
        !['Eyes', 'Skin', 'Scales', 'Color'].every(key => Number.isFinite(Number(cues[key])))) {
      return res.status(400).json({ message: 'Invalid AI quality result.' });
    }
    await pool.execute(
      `INSERT INTO ai_check (id, result_class, confidence, eyes_score, skin_score, scales_score, color_score)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, result.cls, Number(result.conf), Number(cues.Eyes), Number(cues.Skin), Number(cues.Scales), Number(cues.Color)]
    );
    res.status(201).json({ ...result, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not save the AI quality result.' });
  }
});

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(32) PRIMARY KEY,
      conversation_key VARCHAR(100) NOT NULL,
      sender_role VARCHAR(30) NOT NULL,
      sender_employee_code VARCHAR(20) NULL,
      recipient_employee_code VARCHAR(20) NULL,
      sender_name VARCHAR(100) NOT NULL,
      message_text TEXT NOT NULL,
      encryption_iv VARCHAR(32) NULL,
      encryption_tag VARCHAR(32) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_messages_conversation_date (conversation_key, created_at)
    )
  `);
  const messageColumns = [
    ['sender_employee_code', 'VARCHAR(20) NULL'],
    ['recipient_employee_code', 'VARCHAR(20) NULL'],
    ['encryption_iv', 'VARCHAR(32) NULL'],
    ['encryption_tag', 'VARCHAR(32) NULL']
  ];
  for (const [name, definition] of messageColumns) {
    const [columns] = await pool.execute(
      `SELECT COUNT(*) AS count FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'messages' AND column_name = ?`,
      [name]
    );
    if (!columns[0].count) await pool.query(`ALTER TABLE messages ADD COLUMN ${name} ${definition}`);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS classifier_records (
      id VARCHAR(32) PRIMARY KEY,
      product_name VARCHAR(100) NOT NULL,
      box_size ENUM('Small', 'Medium', 'Big') NOT NULL,
      quantity INT NOT NULL,
      fish_class ENUM('A', 'B', 'C', 'Mixed') NOT NULL,
      status ENUM('Draft', 'Submitted', 'Processed') NOT NULL DEFAULT 'Draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      submitted_at TIMESTAMP NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id VARCHAR(32) PRIMARY KEY,
      classifier_record_id VARCHAR(32) NULL,
      result_class ENUM('A', 'B', 'C') NOT NULL,
      confidence DECIMAL(5, 2) NOT NULL,
      eyes_score DECIMAL(5, 2) NULL,
      skin_score DECIMAL(5, 2) NULL,
      scales_score DECIMAL(5, 2) NULL,
      color_score DECIMAL(5, 2) NULL,
      image_name VARCHAR(255) NULL,
      image_path VARCHAR(500) NULL,
      checked_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (classifier_record_id) REFERENCES classifier_records(id) ON DELETE SET NULL,
      FOREIGN KEY (checked_by) REFERENCES employee(employee_id) ON DELETE SET NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_settings (
      employee_id INT PRIMARY KEY,
      theme ENUM('light', 'dark') NOT NULL DEFAULT 'light',
      menu_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NULL,
      employee_code VARCHAR(20) NOT NULL,
      successful BOOLEAN NOT NULL,
      ip_address VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE SET NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_sessions (
      session_id VARCHAR(128) PRIMARY KEY,
      employee_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS buy_supply (
      id VARCHAR(32) PRIMARY KEY,
      record_date DATE NOT NULL,
      box_size ENUM('Small', 'Medium', 'Big') NOT NULL,
      units INT NOT NULL,
      price DECIMAL(12, 2) NOT NULL,
      total DECIMAL(12, 2) NOT NULL,
      status ENUM('Unclassified', 'Classified') NOT NULL DEFAULT 'Unclassified',
      fish_class ENUM('A', 'B', 'C', 'Mixed') NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_buy_supply_date (record_date),
      INDEX idx_buy_supply_status (status)
    )
  `);
  await pool.query(`CREATE TABLE IF NOT EXISTS ops_exp (id VARCHAR(32) PRIMARY KEY, record_date DATE NOT NULL, category ENUM('Labor', 'Salt', 'Cellophane', 'Ice', 'Fuel', 'Maintenance') NOT NULL, amount DECIMAL(12, 2) NOT NULL, purpose VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_ops_exp_date (record_date), INDEX idx_ops_exp_category (category))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sale_rec (id VARCHAR(32) PRIMARY KEY, record_date DATE NOT NULL, product_name VARCHAR(100) NOT NULL, fish_class ENUM('A', 'B', 'C', 'Mixed') NOT NULL, quantity INT NOT NULL, price DECIMAL(12, 2) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_sale_rec_date (record_date), INDEX idx_sale_rec_class (fish_class))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS los_rec (id VARCHAR(32) PRIMARY KEY, record_date DATE NOT NULL, product_name VARCHAR(100) NOT NULL, quantity INT NOT NULL, cost DECIMAL(12, 2) NOT NULL, reason VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_los_rec_date (record_date))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ai_check (id VARCHAR(32) PRIMARY KEY, result_class ENUM('A', 'B', 'C') NOT NULL, confidence DECIMAL(5, 2) NOT NULL, eyes_score DECIMAL(5, 2) NULL, skin_score DECIMAL(5, 2) NULL, scales_score DECIMAL(5, 2) NULL, color_score DECIMAL(5, 2) NULL, checked_by INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_ai_check_created_at (created_at), FOREIGN KEY (checked_by) REFERENCES employee(employee_id) ON DELETE SET NULL)`);
  app.listen(port, () => {
    console.log(`Fish Check API running at http://localhost:${port}`);
  });
}

start().catch(error => {
  console.error('Could not initialize the database:', error.message);
  process.exit(1);
});
const chatKey = crypto.createHash('sha256')
  .update(process.env.CHAT_ENCRYPTION_KEY || 'fish-check-development-chat-key')
  .digest();
const chatContacts = {
  Owner: ['Checker'],
  Buyer: ['Classifier', 'Checker'],
  Checker: ['Buyer', 'Classifier', 'Owner'],
  Classifier: ['Checker']
};
const conversationKey = (a, b) => [a, b].sort().join('|');
const encryptMessage = text => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', chatKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return { text: encrypted.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
};
const decryptMessage = (text, iv, tag) => {
  if (!iv || !tag) return text;
  const decipher = crypto.createDecipheriv('aes-256-gcm', chatKey, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(text, 'base64')), decipher.final()]).toString('utf8');
};

app.get('/api/chat/contacts', async (req, res) => {
  try {
    const employeeId = String(req.query.employeeId || '').trim();
    const role = String(req.query.role || '');
    const roles = chatContacts[role] || [];
    if (!roles.length) return res.json([]);
    const rolePlaceholders = roles.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT employee_code AS id, CONCAT(first_name, ' ', last_name) AS name, role
       FROM employee WHERE employee_code <> ? AND role IN (${rolePlaceholders}) ORDER BY first_name, last_name`,
      [employeeId, ...roles]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load chat contacts.' });
  }
});

app.get('/api/chat/messages', async (req, res) => {
  try {
    const fromId = String(req.query.fromId || '').trim();
    const toId = String(req.query.toId || '').trim();
    if (!fromId || !toId) return res.status(400).json({ message: 'Chat participants are required.' });
    const [rows] = await pool.execute(
      `SELECT id, sender_employee_code AS senderId, sender_role AS senderRole,
              sender_name AS senderName, message_text, encryption_iv, encryption_tag,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM messages WHERE conversation_key = ? ORDER BY created_at ASC`,
      [conversationKey(fromId, toId)]
    );
    res.json(rows.map(row => ({ id: row.id, senderId: row.senderId, senderRole: row.senderRole, senderName: row.senderName, text: decryptMessage(row.message_text, row.encryption_iv, row.encryption_tag), createdAt: row.createdAt })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load chat messages.' });
  }
});

app.post('/api/chat/messages', async (req, res) => {
  try {
    const senderId = String(req.body.senderId || '').trim();
    const recipientId = String(req.body.recipientId || '').trim();
    const text = String(req.body.text || '').trim();
    if (!senderId || !recipientId || !text || text.length > 2000) return res.status(400).json({ message: 'A valid message is required.' });
    const [senderRows] = await pool.execute('SELECT employee_code, first_name, role FROM employee WHERE employee_code = ?', [senderId]);
    const [recipientRows] = await pool.execute('SELECT employee_code FROM employee WHERE employee_code = ?', [recipientId]);
    if (!senderRows.length || !recipientRows.length) return res.status(404).json({ message: 'Chat participant not found.' });
    const encrypted = encryptMessage(text);
    const id = `MSG-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await pool.execute(
      `INSERT INTO messages (id, conversation_key, sender_role, sender_employee_code,
       recipient_employee_code, sender_name, message_text, encryption_iv, encryption_tag)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, conversationKey(senderId, recipientId), senderRows[0].role, senderId, recipientId, senderRows[0].first_name, encrypted.text, encrypted.iv, encrypted.tag]
    );
    res.status(201).json({ id, senderId, senderRole: senderRows[0].role, senderName: senderRows[0].first_name, text, createdAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not save chat message.' });
  }
});