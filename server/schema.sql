CREATE DATABASE IF NOT EXISTS web_app;
USE web_app;

CREATE TABLE IF NOT EXISTS employee (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  contact VARCHAR(20),
  email VARCHAR(100),
  role ENUM('Owner', 'Buyer', 'Checker', 'Classifier') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login (
  login_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplies (
  id VARCHAR(32) PRIMARY KEY,
  record_date DATE NOT NULL,
  size VARCHAR(20) NOT NULL,
  units INT NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Unclassified',
  fish_class CHAR(1) NULL
);

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
);

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(32) PRIMARY KEY,
  record_date DATE NOT NULL,
  category VARCHAR(30) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  purpose VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS ops_exp (
  id VARCHAR(32) PRIMARY KEY,
  record_date DATE NOT NULL,
  category ENUM('Labor', 'Salt', 'Cellophane', 'Ice', 'Fuel', 'Maintenance') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ops_exp_date (record_date),
  INDEX idx_ops_exp_category (category)
);

CREATE TABLE IF NOT EXISTS sales (
  id VARCHAR(32) PRIMARY KEY,
  record_date DATE NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  fish_class CHAR(1) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_rec (
  id VARCHAR(32) PRIMARY KEY,
  record_date DATE NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  fish_class ENUM('A', 'B', 'C', 'Mixed') NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sale_rec_date (record_date),
  INDEX idx_sale_rec_class (fish_class)
);

CREATE TABLE IF NOT EXISTS losses (
  id VARCHAR(32) PRIMARY KEY,
  record_date DATE NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  cost DECIMAL(12, 2) NOT NULL,
  reason VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS los_rec (
  id VARCHAR(32) PRIMARY KEY,
  record_date DATE NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  cost DECIMAL(12, 2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_los_rec_date (record_date)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(32) PRIMARY KEY,
  conversation_key VARCHAR(100) NOT NULL,
  sender_role VARCHAR(30) NOT NULL,
  sender_employee_code VARCHAR(20) NOT NULL,
  recipient_employee_code VARCHAR(20) NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  message_text TEXT NOT NULL,
  encryption_iv VARCHAR(32) NULL,
  encryption_tag VARCHAR(32) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classifier_records (
  id VARCHAR(32) PRIMARY KEY,
  product_name VARCHAR(100) NOT NULL,
  box_size ENUM('Small', 'Medium', 'Big') NOT NULL,
  quantity INT NOT NULL,
  fish_class ENUM('A', 'B', 'C', 'Mixed') NOT NULL,
  status ENUM('Draft', 'Submitted', 'Processed') NOT NULL DEFAULT 'Draft',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL,
  processed_at TIMESTAMP NULL,
  processed_by INT NULL,
  INDEX idx_classifier_status (status),
  INDEX idx_classifier_created_at (created_at),
  CONSTRAINT fk_classifier_created_by FOREIGN KEY (created_by) REFERENCES employee(employee_id) ON DELETE SET NULL,
  CONSTRAINT fk_classifier_processed_by FOREIGN KEY (processed_by) REFERENCES employee(employee_id) ON DELETE SET NULL
);

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
  INDEX idx_ai_created_at (created_at),
  CONSTRAINT fk_ai_classifier_record FOREIGN KEY (classifier_record_id) REFERENCES classifier_records(id) ON DELETE SET NULL,
  CONSTRAINT fk_ai_checked_by FOREIGN KEY (checked_by) REFERENCES employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_check (
  id VARCHAR(32) PRIMARY KEY,
  result_class ENUM('A', 'B', 'C') NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL,
  eyes_score DECIMAL(5, 2) NULL,
  skin_score DECIMAL(5, 2) NULL,
  scales_score DECIMAL(5, 2) NULL,
  color_score DECIMAL(5, 2) NULL,
  checked_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_check_created_at (created_at),
  CONSTRAINT fk_ai_check_employee FOREIGN KEY (checked_by) REFERENCES employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS employee_settings (
  employee_id INT PRIMARY KEY,
  theme ENUM('light', 'dark') NOT NULL DEFAULT 'light',
  menu_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NULL,
  employee_code VARCHAR(20) NOT NULL,
  successful BOOLEAN NOT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_events_created_at (created_at),
  CONSTRAINT fk_login_events_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS app_sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  employee_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sessions_expiry (expires_at),
  CONSTRAINT fk_sessions_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_employee_role ON employee(role);
CREATE INDEX idx_supply_date_status ON supplies(record_date, status);
CREATE INDEX idx_expense_date_category ON expenses(record_date, category);
CREATE INDEX idx_sales_date_class ON sales(record_date, fish_class);
CREATE INDEX idx_losses_date ON losses(record_date);
CREATE INDEX idx_messages_conversation_date ON messages(conversation_key, created_at);